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
import { logoutAction } from "@/app/actions";

type CompanyData = {
  id: string;
  name: string;
  slug: string;
};

type UserData = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: Role;
  initials: string;
  canManageBookings: boolean;
  canAccessFinance: boolean;
  canManagePricing: boolean;
  canManageSchedule: boolean;
  canManageStaff: boolean;
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

export function Sidebar({ company, user, pendingBookingCount = 0 }: { company: CompanyData; user: UserData; pendingBookingCount?: number }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  const toggleSidebar = () => setIsOpen(!isOpen);
  const canSeeMenu = (href: string) => user.role === Role.ADMIN || href === "/admin" ||
    (["/admin/agendamentos", "/admin/clientes"].includes(href) && user.canManageBookings) ||
    (href === "/admin/quadras" && user.canManagePricing) ||
    (["/admin/financeiro", "/admin/relatorios"].includes(href) && user.canAccessFinance) ||
    (href === "/admin/configuracoes" && (user.canManageSchedule || user.canManagePricing || user.canManageStaff));

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
            <Link href="/admin" className="w-full" aria-label={`Painel ${company.name} — Agendei Minha Quadra`}>
              <div className="w-full h-32 overflow-hidden rounded-xl border border-slate-800 bg-[#070B14] shadow-sm">
                <img
                  src="/logo.png"
                  alt="Agendei Minha Quadra"
                  className="h-full w-full object-contain"
                  draggable={false}
                />
              </div>
            </Link>
          </div>

          <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
            {menuItems.filter((item) => canSeeMenu(item.href)).map((item) => {
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
                  {item.href === "/admin/agendamentos" && pendingBookingCount > 0 ? (
                    <span className="relative flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-black text-white animate-pulse" aria-label={`${pendingBookingCount} reservas pendentes`}>
                      {pendingBookingCount}
                    </span>
                  ) : isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary-orange" />}
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

            <form action={logoutAction}><button className="flex items-center justify-center gap-2 text-red font-bold text-sm px-4 py-3 w-full hover:bg-red-50 rounded-xl transition-all duration-200">
              <LogOut size={18} /><span>Sair da conta</span>
            </button></form>
          </div>
        </div>
      </aside>
    </>
  );
}
