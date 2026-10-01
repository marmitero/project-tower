/**
 * Integração — criação do Rei de ponta a ponta (gate da FASE 3).
 *
 * "Um jogador cria seu Rei, tem nome único e vê nível, skin e retrato."
 *
 * Cobre também duas decisões estruturais desta fase:
 *
 * 1. Sem save NÃO existe Rei — `boot` devolve `state: null` e a UI mostra
 *    a criação. O placeholder antigo ("Rei" criado automaticamente) era
 *    regra inventada na cola, e §62 proíbe.
 *
 * 2. O relógio do estado é VIVO — `createNew` recebe o clock do app.
 *    Com o relógio congelado na criação, `tickSearch` comparava o tempo
 *    contra ele mesmo e a busca nunca terminava.
 */

import { describe, expect, it } from "vitest";
import {
  GameState,
  LocalStoragePersistence,
  MemoryStorage,
  SAVE_PREFIX,
  placeHero,
  setActiveHero,
  validateNickname,
} from "@tia/game-core";
import { HEROES } from "@tia/config";
import { asAccountId } from "@tia/contracts";
import { boot, createGame } from "../../apps/game-web/src/boot.js";

const ACCOUNT = "integration-king";

function makePersistence() {
  return new LocalStoragePersistence(new MemoryStorage());
}

describe("fluxo de criação do Rei (§5, §8)", () => {
  it("sem save, boot não inventa Rei: state null pede criação", async () => {
    const { state, recovered } = await boot({ accountId: ACCOUNT, persistence: makePersistence() });
    expect(state).toBeNull();
    expect(recovered).toBe(false);
  });

  it("createGame grava o Rei com nome, skin e retrato escolhidos", async () => {
    const persistence = makePersistence();
    const NOW = 1_700_000_000_000;
    const state = await createGame({
      accountId: ACCOUNT,
      persistence,
      clock: () => NOW,
      seed: 7,
      nickname: "Aldric",
      skinId: "paladin",
    });

    const king = state.data.king;
    expect(king.nickname).toBe("Aldric");
    expect(king.skinId).toBe("paladin");
    expect(king.level).toBe(1);
    expect(king.portraitAssetId.length).toBeGreaterThan(0);
    expect(king.lastActiveAt).toBe(NOW);

    // O save já está persistido — um F5 não pode perder o Rei.
    const reloaded = await persistence.load(state.data.king.accountId);
    expect(reloaded?.king.nickname).toBe("Aldric");
  });

  it("boot subsequente reidrata o MESMO Rei (1 conta = 1 Rei, §8)", async () => {
    const persistence = makePersistence();
    await createGame({ accountId: ACCOUNT, persistence, nickname: "Bruna", skinId: "royal" });

    const { state, recovered } = await boot({ accountId: ACCOUNT, persistence });
    expect(recovered).toBe(false);
    expect(state).not.toBeNull();
    expect(state!.data.king.nickname).toBe("Bruna");
    expect(state!.data.king.skinId).toBe("royal");
    // Campos do gate: nível, skin e retrato presentes.
    expect(state!.data.king.level).toBe(1);
    expect(state!.data.king.portraitAssetId.length).toBeGreaterThan(0);
  });

  it("save corrompido não derruba o jogo: quarentena + volta para a criação", async () => {
    const storage = new MemoryStorage();
    const persistence = new LocalStoragePersistence(storage);
    storage.setItem(`${SAVE_PREFIX}${ACCOUNT}`, "{ não é json válido");

    const { state, recovered } = await boot({ accountId: ACCOUNT, persistence });
    expect(state).toBeNull();
    expect(recovered).toBe(true);
  });

  it("nome rejeitado pela regra nunca chega ao createGame (guarda da UI é o game-core)", async () => {
    expect(validateNickname("admin").ok).toBe(false);
    expect(validateNickname("Aldric").ok).toBe(true);
  });

  it("os 4 heróis nascem com as identidades do roster P-002", async () => {
    const state = await createGame({ accountId: ACCOUNT, persistence: makePersistence(), nickname: "Roster", skinId: "royal" });
    const names = state.data.heroes.map((h) => h.name);
    expect(names).toEqual(HEROES.map((h) => h.name));
    // Raridade por herói (escala de aquisição) e retrato preenchido.
    for (const [i, hero] of state.data.heroes.entries()) {
      expect(hero.rarity).toBe(HEROES[i]!.rarity);
      expect(hero.portraitAssetId.length).toBeGreaterThan(0);
      expect(hero.level).toBe(1);
    }
  });
});

describe("relógio vivo do estado (regressão)", () => {
  it("createNew com clock injetado: a busca termina quando o tempo anda", () => {
    let now = 1_000_000;
    const state = GameState.createNew(
      { accountId: asAccountId("clock-account"), nickname: "Crono", skinId: "royal", now, masterSeed: 3 },
      { now: () => now },
    );

    // §19 — o jogador escolhe o herói; o teste escolhe como o faria a UI.
    const hero = state.data.heroes[0]!;
    placeHero(state.data.team, hero.id, 0);
    setActiveHero(state.data.team, hero.id);
    // §46 — o andar exige nível do Rei; aqui só queremos provar que o
    // relógio anda, então liberamos o mínimo como o próprio jogo faz.
    (state.data as unknown as { king: { level: number } }).king.level = 2;

    state.beginSearch();
    const started = state.data.hunt;
    expect(started?.kind).toBe("searching");

    // Sem andar o relógio, nunca completa…
    expect(state.tickSearch()).toBeNull();

    // …e ao passar a duração, completa (o bug antigo ficava preso aqui).
    if (started?.kind === "searching") {
      now += started.durationMs + 1;
    }
    expect(state.tickSearch()).not.toBeNull();
  });
});
