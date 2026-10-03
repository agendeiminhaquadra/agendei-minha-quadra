"use client";

import { useState, useEffect, useMemo } from "react";
import { BookingStatus, BookingOrigin, PaymentMethod } from "@prisma/client";
import {
  Modal,
  Input,
  Select,
  Textarea,
  Checkbox,
  SubmitButton,
  FormFeedback,
  useFormAction,
} from "@/components/admin/forms/FormPrimitives";
import { createBookingAction } from "@/app/(admin)/admin/actions";
import { cn } from "@/lib/utils";

export type BookingFormInitial = {
  courtId?: string;
  customerId?: string;
  modalityId?: string;
  startTime?: string;
  endTime?: string;
};

type Option = { value: string; label: string };

function hojeDefaultLocal() {
  const agora = new Date();
  agora.setMinutes(0, 0, 0);
  return formatLocalDateTime(agora);
}
const HOJE_DEFAULT = hojeDefaultLocal();

function parsePerHourFromLabel(label: string) {
  const parts = label.split("R$");
  if (parts.length < 2) return 0;
  const raw = parts[1].split("/")[0].trim();
  if (!raw) return 0;
  try {
    return parseFloat(raw.replace(/\./g, "").replace(",", "."));
  } catch {
    return 0;
  }
}

