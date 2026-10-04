/**
 * ADR-021 — constante de defesa por nível do alvo e tipo do ataque básico.
 */
import { describe, expect, it } from "vitest";
import { config } from "@tia/config";
import { computeDamage, defenseConstantFor, dotDamage } from "../formula.js";
import { createBattle, step } from "../simulate.js";
import type { CombatantSeed } from "../simulate.js";

const base = { offensivePower: 100, coefficient: 1, damageModifiers: 1, config: config.combat };

describe("constante de defesa por nível", () => {
  it("nível 1 (ou omitido) mantém a fórmula antiga: K = defenseConstant", () => {
    expect(defenseConstantFor(config.combat)).toBe(config.combat.defenseConstant);
    expect(defenseConstantFor(config.combat, 1)).toBe(config.combat.defenseConstant);
    const a = computeDamage({ ...base, targetDefense: 100 });
    const b = computeDamage({ ...base, targetDefense: 100, targetLevel: 1 });
    expect(a.finalDamage).toBe(b.finalDamage);
    expect(a.finalDamage).toBe(50); // 100 × 100/(100+100)
  });

  it("K cresce com o nível do alvo: a mesma Defesa mitiga menos num alvo de nível alto", () => {
    const low = computeDamage({ ...base, targetDefense: 1000, targetLevel: 1 });
    const high = computeDamage({ ...base, targetDefense: 1000, targetLevel: 1000 });
    expect(high.finalDamage).toBeGreaterThan(low.finalDamage);
    expect(defenseConstantFor(config.combat, 1000)).toBe(
      config.combat.defenseConstant + config.combat.defenseConstantPerLevel * 999,
    );
  });

  it("dano periódico usa a mesma constante", () => {
    const low = dotDamage({ offensivePower: 100, coefficient: 1, targetDefense: 500, targetLevel: 1, config: config.combat });
    const high = dotDamage({ offensivePower: 100, coefficient: 1, targetDefense: 500, targetLevel: 500, config: config.combat });
    expect(high).toBeGreaterThan(low);
  });
});

function duel(basicAttackType: "physical" | "magic", enemyAtk: { attack: number; specialAttack: number }) {
  const hero: CombatantSeed = {
    id: "h", name: "h", side: "ally", level: 1, heroId: "h",
    stats: { hp: 100_000, attack: 0, specialAttack: 0, defense: 0, specialDefense: 0, critChance: 0, attackSpeed: 0, speed: 10 },
  };
  const foe: CombatantSeed = {
    id: "e", name: "e", side: "enemy", level: 1, enemyId: "e", basicAttackType,
    stats: { hp: 100_000, ...enemyAtk, defense: 0, specialDefense: 0, critChance: 0, attackSpeed: 0, speed: 10 },
  };
  const battle = createBattle({ mode: "tower", battleId: "t", seed: 1, allySeed: [hero], enemySeed: [foe], config: config.combat });
  step(battle, 2_100, config.combat);
  return 100_000 - battle.allies[0]!.hp;
}

describe("tipo do ataque básico", () => {
  it("padrão é físico: usa Ataque, ignora Ataque Esp.", () => {
    expect(duel("physical", { attack: 50, specialAttack: 0 })).toBeGreaterThan(0);
    expect(duel("physical", { attack: 0, specialAttack: 50 })).toBeLessThan(duel("physical", { attack: 50, specialAttack: 0 }));
  });

  it("mágico usa Ataque Esp., ignora Ataque", () => {
    const magic = duel("magic", { attack: 0, specialAttack: 50 });
    expect(magic).toBeGreaterThan(0);
    const wrongStat = duel("magic", { attack: 50, specialAttack: 0 });
    expect(wrongStat).toBeLessThan(magic); // só o dano mínimo, não 50
  });
});
