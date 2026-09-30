/**
 * Fórmulas de combate.
 *
 * §37: "A implementação matemática exata deve ficar centralizada. Nunca
 * duplicar fórmulas em componentes de UI." Este arquivo é o único lugar onde
 * essas fórmulas existem.
 *
 * As fórmulas foram reaproveitadas do repositório de referência (ADR-001,
 * decisão técnica Tipo B) e são coerentes com o Master-Prompt: o §36 exige X
 * individual por atributo de equipamento, e o §60 exige feedback visual
 * inequívoco, que depende de o dano ser auditável.
 */

import type { CombatStats } from "@tia/contracts";
import type { CombatConfig } from "@tia/config";

/**
 * Dano.
 *
 *   DanoBase  = PoderOfensivo × CoeficienteDaAção × 100 / (100 + DefesaAlvo)
 *   DanoFinal = max(1, floor(DanoBase × ModificadoresDeDano))
 *
 * A mitigação retorna com saturação: Defesa 100 → metade; Defesa 300 →
 * um quarto. Reduz retornos sem tornar defesa infinita.
 */
export function computeDamage(params: {
  offensivePower: number;
  coefficient: number;
  targetDefense: number;
  damageModifiers: number;
  config: CombatConfig;
}): { finalDamage: number; beforeMitigation: number; mitigatedPercent: number } {
  const { offensivePower, coefficient, targetDefense, damageModifiers, config } = params;

  const raw = offensivePower * coefficient;
  const beforeMitigation = (raw * config.defenseConstant) / (config.defenseConstant + targetDefense);
  const mitigated = beforeMitigation * damageModifiers;
  const finalDamage = Math.max(config.minDamage, Math.floor(mitigated));
  const mitigatedPercent = raw > 0 ? Math.min(100, (1 - beforeMitigation / raw) * 100) : 0;

  return { finalDamage, beforeMitigation, mitigatedPercent };
}

/**
 * Crítico.
 *
 * A chance efetiva é limitada por `critCap` (0.75). O multiplicador é 1.5.
 * O crítico multiplica o dano JÁ mitigado.
 */
export function rollCritical(params: {
  critChance: number;
  bonusFlatPercent: number;
  rngNext: number;
  config: CombatConfig;
}): { isCritical: boolean; effectiveChance: number } {
  const { critChance, bonusFlatPercent, rngNext, config } = params;
  const effectiveChance = Math.min(
    config.critCap,
    critChance + bonusFlatPercent / 100,
  );
  return { isCritical: rngNext < effectiveChance, effectiveChance };
}

/**
 * Intervalo entre ações.
 *
 *   intervalo = T₀ / (1 + IAS)
 *
 * IAS é limitado a [iasCapMin, iasCapMax] = [-0.5, +1.0], o que dá
 * intervalo de 4000ms a 1000ms. Isso impede loops extremos de ataque sem
 * remover builds de velocidade.
 */
export function actionIntervalMs(attackSpeed: number, config: CombatConfig): number {
  const ias = Math.min(config.iasCapMax, Math.max(config.iasCapMin, attackSpeed));
  return config.baseActionIntervalMs / (1 + ias);
}

/** Dano periódico ignora crítico (§66/ADR-001). */
export function dotDamage(params: {
  offensivePower: number;
  coefficient: number;
  targetDefense: number;
  config: CombatConfig;
}): number {
  const { offensivePower, coefficient, targetDefense, config } = params;
  const raw = offensivePower * coefficient;
  return Math.max(
    config.minDamage,
    Math.floor((raw * config.defenseConstant) / (config.defenseConstant + targetDefense)),
  );
}

/**
 * Poder total — métrica COMPARATIVA, não preditiva (§34/§38).
 *
 * Mesma fórmula aplicada aos 8 valores finais. NÃO inclui HP atual, buff
 * temporário, característica aleatória nem traço de arma: esses aparecem
 * separados no tooltip, para não sugerir previsão de combate que a métrica
 * não oferece.
 */
export function powerOf(stats: CombatStats): number {
  const critPP = stats.critChance * 100;
  const iasPP = stats.attackSpeed * 100;
  return (
    stats.attack +
    stats.specialAttack +
    0.75 * stats.defense +
    0.75 * stats.specialDefense +
    0.02 * stats.hp +
    1.5 * critPP +
    iasPP +
    0.5 * stats.speed
  );
}

/**
 * Nota — qualidade das rolagens, independente da raridade (§34/§35).
 *
 *   Nota% = média(x_i / maxX) × 100
 */
export function qualityGrade(xValues: readonly number[], maxX: number): {
  quality: number;
  grade: "S" | "A" | "B" | "C" | "D" | "E" | "F";
} {
  if (xValues.length === 0 || maxX <= 0) return { quality: 0, grade: "F" };
  const mean = xValues.reduce((a, b) => a + b, 0) / xValues.length;
  const quality = (mean / maxX) * 100;

  const grade =
    quality >= 90 ? "S"
    : quality >= 80 ? "A"
    : quality >= 70 ? "B"
    : quality >= 60 ? "C"
    : quality >= 50 ? "D"
    : quality >= 40 ? "E"
    : "F";

  return { quality, grade };
}

/** Divisão de XP entre membros da equipe (§20, §81). */
export function divideXp(totalXp: number, teamSize: number, split: Record<1 | 2 | 3, number>): number[] {
  const size = Math.min(3, Math.max(1, teamSize)) as 1 | 2 | 3;
  const share = split[size];
  const per = Math.floor(totalXp * share);
  const out = Array.from({ length: size }, () => per);
  // Remainder distribution: o XP que se perderia no floor é dado ao primeiro
  // membro. Perder XP por arredondamento é silencioso e injusto.
  const distributed = per * size;
  let remainder = totalXp - distributed;
  let i = 0;
  while (remainder > 0 && size > 0) {
    out[i % size] = out[i % size]! + 1;
    remainder -= 1;
    i += 1;
  }
  return out;
}
