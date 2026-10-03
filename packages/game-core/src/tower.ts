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
 * P-005/P-006/P-009 (ADR-021) — andares, inimigos e curvas vêm da config
 * (`config.tower`), que é dado puro editável (ADR-022). Nada neste arquivo
 * conhece um andar específico: tudo é lido de `FloorDef`.
 */

import type { CombatStats, Hero, King, RewardBundle, TowerFloor } from "@tia/contracts";
import { config, enemies as ENEMY_DEFS, evalCurve, type EnemyDef, type FloorDef } from "@tia/config";
import type { CombatantSeed, SkillDef as EngineSkillDef } from "@tia/engine";
import { createBattle, Prng, type BattleState } from "@tia/engine";
import { newBattleId } from "./ids.js";
import { rollRewardBundle, type LootSource } from "./loot.js";

/** Andar inicial. */
export const FIRST_FLOOR = 1;

/** Quantidade de andares definidos na config (editável via ContentPack). */
export function floorCount(): number {
  return config.tower.floors.length;
}

/** Normaliza qualquer número para um andar que existe (1..N). */
export function clampFloor(floor: number): number {
  const n = Number.isFinite(floor) ? Math.floor(floor) : FIRST_FLOOR;
  return Math.min(floorCount(), Math.max(FIRST_FLOOR, n));
}

export function floorIndexOf(currentFloor: number): number {
  return clampFloor(currentFloor);
}

/** Definição (dado puro) de um andar. Andar inexistente cai no mais próximo. */
export function floorDef(floor: number): FloorDef {
  return config.tower.floors[clampFloor(floor) - 1]!;
}

/** Todos os andares, na ordem. */
export function allFloors(): readonly FloorDef[] {
  return config.tower.floors;
}

/** Maior andar liberado para um nível de Rei (§46). Sempre >= 1. */
export function highestUnlockedFloor(kingLevel: number): number {
  let best = FIRST_FLOOR;
  for (const f of config.tower.floors) {
    if (kingLevel >= f.requiredKingLevel) best = f.index;
  }
  return best;
}

export function isFloorUnlocked(floor: number, kingLevel: number): boolean {
  return kingLevel >= floorDef(floor).requiredKingLevel;
}

/** Chance (0..1) de cada inimigo do pool do andar. */
export function floorPoolOdds(floor: number): Array<{ enemy: EnemyDef; weight: number; chance: number }> {
  const def = floorDef(floor);
  const total = def.pool.reduce((s, p) => s + p.weight, 0);
  const out: Array<{ enemy: EnemyDef; weight: number; chance: number }> = [];
  for (const entry of def.pool) {
    const enemy = ENEMY_DEFS.find((e) => e.id === entry.enemyId);
    if (!enemy) continue; // o pack é validado; defensivo contra edição manual da config
    out.push({ enemy, weight: entry.weight, chance: total > 0 ? entry.weight / total : 0 });
  }
  return out;
}

/**
 * Sorteia o inimigo do andar (P-006). Determinístico: mesma seed → mesmo
 * inimigo. `forcedEnemyId` existe para testes e para o Debug Mode.
 */
export function pickEnemyForFloor(floor: number, seed: number, forcedEnemyId?: string): EnemyDef {
  if (forcedEnemyId) {
    const forced = ENEMY_DEFS.find((e) => e.id === forcedEnemyId);
    if (forced) return forced;
  }
  const odds = floorPoolOdds(floor);
  if (odds.length === 0) return ENEMY_DEFS[0]!;
  const total = odds.reduce((s, o) => s + o.weight, 0);
  let roll = new Prng((seed ^ 0x51ed270b) >>> 0).next() * total;
  for (const o of odds) {
    roll -= o.weight;
    if (roll < 0) return o.enemy;
  }
  return odds[odds.length - 1]!.enemy;
}

/**
 * Stats de um inimigo em certo nível — a MESMA estrutura linear dos heróis
 * (`heroStatsAtLevel`), mais o multiplicador global de dificuldade da Torre.
 * Velocidade, crítico e IAS não escalam (como nos heróis).
 */
