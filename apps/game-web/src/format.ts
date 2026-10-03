/**
 * Formatação de números para a UI (PT-BR). Com o teto de nível em 20.000,
 * vida/dano chegam a centenas de milhares — números crus não cabem no mobile
 * (§67/§68). A lógica NUNCA formata: isto é só apresentação.
 */

const COMPACT = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });
const FULL = new Intl.NumberFormat("pt-BR");

/** 1.234 → "1.234"; 12.345 → "12,3 mil"; 1.200.000 → "1,2 mi". */
export function formatCompact(value: number): string {
  return Math.abs(value) < 10_000 ? FULL.format(Math.round(value)) : COMPACT.format(value);
}

export function formatInt(value: number | bigint): string {
  return FULL.format(value);
}

/** Horas → "35 min", "4,1 h", "2,3 dias de jogo" (dias de 24 h corridas — não 4 h/dia). */
export function formatHours(hours: number): string {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 100) return `${hours.toFixed(1).replace(".", ",")} h`;
  return `${FULL.format(Math.round(hours))} h`;
}
