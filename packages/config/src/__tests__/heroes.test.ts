/**
 * Identidades dos heróis (P-002 — decidida 2026-10-01).
 *
 * Travam o que a decisão prometeu: identidades COMPLETAS (nome, epíteto,
 * lore, personalidade, voz, raridade, estilo, aquisição) e RECONECTÁVEIS
 * (tudo por id — remodelar é editar dados, nunca código).
 */

import { describe, expect, it } from "vitest";
import {
  HEROES,
  ATTRIBUTE_IDS,
  RARITY_ORDER,
  config,
  classes,
  heroById,
  heroIdentityForClass,
  skillsById,
  validateCatalog,
} from "../index.js";

describe("roster P-002 — 4 identidades completas", () => {
  it("4 heróis, ids e nomes únicos", () => {
    expect(HEROES).toHaveLength(4);
    expect(new Set(HEROES.map((h) => h.id)).size).toBe(4);
    expect(new Set(HEROES.map((h) => h.name.toLowerCase())).size).toBe(4);
    expect(new Set(HEROES.map((h) => h.epithet)).size).toBe(4);
  });

  it("cada herói tem substância — nada de identidade de envelope vazio", () => {
    for (const h of HEROES) {
      expect(h.lore.length, h.id).toBeGreaterThanOrEqual(40);
      expect(h.personality, h.id).toHaveLength(3);
      expect(h.voiceNotes.length, h.id).toBeGreaterThan(10);
      expect(h.combatStyle.length, h.id).toBeGreaterThan(10);
      expect(h.acquisition.hint.length, h.id).toBeGreaterThan(10);
    }
  });

  it("os 4 heróis iniciais são TODOS incomuns (adendo 2026-10-03, ADR-024)", () => {
    expect(HEROES.map((h) => h.rarity)).toEqual(["uncommon", "uncommon", "uncommon", "uncommon"]);
    expect(config.heroAcquisition.starterRarity).toBe("uncommon");
    // Neutro: incomum multiplica os stats por 1,0 — a calibração da Torre vale como está.
    expect(config.heroAcquisition.rarityStatMultiplier.uncommon).toBe(1);
  });

  it("a variação de raridade existe na AQUISIÇÃO, e cobre toda a escada (§109)", () => {
    for (const r of RARITY_ORDER) expect(config.heroAcquisition.rarityChance[r]).toBeGreaterThan(0);
  });

  it("os 4 têm o mesmo orçamento de atributos (aquisição balanceada entre classes)", () => {
    const totals = classes.map((c) => ATTRIBUTE_IDS.reduce((a, id) => a + c.attributes[id], 0));
    expect(new Set(totals).size).toBe(1);
  });

  it("1 herói por classe, com skill assinada da própria classe", () => {
    for (const h of HEROES) {
      const cls = classes.find((c) => c.id === h.classId);
      expect(cls, h.id).toBeDefined();
      expect(h.signatureSkillId, h.id).toBe(cls!.activeSkillId);
      expect(skillsById[h.signatureSkillId]?.kind, h.id).toBe("active");
      // Arco de fantasia coerente: tanque curto, atirador/invocador longos.
      if (h.id === "hero_aldric") expect(h.range).toBe("melee");
      else expect(h.range).toBe("ranged");
    }
  });

  it("statPriority coerente com a mecânica da classe", () => {
    const pri = Object.fromEntries(HEROES.map((h) => [h.classId, h.statPriority]));
    expect(pri.guardian![0]).toBe("defense");
    expect(pri.ranger!).toContain("attackSpeed");
    expect(pri.arcanist![0]).toBe("specialAttack");
    expect(pri.shadowcaller!).toContain("specialAttack");
  });

  it("§12 — aquisição futura nunca menciona inimigos comuns da Torre", () => {
    for (const h of HEROES) {
      expect(h.acquisition.hint, h.id).not.toMatch(/inimigos? comuns?/i);
    }
  });

  it("lookups por id e por classe resolvem", () => {
    expect(heroById.hero_aldric?.name).toBe("Aldric");
    expect(heroIdentityForClass("guardian").name).toBe("Aldric");
    expect(() => heroIdentityForClass("nao-existe")).toThrow();
  });

  it("validateCatalog passa com as identidades embarcadas", () => {
    expect(() => validateCatalog()).not.toThrow();
  });
});
