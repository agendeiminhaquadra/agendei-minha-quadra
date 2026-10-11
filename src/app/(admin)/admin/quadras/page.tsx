import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { QuadrasClient } from "@/components/admin/QuadrasClient";
import { CourtStatus } from "@prisma/client";

export const revalidate = 0; // Garantir dados frescos

export default async function QuadrasPage() {
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

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const reservasHojePorQuadra = await prisma.booking.groupBy({
    by: ["courtId"],
    where: {
      companyId: company.id,
      startTime: { gte: todayStart, lte: todayEnd },
    },
    _count: { id: true },
    _sum: { totalPrice: true },
  });

  const statsMap: Record<string, { hoje: number; receitaHoje: number }> = {};
  reservasHojePorQuadra.forEach((r) => {
    statsMap[r.courtId] = {
      hoje: r._count.id,
      receitaHoje: r._sum.totalPrice || 0,
    };
  });

  return (
    <QuadrasClient 
      initialQuadras={quadras} 
      modalities={modalities}
      stats={statsMap}
    />
  );
}
