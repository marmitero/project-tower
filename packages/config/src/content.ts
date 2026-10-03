/**
 * ContentPack — o contrato de CONTEÚDO editável (ADR-022).
 *
 * É o formato que o futuro Painel Administrativo (FASE 14, `docs/ADMIN_PANEL.md`)
 * lê, edita e grava, e que o jogo aplica DIRETAMENTE — sem código, sem IA:
 *
 *   painel → ContentPack (JSON) → `validateContentPack` → `applyContentPack` → jogo
 *
 * Princípios:
 *  1. 100% JSON-serializável (sem funções, sem referências circulares).
 *  2. Campos DERIVADOS (ex.: `growth` do inimigo) nunca entram no pack; são
 *     recompostos por `buildEnemy` — o editor mexe só nos dados-fonte.
 *  3. Validação ANTES de aplicar; aplicar é atômico (tudo ou nada).
 *  4. Aplicar muta os objetos vivos EM LUGAR (`config.tower.floors`, `enemies`,
 *     `config.xp.*`), então todo `import { enemies }` continua válido.
 *  5. Versionado (`schemaVersion`): pack antigo é migrado, nunca reinterpretado.
 *
 * Escopo atual (schema v4 = v3 + Bosses — FASE 12, ADR-027; v3 = v2 + Market, Bot/Hub e Offline — FASE 10+11, ADR-025/026): inimigos, andares, recompensas, curvas de XP e dificuldade
 * (v1) + equipamento (slots, templates, traços de arma, características, raridade, notas,
 * materiais, venda, requisito, tetos de efeito), drop (chance, tabela de raridade, forma do X),
 * mochila e aquisição de heróis (v2, FASE 9). Heróis/classes/skills/bosses entram nas fases
 * 10–12 (regra do ROADMAP: toda nova entidade de conteúdo nasce como dado de pack).
 *
 * Migração: pack v1 (sem os blocos novos) é aceito — `migrateContentPack` completa com os
 * padrões de fábrica. Nunca se reinterpreta em silêncio.
 */

import { config, defaultInventory, defaultLoot } from "./game.js";
import { curveErrors, type CurveDef } from "./curves.js";
import {
  ENEMY_ROLES,
  buildEnemy,
  defaultEnemySeeds,
  enemies,
  type EnemySeed,
} from "./enemies.js";
import { ATTRIBUTE_IDS } from "./attributes.js";
import { defaultEquipmentConfig, equipmentErrors, type EquipmentConfig } from "./equipment.js";
import { defaultHeroAcquisition, heroAcquisitionErrors, type HeroAcquisitionConfig } from "./acquisition.js";
import { RARITY_ORDER } from "./rarity.js";
import { bossErrors, defaultBossConfig, type BossConfig } from "./boss.js";
import { botErrors, defaultBotConfig, defaultMarketConfig, defaultOfflineConfig, marketErrors, offlineErrors, type BotConfig, type MarketConfig, type OfflineConfig } from "./market.js";
import type { InventoryConfig, LootConfig } from "./types.js";
import { CHARACTER_SHEET_KEYS } from "./catalog.js";
import { LEVEL_CAP, buildDefaultFloors, defaultTowerDifficulty, defaultTowerRewards, defaultXpCurve, type FloorDef, type TowerRewardsConfig } from "./tower.js";

export const CONTENT_PACK_SCHEMA_VERSION = 4;

export interface ContentPack {
  schemaVersion: typeof CONTENT_PACK_SCHEMA_VERSION;
  /** Rótulo livre ("padrão", "temporada 2", ...). */
  name: string;
  enemies: EnemySeed[];
  tower: {
    enemyStatMultiplier: number;
    enemyHpMultiplier: number;
    enemyAttackMultiplier: number;
    rewards: TowerRewardsConfig;
    floors: FloorDef[];
  };
  progression: {
    king: { levelCap: number; curve: CurveDef };
    hero: { levelCap: number; curve: CurveDef };
  };
  /** v2 — catálogo de equipamento (ADR-023). */
  equipment: EquipmentConfig;
  /** v2 — drop de equipamento: chance, tabela de raridade e forma do X (§32/§33/§36). */
  loot: PackLoot;
  /** v2 — mochila (⛔ P-016). */
  inventory: PackInventory;
  /** v2 — aquisição de heróis (ADR-024). */
  heroAcquisition: HeroAcquisitionConfig;
  /** v3 — Market do Rei: abas, poções, revives, caixas e preços (ADR-025). */
  market: MarketConfig;
  /** v3 — regras do Bot e do Hub (ADR-025). */
  bot: BotConfig;
  /** v3 — offline como simulação do online (ADR-026). */
  offline: OfflineConfig;
  /** v4 — Bosses da Arena: chefes, fases, tentativas e recompensas (ADR-027). */
  boss: BossConfig;
}

