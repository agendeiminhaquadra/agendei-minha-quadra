import { Role } from "@prisma/client";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type PermissionKey = "canManageBookings" | "canCancelBookings" | "canAccessFinance" | "canManagePricing" | "canManageSchedule" | "canManageStaff";

export async function requirePermission(permission: PermissionKey) {
  const session = await getSession();
  if (!session) redirect("/login");
  const user = await prisma.user.findFirst({
    where: { id: session.userId, companyId: session.companyId, isActive: true },
    select: { id: true, role: true, isActive: true, canCancelBookings: true, canAccessFinance: true, [permission]: true },
  });
  if (!user) redirect("/login");
  if (user.role !== Role.ADMIN && !user[permission]) notFound();
  return user;
}
