/**
 * Poção e reviver no engine (ADR-025): `healCombatant`, `reviveCombatant` e o gancho
 * `onAlliesDown` do `step` (a luta continua depois de um revive).
 */
import { describe, expect, it } from "vitest";
import { config } from "@tia/config";
import { createBattle, healCombatant, reviveCombatant, step } from "../simulate.js";
import type { BattleSetup, CombatantSeed } from "../simulate.js";

const stats = (hp: number, attack: number) => ({ hp, attack, specialAttack: 0, defense: 0, specialDefense: 0, critChance: 0, attackSpeed: 0, speed: 10 });
const ally = (hp = 500, atk = 50): CombatantSeed => ({ id: "h1", name: "h1", side: "ally", level: 10, stats: stats(hp, atk), heroId: "h1" });
const foe = (hp = 300, atk = 20): CombatantSeed => ({ id: "e1", name: "e1", side: "enemy", level: 10, stats: stats(hp, atk), enemyId: "e1" });
const setup = (a: CombatantSeed, e: CombatantSeed): BattleSetup => ({ mode: "tower", battleId: "b", seed: 7, allySeed: [a], enemySeed: [e], config: config.combat });

describe("healCombatant", () => {
  it("cura só o que falta e emite heal_dealt + barra de vida", () => {
    const b = createBattle(setup({ ...ally(), startHp: 100 }, foe()));
    const healed = healCombatant(b, "h1", 1000);
    expect(healed).toBe(400);
    expect(b.allies[0]!.hp).toBe(500);
    const types = step(b, 0, config.combat).map((e) => e.type);
    expect(types).toContain("heal_dealt");
    expect(types).toContain("character_damaged");
  });

  it("não cura herói caído nem com a luta encerrada", () => {
    const b = createBattle(setup({ ...ally(), startHp: 100 }, foe()));
    b.allies[0]!.hp = 0;
    b.allies[0]!.isDefeated = true;
    expect(healCombatant(b, "h1", 50)).toBe(0);
  });
});

describe("reviveCombatant + onAlliesDown", () => {
  it("sem o gancho, a luta termina derrotada (comportamento padrão do engine)", () => {
    const b = createBattle(setup(ally(500, 1), foe(1e9, 1e6)));
    step(b, 5000, config.combat);
    expect(b.status).toBe("finished");
  });

  it("o gancho revive e a luta continua (em vez de terminar derrotada)", () => {
    const b = createBattle(setup(ally(500, 1), foe(1e9, 1e6)));
    let revives = 0;
    const events = step(b, 8000, config.combat, {
      onAlliesDown: (st) => {
        if (revives >= 2) return false;
        revives += 1;
        return reviveCombatant(st, "h1", 250);
      },
    });
    expect(revives).toBe(2);
    expect(events.some((e) => e.type === "character_revived")).toBe(true);
    expect(b.status).toBe("finished"); // esgotou os revives e caiu de vez
  });

  it("não revive quem está vivo", () => {
    const b = createBattle(setup(ally(), foe()));
    expect(reviveCombatant(b, "h1", 100)).toBe(false);
  });
});
