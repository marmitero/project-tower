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
 * Escopo atual: inimigos, andares, recompensas, curvas de XP e dificuldade.
 * Heróis/classes/skills/itens/bosses entram no pack nas fases 9–12 (regra
 * registrada no ROADMAP: toda nova entidade de conteúdo nasce como dado de pack).
 */

import { config } from "./game.js";
import { curveErrors, type CurveDef } from "./curves.js";
import {
  ENEMY_ROLES,
  buildEnemy,
  defaultEnemySeeds,
  enemies,
  type EnemySeed,
} from "./enemies.js";
import { ATTRIBUTE_IDS } from "./attributes.js";
import { CHARACTER_SHEET_KEYS } from "./catalog.js";
import { LEVEL_CAP, buildDefaultFloors, defaultTowerDifficulty, defaultTowerRewards, defaultXpCurve, type FloorDef, type TowerRewardsConfig } from "./tower.js";

export const CONTENT_PACK_SCHEMA_VERSION = 1;

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
}

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
  };
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
  } satisfies ContentPack);
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Lista TODOS os problemas do pack (vazio = aplicável). Aceita `unknown` (JSON cru). */
export function validateContentPack(input: unknown): string[] {
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
export function applyContentPack(input: unknown): void {
  const errors = validateContentPack(input);
  if (errors.length > 0) throw new ContentPackError(errors);
  const pack = clone(input as ContentPack);

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
}

/** Volta ao conteúdo de fábrica (útil em testes e no botão "restaurar padrão" do painel). */
export function resetContentToDefaults(): void {
  applyContentPack(defaultContentPack());
}
