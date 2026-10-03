import React from "react";
import { Edit, Settings, Clock, DollarSign, Activity } from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface Court {
  id: string;
  name: string;
  modality: string;
  pricePerHour: number;
  startTime: string;
  endTime: string;
  status: "active" | "inactive";
  imageUrl?: string;
}

interface CourtCardProps {
  court: Court;
  onEdit?: (court: Court) => void;
  onSettings?: (court: Court) => void;
}

export function CourtCard({ court, onEdit, onSettings }: CourtCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col transition-all hover:shadow-md">
      {/* Imagem */}
      <div className="h-48 bg-gray-200 relative overflow-hidden">
        {court.imageUrl ? (
          <img 
            src={court.imageUrl} 
            alt={court.name} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
            <span className="text-sm">Sem foto</span>
          </div>
        )}
        <div className="absolute top-3 right-3">
          <span 
            className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm
              ${court.status === 'active' 
                ? 'bg-green-100 text-green-700' 
                : 'bg-gray-100 text-gray-700'
              }
            `}
          >
            <span className={`w-2 h-2 rounded-full ${court.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
            {court.status === 'active' ? 'Ativa' : 'Inativa'}
          </span>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-5 flex-1 flex flex-col">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-gray-900 mb-1">{court.name}</h3>
          <span className="inline-block px-2 py-1 bg-orange-50 text-orange-600 rounded text-xs font-medium mb-3">
            {court.modality}
          </span>
        </div>

        <div className="space-y-2 mb-6 flex-1">
          <div className="flex items-center text-sm text-gray-600 gap-2">
            <DollarSign size={16} className="text-gray-400" />
            <span>R$ {court.pricePerHour.toFixed(2).replace('.', ',')} / hora</span>
          </div>
          <div className="flex items-center text-sm text-gray-600 gap-2">
            <Clock size={16} className="text-gray-400" />
            <span>{court.startTime} - {court.endTime}</span>
          </div>
        </div>

        {/* Ações */}
        <div className="flex gap-2 pt-4 border-t border-gray-100">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            icon={<Edit size={16} />}
            onClick={() => onEdit?.(court)}
          >
            Editar
          </Button>
          <Button 
            variant="secondary" 
            size="sm" 
            className="flex-1"
            icon={<Settings size={16} />}
            onClick={() => onSettings?.(court)}
          >
            Config.
          </Button>
        </div>
      </div>
    </div>
  );
}
