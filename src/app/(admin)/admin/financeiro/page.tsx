import Link from "next/link";
import { BookingStatus, PaymentMethod, PaymentStatus, PaymentTransactionStatus } from "@prisma/client";
import { ArrowDownLeft, ArrowUpRight, Banknote, CalendarDays, Clock3, Filter, Wallet } from "lucide-react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatSaoPauloTime, getSaoPauloDateKey } from "@/lib/utils";
import { resolveReportRange } from "@/lib/reporting";
import { FinanceReceivePayment } from "@/components/admin/FinanceReceivePayment";

export const revalidate = 0;

type Props = { searchParams?: { from?: string; to?: string; method?: string } };

const methods: { value: PaymentMethod; label: string }[] = [
  { value: PaymentMethod.PIX, label: "Pix" },
  { value: PaymentMethod.CASH, label: "Dinheiro" },
  { value: PaymentMethod.CREDIT_CARD, label: "Cartão de crédito" },
  { value: PaymentMethod.DEBIT_CARD, label: "Cartão de débito" },
  { value: PaymentMethod.BANK_TRANSFER, label: "Transferência" },
  { value: PaymentMethod.OTHER, label: "Outro" },
];
const methodLabels = Object.fromEntries(methods.map((method) => [method.value, method.label])) as Record<PaymentMethod, string>;

function dateLabel(date: Date) {
  return date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" });
}

