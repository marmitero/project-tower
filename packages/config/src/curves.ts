/**
 * Curvas como DADO (ADR-022 — arquitetura "admin-ready").
 *
 * Uma curva é um objeto JSON-serializável, nunca uma função. É isso que
 * permite que o painel administrativo (FASE 14, `docs/ADMIN_PANEL.md`) edite
 * XP, recompensas e dificuldade sem tocar em código: ele grava os 3 números
 * de uma `PowerCurve` e o jogo reavalia.
 *
 *   valor(x) = floor( base × (x + offset) ^ exponent )
 *
 * - `x` é o nível (de quem recebe XP, ou do inimigo, conforme a curva).
 * - `offset` desloca o início: valores altos suavizam o começo (os primeiros
 *   níveis ficam mais lentos) sem alterar a inclinação lá em cima.
 * - `exponent` > 1 faz a curva acelerar: cada nível custa mais que o anterior
 *   (a "curva de XP mais lenta conforme sobe de nível").
 */

export interface PowerCurve {
  kind: "power";
  base: number;
  exponent: number;
  offset: number;
}

/** Hoje só existe `power`; a união existe para novos tipos entrarem sem quebrar o pack. */
export type CurveDef = PowerCurve;

export function evalCurve(curve: CurveDef, x: number): number {
  const v = curve.base * Math.pow(Math.max(0, x) + curve.offset, curve.exponent);
  return Math.max(0, Math.floor(v));
}

/** Erros legíveis de uma curva (usado por `validateConfig` e pelo pack). */
export function curveErrors(path: string, curve: unknown): string[] {
  const errors: string[] = [];
  if (typeof curve !== "object" || curve === null) return [`${path}: curva ausente`];
  const c = curve as Partial<PowerCurve>;
  if (c.kind !== "power") errors.push(`${path}.kind deve ser "power"`);
  if (typeof c.base !== "number" || !(c.base > 0)) errors.push(`${path}.base deve ser > 0`);
  if (typeof c.exponent !== "number" || !(c.exponent >= 0)) errors.push(`${path}.exponent deve ser >= 0`);
  if (typeof c.offset !== "number" || !(c.offset >= 0)) errors.push(`${path}.offset deve ser >= 0`);
  return errors;
}
