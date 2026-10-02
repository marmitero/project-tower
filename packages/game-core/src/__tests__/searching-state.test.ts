/**
 * Gate da FASE 8 — o estado SEARCHING como máquina de estados do jogo (§26–§29).
 *
 * O nível unitário (duração, timestamps, `isHunting`) vive em `hunt.test.ts`.
 * Este arquivo cobre as transições que o gate exige, passando pela
 * `GameState`:
 *
 *   vitória → hunt=null → beginSearch → "PROCURANDO" → tickSearch → batalha
 *
 * e as duas políticas bloqueantes da fase (ratificadas no ADR-017):
 *
 * - ⛔ P-012 — a busca usa timestamps ABSOLUTOS persistidos: recarregar a
 *   página no meio não reinicia nem pausa (§29).
 * - ⛔ P-019 — derrota encerra a caçada; recomeçar é ato EXPLÍCITO do
 *   jogador. O loop nunca reinsira batalha sozinho após uma derrota.
 */

import { describe, expect, it } from "vitest";
import { config } from "@tia/config";
import { GameState } from "../state.js";
import { LocalStoragePersistence, MemoryStorage } from "../persistence/local.js";
import { asAccountId } from "@tia/contracts";

const ACCOUNT = asAccountId("searching-state-account");

function makeState(opts: { kingLevel?: number; coins?: bigint; persistence?: LocalStoragePersistence; now?: number } = {}) {
  let now = opts.now ?? 1_700_000_000_000;
  const state = GameState.createNew(
    { accountId: ACCOUNT, nickname: "Caçador", skinId: "royal", starterIdentityId: "hero_aldric", now, masterSeed: 5 },
    { now: () => now, persistence: opts.persistence },
  );
  const d = state.data as unknown as { king: { level: number }; wallet: { coins: bigint } };
  d.king.level = opts.kingLevel ?? 60;
  d.wallet.coins = opts.coins ?? 10_000_000n;
  const hero = state.data.heroes[0]!;
  state.assignHeroToSlot(hero.id, 0);
  state.selectActiveHero(hero.id);
  return { state, clock: () => now, advance: (ms: number) => (now += ms) };
}

describe("máquina de estados da caçada (§26)", () => {
  it("vitória limpa a caça; beginSearch entra em PROCURANDO", () => {
    const { state } = makeState();
    state.startTower();
    state.resolveBattleToEnd();
    expect(state.data.hunt).toBeNull();

    state.beginSearch();
    expect(state.data.hunt?.kind).toBe("searching");
  });

  it("tickSearch devolve null enquanto procura e inicia batalha ao terminar", () => {
    const { state, advance } = makeState();
    state.beginSearch();
    const durationMs = state.data.hunt!.kind === "searching" ? state.data.hunt!.durationMs : 0;
    expect(durationMs).toBeGreaterThanOrEqual(config.searching.minMs);
    expect(durationMs).toBeLessThanOrEqual(config.searching.maxMs);

    advance(durationMs - 1);
    expect(state.tickSearch()).toBeNull();
    expect(state.data.hunt?.kind).toBe("searching");

    advance(1);
    const battle = state.tickSearch();
    expect(battle).not.toBeNull();
    expect(state.data.hunt?.kind).toBe("in_battle");
  });

  it("o loop completo se repete: batalha → procura → batalha (§26)", () => {
    const { state, advance } = makeState();
    state.startTower();
    state.resolveBattleToEnd();
    state.beginSearch();
    advance(10_000);
    const battle2 = state.tickSearch();
    expect(battle2).not.toBeNull();
    state.resolveBattleToEnd();
    // venceu de novo → pode procurar de novo, sem intervenção
    state.beginSearch();
    expect(state.data.hunt?.kind).toBe("searching");
  });
});

describe("⛔ P-012 — a busca sobrevive a recarregar a página (§29)", () => {
  it("reload no meio da procura NÃO reinicia o tempo", async () => {
    const persistence = new LocalStoragePersistence(new MemoryStorage());
    const { state, advance } = makeState({ persistence });
    state.beginSearch();
    const hunt = state.data.hunt as { kind: string; startedAt: number; durationMs: number };
    advance(1_000); // 1s de procura já decorrido
    await state.save();

    // Recarrega: novo objeto de estado lido do mesmo save, relógio adiantado.
    const saved = await persistence.load(ACCOUNT);
    expect(saved).not.toBeNull();
    advance(2_000); // +2s enquanto "recarregava" — total 3s
    const reloaded = GameState.hydrate(saved!, { persistence, now: () => 0, masterSeed: 5 });

    // A procura original NÃO reiniciou: se o tempo total já passou, tickSearch
    // entra em batalha imediatamente; caso contrário, ainda procura.
    const originalEnd = hunt.startedAt + hunt.durationMs;
    const stillSearching = reloaded.data.hunt?.kind === "searching";
    expect(stillSearching).toBe(true);
    // O startedAt persistido é ABSOLUTO (o mesmo de antes do reload).
    const reloadedHunt = reloaded.data.hunt as { startedAt: number };
    expect(reloadedHunt.startedAt).toBe(hunt.startedAt);
    void originalEnd;
  });
});

describe("⛔ P-019 — derrota encerra a caçada; recomeçar é do jogador", () => {
  it("derrota marca hunt=defeated e NÃO há auto-restart", () => {
    const { state } = makeState({ kingLevel: 500, coins: 0n });
    const d = state.data as unknown as { tower: { currentFloor: number } };
    d.tower.currentFloor = 400; // andar impossível: força derrota

    state.startTower();
    state.resolveBattleToEnd();
    expect(state.data.hunt?.kind).toBe("defeated");

    // O que o loop de UI faz todo frame: tickSearch só age em "searching".
    expect(state.tickSearch()).toBeNull();
    expect(state.data.hunt?.kind).toBe("defeated");
  });

  it("recomeçar é um ato explícito (startTower) e o jogo segue normalmente", () => {
    const { state } = makeState({ kingLevel: 500, coins: 0n });
    const d = state.data as unknown as { tower: { currentFloor: number } };
    d.tower.currentFloor = 400;
    state.startTower();
    state.resolveBattleToEnd();
    expect(state.data.hunt?.kind).toBe("defeated");

    // O jogador clica "Entrar na Torre" de novo — mesmo andar difícil,
    // o estado aceita e o ciclo volta a existir.
    state.startTower();
    expect(state.data.hunt?.kind).toBe("in_battle");
    state.resolveBattleToEnd();
    // Novo desfecho registrado (derrota de novo, ou vitória = hunt limpo).
    const kind = state.data.hunt?.kind ?? null;
    expect(kind === "defeated" || kind === null).toBe(true);
  });

  it("derrota não credita recompensa nenhuma (§26)", () => {
    const { state } = makeState({ kingLevel: 500, coins: 0n });
    const d = state.data as unknown as { tower: { currentFloor: number } };
    d.tower.currentFloor = 400;
    const coinsBefore = state.data.wallet.coins;
    const xpBefore = state.data.king.xp;

    state.startTower();
    state.resolveBattleToEnd();

    expect(state.data.wallet.coins).toBe(coinsBefore);
    expect(state.data.king.xp).toBe(xpBefore);
  });
});
