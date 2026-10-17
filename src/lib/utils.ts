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

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function getSaoPauloDayBounds(date: string) {
  const start = new Date(`${date}T00:00:00-03:00`);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1) };
}

export function getSaoPauloDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const fields = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${fields.year}-${fields.month}-${fields.day}`;
}

export function formatSaoPauloTime(date: Date) {
  return date.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
}
