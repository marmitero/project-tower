/**
 * Battle Engine — o núcleo.
 *
 * §64: "O Battle Engine deve ser independente da apresentação. Ele deve
 * conseguir processar Battle State + Combat Rules + Character Stats + Enemy
 * Stats + Skills + Equipment = Battle Result / Events. O renderer apenas
 * apresenta os eventos."
 *
 * Este módulo NÃO importa React, Phaser, DOM, setTimeout nem Math.random.
 * Verificado por teste de grafo de imports (INV-11).
 *
 * §65: suporta TowerBattle e BossBattle sem duplicar a lógica. A diferença
 * é a composição inicial, não uma segunda implementação.
 */

import type {
  BattleEvent,
  BattleState,
  Combatant,
  CombatStats,
  StatusEffect,
} from "@tia/contracts";
import type { BattleId, HeroId } from "@tia/contracts";
import type { CombatConfig, GearEffect } from "@tia/config";
import { Prng, hashString } from "./rng.js";
import { actionIntervalMs, computeDamage, dotDamage, rollCritical } from "./formula.js";
import { buildGearProfile, type GearCaps, type GearProfile } from "./gear.js";
import {
  allEnemies,
  initialTurnOrder,
  isAlive,
  selectSingleTarget,
  towerTargetFor,
} from "./targeting.js";
import { applyDot, applyStun, clearOnDeath, hasStun, statMultiplier, tickStatuses } from "./status.js";
import { asBattleId, asHeroId } from "@tia/contracts";

export interface SkillDef {
  id: string;
  targeting: "single" | "all_enemies" | "self";
  damageType: "physical" | "magic" | "none";
  coefficient: number;
  hitCount: number;
  cooldownMs: number;
  enabled: boolean;
}

/**
 * Fase de um combatente (ADR-027 — Boss). É DADO: o engine não conhece "chefe", só executa o
 * vocabulário abaixo quando o gatilho dispara (uma única vez por fase).
 */
export interface CombatantPhase {
  id: string;
  /** Rótulo PT-BR mostrado na UI ("Fúria"). */
  label: string;
  trigger: {
    /** Dispara quando HP/HPmáx <= esta fração (0..1). */
    hpBelowFraction?: number;
    /** Dispara quando a luta passa deste tempo (ms de batalha) — o "enrage". */
    afterMs?: number;
  };
  /** Multiplicadores aplicados UMA vez sobre os stats atuais. */
  statMultipliers?: Partial<Record<"attack" | "specialAttack" | "defense" | "specialDefense" | "speed" | "critChance", number>>;
  /** Soma ao IAS do combatente (cadência: a luta fica mais rápida). */
  attackSpeedBonus?: number;
  /** Cura única, em fração do HP máximo. */
  healFraction?: number;
  /** Skills que passam a existir (têm prioridade sobre as anteriores). */
  skills?: SkillDef[];
}

/** Resistência a efeitos de status (0 = nenhuma, 1 = imune). */
export type StatusResist = Partial<Record<"stun" | "poison", number>>;

export interface BattleSetup {
  mode: "tower" | "boss";
  battleId: string;
  seed: number;
  /** Time aliado. Tower usa exatamente 1; Boss usa a equipe inteira. */
  allySeed: CombatantSeed[];
  enemySeed: CombatantSeed[];
  skills?: Record<string, SkillDef[]>;
  config: CombatConfig;
  /** Tetos para a soma de efeitos de equipamento (`equipment.effectCaps`). */
  gearCaps?: GearCaps;
  /** Duração máxima (ms de batalha). Ao estourar, a luta é PERDIDA (`reason: "timeout"`). Boss (ADR-027). */
  timeLimitMs?: number;
  /** Id do chefe — só repassado ao `BattleState`. */
  bossId?: string;
}

