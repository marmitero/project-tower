/**
 * Integração — equipamento de ponta a ponta (FASE 9, ADR-023):
 * drop → mochila → equipar → stats/efeitos no combate → vender.
 */
import { describe, expect, it } from "vitest";
import { config, type Rarity } from "@tia/config";
import { GameState, equipmentStats, heroCombatStats, rollEquipmentOf, requiredHeroLevel, migrateSave } from "@tia/game-core";
import type { LootNotice } from "@tia/game-core";
import { Prng } from "@tia/engine";
import { asAccountId } from "@tia/contracts";
import type { Equipment, SaveData } from "@tia/contracts";

const ACCOUNT = asAccountId("equip-account");

function makeState() {
  const loot: LootNotice[] = [];
  const state = GameState.createNew(
    { accountId: ACCOUNT, nickname: "Testador", skinId: "royal", starterIdentityId: "hero_aldric", now: 1_700_000_000_000, masterSeed: 42 },
    { listeners: { onLoot: (d) => loot.push(...d) } },
  );
  const d = state.data as unknown as { king: { level: number }; wallet: { coins: bigint } };
  d.king.level = 60;
  const hero = state.data.heroes[0]!;
  state.assignHeroToSlot(hero.id, 0);
  state.selectActiveHero(hero.id);
  return { state, hero, loot };
}

function give(state: GameState, item: Equipment): Equipment {
  (state.data.inventory.equipment as Equipment[]).push(item);
  return item;
}
function itemOf(templateId: string, rarity: Rarity, level: number, seed = 1) {
  return rollEquipmentOf(new Prng(seed), { accountId: ACCOUNT, origin: "drop", source: { kind: "tower_enemy" }, sourceLevel: level, itemIndex: seed }, { templateId, rarity });
}

describe("drops da Torre entram no inventário", () => {
  it("após muitas vitórias há itens, o banner `onLoot` recebeu cada um e nada se perdeu", () => {
    const { state, loot } = makeState();
    const startCoins = state.data.wallet.coins;
    for (let i = 0; i < 400; i++) {
      state.startTower();
      state.activeBattle!.enemies[0]!.hp = 1;
      state.activeBattle!.allies[0]!.hp = 1e9;
      state.resolveBattleToEnd();
    }
    expect(loot.length).toBeGreaterThan(5); // ~5% de 400
    const stored = loot.filter((l) => l.outcome === "stored").length;
    expect(state.data.inventory.equipment.length).toBe(stored);
    expect(loot.every((l) => l.outcome !== "stored" || l.price === 0n)).toBe(true);
    expect(state.data.wallet.coins).toBeGreaterThan(startCoins);
  });

  it("com a mochila cheia, o drop é vendido na hora (a Coin é creditada)", () => {
    const { state, loot } = makeState();
    for (let i = 0; i < config.inventory.equipmentMaxItems; i++) give(state, itemOf("chest_plate", "common", 10, 900 + i));
    // força um drop: vencer até cair equipamento
    for (let i = 0; i < 2000 && loot.length === 0; i++) {
      state.startTower();
      state.activeBattle!.enemies[0]!.hp = 1;
      state.activeBattle!.allies[0]!.hp = 1e9;
      state.resolveBattleToEnd();
    }
    expect(loot.length).toBeGreaterThan(0);
    expect(loot[0]!.outcome).toBe("autoSold");
    expect(loot[0]!.price).toBeGreaterThan(0n);
    expect(state.data.inventory.equipment).toHaveLength(config.inventory.equipmentMaxItems);
  });
});

