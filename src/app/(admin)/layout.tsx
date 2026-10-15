import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/admin/Sidebar";
import { Header } from "@/components/admin/Header";
import { Role } from "@prisma/client";
import { getSession, calcSubscriptionInfo } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Lock } from "lucide-react";

async function getLayoutData() {
  const session = await getSession();
  if (!session) {
    redirect("/login?next=/admin");
  }

  const userLogged = await prisma.user.findUnique({
    where: { id: session.userId, companyId: session.companyId, isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      role: true,
    },
  });

  if (!userLogged) {
    redirect("/login?next=/admin");
  }
  if (userLogged.role === Role.USER) {
    redirect("/login?error=forbidden");
  }

  const company = await prisma.company.findUniqueOrThrow({
    where: { id: session.companyId },
    select: {
      id: true,
      name: true,
      logo: true,
      slug: true,
      planTier: true,
      planStatus: true,
      trialStartsAt: true,
      trialEndsAt: true,
      currentPeriodEnd: true,
    },
  });

  const subscription = calcSubscriptionInfo(company);

  return {
    company: {
      id: company.id,
      name: company.name,
      logo: company.logo || undefined,
      slug: company.slug,
    },
    user: {
      id: userLogged.id,
      name: userLogged.name || "Administrador",
      email: userLogged.email,
      avatarUrl: userLogged.avatarUrl || undefined,
      role: userLogged.role as Role,
      initials: (userLogged.name || "AA")
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase(),
    },
    subscription,
  };
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { company, user, subscription } = await getLayoutData();

  // Bloqueio se estiver expirado
  if (subscription.isExpired) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-border p-8 text-center animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 bg-danger-light text-danger rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock size={40} />
          </div>
          <h1 className="text-2xl font-bold text-dark mb-4">Acesso Bloqueado</h1>
          <p className="text-text-secondary mb-8">
            Seu período de teste de 7 dias expirou ou sua assinatura está inativa. 
            Para continuar gerenciando seu complexo esportivo, regularize sua conta.
          </p>
          <Link 
            href="/admin/configuracoes" 
            className="w-full btn-gradient py-3 px-6 rounded-xl text-white font-semibold inline-block hover:opacity-90 transition-opacity"
          >
            Regularizar Assinatura
          </Link>
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-sm text-text-secondary">
              Dúvidas? Entre em contato com nosso suporte.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar company={company} user={user} />

      <div className="flex-1 flex flex-col lg:pl-[280px] transition-all duration-300">
        <Header company={company} user={user} />

        {/* Banner de Trial */}
        {subscription.planStatus === "TRIALING" && !subscription.isExpired && (
          <div className="bg-warning-light border-b border-warning/20 px-4 py-2 flex items-center justify-center gap-2 text-warning font-medium text-sm animate-in slide-in-from-top duration-500">
            <AlertTriangle size={16} />
            <span>
              Você está no período de teste. Restam <strong>{subscription.daysLeft} dias</strong>.
            </span>
            <Link href="/admin/configuracoes" className="underline hover:opacity-80 ml-2">
              Assinar agora
            </Link>
          </div>
        )}

        <main className="flex-1 p-4 md:p-8 max-w-[1600px] mx-auto w-full">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>

        <footer className="px-8 py-6 text-center text-text-secondary text-xs font-medium border-t border-border bg-white/50">
          <p>© 2026 {company.name} — Minha Quadra SaaS</p>
        </footer>
      </div>
    </div>
  );
}