export interface CombatantSeed {
  id: string;
  name: string;
  side: "ally" | "enemy";
  level: number;
  stats: CombatStats;
  /**
   * HP inicial da batalha (ADR-020 — HP persiste entre batalhas). Quando
   * ausente, começa no máximo (`stats.hp`). `maxHp` continua sendo o
   * máximo verdadeiro — startHp nunca aumenta o teto.
   */
  startHp?: number;
  heroId?: string;
  enemyId?: string;
  /**
   * Tipo do ataque básico (ADR-021): físico = Ataque × Defesa; mágico =
   * Ataque Esp. × Defesa Esp. Padrão `physical`. Skills trazem o próprio tipo.
   */
  basicAttackType?: "physical" | "magic";
  /**(statMods, targetId) que persistem durante a batalha. */
  statuses?: StatusEffect[];
  /** Dicas de apresentação (asset ids) — o engine só repassa (§64). */
  sprites?: Record<string, string>;
  /** Tintura 0xRRGGBB (só apresentação). */
  tint?: number;
  /**
   * Efeitos de equipamento (traço de arma + características). O engine só
   * executa o vocabulário `GearEffect` — não conhece itens (ADR-023).
   */
  effects?: GearEffect[];
  /** Escala do sprite (apresentação). */
  scale?: number;
  /** Marca o chefe da BossBattle (apresentação). */
  isBoss?: boolean;
  /** Imunidade/resistência a atordoamento e veneno (1 = imune). Dado de conteúdo (ADR-027). */
  statusResist?: StatusResist;
  /** Fases (Boss): gatilhos por HP ou tempo que mudam os stats/skills em luta. */
  phases?: CombatantPhase[];
}

interface InternalCombatant extends Combatant {
  basicAttackType: "physical" | "magic";
  skills: SkillDef[];
  cooldowns: Map<string, number>;
  gear: GearProfile;
  statusResist: StatusResist;
  phases: CombatantPhase[];
  phasesDone: Set<string>;
  /** IAS somado pelas fases. */
  phaseIas: number;
}

function makeCombatant(seed: CombatantSeed, skills: SkillDef[], caps?: GearCaps): InternalCombatant {
  const hp = Math.max(0, Math.min(seed.startHp ?? seed.stats.hp, seed.stats.hp));
  return {
    id: seed.id,
    side: seed.side,
    name: seed.name,
    level: seed.level,
    stats: seed.stats,
    hp,
    maxHp: seed.stats.hp,
    attackSpeed: seed.stats.attackSpeed,
    speed: seed.stats.speed,
    critChance: seed.stats.critChance,
    nextActionAtMs: 0,
    statuses: seed.statuses ?? [],
    sprites: seed.sprites,
    tint: seed.tint,
    ...(seed.scale !== undefined ? { scale: seed.scale } : {}),
    ...(seed.isBoss ? { isBoss: true } : {}),
    // startHp pode nascer caído (clamp do ADR-020): o reflexo é imediato.
    isDefeated: hp <= 0,
    heroId: seed.heroId ? (asHeroId(seed.heroId) as HeroId) : undefined,
    enemyId: seed.enemyId,
    basicAttackType: seed.basicAttackType ?? "physical",
    skills,
    cooldowns: new Map(),
    gear: buildGearProfile(seed.effects, caps),
    statusResist: seed.statusResist ?? {},
    phases: seed.phases ?? [],
    phasesDone: new Set(),
    phaseIas: 0,
  };
}

/**
 * Cria o estado inicial de batalha.
 *
 * INVARIANTE CENTRAL (§17/§79): `mode === "tower"` produz EXATAMENTE
 * 1 aliado e 1 inimigo. A equipe inteira do jogador é ignorada — é por isso
 * que a torre é 1×1. Isso é verificado por teste (`tower-battle-size.test.ts`).
 */
