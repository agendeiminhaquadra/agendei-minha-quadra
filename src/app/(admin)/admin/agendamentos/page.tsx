"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, User, Clock, CreditCard, AlignLeft, MapPin } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

// Tipos
type SlotStatus = 'available' | 'reserved' | 'blocked';

interface Reservation {
  id: string;
  courtId: string;
  date: string;
  startTime: string;
  endTime: string;
  clientName: string;
  modality: string;
  status: SlotStatus;
  value?: number;
  paymentMethod?: string;
  notes?: string;
}

interface Court {
  id: string;
  name: string;
}

// Dados Mockados
const timeSlots = Array.from({ length: 15 }, (_, i) => {
  const hour = i + 8;
  return `${hour.toString().padStart(2, '0')}:00`;
});

const courts: Court[] = [
  { id: "1", name: "QUADRA 01" },
  { id: "2", name: "QUADRA 02" },
  { id: "3", name: "QUADRA 03" },
  { id: "4", name: "QUADRA 04" },
];

const initialReservations: Reservation[] = [
  {
    id: "res-1",
    courtId: "1",
    date: "2026-09-22",
    startTime: "15:00",
    endTime: "16:00",
    clientName: "JOÃO SILVA",
    modality: "Futebol Society",
    status: "reserved",
    value: 120,
    paymentMethod: "pix",
  },
  {
    id: "res-2",
    courtId: "2",
    date: "2026-09-22",
    startTime: "10:00",
    endTime: "11:00",
    clientName: "Manutenção",
    modality: "N/A",
    status: "blocked",
    notes: "Manutenção preventiva na rede.",
  },
  {
    id: "res-3",
    courtId: "3",
    date: "2026-09-22",
    startTime: "18:00",
    endTime: "19:00",
    clientName: "CARLOS SOUZA",
    modality: "Futevôlei",
    status: "reserved",
    value: 70,
    paymentMethod: "cartao_credito",
  }
];

