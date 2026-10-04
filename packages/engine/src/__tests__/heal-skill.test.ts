/**
 * Skill de cura (ADR-038): cura instantânea + regeneração, só quando o alvo está ferido, sem atacar.
 */
import { describe, expect, it } from "vitest";
import { config } from "@tia/config";
import { createBattle, step } from "../simulate.js";
import type { BattleSetup, CombatantSeed, SkillDef } from "../simulate.js";

const stats = (hp: number, attack: number, specialAttack = 0) => ({ hp, attack, specialAttack, defense: 0, specialDefense: 0, critChance: 0, attackSpeed: 0, speed: 10 });
const cure: SkillDef = {
  id: "skill_cure",
  targeting: "self",
  damageType: "none",
  coefficient: 0,
  hitCount: 1,
  cooldownMs: 5000,
  enabled: true,
  heal: { coefficient: 2, thresholdFraction: 0.7, regen: { totalFraction: 0.08, durationMs: 4000, intervalMs: 1000 } },
};
const ally = (over: Partial<CombatantSeed> = {}): CombatantSeed => ({ id: "h1", name: "h1", side: "ally", level: 10, stats: stats(1000, 10, 50), heroId: "h1", ...over });
const foe = (atk = 0): CombatantSeed => ({ id: "e1", name: "e1", side: "enemy", level: 10, stats: stats(1e9, atk), enemyId: "e1" });
const setup = (a: CombatantSeed, e: CombatantSeed, skills: SkillDef[]): BattleSetup => ({ mode: "tower", battleId: "b", seed: 3, allySeed: [a], enemySeed: [e], config: config.combat, skills: { h1: skills } });

describe("skill de cura", () => {
  it("com a vida cheia não reza e não gasta o cooldown", () => {
    const b = createBattle(setup(ally(), foe(), [cure]));
    const types = step(b, 3000, config.combat).map((e) => e.type);
    expect(types).not.toContain("skill_used");
    expect(types).not.toContain("heal_dealt");
  });

  it("ferido, cura `coeficiente × Ataque Especial` (limitado ao HP faltante) e emite skill_used", () => {
    const b = createBattle(setup(ally({ startHp: 500 }), foe(), [cure]));
    const events = step(b, 1500, config.combat);
    expect(events.some((e) => e.type === "skill_used" && e.skillId === "skill_cure")).toBe(true);
    const heals = events.filter((e) => e.type === "heal_dealt");
    expect(heals[0]).toMatchObject({ sourceId: "h1", targetId: "h1", amount: 100 }); // 50 × 2
  });

  it("deixa uma regeneração: pulsos de ≈ 8% do HP máx. no total, depois status_removed", () => {
    const b = createBattle(setup(ally({ startHp: 300 }), foe(), [{ ...cure, heal: { ...cure.heal!, coefficient: 0.1 } }]));
    const events = step(b, 6500, config.combat);
    expect(events.some((e) => e.type === "status_applied" && e.statusId === "regen")).toBe(true);
    const healed = events.filter((e) => e.type === "heal_dealt").reduce((s, e) => s + (e as { amount: number }).amount, 0);
    // 1ª cura = 5; regen = 4 pulsos × floor(1000×0,08/4)=20 → 80 (a 2ª cura só vem após o cooldown de 5 s)
    expect(healed).toBeGreaterThanOrEqual(85);
    expect(events.some((e) => e.type === "status_removed" && e.statusId === "regen")).toBe(true);
  });

  it("respeita o cooldown: não reza de novo antes do tempo", () => {
    const b = createBattle(setup(ally({ startHp: 100 }), foe(), [{ ...cure, heal: { ...cure.heal!, coefficient: 0.01 } }]));
    const events = step(b, 4000, config.combat);
    expect(events.filter((e) => e.type === "skill_used")).toHaveLength(1);
  });

  it("o herói de cura ainda ataca no básico quando não precisa curar", () => {
    const b = createBattle(setup(ally({ stats: stats(1000, 40, 50) }), foe(), [cure]));
    const events = step(b, 3000, config.combat);
    expect(events.some((e) => e.type === "damage_dealt")).toBe(true);
  });

  it("a cura é determinística (mesma seed ⇒ mesmos eventos)", () => {
    const run = () => step(createBattle(setup(ally({ startHp: 400 }), foe(30), [cure])), 8000, config.combat);
    expect(JSON.stringify(run())).toBe(JSON.stringify(run()));
  });
});
