import { prisma } from "@/lib/prisma";
import { ListaClientesUI } from "@/components/admin/ClienteListaUI";
import { CustomerStatus } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const revalidate = 60;

export default async function ClientesPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login?next=/admin/clientes");
  }

  const company = await prisma.company.findUniqueOrThrow({
    where: { id: session.companyId },
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