export function createBattle(setup: BattleSetup): BattleState {
  const { mode, config } = setup;
  const skills = setup.skills ?? {};

  const allySeeds =
    mode === "tower"
      ? setup.allySeed.slice(0, 1) // §17/§79 — Tower é SEMPRE 1x1
      : setup.allySeed.slice(0, config.bossBattleSize.allies === "team" ? setup.allySeed.length : 1);

  const enemySeeds =
    mode === "tower"
      ? setup.enemySeed.slice(0, 1) // §17/§79
      : setup.enemySeed.slice(0, 1);

  const allies = allySeeds.map((s) => makeCombatant(s, skills[s.id] ?? [], setup.gearCaps));
  const enemies = enemySeeds.map((s) => makeCombatant(s, skills[s.id] ?? [], setup.gearCaps));

  // §64: determinismo. Seed por batalha, nunca Math.random.
  // A ordem de Velocidade define quem age PRIMEIRO DENTRO do mesmo tick
  // (importa para a escolha determinística de alvo), não WHEN cada um age.
  //
  // Todo lado começa alinhado em t=0. É isso que faz §24 funcionar: os
  // heróis de um Boss atacam SIMULTANEAMENTE, no mesmo tick. Escalonar o
  // início de cada herói em ms distintos quebraria exatamente a garantia que
  // o §80 exige em teste.
  const order = initialTurnOrder([...allies, ...enemies]);
  for (const c of order) {
    (c as InternalCombatant).nextActionAtMs = 0;
  }

  const state: BattleState = {
    battleId: asBattleId(setup.battleId),
    mode,
    seed: setup.seed,
    tick: 0,
    elapsedMs: 0,
    allies,
    enemies,
    effects: allies.flatMap((a) => a.statuses).concat(enemies.flatMap((e) => e.statuses)),
    status: "active",
    ...(mode === "boss" && setup.timeLimitMs !== undefined && setup.timeLimitMs > 0 ? { timeLimitMs: setup.timeLimitMs } : {}),
    ...(mode === "boss" && setup.bossId ? { bossId: setup.bossId } : {}),
    events: [],
  };

  emit(state, { type: "battle_started", combatantIds: [...allies, ...enemies].map((c) => c.id) });
  return state;
}

const TICK_MS = 100;

/**
 * `Omit` NÃO é distributivo sobre uniões: `Omit<A | B, "tick">` colapsa
 * para as chaves comuns de A e B e perde os campos específicos de cada
 * variante — o que faz o compilador recusar `{ type: "battle_started",
 * combatantIds }`. O `DistributiveOmit` abaixo preserva a união.
 */
type DistributiveOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never;
type EmittedEvent = DistributiveOmit<BattleEvent, "tick" | "elapsedMs">;

function emit(state: BattleState, event: EmittedEvent): void {
  (state.events as BattleEvent[]).push({
    ...(event as object),
    tick: state.tick,
    elapsedMs: state.elapsedMs,
  } as BattleEvent);
}

/** Ganchos opcionais do `step` — quem chama (game-core) injeta política; o engine segue puro. */
export interface StepHooks {
  /**
   * Chamado quando TODOS os aliados caíram e a luta acabaria. Devolva `true` se reviveu alguém
   * (via `reviveCombatant`) e a luta deve continuar.
   */
  onAlliesDown?: (state: BattleState) => boolean;
}

/**
 * Cura um combatente vivo (poção). Limitada ao HP faltante; emite `heal_dealt` (fonte = o próprio
 * alvo) e `character_damaged` (barra de vida). Devolve o HP efetivamente curado.
 */
export function healCombatant(state: BattleState, targetId: string, amount: number): number {
  const target = findCombatant(state, targetId);
  if (!target || target.isDefeated || target.hp <= 0 || state.status !== "active") return 0;
  const healed = Math.max(0, Math.min(Math.floor(amount), target.maxHp - target.hp));
  if (healed <= 0) return 0;
  target.hp += healed;
  emit(state, { type: "heal_dealt", sourceId: target.id, targetId: target.id, amount: healed });
  emit(state, target.side === "enemy"
    ? { type: "enemy_damaged", targetId: target.id, currentHp: target.hp, maxHp: target.maxHp }
    : { type: "character_damaged", targetId: target.id, currentHp: target.hp, maxHp: target.maxHp });
  return healed;
}

