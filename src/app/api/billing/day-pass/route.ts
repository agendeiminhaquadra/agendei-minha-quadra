import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createOneDayTestPreference } from "@/lib/mercado-pago";
import { getPublicAppUrl } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });

  const user = await prisma.user.findFirst({
    where: { id: session.userId, companyId: session.companyId, isActive: true },
    select: { role: true },
  });
  if (!user || user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Somente o administrador da arena pode iniciar este pagamento." }, { status: 403 });
  }

  const company = await prisma.company.findUnique({
    where: { id: session.companyId },
    select: {
      id: true, planStatus: true, trialEndsAt: true, currentPeriodEnd: true,
      stripeSubscriptionId: true, mercadoPagoSubscriptionId: true,
    },
  });
  if (!company) return NextResponse.json({ error: "Arena não encontrada." }, { status: 404 });

  const now = new Date();
  const accessUntil = company.planStatus === "TRIALING" ? company.trialEndsAt : company.currentPeriodEnd;
  const accessStillValid = accessUntil !== null && accessUntil > now &&
    (company.planStatus === "TRIALING" || company.planStatus === "ACTIVE" || company.planStatus === "CANCELED");
  if (accessStillValid) {
    return NextResponse.json({ error: "A arena já tem acesso ativo. O pagamento de teste só pode ser iniciado depois que o acesso vencer." }, { status: 409 });
  }
  if (company.planStatus === "ACTIVE" && (company.stripeSubscriptionId || company.mercadoPagoSubscriptionId)) {
    return NextResponse.json({ error: "A arena tem uma assinatura ativa. O pagamento de teste não pode substituir essa assinatura." }, { status: 409 });
  }

  try {
    const baseUrl = getPublicAppUrl(request.nextUrl.origin);
    const preference = await createOneDayTestPreference({
      companyId: company.id,
      backUrl: `${baseUrl}/assinatura`,
      notificationUrl: `${baseUrl}/api/mercadopago/webhook`,
    });
    const url = preference.init_point || preference.sandbox_init_point;
    if (!url) throw new Error("O Mercado Pago não retornou o link de pagamento.");
    return NextResponse.json({ url });
  } catch (error) {
    console.error("Mercado Pago day pass checkout error:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Não foi possível iniciar o pagamento de teste no Mercado Pago." }, { status: 503 });
  }
}