export type PackLoot = Pick<LootConfig, "equipmentChance" | "rarity"> & { x: Omit<LootConfig["x"], "independentPerAttribute"> };
export type PackInventory = Pick<InventoryConfig, "equipmentMaxItems" | "onFull" | "pageSize" | "defaultSort">;

const INVENTORY_SORTS = ["rarityDesc", "powerDesc", "qualityDesc", "levelDesc"];

export class ContentPackError extends Error {
  readonly errors: string[];
  constructor(errors: string[]) {
    super(`ContentPack inválido:\n  - ${errors.join("\n  - ")}`);
    this.name = "ContentPackError";
    this.errors = errors;
  }
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** Pack com os valores PADRÃO de fábrica (independente do estado vivo). */
export function defaultContentPack(): ContentPack {
  return {
    schemaVersion: CONTENT_PACK_SCHEMA_VERSION,
    name: "padrão",
    enemies: defaultEnemySeeds(),
    tower: {
      ...defaultTowerDifficulty(),
      rewards: defaultTowerRewards(),
      floors: buildDefaultFloors(),
    },
    progression: {
      king: { levelCap: LEVEL_CAP, curve: defaultXpCurve() },
      hero: { levelCap: LEVEL_CAP, curve: defaultXpCurve() },
    },
    ...defaultV2Blocks(),
    ...defaultV3Blocks(),
    ...defaultV4Blocks(),
  };
}

/** Blocos novos do schema v3 com os valores de fábrica. */
function defaultV3Blocks(): Pick<ContentPack, "market" | "bot" | "offline"> {
  return { market: defaultMarketConfig(), bot: defaultBotConfig(), offline: defaultOfflineConfig() };
}

/** Blocos novos do schema v4 com os valores de fábrica. */
function defaultV4Blocks(): Pick<ContentPack, "boss"> {
  return { boss: defaultBossConfig() };
}

/** Blocos novos do schema v2 com os valores de fábrica. */
function defaultV2Blocks(): Pick<ContentPack, "equipment" | "loot" | "inventory" | "heroAcquisition"> {
  const DEFAULT_LOOT = defaultLoot();
  const DEFAULT_INVENTORY = defaultInventory();
  return {
    equipment: defaultEquipmentConfig(),
    loot: {
      equipmentChance: DEFAULT_LOOT.equipmentChance,
      rarity: { ...DEFAULT_LOOT.rarity },
      x: (({ independentPerAttribute: _i, ...rest }) => ({ ...rest, shape: { ...rest.shape } }))(DEFAULT_LOOT.x),
    },
    inventory: {
      equipmentMaxItems: DEFAULT_INVENTORY.equipmentMaxItems,
      onFull: DEFAULT_INVENTORY.onFull,
      pageSize: DEFAULT_INVENTORY.pageSize,
      defaultSort: DEFAULT_INVENTORY.defaultSort,
    },
    heroAcquisition: defaultHeroAcquisition(),
  };
}

/**
 * Migra um pack de schema antigo para o atual. v1 → v2 → v3: completa os blocos novos com o
 * padrão de fábrica (o que o jogo já usava). Devolve cópia; entrada inválida passa sem mudança
 * (a validação reporta).
 */
export function migrateContentPack(input: unknown): unknown {
  if (typeof input !== "object" || input === null) return input;
  const pack = clone(input) as Record<string, unknown>;
  if (pack.schemaVersion === 1) {
    const d = defaultV2Blocks();
    for (const [k, v] of Object.entries(d)) if (pack[k] === undefined) pack[k] = v;
    pack.schemaVersion = 2;
  }
  // v2 → v3: Market, Bot e Offline; `heroAcquisition.fragmentsRequired` (FASE 10+11).
  if (pack.schemaVersion === 2) {
    const d = defaultV3Blocks();
    for (const [k, v] of Object.entries(d)) if (pack[k] === undefined) pack[k] = v;
    const acq = pack.heroAcquisition as Record<string, unknown> | undefined;
    if (acq && typeof acq === "object" && acq.fragmentsRequired === undefined) acq.fragmentsRequired = defaultHeroAcquisition().fragmentsRequired;
    pack.schemaVersion = 3;
  }
  // v3 → v4: Bosses da Arena (FASE 12).
  if (pack.schemaVersion === 3) {
    const d = defaultV4Blocks();
    for (const [k, v] of Object.entries(d)) if (pack[k] === undefined) pack[k] = v;
    pack.schemaVersion = 4;
  }
  return pack;
}

/** Exporta o conteúdo VIVO (o que o jogo está usando agora) como pack. */
export function exportContentPack(name = "exportado"): ContentPack {
  return clone({
    schemaVersion: CONTENT_PACK_SCHEMA_VERSION,
    name,
    enemies: enemies.map(({ growth: _growth, ...seed }) => seed),
    tower: {
      enemyStatMultiplier: config.tower.enemyStatMultiplier,
      enemyHpMultiplier: config.tower.enemyHpMultiplier,
      enemyAttackMultiplier: config.tower.enemyAttackMultiplier,
      rewards: config.tower.rewards,
      floors: config.tower.floors,
    },
    progression: {
      king: { levelCap: config.xp.king.levelCap, curve: config.xp.king.curve },
      hero: { levelCap: config.xp.hero.levelCap, curve: config.xp.hero.curve },
    },
    equipment: config.equipment,
    loot: {
      equipmentChance: config.loot.equipmentChance,
      rarity: config.loot.rarity,
      x: (({ independentPerAttribute: _i, ...rest }) => rest)(config.loot.x),
    },
    inventory: {
      equipmentMaxItems: config.inventory.equipmentMaxItems,
      onFull: config.inventory.onFull,
      pageSize: config.inventory.pageSize,
      defaultSort: config.inventory.defaultSort,
    },
    heroAcquisition: config.heroAcquisition,
    market: config.market,
    bot: config.bot,
    offline: config.offline,
    boss: config.boss,
  } satisfies ContentPack);
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Lista TODOS os problemas do pack (vazio = aplicável). Aceita `unknown` (JSON cru). */
export function validateContentPack(raw: unknown): string[] {
  const input = migrateContentPack(raw);
  const errors: string[] = [];
  const check = (cond: boolean, msg: string) => {
    if (!cond) errors.push(msg);
  };
  if (typeof input !== "object" || input === null) return ["pack deve ser um objeto"];
  const pack = input as Partial<ContentPack>;
  check(pack.schemaVersion === CONTENT_PACK_SCHEMA_VERSION, `schemaVersion deve ser ${CONTENT_PACK_SCHEMA_VERSION}`);
  check(typeof pack.name === "string", "name deve ser texto");

  // --- progressão -----------------------------------------------------------
  const prog = pack.progression;
  let cap = 0;
  if (!prog || !prog.king || !prog.hero) {
    errors.push("progression.king/hero ausentes");
  } else {
    for (const who of ["king", "hero"] as const) {
      const p = prog[who];
      check(isNum(p.levelCap) && Number.isInteger(p.levelCap) && p.levelCap >= 1, `progression.${who}.levelCap inválido`);
      errors.push(...curveErrors(`progression.${who}.curve`, p.curve));
    }
    cap = Math.max(prog.king.levelCap, prog.hero.levelCap);
  }

  // --- equipamento, drop, mochila e aquisição (v2) -----------------------------
  errors.push(...equipmentErrors(pack.equipment));
  errors.push(...heroAcquisitionErrors(pack.heroAcquisition));
  errors.push(...marketErrors(pack.market));
  errors.push(...botErrors(pack.bot, pack.market));
  errors.push(...offlineErrors(pack.offline));
  errors.push(...bossErrors(pack.boss, cap > 0 ? cap : undefined));
  const loot = pack.loot;
  if (!loot) errors.push("loot ausente");
  else {
    check(isNum(loot.equipmentChance) && loot.equipmentChance >= 0 && loot.equipmentChance <= 0.5, "loot.equipmentChance deve estar em [0, 0,5] (§30)");
    const sum = RARITY_ORDER.reduce((a, r) => a + (isNum(loot.rarity?.[r]) && loot.rarity[r] >= 0 ? loot.rarity[r] : NaN), 0);
    check(Math.abs(sum - 1) < 1e-6, `loot.rarity deve somar 1 (soma = ${sum})`);
    const x = loot.x;
    if (!x) errors.push("loot.x ausente");
    else {
      check(isNum(x.min) && x.min > 0 && isNum(x.max) && x.max >= x.min, "loot.x: min deve ser > 0 e max >= min");
      check(isNum(x.decimals) && Number.isInteger(x.decimals) && x.decimals >= 0 && x.decimals <= 4, "loot.x.decimals deve ser inteiro em [0, 4]");
      check(!!x.shape && isNum(x.shape.samples) && Number.isInteger(x.shape.samples) && x.shape.samples >= 1 && x.shape.samples <= 8 && isNum(x.shape.power) && x.shape.power > 0, "loot.x.shape inválido (samples 1–8, power > 0)");
    }
  }
  const inv = pack.inventory;
  if (!inv) errors.push("inventory ausente");
  else {
    check(isNum(inv.equipmentMaxItems) && Number.isInteger(inv.equipmentMaxItems) && inv.equipmentMaxItems > 0, "inventory.equipmentMaxItems deve ser inteiro > 0");
    check(inv.onFull === "autoSell" || inv.onFull === "discard", "inventory.onFull deve ser autoSell ou discard");
    check(isNum(inv.pageSize) && inv.pageSize > 0, "inventory.pageSize deve ser > 0");
    check(INVENTORY_SORTS.includes(inv.defaultSort), "inventory.defaultSort inválido");
  }

  // --- inimigos -------------------------------------------------------------
  const enemyIds = new Set<string>();
  if (!Array.isArray(pack.enemies) || pack.enemies.length === 0) {
    errors.push("enemies deve ser uma lista não vazia");
  } else {
    for (const [i, e] of pack.enemies.entries()) {
      const at = `enemies[${i}]${e && typeof e.id === "string" ? ` (${e.id})` : ""}`;
      if (!e || typeof e !== "object") {
        errors.push(`${at}: inválido`);
        continue;
      }
      check(typeof e.id === "string" && /^[a-z0-9_]+$/.test(e.id), `${at}: id deve ser [a-z0-9_]+`);
      check(!enemyIds.has(e.id), `${at}: id duplicado`);
      enemyIds.add(e.id);
      check(typeof e.name === "string" && e.name.length > 0, `${at}: name vazio`);
      check(ENEMY_ROLES.includes(e.role), `${at}: role inválido`);
      check(e.damageType === "physical" || e.damageType === "magic", `${at}: damageType inválido`);
      check(isNum(e.statMultiplier) && e.statMultiplier > 0, `${at}: statMultiplier deve ser > 0`);
      for (const a of ATTRIBUTE_IDS) {
        check(isNum(e.attributes?.[a]) && e.attributes[a] >= 0, `${at}: atributo ${a} inválido`);
      }
      for (const key of CHARACTER_SHEET_KEYS) {
        check(typeof e.assets?.sheets?.[key] === "string", `${at}: sprite ${key} ausente`);
      }
    }
  }

  // --- torre ----------------------------------------------------------------
  const tower = pack.tower;
  if (!tower) {
    errors.push("tower ausente");
    return errors;
  }
  for (const k of ["enemyStatMultiplier", "enemyHpMultiplier", "enemyAttackMultiplier"] as const) {
    check(isNum(tower[k]) && tower[k] > 0, `tower.${k} deve ser > 0`);
  }
  for (const k of ["kingXp", "heroXp", "coins"] as const) {
    errors.push(...curveErrors(`tower.rewards.${k}`, tower.rewards?.[k]));
  }
  if (!Array.isArray(tower.floors) || tower.floors.length === 0) {
    errors.push("tower.floors deve ser uma lista não vazia");
    return errors;
  }
  let prevMin = 0;
  for (const [i, f] of tower.floors.entries()) {
    const at = `floors[${i}] (andar ${i + 1})`;
    check(f.index === i + 1, `${at}: index deve ser ${i + 1} (contíguo)`);
    check(typeof f.name === "string" && f.name.length > 0, `${at}: name vazio`);
    check(isNum(f.minLevel) && f.minLevel >= 1, `${at}: minLevel inválido`);
    check(isNum(f.maxLevel) && f.maxLevel >= f.minLevel, `${at}: maxLevel < minLevel`);
    check(isNum(f.minLevel) && f.minLevel >= prevMin, `${at}: minLevel não pode ser menor que o do andar anterior`);
    prevMin = isNum(f.minLevel) ? f.minLevel : prevMin;
    check(isNum(f.enemyLevel) && f.enemyLevel >= 1, `${at}: enemyLevel inválido`);
    check(isNum(f.requiredKingLevel) && f.requiredKingLevel >= 1, `${at}: requiredKingLevel inválido`);
    if (cap > 0) check(f.requiredKingLevel <= cap, `${at}: requiredKingLevel acima do teto (${cap})`);
    check(!!f.visual && typeof f.visual.theme === "string", `${at}: visual.theme ausente`);
    check(
      !!f.visual && (f.visual.enemyTint === null || (isNum(f.visual.enemyTint) && f.visual.enemyTint >= 0 && f.visual.enemyTint <= 0xffffff)),
      `${at}: visual.enemyTint deve ser null ou 0xRRGGBB`,
    );
    if (!Array.isArray(f.pool) || f.pool.length === 0) {
      errors.push(`${at}: pool vazio`);
    } else {
      const seen = new Set<string>();
      for (const p of f.pool) {
        check(enemyIds.has(p.enemyId), `${at}: inimigo desconhecido "${p.enemyId}"`);
        check(!seen.has(p.enemyId), `${at}: inimigo repetido no pool "${p.enemyId}"`);
        seen.add(p.enemyId);
        check(isNum(p.weight) && p.weight > 0, `${at}: peso inválido para "${p.enemyId}"`);
      }
    }
  }
  return errors;
}

/**
 * Aplica o pack ao jogo. Valida primeiro (lança `ContentPackError`); se válido,
 * muta os objetos vivos em lugar. Retorna os ids de inimigos aplicados.
 */
export function applyContentPack(raw: unknown): void {
  const errors = validateContentPack(raw);
  if (errors.length > 0) throw new ContentPackError(errors);
  const pack = clone(migrateContentPack(raw) as ContentPack);

  enemies.splice(0, enemies.length, ...pack.enemies.map(buildEnemy));

  config.tower.enemyStatMultiplier = pack.tower.enemyStatMultiplier;
  config.tower.enemyHpMultiplier = pack.tower.enemyHpMultiplier;
  config.tower.enemyAttackMultiplier = pack.tower.enemyAttackMultiplier;
  Object.assign(config.tower.rewards, pack.tower.rewards);
  config.tower.floors.splice(0, config.tower.floors.length, ...pack.tower.floors);

  config.xp.king.levelCap = pack.progression.king.levelCap;
  config.xp.king.curve = pack.progression.king.curve;
  config.xp.hero.levelCap = pack.progression.hero.levelCap;
  config.xp.hero.curve = pack.progression.hero.curve;

  // v2 — muta em lugar: quem guardou `config.equipment`/`config.loot` continua válido.
  Object.assign(config.equipment, pack.equipment);
  config.loot.equipmentChance = pack.loot.equipmentChance;
  Object.assign(config.loot.rarity, pack.loot.rarity);
  Object.assign(config.loot.x, pack.loot.x);
  Object.assign(config.inventory, pack.inventory);
  Object.assign(config.heroAcquisition, pack.heroAcquisition);
  // v3
  Object.assign(config.market, pack.market);
  Object.assign(config.bot, pack.bot);
  Object.assign(config.offline, pack.offline);
  // v4 — a lista de chefes é substituída EM LUGAR (quem guardou `config.boss.bosses` continua válido).
  config.boss.bosses.splice(0, config.boss.bosses.length, ...pack.boss.bosses);
  const { bosses: _bosses, ...bossRules } = pack.boss;
  Object.assign(config.boss, bossRules);
}

/** Volta ao conteúdo de fábrica (útil em testes e no botão "restaurar padrão" do painel). */
export function resetContentToDefaults(): void {
  applyContentPack(defaultContentPack());
}
