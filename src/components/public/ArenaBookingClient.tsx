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
  Home,
  Trophy,
  Sun
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import type { Company, Court, Modality } from "@prisma/client";
import { createPublicBookingAction } from "@/app/arena/actions";

type ModalityWithIcon = Modality & {
  icon?: React.ReactNode;
};

type CourtWithModality = Court & {
  modality: Modality;
};

type SlotStatus = "available" | "reserved";
type TimeSlot = {
  horario: string;
  status: SlotStatus;
};

type Step = "modalidade" | "data" | "quadra" | "horario" | "dados" | "confirmacao";

interface ArenaBookingClientProps {
  company: Company;
  modalities: Modality[];
  courts: CourtWithModality[];
}

const modalityIconMap: Record<string, any> = {
  "trophy": Trophy,
  "volleyball": Trophy, // Fallback temporário
  "sun": Sun,
  "tennis": Home, // Fallback
};

function getIconForModality(iconName: string | null) {
  const IconComponent = modalityIconMap[iconName || ""] || Trophy;
  return <IconComponent size={28} />;
}

function proximosDias(qtd: number): Date[] {
  const dias: Date[] = [];
  const hoje = new Date();
  for (let i = 0; i < qtd; i++) {
    const d = new Date(hoje);
    d.setHours(0, 0, 0, 0);
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

export function ArenaBookingClient({ company, modalities, courts }: ArenaBookingClientProps) {
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

  const selectedModality = modalities.find(m => m.id === modalityId) || null;
  const selectedQuadra = courts.find(q => q.id === quadraId) || null;

  const quadrasDisponiveis = useMemo(() => {
    if (!modalityId) return [];
    return courts.filter(q => q.modalityId === modalityId);
  }, [modalityId, courts]);

  // Horários baseados no funcionamento da quadra
  const todosHorarios = useMemo(() => {
    if (!selectedQuadra) return [];
    const start = parseInt(selectedQuadra.startTime.split(":")[0]);
    const end = parseInt(selectedQuadra.endTime.split(":")[0]);
    const horarios = [];
    for (let h = start; h < end; h++) {
      horarios.push(`${h.toString().padStart(2, "0")}:00`);
    }
    return horarios;
  }, [selectedQuadra]);

  const horarios = useMemo(() => {
    if (!dataSelecionada || !quadraId || !selectedQuadra) return [];
    
    // Por enquanto, vamos manter um mock de ocupação, mas baseado nos horários reais da quadra
    const seed = dataSelecionada.getTime() + parseInt(quadraId.slice(-4), 16) || 0;
    return todosHorarios.map((horario, idx) => {
      const pseudoRandom = ((seed * (idx + 3)) % 11);
      return {
        horario,
        status: pseudoRandom < 3 ? "reserved" : "available",
      } as TimeSlot;
    });
  }, [dataSelecionada, quadraId, selectedQuadra, todosHorarios]);

  const valorTotal = selectedModality?.pricePerHour || 0;

  const handleNextStep = () => {
    if (step === "modalidade" && modalityId) setStep("data");
    else if (step === "data" && dataSelecionada) setStep("quadra");
    else if (step === "quadra" && quadraId) setStep("horario");
    else if (step === "horario" && horarioSelecionado) setStep("dados");
    else if (step === "dados" && formData.nome && formData.telefone) setStep("confirmacao");
  };

  const handleBackStep = () => {
    if (step === "data") setStep("modalidade");
    else if (step === "quadra") setStep("data");
    else if (step === "horario") setStep("quadra");
    else if (step === "dados") setStep("horario");
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [bookingRes, setBookingRes] = useState<{ 
    success: boolean; 
    message?: string; 
    bookingId?: string;
    error?: string;
  } | null>(null);

  const handleConfirmBooking = async () => {
    if (!modalityId || !dataSelecionada || !quadraId || !horarioSelecionado) return;

    setIsSubmitting(true);
    try {
      const res = await createPublicBookingAction({
        companyId: company.id,
        courtId: quadraId,
        modalityId,
        date: formatarDataInput(dataSelecionada),
        startTime: horarioSelecionado,
        customer: {
          name: formData.nome,
          phone: formData.telefone,
          email: formData.email || undefined,
        },
      });

      setBookingRes(res);
      if (!res.success) {
        alert(res.error || "Erro ao realizar reserva.");
      }
    } catch (error) {
      alert("Ocorreu um erro inesperado. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => {
    const steps: { key: Step; label: string }[] = [
      { key: "modalidade", label: "Modalidade" },
      { key: "data", label: "Data" },
      { key: "quadra", label: "Quadra" },
      { key: "horario", label: "Horário" },
      { key: "dados", label: "Identificação" },
    ];

    if (step === "confirmacao") return null;

    return (
      <div className="flex items-center justify-between mb-8 overflow-x-auto pb-2 scrollbar-hide">
        {steps.map((s, idx) => {
          const isCurrent = step === s.key;
          const isPast = steps.findIndex(st => st.key === step) > idx;

          return (
            <React.Fragment key={s.key}>
              <div className="flex flex-col items-center min-w-fit">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300",
                  isCurrent ? "bg-gradient-primary text-white scale-110 shadow-lg shadow-primary-orange/20" : 
                  isPast ? "bg-success text-white" : "bg-white text-text-secondary border border-border"
                )}>
                  {isPast ? <CheckCircle2 size={20} /> : idx + 1}
                </div>
                <span className={cn(
                  "text-[10px] mt-2 font-semibold uppercase tracking-wider",
                  isCurrent ? "text-primary-orange" : "text-text-secondary"
                )}>
                  {s.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div className={cn(
                  "h-[2px] flex-1 min-w-[20px] mx-2",
                  isPast ? "bg-success" : "bg-border"
                )} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Header Público */}
      <header className="bg-white border-b border-border sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {company.logo ? (
              <img src={company.logo} alt={company.name} className="h-12 w-12 object-contain rounded-lg shadow-sm" />
            ) : (
              <div className="h-12 w-12 bg-gradient-primary rounded-lg flex items-center justify-center text-white font-black text-xl shadow-lg">
                {company.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="font-bold text-dark text-lg leading-tight">{company.name}</h1>
              <div className="flex items-center text-text-secondary text-xs gap-1">
                <MapPin size={12} className="text-primary-orange" />
                <span className="truncate max-w-[200px]">{company.address || "Endereço não informado"}</span>
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-text-secondary text-sm font-medium">
            <Phone size={16} className="text-primary-orange" />
            {company.phone || "(00) 00000-0000"}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {renderStepIndicator()}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna de Conteúdo Principal */}
          <div className="lg:col-span-2">
            {step === "modalidade" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center md:text-left">
                  <h2 className="text-2xl font-bold text-dark">Escolha a Modalidade</h2>
                  <p className="text-text-secondary">Qual esporte você deseja praticar hoje?</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {modalities.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setModalityId(m.id);
                        setStep("data");
                      }}
                      className={cn(
                        "p-6 rounded-2xl border-2 transition-all duration-300 text-left flex items-center gap-4 group hover:shadow-xl",
                        modalityId === m.id 
                          ? "border-primary-orange bg-white shadow-lg shadow-primary-orange/5" 
                          : "border-transparent bg-white shadow-sm hover:border-primary-orange/30"
                      )}
                    >
                      <div className={cn(
                        "w-16 h-16 rounded-xl flex items-center justify-center transition-colors duration-300",
                        m.bgColorClass || "bg-primary-orange/10",
                        m.textColorClass || "text-primary-orange"
                      )}>
                        {getIconForModality(m.iconName)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-dark text-lg">{m.name}</h3>
                        <p className="text-text-secondary text-sm">A partir de {formatCurrency(m.pricePerHour)}/h</p>
                      </div>
                      <ChevronRight size={20} className="text-border group-hover:text-primary-orange transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === "data" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex items-center gap-4">
                  <button onClick={handleBackStep} className="p-2 hover:bg-white rounded-full transition-colors">
                    <ChevronLeft size={24} />
                  </button>
                  <div>
                    <h2 className="text-2xl font-bold text-dark">Selecione a Data</h2>
                    <p className="text-text-secondary">Quando você quer jogar?</p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
                  <div className="flex items-center justify-between mb-6">
                    <button 
                      disabled={diasPage === 0}
                      onClick={() => setDiasPage(p => p - 1)}
                      className="p-2 hover:bg-background rounded-full disabled:opacity-30 transition-colors"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <span className="font-bold text-dark">
                      {dias[diasPage * 7].toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                    </span>
                    <button 
                      disabled={diasPage === 1}
                      onClick={() => setDiasPage(p => p + 1)}
                      className="p-2 hover:bg-background rounded-full disabled:opacity-30 transition-colors"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {dias.slice(diasPage * 7, (diasPage * 7) + 7).map((d) => {
                      const isSelected = dataSelecionada?.getTime() === d.getTime();
                      return (
                        <button
                          key={d.toISOString()}
                          onClick={() => {
                            setDataSelecionada(d);
                            setStep("quadra");
                          }}
                          className={cn(
                            "flex flex-col items-center p-3 rounded-xl transition-all duration-300",
                            isSelected ? "bg-gradient-primary text-white shadow-lg" : "hover:bg-background text-dark"
                          )}
                        >
                          <span className="text-[10px] font-bold opacity-70 mb-1">{diaSemanaCurto(d)}</span>
                          <span className="text-xl font-black">{d.getDate()}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {step === "quadra" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex items-center gap-4">
                  <button onClick={handleBackStep} className="p-2 hover:bg-white rounded-full transition-colors">
                    <ChevronLeft size={24} />
                  </button>
                  <div>
                    <h2 className="text-2xl font-bold text-dark">Escolha a Quadra</h2>
                    <p className="text-text-secondary">Quadras disponíveis para {selectedModality?.name}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {quadrasDisponiveis.map((q) => (
                    <button
                      key={q.id}
                      onClick={() => {
                        setQuadraId(q.id);
                        setStep("horario");
                      }}
                      className={cn(
                        "p-6 rounded-2xl border-2 transition-all duration-300 text-left flex items-center gap-6 group hover:shadow-xl bg-white",
                        quadraId === q.id ? "border-primary-orange shadow-lg" : "border-transparent shadow-sm hover:border-primary-orange/30"
                      )}
                    >
                      <div className="w-24 h-24 rounded-xl bg-background overflow-hidden flex-shrink-0">
                        {q.imageUrl ? (
                          <img src={q.imageUrl} alt={q.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-border">
                            <Building2 size={32} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-dark text-xl">{q.name}</h3>
                          {q.isCovered && (
                            <span className="px-2 py-0.5 bg-info-light text-info text-[10px] font-bold rounded-full uppercase tracking-tighter">
                              Coberta
                            </span>
                          )}
                        </div>
                        <p className="text-text-secondary text-sm mb-3">{q.description || "Quadra oficial para competições"}</p>
                        <div className="flex items-center gap-4 text-xs font-semibold text-text-secondary">
                          <span className="flex items-center gap-1">
                            <Clock size={14} className="text-primary-orange" />
                            {q.startTime} - {q.endTime}
                          </span>
                          <span className="flex items-center gap-1">
                            <CreditCard size={14} className="text-primary-orange" />
                            {formatCurrency(q.pricePerHour)}/h
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={24} className="text-border group-hover:text-primary-orange transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === "horario" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex items-center gap-4">
                  <button onClick={handleBackStep} className="p-2 hover:bg-white rounded-full transition-colors">
                    <ChevronLeft size={24} />
                  </button>
                  <div>
                    <h2 className="text-2xl font-bold text-dark">Selecione o Horário</h2>
                    <p className="text-text-secondary">Horários disponíveis para {formatarDataSimples(dataSelecionada!)}</p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {horarios.map((h) => {
                      const isSelected = horarioSelecionado === h.horario;
                      const isReserved = h.status === "reserved";

                      return (
                        <button
                          key={h.horario}
                          disabled={isReserved}
                          onClick={() => {
                            setHorarioSelecionado(h.horario);
                            setStep("dados");
                          }}
                          className={cn(
                            "py-4 rounded-xl font-bold text-sm transition-all duration-300 border-2",
                            isReserved 
                              ? "bg-background text-text-secondary border-transparent cursor-not-allowed opacity-50" 
                              : isSelected
                                ? "bg-gradient-primary text-white border-transparent shadow-lg scale-105"
                                : "bg-white text-dark border-transparent hover:border-primary-orange/30 shadow-sm"
                          )}
                        >
                          {h.horario}
                          <div className="text-[9px] uppercase tracking-tighter mt-1 opacity-70">
                            {isReserved ? "Ocupado" : "Livre"}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {step === "dados" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex items-center gap-4">
                  <button onClick={handleBackStep} className="p-2 hover:bg-white rounded-full transition-colors">
                    <ChevronLeft size={24} />
                  </button>
                  <div>
                    <h2 className="text-2xl font-bold text-dark">Identificação</h2>
                    <p className="text-text-secondary">Precisamos de alguns dados para confirmar sua reserva</p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-border p-8 space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-dark mb-2">Nome Completo</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={20} />
                        <input
                          type="text"
                          placeholder="Digite seu nome"
                          value={formData.nome}
                          onChange={e => setFormData({ ...formData, nome: e.target.value })}
                          className="w-full pl-12 pr-4 py-4 rounded-xl border border-border focus:border-primary-orange outline-none transition-all font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-dark mb-2">WhatsApp / Telefone</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={20} />
                        <input
                          type="tel"
                          placeholder="(00) 00000-0000"
                          value={formData.telefone}
                          onChange={e => setFormData({ ...formData, telefone: e.target.value })}
                          className="w-full pl-12 pr-4 py-4 rounded-xl border border-border focus:border-primary-orange outline-none transition-all font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-dark mb-2">E-mail (opcional)</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={20} />
                        <input
                          type="email"
                          placeholder="seu@email.com"
                          value={formData.email}
                          onChange={e => setFormData({ ...formData, email: e.target.value })}
                          className="w-full pl-12 pr-4 py-4 rounded-xl border border-border focus:border-primary-orange outline-none transition-all font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleNextStep}
                    disabled={!formData.nome || !formData.telefone}
                    className="w-full btn-gradient text-white py-5 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary-orange/20"
                  >
                    Revisar Reserva
                    <ArrowRight size={20} />
                  </button>
                </div>
              </div>
            )}

            {step === "confirmacao" && (
              <div className="space-y-8 animate-in zoom-in duration-500 max-w-lg mx-auto py-8">
                {bookingRes?.success ? (
                  <div className="text-center space-y-6">
                    <div className="w-24 h-24 bg-success text-white rounded-full flex items-center justify-center mx-auto shadow-xl shadow-success/20">
                      <CheckCircle2 size={56} />
                    </div>
                    <div>
                      <h2 className="text-3xl font-black text-dark mb-2">Reserva Realizada!</h2>
                      <p className="text-text-secondary">
                        Sua reserva para <strong>{selectedModality?.name}</strong> foi recebida. 
                        Em instantes você receberá uma confirmação.
                      </p>
                    </div>
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-border text-left">
                      <div className="space-y-4">
                        <div className="flex justify-between border-b border-border pb-3">
                          <span className="text-text-secondary">Protocolo</span>
                          <span className="font-bold text-dark">#{bookingRes.bookingId?.slice(-6).toUpperCase()}</span>
                        </div>
                        <div className="flex justify-between border-b border-border pb-3">
                          <span className="text-text-secondary">Data</span>
                          <span className="font-bold text-dark">{formatarDataSimples(dataSelecionada!)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-secondary">Horário</span>
                          <span className="font-bold text-dark">{horarioSelecionado}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => window.location.reload()}
                      className="w-full py-4 px-6 rounded-2xl bg-dark text-white font-bold hover:bg-dark/90 transition-all"
                    >
                      Voltar para o Início
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="text-center">
                      <div className="w-24 h-24 bg-success-light text-success rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                        <CheckCircle2 size={56} />
                      </div>
                      <h2 className="text-3xl font-black text-dark mb-2">Quase lá!</h2>
                      <p className="text-text-secondary">Confira os detalhes da sua reserva antes de finalizar.</p>
                    </div>

                    <div className="bg-white rounded-3xl shadow-xl border border-border overflow-hidden">
                      <div className="bg-gradient-primary p-6 text-white">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <span className="text-xs font-bold uppercase tracking-widest opacity-80">Modalidade</span>
                            <h3 className="text-xl font-black">{selectedModality?.name}</h3>
                          </div>
                          <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
                            {getIconForModality(selectedModality?.iconName || null)}
                          </div>
                        </div>
                        <div className="flex gap-6">
                          <div>
                            <span className="text-xs font-bold uppercase tracking-widest opacity-80 block mb-1">Data</span>
                            <span className="font-bold">{formatarDataSimples(dataSelecionada!)}</span>
                          </div>
                          <div>
                            <span className="text-xs font-bold uppercase tracking-widest opacity-80 block mb-1">Horário</span>
                            <span className="font-bold">{horarioSelecionado}</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-8 space-y-6">
                        <div className="flex justify-between items-center py-4 border-b border-dashed border-border">
                          <span className="text-text-secondary font-medium">Quadra</span>
                          <span className="font-bold text-dark">{selectedQuadra?.name}</span>
                        </div>
                        <div className="flex justify-between items-center py-4 border-b border-dashed border-border">
                          <span className="text-text-secondary font-medium">Valor Total</span>
                          <span className="text-2xl font-black text-primary-orange">{formatCurrency(valorTotal)}</span>
                        </div>

                        <div className="bg-background rounded-2xl p-6 space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-widest text-text-secondary">Cliente</h4>
                          <div className="flex flex-col gap-1">
                            <span className="font-bold text-dark">{formData.nome}</span>
                            <span className="text-sm text-text-secondary">{formData.telefone}</span>
                          </div>
                        </div>

                        <button
                          onClick={handleConfirmBooking}
                          disabled={isSubmitting}
                          className="w-full btn-gradient text-white py-5 rounded-2xl font-bold text-lg shadow-xl shadow-primary-orange/30 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSubmitting ? "Processando..." : "Confirmar Reserva"}
                        </button>

                        <button
                          onClick={() => setStep("dados")}
                          className="w-full text-text-secondary font-bold text-sm hover:text-dark transition-colors"
                        >
                          Alterar informações
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Coluna de Resumo (Sidebar Lateral) */}
          {step !== "confirmacao" && (
            <div className="hidden lg:block">
              <div className="bg-white rounded-2xl shadow-sm border border-border p-6 sticky top-28">
                <h3 className="font-bold text-dark text-lg mb-6 flex items-center gap-2">
                  <Calendar className="text-primary-orange" size={20} />
                  Resumo da Reserva
                </h3>

                <div className="space-y-4">
                  <div className={cn("p-4 rounded-xl border border-border transition-all", modalityId ? "bg-background border-primary-orange/20" : "opacity-50")}>
                    <span className="text-[10px] font-bold uppercase text-text-secondary block mb-1">Modalidade</span>
                    <span className="font-bold text-dark">{selectedModality?.name || "A selecionar..."}</span>
                  </div>

                  <div className={cn("p-4 rounded-xl border border-border transition-all", dataSelecionada ? "bg-background border-primary-orange/20" : "opacity-50")}>
                    <span className="text-[10px] font-bold uppercase text-text-secondary block mb-1">Data</span>
                    <span className="font-bold text-dark">{dataSelecionada ? formatarDataSimples(dataSelecionada) : "A selecionar..."}</span>
                  </div>

                  <div className={cn("p-4 rounded-xl border border-border transition-all", quadraId ? "bg-background border-primary-orange/20" : "opacity-50")}>
                    <span className="text-[10px] font-bold uppercase text-text-secondary block mb-1">Quadra</span>
                    <span className="font-bold text-dark">{selectedQuadra?.name || "A selecionar..."}</span>
                  </div>

                  <div className={cn("p-4 rounded-xl border border-border transition-all", horarioSelecionado ? "bg-background border-primary-orange/20" : "opacity-50")}>
                    <span className="text-[10px] font-bold uppercase text-text-secondary block mb-1">Horário</span>
                    <span className="font-bold text-dark">{horarioSelecionado || "A selecionar..."}</span>
                  </div>

                  <div className="pt-6 border-t border-border mt-6">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-text-secondary">Valor total</span>
                      <span className="text-xl font-black text-primary-orange">{formatCurrency(valorTotal)}</span>
                    </div>
                    <p className="text-[10px] text-text-secondary text-right italic">* Pagamento realizado no local</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="bg-white border-t border-border py-8 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-text-secondary text-sm">
            © 2026 {company.name}. Todos os direitos reservados.
          </p>
          <div className="flex items-center justify-center gap-2 mt-2 text-[10px] font-bold text-text-secondary/50 uppercase tracking-widest">
            <span>Powered by</span>
            <span className="text-primary-orange">Minha Quadra SaaS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
