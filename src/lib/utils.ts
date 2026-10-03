import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function buildWhatsAppLink(phone: string | null, message = "") {
  if (!phone) return "#";
  const cleaned = phone.replace(/\D/g, "");
  const base = `55${cleaned}`;
  const msg = encodeURIComponent(message || "Olá! Tudo bem? Vim do sistema Minha Quadra.");
  return `https://wa.me/${base}?text=${msg}`;
}

export function sanitizePhone(phone: string) {
  return phone
    .replace(/\D/g, "")
    .replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
}
