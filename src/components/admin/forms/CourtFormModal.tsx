"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { createCourtAction, createModalityAction, updateCourtAction } from "@/app/(admin)/admin/actions";
import { Court, Modality } from "@prisma/client";
import { Plus, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";

interface CourtFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  modalities: Modality[];
  initial?: Court;
}

export function CourtFormModal({ isOpen, onClose, modalities, initial }: CourtFormModalProps) {
  const router = useRouter();
  const isEditing = Boolean(initial);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableModalities, setAvailableModalities] = useState(modalities);
  const [showModalityForm, setShowModalityForm] = useState(modalities.length === 0);
  const [selectedModalityId, setSelectedModalityId] = useState(initial?.modalityId || "");
  const [modalityName, setModalityName] = useState("");
  const [modalityPrice, setModalityPrice] = useState("120");
  const [modalityError, setModalityError] = useState<string | null>(null);
  const [isCreatingModality, setIsCreatingModality] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    
    try {
      const res = isEditing ? await updateCourtAction(formData) : await createCourtAction(formData);
      if (res.success) {
        onClose();
        (e.target as HTMLFormElement).reset();
        router.refresh();
      } else {
        setError(res.error || "Erro ao salvar quadra.");
      }
    } catch (err) {
      setError("Ocorreu um erro inesperado.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateModality() {
    setModalityError(null);
    setIsCreatingModality(true);
    try {
      const result = await createModalityAction(modalityName, Number(modalityPrice));
      if ("error" in result) {
        setModalityError(result.error || "Não foi possível cadastrar a modalidade.");
        return;
      }
      setAvailableModalities((current) => [...current, result.modality]);
      setSelectedModalityId(result.modality.id);
      setModalityName("");
      setShowModalityForm(false);
    } catch {
      setModalityError("Ocorreu um erro ao cadastrar a modalidade.");
    } finally {
      setIsCreatingModality(false);
    }
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={isEditing ? "Editar Quadra" : "Nova Quadra"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {initial && <input type="hidden" name="id" value={initial.id} />}
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
            defaultValue={initial?.name}
            required 
            autoFocus
          />
          
          <Select 
            label="Modalidade Principal" 
            name="modalityId" 
            required={availableModalities.length > 0}
            value={selectedModalityId}
            onChange={(event) => setSelectedModalityId(event.target.value)}
            options={[
            { label: availableModalities.length ? "Selecione..." : "Cadastre uma modalidade primeiro", value: "" },
              ...availableModalities.map(m => ({ label: m.name, value: m.id }))
            ]}
          />
        </div>

        <div className="-mt-2">
          {!showModalityForm ? (
            <button type="button" onClick={() => setShowModalityForm(true)} className="inline-flex items-center gap-1.5 text-sm font-bold text-primary-orange hover:underline">
              <Plus size={16} /> Cadastrar modalidade
            </button>
          ) : (
            <div className="rounded-xl border border-orange-200 bg-orange-50/70 p-4">
              <div className="mb-3">
                <p className="font-bold text-dark">{availableModalities.length ? "Nova modalidade" : "Cadastre a primeira modalidade"}</p>
                <p className="mt-1 text-xs text-text-secondary">A modalidade será vinculada à sua empresa e ficará disponível para as quadras.</p>
              </div>
              {modalityError && <p className="mb-3 rounded-lg bg-red-50 p-2 text-xs font-semibold text-red-700">{modalityError}</p>}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px_auto] sm:items-end">
                <Input label="Nome da modalidade" value={modalityName} onChange={(event) => setModalityName(event.target.value)} placeholder="Ex.: Futebol Society" />
                <Input label="Preço por hora (R$)" type="number" min="0" max="100000" step="0.01" value={modalityPrice} onChange={(event) => setModalityPrice(event.target.value)} />
                <Button type="button" variant="primary" disabled={isCreatingModality || modalityName.trim().length < 2} onClick={handleCreateModality}>
                  {isCreatingModality ? "Salvando..." : "Adicionar"}
                </Button>
              </div>
            </div>
          )}
        </div>

        <Textarea 
          label="Descrição" 
          name="description" 
          placeholder="Detalhes da quadra (cobertura, tipo de piso, etc.)"
          defaultValue={initial?.description || ""}
        />

        <Input label="Tipo de piso" name="floorType" placeholder="Ex.: Sintético" defaultValue={initial?.floorType || "Sintético"} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input 
            label="Preço por Hora" 
            name="pricePerHour" 
            type="number" 
            step="0.01" 
            placeholder="0.00"
            defaultValue={initial?.pricePerHour}
            required
          />
          <Input 
            label="Duração Padrão (min)" 
            name="defaultDurationMinutes" 
            type="number" 
            defaultValue={String(initial?.defaultDurationMinutes || 60)}
            required
          />
          <Input 
            label="Capacidade" 
            name="capacity" 
            type="number" 
            defaultValue={String(initial?.capacity || 10)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input 
            label="Horário Inicial" 
            name="startTime" 
            type="time" 
            defaultValue={initial?.startTime || "08:00"}
            required
          />
          <Input 
            label="Horário Final" 
            name="endTime" 
            type="time" 
            defaultValue={initial?.endTime || "23:00"}
            required
          />
        </div>

        <div className="flex items-center gap-6 p-4 bg-background rounded-xl">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="isCovered" defaultChecked={initial?.isCovered} className="w-4 h-4 accent-primary-orange" />
            <span className="text-sm font-bold text-dark">Quadra Coberta</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="hasLighting" defaultChecked={initial?.hasLighting ?? true} className="w-4 h-4 accent-primary-orange" />
            <span className="text-sm font-bold text-dark">Possui Iluminação</span>
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting || availableModalities.length === 0}>
            {isSubmitting ? "Salvando..." : isEditing ? "Salvar Alterações" : "Salvar Quadra"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
