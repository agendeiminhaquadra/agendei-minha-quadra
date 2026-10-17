import { prisma } from "@/lib/prisma";
import {
  Calendar,
  DollarSign,
  Activity,
  Users,
  ArrowUpRight,
  MoreVertical,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BookingStatus, Role } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSaoPauloDateKey, getSaoPauloDayBounds } from "@/lib/utils";
import Link from "next/link";
import { BookingManagementActions } from "@/components/admin/BookingManagementActions";

export const revalidate = 0;

function formatCurrency(val: number) {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatTime(d: Date) {
  return d.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
}

function formatBookingDate(d: Date) {
  return d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" });
}

async function getDashboardData() {
  const session = await getSession();
  if (!session) {
    redirect("/login?next=/admin");
  }

  const userLogged = await prisma.user.findFirst({
    where: { id: session.userId, companyId: session.companyId, isActive: true },
    select: { name: true, role: true, canManageBookings: true, canCancelBookings: true, canAccessFinance: true },
  });
  if (!userLogged) redirect("/login");
  const canAccessFinance = userLogged.role === Role.ADMIN || userLogged.canAccessFinance;
  const canManageBookings = userLogged.role === Role.ADMIN || userLogged.canManageBookings;
  const canCancelBookings = userLogged.role === Role.ADMIN || userLogged.canCancelBookings;

  const company = await prisma.company.findUniqueOrThrow({
    where: { id: session.companyId },
  });

  const hojeKey = getSaoPauloDateKey();
  const ontemDate = new Date(`${hojeKey}T00:00:00Z`);
  ontemDate.setUTCDate(ontemDate.getUTCDate() - 1);
  const ontemKey = ontemDate.toISOString().slice(0, 10);
  const { start: inicioHoje, end: fimHoje } = getSaoPauloDayBounds(hojeKey);
  const { start: inicioOntem, end: fimOntem } = getSaoPauloDayBounds(ontemKey);

  const [
    reservasHoje,
    receitaHoje,
    quadrasTotal,
    quadrasAtivas,
    clientesTotal,
    reservasOntem,
    receitaOntem,
    clientesNovosHoje,
    proximasReservas,
    modalidadesAggregadas,
  ] = await Promise.all([
    prisma.booking.count({
      where: {
        companyId: company.id,
        startTime: { gte: inicioHoje, lte: fimHoje },
        status: { notIn: [BookingStatus.CANCELED] },
      },
    }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        companyId: company.id,
        paidAt: { gte: inicioHoje, lte: fimHoje },
        status: "PAID",
      },
    }),
    prisma.court.count({ where: { companyId: company.id } }),
    prisma.court.count({ where: { companyId: company.id, isActive: true, status: "ACTIVE" } }),
    prisma.customer.count({ where: { companyId: company.id } }),
    prisma.booking.count({
      where: {
        companyId: company.id,
        startTime: { gte: inicioOntem, lte: fimOntem },
        status: { notIn: [BookingStatus.CANCELED] },
      },
    }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        companyId: company.id,
        paidAt: { gte: inicioOntem, lte: fimOntem },
        status: "PAID",
      },
    }),
    prisma.customer.count({
      where: { companyId: company.id, createdAt: { gte: inicioHoje } },
    }),
    canManageBookings ? prisma.booking.findMany({
      where: {
        companyId: company.id,
        startTime: { gte: new Date() },
        status: { not: BookingStatus.CANCELED },
      },
      include: {
        court: { select: { name: true } },
        modality: { select: { name: true } },
        customer: { select: { name: true, phone: true } },
      },
      orderBy: { startTime: "asc" },
      take: 10,
    }) : Promise.resolve([]),
    prisma.modality.findMany({
      where: { companyId: company.id, isActive: true },
      include: {
        courts: true,
        courtRelations: {
          include: {
            court: true,
          },
        },
      },
    }),
  ]);

  const receitaHojeValor = receitaHoje._sum.amount || 0;
  const receitaOntemValor = receitaOntem._sum.amount || 0;

  const deltaReservas = reservasHoje - reservasOntem;
  const deltaReceita = receitaHojeValor - receitaOntemValor;
  const pctReservas = reservasOntem > 0 ? Math.round((deltaReservas / reservasOntem) * 100) : reservasHoje > 0 ? 100 : 0;
  const quadrasManutencao = quadrasTotal - quadrasAtivas;

  const modalidadesOcupacao = await Promise.all(
    modalidadesAggregadas.map(async (mod) => {
      const courtIds = [
        ...mod.courts.map((c) => c.id),
        ...mod.courtRelations.map((r) => r.courtId),
      ];
      const uniqueCourtIds = [...new Set(courtIds)];

      if (uniqueCourtIds.length === 0) {
        return { name: mod.name, porcentagem: 0, cor: mod.bgColorClass || "bg-primary-orange" };
      }

      const totalSlotsHoje = uniqueCourtIds.length * 15;
      const reservasModHoje = await prisma.booking.count({
        where: {
          companyId: company.id,
          startTime: { gte: inicioHoje, lte: fimHoje },
          courtId: { in: uniqueCourtIds },
          status: { notIn: [BookingStatus.CANCELED] },
        },
      });

      const porcentagem = Math.min(100, Math.round((reservasModHoje / Math.max(totalSlotsHoje, 1)) * 100));
      return {
        name: mod.name,
        porcentagem,
        cor: mod.bgColorClass || "bg-primary-orange",
      };
    }),
  );

  const inicioMes = getSaoPauloDayBounds(`${hojeKey.slice(0, 7)}-01`).start;
  const proximoMesDate = new Date(`${hojeKey.slice(0, 7)}-01T00:00:00Z`);
  proximoMesDate.setUTCMonth(proximoMesDate.getUTCMonth() + 1);
  const inicioProximoMes = getSaoPauloDayBounds(proximoMesDate.toISOString().slice(0, 10)).start;
  const receitaMes = await prisma.payment.aggregate({
    _sum: { amount: true },
    where: {
      companyId: company.id,
      paidAt: { gte: inicioMes, lt: inicioProximoMes },
      status: "PAID",
    },
  });

  return {
    company,
    userName: userLogged?.name || "Administrador",
    reservasHoje,
    receitaHojeValor: canAccessFinance ? receitaHojeValor : null,
    quadrasAtivas,
    quadrasTotal,
    quadrasManutencao,
    clientesTotal,
    clientesNovosHoje,
    deltaReservas,
    deltaReceita: canAccessFinance ? deltaReceita : null,
    pctReservas,
    proximasReservas,
    modalidadesOcupacao,
    receitaMes: canAccessFinance ? receitaMes._sum.amount || 0 : null,
    canAccessFinance,
    canManageBookings,
    canCancelBookings,
  };
}

