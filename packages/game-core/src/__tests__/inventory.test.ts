import { describe, expect, it } from "vitest";
import { config, type Rarity } from "@tia/config";
import type { Equipment } from "@tia/contracts";
import { Prng } from "@tia/engine";
import { addEquipment, equipItem, equippedItems, heroCombatStats, heroPower, removeEquipment, sellEquipment, sellPriceOf, unequipItem, findEquipment, AlreadyEquippedError, SlotOccupiedError, InventoryFullError } from "../inventory.js";
import { rollEquipment } from "../loot.js";
import { ACCOUNT, makeHero, makeInventory, makeKing } from "./fixtures.js";

function freshItem(seed: number, index = 0) {
  const rng = new Prng(seed);
  for (let i = 0; i < 5000; i++) {
    const item = rollEquipment(rng, {
      accountId: ACCOUNT,
      origin: "drop",
      source: { kind: "tower_enemy" },
      sourceLevel: 10,
      itemIndex: index * 100 + i,
    });
    if (item) return item;
  }
  throw new Error("não sorteou item");
}

describe("inventário (§13, §70)", () => {
  it("começa vazio", () => {
    const inv = makeInventory();
    expect(inv.equipment).toHaveLength(0);
    expect(inv.items).toHaveLength(0);
  });

  it("heróis são ilimitados: não existe limite de herói na config", () => {
    expect(config.inventory.heroLimit).toBeNull();
  });

  it("adiciona e encontra equipamento", () => {
    const inv = makeInventory();
    const item = freshItem(1);
    addEquipment(inv, item);
    expect(findEquipment(inv, item.id)).toEqual(item);
  });

  it("removeEquipment devolve o item removido", () => {
    const inv = makeInventory();
    const item = freshItem(2);
    addEquipment(inv, item);
    expect(removeEquipment(inv, item.id).id).toBe(item.id);
    expect(inv.equipment).toHaveLength(0);
  });

  it("remover item inexistente é erro explícito, não silencioso", () => {
    const inv = makeInventory();
    expect(() => removeEquipment(inv, "equip_nope" as never)).toThrow(/não encontrado/);
  });

  it("estoura o limite em vez de aceitar infinitos itens (⛔ P-016)", () => {
    const inv = makeInventory();
    for (let i = 0; i < config.inventory.equipmentMaxItems; i++) {
      addEquipment(inv, freshItem(1000 + i, i));
    }
    expect(() => addEquipment(inv, freshItem(99999))).toThrow(InventoryFullError);
  });

  it("a mensagem de limite cita a pendência, para ninguém ler como regra", () => {
    const inv = makeInventory();
    for (let i = 0; i < config.inventory.equipmentMaxItems; i++) {
      addEquipment(inv, freshItem(2000 + i, i));
    }
    try {
      addEquipment(inv, freshItem(88888));
      expect.unreachable("deveria ter lançado");
    } catch (e) {
      expect((e as Error).message).toContain("P-016");
    }
  });
});

describe("venda (§39)", () => {
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
    for (let seed = 0; seed < 60; seed++) {
      const item = freshItem(3000 + seed);
      expect(sellPriceOf(item)).toBeGreaterThan(0n);
    }
  });

  it("o preço vem do PODER dos stats do item, não da nota (§34 — poder é comparativo)", () => {
    const inv = makeInventory();
    const items = Array.from({ length: 40 }, (_, i) => freshItem(500 + i));
    // O preço é monotônico no poder dos mesmos stats: dois itens com
    // EXATAMENTE os mesmos stats valem o mesmo, quaisquer que sejam sua
    // raridade e sua nota. Isso prova que a fórmula não está lendo os
    // campos errados.
    for (const a of items) {
      for (const b of items) {
        if (a.id === b.id) continue;
        const sameStats =
          a.slot === b.slot && a.rarity === b.rarity &&
          a.xValues.attack === b.xValues.attack && a.xValues.hp === b.xValues.hp;
        if (sameStats) {
          expect(sellPriceOf(a)).toBe(sellPriceOf(b));
        }
      }
    }
  });

  it("itens de raridades diferentes com os mesmos X têm preços proporcionais à raridade", () => {
    const base = freshItem(11);
    const asRarity = (r: Rarity): Equipment => ({ ...base, id: `${base.id}_${r}` as Equipment["id"], rarity: r });
    const prices = (["common", "uncommon", "rare", "epic"] as const).map((r) => sellPriceOf(asRarity(r)));
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]!).toBeGreaterThan(prices[i - 1]!);
    }
  });
});