export default async function FinanceiroPage({ searchParams = {} }: Props) {
  await requirePermission("canAccessFinance");
  const session = await getSession();
  if (!session) redirect("/login?next=/admin/financeiro");

  const range = resolveReportRange(searchParams.from, searchParams.to);
  const selectedMethod = Object.values(PaymentMethod).includes(searchParams.method as PaymentMethod)
    ? searchParams.method as PaymentMethod
    : "ALL";
  const methodWhere = selectedMethod === "ALL" ? {} : { paymentMethod: selectedMethod };

  const [payments, openBookings, openCount] = await Promise.all([
    prisma.payment.findMany({
      where: {
        companyId: session.companyId,
        ...methodWhere,
        OR: [
          { status: { in: [PaymentTransactionStatus.PAID, PaymentTransactionStatus.PARTIALLY_REFUNDED] }, paidAt: { gte: range.start, lte: range.end } },
          { status: PaymentTransactionStatus.REFUNDED, refundedAt: { gte: range.start, lte: range.end } },
        ],
      },
      include: {
        customer: { select: { name: true } },
        booking: { select: { startTime: true, endTime: true, court: { select: { name: true } } } },
      },
      orderBy: [{ paidAt: "desc" }, { refundedAt: "desc" }],
      take: 250,
    }),
    prisma.booking.findMany({
      where: {
        companyId: session.companyId,
        startTime: { gte: range.start, lte: range.end },
        status: { notIn: [BookingStatus.CANCELED, BookingStatus.AVAILABLE, BookingStatus.BLOCKED] },
        paymentStatus: { in: [PaymentStatus.UNPAID, PaymentStatus.PARTIAL] },
      },
      include: { customer: { select: { name: true } }, court: { select: { name: true } } },
      orderBy: { startTime: "asc" },
      take: 200,
    }),
    prisma.booking.count({
      where: {
        companyId: session.companyId,
        startTime: { gte: range.start, lte: range.end },
        status: { notIn: [BookingStatus.CANCELED, BookingStatus.AVAILABLE, BookingStatus.BLOCKED] },
        paymentStatus: { in: [PaymentStatus.UNPAID, PaymentStatus.PARTIAL] },
      },
    }),
  ]);

  const paid = payments.filter((payment) => payment.status === PaymentTransactionStatus.PAID || payment.status === PaymentTransactionStatus.PARTIALLY_REFUNDED);
  const refunds = payments.filter((payment) => payment.status === PaymentTransactionStatus.REFUNDED);
  const receivedTotal = paid.reduce((sum, payment) => sum + payment.amount, 0);
  const refundedTotal = refunds.reduce((sum, payment) => sum + payment.amount, 0);
  const outstanding = openBookings.reduce((sum, booking) => sum + Math.max(0, booking.totalPrice - booking.paidAmount), 0);
  const today = getSaoPauloDateKey();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary-orange">Controle de caixa</p>
          <h1 className="mt-1 text-3xl font-black text-dark">Financeiro</h1>
          <p className="mt-1 text-text-secondary">Acompanhe pagamentos recebidos e valores pendentes das reservas.</p>
        </div>
        <Link href={`/admin/relatorios?from=${range.from}&to=${range.to}${selectedMethod === "ALL" ? "" : `&method=${selectedMethod}`}`} className="text-sm font-bold text-primary-orange hover:underline">Abrir relatórios →</Link>
      </div>

      <form action="/admin/financeiro" method="get" className="card-modern flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <label className="flex-1 text-xs font-bold uppercase tracking-wider text-text-secondary">De<input type="date" name="from" value={range.from} max={range.to} className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-medium text-dark" /></label>
        <label className="flex-1 text-xs font-bold uppercase tracking-wider text-text-secondary">Até<input type="date" name="to" value={range.to} min={range.from} max={today} className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-medium text-dark" /></label>
        <label className="flex-1 text-xs font-bold uppercase tracking-wider text-text-secondary">Forma de pagamento<select name="method" defaultValue={selectedMethod} className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-medium text-dark"><option value="ALL">Todas as formas</option>{methods.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}</select></label>
        <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-700"><Filter size={16} /> Filtrar</button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Summary icon={ArrowDownLeft} title="Recebido no período" value={formatCurrency(receivedTotal)} detail={`${paid.length} pagamento(s) confirmado(s)`} tone="green" />
        <Summary icon={ArrowUpRight} title="Devolvido no período" value={formatCurrency(refundedTotal)} detail={`${refunds.length} estorno(s) registrado(s)`} tone="rose" />
        <Summary icon={Wallet} title="Saldo a receber" value={formatCurrency(outstanding)} detail={`${openCount} reserva(s) com pagamento pendente`} tone="amber" />
        <Summary icon={CalendarDays} title="Reservas com saldo" value={String(openCount)} detail="No período selecionado" tone="orange" />
      </div>

      <section className="card-modern overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5 sm:px-6">
          <div className="flex items-center gap-3"><div className="rounded-xl bg-amber-50 p-2.5 text-amber-700"><Clock3 size={20} /></div><div><h2 className="font-black text-dark">Pagamentos pendentes</h2><p className="text-xs text-text-secondary">Registre o recebimento quando o cliente pagar. Pendências ainda não têm forma definida.</p></div></div>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">{openBookings.length}{openCount > openBookings.length ? ` de ${openCount}` : ""} reservas</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left">
            <thead className="bg-slate-50"><tr className="text-[10px] font-black uppercase tracking-wider text-text-secondary"><th className="px-5 py-3">Data / horário</th><th className="px-5 py-3">Cliente</th><th className="px-5 py-3">Quadra</th><th className="px-5 py-3">Valor em aberto</th><th className="px-5 py-3">Ação</th></tr></thead>
            <tbody>{openBookings.map((booking) => {
              const balance = Math.max(0, booking.totalPrice - booking.paidAmount);
              return <tr key={booking.id} className="border-t border-border/60 text-sm"><td className="whitespace-nowrap px-5 py-3 text-text-secondary">{dateLabel(booking.startTime)}<br />{formatSaoPauloTime(booking.startTime)}–{formatSaoPauloTime(booking.endTime)}</td><td className="px-5 py-3 font-bold text-dark">{booking.customer?.name || booking.customerNameSnapshot}<div className="text-xs font-normal text-text-secondary">{booking.paymentStatus === PaymentStatus.PARTIAL ? `Já pago: ${formatCurrency(booking.paidAmount)}` : "Ainda não pago"}</div></td><td className="px-5 py-3 text-text-secondary">{booking.court.name}</td><td className="whitespace-nowrap px-5 py-3 font-black text-amber-700">{formatCurrency(balance)}</td><td className="px-5 py-3"><FinanceReceivePayment bookingId={booking.id} /></td></tr>;
            })}{openBookings.length === 0 && <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-text-secondary">Nenhuma reserva com valor pendente neste período.</td></tr>}</tbody>
          </table>
        </div>
        {openCount > openBookings.length && <p className="border-t border-border px-5 py-3 text-xs text-text-secondary">Exibindo as primeiras {openBookings.length} de {openCount} reservas em aberto.</p>}
      </section>

      <section className="card-modern overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5 sm:px-6"><div className="flex items-center gap-3"><div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700"><Banknote size={20} /></div><div><h2 className="font-black text-dark">Movimentações registradas</h2><p className="text-xs text-text-secondary">Pagamentos e devoluções encontrados no banco de dados.</p></div></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{payments.length} movimentações</span></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left"><thead className="bg-slate-50"><tr className="text-[10px] font-black uppercase tracking-wider text-text-secondary"><th className="px-5 py-3">Data</th><th className="px-5 py-3">Cliente</th><th className="px-5 py-3">Quadra / uso</th><th className="px-5 py-3">Forma</th><th className="px-5 py-3">Situação</th><th className="px-5 py-3 text-right">Valor</th></tr></thead><tbody>
          {payments.map((payment) => { const refunded = payment.status === PaymentTransactionStatus.REFUNDED; const eventDate = refunded ? payment.refundedAt : payment.paidAt; return <tr key={payment.id} className="border-t border-border/60 text-sm"><td className="whitespace-nowrap px-5 py-3 text-text-secondary">{eventDate ? dateLabel(eventDate) : "—"}</td><td className="px-5 py-3 font-semibold text-dark">{payment.customer?.name || "Cliente"}</td><td className="px-5 py-3 text-text-secondary">{payment.booking.court.name}<div className="text-xs">Reserva {dateLabel(payment.booking.startTime)} · {formatSaoPauloTime(payment.booking.startTime)}–{formatSaoPauloTime(payment.booking.endTime)}</div></td><td className="px-5 py-3 text-text-secondary">{methodLabels[payment.paymentMethod]}</td><td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${refunded ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>{refunded ? "Devolvido" : payment.status === PaymentTransactionStatus.PARTIALLY_REFUNDED ? "Recebido · estorno parcial" : "Recebido"}</span></td><td className={`whitespace-nowrap px-5 py-3 text-right font-black ${refunded ? "text-rose-700" : "text-emerald-700"}`}>{refunded ? "− " : "+ "}{formatCurrency(payment.amount)}</td></tr>; })}
          {payments.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-text-secondary">Nenhuma movimentação financeira neste período e filtro.</td></tr>}
        </tbody></table></div>
        {payments.length === 250 && <p className="border-t border-border px-5 py-3 text-xs text-text-secondary">A lista atingiu o limite de 250 itens. Reduza o período para consultar mais detalhes.</p>}
      </section>

      <p className="text-xs text-text-secondary">Período consultado: {range.from} a {range.to}. O saldo a receber considera reservas não canceladas com pagamento total ou parcial pendente; recebimentos só entram depois de registrados.</p>
    </div>
  );
}

function Summary({ icon: Icon, title, value, detail, tone }: { icon: typeof Wallet; title: string; value: string; detail: string; tone: "green" | "rose" | "amber" | "orange" }) {
  const style = { green: "bg-emerald-50 text-emerald-700", rose: "bg-rose-50 text-rose-700", amber: "bg-amber-50 text-amber-700", orange: "bg-orange-50 text-primary-orange" }[tone];
  return <article className="card-modern p-5"><div className={`inline-flex rounded-xl p-3 ${style}`}><Icon size={21} /></div><p className="mt-4 text-xs font-bold uppercase tracking-wider text-text-secondary">{title}</p><p className="mt-1 text-2xl font-black text-dark">{value}</p><p className="mt-1.5 text-xs text-text-secondary">{detail}</p></article>;
}