export function enemyStatsAtLevel(def: EnemyDef, level: number) {
  const n = Math.max(0, level - 1);
  const m = config.tower.enemyStatMultiplier;
  const hpM = m * config.tower.enemyHpMultiplier;
  const atkM = m * config.tower.enemyAttackMultiplier;
  return {
    hp: Math.max(1, Math.floor((def.growth.hp + def.growth.hpPerLevel * n) * hpM)),
    attack: Math.floor((def.growth.attack + def.growth.attackPerLevel * n) * atkM),
    specialAttack: Math.floor((def.growth.specialAttack + def.growth.specialAttackPerLevel * n) * atkM),
    defense: Math.floor((def.growth.defense + def.growth.defensePerLevel * n) * m),
    specialDefense: Math.floor((def.growth.specialDefense + def.growth.specialDefensePerLevel * n) * m),
    critChance: def.growth.critChance,
    attackSpeed: def.growth.attackSpeed,
    speed: def.growth.speed,
  };
}

/** Nível dos inimigos do andar (padrão: nível-base da faixa — regra do usuário). */
export function enemyLevelForFloor(floor: number): number {
  return floorDef(floor).enemyLevel;
}

export function describeFloor(floor: number): TowerFloor {
  const def = floorDef(floor);
  return {
    index: def.index,
    name: def.name,
    // §46 — o requisito é o nível do REI, o nível da conta.
    requiredKingLevel: def.requiredKingLevel,
    enemyLevel: def.enemyLevel,
    minLevel: def.minLevel,
    maxLevel: def.maxLevel,
    rewardBundleId: `tower:${def.index}`,
    // §21/§55 — a Torre NÃO tem boss. O tipo é `null`, não `string | null`.
    bossId: null,
  };
}

/** Recompensa por abate, em função do NÍVEL do inimigo (curvas editáveis). */
export function towerRewardsForEnemyLevel(enemyLevel: number): { kingXp: number; heroXp: number; coins: number } {
  const r = config.tower.rewards;
  return {
    kingXp: evalCurve(r.kingXp, enemyLevel),
    heroXp: evalCurve(r.heroXp, enemyLevel),
    coins: evalCurve(r.coins, enemyLevel),
  };
}

export function towerRewardsForFloor(floor: number): { kingXp: number; heroXp: number; coins: number } {
  return towerRewardsForEnemyLevel(enemyLevelForFloor(floor));
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
  /** Tipo do ataque básico do herói (físico/mágico), vindo da classe. */
  heroBasicAttackType?: "physical" | "magic";
  /** Testes/Debug: força o inimigo em vez de sortear do pool. */
  forcedEnemyId?: string;
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

  const def = pickEnemyForFloor(floor, seed, params.forcedEnemyId);
  const tint = floorDef(floor).visual.enemyTint;
  const battleId = newBattleId(king.accountId, sequence, seed);

  const allySeed: CombatantSeed = {
    id: hero.id,
    name: hero.name,
    side: "ally",
    level: hero.level,
    stats: heroStats,
    startHp: params.heroStartHp,
    heroId: hero.id,
    basicAttackType: params.heroBasicAttackType,
    sprites: params.heroSprites,
  };

  const enemySeed: CombatantSeed = {
    id: `enemy:${def.id}:${floor}`,
    name: def.name,
    side: "enemy",
    level: info.enemyLevel,
    stats: enemyStatsAtLevel(def, info.enemyLevel),
    enemyId: def.id,
    basicAttackType: def.damageType,
    sprites: def.assets.sheets as unknown as Record<string, string>,
    // Tintura do andar (apresentação, §64): o renderer decide como aplicar.
    ...(tint !== null ? { tint } : {}),
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
  /** Nível do inimigo derrotado; padrão = nível do andar. */
  enemyLevel?: number;
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
  const enemyLevel = params.enemyLevel ?? enemyLevelForFloor(params.floor);
  const rewards = towerRewardsForEnemyLevel(enemyLevel);
  return rollRewardBundle({
    rng: params.rng,
    accountId: params.accountId as never,
    itemIndexStart: params.itemIndexStart,
    source: { kind: "tower_enemy" },
    sourceLevel: enemyLevel,
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
