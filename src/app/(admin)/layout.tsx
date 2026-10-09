import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/admin/Sidebar";
import { Header } from "@/components/admin/Header";
import { Role } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

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

  const company = await prisma.company.findUniqueOrThrow({
    where: { id: session.companyId },
    select: {
      id: true,
      name: true,
      logo: true,
      slug: true,
    },
  });

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
  };
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { company, user } = await getLayoutData();

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar company={company} user={user} />

      <div className="flex-1 flex flex-col lg:pl-[280px] transition-all duration-300">
        <Header company={company} user={user} />

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
