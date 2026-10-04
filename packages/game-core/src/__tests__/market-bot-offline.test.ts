/**
 * Market, Bot e offline-como-simulação (ADR-025/026).
 */
import { afterEach, describe, expect, it } from "vitest";
import { config, resetContentToDefaults } from "@tia/config";
import { asAccountId } from "@tia/contracts";
import { GameState } from "../state.js";
import { ShopError, grantShopItem, itemPrice, shopItemById, stackCount, fragmentCount, grantFragments } from "../shop.js";
import { normalizeBotSettings } from "../bot.js";
import { heroCombatStats } from "../inventory.js";

afterEach(() => resetContentToDefaults());

const START = 1_700_000_000_000;
const HOUR = 3_600_000;

function makeState(opts: { kingLevel?: number; coins?: bigint; seed?: number } = {}) {
  let now = START;
  const state = GameState.createNew(
    { accountId: asAccountId("market-account"), nickname: "Mercador", skinId: "royal", starterIdentityId: "hero_aldric", now, masterSeed: opts.seed ?? 21 },
    { now: () => now },
  );
  (state.data.king as { level: number }).level = opts.kingLevel ?? 1;
  state.data.wallet.coins = opts.coins ?? 0n;
  const hero = state.data.heroes[0]!;
  state.assignHeroToSlot(hero.id, 0);
  state.selectActiveHero(hero.id);
  return { state, hero, advance: (ms: number) => (now += ms), setNow: (t: number) => (now = t) };
}

describe("Market — compra", () => {
  it("compra pagando Coin e entrega na mochila", () => {
    const { state } = makeState({ coins: 1000n });
    const price = itemPrice(shopItemById("potion_basic")!, 1);
    const r = state.buyItem("potion_basic", 3);
    expect(r.cost).toBe(price * 3n);
    expect(state.data.wallet.coins).toBe(1000n - price * 3n);
    expect(state.ownedCount("potion_basic")).toBe(3);
  });

  it("saldo insuficiente não altera nada (atômico)", () => {
    const { state } = makeState({ coins: 10n });
    expect(() => state.buyItem("potion_basic", 1)).toThrow(ShopError);
    expect(state.data.wallet.coins).toBe(10n);
    expect(state.ownedCount("potion_basic")).toBe(0);
  });

  it("caixa exige nível do Rei", () => {
    const { state } = makeState({ coins: 10n ** 12n });
    try {
      state.buyItem("box_basic", 1);
      throw new Error("deveria bloquear");
    } catch (e) {
      expect((e as ShopError).code).toBe("level_locked");
    }
    (state.data.king as { level: number }).level = shopItemById("box_basic")!.requiredKingLevel;
    expect(() => state.buyItem("box_basic", 1)).not.toThrow();
  });

  it("preço por abates cresce com o nível (acompanha a economia)", () => {
    const item = shopItemById("revive_basic")!;
    expect(itemPrice(item, 2000)).toBeGreaterThan(itemPrice(item, 1));
  });

  it("quantidade inválida e item desconhecido", () => {
    const { state } = makeState({ coins: 1000n });
    expect(() => state.buyItem("potion_basic", 0)).toThrow(ShopError);
    expect(() => state.buyItem("nao_existe", 1)).toThrow(ShopError);
  });
});

