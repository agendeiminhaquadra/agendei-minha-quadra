"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BookingStatus, PaymentMethod, PaymentStatus } from "@prisma/client";
import {
  registerBookingPaymentAction,
  updateBookingStatusAction,
} from "@/app/(admin)/admin/actions";
import { formatCurrency, formatSaoPauloTime } from "@/lib/utils";

type Props = {
  bookingId: string;
  customerName: string;
  customerPhone: string | null;
  courtName: string;
  modalityName: string | null;
  startTime: Date;
  endTime: Date;
  totalPrice: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  canManageBookings: boolean;
  canCancelBookings: boolean;
  canAccessFinance: boolean;
};

const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: PaymentMethod.PIX, label: "Pix" },
  { value: PaymentMethod.CASH, label: "Dinheiro" },
  { value: PaymentMethod.CREDIT_CARD, label: "Cartão de crédito" },
  { value: PaymentMethod.DEBIT_CARD, label: "Cartão de débito" },
  { value: PaymentMethod.BANK_TRANSFER, label: "Transferência" },
  { value: PaymentMethod.OTHER, label: "Outro" },
];

export function BookingManagementActions({
  bookingId,
  customerName,
  customerPhone,
  courtName,
  modalityName,
  startTime,
  endTime,
  totalPrice,
  status,
  paymentStatus,
  canManageBookings,
  canCancelBookings,
  canAccessFinance,
}: Props) {
  const router = useRouter();
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.PIX);
  const [busy, setBusy] = useState(false);
  const isPaid = paymentStatus === PaymentStatus.PAID;
  const isCancelable = status === BookingStatus.PENDING || status === BookingStatus.CONFIRMED;

  function openWhatsAppReceipt(windowRef: Window | null) {
    const digits = customerPhone?.replace(/\D/g, "") || "";
    if (!digits) {
      windowRef?.close();
      window.alert("Reserva confirmada, mas o cadastro do cliente não tem telefone para abrir o WhatsApp.");
      return;
    }

    const phone = digits.startsWith("55") && (digits.length === 12 || digits.length === 13)
      ? digits
      : `55${digits}`;
    const bookingDate = startTime.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const message = [
      `Olá, ${customerName}! Sua reserva foi confirmada.`,
      "",
      "COMPROVANTE DE RESERVA",
      `Protocolo: ${bookingId.slice(-8).toUpperCase()}`,
      `Quadra: ${courtName}`,
      `Modalidade: ${modalityName || "Livre"}`,
      `Data: ${bookingDate}`,
      `Horário: ${formatSaoPauloTime(startTime)} às ${formatSaoPauloTime(endTime)}`,
      `Valor: ${formatCurrency(totalPrice)}`,
      `Pagamento: ${isPaid ? "pago" : "pendente (pagamento no local)"}`,
      "",
      "Apresente este comprovante no dia da reserva. Até lá!",
    ].join("\n");

    if (windowRef) {
      windowRef.location.href = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    } else {
      window.alert("Reserva confirmada. O navegador bloqueou a abertura do WhatsApp; tente novamente ou confira o telefone do cliente.");
    }
  }

  async function updateStatus(nextStatus: BookingStatus, whatsappWindow: Window | null = null) {
    setBusy(true);
    const result = await updateBookingStatusAction(bookingId, nextStatus);
    setBusy(false);
    if (!result.success) {
      whatsappWindow?.close();
      window.alert(result.error || "Não foi possível atualizar a reserva.");
      return;
    }
    if (nextStatus === BookingStatus.CONFIRMED) openWhatsAppReceipt(whatsappWindow);
    router.refresh();
  }

  async function registerPayment() {
    setBusy(true);
    const result = await registerBookingPaymentAction(bookingId, method);
    setBusy(false);
    if (!result.success) {
      window.alert(result.error || "Não foi possível registrar o pagamento.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {canManageBookings && status === BookingStatus.PENDING && (
        <button disabled={busy} onClick={() => {
          const whatsappWindow = customerPhone ? window.open("about:blank", "_blank") : null;
          void updateStatus(BookingStatus.CONFIRMED, whatsappWindow);
        }} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
          Confirmar reserva
        </button>
      )}
      {canCancelBookings && isCancelable && (
        <button disabled={busy} onClick={() => {
          if (window.confirm("Deseja cancelar este agendamento?")) void updateStatus(BookingStatus.CANCELED);
        }} className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50">
          Cancelar
        </button>
      )}
      {canAccessFinance && status !== BookingStatus.CANCELED && !isPaid && (
        <>
          <span className="text-xs font-bold text-amber-700">Pagamento pendente</span>
          <select aria-label="Forma de pagamento" value={method} disabled={busy} onChange={(event) => setMethod(event.target.value as PaymentMethod)} className="rounded-lg border border-border bg-white px-2 py-1.5 text-xs">
            {paymentMethods.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <button disabled={busy} onClick={registerPayment} className="rounded-lg bg-primary-orange px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50">
            Registrar pagamento
          </button>
        </>
      )}
      {canAccessFinance && isPaid && <span className="text-xs font-bold text-emerald-700">Pagamento recebido</span>}
    </div>
  );
}