/**
 * Revive um combatente caído com `hp` de vida (poção de reviver). Ele volta a agir meio segundo
 * depois (não pode revidar no mesmo tick). Só vale com a luta ativa.
 */
export function reviveCombatant(state: BattleState, targetId: string, hp: number): boolean {
  const target = findCombatant(state, targetId);
  if (!target || !target.isDefeated || state.status !== "active") return false;
  target.isDefeated = false;
  target.hp = Math.max(1, Math.min(target.maxHp, Math.floor(hp)));
  target.nextActionAtMs = state.elapsedMs + 5 * TICK_MS;
  emit(state, { type: "character_revived", targetId: target.id, currentHp: target.hp, maxHp: target.maxHp });
  return true;
}

/**
 * Avança a batalha até `untilMs` de tempo simulado ou até terminar.
 * Retorna os eventos acumulados (limpa `state.events`).
 *
 * O passo é fixo (TICK_MS) para que a simulação seja reproduzível bit a bit.
 */
export function step(state: BattleState, untilMs: number, config: CombatConfig, hooks?: StepHooks): BattleEvent[] {
  if (state.status !== "active") {
    const evts = state.events.slice();
    state.events = [];
    return evts;
  }

  const startTick = state.tick;
  const startElapsed = state.elapsedMs;

  while (state.elapsedMs < untilMs && state.status === "active") {
    state.elapsedMs += TICK_MS;
    state.tick += 1;

    // Pulsos de DoT (veneno de equipamento): ANTES do tick de status, para que o
    // último pulso aconteça no mesmo tick em que o efeito expira. Pulso não crita
    // e não dispara outros efeitos (§66/ADR-001).
    applyDotPulses(state, config);
    if (state.status !== "active") break;

    // Expiração de status (§66: status_removed com reason "expired").
    const { effects, expired } = tickStatuses(state.effects, TICK_MS);
    state.effects = effects;
    for (const e of expired) {
      const target = findCombatant(state, e.targetId);
      if (target) target.statuses = target.statuses.filter((s) => s !== e && s.effectId !== e.effectId);
      emit(state, { type: "status_removed", targetId: e.targetId, statusId: e.statusId, reason: "expired" });
    }
    syncStatusCopies(state);

    // Quem age neste tick? Dentro do tick, a ordem de Velocidade decide
    // quem age primeiro (§64) — isso torna a escolha de alvo determinística.
    const actors = [...state.allies, ...state.enemies]
      .map((c) => c as InternalCombatant)
      .filter((c) => isAlive(c) && c.nextActionAtMs <= state.elapsedMs)
      .sort((a, b) => {
        if (b.speed !== a.speed) return b.speed - a.speed;
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      });

    for (const actor of actors) {
      if (!isAlive(actor)) continue;
      performAction(actor, state, config);
      // Reagenda.
      // IAS = DES (stats.attackSpeed) + bônus de equipamento; um status de velocidade
      // multiplica a CADÊNCIA. (Antes do ADR-023 o multiplicador de status era passado
      // como se fosse o IAS: todo mundo agia a cada 1 s e a DES não valia nada.)
      const interval = actionIntervalMs(actor.stats.attackSpeed + actor.gear.attackSpeed + actor.phaseIas, config) / Math.max(0.1, statMultiplier(actor.statuses, "attackSpeed"));
      actor.nextActionAtMs = state.elapsedMs + Math.max(1, Math.round(interval));
    }

    // Fases (Boss, ADR-027): gatilhos por HP/tempo. Depois das ações do tick e ANTES do desfecho.
    checkPhases(state);

    // Verifica derrota mútua (ambos caíram no mesmo tick).
    const alliesDead = state.allies.every((c) => !isAlive(c));
    const enemiesDead = state.enemies.every((c) => !isAlive(c));
    // Gancho (ADR-025): o aliado caiu e o jogador tem um revive no Bot — a luta continua,
    // com o inimigo no HP em que estava. O engine não sabe o que é uma poção: só pergunta.
    if (alliesDead && !enemiesDead && hooks?.onAlliesDown?.(state)) continue;
    // Tempo esgotado (Boss): perde, mesmo com todos vivos. Só vale se ninguém venceu neste tick.
    const timedOut = !alliesDead && !enemiesDead && state.timeLimitMs !== undefined && state.elapsedMs >= state.timeLimitMs;
    if (alliesDead || enemiesDead || timedOut) {
      const won = enemiesDead && !alliesDead;
      state.status = "finished";
      state.endReason = won ? "victory" : timedOut ? "timeout" : "defeat";
      if (won) emit(state, { type: "battle_won", rewardBundleId: `${state.battleId}:${startTick}` });
      else emit(state, { type: "battle_lost", reason: timedOut ? "timeout" : "defeat" });
      emit(state, { type: "battle_finished", durationMs: state.elapsedMs, ticks: state.tick - startTick });
    }
  }

  const out = state.events.slice();
  state.events = [];
  return out;
}

