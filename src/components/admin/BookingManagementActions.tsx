"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BookingStatus, PaymentMethod, PaymentStatus } from "@prisma/client";
import {
  registerBookingPaymentAction,
  updateBookingStatusAction,
} from "@/app/(admin)/admin/actions";
import { BookingReceiptDialog } from "./BookingReceiptDialog";

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
  const [receiptOpen, setReceiptOpen] = useState(false);
  const isPaid = paymentStatus === PaymentStatus.PAID;
  const isCancelable = status === BookingStatus.PENDING || status === BookingStatus.CONFIRMED;

  async function updateStatus(nextStatus: BookingStatus) {
    setBusy(true);
    const result = await updateBookingStatusAction(bookingId, nextStatus);
    setBusy(false);
    if (!result.success) {
      window.alert(result.error || "N?o foi poss?vel atualizar a reserva.");
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
        <button onClick={() => setReceiptOpen(true)} className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50">
          Compartilhar comprovante
        </button>
      )}
      {receiptOpen && (
        <BookingReceiptDialog
          bookingId={bookingId}
          customerName={customerName}
          customerPhone={customerPhone}
          courtName={courtName}
          modalityName={modalityName}
          startTime={startTime}
          endTime={endTime}
          totalPrice={totalPrice}
          isPaid={isPaid}
          onClose={() => setReceiptOpen(false)}
        />
      )}
    </div>
  );
}
