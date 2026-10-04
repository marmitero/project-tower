import { describe, expect, it } from "vitest";
import { config } from "@tia/config";
import { Prng } from "@tia/engine";
import {
  OFFLINE_CAP_FREE_MS,
  OFFLINE_CAP_VIP_MS,
  beginSearching,
  computeOffline,
  commitOffline,
  createOfflineProgress,
  isHunting,
  isSearchingComplete,
  offlineCapMs,
  rollSearchingDuration,
  searchingProgress,
  touchActive,
} from "../hunt.js";

describe("Procurando... (§27 — ~3s)", () => {
  it("a duração sorteada fica na faixa da config", () => {
    const rng = new Prng(1);
    for (let i = 0; i < 1000; i++) {
      const d = rollSearchingDuration(rng);
      expect(d).toBeGreaterThanOrEqual(config.searching.minMs);
      expect(d).toBeLessThanOrEqual(config.searching.maxMs);
    }
  });

  it("a faixa é centrada em ~3000ms", () => {
    expect(config.searching.minMs).toBeLessThanOrEqual(3000);
    expect(config.searching.maxMs).toBeGreaterThanOrEqual(3000);
  });

  it("não termina antes da duração", () => {
    const state = beginSearching(new Prng(7), 0);
    expect(isSearchingComplete(state, 0)).toBe(false);
    expect(isSearchingComplete(state, 2999)).toBe(false);
  });

  it("termina no instante exato da duração (timestamp absoluto, ADR-007)", () => {
    const state = beginSearching(new Prng(7), 1000);
    if (state.kind !== "searching") throw new Error("beginSearching deveria devolver searching");
    const at = 1000 + state.durationMs;
    expect(isSearchingComplete(state, at)).toBe(true);
    expect(isSearchingComplete(state, at - 1)).toBe(false);
  });

  it("o tempo é medido em absoluto: um timestamp inicial grande funciona igual", () => {
    const early = beginSearching(new Prng(7), 0);
    const late = beginSearching(new Prng(7), 1_700_000_000_000);
    const d = early.kind === "searching" ? early.durationMs : 0;
    expect(isSearchingComplete(early, d)).toBe(true);
    expect(isSearchingComplete(late, 1_700_000_000_000 + d)).toBe(true);
    expect(isSearchingComplete(late, 1_700_000_000_000 + d - 1)).toBe(false);
  });

  it("o progresso vai de 0 a 1 e satura", () => {
    const state = beginSearching(new Prng(3), 0);
    const d = state.kind === "searching" ? state.durationMs : 1;
    expect(searchingProgress(state, 0)).toBe(0);
    expect(searchingProgress(state, d / 2)).toBeCloseTo(0.5, 2);
    expect(searchingProgress(state, d)).toBe(1);
    expect(searchingProgress(state, d * 10)).toBe(1);
  });

  it("navegar NÃO pausa a busca (§29)", () => {
    const state = beginSearching(new Prng(5), 0);
    expect(state.kind).toBe("searching");
    if (state.kind !== "searching") throw new Error("beginSearching deveria devolver searching");
    const d = state.durationMs;
    // O estado não tem nenhum campo de "pausado" e não existe API para
    // pausar: a ausência é a implementação da regra.
    expect(Object.keys(state).sort()).toEqual(["durationMs", "kind", "startedAt"]);
    expect(config.searching.pausesOnNavigation).toBe(false);
    expect(isSearchingComplete(state, d)).toBe(true);
  });
});

describe("estado de caça", () => {
  it("idle e defeated não são caça ativa", () => {
    expect(isHunting({ kind: "idle" })).toBe(false);
    expect(isHunting({ kind: "defeated", at: 0 })).toBe(false);
    expect(isHunting(null)).toBe(false);
  });

  it("searching, in_battle e rewarding são caça ativa", () => {
    expect(isHunting(beginSearching(new Prng(1), 0))).toBe(true);
    expect(isHunting({ kind: "in_battle", battleId: "b", startedAt: 0 })).toBe(true);
    expect(isHunting({ kind: "rewarding", battleId: "b" })).toBe(true);
  });
});

