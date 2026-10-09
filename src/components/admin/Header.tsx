"use client";

import { Bell, Search, ChevronRight, Home, Building2, User, LogOut, Settings } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Role } from "@prisma/client";
import { useTransition, useState } from "react";
import { logoutAction } from "@/app/actions";

type CompanyData = {
  id: string;
  name: string;
  logo?: string;
  slug: string;
};

type UserData = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: Role;
  initials: string;
};

export function Header({ company, user }: { company: CompanyData; user: UserData }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [openMenu, setOpenMenu] = useState(false);

  const getBreadcrumbs = () => {
    const paths = pathname?.split("/").filter(Boolean) || [];
    return paths.map((path, index) => {
      const href = `/${paths.slice(0, index + 1).join("/")}`;
      const label = path.charAt(0).toUpperCase() + path.slice(1);
      const isLast = index === paths.length - 1;

      return { label, href, isLast };
    });
  };

  const breadcrumbs = getBreadcrumbs();
  const pageTitle = breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].label : "Dashboard";

  const handleLogout = () => {
    setOpenMenu(false);
    startTransition(async () => {
      await logoutAction();
    });
  };

  return (
    <header className="h-20 bg-white/80 backdrop-blur-md border-b border-border sticky top-0 z-40 px-8 flex items-center justify-between">
      <div className="flex flex-col">
        <h1 className="text-xl font-black text-dark tracking-tight">{pageTitle}</h1>
        <nav className="flex items-center gap-1.5 text-xs font-medium text-text-secondary mt-0.5">
          <Link href="/admin" className="hover:text-primary-orange transition-colors">
            <Home size={12} />
          </Link>
          {breadcrumbs.map((crumb, idx) => (
            <div key={crumb.href} className="flex items-center gap-1.5">
              <ChevronRight size={12} />
              <Link
                href={crumb.href}
                className={crumb.isLast ? "text-primary-orange font-bold" : "hover:text-primary-orange transition-colors"}
              >
                {crumb.label}
              </Link>
            </div>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-background-light rounded-xl border border-border cursor-pointer hover:bg-orange-50 transition-colors group">
          <Building2 size={18} className="text-primary-orange" />
          <div className="text-left">
            <p className="text-[10px] font-bold text-text-secondary uppercase leading-none">Unidade</p>
            <p className="text-sm font-bold text-dark leading-none mt-1">{company.name}</p>
          </div>
          <ChevronRight size={14} className="text-text-secondary group-hover:translate-x-0.5 transition-transform" />
        </div>

        <Link
          href="/"
          target="_blank"
          className="hidden lg:flex items-center gap-2 px-3 py-2 text-xs font-bold text-text-secondary hover:text-primary-orange hover:bg-orange-50 rounded-xl transition-all border border-transparent hover:border-orange-100"
        >
          🌐 Ver site
        </Link>

        <button className="relative p-2.5 text-text-secondary hover:text-primary-orange hover:bg-orange-50 rounded-xl transition-all border border-transparent hover:border-orange-100">
          <Bell size={22} />
          <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red border-2 border-white rounded-full"></span>
        </button>

        <div className="flex items-center gap-3 pl-6 border-l border-border relative">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-dark leading-none">{user.name}</p>
            <p className="text-[11px] font-medium text-text-secondary mt-1">
              {user.role === "ADMIN" ? "Administrador" : user.role}
            </p>
          </div>
          <button
            onClick={() => setOpenMenu((v) => !v)}
            className="w-10 h-10 rounded-xl bg-background-light flex items-center justify-center text-primary-orange border border-border overflow-hidden hover:ring-4 hover:ring-primary-orange/10 transition-all"
          >
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <span className="font-black">{user.initials}</span>
            )}
          </button>

          {openMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setOpenMenu(false)}
              />
              <div className="absolute right-0 top-full mt-3 w-64 z-50 bg-white rounded-2xl shadow-2xl border border-border overflow-hidden">
                <div className="p-4 bg-gradient-to-br from-[#FFF9F2] to-[#FFF0E0] border-b border-border">
                  <p className="font-black text-dark leading-tight">{user.name}</p>
                  <p className="text-xs text-text-secondary mt-1">{user.email}</p>
                  <p className="mt-2 inline-flex px-2.5 py-1 rounded-full bg-[#FF8A00]/15 text-[#FF6A00] text-[11px] font-black uppercase tracking-wide">
                    {user.role === "ADMIN" ? "Administrador" : user.role}
                  </p>
                </div>
                <div className="p-2">
                  <Link
                    href="/admin/configuracoes"
                    onClick={() => setOpenMenu(false)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-dark hover:bg-orange-50 hover:text-primary-orange transition-colors"
                  >
                    <Settings size={17} />
                    Configurações
                  </Link>
                  <button
                    onClick={handleLogout}
                    disabled={isPending}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    <LogOut size={17} />
                    {isPending ? "Saindo..." : "Sair da conta"}
                  </button>
                </div>
                <div className="px-4 py-3 bg-gray-50 border-t border-border">
                  <p className="text-[11px] text-text-secondary leading-relaxed">
                    <span className="font-black">Agendei Minha Quadra</span> — seus dados estão salvos automaticamente.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
