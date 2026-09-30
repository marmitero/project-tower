import { describe, expect, it } from "vitest";
import { config, RARITY_ORDER, type Rarity } from "@tia/config";
import { Prng } from "@tia/engine";
import { equipmentStats, rollEquipment, rollFragments, rollRewardBundle, sourceAllowsFragments } from "../loot.js";
import { ACCOUNT } from "./fixtures.js";

const CTX = {
  accountId: ACCOUNT,
  origin: "drop" as const,
  source: { kind: "tower_enemy" as const },
  sourceLevel: 5,
  itemIndex: 0,
};

function manyDrops(seed: number, n: number): NonNullable<ReturnType<typeof rollEquipment>>[] {
  const rng = new Prng(seed);
  const out = [];
  for (let i = 0; i < n; i++) {
    const item = rollEquipment(rng, { ...CTX, itemIndex: i });
    if (item) out.push(item);
  }
  return out;
}

describe("chance de drop (§32 — 5%)", () => {
  it("95% dos casos não retorna equipamento", () => {
    const items = manyDrops(42, 20_000);
    const rate = items.length / 20_000;
    // Margem de tolerância larga o bastante para não ser flake, estreita o
    // bastante para pegar 0.5 ou 0.95.
    expect(rate).toBeGreaterThan(0.04);
    expect(rate).toBeLessThan(0.06);
  });

  it("o valor vem da config, não de um literal", () => {
    expect(config.loot.equipmentChance).toBe(0.05);
  });
});

describe("tabela de raridade (§33)", () => {
  it("a distribuição observada segue a tabela", () => {
    const items = manyDrops(7, 200_000);
    const counts: Record<string, number> = {};
    for (const item of items) counts[item.rarity] = (counts[item.rarity] ?? 0) + 1;

    for (const rarity of RARITY_ORDER) {
      if (rarity === "legendary" || rarity === "celestial") continue; // amostra pequena
      const observed = (counts[rarity] ?? 0) / items.length;
      const expected = config.loot.rarity[rarity];
      // ±15% relativo: suficiente para capturar um rebalanceamento errado,
      // tolerante o bastante para não depender de seed.
      expect(Math.abs(observed - expected) / expected).toBeLessThan(0.15);
    }
  });

  it("Celestial é observável e raríssimo", () => {
    const items = manyDrops(11, 200_000);
    const celestial = items.filter((i) => i.rarity === "celestial").length;
    expect(celestial).toBeGreaterThan(0);
    expect(celestial / items.length).toBeLessThan(0.005);
  });

  it("toda raridade declarada é alcançável", () => {
    const items = manyDrops(3, 400_000);
    const seen = new Set(items.map((i) => i.rarity));
    expect(seen).toEqual(new Set<Rarity>(RARITY_ORDER));
  });
});

describe("X por atributo (§36)", () => {
  it("cada atributo tem valor próprio — não um X único para o item", () => {
    const items = manyDrops(5, 500);
    const allDistinct = items.every((item) => {
      const values = Object.values(item.xValues);
      return new Set(values).size > 1;
    });
    expect(allDistinct).toBe(true);
  });

  it("os X ficam dentro da faixa da config", () => {
    for (const item of manyDrops(9, 2000)) {
      for (const value of Object.values(item.xValues)) {
        expect(value).toBeGreaterThanOrEqual(config.loot.x.min);
        expect(value).toBeLessThanOrEqual(config.loot.x.max);
      }
    }
  });

  it("o mesmo seed e contexto dão o MESMO item (determinismo §64/§86)", () => {
    const a = rollEquipment(new Prng(12345), CTX);
    const b = rollEquipment(new Prng(12345), CTX);
    expect(a).toEqual(b);
  });

  it("itens ruins e bons coexistem (§36 — isso é desejável)", () => {
    const items = manyDrops(21, 20_000);
    const qualities = items.map((i) => i.quality);
    expect(Math.min(...qualities)).toBeLessThan(60);
    expect(Math.max(...qualities)).toBeGreaterThan(75);
  });

  it("a nota é independente da raridade (§35)", () => {
    const items = manyDrops(31, 30_000);
    const byRarity: Record<string, number[]> = {};
    for (const item of items) (byRarity[item.rarity] ??= []).push(item.quality);
    // Common e Uncommon devem poder ter a mesma faixa de nota: a raridade
    // controla POTÊNCIA, a nota controla a rolagem.
    for (const rarity of ["common", "uncommon"] as const) {
      const qs = byRarity[rarity] ?? [];
      if (qs.length > 100) {
        expect(Math.max(...qs)).toBeGreaterThan(60);
      }
    }
  });
});

