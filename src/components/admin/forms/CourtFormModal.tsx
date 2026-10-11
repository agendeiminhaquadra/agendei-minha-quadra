"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { createCourtAction } from "@/app/(admin)/admin/actions";
import { Modality } from "@prisma/client";
import { Trophy } from "lucide-react";

interface CourtFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  modalities: Modality[];
}

export function CourtFormModal({ isOpen, onClose, modalities }: CourtFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    
    try {
      const res = await createCourtAction(formData);
      if (res.success) {
        onClose();
        (e.target as HTMLFormElement).reset();
      } else {
        setError(res.error || "Erro ao salvar quadra.");
      }
    } catch (err) {
      setError("Ocorreu um erro inesperado.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Nova Quadra" 
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-danger-light text-danger text-sm font-bold rounded-lg border border-danger/20">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input 
            label="Nome da Quadra" 
            name="name" 
            placeholder="Ex: QUADRA 01" 
            required 
            autoFocus
          />
          
          <Select 
            label="Modalidade Principal" 
            name="modalityId" 
            required
          >
            <option value="">Selecione...</option>
            {modalities.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </Select>
        </div>

        <Textarea 
          label="Descrição" 
          name="description" 
          placeholder="Detalhes da quadra (cobertura, tipo de piso, etc.)" 
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input 
            label="Preço por Hora" 
            name="pricePerHour" 
            type="number" 
            step="0.01" 
            placeholder="0.00"
            required
          />
          <Input 
            label="Duração Padrão (min)" 
            name="defaultDurationMinutes" 
            type="number" 
            defaultValue="60"
            required
          />
          <Input 
            label="Capacidade" 
            name="capacity" 
            type="number" 
            defaultValue="10"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input 
            label="Horário Inicial" 
            name="startTime" 
            type="time" 
            defaultValue="08:00"
            required
          />
          <Input 
            label="Horário Final" 
            name="endTime" 
            type="time" 
            defaultValue="23:00"
            required
          />
        </div>

        <div className="flex items-center gap-6 p-4 bg-background rounded-xl">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="isCovered" className="w-4 h-4 accent-primary-orange" />
            <span className="text-sm font-bold text-dark">Quadra Coberta</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="hasLighting" defaultChecked className="w-4 h-4 accent-primary-orange" />
            <span className="text-sm font-bold text-dark">Possui Iluminação</span>
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Salvar Quadra
          </Button>
        </div>
      </form>
    </Modal>
  );
}
