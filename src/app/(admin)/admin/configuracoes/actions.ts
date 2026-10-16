"use server";

import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireSettingsAccess(permission: "canManageSchedule" | "canManagePricing" | "canManageStaff") {
  const session = await getSession();
  if (!session) redirect("/login");
  const user = await prisma.user.findFirst({
    where: { id: session.userId, companyId: session.companyId, isActive: true },
    select: { role: true, [permission]: true },
  });
  if (!user) redirect("/login");
  if (user.role !== Role.ADMIN && !user[permission]) redirect("/admin?error=forbidden");
  const company = await prisma.company.findUniqueOrThrow({ where: { id: session.companyId } });
  if (company.isSuspended) redirect("/login?error=suspended");
  return company;
}

function value(formData: FormData, key: string) { return String(formData.get(key) || "").trim(); }
function validUrl(raw: string) {
  if (!raw) return null;
  try { const url = new URL(raw); return ["http:", "https:"].includes(url.protocol) ? url.toString() : null; }
  catch { return null; }
}

export async function updateArenaDetails(formData: FormData) {
  const company = await requireSettingsAccess("canManageSchedule");
  const name = value(formData, "name");
  const email = value(formData, "email").toLowerCase();
  const phone = value(formData, "phone");
  if (name.length < 2) throw new Error("Informe o nome da arena.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("E-mail inválido.");
  const urls = ["logo", "coverImageUrl", "websiteUrl", "instagramUrl", "facebookUrl"] as const;
  const parsedUrls = Object.fromEntries(urls.map((key) => {
    const raw = value(formData, key);
    const parsed = (key === "logo" || key === "coverImageUrl") && raw.startsWith("/") && !raw.startsWith("//") ? raw : validUrl(raw);
    if (raw && !parsed) throw new Error(`O endereço informado em ${key} precisa começar com http:// ou https://.`);
    return [key, parsed];
  })) as Record<(typeof urls)[number], string | null>;
  const lat = value(formData, "latitude");
  const lng = value(formData, "longitude");
  const latitude = lat ? Number(lat) : null;
  const longitude = lng ? Number(lng) : null;
  if ((latitude !== null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) || (longitude !== null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180))) throw new Error("Coordenadas do mapa inválidas.");
  await prisma.company.update({
    where: { id: company.id },
    data: {
      name, fantasyName: value(formData, "fantasyName") || null,
      responsibleName: value(formData, "responsibleName") || null,
      responsibleDocument: value(formData, "responsibleDocument") || null,
      logo: parsedUrls.logo, coverImageUrl: parsedUrls.coverImageUrl,
      description: value(formData, "description") || null,
      cnpj: value(formData, "cnpj") || null, email: email || null,
      phone, whatsapp: value(formData, "whatsapp") || null,
      address: value(formData, "address"), streetNumber: value(formData, "streetNumber") || null,
      complement: value(formData, "complement") || null, neighborhood: value(formData, "neighborhood") || null,
      postalCode: value(formData, "postalCode") || null,
      city: value(formData, "city") || null, state: value(formData, "state") || null,
      latitude, longitude,
      websiteUrl: parsedUrls.websiteUrl, instagramUrl: parsedUrls.instagramUrl, facebookUrl: parsedUrls.facebookUrl,
    },
  });
  revalidatePath("/admin/configuracoes"); revalidatePath("/admin"); revalidatePath(`/arena/${company.slug}`);
}

