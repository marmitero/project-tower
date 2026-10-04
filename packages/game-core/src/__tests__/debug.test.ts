/**
 * Debug Mode (§77): as ferramentas de desenvolvimento funcionam, passam pelas regras do jogo
 * e nunca marcam item de debug como `drop`. O painel em si só existe com VITE_DEBUG_MODE=true.
 */
import { afterEach, describe, expect, it } from "vitest";
import { config, resetContentToDefaults } from "@tia/config";
import { asAccountId } from "@tia/contracts";
import { GameState } from "../state.js";
import { DEBUG_UNAVAILABLE, createDebugTools } from "../debug.js";
import { fragmentCount, stackCount } from "../shop.js";

afterEach(() => resetContentToDefaults());

const START = 1_700_000_000_000;

function make() {
  let now = START;
  const state = GameState.createNew(
    { accountId: asAccountId("debug-account"), nickname: "Dev", skinId: "royal", starterIdentityId: "hero_aldric", now, masterSeed: 5 },
    { now: () => now },
  );
  const hero = state.data.heroes[0]!;
  state.assignHeroToSlot(hero.id, 0);
  state.selectActiveHero(hero.id);
  return { state, tools: createDebugTools(state), hero, advance: (ms: number) => (now += ms) };
}

describe("Debug Mode — economia, XP e nível", () => {
  it("Coin, Diamante e XP do Rei", () => {
    const { state, tools } = make();
    const coins = state.data.wallet.coins;
    tools.addCoins(5_000);
    tools.addDiamonds(12);
    expect(state.data.wallet.coins).toBe(coins + 5_000n);
    expect(state.data.wallet.diamonds).toBe(12n);
    tools.addKingXp(10_000_000);
    expect(state.data.king.level).toBeGreaterThan(1);
  });

  it("não aceita Coin negativa nem estoura o teto", () => {
    const { state, tools } = make();
    tools.addCoins(-1e12);
    expect(state.data.wallet.coins).toBe(0n);
    tools.addCoins(Number.MAX_SAFE_INTEGER);
    tools.addCoins(Number.MAX_SAFE_INTEGER);
    expect(state.data.wallet.coins <= 10n ** 15n).toBe(true);
  });

  it("nível do Rei e do herói respeitam o teto e atualizam os stats", () => {
    const { state, tools, hero } = make();
    tools.setKingLevel(1e9);
    expect(state.data.king.level).toBe(config.xp.king.levelCap);
    const before = hero.stats.hp;
    tools.setHeroLevel(hero.id, 100);
    expect(hero.level).toBe(100);
    expect(hero.stats.hp).toBeGreaterThan(before);
    expect(hero.currentHp).toBeGreaterThanOrEqual(hero.stats.hp);
    tools.setHeroLevel(hero.id, -5);
    expect(hero.level).toBe(1);
    tools.setHeroStars(hero.id, 3);
    expect(hero.stars).toBe(3);
  });

  it("XP do herói sobe nível", () => {
    const { tools, hero } = make();
    tools.addHeroXp(hero.id, 1_000_000);
    expect(hero.level).toBeGreaterThan(1);
  });
});

describe("Debug Mode — criar coisas", () => {
  it("cria herói de qualquer classe/raridade, com id único e origem admin", () => {
    const { state, tools } = make();
    const a = tools.createHero("ranger", "epic");
    const b = tools.createHero("ranger", "epic");
    expect(a.id).not.toBe(b.id);
    expect(a.rarity).toBe("epic");
    expect(a.origin).toBe("admin");
    expect(state.data.heroes).toHaveLength(3);
    expect(() => tools.createHero("bardo", "epic")).toThrow(/Classe/);
  });

  it("cria herói com uma identidade específica (arte própria) e recusa identidade de outra classe", () => {
    const { tools } = make();
    const h = tools.createHero("ranger", "rare", "hero_besteiro_pesado");
    expect(h.identityId).toBe("hero_besteiro_pesado");
    expect(h.name).toBe("Brutus");
    expect(() => tools.createHero("guardian", "rare", "hero_besteiro_pesado")).toThrow(/Identidade/);
  });

  it("fragmentos e consumíveis vão para a mochila da conta", () => {
    const { state, tools } = make();
    tools.addFragments("guardian", "rare", 7);
    expect(fragmentCount(state.data.inventory, "guardian", "rare")).toBe(7);
    tools.addConsumable("potion_basic", 4);
    expect(stackCount(state.data.inventory, "potion_basic")).toBe(4);
  });

  it("equipamento com raridade e X definidos, marcado como admin (nunca drop)", () => {
    const { state, tools } = make();
    const item = tools.createEquipment({ rarity: "legendary", x: 2.5, level: 50 });
    expect(item.rarity).toBe("legendary");
    expect(item.origin).toBe("admin");
    expect(item.level).toBe(50);
    expect(Object.values(item.xValues).every((v) => v === 2.5)).toBe(true);
    expect(state.data.inventory.equipment.some((e) => e.id === item.id)).toBe(true);
    // X fora da faixa é limitado
    const capped = tools.createEquipment({ rarity: "common", x: 99 });
    expect(Object.values(capped.xValues).every((v) => v === config.loot.x.max)).toBe(true);
    // ids únicos
    expect(capped.id).not.toBe(item.id);
  });
});

