import { describe, expect, it } from "vitest";
import { config, RARITY_ORDER, type Rarity } from "@tia/config";
import type { Equipment } from "@tia/contracts";
import { Prng } from "@tia/engine";
import {
  addEquipment,
  AlreadyEquippedError,
  bagCount,
  equipItem,
  EquipRequirementError,
  findEquipment,
  heroCombatEffects,
  heroCombatStats,
  heroPower,
  InventoryFullError,
  isBagFull,
  ItemEquippedError,
  ItemLockedError,
  removeEquipment,
  selectForBulkSale,
  sellEquipment,
  sellMany,
  sellPriceOf,
  storeDrop,
  unequipItem,
} from "../inventory.js";
import { rollEquipment, rollEquipmentOf } from "../loot.js";
import { equipmentStats, requiredHeroLevel } from "../gear.js";
import { ACCOUNT, makeHero, makeInventory } from "./fixtures.js";

const CTX = { accountId: ACCOUNT, origin: "drop" as const, source: { kind: "tower_enemy" as const }, sourceLevel: 10, itemIndex: 0 };

function freshItem(seed: number, index = 0): Equipment {
  const rng = new Prng(seed);
  for (let i = 0; i < 5000; i++) {
    const item = rollEquipment(rng, { ...CTX, itemIndex: index * 100 + i });
    if (item) return item;
  }
  throw new Error("não sorteou item");
}

/** Item de template/raridade/nível fixos (id único por seed). */
function itemOf(templateId: string, rarity: Rarity, level: number, seed = 1): Equipment {
  return rollEquipmentOf(new Prng(seed), { ...CTX, sourceLevel: level, itemIndex: seed }, { templateId, rarity });
}

describe("mochila (§13, §70)", () => {
  it("começa vazia", () => {
    const inv = makeInventory();
    expect(inv.equipment).toHaveLength(0);
    expect(inv.items).toHaveLength(0);
  });

  it("heróis são ilimitados: não existe limite de herói na config", () => {
    expect(config.inventory.heroLimit).toBeNull();
  });

  it("adiciona, encontra e remove equipamento", () => {
    const inv = makeInventory();
    const item = freshItem(1);
    addEquipment(inv, item);
    expect(findEquipment(inv, item.id)).toEqual(item);
    expect(removeEquipment(inv, item.id).id).toBe(item.id);
    expect(inv.equipment).toHaveLength(0);
  });

  it("remover item inexistente é erro explícito, não silencioso", () => {
    expect(() => removeEquipment(makeInventory(), "equip_nope" as never)).toThrow(/não encontrado/);
  });

  it("estoura o limite em vez de aceitar infinitos itens (⛔ P-016)", () => {
    const inv = makeInventory();
    for (let i = 0; i < config.inventory.equipmentMaxItems; i++) addEquipment(inv, freshItem(1000 + i, i));
    expect(isBagFull(inv, [])).toBe(true);
    expect(() => addEquipment(inv, freshItem(99999))).toThrow(InventoryFullError);
  });

  it("a mensagem de limite cita a pendência, para ninguém ler como regra", () => {
    const inv = makeInventory();
    for (let i = 0; i < config.inventory.equipmentMaxItems; i++) addEquipment(inv, freshItem(2000 + i, i));
    expect(() => addEquipment(inv, freshItem(88888))).toThrow(/P-016/);
  });

  it("a capacidade conta só os itens NÃO equipados: equipar libera espaço", () => {
    const inv = makeInventory();
    const hero = makeHero(0, 0, 30);
    const items: Equipment[] = [];
    for (let i = 0; i < config.inventory.equipmentMaxItems; i++) {
      const it = itemOf("chest_plate", "common", 10, 5000 + i);
      items.push(it);
      addEquipment(inv, it);
    }
    expect(isBagFull(inv, [hero])).toBe(true);
    equipItem(inv, hero, items[0]!.id, [hero]);
    expect(bagCount(inv, [hero])).toBe(config.inventory.equipmentMaxItems - 1);
    expect(isBagFull(inv, [hero])).toBe(false);
  });
});

