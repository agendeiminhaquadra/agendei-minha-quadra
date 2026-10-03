"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ActionResult = { success: boolean; message?: string; error?: string };

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidthClass = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidthClass?: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-dark/40 backdrop-blur-sm" />
      <div
        ref={dialogRef}
        className={cn(
          "relative bg-white w-full rounded-3xl border border-border shadow-xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-200",
          maxWidthClass,
        )}
      >
        <div className="flex items-start justify-between p-6 border-b border-border">
          <div>
            <h3 className="text-xl font-black text-dark tracking-tight">{title}</h3>
            {subtitle && <p className="text-sm text-text-secondary mt-1">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-text-secondary hover:bg-background-light hover:text-dark transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function SubmitButton({
  label = "Salvar",
  pending,
  disabled,
  variant = "primary",
}: {
  label?: string;
  pending: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "outline" | "danger";
}) {
  const variants = {
    primary: "bg-gradient-primary text-white hover:shadow-lg disabled:opacity-70",
    secondary: "bg-background-light text-dark hover:bg-orange-50",
    outline: "border border-border text-dark hover:bg-background-light",
    danger: "bg-red text-white hover:bg-red-600",
  };
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={cn(
        "flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all disabled:cursor-not-allowed",
        variants[variant],
      )}
    >
      {pending && <Loader2 size={16} className="animate-spin" />}
      {label}
    </button>
  );
}

export function FormFeedback({ result }: { result: ActionResult | null }) {
  if (!result) return null;
  const success = result.success;
  const message = success ? result.message : result.error;
  if (!message) return null;
  return (
    <div
      className={cn(
        "p-4 rounded-2xl flex items-start gap-3 mb-4 text-sm font-medium border",
        success
          ? "bg-green-50 text-status-confirmed border-green-100"
          : "bg-red-50 text-red border-red-100",
      )}
    >
      {success ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
      <span className="leading-relaxed">{message}</span>
    </div>
  );
}

export function useFormAction<T extends FormData>(
  action: (formData: T) => Promise<ActionResult>,
  onSuccess?: () => void,
) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  async function submit(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      const r = await action(formData as T);
      setResult(r);
      if (r.success) {
        setTimeout(() => {
          onSuccess?.();
        }, 800);
      }
    });
  }

  return { result, pending, submit, setResult };
}

export function Input({
  label,
  name,
  type = "text",
  placeholder,
  defaultValue,
  required,
  className,
  step,
  min,
  max,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string | number | null;
  required?: boolean;
  className?: string;
  step?: string | number;
  min?: string | number;
  max?: string | number;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="text-xs font-black text-text-secondary uppercase tracking-wider mb-1.5 block">
        {label} {required && <span className="text-red">*</span>}
      </span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue ?? undefined}
        required={required}
        step={step}
        min={min}
        max={max}
        className="w-full h-11 px-4 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-orange focus:border-transparent transition-all"
      />
    </label>
  );
}

export function Select({
  label,
  name,
  options,
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string | null;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black text-text-secondary uppercase tracking-wider mb-1.5 block">
        {label} {required && <span className="text-red">*</span>}
      </span>
      <select
        name={name}
        defaultValue={defaultValue ?? undefined}
        required={required}
        className="w-full h-11 px-4 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-orange focus:border-transparent transition-all cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Textarea({
  label,
  name,
  placeholder,
  defaultValue,
  rows = 3,
}: {
  label: string;
  name: string;
  placeholder?: string;
  defaultValue?: string | null;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black text-text-secondary uppercase tracking-wider mb-1.5 block">{label}</span>
      <textarea
        name={name}
        rows={rows}
        placeholder={placeholder}
        defaultValue={defaultValue ?? undefined}
        className="w-full px-4 py-3 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-orange focus:border-transparent transition-all resize-none"
      />
    </label>
  );
}

export function Checkbox({
  label,
  name,
  defaultChecked,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none p-3 bg-background-light/50 rounded-xl hover:bg-orange-50 transition-colors border border-transparent hover:border-orange-100">
      <input
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="w-4 h-4 accent-primary-orange cursor-pointer"
      />
      <span className="text-sm font-bold text-dark">{label}</span>
    </label>
  );
}
