import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ArenaBookingClient } from "@/components/public/ArenaBookingClient";

interface ArenaPublicaPageProps {
  params: {
    slug: string;
  };
}

export default async function ArenaPublicaPage({ params }: ArenaPublicaPageProps) {
  const { slug } = params;

  // Busca a empresa pelo slug
  const company = await prisma.company.findUnique({
    where: { slug },
    include: {
      sports: {
        where: { isActive: true },
        orderBy: { name: "asc" },
      },
      courts: {
        where: { isActive: true },
        include: {
          modality: true,
          modalities: true,
        },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!company) {
    notFound();
  }

  // Verificação de assinatura/trial para a página pública
  // Se a empresa estiver com acesso bloqueado, não permitimos agendamentos públicos
  const agora = new Date();
  const isExpired =
    company.planStatus === "EXPIRED" ||
    (company.planStatus === "TRIALING" && company.trialEndsAt.getTime() < agora.getTime()) ||
    (company.planStatus === "PAST_DUE");

  if (isExpired || company.isSuspended || !company.onlineBookingEnabled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 text-center">
        <div className="max-w-md bg-white p-8 rounded-2xl shadow-xl border border-border">
          <h1 className="text-2xl font-bold text-dark mb-4">Agendamentos Indisponíveis</h1>
          <p className="text-text-secondary">
            Este complexo esportivo está temporariamente com agendamentos online suspensos. 
            Por favor, entre em contato diretamente com o estabelecimento.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ArenaBookingClient 
      company={company}
      modalities={company.sports}
      courts={company.courts}
    />
  );
}
