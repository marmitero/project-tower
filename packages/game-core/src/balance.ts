/**
 * Balanceamento medido — simulação de duelos herói × inimigo e pacing da Torre
 * (ADR-021).
 *
 * Nada aqui altera o jogo: lê a `config` viva (andares, curvas, atributos) e
 * roda o MESMO engine de batalha. Serve a três usos:
 *  1. teste de regressão de balanceamento (`tower-balance.test.ts`);
 *  2. relatório (`npm run report:balance`);
 *  3. futuramente, a pré-visualização do Painel Admin ("com estes números,
 *     uma luta dura N s e custa X% de vida") — por isso a API é pura e
 *     devolve dados, nunca strings formatadas.
 */

import { classes, config, enemies, evalCurve, type EnemyDef, type GearEffect, type Rarity } from "@tia/config";
import type { CombatStats, Equipment, Hero } from "@tia/contracts";
import { Prng, createBattle, step, type CombatantSeed } from "@tia/engine";
import { asAccountId } from "@tia/contracts";
import { heroFinalStats, heroGearEffects } from "./gear.js";
import { rollEquipmentOf } from "./loot.js";
import { heroStatsAtLevel } from "./creation.js";
import { engineSkillsFor } from "./state.js";
import { bossById, startBossBattle } from "./boss.js";
import { enemyStatsAtLevel, floorDef, floorPoolOdds, pickEnemyForFloor } from "./tower.js";

export interface DuelParams {
  classId: string;
  heroLevel: number;
  enemyId: string;
  enemyLevel: number;
  /** Fração do HP com que o herói entra (1 = cheio). */
  heroHpFraction?: number;
  seed?: number;
  /** Conjunto de equipamento (ADR-023): stats FINAIS e efeitos. Omitido = herói sem equipamento. */
  gear?: GearSet;
}

/** Um conjunto completo de equipamento já reduzido ao que o combate usa. */
export interface GearSet {
  items: Equipment[];
  /** Stats finais do herói (base + equipamento + afinidade). */
  stats: CombatStats;
  effects: GearEffect[];
}

/**
 * Sorteia um conjunto completo (1 item por slot) com a MESMA tabela de raridade e o MESMO X do
 * drop real, no nível do inimigo. `rarity` fixa a raridade (ex.: "celestial" para o teto do
 * jogo); `x` fixa todos os X (ex.: 2,5 = "god roll"). Determinístico por `seed`.
 */
export function rollGearSet(classId: string, level: number, seed: number, opts: { rarity?: Rarity; x?: number } = {}): GearSet {
  const cls = classes.find((c) => c.id === classId);
  if (!cls) throw new Error(`classe desconhecida: ${classId}`);
  const rng = new Prng(Math.imul(seed + 1, 2654435761) >>> 0);
  const items: Equipment[] = [];
  for (const slot of config.equipment.slots) {
    const pool = config.equipment.templates.filter((t) => t.slot === slot.id);
    const weights = pool.map((t) => t.dropWeight);
    const template = pool[rng.weightedIndex(weights)]!;
    const item = rollEquipmentOf(
      rng,
      { accountId: asAccountId("balance"), origin: "drop", source: { kind: "tower_enemy" }, sourceLevel: level, itemIndex: items.length },
      { templateId: template.id, ...(opts.rarity ? { rarity: opts.rarity } : {}) },
    );
    if (opts.x !== undefined) for (const k of Object.keys(item.xValues) as (keyof typeof item.xValues)[]) item.xValues[k] = opts.x;
    items.push(item);
  }
  const base = heroStatsAtLevel(cls.growth, level);
  const stats = heroFinalStats({ stats: base, classId: classId as Hero["classId"], affinityWeapon: cls.affinityWeapon }, items);
  return { items, stats, effects: heroGearEffects(items) };
}

export interface DuelResult {
  won: boolean;
  durationMs: number;
  /** HP perdido pelo herói, em fração do máximo (0..1). */
  hpLostFraction: number;
}

/** Roda UMA luta herói × inimigo até o fim (limite de 30 min simulados). */
export function simulateDuel(p: DuelParams): DuelResult {
  const cls = classes.find((c) => c.id === p.classId);
  const enemy = enemies.find((e) => e.id === p.enemyId);
  if (!cls) throw new Error(`classe desconhecida: ${p.classId}`);
  if (!enemy) throw new Error(`inimigo desconhecido: ${p.enemyId}`);

  const heroStats = p.gear ? p.gear.stats : heroStatsAtLevel(cls.growth, p.heroLevel);
  const startHp = Math.max(1, Math.floor(heroStats.hp * (p.heroHpFraction ?? 1)));
  const ally: CombatantSeed = {
    id: "duel-hero",
    name: cls.name,
    side: "ally",
    level: p.heroLevel,
    stats: heroStats,
    startHp,
    heroId: "duel-hero",
    basicAttackType: cls.damageType === "magic" ? "magic" : "physical",
    effects: p.gear?.effects,
  };
  const foe: CombatantSeed = {
    id: "duel-enemy",
    name: enemy.name,
    side: "enemy",
    level: p.enemyLevel,
    stats: enemyStatsAtLevel(enemy, p.enemyLevel),
    enemyId: enemy.id,
    basicAttackType: enemy.damageType,
  };
  const battle = createBattle({
    mode: "tower",
    battleId: "duel",
    seed: p.seed ?? 1,
    allySeed: [ally],
    enemySeed: [foe],
    skills: { "duel-hero": engineSkillsFor(cls.id) },
    config: config.combat,
    gearCaps: config.equipment.effectCaps,
  });
  const limit = 30 * 60_000;
  while (battle.status === "active" && battle.elapsedMs < limit) {
    step(battle, battle.elapsedMs + 500, config.combat);
  }
  const hero = battle.allies[0]!;
  const won = battle.enemies.every((e) => e.isDefeated) && !hero.isDefeated;
  return {
    won,
    durationMs: battle.elapsedMs,
    hpLostFraction: Math.max(0, (startHp - Math.max(0, hero.hp)) / heroStats.hp),
  };
}

