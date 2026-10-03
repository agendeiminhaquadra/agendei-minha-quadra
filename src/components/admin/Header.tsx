"use client";

import { Bell, Search, ChevronRight, Home, Building2, User } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Role } from "@prisma/client";

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

        <button className="relative p-2.5 text-text-secondary hover:text-primary-orange hover:bg-orange-50 rounded-xl transition-all border border-transparent hover:border-orange-100">
          <Bell size={22} />
          <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red border-2 border-white rounded-full"></span>
        </button>

        <div className="flex items-center gap-3 pl-6 border-l border-border">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-dark leading-none">{user.name}</p>
            <p className="text-[11px] font-medium text-text-secondary mt-1">{company.name}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-background-light flex items-center justify-center text-primary-orange border border-border overflow-hidden">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <span className="font-black">{user.initials}</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
