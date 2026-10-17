import { NextRequest } from "next/server";
import { BookingStatus, PaymentTransactionStatus } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatSaoPauloTime } from "@/lib/utils";
import { resolveReportRange } from "@/lib/reporting";
import { redirect } from "next/navigation";

function csvCell(value: string | number | null | undefined) {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  await requirePermission("canAccessFinance");
  const session = await getSession();
  if (!session) redirect("/login?next=/admin/relatorios");

  const params = request.nextUrl.searchParams;
  const { from, to, start, end } = resolveReportRange(params.get("from") || undefined, params.get("to") || undefined);
  const bookings = await prisma.booking.findMany({
    where: {
      companyId: session.companyId,
      startTime: { gte: start, lte: end },
      status: { notIn: [BookingStatus.AVAILABLE, BookingStatus.BLOCKED] },
    },
    include: {
      court: { select: { name: true } },
      modality: { select: { name: true } },
      customer: { select: { name: true } },
      payments: {
        where: {
          status: PaymentTransactionStatus.PAID,
          paidAt: { gte: start, lte: end },
        },
        select: { amount: true },
      },
    },
    orderBy: { startTime: "asc" },
  });

  const headers = [
    "Data da reserva", "Início", "Fim", "Quadra", "Modalidade", "Cliente",
    "Status da reserva", "Status do pagamento", "Origem", "Valor reservado",
    "Recebido no período", "Saldo atual", "Duração (minutos)",
  ];
  const rows = bookings.map((booking) => [
    booking.startTime.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }),
    formatSaoPauloTime(booking.startTime),
    formatSaoPauloTime(booking.endTime),
    booking.court.name,
    booking.modality?.name || "Livre",
    booking.customer?.name || booking.customerNameSnapshot,
    booking.status,
    booking.paymentStatus,
    booking.origin,
    booking.totalPrice.toFixed(2),
    booking.payments.reduce((sum, payment) => sum + payment.amount, 0).toFixed(2),
    Math.max(0, booking.totalPrice - booking.paidAmount).toFixed(2),
    booking.durationMinutes,
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(";"));
  const fileName = `relatorio-reservas-${from}-a-${to}.csv`;

  return new Response(`\uFEFF${csv.join("\r\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
