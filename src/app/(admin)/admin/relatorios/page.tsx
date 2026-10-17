import Link from "next/link";
import { BookingOrigin, BookingStatus, PaymentMethod, PaymentStatus, PaymentTransactionStatus, Role } from "@prisma/client";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Download,
  Filter,
  MapPin,
  ReceiptText,
  RotateCcw,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { formatCurrency, formatSaoPauloTime, getSaoPauloDateKey } from "@/lib/utils";
import { resolveReportRange } from "@/lib/reporting";
import { redirect } from "next/navigation";

export const revalidate = 0;

type PageProps = {
  searchParams?: { from?: string; to?: string };
};

const bookingStatusLabels: Record<BookingStatus, string> = {
  AVAILABLE: "Disponível",
  RESERVED: "Reservado",
  BLOCKED: "Bloqueado",
  PENDING: "Aguardando confirmação",
  CONFIRMED: "Confirmada",
  CHECKED_IN: "Em andamento",
  COMPLETED: "Concluída",
  CANCELED: "Cancelada",
  NO_SHOW: "Não compareceu",
};

const originLabels: Record<BookingOrigin, string> = {
  ADMIN_PANEL: "Painel administrativo",
  PUBLIC_ARENA: "Link público",
  WHATSAPP: "WhatsApp",
  PHONE: "Telefone",
  IN_PERSON: "Presencial",
};

const methodLabels: Record<PaymentMethod, string> = {
  PIX: "Pix",
  CASH: "Dinheiro",
  CREDIT_CARD: "Cartão de crédito",
  DEBIT_CARD: "Cartão de débito",
  BANK_TRANSFER: "Transferência",
  OTHER: "Outro",
};

function dateLabel(key: string) {
  return new Date(`${key}T12:00:00-03:00`).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" });
}

function dateLong(date: Date) {
  return date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "long", year: "numeric" });
}

function shortName(value: string) {
  return value.length > 22 ? `${value.slice(0, 19)}...` : value;
}