export default function AgendamentosPage() {
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations);
  
  // Modais de Estado
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  
  // Seleções
  const [selectedSlot, setSelectedSlot] = useState<{ court: Court; time: string } | null>(null);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

  /**
   * ARQUITETURA DE TEMPO REAL (Preparação):
   * Aqui seria implementado o hook de WebSockets (ex: Socket.io) ou 
   * subscriptions do Supabase/Firebase para ouvir mudanças na tabela de agendamentos.
   */
  useEffect(() => {
    // Exemplo conceitual:
    // const channel = supabase.channel('reservations').on('postgres_changes', 
    //   { event: '*', schema: 'public', table: 'reservations' }, 
    //   (payload) => { setReservations(current => updateList(current, payload.new)) }
    // ).subscribe();
    // return () => { supabase.removeChannel(channel) };
  }, []);

  // Helpers
  const getReservation = (courtId: string, time: string) => {
    return reservations.find(r => r.courtId === courtId && r.startTime === time);
  };

  const handleOpenNew = (court: Court, time: string) => {
    setSelectedSlot({ court, time });
    setIsNewModalOpen(true);
  };

  const handleOpenDetails = (res: Reservation) => {
    setSelectedReservation(res);
    setIsDetailsModalOpen(true);
  };

  const handleConfirmReservation = (e: React.FormEvent) => {
    e.preventDefault();
    // Lógica para salvar a reserva no backend seria aqui.
    // Atualizando o estado local para simulação:
    setIsNewModalOpen(false);
    alert("Reserva confirmada com sucesso!");
  };

  return (
    <div className="space-y-6">
      {/* Header e Navegação de Data */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        
        {/* Navegação de Dias */}
        <div className="flex items-center justify-center lg:justify-start flex-1">
          <Button variant="outline" size="sm" className="hidden sm:flex text-gray-500" icon={<ChevronLeft size={18} />}>
            Dia anterior
          </Button>
          <Button variant="outline" size="sm" className="sm:hidden text-gray-500 px-2">
            <ChevronLeft size={20} />
          </Button>

          <div className="flex flex-col items-center justify-center mx-4 sm:mx-8">
            <div className="text-xs sm:text-sm font-bold text-primary-orange uppercase tracking-widest mb-1">
              Terça-Feira
            </div>
            <div className="text-lg sm:text-2xl font-black text-dark uppercase tracking-wide">
              22 de Setembro de 2026
            </div>
          </div>

          <Button variant="outline" size="sm" className="hidden sm:flex text-gray-500 flex-row-reverse" icon={<ChevronRight size={18} />}>
            Dia seguinte
          </Button>
          <Button variant="outline" size="sm" className="sm:hidden text-gray-500 px-2">
            <ChevronRight size={20} />
          </Button>
        </div>

        {/* Filtros de Visão */}
        <div className="flex bg-gray-100 p-1.5 rounded-xl self-center lg:self-auto">
          <button className="px-5 py-2 rounded-lg bg-white shadow-sm text-sm font-bold text-dark transition-all">
            Hoje
          </button>
          <button className="px-5 py-2 rounded-lg text-gray-500 text-sm font-bold hover:text-dark transition-all">
            Dia
          </button>
          <button className="px-5 py-2 rounded-lg text-gray-500 text-sm font-bold hover:text-dark transition-all">
            Semana
          </button>
        </div>
      </div>

      {/* Grade da Agenda */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr>
                <th className="p-4 border-b border-r border-gray-100 bg-gray-50/50 w-24 text-center text-xs font-black text-gray-400 uppercase tracking-wider sticky left-0 z-10">
                  Horário
                </th>
                {courts.map(court => (
                  <th key={court.id} className="p-4 border-b border-r last:border-r-0 border-gray-100 bg-gray-50/50 text-center text-sm font-black text-dark uppercase tracking-wide w-1/4">
                    {court.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map(time => (
                <tr key={time} className="group/row">
                  <td className="p-3 border-b border-r border-gray-100 text-center text-sm font-bold text-gray-500 bg-gray-50/30 sticky left-0 z-10">
                    {time}
                  </td>
                  {courts.map(court => {
                    const res = getReservation(court.id, time);
                    
                    return (
                      <td key={`${court.id}-${time}`} className="border-b border-r last:border-r-0 border-gray-100 p-1.5 h-[104px] align-top relative">
                        {/* DISPONÍVEL */}
                        {!res && (
                          <div 
                            onClick={() => handleOpenNew(court, time)}
                            className="w-full h-full rounded-xl border-2 border-dashed border-transparent hover:border-green-300 hover:bg-green-50/50 flex items-center justify-center cursor-pointer transition-all group/cell"
                          >
                            <span className="text-green-600 text-xs font-bold opacity-0 group-hover/cell:opacity-100 flex items-center gap-1.5 transition-opacity">
                              <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div> 
                              DISPONÍVEL
                            </span>
                          </div>
                        )}

                        {/* RESERVADO */}
                        {res?.status === 'reserved' && (
                          <div 
                            onClick={() => handleOpenDetails(res)}
                            className="w-full h-full rounded-xl bg-red-50 border border-red-100 p-3 cursor-pointer hover:bg-red-100 transition-colors flex flex-col shadow-sm"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-black text-red-600 flex items-center gap-1.5 tracking-wider">
                                <div className="w-2 h-2 rounded-full bg-red-500"></div> 
                                RESERVADO
                              </span>
                            </div>
                            <div className="font-bold text-sm text-dark truncate uppercase tracking-tight">{res.clientName}</div>
                            <div className="text-xs font-medium text-red-900/60 truncate mt-0.5">{res.modality}</div>
                            <div className="text-[11px] font-bold text-gray-500 mt-auto pt-2 flex items-center gap-1">
                              <Clock size={12} /> {res.startTime} - {res.endTime}
                            </div>
                          </div>
                        )}

                        {/* BLOQUEADO */}
                        {res?.status === 'blocked' && (
                          <div className="w-full h-full rounded-xl bg-gray-100 border border-gray-200 p-3 flex flex-col items-center justify-center cursor-not-allowed">
                            <span className="text-xs font-black text-gray-500 flex items-center gap-1.5 tracking-wider">
                              <div className="w-2.5 h-2.5 rounded-full bg-gray-400"></div> 
                              BLOQUEADO
                            </span>
                            {res.notes && (
                              <span className="text-xs font-medium text-gray-400 mt-2 text-center line-clamp-2 px-2 leading-tight">
                                {res.notes}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Nova Reserva */}
      <Modal 
        isOpen={isNewModalOpen} 
        onClose={() => setIsNewModalOpen(false)}
        title="Nova Reserva"
      >
        <form onSubmit={handleConfirmReservation} className="space-y-4 mt-2">
          <div className="bg-orange-50/50 border border-orange-100 p-3 rounded-lg flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white rounded-md flex items-center justify-center text-primary-orange shadow-sm">
              <MapPin size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase">Local Selecionado</p>
              <p className="text-sm font-black text-dark">{selectedSlot?.court.name}</p>
            </div>
          </div>

          <Input label="Cliente" placeholder="Nome completo do cliente" autoFocus required />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Data" type="date" defaultValue="2026-09-22" required />
            <Select 
              label="Modalidade" 
              options={[
                { label: "Futebol Society", value: "society" },
                { label: "Vôlei", value: "volei" },
                { label: "Futevôlei", value: "futevolei" },
                { label: "Beach Tennis", value: "beach_tennis" },
              ]}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Horário Inicial" type="time" defaultValue={selectedSlot?.time} required />
            <Input 
              label="Horário Final" 
              type="time" 
              defaultValue={selectedSlot ? `${parseInt(selectedSlot.time.split(':')[0]) + 1}:00` : ''} 
              required 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Valor (R$)" type="number" step="0.01" placeholder="120.00" required />
            <Select 
              label="Forma de Pagamento" 
              options={[
                { label: "PIX", value: "pix" },
                { label: "Cartão de Crédito", value: "credito" },
                { label: "Cartão de Débito", value: "debito" },
                { label: "Dinheiro", value: "dinheiro" },
              ]}
            />
          </div>

          <Textarea label="Observação" placeholder="Informações adicionais (opcional)" />

          <div className="pt-4 mt-6 border-t border-gray-100 flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => setIsNewModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              CONFIRMAR RESERVA
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Detalhes da Reserva */}
      <Modal 
        isOpen={isDetailsModalOpen} 
        onClose={() => setIsDetailsModalOpen(false)}
        title="Detalhes da Reserva"
      >
        {selectedReservation && (
          <div className="space-y-6 mt-2">
            {/* Resumo Rápido */}
            <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                <User size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-dark uppercase">{selectedReservation.clientName}</h3>
                <p className="text-sm font-medium text-gray-500">{selectedReservation.modality}</p>
              </div>
            </div>

            {/* Informações */}
            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-1.5"><MapPin size={14}/> Quadra</p>
                <p className="text-sm font-bold text-dark">{courts.find(c => c.id === selectedReservation.courtId)?.name}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-1.5"><Clock size={14}/> Horário</p>
                <p className="text-sm font-bold text-dark">
                  {selectedReservation.startTime} às {selectedReservation.endTime}
                </p>
              </div>
              {selectedReservation.value && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-1.5"><CreditCard size={14}/> Valor</p>
                  <p className="text-sm font-bold text-dark">R$ {selectedReservation.value.toFixed(2).replace('.', ',')}</p>
                </div>
              )}
              {selectedReservation.paymentMethod && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-1.5"><AlignLeft size={14}/> Pagamento</p>
                  <p className="text-sm font-bold text-dark uppercase">{selectedReservation.paymentMethod}</p>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-gray-100 flex gap-3">
              <Button variant="danger" className="flex-1" onClick={() => setIsDetailsModalOpen(false)}>
                Cancelar Reserva
              </Button>
              <Button variant="secondary" className="flex-1" onClick={() => setIsDetailsModalOpen(false)}>
                Editar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
