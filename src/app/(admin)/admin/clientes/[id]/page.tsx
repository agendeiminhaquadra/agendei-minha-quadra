import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DetalheClienteUI } from "@/components/admin/ClienteDetalheUI";
import { CustomerStatus } from "@prisma/client";

export const revalidate = 30;

const COMPANY_SLUG = "arena-central";

export default async function ClienteDetalhesPage({ params }: { params: { id: string } }) {
  const company = await prisma.company.findUniqueOrThrow({
    where: { slug: COMPANY_SLUG },
  });

  const cliente = await prisma.customer.findUnique({
    where: { id: params.id, companyId: company.id },
  });

  if (!cliente) notFound();

  const [reservas, quadras, modalidades, clientesOptions] = await Promise.all([
    prisma.booking.findMany({
      where: { customerId: cliente.id, companyId: company.id },
      include: {
        court: { select: { name: true } },
        modality: { select: { name: true } },
      },
      orderBy: { startTime: "desc" },
      take: 50,
    }),
    prisma.court.findMany({
      where: { companyId: company.id, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, pricePerHour: true },
    }),
    prisma.modality.findMany({
      where: { companyId: company.id, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.customer.findMany({
      where: { companyId: company.id, status: CustomerStatus.ATIVO },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const quadrasOptions = quadras.map((q) => ({
    value: q.id,
    label: `${q.name} — ${q.pricePerHour.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/h`,
  }));
  const clientesOpts = clientesOptions.map((c) => ({ value: c.id, label: c.name }));
  const modalitiesOptions = modalidades.map((m) => ({ value: m.id, label: m.name }));

  return (
    <DetalheClienteUI
      cliente={cliente}
      reservas={reservas}
      quadrasOptions={quadrasOptions}
      clientesOptions={clientesOpts}
      modalitiesOptions={modalitiesOptions}
    />
  );
}