describe("equipar pelo GameState", () => {
  it("o combatente da Torre usa o HP e os stats FINAIS (base + equipamento)", () => {
    const { state, hero } = makeState();
    const legs = give(state, itemOf("legs_greaves", "epic", 1));
    state.equip(hero.id, legs.id);
    const finalStats = heroCombatStats(hero, state.data.inventory);
    expect(finalStats.hp).toBe(hero.stats.hp + equipmentStats(legs).hp);
    const battle = state.startTower();
    expect(battle.allies[0]!.maxHp).toBe(finalStats.hp);
    expect(battle.allies[0]!.stats.defense).toBe(finalStats.defense);
  });

  it("o traço da arma chega ao engine (espada ⇒ contracorte)", () => {
    const { state, hero } = makeState();
    const sword = give(state, itemOf("weapon_sword", "common", 1));
    state.equip(hero.id, sword.id);
    const battle = state.startTower();
    const gear = (battle.allies[0] as unknown as { gear: { counters: unknown[] } }).gear;
    expect(gear.counters.length).toBeGreaterThan(0);
  });

  it("não troca equipamento durante a luta; entre as lutas pode", () => {
    const { state, hero } = makeState();
    const chest = give(state, itemOf("chest_plate", "common", 1));
    state.startTower();
    expect(() => state.equip(hero.id, chest.id)).toThrow(/durante a luta/);
    state.activeBattle!.enemies[0]!.hp = 1;
    state.activeBattle!.allies[0]!.hp = 1e9;
    state.resolveBattleToEnd();
    expect(() => state.equip(hero.id, chest.id)).not.toThrow();
  });

  it("requisito de nível é respeitado pelo GameState", () => {
    const { state, hero } = makeState();
    const big = give(state, itemOf("chest_plate", "common", 1000));
    expect(hero.level).toBeLessThan(requiredHeroLevel(big));
    expect(() => state.equip(hero.id, big.id)).toThrow(/nível/i);
  });

  it("vender: credita a Coin, remove o item; equipado não vende; em massa pula o equipado", () => {
    const { state, hero } = makeState();
    const a = give(state, itemOf("chest_plate", "common", 1, 1));
    const b = give(state, itemOf("head_helm", "common", 1, 2));
    const c = give(state, itemOf("boots_runner", "common", 1, 3));
    state.equip(hero.id, a.id);
    expect(() => state.sell(a.id)).toThrow();
    const before = state.data.wallet.coins;
    const price = state.sell(b.id);
    expect(state.data.wallet.coins).toBe(before + price);

    const preview = state.previewBulkSale({ maxRarity: "common" });
    expect(preview.map((i) => i.id)).toEqual([c.id]);
    const r = state.sellItems([a.id, c.id]);
    expect(r.count).toBe(1);
    expect(r.skipped).toBe(1);
    expect(state.data.inventory.equipment.map((i) => i.id)).toEqual([a.id]);
  });
});

describe("migração de save v3 → v4 (ADR-023/024)", () => {
  function legacySave(): SaveData {
    const { state, hero } = makeState();
    const save = JSON.parse(JSON.stringify(state.data, (_k, v) => (typeof v === "bigint" ? `__big:${v}` : v))) as Record<string, unknown>;
    const revive = (v: unknown): unknown => {
      if (typeof v === "string" && v.startsWith("__big:")) return BigInt(v.slice(6));
      if (Array.isArray(v)) return v.map(revive);
      if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, revive(x)]));
      return v;
    };
    const data = revive(save) as SaveData;
    const legacyItem = {
      ...itemOf("boots_runner", "epic", 20, 55),
      itemTypeId: "boots.epic",
      xValues: { hp: 12, attack: 40, specialAttack: 3, defense: 9, specialDefense: 8, critChance: 4, attackSpeed: 20, speed: 33 },
    };
    (data.inventory.equipment as unknown[]).push(legacyItem);
    const h = data.heroes.find((x) => x.id === hero.id)!;
    delete (h as { attributes?: unknown }).attributes;
    delete (h as { quality?: unknown }).quality;
    (h as { rarity: string }).rarity = "common";
    (data as { configVersion: number }).configVersion = 3;
    return data;
  }

  it("itens antigos viram itens do modelo novo, sem perder id/nível/raridade", () => {
    const data = legacySave();
    const legacyId = data.inventory.equipment[0]!.id;
    const migrated = migrateSave(data, config.configVersion);
    const item = migrated.inventory.equipment.find((e) => e.id === legacyId)!;
    expect(item.itemTypeId).toBe("boots_runner");
    expect(item.rarity).toBe("epic");
    expect(item.level).toBe(20);
    expect(Object.keys(item.xValues)).toHaveLength(config.equipment.rarity.epic.statLines);
    expect(migrated.configVersion).toBe(config.configVersion);
  });

  it("herói inicial migrado ganha atributos da classe e vira incomum (adendo)", () => {
    const migrated = migrateSave(legacySave(), config.configVersion);
    const hero = migrated.heroes[0]!;
    expect(hero.rarity).toBe("uncommon");
    expect(hero.attributes).toBeDefined();
    expect(hero.quality).toBe(50);
  });

  it("migrar duas vezes não muda nada (idempotente)", () => {
    const once = migrateSave(legacySave(), config.configVersion);
    expect(migrateSave(once, config.configVersion)).toEqual(once);
  });
});
