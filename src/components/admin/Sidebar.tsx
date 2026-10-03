"use client";

import {
  LayoutDashboard,
  Calendar,
  Trophy,
  Users,
  BarChart3,
  FileText,
  Settings,
  LogOut,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
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

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/admin" },
  { icon: Calendar, label: "Agendamentos", href: "/admin/agendamentos" },
  { icon: Trophy, label: "Quadras", href: "/admin/quadras" },
  { icon: Users, label: "Clientes", href: "/admin/clientes" },
  { icon: BarChart3, label: "Financeiro", href: "/admin/financeiro" },
  { icon: FileText, label: "Relatórios", href: "/admin/relatorios" },
  { icon: Settings, label: "Configurações", href: "/admin/configuracoes" },
];

export function Sidebar({ company, user }: { company: CompanyData; user: UserData }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      <button
        onClick={toggleSidebar}
        className="lg:hidden fixed top-4 left-4 z-[60] p-2 bg-white rounded-lg shadow-soft border border-border text-dark"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 bg-dark/20 backdrop-blur-sm z-[50] lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 h-full z-[55] bg-white border-r border-border transition-all duration-300 ease-in-out",
          "w-[280px] lg:w-[280px]",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 flex justify-center">
            <Link href="/admin" className="w-full">
              <div className="w-full h-32 relative">
                {company.logo ? (
                  <img
                    src={company.logo}
                    alt={company.name}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      (e.currentTarget.nextElementSibling as HTMLElement)?.classList.remove("hidden");
                    }}
                  />
                ) : null}
                <div
                  className={cn(
                    "w-full h-full bg-gradient-primary rounded-xl flex flex-col items-center justify-center text-white px-3 gap-1",
                    company.logo && "hidden",
                  )}
                >
                  <p className="font-black text-4xl leading-none drop-shadow-md">
                    {company.name
                      .split(" ")
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </p>
                  <p className="text-[11px] font-bold tracking-[0.18em] uppercase opacity-90 truncate w-full text-center mt-1">
                    {company.name}
                  </p>
                </div>
              </div>
            </Link>
          </div>

          <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/admin" && pathname?.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "group flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 font-medium",
                    isActive
                      ? "bg-orange-50 text-primary-orange"
                      : "text-text-secondary hover:bg-background-light hover:text-dark",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon
                      size={22}
                      className={cn(
                        "transition-colors",
                        isActive
                          ? "text-primary-orange"
                          : "text-text-secondary group-hover:text-dark",
                      )}
                    />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary-orange" />}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 mt-auto border-t border-border bg-background-light/50">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-border shadow-soft mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary-orange flex items-center justify-center text-white font-bold text-lg shadow-orange-200 shadow-lg">
                {user.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-dark truncate">{user.name}</p>
                <p className="text-xs text-text-secondary truncate">
                  {user.role === "ADMIN"
                    ? "Administrador"
                    : user.role === "GERENTE"
                      ? "Gerente"
                      : user.role === "CAIXA"
                        ? "Caixa"
                        : user.role === "ATENDENTE"
                          ? "Atendente"
                          : "Usuário"}
                </p>
              </div>
              <ChevronRight size={16} className="text-text-secondary" />
            </div>

            <button className="flex items-center justify-center gap-2 text-red font-bold text-sm px-4 py-3 w-full hover:bg-red-50 rounded-xl transition-all duration-200">
              <LogOut size={18} />
              <span>Sair da conta</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
