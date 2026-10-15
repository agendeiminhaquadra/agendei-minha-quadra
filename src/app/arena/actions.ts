"use server";

import {
  BookingOrigin,
  BookingStatus,
  CustomerStatus,
  PaymentStatus,
  Prisma,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { sanitizePhone } from "@/lib/utils";

type ReservationInput = {
  companyId: string;
  courtId: string;
  modalityId: string;
  date: string;
  startTime?: string;
};

type PublicContext = {
  company: {
    id: string;
    isSuspended: boolean;
    planStatus: string;
    trialEndsAt: Date;
    currentPeriodEnd: Date | null;
    openingTime: string;
    closingTime: string;
    operatesMondayToFriday: boolean;
    operatesSaturday: boolean;
    operatesSunday: boolean;
  };
  court: {
    id: string;
    name: string;
    companyId: string;
    isActive: boolean;
    status: string;
    modalityId: string;
    pricePerHour: number;
    startTime: string;
    endTime: string;
    defaultDurationMinutes: number;
    modalities: { modalityId: string; customPrice: number | null }[];
  };
  modality: { id: string; name: string; pricePerHour: number };
  startDateTime?: Date;
  endDateTime?: Date;
  durationMinutes: number;
  pricePerHour: number;
};

function timeToMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function dateParts(value: string): [number, number, number] | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
  return [year, month, day];
}

// Os horários das arenas são horários locais de Brasília; os instantes ficam armazenados em UTC.
function localArenaDateTime(date: string, time: string): Date | null {
  const parts = dateParts(date);
  const minuteOfDay = timeToMinutes(time);
  if (!parts || minuteOfDay === null) return null;
  const [year, month, day] = parts;
  const target = Date.UTC(year, month - 1, day, Math.floor(minuteOfDay / 60), minuteOfDay % 60);
  let candidate = target;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });

  for (let i = 0; i < 3; i++) {
    const fields = Object.fromEntries(formatter.formatToParts(new Date(candidate)).map((part) => [part.type, part.value]));
    const represented = Date.UTC(
      Number(fields.year), Number(fields.month) - 1, Number(fields.day),
      Number(fields.hour), Number(fields.minute),
    );
    const difference = target - represented;
    candidate += difference;
    if (difference === 0) return new Date(candidate);
  }
  return null;
}

function isCompanyOpenOn(company: PublicContext["company"], date: string): boolean {
  const parts = dateParts(date);
  if (!parts) return false;
  const day = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])).getUTCDay();
  if (day === 0) return company.operatesSunday;
  if (day === 6) return company.operatesSaturday;
  return company.operatesMondayToFriday;
}

function subscriptionAllowsBooking(company: PublicContext["company"]): boolean {
  const now = Date.now();
  if (company.planStatus === "EXPIRED" || company.planStatus === "PAST_DUE") return false;
  if (company.planStatus === "TRIALING" && company.trialEndsAt.getTime() < now) return false;
  if (company.planStatus === "CANCELED" && (!company.currentPeriodEnd || company.currentPeriodEnd.getTime() < now)) return false;
  return true;
}