export async function updateBusinessSettings(formData: FormData) {
  const company = await requireSettingsAccess("canManageSchedule");
  const openingTime = value(formData, "openingTime");
  const closingTime = value(formData, "closingTime");
  const slotIntervalMinutes = Number(value(formData, "slotIntervalMinutes"));
  const minBookingNoticeMinutes = Number(value(formData, "minBookingNoticeMinutes"));
  const maxAdvanceBookingDays = Number(value(formData, "maxAdvanceBookingDays"));
  const bookingBufferMinutes = Number(value(formData, "bookingBufferMinutes"));
  const cancellationDeadlineHours = Number(value(formData, "cancellationDeadlineHours"));
  if (!/^\d{2}:\d{2}$/.test(openingTime) || !/^\d{2}:\d{2}$/.test(closingTime) || openingTime >= closingTime) throw new Error("Horário geral de abertura e fechamento inválido.");
  if (![15, 30, 60].includes(slotIntervalMinutes)) throw new Error("O intervalo entre horários deve ser 15, 30 ou 60 minutos.");
  if (![minBookingNoticeMinutes, maxAdvanceBookingDays, bookingBufferMinutes, cancellationDeadlineHours].every(Number.isInteger) || minBookingNoticeMinutes < 0 || minBookingNoticeMinutes > 10080 || maxAdvanceBookingDays < 1 || maxAdvanceBookingDays > 365 || bookingBufferMinutes < 0 || bookingBufferMinutes > 240 || cancellationDeadlineHours < 0 || cancellationDeadlineHours > 720) throw new Error("Revise os limites de agendamento e cancelamento.");
  const hours = Array.from({ length: 7 }, (_, weekday) => {
    const openTime = value(formData, `day_${weekday}_open`);
    const closeTime = value(formData, `day_${weekday}_close`);
    const breakStart = value(formData, `day_${weekday}_breakStart`);
    const breakEnd = value(formData, `day_${weekday}_breakEnd`);
    const isOpen = formData.get(`day_${weekday}_enabled`) === "on";
    if (isOpen && (!/^\d{2}:\d{2}$/.test(openTime) || !/^\d{2}:\d{2}$/.test(closeTime) || openTime >= closeTime)) throw new Error(`Horário inválido para o dia ${weekday + 1}.`);
    if ((breakStart || breakEnd) && (!breakStart || !breakEnd || breakStart >= breakEnd || breakStart < openTime || breakEnd > closeTime)) throw new Error(`Intervalo inválido para o dia ${weekday + 1}.`);
    return { companyId: company.id, weekday, isOpen, openTime, closeTime, breakStart: breakStart || null, breakEnd: breakEnd || null };
  });
  await prisma.$transaction([
    prisma.company.update({ where: { id: company.id }, data: {
      openingTime, closingTime, slotIntervalMinutes, minBookingNoticeMinutes,
      maxAdvanceBookingDays, bookingBufferMinutes, cancellationDeadlineHours,
      operatesMondayToFriday: hours.slice(1, 6).some((day) => day.isOpen),
      operatesSaturday: hours[6].isOpen, operatesSunday: hours[0].isOpen,
    } }),
    ...hours.map((day) => prisma.businessHours.upsert({
      where: { companyId_weekday: { companyId: company.id, weekday: day.weekday } },
      create: day, update: day,
    })),
  ]);
  revalidatePath("/admin/configuracoes"); revalidatePath(`/arena/${company.slug}`);
}

export async function updatePricingSettings(formData: FormData) {
  const company = await requireSettingsAccess("canManagePricing");
  const defaultCancellationFeePercent = Number(value(formData, "defaultCancellationFeePercent"));
  const paymentFields = { acceptsPix: formData.get("acceptsPix") === "on", acceptsCash: formData.get("acceptsCash") === "on", acceptsCard: formData.get("acceptsCard") === "on" };
  if (!Number.isFinite(defaultCancellationFeePercent) || defaultCancellationFeePercent < 0 || defaultCancellationFeePercent > 100) throw new Error("A taxa de cancelamento deve ficar entre 0% e 100%.");
  const modalities = await prisma.modality.findMany({ where: { companyId: company.id }, select: { id: true } });
  const updates = modalities.map((modality) => {
    const raw = value(formData, `modality_${modality.id}`);
    const pricePerHour = Number(raw);
    if (!raw || !Number.isFinite(pricePerHour) || pricePerHour < 0 || pricePerHour > 100000) throw new Error("Informe preços válidos para todas as modalidades.");
    return prisma.modality.update({ where: { id: modality.id, companyId: company.id }, data: { pricePerHour } });
  });
  const courts = await prisma.court.findMany({ where: { companyId: company.id }, select: { id: true } });
  const courtUpdates = courts.map((court) => {
    const raw = value(formData, `court_${court.id}`);
    const pricePerHour = Number(raw);
    if (!raw || !Number.isFinite(pricePerHour) || pricePerHour < 0 || pricePerHour > 100000) throw new Error("Informe preços válidos para todas as quadras.");
    return prisma.court.update({ where: { id: court.id, companyId: company.id }, data: { pricePerHour } });
  });
  await prisma.$transaction([
    prisma.company.update({ where: { id: company.id }, data: { defaultCancellationFeePercent, ...paymentFields } }),
    ...updates,
    ...courtUpdates,
  ]);
  revalidatePath("/admin/configuracoes"); revalidatePath(`/arena/${company.slug}`); revalidatePath("/admin/quadras");
}

