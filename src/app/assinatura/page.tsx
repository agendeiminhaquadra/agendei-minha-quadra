import Link from "next/link";
import Image from "next/image";
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
    <main className="relative min-h-screen overflow-hidden bg-[#f5f2ee] px-4 py-8 sm:px-6 sm:py-12">
      <div className="pointer-events-none absolute -right-24 top-0 h-96 w-96 rounded-full bg-orange-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 left-0 h-96 w-96 rounded-full bg-amber-100 blur-3xl" />
      <div className="relative mx-auto max-w-4xl space-y-6">
        <Link href="/admin" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-bold text-slate-600 shadow-sm transition hover:border-orange-200 hover:text-orange-600"><ArrowLeft size={16} /> Voltar ao painel</Link>
        <header className="flex flex-col gap-5 rounded-[1.75rem] bg-gradient-to-br from-[#0b1220] via-[#17243a] to-[#22324c] p-6 text-white shadow-xl shadow-slate-900/10 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div><p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">Minha Quadra · Conta da arena</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Assinatura</h1><p className="mt-2 text-sm text-slate-300">Plano e cobrança da unidade <span className="font-semibold text-white">{company.name}</span>.</p></div>
          <div className="w-fit rounded-2xl border border-white/10 bg-black/20 p-2"><Image src="/logo.png" alt="Agendei Minha Quadra" width={180} height={120} priority className="h-auto w-36 rounded-xl object-contain" /></div>
        </header>

        {checkoutState === "returned" && <div role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"><b>Checkout iniciado.</b> Estamos aguardando a confirmação da assinatura pelo Mercado Pago.</div>}
        {checkoutState === "success" && <div role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"><b>Checkout concluído.</b> O acesso será atualizado após a confirmação do pagamento pelo Mercado Pago.</div>}
        {checkoutState === "cancelled" && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">A contratação foi interrompida antes da conclusão. Nenhuma assinatura foi ativada por esta tela.</div>}
        {searchParams.dayPass === "success" && <div role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"><b>Pagamento enviado.</b> O acesso de teste será liberado por 24 horas depois que o Mercado Pago confirmar o pagamento.</div>}
        {searchParams.dayPass === "failure" && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">O pagamento não foi concluído. Nenhum acesso de teste foi liberado.</div>}
        {searchParams.dayPass === "pending" && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">O Mercado Pago ainda está processando o pagamento. O acesso será liberado somente após a aprovação.</div>}

        <section className="overflow-hidden rounded-[1.75rem] border border-white bg-white p-6 shadow-[0_18px_55px_-34px_rgba(20,28,40,0.35)] sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><h2 className="text-lg font-black text-slate-900">Seu plano atual</h2><p className="mt-1 text-sm text-slate-600">{planNames[company.planTier]} · {statusNames[company.planStatus]}</p></div>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700"><ShieldCheck size={15} />{paymentProvider ? `Conectada ao ${paymentProvider}` : "Conta da arena"}</span>
          </div>
          {date && <p className="mt-4 inline-flex items-center gap-2 text-sm text-slate-600"><CalendarClock size={16} />{company.planStatus === "TRIALING" ? "Seu teste termina em" : "Período atual até"} {date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "long" })}</p>}
          {company.billingInterval && company.planStatus !== "TRIALING" && <p className="mt-2 text-sm text-slate-600">Cobrança {company.billingInterval === BillingInterval.YEARLY ? "anual" : "mensal"}.</p>}
        </section>

        <section className="overflow-hidden rounded-[1.75rem] border border-white bg-white p-6 shadow-[0_18px_55px_-34px_rgba(20,28,40,0.35)] sm:p-8">
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
