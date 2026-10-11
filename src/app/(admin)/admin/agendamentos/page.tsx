import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AgendamentosClient } from "@/components/admin/AgendamentosClient";

export const revalidate = 0;

interface PageProps {
  searchParams: {
    date?: string;
  };
}

export default async function AgendamentosPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) {
    redirect("/login?next=/admin/agendamentos");
  }

  const selectedDate = searchParams.date || new Date().toISOString().split("T")[0];
  const startOfDay = new Date(selectedDate + "T00:00:00");
  const endOfDay = new Date(selectedDate + "T23:59:59");

  const [bookings, courts, customers, modalities] = await Promise.all([
    prisma.booking.findMany({
      where: {
        companyId: session.companyId,
        startTime: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        court: true,
        customer: true,
        modality: true,
      },
      orderBy: { startTime: "asc" },
    }),
    prisma.court.findMany({
      where: { companyId: session.companyId, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.customer.findMany({
      where: { companyId: session.companyId },
      orderBy: { name: "asc" },
      take: 100, // Limitar para não explodir o select no início
    }),
    prisma.modality.findMany({
      where: { companyId: session.companyId, isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <AgendamentosClient 
      initialBookings={bookings as any}
      courts={courts}
      customers={customers}
      modalities={modalities}
      selectedDate={selectedDate}
    />
  );
}