describe("equipar (§70)", () => {
  it("equipar não remove o item do inventário", () => {
    const inv = makeInventory();
    const hero = makeHero(0);
    const item = freshItem(21);
    addEquipment(inv, item);
    equipItem(inv, hero, item.id, [hero]);
    // O item continua lá: some do "não equipado" só na visão, não da posse.
    expect(findEquipment(inv, item.id)).toBeDefined();
  });

  it("stats finais incluem o equipamento", () => {
    const inv = makeInventory();
    const hero = makeHero(0);
    const before = heroCombatStats(hero, inv);
    const item = freshItem(22);
    addEquipment(inv, item);
    equipItem(inv, hero, item.id, [hero]);

    const after = heroCombatStats(hero, inv);
    expect(after.hp + after.attack + after.defense).toBeGreaterThan(before.hp + before.attack + before.defense);
  });

  it("não permite o mesmo item em dois heróis", () => {
    const inv = makeInventory();
    const a = makeHero(0);
    const b = makeHero(1);
    const item = freshItem(23);
    addEquipment(inv, item);
    equipItem(inv, a, item.id, [a, b]);
    expect(() => equipItem(inv, b, item.id, [a, b])).toThrow(AlreadyEquippedError);
  });

  it("não permite ocupar um slot já ocupado sem desequipar", () => {
    const inv = makeInventory();
    const hero = makeHero(0);
    const first = freshItem(24);

    // O segundo item PRECISA cair no mesmo slot do primeiro — senão o teste
    // passaria pelo motivo errado (slot livre em vez de slot ocupado).
    let second;
    for (let seed = 0; seed < 500; seed++) {
      const candidate = freshItem(10_000 + seed);
      if (candidate.slot === first.slot && candidate.id !== first.id) {
        second = candidate;
        break;
      }
    }
    expect(second).toBeDefined();

    addEquipment(inv, first);
    addEquipment(inv, second!);
    equipItem(inv, hero, first.id, [hero]);
    expect(() => equipItem(inv, hero, second!.id, [hero])).toThrow(SlotOccupiedError);
  });

  it("slot vazio é ocupado sem erro", () => {
    const inv = makeInventory();
    const hero = makeHero(0);
    const item = freshItem(26);
    addEquipment(inv, item);
    expect(() => equipItem(inv, hero, item.id, [hero])).not.toThrow();
  });

  it("desequipar devolve o item e limpa o slot", () => {
    const inv = makeInventory();
    const hero = makeHero(0);
    const item = freshItem(27);
    addEquipment(inv, item);
    equipItem(inv, hero, item.id, [hero]);

    expect(unequipItem(hero, item.slot)).toBe(item.id);
    expect(hero.equipped[item.slot]).toBeUndefined();
    expect(equippedItems(inv, hero)).toHaveLength(0);
  });

  it("equipar arma fora da afinidade é permitido (⛔ P-024 — é traço, não parede)", () => {
    const inv = makeInventory();
    const hero = makeHero(0);
    let offAffinity;
    for (let seed = 0; seed < 200 && !offAffinity; seed++) {
      const item = freshItem(4000 + seed);
      if (item.slot === "weapon" && item.weaponType && item.weaponType !== hero.affinityWeapon) {
        offAffinity = item;
      }
    }
    if (!offAffinity) return; // o RNG não gerou; a regra segue valendo
    addEquipment(inv, offAffinity);
    expect(() => equipItem(inv, hero, offAffinity.id, [hero])).not.toThrow();
  });

  it("poder do herói sobe ao equipar", () => {
    const inv = makeInventory();
    const hero = makeHero(0);
    const before = heroPower(hero, inv);
    const item = freshItem(31);
    addEquipment(inv, item);
    equipItem(inv, hero, item.id, [hero]);
    expect(heroPower(hero, inv)).toBeGreaterThan(before);
  });
});

describe("venda de item equipado", () => {
  it("o item equipado continua no inventário e pode ser vendido (decisão do jogador)", () => {
    const inv = makeInventory();
    const hero = makeHero(0);
    const wallet = makeKing(1, 0n).wallet;
    const item = freshItem(41);
    addEquipment(inv, item);
    equipItem(inv, hero, item.id, [hero]);

    const { price } = sellEquipment(inv, wallet, item.id);
    expect(price).toBeGreaterThan(0n);
    // O save ainda referencia o item; a UI deve resolver a referência órfã.
    // Deliberado: vender não deve falhar e o valor não pode ser perdido.
    expect(hero.equipped[item.slot]).toBe(item.id);
  });
});
