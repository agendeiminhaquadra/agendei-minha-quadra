"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PaymentMethod } from "@prisma/client";
import { registerBookingPaymentAction } from "@/app/(admin)/admin/actions";

const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: PaymentMethod.PIX, label: "Pix" },
  { value: PaymentMethod.CASH, label: "Dinheiro" },
  { value: PaymentMethod.CREDIT_CARD, label: "Cartão de crédito" },
  { value: PaymentMethod.DEBIT_CARD, label: "Cartão de débito" },
  { value: PaymentMethod.BANK_TRANSFER, label: "Transferência" },
  { value: PaymentMethod.OTHER, label: "Outro" },
];

export function FinanceReceivePayment({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.PIX);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  async function receive() {
    setBusy(true);
    const result = await registerBookingPaymentAction(bookingId, method, amount.trim() ? Number(amount) : undefined);
    setBusy(false);
    if (!result.success) {
      window.alert(result.error || "Não foi possível registrar o pagamento.");
      return;
    }
    router.refresh();
  }

  return <div className="flex flex-wrap items-center gap-2"><select aria-label="Forma de pagamento recebida" value={method} disabled={busy} onChange={(event) => setMethod(event.target.value as PaymentMethod)} className="rounded-lg border border-border bg-white px-2.5 py-2 text-xs">{paymentMethods.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><input type="number" min="0.01" step="0.01" inputMode="decimal" aria-label="Valor recebido; deixe vazio para receber o saldo total" placeholder="Valor total" value={amount} disabled={busy} onChange={(event) => setAmount(event.target.value)} className="w-28 rounded-lg border border-border bg-white px-2.5 py-2 text-xs" /><button type="button" disabled={busy} onClick={() => void receive()} className="rounded-lg bg-primary-orange px-3 py-2 text-xs font-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Registrando…" : "Registrar pagamento"}</button></div>;
}
