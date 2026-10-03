/**
 * Boss (FASE 12, ADR-027).
 *
 * O Boss é uma ATIVIDADE separada da Torre (§21/§55): a equipe inteira enfrenta UM chefe, todos
 * atacando no mesmo tick (§24/§80). O chefe é DADO (`config.boss.bosses`) — este módulo só traduz
 * esse dado para o engine, controla tentativas e monta a recompensa. Nenhuma função conhece um
 * chefe específico; o `GameState` orquestra o ciclo (entrar → lutar → liquidar → devolver).
 *
 * §65 — não existe um segundo motor de batalha: `createBattle({ mode: "boss" })` é o MESMO
 * engine da Torre, com N aliados e as skills/fases/resistências que o dado descreve.
 */

import type { BattleState, BossRecord, BossProgress, CombatStats, Equipment, Hero, RewardBundle } from "@tia/contracts";
import { asAccountId } from "@tia/contracts";
import {
  RARITY_ORDER,
  classes,
  config,
  type BossDef,
  type BossFragmentDrop,
  type BossPhaseDef,
  type BossSkillDef,
  type GearEffect,
  type Rarity,
} from "@tia/config";
import {
  Prng,
  createBattle,
  type CombatantPhase,
  type CombatantSeed,
  type SkillDef as EngineSkillDef,
} from "@tia/engine";
import { buildEnemy } from "@tia/config";
import { newBattleId } from "./ids.js";
import { rollEquipmentOf } from "./loot.js";
import { enemyStatsAtLevel, towerRewardsForEnemyLevel } from "./tower.js";

// ---------------------------------------------------------------------------
// Erros
// ---------------------------------------------------------------------------

export type BossBlockReason = "unknown" | "disabled" | "locked" | "cooldown" | "no_attempts" | "team_too_small" | "no_hero" | "heroes_down";

export class BossBlockedError extends Error {
  readonly reason: BossBlockReason;
  /** Marca (relógio do jogo) em que volta a ficar disponível, quando faz sentido. */
  readonly availableAt: number | null;
  constructor(reason: BossBlockReason, message: string, availableAt: number | null = null) {
    super(message);
    this.name = "BossBlockedError";
    this.reason = reason;
    this.availableAt = availableAt;
  }
}

// ---------------------------------------------------------------------------
// Leitura da config
// ---------------------------------------------------------------------------

export function allBosses(): readonly BossDef[] {
  return config.boss.bosses;
}

export function bossById(id: string): BossDef | undefined {
  return config.boss.bosses.find((b) => b.id === id);
}

/** Id da skill no engine: nunca colide com as skills de heróis. */
export const bossSkillId = (bossId: string, localId: string): string => `boss:${bossId}:${localId}`;

// ---------------------------------------------------------------------------
// Progresso salvo
// ---------------------------------------------------------------------------

export function emptyBossRecord(): BossRecord {
  return { wins: 0, losses: 0, firstClearAt: null, bestTimeMs: null, windowStartAt: 0, windowAttempts: 0, cooldownUntil: 0 };
}

export function createBossProgress(): BossProgress {
  return { records: {}, battlesStarted: 0 };
}

const num = (v: unknown, d = 0): number => (typeof v === "number" && Number.isFinite(v) ? v : d);

/** Completa/corrige o progresso salvo (save antigo ou editado à mão nunca quebra o load). */
export function normalizeBossProgress(raw: unknown): BossProgress {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Partial<BossProgress>;
  const records: Record<string, BossRecord> = {};
  for (const [id, v] of Object.entries(r.records ?? {})) {
    const x = (typeof v === "object" && v !== null ? v : {}) as Partial<BossRecord>;
    records[id] = {
      wins: Math.max(0, Math.floor(num(x.wins))),
      losses: Math.max(0, Math.floor(num(x.losses))),
      firstClearAt: x.firstClearAt === null || x.firstClearAt === undefined ? null : num(x.firstClearAt),
      bestTimeMs: x.bestTimeMs === null || x.bestTimeMs === undefined ? null : num(x.bestTimeMs),
      windowStartAt: num(x.windowStartAt),
      windowAttempts: Math.max(0, Math.floor(num(x.windowAttempts))),
      cooldownUntil: num(x.cooldownUntil),
    };
  }
  return { records, battlesStarted: Math.max(0, Math.floor(num(r.battlesStarted))) };
}

