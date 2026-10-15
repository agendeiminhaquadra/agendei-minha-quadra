"use server";

import { Role, PlanTier, SubscriptionStatus, PlanPaymentStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

async function requireSuperAdmin() {
  const session = await getSession();
  if (!session) redirect("/login");
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, role: true, isActive: true },
  });
  if (!user?.isActive || user.role !== Role.SUPERADMIN) {
    throw new Error("Acesso restrito ao SuperAdmin.");
  }
  return user;
}

export async function toggleCompanySuspension(formData: FormData) {
  await requireSuperAdmin();
  const companyId = String(formData.get("companyId") || "");
  const suspend = String(formData.get("suspend")) === "true";
  if (!companyId) throw new Error("Empresa inválida.");
  await prisma.company.update({ where: { id: companyId }, data: { isSuspended: suspend } });
  revalidatePath("/superadmin");
}

export async function toggleUserStatus(formData: FormData) {
  const actor = await requireSuperAdmin();
  const userId = String(formData.get("userId") || "");
  const activate = String(formData.get("activate")) === "true";
  if (!userId || userId === actor.id && !activate) throw new Error("Não é permitido desativar seu próprio acesso.");
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!target || target.role === Role.SUPERADMIN && userId !== actor.id) {
    throw new Error("Esta conta não pode ser alterada por aqui.");
  }
  await prisma.user.update({ where: { id: userId }, data: { isActive: activate } });
  revalidatePath("/superadmin");
}

export async function updateCompanyPlan(formData: FormData) {
  await requireSuperAdmin();
  const companyId = String(formData.get("companyId") || "");
  const planTier = String(formData.get("planTier") || "") as PlanTier;
  const planStatus = String(formData.get("planStatus") || "") as SubscriptionStatus;
  const endDateValue = String(formData.get("endDate") || "");
  const monthlyPriceValue = String(formData.get("monthlyPrice") || "").trim();
  const paymentStatus = String(formData.get("paymentStatus") || "") as PlanPaymentStatus;
  const allowedTiers = Object.values(PlanTier) as string[];
  const allowedStatuses = Object.values(SubscriptionStatus) as string[];
  const allowedPaymentStatuses = Object.values(PlanPaymentStatus) as string[];
  const monthlyPrice = monthlyPriceValue === "" ? null : Number(monthlyPriceValue.replace(",", "."));
  if (!companyId || !allowedTiers.includes(planTier) || !allowedStatuses.includes(planStatus) || !allowedPaymentStatuses.includes(paymentStatus)) {
    throw new Error("Plano ou situação inválidos.");
  }
  if (monthlyPrice !== null && (!Number.isFinite(monthlyPrice) || monthlyPrice < 0 || monthlyPrice > 1_000_000)) {
    throw new Error("Informe um valor mensal válido.");
  }
  const endDate = endDateValue ? new Date(`${endDateValue}T23:59:59.999Z`) : null;
  if (endDate && Number.isNaN(endDate.getTime())) throw new Error("Data de vencimento inválida.");
  if (planStatus === SubscriptionStatus.TRIALING && !endDate) throw new Error("Informe quando termina o período de teste.");
  await prisma.company.update({
    where: { id: companyId },
    data: {
      planTier,
      planStatus,
      monthlyPrice,
      paymentStatus,
      ...(planStatus === SubscriptionStatus.TRIALING
        ? { trialEndsAt: endDate! }
        : { currentPeriodEnd: endDate }),
    },
  });
  revalidatePath("/superadmin");
}
