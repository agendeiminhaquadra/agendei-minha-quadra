"use client";

import React, { useState, useMemo, useEffect } from "react";
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
  Sun,
  ShieldCheck,
  MessageCircle,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import type { Company, Court, Modality } from "@prisma/client";
import { createPublicBookingAction, getPublicAvailabilityAction } from "@/app/arena/actions";

type ModalityWithIcon = Modality & {
  icon?: React.ReactNode;
};

type CourtWithModality = Court & {
  modality: Modality;
  modalities: { modalityId: string; customPrice: number | null }[];
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
  const [horarios, setHorarios] = useState<TimeSlot[]>([]);
  const [loadingHorarios, setLoadingHorarios] = useState(false);
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
    return courts.filter(q => q.modalityId === modalityId || q.modalities.some((item) => item.modalityId === modalityId));
  }, [modalityId, courts]);

  // Horários baseados no funcionamento da quadra
  useEffect(() => {
    if (!dataSelecionada || !quadraId || !modalityId) {
      setHorarios([]);
      return;
    }
    let active = true;
    setLoadingHorarios(true);
    setHorarioSelecionado(null);
    getPublicAvailabilityAction({
      companyId: company.id,
      courtId: quadraId,
      modalityId,
      date: formatarDataInput(dataSelecionada),
    }).then((result) => {
      if (active) setHorarios(result.success ? result.slots : []);
    }).catch(() => {
      if (active) setHorarios([]);
    }).finally(() => {
      if (active) setLoadingHorarios(false);
    });
    return () => { active = false; };
  }, [company.id, dataSelecionada, modalityId, quadraId]);
  const precoHoraSelecionado = selectedQuadra
    ? selectedQuadra.modalities.find((item) => item.modalityId === modalityId)?.customPrice ??
      (selectedQuadra.modalityId === modalityId ? selectedQuadra.pricePerHour : (selectedModality?.pricePerHour || selectedQuadra.pricePerHour))
    : selectedModality?.pricePerHour || 0;
  const valorTotal = selectedQuadra
    ? Math.round((precoHoraSelecionado * selectedQuadra.defaultDurationMinutes / 60) * 100) / 100
    : precoHoraSelecionado;

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
      <header className="bg-white/95 backdrop-blur-md border-b border-border sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-[76px] flex items-center justify-between">
          <div className="flex items-center gap-4">
            {company.logo ? (
              <img src={company.logo} alt={company.fantasyName || company.name} className="h-12 w-12 object-contain rounded-2xl shadow-sm ring-1 ring-black/5" />
            ) : (
              <div className="h-12 w-12 bg-gradient-primary rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary-orange/20">
                {company.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="font-extrabold text-dark text-base sm:text-lg leading-tight">{company.fantasyName || company.name}</h1>
              <div className="flex items-center text-text-secondary text-xs gap-1">
                <MapPin size={12} className="text-primary-orange" />
                <span className="truncate max-w-[200px]">{[company.address, company.streetNumber, company.neighborhood, company.city, company.state].filter(Boolean).join(", ") || "Endereço não informado"}</span>
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-text-secondary text-sm font-medium">
            <Phone size={16} className="text-primary-orange" />
            {company.whatsapp || company.phone || "(00) 00000-0000"}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {company.coverImageUrl ? (
          <div className="relative mb-6 overflow-hidden rounded-3xl shadow-lg shadow-slate-900/10">
            <img src={company.coverImageUrl} alt={`Foto da arena ${company.fantasyName || company.name}`} className="h-44 sm:h-64 w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/75">Reserve seu horário</p>
              <h2 className="mt-1 text-2xl sm:text-3xl font-black">{company.fantasyName || company.name}</h2>
            </div>
          </div>
        ) : (
          <div className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-orange-500 to-rose-500 px-6 py-8 sm:px-9 sm:py-10 text-white shadow-lg shadow-primary-orange/20">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/75">Agendamento online</p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-black">{company.fantasyName || company.name}</h2>
            <p className="mt-2 max-w-2xl text-sm sm:text-base text-white/85">Escolha o esporte, encontre um horário livre e envie sua solicitação de reserva.</p>
          </div>
        )}
        {company.description && <p className="mb-5 max-w-3xl text-sm sm:text-base leading-relaxed text-text-secondary">{company.description}</p>}
        <div className="mb-6 flex flex-wrap gap-x-5 gap-y-3 text-sm">
          {company.whatsapp && <a className="font-semibold text-emerald-700 underline" href={`https://wa.me/${company.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">Falar pelo WhatsApp</a>}
          {company.latitude !== null && company.longitude !== null && <a className="font-semibold text-blue-700 underline" href={`https://www.google.com/maps?q=${company.latitude},${company.longitude}`} target="_blank" rel="noreferrer">Ver localização no mapa</a>}
          {company.instagramUrl && <a className="font-semibold text-orange-700 underline" href={company.instagramUrl} target="_blank" rel="noreferrer">Instagram</a>}
          {company.facebookUrl && <a className="font-semibold text-orange-700 underline" href={company.facebookUrl} target="_blank" rel="noreferrer">Facebook</a>}
          {company.websiteUrl && <a className="font-semibold text-orange-700 underline" href={company.websiteUrl} target="_blank" rel="noreferrer">Site</a>}
        </div>
        <div className="mb-8 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-text-secondary">Formas de pagamento</p>
            <p className="text-sm sm:text-base font-semibold text-dark">{[company.acceptsPix && "Pix", company.acceptsCash && "Dinheiro", company.acceptsCard && "Cart\u00e3o"].filter(Boolean).join(" \u00b7 ") || "Consulte a arena"}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-text-secondary">Pol&#237;tica de cancelamento</p>
            <p className="text-sm sm:text-base font-semibold text-dark">Sem taxa at&#233; {company.cancellationDeadlineHours}h antes; ap&#243;s esse prazo, taxa de at&#233; {company.defaultCancellationFeePercent}%.</p>
          </div>
        </div>
        {renderStepIndicator()}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Coluna de Conteúdo Principal */}
          <div className="lg:col-span-2">
            {step === "modalidade" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center md:text-left">
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-primary-orange">Etapa 1 de 5</p>
                  <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-dark">Escolha a modalidade</h2>
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
                        "p-5 sm:p-6 rounded-3xl border-2 transition-all duration-300 text-left flex items-center gap-4 group hover:-translate-y-1 hover:shadow-xl",
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
                  {modalities.length === 0 && (
                    <div className="sm:col-span-2 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center shadow-sm">
                      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-primary-orange"><Activity size={26} /></div>
                      <h3 className="text-lg font-extrabold text-dark">Nenhuma modalidade disponível</h3>
                      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-secondary">A arena ainda não publicou modalidades para agendamento online. Entre em contato para consultar os horários.</p>
                      {company.whatsapp && <a href={`https://wa.me/${company.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"><MessageCircle size={17} /> Falar com a arena</a>}
                    </div>
                  )}
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
                  {loadingHorarios && <p className="text-sm text-text-secondary mb-4">Consultando horarios...</p>}
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
                  {!loadingHorarios && horarios.length === 0 && (
                    <p className="text-sm text-text-secondary text-center py-4">Não há horários disponíveis para esta data.</p>
                  )}
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
                            {formatCurrency(q.modalities.find((item) => item.modalityId === modalityId)?.customPrice ?? (q.modalityId === modalityId ? q.pricePerHour : (selectedModality?.pricePerHour || q.pricePerHour)))}/h
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
                  {loadingHorarios && <p className="text-sm text-text-secondary mb-4">Consultando horarios...</p>}
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
                  {!loadingHorarios && horarios.length === 0 && (
                    <p className="text-sm text-text-secondary text-center py-4">Não há horários disponíveis para esta data.</p>
                  )}
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
                  <section className="mx-auto max-w-xl animate-in zoom-in duration-500">
                    <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
                      <div className="bg-gradient-to-br from-emerald-50 via-white to-orange-50 px-6 pb-6 pt-8 text-center sm:px-9">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"><CheckCircle2 size={36} strokeWidth={2.5} /></div>
                        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-700">Solicita&#231;&#227;o registrada</p>
                        <h2 className="mt-2 text-3xl font-black tracking-tight text-dark">Reserva enviada!</h2>
                        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-secondary">{company.fantasyName || company.name} recebeu os dados. Aguarde a equipe confirmar o hor&#225;rio pelo telefone informado.</p>
                        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-800"><Clock size={15} /> Aguardando confirma&#231;&#227;o da arena</div>
                      </div>
                      <div className="px-5 pb-5 sm:px-7 sm:pb-7">
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                          <div className="mb-4 flex items-start justify-between gap-3 border-b border-dashed border-slate-200 pb-4">
                            <div className="flex items-center gap-3">
                              {company.logo ? <img src={company.logo} alt="" className="h-11 w-11 rounded-xl object-cover" /> : <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary text-lg font-black text-white">{(company.fantasyName || company.name).charAt(0)}</div>}
                              <div><p className="font-extrabold text-dark">{company.fantasyName || company.name}</p><p className="flex items-center gap-1 text-xs text-text-secondary"><MapPin size={12} className="text-primary-orange" />{company.city || "Arena esportiva"}{company.state ? ", " + company.state : ""}</p></div>
                            </div>
                            <div className="shrink-0 text-right"><p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Protocolo</p><p className="font-black text-dark">#{bookingRes.bookingId?.slice(-6).toUpperCase()}</p></div>
                          </div>
                          <h3 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-text-secondary">Detalhes da reserva</h3>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"><Trophy size={18} className="shrink-0 text-primary-orange" /><div><p className="text-[10px] font-bold uppercase text-text-secondary">Modalidade</p><p className="font-bold text-dark">{selectedModality?.name}</p></div></div>
                            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"><Building2 size={18} className="shrink-0 text-primary-orange" /><div><p className="text-[10px] font-bold uppercase text-text-secondary">Quadra</p><p className="font-bold text-dark">{selectedQuadra?.name}</p></div></div>
                            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"><Calendar size={18} className="shrink-0 text-primary-orange" /><div><p className="text-[10px] font-bold uppercase text-text-secondary">Data</p><p className="font-bold capitalize text-dark">{dataSelecionada ? formatarDataCompleta(dataSelecionada) : "\u2014"}</p></div></div>
                            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"><Clock size={18} className="shrink-0 text-primary-orange" /><div><p className="text-[10px] font-bold uppercase text-text-secondary">Hor&#225;rio</p><p className="font-bold text-dark">{horarioSelecionado}</p></div></div>
                            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 sm:col-span-2"><User size={18} className="shrink-0 text-primary-orange" /><div><p className="text-[10px] font-bold uppercase text-text-secondary">Respons&#225;vel</p><p className="font-bold text-dark">{formData.nome} &#183; {formData.telefone}</p></div></div>
                          </div>
                          <div className="mt-4 flex items-center justify-between rounded-xl bg-orange-50 px-4 py-3"><span className="text-sm font-semibold text-text-secondary">Valor previsto &#183; pagamento no local</span><span className="text-lg font-black text-primary-orange">{formatCurrency(valorTotal)}</span></div>
                        </div>
                        <div className="mt-4 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-text-secondary"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-emerald-600" /><p>Guarde o n&#250;mero do protocolo. A reserva s&#243; estar&#225; confirmada ap&#243;s o retorno da equipe da arena.</p></div>
                        <button onClick={() => window.location.reload()} className="mt-5 w-full rounded-xl bg-gradient-primary px-5 py-4 font-extrabold text-white shadow-lg shadow-primary-orange/20 transition hover:brightness-105">Fazer outra reserva</button>
                        {company.whatsapp && <a href={'https://wa.me/' + company.whatsapp.replace(/\D/g, "")} target="_blank" rel="noreferrer" className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-5 py-3 font-bold text-emerald-700 transition hover:bg-emerald-50"><MessageCircle size={18} /> Falar com a arena</a>}
                      </div>
                    </div>
                  </section>
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
