"use client";

import React, { useState, useMemo } from "react";
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight,
  MapPin,
  Users,
  Activity,
  AlignLeft,
  ArrowRight,
  Building2,
  CreditCard,
  Home
} from "lucide-react";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";

type Modality = {
  id: string;
  nome: string;
  precoPorHora: number;
  icone: React.ReactNode;
  cor: string;
  bgCor: string;
  borderCor: string;
};

type Court = {
  id: string;
  nome: string;
  numero: number;
  modalities: string[];
};

type SlotStatus = "available" | "reserved";
type TimeSlot = {
  horario: string;
  status: SlotStatus;
};

type Step = "modalidade" | "data" | "quadra" | "horario" | "dados" | "confirmacao";

const MODALIDADES: Modality[] = [
  {
    id: "society",
    nome: "Futebol Society",
    precoPorHora: 120,
    icone: <Users size={28} />,
    cor: "text-sport-futebol",
    bgCor: "bg-sport-futebol/10",
    borderCor: "border-sport-futebol/20",
  },
  {
    id: "volei",
    nome: "Vôlei",
    precoPorHora: 80,
    icone: <Activity size={28} />,
    cor: "text-sport-volei",
    bgCor: "bg-sport-volei/10",
    borderCor: "border-sport-volei/20",
  },
  {
    id: "futevolei",
    nome: "Futevôlei",
    precoPorHora: 70,
    icone: <AlignLeft size={28} />,
    cor: "text-sport-futevolei",
    bgCor: "bg-sport-futevolei/10",
    borderCor: "border-sport-futevolei/20",
  },
  {
    id: "beach_tennis",
    nome: "Beach Tennis",
    precoPorHora: 90,
    icone: <Home size={28} />,
    cor: "text-sport-beachTennis",
    bgCor: "bg-sport-beachTennis/10",
    borderCor: "border-sport-beachTennis/20",
  },
];

const QUADRAS: Court[] = [
  { id: "q1", nome: "Quadra 01", numero: 1, modalities: ["society", "volei"] },
  { id: "q2", nome: "Quadra 02", numero: 2, modalities: ["society", "volei", "futevolei"] },
  { id: "q3", nome: "Quadra 03", numero: 3, modalities: ["futevolei", "beach_tennis"] },
  { id: "q4", nome: "Quadra 04", numero: 4, modalities: ["beach_tennis", "volei"] },
];

const TODOS_HORARIOS = Array.from({ length: 14 }, (_, i) => {
  const hora = i + 8;
  return `${hora.toString().padStart(2, "0")}:00`;
});

const COMPLEXOS: Record<string, { nome: string; slug: string; endereco: string; telefone: string }> = {
  "complexo-sports": {
    nome: "Complexo Sports Arena",
    slug: "complexo-sports",
    endereco: "Rua dos Esportes, 123 - Centro",
    telefone: "(11) 99999-9999",
  },
  "arena-central": {
    nome: "Arena Central",
    slug: "arena-central",
    endereco: "Av. Principal, 456 - Jardim Paulista",
    telefone: "(11) 98888-8888",
  },
};

function gerarHorariosMock(data: string, quadraId: string): TimeSlot[] {
  const seed = data.split("-").reduce((a, b) => a + parseInt(b), 0) + parseInt(quadraId.replace("q", ""));
  return TODOS_HORARIOS.map((horario, idx) => {
    const pseudoRandom = ((seed * (idx + 3)) % 11);
    return {
      horario,
      status: pseudoRandom < 4 ? "reserved" : "available",
    };
  });
}

function proximosDias(qtd: number): Date[] {
  const dias: Date[] = [];
  const hoje = new Date();
  for (let i = 0; i < qtd; i++) {
    const d = new Date(hoje);
    d.setDate(hoje.getDate() + i);
    dias.push(d);
  }
  return dias;
}

