import { prisma } from "@/lib/prisma";
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Power,
  DollarSign,
  Clock,
  Users,
  ChevronRight,
  Trophy,
  MapPin,
  CalendarCheck,
  Lightbulb,
  Home,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CourtStatus } from "@prisma/client";
import Link from "next/link";

export const revalidate = 60;

const COMPANY_SLUG = "arena-central";

const modalityIcons: Record<string, string> = {
  "Futebol Society": "trophy",
  "Vôlei": "volleyball",
  "Futevôlei": "sun",
  "Beach Tennis": "tennis",
};

const modalityColors: Record<string, { text: string; bg: string; border: string }> = {
  "Futebol Society": {
    text: "text-sport-futebol",
    bg: "bg-sport-futebol",
    border: "border-sport-futebol",
  },
  "Vôlei": {
    text: "text-sport-volei",
    bg: "bg-sport-volei",
    border: "border-sport-volei",
  },
  "Futevôlei": {
    text: "text-sport-futevolei",
    bg: "bg-sport-futevolei",
    border: "border-sport-futevolei",
  },
  "Beach Tennis": {
    text: "text-sport-beachTennis",
    bg: "bg-sport-beachTennis",
    border: "border-sport-beachTennis",
  },
};

function IconForModality({ name }: { name: string }) {
  const cls = "w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm";
  const style =
    name === "Futebol Society"
      ? "bg-sport-futebol"
      : name === "Vôlei"
        ? "bg-sport-volei"
        : name === "Futevôlei"
          ? "bg-sport-futevolei"
          : "bg-sport-beachTennis";

  return (
    <div className={cn(cls, style)}>
      <Trophy size={14} />
    </div>
  );
}