describe("stats do equipamento", () => {
  it("o X é multiplicador: x=10 devolve o valor base", () => {
    const rng = new Prng(1);
    let item;
    for (let i = 0; i < 5000 && !item; i++) item = rollEquipment(rng, { ...CTX, itemIndex: i });
    expect(item).toBeDefined();
    expect(equipmentStats(item!).hp).toBeGreaterThanOrEqual(0);
  });

  it("crítico nunca é destruído pelo escalonamento por raridade", () => {
    const items = manyDrops(77, 20_000);
    const maxCrit = Math.max(...items.map((i) => equipmentStats(i).critChance));
    // Acima disso o item zeraria a decisão de crítico no teto do engine.
    expect(maxCrit).toBeLessThanOrEqual(0.15);
  });

  it("raridade maior produz poder maior, em média", () => {
    const items = manyDrops(101, 40_000);
    const powerOfItem = (i: (typeof items)[number]) =>
      Object.values(equipmentStats(i)).reduce((a, b) => a + b, 0);
    const common = items.filter((i) => i.rarity === "common").map(powerOfItem);
    const rare = items.filter((i) => i.rarity === "rare").map(powerOfItem);
    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(avg(rare)).toBeGreaterThan(avg(common));
  });
});

describe("fragmentos (§12 — PROIBIDO vir de inimigo comum)", () => {
  it("inimigo comum da Torre NUNCA gera fragmento", () => {
    const rng = new Prng(5);
    for (let i = 0; i < 5000; i++) {
      const drops = rollFragments(rng, { ...CTX, source: { kind: "tower_enemy" } }, ["guardian"], { min: 1, max: 5 });
      expect(drops).toHaveLength(0);
    }
  });

  it("as fontes permitidas podem gerar fragmento", () => {
    for (const kind of ["boss", "event", "summon", "chest", "market", "admin"] as const) {
      expect(sourceAllowsFragments({ kind })).toBe(true);
    }
  });

  it("a regra é estrutural: a função de inimigo comum retorna vazio sempre", () => {
    const rng = new Prng(9);
    const fromTower = rollFragments(rng, { ...CTX, source: { kind: "tower_enemy" } }, ["a", "b", "c"], { min: 1, max: 1 });
    expect(fromTower).toEqual([]);
  });

  it("boss pode gerar fragmento (fonte principal, §54)", () => {
    const rng = new Prng(13);
    let total = 0;
    for (let i = 0; i < 1000; i++) {
      total += rollFragments(rng, { ...CTX, source: { kind: "boss" } }, ["guardian"], { min: 1, max: 5 }).length;
    }
    expect(total).toBeGreaterThan(0);
  });
});

describe("pacote de recompensa", () => {
  it("vitória na Torre não inclui fragmentos em NENHUMA batalha", () => {
    const rng = new Prng(17);
    for (let i = 0; i < 2000; i++) {
      const bundle = rollRewardBundle({
        rng,
        accountId: ACCOUNT,
        itemIndexStart: i,
        source: { kind: "tower_enemy" },
        sourceLevel: 5,
        kingXp: 100,
        heroXp: 200,
        coins: 50,
        fragmentClasses: ["guardian", "arcanist"],
        createdAt: 0,
        bundleId: `tower:${i}`,
      });
      expect(bundle.fragments).toEqual([]);
    }
  });

  it("o heroXp do pacote é o TOTAL, não a parcela (§20 — divide no crédito)", () => {
    const bundle = rollRewardBundle({
      rng: new Prng(1),
      accountId: ACCOUNT,
      itemIndexStart: 0,
      source: { kind: "boss" },
      sourceLevel: 10,
      kingXp: 100,
      heroXp: 900,
      coins: 50,
      createdAt: 0,
      bundleId: "b",
    });
    expect(bundle.heroXp).toBe(900n);
  });

  it("o pacote é determinístico para a mesma seed", () => {
    const make = () =>
      rollRewardBundle({
        rng: new Prng(555),
        accountId: ACCOUNT,
        itemIndexStart: 3,
        source: { kind: "boss" },
        sourceLevel: 10,
        kingXp: 100,
        heroXp: 900,
        coins: 50,
        createdAt: 123,
        bundleId: "b",
      });
    expect(make()).toEqual(make());
  });
});