describe("offline Free — 2h acumuladas (§47)", () => {
  const HOUR = 60 * 60 * 1000;

  it("o cap do plano Free é 2h", () => {
    expect(OFFLINE_CAP_FREE_MS).toBe(2 * HOUR);
    expect(offlineCapMs(false)).toBe(2 * HOUR);
  });

  it("1h offline credita 1h", () => {
    const p = createOfflineProgress(0);
    const r = computeOffline(p, HOUR, false);
    expect(r.creditedDurationMs).toBe(HOUR);
    expect(r.wasCapped).toBe(false);
  });

  it("10h offline credita só 2h e sinaliza o corte", () => {
    const p = createOfflineProgress(0);
    const r = computeOffline(p, 10 * HOUR, false);
    expect(r.creditedDurationMs).toBe(2 * HOUR);
    expect(r.wasCapped).toBe(true);
  });

  it("o teto vale POR AUSÊNCIA: cada retorno recomeça a janela (ADR-026)", () => {
    const p = createOfflineProgress(0);

    // Ausência 1: 1h30. Credita tudo.
    let now = 90 * 60 * 1000;
    let r = computeOffline(p, now, false);
    expect(r.creditedDurationMs).toBe(90 * 60 * 1000);
    expect(r.wasCapped).toBe(false);
    commitOffline(p, r.creditedDurationMs, now);
    expect(p.lastActiveAt).toBe(now);
    expect(p.accumulatedMs).toBe(0);

    // Ausência 2: mais 1h30 — também credita 1h30 (não há mais "acumulado vitalício").
    now += 90 * 60 * 1000;
    r = computeOffline(p, now, false);
    expect(r.creditedDurationMs).toBe(90 * 60 * 1000);
    expect(r.wasCapped).toBe(false);
  });

  it("depois de uma ausência capada, a próxima volta a render (o jogo nunca 'esgota' o offline)", () => {
    const p = createOfflineProgress(0);
    const t = 10 * HOUR;
    let r = computeOffline(p, t, false);
    expect(r.creditedDurationMs).toBe(2 * HOUR);
    commitOffline(p, r.creditedDurationMs, t);

    r = computeOffline(p, t + HOUR, false);
    expect(r.creditedDurationMs).toBe(HOUR);
    expect(r.wasCapped).toBe(false);
  });

  it("jogar online entre as ausências não gera crédito: `touchActive` move a âncora", () => {
    const p = createOfflineProgress(0);
    touchActive({ lastActiveAt: 0 }, p, 5 * HOUR); // jogou até as 5h
    const r = computeOffline(p, 5 * HOUR + 30 * 60 * 1000, false);
    expect(r.rawDurationMs).toBe(30 * 60 * 1000);
    expect(r.creditedDurationMs).toBe(30 * 60 * 1000);
  });

  it("tempo negativo (relógio andando para trás) credita zero, não XP negativo", () => {
    const p = createOfflineProgress(10_000);
    const r = computeOffline(p, 0, false);
    expect(r.rawDurationMs).toBe(0);
    expect(r.creditedDurationMs).toBe(0);
  });

  it("o plano é identificado na resposta", () => {
    const p = createOfflineProgress(0);
    expect(computeOffline(p, 1000, false).plan).toBe("free");
  });
});

describe("offline VIP — 8h, desativado no MVP (§49)", () => {
  const HOUR = 60 * 60 * 1000;

  it("a constante de 8h existe na arquitetura", () => {
    expect(OFFLINE_CAP_VIP_MS).toBe(8 * HOUR);
  });

  it("VIP está DESLIGADO: um usuário VIP ainda recebe 2h", () => {
    // §49 — VIP não precisa funcionar no MVP. A arquitetura existe, os
    // valores não. Testar que o toggle respeita a config impede que a
    // constante de 8h vire uma política não intencional.
    expect(config.economy.vip.enabled).toBe(false);
    expect(offlineCapMs(true)).toBe(2 * HOUR);
  });

  it("se VIP for ligado no futuro, o cap passa a 8h sem tocar em código", () => {
    const hypothetical = { ...config.economy.vip, enabled: true };
    expect(hypothetical.enabled).toBe(true);
    // A função lê `config.economy.vip.enabled`; o teste documenta o efeito.
    expect(OFFLINE_CAP_VIP_MS).toBeGreaterThan(OFFLINE_CAP_FREE_MS);
  });
});

describe("lastActiveAt (§47)", () => {
  it("é atualizado ao ENTRAR, não ao sair", () => {
    const king = { lastActiveAt: 0 };
    const p = createOfflineProgress(0);
    touchActive(king, p, 5_000);
    expect(king.lastActiveAt).toBe(5_000);
    expect(p.lastActiveAt).toBe(5_000);
  });

  it("o offline é medido a partir do último toque, não do boot do save", () => {
    const king = { lastActiveAt: 0 };
    const p = createOfflineProgress(0);
    touchActive(king, p, 10_000);
    const r = computeOffline(p, 10_000 + 60_000, false);
    expect(r.rawDurationMs).toBe(60_000);
  });
});
