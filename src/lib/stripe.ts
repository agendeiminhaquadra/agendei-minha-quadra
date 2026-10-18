import Stripe from "stripe";
import { BillingInterval, PlanTier } from "@prisma/client";

let stripeClient: Stripe | null = null;

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY não foi configurada.");
  if (!stripeClient) stripeClient = new Stripe(key);
  return stripeClient;
}

export function getStripePriceId(planTier: PlanTier, interval: BillingInterval) {
  const envName = `STRIPE_PRICE_${planTier}_${interval}`;
  const priceId = process.env[envName];
  if (!priceId || !priceId.startsWith("price_")) {
    throw new Error(`Configure ${envName} com o ID do preço recorrente da Stripe.`);
  }
  return priceId;
}

export function getPublicAppUrl(fallback: string) {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  return (configured || fallback).replace(/\/$/, "");
}
