/**
 * Efeitos de equipamento no combate (ADR-023).
 *
 * O engine recebe `GearEffect[]` por combatente e não conhece itens. Estes testes
 * usam efeitos montados à mão: provam o mecanismo, não a calibração.
 */
import { describe, expect, it } from "vitest";
import { config, type GearEffect } from "@tia/config";
import type { BattleEvent } from "@tia/contracts";
import { buildGearProfile } from "../gear.js";
import { createBattle, step, TICK_MS } from "../simulate.js";
import type { CombatantSeed } from "../simulate.js";

const CAPS = config.equipment.effectCaps;

function seed(id: string, side: "ally" | "enemy", over: Partial<CombatantSeed["stats"]> = {}, effects?: GearEffect[], basic: "physical" | "magic" = "physical"): CombatantSeed {
  return {
    id,
    name: id,
    side,
    level: 10,
    stats: { hp: 100_000, attack: 100, specialAttack: 100, defense: 0, specialDefense: 0, critChance: 0, attackSpeed: 0, speed: 10, ...over },
    heroId: side === "ally" ? id : undefined,
    enemyId: side === "enemy" ? id : undefined,
    basicAttackType: basic,
    effects,
  } as CombatantSeed;
}

function run(ally: CombatantSeed, enemy: CombatantSeed, seconds: number, seedN = 7): { events: BattleEvent[]; state: ReturnType<typeof createBattle> } {
  const state = createBattle({ mode: "tower", battleId: "g", seed: seedN, allySeed: [ally], enemySeed: [enemy], config: config.combat, gearCaps: CAPS });
  const events: BattleEvent[] = [];
  for (let t = TICK_MS; t <= seconds * 1000 && state.status === "active"; t += TICK_MS) events.push(...step(state, t, config.combat));
  return { events, state };
}

const count = (events: BattleEvent[], pred: (e: BattleEvent) => boolean) => events.filter(pred).length;
const hitsBy = (events: BattleEvent[], id: string) => count(events, (e) => e.type === "damage_dealt" && e.sourceId === id);
const dmgBy = (events: BattleEvent[], id: string, kind?: string) =>
  events.reduce((s, e) => (e.type === "damage_dealt" && e.sourceId === id && (!kind || e.kind === kind) ? s + e.amount : s), 0);

describe("buildGearProfile — soma, caps e não empilhamento", () => {
  it("escalares somam e respeitam o teto", () => {
    const p = buildGearProfile(
      [
        { kind: "critChance", value: 0.2 },
        { kind: "critChance", value: 0.2 },
        { kind: "lifesteal", value: 0.5 },
        { kind: "lifesteal", value: 0.5 },
      ],
      CAPS,
    );
    expect(p.critChance).toBe(CAPS.critChance);
    expect(p.lifesteal).toBe(CAPS.lifesteal);
  });

  it("bônus de dano 'any' vale para os dois tipos; o tipado só para o seu", () => {
    const p = buildGearProfile([
      { kind: "damageBonus", damageType: "any", value: 0.1 },
      { kind: "damageBonus", damageType: "physical", value: 0.05 },
    ]);
    expect(p.damagePhysical).toBeCloseTo(0.15);
    expect(p.damageMagic).toBeCloseTo(0.1);
  });

  it("multiHit e area NÃO empilham: vale o melhor", () => {
    const p = buildGearProfile([
      { kind: "multiHit", hits: 2, coefficient: 0.5 },
      { kind: "multiHit", hits: 2, coefficient: 0.7 },
      { kind: "area", perTargetCoefficient: 0.4 },
      { kind: "area", perTargetCoefficient: 0.6 },
    ]);
    expect(p.multiHit?.coefficient).toBe(0.7);
    expect(p.area?.perTargetCoefficient).toBe(0.6);
  });

  it("sem efeitos: perfil vazio", () => {
    const p = buildGearProfile(undefined, CAPS);
    expect(p.dots).toHaveLength(0);
    expect(p.critChance).toBe(0);
  });
});

