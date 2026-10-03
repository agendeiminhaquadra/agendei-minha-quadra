import { prisma } from "@/lib/prisma";
import { ListaClientesUI } from "@/components/admin/ClienteListaUI";
import { CustomerStatus } from "@prisma/client";

export const revalidate = 60;

const COMPANY_SLUG = "arena-central";

export default async function ClientesPage() {
  const company = await prisma.company.findUniqueOrThrow({
    where: { slug: COMPANY_SLUG },
  });

  const [clientes, total, ativos, inativos, bloqueados] = await Promise.all([
    prisma.customer.findMany({
      where: { companyId: company.id },
      orderBy: { name: "asc" },
      include: { _count: { select: { bookings: true } } },
    }),
    prisma.customer.count({ where: { companyId: company.id } }),
    prisma.customer.count({ where: { companyId: company.id, status: CustomerStatus.ATIVO } }),
    prisma.customer.count({ where: { companyId: company.id, status: CustomerStatus.INATIVO } }),
    prisma.customer.count({ where: { companyId: company.id, status: CustomerStatus.BLOQUEADO } }),
  ]);

  return (
    <ListaClientesUI
      clientes={clientes}
      total={total}
      ativos={ativos}
      inativos={inativos}
      bloqueados={bloqueados}
    />
  );
}
