"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import {
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  Maximize2,
  Minimize2,
  Phone,
  Building2,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

/* =========================================================
   TIPOS
   ========================================================= */

type BookingStatus = "available" | "reserved" | "blocked";

interface BookingCell {
  status: BookingStatus;
  cliente?: string;
}

interface ModalitySchedule {
  id: string;
  nome: string;
  quadras: string[];
  horarios: string[];
  grid: Record<string, Record<string, BookingCell>>;
}

interface ComplexoInfo {
  nome: string;
  slug: string;
  endereco: string;
  telefone: string;
}

/* =========================================================
   HOOK: useRealTimeClock
   Resolve hydration mismatch: retorna null no primeiro render
   (iguais em server e client), depois preenche no client.
   ========================================================= */

function useRealTimeClock(): Date | null {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return now;
}

/* =========================================================
   HOOK: useMounted (p/ evitar hydration em outros campos)
   ========================================================= */

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

/* =========================================================
   HOOK: useLiveSchedule (arquitetura p/ WebSocket)
   Futuramente: socket = new WebSocket(`wss://.../${slug}`)
   ========================================================= */

function useLiveSchedule(slug: string) {
  const [schedule, setSchedule] = useState<ModalitySchedule[]>(() => gerarScheduleMock(slug));
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);
  const mounted = useMounted();

  const forcarAtualizacao = useCallback(() => {
    setSchedule(gerarScheduleMock(slug));
    setUltimaAtualizacao(new Date());
  }, [slug]);

  useEffect(() => {
    if (!ultimaAtualizacao) setUltimaAtualizacao(new Date());
    const id = setInterval(() => setUltimaAtualizacao(new Date()), 30000);
    return () => clearInterval(id);
  }, [slug, ultimaAtualizacao]);

  return { schedule, ultimaAtualizacao: mounted ? ultimaAtualizacao : null, forcarAtualizacao };
}

/* =========================================================
   MOCK DATA
   ========================================================= */

const COMPLEXOS: Record<string, ComplexoInfo> = {
  "complexo-sports": {
    nome: "COMPLEXO SPORTS ARENA",
    slug: "complexo-sports",
    endereco: "Rua dos Esportes, 123",
    telefone: "(11) 99999-9999",
  },
  "arena-central": {
    nome: "ARENA CENTRAL",
    slug: "arena-central",
    endereco: "Av. Principal, 456",
    telefone: "(11) 98888-8888",
  },
};

const MODALIDADES_BASE = [
  { id: "society", nome: "FUTEBOL SOCIETY", quadras: ["Q. 01", "Q. 02"] },
  { id: "volei", nome: "VÔLEI", quadras: ["Q. 02", "Q. 04"] },
  { id: "futevolei", nome: "FUTEVÔLEI", quadras: ["Q. 03"] },
  { id: "beach_tennis", nome: "BEACH TENNIS", quadras: ["Q. 03", "Q. 04"] },
];

const CLIENTES_MOCK = [
  "JOÃO", "CARLOS", "ANA", "PEDRO", "MARIANA", "ROBERTO", "FERNANDA",
  "PATRÍCIA", "RICARDO", "BRUNO", "LUCAS", "GABRIELA", "JÚLIA", "THIAGO",
  "RAFA", "BIA", "DANI", "VINI", "MANU", "LETÍCIA"
];

const HORARIOS_TELAO = Array.from({ length: 12 }, (_, i) =>
  `${(i + 8).toString().padStart(2, "0")}:00`
);

function gerarScheduleMock(slug: string): ModalitySchedule[] {
  const seedBase = slug.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return MODALIDADES_BASE.map((mod, modIdx) => {
    const grid: ModalitySchedule["grid"] = {};
    HORARIOS_TELAO.forEach((horario, hIdx) => {
      grid[horario] = {};
      mod.quadras.forEach((quadra, qIdx) => {
        const seed = seedBase + modIdx * 17 + hIdx * 7 + qIdx * 3;
        const rnd = (Math.sin(seed) * 10000) % 1;
        const norm = (rnd + 1) / 2;
        const horarioNum = parseInt(horario.split(":")[0]);
        const ehForaPico = horarioNum < 10 || horarioNum >= 20;

        let status: BookingStatus;
        let cliente: string | undefined;

        if (norm < 0.12 || (ehForaPico && norm < 0.25)) status = "blocked";
        else if (norm < 0.55) {
          status = "reserved";
          const idx = Math.floor(((Math.cos(seed + 3.14) + 1) / 2) * CLIENTES_MOCK.length);
          cliente = CLIENTES_MOCK[idx % CLIENTES_MOCK.length];
        } else status = "available";

        grid[horario][quadra] = { status, cliente };
      });
    });
    return { id: mod.id, nome: mod.nome, quadras: mod.quadras, horarios: HORARIOS_TELAO, grid };
  });
}

