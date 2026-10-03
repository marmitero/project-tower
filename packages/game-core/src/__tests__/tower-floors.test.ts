/**
 * Seleção de andar, gate por nível do Rei, recompensas por nível do inimigo,
 * regen em PROCURANDO e conservação de HP no level-up (ADR-021).
 */
import { afterEach, describe, expect, it } from "vitest";
import { applyContentPack, config, evalCurve, exportContentPack, resetContentToDefaults, type ContentPack } from "@tia/config";
import { asAccountId } from "@tia/contracts";
import { GameState } from "../state.js";
import { TowerLockedError, highestUnlockedFloor, towerRewardsForEnemyLevel } from "../tower.js";
import { grantHeroXp, killsToNextKingLevel } from "../progression.js";
import { LocalStoragePersistence, MemoryStorage } from "../persistence/local.js";
import { makeHero, makeKing } from "./fixtures.js";
import { classes } from "@tia/config";

afterEach(() => resetContentToDefaults());

function makeState(kingLevel = 1) {
  let now = 1_700_000_000_000;
  const state = GameState.createNew(
    { accountId: asAccountId("floors-account"), nickname: "Torreiro", skinId: "royal", starterIdentityId: "hero_aldric", now, masterSeed: 11 },
    { now: () => now },
  );
  (state.data.king as { level: number }).level = kingLevel;
  const hero = state.data.heroes[0]!;
  state.assignHeroToSlot(hero.id, 0);
  state.selectActiveHero(hero.id);
  return { state, hero, advance: (ms: number) => (now += ms) };
}

describe("seleção de andar", () => {
  it("Rei nível 1 só alcança o andar 1; o resto está bloqueado com o nível exigido", () => {
    const { state } = makeState(1);
    expect(state.highestUnlockedFloor).toBe(1);
    expect(state.selectFloor(1)).toBe(1);
    try {
      state.selectFloor(2);
      throw new Error("deveria bloquear");
    } catch (e) {
      expect(e).toBeInstanceOf(TowerLockedError);
      expect((e as TowerLockedError).requiredLevel).toBe(10);
    }
    expect(state.currentFloor).toBe(1);
  });

  it("subir de nível libera andares: 10→2, 25→3, 100→5, 2.500→10, 5.000→11, 20.000→40", () => {
    const table: Array<[number, number]> = [[9, 1], [10, 2], [24, 2], [25, 3], [100, 5], [2499, 9], [2500, 10], [4999, 10], [5000, 11], [19_499, 39], [19_500, 40], [20_000, 40]];
    for (const [lv, floor] of table) expect(highestUnlockedFloor(lv), `Nv ${lv}`).toBe(floor);
  });

  it("dá para voltar a um andar mais baixo a qualquer momento", () => {
    const { state } = makeState(2500);
    state.selectFloor(10);
    expect(state.currentFloor).toBe(10);
    state.selectFloor(3);
    expect(state.currentFloor).toBe(3);
  });

  it("a batalha usa o inimigo do andar selecionado, no nível-base do andar", () => {
    const { state } = makeState(2500);
    state.selectFloor(10);
    const battle = state.startTower();
    expect(battle.enemies[0]!.level).toBe(2500);
    state.selectFloor(1); // trocar durante a luta só vale para a PRÓXIMA
    expect(state.activeBattle!.enemies[0]!.level).toBe(2500);
  });

  it("andar inexistente é normalizado no load (conteúdo editado nunca quebra o save)", () => {
    const { state } = makeState(20_000);
    const save = structuredClone(state.data) as typeof state.data;
    save.tower.currentFloor = 999;
    const hydrated = GameState.hydrate(save, { now: () => 1_700_000_000_000, persistence: new LocalStoragePersistence(new MemoryStorage()), masterSeed: 11 });
    expect(hydrated.currentFloor).toBe(40);
    save.tower.currentFloor = -5;
    expect(GameState.hydrate(save, { now: () => 1, persistence: new LocalStoragePersistence(new MemoryStorage()), masterSeed: 11 }).currentFloor).toBe(1);
  });

  it("um pack que remove andares também normaliza o andar atual", () => {
    const { state } = makeState(20_000);
    state.selectFloor(40);
    const pack = exportContentPack() as ContentPack;
    pack.tower.floors.splice(20);
    applyContentPack(pack);
    expect(state.currentFloor).toBe(20);
  });
});

