"use client";

import { useState } from "react";
import {
  BadgeCheck,
  Banknote,
  CalendarDays,
  Clock,
  CreditCard,
  Dribbble,
  MapPin,
  PartyPopper,
  Ticket,
  Trophy,
  UserRound,
  X,
} from "lucide-react";
import { formatCurrency, formatSaoPauloTime } from "@/lib/utils";

type Props = {
  bookingId: string;
  customerName: string;
  courtName: string;
  modalityName: string | null;
  startTime: Date;
  endTime: Date;
  totalPrice: number;
  isPaid: boolean;
};

const iconClass = "h-5 w-5 shrink-0 text-primary-orange";

export function BookingConfirmationPreview({
  bookingId,
  customerName,
  courtName,
  modalityName,
  startTime,
  endTime,
  totalPrice,
  isPaid,
}: Props) {
  const [open, setOpen] = useState(false);
  const date = startTime.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const details = [
    { icon: Dribbble, label: "Quadra", value: courtName },
    { icon: Trophy, label: "Modalidade", value: modalityName || "Livre" },
    { icon: CalendarDays, label: "Data", value: date },
    { icon: Clock, label: "Horário", value: `${formatSaoPauloTime(startTime)} às ${formatSaoPauloTime(endTime)}` },
    { icon: Banknote, label: "Valor", value: formatCurrency(totalPrice) },
    { icon: CreditCard, label: "Pagamento", value: isPaid ? "Pago" : "Pendente (pagamento no local)" },
    { icon: Ticket, label: "Protocolo", value: bookingId.slice(-8).toUpperCase() },
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200 bg-white px-3 py-1.5 text-xs font-bold text-primary-orange transition hover:bg-orange-50"
      >
        <BadgeCheck size={14} /> Ver confirmação
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4"
          role="presentation"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-confirmation-title"
            className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-8"
          >
            <button
              type="button"
              aria-label="Fechar confirmação"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 rounded-xl p-2 text-slate-500 transition hover:bg-slate-100"
            >
              <X size={19} />
            </button>

            <div className="rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 p-5 pr-12 text-white">
              <div className="flex items-center gap-3">
                <BadgeCheck className="h-9 w-9 shrink-0" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-100">Reserva confirmada</p>
                  <h2 id="booking-confirmation-title" className="mt-1 text-xl font-black">Comprovante de agendamento</h2>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
              <UserRound className={iconClass} />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Cliente</p>
                <p className="truncate font-bold text-slate-900">{customerName}</p>
              </div>
            </div>

            <div className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-100 px-4">
              {details.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 py-3.5">
                  <Icon className={iconClass} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
                    <p className="break-words text-sm font-semibold text-slate-900">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl bg-orange-50 p-4">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <MapPin className="h-5 w-5 text-primary-orange" /> Apresente esta confirmação na arena
              </div>
              <p className="mt-2 text-sm text-slate-600">Chegue com 10 minutos de antecedência. Agradecemos pela preferência.</p>
            </div>

            <div className="mt-5 flex items-center justify-center gap-2 text-sm font-bold text-primary-orange">
              <PartyPopper size={17} /> Boa partida!
            </div>
          </section>
        </div>
      )}
    </>
  );
}
