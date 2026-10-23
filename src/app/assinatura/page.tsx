import Link from "next/link";
import { redirect } from "next/navigation";
import { BillingInterval, PlanTier, Role } from "@prisma/client";
import { ArrowLeft, CalendarClock, ShieldCheck } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubscriptionCheckout } from "@/components/billing/SubscriptionCheckout";

export const dynamic = "force-dynamic";

type Props = { searchParams?: { checkout?: string; dayPass?: string } };

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
      select: {
        name: true, email: true, planTier: true, planStatus: true, trialEndsAt: true, currentPeriodEnd: true,
        billingInterval: true, stripeSubscriptionId: true, mercadoPagoSubscriptionId: true,
      },
    }),
  ]);
  if (!user || user.role !== Role.ADMIN) redirect("/admin?error=forbidden");
  if (!company) redirect("/login");

  const missingConfiguration = ["MERCADO_PAGO_ACCESS_TOKEN", "MERCADO_PAGO_WEBHOOK_SECRET"]
    .filter((name) => !process.env[name]);
  const checkoutState = searchParams.checkout;
  const date = company.planStatus === "TRIALING" ? company.trialEndsAt : company.currentPeriodEnd;
  const paymentProvider = company.mercadoPagoSubscriptionId
    ? "Mercado Pago"
    : company.stripeSubscriptionId ? "Stripe" : null;

  return (
    <main className="min-h-screen bg-[#fffaf4] px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-orange-600"><ArrowLeft size={16} /> Voltar ao painel</Link>
        <header><p className="text-sm font-black uppercase tracking-[0.16em] text-orange-600">Minha Quadra</p><h1 className="mt-2 text-3xl font-black text-slate-950">Assinatura</h1><p className="mt-1 text-slate-600">Plano e cobrança da unidade {company.name}.</p></header>

        {checkoutState === "returned" && <div role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"><b>Checkout iniciado.</b> Estamos aguardando a confirmação da assinatura pelo Mercado Pago.</div>}
        {checkoutState === "success" && <div role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"><b>Checkout concluído.</b> O acesso será atualizado após a confirmação do pagamento pelo Mercado Pago.</div>}
        {checkoutState === "cancelled" && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">A contratação foi interrompida antes da conclusão. Nenhuma assinatura foi ativada por esta tela.</div>}
        {searchParams.dayPass === "success" && <div role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"><b>Pagamento enviado.</b> O acesso de teste será liberado por 24 horas depois que o Mercado Pago confirmar o pagamento.</div>}
        {searchParams.dayPass === "failure" && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">O pagamento não foi concluído. Nenhum acesso de teste foi liberado.</div>}
        {searchParams.dayPass === "pending" && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">O Mercado Pago ainda está processando o pagamento. O acesso será liberado somente após a aprovação.</div>}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><h2 className="text-lg font-black text-slate-900">Seu plano atual</h2><p className="mt-1 text-sm text-slate-600">{planNames[company.planTier]} · {statusNames[company.planStatus]}</p></div>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700"><ShieldCheck size={15} />{paymentProvider ? `Conectada ao ${paymentProvider}` : "Conta da arena"}</span>
          </div>
          {date && <p className="mt-4 inline-flex items-center gap-2 text-sm text-slate-600"><CalendarClock size={16} />{company.planStatus === "TRIALING" ? "Seu teste termina em" : "Período atual até"} {date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "long" })}</p>}
          {company.billingInterval && company.planStatus !== "TRIALING" && <p className="mt-2 text-sm text-slate-600">Cobrança {company.billingInterval === BillingInterval.YEARLY ? "anual" : "mensal"}.</p>}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-lg font-black text-slate-900">Contratar ou renovar</h2>
          <p className="mb-5 mt-1 text-sm text-slate-600">Escolha um plano mensal. Você fará o pagamento em uma página segura do Mercado Pago.</p>
          {missingConfiguration.length > 0 && <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><b>Configuração pendente:</b> faltam as variáveis do Mercado Pago no servidor: {missingConfiguration.join(", ")}.</div>}
          <SubscriptionCheckout
            currentPlan={company.planTier}
            payerEmail={company.email || ""}
            hasMercadoPagoSubscription={Boolean(company.mercadoPagoSubscriptionId)}
            mercadoPagoSubscriptionActive={Boolean(company.mercadoPagoSubscriptionId) && company.planStatus === "ACTIVE"}
          />
        </section>
      </div>
    </main>
  );
}
