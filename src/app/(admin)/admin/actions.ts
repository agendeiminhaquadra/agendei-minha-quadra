"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { sanitizePhone } from "@/lib/utils";
import { BookingStatus, CustomerStatus, CourtStatus, BookingOrigin, PaymentStatus, PaymentMethod, PaymentTransactionStatus } from "@prisma/client";

const COMPANY_SLUG = "arena-central";

async function getCompanyOrThrow() {
  const company = await prisma.company.findUniqueOrThrow({
    where: { slug: COMPANY_SLUG },
  });
  return company;
}

// ============================================================
// CLIENTES (CRUD)
// ============================================================

export async function createCustomerAction(formData: FormData) {
  const company = await getCompanyOrThrow();

  const name = formData.get("name") as string;
  const email = (formData.get("email") as string) || null;
  const phone = (formData.get("phone") as string) || null;
  const cpf = (formData.get("cpf") as string) || null;
  const status = (formData.get("status") as CustomerStatus) || CustomerStatus.ATIVO;
  const isVip = (formData.get("isVip") as string) === "on";
  const notes = (formData.get("notes") as string) || null;

  if (!name || name.length < 3) {
    return { success: false, error: "Nome deve ter pelo menos 3 caracteres." };
  }

  if (email) {
    const exists = await prisma.customer.findFirst({
      where: { companyId: company.id, email: email.toLowerCase() },
    });
    if (exists) return { success: false, error: "Já existe um cliente com este e-mail." };
  }

  const sanitizedPhone = phone ? sanitizePhone(phone) : null;

  try {
    await prisma.customer.create({
      data: {
        companyId: company.id,
        name,
        email: email ? email.toLowerCase() : null,
        phone: sanitizedPhone,
        cpf,
        status,
        isVip,
        notes,
        totalSpent: 0,
        totalBookings: 0,
        attendanceRate: 0,
      },
    });
    revalidatePath("/admin/clientes");
    return { success: true, message: "Cliente cadastrado com sucesso!" };
  } catch (e: any) {
    return { success: false, error: e.message || "Erro ao salvar cliente." };
  }
}

export async function updateCustomerAction(formData: FormData) {
  const company = await getCompanyOrThrow();
  const id = formData.get("id") as string;

  if (!id) return { success: false, error: "ID do cliente não informado." };

  const existing = await prisma.customer.findUnique({
    where: { id, companyId: company.id },
  });
  if (!existing) return { success: false, error: "Cliente não encontrado." };

  const name = formData.get("name") as string;
  const email = (formData.get("email") as string) || null;
  const phone = (formData.get("phone") as string) || null;
  const cpf = (formData.get("cpf") as string) || null;
  const status = formData.get("status") as CustomerStatus;
  const isVip = (formData.get("isVip") as string) === "on";
  const notes = (formData.get("notes") as string) || null;

  if (!name || name.length < 3) return { success: false, error: "Nome curto demais." };

  if (email && email.toLowerCase() !== (existing.email || "").toLowerCase()) {
    const duplicate = await prisma.customer.findFirst({
      where: { companyId: company.id, email: email.toLowerCase(), id: { not: id } },
    });
    if (duplicate) return { success: false, error: "E-mail já cadastrado para outro cliente." };
  }

  try {
    await prisma.customer.update({
      where: { id, companyId: company.id },
      data: {
        name,
        email: email ? email.toLowerCase() : null,
        phone: phone ? sanitizePhone(phone) : null,
        cpf,
        status,
        isVip,
        notes,
      },
    });
    revalidatePath("/admin/clientes");
    revalidatePath(`/admin/clientes/${id}`);
    return { success: true, message: "Cliente atualizado com sucesso!" };
  } catch (e: any) {
    return { success: false, error: e.message || "Erro ao atualizar." };
  }
}

