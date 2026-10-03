/**
 * BossBattle no engine (ADR-027): equipe × 1 chefe, ataque simultâneo (§24/§80), skills de área,
 * resistência/imunidade a status, fases por HP/tempo e limite de tempo. Mesmo `createBattle`/`step`
 * da Torre (§65 — sem segundo motor).
 */
import { describe, expect, it } from "vitest";
import { config } from "@tia/config";
import { createBattle, step } from "../simulate.js";
import type { BattleSetup, CombatantSeed, SkillDef } from "../simulate.js";

const stats = (hp: number, attack: number, extra: Partial<CombatantSeed["stats"]> = {}) => ({
  hp, attack, specialAttack: 0, defense: 0, specialDefense: 0, critChance: 0, attackSpeed: 0, speed: 10, ...extra,
});
const hero = (id: string, hp = 1_000, atk = 20, extra: Partial<CombatantSeed> = {}): CombatantSeed => ({
  id, name: id, side: "ally", level: 10, stats: stats(hp, atk), heroId: id, ...extra,
});
const boss = (hp = 5_000, atk = 30, extra: Partial<CombatantSeed> = {}): CombatantSeed => ({
  id: "boss:x", name: "Chefe", side: "enemy", level: 10, stats: stats(hp, atk), enemyId: "x", isBoss: true, ...extra,
});
const setup = (allies: CombatantSeed[], enemy: CombatantSeed, extra: Partial<BattleSetup> = {}): BattleSetup => ({
  mode: "boss", battleId: "boss-b", seed: 5, allySeed: allies, enemySeed: [enemy], config: config.combat, ...extra,
});
const skill = (id: string, targeting: SkillDef["targeting"], coefficient = 1, cooldownMs = 2_000): SkillDef => ({
  id, targeting, damageType: "physical", coefficient, hitCount: 1, cooldownMs, enabled: true,
});

describe("BossBattle — composição", () => {
  it("a equipe INTEIRA entra e o chefe é UM só (§24)", () => {
    const b = createBattle(setup([hero("a"), hero("b"), hero("c")], boss()));
    expect(b.allies.map((a) => a.id)).toEqual(["a", "b", "c"]);
    expect(b.enemies).toHaveLength(1);
    expect(b.enemies[0]!.isBoss).toBe(true);
  });

  it("Torre continua 1×1 mesmo recebendo 3 aliados (§17/§79)", () => {
    const b = createBattle(setup([hero("a"), hero("b"), hero("c")], boss(), { mode: "tower" }));
    expect(b.allies).toHaveLength(1);
    expect(b.enemies).toHaveLength(1);
  });

  it("os heróis atacam SIMULTANEAMENTE, no mesmo tick (§24/§80)", () => {
    const b = createBattle(setup([hero("a"), hero("b"), hero("c")], boss()));
    const events = step(b, 100, config.combat);
    const attacks = events.filter((e) => e.type === "attack_started" && e.actorId !== "boss:x");
    expect(attacks.map((e) => (e.type === "attack_started" ? e.actorId : "")).sort()).toEqual(["a", "b", "c"]);
    expect(new Set(attacks.map((e) => e.tick)).size).toBe(1);
  });

  it("limite de tempo e id do chefe só existem em BossBattle", () => {
    const boss1 = createBattle(setup([hero("a")], boss(), { timeLimitMs: 60_000, bossId: "x" }));
    expect(boss1.timeLimitMs).toBe(60_000);
    expect(boss1.bossId).toBe("x");
    const tower = createBattle(setup([hero("a")], boss(), { mode: "tower", timeLimitMs: 60_000, bossId: "x" }));
    expect(tower.timeLimitMs).toBeUndefined();
    expect(tower.bossId).toBeUndefined();
  });
});

describe("BossBattle — alvos", () => {
  it("skill de área atinge TODA a equipe viva", () => {
    const b = createBattle(setup([hero("a"), hero("b"), hero("c")], boss(1e9, 30), { skills: { "boss:x": [skill("aoe", "all_enemies", 1)] } }));
    const events = step(b, 100, config.combat);
    const hit = events.filter((e) => e.type === "damage_dealt" && e.sourceId === "boss:x").map((e) => (e.type === "damage_dealt" ? e.targetId : ""));
    expect(hit.sort()).toEqual(["a", "b", "c"]);
  });

  it("herói caído sai do combate: o chefe nunca mais o escolhe como alvo", () => {
    const b = createBattle(setup([hero("a", 1), hero("b", 100_000)], boss(1e9, 50)));
    const events = step(b, 8_000, config.combat);
    const fallAt = events.findIndex((e) => e.type === "character_defeated" && e.targetId === "a");
    expect(fallAt).toBeGreaterThanOrEqual(0);
    const after = events.slice(fallAt + 1).filter((e) => e.type === "damage_dealt" && e.sourceId === "boss:x");
    expect(after.length).toBeGreaterThan(0);
    expect(after.every((e) => e.type === "damage_dealt" && e.targetId === "b")).toBe(true);
    expect(b.status).toBe("active"); // um aliado vivo mantém a luta
  });
});