function formatarDataCompleta(d: Date): string {
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

function formatarDataSimples(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatarDataInput(d: Date): string {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
}

function diaSemanaCurto(d: Date): string {
  return d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "").toUpperCase();
}

function moedaBR(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function ArenaPublicaPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const complexo = COMPLEXOS[slug] || {
    nome: "Complexo Esportivo",
    slug: slug || "complexo",
    endereco: "Rua das Quadras, 100",
    telefone: "(00) 90000-0000",
  };

  const dias = useMemo(() => proximosDias(14), []);

  const [step, setStep] = useState<Step>("modalidade");
  const [modalityId, setModalityId] = useState<string | null>(null);
  const [dataSelecionada, setDataSelecionada] = useState<Date | null>(null);
  const [quadraId, setQuadraId] = useState<string | null>(null);
  const [horarioSelecionado, setHorarioSelecionado] = useState<string | null>(null);
  const [diasPage, setDiasPage] = useState(0);

  const [formData, setFormData] = useState({
    nome: "",
    telefone: "",
    email: "",
  });

  const modality = MODALIDADES.find(m => m.id === modalityId) || null;
  const quadra = QUADRAS.find(q => q.id === quadraId) || null;
  const horarioObj = horarioSelecionado
    ? TODOS_HORARIOS.findIndex(h => h === horarioSelecionado)
    : -1;
  const horarioFim = horarioObj >= 0 ? TODOS_HORARIOS[horarioObj + 1] || "22:00" : null;

  const quadrasDisponiveis = useMemo(() => {
    if (!modalityId) return [];
    return QUADRAS.filter(q => q.modalities.includes(modalityId));
  }, [modalityId]);

  const horarios = useMemo(() => {
    if (!dataSelecionada || !quadraId) return [];
    return gerarHorariosMock(formatarDataInput(dataSelecionada), quadraId);
  }, [dataSelecionada, quadraId]);

  const valorTotal = modality?.precoPorHora || 0;

  const diasVisiveis = useMemo(() => {
    const start = diasPage * 7;
    return dias.slice(start, start + 7);
  }, [dias, diasPage]);

  const podeAvancar = {
    modalidade: modalityId !== null,
    data: dataSelecionada !== null,
    quadra: quadraId !== null,
    horario: horarioSelecionado !== null,
    dados: formData.nome.trim().length >= 3 && formData.telefone.trim().length >= 10,
  };

  const handleAvancar = (nextStep: Step, condition?: boolean) => {
    if (condition !== undefined && !condition) return;
    setStep(nextStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleVoltar = (prevStep: Step) => {
    setStep(prevStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleReservar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!podeAvancar.dados) return;
    setStep("confirmacao");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNovaReserva = () => {
    setStep("modalidade");
    setModalityId(null);
    setDataSelecionada(null);
    setQuadraId(null);
    setHorarioSelecionado(null);
    setFormData({ nome: "", telefone: "", email: "" });
    setDiasPage(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const stepsOrdem: Step[] = ["modalidade", "data", "quadra", "horario", "dados", "confirmacao"];
  const stepIndex = stepsOrdem.indexOf(step);

  return (
    <div className="min-h-screen bg-background">
      {/* HEADER PÚBLICO */}
      <header className="bg-white border-b border-border sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-soft">
                <Building2 size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-black text-dark tracking-tight leading-none">
                  {complexo.nome}
                </h1>
                <p className="text-[11px] md:text-xs font-medium text-text-secondary mt-0.5 flex items-center gap-1.5">
                  <MapPin size={12} />
                  {complexo.endereco}
                </p>
              </div>
            </div>

            <button className="btn-gradient px-4 sm:px-6 py-2.5 rounded-button shadow-soft flex items-center gap-2 text-sm md:text-base">
              <Calendar size={17} />
              <span className="hidden sm:inline">Minhas reservas</span>
              <span className="sm:hidden">Reservas</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        {step !== "confirmacao" && (
          <ProgressBar stepIndex={stepIndex} />
        )}

        {/* STEP 1: MODALIDADES + HERO */}
        {step === "modalidade" && (
          <section className="space-y-10 mt-8">
            {/* HERO */}
            <div className="text-center space-y-5 mb-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-50 border border-orange-100 text-primary-orange font-bold text-xs md:text-sm uppercase tracking-wider">
                <Calendar size={15} /> Agendamento Online
              </div>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-dark tracking-tight leading-tight">
                Reserve sua quadra <br className="hidden sm:block" />
                de forma <span className="bg-gradient-primary bg-clip-text text-transparent">rápida e fácil</span>
              </h2>
              <p className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto font-medium leading-relaxed">
                Escolha a modalidade, data e horário. Tudo em poucos cliques, sem burocracia.
              </p>
            </div>

            {/* SEÇÃO MODALIDADES */}
            <div className="space-y-5">
              <SectionTitle icon={<Users size={22} />}>Escolha a modalidade</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
                {MODALIDADES.map(mod => {
                  const selecionada = modalityId === mod.id;
                  return (
                    <button
                      key={mod.id}
                      onClick={() => setModalityId(mod.id)}
                      className={cn(
                        "text-left p-6 rounded-3xl border-2 transition-all duration-300 group",
                        selecionada
                          ? cn("bg-white", mod.borderCor, "shadow-lg scale-[1.02]")
                          : "bg-white border-border hover:border-gray-200 hover:shadow-md card-modern"
                      )}
                    >
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110",
                        mod.bgCor, mod.cor
                      )}>
                        {mod.icone}
                      </div>
                      <h3 className="text-lg font-black text-dark mb-1">{mod.nome}</h3>
                      <div className="flex items-baseline gap-1.5 mt-3">
                        <span className={cn("text-2xl font-black tracking-tight", mod.cor)}>
                          {moedaBR(mod.precoPorHora)}
                        </span>
                        <span className="text-sm font-medium text-text-secondary">/hora</span>
                      </div>
                      {selecionada && (
                        <div className="mt-4 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-status-confirmed">
                          <CheckCircle2 size={14} /> Selecionado
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-center pt-4">
              <ButtonAvancar
                onClick={() => handleAvancar("data", podeAvancar.modalidade)}
                disabled={!podeAvancar.modalidade}
              />
            </div>
          </section>
        )}

        {/* STEP 2: DATA */}
        {step === "data" && modality && (
          <section className="space-y-10 mt-8">
            <SectionHeader 
              titulo="Escolha a data" 
              subtitulo={formatarDataCompleta(dataSelecionada || dias[0])}
              onBack={() => handleVoltar("modalidade")}
              icon={<Calendar size={22} />}
            />

            <div className="bg-white rounded-3xl border border-border shadow-soft p-5 md:p-8 space-y-6">
              {/* Navegador de semanas */}
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => setDiasPage(Math.max(0, diasPage - 1))}
                  disabled={diasPage === 0}
                  className="w-10 h-10 rounded-xl flex items-center justify-center border border-border bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={20} className="text-dark" />
                </button>
                <div className="text-center">
                  <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-0.5">
                    Semana {diasPage + 1} de {Math.ceil(dias.length / 7)}
                  </p>
                  <p className="text-sm font-bold text-dark">
                    {formatarDataSimples(diasVisiveis[0])} — {formatarDataSimples(diasVisiveis[diasVisiveis.length - 1])}
                  </p>
                </div>
                <button
                  onClick={() => setDiasPage(Math.min(Math.ceil(dias.length / 7) - 1, diasPage + 1))}
                  disabled={diasPage >= Math.ceil(dias.length / 7) - 1}
                  className="w-10 h-10 rounded-xl flex items-center justify-center border border-border bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={20} className="text-dark" />
                </button>
              </div>

              {/* Dias */}
              <div className="grid grid-cols-7 gap-2 md:gap-3">
                {diasVisiveis.map(d => {
                  const ehHoje = d.toDateString() === new Date().toDateString();
                  const selecionada = dataSelecionada?.toDateString() === d.toDateString();
                  const diaNum = d.getDate();
                  return (
                    <button
                      key={formatarDataInput(d)}
                      onClick={() => setDataSelecionada(d)}
                      className={cn(
                        "aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-1 py-2 transition-all duration-200",
                        selecionada
                          ? "bg-gradient-primary text-white border-transparent shadow-lg scale-[1.04]"
                          : ehHoje
                            ? "bg-orange-50 border-primary-orange/40 hover:border-primary-orange"
                            : "bg-white border-border hover:border-gray-300 hover:bg-gray-50"
                      )}
                    >
                      <span className={cn(
                        "text-[10px] md:text-xs font-black uppercase tracking-wider",
                        selecionada ? "text-white/90" : ehHoje ? "text-primary-orange" : "text-text-secondary"
                      )}>
                        {diaSemanaCurto(d)}
                      </span>
                      <span className={cn(
                        "text-xl md:text-2xl font-black leading-none",
                        selecionada ? "text-white" : ehHoje ? "text-primary-orange" : "text-dark"
                      )}>
                        {diaNum}
                      </span>
                      {selecionada && (
                        <CheckCircle2 size={14} className="text-white mt-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legenda */}
              <div className="flex items-center justify-center gap-4 md:gap-6 pt-2 flex-wrap">
                <div className="flex items-center gap-2 text-xs font-medium text-text-secondary">
                  <div className="w-4 h-4 rounded-md bg-orange-50 border-2 border-primary-orange/40" />
                  Hoje
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-text-secondary">
                  <div className="w-4 h-4 rounded-md bg-gradient-primary" />
                  Selecionado
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-text-secondary">
                  <div className="w-4 h-4 rounded-md bg-white border-2 border-border" />
                  Disponível
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <ButtonVoltar onClick={() => handleVoltar("modalidade")} />
              <ButtonAvancar
                onClick={() => handleAvancar("quadra", podeAvancar.data)}
                disabled={!podeAvancar.data}
              />
            </div>
          </section>
        )}

        {/* STEP 3: QUADRA */}
        {step === "quadra" && modality && dataSelecionada && (
          <section className="space-y-10 mt-8">
            <SectionHeader 
              titulo="Escolha a quadra" 
              subtitulo={`${modality.nome} • ${formatarDataCompleta(dataSelecionada)}`}
              onBack={() => handleVoltar("data")}
              icon={<MapPin size={22} />}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              {quadrasDisponiveis.map(q => {
                const selecionada = quadraId === q.id;
                return (
                  <button
                    key={q.id}
                    onClick={() => setQuadraId(q.id)}
                    className={cn(
                      "text-left p-6 rounded-3xl border-2 transition-all duration-300 group flex items-center gap-5",
                      selecionada
                        ? cn("bg-white shadow-lg scale-[1.01]", modality.borderCor)
                        : "bg-white border-border hover:border-gray-200 hover:shadow-md card-modern"
                    )}
                  >
                    <div className={cn(
                      "w-16 h-20 rounded-2xl flex items-center justify-center flex-shrink-0",
                      selecionada ? modality.bgCor : "bg-background-light",
                      selecionada ? modality.cor : "text-text-secondary"
                    )}>
                      <span className="text-2xl md:text-3xl font-black tracking-tight">
                        {String(q.numero).padStart(2, "0")}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-black text-dark mb-1">{q.nome}</h3>
                      <p className="text-sm text-text-secondary font-medium mb-3">
                        Ideal para: {q.modalities.map(mid => MODALIDADES.find(m => m.id === mid)?.nome).join(", ")}
                      </p>
                      <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black", modality.bgCor, modality.cor)}>
                        <CheckCircle2 size={13} /> Disponível hoje
                      </div>
                    </div>
                    {selecionada && (
                      <CheckCircle2 size={24} className="text-status-confirmed flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between items-center">
              <ButtonVoltar onClick={() => handleVoltar("data")} />
              <ButtonAvancar
                onClick={() => handleAvancar("horario", podeAvancar.quadra)}
                disabled={!podeAvancar.quadra}
              />
            </div>
          </section>
        )}

        {/* STEP 4: HORÁRIOS */}
        {step === "horario" && modality && dataSelecionada && quadra && (
          <section className="space-y-10 mt-8">
            <SectionHeader 
              titulo="Horários" 
              subtitulo={`${quadra.nome} • ${modality.nome} • ${formatarDataCompleta(dataSelecionada)}`}
              onBack={() => handleVoltar("quadra")}
              icon={<Clock size={22} />}
            />

            <div className="bg-white rounded-3xl border border-border shadow-soft p-5 md:p-8 space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <p className="text-sm font-bold text-text-secondary">
                  Horários de funcionamento: <span className="text-dark">08:00 — 22:00</span>
                </p>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <span className="w-4 h-4 rounded-lg bg-status-confirmed shadow-[0_0_0_3px_rgba(22,163,74,0.15)]" />
                    Disponível
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <span className="w-4 h-4 rounded-lg bg-status-reserved shadow-[0_0_0_3px_rgba(240,68,56,0.15)]" />
                    Reservado
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-2 md:gap-3">
                {horarios.map(slot => {
                  const selecionado = horarioSelecionado === slot.horario;
                  const reservado = slot.status === "reserved";
                  return (
                    <button
                      key={slot.horario}
                      disabled={reservado}
                      onClick={() => setHorarioSelecionado(slot.horario)}
                      className={cn(
                        "py-3 md:py-4 rounded-2xl border-2 text-center transition-all duration-200 font-bold",
                        reservado
                          ? "bg-red-50 border-red-100 text-gray-400 cursor-not-allowed line-through decoration-red-300"
                          : selecionado
                            ? "bg-gradient-primary text-white border-transparent shadow-lg scale-[1.04]"
                            : cn("bg-white text-dark hover:shadow-md hover:scale-[1.02]", modality.borderCor)
                      )}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        {!reservado && !selecionado && (
                          <span className="w-2 h-2 rounded-full bg-status-confirmed" />
                        )}
                        {reservado && (
                          <span className="w-2 h-2 rounded-full bg-status-reserved" />
                        )}
                        <span className="text-sm md:text-base tracking-wide">{slot.horario}</span>
                      </div>
                      {selecionado && (
                        <div className="flex items-center justify-center gap-1 text-[10px] font-black uppercase mt-1 opacity-90">
                          <CheckCircle2 size={11} /> Escolhido
                        </div>
                      )}
                      {reservado && (
                        <div className="text-[10px] font-black uppercase mt-1 text-red-400">Indisponível</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Resumo prévio */}
            {horarioSelecionado && (
              <div className="card-modern p-5 md:p-6 bg-gradient-to-br from-orange-50 to-yellow-50 border-orange-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center text-primary-orange shadow-sm">
                    <CreditCard size={22} />
                  </div>
                  <div>
                    <h4 className="font-black text-dark">Prévia da reserva</h4>
                    <p className="text-xs text-text-secondary font-medium">Confira os detalhes antes de avançar</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <InfoResumo label="Quadra" valor={quadra.nome} />
                  <InfoResumo label="Modalidade" valor={modality.nome} />
                  <InfoResumo label="Data" valor={formatarDataSimples(dataSelecionada)} />
                  <InfoResumo 
                    label="Horário" 
                    valor={`${horarioSelecionado} — ${horarioFim}`} 
                  />
                </div>
                <div className="flex items-center justify-between mt-6 pt-5 border-t border-orange-200/50">
                  <span className="text-sm font-bold text-text-secondary uppercase tracking-wider">
                    Valor total
                  </span>
                  <span className={cn("text-3xl font-black tracking-tight", modality.cor)}>
                    {moedaBR(valorTotal)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center">
              <ButtonVoltar onClick={() => handleVoltar("quadra")} />
              <ButtonAvancar
                onClick={() => handleAvancar("dados", podeAvancar.horario)}
                disabled={!podeAvancar.horario}
              />
            </div>
          </section>
        )}

        {/* STEP 5: DADOS */}
        {step === "dados" && modality && dataSelecionada && quadra && horarioSelecionado && (
          <section className="space-y-10 mt-8">
            <SectionHeader 
              titulo="Seus dados" 
              subtitulo="Preencha para confirmar sua reserva"
              onBack={() => handleVoltar("horario")}
              icon={<User size={22} />}
            />

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Formulário */}
              <form onSubmit={handleReservar} className="lg:col-span-3 card-modern p-6 md:p-8 space-y-5">
                <h3 className="text-lg font-black text-dark flex items-center gap-2.5 mb-2">
                  <User size={20} className="text-primary-orange" />
                  Informações do cliente
                </h3>

                <div>
                  <label className="text-sm font-bold text-gray-700 mb-1.5 block">
                    Nome completo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: João da Silva"
                    className="input-modern w-full h-12 text-base"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-gray-700 mb-1.5 block">
                    Telefone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="(00) 00000-0000"
                    className="input-modern w-full h-12 text-base"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-gray-700 mb-1.5 block">
                    E-mail <span className="text-text-secondary text-xs font-normal">(opcional)</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="seu@email.com"
                    className="input-modern w-full h-12 text-base"
                  />
                  {formData.email && (
                    <p className="text-xs text-status-confirmed mt-1.5 font-medium flex items-center gap-1">
                      <CheckCircle2 size={13} /> Enviaremos o comprovante por e-mail
                    </p>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 mt-2">
                  <p className="text-xs text-blue-700 font-medium leading-relaxed">
                    📞 <strong>Importante:</strong> Após a reserva, entraremos em contato pelo telefone informado para confirmação. Pagamento será realizado no local.
                  </p>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-border mt-4">
                  <ButtonVoltar type="button" onClick={() => handleVoltar("horario")} />
                  <button
                    type="submit"
                    disabled={!podeAvancar.dados}
                    className={cn(
                      "btn-gradient h-12 px-8 rounded-button text-base font-black flex items-center gap-2 shadow-soft transition-all",
                      !podeAvancar.dados && "opacity-50 cursor-not-allowed grayscale"
                    )}
                  >
                    <CheckCircle2 size={20} />
                    RESERVAR
                  </button>
                </div>
              </form>

              {/* Resumo */}
              <aside className="lg:col-span-2 space-y-4 h-fit sticky top-28">
                <div className="card-modern p-6 overflow-hidden">
                  <div className="bg-gradient-primary text-white -mx-6 -mt-6 px-6 py-5 mb-6">
                    <h4 className="font-black text-lg flex items-center gap-2">
                      <CreditCard size={20} /> Resumo da Reserva
                    </h4>
                    <p className="text-white/80 text-xs font-medium mt-1">Verifique antes de confirmar</p>
                  </div>
                  <div className="space-y-4">
                    <ResumoRow label="Quadra" valor={quadra.nome} />
                    <ResumoRow label="Modalidade" valor={modality.nome} destaque cor={modality.cor} />
                    <ResumoRow label="Data" valor={formatarDataCompleta(dataSelecionada)} />
                    <ResumoRow label="Horário" valor={`${horarioSelecionado} — ${horarioFim}`} />
                    <ResumoRow label="Duração" valor="1 hora" />
                  </div>
                  <div className="flex items-center justify-between mt-6 pt-5 border-t-2 border-dashed border-border">
                    <span className="text-xs font-black uppercase tracking-wider text-text-secondary">Total</span>
                    <span className={cn("text-3xl font-black", modality.cor)}>{moedaBR(valorTotal)}</span>
                  </div>
                </div>

                <div className="card-modern p-5 bg-green-50 border-green-100">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 size={22} className="text-status-confirmed flex-shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-black text-dark text-sm">Pagamento</h5>
                      <p className="text-xs font-medium text-text-secondary mt-1 leading-relaxed">
                        Sem taxas online. Pague o valor total diretamente no local.
                      </p>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </section>
        )}

        {/* STEP 6: CONFIRMAÇÃO */}
        {step === "confirmacao" && modality && dataSelecionada && quadra && horarioSelecionado && (
          <section className="space-y-8 mt-6 mb-12">
            <div className="card-modern overflow-hidden max-w-3xl mx-auto">
              {/* Barra superior sucesso */}
              <div className="bg-gradient-primary text-white px-6 py-10 md:px-10 md:py-14 text-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-white" />
                  <div className="absolute -bottom-16 -right-10 w-52 h-52 rounded-full bg-white" />
                </div>
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-white mx-auto mb-5 flex items-center justify-center shadow-xl">
                    <CheckCircle2 size={44} className="text-status-confirmed" />
                  </div>
                  <h2 className="text-3xl md:text-4xl font-black tracking-tight uppercase mb-2">
                    Reserva Confirmada
                  </h2>
                  <p className="text-white/90 text-base md:text-lg font-medium max-w-lg mx-auto">
                    Sua reserva foi realizada com sucesso. Enviamos os detalhes para o seu contato.
                  </p>
                  <div className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-white/15 backdrop-blur rounded-full border border-white/20">
                    <CreditCard size={16} />
                    <span className="text-sm font-black uppercase tracking-wider">
                      Protocolo: #{Math.floor(Math.random() * 900000 + 100000)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dados da reserva */}
              <div className="p-6 md:p-10 space-y-8">
                {/* Dados do cliente */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-text-secondary uppercase tracking-wider flex items-center gap-2">
                    <User size={16} className="text-primary-orange" /> Dados do Cliente
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 bg-background-light rounded-2xl border border-border">
                    <DadoConfirmacao label="Nome" valor={formData.nome} />
                    <DadoConfirmacao label="Telefone" valor={formData.telefone} />
                    <DadoConfirmacao label="E-mail" valor={formData.email || "Não informado"} />
                  </div>
                </div>

                {/* Detalhes da reserva */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-text-secondary uppercase tracking-wider flex items-center gap-2">
                    <Calendar size={16} className="text-primary-orange" /> Detalhes da Reserva
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DadoConfirmacaoCard 
                      icon={<MapPin size={22} />} 
                      label="Quadra" 
                      valor={quadra.nome} 
                      cor="text-sport-futebol" 
                      bgCor="bg-sport-futebol/10"
                    />
                    <DadoConfirmacaoCard 
                      icon={modality.icone} 
                      label="Modalidade" 
                      valor={modality.nome} 
                      cor={modality.cor} 
                      bgCor={modality.bgCor}
                    />
                    <DadoConfirmacaoCard 
                      icon={<Calendar size={22} />} 
                      label="Data" 
                      valor={formatarDataCompleta(dataSelecionada)} 
                      cor="text-blue-600" 
                      bgCor="bg-blue-50"
                    />
                    <DadoConfirmacaoCard 
                      icon={<Clock size={22} />} 
                      label="Horário" 
                      valor={`${horarioSelecionado} — ${horarioFim} (1h)`} 
                      cor="text-purple-600" 
                      bgCor="bg-purple-50"
                    />
                  </div>
                </div>

                {/* Valor */}
                <div className="p-6 rounded-3xl bg-gradient-to-br from-orange-50 via-yellow-50 to-orange-50 border-2 border-orange-200/60 flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-primary-orange">Valor a pagar no local</p>
                    <p className="text-sm text-text-secondary font-medium mt-1">Sem cobrança online ou taxas</p>
                  </div>
                  <span className={cn("text-4xl md:text-5xl font-black tracking-tight", modality.cor)}>
                    {moedaBR(valorTotal)}
                  </span>
                </div>

                {/* CTA Finais */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={handleNovaReserva}
                    className="flex-1 btn-gradient py-3.5 rounded-button text-base font-black flex items-center justify-center gap-2 shadow-soft"
                  >
                    <Calendar size={20} />
                    Fazer nova reserva
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex-1 h-[52px] px-6 rounded-button border-2 border-dark text-dark font-bold text-base hover:bg-dark hover:text-white transition-colors flex items-center justify-center gap-2"
                  >
                    <CreditCard size={20} />
                    Imprimir comprovante
                  </button>
                </div>
              </div>
            </div>

            {/* Info complexo */}
            <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card-modern p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-primary-orange flex-shrink-0">
                  <MapPin size={22} />
                </div>
                <div className="min-w-0">
                  <h5 className="font-black text-dark">Endereço</h5>
                  <p className="text-sm text-text-secondary font-medium truncate">{complexo.endereco}</p>
                </div>
              </div>
              <div className="card-modern p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-primary-orange flex-shrink-0">
                  <Phone size={22} />
                </div>
                <div>
                  <h5 className="font-black text-dark">Dúvidas?</h5>
                  <p className="text-sm text-text-secondary font-medium">Contato: {complexo.telefone}</p>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* FOOTER PÚBLICO */}
      {step !== "confirmacao" && (
        <footer className="bg-dark text-white mt-20 py-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-3 gap-10">
            <div>
              <h3 className="text-xl font-black mb-4">{complexo.nome}</h3>
              <p className="text-gray-400 leading-relaxed text-sm">
                O melhor complexo esportivo da região. Estrutura profissional para você e sua equipe.
              </p>
            </div>
            <div>
              <h4 className="text-base font-black mb-4 uppercase tracking-wider text-xs text-gray-300">Contato</h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-3 text-gray-400">
                  <MapPin size={16} className="text-primary-orange" />
                  {complexo.endereco}
                </li>
                <li className="flex items-center gap-3 text-gray-400">
                  <Phone size={16} className="text-primary-orange" />
                  {complexo.telefone}
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-base font-black mb-4 uppercase tracking-wider text-xs text-gray-300">Funcionamento</h4>
              <div className="space-y-2 text-sm text-gray-400">
                <p className="flex justify-between"><span>Seg — Sex</span><span className="text-white font-bold">08h — 23h</span></p>
                <p className="flex justify-between"><span>Sábados</span><span className="text-white font-bold">08h — 22h</span></p>
                <p className="flex justify-between"><span>Domingos</span><span className="text-white font-bold">08h — 20h</span></p>
              </div>
            </div>
          </div>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-12 pt-6 border-t border-gray-800 text-gray-500 text-xs font-medium">
            © 2026 {complexo.nome} — Gestão Minha Quadra SaaS
          </div>
        </footer>
      )}
    </div>
  );
}

/* =========================
   COMPONENTES AUXILIARES
   ========================= */

function ProgressBar({ stepIndex }: { stepIndex: number }) {
  const steps = ["Modalidade", "Data", "Quadra", "Horário", "Dados"];
  return (
    <div className="card-modern p-4 md:p-5">
      <div className="flex items-center gap-2 md:gap-3">
        {steps.map((label, idx) => {
          const concluido = idx < stepIndex;
          const atual = idx === stepIndex;
          return (
            <React.Fragment key={label}>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className={cn(
                  "w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center font-black text-xs md:text-sm transition-all",
                  concluido
                    ? "bg-status-confirmed text-white"
                    : atual
                      ? "bg-gradient-primary text-white shadow-md"
                      : "bg-gray-100 text-gray-400"
                )}>
                  {concluido ? <CheckCircle2 size={16} /> : idx + 1}
                </div>
                <span className={cn(
                  "hidden md:block text-sm font-bold",
                  concluido || atual ? "text-dark" : "text-gray-400"
                )}>
                  {label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div className={cn(
                  "h-1 flex-1 rounded-full transition-all",
                  concluido ? "bg-status-confirmed" : "bg-gray-100"
                )} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

function SectionTitle({ children, icon }: { children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-11 h-11 rounded-2xl bg-gradient-primary flex items-center justify-center text-white shadow-soft">
        {icon}
      </div>
      <h3 className="text-2xl md:text-3xl font-black text-dark tracking-tight">{children}</h3>
    </div>
  );
}

function SectionHeader({ 
  titulo, subtitulo, onBack, icon 
}: { 
  titulo: string; subtitulo: string; onBack: () => void; icon: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <button
        onClick={onBack}
        className="text-sm font-bold text-primary-orange flex items-center gap-1.5 hover:underline underline-offset-4"
      >
        <ChevronLeft size={16} /> Voltar
      </button>
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center text-white shadow-lg">
          {icon}
        </div>
        <div>
          <h3 className="text-2xl md:text-3xl font-black text-dark tracking-tight">{titulo}</h3>
          <p className="text-sm md:text-base text-text-secondary font-medium capitalize mt-0.5">{subtitulo}</p>
        </div>
      </div>
    </div>
  );
}

function ButtonAvancar({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "btn-gradient h-12 px-7 rounded-button text-base font-black flex items-center gap-2 shadow-soft transition-all",
        disabled ? "opacity-50 cursor-not-allowed grayscale" : "hover:shadow-lg hover:scale-[1.02]"
      )}
    >
      Avançar <ArrowRight size={20} />
    </button>
  );
}

function ButtonVoltar({ onClick, type = "button" }: { onClick: () => void; type?: "button" | "submit" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="h-12 px-6 rounded-button border-2 border-border bg-white text-dark font-bold text-base hover:bg-gray-50 transition-colors flex items-center gap-2"
    >
      <ChevronLeft size={18} /> Voltar
    </button>
  );
}

function InfoResumo({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-[11px] font-black uppercase tracking-wider text-text-secondary mb-1">{label}</p>
      <p className="text-sm font-bold text-dark truncate">{valor}</p>
    </div>
  );
}

function ResumoRow({ 
  label, valor, destaque, cor 
}: { 
  label: string; valor: string; destaque?: boolean; cor?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 pb-3 border-b border-border last:border-0 last:pb-0">
      <span className="text-xs md:text-sm font-bold uppercase tracking-wider text-text-secondary">{label}</span>
      <span className={cn(
        "text-right font-black truncate",
        destaque && cor ? cn("text-base md:text-lg", cor) : "text-dark text-sm md:text-base"
      )}>
        {valor}
      </span>
    </div>
  );
}

function DadoConfirmacao({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-[11px] font-black uppercase tracking-wider text-text-secondary mb-1">{label}</p>
      <p className="text-sm md:text-base font-bold text-dark truncate">{valor}</p>
    </div>
  );
}

function DadoConfirmacaoCard({ 
  icon, label, valor, cor, bgCor 
}: { 
  icon: React.ReactNode;
  label: string;
  valor: string;
  cor: string;
  bgCor: string;
}) {
  return (
    <div className={cn("p-5 rounded-2xl border-2 border-border bg-white")}>
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4", bgCor, cor)}>
        {icon}
      </div>
      <p className="text-[11px] font-black uppercase tracking-wider text-text-secondary mb-1">{label}</p>
      <p className="text-base md:text-lg font-black text-dark leading-tight">{valor}</p>
    </div>
  );
}
