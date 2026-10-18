import Link from "next/link";
import { redirect } from "next/navigation";
import { BillingInterval, PlanTier, Role } from "@prisma/client";
import { ArrowLeft, CalendarClock, ShieldCheck } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubscriptionCheckout } from "@/components/billing/SubscriptionCheckout";

export const dynamic = "force-dynamic";

type Props = { searchParams?: { checkout?: string } };

const planNames: Record<PlanTier, string> = {
  TRIAL: "Teste grátis",
  ESSENCIAL: "Essencial",
  PROFISSIONAL: "Profissional",
  EMPRESA: "Empresa",
};

const statusNames = {
  ACTIVE: "Ativa",
  TRIALING: "Teste grátis",
  PAST_DUE: "Pagamento pendente",
  CANCELED: "Cancelada",
  EXPIRED: "Expirada",
} as const;

export default async function AssinaturaPage({ searchParams = {} }: Props) {
  const session = await getSession();
  if (!session) redirect("/login?next=/assinatura");
  const [user, company] = await Promise.all([
    prisma.user.findFirst({ where: { id: session.userId, companyId: session.companyId, isActive: true }, select: { role: true } }),
    prisma.company.findUnique({
      where: { id: session.companyId },
      select: { name: true, planTier: true, planStatus: true, trialEndsAt: true, currentPeriodEnd: true, billingInterval: true, stripeCustomerId: true, stripeSubscriptionId: true },
    }),
  ]);
  if (!user || user.role !== Role.ADMIN) redirect("/admin?error=forbidden");
  if (!company) redirect("/login");

  const priceEnvironmentNames = [
    "STRIPE_PRICE_ESSENCIAL_MONTHLY",
    "STRIPE_PRICE_PROFISSIONAL_MONTHLY",
    "STRIPE_PRICE_EMPRESA_MONTHLY",
  ];
  const missingPrices = priceEnvironmentNames.filter((name) => !process.env[name]);
  const checkoutState = searchParams.checkout;
  const date = company.planStatus === "TRIALING" ? company.trialEndsAt : company.currentPeriodEnd;

  return (
    <main className="min-h-screen bg-[#fffaf4] px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-orange-600"><ArrowLeft size={16} /> Voltar ao painel</Link>
        <header><p className="text-sm font-black uppercase tracking-[0.16em] text-orange-600">Minha Quadra</p><h1 className="mt-2 text-3xl font-black text-slate-950">Assinatura</h1><p className="mt-1 text-slate-600">Plano e cobrança da unidade {company.name}.</p></header>

        {checkoutState === "success" && <div role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"><b>Checkout concluído.</b> Estamos aguardando a confirmação segura da Stripe. O status será atualizado quando o webhook chegar.</div>}
        {checkoutState === "cancelled" && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">A contratação foi interrompida antes da conclusão. Nenhuma assinatura foi ativada por esta tela.</div>}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><h2 className="text-lg font-black text-slate-900">Seu plano atual</h2><p className="mt-1 text-sm text-slate-600">{planNames[company.planTier]} · {statusNames[company.planStatus]}</p></div>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700"><ShieldCheck size={15} />{company.stripeSubscriptionId ? " Conectada à Stripe" : " Conta da arena"}</span>
          </div>
          {date && <p className="mt-4 inline-flex items-center gap-2 text-sm text-slate-600"><CalendarClock size={16} />{company.planStatus === "TRIALING" ? "Seu teste termina em" : "Período atual até"} {date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "long" })}</p>}
          {company.billingInterval && company.planStatus !== "TRIALING" && <p className="mt-2 text-sm text-slate-600">Cobrança {company.billingInterval === BillingInterval.YEARLY ? "anual" : "mensal"}.</p>}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-lg font-black text-slate-900">Contratar ou renovar</h2>
          <p className="mb-5 mt-1 text-sm text-slate-600">Escolha um plano mensal. Voc? ver? o total e os meios de pagamento na p?gina protegida da Stripe.</p>
          {missingPrices.length > 0 && <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><b>Configuração pendente:</b> ainda faltam os IDs dos preços da Stripe nas variáveis de ambiente do servidor ({missingPrices.length} configuração(ões)).</div>}
          <SubscriptionCheckout currentPlan={company.planTier} hasStripeCustomer={Boolean(company.stripeCustomerId)} />
        </section>
      </div>
    </main>
  );
}
