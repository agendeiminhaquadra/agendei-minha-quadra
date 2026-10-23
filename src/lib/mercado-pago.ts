import { createHmac, timingSafeEqual } from "node:crypto";
import { PlanTier } from "@prisma/client";

const apiBase = "https://api.mercadopago.com";

export const planMonthlyPrices: Partial<Record<PlanTier, number>> = {
  [PlanTier.ESSENCIAL]: 89,
  [PlanTier.PROFISSIONAL]: 169,
  [PlanTier.EMPRESA]: 299,
};

export type MercadoPagoSubscription = {
  id: string;
  status: string;
  external_reference?: string | number | null;
  payer_id?: string | number | null;
  date_created?: string | null;
  next_payment_date?: string | null;
  init_point?: string | null;
  auto_recurring?: { transaction_amount?: string | number; currency_id?: string };
};

export type MercadoPagoPayment = {
  id: string | number;
  status?: string;
  transaction_amount?: number;
  currency_id?: string;
  external_reference?: string | null;
};

export type MercadoPagoPreference = {
  id: string;
  init_point?: string | null;
  sandbox_init_point?: string | null;
};

export type MercadoPagoAuthorizedPayment = {
  id: string | number;
  preapproval_id?: string | null;
  status?: string;
  summarized?: string;
  debit_date?: string | null;
  payment?: { id?: string | number; status?: string; status_detail?: string } | null;
};

type MercadoPagoAuthorizedPaymentSearch = { results?: Array<{ id: string | number }> };

function accessToken() {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) throw new Error("MERCADO_PAGO_ACCESS_TOKEN não foi configurado.");
  return token;
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  const result = await response.json().catch(() => ({})) as T & { message?: string; error?: string };
  if (!response.ok) {
    throw new Error(result.message || result.error || `Mercado Pago respondeu com status ${response.status}.`);
  }
  return result;
}

export function createSubscription(input: {
  companyId: string;
  planTier: PlanTier;
  payerEmail: string;
  backUrl: string;
  notificationUrl: string;
}) {
  const amount = planMonthlyPrices[input.planTier];
  if (!amount) throw new Error("O plano selecionado não tem um preço configurado.");

  const planNames: Record<string, string> = {
    [PlanTier.ESSENCIAL]: "Essencial",
    [PlanTier.PROFISSIONAL]: "Profissional",
    [PlanTier.EMPRESA]: "Empresa",
  };

  return apiRequest<MercadoPagoSubscription>("/preapproval", {
    method: "POST",
    body: JSON.stringify({
      reason: `Agendei Minha Quadra - Plano ${planNames[input.planTier]}`,
      external_reference: `${input.companyId}|${input.planTier}`,
      payer_email: input.payerEmail,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: amount,
        currency_id: "BRL",
      },
      back_url: input.backUrl,
      notification_url: input.notificationUrl,
      status: "pending",
    }),
  });
}

export function getSubscription(id: string) {
  return apiRequest<MercadoPagoSubscription>(`/preapproval/${encodeURIComponent(id)}`);
}

export function cancelSubscription(id: string) {
  return apiRequest<MercadoPagoSubscription>(`/preapproval/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ status: "cancelled" }),
  });
}

export function getAuthorizedPayment(id: string) {
  return apiRequest<MercadoPagoAuthorizedPayment>(`/authorized_payments/${encodeURIComponent(id)}`);
}

export function findAuthorizedPaymentsByPaymentId(paymentId: string) {
  const query = new URLSearchParams({ payment_id: paymentId });
  return apiRequest<MercadoPagoAuthorizedPaymentSearch>(`/authorized_payments/search?${query.toString()}`);
}

export function createOneDayTestPreference(input: { companyId: string; backUrl: string; notificationUrl: string }) {
  return apiRequest<MercadoPagoPreference>("/checkout/preferences", {
    method: "POST",
    body: JSON.stringify({
      items: [{ title: "Cliente VIP · acesso Essencial por 1 dia", quantity: 1, currency_id: "BRL", unit_price: 1 }],
      external_reference: `VIPDAY1|${input.companyId}`,
      back_urls: {
        success: `${input.backUrl}?dayPass=success`,
        failure: `${input.backUrl}?dayPass=failure`,
        pending: `${input.backUrl}?dayPass=pending`,
      },
      notification_url: input.notificationUrl,
      auto_return: "approved",
    }),
  });
}

export function getPayment(id: string) {
  return apiRequest<MercadoPagoPayment>(`/v1/payments/${encodeURIComponent(id)}`);
}

export function verifyMercadoPagoSignature(input: {
  signature: string | null;
  requestId: string | null;
  dataId: string | null;
}) {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (!secret || !input.signature || !input.requestId || !input.dataId) return false;

  const values = new Map<string, string>();
  for (const part of input.signature.split(",")) {
    const separator = part.indexOf("=");
    if (separator >= 0) values.set(part.slice(0, separator).trim(), part.slice(separator + 1).trim());
  }
  const timestamp = values.get("ts");
  const receivedHash = values.get("v1");
  if (!timestamp || !receivedHash) return false;

  const manifest = `id:${input.dataId};request-id:${input.requestId};ts:${timestamp};`;
  const expectedHash = createHmac("sha256", secret).update(manifest).digest();
  const received = Buffer.from(receivedHash, "hex");
  return received.length === expectedHash.length && timingSafeEqual(received, expectedHash);
}

export function parseExternalReference(value?: string | number | null) {
  if (value == null) return null;
  const separator = String(value).lastIndexOf("|");
  if (separator < 1) return null;
  const companyId = String(value).slice(0, separator);
  const planTier = String(value).slice(separator + 1);
  if (planTier !== PlanTier.ESSENCIAL && planTier !== PlanTier.PROFISSIONAL && planTier !== PlanTier.EMPRESA) return null;
  return { companyId, planTier };
}
