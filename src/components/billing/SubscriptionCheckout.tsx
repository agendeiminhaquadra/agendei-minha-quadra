"use client";

import { useState } from "react";
import { PlanTier } from "@prisma/client";
import { ArrowRight, CreditCard, Loader2 } from "lucide-react";

const plans: { value: PlanTier; label: string }[] = [
  { value: PlanTier.ESSENCIAL, label: "Essencial" },
  { value: PlanTier.PROFISSIONAL, label: "Profissional" },
  { value: PlanTier.EMPRESA, label: "Empresa" },
];

export function SubscriptionCheckout({
  currentPlan,
  hasStripeCustomer,
}: {
  currentPlan: PlanTier;
  hasStripeCustomer: boolean;
}) {
  const [plan, setPlan] = useState<PlanTier>(plans.some((item) => item.value === currentPlan) ? currentPlan : PlanTier.ESSENCIAL);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function navigateTo(endpoint: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        ...(endpoint.endsWith("checkout") ? { body: JSON.stringify({ planTier: plan }) } : {}),
      });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || "Não foi possível abrir a Stripe.");
      window.location.assign(result.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao conectar com a Stripe.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4">
        <label className="text-sm font-bold text-slate-700">Plano<select value={plan} onChange={(event) => setPlan(event.target.value as PlanTier)} disabled={busy} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-3"><option value={PlanTier.ESSENCIAL}>Essencial</option><option value={PlanTier.PROFISSIONAL}>Profissional</option><option value={PlanTier.EMPRESA}>Empresa</option></select></label>
      </div>
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={busy} onClick={() => void navigateTo("/api/billing/checkout")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-3 font-bold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60">
          {busy ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
          Continuar para pagamento <ArrowRight size={17} />
        </button>
        {hasStripeCustomer && <button type="button" disabled={busy} onClick={() => void navigateTo("/api/billing/portal")} className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60">Gerenciar assinatura e faturas</button>}
      </div>
      <p className="text-xs leading-relaxed text-slate-500">Plano com cobran?a mensal pelo Checkout seguro da Stripe. O acesso ser? atualizado ap?s a confirma??o pelo webhook.</p>
    </div>
  );
}