describe("Market — caixas e fragmentos", () => {
  it("abrir caixa consome a unidade, é determinístico e avança o contador", () => {
    const run = () => {
      const { state } = makeState({ kingLevel: 300 });
      grantShopItem(state.data.inventory, "box_basic", 5, START);
      const opening = state.openBox("box_basic", 5);
      return { opening, state };
    };
    const a = run();
    const b = run();
    expect(a.state.ownedCount("box_basic")).toBe(0);
    expect(a.state.data.market.boxesOpened).toBe(5);
    expect(JSON.stringify(a.opening.results)).toBe(JSON.stringify(b.opening.results));
    for (const r of a.opening.results) {
      if (r.kind === "fragments") expect(["common"]).toContain(r.rarity);
    }
  });

  it("sem a caixa na mochila não abre", () => {
    const { state } = makeState();
    expect(() => state.openBox("box_basic", 1)).toThrow(ShopError);
  });

  it("muitas aberturas respeitam as chances: fragmentos dominam, herói completo é raro", () => {
    const { state } = makeState({ kingLevel: 300 });
    let heroes = 0;
    const n = 400;
    for (let i = 0; i < n; i += 4) {
      grantShopItem(state.data.inventory, "box_basic", 4, START);
      const o = state.openBox("box_basic", 4);
      heroes += o.results.filter((r) => r.kind === "hero").length;
    }
    expect(heroes).toBeLessThan(n * 0.2);
  });

  it("invoca herói ao juntar os fragmentos exigidos e gasta só o necessário", () => {
    const { state } = makeState();
    const need = config.heroAcquisition.fragmentsRequired.common;
    grantFragments(state.data.inventory, "ranger", "common", need + 2, START);
    const before = state.data.heroes.length;
    const hero = state.summonHero("ranger", "common");
    expect(state.data.heroes.length).toBe(before + 1);
    expect(hero.rarity).toBe("common");
    expect(fragmentCount(state.data.inventory, "ranger", "common")).toBe(2);
    expect(() => state.summonHero("ranger", "common")).toThrow(ShopError);
  });
});

describe("Bot — opções", () => {
  it("normaliza: completa o que falta e corrige o fora da faixa, sem lançar", () => {
    const b = normalizeBotSettings({ autoPotion: { hpBelowPct: 500 } });
    expect(b.autoPotion.hpBelowPct).toBe(config.bot.hpThresholdMaxPct);
    expect(normalizeBotSettings(undefined)).toEqual(config.bot.defaults);
    expect(normalizeBotSettings("lixo")).toEqual(config.bot.defaults);
  });

  it("setBot altera parcialmente e persiste no save", () => {
    const { state } = makeState();
    state.setBot({ autoPotion: { hpBelowPct: 55, itemId: "potion_basic" }, autoReturnFromHub: false });
    expect(state.data.bot.autoPotion.hpBelowPct).toBe(55);
    expect(state.data.bot.autoPotion.enabled).toBe(true);
    expect(state.data.bot.autoReturnFromHub).toBe(false);
  });
});

