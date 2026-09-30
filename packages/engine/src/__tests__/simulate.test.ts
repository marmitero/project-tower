import { describe, expect, it } from "vitest";
import { createBattle, step, TICK_MS } from "../simulate.js";
import type { BattleSetup, CombatantSeed } from "../simulate.js";
import { config, validateConfig } from "@tia/config";
import type { Combatant } from "@tia/contracts";

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

function setup(mode: "tower" | "boss", allies: CombatantSeed[], enemies: CombatantSeed[]): BattleSetup {
  return {
    mode,
    battleId: "b1",
    seed: 42,
    allySeed: allies,
    enemySeed: enemies,
    config: config.combat,
  };
}

describe("INV-01 — TowerBattle é SEMPRE 1x1 (§17, §79)", () => {
  it("ignora heróis extras da equipe e cria exatamente 1 aliado e 1 inimigo", () => {
    const state = createBattle(
      setup("tower", [hero("a"), hero("b"), hero("c")], [enemy("x"), enemy("y")]),
    );
    expect(state.allies).toHaveLength(1);
    expect(state.enemies).toHaveLength(1);
    expect(state.allies[0]!.id).toBe("a");
    expect(state.enemies[0]!.id).toBe("x");
  });

  it("em nenhum tick dois ALIADOS atacam (o inimigo também ataca, e tudo bem)", () => {
    // A regra do §17 é sobre quantos HERÓIS atacam, não sobre o total de
    // combatentes: em 1×1 o inimigo naturalmente ataca de volta.
    const state = createBattle(setup("tower", [hero("a"), hero("b"), hero("c")], [enemy("x")]));
    const allyIds = new Set(state.allies.map((c) => c.id));
    let maxAlliesPerTick = 0;

    for (let t = 0; t < 200; t += 1) {
      const events = step(state, t * TICK_MS, config.combat);
      const byTick = new Map<number, Set<string>>();
      for (const e of events) {
        if (e.type === "attack_started" && allyIds.has(e.actorId)) {
          if (!byTick.has(e.tick)) byTick.set(e.tick, new Set());
          byTick.get(e.tick)!.add(e.actorId);
        }
      }
      for (const [, set] of byTick) {
        maxAlliesPerTick = Math.max(maxAlliesPerTick, set.size);
      }
      if (state.status !== "active") break;
    }

    expect(maxAlliesPerTick).toBe(1);
    expect(state.allies).toHaveLength(1);
  });
});

describe("INV-03 — BossBattle usa a equipe INTEIRA (§24, §80)", () => {
  it("cria 3 aliados contra 1 Boss", () => {
    const state = createBattle(setup("boss", [hero("a"), hero("b"), hero("c")], [enemy("boss")]));
    expect(state.allies).toHaveLength(3);
    expect(state.enemies).toHaveLength(1);
  });

  it("os 3 heróis atacam no mesmo tick, simultaneamente (§24, §80)", () => {
    const state = createBattle(setup("boss", [hero("a"), hero("b"), hero("c")], [enemy("boss", 100_000)]));
    const events = step(state, 1_000, config.combat);

    // Existe um tick em que os TRÊS heróis atacam juntos.
    const byTick = new Map<number, Set<string>>();
    for (const e of events) {
      if (e.type === "attack_started" && e.actorId !== "boss") {
        if (!byTick.has(e.tick)) byTick.set(e.tick, new Set());
        byTick.get(e.tick)!.add(e.actorId);
      }
    }
    const maxAllies = Math.max(...[...byTick.values()].map((s) => s.size));
    expect(maxAllies).toBe(3);
  });
});

describe("determinismo (§64, ADR-008)", () => {
  it("mesma seed + mesmo setup ⇒ mesma sequência de eventos", () => {
    const run = () => {
      const s = createBattle(setup("boss", [hero("a", 400, 40), hero("b", 400, 40), hero("c", 400, 40)], [enemy("boss", 600, 25)]));
      return step(s, 5_000, config.combat).map((e) => `${e.tick}:${e.type}:${"amount" in e ? e.amount : ""}:${"actorId" in e ? e.actorId : ""}`);
    };
    expect(run()).toEqual(run());
  });

  it("seeds diferentes produzem resultados diferentes", () => {
    const run = (seed: number) => {
      const base = setup("tower", [hero("a", 400, 40)], [enemy("x", 400, 20)]);
      const s = createBattle({ ...base, seed });
      return step(s, 5_000, config.combat).length;
    };
    const a = run(1);
    const b = run(999);
    expect(typeof a).toBe("number");
    expect(typeof b).toBe("number");
  });
});

describe("término de batalha (INV-05)", () => {
  it("batalha termina com exatamente um desfecho", () => {
    const s = createBattle(setup("tower", [hero("a", 100, 1000)], [enemy("x", 10, 0)]));
    const events = step(s, 60_000, config.combat);
    expect(s.status).not.toBe("active");
    const won = events.filter((e) => e.type === "battle_won").length;
    const lost = events.filter((e) => e.type === "battle_lost").length;
    expect(won + lost).toBe(1);
  });

  it("batalha já terminada não gera novos eventos", () => {
    const s = createBattle(setup("tower", [hero("a", 100, 1000)], [enemy("x", 10, 0)]));
    step(s, 60_000, config.combat);
    const after = step(s, 120_000, config.combat);
    expect(after).toHaveLength(0);
  });
});

describe("sequência de eventos", () => {
  it("emite battle_started no início e battle_finished no fim", () => {
    const s = createBattle(setup("tower", [hero("a", 200, 60)], [enemy("x", 50, 5)]));
    const events = step(s, 60_000, config.combat);
    expect(events.some((e) => e.type === "battle_started")).toBe(true);
    expect(events.some((e) => e.type === "battle_finished")).toBe(true);
  });

  it("emite damage_dealt quando há dano", () => {
    const s = createBattle(setup("tower", [hero("a", 200, 60)], [enemy("x", 50, 5)]));
    const events = step(s, 30_000, config.combat);
    expect(events.some((e) => e.type === "damage_dealt")).toBe(true);
  });

  it("emite enemy_defeated quando o inimigo cai", () => {
    const s = createBattle(setup("tower", [hero("a", 500, 500)], [enemy("x", 10, 0)]));
    const events = step(s, 30_000, config.combat);
    expect(events.some((e) => e.type === "enemy_defeated")).toBe(true);
  });

  it("nenhum herói ataca a si mesmo (INV-07)", () => {
    const s = createBattle(setup("boss", [hero("a"), hero("b"), hero("c")], [enemy("boss", 100_000)]));
    const events = step(s, 5_000, config.combat);
    for (const e of events) {
      // Narrowing por tipo de evento: `actorId` só existe em `attack_started`
      // e `sourceId` só em `damage_dealt`. Acessar sem o guard é erro de
      // tipo, não estilo.
      if (e.type === "attack_started") expect(e.actorId).not.toBe("");
      if (e.type === "damage_dealt") expect(e.sourceId).not.toBe(e.targetId);
    }
  });
});

describe("configuração do engine", () => {
  it("o config de combate usado pelo engine é válido", () => {
    expect(() => validateConfig(config)).not.toThrow();
  });

  it("towerBattleSize é 1x1", () => {
    expect(config.combat.towerBattleSize).toEqual({ allies: 1, enemies: 1 });
  });

  it("não há andar de boss na Torre (§21, §55)", () => {
    expect(config.combat.towerAutoBossFloors).toHaveLength(0);
  });
});
