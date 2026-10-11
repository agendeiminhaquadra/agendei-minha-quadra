"use client";

import React, { useState } from "react";
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Eye,
  Power,
  DollarSign,
  Clock,
  Trophy,
  MapPin,
  CalendarCheck,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { Court, Modality, CourtStatus } from "@prisma/client";
import { CourtFormModal } from "./forms/CourtFormModal";

interface QuadrasClientProps {
  initialQuadras: (Court & { 
    modality: Modality | null;
    _count: { bookings: number };
  })[];
  modalities: Modality[];
  stats: Record<string, { hoje: number; receitaHoje: number }>;
}

const modalityColors: Record<string, { text: string; bg: string; border: string }> = {
  "Futebol Society": {
    text: "text-sport-futebol",
    bg: "bg-sport-futebol",
    border: "border-sport-futebol",
  },
  "Vôlei": {
    text: "text-sport-volei",
    bg: "bg-sport-volei",
    border: "border-sport-volei",
  },
  "Futevôlei": {
    text: "text-sport-futevolei",
    bg: "bg-sport-futevolei",
    border: "border-sport-futevolei",
  },
  "Beach Tennis": {
    text: "text-sport-beachTennis",
    bg: "bg-sport-beachTennis",
    border: "border-sport-beachTennis",
  },
};

function IconForModality({ name }: { name: string }) {
  const cls = "w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm";
  const style =
    name === "Futebol Society"
      ? "bg-sport-futebol"
      : name === "Vôlei"
        ? "bg-sport-volei"
        : name === "Futevôlei"
          ? "bg-sport-futevolei"
          : "bg-sport-beachTennis";

  return (
    <div className={cn(cls, style)}>
      <Trophy size={14} />
    </div>
  );
}