export interface DuelAverage {
  winRate: number;
  avgDurationSec: number;
  avgHpLostFraction: number;
  worstHpLostFraction: number;
}

/** Média de várias sementes (determinístico: sementes 1..N). */
export function averageDuel(p: Omit<DuelParams, "seed">, samples = 8): DuelAverage {
  let wins = 0;
  let dur = 0;
  let lost = 0;
  let worst = 0;
  for (let s = 1; s <= samples; s += 1) {
    const r = simulateDuel({ ...p, seed: s * 7919 });
    if (r.won) wins += 1;
    dur += r.durationMs;
    lost += r.hpLostFraction;
    worst = Math.max(worst, r.hpLostFraction);
  }
  return {
    winRate: wins / samples,
    avgDurationSec: dur / samples / 1000,
    avgHpLostFraction: lost / samples,
    worstHpLostFraction: worst,
  };
}

export interface FloorPacing {
  floor: number;
  name: string;
  minLevel: number;
  maxLevel: number;
  enemyLevel: number;
  /** Abates necessários para atravessar a faixa inteira (do `minLevel` ao `maxLevel`). */
  kills: number;
  hours: number;
  cumulativeHours: number;
}

/**
 * Pacing esperado do jogador (Rei) pela Torre: integra o XP necessário de cada
 * nível da faixa e divide pelo XP por abate do andar. `cycleSeconds` = luta +
 * procura (padrão 13 s, medido por `averageDuel` no relatório).
 */
export function towerPacing(cycleSeconds = 13): FloorPacing[] {
  const out: FloorPacing[] = [];
  let cumulative = 0;
  for (const f of config.tower.floors) {
    const perKill = Math.max(1, evalCurve(config.tower.rewards.kingXp, f.enemyLevel));
    let xpNeeded = 0;
    const from = Math.max(1, f.minLevel);
    const to = Math.min(f.maxLevel, config.xp.king.levelCap);
    for (let lv = from; lv < to; lv += 1) xpNeeded += evalCurve(config.xp.king.curve, lv);
    const kills = Math.ceil(xpNeeded / perKill);
    const hours = (kills * cycleSeconds) / 3600;
    cumulative += hours;
    out.push({
      floor: f.index,
      name: f.name,
      minLevel: f.minLevel,
      maxLevel: f.maxLevel,
      enemyLevel: f.enemyLevel,
      kills,
      hours,
      cumulativeHours: cumulative,
    });
  }
  return out;
}

export interface FloorMatchup {
  classId: string;
  enemy: EnemyDef;
  chance: number;
  duel: DuelAverage;
}

/** Cada herói × cada inimigo do pool do andar, com o herói NO nível-base do andar (on-curve). */
export function floorMatchups(floor: number, heroLevel = floorDef(floor).minLevel, samples = 6): FloorMatchup[] {
  const out: FloorMatchup[] = [];
  const enemyLevel = floorDef(floor).enemyLevel;
  for (const odds of floorPoolOdds(floor)) {
    for (const cls of classes) {
      out.push({
        classId: cls.id,
        enemy: odds.enemy,
        chance: odds.chance,
        duel: averageDuel({ classId: cls.id, heroLevel, enemyId: odds.enemy.id, enemyLevel }, samples),
      });
    }
  }
  return out;
}

export interface HuntSimResult {
  fights: number;
  wins: number;
  defeated: boolean;
  /** HP médio (fração) do herói ao fim das lutas vencidas. */
  avgHpFractionAfterFight: number;
}

/**
 * Simula uma caçada contínua (luta → procura → luta...) num andar, com a
 * regeneração de PROCURANDO da config. Prova ou refuta "o herói aguenta
 * idle neste andar com este nível?" — o critério de sustentabilidade do
 * balanceamento (ADR-021). Termina na derrota ou após `fights` lutas.
 */
