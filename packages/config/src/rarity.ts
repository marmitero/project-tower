import type { Rarity } from "./types.js";

export const RARITY_ORDER: readonly Rarity[] = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
  "celestial",
];

/**
 * Multiplicador de raridade aplicado à base do equipamento.
 *
 * §33 define a PROBABILIDADE de cada raridade (50/30/15/4/0,9/0,1) mas
 * NÃO define o quanto cada uma multiplica o poder do item. A tabela de
 * chance e a tabela de força são coisas diferentes: Legendary é 0,9% dos
 * drops e precisa ser forte o bastante para justificar ser raro.
 *
 * ⛔ P-033 (⛔ PENDENTE) — a razão entre as raridades é provisória. O
 * Master-Prompt não fixa estes números, e é por isso que eles vivem na
 * config e não no código. Um Celestial ×3.0 contra um Common ×1.0 é uma
 * decisão técnica, não uma regra do projeto.
 */
export const RARITY_MULTIPLIER: Record<Rarity, number> = {
  common: 1.0,
  uncommon: 1.2,
  rare: 1.5,
  epic: 2.0,
  legendary: 2.5,
  celestial: 3.0,
};

export function rarityMultiplier(rarity: Rarity): number {
  return RARITY_MULTIPLIER[rarity];
}