export default async function QuadrasPage() {
  const company = await prisma.company.findUniqueOrThrow({
    where: { slug: COMPANY_SLUG },
  });

  const quadras = await prisma.court.findMany({
    where: { companyId: company.id },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: {
      modality: { select: { name: true, pricePerHour: true, color: true, bgColorClass: true, textColorClass: true, borderColorClass: true } },
      _count: { select: { bookings: true } },
    },
  });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const reservasHojePorQuadra = await prisma.booking.groupBy({
    by: ["courtId"],
    where: {
      companyId: company.id,
      startTime: { gte: todayStart, lte: todayEnd },
    },
    _count: { id: true },
    _sum: { totalPrice: true },
  });

  const mapStats = new Map(
    reservasHojePorQuadra.map((r) => [
      r.courtId,
      { hoje: r._count.id, receitaHoje: r._sum.totalPrice || 0 },
    ]),
  );

  const totalAtivas = quadras.filter((q) => q.isActive).length;
  const totalManutencao = quadras.filter((q) => q.status === CourtStatus.MAINTENANCE).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-modern p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">Total de Quadras</p>
            <p className="text-3xl font-black text-dark mt-2">{quadras.length}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-primary-orange flex items-center justify-center">
            <Trophy size={24} />
          </div>
        </div>
        <div className="card-modern p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">Ativas</p>
            <p className="text-3xl font-black text-status-confirmed mt-2">{totalAtivas}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-green-50 text-status-confirmed flex items-center justify-center">
            <MapPin size={24} />
          </div>
        </div>
        <div className="card-modern p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">Manutenção</p>
            <p className="text-3xl font-black text-status-pending mt-2">{totalManutencao}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-yellow-50 text-status-pending flex items-center justify-center">
            <Power size={24} />
          </div>
        </div>
      </div>

      <div className="card-modern">
        <div className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border">
          <div>
            <h3 className="text-xl font-black text-dark">Gestão de Quadras</h3>
            <p className="text-sm font-medium text-text-secondary mt-1">
              {quadras.length} quadras cadastradas
            </p>
          </div>
          <button className="btn-primary flex items-center gap-2 py-2.5 px-5 whitespace-nowrap">
            <Plus size={18} />
            Adicionar Quadra
          </button>
        </div>

        <div className="p-6 flex flex-col sm:flex-row gap-3 border-b border-border">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              placeholder="Buscar quadra, modalidade..."
              className="input-plain w-full pl-11 text-sm"
            />
          </div>
          <select
            className="input-plain text-sm flex items-center gap-2 cursor-pointer whitespace-nowrap"
            defaultValue=""
          >
            <option value="">Status</option>
            <option value="ACTIVE">Ativa</option>
            <option value="MAINTENANCE">Manutenção</option>
            <option value="INACTIVE">Inativa</option>
          </select>
          <div className="input-plain flex items-center gap-2 text-sm cursor-pointer whitespace-nowrap">
            <Filter size={16} /> Filtros
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {quadras.length === 0 && (
            <div className="col-span-full text-center py-16 text-text-secondary font-medium">
              Nenhuma quadra cadastrada ainda.
            </div>
          )}

          {quadras.map((q) => {
            const modalityName = q.modality?.name || "Indefinida";
            const colors =
              modalityColors[modalityName] || {
                text: "text-primary-orange",
                bg: "bg-primary-orange",
                border: "border-primary-orange",
              };
            const stats = mapStats.get(q.id) || { hoje: 0, receitaHoje: 0 };
            const isActive = q.isActive && q.status === CourtStatus.ACTIVE;

            return (
              <div
                key={q.id}
                className={cn(
                  "group border rounded-3xl overflow-hidden transition-all duration-300",
                  "border-border bg-white",
                  isActive
                    ? "hover:shadow-lg hover:-translate-y-1 hover:border-primary-orange/40"
                    : "opacity-75",
                )}
              >
                <div className="flex items-center justify-between p-5 border-b border-border bg-background-light/40">
                  <div className="flex items-center gap-3">
                    <IconForModality name={modalityName} />
                    <div>
                      <h4 className="text-lg font-black text-dark tracking-tight">{q.name}</h4>
                      <p className="text-xs font-bold text-text-secondary uppercase">{modalityName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-text-secondary hover:text-dark hover:bg-background-light rounded-lg transition-colors">
                      <Eye size={16} />
                    </button>
                    <button className="p-2 text-text-secondary hover:text-primary-orange hover:bg-orange-50 rounded-lg transition-colors">
                      <Edit size={16} />
                    </button>
                    <div className="relative">
                      <button className="p-2 text-text-secondary hover:text-dark hover:bg-background-light rounded-lg transition-colors">
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {q.description && (
                    <p className="text-xs font-medium text-text-secondary leading-relaxed">
                      {q.description}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-background-light/60 rounded-2xl p-3 flex items-center gap-2.5">
                      <DollarSign size={18} className="text-primary-orange shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-text-secondary uppercase leading-none">
                          Preço / Hora
                        </p>
                        <p className="text-sm font-black text-dark mt-1">
                          {q.pricePerHour.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="bg-background-light/60 rounded-2xl p-3 flex items-center gap-2.5">
                      <Clock size={18} className="text-primary-orange shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-text-secondary uppercase leading-none">
                          Horário
                        </p>
                        <p className="text-sm font-black text-dark mt-1">
                          {q.startTime} - {q.endTime}
                        </p>
                      </div>
                    </div>
                    <div className="bg-background-light/60 rounded-2xl p-3 flex items-center gap-2.5">
                      <CalendarCheck size={18} className="text-primary-orange shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-text-secondary uppercase leading-none">
                          Hoje
                        </p>
                        <p className="text-sm font-black text-dark mt-1">
                          {stats.hoje} reserva{stats.hoje !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="bg-background-light/60 rounded-2xl p-3 flex items-center gap-2.5">
                      <DollarSign size={18} className="text-status-confirmed shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-text-secondary uppercase leading-none">
                          Receita Hoje
                        </p>
                        <p className="text-sm font-black text-status-confirmed mt-1">
                          {stats.receitaHoje.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {q.isCovered && (
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-1 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                        <Home size={11} /> Coberta
                      </span>
                    )}
                    {q.hasLighting && (
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-1 rounded-lg bg-yellow-50 text-yellow-700 border border-yellow-100">
                        <Lightbulb size={11} /> Iluminação LED
                      </span>
                    )}
                    {q.capacity && (
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-1 rounded-lg bg-purple-50 text-purple-600 border border-purple-100">
                        <Users size={11} /> até {q.capacity} pessoas
                      </span>
                    )}
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-border">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "w-2 h-2 rounded-full",
                          isActive
                            ? "bg-status-confirmed"
                            : q.status === CourtStatus.MAINTENANCE
                              ? "bg-status-pending"
                              : "bg-gray-400",
                        )}
                      />
                      <span className="text-xs font-black uppercase tracking-wider text-text-secondary">
                        {q.status === CourtStatus.ACTIVE
                          ? "Operando"
                          : q.status === CourtStatus.MAINTENANCE
                            ? "Em Manutenção"
                            : "Inativa"}
                      </span>
                    </div>
                    <Link
                      href={`/admin/agendamentos?court=${q.id}`}
                      className="flex items-center gap-1 text-xs font-black text-primary-orange hover:underline group-hover:translate-x-1 transition-all duration-300"
                    >
                      Ver Agenda <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