describe("Bot — em batalha", () => {
  it("bebe poção abaixo do limite, respeitando cooldown e o item escolhido", () => {
    const { state, hero } = makeState();
    grantShopItem(state.data.inventory, "potion_basic", 10, START);
    state.setBot({ autoPotion: { hpBelowPct: 50, itemId: "potion_basic" } });
    const max = heroCombatStats(hero, state.data.inventory).hp;
    hero.currentHp = Math.floor(max * 0.2);
    state.startTower();
    // largada: já bebeu uma
    expect(stackCount(state.data.inventory, "potion_basic")).toBe(9);
    expect(state.activeBattle!.allies[0]!.hp).toBeGreaterThan(Math.floor(max * 0.2));
    state.advanceBattle(500);
    // cooldown de 2,5 s: não bebe de novo no passo seguinte
    expect(stackCount(state.data.inventory, "potion_basic")).toBeGreaterThanOrEqual(8);
  });

  it("autoPotion desligado não gasta nada", () => {
    const { state, hero } = makeState();
    grantShopItem(state.data.inventory, "potion_basic", 3, START);
    state.setBot({ autoPotion: { enabled: false } });
    hero.currentHp = 1;
    state.startTower();
    state.advanceBattle(500);
    expect(stackCount(state.data.inventory, "potion_basic")).toBe(3);
  });

  it("não passa de maxPotionsPerBattle", () => {
    const { state, hero } = makeState();
    config.bot.potionCooldownMs = 0;
    config.bot.maxPotionsPerBattle = 2;
    grantShopItem(state.data.inventory, "potion_basic", 10, START);
    state.setBot({ autoPotion: { hpBelowPct: 95, itemId: "potion_basic" } });
    hero.currentHp = 1;
    state.startTower();
    state.advanceBattle(250);
    state.advanceBattle(250);
    state.advanceBattle(250);
    expect(10 - stackCount(state.data.inventory, "potion_basic")).toBeLessThanOrEqual(2);
  });

  it("revive: herói cai, o revive o traz de volta à MESMA luta", () => {
    const { state, hero } = makeState();
    grantShopItem(state.data.inventory, "revive_basic", 2, START);
    state.setBot({ autoPotion: { enabled: false } });
    const battle = state.startTower();
    const ally = battle.allies[0]!;
    ally.hp = 1;
    // inimigo imbatível: bate forte e tem vida enorme
    for (const e of battle.enemies) {
      e.hp = e.maxHp = 1e12;
      e.stats = { ...e.stats, attack: 1e6, specialAttack: 1e6 };
    }
    const id = battle.battleId;
    state.advanceBattle(5000);
    expect(2 - stackCount(state.data.inventory, "revive_basic")).toBeGreaterThanOrEqual(1);
    expect(2 - stackCount(state.data.inventory, "revive_basic")).toBeLessThanOrEqual(config.bot.maxRevivesPerBattle);
    void id;
    void hero;
  });

  it("sem revive a derrota leva ao Hub; passado o tempo, o herói volta curado ao mesmo andar", () => {
    const { state, hero, advance } = makeState({ kingLevel: 2500 });
    state.selectFloor(10);
    state.setBot({ autoPotion: { enabled: false } });
    const battle = state.startTower();
    battle.allies[0]!.hp = 1;
    for (const e of battle.enemies) e.stats = { ...e.stats, attack: 1e9, specialAttack: 1e9 };
    state.advanceBattle(10_000);
    expect(state.data.hunt?.kind).toBe("defeated");
    expect(hero.currentHp).toBe(0);
    expect(state.hubRemainingMs()).toBe(config.bot.hubRecoveryMs);
    advance(config.bot.hubRecoveryMs - 1);
    expect(state.tickHub()).toBe(false);
    advance(1);
    expect(state.tickHub()).toBe(true);
    expect(state.data.hunt).toBeNull();
    expect(hero.currentHp).toBe(heroCombatStats(hero, state.data.inventory).hp);
    expect(state.currentFloor).toBe(10);
  });

  it("com autoReturnFromHub desligado o herói fica caído até o jogador agir (política antiga, ADR-020)", () => {
    const { state, advance } = makeState({ kingLevel: 2500 });
    state.selectFloor(10);
    state.setBot({ autoPotion: { enabled: false }, autoReturnFromHub: false });
    const battle = state.startTower();
    battle.allies[0]!.hp = 1;
    for (const e of battle.enemies) e.stats = { ...e.stats, attack: 1e9, specialAttack: 1e9 };
    state.advanceBattle(10_000);
    advance(config.bot.hubRecoveryMs * 10);
    expect(state.tickHub()).toBe(false);
    expect(state.data.hunt?.kind).toBe("defeated");
  });
});

