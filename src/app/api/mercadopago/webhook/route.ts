import { BillingInterval, PlanPaymentStatus, Prisma, SubscriptionStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  findAuthorizedPaymentsByPaymentId,
  getAuthorizedPayment,
  getSubscription,
  parseExternalReference,
  verifyMercadoPagoSignature,
} from "@/lib/mercado-pago";

export const runtime = "nodejs";

type NotificationBody = {
  id?: string | number;
  type?: string;
  action?: string;
  data?: { id?: string | number };
};

function dateOrNull(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function updateFromSubscription(subscriptionId: string) {
  const subscription = await getSubscription(subscriptionId);
  const reference = parseExternalReference(subscription.external_reference);
  if (!reference) return { subscription };

  const common = {
    mercadoPagoSubscriptionId: subscription.status === "cancelled" ? null : subscription.id,
    planTier: reference.planTier,
    billingInterval: BillingInterval.MONTHLY,
    monthlyPrice: Number(subscription.auto_recurring?.transaction_amount) || undefined,
  };

  if (subscription.status === "authorized") {
    await prisma.company.updateMany({
      where: { id: reference.companyId },
      data: {
        ...common,
        paymentStatus: PlanPaymentStatus.PENDING,
      },
    });
  } else if (subscription.status === "cancelled") {
    await prisma.company.updateMany({
      where: { id: reference.companyId, mercadoPagoSubscriptionId: subscription.id },
      data: { mercadoPagoSubscriptionId: null, planStatus: SubscriptionStatus.CANCELED },
    });
  } else if (subscription.status === "paused") {
    await prisma.company.updateMany({
      where: { id: reference.companyId },
      data: {
        ...common,
        planStatus: SubscriptionStatus.PAST_DUE,
        paymentStatus: PlanPaymentStatus.OVERDUE,
      },
    });
  }

  return { subscription, reference };
}

async function processInvoice(invoiceId: string) {
  const invoice = await getAuthorizedPayment(invoiceId);
  if (!invoice.preapproval_id) return;

  const { subscription, reference } = await updateFromSubscription(invoice.preapproval_id);
  if (!reference) return;

  const paymentStatus = invoice.payment?.status;
  const approved = paymentStatus === "approved";
  const failed = paymentStatus === "rejected" || paymentStatus === "cancelled" || paymentStatus === "charged_back";
  await prisma.company.updateMany({
    where: { id: reference.companyId, mercadoPagoSubscriptionId: subscription.id },
    data: {
      planTier: reference.planTier,
      billingInterval: BillingInterval.MONTHLY,
      ...(approved
        ? {
            planStatus: SubscriptionStatus.ACTIVE,
            paymentStatus: PlanPaymentStatus.PAID,
            currentPeriodStart: dateOrNull(subscription.date_created) ?? undefined,
            currentPeriodEnd: dateOrNull(subscription.next_payment_date) ?? undefined,
          }
        : failed
          ? { planStatus: SubscriptionStatus.PAST_DUE, paymentStatus: PlanPaymentStatus.OVERDUE }
          : { paymentStatus: PlanPaymentStatus.PENDING }),
    },
  });
}

export async function POST(request: NextRequest) {
  const dataId = request.nextUrl.searchParams.get("data.id") || request.nextUrl.searchParams.get("id");
  const signatureIsValid = verifyMercadoPagoSignature({
    signature: request.headers.get("x-signature"),
    requestId: request.headers.get("x-request-id"),
    dataId,
  });
  if (!signatureIsValid) return NextResponse.json({ error: "Assinatura do webhook Mercado Pago inválida." }, { status: 401 });

  let body: NotificationBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Notificação inválida." }, { status: 400 });
  }

  const topic = request.nextUrl.searchParams.get("type") || request.nextUrl.searchParams.get("topic") || body.type || "";
  const resourceId = dataId || (body.data?.id == null ? null : String(body.data.id));
  if (!resourceId) return NextResponse.json({ error: "Notificação sem ID do recurso." }, { status: 400 });
  if (topic !== "subscription_preapproval" && topic !== "subscription_authorized_payment" && topic !== "payment") {
    return NextResponse.json({ received: true, ignored: true });
  }
  if (body.id == null) return NextResponse.json({ error: "Notificação sem ID de evento." }, { status: 400 });

  try {
    if (topic === "subscription_preapproval") {
      await updateFromSubscription(resourceId);
    } else if (topic === "subscription_authorized_payment") {
      await processInvoice(resourceId);
    } else {
      const invoices = await findAuthorizedPaymentsByPaymentId(resourceId);
      for (const invoice of invoices.results ?? []) await processInvoice(String(invoice.id));
    }

    await prisma.mercadoPagoWebhookEvent.create({ data: { eventId: `${topic}:${body.id}`, topic } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error("Mercado Pago webhook processing error:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Não foi possível processar a notificação do Mercado Pago." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
