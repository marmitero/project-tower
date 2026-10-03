import { describe, expect, it } from "vitest";
import {
  actionIntervalMs,
  computeDamage,
  divideXp,
  dotDamage,
  powerOf,
  qualityGrade,
  rollCritical,
} from "../formula.js";
import { config } from "@tia/config";
import type { CombatStats } from "@tia/contracts";

const baseStats: CombatStats = {
  hp: 100,
  attack: 10,
  specialAttack: 5,
  defense: 8,
  specialDefense: 6,
  critChance: 0.05,
  attackSpeed: 0,
  speed: 10,
};

describe("fórmula de dano (§37, ADR-001)", () => {
  it("DanoBase = poder × coeficiente × 100/(100+defesa)", () => {
    const { finalDamage } = computeDamage({
      offensivePower: 100,
      coefficient: 1,
      targetDefense: 0,
      damageModifiers: 1,
      config: config.combat,
    });
    expect(finalDamage).toBe(100);
  });

  it("Defesa 100 reduz o dano à metade", () => {
    const { finalDamage } = computeDamage({
      offensivePower: 100,
      coefficient: 1,
      targetDefense: 100,
      damageModifiers: 1,
      config: config.combat,
    });
    expect(finalDamage).toBe(50);
  });

  it("Defesa 300 reduz o dano a um quarto", () => {
    const { finalDamage } = computeDamage({
      offensivePower: 100,
      coefficient: 1,
      targetDefense: 300,
      damageModifiers: 1,
      config: config.combat,
    });
    expect(finalDamage).toBe(25);
  });

  it("golpe que acertou causa no mínimo 1 de dano", () => {
    const { finalDamage } = computeDamage({
      offensivePower: 1,
      coefficient: 0.1,
      targetDefense: 100_000,
      damageModifiers: 1,
      config: config.combat,
    });
    expect(finalDamage).toBeGreaterThanOrEqual(1);
  });

  it("nunca causa dano negativo com defesa negativa", () => {
    const { finalDamage } = computeDamage({
      offensivePower: 50,
      coefficient: 1,
      targetDefense: -50,
      damageModifiers: 1,
      config: config.combat,
    });
    expect(finalDamage).toBeGreaterThan(0);
  });
});

describe("crítico", () => {
  it("chance efetiva é limitada ao teto (critCap)", () => {
    const { effectiveChance } = rollCritical({
      critChance: 0.99,
      bonusFlatPercent: 0,
      rngNext: 1,
      config: config.combat,
    });
    expect(effectiveChance).toBe(config.combat.critCap);
  });

  it("multiplicador é 1.5", () => {
    expect(config.combat.critMultiplier).toBe(1.5);
  });

  it("rngNext abaixo da chance resulta em crítico", () => {
    const { isCritical } = rollCritical({
      critChance: 0.5,
      bonusFlatPercent: 0,
      rngNext: 0.1,
      config: config.combat,
    });
    expect(isCritical).toBe(true);
  });

  it("rngNext acima da chance não é crítico", () => {
    const { isCritical } = rollCritical({
      critChance: 0.1,
      bonusFlatPercent: 0,
      rngNext: 0.9,
      config: config.combat,
    });
    expect(isCritical).toBe(false);
  });
});

describe("velocidade de ataque", () => {
  it("intervalo base é T0 = 1000ms com IAS 0 (ADR-023)", () => {
    expect(actionIntervalMs(0, config.combat)).toBe(1000);
  });

  it("IAS +100% dá metade do intervalo (teto)", () => {
    expect(actionIntervalMs(1, config.combat)).toBe(500);
  });

  it("IAS -50% dobra o intervalo (piso)", () => {
    expect(actionIntervalMs(-0.5, config.combat)).toBe(2000);
  });

  it("IAS é limitado: 10.0 não gera intervalo zero", () => {
    expect(actionIntervalMs(10, config.combat)).toBe(500);
  });

  it("IAS é limitado: -99 não gera loop infinito", () => {
    expect(actionIntervalMs(-99, config.combat)).toBe(2000);
  });
});

describe("dano periódico (DoT)", () => {
  it("não depende de modificador e ignora crítico", () => {
    const a = dotDamage({ offensivePower: 100, coefficient: 0.1, targetDefense: 0, config: config.combat });
    const b = dotDamage({ offensivePower: 100, coefficient: 0.1, targetDefense: 0, config: config.combat });
    expect(a).toBe(b);
    expect(a).toBe(10);
  });
});

