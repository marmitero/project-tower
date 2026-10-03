import { describe, expect, it } from "vitest";
import { config, RARITY_ORDER, type Rarity } from "@tia/config";
import { Prng } from "@tia/engine";
import { buildEquipment, migrateLegacyEquipment, isLegacyEquipment, pickTemplate, rollEquipment, rollEquipmentOf, rollFragments, rollRewardBundle, rollX, sourceAllowsFragments } from "../loot.js";
import { equipmentStats, lineValue, templateById } from "../gear.js";
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

describe("X por atributo (§36, ⛔ P-010 → ADR-023)", () => {
  it("cada linha tem valor próprio — não um X único para o item", () => {
    const items = manyDrops(5, 20_000).filter((i) => Object.keys(i.xValues).length >= 3);
    expect(items.length).toBeGreaterThan(50);
    const distinct = items.filter((item) => new Set(Object.values(item.xValues)).size > 1).length;
    expect(distinct / items.length).toBeGreaterThan(0.99);
  });

  it("o X é fracionário com a precisão da config (o exemplo do §36 é ×1.72)", () => {
    for (const item of manyDrops(8, 2000)) {
      for (const x of Object.values(item.xValues) as number[]) {
        expect(Math.round(x * 100) / 100).toBe(x);
      }
    }
  });

  it("os X ficam dentro da faixa da config", () => {
    for (const item of manyDrops(9, 2000)) {
      for (const value of Object.values(item.xValues) as number[]) {
        expect(value).toBeGreaterThanOrEqual(config.loot.x.min);
        expect(value).toBeLessThanOrEqual(config.loot.x.max);
      }
    }
  });

  it("distribuição em sino: média ≈ 1,05; god roll (≥ 2,00) raro; X ≤ 0,70 em ~14%", () => {
    const rng = new Prng(1);
    const xs = Array.from({ length: 100_000 }, () => rollX(rng));
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(mean).toBeGreaterThan(1.0);
    expect(mean).toBeLessThan(1.1);
    const god = xs.filter((x) => x >= 2).length / xs.length;
    expect(god).toBeGreaterThan(0.005);
    expect(god).toBeLessThan(0.02);
    const low = xs.filter((x) => x < 0.7).length / xs.length;
    expect(low).toBeGreaterThan(0.1);
    expect(low).toBeLessThan(0.2);
  });

  it("o mesmo seed e contexto dão o MESMO item (determinismo §64/§86)", () => {
    const a = rollEquipment(new Prng(12345), CTX);
    const b = rollEquipment(new Prng(12345), CTX);
    expect(a).toEqual(b);
  });

  it("itens ruins e bons coexistem (§36 — isso é desejável)", () => {
    const qualities = manyDrops(21, 20_000).map((i) => i.quality);
    expect(Math.min(...qualities)).toBeLessThan(10);
    expect(Math.max(...qualities)).toBeGreaterThan(55);
  });

  it("a nota é independente da raridade (§35): mesma faixa de nota em raridades diferentes", () => {
    const rng = new Prng(31);
    const mean = (r: Rarity) => {
      const qs = Array.from({ length: 4000 }, () => rollEquipmentOf(rng, CTX, { rarity: r }).quality);
      return qs.reduce((a, b) => a + b, 0) / qs.length;
    };
    // Diferem só pelo nº de linhas (variância), não por viés de raridade.
    expect(Math.abs(mean("common") - mean("celestial"))).toBeLessThan(3);
  });

  it("as letras seguem a tabela calibrada: S raro, F minoria", () => {
    const items = manyDrops(77, 100_000);
    const share = (g: string) => items.filter((i) => i.grade === g).length / items.length;
    expect(share("S")).toBeGreaterThan(0.003);
    expect(share("S")).toBeLessThan(0.03);
    expect(share("F")).toBeLessThan(0.25);
    expect(share("C") + share("D")).toBeGreaterThan(0.3);
  });
});

describe("estrutura do item (ADR-023)", () => {
  it("nº de linhas segue a raridade; a linha principal do template sempre rola", () => {
    const rng = new Prng(3);
    for (const rarity of RARITY_ORDER) {
      for (let i = 0; i < 200; i++) {
        const item = rollEquipmentOf(rng, CTX, { rarity });
        const template = templateById(item.itemTypeId)!;
        expect(Object.keys(item.xValues)).toHaveLength(config.equipment.rarity[rarity].statLines);
        expect(item.xValues[template.stats[0]!.stat]).toBeDefined();
        // só stats do pool do template
        for (const stat of Object.keys(item.xValues)) expect(template.stats.map((s) => s.stat)).toContain(stat);
      }
    }
  });

  it("Lendário e Celestial têm característica; as demais não (§34)", () => {
    const rng = new Prng(4);
    for (const rarity of RARITY_ORDER) {
      const item = rollEquipmentOf(rng, CTX, { rarity });
      expect(!!item.featureId).toBe(config.equipment.rarity[rarity].hasFeature);
    }
  });

  it("toda arma carrega o traço do seu tipo; as demais peças não têm traço", () => {
    const rng = new Prng(5);
    for (const t of config.equipment.templates) {
      const item = rollEquipmentOf(rng, CTX, { templateId: t.id, rarity: "rare" });
      if (t.slot === "weapon") {
        const trait = config.equipment.weaponTraits.find((x) => x.weaponType === t.weaponType)!;
        expect(item.traitId).toBe(trait.id);
      } else {
        expect(item.traitId).toBeUndefined();
      }
    }
  });

  it("todos os templates e slots são alcançáveis", () => {
    const rng = new Prng(6);
    const seen = new Set<string>();
    for (let i = 0; i < 20_000; i++) seen.add(pickTemplate(rng).id);
    expect(seen).toEqual(new Set(config.equipment.templates.map((t) => t.id)));
  });

  it("o nível do item é o nível da fonte (inimigo)", () => {
    const item = rollEquipmentOf(new Prng(7), { ...CTX, sourceLevel: 1234 });
    expect(item.level).toBe(1234);
  });
});

