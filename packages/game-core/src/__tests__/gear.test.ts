import { describe, expect, it } from "vitest";
import { config, type Rarity } from "@tia/config";
import { Prng } from "@tia/engine";
import { COMPARED_STATS, compareItems, equipmentPower, equipmentStats, hasAffinity, isOrphan, itemEffects, itemName, lineValue, offensiveStatsOf, sellPrice, templateById } from "../gear.js";
import { rollEquipmentOf } from "../loot.js";
import { ACCOUNT, makeHero } from "./fixtures.js";

const CTX = { accountId: ACCOUNT, origin: "drop" as const, source: { kind: "tower_enemy" as const }, sourceLevel: 100, itemIndex: 0 };
const item = (templateId: string, rarity: Rarity, level = 100, seed = 1) =>
  rollEquipmentOf(new Prng(seed), { ...CTX, sourceLevel: level }, { templateId, rarity });

describe("gear — comparação, nome, efeitos e poder", () => {
  it("compareItems: diferença candidato − atual; slot vazio compara com zero", () => {
    const a = item("chest_plate", "rare", 100, 1);
    const b = item("chest_plate", "rare", 100, 2);
    const diff = compareItems(a, b);
    for (const s of COMPARED_STATS) expect(diff[s]).toBeCloseTo(equipmentStats(a)[s] - equipmentStats(b)[s], 3);
    const vsEmpty = compareItems(a, null);
    expect(vsEmpty.defense).toBeCloseTo(equipmentStats(a).defense, 3);
    expect(compareItems(a, a).defense).toBe(0);
  });

  it("poder do item cresce com raridade e nível", () => {
    expect(equipmentPower(item("chest_plate", "epic", 100))).toBeGreaterThan(equipmentPower(item("chest_plate", "common", 100)));
    expect(equipmentPower(item("chest_plate", "common", 1000))).toBeGreaterThan(equipmentPower(item("chest_plate", "common", 100)));
  });

  it("nome usa o material do tier quando o template é `tiered`", () => {
    const tiered = config.equipment.templates.find((t) => t.tiered)!;
    const low = itemName(item(tiered.id, "common", 1));
    const high = itemName(item(tiered.id, "common", 20_000));
    expect(low).not.toBe(high);
    expect(low.startsWith(tiered.name)).toBe(true);
  });

  it("efeitos: arma dá o traço do tipo; peça sem traço e sem característica não dá nada", () => {
    expect(itemEffects(item("weapon_sword", "common")).length).toBeGreaterThan(0);
    expect(itemEffects(item("chest_plate", "common"))).toEqual([]);
    const legendary = item("chest_plate", "legendary");
    expect(itemEffects(legendary).length).toBeGreaterThan(0);
  });

  it("item órfão (template removido por edição) é detectado e vale 0 — nunca quebra", () => {
    const orphan = { ...item("chest_plate", "rare"), itemTypeId: "template_que_sumiu" };
    expect(isOrphan(orphan)).toBe(true);
    expect(templateById("template_que_sumiu")).toBeUndefined();
    expect(equipmentPower(orphan)).toBe(0);
    expect(itemName(orphan)).toMatch(/desconhecido/i);
    expect(itemEffects(orphan)).toEqual([]);
  });

  it("lineValue de linha não rolada é 0", () => {
    const it0 = item("weapon_sword", "common");
    expect(lineValue(it0, "speed")).toBe(0);
  });

  it("afinidade: só a arma do tipo do herói; ataque principal por classe", () => {
    const guardian = makeHero(0, 0);
    expect(hasAffinity(guardian, item("weapon_sword", "common"))).toBe(true);
    expect(hasAffinity(guardian, item("weapon_staff", "common"))).toBe(false);
    expect(hasAffinity(guardian, item("chest_plate", "common"))).toBe(false);
    expect(offensiveStatsOf("guardian")).toEqual(["attack"]);
    expect(offensiveStatsOf("arcanist")).toEqual(["specialAttack"]);
  });

  it("sellPrice: determinístico, positivo e monotônico no nível", () => {
    const p = (level: number) => sellPrice({ level, rarity: "rare", quality: 50 });
    expect(p(1)).toBeGreaterThan(0n);
    expect(p(100)).toBeGreaterThan(p(10));
    expect(p(100)).toBe(p(100));
  });
});
