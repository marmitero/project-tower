/**
 * Catálogo de skills e atributos (base OpenRpg — `docs/OPENRPG_REFERENCE.md`).
 *
 * Trava o modelo: toda classe referencia skills REAIS do catálogo, skills
 * pertencem à classe certa, e os stats de combate são sempre projeção dos
 * atributos (nunca números soltos).
 */

import { describe, expect, it } from "vitest";
import {
  ATTRIBUTE_IDS,
  classes,
  growthFromAttributes,
  skills,
  skillsById,
  validateCatalog,
} from "../index.js";

describe("atributos das classes (base OpenRpg)", () => {
  it("toda classe tem os 6 atributos positivos", () => {
    for (const c of classes) {
      for (const attr of ATTRIBUTE_IDS) {
        expect(c.attributes[attr], `${c.id}.${attr}`).toBeGreaterThan(0);
      }
    }
  });

  it("growth é EXATAMENTE a projeção dos atributos — nada escrito à mão", () => {
    for (const c of classes) {
      expect(c.growth, c.id).toEqual(growthFromAttributes(c.attributes));
    }
  });

  it("as fórmulas seguem o OpenRpg: CON×5 domina a vida", () => {
    const fat = growthFromAttributes({ strength: 10, dexterity: 10, constitution: 30, intelligence: 10, wisdom: 10, charisma: 10 });
    const thin = growthFromAttributes({ strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 });
    expect(fat.hp - thin.hp).toBe(100); // ΔCON 20 × 5
  });

  it("DEX domina velocidade, crítico e IAS", () => {
    const fast = growthFromAttributes({ strength: 10, dexterity: 30, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 });
    const slow = growthFromAttributes({ strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 });
    expect(fast.critChance).toBeGreaterThan(slow.critChance);
    expect(fast.attackSpeed).toBeGreaterThan(slow.attackSpeed);
    expect(fast.speed).toBeGreaterThan(slow.speed);
    // attackSpeed nunca negativo (tanque não fica com IAS negativo)
    expect(slow.attackSpeed).toBe(0);
  });

  it("INT domina o dano mágico; FOR domina o físico", () => {
    const bruiser = growthFromAttributes({ strength: 30, dexterity: 10, constitution: 10, intelligence: 5, wisdom: 10, charisma: 10 });
    const caster = growthFromAttributes({ strength: 5, dexterity: 10, constitution: 10, intelligence: 30, wisdom: 10, charisma: 10 });
    expect(bruiser.attack).toBeGreaterThan(caster.attack);
    expect(caster.specialAttack).toBeGreaterThan(bruiser.specialAttack);
  });
});

describe("catálogo de skills (§22 — 1 ativa + 2 passivas)", () => {
  it("toda classe referencia skills existentes e da própria classe", () => {
    for (const c of classes) {
      const active = skillsById[c.activeSkillId];
      expect(active, c.id).toBeDefined();
      expect(active!.kind).toBe("active");
      expect(active!.classId).toBe(c.id);
      expect(c.passiveSkillIds).toHaveLength(2);
      for (const pid of c.passiveSkillIds) {
        expect(skillsById[pid]!.kind, pid).toBe("passive");
        expect(skillsById[pid]!.classId, pid).toBe(c.id);
      }
    }
  });

  it("35 skills no roster: 25 ativas + 10 passivas, ids únicos (4 classes originais + Clérigo + assinaturas dos Lotes 4, 5 e 6)", () => {
    expect(skills).toHaveLength(35);
    expect(skills.filter((s) => s.kind === "active")).toHaveLength(25);
    expect(new Set(skills.map((s) => s.id)).size).toBe(35);
  });

  it("toda skill ativa tem coeficiente (ou cura) e cooldown (§25 — dispara sozinha)", () => {
    for (const s of skills.filter((x) => x.kind === "active")) {
      expect((s.coefficient ?? 0) + (s.heal?.coefficient ?? 0), s.id).toBeGreaterThan(0);
      expect(s.cooldownMs, s.id).toBeGreaterThan(0);
    }
  });

  it("skill com dano tem tipo físico/mágico coerente com a classe", () => {
    for (const s of skills.filter((x) => x.damageType !== "none")) {
      const cls = classes.find((c) => c.id === s.classId);
      expect(cls, s.id).toBeDefined();
      // A skill pode perfurar o eixo da classe (ex.: riposte físico no tank),
      // mas nunca uma skill mágica numa classe puramente física.
      if (s.damageType === "magic") expect(["magic", "hybrid"]).toContain(cls!.damageType);
    }
  });

  it("nomes em PT-BR, sem placeholder", () => {
    for (const s of skills) {
      expect(s.name.length, s.id).toBeGreaterThan(2);
      expect(s.description.length, s.id).toBeGreaterThan(10);
    }
  });

  it("validateCatalog cobre o catálogo de skills sem erro", () => {
    expect(() => validateCatalog()).not.toThrow();
  });
});