describe("mochila cheia — drop (⛔ P-016, ADR-023)", () => {
  function fullBag() {
    const inv = makeInventory();
    for (let i = 0; i < config.inventory.equipmentMaxItems; i++) addEquipment(inv, freshItem(7000 + i, i));
    return inv;
  }

  it("padrão: vende na hora pelo preço normal (idle nunca trava nem perde valor)", () => {
    expect(config.inventory.onFull).toBe("autoSell");
    const inv = fullBag();
    const wallet = { coins: 0n };
    const item = freshItem(31337);
    const r = storeDrop(inv, wallet, [], item);
    expect(r.outcome).toBe("autoSold");
    expect(r.price).toBe(sellPriceOf(item));
    expect(wallet.coins).toBe(r.price);
    expect(inv.equipment).toHaveLength(config.inventory.equipmentMaxItems);
  });

  it("com onFull = discard o item é descartado e nenhuma Coin entra", () => {
    const inv = fullBag();
    const wallet = { coins: 0n };
    config.inventory.onFull = "discard";
    try {
      const r = storeDrop(inv, wallet, [], freshItem(31338));
      expect(r.outcome).toBe("discarded");
      expect(wallet.coins).toBe(0n);
    } finally {
      config.inventory.onFull = "autoSell";
    }
  });

  it("com espaço, o item vai para a mochila", () => {
    const inv = makeInventory();
    const r = storeDrop(inv, { coins: 0n }, [], freshItem(5));
    expect(r.outcome).toBe("stored");
    expect(inv.equipment).toHaveLength(1);
  });
});

describe("venda (§39, ⛔ P-008 provisório)", () => {
  it("venda credita Coin e remove o item", () => {
    const inv = makeInventory();
    const wallet = { coins: 0n };
    const item = freshItem(3);
    addEquipment(inv, item);
    const { price } = sellEquipment(inv, wallet, item.id);
    expect(wallet.coins).toBe(price);
    expect(inv.equipment).toHaveLength(0);
  });

  it("venda está habilitada — §39 exige que exista", () => {
    expect(config.economy.equipment.sellEnabled).toBe(true);
  });

  it("preço é sempre positivo: vender nunca destrói moeda", () => {
    for (let seed = 0; seed < 60; seed++) expect(sellPriceOf(freshItem(3000 + seed))).toBeGreaterThan(0n);
  });

  it("o preço escala com o NÍVEL do item (mesma curva de Coin da Torre)", () => {
    const low = itemOf("chest_plate", "rare", 10);
    const high = { ...low, level: 1000 };
    expect(sellPriceOf(high)).toBeGreaterThan(sellPriceOf(low) * 50n);
  });

  it("o preço sobe com a raridade, na razão de `sell.killsEquivalent`", () => {
    const base = itemOf("chest_plate", "common", 500);
    const prices = RARITY_ORDER.map((r) => sellPriceOf({ ...base, rarity: r }));
    for (let i = 1; i < prices.length; i++) expect(prices[i]!).toBeGreaterThan(prices[i - 1]!);
    const ratio = Number(prices[5]!) / Number(prices[0]!);
    const expected = config.equipment.sell.killsEquivalent.celestial / config.equipment.sell.killsEquivalent.common;
    expect(ratio).toBeCloseTo(expected, 0);
  });

  it("a Nota premia o preço (fator min..max), independente do poder", () => {
    const base = itemOf("chest_plate", "rare", 500);
    const bad = sellPriceOf({ ...base, quality: 0 });
    const good = sellPriceOf({ ...base, quality: 100 });
    expect(Number(good) / Number(bad)).toBeCloseTo(config.equipment.sell.qualityFactorMax / config.equipment.sell.qualityFactorMin, 1);
  });

  it("o preço é DADO: editar `sell.killsEquivalent` muda o preço sem tocar em código", () => {
    const item = itemOf("chest_plate", "epic", 100);
    const before = sellPriceOf(item);
    config.equipment.sell.killsEquivalent.epic *= 2;
    try {
      expect(sellPriceOf(item)).toBeGreaterThanOrEqual(before * 2n - 1n);
    } finally {
      config.equipment.sell.killsEquivalent.epic /= 2;
    }
  });

  it("item equipado NÃO é vendido (proteção contra o clique errado)", () => {
    const inv = makeInventory();
    const hero = makeHero(0, 0, 30);
    const item = itemOf("chest_plate", "common", 10);
    addEquipment(inv, item);
    equipItem(inv, hero, item.id, [hero]);
    expect(() => sellEquipment(inv, { coins: 0n }, item.id, [hero])).toThrow(ItemEquippedError);
    expect(inv.equipment).toHaveLength(1);
  });

  it("item travado no mercado NÃO é vendido", () => {
    const inv = makeInventory();
    const item = { ...itemOf("chest_plate", "common", 10), lockedByListingId: "lst_1" };
    addEquipment(inv, item);
    expect(() => sellEquipment(inv, { coins: 0n }, item.id, [])).toThrow(ItemLockedError);
  });

  it("venda em massa: vende os elegíveis, pula os equipados, soma a Coin", () => {
    const inv = makeInventory();
    const hero = makeHero(0, 0, 30);
    const items = [1, 2, 3, 4].map((n) => itemOf("chest_plate", "common", 10, 100 + n));
    for (const i of items) addEquipment(inv, i);
    equipItem(inv, hero, items[0]!.id, [hero]);
    const wallet = { coins: 0n };
    const r = sellMany(inv, wallet, items.map((i) => i.id), [hero]);
    expect(r.sold).toHaveLength(3);
    expect(r.skipped).toBe(1);
    expect(wallet.coins).toBe(r.total);
    expect(inv.equipment).toHaveLength(1);
  });

  it("filtro de venda em massa: até a raridade, Nota abaixo do limite, só a mochila", () => {
    const inv = makeInventory();
    const hero = makeHero(0, 0, 30);
    const a = { ...itemOf("chest_plate", "common", 10, 201), quality: 10 };
    const b = { ...itemOf("head_helm", "common", 10, 202), quality: 80 };
    const c = { ...itemOf("legs_greaves", "epic", 10, 203), quality: 10 };
    const d = { ...itemOf("boots_runner", "common", 10, 204), quality: 10 };
    for (const i of [a, b, c, d]) addEquipment(inv, i);
    equipItem(inv, hero, d.id, [hero]);
    const picked = selectForBulkSale(inv, [hero], { maxRarity: "uncommon", qualityBelow: 50 });
    expect(picked.map((i) => i.id)).toEqual([a.id]);
    expect(selectForBulkSale(inv, [hero], { maxRarity: "epic" }).map((i) => i.id).sort()).toEqual([a.id, b.id, c.id].sort());
    expect(selectForBulkSale(inv, [hero], { maxRarity: "epic", slot: "head" }).map((i) => i.id)).toEqual([b.id]);
  });
});

