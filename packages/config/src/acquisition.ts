/**
 * Aquisição de heróis pelo jogo (adendo de 2026-10-03, ADR-024).
 *
 * Os Reis (Boss, FASE 12) poderão dropar MAIS DE 1 herói do mesmo tipo, cada
 * um com raridade e atributos próprios. A regra do usuário: a aquisição é
 * BALANCEADA em raridade/qualidade/atributos **independente de classe/herói**.
 *
 * Como isso é garantido: UMA configuração, aplicada igual a toda classe.
 *  - a raridade sai da tabela `rarityChance` (§33 por padrão);
 *  - cada atributo da classe é multiplicado por um fator de `attributeRoll`
 *    (mesma distribuição para qualquer classe, em torno de 1,0);
 *  - a raridade multiplica os stats por `rarityStatMultiplier` — modesto de
 *    propósito (herói raro é melhor, não é outro jogo) e `uncommon` = 1,0,
 *    de modo que os heróis iniciais valem exatamente o que a Torre calibrou.
 *
 * Tudo dado puro e serializável — editável pelo Painel Admin (ADR-022).
 */

import type { Rarity } from "./types.js";

export interface HeroAcquisitionConfig {
  /** Raridade do herói inicial escolhido na criação (adendo: todos incomuns). */
  starterRarity: Rarity;
  /** Sorteio de raridade de um herói adquirido (soma 1). */
  rarityChance: Record<Rarity, number>;
  /** Multiplicador dos stats de combate por raridade (hp/ataques/defesas). */
  rarityStatMultiplier: Record<Rarity, number>;
  /**
   * Variação por atributo (0..1 → fator `min + (max−min) × u`), `u` sorteado
   * como média de `samples` uniformes (sino: variação extrema é rara).
   */
  attributeRoll: { min: number; max: number; samples: number };
}

export function defaultHeroAcquisition(): HeroAcquisitionConfig {
  return {
    starterRarity: "uncommon",
    rarityChance: { common: 0.5, uncommon: 0.3, rare: 0.15, epic: 0.04, legendary: 0.009, celestial: 0.001 },
    rarityStatMultiplier: { common: 0.94, uncommon: 1.0, rare: 1.06, epic: 1.12, legendary: 1.2, celestial: 1.3 },
    attributeRoll: { min: 0.85, max: 1.15, samples: 3 },
  };
}

export function heroAcquisitionErrors(a: unknown): string[] {
  const errors: string[] = [];
  if (typeof a !== "object" || a === null) return ["heroAcquisition ausente"];
  const c = a as Partial<HeroAcquisitionConfig>;
  const RARITIES: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary", "celestial"];
  const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
  if (!RARITIES.includes(c.starterRarity as Rarity)) errors.push("heroAcquisition.starterRarity inválida");
  let sum = 0;
  for (const r of RARITIES) {
    const ch = c.rarityChance?.[r];
    if (!isNum(ch) || ch < 0 || ch > 1) errors.push(`heroAcquisition.rarityChance.${r} deve estar em [0, 1]`);
    else sum += ch;
    const m = c.rarityStatMultiplier?.[r];
    if (!isNum(m) || m <= 0 || m > 3) errors.push(`heroAcquisition.rarityStatMultiplier.${r} deve estar em (0, 3]`);
  }
  if (Math.abs(sum - 1) > 1e-6) errors.push(`heroAcquisition.rarityChance deve somar 1 (soma = ${sum})`);
  const r = c.attributeRoll;
  if (!r || !isNum(r.min) || !isNum(r.max) || !isNum(r.samples)) errors.push("heroAcquisition.attributeRoll inválido");
  else {
    if (!(r.min > 0 && r.min <= 1 && r.max >= 1)) errors.push("heroAcquisition.attributeRoll: min deve estar em (0, 1] e max >= 1");
    if (!Number.isInteger(r.samples) || r.samples < 1 || r.samples > 8) errors.push("heroAcquisition.attributeRoll.samples deve ser inteiro em [1, 8]");
  }
  return errors;
}
