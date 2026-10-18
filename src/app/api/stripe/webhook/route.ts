import Stripe from "stripe";
import { BillingInterval, PlanPaymentStatus, PlanTier, Prisma, SubscriptionStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

function stripeId(value: string | { id: string } | null | undefined) {
  return typeof value === "string" ? value : value?.id || null;
}

function validPlan(value?: string | null): PlanTier | undefined {
  return value === PlanTier.ESSENCIAL || value === PlanTier.PROFISSIONAL || value === PlanTier.EMPRESA
    ? value
    : undefined;
}

function validInterval(value?: string | null): BillingInterval | undefined {
  return value === BillingInterval.MONTHLY || value === BillingInterval.YEARLY ? value : undefined;
}

function toSubscriptionStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  if (status === "active") return SubscriptionStatus.ACTIVE;
  if (status === "trialing") return SubscriptionStatus.TRIALING;
  if (status === "canceled") return SubscriptionStatus.CANCELED;
  if (status === "incomplete_expired") return SubscriptionStatus.EXPIRED;
  return SubscriptionStatus.PAST_DUE;
}

async function processEvent(event: Stripe.Event, tx: Prisma.TransactionClient) {
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const checkout = event.data.object as Stripe.Checkout.Session;
    const companyId = checkout.metadata?.companyId || checkout.client_reference_id;
    const subscriptionId = stripeId(checkout.subscription as string | { id: string } | null);
    const customerId = stripeId(checkout.customer as string | { id: string } | null);
    if (!companyId) return;
    await tx.company.updateMany({
      where: { id: companyId },
      data: {
        ...(customerId ? { stripeCustomerId: customerId } : {}),
        ...(subscriptionId ? { stripeSubscriptionId: subscriptionId } : {}),
        ...(validPlan(checkout.metadata?.planTier) ? { planTier: validPlan(checkout.metadata?.planTier)! } : {}),
        ...(validInterval(checkout.metadata?.interval) ? { billingInterval: validInterval(checkout.metadata?.interval)! } : {}),
      },
    });
    return;
  }

  if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const metadataCompanyId = subscription.metadata?.companyId;
    const customerId = stripeId(subscription.customer);
    const subscriptionItem = subscription.items.data[0];
    const currentPrice = subscriptionItem?.price;
    const currentPriceId = currentPrice?.id;
    const monthlyPrice = currentPrice?.unit_amount == null
      ? undefined
      : currentPrice.unit_amount / 100 / (currentPrice.recurring?.interval === "year" ? 12 : 1);
    const tier = validPlan(subscription.metadata?.planTier);
    const interval = validInterval(subscription.metadata?.interval);
    const status = toSubscriptionStatus(subscription.status);
    const where = metadataCompanyId
      ? { id: metadataCompanyId }
      : { stripeSubscriptionId: subscription.id };

    await tx.company.updateMany({
      where,
      data: {
        ...(customerId ? { stripeCustomerId: customerId } : {}),
        stripeSubscriptionId: event.type === "customer.subscription.deleted" ? null : subscription.id,
        ...(currentPriceId ? { stripePriceId: currentPriceId } : {}),
        ...(monthlyPrice === undefined ? {} : { monthlyPrice }),
        ...(tier ? { planTier: tier } : {}),
        ...(interval ? { billingInterval: interval } : {}),
        planStatus: status,
        currentPeriodStart: subscriptionItem?.current_period_start ? new Date(subscriptionItem.current_period_start * 1000) : undefined,
        currentPeriodEnd: subscriptionItem?.current_period_end ? new Date(subscriptionItem.current_period_end * 1000) : null,
        ...(status === SubscriptionStatus.PAST_DUE ? { paymentStatus: PlanPaymentStatus.OVERDUE } : {}),
      },
    });
    return;
  }

  if (event.type === "invoice.paid" || event.type === "invoice.payment_succeeded" || event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId = stripeId(invoice.customer as string | { id: string } | null);
    if (!customerId) return;
    const paid = event.type !== "invoice.payment_failed";
    await tx.company.updateMany({
      where: { stripeCustomerId: customerId },
      data: paid
        ? { paymentStatus: PlanPaymentStatus.PAID }
        : { paymentStatus: PlanPaymentStatus.OVERDUE, planStatus: SubscriptionStatus.PAST_DUE },
    });
  }
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return NextResponse.json({ error: "Webhook Stripe não configurado." }, { status: 400 });

  let event: Stripe.Event;
  try {
    const rawBody = await request.text();
    event = getStripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch (error) {
    console.error("Stripe webhook signature verification failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Assinatura Stripe inválida." }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.stripeWebhookEvent.create({ data: { stripeEventId: event.id, type: event.type } });
      await processEvent(event, tx);
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error("Stripe webhook processing failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Não foi possível processar o evento Stripe." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