/** Dispara as fases cujo gatilho foi atingido (uma única vez por fase). */
function checkPhases(state: BattleState): void {
  for (const c of [...state.allies, ...state.enemies] as InternalCombatant[]) {
    if (c.phases.length === 0 || !isAlive(c)) continue;
    for (const phase of c.phases) {
      if (c.phasesDone.has(phase.id)) continue;
      const byHp = phase.trigger.hpBelowFraction !== undefined && c.maxHp > 0 && c.hp / c.maxHp <= phase.trigger.hpBelowFraction;
      const byTime = phase.trigger.afterMs !== undefined && state.elapsedMs >= phase.trigger.afterMs;
      if (!byHp && !byTime) continue;
      enterPhase(c, phase, state);
      if (!isAlive(c)) break;
    }
  }
}

function enterPhase(c: InternalCombatant, phase: CombatantPhase, state: BattleState): void {
  c.phasesDone.add(phase.id);
  const m = phase.statMultipliers;
  if (m) {
    const next = { ...c.stats };
    for (const key of ["attack", "specialAttack", "defense", "specialDefense", "speed"] as const) {
      const f = m[key];
      if (f !== undefined) next[key] = Math.floor(next[key] * f);
    }
    if (m.critChance !== undefined) next.critChance = next.critChance * m.critChance;
    c.stats = next;
    c.speed = next.speed;
    c.critChance = next.critChance;
  }
  if (phase.attackSpeedBonus) c.phaseIas += phase.attackSpeedBonus;
  if (phase.skills && phase.skills.length > 0) c.skills = [...phase.skills, ...c.skills];
  c.phaseLabel = phase.label;
  emit(state, { type: "phase_changed", targetId: c.id, phaseId: phase.id, label: phase.label });
  if (phase.healFraction && phase.healFraction > 0) {
    const real = Math.min(Math.floor(c.maxHp * phase.healFraction), c.maxHp - c.hp);
    if (real > 0) {
      c.hp += real;
      emit(state, { type: "heal_dealt", sourceId: c.id, targetId: c.id, amount: real });
      emit(state, c.side === "enemy"
        ? { type: "enemy_damaged", targetId: c.id, currentHp: c.hp, maxHp: c.maxHp }
        : { type: "character_damaged", targetId: c.id, currentHp: c.hp, maxHp: c.maxHp });
    }
  }
}

function findCombatant(state: BattleState, id: string): InternalCombatant | null {
  const all = [...state.allies, ...state.enemies] as InternalCombatant[];
  return all.find((c) => c.id === id) ?? null;
}

function syncStatusCopies(state: BattleState): void {
  for (const c of [...state.allies, ...state.enemies] as InternalCombatant[]) {
    c.statuses = state.effects.filter((e) => e.targetId === c.id);
  }
}

function opponentsOf(actor: InternalCombatant, state: BattleState): Combatant[] {
  return actor.side === "ally" ? state.enemies : state.allies;
}

function actorRng(state: BattleState, actor: InternalCombatant): Prng {
  // Um fluxo por (batalha, tick, ator): dois atores no mesmo tick não compartilham sorteios.
  return new Prng((state.seed ^ Math.imul(state.tick, 2654435761) ^ hashString(actor.id)) >>> 0);
}