export default async function AdminDashboard() {
  const data = await getDashboardData();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-black text-dark tracking-tight">Olá, {data.userName} 👋</h2>
        <p className="text-text-secondary font-medium">Veja o resumo do seu complexo esportivo hoje.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total de Reservas"
          value={String(data.reservasHoje)}
          icon={<Calendar className="text-primary-orange" size={24} />}
          change={
            data.deltaReservas >= 0
              ? `+${data.pctReservas}% vs ontem (${data.reservasHoje - data.deltaReservas})`
              : `${data.pctReservas}% vs ontem`
          }
          positive={data.deltaReservas >= 0}
        />
        {data.canAccessFinance && <StatCard
          title="Recebido hoje"
          value={formatCurrency(data.receitaHojeValor || 0)}
          icon={<DollarSign className="text-primary-orange" size={24} />}
          change={
            (data.deltaReceita || 0) >= 0
              ? `+${formatCurrency(data.deltaReceita || 0)} vs ontem`
              : `-${formatCurrency(Math.abs(data.deltaReceita || 0))} vs ontem`
          }
          positive={(data.deltaReceita || 0) >= 0}
        />}
        <StatCard
          title="Quadras Ativas"
          value={`${data.quadrasAtivas} / ${data.quadrasTotal}`}
          icon={<Activity className="text-primary-orange" size={24} />}
          change={
            data.quadrasManutencao > 0
              ? `${data.quadrasManutencao} em manutenção`
              : "Todas operando"
          }
          positive={data.quadrasManutencao === 0}
        />
        <StatCard
          title="Clientes"
          value={String(data.clientesTotal)}
          icon={<Users className="text-primary-orange" size={24} />}
          change={data.clientesNovosHoje > 0 ? `+${data.clientesNovosHoje} novos hoje` : "Sem novos hoje"}
          positive={data.clientesNovosHoje > 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-dark flex items-center gap-2">
              <Clock size={20} className="text-primary-orange" />
              Próximas reservas
            </h3>
            <Link href="/admin/agendamentos" className="text-primary-orange text-sm font-bold hover:underline flex items-center gap-1">
              Ver agenda completa <ChevronRight size={16} />
            </Link>
          </div>

          <div className="card-modern overflow-hidden divide-y divide-border">
            {data.proximasReservas.length === 0 && (
              <p className="px-6 py-12 text-center text-text-secondary font-medium">Nenhuma reserva futura no momento.</p>
            )}
            {data.proximasReservas.map((item) => (
              <article key={item.id} className={cn(
                "grid gap-4 p-5 transition-colors sm:p-6 xl:grid-cols-[minmax(0,1fr)_minmax(240px,290px)]",
                item.status === BookingStatus.PENDING && "animate-pulse bg-amber-50/50 motion-reduce:animate-none",
              )}>
                <div className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4 sm:gap-x-5">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-wider text-text-secondary">Data e horário</p>
                    <p className="mt-1 text-sm font-bold text-dark">{formatBookingDate(item.startTime)}</p>
                    <p className="text-xs font-semibold text-text-secondary">{formatTime(item.startTime)} - {formatTime(item.endTime)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-wider text-text-secondary">Quadra</p>
                    <p className="mt-1 break-words text-sm font-bold text-dark">{item.court?.name}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-wider text-text-secondary">Modalidade</p>
                    <p className="mt-1 break-words text-sm font-semibold text-primary-orange">{item.modality?.name || "—"}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-wider text-text-secondary">Cliente</p>
                    <div className="mt-1 flex min-w-0 items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-50 text-xs font-bold text-primary-orange">
                        {(item.customer?.name || item.customerNameSnapshot).charAt(0)}
                      </span>
                      <span className="truncate text-sm font-bold text-dark">{item.customer?.name || item.customerNameSnapshot}</span>
                    </div>
                  </div>
                </div>
                <div className="min-w-0 border-t border-border pt-3 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
                  <StatusBadge status={item.status} />
                  <BookingManagementActions
                    bookingId={item.id}
                    customerName={item.customerNameSnapshot}
                    customerPhone={item.customerPhoneSnapshot || item.customer?.phone || null}
                    courtName={item.court?.name || "Quadra"}
                    modalityName={item.modality?.name || null}
                    startTime={item.startTime}
                    endTime={item.endTime}
                    totalPrice={item.totalPrice}
                    status={item.status}
                    paymentStatus={item.paymentStatus}
                    canManageBookings={data.canManageBookings}
                    canCancelBookings={data.canCancelBookings}
                    canAccessFinance={data.canAccessFinance}
                  />
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card-modern p-6 space-y-6">
            <h3 className="text-lg font-bold text-dark border-b border-border pb-4">Ocupação das Quadras</h3>
            <div className="space-y-6">
              {data.modalidadesOcupacao.length === 0 && (
                <p className="text-sm text-text-secondary">Sem modalidades cadastradas.</p>
              )}
              {data.modalidadesOcupacao.map((item) => (
                <div key={item.name} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="text-sm font-bold text-dark">{item.name}</span>
                    <span className="text-sm font-black text-primary-orange">{item.porcentagem}%</span>
                  </div>
                  <div className="h-2 w-full bg-background-light rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-1000", item.cor)}
                      style={{ width: `${item.porcentagem}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {data.canAccessFinance && <div className="card-modern p-6 bg-gradient-primary text-white">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-bold">Relatório Mensal</h3>
                <p className="text-white/70 text-xs font-medium">
                  {new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                </p>
              </div>
              <ArrowUpRight size={20} className="text-white/80" />
            </div>
            <div className="space-y-4">
              <div className="flex items-end justify-between">
                <span className="text-3xl font-black">{formatCurrency(data.receitaMes || 0)}</span>
              </div>
              <p className="text-sm text-white/80 leading-relaxed">
                Pagamentos recebidos e registrados neste mês.
              </p>
              <Link href="/admin/relatorios" className="block w-full rounded-xl bg-white py-2.5 text-center text-sm font-bold text-primary-orange transition-colors hover:bg-orange-50">
                Ver Relatório Completo
              </Link>
            </div>
          </div>}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  change,
  positive,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  change: string;
  positive?: boolean;
}) {
  return (
    <div className="card-modern p-6 group hover:border-primary-orange transition-all duration-300">
      <div className="flex justify-between items-start mb-4">
        <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        <button className="text-text-secondary hover:text-dark">
          <MoreVertical size={20} />
        </button>
      </div>
      <div>
        <p className="text-sm font-bold text-text-secondary mb-1">{title}</p>
        <h4 className="text-3xl font-black text-dark tracking-tight mb-2">{value}</h4>
        <p
          className={cn(
            "text-xs font-bold flex items-center gap-1",
            positive ? "text-status-confirmed" : "text-text-secondary",
          )}
        >
          {positive && <ArrowUpRight size={14} />}
          {change}
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: BookingStatus }) {
  const map: Record<BookingStatus, { style: string; label: string; icon: React.ReactNode }> = {
    AVAILABLE: {
      style: "bg-status-confirmed/10 text-status-confirmed border-status-confirmed/20",
      label: "DISPONÍVEL",
      icon: <CheckCircle2 size={14} />,
    },
    RESERVED: {
      style: "bg-red-50 text-red border-red-100",
      label: "RESERVADO",
      icon: <XCircle size={14} />,
    },
    BLOCKED: {
      style: "bg-gray-100 text-gray-500 border-gray-200",
      label: "BLOQUEADO",
      icon: <AlertCircle size={14} />,
    },
    PENDING: {
      style: "bg-status-pending/10 text-status-pending border-status-pending/20",
      label: "PENDENTE",
      icon: <AlertCircle size={14} />,
    },
    CONFIRMED: {
      style: "bg-status-confirmed/10 text-status-confirmed border-status-confirmed/20",
      label: "CONFIRMADO",
      icon: <CheckCircle2 size={14} />,
    },
    CHECKED_IN: {
      style: "bg-blue-50 text-blue-600 border-blue-100",
      label: "CHECK-IN",
      icon: <CheckCircle2 size={14} />,
    },
    COMPLETED: {
      style: "bg-purple-50 text-purple-600 border-purple-100",
      label: "CONCLUÍDO",
      icon: <CheckCircle2 size={14} />,
    },
    CANCELED: {
      style: "bg-gray-100 text-gray-500 border-gray-200",
      label: "CANCELADO",
      icon: <XCircle size={14} />,
    },
    NO_SHOW: {
      style: "bg-red-50 text-red border-red-100",
      label: "NÃO COMPARECEU",
      icon: <XCircle size={14} />,
    },
  };

  const cfg = map[status] || map.PENDING;

  return (
    <span
      className={cn(
        "text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg border flex items-center gap-1.5 w-fit",
        cfg.style,
      )}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}
