"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Ban,
  CheckCircle,
  Users,
  UserPlus,
  Crown,
  AlertTriangle,
  Trash,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Customer, CustomerStatus } from "@prisma/client";
import { CustomerFormModal, useCustomerModal, CustomerFormInitial } from "@/components/admin/forms/CustomerFormModal";
import { Modal } from "@/components/admin/forms/FormPrimitives";
import { toggleCustomerStatusAction, deleteCustomerAction } from "@/app/(admin)/admin/actions";
import { buildWhatsAppLink } from "@/lib/utils";
import { useTransition } from "react";

type CustomerWithCounts = Customer & { _count: { bookings: number } };

export function ListaClientesUI({ clientes, total, ativos, inativos, bloqueados }: {
  clientes: CustomerWithCounts[];
  total: number;
  ativos: number;
  inativos: number;
  bloqueados: number;
}) {
  const customerModal = useCustomerModal();
  const [confirmDelete, setConfirmDelete] = useState<CustomerWithCounts | null>(null);
  const [pendingAction, startAction] = useTransition();

  function formatPhone(p: string | null) {
    if (!p) return "—";
    return p;
  }
  function formatDate(d: Date | null) {
    if (!d) return "—";
    return d.toLocaleDateString("pt-BR");
  }
  function toFormInitial(c: CustomerWithCounts): CustomerFormInitial {
    return {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      cpf: c.cpf,
      status: c.status,
      isVip: c.isVip,
      notes: c.notes,
    };
  }

  function handleToggleStatus(c: CustomerWithCounts, novoStatus: CustomerStatus) {
    if (pendingAction) return;
    startAction(async () => {
      await toggleCustomerStatusAction(c.id, novoStatus);
    });
  }

  function handleDeleteConfirm() {
    if (!confirmDelete || pendingAction) return;
    const id = confirmDelete.id;
    startAction(async () => {
      await deleteCustomerAction(id);
      setConfirmDelete(null);
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-modern p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">Total de Clientes</p>
            <p className="text-3xl font-black text-dark mt-2">{total}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-primary-orange flex items-center justify-center">
            <Users size={24} />
          </div>
        </div>
        <div className="card-modern p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">Ativos</p>
            <p className="text-3xl font-black text-status-confirmed mt-2">{ativos}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-green-50 text-status-confirmed flex items-center justify-center">
            <CheckCircle size={24} />
          </div>
        </div>
        <div className="card-modern p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">Inativos</p>
            <p className="text-3xl font-black text-text-secondary mt-2">{inativos}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gray-100 text-text-secondary flex items-center justify-center">
            <Ban size={24} />
          </div>
        </div>
        <div className="card-modern p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">Bloqueados</p>
            <p className="text-3xl font-black text-red mt-2">{bloqueados}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red flex items-center justify-center">
            <Ban size={24} />
          </div>
        </div>
      </div>

      <div className="card-modern">
        <div className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border">
          <div>
            <h3 className="text-xl font-black text-dark">Gestão de Clientes</h3>
            <p className="text-sm font-medium text-text-secondary mt-1">{clientes.length} clientes encontrados</p>
          </div>
          <button
            onClick={() => customerModal.create()}
            className="btn-primary flex items-center gap-2 py-2.5 px-5 whitespace-nowrap"
          >
            <Plus size={18} />
            Adicionar Cliente
          </button>
        </div>

        <div className="p-6 flex flex-col sm:flex-row gap-3 border-b border-border">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              placeholder="Buscar por nome, e-mail ou telefone..."
              className="input-plain w-full pl-11 text-sm"
            />
          </div>
          <select className="input-plain text-sm flex items-center gap-2 cursor-pointer whitespace-nowrap" defaultValue="">
            <option value="">Status</option>
            <option value="ATIVO">Ativo</option>
            <option value="INATIVO">Inativo</option>
            <option value="BLOQUEADO">Bloqueado</option>
          </select>
          <div className="input-plain flex items-center gap-2 text-sm cursor-pointer whitespace-nowrap">
            <ArrowUpDown size={16} /> Ordenar por: Nome
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-background-light/50">
                <th className="px-6 py-4 text-xs font-black text-text-secondary uppercase tracking-wider">Nome</th>
                <th className="px-6 py-4 text-xs font-black text-text-secondary uppercase tracking-wider">Telefone</th>
                <th className="px-6 py-4 text-xs font-black text-text-secondary uppercase tracking-wider">E-mail</th>
                <th className="px-6 py-4 text-xs font-black text-text-secondary uppercase tracking-wider text-center">Total Reservas</th>
                <th className="px-6 py-4 text-xs font-black text-text-secondary uppercase tracking-wider">Última Reserva</th>
                <th className="px-6 py-4 text-xs font-black text-text-secondary uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-black text-text-secondary uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {clientes.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-text-secondary font-medium">
                    Nenhum cliente cadastrado ainda. Clique em "Adicionar Cliente"
                  </td>
                </tr>
              )}
              {clientes.map((c) => {
                const initials = c.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
                return (
                  <tr key={c.id} className="hover:bg-background-light/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-11 h-11 rounded-xl flex items-center justify-center text-sm font-black text-white",
                          c.status === CustomerStatus.BLOQUEADO && "opacity-50 grayscale",
                        )} style={{ background: `linear-gradient(135deg, #FF8A00 0%, #FFB347 100%)` }}>
                          {initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-dark">{c.name}</p>
                            {c.isVip && (
                              <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-100">
                                <Crown size={11} /> VIP
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-text-secondary mt-0.5">Cadastrado em {formatDate(c.createdAt)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <a
                        href={buildWhatsAppLink(c.phone, `Olá ${c.name.split(" ")[0]}! Tudo bem? Vim do sistema Minha Quadra.`)}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-sm font-medium text-text-secondary hover:text-primary-orange hover:underline inline-flex items-center gap-1"
                      >
                        {formatPhone(c.phone)}
                      </a>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-text-secondary">
                      {c.email ? <a href={`mailto:${c.email}`} className="hover:text-primary-orange hover:underline">{c.email}</a> : <span className="italic">—</span>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center min-w-[2.5rem] px-3 py-1 rounded-xl text-sm font-black bg-background-light text-dark">
                        {c._count.bookings || c.totalBookings || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-text-secondary">{formatDate(c.lastBookingAt)}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-xs font-black uppercase px-2.5 py-1 rounded-lg border w-fit inline-flex items-center gap-1.5",
                        c.status === CustomerStatus.ATIVO && "bg-green-50 text-status-confirmed border-green-100",
                        c.status === CustomerStatus.INATIVO && "bg-gray-100 text-text-secondary border-gray-200",
                        c.status === CustomerStatus.BLOQUEADO && "bg-red-50 text-red border-red-100",
                      )}>
                        {c.status === CustomerStatus.ATIVO && <CheckCircle size={13} />}
                        {c.status === CustomerStatus.BLOQUEADO && <Ban size={13} />}
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <Link href={`/admin/clientes/${c.id}`} className="p-2 hover:bg-background-light rounded-lg text-text-secondary hover:text-primary-orange">
                          <Eye size={17} />
                        </Link>
                        <button
                          onClick={() => customerModal.edit(toFormInitial(c))}
                          className="p-2 hover:bg-background-light rounded-lg text-text-secondary hover:text-primary-orange"
                          title="Editar"
                        >
                          <Edit size={17} />
                        </button>
                        {c.status === CustomerStatus.ATIVO && (
                          <button
                            onClick={() => handleToggleStatus(c, CustomerStatus.BLOQUEADO)}
                            className="p-2 hover:bg-red-50 rounded-lg text-text-secondary hover:text-red"
                            title="Bloquear cliente"
                          >
                            <Ban size={17} />
                          </button>
                        )}
                        {c.status === CustomerStatus.BLOQUEADO && (
                          <button
                            onClick={() => handleToggleStatus(c, CustomerStatus.ATIVO)}
                            className="p-2 hover:bg-green-50 rounded-lg text-text-secondary hover:text-status-confirmed"
                            title="Desbloquear"
                          >
                            <CheckCircle size={17} />
                          </button>
                        )}
                        <button
                          onClick={() => setConfirmDelete(c)}
                          className="p-2 hover:bg-red-50 rounded-lg text-text-secondary hover:text-red"
                          title="Excluir"
                        >
                          <Trash size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <CustomerFormModal
        open={customerModal.open}
        onClose={customerModal.close}
        initial={customerModal.initial}
      />

      <Modal
        open={!!confirmDelete}
        onClose={() => !pendingAction && setConfirmDelete(null)}
        title="Excluir cliente?"
        subtitle={confirmDelete ? `Tem certeza que deseja remover ${confirmDelete.name}?` : ""}
        maxWidthClass="max-w-md"
      >
        <div className="p-6 space-y-5">
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
            <AlertTriangle size={20} className="text-red flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-black text-red uppercase tracking-wider">Ação Irreversível</p>
              <p className="text-sm text-red/80 mt-1 leading-relaxed">
                {confirmDelete && confirmDelete._count.bookings > 0
                  ? `Este cliente possui ${confirmDelete._count.bookings} reserva(s). Não é possível excluir — bloqueie-o em vez disso.`
                  : "O cliente será permanentemente removido do banco de dados e não poderá ser recuperado."}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setConfirmDelete(null)}
              disabled={pendingAction}
              className="px-5 py-3 rounded-xl font-bold text-sm text-text-secondary hover:bg-background-light disabled:opacity-50 transition-colors"
            >
              Cancelar
            </button>
            {(() => {
              const temReservas = !!confirmDelete && (confirmDelete._count.bookings || confirmDelete.totalBookings || 0) > 0;
              const disabled = !confirmDelete || pendingAction || temReservas;
              return (
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={disabled}
                  title={temReservas ? "Cliente possui reservas — bloqueie em vez de excluir" : "Excluir permanentemente"}
                  style={
                    disabled
                      ? { backgroundColor: "#f7a89c", color: "white", opacity: 0.55, cursor: "not-allowed", boxShadow: "0 4px 12px rgba(240,68,56,0.18)" }
                      : { backgroundColor: "#F04438", color: "white", boxShadow: "0 6px 16px rgba(240,68,56,0.28)" }
                  }
                  onMouseEnter={(e) => {
                    if (!disabled) {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#D92D20";
                      (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 10px 24px rgba(240,68,56,0.38)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!disabled) {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#F04438";
                      (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 16px rgba(240,68,56,0.28)";
                    }
                  }}
                  onMouseDown={(e) => {
                    if (!disabled) (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.985)";
                  }}
                  onMouseUp={(e) => {
                    if (!disabled) (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                  }}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all select-none"
                >
                  {pendingAction && <Loader2 size={16} className="animate-spin" />}
                  {!pendingAction && <Trash size={16} />}
                  {pendingAction ? "Excluindo..." : "Confirmar Exclusão"}
                </button>
              );
            })()}
          </div>
        </div>
      </Modal>
    </div>
  );
}