export function QuadrasClient({ initialQuadras, modalities, stats }: QuadrasClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filteredQuadras = initialQuadras.filter(q => {
    const matchesSearch = q.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         q.modality?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "" || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalAtivas = initialQuadras.filter((q) => q.isActive && q.status === "ACTIVE").length;
  const totalManutencao = initialQuadras.filter((q) => q.status === "MAINTENANCE").length;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-modern p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">Total de Quadras</p>
            <p className="text-3xl font-black text-dark mt-2">{initialQuadras.length}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-primary-orange flex items-center justify-center">
            <Trophy size={24} />
          </div>
        </div>
        <div className="card-modern p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">Ativas</p>
            <p className="text-3xl font-black text-status-confirmed mt-2">{totalAtivas}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-green-50 text-status-confirmed flex items-center justify-center">
            <MapPin size={24} />
          </div>
        </div>
        <div className="card-modern p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">Manutenção</p>
            <p className="text-3xl font-black text-status-pending mt-2">{totalManutencao}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-yellow-50 text-status-pending flex items-center justify-center">
            <Power size={24} />
          </div>
        </div>
      </div>

      <div className="card-modern">
        <div className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border">
          <div>
            <h3 className="text-xl font-black text-dark">Gestão de Quadras</h3>
            <p className="text-sm font-medium text-text-secondary mt-1">
              {filteredQuadras.length} quadras encontradas
            </p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="btn-primary flex items-center gap-2 py-2.5 px-5 whitespace-nowrap"
          >
            <Plus size={18} />
            Adicionar Quadra
          </button>
        </div>

        {/* Filters */}
        <div className="p-6 flex flex-col sm:flex-row gap-3 border-b border-border">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              placeholder="Buscar quadra, modalidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-plain w-full pl-11 text-sm"
            />
          </div>
          <select
            className="input-plain text-sm flex items-center gap-2 cursor-pointer whitespace-nowrap"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Status</option>
            <option value="ACTIVE">Ativa</option>
            <option value="MAINTENANCE">Manutenção</option>
            <option value="INACTIVE">Inativa</option>
          </select>
          <div className="input-plain flex items-center gap-2 text-sm cursor-pointer whitespace-nowrap">
            <Filter size={16} /> Filtros
          </div>
        </div>

        {/* Courts Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredQuadras.length === 0 && (
            <div className="col-span-full text-center py-16 text-text-secondary font-medium">
              Nenhuma quadra encontrada.
            </div>
          )}

          {filteredQuadras.map((q) => {
            const modalityName = q.modality?.name || "Indefinida";
            const qStats = stats[q.id] || { hoje: 0, receitaHoje: 0 };
            const isActive = q.isActive && q.status === "ACTIVE";

            return (
              <div
                key={q.id}
                className={cn(
                  "group border rounded-3xl overflow-hidden transition-all duration-300",
                  "border-border bg-white",
                  isActive
                    ? "hover:shadow-lg hover:-translate-y-1 hover:border-primary-orange/40"
                    : "opacity-75 bg-background-light/20",
                )}
              >
                <div className="flex items-center justify-between p-5 border-b border-border bg-background-light/40">
                  <div className="flex items-center gap-3">
                    <IconForModality name={modalityName} />
                    <div>
                      <h4 className="text-lg font-black text-dark tracking-tight">{q.name}</h4>
                      <p className="text-xs font-bold text-text-secondary uppercase">{modalityName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-text-secondary hover:text-dark hover:bg-background-light rounded-lg transition-colors">
                      <Eye size={16} />
                    </button>
                    <button className="p-2 text-text-secondary hover:text-primary-orange hover:bg-orange-50 rounded-lg transition-colors">
                      <Edit size={16} />
                    </button>
                    <button className="p-2 text-text-secondary hover:text-dark hover:bg-background-light rounded-lg transition-colors">
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {q.description && (
                    <p className="text-xs font-medium text-text-secondary leading-relaxed line-clamp-2">
                      {q.description}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-background-light/60 rounded-2xl p-3 flex items-center gap-2.5">
                      <DollarSign size={18} className="text-primary-orange shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-text-secondary uppercase leading-none">Preço / Hora</p>
                        <p className="text-sm font-black text-dark mt-1">{formatCurrency(q.pricePerHour)}</p>
                      </div>
                    </div>
                    <div className="bg-background-light/60 rounded-2xl p-3 flex items-center gap-2.5">
                      <Clock size={18} className="text-primary-orange shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-text-secondary uppercase leading-none">Horário</p>
                        <p className="text-sm font-black text-dark mt-1">{q.startTime} - {q.endTime}</p>
                      </div>
                    </div>
                    <div className="bg-background-light/60 rounded-2xl p-3 flex items-center gap-2.5">
                      <CalendarCheck size={18} className="text-primary-orange shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-text-secondary uppercase leading-none">Hoje</p>
                        <p className="text-sm font-black text-dark mt-1">{qStats.hoje} reservas</p>
                      </div>
                    </div>
                    <div className="bg-background-light/60 rounded-2xl p-3 flex items-center gap-2.5">
                      <DollarSign size={18} className="text-status-confirmed shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-text-secondary uppercase leading-none">Receita Hoje</p>
                        <p className="text-sm font-black text-status-confirmed mt-1">{formatCurrency(qStats.receitaHoje)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        isActive ? "bg-status-confirmed shadow-[0_0_8px_rgba(22,163,74,0.4)]" : "bg-status-pending"
                      )} />
                      <span className="text-[10px] font-bold text-dark uppercase tracking-wider">
                        {q.status === "ACTIVE" ? "Ativa" : q.status === "MAINTENANCE" ? "Em Manutenção" : "Inativa"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-text-secondary text-[10px] font-bold uppercase tracking-widest">
                      {q.isCovered && <span className="bg-info-light text-info px-2 py-0.5 rounded-full">Coberta</span>}
                      {q.hasLighting && <span className="bg-yellow-50 text-warning px-2 py-0.5 rounded-full">Luz</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <CourtFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        modalities={modalities}
      />
    </div>
  );
}
