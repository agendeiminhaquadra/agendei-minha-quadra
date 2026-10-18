import { NextRequest, NextResponse } from "next/server";
import { BillingInterval, PlanTier, Role } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPublicAppUrl, getStripe, getStripePriceId } from "@/lib/stripe";

export const runtime = "nodejs";

const purchasablePlans: PlanTier[] = [PlanTier.ESSENCIAL, PlanTier.PROFISSIONAL, PlanTier.EMPRESA];

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });

  const user = await prisma.user.findFirst({
    where: { id: session.userId, companyId: session.companyId, isActive: true },
    select: { role: true },
  });
  if (!user || user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Somente o administrador da arena pode alterar a assinatura." }, { status: 403 });
  }

  let body: { planTier?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitação inválida." }, { status: 400 });
  }
  if (!purchasablePlans.includes(body.planTier as PlanTier)) {
    return NextResponse.json({ error: "Selecione um plano válido." }, { status: 400 });
  }

  const planTier = body.planTier as PlanTier;
  const interval = BillingInterval.MONTHLY;
  const company = await prisma.company.findUnique({
    where: { id: session.companyId },
    select: { id: true, email: true, stripeCustomerId: true, stripeSubscriptionId: true },
  });
  if (!company) return NextResponse.json({ error: "Arena não encontrada." }, { status: 404 });
  if (company.stripeSubscriptionId) {
    return NextResponse.json({ error: "Sua arena já tem uma assinatura. Use o botão de gerenciar assinatura." }, { status: 409 });
  }

  try {
    const stripe = getStripe();
    const priceId = getStripePriceId(planTier, interval);
    const price = await stripe.prices.retrieve(priceId);
    if (!price.active || price.type !== "recurring" || price.currency !== "brl" || price.recurring?.interval !== "month" || price.recurring.interval_count !== 1) {
      return NextResponse.json({ error: "O pre?o Stripe configurado precisa ser recorrente mensal em BRL." }, { status: 503 });
    }
    const baseUrl = getPublicAppUrl(request.nextUrl.origin);
    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      ...(company.stripeCustomerId
        ? { customer: company.stripeCustomerId }
        : { customer_email: company.email || undefined }),
      client_reference_id: company.id,
      metadata: { companyId: company.id, planTier, interval },
      subscription_data: { metadata: { companyId: company.id, planTier, interval } },
      success_url: `${baseUrl}/assinatura?checkout=success`,
      cancel_url: `${baseUrl}/assinatura?checkout=cancelled`,
      locale: "auto",
    });
    if (!checkout.url) throw new Error("A Stripe não retornou o endereço do Checkout.");
    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    console.error("Stripe Checkout error:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível iniciar o Checkout." }, { status: 503 });
  }
}
