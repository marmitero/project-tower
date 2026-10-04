export { Prng, RngHub, hashString } from "./rng.js";
export {
  computeDamage,
  rollCritical,
  actionIntervalMs,
  dotDamage,
  defenseConstantFor,
  powerOf,
  qualityGrade,
  divideXp,
} from "./formula.js";
export {
  selectSingleTarget,
  allEnemies,
  selectAllyToHeal,
  initialTurnOrder,
  isAlive,
  towerTargetFor,
} from "./targeting.js";
export {
  applyStatBuff,
  applyDot,
  applyStun,
  statMultiplier,
  hasStun,
  hasStatus,
  tickStatuses,
  clearOnDeath,
  DEFAULT_STATUS_DURATION_MS,
} from "./status.js";
export { buildGearProfile, emptyGearProfile, type GearProfile, type GearCaps } from "./gear.js";
export { createBattle, step, healCombatant, reviveCombatant, TICK_MS } from "./simulate.js";
export type { BattleSetup, CombatantSeed, CombatantPhase, StatusResist, SkillDef, SkillHeal, StepHooks } from "./simulate.js";
// O estado de batalha é um tipo de CONTRATO: o engine o produz, mas quem o
// consome (game-core, renderer, UI) precisa do mesmo tipo, sem duplicar a
// definição. Reexportar mantém a dependência num sentido só.
export type {
  BattleState,
  BattleEvent,
  BattleEventType,
  Combatant,
  CombatStats,
  StatusEffect as EngineStatusEffect,
} from "@tia/contracts";
