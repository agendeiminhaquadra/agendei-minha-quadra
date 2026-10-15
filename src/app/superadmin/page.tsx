import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { Building2, CalendarClock, CircleDollarSign, ShieldCheck, Users } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toggleCompanySuspension, toggleUserStatus, updateCompanyPlan } from "./actions";

export const dynamic = "force-dynamic";

const moneyDate = (date: Date | null) => date ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(date) : "—";
const statusLabel: Record<string, string> = {
  ACTIVE: "Ativo", TRIALING: "Período de teste", PAST_DUE: "Pagamento pendente", CANCELED: "Cancelado", EXPIRED: "Expirado",
};
const planLabel: Record<string, string> = { TRIAL: "Teste", ESSENCIAL: "Essencial", PROFISSIONAL: "Profissional", EMPRESA: "Empresa" };

export default async function SuperAdminPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/superadmin");
  const currentUser = await prisma.user.findUnique({ where: { id: session.userId }, select: { role: true, isActive: true } });
  if (!currentUser?.isActive || currentUser.role !== Role.SUPERADMIN) redirect("/login?error=forbidden");

  const [companies, users, companyCount, activeCompanyCount, userCount, trialCount] = await Promise.all([
    prisma.company.findMany({
      orderBy: { createdAt: "desc" },
      include: { users: { select: { id: true } } },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, email: true, role: true, createdAt: true,
        lastLoginAt: true, isActive: true,
        company: { select: { id: true, name: true, isSuspended: true, planStatus: true, trialEndsAt: true, currentPeriodEnd: true } },
      },
    }),
    prisma.company.count(),
    prisma.company.count({ where: { isSuspended: false, planStatus: { in: ["ACTIVE", "TRIALING"] } } }),
    prisma.user.count(),
    prisma.company.count({ where: { planStatus: "TRIALING" } }),
  ]);
  const now = new Date();

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-slate-950 text-white px-5 py-6 md:px-10">
        <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-4">
          <div><p className="text-orange-400 text-sm font-bold uppercase tracking-widest">Minha Quadra</p><h1 className="text-2xl md:text-3xl font-black mt-1">Painel SuperAdmin</h1><p className="text-slate-300 mt-1">Gestão de contas, empresas e assinaturas</p></div>
          <div className="rounded-xl bg-white/10 px-4 py-3 text-sm"><ShieldCheck className="inline mr-2 text-emerald-400" size={18} />Acesso de SuperAdmin verificado</div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-5 py-8 md:px-10 space-y-10">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat icon={<Building2 />} label="Empresas cadastradas" value={companyCount} />
          <Stat icon={<ShieldCheck />} label="Contas liberadas" value={activeCompanyCount} />
          <Stat icon={<Users />} label="Usuários cadastrados" value={userCount} />
          <Stat icon={<CalendarClock />} label="Em período de teste" value={trialCount} />
        </section>

        <section>
          <div className="mb-4"><h2 className="text-xl font-extrabold">Empresas e planos</h2><p className="text-sm text-slate-600">Confira vencimentos, ajuste plano e suspenda ou libere o acesso da empresa.</p></div>
          <div className="space-y-4">
            {companies.map((company) => {
              const deadline = company.planStatus === "TRIALING" ? company.trialEndsAt : company.currentPeriodEnd;
              const expired = company.planStatus === "EXPIRED" || (company.planStatus === "TRIALING" && deadline! < now) || (company.planStatus === "PAST_DUE") || (company.planStatus === "CANCELED" && !!deadline && deadline < now);
              return <article key={company.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div><h3 className="text-lg font-bold">{company.name}</h3><p className="text-sm text-slate-600">{company.email || "Sem e-mail"} · /arena/{company.slug}</p><p className="mt-2 text-sm">Plano <b>{planLabel[company.planTier]}</b> · {statusLabel[company.planStatus]} · {company.planStatus === "TRIALING" ? "Teste termina" : "Vencimento"}: <b>{moneyDate(deadline)}</b>{expired && <span className="ml-2 text-red-700 font-bold">Vencido/pendente</span>}</p></div>
                  <form action={toggleCompanySuspension}><input type="hidden" name="companyId" value={company.id} /><input type="hidden" name="suspend" value={String(!company.isSuspended)} /><button className={`rounded-lg px-4 py-2 text-sm font-bold text-white ${company.isSuspended ? "bg-emerald-700" : "bg-red-700"}`}>{company.isSuspended ? "Desbloquear empresa" : "Bloquear empresa"}</button></form>
                </div>
                <form action={updateCompanyPlan} className="mt-5 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
                  <input type="hidden" name="companyId" value={company.id} />
                  <label className="text-xs font-bold text-slate-600">Plano<select name="planTier" defaultValue={company.planTier} className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm">{Object.entries(planLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                  <label className="text-xs font-bold text-slate-600">Situação<select name="planStatus" defaultValue={company.planStatus} className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm">{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                  <label className="text-xs font-bold text-slate-600">Vencimento<input type="date" name="endDate" defaultValue={(deadline || undefined)?.toISOString().slice(0, 10)} className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
                  <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white">Salvar plano</button>
                </form>
                <p className="mt-3 text-xs text-slate-500">{company.users.length} usuário(s) nesta empresa · cadastrada em {moneyDate(company.createdAt)}</p>
              </article>;
            })}
            {companies.length === 0 && <Empty text="Ainda não há empresas cadastradas." />}
          </div>
        </section>

        <section>
          <div className="mb-4"><h2 className="text-xl font-extrabold">Todos os usuários</h2><p className="text-sm text-slate-600">A lista inclui o e-mail, perfil, empresa e último acesso. Você pode ativar ou desativar contas.</p></div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-slate-100 text-xs uppercase text-slate-600"><tr><th className="px-4 py-3">Usuário</th><th className="px-4 py-3">Empresa</th><th className="px-4 py-3">Perfil</th><th className="px-4 py-3">Criado</th><th className="px-4 py-3">Último acesso</th><th className="px-4 py-3">Acesso</th><th className="px-4 py-3">Ação</th></tr></thead>
              <tbody>{users.map((user) => <tr key={user.id} className="border-t border-slate-100"><td className="px-4 py-3"><b>{user.name || "Sem nome"}</b><div className="text-slate-500">{user.email}</div></td><td className="px-4 py-3">{user.company.name}{user.company.isSuspended && <span className="ml-2 text-red-700">(empresa bloqueada)</span>}</td><td className="px-4 py-3">{user.role}</td><td className="px-4 py-3">{moneyDate(user.createdAt)}</td><td className="px-4 py-3">{moneyDate(user.lastLoginAt)}</td><td className="px-4 py-3"><span className={user.isActive ? "font-bold text-emerald-700" : "font-bold text-red-700"}>{user.isActive ? "Ativo" : "Desativado"}</span></td><td className="px-4 py-3">{user.role === "SUPERADMIN" ? <span className="text-slate-400">Protegido</span> : <form action={toggleUserStatus}><input type="hidden" name="userId" value={user.id} /><input type="hidden" name="activate" value={String(!user.isActive)} /><button className="font-bold text-blue-700 underline">{user.isActive ? "Desativar" : "Ativar"}</button></form>}</td></tr>)}</tbody>
            </table>
            {users.length === 0 && <Empty text="Ainda não há usuários cadastrados." />}
          </div>
        </section>
        <p className="text-xs text-slate-500 flex items-center gap-2"><CircleDollarSign size={16} /> Alterações de situação e plano são registradas diretamente no cadastro da empresa.</p>
      </div>
    </main>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between text-slate-500"><span className="text-sm font-medium">{label}</span><span className="text-orange-600">{icon}</span></div><p className="mt-3 text-3xl font-black">{value}</p></div>;
}

function Empty({ text }: { text: string }) { return <div className="p-6 text-center text-sm text-slate-500">{text}</div>; }