/* =========================================================
   PÁGINA PRINCIPAL DO TELÃO
   ========================================================= */

export default function TelaoPage() {
  const params = useParams();
  const slug = (params?.slug as string) || "complexo-sports";
  const complexo = COMPLEXOS[slug] || COMPLEXOS["complexo-sports"];
  const mounted = useMounted();

  const now = useRealTimeClock();
  const { schedule, ultimaAtualizacao, forcarAtualizacao } = useLiveSchedule(slug);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement && containerRef.current) {
        await containerRef.current.requestFullscreen();
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {}
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const dataStr = now ? formatarData(now) : "--/--/----";
  const horaStr = now ? formatarHora(now) : "--:--:--";
  const horaAtual = now ? now.getHours() : -1;

  return (
    <div
      ref={containerRef}
      className="h-screen w-screen bg-[#0b0f17] text-white overflow-hidden relative select-none"
      style={{
        background:
          "radial-gradient(1100px 700px at 15% -10%, rgba(255,130,33,0.10), transparent 60%)," +
          "radial-gradient(900px 600px at 110% 110%, rgba(255,130,33,0.08), transparent 60%)," +
          "linear-gradient(180deg, #0b0f17 0%, #0a0e15 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* LAYOUT FIXO EM 100VH */}
      <div className="relative mx-auto w-full h-full max-w-[1800px] px-6 py-4 flex flex-col gap-3">
        {/* HEADER */}
        <header className="flex items-center justify-between gap-4 pb-3 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <div
              className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl flex items-center justify-center shadow-xl flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #FF8221 0%, #FF4D1D 100%)" }}
            >
              <Building2 size={28} className="text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl lg:text-[32px] font-black tracking-tight leading-tight truncate">
                {complexo.nome}
              </h1>
              <p className="text-white/50 text-sm lg:text-base font-semibold tracking-wide uppercase">
                Sinalização Digital
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 lg:gap-4 flex-shrink-0">
            <DateTimeBox icon={<Calendar size={20} />} label="DATA" value={dataStr} />
            <DateTimeBox icon={<Clock size={20} />} label="HORA" value={horaStr} highlight />
            <div className="flex items-center gap-1.5">
              <button
                onClick={forcarAtualizacao}
                title="Atualizar"
                className="w-11 h-11 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white flex items-center justify-center transition-all"
              >
                <RefreshCw size={20} />
              </button>
              <button
                onClick={toggleFullscreen}
                title={isFullscreen ? "Sair tela cheia" : "Tela cheia"}
                className="w-11 h-11 rounded-xl bg-[#FF8221] hover:bg-[#ff9241] text-white flex items-center justify-center transition-all shadow-[0_6px_18px_rgba(255,130,33,0.4)]"
              >
                {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
              </button>
            </div>
          </div>
        </header>

        {/* TÍTULO CENTRAL */}
        <div className="text-center py-1 pb-0 flex-shrink-0">
          <h2
            className="text-3xl lg:text-[54px] font-black tracking-[0.28em] bg-clip-text text-transparent inline-block leading-none"
            style={{
              backgroundImage: "linear-gradient(180deg, #ffffff 0%, #ffffff 55%, #FF8221 140%)",
              textShadow: "0 2px 30px rgba(255,130,33,0.22)",
            }}
          >
            AGENDA DO DIA
          </h2>
          <p className="text-white/40 text-sm lg:text-lg font-bold tracking-[0.35em] uppercase mt-1">
            {dataStr}
          </p>
        </div>

        {/* TABELAS: flex-1 para ocupar espaço restante (min-height 0 é essencial!) */}
        <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
          {schedule.map((mod) => (
            <ScheduleTable key={mod.id} modality={mod} currentHour={horaAtual} />
          ))}
        </main>

        {/* LEGENDA + RODAPÉ */}
        <footer className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5 flex-shrink-0">
          <div className="flex items-center gap-3 lg:gap-6 flex-wrap">
            <LegendItem color="#16a34a" label="DISPONÍVEL" icon={<CheckCircle2 size={18} />} />
            <LegendItem color="#dc2626" label="RESERVADO" icon={<Users size={18} />} />
            <LegendItem color="#52525b" label="BLOQUEADO" icon={<AlertCircle size={18} />} />
          </div>

          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-2">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #FF8221 0%, #FF4D1D 100%)" }}
            >
              <Phone size={16} />
            </div>
            <div>
              <p className="text-[9px] lg:text-[10px] font-black text-white/50 uppercase tracking-widest">
                RESERVAS
              </p>
              <p className="text-lg lg:text-xl font-black text-white leading-none tracking-wide">
                {complexo.telefone}
              </p>
            </div>
          </div>

          {/* Watermark */}
          <div className="text-white/15 text-[10px] lg:text-xs font-bold uppercase tracking-widest whitespace-nowrap">
            {mounted ? (
              <>
                ATUALIZADO: {formatarDataHoraCurta(ultimaAtualizacao || new Date())}
              </>
            ) : (
              "CARREGANDO..."
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

/* =========================================================
   COMPONENTES
   ========================================================= */

function DateTimeBox({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-2 lg:px-5 lg:py-2.5 rounded-xl border backdrop-blur-sm",
        highlight
          ? "bg-[#FF8221]/12 border-[#FF8221]/40 shadow-[0_0_28px_rgba(255,130,33,0.18)]"
          : "bg-white/5 border-white/10"
      )}
    >
      <div
        className={cn(
          "w-9 h-9 lg:w-10 lg:h-10 rounded-xl flex items-center justify-center flex-shrink-0",
          highlight
            ? "bg-gradient-to-br from-[#FF8221] to-[#FF4D1D] text-white"
            : "bg-white/10 text-white/80"
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p
          className={cn(
            "text-[9px] lg:text-[10px] font-black uppercase tracking-widest mb-0",
            highlight ? "text-[#FF8221]" : "text-white/50"
          )}
        >
          {label}
        </p>
        <p
          className="text-lg lg:text-2xl font-black tabular-nums tracking-tight leading-none whitespace-nowrap"
          suppressHydrationWarning
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function ScheduleTable({
  modality,
  currentHour,
}: {
  modality: ModalitySchedule;
  currentHour: number;
}) {
  const quadraCount = modality.quadras.length;

  return (
    <section className="bg-white/[0.03] border border-white/10 rounded-2xl p-3 lg:p-4 backdrop-blur-sm shadow-[0_14px_60px_rgba(0,0,0,0.45)] flex flex-col min-h-0">
      <h3 className="text-lg lg:text-[28px] font-black tracking-widest text-[#FF8221] mb-2 pb-2 border-b border-white/10 flex items-center gap-3 flex-shrink-0">
        <span
          className="inline-block w-2 h-8 lg:h-10 rounded-full"
          style={{ background: "linear-gradient(180deg, #FF8221 0%, #FF4D1D 100%)" }}
        />
        {modality.nome}
      </h3>

      <div className="overflow-hidden rounded-xl border border-white/10 flex-1 min-h-0">
        <table className="w-full h-full border-collapse table-fixed">
          <thead className="flex-shrink-0 block bg-white/[0.04]">
            <tr className="flex w-full">
              <th
                className="flex items-center px-3 py-1.5 lg:px-4 lg:py-2 text-[10px] lg:text-xs font-black uppercase tracking-widest text-white/50 w-[90px] lg:w-[115px] flex-shrink-0"
                style={{ borderRight: "2px solid rgba(255,255,255,0.08)" }}
              >
                HORA
              </th>
              {modality.quadras.map((q) => (
                <th
                  key={q}
                  className="flex-1 text-center px-1.5 py-1.5 lg:px-2 lg:py-2 text-[10px] lg:text-xs font-black uppercase tracking-widest text-white/70 truncate"
                >
                  {q}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="block overflow-y-auto flex-1" style={{ height: "calc(100% - 30px)" }}>
            {modality.horarios.map((horario) => {
              const hNum = parseInt(horario.split(":")[0]);
              const isCurrent = hNum === currentHour;
              const isPast = hNum < currentHour;
              return (
                <tr
                  key={horario}
                  className={cn(
                    "flex w-full transition-all",
                    isCurrent && "bg-[#FF8221]/10 ring-1 ring-inset ring-[#FF8221]/50",
                    !isCurrent && isPast && "opacity-35"
                  )}
                  style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <td
                    className={cn(
                      "flex items-center px-3 py-1.5 lg:px-4 lg:py-2 text-base lg:text-xl font-black tracking-wider tabular-nums w-[90px] lg:w-[115px] flex-shrink-0",
                      isCurrent ? "text-[#FF8221] bg-white/[0.03]" : isPast ? "text-white/40" : "text-white/80"
                    )}
                    style={{ borderRight: "2px solid rgba(255,255,255,0.08)" }}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {isCurrent && (
                        <span className="inline-block w-2 h-2 rounded-full bg-[#FF8221] animate-pulse shadow-[0_0_12px_rgba(255,130,33,0.8)] flex-shrink-0" />
                      )}
                      {horario}
                    </span>
                  </td>
                  {modality.quadras.map((quadra) => {
                    const cell = modality.grid[horario][quadra];
                    return (
                      <StatusCell
                        key={quadra}
                        cell={cell}
                        isCurrent={isCurrent}
                        quadras={quadraCount}
                      />
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StatusCell({
  cell,
  isCurrent,
}: {
  cell: BookingCell;
  isCurrent: boolean;
  quadras: number;
}) {
  const configs: Record<BookingStatus, {
    corBg: string;
    corBorda: string;
    corTexto: string;
    texto: string;
    bolinha: string;
  }> = {
    available: {
      corBg: "bg-emerald-500/8",
      corBorda: "border-emerald-500/30",
      corTexto: "text-emerald-400",
      texto: "LIVRE",
      bolinha: "bg-emerald-500",
    },
    reserved: {
      corBg: "bg-red-500/8",
      corBorda: "border-red-500/30",
      corTexto: "text-red-400",
      texto: cell.cliente || "RESERV.",
      bolinha: "bg-red-500",
    },
    blocked: {
      corBg: "bg-zinc-600/10",
      corBorda: "border-zinc-500/25",
      corTexto: "text-zinc-400",
      texto: "BLOQ.",
      bolinha: "bg-zinc-500",
    },
  };

  const cfg = configs[cell.status];

  return (
    <td
      className={cn(
        "flex-1 px-1.5 py-1 lg:px-2 lg:py-1.5 text-center flex items-center justify-center min-w-0",
        cfg.corBg
      )}
    >
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 lg:px-2.5 lg:py-1.5 w-full justify-center",
          cfg.corBorda,
          cfg.corBg,
          isCurrent && cell.status === "available" ? "ring-1 ring-emerald-500/50" : "",
          isCurrent && cell.status === "reserved" ? "ring-1 ring-red-500/50" : ""
        )}
      >
        <span
          className={cn(
            "w-2 h-2 rounded-full flex-shrink-0",
            cfg.bolinha,
            cell.status === "available" && "animate-pulse"
          )}
          style={{
            boxShadow:
              cell.status === "available"
                ? "0 0 8px 1px rgba(16,185,129,0.5)"
                : cell.status === "reserved"
                ? "0 0 8px 1px rgba(239,68,68,0.35)"
                : "none",
          }}
        />
        <span
          className={cn(
            "text-[11px] lg:text-sm font-black tracking-wide uppercase leading-none truncate",
            cfg.corTexto
          )}
        >
          {cfg.texto}
        </span>
      </div>
    </td>
  );
}

function LegendItem({
  color,
  label,
  icon,
}: {
  color: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-8 h-8 lg:w-9 lg:h-9 rounded-lg flex items-center justify-center border"
        style={{ backgroundColor: `${color}1A`, borderColor: `${color}55`, color }}
      >
        {icon}
      </div>
      <span
        className="text-xs lg:text-lg font-black tracking-widest uppercase whitespace-nowrap"
        style={{ color }}
      >
        {label}
      </span>
    </div>
  );
}

/* =========================================================
   UTILITÁRIOS
   ========================================================= */

function formatarData(d: Date): string {
  const raw = d.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return raw.replace(".", "").replace(/^./, (m) => m.toUpperCase());
}

function formatarHora(d: Date): string {
  return d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatarDataHoraCurta(d: Date): string {
  return (
    d.toLocaleDateString("pt-BR") +
    " " +
    d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  );
}