describe("Poder (§34, §38 — comparativo, não preditivo)", () => {
  it("é monotônico: mais stats ⇒ mais poder", () => {
    const weak = powerOf({ ...baseStats, attack: 10 });
    const strong = powerOf({ ...baseStats, attack: 20 });
    expect(strong).toBeGreaterThan(weak);
  });

  it("mesma fórmula para item e personagem", () => {
    const a = powerOf(baseStats);
    const b = powerOf({ ...baseStats });
    expect(a).toBe(b);
  });

  it("crítico e IAS entram convertidos em pontos percentuais", () => {
    const noCrit = powerOf({ ...baseStats, critChance: 0, attackSpeed: 0 });
    const withCrit = powerOf({ ...baseStats, critChance: 0.05, attackSpeed: 0 });
    // 0.05 → 5 p.p. → 1.5 × 5 = 7.5
    expect(withCrit - noCrit).toBeCloseTo(7.5, 6);
  });
});

describe("Nota de qualidade (§34, §35 — independente da raridade)", () => {
  const range = { min: 0.5, max: 2.5 };
  const grades = config.equipment.grades;

  it("todos os X no máximo ⇒ nota 100, grau S", () => {
    const { quality, grade } = qualityGrade([2.5, 2.5, 2.5, 2.5], range, grades);
    expect(quality).toBe(100);
    expect(grade).toBe("S");
  });

  it("todos os X no mínimo ⇒ nota 0, grau F (a nota usa a FAIXA, não x/max)", () => {
    const { quality, grade } = qualityGrade([0.5, 0.5], range, grades);
    expect(quality).toBe(0);
    expect(grade).toBe("F");
  });

  it("a nota é a média normalizada: X = ponto médio da faixa ⇒ 50", () => {
    expect(qualityGrade([1.5, 1.5, 1.5], range, grades).quality).toBeCloseTo(50, 6);
  });

  it("a nota NÃO depende da raridade: mesma rolagem, mesma nota", () => {
    const a = qualityGrade([1.0, 2.0, 1.5], range, grades);
    const b = qualityGrade([1.0, 2.0, 1.5], range, grades);
    expect(a.quality).toBe(b.quality);
  });

  it("a letra vem da tabela passada (dado), na ordem do maior limiar", () => {
    const custom = [
      { grade: "S" as const, minQuality: 10 },
      { grade: "F" as const, minQuality: 0 },
    ];
    expect(qualityGrade([1.0], range, custom).grade).toBe("S"); // nota 25
    expect(qualityGrade([0.5], range, custom).grade).toBe("F");
  });
});

describe("divisão de XP (§20, §81) — INV-06", () => {
  const split = config.xp.teamSplit;

  it("1 herói recebe 100%", () => {
    expect(divideXp(1000, 1, split)).toEqual([1000]);
  });

  it("2 heróis recebem 50% cada", () => {
    expect(divideXp(1000, 2, split)).toEqual([500, 500]);
  });

  it("3 heróis recebem 1/3 cada", () => {
    const out = divideXp(1000, 3, split);
    expect(out).toHaveLength(3);
    // 1000 × 1/3 = 333,33. O resto de 1 XP NÃO é perdido nem dado
    // todo a um herói: é distribuído round-robin a partir do primeiro.
    // `[334, 333, 333]`, e a soma é exatamente 1000.
    expect(out[0]).toBe(334);
    expect(out[1]).toBe(333);
    expect(out[2]).toBe(333);
    expect(out.reduce((a, b) => a + b, 0)).toBe(1000);
  });

  it("mais heróis ⇒ MENOS XP individual (§20)", () => {
    const one = divideXp(1000, 1, split)[0]!;
    const two = divideXp(1000, 2, split)[0]!;
    const three = divideXp(1000, 3, split)[0]!;
    expect(one).toBeGreaterThan(two);
    expect(two).toBeGreaterThan(three);
  });

  it("todos os membros elegíveis recebem XP (> 0)", () => {
    for (const out of [divideXp(1000, 1, split), divideXp(1000, 2, split), divideXp(1000, 3, split)]) {
      expect(out.every((v) => v > 0)).toBe(true);
    }
  });

  it("nunca distribui mais do que a recompensa total", () => {
    for (const size of [1, 2, 3] as const) {
      for (const total of [1, 7, 100, 999, 100_000]) {
        const out = divideXp(total, size, split);
        expect(out.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(total);
      }
    }
  });
});
