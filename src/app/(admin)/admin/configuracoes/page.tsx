import Link from "next/link";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  addClosedDate, createStaffAccount, removeClosedDate, setOnlineBookingEnabled,
  toggleStaffAccount, updateArenaDetails, updateBusinessSettings,
  updatePricingSettings, updateStaffPermissions,
} from "./actions";

const weekdays = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const inputClass = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-orange-500";
const checkboxClass = "h-4 w-4 rounded border-slate-300 accent-orange-600";
const roleName: Record<string, string> = { ADMIN: "Administrador", GERENTE: "Gerente", CAIXA: "Caixa", ATENDENTE: "Atendente", USER: "Usuário", SUPERADMIN: "SuperAdmin" };
const dateLabel = (date: Date) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(date);

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/admin/configuracoes");
  const [user, company, modalities, courts, employees, closures] = await Promise.all([
    prisma.user.findFirst({ where: { id: session.userId, companyId: session.companyId, isActive: true }, select: { role: true, canManageSchedule: true, canManagePricing: true, canManageStaff: true } }),
    prisma.company.findUniqueOrThrow({ where: { id: session.companyId }, include: { businessHours: true } }),
    prisma.modality.findMany({ where: { companyId: session.companyId }, orderBy: { name: "asc" } }),
    prisma.court.findMany({ where: { companyId: session.companyId }, orderBy: { name: "asc" }, select: { id: true, name: true, pricePerHour: true } }),
    prisma.employee.findMany({ where: { companyId: session.companyId }, orderBy: { fullName: "asc" }, include: { user: { select: { id: true, email: true, role: true, isActive: true, canManageBookings: true, canCancelBookings: true, canAccessFinance: true, canManagePricing: true, canManageSchedule: true, canManageStaff: true } } } }),
    prisma.blockedTime.findMany({ where: { companyId: session.companyId, courtId: null, isActive: true }, orderBy: { startTime: "asc" } }),
  ]);
  if (!user) redirect("/login");
  const isAdmin = user.role === Role.ADMIN;
  const canSchedule = isAdmin || user.canManageSchedule;
  const canPricing = isAdmin || user.canManagePricing;
  const canStaff = isAdmin || user.canManageStaff;
  if (!canSchedule && !canPricing && !canStaff) redirect("/admin?error=forbidden");

  const hoursByDay = new Map(company.businessHours.map((entry) => [entry.weekday, entry]));
  const hours = weekdays.map((_, day) => {
    const saved = hoursByDay.get(day);
    const defaultOpen = day >= 1 && day <= 5 ? company.operatesMondayToFriday : day === 6 ? company.operatesSaturday : company.operatesSunday;
    return saved || { weekday: day, isOpen: defaultOpen, openTime: company.openingTime, closeTime: company.closingTime, breakStart: null, breakEnd: null };
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-10">
      <div><h1 className="text-3xl font-black text-slate-900">Configurações da arena</h1><p className="mt-1 text-slate-600">Gerencie os dados públicos, horários, preços e acessos da sua equipe.</p></div>

      {canSchedule && <Section id="dados-arena" title="Dados da arena" description="Essas informações são usadas no painel e na página pública. Imagens devem ser informadas por um endereço HTTPS público.">
        <form action={updateArenaDetails} className="grid gap-4 md:grid-cols-2">
          <Field label="Nome da arena" name="name" defaultValue={company.name} required />
          <Field label="Nome fantasia" name="fantasyName" defaultValue={company.fantasyName || ""} />
          <Field label="Nome do responsável" name="responsibleName" defaultValue={company.responsibleName || ""} />
          <Field label="CPF/CNPJ do responsável" name="responsibleDocument" defaultValue={company.responsibleDocument || ""} />
          <Field label="CNPJ da arena" name="cnpj" defaultValue={company.cnpj || ""} />
          <Field label="E-mail" name="email" type="email" defaultValue={company.email || ""} />
          <Field label="Telefone" name="phone" defaultValue={company.phone} />
          <Field label="WhatsApp" name="whatsapp" defaultValue={company.whatsapp || ""} />
          <Field label="Logo (caminho ou URL da imagem)" name="logo" defaultValue={company.logo || ""} />
          <Field label="Foto de capa (caminho ou URL da imagem)" name="coverImageUrl" defaultValue={company.coverImageUrl || ""} />
          <Field label="CEP" name="postalCode" defaultValue={company.postalCode || ""} />
          <Field label="Rua / endereço" name="address" defaultValue={company.address} />
          <Field label="Número" name="streetNumber" defaultValue={company.streetNumber || ""} />
          <Field label="Complemento" name="complement" defaultValue={company.complement || ""} />
          <Field label="Bairro" name="neighborhood" defaultValue={company.neighborhood || ""} />
          <Field label="Cidade" name="city" defaultValue={company.city || ""} />
          <Field label="Estado" name="state" defaultValue={company.state || ""} />
          <Field label="Latitude do mapa" name="latitude" type="number" step="any" defaultValue={company.latitude ?? ""} />
          <Field label="Longitude do mapa" name="longitude" type="number" step="any" defaultValue={company.longitude ?? ""} />
          <Field label="Site" name="websiteUrl" type="url" defaultValue={company.websiteUrl || ""} />
          <Field label="Instagram" name="instagramUrl" type="url" defaultValue={company.instagramUrl || ""} />
          <Field label="Facebook" name="facebookUrl" type="url" defaultValue={company.facebookUrl || ""} />
          <label className="text-sm font-semibold text-slate-700 md:col-span-2">Descrição da arena<textarea name="description" rows={4} maxLength={2000} defaultValue={company.description || ""} className={inputClass} /></label>
          <div className="flex justify-end md:col-span-2"><SaveButton /></div>
        </form>
      </Section>}

      {canSchedule && <Section id="funcionamento" title="Funcionamento e horários" description="Configure cada dia, intervalos e regras de antecedência. A duração da partida continua sendo definida em Quadras.">
        <form action={updateBusinessSettings} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Abertura padrão" name="openingTime" type="time" defaultValue={company.openingTime} required />
            <Field label="Fechamento padrão" name="closingTime" type="time" defaultValue={company.closingTime} required />
            <label className="text-sm font-semibold text-slate-700">Intervalo entre opções de horário<select name="slotIntervalMinutes" defaultValue={company.slotIntervalMinutes} className={inputClass}><option value="15">15 minutos</option><option value="30">30 minutos</option><option value="60">60 minutos</option></select></label>
            <Field label="Antecedência mínima (minutos)" name="minBookingNoticeMinutes" type="number" min="0" max="10080" defaultValue={company.minBookingNoticeMinutes} />
            <Field label="Agendar até quantos dias à frente" name="maxAdvanceBookingDays" type="number" min="1" max="365" defaultValue={company.maxAdvanceBookingDays} />
            <Field label="Intervalo para preparação (minutos)" name="bookingBufferMinutes" type="number" min="0" max="240" defaultValue={company.bookingBufferMinutes} />
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[740px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Dia</th><th className="p-3">Aberta</th><th className="p-3">Abre</th><th className="p-3">Fecha</th><th className="p-3">Início intervalo</th><th className="p-3">Fim intervalo</th></tr></thead><tbody>{hours.map((day, index) => <tr key={index} className="border-t border-slate-100"><td className="p-3 font-bold">{weekdays[index]}</td><td className="p-3"><input type="checkbox" name={`day_${index}_enabled`} defaultChecked={day.isOpen} className={checkboxClass} /></td><td className="p-3"><input type="time" name={`day_${index}_open`} defaultValue={day.openTime} className="rounded border border-slate-300 p-2" /></td><td className="p-3"><input type="time" name={`day_${index}_close`} defaultValue={day.closeTime} className="rounded border border-slate-300 p-2" /></td><td className="p-3"><input type="time" name={`day_${index}_breakStart`} defaultValue={day.breakStart || ""} className="rounded border border-slate-300 p-2" /></td><td className="p-3"><input type="time" name={`day_${index}_breakEnd`} defaultValue={day.breakEnd || ""} className="rounded border border-slate-300 p-2" /></td></tr>)}</tbody></table></div>
          <Field label="Prazo para cancelamento sem taxa (horas antes)" name="cancellationDeadlineHours" type="number" min="0" max="720" defaultValue={company.cancellationDeadlineHours} />
          <div className="flex justify-end"><SaveButton /></div>
        </form>
        <div className="mt-8 border-t border-slate-200 pt-6"><h3 className="font-bold text-slate-900">Feriados e bloqueios da arena</h3><p className="mt-1 text-sm text-slate-600">Bloqueios de dia inteiro deixam de oferecer horários na página pública.</p>
          <form action={addClosedDate} className="mt-4 flex flex-wrap items-end gap-3"><label className="text-sm font-semibold">Data<input required type="date" name="date" className={inputClass} /></label><label className="min-w-64 flex-1 text-sm font-semibold">Motivo<input required name="reason" maxLength={200} placeholder="Feriado, evento, manutenção..." className={inputClass} /></label><button className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white">Bloquear data</button></form>
          <div className="mt-4 space-y-2">{closures.map((closure) => <div key={closure.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 p-3 text-sm"><span><b>{dateLabel(closure.startTime)}</b> · {closure.reason}</span><form action={removeClosedDate}><input type="hidden" name="id" value={closure.id} /><button className="font-bold text-red-700 underline">Remover bloqueio</button></form></div>)}{closures.length === 0 && <p className="text-sm text-slate-500">Nenhuma data bloqueada.</p>}</div>
        </div>
      </Section>}

      {canPricing && <Section id="precos" title="Preços e cancelamento" description="Defina o preço base das modalidades e o valor específico de cada quadra.">
        <form action={updatePricingSettings} className="space-y-5">
          <h3 className="font-bold">Preço base por modalidade</h3><div className="grid gap-4 sm:grid-cols-2">{modalities.map((modality) => <Field key={modality.id} label={`${modality.name} · preço por hora (R$)`} name={`modality_${modality.id}`} type="number" min="0" max="100000" step="0.01" defaultValue={modality.pricePerHour} required />)}</div>
          <h3 className="border-t border-slate-100 pt-4 font-bold">Preço por quadra</h3><div className="grid gap-4 sm:grid-cols-2">{courts.map((court) => <Field key={court.id} label={`${court.name} · preço por hora (R$)`} name={`court_${court.id}`} type="number" min="0" max="100000" step="0.01" defaultValue={court.pricePerHour} required />)}</div>
          <Field label="Taxa padrão de cancelamento (%)" name="defaultCancellationFeePercent" type="number" min="0" max="100" step="0.01" defaultValue={company.defaultCancellationFeePercent} />
          <fieldset><legend className="text-sm font-bold">Formas aceitas na arena</legend><div className="mt-3 flex flex-wrap gap-6">{[["acceptsPix", "Pix", company.acceptsPix], ["acceptsCash", "Dinheiro", company.acceptsCash], ["acceptsCard", "Cartão", company.acceptsCard]].map(([name, label, checked]) => <label key={String(name)} className="flex items-center gap-2 text-sm"><input type="checkbox" name={String(name)} defaultChecked={Boolean(checked)} className={checkboxClass} />{String(label)}</label>)}</div></fieldset>
          <div className="flex justify-end"><SaveButton /></div>
        </form>
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">As formas de pagamento são informativas e para lançamentos manuais. Ainda não há gateway para cobrar ou confirmar pagamento automaticamente; a taxa de cancelamento fica configurada como política, sem cálculo automático de reembolso.</p>
      </Section>}

      {canSchedule && <Section id="pagina-publica" title="Página pública da arena" description="Configure o que pode aparecer no link que seus clientes usam para reservar.">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-50 p-4"><div><p className="text-sm font-semibold text-slate-700">Link atual</p><Link className="text-orange-700 underline" href={`/arena/${company.slug}`} target="_blank">{`/arena/${company.slug}`}</Link></div><form action={setOnlineBookingEnabled}><input type="hidden" name="enabled" value={String(!company.onlineBookingEnabled)} /><button className={`rounded-lg px-4 py-2 text-sm font-bold text-white ${company.onlineBookingEnabled ? "bg-red-700" : "bg-emerald-700"}`}>{company.onlineBookingEnabled ? "Desativar reservas online" : "Ativar reservas online"}</button></form></div>
        <p className="mt-3 text-sm">A página usa nome, logo, endereço, WhatsApp, descrição, modalidades, quadras e preços cadastrados. Links de redes sociais e capa ficam salvos para exibição e serão usados no layout público.</p>
      </Section>}

      {canStaff && <Section id="equipe" title="Funcionários e permissões" description="Cada funcionário recebe seu próprio e-mail e senha. Não compartilhe a senha de proprietário.">
        <form action={createStaffAccount} className="grid gap-4 rounded-xl bg-slate-50 p-4 md:grid-cols-2">
          <Field label="Nome completo" name="name" required />
          <Field label="E-mail de acesso" name="email" type="email" required />
          <Field label="Telefone" name="phone" />
          <Field label="Cargo" name="position" required />
          <label className="text-sm font-semibold">Perfil<select name="role" className={inputClass}><option value="ATENDENTE">Recepção / Atendente</option><option value="CAIXA">Caixa</option><option value="GERENTE">Gerente</option></select></label>
          <Field label="Senha inicial (mínimo 12 caracteres)" name="password" type="password" minLength={12} required />
          <div className="md:col-span-2"><p className="text-sm font-bold">Permissões iniciais</p><PermissionChecks /></div>
          <div className="flex justify-end md:col-span-2"><button className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-bold text-white">Criar acesso</button></div>
        </form>
        <div className="mt-5 space-y-3">{employees.map((employee) => <div key={employee.id} className="rounded-xl border border-slate-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-bold">{employee.fullName}</p><p className="text-sm text-slate-600">{employee.user?.email || employee.email || "Sem conta de acesso"} · {employee.user ? roleName[employee.user.role] : employee.position} · {employee.user?.isActive ? "Acesso ativo" : "Acesso inativo"}</p></div>{employee.user && employee.user.role !== "ADMIN" && <form action={toggleStaffAccount}><input type="hidden" name="userId" value={employee.user.id} /><input type="hidden" name="active" value={String(!employee.user.isActive)} /><button className="font-bold text-orange-700 underline">{employee.user.isActive ? "Desativar acesso" : "Reativar acesso"}</button></form>}</div>
          {employee.user && employee.user.role !== "ADMIN" && <form action={updateStaffPermissions} className="mt-3 border-t border-slate-100 pt-3"><input type="hidden" name="userId" value={employee.user.id} /><PermissionChecks user={employee.user} /><button className="mt-3 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold">Salvar permissões</button></form>}
        </div>)}{employees.length === 0 && <p className="text-sm text-slate-500">Nenhum funcionário cadastrado ainda.</p>}</div>
      </Section>}
    </div>
  );
}

function Section({ id, title, description, children }: { id: string; title: string; description: string; children: React.ReactNode }) {
  return <section id={id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7"><div className="mb-5"><h2 className="text-xl font-black">{title}</h2><p className="mt-1 text-sm text-slate-600">{description}</p></div>{children}</section>;
}

function Field({ label, name, type = "text", defaultValue, required, min, max, step, minLength }: { label: string; name: string; type?: string; defaultValue?: string | number; required?: boolean; min?: number | string; max?: number | string; step?: string; minLength?: number }) {
  return <label className="text-sm font-semibold text-slate-700">{label}<input className={inputClass} name={name} type={type} defaultValue={defaultValue} required={required} min={min} max={max} step={step} minLength={minLength} /></label>;
}

function SaveButton() { return <button className="rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-700">Salvar alterações</button>; }

function PermissionChecks({ user }: { user?: { canManageBookings: boolean; canCancelBookings: boolean; canAccessFinance: boolean; canManagePricing: boolean; canManageSchedule: boolean } }) {
  const entries = [
    ["canManageBookings", "Criar e gerenciar agendamentos", user?.canManageBookings ?? true],
    ["canCancelBookings", "Cancelar agendamentos", user?.canCancelBookings ?? false],
    ["canAccessFinance", "Acessar financeiro e relatórios", user?.canAccessFinance ?? false],
    ["canManagePricing", "Gerenciar quadras e preços", user?.canManagePricing ?? false],
    ["canManageSchedule", "Alterar horários e configurações", user?.canManageSchedule ?? false],
  ] as const;
  return <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">{entries.map(([name, label, checked]) => <label key={name} className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" name={name} defaultChecked={checked} className={checkboxClass} />{label}</label>)}</div>;
}