export function recordOf(progress: BossProgress, bossId: string): BossRecord {
  return progress.records[bossId] ?? emptyBossRecord();
}

// ---------------------------------------------------------------------------
// Disponibilidade e tentativas (⛔ P-029 → ADR-027)
// ---------------------------------------------------------------------------

export interface BossAvailability {
  state: "ready" | "disabled" | "locked" | "cooldown" | "no_attempts";
  /** Quando volta (relógio do jogo); `null` se já está pronto/bloqueado por nível. */
  availableAt: number | null;
  /** Tentativas restantes na janela (modo `window`); `null` nos outros modos. */
  attemptsLeft: number | null;
}

/**
 * Pode desafiar agora? Não considera a equipe (isso é do `GameState`) — só o chefe, o nível do
 * Rei e a regra de tentativas. Janela MÓVEL sem fuso horário: determinística e testável.
 */
export function bossAvailability(def: BossDef, record: BossRecord, kingLevel: number, now: number): BossAvailability {
  if (!def.enabled) return { state: "disabled", availableAt: null, attemptsLeft: null };
  if (kingLevel < def.requiredKingLevel) return { state: "locked", availableAt: null, attemptsLeft: null };
  const rule = def.attempts;
  if (rule.kind === "cooldown") {
    if (now < record.cooldownUntil) return { state: "cooldown", availableAt: record.cooldownUntil, attemptsLeft: null };
    return { state: "ready", availableAt: null, attemptsLeft: null };
  }
  if (rule.kind === "window") {
    const expired = record.windowStartAt === 0 || now >= record.windowStartAt + rule.windowMs;
    const used = expired ? 0 : record.windowAttempts;
    const left = Math.max(0, rule.maxAttempts - used);
    if (left <= 0) return { state: "no_attempts", availableAt: record.windowStartAt + rule.windowMs, attemptsLeft: 0 };
    return { state: "ready", availableAt: null, attemptsLeft: left };
  }
  return { state: "ready", availableAt: null, attemptsLeft: null };
}

/** Consome a tentativa AO ENTRAR (recarregar a página não devolve a tentativa). Muta o registro. */
export function registerAttemptStart(def: BossDef, record: BossRecord, now: number): void {
  const rule = def.attempts;
  if (rule.kind === "cooldown") {
    // Até o resultado, vale a recarga de derrota (a mais curta): fechar a aba não custa a de vitória.
    record.cooldownUntil = now + rule.afterLossMs;
  } else if (rule.kind === "window") {
    const expired = record.windowStartAt === 0 || now >= record.windowStartAt + rule.windowMs;
    if (expired) {
      record.windowStartAt = now;
      record.windowAttempts = 0;
    }
    record.windowAttempts += 1;
  }
}

/** Registra o desfecho. Devolve `firstClear` (a vitória que concede o bônus de primeira vez). */
export function registerResult(def: BossDef, record: BossRecord, won: boolean, now: number, durationMs: number): { firstClear: boolean } {
  const rule = def.attempts;
  if (!won) {
    record.losses += 1;
    if (rule.kind === "cooldown") record.cooldownUntil = Math.max(record.cooldownUntil, now + rule.afterLossMs);
    return { firstClear: false };
  }
  const firstClear = record.firstClearAt === null;
  record.wins += 1;
  if (firstClear) record.firstClearAt = now;
  record.bestTimeMs = record.bestTimeMs === null ? durationMs : Math.min(record.bestTimeMs, durationMs);
  if (rule.kind === "cooldown") record.cooldownUntil = now + rule.afterWinMs;
  return { firstClear };
}

// ---------------------------------------------------------------------------
// Do dado para o engine
// ---------------------------------------------------------------------------

/** Stats do chefe: template (atributos × nível, como um inimigo) × multiplicadores de chefe. */
export function bossStats(def: BossDef): CombatStats {
  const template = buildEnemy({
    id: def.id,
    name: def.name,
    role: "elite",
    damageType: def.damageType,
    attributes: def.attributes,
    statMultiplier: def.statMultiplier,
    assets: def.assets,
  });
  const base = enemyStatsAtLevel(template, def.level);
  const m = def.multipliers;
  return {
    ...base,
    hp: Math.max(1, Math.floor(base.hp * m.hp)),
    attack: Math.floor(base.attack * m.attack),
    specialAttack: Math.floor(base.specialAttack * m.attack),
    defense: Math.floor(base.defense * m.defense),
    specialDefense: Math.floor(base.specialDefense * m.defense),
    speed: Math.max(1, Math.floor(base.speed * m.speed)),
  };
}

