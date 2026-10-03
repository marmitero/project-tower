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

import { classes, config, enemies, evalCurve, type EnemyDef } from "@tia/config";
import { createBattle, step, type CombatantSeed } from "@tia/engine";
import { heroStatsAtLevel } from "./creation.js";
import { engineSkillsFor } from "./state.js";
import { enemyStatsAtLevel, floorDef, floorPoolOdds, pickEnemyForFloor } from "./tower.js";

export interface DuelParams {
  classId: string;
  heroLevel: number;
  enemyId: string;
  enemyLevel: number;
  /** Fração do HP com que o herói entra (1 = cheio). */
  heroHpFraction?: number;
  seed?: number;
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

  const heroStats = heroStatsAtLevel(cls.growth, p.heroLevel);
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
