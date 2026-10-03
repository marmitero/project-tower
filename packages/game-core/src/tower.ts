/**
 * Torre.
 *
 * §17/§79 — INVARIANTE CENTRAL: a Torre é SEMPRE 1 herói × 1 inimigo.
 * A equipe inteira não aparece. Ela é gerenciamento e progressão.
 *
 * §21/§55 — a regra de boss automático por andares foi ABOLIDA. Não existe
 * nesta estrutura nenhum caminho que produza um boss de andar, e aTowerFloor
 * tem `bossId: null` tipado como literal — não como `string | null`, que
 * permitiria a reintrodução por descuido.
 *
 * ⛔ P-005 — a estrutura e a curva da Torre não estão definidas. O que está
 * aqui é uma estrutura mínima: índice, nome, nível do inimigo e um ritmo de
 * XP/Coin linear. Os NUMEROS são provisórios e estão marcados.
 */

import type { CombatStats, Hero, King, RewardBundle, TowerFloor } from "@tia/contracts";
import { config, enemies as ENEMY_DEFS, type EnemyDef } from "@tia/config";
import type { CombatantSeed, SkillDef as EngineSkillDef } from "@tia/engine";
import { createBattle, type BattleState } from "@tia/engine";
import { newBattleId } from "./ids.js";
import { rollRewardBundle, type LootSource } from "./loot.js";
import type { Prng } from "@tia/engine";

/** Andar inicial. */
export const FIRST_FLOOR = 1;

export function floorIndexOf(currentFloor: number): number {
  return Math.max(FIRST_FLOOR, Math.floor(currentFloor));
}

/** Inimigo que aparece no andar. ⛔ P-006 provisório. */
export function enemyForFloor(floor: number): EnemyDef {
  const candidates = ENEMY_DEFS.filter((e) => floor >= e.minFloor && floor <= e.maxFloor);
  if (candidates.length > 0) return candidates[0]!;
  // Fora de faixa: usa o de maior `maxFloor` e escala por nível.
  const highest = ENEMY_DEFS.reduce((a, b) => (b.maxFloor > a.maxFloor ? b : a));
  return highest;
}

export function enemyStatsAtLevel(def: EnemyDef, level: number) {
  const n = Math.max(0, level - 1);
  return {
    hp: Math.floor(def.growth.hp + def.growth.hpPerLevel * n),
    attack: Math.floor(def.growth.attack + def.growth.attackPerLevel * n),
    specialAttack: Math.floor(def.growth.specialAttack + def.growth.specialAttackPerLevel * n),
    defense: Math.floor(def.growth.defense + def.growth.defensePerLevel * n),
    specialDefense: Math.floor(def.growth.specialDefense + def.growth.specialDefensePerLevel * n),
    critChance: def.growth.critChance,
    attackSpeed: def.growth.attackSpeed,
    speed: def.growth.speed,
  };
}

/** Nível do inimigo por andar. ⛔ P-005 provisório. */
export function enemyLevelForFloor(floor: number): number {
  return 1 + Math.floor((floor - 1) * 1.15);
}

export function describeFloor(floor: number): TowerFloor {
  const def = enemyForFloor(floor);
  return {
    index: floor,
    name: `${def.name} — Andar ${floor}`,
    // §46 — o requisito é o nível do REI, o nível da conta.
    requiredKingLevel: Math.max(1, Math.ceil(floor * 1.2)),
    enemyLevel: enemyLevelForFloor(floor),
    rewardBundleId: `tower:${floor}`,
    // §21/§55 — a Torre NÃO tem boss. O tipo é `null`, não `string | null`.
    bossId: null,
  };
}

/** ⛔ P-005 provisório — progressão de andares é linear. */
export function towerRewardsForFloor(floor: number): { kingXp: number; heroXp: number; coins: number } {
  return {
    kingXp: Math.floor(20 * Math.pow(floor, 1.35)),
    heroXp: Math.floor(50 * Math.pow(floor, 1.3)),
    coins: Math.floor(15 * Math.pow(floor, 1.25)),
  };
}

