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
  tower,
} from "./game.js";
export { validateConfig, validateCatalog, ConfigValidationError } from "./validate.js";
export { RARITY_ORDER } from "./rarity.js";
// ⛔ P-002 / P-006 / P-001 / P-025 — catálogo PROVISÓRIO (inserção genérica
// aprovada 2026-10-01). Ver o aviso no topo do `catalog.ts`.
export {
  classes,
  STARTER_HERO_CLASSES,
  charSheets,
  CHARACTER_SHEET_KEYS,
  EQUIPABLE_STATS,
  EQUIP_SLOTS,
} from "./catalog.js";
export {
  enemies,
  enemyById,
  buildEnemy,
  defaultEnemySeeds,
  ENEMY_ROLES,
  ENEMY_ROLE_LABELS,
  type EnemyDef,
  type EnemySeed,
  type EnemyRole,
  type EnemyDamageType,
} from "./enemies.js";
export { evalCurve, curveErrors, type CurveDef, type PowerCurve } from "./curves.js";
export {
  FIRST_FLOOR_BANDS,
  UNIFORM_FLOOR_STEP,
  LEVEL_CAP,
  DEFAULT_POOL_PLAN,
  buildDefaultFloors,
  defaultTowerRewards,
  defaultTowerDifficulty,
  defaultXpCurve,
  type FloorDef,
  type FloorPoolEntry,
  type FloorVisual,
  type TowerConfig,
  type TowerRewardsConfig,
} from "./tower.js";
export {
  CONTENT_PACK_SCHEMA_VERSION,
  ContentPackError,
  defaultContentPack,
  exportContentPack,
  validateContentPack,
  applyContentPack,
  resetContentToDefaults,
  migrateContentPack,
  type ContentPack,
} from "./content.js";
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
  CharacterSheets,
  CharacterSheetKey,
  CharacterAssets,
  HeroAssets,
} from "./catalog.js";
export {
  GEAR_EFFECT_KINDS,
  GRADES,
  DEFAULT_SLOTS,
  defaultEquipmentConfig,
  defaultTemplates,
  defaultRarity,
  defaultGrades,
  defaultTiers,
  defaultUnits,
  defaultWeaponTraits,
  defaultFeatures,
  referenceStat,
  materialForLevel,
  equipmentErrors,
  gearEffectErrors,
  type GearEffect,
  type GearEffectKind,
  type WeaponTraitDef,
  type FeatureDef,
  type Grade,
  type GradeDef,
  type TierDef,
  type StatUnit,
  type ItemTemplate,
  type ItemTemplateStat,
  type EquipSlotDef,
  type RarityDef,
  type EquipmentConfig,
} from "./equipment.js";
export {
  defaultBossConfig,
  defaultBosses,
  bossErrors,
  BOSS_STATUS_IDS,
  BOSS_STATUS_LABELS,
  BOSS_STAT_KEYS,
  type BossDef,
  type BossConfig,
  type BossBotConfig,
  type BossSkillDef,
  type BossPhaseDef,
  type BossAttemptRule,
  type BossFragmentDrop,
  type BossRewards,
  type BossStatusId,
  type BossStatKey,
} from "./boss.js";
export {
  defaultMarketConfig,
  defaultMarketItems,
  defaultBotConfig,
  defaultOfflineConfig,
  marketErrors,
  botErrors,
  offlineErrors,
  priceErrors,
  type PriceDef,
  type ConsumableEffect,
  type ConsumableItemDef,
  type BoxItemDef,
  type BoxOutcome,
  type ShopItemDef,
  type MarketTabDef,
  type MarketConfig,
  type BotSettings,
  type BotConfig,
  type OfflineConfig,
} from "./market.js";
export {
  defaultHeroAcquisition,
  heroAcquisitionErrors,
  type HeroAcquisitionConfig,
} from "./acquisition.js";
