import { getSaoPauloDateKey, getSaoPauloDayBounds } from "@/lib/utils";

export function isDateKey(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function resolveReportRange(fromValue?: string, toValue?: string) {
  const today = getSaoPauloDateKey();
  const currentMonthStart = `${today.slice(0, 7)}-01`;
  let from = isDateKey(fromValue) ? fromValue! : currentMonthStart;
  let to = isDateKey(toValue) ? toValue! : today;

  if (from > to) [from, to] = [to, from];

  const span = Math.floor(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000,
  );
  if (span > 365) {
    const limitedStart = new Date(`${to}T00:00:00.000Z`);
    limitedStart.setUTCDate(limitedStart.getUTCDate() - 365);
    from = limitedStart.toISOString().slice(0, 10);
  }

  return {
    from,
    to,
    start: getSaoPauloDayBounds(from).start,
    end: getSaoPauloDayBounds(to).end,
  };
}
