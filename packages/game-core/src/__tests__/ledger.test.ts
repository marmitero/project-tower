import { afterEach, describe, expect, it } from "vitest";
import { config, resetContentToDefaults } from "@tia/config";
import { asAccountId } from "@tia/contracts";
import { HuntLedger } from "../ledger.js";
import { GameState } from "../state.js";
import { itemPrice, shopItemById } from "../shop.js";

afterEach(() => resetContentToDefaults());

const MIN = 60_000;

describe("HuntLedger — XP/h, Coin/h, Custo/h (ADR-031)", () => {
  it("converte o que entrou na janela em taxa por hora", () => {
    const l = new HuntLedger();
    l.start(0);
    l.record(5 * MIN, { kingXp: 600, heroXp: 300, coins: 120, cost: 20 });
    const r = l.rates(10 * MIN); // 10 min medidos
    expect(r.kingXpPerHour).toBeCloseTo(3600, 5);
    expect(r.heroXpPerHour).toBeCloseTo(1800, 5);
    expect(r.coinsPerHour).toBeCloseTo(720, 5);
    expect(r.costPerHour).toBeCloseTo(120, 5);
    expect(r.netPerHour).toBeCloseTo(600, 5);
    expect(r.warmingUp).toBe(false);
  });

  it("janela móvel: o que saiu da janela deixa de contar (config.hud.ledgerWindowMs)", () => {
    const l = new HuntLedger();
    l.start(0);
    l.record(1 * MIN, { kingXp: 1000 });
    const w = config.hud.ledgerWindowMs;
    expect(l.rates(w).kingXpPerHour).toBeGreaterThan(0);
    expect(l.rates(w + 2 * MIN).kingXpPerHour).toBe(0);
  });

  it("aquecimento: medição curta é sinalizada e o divisor tem piso de 1 min (sem 'milhões por hora')", () => {
    const l = new HuntLedger();
    l.start(0);
    l.record(1_000, { kingXp: 100 });
    const r = l.rates(2_000);
    expect(r.warmingUp).toBe(true);
    expect(r.kingXpPerHour).toBeCloseTo(6000, 5); // 100 XP / 1 min, não / 2 s
  });

  it("start() zera a medição", () => {
    const l = new HuntLedger();
    l.record(0, { coins: 50 });
    l.start(MIN);
    expect(l.rates(2 * MIN).coinsPerHour).toBe(0);
  });
});

describe("GameState alimenta o ledger", () => {
  function make() {
    let now = 1_700_000_000_000;
    const state = GameState.createNew(
      { accountId: asAccountId("ledger-account"), nickname: "Contador", skinId: "royal", starterIdentityId: "hero_aldric", now, masterSeed: 5 },
      { now: () => now },
    );
    const hero = state.data.heroes[0]!;
    state.assignHeroToSlot(hero.id, 0);
    state.selectActiveHero(hero.id);
    return { state, advance: (ms: number) => (now += ms) };
  }

  it("lutas vencidas rendem XP e Coin por hora; sem poção o custo é zero", () => {
    const { state, advance } = make();
    state.startTower();
    for (let i = 0; i < 2400; i += 1) {
      advance(250);
      state.advanceIdle(250);
      if (state.data.hunt?.kind === "defeated") state.restartHunt();
    }
    const r = state.ledgerRates();
    expect(r.kingXpPerHour).toBeGreaterThan(0);
    expect(r.coinsPerHour).toBeGreaterThan(0);
    expect(r.costPerHour).toBe(0);
  });

  it("usar poção (manual) entra no Custo/h pelo preço de mercado; Zerar limpa", () => {
    const { state, advance } = make();
    state.data.wallet.coins = 10_000n;
    state.buyItem("potion_basic", 2);
    state.data.heroes[0]!.currentHp = 1;
    advance(10 * MIN);
    const before = state.ledgerRates().costPerHour;
    state.useConsumable("potion_basic", state.data.heroes[0]!.id);
    const r = state.ledgerRates();
    const price = Number(itemPrice(shopItemById("potion_basic")!, state.data.king.level));
    expect(before).toBe(0);
    expect(r.costPerHour).toBeCloseTo((price / (10 * MIN)) * 3_600_000, 3);
    expect(r.netPerHour).toBeLessThan(0);
    state.resetLedger();
    expect(state.ledgerRates().costPerHour).toBe(0);
  });
});
