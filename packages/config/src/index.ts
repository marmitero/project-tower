/**
 * @tia/config — configuração centralizada de balanceamento.
 *
 * Master-Prompt.md §32: "Não espalhar `0.05` pelo código. Criar configuração
 * central." §105 lista "hardcodar probabilidades espalhadas" e "hardcodar
 * custos espalhados" como proibidos.
 *
 * Regra do projeto: nenhum sistema pode escrever aqui. Todo rebalanceamento
 * é uma edição de dados, não de código.
 */
export * from "./types.js";
export { config, default } from "./game.js";
export {
  account,
  team,
  xp,
  loot,
  searching,
  combat,
  economy,
  inventory,
} from "./game.js";
export { validateConfig, ConfigValidationError } from "./validate.js";
export { RARITY_ORDER, RARITY_MULTIPLIER, rarityMultiplier } from "./rarity.js";
// ⛔ P-002 / P-006 / P-001 / P-025 — catálogo PROVISÓRIO. Ver o aviso no topo.
export {
  classes,
  STARTER_HERO_CLASSES,
  enemies,
  EQUIPABLE_STATS,
  EQUIP_SLOTS,
  EQUIP_TEMPLATES,
} from "./catalog.js";
export type { ClassGrowth, HeroClassDef, EnemyDef, EnemyRole } from "./catalog.js";
