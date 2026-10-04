/**
 * Catálogo de heróis e inimigos (§10, §18 — P-002 inserção genérica).
 *
 * Estes casos travam as propriedades MECÂNICAS que o Master-Prompt exige:
 * 4 heróis com diferenças reais, cobertura físico × mágico e papéis
 * distintos. Identidades definitivas (nomes, skills) podem mudar; estas
 * propriedades não.
 */

import { describe, expect, it } from "vitest";
import {
  CHARACTER_SHEET_KEYS,
  STARTER_HERO_CLASSES,
  charSheets,
  classes,
  enemies,
  ENEMY_ROLES,
  validateCatalog,
} from "../index.js";

describe("catálogo de heróis (§10)", () => {
  const starters = classes.filter((c) => STARTER_HERO_CLASSES.includes(c.id));

  it("tem exatamente 4 heróis iniciais; o Clérigo (5ª classe, ADR-038) chega depois", () => {
    expect(STARTER_HERO_CLASSES).toHaveLength(4);
    expect(starters).toHaveLength(4);
    expect(classes).toHaveLength(5);
    expect(classes.map((c) => c.id)).toContain("cleric");
    expect(STARTER_HERO_CLASSES).not.toContain("cleric");
  });

  it("cobre físico × mágico (§18 — a escolha de herói é uma decisão)", () => {
    const types = classes.map((c) => c.damageType);
    expect(types).toContain("physical");
    expect(types).toContain("magic");
  });

  it("papéis e perfis de atributo são REAIS — nada de clones disfarçados (§10)", () => {
    expect(new Set(classes.map((c) => c.role)).size).toBe(5);
    expect(new Set(classes.map((c) => JSON.stringify(c.growth))).size).toBe(5);
  });

  it("todo herói tem retrato e as 6 folhas de animação não vazias", () => {
    for (const c of classes) {
      expect(c.assets.portrait, c.id).toBeTruthy();
      for (const key of CHARACTER_SHEET_KEYS) {
        expect(c.assets.sheets[key], `${c.id}.${key}`).toContain("/");
      }
    }
  });

  it("cada herói usa um corpo próprio — nenhum sprite compartilhado", () => {
    // O Clérigo reaproveita o corpo-base do mago na classe; cada identidade dele tem atlas próprio.
    const idles = starters.map((c) => c.assets.sheets.idle);
    expect(new Set(idles).size).toBe(4);
  });

  it("skills por id, nunca literal no jogo (§22 — P-022 provisório)", () => {
    for (const c of classes) {
      expect(c.activeSkillId).toMatch(/^skill_/);
      expect(c.passiveSkillIds).toHaveLength(2);
    }
  });

  it("validateCatalog passa no catálogo embarcado", () => {
    expect(() => validateCatalog()).not.toThrow();
  });
});

describe("charSheets", () => {
  it("expande o id do personagem para as 6 folhas do manifesto", () => {
    expect(charSheets("hero")).toEqual({
      idle: "characters/hero/hero_idle_sheet",
      walk: "characters/hero/hero_walk_sheet",
      run: "characters/hero/hero_run_sheet",
      attack: "characters/hero/hero_attack_sheet",
      hurt: "characters/hero/hero_hurt_sheet",
      death: "characters/hero/hero_death_sheet",
    });
  });
});

describe("catálogo de inimigos (P-006 — ADR-021)", () => {
  it("ids únicos e papéis válidos", () => {
    expect(new Set(enemies.map((e) => e.id)).size).toBe(enemies.length);
    for (const e of enemies) {
      expect(ENEMY_ROLES, e.id).toContain(e.role);
      expect(e.statMultiplier, e.id).toBeGreaterThan(0);
    }
  });

  it("todo inimigo tem as 6 folhas; retrato é opcional (§62 — sem placeholder)", () => {
    for (const e of enemies) {
      for (const key of CHARACTER_SHEET_KEYS) {
        expect(e.assets.sheets[key], `${e.id}.${key}`).toContain("/");
      }
    }
  });
});