describe("stats do equipamento (valor = BASE(nível) × peso × RARIDADE × X)", () => {
  const sword = () => templateById("weapon_sword")!;

  it("escala com o nível do item (R-02): nível 10× maior ⇒ stat bem maior", () => {
    const low = rollEquipmentOf(new Prng(1), { ...CTX, sourceLevel: 50 }, { templateId: "weapon_sword", rarity: "rare" });
    const high = { ...low, level: 5000 };
    expect(lineValue(high, "attack")).toBeGreaterThan(lineValue(low, "attack") * 20);
  });

  it("raridade maior com os mesmos X produz stat maior, na razão do multiplicador", () => {
    const base = rollEquipmentOf(new Prng(2), CTX, { templateId: "weapon_sword", rarity: "common" });
    const epic = { ...base, rarity: "epic" as const };
    const ratio = lineValue(epic, "attack") / lineValue(base, "attack");
    expect(ratio).toBeCloseTo(config.equipment.rarity.epic.multiplier / config.equipment.rarity.common.multiplier, 1);
  });

  it("o X é multiplicador: X dobrado ⇒ stat dobrado", () => {
    const base = rollEquipmentOf(new Prng(3), { ...CTX, sourceLevel: 2000 }, { templateId: "weapon_sword", rarity: "common" });
    const a = { ...base, xValues: { ...base.xValues, attack: 1.0 } };
    const b = { ...base, xValues: { ...base.xValues, attack: 2.0 } };
    expect(lineValue(b, "attack") / lineValue(a, "attack")).toBeCloseTo(2, 2);
  });

  it("stat que o item não rolou vale 0", () => {
    const item = rollEquipmentOf(new Prng(4), CTX, { templateId: "weapon_sword", rarity: "common" });
    const stats = equipmentStats(item);
    const rolled = Object.keys(item.xValues);
    for (const [stat, value] of Object.entries(stats)) {
      if (!rolled.includes(stat)) expect(value).toBe(0);
    }
    expect(sword().stats[0]!.stat).toBe("attack");
    expect(stats.attack).toBeGreaterThan(0);
  });

  it("crítico de equipamento é pequeno: nunca estoura o teto do engine sozinho", () => {
    const items = manyDrops(77, 20_000);
    const maxCrit = Math.max(...items.map((i) => equipmentStats(i).critChance));
    expect(maxCrit).toBeLessThanOrEqual(0.15);
  });

  it("raridade maior produz poder maior, em média", () => {
    const rng = new Prng(101);
    const avgPower = (r: Rarity) => {
      const xs = Array.from({ length: 3000 }, () => Object.values(equipmentStats(rollEquipmentOf(rng, CTX, { rarity: r }))).reduce((a, b) => a + b, 0));
      return xs.reduce((a, b) => a + b, 0) / xs.length;
    };
    const powers = RARITY_ORDER.map(avgPower);
    for (let i = 1; i < powers.length; i++) expect(powers[i]!).toBeGreaterThan(powers[i - 1]!);
  });
});

describe("migração de itens legados (config v3 → v4)", () => {
  it("reconstrói do seed, preservando id, dono, nível, raridade, slot e origem", () => {
    const legacy = {
      ...rollEquipmentOf(new Prng(9), CTX, { templateId: "boots_runner", rarity: "epic" }),
      itemTypeId: "boots.epic",
      xValues: { hp: 12, attack: 40, specialAttack: 3, defense: 9, specialDefense: 8, critChance: 4, attackSpeed: 20, speed: 33 },
    };
    expect(isLegacyEquipment(legacy)).toBe(true);
    const migrated = migrateLegacyEquipment(legacy);
    expect(isLegacyEquipment(migrated)).toBe(false);
    expect(migrated.id).toBe(legacy.id);
    expect(migrated.slot).toBe("boots");
    expect(migrated.rarity).toBe("epic");
    expect(migrated.level).toBe(legacy.level);
    expect(Object.keys(migrated.xValues)).toHaveLength(config.equipment.rarity.epic.statLines);
    // determinístico
    expect(migrateLegacyEquipment(legacy)).toEqual(migrated);
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
