/**
 * Gate da FASE 6 (COMBATE) — HP persistente entre batalhas (⛔ P-019,
 * ADR-020, COMBAT_SYSTEM §7.2):
 *
 * - vitória mantém o HP restante (a tensão do andar seguinte);
 * - a chain automática NÃO cura entre batalhas;
 * - derrota zera o HP e encerra a caçada (recomeçar é ato do jogador);
 * - `restartHunt()` cura o herói e reentra (config `healOnHuntRestart`);
 * - `restActiveHero()` cura e PAUSA a caçada (descanso explícito).
 *
 * O desfecho da batalha depende do seed (deriva do accountId): os testes
 * NÃO podem depender da sorte. O herói padrão vence o andar 1 saindo
 * arranhado (~120/180) e `forceDefeat` (andar 50, Rei 60) garante derrota.
 */
import { describe, expect, it } from "vitest";
import { config } from "@tia/config";
import { GameState } from "../state.js";
import { asAccountId } from "@tia/contracts";

const ACCOUNT = asAccountId("combat-hp-account");

function makeState(opts: { kingLevel?: number; now?: number } = {}) {
  let now = opts.now ?? 1_700_000_000_000;
  const state = GameState.createNew(
    { accountId: ACCOUNT, nickname: "Veterano", skinId: "royal", starterIdentityId: "hero_aldric", now, masterSeed: 5 },
    { now: () => now },
  );
  const d = state.data as unknown as { king: { level: number }; wallet: { coins: bigint } };
  d.king.level = opts.kingLevel ?? 60;
  d.wallet.coins = 10_000_000n;
  const hero = state.data.heroes[0]!;
  state.assignHeroToSlot(hero.id, 0);
  state.selectActiveHero(hero.id);
  return { state, hero, advance: (ms: number) => (now += ms) };
}

/** Andar 50 com Rei 60: o inimigo esmaga qualquer herói (derrota garantida). */
function forceDefeat(state: { data: unknown }): void {
  (state.data as { tower: { currentFloor: number } }).tower.currentFloor = 50;
}

describe("HP entre batalhas (⛔ P-019 — ADR-020)", () => {
  it("a batalha nasce com o HP atual do herói, não com o máximo (chain não cura)", () => {
    const { state, hero } = makeState();
    hero.currentHp = 42;
    state.startTower();
    const ally = state.activeBattle?.allies[0];
    expect(ally?.hp).toBe(42);
    expect(ally?.maxHp).toBeGreaterThan(42);
  });

  it("vitória mantém o HP restante do herói (e não restaura)", () => {
    const { state, hero } = makeState();
    state.startTower();
    const events = state.resolveBattleToEnd();
    // vitória limpa a caça (§26)
    expect(state.data.hunt).toBeNull();
    // o HP gravado é exatamente o que sobrou na batalha — nem mais, nem menos
    const damages = events.filter(
      (e): e is Extract<typeof e, { type: "character_damaged" }> =>
        e.type === "character_damaged" && e.targetId === hero.id,
    );
    const finalHp = damages.at(-1)?.currentHp;
    expect(finalHp).toBeDefined();
    expect(hero.currentHp).toBe(finalHp);
    expect(hero.currentHp).toBeGreaterThan(0);
    expect(hero.currentHp).toBeLessThanOrEqual(hero.stats.hp);
  });

  it("a próxima batalha da chain continua do HP restante (sem cura automática)", () => {
    const { state, hero, advance } = makeState();
    state.startTower();
    state.resolveBattleToEnd();
    expect(state.data.hunt).toBeNull();
    const hpAfterFirst = hero.currentHp;
    expect(hpAfterFirst).toBeLessThan(hero.stats.hp);

    state.beginSearch();
    const hunt = state.data.hunt!;
    if (hunt.kind !== "searching") throw new Error("deveria estar procurando");
    advance(hunt.durationMs + 1);
    state.tickSearch();
    expect(state.activeBattle).not.toBeNull();
    // início da batalha 2 = HP do fim da batalha 1 (não restaura sozinho)
    expect(state.activeBattle?.allies[0]?.hp).toBe(hpAfterFirst);
    expect(state.activeBattle?.allies[0]?.maxHp).toBe(hero.stats.hp);
  });

  it("derrota zera o HP do herói", () => {
    const { state, hero } = makeState();
    hero.currentHp = 42;
    forceDefeat(state);
    state.startTower();
    state.resolveBattleToEnd();
    expect(state.data.hunt?.kind).toBe("defeated");
    expect(hero.currentHp).toBe(0);
  });

  it("restartHunt cura o herói (healOnHuntRestart) e reentra na Torre", () => {
    const { state, hero } = makeState();
    hero.currentHp = 42;
    forceDefeat(state);
    state.startTower();
    state.resolveBattleToEnd();
    expect(hero.currentHp).toBe(0);

    const battle = state.restartHunt();
    expect(config.combat.healOnHuntRestart).toBe(true);
    expect(hero.currentHp).toBe(hero.stats.hp);
    expect(battle).not.toBeNull();
    // reentrou em combate (a caça voltou a "in_battle", §26)
    expect(state.data.hunt?.kind).toBe("in_battle");
  });

  it("restartHunt com healOnHuntRestart=false não cura (arquitetura editável)", () => {
    const { state, hero } = makeState();
    hero.currentHp = 42;
    forceDefeat(state);
    state.startTower();
    state.resolveBattleToEnd();
    const before = config.combat.healOnHuntRestart;
    config.combat.healOnHuntRestart = false;
    try {
      state.restartHunt();
      expect(hero.currentHp).toBe(0);
    } finally {
      config.combat.healOnHuntRestart = before;
    }
  });

  it("restActiveHero cura e PAUSA a caçada (descanso explícito, §7.2)", () => {
    const { state, hero } = makeState();
    hero.currentHp = 42;
    state.restActiveHero();
    expect(hero.currentHp).toBe(hero.stats.hp);
    expect(state.data.hunt?.kind).toBe("paused");
    expect(state.data.hunt).toMatchObject({ reason: "rest" });
    // pausado não reativa batalha sozinho
    expect(state.activeBattle).toBeNull();
    state.tickSearch();
    expect(state.activeBattle).toBeNull();
    // retomar é explícito
    state.beginSearch();
    expect(state.data.hunt?.kind).toBe("searching");
  });

  it("o herói caído nasce derrotado na batalha (startHp=0 = morto)", () => {
    const { state, hero } = makeState();
    hero.currentHp = 0;
    state.startTower();
    expect(state.activeBattle?.allies[0]?.hp).toBe(0);
    expect(state.activeBattle?.allies[0]?.isDefeated).toBe(true);
  });
});
