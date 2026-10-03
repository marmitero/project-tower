/**
 * Efeitos de status.
 *
 * Regra herdada da referência (ADR-001): multiplicadores que empilham sem
 * limite quebram o balanceamento silenciosamente. Por isso:
 *   - Buff de stat no mesmo alvo: RENOVA, não acumula.
 *   - DoT no mesmo alvo: RENOVA, não acumula.
 *   - Atordoamento: não acumula; cada aplicação perde 1 ação e expira.
 */

import type { Combatant, StatusEffect } from "@tia/contracts";
import type { StatId, StatusId } from "@tia/config";

export const DEFAULT_STATUS_DURATION_MS = 3_000;

/** Buff de stat: renova, não acumula. */
export function applyStatBuff(
  effects: StatusEffect[],
  existing: StatusEffect[],
  input: {
    effectId: string;
    sourceId: string;
    targetId: string;
    stat: StatId;
    multiplier: number;
    durationMs: number;
    dispellable?: boolean;
  },
  elapsedMs: number,
): StatusEffect[] {
  const previous = existing.find((e) => e.effectId === input.effectId && e.targetId === input.targetId);
  if (previous) {
    // Renovar não acumula: mantém o multiplicador mais forte entre os dois,
    // e reinicia a duração. Empilhar dois +20% daria +40%, que é o bug.
    return effects.filter((e) => e.effectId !== previous.effectId || e.targetId !== previous.targetId).concat({
      ...previous,
      multiplier: Math.max(previous.multiplier, input.multiplier),
      durationMs: input.durationMs,
      remainingMs: input.durationMs,
    });
  }
  return effects.concat({
    effectId: input.effectId,
    sourceId: input.sourceId,
    targetId: input.targetId,
    statusId: "shield",
    stat: input.stat,
    stacks: 1,
    maxStacks: 1,
    multiplier: input.multiplier,
    durationMs: input.durationMs,
    remainingMs: input.durationMs,
    dispellable: input.dispellable ?? true,
  });
}

/**
 * DoT (veneno): renova, não acumula.
 * §66/ADR-001: pulsos de DoT não critam nem disparam outros efeitos.
 */
export function applyDot(
  effects: StatusEffect[],
  existing: StatusEffect[],
  input: {
    effectId: string;
    sourceId: string;
    targetId: string;
    potency: number;
    tickIntervalMs: number;
    durationMs: number;
  },
): StatusEffect[] {
  const previous = existing.find((e) => e.effectId === input.effectId && e.targetId === input.targetId);
  const next: StatusEffect = {
    effectId: input.effectId,
    sourceId: input.sourceId,
    targetId: input.targetId,
    statusId: "poison" as StatusId,
    stacks: 1,
    maxStacks: 1,
    multiplier: input.potency,
    tickIntervalMs: input.tickIntervalMs,
    durationMs: input.durationMs,
    remainingMs: input.durationMs,
    dispellable: true,
  };
  return effects.filter((e) => !(e.effectId === input.effectId && e.targetId === input.targetId)).concat(next);
}

/** Atordoamento: não acumula, perde 1 ação. */
export function applyStun(
  effects: StatusEffect[],
  existing: StatusEffect[],
  input: { effectId: string; sourceId: string; targetId: string; durationMs: number },
): StatusEffect[] {
  const previous = existing.find((e) => e.statusId === "stun" && e.targetId === input.targetId);
  return effects
    .filter((e) => !(e.statusId === "stun" && e.targetId === input.targetId))
    .concat({
      effectId: input.effectId,
      sourceId: input.sourceId,
      targetId: input.targetId,
      statusId: "stun",
      stacks: 1,
      maxStacks: 1,
      multiplier: 1,
      durationMs: input.durationMs,
      remainingMs: input.durationMs,
      dispellable: false,
    });
}

/** Aplica efeitos de status que afetam stats. */
export function statMultiplier(effects: StatusEffect[], stat: StatId): number {
  return effects
    .filter((e) => e.stat === stat)
    .reduce((acc, e) => acc * e.multiplier, 1);
}

export function hasStun(effects: StatusEffect[], targetId: string): boolean {
  return effects.some((e) => e.statusId === "stun" && e.targetId === targetId);
}

export function hasStatus(
  effects: StatusEffect[],
  targetId: string,
  statusId: StatusId,
): boolean {
  return effects.some((e) => e.statusId === statusId && e.targetId === targetId);
}

/**
 * Avança os efeitos em `dt` e retorna os que expiraram.
 * Efeitos não desaparecem silenciosamente: a expiração emite evento (§66).
 */
export function tickStatuses(
  effects: StatusEffect[],
  dtMs: number,
): { effects: StatusEffect[]; expired: StatusEffect[] } {
  const expired: StatusEffect[] = [];
  const next: StatusEffect[] = [];

  for (const e of effects) {
    const remaining = e.remainingMs - dtMs;
    if (remaining <= 0) {
      expired.push({ ...e, remainingMs: 0 });
    } else {
      next.push({ ...e, remainingMs: remaining });
    }
  }

  return { effects: next, expired };
}

/** Remove todos os efeitos de um combatente que morreu (§66/ADR-001). */
export function clearOnDeath(effects: StatusEffect[], combatantId: string): StatusEffect[] {
  return effects.filter((e) => e.targetId !== combatantId);
}