function performAction(actor: InternalCombatant, state: BattleState, config: CombatConfig): void {
  if (hasStun(state.effects, actor.id)) {
    // Atordoamento: perde 1 ação e é consumido (não acumula, não rouba 2 ações de quem age rápido).
    state.effects = state.effects.filter((e) => !(e.statusId === "stun" && e.targetId === actor.id));
    syncStatusCopies(state);
    emit(state, { type: "status_removed", targetId: actor.id, statusId: "stun", reason: "consumed" });
    return;
  }

  emit(state, { type: "turn_started", actorId: actor.id });

  const rng = actorRng(state, actor);
  const enemies = opponentsOf(actor, state);

  // 1) Tentativa de skill (prioridade: slot em ordem, se pronta e habilitada).
  const used = actor.skills.find(
    (s) => s.enabled && (actor.cooldowns.get(s.id) ?? 0) <= state.elapsedMs && s.damageType !== "none",
  );
  if (used) {
    actor.cooldowns.set(used.id, state.elapsedMs + used.cooldownMs * (1 - actor.gear.cooldownReduction));
    emit(state, { type: "skill_used", actorId: actor.id, skillId: used.id });
    const targets = used.targeting === "all_enemies" ? allEnemies(enemies) : [selectSingleTarget(enemies)].filter(Boolean) as Combatant[];
    for (const target of targets) {
      const hits = Math.max(1, used.hitCount);
      for (let h = 0; h < hits; h += 1) {
        if (!isAlive(actor) || !isAlive(target)) break;
        // Uma skill sem dano (`damageType: "none"`) é de suporte/buff e não
        // produz `damage_dealt`. `P-022` ainda não define o catálogo de
        // efeitos; o engine aceita, mas não fabrica dano para elas.
        if (used.damageType !== "none") {
          dealDamage(actor, target, used.coefficient, used.damageType, state, config, rng, "skill", used.id);
        }
      }
      rollOnHitProcs(actor, target, state, rng, config);
    }
    return;
  }

  // 2) Ataque básico.
  // §17/§79: o herói da Torre tem UM alvo. §24: o Boss também tem UM alvo
  // (a equipe é que é N). A diferença nunca está no alvo, está em quantos
  // atacam simultaneamente.
  const target = state.mode === "tower" && actor.side === "ally"
    ? towerTargetFor(state.enemies[0] ?? null)
    : selectSingleTarget(enemies);

  if (!target) return;

  // Área (Cajado): atinge todos os inimigos; coef. por alvo só quando há mais de um.
  const group = actor.gear.area && enemies.length > 1 ? allEnemies(enemies) : [target];
  const perTarget = actor.gear.area && enemies.length > 1 ? actor.gear.area.perTargetCoefficient : 1;
  // Golpe duplo (Garras): o básico vira N golpes de `coefficient`.
  const strikes = actor.gear.multiHit?.hits ?? 1;
  const strikeCoef = (actor.gear.multiHit?.coefficient ?? 1) * perTarget;

  for (const t of group) {
    for (let h = 0; h < strikes; h += 1) {
      if (!isAlive(actor) || !isAlive(t)) break;
      dealDamage(actor, t, strikeCoef, actor.basicAttackType, state, config, rng, "basic");
    }
    // Sifão (Livro): o básico mágico cura uma fração do Ataque Especial.
    if (actor.gear.basicHeal > 0 && actor.basicAttackType === "magic" && isAlive(actor)) {
      heal(actor, actor, Math.floor(actor.stats.specialAttack * actor.gear.basicHeal), state);
    }
    rollOnHitProcs(actor, t, state, rng, config);
  }
}

/** Cura limitada ao HP faltante; emite `heal_dealt` só se curou algo. */
function heal(source: InternalCombatant, target: Combatant, amount: number, state: BattleState): void {
  if (!isAlive(target)) return;
  const real = Math.min(Math.max(0, amount), target.maxHp - target.hp);
  if (real <= 0) return;
  target.hp += real;
  emit(state, { type: "heal_dealt", sourceId: source.id, targetId: target.id, amount: real });
}

