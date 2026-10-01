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
  RARITY_ORDER,
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

  it("a escada de raridade cobre a progressão de aquisição (§109)", () => {
    const rarities = HEROES.map((h) => h.rarity);
    expect(rarities).toEqual(["common", "uncommon", "rare", "epic"]);
    for (const r of rarities) expect(RARITY_ORDER).toContain(r);
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
