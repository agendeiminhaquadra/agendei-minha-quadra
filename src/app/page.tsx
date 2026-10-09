"use client";

import Link from "next/link";
import {
  Zap, ShieldCheck, MonitorSmartphone, Clock,
  CheckCircle2, ArrowRight, ChevronRight, Calendar,
  Instagram, Facebook, BadgeInfo, Users, Activity,
  Star, Sparkles, Ticket, X, CreditCard,
  BarChart3, FileText, Settings, Smartphone,
  MessageCircle, Award, TrendingUp, DollarSign,
  Building2, Heart, Phone, Mail, MapPin,
  LayoutDashboard, Trophy, Bell, Menu, Rocket
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type FeatureCard = {
  icon: React.ReactNode;
  title: string;
  desc: string;
  iconBg: string;
  iconColor: string;
};

type Plano = {
  nome: string;
  precoMensal: number;
  precoAnual: number;
  tag?: string;
  popular?: boolean;
  beneficios: string[];
  ctaLabel: string;
};

type Depoimento = {
  nome: string;
  cargo: string;
  cidade: string;
  nota: number;
  texto: string;
  initials: string;
};

const FEATURES_TOPO: FeatureCard[] = [
  {
    icon: <Zap size={26} />,
    title: "Agendamento Online 24h",
    desc: "Seus clientes reservam a qualquer hora, direto pelo site. Nenhum horário perdido!",
    iconBg: "from-[#FFB000] to-[#FF7A00]",
    iconColor: "text-white",
  },
  {
    icon: <CreditCard size={26} />,
    title: "Pagamentos Integrados",
    desc: "Pix, Cartão, Boleto. Receba automaticamente no ato da reserva.",
    iconBg: "from-green-500 to-emerald-600",
    iconColor: "text-white",
  },
  {
    icon: <DollarSign size={26} />,
    title: "Financeiro Automatizado",
    desc: "Relatórios de entrada, cancelamentos, inadimplência e lucro em tempo real.",
    iconBg: "from-blue-500 to-indigo-600",
    iconColor: "text-white",
  },
  {
    icon: <Bell size={26} />,
    title: "Lembretes Automáticos",
    desc: "WhatsApp e e-mail para o cliente. Zero faltas sem aviso prévio.",
    iconBg: "from-fuchsia-500 to-purple-600",
    iconColor: "text-white",
  },
];

const FUNCIONALIDADES: FeatureCard[] = [
  {
    icon: <LayoutDashboard size={30} />,
    title: "Dashboard Completo",
    desc: "Visão geral do seu dia: reservas, valores recebidos, horários livres e ocupados.",
    iconBg: "bg-[#FF8A00]/10",
    iconColor: "text-[#FF8A00]",
  },
  {
    icon: <Calendar size={30} />,
    title: "Gestão de Reservas",
    desc: "Crie, edite, cancele e remarque agendamentos com poucos cliques. Bloqueie horários de manutenção.",
    iconBg: "bg-[#FF8A00]/10",
    iconColor: "text-[#FF8A00]",
  },
  {
    icon: <Trophy size={30} />,
    title: "Quadras e Modalidades",
    desc: "Cadastre futebol, vôlei, futevôlei, beach tennis. Preços diferentes por horário/dia.",
    iconBg: "bg-[#FF8A00]/10",
    iconColor: "text-[#FF8A00]",
  },
  {
    icon: <Users size={30} />,
    title: "Cadastro de Clientes",
    desc: "Histórico de reservas, preferências, telefone, status VIP e frequência.",
    iconBg: "bg-[#FF8A00]/10",
    iconColor: "text-[#FF8A00]",
  },
  {
    icon: <BarChart3 size={30} />,
    title: "Relatórios Inteligentes",
    desc: "Qual horário mais vende, qual modalidade lucra mais, quais clientes fidelizar.",
    iconBg: "bg-[#FF8A00]/10",
    iconColor: "text-[#FF8A00]",
  },
  {
    icon: <ShieldCheck size={30} />,
    title: "Multi-Usuários (Cargos)",
    desc: "Gerente, Caixa, Atendente. Acesso por função sem mexer no financeiro.",
    iconBg: "bg-[#FF8A00]/10",
    iconColor: "text-[#FF8A00]",
  },
  {
    icon: <Smartphone size={30} />,
    title: "100% Responsivo",
    desc: "Gerencia tudo do celular: confirma reservas, recebe Pix, vê relatórios.",
    iconBg: "bg-[#FF8A00]/10",
    iconColor: "text-[#FF8A00]",
  },
  {
    icon: <MonitorSmartphone size={30} />,
    title: "Site de Reservas Personalizado",
    desc: "Sua marca, suas cores, suas regras. Domínio próprio se quiser.",
    iconBg: "bg-[#FF8A00]/10",
    iconColor: "text-[#FF8A00]",
  },
  {
    icon: <Settings size={30} />,
    title: "Regras Avançadas",
    desc: "Tempo mínimo de reserva, multa cancelamento, horários de pico, pacotes mensais.",
    iconBg: "bg-[#FF8A00]/10",
    iconColor: "text-[#FF8A00]",
  },
];

const PLANOS: Plano[] = [
  {
    nome: "Essencial",
    precoMensal: 89,
    precoAnual: 79,
    tag: "Para começar",
    beneficios: [
      "Até 2 quadras cadastradas",
      "Agendamento online ilimitado",
      "Gestão de clientes",
      "Relatórios básicos",
      "Suporte via chat",
    ],
    ctaLabel: "Testar Grátis 7 dias",
  },
  {
    nome: "Profissional",
    precoMensal: 169,
    precoAnual: 149,
    tag: "Mais Escolhido",
    popular: true,
    beneficios: [
      "Até 6 quadras cadastradas",
      "Tudo do plano Essencial, mais:",
      "Lembretes via WhatsApp",
      "Pagamentos Pix e Cartão integrados",
      "Relatórios financeiros avançados",
      "2 usuários (Caixa/Atendente)",
      "Multa de cancelamento automática",
      "Suporte prioritário",
    ],
    ctaLabel: "Testar Grátis 7 dias",
  },
  {
    nome: "Empresa",
    precoMensal: 299,
    precoAnual: 259,
    tag: "Para redes e arenas grandes",
    beneficios: [
      "Quadras ilimitadas",
      "Tudo do Profissional, mais:",
      "Usuários e cargos ilimitados",
      "Domínio personalizado",
      "Relatórios comparativos (múltiplas unidades)",
      "Gerente de sucesso dedicado",
      "Onboarding completo",
    ],
    ctaLabel: "Testar Grátis 7 dias",
  },
];

const DEPOIMENTOS: Depoimento[] = [
  {
    nome: "Ricardo Mendes",
    cargo: "Dono do Complexo Sports",
    cidade: "São Paulo - SP",
    nota: 5,
    texto:
      "Antes eu anotava tudo na agenda de papel. Perdia 3-4 reservas por semana por erro de horário. Hoje 80% das reservas vem pelo Agendei sozinho, o financeiro fecha certinho, e eu durmo mais tranquilo. Aumentou 40% a ocupação.",
    initials: "RM",
  },
  {
    nome: "Juliana Ferreira",
    cargo: "Sócia da Arena Beach",
    cidade: "Florianópolis - SC",
    nota: 5,
    texto:
      "A parte que mais me ajudou foi o lembrete de WhatsApp por cliente. Caiu o número de faltas em quase 60%! E recebo Pix na hora, sem ter que cobrar ninguém. Sistema muito simples, a equipe aprendeu em 1 dia.",
    initials: "JF",
  },
  {
    nome: "Paulo Henrique",
    cargo: "Proprietário Play Quadras",
    cidade: "Belo Horizonte - MG",
    nota: 5,
    texto:
      "Eu tinha 2 sistemas antes: um pra reserva, outro de financeiro. Hoje é tudo num lugar só. Os relatórios me mostraram que as 22h é o horário mais lucrativo — aumentei o preço e ninguém reclamou. Melhor investimento do ano.",
    initials: "PH",
  },
];

const NAV_LINKS = [
  { nome: "Início", href: "#inicio" },
  { nome: "Recursos", href: "#recursos" },
  { nome: "Como Funciona", href: "#como-funciona" },
  { nome: "Planos", href: "#planos" },
  { nome: "Depoimentos", href: "#depoimentos" },
  { nome: "Teste Grátis", href: "/registrar" },
];

export default function SiteVendasSaaS() {
  const router = useRouter();
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);
  const [periodoAnual, setPeriodoAnual] = useState(true);
  const [formEnviado, setFormEnviado] = useState(false);
  const [formNome, setFormNome] = useState("");
  const [formTelefone, setFormTelefone] = useState("");
  const [formComplexo, setFormComplexo] = useState("");
  const [formCidade, setFormCidade] = useState("");

  function onSubmitDemo(e: React.FormEvent) {
    e.preventDefault();
    setFormEnviado(true);
    const params = new URLSearchParams();
    if (formNome) params.set("ownerName", formNome);
    if (formTelefone) params.set("phone", formTelefone);
    if (formComplexo) params.set("companyName", formComplexo);
    if (formCidade) params.set("city", formCidade);
    setTimeout(() => {
      router.push(`/registrar?${params.toString()}`);
    }, 800);
  }

  return (
    <div className="min-h-screen bg-white text-dark flex flex-col font-sans">
      {/* HEADER */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[76px]">
            <div className="flex items-center gap-10">
              <Link href="/" className="flex items-center gap-2 group">
                <img
                  src="/logo.png"
                  alt="Agendei Minha Quadra"
                  className="h-[72px] w-auto max-w-[260px] object-contain drop-shadow-[0_4px_16px_rgba(255,122,0,0.18)] group-hover:scale-[1.02] transition-transform select-none"
                  draggable={false}
                />
              </Link>

              <nav className="hidden lg:flex items-center gap-7">
                {NAV_LINKS.map((item, i) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "text-sm font-bold transition-colors",
                      i === 0
                        ? "text-[#FF8A00] border-b-2 border-[#FF8A00] -mb-[29px] pb-[26px]"
                        : "text-text-secondary hover:text-dark"
                    )}
                  >
                    {item.nome}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="hidden md:flex items-center gap-3">
              <Link
                href="/login"
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-dark border border-border hover:bg-background-light hover:text-dark transition-all"
              >
                Entrar
              </Link>
              <Link
                href="/registrar"
                className="px-5 py-2.5 rounded-xl text-sm font-black text-white bg-gradient-to-r from-[#FF8A00] to-[#FF6A00] hover:shadow-[0_8px_24px_rgba(255,122,0,0.45)] hover:scale-[1.03] active:scale-[0.998] transition-all"
              >
                Teste Grátis 7 dias
              </Link>
            </div>

            <button
              onClick={() => setMenuMobileAberto((v) => !v)}
              className="lg:hidden text-dark p-2"
              aria-label="Abrir menu"
            >
              {menuMobileAberto ? <X size={26} /> : <Menu size={26} />}
            </button>
          </div>
        </div>

        {menuMobileAberto && (
          <div className="lg:hidden border-t border-border bg-white px-4 py-4 space-y-2">
            {NAV_LINKS.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setMenuMobileAberto(false)}
                className="block w-full text-left text-dark/85 font-semibold py-2.5 px-3 rounded-lg hover:bg-background-light"
              >
                {n.nome}
              </Link>
            ))}
            <div className="pt-3 flex flex-col gap-2">
              <Link
                href="/login"
                onClick={() => setMenuMobileAberto(false)}
                className="text-center px-4 py-2.5 rounded-xl border border-border text-dark font-bold hover:bg-background-light"
              >
                Entrar
              </Link>
              <Link
                href="/registrar"
                onClick={() => setMenuMobileAberto(false)}
                className="text-center px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FF8A00] to-[#FF7A00] text-white font-black"
              >
                Teste Grátis 7 dias
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* HERO SITE DE VENDAS */}
      <section id="inicio" className="relative overflow-hidden text-white scroll-mt-[100px]">
        <div className="absolute inset-0">
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 15% 25%, rgba(255,138,0,0.28) 0%, transparent 45%), radial-gradient(circle at 85% 75%, rgba(255,77,46,0.22) 0%, transparent 45%), linear-gradient(135deg, #07122A 0%, #0B1220 45%, #152040 100%)",
            }}
          />
          <div className="absolute inset-0 opacity-[0.12] pointer-events-none select-none">
            <svg viewBox="0 0 1600 800" className="w-full h-full">
              <defs>
                <pattern id="gridSaaS" width="58" height="58" patternUnits="userSpaceOnUse">
                  <path d="M 58 0 L 0 0 0 58" fill="none" stroke="white" strokeWidth="1" />
                </pattern>
              </defs>
              <rect x="0" y="0" width="1600" height="800" fill="url(#gridSaaS)" />
            </svg>
          </div>
          <div
            className="absolute inset-0 bg-center bg-cover opacity-[0.35] mix-blend-luminosity"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=2400&q=80')",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#07122A]/94 via-[#07122A]/78 to-[#07122A]/50" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0B1220]/75" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-36 lg:pt-20 lg:pb-44">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 text-xs font-black uppercase tracking-[0.18em] rounded-full border border-[#FF8A00]/35 bg-[#FF8A00]/12 text-[#FFB000]">
                <Sparkles size={14} /> Sistema completo para arenas e complexos
              </div>
              <h1 className="font-black tracking-[-0.04em] leading-[0.98] mb-6">
                <span className="block text-white text-4xl sm:text-5xl lg:text-6xl">
                  Pare de perder
                </span>
                <span className="block mt-2 bg-gradient-to-r from-[#FFB000] via-[#FF8A00] to-[#FF4D2E] bg-clip-text text-transparent text-4xl sm:text-5xl lg:text-[72px]">
                  horários e dinheiro.
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-white/75 max-w-xl leading-relaxed">
                O Agendei Minha Quadra é o <strong className="text-white">sistema de agendamento online</strong> que
                automatiza suas reservas, recebíveis e relacionamento com clientes.
                Mais ocupação, menos dor de cabeça, <span className="text-[#FFB000] font-bold">+35% de faturamento em média</span> nos primeiros meses.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Link
                  href="/registrar"
                  className="px-7 py-4 rounded-xl text-white font-black bg-gradient-to-r from-[#FF8A00] to-[#FF6A00] hover:shadow-[0_12px_36px_rgba(255,138,0,0.55)] hover:-translate-y-0.5 active:translate-y-0 transition-all inline-flex items-center gap-2"
                >
                  Teste Grátis 7 dias <ArrowRight size={18} />
                </Link>
                <Link
                  href="#planos"
                  className="px-7 py-4 rounded-xl text-white font-bold border border-white/15 bg-white/5 hover:bg-white/10 hover:border-white/25 transition-all inline-flex items-center gap-2"
                >
                  Ver Planos e Preços <ChevronRight size={18} />
                </Link>
              </div>

              <div className="mt-10 flex items-center gap-6 flex-wrap">
                <div className="flex -space-x-3">
                  {["AM", "RS", "JH", "MC"].map((iniciais, i) => (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-full border-2 border-[#0B1220] bg-gradient-to-br from-[#FFB000] to-[#FF6A00] text-white flex items-center justify-center text-xs font-black"
                    >
                      {iniciais}
                    </div>
                  ))}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={16} fill="#FFB000" stroke="#FFB000" />
                    ))}
                  </div>
                  <p className="text-sm text-white/70 mt-1">
                    <strong className="text-white">+250 arenas</strong> usam o Agendei em todo o Brasil.
                  </p>
                </div>
              </div>
            </div>

            {/* Mock Dashboard lado direito */}
            <div className="relative hidden lg:block">
              <div className="absolute -top-8 -left-10 w-64 h-64 rounded-full bg-[#FF8A00]/20 blur-[120px]" />
              <div className="absolute -bottom-10 -right-6 w-72 h-72 rounded-full bg-[#FF4D2E]/15 blur-[120px]" />
              <div className="relative rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-[0_40px_80px_rgba(0,0,0,0.55)] p-4">
                <div className="flex items-center justify-between px-3 py-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FFB000] to-[#FF7A00] flex items-center justify-center text-white">
                      <LayoutDashboard size={18} />
                    </div>
                    <div>
                      <p className="text-white font-black text-sm">Dashboard</p>
                      <p className="text-[11px] text-white/50">Hoje, {new Date().toLocaleDateString("pt-BR")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.7)]" />
                    <span className="text-[11px] font-bold text-white/60">AO VIVO</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 p-3">
                  {[
                    {
                      label: "Reservas Hoje",
                      valor: "28",
                      delta: "+12 vs ontem",
                      cor: "text-green-400",
                      ico: <Calendar size={16} />,
                    },
                    {
                      label: "Faturamento",
                      valor: "R$ 3.240",
                      delta: "+18% semana",
                      cor: "text-[#FFB000]",
                      ico: <DollarSign size={16} />,
                    },
                    {
                      label: "Ocupação",
                      valor: "84%",
                      delta: "Meta 90%",
                      cor: "text-blue-300",
                      ico: <TrendingUp size={16} />,
                    },
                    {
                      label: "Clientes Novos",
                      valor: "7",
                      delta: "3 VIP",
                      cor: "text-fuchsia-300",
                      ico: <Users size={16} />,
                    },
                  ].map((k) => (
                    <div
                      key={k.label}
                      className="rounded-2xl bg-[#0F172A]/60 border border-white/8 p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-8 h-8 rounded-lg bg-[#FF8A00]/15 text-[#FFB000] flex items-center justify-center">
                          {k.ico}
                        </div>
                        <span className={cn("text-[10px] font-black uppercase tracking-wider", k.cor)}>
                          {k.delta}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/50 font-bold uppercase tracking-wider">
                        {k.label}
                      </p>
                      <p className="text-2xl font-black text-white mt-0.5">{k.valor}</p>
                    </div>
                  ))}
                </div>
                <div className="px-3 pb-3">
                  <div className="rounded-2xl bg-[#0F172A]/60 border border-white/8 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-white font-black text-sm">Próximas Reservas</p>
                      <span className="text-[11px] font-bold text-white/50">Hoje</span>
                    </div>
                    {[
                      { h: "18:00", q: "Quadra 01 • Futebol", c: "João Silva", valor: "R$ 160" },
                      { h: "19:00", q: "Quadra 03 • Beach Tennis", c: "Mariana Lima", valor: "R$ 90" },
                      { h: "20:00", q: "Quadra 02 • Futevôlei", c: "Carlos Souza", valor: "R$ 140" },
                    ].map((r) => (
                      <div
                        key={r.h}
                        className="flex items-center justify-between py-2.5 border-b border-white/6 last:border-none"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#FF8A00]/15 text-[#FFB000] font-black text-sm flex items-center justify-center">
                            {r.h.slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-white font-bold text-sm truncate">{r.q}</p>
                            <p className="text-[11px] text-white/55 truncate">{r.c}</p>
                          </div>
                        </div>
                        <p className="text-sm font-black text-[#FFB000] whitespace-nowrap">{r.valor}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Badge flutuante Pix recebido */}
              <div className="absolute -left-6 top-32 bg-white text-dark rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.45)] px-4 py-3 flex items-center gap-3 w-[240px] animate-[bounce_3s_ease-in-out_infinite]">
                <div className="w-11 h-11 rounded-xl bg-green-500/12 text-green-600 flex items-center justify-center shrink-0">
                  <CreditCard size={22} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-wider text-text-secondary">
                    Pix Recebido!
                  </p>
                  <p className="text-base font-black text-dark truncate">R$ 160,00 • 18:00</p>
                </div>
              </div>
              {/* Badge flutuante nova reserva */}
              <div className="absolute -right-4 top-8 bg-white text-dark rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.45)] px-4 py-3 flex items-center gap-3 w-[230px]">
                <div className="w-11 h-11 rounded-xl bg-[#FF8A00]/12 text-[#FF8A00] flex items-center justify-center shrink-0">
                  <CheckCircle2 size={22} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-wider text-text-secondary">
                    Nova Reserva
                  </p>
                  <p className="text-sm font-black text-dark truncate">Fernada • 19h Beach</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4 RECURSOS PRINCIPAIS (sobrepostos hero) */}
      <section id="recursos" className="relative -mt-20 z-20 scroll-mt-[120px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 rounded-3xl overflow-hidden border border-white/10 bg-[#0B1220] shadow-[0_24px_64px_rgba(0,0,0,0.4)]">
            {FEATURES_TOPO.map((b, i) => (
              <div
                key={i}
                className="flex items-start gap-4 px-6 py-7 lg:py-8 border-b lg:border-b-0 lg:border-r border-white/5 last:border-r-0 last:border-b-0"
              >
                <div
                  className={cn(
                    "shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br",
                    b.iconBg,
                    b.iconColor,
                    "flex items-center justify-center shadow-lg shadow-orange-500/25"
                  )}
                >
                  {b.icon}
                </div>
                <div>
                  <p className="text-white font-black text-base">{b.title}</p>
                  <p className="text-white/60 text-sm mt-1 leading-relaxed">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FUNCIONALIDADES */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 mb-3">
              <Activity size={16} className="text-[#FF8A00]" />
              <p className="text-xs font-black uppercase tracking-widest text-[#FF8A00]">
                Tudo o que você precisa
              </p>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-dark leading-tight">
              Funcionalidades que <span className="text-[#FF8A00]">economizam seu tempo</span> e fazem você ganhar mais.
            </h2>
            <p className="text-text-secondary mt-4 text-lg max-w-2xl mx-auto">
              Um sistema simples, completo e criado junto com donos de arena. Nenhuma funcionalidade inútil — tudo o que você usa no dia a dia.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FUNCIONALIDADES.map((f) => (
              <div
                key={f.title}
                className="group rounded-3xl p-7 bg-white border border-border hover:border-[#FF8A00]/40 hover:shadow-[0_20px_50px_rgba(255,138,0,0.12)] hover:-translate-y-1 transition-all"
              >
                <div
                  className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform",
                    f.iconBg,
                    f.iconColor
                  )}
                >
                  {f.icon}
                </div>
                <h3 className="text-xl font-black text-dark mb-2">{f.title}</h3>
                <p className="text-text-secondary leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="relative py-20 overflow-hidden scroll-mt-[100px]">
        <div className="absolute inset-0 bg-[#0B1220]" />
        <div className="absolute -left-[15%] -top-40 w-[500px] h-[500px] rounded-full bg-[#FF7A00]/22 blur-[120px]" />
        <div className="absolute right-[-8%] -bottom-40 w-[520px] h-[520px] rounded-full bg-[#FF4D2E]/12 blur-[120px]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 mb-3">
              <BadgeInfo size={16} className="text-[#FF8A00]" />
              <p className="text-xs font-black uppercase tracking-widest text-[#FF8A00]">
                Como começar a usar
              </p>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight max-w-3xl mx-auto">
              Ligar seu complexo no Agendei é <span className="text-[#FFB000]">mais rápido que abrir a agenda de papel.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                n: 1,
                icon: <Users size={26} />,
                title: "Cadastre-se grátis",
                desc: "Crie sua conta em 60 segundos. Nenhuma informação burocrática.",
              },
              {
                n: 2,
                icon: <Settings size={26} />,
                title: "Configure suas quadras",
                desc: "Adicione suas quadras, modalidades, preços e horários de funcionamento. Ajuda personalizada se precisar.",
              },
              {
                n: 3,
                icon: <TrendingUp size={26} />,
                title: "Sair vendendo",
                desc: "Pronto! Seu site de reservas está no ar. Envie o link aos clientes e receba Pix na hora.",
              },
            ].map((p, i) => (
              <div
                key={i}
                className="relative rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur p-8 hover:bg-white/[0.07] hover:border-white/15 transition-all"
              >
                <div className="absolute -top-6 left-8 flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-[#FFB000] to-[#FF7A00] text-[#0B1220] font-black text-xl shadow-xl shadow-orange-500/30">
                  {p.n}
                </div>
                <div className="mt-3">
                  <div className="w-12 h-12 rounded-xl bg-[#FF8A00]/15 text-[#FFB000] flex items-center justify-center mb-4">
                    {p.icon}
                  </div>
                  <p className="text-2xl font-black text-white mb-2">{p.title}</p>
                  <p className="text-white/65 text-base leading-relaxed">{p.desc}</p>
                </div>
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-5 -translate-y-1/2 text-[#FF8A00]/50">
                    <ChevronRight size={44} />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-14 text-center">
            <Link
              href="/registrar"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-white bg-gradient-to-r from-[#FF8A00] to-[#FF6A00] hover:shadow-[0_12px_36px_rgba(255,138,0,0.55)] hover:-translate-y-0.5 transition-all"
            >
              Começar agora gratuitamente <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* PLANOS E PREÇOS */}
      <section id="planos" className="py-20 bg-gradient-to-b from-white to-[#FFFBF5] scroll-mt-[100px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 mb-3">
              <DollarSign size={16} className="text-[#FF8A00]" />
              <p className="text-xs font-black uppercase tracking-widest text-[#FF8A00]">
                Planos e preços
              </p>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-dark leading-tight">
              Escolha o plano ideal <span className="text-[#FF8A00]">para o tamanho do seu negócio.</span>
            </h2>
            <p className="text-text-secondary mt-4 text-lg">
              Sem taxa de adesão. Sem multa. Cancele quando quiser.
            </p>

            {/* Switch mensal/anual */}
            <div className="mt-8 inline-flex items-center gap-4 p-1.5 rounded-2xl bg-[#0B1220]/5 border border-border">
              <button
                onClick={() => setPeriodoAnual(false)}
                className={cn(
                  "px-5 py-2.5 rounded-xl text-sm font-black transition-all",
                  !periodoAnual
                    ? "bg-white text-dark shadow-md"
                    : "text-text-secondary hover:text-dark"
                )}
              >
                Mensal
              </button>
              <button
                onClick={() => setPeriodoAnual(true)}
                className={cn(
                  "px-5 py-2.5 rounded-xl text-sm font-black transition-all inline-flex items-center gap-2",
                  periodoAnual
                    ? "bg-gradient-to-r from-[#FF8A00] to-[#FF6A00] text-white shadow-lg shadow-orange-500/25"
                    : "text-text-secondary hover:text-dark"
                )}
              >
                Anual
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                  2 meses grátis
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {PLANOS.map((pl) => (
              <div
                key={pl.nome}
                className={cn(
                  "relative rounded-3xl p-7 flex flex-col border transition-all",
                  pl.popular
                    ? "bg-gradient-to-b from-[#0B1220] to-[#131a2e] text-white border-[#FF8A00]/30 shadow-[0_30px_80px_rgba(255,138,0,0.15)] scale-[1.02] lg:scale-[1.03]"
                    : "bg-white text-dark border-border hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] hover:-translate-y-1"
                )}
              >
                {pl.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#FFB000] to-[#FF7A00] text-[#0B1220] text-[11px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/30">
                    Mais Escolhido
                  </div>
                )}
                <div className="mb-2">
                  <span
                    className={cn(
                      "text-[10px] font-black uppercase tracking-[0.18em]",
                      pl.popular ? "text-[#FFB000]" : "text-[#FF8A00]"
                    )}
                  >
                    {pl.tag}
                  </span>
                </div>
                <h3
                  className={cn(
                    "text-2xl font-black",
                    pl.popular ? "text-white" : "text-dark"
                  )}
                >
                  {pl.nome}
                </h3>
                <div className="mt-5 mb-6">
                  <p className="flex items-end gap-1">
                    <span
                      className={cn(
                        "text-[11px] font-bold mb-2",
                        pl.popular ? "text-white/60" : "text-text-secondary"
                      )}
                    >
                      R$
                    </span>
                    <span
                      className={cn(
                        "font-black leading-none",
                        pl.popular ? "text-white text-5xl" : "text-dark text-5xl"
                      )}
                    >
                      {periodoAnual ? pl.precoAnual : pl.precoMensal}
                    </span>
                    <span
                      className={cn(
                        "text-sm font-bold mb-1.5 ml-0.5",
                        pl.popular ? "text-white/60" : "text-text-secondary"
                      )}
                    >
                      /mês
                    </span>
                  </p>
                  {periodoAnual && (
                    <p
                      className={cn(
                        "text-xs font-bold mt-1.5",
                        pl.popular ? "text-green-300" : "text-green-600"
                      )}
                    >
                      Economize R${" "}
                      {(pl.precoMensal - pl.precoAnual) * 12},00 no ano!
                    </p>
                  )}
                </div>

                <div className={cn("h-px mb-6", pl.popular ? "bg-white/10" : "bg-border")} />

                <ul className="space-y-3 flex-1">
                  {pl.beneficios.map((ben) => (
                    <li key={ben} className="flex items-start gap-2.5">
                      <CheckCircle2
                        size={18}
                        className={cn(
                          "shrink-0 mt-0.5",
                          pl.popular ? "text-[#FFB000]" : "text-[#FF8A00]"
                        )}
                      />
                      <span
                        className={cn(
                          "text-sm leading-relaxed",
                          pl.popular ? "text-white/85" : "text-text-secondary"
                        )}
                      >
                        {ben}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/registrar"
                  className={cn(
                    "mt-8 w-full py-3.5 rounded-xl font-black transition-all inline-flex items-center justify-center gap-2",
                    pl.popular
                      ? "bg-gradient-to-r from-[#FFB000] to-[#FF6A00] text-white hover:shadow-[0_10px_30px_rgba(255,138,0,0.55)] hover:-translate-y-0.5"
                      : "bg-[#0B1220] text-white hover:bg-[#16213e] hover:-translate-y-0.5"
                  )}
                >
                  {pl.ctaLabel} <ArrowRight size={16} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEPOIMENTOS */}
      <section id="depoimentos" className="py-20 scroll-mt-[100px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12 flex-wrap gap-5">
            <div>
              <div className="inline-flex items-center gap-2 mb-3">
                <Award size={16} className="text-[#FF8A00]" />
                <p className="text-xs font-black uppercase tracking-widest text-[#FF8A00]">
                  Quem já usa recomenda
                </p>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-dark leading-tight max-w-3xl">
                +250 arenas <span className="text-[#FF8A00]">já transformaram</span> o jeito de gerenciar.
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="flex items-center justify-end gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={20} fill="#FFB000" stroke="#FFB000" />
                  ))}
                </div>
                <p className="text-text-secondary text-sm mt-1 font-bold">
                  4.9 / 5 · Média dos nossos clientes
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {DEPOIMENTOS.map((d) => (
              <figure
                key={d.nome}
                className="rounded-3xl bg-white p-7 border border-border hover:border-[#FF8A00]/30 hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] transition-all flex flex-col"
              >
                <Heart size={24} className="text-[#FF8A00]/40 mb-3" />
                <blockquote className="text-text-secondary leading-relaxed text-[15px] flex-1">
                  &ldquo;{d.texto}&rdquo;
                </blockquote>
                <div className="mt-6 flex items-center gap-3 pt-5 border-t border-border">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FFB000] to-[#FF7A00] text-white font-black flex items-center justify-center">
                    {d.initials}
                  </div>
                  <figcaption className="min-w-0 flex-1">
                    <p className="font-black text-dark text-base truncate">{d.nome}</p>
                    <p className="text-xs text-text-secondary truncate">
                      {d.cargo} · {d.cidade}
                    </p>
                  </figcaption>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: d.nota }).map((_, i) => (
                      <Star key={i} size={15} fill="#FFB000" stroke="#FFB000" />
                    ))}
                  </div>
                </div>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* SOBRE + STATS */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-[28px] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-[#FFB000] via-[#FF7A00] to-[#FF4D2E]" />
            <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_20%_20%,white_0%,transparent_40%)]" />
            <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-10 p-8 sm:p-12 lg:p-14 items-center">
              <div>
                <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-white/20 backdrop-blur text-white">
                  <CheckCircle2 size={16} />
                  <p className="text-xs font-black uppercase tracking-wider">
                    Feito no Brasil para o mercado brasileiro
                  </p>
                </div>
                <h2 className="text-4xl lg:text-5xl font-black text-white leading-[1.05] tracking-tight">
                  Você cuida do esporte. Nós cuidamos do <span className="italic">[seu resultado].</span>
                </h2>
                <p className="mt-4 text-white/90 text-lg max-w-lg leading-relaxed">
                  O Agendei Minha Quadra é um sistema pensado em cada detalhe por quem já esteve do seu lado: atendentes, gerentes e donos de arena. Fácil de usar, rápido de configurar, e com suporte de gente real de segunda a domingo.
                </p>
                <div className="mt-8 grid grid-cols-3 gap-3 max-w-md">
                  {[
                    { k: "+250", label: "Arenas ativas" },
                    { k: "+500k", label: "Reservas" },
                    { k: "4.9★", label: "Satisfação" },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="rounded-2xl bg-white/10 backdrop-blur-md p-4 text-center"
                    >
                      <p className="text-2xl lg:text-3xl font-black text-white">{s.k}</p>
                      <p className="text-white/80 text-xs font-bold mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { ico: <Building2 size={24} />, titulo: "Qualquer tamanho", desc: "De 1 quadra a rede com múltiplas unidades." },
                  { ico: <Smartphone size={24} />, titulo: "Mobile First", desc: "Gerencia tudo do celular, sem instalar app." },
                  { ico: <ShieldCheck size={24} />, titulo: "Segurança LGPD", desc: "Backups diários, dados criptografados." },
                  { ico: <MessageCircle size={24} />, titulo: "Suporte Humano", desc: "Atendimento em português, de verdade." },
                ].map((k) => (
                  <div
                    key={k.titulo}
                    className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 p-5 hover:bg-white/15 transition-all"
                  >
                    <div className="w-11 h-11 rounded-xl bg-white/15 text-white flex items-center justify-center mb-3">
                      {k.ico}
                    </div>
                    <p className="text-white font-black text-base">{k.titulo}</p>
                    <p className="text-white/75 text-sm mt-1 leading-relaxed">{k.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA TESTE GRÁTIS + FORMULÁRIO */}
      <section id="demo" className="py-20 scroll-mt-[100px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-[#FF8A00]" />
                <p className="text-xs font-black uppercase tracking-widest text-[#FF8A00]">
                  Sem cartão de crédito
                </p>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-dark leading-tight">
                Comece seu <span className="text-[#FF8A00]">Teste Grátis de 7 dias</span> agora mesmo.
              </h2>
              <p className="text-text-secondary mt-4 text-lg max-w-lg">
                Crie sua conta em menos de 1 minuto, configure suas quadras e comece a <strong>vender horários online automaticamente</strong>. Sem taxa de adesão, sem compromisso.
              </p>

              <ul className="mt-8 space-y-3.5">
                {[
                  "7 dias grátis para testar TUDO do sistema",
                  "Não precisa cadastrar cartão de crédito",
                  "Site de reservas online 24h já no ar",
                  "Suporte humano em português de segunda a domingo",
                  "Cancele quando quiser, sem multa",
                ].map((x) => (
                  <li key={x} className="flex items-start gap-3">
                    <div className="shrink-0 w-6 h-6 rounded-full bg-[#FF8A00]/12 text-[#FF8A00] flex items-center justify-center mt-0.5">
                      <CheckCircle2 size={16} />
                    </div>
                    <span className="text-base text-dark font-semibold">{x}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-10 flex flex-wrap items-center gap-5 text-text-secondary text-sm font-semibold">
                <span className="inline-flex items-center gap-2">
                  <Phone size={16} className="text-[#FF8A00]" /> (11) 90000-0000
                </span>
                <span className="inline-flex items-center gap-2">
                  <Mail size={16} className="text-[#FF8A00]" /> contato@agendeiminhaquadra.com.br
                </span>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -top-8 -right-6 w-56 h-56 rounded-full bg-[#FF8A00]/15 blur-[100px]" />
              <div className="relative rounded-3xl bg-white border border-border shadow-[0_30px_80px_rgba(0,0,0,0.09)] p-7 sm:p-9">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-black text-dark">Criar minha conta grátis</h3>
                    <p className="text-text-secondary mt-1 text-sm">Preencha e comece a usar agora. 7 dias grátis.</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-[#FF8A00]/12 text-[#FF8A00] flex items-center justify-center shrink-0">
                    <Rocket size={24} />
                  </div>
                </div>

                {formEnviado ? (
                  <div className="rounded-2xl bg-green-50 border border-green-100 p-7 text-center">
                    <div className="mx-auto w-14 h-14 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-4">
                      <CheckCircle2 size={28} />
                    </div>
                    <h4 className="text-xl font-black text-dark mb-1">Tudo certo! 🎉</h4>
                    <p className="text-text-secondary">
                      Redirecionando você para a página de cadastro para finalizar sua conta.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={onSubmitDemo} className="space-y-4">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-text-secondary mb-1.5">
                        Seu nome
                      </label>
                      <input
                        required
                        value={formNome}
                        onChange={(e) => setFormNome(e.target.value)}
                        placeholder="Ex: João da Silva"
                        className="w-full px-4 py-3.5 rounded-xl bg-white border border-border focus:border-[#FF8A00] focus:ring-4 focus:ring-[#FF8A00]/15 focus:outline-none transition-all text-dark placeholder:text-text-secondary/50"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-text-secondary mb-1.5">
                          Telefone / WhatsApp
                        </label>
                        <input
                          required
                          type="tel"
                          value={formTelefone}
                          onChange={(e) => setFormTelefone(e.target.value)}
                          placeholder="(11) 99999-9999"
                          className="w-full px-4 py-3.5 rounded-xl bg-white border border-border focus:border-[#FF8A00] focus:ring-4 focus:ring-[#FF8A00]/15 focus:outline-none transition-all text-dark placeholder:text-text-secondary/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-text-secondary mb-1.5">
                          Cidade
                        </label>
                        <input
                          required
                          value={formCidade}
                          onChange={(e) => setFormCidade(e.target.value)}
                          placeholder="Ex: São Paulo - SP"
                          className="w-full px-4 py-3.5 rounded-xl bg-white border border-border focus:border-[#FF8A00] focus:ring-4 focus:ring-[#FF8A00]/15 focus:outline-none transition-all text-dark placeholder:text-text-secondary/50"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-text-secondary mb-1.5">
                        Nome do seu complexo / arena
                      </label>
                      <input
                        required
                        value={formComplexo}
                        onChange={(e) => setFormComplexo(e.target.value)}
                        placeholder="Ex: Complexo Sports Arena"
                        className="w-full px-4 py-3.5 rounded-xl bg-white border border-border focus:border-[#FF8A00] focus:ring-4 focus:ring-[#FF8A00]/15 focus:outline-none transition-all text-dark placeholder:text-text-secondary/50"
                      />
                    </div>
                    <div className="rounded-xl bg-[#FF8A00]/6 border border-[#FF8A00]/15 p-4 flex items-start gap-3">
                      <Ticket size={18} className="text-[#FF8A00] shrink-0 mt-0.5" />
                      <p className="text-[13px] text-dark/80 leading-relaxed">
                        <strong className="text-dark">Bônus de boas-vindas:</strong> Quem se cadastra hoje ganha <strong>15% de desconto</strong> no primeiro ano do plano escolhido + onboarding personalizado gratuito.
                      </p>
                    </div>
                    <Link
                      href="/registrar"
                      className="w-full py-4 rounded-xl font-black text-white bg-gradient-to-r from-[#FF8A00] to-[#FF6A00] hover:shadow-[0_12px_36px_rgba(255,138,0,0.55)] hover:-translate-y-0.5 active:translate-y-0 transition-all inline-flex items-center justify-center gap-2"
                    >
                      Ir para Cadastro Grátis <ArrowRight size={18} />
                    </Link>
                    <p className="text-center text-[12px] font-semibold text-text-secondary">
                      Ao criar conta, você concorda com a nossa Política de Privacidade. 100% sem spam.
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* RODAPÉ */}
      <footer className="bg-[#070B14] border-t border-white/5 text-white pt-14 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-10 pb-10 border-b border-white/10">
            <div className="lg:col-span-2 col-span-2">
              <Link href="/" className="inline-block">
                <img
                  src="/logo.png"
                  alt="Agendei Minha Quadra"
                  className="h-[88px] w-auto max-w-[300px] object-contain drop-shadow-[0_4px_14px_rgba(255,122,0,0.18)] select-none"
                  draggable={false}
                />
              </Link>
              <p className="text-white/60 mt-5 text-sm leading-relaxed max-w-md">
                O sistema de agendamento completo para arenas, quadras e complexos esportivos.
                Mais ocupação, menos trabalho administrativo, mais faturamento.
              </p>
              <div className="mt-6 flex items-center gap-2">
                {[Instagram, Facebook].map((Ico, i) => (
                  <a
                    key={i}
                    href="#"
                    className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-[#FF8A00] hover:border-[#FF8A00] transition-all flex items-center justify-center text-white/70 hover:text-white"
                    aria-label="Rede social"
                  >
                    <Ico size={18} />
                  </a>
                ))}
                <a
                  href="#"
                  className="w-10 h-10 rounded-xl bg-green-600/90 hover:bg-green-500 transition-all flex items-center justify-center text-white"
                  aria-label="WhatsApp"
                >
                  <Phone size={17} />
                </a>
              </div>
              <div className="mt-6 space-y-2 text-sm text-white/60">
                <p className="flex items-center gap-2.5">
                  <Mail size={15} className="text-[#FF8A00]" />
                  contato@agendeiminhaquadra.com.br
                </p>
                <p className="flex items-center gap-2.5">
                  <Phone size={15} className="text-[#FF8A00]" /> (11) 90000-0000
                </p>
              </div>
            </div>

            <div>
              <p className="text-white font-black text-sm uppercase tracking-widest mb-4">Produto</p>
              <ul className="space-y-2.5 text-sm text-white/65">
                {["Recursos", "Planos e Preços", "Como Funciona", "Integrações", "Atualizações"].map((l) => (
                  <li key={l}>
                    <Link href="#" className="hover:text-[#FFB000] transition-colors">
                      {l}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-white font-black text-sm uppercase tracking-widest mb-4">Empresa</p>
              <ul className="space-y-2.5 text-sm text-white/65">
                {["Sobre o Agendei", "Trabalhe Conosco", "Imprensa / Imprensa", "Blog"].map((l) => (
                  <li key={l}>
                    <Link href="#" className="hover:text-[#FFB000] transition-colors">
                      {l}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-white font-black text-sm uppercase tracking-widest mb-4">Legal e Ajuda</p>
              <ul className="space-y-2.5 text-sm text-white/65">
                {["Central de Ajuda", "Termos de Uso", "Política de Privacidade", "LGPD", "Contato"].map((l) => (
                  <li key={l}>
                    <Link href="#" className="hover:text-[#FFB000] transition-colors">
                      {l}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-6 flex items-center justify-between flex-wrap gap-4">
            <p className="text-xs text-white/45 font-semibold">
              © {new Date().getFullYear()} Agendei Minha Quadra. Todos os direitos reservados.
            </p>
            <p className="text-xs text-white/45 font-semibold flex items-center gap-1.5">
              <Heart size={14} className="text-[#FF8A00]" />
              Feito com muito esporte (e café) no Brasil.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