/** Veneno e atordoamento do equipamento: 1 rolagem por ação, só se o alvo sobreviveu. */
function rollOnHitProcs(actor: InternalCombatant, target: Combatant, state: BattleState, rng: Prng, config: CombatConfig): void {
  if (!isAlive(actor) || !isAlive(target)) return;
  const tgt = target as InternalCombatant;

  for (const dot of actor.gear.dots) {
    if (!rng.bool(dot.chance)) continue;
    if (resisted(tgt, "poison", state, rng)) continue;
    const offensive = actor.basicAttackType === "magic" ? actor.stats.specialAttack : actor.stats.attack;
    const defense = actor.basicAttackType === "magic" ? target.stats.specialDefense : target.stats.defense;
    const potency = dotDamage({ offensivePower: offensive, coefficient: dot.coefficient, targetDefense: defense, targetLevel: target.level, config });
    state.effects = applyDot(state.effects, state.effects, {
      effectId: `dot:${actor.id}:${target.id}`,
      sourceId: actor.id,
      targetId: target.id,
      potency,
      tickIntervalMs: dot.intervalMs,
      durationMs: dot.pulses * dot.intervalMs,
    });
    syncStatusCopies(state);
    emit(state, { type: "effect_triggered", sourceId: actor.id, effectId: "dot", label: "Veneno" });
    emit(state, { type: "status_applied", targetId: target.id, statusId: "poison", stacks: 1, durationMs: dot.pulses * dot.intervalMs });
  }

  for (const stun of actor.gear.stuns) {
    if (!rng.bool(stun.chance)) continue;
    if (resisted(tgt, "stun", state, rng)) continue;
    // Cobre a PRÓXIMA ação do alvo (que pode ser mais lenta que `durationMs`).
    const untilNext = Math.max(0, tgt.nextActionAtMs - state.elapsedMs) + TICK_MS;
    const durationMs = Math.min(3_000, Math.max(stun.durationMs, untilNext));
    state.effects = applyStun(state.effects, state.effects, {
      effectId: `stun:${actor.id}:${target.id}`,
      sourceId: actor.id,
      targetId: target.id,
      durationMs,
    });
    syncStatusCopies(state);
    emit(state, { type: "effect_triggered", sourceId: actor.id, effectId: "stun", label: "Atordoado" });
    emit(state, { type: "status_applied", targetId: target.id, statusId: "stun", stacks: 1, durationMs });
  }
}

/**
 * Imunidade/resistência do ALVO (ADR-027). Só consome RNG quando há resistência parcial, então a
 * Torre (resistência zero) segue bit a bit igual. Emite o rótulo ("Imune"/"Resistiu") sobre o alvo.
 */
function resisted(target: InternalCombatant, status: "stun" | "poison", state: BattleState, rng: Prng): boolean {
  const r = target.statusResist[status] ?? 0;
  if (r <= 0) return false;
  if (r < 1 && !rng.bool(r)) return false;
  emit(state, { type: "effect_triggered", sourceId: target.id, effectId: r >= 1 ? "immune" : "resisted", label: r >= 1 ? "Imune" : "Resistiu" });
  return true;
}

/** Pulsos de DoT desde o último tick. */
function applyDotPulses(state: BattleState, config: CombatConfig): void {
  for (const e of state.effects.slice()) {
    if (e.statusId !== "poison" || !e.tickIntervalMs) continue;
    const before = e.durationMs - e.remainingMs;
    const pulses = Math.floor((before + TICK_MS) / e.tickIntervalMs) - Math.floor(before / e.tickIntervalMs);
    if (pulses <= 0) continue;
    const target = findCombatant(state, e.targetId);
    const source = findCombatant(state, e.sourceId);
    for (let i = 0; i < pulses; i += 1) {
      if (!target || !source || !isAlive(target)) break;
      applyDamage(source, target, Math.max(1, e.multiplier), "dot", false, state, config, 0);
    }
  }
}

