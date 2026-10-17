import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { QuadrasClient } from "@/components/admin/QuadrasClient";
import { CourtStatus } from "@prisma/client";
import { requirePermission } from "@/lib/permissions";
import { getSaoPauloDateKey, getSaoPauloDayBounds } from "@/lib/utils";

export const revalidate = 0; // Garantir dados frescos

export default async function QuadrasPage() {
  await requirePermission("canManagePricing");
  const session = await getSession();
  if (!session) {
    redirect("/login?next=/admin/quadras");
  }

  const company = await prisma.company.findUniqueOrThrow({
    where: { id: session.companyId },
  });

  const [quadras, modalities] = await Promise.all([
    prisma.court.findMany({
      where: { companyId: company.id },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      include: {
        modality: true,
        _count: { select: { bookings: true } },
      },
    }),
    prisma.modality.findMany({
      where: { companyId: company.id, isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const { start: todayStart, end: todayEnd } = getSaoPauloDayBounds(getSaoPauloDateKey());

  const [reservasHojePorQuadra, pagamentosHoje] = await Promise.all([
    prisma.booking.groupBy({
      by: ["courtId"],
      where: {
        companyId: company.id,
        startTime: { gte: todayStart, lte: todayEnd },
        status: { not: "CANCELED" },
      },
      _count: { id: true },
    }),
    prisma.payment.findMany({
      where: { companyId: company.id, status: "PAID", paidAt: { gte: todayStart, lte: todayEnd } },
      select: { amount: true, booking: { select: { courtId: true } } },
    }),
  ]);

  const statsMap: Record<string, { hoje: number; receitaHoje: number }> = {};
  reservasHojePorQuadra.forEach((r) => {
    statsMap[r.courtId] = { hoje: r._count.id, receitaHoje: 0 };
  });
  pagamentosHoje.forEach((payment) => {
    const courtStats = statsMap[payment.booking.courtId] || { hoje: 0, receitaHoje: 0 };
    courtStats.receitaHoje += payment.amount;
    statsMap[payment.booking.courtId] = courtStats;
  });

  return (
    <QuadrasClient 
      initialQuadras={quadras} 
      modalities={modalities}
      stats={statsMap}
    />
  );
}
