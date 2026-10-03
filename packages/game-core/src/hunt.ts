/**
 * Estado de caça: Procurando, batalha, derrota.
 *
 * §27 — "PROCURANDO... ~3 SEGUNDOS" entre uma batalha e outra.
 * §28 — a animação existe, e o tempo é real, não um sleep.
 * §29 — navegar NÃO pausa a busca.
 *
 * ADR-007: o estado é um TIMESTAMP ABSOLUTO persistido, nunca um
 * `setTimeout` de componente. Um `setTimeout` de 3s morre com a aba, com a
 * navegação e com o reload — e o jogador que fechou o jogo por 10 segundos
 * perderia a batalha. Com timestamp, "já passou 3,4s" é uma comparação, e
 * funciona igual depois de qualquer interrupção.
 */

import type { HuntState, OfflineProgress, OfflineSummary } from "@tia/contracts";
import { config, defaultOfflineConfig } from "@tia/config";
import { Prng } from "@tia/engine";

/** Duração sorteada da animação Procurando. §27 — ~3s, faixa [min, max]. */
export function rollSearchingDuration(rng: Prng): number {
  return rng.int(config.searching.minMs, config.searching.maxMs);
}

export function beginSearching(rng: Prng, now: number): HuntState {
  return {
    kind: "searching",
    startedAt: now,
    durationMs: rollSearchingDuration(rng),
  };
}

/** A busca terminou? Baseado em tempo absoluto, não em contagem de ticks. */
export function isSearchingComplete(state: HuntState, now: number): boolean {
  if (state.kind !== "searching") return false;
  return now - state.startedAt >= state.durationMs;
}

/** Progresso 0..1 da animação. */
export function searchingProgress(state: HuntState, now: number): number {
  if (state.kind !== "searching") return 0;
  return Math.min(1, Math.max(0, (now - state.startedAt) / state.durationMs));
}

export function isHunting(state: HuntState | null): boolean {
  if (!state) return false;
  return state.kind === "searching" || state.kind === "in_battle" || state.kind === "rewarding";
}

/** Um herói caído NÃO encerra a caça se ainda houver equipe. ⛔ P-019. */
export function handleHeroDefeat(state: HuntState | null, teamHasSurvivors: boolean, now: number): HuntState {
  if (teamHasSurvivors) return state ?? { kind: "idle" };
  return { kind: "defeated", at: now };
}

// ---------------------------------------------------------------------------
// Offline (§47)
// ---------------------------------------------------------------------------

/** §47/§48 — Free 2 h, VIP 8 h: valores de FÁBRICA (o jogo lê `config.offline`, editável). */
export const OFFLINE_CAP_FREE_MS = defaultOfflineConfig().capFreeMs;
export const OFFLINE_CAP_VIP_MS = defaultOfflineConfig().capVipMs;

export function offlineCapMs(isVip: boolean): number {
  return isVip && config.economy.vip.enabled ? config.offline.capVipMs : config.offline.capFreeMs;
}

export function createOfflineProgress(now: number): OfflineProgress {
  return { lastActiveAt: now, accumulatedMs: 0, lastClaimedAt: now };
}

/**
 * Calcula quanto tempo offline será creditado (ADR-026).
 *
 * §48 — "máximo de 2 horas" (Free) / 8 horas (VIP): o teto vale POR AUSÊNCIA. Uma ausência de 10 h
 * credita 2 h; duas ausências de 1 h30 creditam 1 h30 cada (cada retorno consome a janela e
 * `lastActiveAt` volta para "agora"). Isso acompanha o texto do usuário: o offline é "como se
 * tivesse ficado online por mais aquele período (2 h Free, 8 h VIP)". O modelo antigo
 * (acumulado vitalício) foi abandonado: depois de 2 h creditadas, o jogador nunca mais ganharia nada.
 *
 * `accumulatedMs` permanece no save por compatibilidade e vale sempre 0 (não há mais acúmulo).
 */
export function computeOffline(
  progress: OfflineProgress,
  now: number,
  isVip: boolean,
): { rawDurationMs: number; creditedDurationMs: number; wasCapped: boolean; capMs: number; plan: "free" | "vip" } {
  const cap = offlineCapMs(isVip);
  const raw = Math.max(0, now - progress.lastActiveAt);
  const credited = Math.min(raw, cap);

  return {
    rawDurationMs: raw,
    creditedDurationMs: credited,
    wasCapped: raw > cap,
    capMs: cap,
    plan: isVip && config.economy.vip.enabled ? "vip" : "free",
  };
}

/** Marca o retorno: a janela foi consumida e o relógio recomeça em `now`. Chamado SÓ depois de simular. */
export function commitOffline(progress: OfflineProgress, _creditedTotalMs: number, now: number): void {
  progress.lastActiveAt = now;
  progress.accumulatedMs = 0;
  progress.lastClaimedAt = now;
}

/**
 * §47 — `lastActiveAt` é atualizado ao ENTRAR no jogo e periodicamente
 * durante o jogo, não ao sair. Se fosse atualizado ao fechar o navegador,
 * um crash perderia a sessão inteira; e um jogador que fecha o jogo sem
 * evento `beforeunload` confiável nunca atualizaria nada.
 */
export function touchActive(king: { lastActiveAt: number }, progress: OfflineProgress, now: number): void {
  king.lastActiveAt = now;
  progress.lastActiveAt = now;
}

export function emptyOfflineSummary(): OfflineSummary {
  return {
    rawDurationMs: 0,
    creditedDurationMs: 0,
    wasCapped: false,
    simulatedBattles: 0,
    rewards: { id: "offline:0", kingXp: 0n, heroXp: 0n, coins: 0n, equipment: [], fragments: [] },
    heroFellAt: null,
  };
}
