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
 * A FORÇA de cada raridade (multiplicador, linhas de atributo) não mora aqui:
 * é dado de `equipment.rarity` (ADR-023, ⛔ P-033). A PROBABILIDADE (§33) fica
 * em `loot.rarity`. Chance e força são tabelas diferentes.
 */
