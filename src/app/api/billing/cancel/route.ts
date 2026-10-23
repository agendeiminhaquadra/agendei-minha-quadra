import { NextResponse } from "next/server";
import { Role, SubscriptionStatus } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cancelSubscription } from "@/lib/mercado-pago";

export const runtime = "nodejs";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });

  const user = await prisma.user.findFirst({
    where: { id: session.userId, companyId: session.companyId, isActive: true },
    select: { role: true },
  });
  if (!user || user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Somente o administrador da arena pode cancelar a assinatura." }, { status: 403 });
  }

  const company = await prisma.company.findUnique({
    where: { id: session.companyId },
    select: { mercadoPagoSubscriptionId: true },
  });
  if (!company?.mercadoPagoSubscriptionId) {
    return NextResponse.json({ error: "Não encontramos uma assinatura do Mercado Pago para esta arena." }, { status: 404 });
  }

  try {
    await cancelSubscription(company.mercadoPagoSubscriptionId);
    await prisma.company.updateMany({
      where: { id: session.companyId, mercadoPagoSubscriptionId: company.mercadoPagoSubscriptionId },
      data: {
        mercadoPagoSubscriptionId: null,
        planStatus: SubscriptionStatus.CANCELED,
        currentPeriodEnd: null,
      },
    });
    return NextResponse.json({ cancelled: true });
  } catch (error) {
    console.error("Mercado Pago subscription cancellation error:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Não foi possível cancelar a assinatura no Mercado Pago." }, { status: 503 });
  }
}
