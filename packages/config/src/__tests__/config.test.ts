import { describe, expect, it } from "vitest";
import { config, validateConfig, ConfigValidationError, RARITY_ORDER } from "../index.js";
import type { GameConfig } from "../types.js";

/** Clone profundo do config para mutação em teste. */
function clone(): GameConfig {
  return JSON.parse(JSON.stringify(config)) as GameConfig;
}

describe("validação de configuração", () => {
  it("a configuração real é válida", () => {
    expect(() => validateConfig(config)).not.toThrow();
    expect(validateConfig(config)).toBe(config);
  });

  it("tabela de raridade soma 100% (§33)", () => {
    const total = RARITY_ORDER.reduce((acc, r) => acc + (config.loot.rarity[r] ?? 0), 0);
    expect(total).toBeCloseTo(1.0, 6);
  });

  it("valores do §33 batem exatamente", () => {
    expect(config.loot.rarity.common).toBe(0.5);
    expect(config.loot.rarity.uncommon).toBe(0.3);
    expect(config.loot.rarity.rare).toBe(0.15);
    expect(config.loot.rarity.epic).toBe(0.04);
    expect(config.loot.rarity.legendary).toBe(0.009);
    expect(config.loot.rarity.celestial).toBe(0.001);
  });

  it("probabilidade de drop é 5% (§32)", () => {
    expect(config.loot.equipmentChance).toBe(0.05);
  });

  it("rejeita tabela de raridade que não soma 1", () => {
    const bad = clone();
    bad.loot.rarity.common = 0.9;
    expect(() => validateConfig(bad)).toThrow(ConfigValidationError);
    expect(() => validateConfig(bad)).toThrow(/soma/);
  });

  it("rejeita probabilidade de drop fora de [0,1]", () => {
    const bad = clone();
    bad.loot.equipmentChance = 1.5;
    expect(() => validateConfig(bad)).toThrow(/loot\.equipmentChance/);
  });

  it("rejeita Torre que não seja 1x1 (§17)", () => {
    const bad = clone();
    // O tipo é literal `1`, então atribuir 3 já é erro de compilação; o
    // `as never` existe só para alcançar o validador em runtime.
    (bad.combat.towerBattleSize as { allies: number }).allies = 3;
    expect(() => validateConfig(bad)).toThrow(/1x1/);
  });

  it("rejeita boss em andar da Torre (§21, §55 — regra ABOLIDA)", () => {
    const bad = clone();
    (bad.combat as unknown as { towerAutoBossFloors: number[] }).towerAutoBossFloors = [10, 20, 30];
    expect(() => validateConfig(bad)).toThrow(/ABOLIDA/);
  });

  it("rejeita fragmentos de inimigo comum (§12 — PROIBIDO)", () => {
    const bad = clone();
    // @ts-expect-error — mutação proposital
    bad.loot.fragmentsFromCommonTower = true;
    expect(() => validateConfig(bad)).toThrow(/FALSE/);
  });

  it("rejeita X não independente (§36)", () => {
    const bad = clone();
    // @ts-expect-error — mutação proposital
    bad.loot.x.independentPerAttribute = false;
    expect(() => validateConfig(bad)).toThrow(/independentPerAttribute/);
  });

  it("rejeita X com min >= max", () => {
    const bad = clone();
    bad.loot.x.min = 50;
    bad.loot.x.max = 10;
    expect(() => validateConfig(bad)).toThrow(/loot\.x/);
  });

  it("rejeita XP distribuído acima da recompensa", () => {
    const bad = clone();
    bad.xp.teamSplit[3] = 0.9; // 0.9 × 3 = 2.7 > 1
    expect(() => validateConfig(bad)).toThrow(/distribuiria mais XP/);
  });

  it("rejeita divisão de XP crescente (viola §20)", () => {
    const bad = clone();
    bad.xp.teamSplit[1] = 0.1;
    bad.xp.teamSplit[2] = 0.5;
    expect(() => validateConfig(bad)).toThrow(/monótona/);
  });

  it("rejeita XP compartilhado entre Rei e herói (§45 — nunca misturar)", () => {
    const bad = clone();
    // @ts-expect-error — mutação proposital
    bad.xp.separatePools = false;
    expect(() => validateConfig(bad)).toThrow(/separatePools/);
  });

  it("rejeita limite de heróis (§13 — ilimitados)", () => {
    const bad = clone();
    (bad.inventory as unknown as { heroLimit: number }).heroLimit = 50;
    expect(() => validateConfig(bad)).toThrow(/heroLimit/);
  });

  it("rejeita taxa de mercado diferente de 15% (§41)", () => {
    const bad = clone();
    bad.economy.market.taxRate = 0.2;
    expect(() => validateConfig(bad)).toThrow(/15%/);
  });

  it("rejeita taxa que não é sink (§41 — consumida pelo servidor)", () => {
    const bad = clone();
    // @ts-expect-error — mutação proposital
    bad.economy.market.taxDestination = "seller";
    expect(() => validateConfig(bad)).toThrow(/sink/);
  });

  it("rejeita venda de equipamento desabilitada (§39)", () => {
    const bad = clone();
    // @ts-expect-error — mutação proposital
    bad.economy.equipment.sellEnabled = false;
    expect(() => validateConfig(bad)).toThrow(/sellEnabled/);
  });

  it("rejeita mais de 1 Rei por conta (§8)", () => {
    const bad = clone();
    // @ts-expect-error — mutação proposital
    bad.account.kingPerAccount = 3;
    expect(() => validateConfig(bad)).toThrow(/kingPerAccount/);
  });

  it("rejeita slots de equipe não monotônicos em nível", () => {
    const bad = clone();
    bad.team.slots[2].kingLevel = 5;
    expect(() => validateConfig(bad)).toThrow(/crescente/);
  });

  it("rejeita slot pago sem custo em Coin (§46 — nível + Coin)", () => {
    const bad = clone();
    bad.team.slots[1].costCoin = 0;
    expect(() => validateConfig(bad)).toThrow(/custo em Coin/);
  });

  it("rejeita equipe maior que 3 (§16)", () => {
    const bad = clone();
    // @ts-expect-error — mutação proposital
    bad.team.maxSize = 5;
    expect(() => validateConfig(bad)).toThrow(/maxSize/);
  });

  it("rejeita Procurando que pausa ao navegar (§29)", () => {
    const bad = clone();
    // @ts-expect-error — mutação proposital
    bad.searching.pausesOnNavigation = true;
    expect(() => validateConfig(bad)).toThrow(/pausesOnNavigation/);
  });

  it("rejeita Procurando fora de ~3s (§27)", () => {
    const bad = clone();
    bad.searching.minMs = 10_000;
    bad.searching.maxMs = 20_000;
    expect(() => validateConfig(bad)).toThrow(/searching/);
  });

  it("rejeita timestamp não absoluto no Procurando (ADR-007)", () => {
    const bad = clone();
    // @ts-expect-error — mutação proposital
    bad.searching.usesAbsoluteTimestamp = false;
    expect(() => validateConfig(bad)).toThrow(/usesAbsoluteTimestamp/);
  });

  it("rejeita drop de equipamento acima de 50% (§30 — recurso de valor)", () => {
    const bad = clone();
    bad.loot.equipmentChance = 0.8;
    expect(() => validateConfig(bad)).toThrow(/§30|descaracteriza/);
  });

  it("acumula múltiplos erros em uma única exceção", () => {
    const bad = clone();
    bad.loot.equipmentChance = 2;
    // @ts-expect-error — mutação proposital
    bad.loot.fragmentsFromCommonTower = true;
    try {
      validateConfig(bad);
      expect.unreachable("deveria ter lançado");
    } catch (e) {
      expect(e).toBeInstanceOf(ConfigValidationError);
      expect((e as ConfigValidationError).errors.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("valores do Master-Prompt na configuração", () => {
  it("§15 — slot 2 exige nível 10, slot 3 exige nível 25", () => {
    expect(config.team.slots[1].kingLevel).toBe(10);
    expect(config.team.slots[2].kingLevel).toBe(25);
  });

  it("§15 — slot 1 começa disponível e grátis", () => {
    expect(config.team.slots[0].kingLevel).toBe(1);
    expect(config.team.slots[0].costCoin).toBe(0);
  });

  it("§16 — equipe máxima é 3", () => {
    expect(config.team.maxSize).toBe(3);
  });

  it("§8 — 1 conta = 1 Rei", () => {
    expect(config.account.kingPerAccount).toBe(1);
  });

  it("§13 — heróis ilimitados", () => {
    expect(config.inventory.heroLimit).toBeNull();
  });

  it("§27 — Procurando dura ~3s", () => {
    expect(config.searching.minMs).toBeLessThanOrEqual(3000);
    expect(config.searching.maxMs).toBeGreaterThanOrEqual(3000);
  });

  it("§32/§33 — 5% de drop e raridades do Master-Prompt", () => {
    expect(config.loot.equipmentChance).toBe(0.05);
    expect(config.loot.rarity).toEqual({
      common: 0.5,
      uncommon: 0.3,
      rare: 0.15,
      epic: 0.04,
      legendary: 0.009,
      celestial: 0.001,
    });
  });

  it("§41 — taxa de mercado 15% consumida pelo servidor", () => {
    expect(config.economy.market.taxRate).toBe(0.15);
    expect(config.economy.market.taxDestination).toBe("sink");
  });

  it("§45 — XP do Rei e do herói são pools separados", () => {
    expect(config.xp.separatePools).toBe(true);
  });

  it("§48 — VIP começa desabilitado (valores só na fase de monetização)", () => {
    expect(config.economy.vip.enabled).toBe(false);
  });
});

describe("multiplicadores de raridade (§34)", () => {
  it("são monotônicos crescentes com a raridade", () => {
    const values = RARITY_ORDER.map((r) => config.equipment.rarity[r].multiplier);
    for (let i = 1; i < values.length; i += 1) {
      expect(values[i]!).toBeGreaterThan(values[i - 1]!);
    }
  });

  it("Celestial é 3x Common", () => {
    expect(config.equipment.rarity.celestial.multiplier).toBeCloseTo(config.equipment.rarity.common.multiplier * 3, 6);
  });
});
