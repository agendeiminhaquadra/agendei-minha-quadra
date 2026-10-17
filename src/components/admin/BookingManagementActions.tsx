"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BookingStatus, PaymentMethod, PaymentStatus } from "@prisma/client";
import {
  registerBookingPaymentAction,
  updateBookingStatusAction,
} from "@/app/(admin)/admin/actions";
import { MessageCircle } from "lucide-react";
import { formatCurrency, formatSaoPauloTime } from "@/lib/utils";
import { BookingConfirmationPreview } from "./BookingConfirmationPreview";

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

  function openWhatsAppConfirmation() {
    const digits = customerPhone?.replace(/\D/g, "") || "";
    if (!digits) {
      window.alert("Este cliente n\u00e3o tem telefone cadastrado.");
      return;
    }

    const phone = digits.startsWith("55") && (digits.length === 12 || digits.length === 13) ? digits : "55" + digits;
    const date = startTime.toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo", weekday: "long", day: "2-digit", month: "long", year: "numeric",
    });
    const message = [
      "*RESERVA CONFIRMADA*",
      "",
      "Ol\u00e1, *" + customerName + "*!",
      "Sua reserva foi confirmada. Confira os detalhes:",
      "",
      "*DADOS DA RESERVA*",
      "*Quadra:* " + courtName,
      "*Modalidade:* " + (modalityName || "Livre"),
      "*Data:* " + date,
      "*Hor\u00e1rio:* " + formatSaoPauloTime(startTime) + " \u00e0s " + formatSaoPauloTime(endTime),
      "*Valor:* " + formatCurrency(totalPrice),
      "*Pagamento:* " + (isPaid ? "Pago" : "Pendente (pagamento no local)"),
      "*Protocolo:* " + bookingId.slice(-8).toUpperCase(),
      "",
      "*IMPORTANTE*",
      "Apresente esta confirma\u00e7\u00e3o no dia da reserva.",
      "Agradecemos pela prefer\u00eancia. Boa partida!",
    ].join("\n");

    window.open("https://wa.me/" + phone + "?text=" + encodeURIComponent(message), "_blank", "noopener,noreferrer");
  }

  async function updateStatus(nextStatus: BookingStatus) {
    setBusy(true);
    const result = await updateBookingStatusAction(bookingId, nextStatus);
    setBusy(false);
    if (!result.success) {
      window.alert(result.error || "N\u00e3o foi poss\u00edvel atualizar a reserva.");
      return;
    }
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
        <button disabled={busy} onClick={() => void updateStatus(BookingStatus.CONFIRMED)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
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
      {canManageBookings && status === BookingStatus.CONFIRMED && (
        <>
          <BookingConfirmationPreview
            bookingId={bookingId}
            customerName={customerName}
            courtName={courtName}
            modalityName={modalityName}
            startTime={startTime}
            endTime={endTime}
            totalPrice={totalPrice}
            isPaid={isPaid}
          />
          <button onClick={openWhatsAppConfirmation} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50">
            <MessageCircle size={14} /> Abrir WhatsApp
          </button>
        </>
      )}
    </div>
  );
}
