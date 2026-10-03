/**
 * Testes do suporte do engine à Fase 6 (COMBATE):
 *
 * - `startHp`: o combatente pode nascer com HP parcial (HP persistente
 *   entre batalhas — ADR-020), clampado em [0, maxHp].
 * - skills: a skill ativa dispara pelo cooldown e emite `skill_used`
 *   com o `skillId` (§56 — as skills disparam sozinhas).
 */
import { describe, expect, it } from "vitest";
import { createBattle, step, TICK_MS } from "../simulate.js";
import type { BattleSetup, CombatantSeed } from "../simulate.js";
import { config } from "@tia/config";
import type { SkillDef } from "../simulate.js";

function hero(id: string, hp = 500, atk = 50): CombatantSeed {
  return {
    id,
    name: id,
    side: "ally",
    level: 10,
    stats: { hp, attack: atk, specialAttack: 0, defense: 0, specialDefense: 0, critChance: 0, attackSpeed: 0, speed: 10 },
    heroId: id,
  };
}

function enemy(id: string, hp = 300, atk = 20): CombatantSeed {
  return {
    id,
    name: id,
    side: "enemy",
    level: 10,
    stats: { hp, attack: atk, specialAttack: 0, defense: 0, specialDefense: 0, critChance: 0, attackSpeed: 0, speed: 10 },
    enemyId: id,
  };
}

function setup(allies: CombatantSeed[], enemies: CombatantSeed[], skills?: Record<string, SkillDef[]>): BattleSetup {
  return {
    mode: "tower",
    battleId: "b1",
    seed: 42,
    allySeed: allies,
    enemySeed: enemies,
    config: config.combat,
    skills,
  };
}

describe("startHp — HP inicial parcial (ADR-020)", () => {
  it("nasce com o HP pedido quando menor que o máximo", () => {
    const state = createBattle(setup([{ ...hero("a", 500), startHp: 120 }], [enemy("x")]));
    expect(state.allies[0]!.hp).toBe(120);
    expect(state.allies[0]!.maxHp).toBe(500);
    expect(state.allies[0]!.isDefeated).toBe(false);
  });

  it("clamp para o máximo: startHp nunca passa do HP verdadeiro", () => {
    const state = createBattle(setup([{ ...hero("a", 500), startHp: 9999 }], [enemy("x")]));
    expect(state.allies[0]!.hp).toBe(500);
  });

  it("clamp para o piso: startHp negativo nasce caído", () => {
    const state = createBattle(setup([{ ...hero("a", 500), startHp: -3 }], [enemy("x")]));
    expect(state.allies[0]!.hp).toBe(0);
    expect(state.allies[0]!.isDefeated).toBe(true);
  });

  it("sem startHp nasce cheio", () => {
    const state = createBattle(setup([hero("a", 500)], [enemy("x")]));
    expect(state.allies[0]!.hp).toBe(500);
  });
});

describe("skills na batalha (§56)", () => {
  const fireball: SkillDef = {
    id: "skill_fireball",
    targeting: "single",
    damageType: "magic",
    coefficient: 1.8,
    hitCount: 1,
    cooldownMs: 3000,
    enabled: true,
  };

  it("a skill ativa dispara pelo cooldown e emite skill_used com o id", () => {
    const state = createBattle(
      setup([hero("a", 5000, 30)], [enemy("x", 4000, 5)], { a: [fireball] }),
    );
    const skillUses: string[] = [];
    const skillAttacks: string[] = [];
    for (let t = 0; t < 200; t += 1) {
      const events = step(state, t * TICK_MS, config.combat);
      for (const e of events) {
        if (e.type === "skill_used") skillUses.push(e.skillId);
        if (e.type === "attack_started" && e.skillId) skillAttacks.push(e.skillId);
      }
    }
    // ~20s de batalha com cooldown de 3s: várias usagens, todas com o id.
    expect(skillUses.length).toBeGreaterThanOrEqual(2);
    expect(skillUses.every((id) => id === "skill_fireball")).toBe(true);
    expect(skillAttacks.every((id) => id === "skill_fireball")).toBe(true);
  });

  it("sem skills definidas, o combatente só dá ataque básico (skillId undefined)", () => {
    const state = createBattle(setup([hero("a", 5000, 30)], [enemy("x", 4000, 5)]));
    const attacks: { skillId?: string | null }[] = [];
    for (let t = 0; t < 50; t += 1) {
      for (const e of step(state, t * TICK_MS, config.combat)) {
        if (e.type === "attack_started") attacks.push({ skillId: e.skillId });
      }
    }
    expect(attacks.length).toBeGreaterThan(0);
    expect(attacks.every((a) => a.skillId === undefined || a.skillId === null)).toBe(true);
  });
});
