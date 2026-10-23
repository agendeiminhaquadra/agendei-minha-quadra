import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/admin/Sidebar";
import { Header } from "@/components/admin/Header";
import { Role } from "@prisma/client";
import { getSession, calcSubscriptionInfo } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AlertTriangle, Lock } from "lucide-react";
import { LiveBookingRefresh } from "@/components/admin/LiveBookingRefresh";

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
      canManageBookings: true,
      canAccessFinance: true,
      canManagePricing: true,
      canManageSchedule: true,
      canManageStaff: true,
    },
  });

  if (!userLogged) {
    redirect("/login?next=/admin");
  }
  const pendingBookingCount = await prisma.booking.count({
    where: { companyId: session.companyId, status: "PENDING" },
  });
  if (userLogged.role === Role.SUPERADMIN) {
    redirect("/superadmin");
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
      isSuspended: true,
      trialStartsAt: true,
      trialEndsAt: true,
      currentPeriodEnd: true,
    },
  });

  const subscription = calcSubscriptionInfo(company);

  return {
    isSuspended: company.isSuspended,
    pendingBookingCount,
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
      canManageBookings: userLogged.canManageBookings,
      canAccessFinance: userLogged.canAccessFinance,
      canManagePricing: userLogged.canManagePricing,
      canManageSchedule: userLogged.canManageSchedule,
      canManageStaff: userLogged.canManageStaff,
    },
    subscription,
  };
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { company, user, subscription, isSuspended, pendingBookingCount } = await getLayoutData();

  if (isSuspended) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-border p-8 text-center">
          <div className="w-20 h-20 bg-danger-light text-danger rounded-full flex items-center justify-center mx-auto mb-6"><Lock size={40} /></div>
          <h1 className="text-2xl font-bold text-dark mb-4">Conta suspensa</h1>
          <p className="text-text-secondary">O acesso desta empresa foi suspenso. Entre em contato com o suporte para mais informações.</p>
        </div>
      </div>
    );
  }

  // Bloqueio se estiver expirado
  if (subscription.isExpired) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f4f1ec] p-4 sm:p-8">
        <div className="pointer-events-none absolute -left-24 top-0 h-80 w-80 rounded-full bg-orange-200/50 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-amber-100 blur-3xl" />
        <div className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-white bg-white shadow-[0_30px_80px_-32px_rgba(30,35,45,0.32)] animate-in fade-in zoom-in duration-300">
          <div className="h-2 w-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500" />
          <div className="p-7 text-center sm:p-11">
          <div className="mx-auto mb-7 inline-flex rounded-2xl bg-[#0b1220] p-2 shadow-lg shadow-slate-900/20"><Image src="/logo.png" alt="Agendei Minha Quadra" width={210} height={140} priority className="h-auto w-44 rounded-xl object-contain" /></div>
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 ring-1 ring-orange-100">
            <Lock size={26} />
          </div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-orange-600">Acesso à sua arena</p>
          <h1 className="mb-3 text-3xl font-black tracking-tight text-dark">Acesso Bloqueado</h1>
          <p className="mb-8 text-text-secondary leading-7">
            Seu período de teste de 7 dias expirou ou sua assinatura está inativa. 
            Para continuar gerenciando seu complexo esportivo, regularize sua conta.
          </p>
          <Link 
            href="/assinatura"
            className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-orange-600 px-6 py-4 font-bold text-white shadow-lg shadow-orange-500/25 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-orange-500/30"
          >
            Regularizar Assinatura
          </Link>
          <div className="mt-7 border-t border-slate-100 pt-6">
            <p className="text-sm text-text-secondary">
              Dúvidas? Entre em contato com nosso suporte.
            </p>
          </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <LiveBookingRefresh />
      <Sidebar company={company} user={user} pendingBookingCount={pendingBookingCount} />

      <div className="flex-1 flex flex-col lg:pl-[280px] transition-all duration-300">
        <Header company={company} user={user} />

        {/* Banner de Trial */}
        {subscription.planStatus === "TRIALING" && !subscription.isExpired && (
          <div className="bg-warning-light border-b border-warning/20 px-4 py-2 flex items-center justify-center gap-2 text-warning font-medium text-sm animate-in slide-in-from-top duration-500">
            <AlertTriangle size={16} />
            <span>
              Você está no período de teste. Restam <strong>{subscription.daysLeft} dias</strong>.
            </span>
            <Link href="/assinatura"className="underline hover:opacity-80 ml-2">
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

