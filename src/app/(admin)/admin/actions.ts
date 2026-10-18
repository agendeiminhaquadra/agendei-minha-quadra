"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { phoneLookupVariants, sanitizePhone } from "@/lib/utils";
import { BookingStatus, CustomerStatus, CourtStatus, BookingOrigin, PaymentStatus, PaymentMethod, PaymentTransactionStatus, Role, Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { PermissionKey } from "@/lib/permissions";

async function getCompanyOrThrow(allowedRoles: Role[], permission?: PermissionKey) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  const user = await prisma.user.findUnique({
    where: { id: session.userId, companyId: session.companyId },
    select: {
      role: true, isActive: true, canManageBookings: true, canCancelBookings: true,
      canAccessFinance: true, canManagePricing: true, canManageSchedule: true, canManageStaff: true,
    },
  });
  if (!user?.isActive) redirect("/login");
  if (!allowedRoles.includes(user.role)) redirect("/admin?error=forbidden");
  if (permission && user.role !== Role.ADMIN && !user[permission]) redirect("/admin?error=forbidden");
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: session.companyId },
  });
  if (company.isSuspended) redirect("/login?error=suspended");
  return company;
}

// ============================================================
// CLIENTES (CRUD)
// ============================================================

export async function createCustomerAction(formData: FormData) {
  const company = await getCompanyOrThrow([Role.ADMIN, Role.GERENTE, Role.ATENDENTE]);

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
  if (phone) {
    const duplicatePhone = await prisma.customer.findFirst({
      where: { companyId: company.id, phone: { in: phoneLookupVariants(phone) } },
      select: { name: true },
    });
    if (duplicatePhone) return { success: false, error: `Este telefone já pertence ao cadastro de ${duplicatePhone.name}. Use o cadastro existente.` };
  }

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
  const company = await getCompanyOrThrow([Role.ADMIN, Role.GERENTE, Role.ATENDENTE]);
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

  if (phone) {
    const duplicatePhone = await prisma.customer.findFirst({
      where: { companyId: company.id, id: { not: id }, phone: { in: phoneLookupVariants(phone) } },
      select: { name: true },
    });
    if (duplicatePhone) return { success: false, error: `Este telefone já pertence ao cadastro de ${duplicatePhone.name}.` };
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

export async function mergeCustomerRecordsAction(keepId: string, mergeId: string) {
  const company = await getCompanyOrThrow([Role.ADMIN, Role.GERENTE, Role.CAIXA, Role.ATENDENTE], "canManageBookings");
  if (!keepId || !mergeId || keepId === mergeId) return { success: false, error: "Selecione dois cadastros diferentes." };
  try {
    await prisma.$transaction(async (tx) => {
      const [keep, duplicate] = await Promise.all([
        tx.customer.findFirst({ where: { id: keepId, companyId: company.id } }),
        tx.customer.findFirst({ where: { id: mergeId, companyId: company.id } }),
      ]);
      if (!keep || !duplicate) throw new Error("Não foi possível localizar os dois clientes.");
      const normalizeName = (name: string) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLowerCase();
      if (normalizeName(keep.name) !== normalizeName(duplicate.name)) {
        throw new Error("Só é possível mesclar cadastros com o mesmo nome. Confira antes para não unir pessoas diferentes.");
      }

      await tx.booking.updateMany({ where: { customerId: duplicate.id, companyId: company.id }, data: { customerId: keep.id } });
      await tx.payment.updateMany({ where: { customerId: duplicate.id, companyId: company.id }, data: { customerId: keep.id } });
      await tx.notification.updateMany({ where: { customerId: duplicate.id, companyId: company.id }, data: { customerId: keep.id } });

      const [bookingTotals, latestBooking, firstBooking] = await Promise.all([
        tx.booking.aggregate({ where: { customerId: keep.id, companyId: company.id, status: { not: BookingStatus.CANCELED } }, _count: { id: true }, _sum: { totalPrice: true } }),
        tx.booking.findFirst({ where: { customerId: keep.id, companyId: company.id, status: { not: BookingStatus.CANCELED } }, orderBy: { startTime: "desc" }, select: { startTime: true } }),
        tx.booking.findFirst({ where: { customerId: keep.id, companyId: company.id, status: { not: BookingStatus.CANCELED } }, orderBy: { startTime: "asc" }, select: { startTime: true } }),
      ]);
      const alternateContact = [
        duplicate.phone && duplicate.phone !== keep.phone ? `Telefone alternativo: ${duplicate.phone}` : null,
        duplicate.email && duplicate.email.toLowerCase() !== keep.email?.toLowerCase() ? `E-mail alternativo: ${duplicate.email}` : null,
      ].filter(Boolean).join("; ");
      const notes = [keep.notes, alternateContact, duplicate.notes].filter(Boolean).join("\n");
      await tx.customer.delete({ where: { id: duplicate.id, companyId: company.id } });
      await tx.customer.update({
        where: { id: keep.id },
        data: {
          phone: keep.phone || duplicate.phone,
          email: keep.email || duplicate.email,
          cpf: keep.cpf || duplicate.cpf,
          notes: notes || null,
          isVip: keep.isVip || duplicate.isVip,
          totalBookings: bookingTotals._count.id,
          totalSpent: bookingTotals._sum.totalPrice || 0,
          firstBookingAt: firstBooking?.startTime || keep.firstBookingAt || duplicate.firstBookingAt,
          lastBookingAt: latestBooking?.startTime || keep.lastBookingAt || duplicate.lastBookingAt,
        },
      });
    });
    revalidatePath("/admin/clientes");
    revalidatePath("/admin");
    revalidatePath("/admin/agendamentos");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Não foi possível mesclar os clientes." };
  }
}

export async function toggleCustomerStatusAction(id: string, newStatus: CustomerStatus) {
  const company = await getCompanyOrThrow([Role.ADMIN, Role.GERENTE, Role.ATENDENTE]);
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
  const company = await getCompanyOrThrow([Role.ADMIN, Role.GERENTE]);
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

export async function createModalityAction(name: string, pricePerHour: number) {
  const company = await getCompanyOrThrow([Role.ADMIN, Role.GERENTE, Role.CAIXA, Role.ATENDENTE], "canManagePricing");
  const modalityName = name.trim().replace(/\s+/g, " ");
  if (modalityName.length < 2 || modalityName.length > 60) {
    return { success: false, error: "Informe um nome de modalidade entre 2 e 60 caracteres." };
  }
  if (!Number.isFinite(pricePerHour) || pricePerHour < 0 || pricePerHour > 100000) {
    return { success: false, error: "Informe um preço por hora válido." };
  }

  const exists = await prisma.modality.findFirst({
    where: { companyId: company.id, name: { equals: modalityName, mode: "insensitive" } },
    select: { id: true },
  });
  if (exists) return { success: false, error: "Essa modalidade já está cadastrada." };

  const modality = await prisma.modality.create({
    data: {
      companyId: company.id,
      name: modalityName,
      pricePerHour,
      iconName: "trophy",
      textColorClass: "text-primary-orange",
      bgColorClass: "bg-primary-orange/10",
    },
  });
  revalidatePath("/admin/quadras");
  revalidatePath("/admin/configuracoes");
  revalidatePath(`/arena/${company.slug}`);
  return { success: true, modality };
}

export async function createCourtAction(formData: FormData) {
  const company = await getCompanyOrThrow([Role.ADMIN, Role.GERENTE, Role.CAIXA, Role.ATENDENTE], "canManagePricing");
  const name = formData.get("name") as string;
  const modalityId = formData.get("modalityId") as string;
  const pricePerHour = parseFloat(formData.get("pricePerHour") as string) || 0;
  const startTime = (formData.get("startTime") as string) || "08:00";
  const endTime = (formData.get("endTime") as string) || "23:00";
  const description = (formData.get("description") as string) || null;
  const capacity = parseInt(formData.get("capacity") as string) || 10;
  const isCovered = (formData.get("isCovered") as string) === "on";
  const hasLighting = (formData.get("hasLighting") as string) === "on";
  const floorType = (formData.get("floorType") as string) || "Sintético";
  const defaultDurationMinutes = parseInt(formData.get("defaultDurationMinutes") as string) || 60;

  if (!name || !modalityId) return { success: false, error: "Nome e modalidade são obrigatórios." };

  try {
    const modality = await prisma.modality.findFirst({
      where: { id: modalityId, companyId: company.id, isActive: true },
      select: { id: true },
    });
    if (!modality) return { success: false, error: "Selecione uma modalidade ativa desta empresa." };

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
    revalidatePath(`/arena/${company.slug}`);
    return { success: true, message: "Quadra criada!" };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function toggleCourtActiveAction(id: string, newActive: boolean) {
  const company = await getCompanyOrThrow([Role.ADMIN, Role.GERENTE, Role.CAIXA, Role.ATENDENTE], "canManagePricing");
  try {
    await prisma.court.update({
      where: { id, companyId: company.id },
      data: {
        isActive: newActive,
        status: newActive ? CourtStatus.ACTIVE : CourtStatus.MAINTENANCE,
      },
    });
    revalidatePath("/admin/quadras");
    revalidatePath(`/arena/${company.slug}`);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateCourtAction(formData: FormData) {
  const company = await getCompanyOrThrow([Role.ADMIN, Role.GERENTE, Role.CAIXA, Role.ATENDENTE], "canManagePricing");
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const modalityId = String(formData.get("modalityId") || "");
  const pricePerHour = Number(formData.get("pricePerHour"));
  const startTime = String(formData.get("startTime") || "08:00");
  const endTime = String(formData.get("endTime") || "23:00");
  const duration = Number.parseInt(String(formData.get("defaultDurationMinutes") || "60"), 10);
  const capacity = Number.parseInt(String(formData.get("capacity") || "10"), 10);
  if (!id || !name || !modalityId || !Number.isFinite(pricePerHour) || pricePerHour < 0) {
    return { success: false, error: "Confira o nome, a modalidade e o preço da quadra." };
  }
  if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime) || startTime >= endTime || duration < 15 || duration > 480) {
    return { success: false, error: "Confira os horários e a duração padrão." };
  }
  const modality = await prisma.modality.findFirst({ where: { id: modalityId, companyId: company.id, isActive: true }, select: { id: true } });
  if (!modality) return { success: false, error: "Selecione uma modalidade ativa desta empresa." };

  try {
    await prisma.court.update({
      where: { id, companyId: company.id },
      data: {
        name: name.toUpperCase(), modalityId, pricePerHour, startTime, endTime,
        description: String(formData.get("description") || "") || null,
        capacity: Number.isFinite(capacity) && capacity > 0 ? capacity : 10,
        isCovered: formData.get("isCovered") === "on",
        hasLighting: formData.get("hasLighting") === "on",
        floorType: String(formData.get("floorType") || "Sintético"),
        defaultDurationMinutes: duration,
      },
    });
    revalidatePath("/admin/quadras");
    revalidatePath(`/arena/${company.slug}`);
    return { success: true, message: "Quadra atualizada." };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Não foi possível atualizar a quadra." };
  }
}

export async function deleteCourtAction(id: string) {
  const company = await getCompanyOrThrow([Role.ADMIN, Role.GERENTE, Role.CAIXA, Role.ATENDENTE], "canManagePricing");
  try {
    const count = await prisma.booking.count({ where: { courtId: id, companyId: company.id } });
    if (count > 0) {
      return { success: false, error: `Existem ${count} reserva(s) nesta quadra.` };
    }
    await prisma.court.delete({ where: { id, companyId: company.id } });
    revalidatePath("/admin/quadras");
    revalidatePath(`/arena/${company.slug}`);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ============================================================
// AGENDAMENTOS (CRUD + VALIDAÇÃO CONFLITO)
// ============================================================

export async function createBookingAction(formData: FormData) {
  const company = await getCompanyOrThrow([Role.ADMIN, Role.GERENTE, Role.CAIXA, Role.ATENDENTE], "canManageBookings");

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
  const blockedStart = new Date(startTime.getTime() - company.bookingBufferMinutes * 60_000);
  const blockedEnd = new Date(endTime.getTime() + company.bookingBufferMinutes * 60_000);

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
        { startTime: { lt: blockedEnd } },
        { endTime: { gt: blockedStart } },
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
    const booking = await prisma.$transaction(async (tx) => {
      const activeConflict = await tx.booking.findFirst({
        where: {
          companyId: company.id, courtId,
          status: { not: BookingStatus.CANCELED },
          startTime: { lt: blockedEnd }, endTime: { gt: blockedStart },
        },
        select: { id: true },
      });
      const blockedConflict = await tx.blockedTime.findFirst({
        where: {
          companyId: company.id, isActive: true,
          OR: [{ courtId: null }, { courtId }],
          AND: [{ OR: [{ modalityId: null }, { modalityId: effectiveModalityId }] }],
          startTime: { lt: endTime }, endTime: { gt: startTime },
        },
        select: { id: true },
      });
      if (activeConflict || blockedConflict) throw new Error("BOOKING_CONFLICT");

      const created = await tx.booking.create({
        data: {
          companyId: company.id, courtId, modalityId: effectiveModalityId,
          customerId, startTime, endTime, durationMinutes, status,
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
        await tx.payment.create({
          data: {
            companyId: company.id, bookingId: created.id, customerId,
            amount: calculatedPrice, paymentMethod,
            status: PaymentTransactionStatus.PAID, paidAt: new Date(), notes,
          },
        });
      }

      const totalAtual = await tx.booking.aggregate({
        where: { customerId, companyId: company.id, status: { not: BookingStatus.CANCELED } },
        _sum: { totalPrice: true }, _count: { id: true },
      });
      await tx.customer.update({
        where: { id: customerId, companyId: company.id },
        data: {
          totalSpent: totalAtual._sum.totalPrice || 0,
          totalBookings: totalAtual._count.id || 0,
          lastBookingAt: new Date(),
        },
      });
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    revalidatePath("/admin/agendamentos");
    revalidatePath("/admin");
    revalidatePath("/admin/clientes");
    revalidatePath(`/admin/clientes/${customerId}`);
    return { success: true, message: "Agendamento criado com sucesso!", bookingId: booking.id };
  } catch (e: any) {
    if (e?.message === "BOOKING_CONFLICT" || e?.code === "P2034") {
      return { success: false, error: "Este horário acabou de ser ocupado ou bloqueado. Escolha outro." };
    }
    return { success: false, error: e.message || "Erro ao salvar." };
  }
}

function horasFromDuration(mins: number) {
  return mins / 60;
}

export async function updateBookingStatusAction(id: string, newStatus: BookingStatus) {
  const company = await getCompanyOrThrow([Role.ADMIN, Role.GERENTE, Role.CAIXA, Role.ATENDENTE], newStatus === BookingStatus.CANCELED ? "canCancelBookings" : "canManageBookings");
  try {
    const data: any = { status: newStatus };
    if (newStatus === BookingStatus.CONFIRMED) data.confirmedAt = new Date();
    if (newStatus === BookingStatus.CANCELED) data.canceledAt = new Date();
    if (newStatus === BookingStatus.CHECKED_IN) data.checkInAt = new Date();
    if (newStatus === BookingStatus.COMPLETED) {
      data.checkOutAt = new Date();
    }
    await prisma.booking.update({ where: { id, companyId: company.id }, data });
    revalidatePath("/admin/agendamentos");
    revalidatePath("/admin");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function registerBookingPaymentAction(bookingId: string, paymentMethod: PaymentMethod, requestedAmount?: number) {
  const company = await getCompanyOrThrow(
    [Role.ADMIN, Role.GERENTE, Role.CAIXA, Role.ATENDENTE],
    "canAccessFinance",
  );
  if (!Object.values(PaymentMethod).includes(paymentMethod)) {
    return { success: false, error: "Forma de pagamento inválida." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id: bookingId, companyId: company.id },
        select: { id: true, customerId: true, totalPrice: true, paidAmount: true, paymentStatus: true, status: true },
      });
      if (!booking) throw new Error("Reserva não encontrada.");
      if (booking.status === BookingStatus.CANCELED) throw new Error("Não é possível registrar pagamento de uma reserva cancelada.");
      if (booking.paymentStatus === PaymentStatus.PAID) return;

      const remaining = Math.max(0, Math.round((booking.totalPrice - booking.paidAmount) * 100) / 100);
      const amount = requestedAmount === undefined ? remaining : Math.round(requestedAmount * 100) / 100;
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("Informe um valor de pagamento maior que zero.");
      if (amount > remaining) throw new Error("O pagamento não pode ser maior que o saldo pendente.");
      const newPaidAmount = Math.round((booking.paidAmount + amount) * 100) / 100;
      const fullyPaid = newPaidAmount >= booking.totalPrice;
      if (amount <= 0) throw new Error("Esta reserva não tem valor pendente.");

      await tx.payment.create({
        data: {
          companyId: company.id,
          bookingId: booking.id,
          customerId: booking.customerId,
          amount,
          paymentMethod,
          status: PaymentTransactionStatus.PAID,
          paidAt: new Date(),
        },
      });
      await tx.booking.update({
        where: { id: booking.id },
        data: { paidAmount: fullyPaid ? booking.totalPrice : newPaidAmount, paymentStatus: fullyPaid ? PaymentStatus.PAID : PaymentStatus.PARTIAL },
      });
    });

    revalidatePath("/admin");
    revalidatePath("/admin/agendamentos");
    revalidatePath("/admin/financeiro");
    revalidatePath("/admin/relatorios");
    revalidatePath("/admin/quadras");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Não foi possível registrar o pagamento." };
  }
}

export async function deleteBookingAction(id: string) {
  const company = await getCompanyOrThrow([Role.ADMIN, Role.GERENTE], "canCancelBookings");
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