async function loadPublicContext(input: ReservationInput): Promise<{ context?: PublicContext; error?: string }> {
  if (!input || !input.companyId || !input.courtId || !input.modalityId || !input.date) {
    return { error: "Dados incompletos para a reserva." };
  }

  const company = await prisma.company.findUnique({
    where: { id: input.companyId },
    select: {
      id: true, isSuspended: true, planStatus: true, trialEndsAt: true, currentPeriodEnd: true,
      openingTime: true, closingTime: true,
      operatesMondayToFriday: true, operatesSaturday: true, operatesSunday: true,
    },
  });
  if (!company || company.isSuspended || !subscriptionAllowsBooking(company)) return { error: "Os agendamentos desta arena estão indisponíveis." };
  if (!isCompanyOpenOn(company, input.date)) return { error: "A arena não funciona nesta data." };

  const court = await prisma.court.findFirst({
    where: { id: input.courtId, companyId: company.id },
    select: {
      id: true, name: true, companyId: true, isActive: true, status: true,
      modalityId: true, pricePerHour: true, startTime: true, endTime: true,
      defaultDurationMinutes: true,
      modalities: { select: { modalityId: true, customPrice: true } },
    },
  });
  if (!court || !court.isActive || court.status !== "ACTIVE") return { error: "Esta quadra não está disponível." };
  const modality = await prisma.modality.findFirst({
    where: { id: input.modalityId, companyId: company.id, isActive: true },
    select: { id: true, name: true, pricePerHour: true },
  });
  const courtModality = court.modalities.find((item) => item.modalityId === input.modalityId);
  if (!modality || (court.modalityId !== modality.id && !courtModality)) {
    return { error: "A modalidade escolhida não está disponível nesta quadra." };
  }

  const durationMinutes = court.defaultDurationMinutes;
  const courtStart = timeToMinutes(court.startTime);
  const courtEnd = timeToMinutes(court.endTime);
  const companyStart = timeToMinutes(company.openingTime);
  const companyEnd = timeToMinutes(company.closingTime);
  if (courtStart === null || courtEnd === null || companyStart === null || companyEnd === null || durationMinutes < 15 || durationMinutes > 480) {
    return { error: "O horário escolhido está fora do funcionamento da arena." };
  }
  let startDateTime: Date | undefined;
  let endDateTime: Date | undefined;
  if (input.startTime) {
    const startMinute = timeToMinutes(input.startTime);
    startDateTime = localArenaDateTime(input.date, input.startTime) || undefined;
    if (
      startMinute === null || !startDateTime ||
      startMinute < Math.max(courtStart, companyStart) ||
      startMinute + durationMinutes > Math.min(courtEnd, companyEnd) ||
      startMinute % 15 !== 0 || startDateTime.getTime() <= Date.now()
    ) return { error: "O horário escolhido está fora do funcionamento da arena." };
    endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60_000);
  }
  const pricePerHour = courtModality?.customPrice ?? (modality.pricePerHour || court.pricePerHour);
  return {
    context: { company, court, modality, startDateTime, endDateTime, durationMinutes, pricePerHour },
  };
}