export default async function RelatoriosPage({ searchParams = {} }: PageProps) {
  await requirePermission("canAccessFinance");
  const session = await getSession();
  if (!session) redirect("/login?next=/admin/relatorios");

  const { from, to, start, end } = resolveReportRange(searchParams.from, searchParams.to);
  const [bookings, paymentRows] = await Promise.all([
    prisma.booking.findMany({
      where: {
        companyId: session.companyId,
        startTime: { gte: start, lte: end },
        status: { notIn: [BookingStatus.AVAILABLE, BookingStatus.BLOCKED] },
      },
      include: {
        court: { select: { id: true, name: true } },
        modality: { select: { name: true } },
        customer: { select: { name: true } },
      },
      orderBy: { startTime: "desc" },
    }),
    prisma.payment.findMany({
      where: {
        companyId: session.companyId,
        OR: [
          { status: PaymentTransactionStatus.PAID, paidAt: { gte: start, lte: end } },
          { status: PaymentTransactionStatus.REFUNDED, refundedAt: { gte: start, lte: end } },
        ],
      },
      include: {
        customer: { select: { name: true } },
        booking: {
          select: {
            startTime: true,
            court: { select: { name: true } },
            modality: { select: { name: true } },
          },
        },
      },
      orderBy: [{ paidAt: "desc" }, { refundedAt: "desc" }],
    }),
  ]);

  const activeBookings = bookings.filter((booking) => booking.status !== BookingStatus.CANCELED);
  const receivedPayments = paymentRows.filter((payment) => payment.status === PaymentTransactionStatus.PAID);
  const refundedPayments = paymentRows.filter((payment) => payment.status === PaymentTransactionStatus.REFUNDED);
  const received = receivedPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const refunded = refundedPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const netReceived = received - refunded;
  const reservedValue = activeBookings.reduce((sum, booking) => sum + booking.totalPrice, 0);
  const pendingReceivable = activeBookings
    .filter((booking) => booking.paymentStatus === PaymentStatus.UNPAID || booking.paymentStatus === PaymentStatus.PARTIAL)
    .reduce((sum, booking) => sum + Math.max(0, booking.totalPrice - booking.paidAmount), 0);
  const confirmedStatuses: BookingStatus[] = [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, BookingStatus.COMPLETED];
  const confirmedBookings = activeBookings.filter((booking) => confirmedStatuses.includes(booking.status));
  const pendingBookings = bookings.filter((booking) => booking.status === BookingStatus.PENDING);
  const canceledBookings = bookings.filter((booking) => booking.status === BookingStatus.CANCELED);
  const bookedHours = activeBookings.reduce((sum, booking) => sum + booking.durationMinutes / 60, 0);

  const dayCount = Math.floor((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;
  const groupByMonth = dayCount > 62;
  const trend = new Map<string, { label: string; value: number }>();
  for (let current = new Date(`${from}T00:00:00.000Z`); current <= new Date(`${to}T00:00:00.000Z`); current.setUTCDate(current.getUTCDate() + 1)) {
    const key = current.toISOString().slice(0, groupByMonth ? 7 : 10);
    if (!trend.has(key)) {
      const label = groupByMonth
        ? new Date(`${key}-01T12:00:00-03:00`).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", month: "short", year: "2-digit" })
        : dateLabel(key);
      trend.set(key, { label, value: 0 });
    }
  }
  for (const payment of receivedPayments) {
    if (!payment.paidAt) continue;
    const dateKey = getSaoPauloDateKey(payment.paidAt);
    const key = groupByMonth ? dateKey.slice(0, 7) : dateKey;
    const bucket = trend.get(key);
    if (bucket) bucket.value += payment.amount;
  }
  const trendItems = [...trend.values()];
  const maxTrend = Math.max(1, ...trendItems.map((item) => item.value));

  const byMethod = new Map<PaymentMethod, number>();
  for (const payment of receivedPayments) byMethod.set(payment.paymentMethod, (byMethod.get(payment.paymentMethod) || 0) + payment.amount);
  const methodItems = [...byMethod.entries()].sort((a, b) => b[1] - a[1]);
  const maxMethod = Math.max(1, ...methodItems.map(([, value]) => value));

  const byCourt = new Map<string, { name: string; count: number; hours: number; reserved: number }>();
  for (const booking of activeBookings) {
    const item = byCourt.get(booking.courtId) || { name: booking.court.name, count: 0, hours: 0, reserved: 0 };
    item.count += 1;
    item.hours += booking.durationMinutes / 60;
    item.reserved += booking.totalPrice;
    byCourt.set(booking.courtId, item);
  }
  const courtItems = [...byCourt.values()].sort((a, b) => b.reserved - a.reserved);

  const byModality = new Map<string, number>();
  for (const booking of activeBookings) {
    const label = booking.modality?.name || "Sem modalidade";
    byModality.set(label, (byModality.get(label) || 0) + 1);
  }
  const modalityItems = [...byModality.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const byOrigin = new Map<BookingOrigin, number>();
  for (const booking of activeBookings) byOrigin.set(booking.origin, (byOrigin.get(booking.origin) || 0) + 1);
  const originItems = [...byOrigin.entries()].sort((a, b) => b[1] - a[1]);
  const maxOrigin = Math.max(1, ...originItems.map(([, count]) => count));

  const paymentHistory = paymentRows.slice(0, 12);
  const statusItems = [
    { label: "Confirmadas / realizadas", count: confirmedBookings.length, style: "bg-emerald-500" },
    { label: "Aguardando confirmação", count: pendingBookings.length, style: "bg-amber-500" },
    { label: "Canceladas", count: canceledBookings.length, style: "bg-rose-500" },
    { label: "Não compareceu", count: bookings.filter((booking) => booking.status === BookingStatus.NO_SHOW).length, style: "bg-slate-400" },
  ];
  const maxStatus = Math.max(1, ...statusItems.map((item) => item.count));
  const today = getSaoPauloDateKey();
  const monthStart = `${today.slice(0, 7)}-01`;
  const sevenDaysAgo = new Date(`${today}T00:00:00.000Z`);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);
  const quickRanges: { label: string; from: string; to: string }[] = [
    { label: "Hoje", from: today, to: today },
    { label: "Últimos 7 dias", from: sevenDaysAgo.toISOString().slice(0, 10), to: today },
    { label: "Este mês", from: monthStart, to: today },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary-orange">Análise do negócio</p>
          <h1 className="mt-1 text-3xl font-black text-dark">Relatórios</h1>
          <p className="mt-1 text-text-secondary">Receitas recebidas, reservas e desempenho das quadras.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {quickRanges.map((range) => (
            <Link key={range.label} href={`/admin/relatorios?from=${range.from}&to=${range.to}`} className="rounded-xl border border-border bg-white px-3 py-2 text-sm font-bold text-text-secondary transition hover:border-primary-orange hover:text-primary-orange">
              {range.label}
            </Link>
          ))}
          <Link href={`/admin/relatorios/export?from=${from}&to=${to}`} className="inline-flex items-center gap-2 rounded-xl bg-primary-orange px-4 py-2 text-sm font-bold text-white transition hover:opacity-90">
            <Download size={16} /> Exportar CSV
          </Link>
        </div>
      </div>

      <form action="/admin/relatorios" method="get" className="card-modern flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <label className="flex-1 text-xs font-bold uppercase tracking-wider text-text-secondary">
          De
          <input type="date" name="from" value={from} max={to} className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-medium text-dark" />
        </label>
        <label className="flex-1 text-xs font-bold uppercase tracking-wider text-text-secondary">
          Até
          <input type="date" name="to" value={to} min={from} max={today} className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-medium text-dark" />
        </label>
        <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-700">
          <Filter size={16} /> Aplicar período
        </button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Wallet} label="Recebido líquido" value={formatCurrency(netReceived)} hint={`${formatCurrency(received)} recebidos${refunded > 0 ? ` · ${formatCurrency(refunded)} devolvidos` : ""}`} tone="green" />
        <MetricCard icon={TrendingUp} label="Valor reservado" value={formatCurrency(reservedValue)} hint={`${activeBookings.length} reservas não canceladas no período`} tone="orange" />
        <MetricCard icon={Clock3} label="A receber" value={formatCurrency(pendingReceivable)} hint="Saldo de reservas não pagas ou parciais" tone="amber" />
        <MetricCard icon={CalendarDays} label="Horas reservadas" value={`${bookedHours.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`} hint={`${confirmedBookings.length} confirmadas ou realizadas`} tone="blue" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)]">
        <section className="card-modern p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-dark">Recebimentos no período</h2>
              <p className="mt-1 text-sm text-text-secondary">Valores confirmados no caixa, agrupados {groupByMonth ? "por mês" : "por dia"}.</p>
            </div>
            <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-700">{formatCurrency(received)}</div>
          </div>
          <div className="mt-7 flex h-56 items-end gap-1.5 overflow-x-auto border-b border-border pb-2 sm:gap-2">
            {trendItems.map((item, index) => (
              <div key={index} title={`${item.label}: ${formatCurrency(item.value)}`} className="flex h-full min-w-[24px] flex-1 flex-col items-center justify-end gap-2">
                <div className="w-full rounded-t-md bg-gradient-to-t from-orange-500 to-amber-400 transition-opacity hover:opacity-80" style={{ height: `${Math.max(item.value > 0 ? 5 : 1, (item.value / maxTrend) * 100)}%` }} />
                <span className="whitespace-nowrap text-[9px] font-semibold text-text-secondary sm:text-[10px]">{item.label}</span>
              </div>
            ))}
          </div>
          {receivedPayments.length === 0 && <p className="mt-3 text-center text-xs text-text-secondary">Nenhum pagamento recebido neste período.</p>}
        </section>

        <section className="card-modern p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-orange-50 p-2.5 text-primary-orange"><CreditCard size={20} /></div>
            <div><h2 className="font-black text-dark">Formas de pagamento</h2><p className="text-xs text-text-secondary">Pagamentos recebidos</p></div>
          </div>
          <div className="mt-6 space-y-5">
            {methodItems.length === 0 && <p className="text-sm text-text-secondary">Sem pagamentos registrados no período.</p>}
            {methodItems.map(([method, amount]) => (
              <div key={method}>
                <div className="mb-1.5 flex justify-between gap-3 text-sm"><span className="font-semibold text-dark">{methodLabels[method]}</span><span className="font-bold text-text-secondary">{formatCurrency(amount)}</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-orange-50"><div className="h-full rounded-full bg-primary-orange" style={{ width: `${(amount / maxMethod) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="card-modern p-5 sm:p-6 xl:col-span-2">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600"><MapPin size={20} /></div>
            <div><h2 className="font-black text-dark">Desempenho por quadra</h2><p className="text-xs text-text-secondary">Reservas com início dentro do período selecionado</p></div>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[570px] text-left">
              <thead><tr className="border-b border-border text-[10px] font-black uppercase tracking-wider text-text-secondary"><th className="pb-3">Quadra</th><th className="pb-3">Reservas</th><th className="pb-3">Horas</th><th className="pb-3">Valor reservado</th></tr></thead>
              <tbody>
                {courtItems.map((item) => <tr key={item.name} className="border-b border-border/60 last:border-0"><td className="py-3 font-bold text-dark">{item.name}</td><td className="py-3 text-sm text-text-secondary">{item.count}</td><td className="py-3 text-sm text-text-secondary">{item.hours.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h</td><td className="py-3 text-sm font-bold text-dark">{formatCurrency(item.reserved)}</td></tr>)}
                {courtItems.length === 0 && <tr><td colSpan={4} className="py-10 text-center text-sm text-text-secondary">Nenhuma reserva neste período.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card-modern p-5 sm:p-6">
          <div className="flex items-center gap-3"><div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600"><CheckCircle2 size={20} /></div><div><h2 className="font-black text-dark">Status das reservas</h2><p className="text-xs text-text-secondary">{bookings.length} registros no período</p></div></div>
          <div className="mt-6 space-y-4">
            {statusItems.map((item) => <div key={item.label}><div className="mb-1.5 flex justify-between gap-2 text-xs"><span className="font-semibold text-dark">{item.label}</span><span className="font-black text-dark">{item.count}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${item.style}`} style={{ width: `${(item.count / maxStatus) * 100}%` }} /></div></div>)}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card-modern p-5 sm:p-6">
          <div className="flex items-center gap-3"><div className="rounded-xl bg-violet-50 p-2.5 text-violet-600"><Users size={20} /></div><div><h2 className="font-black text-dark">Reservas por modalidade</h2><p className="text-xs text-text-secondary">Modalidades mais escolhidas</p></div></div>
          <div className="mt-5 space-y-3">
            {modalityItems.length === 0 && <p className="text-sm text-text-secondary">Sem reservas no período.</p>}
            {modalityItems.map(([name, count], index) => <div key={name} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"><div className="flex min-w-0 items-center gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-black text-primary-orange">{index + 1}</span><span className="truncate text-sm font-bold text-dark">{name}</span></div><span className="text-sm font-black text-dark">{count}</span></div>)}
          </div>
        </section>

        <section className="card-modern p-5 sm:p-6">
          <div className="flex items-center gap-3"><div className="rounded-xl bg-amber-50 p-2.5 text-amber-600"><ReceiptText size={20} /></div><div><h2 className="font-black text-dark">Origem das reservas</h2><p className="text-xs text-text-secondary">De onde vieram os agendamentos</p></div></div>
          <div className="mt-5 space-y-4">
            {originItems.length === 0 && <p className="text-sm text-text-secondary">Sem reservas no período.</p>}
            {originItems.map(([origin, count]) => <div key={origin}><div className="mb-1 flex justify-between text-sm"><span className="font-semibold text-dark">{originLabels[origin]}</span><span className="font-bold text-text-secondary">{count}</span></div><div className="h-2 overflow-hidden rounded-full bg-orange-50"><div className="h-full rounded-full bg-primary-orange" style={{ width: `${(count / maxOrigin) * 100}%` }} /></div></div>)}
          </div>
        </section>
      </div>

      <section className="card-modern overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5 sm:px-6">
          <div className="flex items-center gap-3"><div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700"><Banknote size={20} /></div><div><h2 className="font-black text-dark">Movimentações financeiras</h2><p className="text-xs text-text-secondary">Pagamentos recebidos e valores devolvidos no período</p></div></div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{paymentRows.length} movimentações</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-slate-50"><tr className="text-[10px] font-black uppercase tracking-wider text-text-secondary"><th className="px-5 py-3">Data</th><th className="px-5 py-3">Cliente</th><th className="px-5 py-3">Quadra</th><th className="px-5 py-3">Forma</th><th className="px-5 py-3">Situação</th><th className="px-5 py-3 text-right">Valor</th></tr></thead>
            <tbody>
              {paymentHistory.map((payment) => {
                const isRefund = payment.status === PaymentTransactionStatus.REFUNDED;
                const eventDate = isRefund ? payment.refundedAt : payment.paidAt;
                return <tr key={payment.id} className="border-t border-border/60 text-sm"><td className="whitespace-nowrap px-5 py-3 text-text-secondary">{eventDate ? dateLong(eventDate) : "—"}</td><td className="px-5 py-3 font-semibold text-dark">{payment.customer?.name || "Cliente"}</td><td className="px-5 py-3 text-text-secondary">{shortName(payment.booking.court.name)}</td><td className="px-5 py-3 text-text-secondary">{methodLabels[payment.paymentMethod]}</td><td className="px-5 py-3"><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black ${isRefund ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>{isRefund ? <><RotateCcw size={12} /> Devolvido</> : <><ArrowUpRight size={12} /> Recebido</>}</span></td><td className={`whitespace-nowrap px-5 py-3 text-right font-black ${isRefund ? "text-rose-700" : "text-emerald-700"}`}>{isRefund ? "− " : "+ "}{formatCurrency(payment.amount)}</td></tr>;
              })}
              {paymentHistory.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-text-secondary">Nenhuma movimentação financeira no período.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-sm text-blue-900">
        <p className="font-bold">Como ler estes números</p>
        <p className="mt-1 text-blue-800">Recebido considera somente pagamentos registrados na data de pagamento. Valor reservado considera as reservas pelo dia em que a quadra será usada. Reservas canceladas ficam fora do valor reservado; pagamentos devolvidos são descontados do recebido líquido.</p>
        {from > `${today.slice(0, 4)}-01-01` && dayCount === 366 && <p className="mt-2 text-xs">O período foi limitado a até 366 dias.</p>}
      </section>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, hint, tone }: {
  icon: typeof Wallet;
  label: string;
  value: string;
  hint: string;
  tone: "green" | "orange" | "amber" | "blue";
}) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700",
    orange: "bg-orange-50 text-primary-orange",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
  };
  return <article className="card-modern p-5"><div className="flex items-start justify-between gap-3"><div className={`rounded-xl p-3 ${tones[tone]}`}><Icon size={21} /></div><ArrowDownRight className="text-slate-300" size={18} /></div><p className="mt-5 text-xs font-bold uppercase tracking-wider text-text-secondary">{label}</p><p className="mt-1 text-2xl font-black text-dark">{value}</p><p className="mt-1.5 text-xs text-text-secondary">{hint}</p></article>;
}
