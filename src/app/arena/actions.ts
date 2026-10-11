"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { BookingStatus, BookingOrigin, PaymentStatus, CustomerStatus } from "@prisma/client";
import { sanitizePhone } from "@/lib/utils";

export async function createPublicBookingAction(data: {
  companyId: string;
  courtId: string;
  modalityId: string;
  date: string; // ISO string or YYYY-MM-DD
  startTime: string; // HH:mm
  customer: {
    name: string;
    phone: string;
    email?: string;
  };
}) {
  const { companyId, courtId, modalityId, date, startTime, customer: customerData } = data;

  // 1. Validação básica
  if (!companyId || !courtId || !modalityId || !date || !startTime || !customerData.name || !customerData.phone) {
    return { success: false, error: "Dados incompletos para a reserva." };
  }

  const sanitizedPhone = sanitizePhone(customerData.phone);
  
  // 2. Buscar ou criar cliente
  let customer = await prisma.customer.findFirst({
    where: {
      companyId,
      OR: [
        { phone: sanitizedPhone },
        ...(customerData.email ? [{ email: customerData.email.toLowerCase() }] : []),
      ],
    },
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        companyId,
        name: customerData.name,
        phone: sanitizedPhone,
        email: customerData.email?.toLowerCase() || null,
        status: CustomerStatus.ATIVO,
      },
    });
  }

  // 3. Preparar horários
  const startDateTime = new Date(`${date}T${startTime}:00`);
  const court = await prisma.court.findUnique({
    where: { id: courtId, companyId },
  });

  if (!court) return { success: false, error: "Quadra não encontrada." };
  
  const duration = court.defaultDurationMinutes || 60;
  const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

  // 4. Verificar conflitos
  const conflict = await prisma.booking.findFirst({
    where: {
      companyId,
      courtId,
      status: { notIn: [BookingStatus.CANCELED] },
      AND: [
        { startTime: { lt: endDateTime } },
        { endTime: { gt: startDateTime } },
      ],
    },
  });

  if (conflict) {
    return { success: false, error: "Este horário acabou de ser reservado. Por favor, escolha outro." };
  }

  // 5. Calcular preço
  const modality = await prisma.modality.findUnique({
    where: { id: modalityId, companyId },
  });

  const pricePerHour = modality?.pricePerHour || court.pricePerHour || 0;
  const totalPrice = (pricePerHour * duration) / 60;

  try {
    const booking = await prisma.booking.create({
      data: {
        companyId,
        courtId,
        modalityId,
        customerId: customer.id,
        startTime: startDateTime,
        endTime: endDateTime,
        durationMinutes: duration,
        status: BookingStatus.PENDING, // Público começa como pendente
        totalPrice,
        customerNameSnapshot: customer.name,
        customerPhoneSnapshot: customer.phone,
        pricePerHourSnapshot: pricePerHour,
        origin: BookingOrigin.PUBLIC_ARENA,
        paymentStatus: PaymentStatus.UNPAID,
      },
    });

    // Atualizar estatísticas do cliente
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        totalBookings: { increment: 1 },
        lastBookingAt: new Date(),
      },
    });

    revalidatePath(`/arena/[slug]`, "page");
    revalidatePath(`/admin/agendamentos`);
    
    return { 
      success: true, 
      message: "Reserva realizada com sucesso!",
      bookingId: booking.id 
    };
  } catch (error) {
    console.error("Erro ao criar reserva pública:", error);
    return { success: false, error: "Ocorreu um erro ao processar sua reserva. Tente novamente." };
  }
}