function toEngineSkill(bossId: string, s: BossSkillDef): EngineSkillDef {
  return {
    id: bossSkillId(bossId, s.id),
    targeting: s.targeting,
    damageType: s.damageType,
    coefficient: s.coefficient,
    hitCount: s.hitCount,
    cooldownMs: s.cooldownMs,
    enabled: s.enabled,
  };
}

export function bossEngineSkills(def: BossDef): EngineSkillDef[] {
  return def.skills.filter((s) => s.enabled).map((s) => toEngineSkill(def.id, s));
}

function toEnginePhase(bossId: string, p: BossPhaseDef): CombatantPhase {
  return {
    id: p.id,
    label: p.label,
    trigger: {
      ...(p.hpBelowPct !== undefined ? { hpBelowFraction: p.hpBelowPct / 100 } : {}),
      ...(p.afterMs !== undefined ? { afterMs: p.afterMs } : {}),
    },
    ...(p.statMultipliers ? { statMultipliers: p.statMultipliers } : {}),
    ...(p.attackSpeedBonus !== undefined ? { attackSpeedBonus: p.attackSpeedBonus } : {}),
    ...(p.healPct !== undefined ? { healFraction: p.healPct } : {}),
    ...(p.skills ? { skills: p.skills.filter((s) => s.enabled).map((s) => toEngineSkill(bossId, s)) } : {}),
  };
}

export function bossCombatantId(def: BossDef): string {
  return `boss:${def.id}`;
}

export function bossSeed(def: BossDef): CombatantSeed {
  const resist = Object.fromEntries(Object.entries(def.statusResist).filter(([, v]) => typeof v === "number" && v > 0));
  return {
    id: bossCombatantId(def),
    name: def.name,
    side: "enemy",
    level: def.level,
    stats: bossStats(def),
    enemyId: def.id,
    basicAttackType: def.damageType,
    sprites: def.assets.sheets as unknown as Record<string, string>,
    ...(def.tint !== null ? { tint: def.tint } : {}),
    scale: def.scale,
    isBoss: true,
    ...(Object.keys(resist).length > 0 ? { statusResist: resist } : {}),
    ...(def.phases.length > 0 ? { phases: def.phases.map((p) => toEnginePhase(def.id, p)) } : {}),
  };
}

export interface BossAllyInput {
  hero: Hero;
  stats: CombatStats;
  effects: GearEffect[];
  skills: EngineSkillDef[];
  sprites?: Record<string, string>;
  basicAttackType: "physical" | "magic";
  startHp?: number;
}

export interface StartBossBattleParams {
  def: BossDef;
  allies: BossAllyInput[];
  accountId: string;
  seed: number;
  sequence: number;
}

/**
 * Monta e inicia a BossBattle: TODA a equipe contra UM chefe. A assinatura recebe uma lista de
 * aliados (ao contrário de `startTowerBattle`, que recebe um herói — §17/§79).
 */
export function startBossBattle(p: StartBossBattleParams): BattleState {
  const { def, allies } = p;
  const seeds: CombatantSeed[] = allies.map((a) => ({
    id: a.hero.id,
    name: a.hero.name,
    side: "ally",
    level: a.hero.level,
    stats: a.stats,
    ...(a.startHp !== undefined ? { startHp: a.startHp } : {}),
    heroId: a.hero.id,
    basicAttackType: a.basicAttackType,
    ...(a.sprites ? { sprites: a.sprites } : {}),
    ...(a.effects.length > 0 ? { effects: a.effects } : {}),
  }));
  const boss = bossSeed(def);
  const skills: Record<string, EngineSkillDef[]> = { [boss.id]: bossEngineSkills(def) };
  for (const a of allies) skills[a.hero.id] = a.skills;
  return createBattle({
    mode: "boss",
    battleId: newBattleId(p.accountId, p.sequence, p.seed),
    seed: p.seed,
    allySeed: seeds,
    enemySeed: [boss],
    skills,
    config: config.combat,
    gearCaps: config.equipment.effectCaps,
    timeLimitMs: def.timeLimitMs,
    bossId: def.id,
  });
}

