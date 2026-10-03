/**
 * Aquisição de heróis (adendo 2026-10-03, ADR-024):
 *  - seleção inicial: todos INCOMUNS;
 *  - os Reis podem dropar repetidos, com raridade/atributos diferentes;
 *  - balanceado independente de classe.
 */
import { describe, expect, it } from "vitest";
import { ATTRIBUTE_IDS, HEROES, HERO_ROSTER, classes, config, heroById, RARITY_ORDER } from "@tia/config";
import { Prng } from "@tia/engine";
import { createAcquiredHero, rollHeroAcquisition } from "../hero-acquisition.js";
import { growthForHero, heroStatsAtLevel } from "../creation.js";
import { heroCodex } from "../codex.js";
import { ACCOUNT, makeHero } from "./fixtures.js";

describe("seleção inicial: todos incomuns", () => {
  it("o catálogo inteiro é incomum e `starterRarity` é incomum", () => {
    expect(config.heroAcquisition.starterRarity).toBe("uncommon");
    for (const h of HEROES) expect(h.rarity).toBe("uncommon");
  });

  it("o herói inicial nasce incomum, com os atributos-base da classe e nota neutra", () => {
    for (const cls of classes) {
      const hero = makeHero(0, classes.indexOf(cls), 1);
      expect(hero.rarity).toBe("uncommon");
      expect(hero.attributes).toEqual(cls.attributes);
      expect(hero.origin).toBe("starter");
    }
  });

  it("incomum NÃO altera os stats: o herói inicial vale o que a Torre calibrou", () => {
    expect(config.heroAcquisition.rarityStatMultiplier.uncommon).toBe(1);
    const cls = classes[0]!;
    expect(growthForHero(cls.attributes, "uncommon")).toEqual(cls.growth);
  });
});

