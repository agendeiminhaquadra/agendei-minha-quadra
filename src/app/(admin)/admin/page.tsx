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
import { BookingStatus } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const revalidate = 30;

function formatCurrency(val: number) {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatTime(d: Date) {
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

async function getDashboardData() {
  const session = await getSession();
  if (!session) {
    redirect("/login?next=/admin");
  }

  const company = await prisma.company.findUniqueOrThrow({
    where: { id: session.companyId },
  });

  const inicioHoje = new Date();
  inicioHoje.setHours(0, 0, 0, 0);
  const fimHoje = new Date();
  fimHoje.setHours(23, 59, 59, 999);

  const inicioOntem = new Date(inicioHoje);
  inicioOntem.setDate(inicioOntem.getDate() - 1);
  const fimOntem = new Date(fimHoje);
  fimOntem.setDate(fimOntem.getDate() - 1);

  const [
    reservasHoje,
    receitaHoje,
    quadrasTotal,
    quadrasAtivas,
    clientesTotal,
    reservasOntem,
    receitaOntem,
    clientesNovosHoje,
    agendaHojeCompleta,
    modalidadesAggregadas,
  ] = await Promise.all([
    prisma.booking.count({
      where: {
        companyId: company.id,
        startTime: { gte: inicioHoje, lte: fimHoje },
        status: { notIn: [BookingStatus.CANCELED] },
      },
    }),
    prisma.booking.aggregate({
      _sum: { totalPrice: true },
      where: {
        companyId: company.id,
        startTime: { gte: inicioHoje, lte: fimHoje },
        status: { notIn: [BookingStatus.CANCELED] },
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
    prisma.booking.aggregate({
      _sum: { totalPrice: true },
      where: {
        companyId: company.id,
        startTime: { gte: inicioOntem, lte: fimOntem },
        status: { notIn: [BookingStatus.CANCELED] },
      },
    }),
    prisma.customer.count({
      where: { companyId: company.id, createdAt: { gte: inicioHoje } },
    }),
    prisma.booking.findMany({
      where: {
        companyId: company.id,
        startTime: { gte: inicioHoje, lte: fimHoje },
      },
      include: {
        court: { select: { name: true } },
        modality: { select: { name: true } },
        customer: { select: { name: true } },
      },
      orderBy: { startTime: "asc" },
      take: 10,
    }),
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

  const receitaHojeValor = receitaHoje._sum.totalPrice || 0;
  const receitaOntemValor = receitaOntem._sum.totalPrice || 0;

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

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);
  const receitaMes = await prisma.booking.aggregate({
    _sum: { totalPrice: true },
    where: {
      companyId: company.id,
      startTime: { gte: inicioMes },
      status: { notIn: [BookingStatus.CANCELED] },
    },
  });

  const userLogged = await prisma.user.findUnique({
    where: { id: session.userId, companyId: session.companyId },
    select: { name: true },
  });

  return {
    company,
    userName: userLogged?.name || "Administrador",
    reservasHoje,
    receitaHojeValor,
    quadrasAtivas,
    quadrasTotal,
    quadrasManutencao,
    clientesTotal,
    clientesNovosHoje,
    deltaReservas,
    deltaReceita,
    pctReservas,
    agendaHojeCompleta,
    modalidadesOcupacao,
    receitaMes: receitaMes._sum.totalPrice || 0,
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
        <StatCard
          title="Receita do Dia"
          value={formatCurrency(data.receitaHojeValor)}
          icon={<DollarSign className="text-primary-orange" size={24} />}
          change={
            data.deltaReceita >= 0
              ? `+${formatCurrency(data.deltaReceita)} vs ontem`
              : `-${formatCurrency(Math.abs(data.deltaReceita))} vs ontem`
          }
          positive={data.deltaReceita >= 0}
        />
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
              Agenda de Hoje
            </h3>
            <button className="text-primary-orange text-sm font-bold hover:underline flex items-center gap-1">
              Ver agenda completa <ChevronRight size={16} />
            </button>
          </div>

          <div className="card-modern overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-background-light/50 border-b border-border">
                    <th className="px-6 py-4 text-xs font-black text-text-secondary uppercase tracking-wider">Horário</th>
                    <th className="px-6 py-4 text-xs font-black text-text-secondary uppercase tracking-wider">Quadra</th>
                    <th className="px-6 py-4 text-xs font-black text-text-secondary uppercase tracking-wider">Modalidade</th>
                    <th className="px-6 py-4 text-xs font-black text-text-secondary uppercase tracking-wider">Cliente</th>
                    <th className="px-6 py-4 text-xs font-black text-text-secondary uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.agendaHojeCompleta.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-text-secondary font-medium">
                        Nenhum agendamento para hoje ainda.
                      </td>
                    </tr>
                  )}
                  {data.agendaHojeCompleta.map((item) => (
                    <tr key={item.id} className="hover:bg-background-light/30 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-dark">
                          {formatTime(item.startTime)} - {formatTime(item.endTime)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-text-secondary">
                        {item.court?.name}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-50 text-primary-orange border border-orange-100">
                          {item.modality?.name || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-background-light flex items-center justify-center text-xs font-bold text-primary-orange">
                            {(item.customer?.name || item.customerNameSnapshot).charAt(0)}
                          </div>
                          <span className="text-sm font-bold text-dark">
                            {item.customer?.name || item.customerNameSnapshot}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={item.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

          <div className="card-modern p-6 bg-gradient-primary text-white">
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
                <span className="text-3xl font-black">{formatCurrency(data.receitaMes)}</span>
              </div>
              <p className="text-sm text-white/80 leading-relaxed">
                Total de receita gerada pelo complexo esportivo no mês corrente.
              </p>
              <button className="w-full py-2.5 bg-white text-primary-orange rounded-xl font-bold text-sm hover:bg-orange-50 transition-colors">
                Ver Relatório Completo
              </button>
            </div>
          </div>
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