describe("equipar (§70, ⛔ P-033 requisito, ⛔ P-024 afinidade)", () => {
  it("equipar não remove o item do inventário", () => {
    const inv = makeInventory();
    const hero = makeHero(0, 0, 30);
    const item = itemOf("chest_plate", "common", 10);
    addEquipment(inv, item);
    equipItem(inv, hero, item.id, [hero]);
    expect(hero.equipped.chest).toBe(item.id);
    expect(findEquipment(inv, item.id)).toBeDefined();
  });

  it("stats finais incluem o equipamento e o poder do herói sobe", () => {
    const inv = makeInventory();
    const hero = makeHero(0, 0, 30);
    const before = heroPower(hero, inv);
    const item = itemOf("chest_plate", "rare", 30);
    addEquipment(inv, item);
    equipItem(inv, hero, item.id, [hero]);
    const stats = heroCombatStats(hero, inv);
    expect(stats.defense).toBe(hero.stats.defense + equipmentStats(item).defense);
    expect(heroPower(hero, inv)).toBeGreaterThan(before);
  });

  it("exige nível: herói abaixo de ceil(nível do item × levelRatio) não equipa", () => {
    const inv = makeInventory();
    const hero = makeHero(0, 0, 10);
    const item = itemOf("chest_plate", "common", 100);
    addEquipment(inv, item);
    expect(requiredHeroLevel(item)).toBe(Math.ceil(100 * config.equipment.requirement.levelRatio));
    expect(() => equipItem(inv, hero, item.id, [hero])).toThrow(EquipRequirementError);
    expect(hero.equipped.chest).toBeUndefined();
    hero.level = requiredHeroLevel(item);
    expect(() => equipItem(inv, hero, item.id, [hero])).not.toThrow();
  });

  it("o requisito é DADO: levelRatio 0 libera tudo", () => {
    const inv = makeInventory();
    const hero = makeHero(0, 0, 1);
    const item = itemOf("chest_plate", "common", 5000);
    addEquipment(inv, item);
    config.equipment.requirement.levelRatio = 0;
    try {
      expect(() => equipItem(inv, hero, item.id, [hero])).not.toThrow();
    } finally {
      config.equipment.requirement.levelRatio = 0.9;
    }
  });

  it("item acima do nível (conteúdo editado depois de equipar) fica INATIVO, sem quebrar", () => {
    const inv = makeInventory();
    const hero = makeHero(0, 0, 20);
    const item = itemOf("chest_plate", "common", 20);
    addEquipment(inv, item);
    equipItem(inv, hero, item.id, [hero]);
    const withItem = heroCombatStats(hero, inv).defense;
    config.equipment.requirement.levelRatio = 2; // fora do validável, só para provar o comportamento
    try {
      expect(heroCombatStats(hero, inv).defense).toBe(hero.stats.defense);
      expect(withItem).toBeGreaterThan(hero.stats.defense);
    } finally {
      config.equipment.requirement.levelRatio = 0.9;
    }
  });

  it("não permite o mesmo item em dois heróis", () => {
    const inv = makeInventory();
    const a = makeHero(0, 0, 30);
    const b = makeHero(1, 1, 30);
    const item = itemOf("chest_plate", "common", 10);
    addEquipment(inv, item);
    equipItem(inv, a, item.id, [a, b]);
    expect(() => equipItem(inv, b, item.id, [a, b])).toThrow(AlreadyEquippedError);
  });

  it("slot ocupado: o novo item SUBSTITUI o anterior, que volta à mochila", () => {
    const inv = makeInventory();
    const hero = makeHero(0, 0, 30);
    const first = itemOf("chest_plate", "common", 10, 1);
    const second = itemOf("chest_plate", "rare", 10, 2);
    addEquipment(inv, first);
    addEquipment(inv, second);
    equipItem(inv, hero, first.id, [hero]);
    const { replaced } = equipItem(inv, hero, second.id, [hero]);
    expect(replaced?.id).toBe(first.id);
    expect(hero.equipped.chest).toBe(second.id);
    expect(bagCount(inv, [hero])).toBe(1);
  });

  it("desequipar devolve o item à mochila e limpa o slot", () => {
    const inv = makeInventory();
    const hero = makeHero(0, 0, 30);
    const item = itemOf("chest_plate", "common", 10);
    addEquipment(inv, item);
    equipItem(inv, hero, item.id, [hero]);
    expect(unequipItem(inv, hero, "chest")).toBe(item.id);
    expect(hero.equipped.chest).toBeUndefined();
    expect(bagCount(inv, [hero])).toBe(1);
    expect(unequipItem(inv, hero, "chest")).toBeNull();
  });

  it("item travado no mercado não equipa", () => {
    const inv = makeInventory();
    const hero = makeHero(0, 0, 30);
    const item = { ...itemOf("chest_plate", "common", 10), lockedByListingId: "lst_1" };
    addEquipment(inv, item);
    expect(() => equipItem(inv, hero, item.id, [hero])).toThrow(ItemLockedError);
  });

  it("equipar arma fora da afinidade é permitido (⛔ P-024 — bônus, não parede)", () => {
    const inv = makeInventory();
    const guardian = makeHero(0, 0, 30); // afinidade: espada
    const staff = itemOf("weapon_staff", "common", 10);
    addEquipment(inv, staff);
    expect(() => equipItem(inv, guardian, staff.id, [guardian])).not.toThrow();
  });

  it("afinidade: a arma da classe dá +5% no ataque principal (e só ela)", () => {
    const inv = makeInventory();
    const hero = makeHero(0, 0, 30); // guardião, espada, físico
    const sword = itemOf("weapon_sword", "common", 30);
    const axe = itemOf("weapon_axe", "common", 30, 2);
    addEquipment(inv, sword);
    addEquipment(inv, axe);

    equipItem(inv, hero, axe.id, [hero]);
    const withAxe = heroCombatStats(hero, inv).attack;
    expect(withAxe).toBe(hero.stats.attack + equipmentStats(axe).attack);

    equipItem(inv, hero, sword.id, [hero]);
    const raw = hero.stats.attack + equipmentStats(sword).attack;
    expect(heroCombatStats(hero, inv).attack).toBe(Math.floor(raw * (1 + config.equipment.affinityBonus)));
    // o ataque especial (que o guardião não usa) não ganha o bônus
    expect(heroCombatStats(hero, inv).specialAttack).toBe(hero.stats.specialAttack + equipmentStats(sword).specialAttack);
  });

  it("efeitos: o traço da arma e a característica chegam ao combate", () => {
    const inv = makeInventory();
    const hero = makeHero(0, 0, 30);
    const sword = itemOf("weapon_sword", "celestial", 30);
    addEquipment(inv, sword);
    equipItem(inv, hero, sword.id, [hero]);
    const kinds = heroCombatEffects(hero, inv).map((e) => e.kind);
    expect(kinds).toContain("counter"); // traço da espada
    expect(sword.featureId).toBeDefined(); // celestial
    expect(kinds.length).toBeGreaterThan(1);
  });

  it("HP: equipar +HP máx. concede +HP atual; desequipar tira sem matar; caído continua caído", () => {
    const inv = makeInventory();
    const hero = makeHero(0, 0, 30);
    hero.currentHp = Math.floor(hero.stats.hp * 0.5);
    const start = hero.currentHp;
    const legs = itemOf("legs_greaves", "epic", 30);
    addEquipment(inv, legs);
    const gain = equipmentStats(legs).hp;
    expect(gain).toBeGreaterThan(0);

    equipItem(inv, hero, legs.id, [hero]);
    expect(hero.currentHp).toBe(start + gain);
    expect(heroCombatStats(hero, inv).hp).toBe(hero.stats.hp + gain);

    unequipItem(inv, hero, "legs");
    expect(hero.currentHp).toBe(start);

    // desequipar nunca derruba para 0
    hero.currentHp = 1;
    equipItem(inv, hero, legs.id, [hero]);
    unequipItem(inv, hero, "legs");
    expect(hero.currentHp).toBeGreaterThanOrEqual(1);

    // herói caído não é curado por trocar de peça
    hero.currentHp = 0;
    equipItem(inv, hero, legs.id, [hero]);
    expect(hero.currentHp).toBe(0);
  });
});