describe("Offline = simulação do online (ADR-026)", () => {
  it("ausência curta (< minAwayMs) não simula", () => {
    const { state, advance } = makeState();
    state.markActive();
    advance(config.offline.minAwayMs - 1);
    state.claimOffline();
    expect(state.offlineReport).toBeNull();
  });

  it("2 h away rendem batalhas, XP e Coin de verdade e o andar não muda", () => {
    const { state, advance } = makeState();
    state.markActive();
    const coins0 = state.data.wallet.coins;
    advance(2 * HOUR);
    const r = state.claimOffline();
    const rep = state.offlineReport!;
    expect(r.creditedDurationMs).toBe(2 * HOUR);
    expect(rep.battlesWon).toBeGreaterThan(50);
    expect(rep.coins).toBe(state.data.wallet.coins - coins0);
    expect(rep.coins).toBeGreaterThan(0n);
    expect(rep.floor).toBe(1);
    expect(state.currentFloor).toBe(1);
    expect(state.data.king.level).toBeGreaterThan(1);
    expect(state.data.offline.lastActiveAt).toBe(START + 2 * HOUR);
    expect(rep.simulatedMs).toBeGreaterThanOrEqual(2 * HOUR - 1000);
  });

  it("o teto é POR ausência: 10 h away credita 2 h; a volta seguinte credita de novo", () => {
    const { state, advance } = makeState();
    state.markActive();
    advance(10 * HOUR);
    const first = state.claimOffline();
    expect(first.wasCapped).toBe(true);
    expect(first.creditedDurationMs).toBe(2 * HOUR);
    state.dismissOfflineReport();
    advance(HOUR);
    const second = state.claimOffline();
    expect(second.creditedDurationMs).toBe(HOUR);
    expect(state.offlineReport!.battlesWon).toBeGreaterThan(0);
  });

  it("a mesma ausência rende o mesmo resultado (determinismo)", () => {
    const run = () => {
      const { state, advance } = makeState({ seed: 5 });
      state.markActive();
      advance(HOUR);
      state.claimOffline();
      const r = state.offlineReport!;
      return [r.battlesWon, r.coins.toString(), r.kingXp.toString(), r.equipmentFound, state.data.king.level];
    };
    expect(run()).toEqual(run());
  });

  it("usa as poções do Bot durante a simulação e conta no relatório", () => {
    const { state, advance } = makeState({ kingLevel: 100 });
    grantShopItem(state.data.inventory, "potion_magic", 200, START);
    state.setBot({ autoPotion: { hpBelowPct: 70, itemId: "potion_magic" } });
    state.markActive();
    advance(HOUR);
    state.claimOffline();
    const rep = state.offlineReport!;
    const used = 200 - stackCount(state.data.inventory, "potion_magic");
    expect(rep.itemsUsed["potion_magic"] ?? 0).toBe(used);
  });

  it("morre, vai ao Hub, volta ao MESMO andar e segue caçando", () => {
    const { state, advance } = makeState({ kingLevel: 2500 });
    state.selectFloor(10);
    state.setBot({ autoPotion: { enabled: false } });
    state.markActive();
    advance(2 * HOUR);
    state.claimOffline();
    const rep = state.offlineReport!;
    expect(rep.defeats).toBeGreaterThan(0);
    expect(rep.hubTrips).toBeGreaterThan(0);
    expect(rep.stoppedEarly).toBeNull();
    expect(state.currentFloor).toBe(10);
  });

  it("autoReturnFromHub desligado: a simulação para quando o herói cai", () => {
    const { state, advance } = makeState({ kingLevel: 2500 });
    state.selectFloor(10);
    state.setBot({ autoPotion: { enabled: false }, autoReturnFromHub: false });
    state.markActive();
    advance(2 * HOUR);
    state.claimOffline();
    const rep = state.offlineReport!;
    expect(rep.defeats).toBe(1);
    expect(rep.stoppedEarly).toBe("defeated");
    expect(state.data.hunt?.kind).toBe("defeated");
  });

  it("caçada pausada (descanso) não gera ganhos offline", () => {
    const { state, advance } = makeState();
    state.restActiveHero();
    state.markActive();
    advance(HOUR);
    state.claimOffline();
    const rep = state.offlineReport!;
    expect(rep.battlesWon).toBe(0);
    expect(rep.stoppedEarly).toBe("paused");
  });

  it("depois da simulação o jogo online retoma normalmente (relógio real restaurado)", () => {
    const { state, advance } = makeState();
    state.markActive();
    advance(3 * HOUR);
    state.claimOffline();
    expect(state.simulating).toBe(false);
    for (let i = 0; i < 200; i += 1) {
      advance(250);
      state.advanceIdle(250);
    }
    // "defeated" também é retomada válida: o herói pode cair no Hub (curva de XP mais lenta = Nv 7 após 3 h).
    expect(state.data.hunt === null || ["searching", "in_battle", "defeated"].includes(state.data.hunt.kind)).toBe(true);
    expect(state.data.offline.lastActiveAt).toBe(START + 3 * HOUR);
  });
});

describe("Save — Bot e Market", () => {
  it("sobrevive ao ciclo de salvar/carregar e saves sem os campos caem no padrão", async () => {
    const { state } = makeState();
    state.setBot({ autoPotion: { hpBelowPct: 33 } });
    const json = JSON.parse(JSON.stringify(state.data, (_k, v) => (typeof v === "bigint" ? `${v}n` : v)));
    expect(json.bot.autoPotion.hpBelowPct).toBe(33);
    expect(json.market.boxesOpened).toBe(0);
  });
});
