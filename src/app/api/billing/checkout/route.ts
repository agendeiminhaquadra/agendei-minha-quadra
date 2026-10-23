import { NextRequest, NextResponse } from "next/server";
import { BillingInterval, PlanTier, Role } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cancelSubscription, createSubscription, getSubscription, planMonthlyPrices } from "@/lib/mercado-pago";
import { getPublicAppUrl } from "@/lib/stripe";

export const runtime = "nodejs";

const purchasablePlans: PlanTier[] = [PlanTier.ESSENCIAL, PlanTier.PROFISSIONAL, PlanTier.EMPRESA];

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });

  const user = await prisma.user.findFirst({
    where: { id: session.userId, companyId: session.companyId, isActive: true },
    select: { role: true, email: true },
  });
  if (!user || user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Somente o administrador da arena pode alterar a assinatura." }, { status: 403 });
  }

  let body: { planTier?: string; payerEmail?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitação inválida." }, { status: 400 });
  }
  if (!purchasablePlans.includes(body.planTier as PlanTier)) {
    return NextResponse.json({ error: "Selecione um plano válido." }, { status: 400 });
  }

  const planTier = body.planTier as PlanTier;
  const payerEmail = typeof body.payerEmail === "string" ? body.payerEmail.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payerEmail)) {
    return NextResponse.json({ error: "Informe o e-mail da conta Mercado Pago que fará o pagamento." }, { status: 400 });
  }
  const company = await prisma.company.findUnique({
    where: { id: session.companyId },
    select: { id: true, email: true, stripeSubscriptionId: true, mercadoPagoSubscriptionId: true, planStatus: true },
  });
  if (!company) return NextResponse.json({ error: "Arena não encontrada." }, { status: 404 });
  if (company.stripeSubscriptionId) {
    return NextResponse.json({ error: "Sua arena já tem uma assinatura Stripe ativa. Cancele-a antes de contratar outro plano." }, { status: 409 });
  }
  if (company.mercadoPagoSubscriptionId) {
    try {
      const current = await getSubscription(company.mercadoPagoSubscriptionId);
      if (current.status === "pending" && current.init_point) {
        return NextResponse.json({ url: current.init_point });
      }
      if (current.status === "authorized" && company.planStatus !== "PAST_DUE") {
        return NextResponse.json({ error: "Sua arena já tem uma assinatura ativa." }, { status: 409 });
      }
      if (current.status !== "cancelled") {
        await cancelSubscription(current.id);
      }
      await prisma.company.update({
        where: { id: company.id },
        data: { mercadoPagoSubscriptionId: null },
      });
    } catch (error) {
      console.error("Mercado Pago existing subscription error:", error instanceof Error ? error.message : "unknown error");
      return NextResponse.json({ error: "Não foi possível verificar a assinatura atual no Mercado Pago." }, { status: 503 });
    }
  }

  try {
    const baseUrl = getPublicAppUrl(request.nextUrl.origin);
    const subscription = await createSubscription({
      companyId: company.id,
      planTier,
      payerEmail,
      backUrl: `${baseUrl}/assinatura?checkout=returned`,
      notificationUrl: `${baseUrl}/api/mercadopago/webhook`,
    });
    if (!subscription.id || !subscription.init_point) {
      throw new Error("O Mercado Pago não retornou o link de pagamento da assinatura.");
    }
    await prisma.company.update({
      where: { id: company.id },
      data: {
        mercadoPagoSubscriptionId: subscription.id,
        billingInterval: BillingInterval.MONTHLY,
        monthlyPrice: planMonthlyPrices[planTier],
        paymentStatus: "PENDING",
      },
    });
    return NextResponse.json({ url: subscription.init_point });
  } catch (error) {
    console.error("Mercado Pago subscription checkout error:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível iniciar o checkout do Mercado Pago." }, { status: 503 });
  }
}