export class TowerLockedError extends Error {
  readonly requiredLevel: number;
  constructor(requiredLevel: number) {
    super(`Andar bloqueado: requer nível do Rei ${requiredLevel} (§46).`);
    this.name = "TowerLockedError";
    this.requiredLevel = requiredLevel;
  }
}

export class NoActiveHeroError extends Error {
  constructor() {
    super("Nenhum herói ativo (§19).");
    this.name = "NoActiveHeroError";
  }
}

export interface StartTowerBattleParams {
  king: King;
  hero: Hero;
  /** Stats finais do herói — base do nível + equipamento (§71). */
  heroStats: CombatStats;
  floor: number;
  seed: number;
  sequence: number;
  /** HP inicial da batalha (ADR-020 — HP persiste entre batalhas). */
  heroStartHp?: number;
  /** Skills do herói, já mapeadas para o engine (§56 — disparam sozinhas). */
  heroSkills?: EngineSkillDef[];
  /** Folhas de animação do herói e do inimigo (dicas de apresentação, §64). */
  heroSprites?: Record<string, string>;
}

/**
 * Monta e inicia a batalha da Torre.
 *
 * A assinatura é a própria invariante: recebe UM `hero`, não uma equipe.
 * Não existe como passar dois heróis aqui, e por isso a regra §17 não
 * depende de alguém lembrar de recortar a lista.
 *
 * Os stats finais chegam prontos, calculados por quem tem o inventário.
 * Passá-los evita estado global — um `setInventory()` de módulo faria a
 * mesma batalha dar resultados diferentes em dois testes, que é exatamente
 * o que §64 proíbe.
 */
export function startTowerBattle(params: StartTowerBattleParams): BattleState {
  const { king, hero, heroStats, floor, seed, sequence } = params;
  const info = describeFloor(floor);
  if (king.level < info.requiredKingLevel) throw new TowerLockedError(info.requiredKingLevel);

  const def = enemyForFloor(floor);
  const battleId = newBattleId(king.accountId, sequence, seed);

  const allySeed: CombatantSeed = {
    id: hero.id,
    name: hero.name,
    side: "ally",
    level: hero.level,
    stats: heroStats,
    startHp: params.heroStartHp,
    heroId: hero.id,
    sprites: params.heroSprites,
  };

  const enemySeed: CombatantSeed = {
    id: `enemy:${def.id}:${floor}`,
    name: def.name,
    side: "enemy",
    level: info.enemyLevel,
    stats: enemyStatsAtLevel(def, info.enemyLevel),
    enemyId: def.id,
    sprites: def.assets.sheets as unknown as Record<string, string>,
  };

  return createBattle({
    mode: "tower",
    battleId,
    seed,
    allySeed: [allySeed],
    enemySeed: [enemySeed],
    skills: params.heroSkills ? { [hero.id]: params.heroSkills } : {},
    config: config.combat,
  });
}

export interface ResolveTowerWinParams {
  floor: number;
  rng: Prng;
  accountId: string;
  itemIndexStart: number;
  createdAt: number;
}

/**
 * Recompensa de vitória na Torre.
 *
 * `fragmentClasses` NÃO é passado aqui, de propósito: §12 proíbe
 * fragmentos de inimigo comum da Torre. A ausência é a regra, não um
 * parâmetro com valor `false`.
 */
export function resolveTowerWin(params: ResolveTowerWinParams): RewardBundle {
  const rewards = towerRewardsForFloor(params.floor);
  return rollRewardBundle({
    rng: params.rng,
    accountId: params.accountId as never,
    itemIndexStart: params.itemIndexStart,
    source: { kind: "tower_enemy" },
    sourceLevel: enemyLevelForFloor(params.floor),
    kingXp: rewards.kingXp,
    heroXp: rewards.heroXp,
    coins: rewards.coins,
    createdAt: params.createdAt,
    bundleId: `tower:${params.floor}`,
  });
}

export function towerSource(): LootSource {
  return { kind: "tower_enemy" };
}