export async function getPublicAvailabilityAction(input: ReservationInput) {
  const loaded = await loadPublicContext(input);
  if (!loaded.context) return { success: false, error: loaded.error, slots: [] as { horario: string; status: "available" | "reserved" }[] };
  const { company, court, modality, durationMinutes } = loaded.context;
  const courtStart = timeToMinutes(court.startTime)!;
  const courtEnd = timeToMinutes(court.endTime)!;
  const companyStart = timeToMinutes(company.openingTime)!;
  const companyEnd = timeToMinutes(company.closingTime)!;
  const firstSlot = Math.max(courtStart, companyStart);
  const lastSlot = Math.min(courtEnd, companyEnd);
  const dayStart = localArenaDateTime(input.date, "00:00")!;
  const nextDate = new Date(Date.UTC(...dateParts(input.date)!));
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  const nextDateString = `${nextDate.getUTCFullYear()}-${String(nextDate.getUTCMonth() + 1).padStart(2, "0")}-${String(nextDate.getUTCDate()).padStart(2, "0")}`;
  const dayEnd = localArenaDateTime(nextDateString, "00:00")!;

  const [bookings, blockedTimes] = await Promise.all([
    prisma.booking.findMany({
      where: {
        companyId: company.id, courtId: court.id,
        status: { not: BookingStatus.CANCELED },
        startTime: { lt: dayEnd }, endTime: { gt: dayStart },
      },
      select: { startTime: true, endTime: true },
    }),
    prisma.blockedTime.findMany({
      where: {
        companyId: company.id, isActive: true,
        OR: [{ courtId: null }, { courtId: court.id }],
        AND: [{ OR: [{ modalityId: null }, { modalityId: modality.id }] }],
        startTime: { lt: dayEnd }, endTime: { gt: dayStart },
      },
      select: { startTime: true, endTime: true },
    }),
  ]);

  const slots: { horario: string; status: "available" | "reserved" }[] = [];
  for (let minute = firstSlot; minute + durationMinutes <= lastSlot; minute += durationMinutes) {
    const time = `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
    const start = localArenaDateTime(input.date, time);
    if (!start || start.getTime() <= Date.now()) continue;
    const end = new Date(start.getTime() + durationMinutes * 60_000);
    const occupied = bookings.some((booking) => booking.startTime < end && booking.endTime > start) ||
      blockedTimes.some((blocked) => blocked.startTime < end && blocked.endTime > start);
    slots.push({ horario: time, status: occupied ? "reserved" : "available" });
  }
  return { success: true, slots };
}

export async function createPublicBookingAction(data: ReservationInput & {
  customer: { name: string; phone: string; email?: string };
}) {
  if (!data || !data.customer) return { success: false, error: "Dados incompletos para a reserva." };
  const name = data.customer?.name?.trim();
  const phoneDigits = data.customer?.phone?.replace(/\D/g, "") || "";
  const email = data.customer?.email?.trim().toLowerCase() || null;
  if (!name || name.length < 3 || name.length > 120 || phoneDigits.length < 10 || phoneDigits.length > 15) {
    return { success: false, error: "Informe um nome e telefone válidos." };
  }
  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return { success: false, error: "Informe um e-mail válido." };
  }

  const loaded = await loadPublicContext(data);
  if (!loaded.context) return { success: false, error: loaded.error };
  const { company, court, modality, durationMinutes, pricePerHour } = loaded.context;
  if (!loaded.context.startDateTime || !loaded.context.endDateTime) return { success: false, error: "Horário inválido." };
  const { startDateTime, endDateTime } = loaded.context;
  const phone = sanitizePhone(phoneDigits);

  try {
    const booking = await prisma.$transaction(async (tx) => {
      const overlappingBooking = await tx.booking.findFirst({
        where: {
          companyId: company.id, courtId: court.id,
          status: { not: BookingStatus.CANCELED },
          startTime: { lt: endDateTime }, endTime: { gt: startDateTime },
        },
        select: { id: true },
      });
      const overlappingBlock = await tx.blockedTime.findFirst({
        where: {
          companyId: company.id, isActive: true,
          OR: [{ courtId: null }, { courtId: court.id }],
          AND: [{ OR: [{ modalityId: null }, { modalityId: modality.id }] }],
          startTime: { lt: endDateTime }, endTime: { gt: startDateTime },
        },
        select: { id: true },
      });
      if (overlappingBooking || overlappingBlock) throw new Error("SLOT_TAKEN");

      let customer = await tx.customer.findFirst({
        where: { companyId: company.id, OR: [{ phone }, ...(email ? [{ email }] : [])] },
      });
      if (customer?.status === CustomerStatus.BLOQUEADO) throw new Error("CUSTOMER_BLOCKED");
      if (!customer) {
        customer = await tx.customer.create({
          data: { companyId: company.id, name, phone, email, status: CustomerStatus.ATIVO },
        });
      } else {
        customer = await tx.customer.update({
          where: { id: customer.id }, data: { name, phone, ...(email ? { email } : {}) },
        });
      }

      const created = await tx.booking.create({
        data: {
          companyId: company.id, courtId: court.id, modalityId: modality.id,
          customerId: customer.id, startTime: startDateTime, endTime: endDateTime,
          durationMinutes, status: BookingStatus.PENDING,
          totalPrice: (pricePerHour * durationMinutes) / 60,
          customerNameSnapshot: customer.name, customerPhoneSnapshot: customer.phone,
          pricePerHourSnapshot: pricePerHour, origin: BookingOrigin.PUBLIC_ARENA,
          paymentStatus: PaymentStatus.UNPAID,
        },
      });
      await tx.customer.update({
        where: { id: customer.id },
        data: { totalBookings: { increment: 1 }, lastBookingAt: new Date() },
      });
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    revalidatePath(`/arena/[slug]`, "page");
    revalidatePath(`/admin/agendamentos`);
    return { success: true, message: "Reserva realizada com sucesso!", bookingId: booking.id };
  } catch (error) {
    if (error instanceof Error && error.message === "SLOT_TAKEN") {
      return { success: false, error: "Este horário acabou de ser reservado ou bloqueado. Escolha outro horário." };
    }
    if (error instanceof Error && error.message === "CUSTOMER_BLOCKED") {
      return { success: false, error: "Não foi possível concluir a reserva. Entre em contato com a arena." };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return { success: false, error: "Este horário acabou de ser reservado. Escolha outro horário." };
    }
    console.error("Erro ao criar reserva pública:", error);
    return { success: false, error: "Ocorreu um erro ao processar sua reserva. Tente novamente." };
  }
}