describe("recompensas seguem o nível do inimigo (curvas editáveis)", () => {
  it("XP e Coin por abate crescem com o nível do inimigo", () => {
    const a = towerRewardsForEnemyLevel(1);
    const b = towerRewardsForEnemyLevel(2500);
    const c = towerRewardsForEnemyLevel(19_500);
    expect(b.kingXp).toBeGreaterThan(a.kingXp);
    expect(c.kingXp).toBeGreaterThan(b.kingXp);
    expect(c.coins).toBeGreaterThan(b.coins);
    expect(a.kingXp).toBe(evalCurve(config.tower.rewards.kingXp, 1));
  });

  it("vencer credita a recompensa do inimigo enfrentado (andar 10 → nível 2.500)", () => {
    const { state } = makeState(5000);
    state.selectFloor(10);
    const before = state.data.wallet.coins;
    const kingXpBefore = state.data.king.xp;
    state.startTower();
    const lvl = state.activeBattle!.enemies[0]!.level;
    // força vitória garantida: inimigo com 1 de vida
    (state.activeBattle!.enemies[0] as { hp: number }).hp = 1;
    (state.activeBattle!.allies[0] as { hp: number }).hp = 1_000_000_000;
    state.resolveBattleToEnd();
    const expected = towerRewardsForEnemyLevel(lvl);
    expect(state.data.wallet.coins - before).toBe(BigInt(expected.coins));
    expect(state.data.king.xp - kingXpBefore).toBe(BigInt(expected.kingXp));
  });

  it("editar a curva no pack muda a recompensa na hora (sem código)", () => {
    const pack = exportContentPack() as ContentPack;
    pack.tower.rewards.kingXp.base *= 2;
    const before = towerRewardsForEnemyLevel(100).kingXp;
    applyContentPack(pack);
    expect(towerRewardsForEnemyLevel(100).kingXp).toBeGreaterThan(before * 1.9);
  });

  it("estimativa de abates até o próximo nível (UI)", () => {
    const { king } = makeKing(1);
    const k = killsToNextKingLevel(king, 1)!;
    expect(k).toBeGreaterThan(5);
    expect(k).toBeLessThan(50);
    const capped = makeKing(config.xp.king.levelCap).king;
    expect(killsToNextKingLevel(capped, 1)).toBeNull();
  });
});

describe("regen em PROCURANDO (ADR-021)", () => {
  it("o herói ferido recupera HP ao fim da procura, limitado ao máximo", () => {
    const { state, hero, advance } = makeState(60);
    const max = hero.stats.hp;
    hero.currentHp = Math.floor(max * 0.5);
    state.beginSearch();
    const hunt = state.data.hunt!;
    if (hunt.kind !== "searching") throw new Error("deveria estar procurando");
    advance(hunt.durationMs + 1);
    state.tickSearch();
    const expectedGain = Math.floor(max * config.combat.regenOnSearchingPctPerSec * (hunt.durationMs / 1000));
    expect(state.activeBattle!.allies[0]!.hp).toBe(Math.min(max, Math.floor(max * 0.5) + expectedGain));
  });

  it("herói em HP cheio não passa do máximo e herói caído não regenera", () => {
    const { state, hero, advance } = makeState(60);
    state.beginSearch();
    let hunt = state.data.hunt!;
    if (hunt.kind !== "searching") throw new Error("x");
    advance(hunt.durationMs + 1);
    state.tickSearch();
    expect(state.activeBattle!.allies[0]!.hp).toBe(hero.stats.hp);

    const second = makeState(60);
    second.hero.currentHp = 0;
    second.state.beginSearch();
    hunt = second.state.data.hunt!;
    if (hunt.kind !== "searching") throw new Error("x");
    second.advance(hunt.durationMs + 1);
    second.state.tickSearch();
    expect(second.hero.currentHp).toBe(0);
  });

  it("regenOnSearchingPctPerSec = 0 desliga a regen (configurável)", () => {
    const prev = config.combat.regenOnSearchingPctPerSec;
    config.combat.regenOnSearchingPctPerSec = 0;
    try {
      const { state, hero, advance } = makeState(60);
      hero.currentHp = 10;
      state.beginSearch();
      const hunt = state.data.hunt!;
      if (hunt.kind !== "searching") throw new Error("x");
      advance(hunt.durationMs + 1);
      state.tickSearch();
      expect(state.activeBattle!.allies[0]!.hp).toBe(10);
    } finally {
      config.combat.regenOnSearchingPctPerSec = prev;
    }
  });
});

describe("level-up conserva o HP perdido (a barra não encolhe)", () => {
  it("o HP máximo ganho entra no HP atual", () => {
    const hero = makeHero(0, 0, 1);
    const growth = classes[0]!.growth;
    const maxBefore = hero.stats.hp;
    hero.currentHp = maxBefore - 30;
    grantHeroXp(hero, 10_000_000n, growth);
    expect(hero.level).toBeGreaterThan(1);
    const gained = hero.stats.hp - maxBefore;
    expect(hero.currentHp).toBe(maxBefore - 30 + gained);
  });

  it("herói caído (0 HP) continua caído ao subir de nível", () => {
    const hero = makeHero(0, 0, 1);
    hero.currentHp = 0;
    grantHeroXp(hero, 10_000_000n, classes[0]!.growth);
    expect(hero.currentHp).toBe(0);
  });
});