describe("velocidade de ataque (IAS) — ADR-023", () => {
  const dummy = () => seed("dummy", "enemy", { attack: 0, hp: 10_000_000 });

  it("IAS positivo ataca mais vezes que IAS zero (DES passa a valer)", () => {
    const slow = hitsBy(run(seed("a", "ally"), dummy(), 20).events, "a");
    const fast = hitsBy(run(seed("a", "ally", { attackSpeed: 0.5 }), dummy(), 20).events, "a");
    expect(fast).toBeGreaterThan(slow * 1.35);
  });

  it("IAS de EQUIPAMENTO soma ao da DES", () => {
    const plain = hitsBy(run(seed("a", "ally", { attackSpeed: 0.2 }), dummy(), 20).events, "a");
    const geared = hitsBy(run(seed("a", "ally", { attackSpeed: 0.2 }, [{ kind: "attackSpeed", value: 0.3 }]), dummy(), 20).events, "a");
    const same = hitsBy(run(seed("a", "ally", { attackSpeed: 0.5 }), dummy(), 20).events, "a");
    expect(geared).toBeGreaterThan(plain);
    expect(Math.abs(geared - same)).toBeLessThanOrEqual(1);
  });

  it("IAS negativo é mais lento, nunca trava", () => {
    const slow = hitsBy(run(seed("a", "ally", { attackSpeed: -0.5 }), dummy(), 20).events, "a");
    const base = hitsBy(run(seed("a", "ally"), dummy(), 20).events, "a");
    expect(slow).toBeGreaterThan(0);
    expect(slow).toBeLessThan(base);
  });
});