export async function toggleCustomerStatusAction(id: string, newStatus: CustomerStatus) {
  const company = await getCompanyOrThrow();
  try {
    await prisma.customer.update({
      where: { id, companyId: company.id },
      data: { status: newStatus },
    });
    revalidatePath("/admin/clientes");
    revalidatePath(`/admin/clientes/${id}`);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteCustomerAction(id: string) {
  const company = await getCompanyOrThrow();
  try {
    const countBookings = await prisma.booking.count({
      where: { customerId: id, companyId: company.id },
    });
    if (countBookings > 0) {
      return { success: false, error: `Não é possível excluir: cliente tem ${countBookings} reserva(s). Bloqueie-o em vez disso.` };
    }
    await prisma.customer.delete({ where: { id, companyId: company.id } });
    revalidatePath("/admin/clientes");
    return { success: true, message: "Cliente removido." };
  } catch (e: any) {
    return { success: false, error: e.message || "Erro ao excluir." };
  }
}

// ============================================================
// QUADRAS (CRUD)
// ============================================================

export async function createCourtAction(formData: FormData) {
  const company = await getCompanyOrThrow();
  const name = formData.get("name") as string;
  const modalityId = formData.get("modalityId") as string;
  const pricePerHour = parseFloat(formData.get("pricePerHour") as string) || 0;
  const startTime = (formData.get("startTime") as string) || "08:00";
  const endTime = (formData.get("endTime") as string) || "23:00";
  const description = (formData.get("description") as string) || null;
  const capacity = parseInt(formData.get("capacity") as string) || 10;
  const isCovered = (formData.get("isCovered") as string) === "on";
  const hasLighting = (formData.get("hasLighting") as string) === "on" || true;
  const floorType = (formData.get("floorType") as string) || "Sintético";
  const defaultDurationMinutes = parseInt(formData.get("defaultDurationMinutes") as string) || 60;

  if (!name || !modalityId) return { success: false, error: "Nome e modalidade são obrigatórios." };

  try {
    await prisma.court.create({
      data: {
        companyId: company.id,
        name: name.toUpperCase(),
        modalityId,
        pricePerHour,
        startTime,
        endTime,
        description,
        capacity,
        isCovered,
        hasLighting,
        floorType,
        defaultDurationMinutes,
        isActive: true,
        status: CourtStatus.ACTIVE,
      },
    });
    revalidatePath("/admin/quadras");
    return { success: true, message: "Quadra criada!" };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function toggleCourtActiveAction(id: string, newActive: boolean) {
  const company = await getCompanyOrThrow();
  try {
    await prisma.court.update({
      where: { id, companyId: company.id },
      data: {
        isActive: newActive,
        status: newActive ? CourtStatus.ACTIVE : CourtStatus.MAINTENANCE,
      },
    });
    revalidatePath("/admin/quadras");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteCourtAction(id: string) {
  const company = await getCompanyOrThrow();
  try {
    const count = await prisma.booking.count({ where: { courtId: id, companyId: company.id } });
    if (count > 0) {
      return { success: false, error: `Existem ${count} reserva(s) nesta quadra.` };
    }
    await prisma.court.delete({ where: { id, companyId: company.id } });
    revalidatePath("/admin/quadras");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ============================================================
// AGENDAMENTOS (CRUD + VALIDAÇÃO CONFLITO)
// ============================================================

export async function createBookingAction(formData: FormData) {
  const company = await getCompanyOrThrow();

  const courtId = formData.get("courtId") as string;
  const customerId = formData.get("customerId") as string;
  const modalityId = (formData.get("modalityId") as string) || null;
  const startTime = new Date(formData.get("startTime") as string);
  const endTime = new Date(formData.get("endTime") as string);
  const status = (formData.get("status") as BookingStatus) || BookingStatus.PENDING;
  const totalPrice = parseFloat(formData.get("totalPrice") as string) || 0;
  const paid = (formData.get("paid") as string) === "on";
  const notes = (formData.get("notes") as string) || null;
  const paymentMethod = (formData.get("paymentMethod") as PaymentMethod) || PaymentMethod.PIX;
  const origin = (formData.get("origin") as BookingOrigin) || BookingOrigin.ADMIN_PANEL;

  if (!courtId || !customerId || isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
    return { success: false, error: "Preencha quadra, cliente, data e horário." };
  }
  if (endTime <= startTime) return { success: false, error: "Horário final deve ser depois do inicial." };
  const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

  const customer = await prisma.customer.findUnique({
    where: { id: customerId, companyId: company.id },
  });
  if (!customer) return { success: false, error: "Cliente inválido." };

  const court = await prisma.court.findUnique({
    where: { id: courtId, companyId: company.id },
    include: { modality: true },
  });
  if (!court) return { success: false, error: "Quadra inválida." };
  if (!court.isActive || court.status !== CourtStatus.ACTIVE) {
    return { success: false, error: "Quadra está em manutenção." };
  }

  // ⚡ VALIDAÇÃO DE CONFLITO DE HORÁRIO
  const conflito = await prisma.booking.findFirst({
    where: {
      companyId: company.id,
      courtId,
      status: { notIn: [BookingStatus.CANCELED] },
      AND: [
        { startTime: { lt: endTime } },
        { endTime: { gt: startTime } },
      ],
    },
    include: { customer: true },
  });

  if (conflito) {
    const horaConflito = `${conflito.startTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}-${conflito.endTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    return {
      success: false,
      error: `CONFLITO! Horário ocupado por ${conflito.customer?.name || "cliente"} (${horaConflito}). Escolha outro horário.`,
    };
  }

  let calculatedPrice = totalPrice;
  if (calculatedPrice === 0 && court.pricePerHour) {
    const horas = durationMinutes / 60;
    calculatedPrice = Math.round((court.pricePerHour * horas) * 100) / 100;
  }
  const effectiveModalityId = modalityId || court.modalityId;
  const effectivePricePerHour = calculatedPrice / Math.max(horasFromDuration(durationMinutes), 1);

  try {
    const booking = await prisma.booking.create({
      data: {
        companyId: company.id,
        courtId,
        modalityId: effectiveModalityId,
        customerId,
        startTime,
        endTime,
        durationMinutes,
        status,
        totalPrice: calculatedPrice,
        customerNameSnapshot: customer.name,
        customerPhoneSnapshot: customer.phone,
        pricePerHourSnapshot: effectivePricePerHour,
        origin,
        paymentStatus: paid ? PaymentStatus.PAID : PaymentStatus.UNPAID,
        paidAmount: paid ? calculatedPrice : 0,
        confirmedAt: status === BookingStatus.CONFIRMED ? new Date() : null,
        notes,
      },
    });

    if (paid && calculatedPrice > 0) {
      await prisma.payment.create({
        data: {
          companyId: company.id,
          bookingId: booking.id,
          customerId,
          amount: calculatedPrice,
          paymentMethod,
          status: PaymentTransactionStatus.PAID,
          paidAt: new Date(),
          notes,
        },
      });
    }

    const totalAtual = await prisma.booking.aggregate({
      where: { customerId, companyId: company.id, status: { not: BookingStatus.CANCELED } },
      _sum: { totalPrice: true },
      _count: { id: true },
    });
    await prisma.customer.update({
      where: { id: customerId, companyId: company.id },
      data: {
        totalSpent: totalAtual._sum.totalPrice || 0,
        totalBookings: totalAtual._count.id || 0,
        lastBookingAt: new Date(),
      },
    });

    revalidatePath("/admin/agendamentos");
    revalidatePath("/admin");
    revalidatePath("/admin/clientes");
    revalidatePath(`/admin/clientes/${customerId}`);
    return { success: true, message: "Agendamento criado com sucesso!", bookingId: booking.id };
  } catch (e: any) {
    return { success: false, error: e.message || "Erro ao salvar." };
  }
}

function horasFromDuration(mins: number) {
  return mins / 60;
}

export async function updateBookingStatusAction(id: string, newStatus: BookingStatus) {
  const company = await getCompanyOrThrow();
  try {
    const data: any = { status: newStatus };
    if (newStatus === BookingStatus.CONFIRMED) data.confirmedAt = new Date();
    if (newStatus === BookingStatus.CANCELED) data.canceledAt = new Date();
    if (newStatus === BookingStatus.CHECKED_IN) data.checkInAt = new Date();
    if (newStatus === BookingStatus.COMPLETED) {
      data.checkOutAt = new Date();
      data.paymentStatus = PaymentStatus.PAID;
    }
    await prisma.booking.update({ where: { id, companyId: company.id }, data });
    revalidatePath("/admin/agendamentos");
    revalidatePath("/admin");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteBookingAction(id: string) {
  const company = await getCompanyOrThrow();
  try {
    await prisma.payment.deleteMany({ where: { bookingId: id, companyId: company.id } });
    const booking = await prisma.booking.delete({
      where: { id, companyId: company.id },
      select: { customerId: true },
    });
    revalidatePath("/admin/agendamentos");
    revalidatePath("/admin");
    if (booking.customerId) revalidatePath(`/admin/clientes/${booking.customerId}`);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
