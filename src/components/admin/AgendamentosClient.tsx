"use client";

import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, User, Clock, MapPin, Plus, Calendar as CalendarIcon, Filter } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { Booking, Court, Customer, Modality, BookingStatus } from "@prisma/client";
import { BookingFormModal } from "./forms/BookingFormModal";

interface BookingWithDetails extends Booking {
  court: Court;
  customer: Customer;
  modality: Modality | null;
}

interface AgendamentosClientProps {
  initialBookings: BookingWithDetails[];
  courts: Court[];
  customers: Customer[];
  modalities: Modality[];
  selectedDate: string;
}

const timeSlots = Array.from({ length: 15 }, (_, i) => {
  const hour = i + 8;
  return `${hour.toString().padStart(2, '0')}:00`;
});

export function AgendamentosClient({ 
  initialBookings, 
  courts, 
  customers, 
  modalities,
  selectedDate: initialDate
}: AgendamentosClientProps) {
  const [date, setDate] = useState(initialDate);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ courtId: string; startTime: string } | null>(null);

  // Mapear opções para o modal
  const courtOptions = useMemo(() => courts.map(c => ({ 
    value: c.id, 
    label: `${c.name} (R$ ${c.pricePerHour}/h)` 
  })), [courts]);

  const customerOptions = useMemo(() => customers.map(c => ({ 
    value: c.id, 
    label: `${c.name} (${c.phone || 'Sem telefone'})` 
  })), [customers]);

  const modalityOptions = useMemo(() => modalities.map(m => ({ 
    value: m.id, 
    label: m.name 
  })), [modalities]);

  const handlePrevDay = () => {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    setDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    setDate(d.toISOString().split('T')[0]);
  };

  const handleSlotClick = (courtId: string, time: string) => {
    setSelectedSlot({ courtId, startTime: `${date}T${time}` });
    setIsModalOpen(true);
  };

  const getBookingForSlot = (courtId: string, time: string) => {
    return initialBookings.find(b => {
      const bTime = b.startTime.toISOString().split('T')[1].substring(0, 5);
      return b.courtId === courtId && bTime === time;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-dark">Agenda de Quadras</h1>
          <p className="text-text-secondary font-medium">Gerencie as reservas e ocupação do dia.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white p-1 rounded-2xl shadow-sm border border-border">
          <button 
            onClick={handlePrevDay}
            className="p-2 hover:bg-background rounded-xl transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="px-4 py-2 font-bold text-dark flex items-center gap-2">
            <CalendarIcon size={18} className="text-primary-orange" />
            {new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { 
              weekday: 'short', 
              day: '2-digit', 
              month: 'long' 
            })}
          </div>
          <button 
            onClick={handleNextDay}
            className="p-2 hover:bg-background rounded-xl transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="card-modern overflow-hidden">
        <div className="p-4 border-b border-border bg-background-light/30 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-status-confirmed" />
              <span className="text-[10px] font-bold text-text-secondary uppercase">Confirmado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-status-pending" />
              <span className="text-[10px] font-bold text-text-secondary uppercase">Pendente</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-border" />
              <span className="text-[10px] font-bold text-text-secondary uppercase">Bloqueado</span>
            </div>
          </div>
          
          <button 
            onClick={() => {
              setSelectedSlot(null);
              setIsModalOpen(true);
            }}
            className="btn-primary flex items-center gap-2 py-2 px-4 text-sm"
          >
            <Plus size={16} /> Nova Reserva
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-white border-b border-r border-border p-4 w-24 text-[10px] font-black text-text-secondary uppercase tracking-widest text-left">
                  Horário
                </th>
                {courts.map(court => (
                  <th key={court.id} className="border-b border-border p-4 min-w-[200px] text-left">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-orange-50 text-primary-orange flex items-center justify-center">
                        <MapPin size={14} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-dark tracking-tight">{court.name}</p>
                        <p className="text-[9px] font-bold text-text-secondary uppercase">{court.floorType || 'Sintético'}</p>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map(slot => (
                <tr key={slot} className="group hover:bg-background-light/20 transition-colors">
                  <td className="sticky left-0 z-10 bg-white border-r border-border p-4 font-black text-dark text-sm border-b border-border/50">
                    {slot}
                  </td>
                  {courts.map(court => {
                    const booking = getBookingForSlot(court.id, slot);
                    
                    if (booking) {
                      const isConfirmed = booking.status === "CONFIRMED";
                      const isPending = booking.status === "PENDING";
                      
                      return (
                        <td key={court.id} className="p-2 border-b border-border/50">
                          <div className={cn(
                            "rounded-2xl p-3 border-l-4 shadow-sm transition-all hover:shadow-md cursor-pointer",
                            isConfirmed ? "bg-green-50 border-status-confirmed" :
                            isPending ? "bg-yellow-50 border-status-pending" :
                            "bg-gray-50 border-gray-300"
                          )}>
                            <div className="flex justify-between items-start mb-1">
                              <p className="text-xs font-black text-dark truncate">
                                {booking.customerNameSnapshot.toUpperCase()}
                              </p>
                              <span className={cn(
                                "text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase",
                                isConfirmed ? "bg-status-confirmed/10 text-status-confirmed" :
                                isPending ? "bg-status-pending/10 text-status-pending" :
                                "bg-gray-200 text-gray-500"
                              )}>
                                {booking.status === "CONFIRMED" ? "OK" : "P"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-text-secondary">
                              <span className="bg-white/50 px-1.5 py-0.5 rounded-lg border border-border/50">
                                {booking.modality?.name || 'Livre'}
                              </span>
                              <span>{formatCurrency(booking.totalPrice)}</span>
                            </div>
                          </div>
                        </td>
                      );
                    }

                    return (
                      <td 
                        key={court.id} 
                        className="p-2 border-b border-border/50 cursor-pointer"
                        onClick={() => handleSlotClick(court.id, slot)}
                      >
                        <div className="h-16 border-2 border-dashed border-border/40 rounded-2xl flex items-center justify-center group-hover:border-primary-orange/20 transition-all">
                          <Plus size={16} className="text-border opacity-0 group-hover:opacity-100 group-hover:text-primary-orange transition-all" />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <BookingFormModal 
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initial={selectedSlot ? { courtId: selectedSlot.courtId, startTime: selectedSlot.startTime } : undefined}
        quadras={courtOptions}
        clientes={customerOptions}
        modalities={modalityOptions}
      />
    </div>
  );
}
