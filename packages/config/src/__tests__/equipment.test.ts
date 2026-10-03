/**
 * Config de equipamento e de aquisição (ADR-023/024): o catálogo padrão é válido, e a
 * validação — que o Painel Admin usará — rejeita edições perigosas com mensagem legível.
 */
import { describe, expect, it } from "vitest";
import {
  RARITY_ORDER,
  config,
  defaultEquipmentConfig,
  defaultHeroAcquisition,
  equipmentErrors,
  gearEffectErrors,
  heroAcquisitionErrors,
  materialForLevel,
  validateConfig,
} from "../index.js";

const fresh = () => structuredClone(defaultEquipmentConfig());

describe("padrão de equipamento", () => {
  it("é válido e a config inteira valida", () => {
    expect(equipmentErrors(defaultEquipmentConfig())).toEqual([]);
    expect(() => validateConfig(config)).not.toThrow();
  });

  it("10 slots, 9 tipos de arma (§72) e pelo menos 1 template por slot", () => {
    const eq = defaultEquipmentConfig();
    expect(eq.slots).toHaveLength(10);
    const weapons = new Set(eq.templates.filter((t) => t.slot === "weapon").map((t) => t.weaponType));
    expect(weapons.size).toBe(9);
    for (const slot of eq.slots) expect(eq.templates.some((t) => t.slot === slot.id)).toBe(true);
  });

  it("toda arma tem um traço próprio e toda característica tem efeitos", () => {
    const eq = defaultEquipmentConfig();
    for (const t of eq.templates.filter((x) => x.slot === "weapon")) {
      expect(eq.weaponTraits.some((tr) => tr.weaponType === t.weaponType)).toBe(true);
    }
    expect(eq.features.length).toBeGreaterThan(0);
  });

  it("raridade: multiplicador e nº de linhas nunca decrescem; só Lendário/Celestial têm característica", () => {
    const eq = defaultEquipmentConfig();
    let mult = 0;
    let lines = 0;
    for (const r of RARITY_ORDER) {
      expect(eq.rarity[r].multiplier).toBeGreaterThanOrEqual(mult);
      expect(eq.rarity[r].statLines).toBeGreaterThanOrEqual(lines);
      mult = eq.rarity[r].multiplier;
      lines = eq.rarity[r].statLines;
      expect(eq.rarity[r].hasFeature).toBe(r === "legendary" || r === "celestial");
    }
  });

  it("as notas cobrem S–F em ordem decrescente e F começa em 0", () => {
    const g = defaultEquipmentConfig().grades;
    expect(g.map((x) => x.grade)).toEqual(["S", "A", "B", "C", "D", "E", "F"]);
    for (let i = 1; i < g.length; i++) expect(g[i]!.minQuality).toBeLessThan(g[i - 1]!.minQuality);
    expect(g.at(-1)!.minQuality).toBe(0);
  });

  it("material (tier) acompanha o nível do item", () => {
    const tiers = defaultEquipmentConfig().tiers;
    const a = materialForLevel(tiers, 1);
    const b = materialForLevel(tiers, 20_000);
    expect(a).not.toBe(b);
  });

  it("o padrão de aquisição de herói é válido e soma 1", () => {
    expect(heroAcquisitionErrors(defaultHeroAcquisition())).toEqual([]);
    const sum = Object.values(defaultHeroAcquisition().rarityChance).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
  });
});

describe("validação rejeita edição perigosa (painel admin)", () => {
  it("template com slot inexistente", () => {
    const eq = fresh();
    eq.templates[0]!.slot = "tail" as never;
    expect(equipmentErrors(eq).join("\n")).toMatch(/slot/);
  });

  it("id de template duplicado", () => {
    const eq = fresh();
    eq.templates[1]!.id = eq.templates[0]!.id;
    expect(equipmentErrors(eq).join("\n")).toMatch(/duplicado/);
  });

  it("arma sem traço para o seu tipo", () => {
    const eq = fresh();
    eq.weaponTraits = eq.weaponTraits.filter((t) => t.weaponType !== "sword");
    expect(equipmentErrors(eq).join("\n")).toMatch(/não tem traço/);
  });

  it("multiplicador de raridade decrescente", () => {
    const eq = fresh();
    eq.rarity.rare.multiplier = 0.1;
    expect(equipmentErrors(eq).join("\n")).toMatch(/multiplier/);
  });

  it("efeito com chance fora de [0,1] e kind desconhecido", () => {
    expect(gearEffectErrors("x", { kind: "stun", chance: 2, durationMs: 500 }).join()).toMatch(/chance/);
    expect(gearEffectErrors("x", { kind: "explode" }).join()).toMatch(/desconhecido/);
    expect(gearEffectErrors("x", { kind: "dot", chance: 0.5, coefficient: 0.3, pulses: 3, intervalMs: 1000 })).toEqual([]);
  });

  it("aquisição: tabela que não soma 1 e raridade inicial inválida", () => {
    const a = structuredClone(defaultHeroAcquisition());
    a.rarityChance.common = 0.9;
    expect(heroAcquisitionErrors(a).join()).toMatch(/somar 1/);
    const b = { ...defaultHeroAcquisition(), starterRarity: "mythic" };
    expect(heroAcquisitionErrors(b).join()).toMatch(/starterRarity/);
  });

  it("o erro de validação da config inteira cita o caminho", () => {
    const bad = structuredClone(config);
    bad.equipment.rarity.epic.statLines = 99;
    expect(() => validateConfig(bad)).toThrow(/statLines/);
  });
});