export function simulateHunt(p: { classId: string; heroLevel: number; floor: number; fights: number; seed?: number }): HuntSimResult {
  const cls = classes.find((c) => c.id === p.classId);
  if (!cls) throw new Error(`classe desconhecida: ${p.classId}`);
  const maxHp = heroStatsAtLevel(cls.growth, p.heroLevel).hp;
  const searchSec = (config.searching.minMs + config.searching.maxMs) / 2 / 1000;
  const regen = Math.floor(maxHp * config.combat.regenOnSearchingPctPerSec * searchSec) / maxHp;
  const level = floorDef(p.floor).enemyLevel;
  let hpFraction = 1;
  let wins = 0;
  let hpSum = 0;
  for (let i = 0; i < p.fights; i += 1) {
    const seed = ((p.seed ?? 1) * 100003 + i * 7919) >>> 0;
    const enemy = pickEnemyForFloor(p.floor, seed);
    const r = simulateDuel({
      classId: p.classId,
      heroLevel: p.heroLevel,
      enemyId: enemy.id,
      enemyLevel: level,
      heroHpFraction: hpFraction,
      seed,
    });
    if (!r.won) return { fights: i + 1, wins, defeated: true, avgHpFractionAfterFight: wins ? hpSum / wins : 0 };
    wins += 1;
    hpFraction = Math.max(0.001, hpFraction - r.hpLostFraction);
    hpSum += hpFraction;
    hpFraction = Math.min(1, hpFraction + regen);
  }
  return { fights: p.fights, wins, defeated: false, avgHpFractionAfterFight: wins ? hpSum / wins : 0 };
}

// ---------------------------------------------------------------------------
// Boss (ADR-027)
// ---------------------------------------------------------------------------

export interface BossFightParams {
  bossId: string;
  /** Classes da equipe (1–3). */
  classIds: string[];
  /** Nível de TODOS os heróis da equipe. */
  heroLevel: number;
  seed?: number;
  /** Equipamento por herói (mesma ordem de `classIds`); omitido = sem equipamento. */
  gear?: GearSet[];
}

export interface BossFightResult {
  won: boolean;
  reason: "victory" | "defeat" | "timeout";
  durationMs: number;
  /** Heróis que caíram (0..N). */
  fell: number;
  /** HP médio perdido da equipe, em fração do máximo (0..1). */
  teamHpLostFraction: number;
  /** Fases do chefe que chegaram a disparar. */
  phasesReached: number;
}

/** Roda UMA luta de chefe com o MESMO engine do jogo (sem Bot, sem poções). */
export function simulateBossFight(p: BossFightParams): BossFightResult {
  const def = bossById(p.bossId);
  if (!def) throw new Error(`chefe desconhecido: ${p.bossId}`);
  const allies = p.classIds.map((classId, i) => {
    const cls = classes.find((c) => c.id === classId);
    if (!cls) throw new Error(`classe desconhecida: ${classId}`);
    const gear = p.gear?.[i];
    const stats = gear ? gear.stats : heroStatsAtLevel(cls.growth, p.heroLevel);
    return {
      hero: { id: `sim-hero-${i}`, name: cls.name, level: p.heroLevel } as unknown as Hero,
      stats,
      effects: gear?.effects ?? [],
      skills: engineSkillsFor(cls.id),
      basicAttackType: (cls.damageType === "magic" ? "magic" : "physical") as "physical" | "magic",
    };
  });
  const battle = startBossBattle({ def, allies, accountId: "balance", seed: Math.imul((p.seed ?? 1) + 1, 2654435761) >>> 0, sequence: p.seed ?? 1 });
  const limit = def.timeLimitMs + 5_000;
  while (battle.status === "active" && battle.elapsedMs < limit) {
    step(battle, battle.elapsedMs + 500, config.combat);
    }
  const boss = battle.enemies[0]!;
  const reached = def.phases.filter((ph) => {
    const byHp = ph.hpBelowPct !== undefined && boss.hp / boss.maxHp <= ph.hpBelowPct / 100;
    const byTime = ph.afterMs !== undefined && battle.elapsedMs >= ph.afterMs;
    return byHp || byTime;
  }).length;
  const lost = battle.allies.reduce((s, a) => s + Math.max(0, a.maxHp - Math.max(0, a.hp)) / a.maxHp, 0) / battle.allies.length;
  const reason = battle.endReason ?? "timeout";
  return {
    won: reason === "victory",
    reason,
    durationMs: battle.elapsedMs,
    fell: battle.allies.filter((a) => a.isDefeated).length,
    teamHpLostFraction: lost,
    phasesReached: reached,
  };
}

export interface BossFightAverage {
  winRate: number;
  avgDurationSec: number;
  avgFell: number;
  avgTeamHpLost: number;
}

export function averageBossFight(p: Omit<BossFightParams, "seed">, samples = 12): BossFightAverage {
  let wins = 0;
  let dur = 0;
  let fell = 0;
  let lost = 0;
  for (let i = 1; i <= samples; i += 1) {
    const r = simulateBossFight({ ...p, seed: i * 104729 });
    if (r.won) wins += 1;
    dur += r.durationMs;
    fell += r.fell;
    lost += r.teamHpLostFraction;
  }
  return { winRate: wins / samples, avgDurationSec: dur / samples / 1000, avgFell: fell / samples, avgTeamHpLost: lost / samples };
}