function formatLocalDateTime(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function BookingFormModal({
  open,
  onClose,
  initial,
  quadras,
  clientes,
  modalities,
}: {
  open: boolean;
  onClose: () => void;
  initial?: BookingFormInitial;
  quadras: Option[];
  clientes: Option[];
  modalities: Option[];
}) {
  const [courtId, setCourtId] = useState<string>(quadras[0]?.value || "");
  const [customerId, setCustomerId] = useState<string>(clientes[0]?.value || "");
  const [modalityId, setModalityId] = useState<string>(modalities[0]?.value || "");
  const [startTime, setStartTime] = useState<string>(HOJE_DEFAULT);
  const [durationMin, setDurationMin] = useState<number>(60);
  const [totalPrice, setTotalPrice] = useState<string>("");
  const [paid, setPaid] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.PIX);
  const [status, setStatus] = useState<BookingStatus>(BookingStatus.PENDING);
  const [origin, setOrigin] = useState<BookingOrigin>(BookingOrigin.ADMIN_PANEL);
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    if (open) {
      setCourtId(initial?.courtId || quadras[0]?.value || "");
      setCustomerId(initial?.customerId || clientes[0]?.value || "");
      setModalityId(initial?.modalityId || modalities[0]?.value || "");
      setStartTime(initial?.startTime || HOJE_DEFAULT);

      let duration = 60;
      if (initial?.startTime && initial?.endTime) {
        const diffMin = Math.round(
          (new Date(initial.endTime).getTime() - new Date(initial.startTime).getTime()) / 60000
        );
        if (diffMin > 0 && diffMin % 30 === 0) duration = diffMin;
      }
      setDurationMin(duration);

      setTotalPrice("");
      setPaid(false);
      setPaymentMethod(PaymentMethod.PIX);
      setStatus(BookingStatus.PENDING);
      setOrigin(BookingOrigin.ADMIN_PANEL);
      setNotes("");
    }
  }, [open, initial?.courtId, initial?.customerId, initial?.startTime, initial?.endTime, initial?.modalityId, quadras, clientes, modalities]);

  const { result, pending, submit, setResult } = useFormAction(createBookingAction, () => {
    setTimeout(onClose, 700);
  });

  const startDateObj = useMemo(() => (startTime ? new Date(startTime) : null), [startTime]);
  const endDateObj = useMemo(
    () => (startDateObj ? new Date(startDateObj.getTime() + durationMin * 60000) : null),
    [startDateObj, durationMin],
  );
  const perHour = useMemo(() => {
    const selected = quadras.find((q) => q.value === courtId);
    return selected ? parsePerHourFromLabel(selected.label) : 0;
  }, [quadras, courtId]);
  const suggestedPrice = useMemo(() => {
    if (durationMin <= 0 || perHour <= 0) return 0;
    return Math.round((perHour * (durationMin / 60)) * 100) / 100;
  }, [perHour, durationMin]);

  async function handleSubmit(form: FormData) {
    if (!startDateObj || !endDateObj) return;
    form.append("startTime", startDateObj.toISOString());
    form.append("endTime", endDateObj.toISOString());
    form.append("courtId", courtId);
    form.append("customerId", customerId);
    if (modalityId) form.append("modalityId", modalityId);
    form.append("status", status);
    form.append("origin", origin);
    form.append("totalPrice", totalPrice || String(suggestedPrice || 0));
    form.append("paid", paid ? "on" : "off");
    form.append("paymentMethod", paymentMethod);
    if (notes) form.append("notes", notes);
    await submit(form);
  }

  function handleClose() {
    if (pending) return;
    setResult(null);
    onClose();
  }

  const durationOptions = [
    { value: "30", label: "30 minutos" },
    { value: "60", label: "1 hora" },
    { value: "90", label: "1 hora e 30 min" },
    { value: "120", label: "2 horas" },
    { value: "180", label: "3 horas" },
  ];

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Novo Agendamento"
      subtitle="Preencha os dados e valide a disponibilidade"
      maxWidthClass="max-w-2xl"
    >
      <form action={handleSubmit} className="p-6 space-y-5">
        <FormFeedback result={result} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block">
              <span className="text-xs font-black text-text-secondary uppercase tracking-wider mb-1.5 block">Quadra * <span className="text-red">*</span></span>
              <select
                required
                value={courtId}
                onChange={(e) => setCourtId(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-orange focus:border-transparent transition-all cursor-pointer"
              >
                <option value="">Selecione...</option>
                {quadras.map((q) => (
                  <option key={q.value} value={q.value}>{q.label}</option>
                ))}
              </select>
            </label>
          </div>
          <div>
            <label className="block">
              <span className="text-xs font-black text-text-secondary uppercase tracking-wider mb-1.5 block">Cliente * <span className="text-red">*</span></span>
              <select
                required
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-orange focus:border-transparent transition-all cursor-pointer"
              >
                <option value="">Selecione...</option>
                {clientes.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </label>
          </div>
          <div>
            <label className="block">
              <span className="text-xs font-black text-text-secondary uppercase tracking-wider mb-1.5 block">Modalidade</span>
              <select
                value={modalityId}
                onChange={(e) => setModalityId(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-orange focus:border-transparent transition-all cursor-pointer"
              >
                <option value="">Usar quadra...</option>
                {modalities.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </label>
          </div>
          <div>
            <label className="block">
              <span className="text-xs font-black text-text-secondary uppercase tracking-wider mb-1.5 block">Status</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as BookingStatus)}
                className="w-full h-11 px-4 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-orange focus:border-transparent transition-all cursor-pointer"
              >
                <option value={BookingStatus.PENDING}>⏳ Pendente</option>
                <option value={BookingStatus.CONFIRMED}>✅ Confirmado</option>
                <option value={BookingStatus.BLOCKED}>🚫 Bloqueado (manutenção)</option>
              </select>
            </label>
          </div>
          <div>
            <label className="block">
              <span className="text-xs font-black text-text-secondary uppercase tracking-wider mb-1.5 block">
                Data e Hora Início <span className="text-red">*</span>
              </span>
              <input
                required
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-orange focus:border-transparent transition-all"
              />
            </label>
          </div>
          <div>
            <label className="block">
              <span className="text-xs font-black text-text-secondary uppercase tracking-wider mb-1.5 block">
                Duração <span className="text-red">*</span>
              </span>
              <select
                value={String(durationMin)}
                onChange={(e) => setDurationMin(parseInt(e.target.value) || 60)}
                className="w-full h-11 px-4 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-orange focus:border-transparent transition-all cursor-pointer"
              >
                {durationOptions.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </label>
          </div>

          {startDateObj && endDateObj && (
            <div className="md:col-span-2">
              <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase text-primary-orange tracking-wider">Período Selecionado</p>
                  <p className="text-sm font-black text-dark mt-1">
                    {startDateObj.toLocaleString("pt-BR")} → {endDateObj.toLocaleString("pt-BR")}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[10px] font-black uppercase text-primary-orange tracking-wider">Valor Sugerido ({durationMin}min)</p>
                  <p className="text-xl font-black text-primary-orange mt-1">
                    {suggestedPrice > 0
                      ? suggestedPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                      : "—"}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block">
              <span className="text-xs font-black text-text-secondary uppercase tracking-wider mb-1.5 block">Valor Total (R$)</span>
              <input
                type="number"
                step="0.01"
                placeholder={suggestedPrice > 0 ? suggestedPrice.toFixed(2).replace(".", ",") + " (sugerido)" : "0.00 (deixe em branco)"}
                value={totalPrice}
                onChange={(e) => setTotalPrice(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-border bg-white text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-orange focus:border-transparent transition-all"
              />
            </label>
          </div>
          <div>
            <label className="block">
              <span className="text-xs font-black text-text-secondary uppercase tracking-wider mb-1.5 block">Origem da Reserva</span>
              <select
                value={origin}
                onChange={(e) => setOrigin(e.target.value as BookingOrigin)}
                className="w-full h-11 px-4 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-orange focus:border-transparent transition-all cursor-pointer"
              >
                <option value={BookingOrigin.ADMIN_PANEL}>Painel Admin</option>
                <option value={BookingOrigin.PHONE}>Telefone</option>
                <option value={BookingOrigin.WHATSAPP}>WhatsApp</option>
                <option value={BookingOrigin.IN_PERSON}>Presencial</option>
                <option value={BookingOrigin.PUBLIC_ARENA}>Site / App Público</option>
              </select>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none p-3 bg-background-light/50 rounded-xl hover:bg-orange-50 transition-colors border border-transparent hover:border-orange-100">
            <input
              type="checkbox"
              className="w-4 h-4 accent-primary-orange cursor-pointer"
              checked={paid}
              onChange={(e) => setPaid(e.target.checked)}
              name="paid"
            />
            <input type="hidden" name="paid" value={paid ? "on" : "off"} />
            <span className="text-sm font-bold text-dark">Marcar como PAGO agora</span>
          </label>
          <div>
            <label className="block">
              <span className="text-xs font-black text-text-secondary uppercase tracking-wider mb-1.5 block">Método de Pagamento</span>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                disabled={!paid}
                className={cn(
                  "w-full h-11 px-4 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-orange focus:border-transparent transition-all cursor-pointer",
                  !paid && "opacity-50 cursor-not-allowed bg-gray-50",
                )}
              >
                <option value={PaymentMethod.PIX}>💠 Pix</option>
                <option value={PaymentMethod.CASH}>💵 Dinheiro</option>
                <option value={PaymentMethod.CREDIT_CARD}>💳 Crédito</option>
                <option value={PaymentMethod.DEBIT_CARD}>🏦 Débito</option>
                <option value={PaymentMethod.BANK_TRANSFER}>🔁 TED / DOC</option>
                <option value={PaymentMethod.OTHER}>📄 Outros</option>
              </select>
            </label>
          </div>
        </div>

        <label className="block">
          <span className="text-xs font-black text-text-secondary uppercase tracking-wider mb-1.5 block">Observações</span>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Alguma observação? Ex: Aniversário, material extra..."
            className="w-full px-4 py-3 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-orange focus:border-transparent transition-all resize-none"
          />
        </label>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <button
            type="button"
            onClick={handleClose}
            disabled={pending}
            className="px-5 py-3 rounded-xl font-bold text-sm text-text-secondary hover:bg-background-light disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
          <SubmitButton pending={pending} label="Criar Agendamento" />
        </div>
      </form>
    </Modal>
  );
}

export function useBookingModal() {
  const [open, setOpen] = useState(false);
  const [initial, setInitial] = useState<BookingFormInitial | undefined>(undefined);
  return {
    open,
    initial,
    openWith: (i: BookingFormInitial) => {
      setInitial(i);
      setOpen(true);
    },
    close: () => setOpen(false),
  };
}
