"use client";

import { CustomerStatus } from "@prisma/client";
import { useState } from "react";
import {
  Modal,
  Input,
  Select,
  Textarea,
  Checkbox,
  SubmitButton,
  FormFeedback,
  useFormAction,
} from "@/components/admin/forms/FormPrimitives";
import { createCustomerAction, updateCustomerAction } from "@/app/(admin)/admin/actions";

export type CustomerFormInitial = {
  id?: string;
  name?: string;
  email?: string | null;
  phone?: string | null;
  cpf?: string | null;
  status?: CustomerStatus;
  isVip?: boolean;
  notes?: string | null;
};

export function CustomerFormModal({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: CustomerFormInitial;
}) {
  const isEdit = !!initial?.id;
  const action = isEdit ? updateCustomerAction : createCustomerAction;
  const { result, pending, submit, setResult } = useFormAction(action, () => {
    onClose();
  });

  function handleClose() {
    if (pending) return;
    setResult(null);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isEdit ? "Editar Cliente" : "Adicionar Novo Cliente"}
      subtitle={isEdit ? `Atualizando dados de ${initial?.name}` : "Preencha os dados do novo cliente"}
    >
      <form action={submit} className="p-6 space-y-5">
        {initial?.id && <input type="hidden" name="id" value={initial.id} />}
        <FormFeedback result={result} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Nome Completo" name="name" placeholder="Ex: João da Silva" required defaultValue={initial?.name} className="md:col-span-2" />
          <Input label="Telefone / WhatsApp" name="phone" placeholder="(11) 99999-0000" defaultValue={initial?.phone} />
          <Input label="E-mail" name="email" type="email" placeholder="email@exemplo.com" defaultValue={initial?.email} />
          <Input label="CPF" name="cpf" placeholder="000.000.000-00" defaultValue={initial?.cpf} />
          <Select
            label="Status"
            name="status"
            defaultValue={initial?.status || CustomerStatus.ATIVO}
            options={[
              { value: CustomerStatus.ATIVO, label: "✅ Ativo" },
              { value: CustomerStatus.INATIVO, label: "⏸️ Inativo" },
              { value: CustomerStatus.BLOQUEADO, label: "🚫 Bloqueado" },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Checkbox label="Cliente VIP" name="isVip" defaultChecked={initial?.isVip} />
        </div>

        <Textarea
          label="Observações"
          name="notes"
          placeholder="Anotações sobre este cliente (alergias, preferências, histórico...)"
          defaultValue={initial?.notes}
        />

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <button
            type="button"
            onClick={handleClose}
            disabled={pending}
            className="px-5 py-3 rounded-xl font-bold text-sm text-text-secondary hover:bg-background-light disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
          <SubmitButton pending={pending} label={isEdit ? "Salvar Alterações" : "Cadastrar Cliente"} />
        </div>
      </form>
    </Modal>
  );
}

export function useCustomerModal() {
  const [open, setOpen] = useState(false);
  const [initial, setInitial] = useState<CustomerFormInitial | undefined>(undefined);

  return {
    open,
    initial,
    create: () => {
      setInitial(undefined);
      setOpen(true);
    },
    edit: (cust: CustomerFormInitial) => {
      setInitial(cust);
      setOpen(true);
    },
    close: () => setOpen(false),
  };
}
