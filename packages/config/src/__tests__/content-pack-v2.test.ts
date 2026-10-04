/**
 * ContentPack v2 (ADR-022 + FASE 9): equipamento, drop, mochila e aquisição de herói
 * passam a ser conteúdo editável pelo painel — export → JSON → validar → aplicar.
 */
import { afterEach, describe, expect, it } from "vitest";
import {
  CONTENT_PACK_SCHEMA_VERSION,
  ContentPackError,
  applyContentPack,
  config,
  defaultContentPack,
  exportContentPack,
  migrateContentPack,
  resetContentToDefaults,
  validateConfig,
  validateContentPack,
  type ContentPack,
} from "../index.js";

afterEach(() => resetContentToDefaults());

const fresh = (): ContentPack => structuredClone(defaultContentPack());

describe("ContentPack v2", () => {
  it("o schema é v4 (Boss, além de Market/Bot/offline) e o pack padrão valida", () => {
    expect(CONTENT_PACK_SCHEMA_VERSION).toBe(5);
    expect(validateContentPack(defaultContentPack())).toEqual([]);
  });

  it("o export do conteúdo vivo é idêntico ao padrão e sobrevive ao JSON", () => {
    const live = exportContentPack("padrão");
    expect(JSON.parse(JSON.stringify(live))).toEqual(live);
    expect(live).toEqual(defaultContentPack());
  });

  it("migração v1 → v2: pack antigo (sem os blocos novos) é completado com o padrão", () => {
    const v1 = fresh() as unknown as Record<string, unknown>;
    v1.schemaVersion = 1;
    for (const k of ["equipment", "loot", "inventory", "heroAcquisition"]) delete v1[k];
    expect(validateContentPack(v1)).toEqual([]);
    const migrated = migrateContentPack(v1) as ContentPack;
    expect(migrated.schemaVersion).toBe(5);
    expect(migrated.equipment).toEqual(defaultContentPack().equipment);
    expect(() => applyContentPack(v1)).not.toThrow();
  });

  it("editar o catálogo no pack muda o jogo SEM código: preço de raridade, requisito e drop", () => {
    const pack = fresh();
    pack.equipment.sell.killsEquivalent.rare *= 3;
    pack.equipment.requirement.levelRatio = 0.5;
    pack.loot.equipmentChance = 0.1;
    pack.inventory.equipmentMaxItems = 77;
    pack.heroAcquisition.rarityChance = { common: 0.4, uncommon: 0.3, rare: 0.2, epic: 0.07, legendary: 0.025, celestial: 0.005 };
    applyContentPack(pack);
    expect(config.equipment.sell.killsEquivalent.rare).toBe(pack.equipment.sell.killsEquivalent.rare);
    expect(config.equipment.requirement.levelRatio).toBe(0.5);
    expect(config.loot.equipmentChance).toBe(0.1);
    expect(config.inventory.equipmentMaxItems).toBe(77);
    expect(config.heroAcquisition.rarityChance.celestial).toBe(0.005);
    expect(() => validateConfig(config)).not.toThrow();
    resetContentToDefaults();
    expect(config.loot.equipmentChance).toBe(0.05);
    expect(config.inventory.equipmentMaxItems).toBe(300);
    expect(config.heroAcquisition.rarityChance.celestial).toBe(0.001);
  });

  it("adicionar um item NOVO pelo pack: aparece no catálogo vivo", () => {
    const pack = fresh();
    const base = pack.equipment.templates.find((t) => t.slot === "chest")!;
    pack.equipment.templates.push({ ...structuredClone(base), id: "chest_dragon", name: "Couraça de Dragão" });
    applyContentPack(pack);
    expect(config.equipment.templates.some((t) => t.id === "chest_dragon")).toBe(true);
  });

  it("aplicar é atômico: pack inválido não altera nada", () => {
    const before = JSON.stringify(exportContentPack());
    const bad = fresh();
    bad.equipment.templates[0]!.slot = "tail" as never;
    bad.loot.equipmentChance = 0.9;
    expect(() => applyContentPack(bad)).toThrow(ContentPackError);
    expect(JSON.stringify(exportContentPack())).toBe(before);
  });

  it("erros de equipamento, drop, mochila e aquisição são reportados com o caminho", () => {
    const bad = fresh();
    bad.loot.rarity.common = 0.9;
    bad.loot.x.min = 0;
    bad.inventory.onFull = "explode" as never;
    bad.inventory.equipmentMaxItems = 0;
    bad.heroAcquisition.starterRarity = "mythic" as never;
    bad.equipment.rarity.epic.statLines = 99;
    const text = validateContentPack(bad).join("\n");
    for (const part of ["loot.rarity", "loot.x", "inventory.onFull", "inventory.equipmentMaxItems", "starterRarity", "statLines"]) {
      expect(text).toContain(part);
    }
  });
});