describe("efeitos de arma e característica", () => {
  const target = () => seed("e", "enemy", { attack: 0, hp: 10_000_000 });

  it("veneno: aplica o status, causa pulsos de dano 'dot' e expira", () => {
    const { events } = run(seed("a", "ally", {}, [{ kind: "dot", chance: 1, coefficient: 0.3, pulses: 4, intervalMs: 1000 }]), target(), 12);
    expect(count(events, (e) => e.type === "status_applied" && e.statusId === "poison")).toBeGreaterThan(0);
    expect(count(events, (e) => e.type === "damage_dealt" && e.kind === "dot")).toBeGreaterThan(3);
  });

  it("o veneno expira quando não é renovado", () => {
    const { events, state } = run(seed("a", "ally", {}, [{ kind: "dot", chance: 0.1, coefficient: 0.3, pulses: 2, intervalMs: 500 }]), target(), 40, 3);
    expect(count(events, (e) => e.type === "status_applied" && e.statusId === "poison")).toBeGreaterThan(0);
    expect(count(events, (e) => e.type === "status_removed" && e.statusId === "poison" && e.reason === "expired")).toBeGreaterThan(0);
    expect(state.effects.length).toBeLessThanOrEqual(1);
  });

  it("pulso de veneno nunca é crítico", () => {
    const { events } = run(seed("a", "ally", { critChance: 1 }, [{ kind: "dot", chance: 1, coefficient: 0.3, pulses: 4, intervalMs: 1000 }]), target(), 10);
    const critsOnDot = count(events, (e) => e.type === "critical_hit" && e.amount > 0) ;
    const dotHits = count(events, (e) => e.type === "damage_dealt" && e.kind === "dot");
    expect(dotHits).toBeGreaterThan(0);
    // crits existem (ataques diretos), mas há menos crits que golpes totais: os pulsos não contam
    expect(critsOnDot).toBeLessThan(hitsBy(events, "a"));
  });

  it("reaplicar veneno RENOVA em vez de empilhar (1 efeito por fonte/alvo)", () => {
    const { state } = run(seed("a", "ally", {}, [{ kind: "dot", chance: 1, coefficient: 0.3, pulses: 4, intervalMs: 1000 }]), target(), 6);
    expect(state.effects.filter((e) => e.statusId === "poison")).toHaveLength(1);
  });

  it("atordoamento: o alvo perde ações (menos golpes do que sem stun)", () => {
    const foe = () => seed("e", "enemy", { attack: 50, hp: 10_000_000 });
    const base = hitsBy(run(seed("a", "ally", { hp: 10_000_000 }), foe(), 20).events, "e");
    const stunned = run(seed("a", "ally", { hp: 10_000_000 }, [{ kind: "stun", chance: 0.5, durationMs: 1000 }]), foe(), 20);
    expect(hitsBy(stunned.events, "e")).toBeLessThan(base);
    expect(count(stunned.events, (e) => e.type === "status_removed" && e.statusId === "stun" && e.reason === "consumed")).toBeGreaterThan(0);
  });

  it("contracorte: reage a ataque direto com dano próprio, sem recursão", () => {
    const attacker = seed("e", "enemy", { attack: 100, hp: 10_000_000 }, [{ kind: "counter", chance: 1, coefficient: 1 }]);
    const defender = seed("a", "ally", { attack: 0, hp: 10_000_000 }, [{ kind: "counter", chance: 1, coefficient: 1 }]);
    const { events } = run(defender, attacker, 10);
    const triggered = count(events, (e) => e.type === "effect_triggered" && e.effectId === "counter");
    const direct = hitsBy(events, "e") + hitsBy(events, "a");
    expect(triggered).toBeGreaterThan(0);
    // Se houvesse recursão, a contagem de golpes explodiria até estourar a pilha.
    expect(direct).toBeLessThan(2000);
  });

  it("roubo vital: cura o atacante (e só até o HP máximo)", () => {
    const foe = seed("e", "enemy", { attack: 80, hp: 10_000_000 });
    const hero = seed("a", "ally", { hp: 20_000, attack: 100 }, [{ kind: "lifesteal", value: 0.5 }]);
    const { events, state } = run(hero, foe, 20);
    const healed = events.reduce((s, e) => (e.type === "heal_dealt" ? s + e.amount : s), 0);
    expect(healed).toBeGreaterThan(0);
    expect(state.allies[0]!.hp).toBeLessThanOrEqual(state.allies[0]!.maxHp);
    // sem equipamento não há cura
    const plain = run(seed("a", "ally", { hp: 20_000, attack: 100 }), seed("e", "enemy", { attack: 80, hp: 10_000_000 }), 20).events;
    expect(count(plain, (e) => e.type === "heal_dealt")).toBe(0);
  });

  it("golpe duplo: o básico vira N golpes e a soma ≈ N × coeficiente", () => {
    const one = hitsBy(run(seed("a", "ally"), target(), 10).events, "a");
    const two = hitsBy(run(seed("a", "ally", {}, [{ kind: "multiHit", hits: 2, coefficient: 0.6 }]), target(), 10).events, "a");
    expect(two).toBeGreaterThanOrEqual(one * 2 - 2);
    const d1 = dmgBy(run(seed("a", "ally"), target(), 10).events, "a");
    const d2 = dmgBy(run(seed("a", "ally", {}, [{ kind: "multiHit", hits: 2, coefficient: 0.6 }]), target(), 10).events, "a");
    expect(d2 / d1).toBeCloseTo(1.2, 0);
  });

  it("bônus de dano e ruptura de guarda aumentam o dano causado", () => {
    const armored = () => seed("e", "enemy", { attack: 0, defense: 3000, hp: 10_000_000 });
    const base = dmgBy(run(seed("a", "ally"), armored(), 10).events, "a");
    const bonus = dmgBy(run(seed("a", "ally", {}, [{ kind: "damageBonus", damageType: "physical", value: 0.2 }]), armored(), 10).events, "a");
    const pierce = dmgBy(run(seed("a", "ally", {}, [{ kind: "defensePierce", value: 0.3 }]), armored(), 10).events, "a");
    expect(bonus).toBeGreaterThan(base * 1.15);
    expect(pierce).toBeGreaterThan(base);
  });

  it("sifão do livro: só o básico MÁGICO cura", () => {
    const foe = () => seed("e", "enemy", { attack: 80, hp: 10_000_000 });
    const mage = run(seed("a", "ally", { hp: 20_000 }, [{ kind: "basicHeal", value: 0.2 }], "magic"), foe(), 15).events;
    const warrior = run(seed("a", "ally", { hp: 20_000 }, [{ kind: "basicHeal", value: 0.2 }], "physical"), foe(), 15).events;
    expect(count(mage, (e) => e.type === "heal_dealt")).toBeGreaterThan(0);
    expect(count(warrior, (e) => e.type === "heal_dealt")).toBe(0);
  });
});

describe("determinismo (§64)", () => {
  it("mesma seed + mesmos efeitos ⇒ mesma sequência de eventos", () => {
    const fx: GearEffect[] = [
      { kind: "dot", chance: 0.5, coefficient: 0.3, pulses: 3, intervalMs: 1000 },
      { kind: "stun", chance: 0.3, durationMs: 800 },
      { kind: "lifesteal", value: 0.1 },
      { kind: "counter", chance: 0.5, coefficient: 0.5 },
    ];
    const go = () => run(seed("a", "ally", { critChance: 0.2 }, fx), seed("e", "enemy", { attack: 60, hp: 50_000 }, fx), 30, 99).events;
    expect(go()).toEqual(go());
  });
});
