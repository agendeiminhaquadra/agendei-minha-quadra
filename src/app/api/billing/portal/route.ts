import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPublicAppUrl, getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });
  const user = await prisma.user.findFirst({
    where: { id: session.userId, companyId: session.companyId, isActive: true },
    select: { role: true },
  });
  if (!user || user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Somente o administrador da arena pode gerenciar a assinatura." }, { status: 403 });
  }

  const company = await prisma.company.findUnique({
    where: { id: session.companyId },
    select: { stripeCustomerId: true },
  });
  if (!company?.stripeCustomerId) {
    return NextResponse.json({ error: "Ainda não encontramos uma assinatura Stripe para esta arena." }, { status: 404 });
  }

  try {
    const baseUrl = getPublicAppUrl(request.nextUrl.origin);
    const portal = await getStripe().billingPortal.sessions.create({
      customer: company.stripeCustomerId,
      return_url: `${baseUrl}/assinatura`,
    });
    return NextResponse.json({ url: portal.url });
  } catch (error) {
    console.error("Stripe Billing Portal error:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Não foi possível abrir o gerenciamento da assinatura." }, { status: 503 });
  }
}