describe("rolagem de aquisição", () => {
  it("é determinística para a mesma seed", () => {
    expect(rollHeroAcquisition(new Prng(5), "ranger")).toEqual(rollHeroAcquisition(new Prng(5), "ranger"));
  });

  it("classe desconhecida é erro explícito", () => {
    expect(() => rollHeroAcquisition(new Prng(1), "bardo")).toThrow(/Classe desconhecida/);
  });

  it("mesma classe, seeds diferentes ⇒ raridade e atributos diferentes (repetidos são distintos)", () => {
    const rolls = Array.from({ length: 40 }, (_, i) => rollHeroAcquisition(new Prng(Math.imul(i + 1, 2654435761) >>> 0), "guardian"));
    expect(new Set(rolls.map((r) => r.rarity)).size).toBeGreaterThan(1);
    expect(new Set(rolls.map((r) => JSON.stringify(r.attributes))).size).toBeGreaterThan(30);
  });

  it("atributos ficam na faixa da config em torno do valor da classe", () => {
    const { min, max } = config.heroAcquisition.attributeRoll;
    for (let i = 0; i < 300; i++) {
      for (const cls of classes) {
        const roll = rollHeroAcquisition(new Prng(i * 31 + 7), cls.id);
        // a base da faixa é o modelo da classe + o delta da identidade sorteada (ADR-033)
        const delta = heroById[roll.identityId!]?.attributeDelta ?? {};
        for (const id of ATTRIBUTE_IDS) {
          const base = cls.attributes[id] + (delta[id] ?? 0);
          expect(roll.attributes[id]).toBeGreaterThanOrEqual(Math.max(1, Math.round(base * min)));
          expect(roll.attributes[id]).toBeLessThanOrEqual(Math.round(base * max));
        }
        expect(roll.quality).toBeGreaterThanOrEqual(0);
        expect(roll.quality).toBeLessThanOrEqual(100);
      }
    }
  });

  it("raridade segue a tabela da config (§33)", () => {
    const rng = new Prng(77);
    const N = 40_000;
    const seen: Record<string, number> = {};
    for (let i = 0; i < N; i++) {
      const r = rollHeroAcquisition(rng, "ranger").rarity;
      seen[r] = (seen[r] ?? 0) + 1;
    }
    for (const r of RARITY_ORDER) {
      const expected = config.heroAcquisition.rarityChance[r];
      const got = (seen[r] ?? 0) / N;
      expect(Math.abs(got - expected)).toBeLessThan(Math.max(0.01, expected * 0.35));
    }
  });

  it("BALANCEADO independente de classe: a distribuição de raridade e de nota é a mesma", () => {
    const N = 20_000;
    const stats = classes.map((cls) => {
      const rng = new Prng(4242);
      let uncommonPlus = 0;
      let quality = 0;
      for (let i = 0; i < N; i++) {
        const r = rollHeroAcquisition(rng, cls.id);
        if (r.rarity !== "common") uncommonPlus += 1;
        quality += r.quality;
      }
      return { share: uncommonPlus / N, quality: quality / N };
    });
    // Com a MESMA seed por classe, a raridade é idêntica (a classe só lê atributos-base).
    for (const s of stats) {
      expect(s.share).toBeCloseTo(stats[0]!.share, 10);
      expect(s.quality).toBeCloseTo(stats[0]!.quality, 10);
    }
  });

  it("o poder médio por raridade é parecido entre classes (±5% do incomum)", () => {
    const level = 500;
    const avgPower = (clsId: string, rarity: (typeof RARITY_ORDER)[number]) => {
      const rng = new Prng(11);
      const cls = classes.find((c) => c.id === clsId)!;
      let total = 0;
      const N = 300;
      for (let i = 0; i < N; i++) {
        const roll = rollHeroAcquisition(rng, clsId);
        const s = heroStatsAtLevel(growthForHero(roll.attributes, rarity), level);
        const delta = heroById[roll.identityId!]?.attributeDelta ?? {};
        const baseAttrs = { ...cls.attributes };
        for (const id of ATTRIBUTE_IDS) baseAttrs[id] += delta[id] ?? 0;
        const base = heroStatsAtLevel(growthForHero(baseAttrs, "uncommon"), level);
        // razão ao herói incomum da MESMA classe: remove a diferença estrutural entre classes
        total += (s.hp + s.attack + s.specialAttack + s.defense + s.specialDefense) / (base.hp + base.attack + base.specialAttack + base.defense + base.specialDefense);
      }
      return total / N;
    };
    for (const rarity of RARITY_ORDER) {
      const ratios = classes.map((c) => avgPower(c.id, rarity));
      const expected = config.heroAcquisition.rarityStatMultiplier[rarity];
      for (const r of ratios) expect(Math.abs(r / expected - 1)).toBeLessThan(0.05);
    }
  });

  it("cada variação (identidade) tem poder (resistência × dano) parecido com o modelo da classe (±8%) — diferença é ESTILO, não força", () => {
    const power = (attrs: typeof classes[number]["attributes"]) => {
      const s = heroStatsAtLevel(growthForHero(attrs, "uncommon"), 500);
      // poder = resistência × dano: um tanque troca ataque por vida/defesa sem ficar mais forte
      return s.hp * (s.defense + s.specialDefense) * (s.attack + s.specialAttack);
    };
    for (const identity of HERO_ROSTER) {
      const cls = classes.find((c) => c.id === identity.classId)!;
      const varied = { ...cls.attributes };
      for (const id of ATTRIBUTE_IDS) varied[id] += identity.attributeDelta?.[id] ?? 0;
      expect(Math.abs(power(varied) / power(cls.attributes) - 1), identity.id).toBeLessThan(0.08);
    }
  });

  it("a identidade do herói adquirido é sorteada sem gastar PRNG e dá arte/nome próprios", () => {
    const a = new Prng(5);
    const b = new Prng(5);
    rollHeroAcquisition(a, "guardian");
    // mesma quantidade de números consumidos que a rolagem antiga: raridade + 6 atributos × samples
    b.weightedKey(config.heroAcquisition.rarityChance);
    for (let i = 0; i < 6 * config.heroAcquisition.attributeRoll.samples; i++) b.next();
    expect(a.next()).toBe(b.next());
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) seen.add(rollHeroAcquisition(new Prng(i + 1), "guardian").identityId!);
    expect([...seen].sort()).toEqual(["hero_aldric", "hero_borin"]);
    const roll = { ...rollHeroAcquisition(new Prng(1), "guardian"), identityId: "hero_borin" };
    const hero = createAcquiredHero({ accountId: "acc" as never, name: "qualquer", roll, origin: "market", now: 0, index: 1 });
    expect(hero.name).toBe("Borin");
    expect(hero.identityId).toBe("hero_borin");
  });

  it("raridade maior ⇒ stats maiores (multiplicador monotônico)", () => {
    const attrs = classes[0]!.attributes;
    const hp = RARITY_ORDER.map((r) => heroStatsAtLevel(growthForHero(attrs, r), 100).hp);
    for (let i = 1; i < hp.length; i++) expect(hp[i]!).toBeGreaterThan(hp[i - 1]!);
  });
});

describe("herói adquirido", () => {
  it("cria o herói com a raridade/atributos da rolagem e origem de drop", () => {
    const roll = rollHeroAcquisition(new Prng(3), "arcanist");
    const hero = createAcquiredHero({ accountId: ACCOUNT, name: "Maelis II", roll, origin: "boss", now: 0, index: 5 });
    expect(hero.classId).toBe("arcanist");
    expect(hero.rarity).toBe(roll.rarity);
    expect(hero.attributes).toEqual(roll.attributes);
    expect(hero.quality).toBeCloseTo(roll.quality, 5);
    expect(hero.origin).toBe("boss");
    expect(hero.level).toBe(1);
  });

  it("dois heróis da mesma classe têm ids distintos e o códice conta as cópias", () => {
    const a = makeHero(0, 0);
    const b = createAcquiredHero({ accountId: ACCOUNT, name: "Aldric II", roll: rollHeroAcquisition(new Prng(8), "guardian"), origin: "boss", now: 0, index: 1 });
    expect(a.id).not.toBe(b.id);
    const entry = heroCodex([a, b]).find((e) => e.identity.classId === "guardian")!;
    expect(entry.status).toBe("owned");
    expect(entry.copies).toBe(2);
    expect(heroCodex([a]).find((e) => e.identity.classId === "ranger")!.copies).toBe(0);
  });
});