describe("BossBattle — imunidade e resistência (dado, não exceção codificada)", () => {
  const stunner = (): CombatantSeed => hero("a", 1e9, 5, { effects: [{ kind: "stun", chance: 1, durationMs: 1_000 }] });

  it("imune (1) a atordoamento: nunca é atordoado e a UI recebe o rótulo \"Imune\"", () => {
    const b = createBattle(setup([stunner()], boss(1e9, 1, { statusResist: { stun: 1 } })));
    const events = step(b, 6_000, config.combat);
    expect(events.some((e) => e.type === "status_applied" && e.statusId === "stun")).toBe(false);
    expect(events.some((e) => e.type === "effect_triggered" && e.effectId === "immune" && e.label === "Imune")).toBe(true);
  });

  it("sem resistência o mesmo herói atordoa o chefe", () => {
    const b = createBattle(setup([stunner()], boss(1e9, 1)));
    const events = step(b, 6_000, config.combat);
    expect(events.some((e) => e.type === "status_applied" && e.statusId === "stun")).toBe(true);
  });

  it("resistência parcial (0,5) bloqueia parte dos efeitos", () => {
    let applied = 0;
    let resisted = 0;
    for (let seed = 1; seed <= 20; seed += 1) {
      const b = createBattle(setup([stunner()], boss(1e9, 1, { statusResist: { stun: 0.5 } }), { seed: Math.imul(seed, 2654435761) >>> 0 }));
      const events = step(b, 6_000, config.combat);
      applied += events.filter((e) => e.type === "status_applied" && e.statusId === "stun").length;
      resisted += events.filter((e) => e.type === "effect_triggered" && e.effectId === "resisted").length;
    }
    expect(applied).toBeGreaterThan(0);
    expect(resisted).toBeGreaterThan(0);
  });

  it("imune a veneno: o DoT nunca é aplicado", () => {
    const poisoner = hero("a", 1e9, 5, { effects: [{ kind: "dot", chance: 1, coefficient: 1, pulses: 3, intervalMs: 1_000 }] });
    const b = createBattle(setup([poisoner], boss(1e9, 1, { statusResist: { poison: 1 } })));
    const events = step(b, 6_000, config.combat);
    expect(events.some((e) => e.type === "status_applied" && e.statusId === "poison")).toBe(false);
  });
});

describe("BossBattle — fases", () => {
  it("fase por HP dispara UMA vez, muda os stats, soma IAS e anuncia (phase_changed)", () => {
    const phase = { id: "furia", label: "Fúria", trigger: { hpBelowFraction: 0.5 }, statMultipliers: { attack: 2 }, attackSpeedBonus: 0.2 };
    const b = createBattle(setup([hero("a", 1e9, 400)], boss(1_000, 10, { phases: [phase] })));
    const before = b.enemies[0]!.stats.attack;
    const events = step(b, 10_000, config.combat);
    const changes = events.filter((e) => e.type === "phase_changed");
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ phaseId: "furia", label: "Fúria", targetId: "boss:x" });
    expect(b.enemies[0]!.stats.attack).toBe(before * 2);
    expect(b.enemies[0]!.phaseLabel).toBe("Fúria");
  });

  it("fase por TEMPO (enrage) dispara mesmo sem dano ao chefe", () => {
    const phase = { id: "enrage", label: "Enrage", trigger: { afterMs: 3_000 }, statMultipliers: { attack: 3 } };
    const b = createBattle(setup([hero("a", 1e9, 0)], boss(1e9, 10, { phases: [phase] })));
    step(b, 2_900, config.combat);
    expect(b.enemies[0]!.phaseLabel).toBeUndefined();
    step(b, 3_200, config.combat);
    expect(b.enemies[0]!.phaseLabel).toBe("Enrage");
  });

  it("a fase pode curar o chefe (uma vez) e dar skills novas", () => {
    const phase = { id: "p", label: "Renovo", trigger: { hpBelowFraction: 0.9 }, healFraction: 0.3, skills: [skill("nova", "all_enemies", 1)] };
    const b = createBattle(setup([hero("a", 1e9, 1_500), hero("b", 1e9, 0)], boss(10_000, 5, { phases: [phase] })));
    const events = step(b, 6_000, config.combat);
    expect(events.some((e) => e.type === "heal_dealt" && e.sourceId === "boss:x")).toBe(true);
    expect(events.some((e) => e.type === "skill_used" && e.skillId === "nova")).toBe(true);
  });
});

describe("BossBattle — limite de tempo", () => {
  it("estourar o tempo é DERROTA com motivo \"timeout\" (todos vivos)", () => {
    const b = createBattle(setup([hero("a", 1e9, 1)], boss(1e12, 1), { timeLimitMs: 5_000 }));
    const events = step(b, 20_000, config.combat);
    expect(b.status).toBe("finished");
    expect(b.endReason).toBe("timeout");
    expect(events.some((e) => e.type === "battle_lost" && e.reason === "timeout")).toBe(true);
    expect(b.allies[0]!.isDefeated).toBe(false);
  });

  it("vencer antes do limite é vitória", () => {
    const b = createBattle(setup([hero("a", 1e9, 5_000)], boss(100, 1), { timeLimitMs: 60_000 }));
    step(b, 20_000, config.combat);
    expect(b.endReason).toBe("victory");
  });

  it("a derrota por queda da equipe tem motivo \"defeat\"", () => {
    const b = createBattle(setup([hero("a", 1, 1)], boss(1e12, 5_000), { timeLimitMs: 60_000 }));
    step(b, 20_000, config.combat);
    expect(b.endReason).toBe("defeat");
  });
});
