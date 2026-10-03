"use client";

import Link from "next/link";
import {
  ChevronLeft,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Plus,
  MapPin,
  Activity,
  CalendarCheck,
  Crown,
  Edit,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Customer, Booking, Court, Modality, BookingStatus, CustomerStatus } from "@prisma/client";
import { CustomerFormModal, useCustomerModal, CustomerFormInitial } from "@/components/admin/forms/CustomerFormModal";
import { BookingFormModal, useBookingModal } from "@/components/admin/forms/BookingFormModal";
import { buildWhatsAppLink } from "@/lib/utils";

type BookingJoin = Booking & {
  court: { name: string | null } | null;
  modality: { name: string | null } | null;
};

export function DetalheClienteUI({
  cliente,
  reservas,
  quadrasOptions,
  clientesOptions,
  modalitiesOptions,
}: {
  cliente: Customer;
  reservas: BookingJoin[];
  quadrasOptions: { value: string; label: string }[];
  clientesOptions: { value: string; label: string }[];
  modalitiesOptions: { value: string; label: string }[];
}) {
  const customerModal = useCustomerModal();
  const bookingModal = useBookingModal();

  function formatCurrency(val: number) {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
  function formatDate(d: Date | null) {
    if (!d) return "—";
    return d.toLocaleDateString("pt-BR");
  }
  function formatDateTimeFull(d: Date) {
    return d.toLocaleDateString("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  const initials = cliente.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  const totalGasto = reservas
    .filter((r) => r.status !== BookingStatus.CANCELED)
    .reduce((acc, r) => acc + (r.totalPrice || 0), 0);
  const totalReservas = reservas.filter((r) => r.status !== BookingStatus.CANCELED).length;
  const reservasConfirmadas = reservas.filter(
    (r) =>
      r.status === BookingStatus.CONFIRMED ||
      r.status === BookingStatus.COMPLETED ||
      r.status === BookingStatus.CHECKED_IN,
  ).length;
  const taxaComparecimento = totalReservas > 0 ? Math.round((reservasConfirmadas / totalReservas) * 100) : 0;
  const ticketMedio = totalReservas > 0 ? totalGasto / totalReservas : 0;
  const isVIP = cliente.isVip || (totalReservas >= 30 && taxaComparecimento >= 85);

  function getStatusBadgeReserva(status: BookingStatus) {
    const map: Record<BookingStatus, { style: string; label: string; icon: React.ReactNode }> = {
      AVAILABLE: { style: "bg-status-confirmed/10 text-status-confirmed border-status-confirmed/20", label: "DISPONÍVEL", icon: <CheckCircle2 size={12} /> },
      RESERVED: { style: "bg-red-50 text-red border-red-100", label: "RESERVADO", icon: <XCircle size={12} /> },
      BLOCKED: { style: "bg-gray-100 text-gray-500 border-gray-200", label: "BLOQUEADO", icon: <AlertCircle size={12} /> },
      PENDING: { style: "bg-status-pending/10 text-status-pending border-status-pending/20", label: "PENDENTE", icon: <Clock size={12} /> },
      CONFIRMED: { style: "bg-status-confirmed/10 text-status-confirmed border-status-confirmed/20", label: "CONFIRMADO", icon: <CheckCircle2 size={12} /> },
      CHECKED_IN: { style: "bg-blue-50 text-blue-600 border-blue-100", label: "CHECK-IN", icon: <CheckCircle2 size={12} /> },
      COMPLETED: { style: "bg-purple-50 text-purple-600 border-purple-100", label: "CONCLUÍDO", icon: <CheckCircle2 size={12} /> },
      CANCELED: { style: "bg-gray-100 text-gray-500 border-gray-200", label: "CANCELADO", icon: <XCircle size={12} /> },
      NO_SHOW: { style: "bg-red-50 text-red border-red-100", label: "NÃO COMPARECEU", icon: <XCircle size={12} /> },
    };
    const cfg = map[status] || map.PENDING;
    return (
      <span className={cn("text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border flex items-center gap-1.5 w-fit", cfg.style)}>
        {cfg.icon}{cfg.label}
      </span>
    );
  }

  function getStatusBadgeCliente(status: CustomerStatus) {
    const map: Record<CustomerStatus, { style: string; label: string; icon: React.ReactNode }> = {
      ATIVO: { style: "bg-status-confirmed/10 text-status-confirmed border-status-confirmed/20", label: "ATIVO", icon: <CheckCircle2 size={12} /> },
      INATIVO: { style: "bg-gray-100 text-gray-500 border-gray-200", label: "INATIVO", icon: <Clock size={12} /> },
      BLOQUEADO: { style: "bg-red-50 text-red border-red-100", label: "BLOQUEADO", icon: <AlertCircle size={12} /> },
    };
    const cfg = map[status];
    return (
      <span className={cn("text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border flex items-center gap-1.5 w-fit", cfg.style)}>
        {cfg.icon}{cfg.label}
      </span>
    );
  }

  function getModalityColor(name: string) {
    if (name.includes("Futebol")) return "bg-sport-futebol/10 text-sport-futebol border-sport-futebol/20";
    if (name.includes("Vôlei") || name.includes("Volei")) return "bg-sport-volei/10 text-sport-volei border-sport-volei/20";
    if (name.includes("Futevôlei") || name.includes("Futevolei")) return "bg-sport-futevolei/10 text-sport-futevolei border-sport-futevolei/20";
    if (name.includes("Beach") || name.includes("Tennis")) return "bg-sport-beachTennis/10 text-sport-beachTennis border-sport-beachTennis/20";
    return "bg-gray-100 text-gray-600 border-gray-200";
  }

  const whatsappMsg = `Olá ${cliente.name.split(" ")[0]}! Tudo bem? Passando do sistema Minha Quadra para confirmar/lembrar sobre sua reserva...`;
  const formInitialCustomer: CustomerFormInitial = {
    id: cliente.id,
    name: cliente.name,
    email: cliente.email,
    phone: cliente.phone,
    cpf: cliente.cpf,
    status: cliente.status,
    isVip: cliente.isVip,
    notes: cliente.notes,
  };

  return (
    <div className="space-y-6">
      <Link
        href="/admin/clientes"
        className="inline-flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl hover:bg-background-light text-sm font-bold text-dark transition-colors w-fit"
      >
        <ChevronLeft size={18} /> Voltar para Clientes
      </Link>

      <div className="card-modern overflow-hidden">
        <div className="h-36 bg-gradient-primary relative">
          <div className="absolute inset-0 bg-black/10" />
          {isVIP && (
            <div className="absolute top-5 right-6 px-4 py-2 bg-white/90 backdrop-blur rounded-xl flex items-center gap-2 shadow-soft">
              <Crown size={18} className="text-primary-orange" />
              <span className="text-sm font-black text-primary-orange uppercase tracking-wider">Cliente VIP</span>
            </div>
          )}
        </div>
        <div className="px-8 pb-8 -mt-14 relative">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-5">
              <div className="w-28 h-28 rounded-3xl bg-gradient-primary flex items-center justify-center text-white font-black text-3xl shadow-xl border-4 border-white flex-shrink-0">
                {initials}
              </div>
              <div className="pb-2">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h1 className="text-3xl font-black text-dark tracking-tight">{cliente.name}</h1>
                  {getStatusBadgeCliente(cliente.status)}
                </div>
                <p className="text-sm font-medium text-text-secondary">
                  Cliente desde {formatDate(cliente.createdAt)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {cliente.phone ? (
                <a
                  href={buildWhatsAppLink(cliente.phone, whatsappMsg)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="px-4 py-2.5 border border-border rounded-xl font-bold text-sm text-dark hover:bg-green-50 hover:text-green-600 hover:border-green-100 transition-colors inline-flex items-center gap-2"
                >
                  <Phone size={16} /> Contato
                </a>
              ) : (
                <button disabled className="px-4 py-2.5 border border-border rounded-xl font-bold text-sm text-text-secondary cursor-not-allowed opacity-60 inline-flex items-center gap-2">
                  <Phone size={16} /> Sem Telefone
                </button>
              )}

              <button
                onClick={() =>
                  bookingModal.openWith({
                    customerId: cliente.id,
                  })
                }
                className="px-4 py-2.5 rounded-xl font-bold text-sm text-dark bg-background-light hover:bg-orange-50 border border-border transition-colors inline-flex items-center gap-2"
              >
                <Plus size={16} /> Nova Reserva
              </button>

              <button
                onClick={() => customerModal.edit(formInitialCustomer)}
                className="px-4 py-2.5 rounded-xl font-bold text-sm bg-gradient-primary text-white hover:shadow-lg transition-all inline-flex items-center gap-2"
              >
                <Edit size={16} /> Editar Perfil
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 pt-6 border-t border-border">
            <div className="flex items-center gap-4 p-4 bg-background-light/50 rounded-2xl border border-border/50">
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-primary-orange shadow-soft">
                <Phone size={20} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Telefone</p>
                <p className="text-base font-bold text-dark mt-0.5">
                  {cliente.phone ? (
                    <a
                      href={buildWhatsAppLink(cliente.phone, whatsappMsg)}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="hover:text-primary-orange hover:underline"
                    >
                      {cliente.phone}
                    </a>
                  ) : (
                    "—"
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-background-light/50 rounded-2xl border border-border/50">
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-primary-orange shadow-soft">
                <Mail size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">E-mail</p>
                <p className="text-base font-bold text-dark mt-0.5 truncate">
                  {cliente.email ? <a href={`mailto:${cliente.email}`} className="hover:text-primary-orange hover:underline">{cliente.email}</a> : "—"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-background-light/50 rounded-2xl border border-border/50">
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-primary-orange shadow-soft">
                <CalendarCheck size={20} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Última Reserva</p>
                <p className="text-base font-bold text-dark mt-0.5">{formatDate(cliente.lastBookingAt)}</p>
              </div>
            </div>
          </div>

          {cliente.notes && (
            <div className="mt-6 p-5 bg-yellow-50 border border-yellow-100 rounded-2xl">
              <p className="text-[11px] font-bold text-yellow-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <AlertCircle size={14} /> Observações
              </p>
              <p className="text-sm font-medium text-yellow-900/80 leading-relaxed">{cliente.notes}</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-modern p-6 group hover:border-primary-orange/50 transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-primary-orange group-hover:scale-110 transition-transform">
              <Calendar size={22} />
            </div>
            <span className="text-[11px] font-black uppercase tracking-wider text-text-secondary">Qtd.</span>
          </div>
          <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Total de Reservas</p>
          <h4 className="text-3xl font-black text-dark tracking-tight mt-1">{totalReservas}</h4>
        </div>

        <div className="card-modern p-6 group hover:border-primary-orange/50 transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-status-confirmed group-hover:scale-110 transition-transform">
              <DollarSign size={22} />
            </div>
            <span className="text-[11px] font-black uppercase tracking-wider text-text-secondary">Total</span>
          </div>
          <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Total Gasto</p>
          <h4 className="text-3xl font-black text-dark tracking-tight mt-1">{formatCurrency(totalGasto)}</h4>
        </div>

        <div className="card-modern p-6 group hover:border-primary-orange/50 transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
              <Activity size={22} />
            </div>
            <span className="text-[11px] font-black uppercase tracking-wider text-text-secondary">Média</span>
          </div>
          <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Ticket Médio</p>
          <h4 className="text-3xl font-black text-dark tracking-tight mt-1">{formatCurrency(ticketMedio)}</h4>
        </div>

        <div className="card-modern p-6 group hover:border-primary-orange/50 transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
              <CheckCircle2 size={22} />
            </div>
            <span className={cn(
              "text-[11px] font-black uppercase tracking-wider",
              taxaComparecimento >= 80 ? "text-status-confirmed" : taxaComparecimento >= 50 ? "text-status-pending" : "text-red",
            )}>
              {taxaComparecimento}%
            </span>
          </div>
          <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Taxa de Comparecimento</p>
          <div className="mt-3 h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-1000",
                taxaComparecimento >= 80 ? "bg-status-confirmed" : taxaComparecimento >= 50 ? "bg-status-pending" : "bg-red",
              )}
              style={{ width: `${taxaComparecimento}%` }}
            />
          </div>
        </div>
      </div>

      <div className="card-modern overflow-hidden">
        <div className="p-6 border-b border-border flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-orange-50 flex items-center justify-center text-primary-orange">
              <Clock size={22} />
            </div>
            <div>
              <h3 className="text-xl font-black text-dark tracking-tight">Histórico de Reservas</h3>
              <p className="text-sm font-medium text-text-secondary mt-0.5">
                {reservas.length} reserva{reservas.length === 1 ? "" : "s"} no histórico
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse">
            <thead>
              <tr className="bg-background-light/50 border-b border-border">
                <th className="px-6 py-4 text-left text-xs font-black text-text-secondary uppercase tracking-wider">Data</th>
                <th className="px-6 py-4 text-left text-xs font-black text-text-secondary uppercase tracking-wider">Quadra</th>
                <th className="px-6 py-4 text-left text-xs font-black text-text-secondary uppercase tracking-wider">Modalidade</th>
                <th className="px-6 py-4 text-left text-xs font-black text-text-secondary uppercase tracking-wider">Horário</th>
                <th className="px-6 py-4 text-left text-xs font-black text-text-secondary uppercase tracking-wider">Valor</th>
                <th className="px-6 py-4 text-left text-xs font-black text-text-secondary uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reservas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 mb-4">
                        <Calendar size={28} />
                      </div>
                      <h4 className="text-lg font-bold text-dark mb-1">Nenhuma reserva no histórico</h4>
                      <p className="text-sm text-text-secondary">Este cliente ainda não realizou nenhuma reserva.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                reservas.map((reserva) => (
                  <tr key={reserva.id} className="hover:bg-background-light/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-xl bg-background-light flex items-center justify-center flex-shrink-0">
                          <Calendar size={18} className="text-text-secondary" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-dark">{formatDate(reserva.startTime)}</p>
                          <p className="text-[11px] font-medium text-text-secondary capitalize">
                            {formatDateTimeFull(reserva.startTime).split(",")[0]}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-text-secondary flex-shrink-0" />
                        <span className="text-sm font-bold text-dark">{reserva.court?.name || "—"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-xs font-bold px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 w-fit",
                        getModalityColor(reserva.modality?.name || ""),
                      )}>
                        <Activity size={13} />
                        {reserva.modality?.name || "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-text-secondary flex-shrink-0" />
                        <span className="text-sm font-bold text-dark">
                          {reserva.startTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          {" - "}
                          {reserva.endTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-base font-black text-dark tracking-tight">
                        {formatCurrency(reserva.totalPrice || 0)}
                      </span>
                    </td>
                    <td className="px-6 py-4">{getStatusBadgeReserva(reserva.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CustomerFormModal
        open={customerModal.open}
        onClose={customerModal.close}
        initial={customerModal.initial}
      />

      <BookingFormModal
        open={bookingModal.open}
        onClose={bookingModal.close}
        initial={bookingModal.initial}
        quadras={quadrasOptions}
        clientes={clientesOptions}
        modalities={modalitiesOptions}
      />
    </div>
  );
}