describe("Debug Mode — Torre e combate", () => {
  it("escolher andar eleva o nível do Rei se preciso; iniciar e matar inimigo resolve a luta como vitória", () => {
    const { state, tools } = make();
    tools.setFloor(3);
    expect(state.currentFloor).toBe(3);
    tools.startBattle();
    expect(state.activeBattle?.mode).toBe("tower");
    const coins = state.data.wallet.coins;
    tools.killEnemy();
    expect(state.activeBattle).toBeNull();
    expect(state.data.wallet.coins).toBeGreaterThan(coins); // recompensa creditada
    state.advanceIdle(0);
    expect(state.data.hunt?.kind).toBe("searching");
  });

  it("matar o herói é derrota e a caçada não recomeça sozinha", () => {
    const { state, tools } = make();
    tools.startBattle();
    tools.killHero();
    expect(state.activeBattle).toBeNull();
    expect(state.data.hunt?.kind).toBe("defeated");
    tools.healAll();
    expect(state.data.heroes[0]!.currentHp).toBeGreaterThan(0);
  });

  it("sem luta, matar não faz nada", () => {
    const { tools } = make();
    expect(tools.killEnemy()).toMatch(/Nenhuma/);
    expect(tools.killHero()).toMatch(/Nenhuma/);
  });

  it("iniciar chefe: ajusta o nível do Rei, zera tentativas e usa a luta de equipe de verdade", () => {
    const { state, tools } = make();
    tools.startBoss("boss_sentinela");
    expect(state.activeBattle?.mode).toBe("boss");
    expect(state.data.king.level).toBeGreaterThanOrEqual(config.boss.bosses[1]!.requiredKingLevel);
    expect(() => tools.startBoss("nope")).toThrow(/desconhecido/);
  });

  it("zerar tentativas libera chefe em recarga", () => {
    const { state, tools } = make();
    tools.startBoss("boss_rei_gosma");
    state.forfeitBoss();
    expect(state.bossAvailability("boss_rei_gosma").state).toBe("cooldown");
    tools.resetBossAttempts();
    expect(state.bossAvailability("boss_rei_gosma").state).toBe("ready");
  });
});

describe("Debug Mode — testes de sistemas", () => {
  it("testar loot: taxa ≈ 5% e distribuição de raridade coerente com a config", () => {
    const { tools } = make();
    const r = tools.testLoot(40_000, 100);
    expect(r.dropRate).toBeGreaterThan(config.loot.equipmentChance * 0.85);
    expect(r.dropRate).toBeLessThan(config.loot.equipmentChance * 1.15);
    expect(r.byRarity.common).toBeGreaterThan(r.byRarity.rare);
    expect(r.avgX).toBeGreaterThan(config.loot.x.min);
    expect(r.avgX).toBeLessThan(config.loot.x.max);
  });

  it("testar offline: simula a ausência pelas regras reais (teto Free 2 h)", () => {
    const { state, tools, advance } = make();
    tools.startBattle();
    state.resolveBattleToEnd();
    advance(1000);
    const msg = tools.testOffline(5);
    expect(msg).toMatch(/teto/);
    expect(state.offlineReport).not.toBeNull();
    expect(state.offlineReport!.creditedDurationMs).toBeLessThanOrEqual(config.offline.capFreeMs + 1);
  });

  it("o que depende do online aparece como indisponível, com o motivo", () => {
    expect(DEBUG_UNAVAILABLE.map((d) => d.id)).toEqual(["chat", "auth", "community_market"]);
    expect(DEBUG_UNAVAILABLE.every((d) => d.reason.length > 10)).toBe(true);
  });
});