function dealDamage(
  actor: InternalCombatant,
  target: Combatant,
  coefficient: number,
  damageType: "physical" | "magic" | "dot",
  state: BattleState,
  config: CombatConfig,
  rng: Prng,
  source: "basic" | "skill" | "counter",
  skillId?: string,
): void {
  const offensive = damageType === "magic" ? actor.stats.specialAttack : actor.stats.attack;
  const baseDefense = damageType === "magic" ? target.stats.specialDefense : target.stats.defense;
  // Ruptura de Guarda: ignora uma fração da defesa do alvo.
  const targetDefense = baseDefense * (1 - actor.gear.defensePierce);
  const bonus = damageType === "magic" ? actor.gear.damageMagic : actor.gear.damagePhysical;

  emit(state, { type: "attack_started", actorId: actor.id, skillId: source === "skill" ? skillId : undefined });

  const { finalDamage, mitigatedPercent } = computeDamage({
    offensivePower: offensive,
    coefficient,
    targetDefense,
    targetLevel: target.level,
    damageModifiers: 1 + bonus,
    config,
  });

  const { isCritical } = rollCritical({
    critChance: actor.critChance,
    bonusFlatPercent: actor.gear.critChance * 100,
    rngNext: rng.next(),
    config,
  });

  const damage = isCritical ? Math.floor(finalDamage * config.critMultiplier) : finalDamage;
  applyDamage(actor, target, damage, damageType, isCritical, state, config, mitigatedPercent);

  // Roubo Vital: cura uma fração do dano direto (1× por golpe).
  if (actor.gear.lifesteal > 0) heal(actor, actor, Math.floor(damage * actor.gear.lifesteal), state);

  // Contracorte: reação do alvo a um ataque direto. Reação não gera reação (sem recursão).
  if (source !== "counter" && isAlive(target) && isAlive(actor)) {
    const tgt = target as InternalCombatant;
    for (const c of tgt.gear.counters) {
      if (!rng.bool(c.chance)) continue;
      emit(state, { type: "effect_triggered", sourceId: tgt.id, effectId: "counter", label: "Contracorte" });
      dealDamage(tgt, actor, c.coefficient, tgt.basicAttackType, state, config, rng, "counter");
      if (!isAlive(actor)) break;
    }
  }
}

function applyDamage(
  source: InternalCombatant,
  target: Combatant,
  amount: number,
  kind: "physical" | "magic" | "dot",
  isCritical: boolean,
  state: BattleState,
  config: CombatConfig,
  mitigatedPercent: number,
): void {
  target.hp = Math.max(0, target.hp - amount);
  emit(state, { type: "damage_dealt", sourceId: source.id, targetId: target.id, amount, kind });
  if (mitigatedPercent > 0) {
    emit(state, {
      type: "damage_mitigated",
      sourceId: source.id,
      targetId: target.id,
      beforeDefense: target.stats.defense,
      mitigatedPercent,
    });
  }
  if (isCritical) {
    emit(state, { type: "critical_hit", sourceId: source.id, targetId: target.id, amount });
  }

  if (target.side === "enemy") {
    emit(state, { type: "enemy_damaged", targetId: target.id, currentHp: target.hp, maxHp: target.maxHp });
  } else {
    emit(state, { type: "character_damaged", targetId: target.id, currentHp: target.hp, maxHp: target.maxHp });
  }

  if (target.hp <= 0 && !target.isDefeated) {
    target.isDefeated = true;
    // Efeitos do morto expiram (§66/ADR-001).
    state.effects = clearOnDeath(state.effects, target.id);
    const dead = target as InternalCombatant;
    dead.statuses = [];
    dead.cooldowns.clear();
    if (target.side === "enemy") {
      emit(state, { type: "enemy_defeated", targetId: target.id });
    } else {
      emit(state, { type: "character_defeated", targetId: target.id });
    }
  }
}

export { TICK_MS };