export async function setOnlineBookingEnabled(formData: FormData) {
  const company = await requireSettingsAccess("canManageSchedule");
  await prisma.company.update({ where: { id: company.id }, data: { onlineBookingEnabled: formData.get("enabled") === "true" } });
  revalidatePath("/admin/configuracoes"); revalidatePath(`/arena/${company.slug}`);
}

export async function addClosedDate(formData: FormData) {
  const company = await requireSettingsAccess("canManageSchedule");
  const date = value(formData, "date");
  const reason = value(formData, "reason");
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match || reason.length < 3) throw new Error("Informe a data e o motivo do bloqueio.");
  const checkDate = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (checkDate.getUTCFullYear() !== Number(match[1]) || checkDate.getUTCMonth() !== Number(match[2]) - 1 || checkDate.getUTCDate() !== Number(match[3])) throw new Error("A data do bloqueio não é válida.");
  const startTime = new Date(`${date}T00:00:00-03:00`);
  const endTime = new Date(startTime.getTime() + 24 * 60 * 60 * 1000);
  await prisma.blockedTime.create({ data: { companyId: company.id, startTime, endTime, reason, isActive: true } });
  revalidatePath("/admin/configuracoes"); revalidatePath(`/arena/${company.slug}`);
}

export async function removeClosedDate(formData: FormData) {
  const company = await requireSettingsAccess("canManageSchedule");
  const id = value(formData, "id");
  await prisma.blockedTime.updateMany({ where: { id, companyId: company.id, courtId: null }, data: { isActive: false } });
  revalidatePath("/admin/configuracoes"); revalidatePath(`/arena/${company.slug}`);
}

export async function createStaffAccount(formData: FormData) {
  const company = await requireSettingsAccess("canManageStaff");
  const name = value(formData, "name");
  const email = value(formData, "email").toLowerCase();
  const phone = value(formData, "phone");
  const position = value(formData, "position");
  const password = String(formData.get("password") || "");
  const roleRaw = value(formData, "role");
  const allowedRoles = [Role.GERENTE, Role.CAIXA, Role.ATENDENTE];
  const role = allowedRoles.find((candidate) => candidate === roleRaw);
  if (name.length < 3 || position.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12 || !role) throw new Error("Preencha os dados e use uma senha inicial com pelo menos 12 caracteres.");
  const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (exists) throw new Error("Este e-mail já está cadastrado.");
  const passwordHash = await hashPassword(password);
  const permissions = {
    canManageBookings: formData.get("canManageBookings") === "on",
    canCancelBookings: formData.get("canCancelBookings") === "on",
    canAccessFinance: formData.get("canAccessFinance") === "on",
    canManagePricing: formData.get("canManagePricing") === "on",
    canManageSchedule: formData.get("canManageSchedule") === "on",
    canManageStaff: false,
  };
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { name, email, phone: phone || null, passwordHash, role, companyId: company.id, isActive: true, ...permissions } });
    await tx.employee.create({ data: { companyId: company.id, userId: user.id, fullName: name, email, phone, position, status: "ACTIVE" } });
  });
  revalidatePath("/admin/configuracoes");
}

export async function toggleStaffAccount(formData: FormData) {
  const company = await requireSettingsAccess("canManageStaff");
  const userId = value(formData, "userId");
  const active = value(formData, "active") === "true";
  const result = await prisma.user.updateMany({ where: { id: userId, companyId: company.id, role: { in: [Role.GERENTE, Role.CAIXA, Role.ATENDENTE] } }, data: { isActive: active } });
  if (!result.count) throw new Error("Funcionário não encontrado.");
  await prisma.employee.updateMany({ where: { userId, companyId: company.id }, data: { status: active ? "ACTIVE" : "INACTIVE" } });
  revalidatePath("/admin/configuracoes");
}

export async function updateStaffPermissions(formData: FormData) {
  const company = await requireSettingsAccess("canManageStaff");
  const userId = value(formData, "userId");
  const result = await prisma.user.updateMany({
    where: { id: userId, companyId: company.id, role: { in: [Role.GERENTE, Role.CAIXA, Role.ATENDENTE] } },
    data: {
      canManageBookings: formData.get("canManageBookings") === "on",
      canCancelBookings: formData.get("canCancelBookings") === "on",
      canAccessFinance: formData.get("canAccessFinance") === "on",
      canManagePricing: formData.get("canManagePricing") === "on",
      canManageSchedule: formData.get("canManageSchedule") === "on",
    },
  });
  if (!result.count) throw new Error("Funcionário não encontrado ou sem permissão para editar.");
  revalidatePath("/admin/configuracoes");
}