// ---------------------------------------------------------------------------
// Recompensa
// ---------------------------------------------------------------------------

/** Preview determinístico do que a vitória rende em Coin/XP (sem o bônus de primeira vez). */
export function bossBaseRewards(def: BossDef): { coins: number; kingXp: number; heroXp: number } {
  const per = towerRewardsForEnemyLevel(def.level);
  return {
    coins: Math.floor(per.coins * def.rewards.coinKills),
    kingXp: Math.floor(per.kingXp * def.rewards.kingXpKills),
    heroXp: Math.floor(per.heroXp * def.rewards.heroXpKills),
  };
}

function rollFragmentList(rng: Prng, list: readonly BossFragmentDrop[]): RewardBundle["fragments"] {
  const out: RewardBundle["fragments"] = [];
  for (const f of list) {
    if (!rng.bool(f.chance)) continue;
    const classId = f.classId === "any" ? rng.pick(classes).id : f.classId;
    const amount = rng.int(f.min, f.max);
    const same = out.find((o) => o.classId === classId && o.rarity === f.rarity);
    if (same) same.amount += amount;
    else out.push({ classId, amount, rarity: f.rarity });
  }
  return out;
}

/** Sorteia a raridade entre as `>= minRarity`, pelos pesos da tabela de drop (§33). */
export function rollBossRarity(rng: Prng, minRarity: Rarity): Rarity {
  const pool = RARITY_ORDER.slice(RARITY_ORDER.indexOf(minRarity));
  const weights = pool.map((r) => config.loot.rarity[r] ?? 0);
  const idx = rng.weightedIndex(weights);
  return pool[idx < 0 ? 0 : idx]!;
}

export interface RollBossRewardsParams {
  def: BossDef;
  firstClear: boolean;
  rng: Prng;
  accountId: string;
  itemIndexStart: number;
  createdAt: number;
  bundleId: string;
}

/**
 * Pacote da vitória. Fragmentos SÓ existem aqui (e em caixas/eventos): a Torre nunca os entrega
 * (§12). Equipamento é GARANTIDO (sem os 5% da Torre) e de raridade >= `minRarity`.
 */
export function rollBossRewards(p: RollBossRewardsParams): RewardBundle {
  const { def, firstClear, rng } = p;
  const base = bossBaseRewards(def);
  const mult = firstClear ? def.rewards.firstClearMultiplier : 1;

  const equipment: Equipment[] = [];
  for (let i = 0; i < def.rewards.equipment.rolls; i += 1) {
    const rarity = rollBossRarity(rng, def.rewards.equipment.minRarity);
    const item = rollEquipmentOf(
      rng,
      { accountId: asAccountId(p.accountId), origin: "drop", source: { kind: "boss" }, sourceLevel: def.level, itemIndex: p.itemIndexStart + i },
      { rarity },
    );
    item.createdAt = p.createdAt;
    equipment.push(item);
  }

  const fragments = rollFragmentList(rng, def.rewards.fragments);
  if (firstClear) {
    for (const extra of rollFragmentList(rng, def.rewards.firstClearFragments)) {
      const same = fragments.find((f) => f.classId === extra.classId && f.rarity === extra.rarity);
      if (same) same.amount += extra.amount;
      else fragments.push(extra);
    }
  }

  return {
    id: p.bundleId,
    kingXp: BigInt(Math.floor(base.kingXp * mult)),
    heroXp: BigInt(Math.floor(base.heroXp * mult)),
    coins: BigInt(Math.floor(base.coins * mult)),
    equipment,
    fragments,
  };
}

// ---------------------------------------------------------------------------
// Pré-visualização (UI e Painel Admin futuro)
// ---------------------------------------------------------------------------

/** Quanto tempo o chefe leva para cair com uma equipe — ver `balance.ts` (`simulateBossFight`). */
export function describeBossForUi(def: BossDef) {
  const stats = bossStats(def);
  return {
    stats,
    rewards: bossBaseRewards(def),
    resist: def.statusResist,
    skills: def.skills,
    phases: def.phases,
  };
}
