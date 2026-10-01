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
export { validateConfig, validateCatalog, ConfigValidationError } from "./validate.js";
export { RARITY_ORDER, RARITY_MULTIPLIER, rarityMultiplier } from "./rarity.js";
// ⛔ P-002 / P-006 / P-001 / P-025 — catálogo PROVISÓRIO (inserção genérica
// aprovada 2026-10-01). Ver o aviso no topo do `catalog.ts`.
export {
  classes,
  STARTER_HERO_CLASSES,
  enemies,
  charSheets,
  CHARACTER_SHEET_KEYS,
  EQUIPABLE_STATS,
  EQUIP_SLOTS,
  EQUIP_TEMPLATES,
} from "./catalog.js";
export { skills, skillsById, type SkillDef, type SkillTargeting, type SkillDamageType, type SkillTag } from "./skills.js";
export {
  HEROES,
  heroById,
  heroIdentityForClass,
  type HeroIdentityDef,
  type AcquisitionOrigin,
} from "./heroes.js";
export {
  growthFromAttributes,
  ATTRIBUTE_IDS,
  type CharacterAttributes,
  type AttributeId,
  type DerivedGrowth,
} from "./attributes.js";
export type {
  ClassGrowth,
  HeroClassDef,
  EnemyDef,
  EnemyRole,
  CharacterSheets,
  CharacterSheetKey,
  CharacterAssets,
  HeroAssets,
} from "./catalog.js";
