/**
 * Balanceamento da Torre (ADR-021) — propriedades MEDIDAS pelo engine real.
 *
 * Estes testes não conferem números mágicos: conferem as promessas de design
 * (herói on-curve vence e aguenta idle; herói fraco não; o ritmo de XP cabe
 * na meta). Se alguém editar atributos/curvas (ou o painel adm no futuro) e
 * quebrar uma promessa, é aqui que aparece.
 */
import { describe, expect, it } from "vitest";
import { classes, config, enemies } from "@tia/config";
import { averageDuel, rollGearSet, simulateDuel, simulateHunt, towerPacing } from "../balance.js";
import { floorPoolOdds, pickEnemyForFloor } from "../tower.js";

const FLOORS_SAMPLE = [1, 4, 8, 10, 11, 25, 40];

describe("duelo on-curve (herói no nível do inimigo do andar)", () => {
  for (const floor of FLOORS_SAMPLE) {
    it(`andar ${floor}: toda classe vence todo inimigo do pool, em tempo e custo de vida razoáveis`, () => {
      const level = config.tower.floors[floor - 1]!.enemyLevel;
      for (const { enemy } of floorPoolOdds(floor)) {
        for (const cls of classes) {
          const a = averageDuel({ classId: cls.id, heroLevel: level, enemyId: enemy.id, enemyLevel: level }, 4);
          const tag = `${cls.id} × ${enemy.id} (andar ${floor})`;
          expect(a.winRate, tag).toBe(1);
          // ADR-030 — luta lenta (ataque base de 2 s) mas não eterna, e que sempre custa vida
          expect(a.avgDurationSec, tag).toBeGreaterThan(6);
          expect(a.avgDurationSec, tag).toBeLessThan(45);
          expect(a.avgHpLostFraction, tag).toBeGreaterThan(0.08);
          // elite pode doer mais; o resto custa no máximo ~metade da vida
          expect(a.avgHpLostFraction, tag).toBeLessThan(enemy.role === "elite" ? 0.75 : 0.55);
        }
      }
    });
  }

  it("o custo por papel segue a intenção: veloz < tanque < dano < elite", () => {
    const level = 500;
    const mean = (role: string) => {
      const list = enemies.filter((e) => e.role === role);
      let t = 0;
      let n = 0;
      for (const e of list) {
        for (const c of classes) {
          t += averageDuel({ classId: c.id, heroLevel: level, enemyId: e.id, enemyLevel: level }, 3).avgHpLostFraction;
          n += 1;
        }
      }
      return t / n;
    };
    expect(mean("swift")).toBeLessThan(mean("tank"));
    expect(mean("tank")).toBeLessThan(mean("dps"));
    expect(mean("dps")).toBeLessThan(mean("elite"));
  });

  it("as 4 classes ficam equilibradas entre si (pior média ≤ 1,4× a melhor)", () => {
    const level = 500;
    const means = classes.map((c) => {
      let t = 0;
      for (const e of enemies) t += averageDuel({ classId: c.id, heroLevel: level, enemyId: e.id, enemyLevel: level }, 3).avgHpLostFraction;
      return t / enemies.length;
    });
    expect(Math.max(...means) / Math.min(...means)).toBeLessThan(1.4);
  });

  it("a dificuldade é estável do Nv 30 ao 20.000 (herói e inimigo escalam pela mesma estrutura)", () => {
    for (const cls of classes) {
      const at = (lv: number) => averageDuel({ classId: cls.id, heroLevel: lv, enemyId: "orc", enemyLevel: lv }, 3);
      const base = at(100);
      for (const lv of [1000, 5000, 20_000]) {
        const a = at(lv);
        expect(a.avgHpLostFraction / base.avgHpLostFraction, `${cls.id} ${lv}`).toBeGreaterThan(0.75);
        expect(a.avgHpLostFraction / base.avgHpLostFraction, `${cls.id} ${lv}`).toBeLessThan(1.25);
        expect(a.avgDurationSec / base.avgDurationSec, `${cls.id} ${lv}`).toBeGreaterThan(0.75);
        expect(a.avgDurationSec / base.avgDurationSec, `${cls.id} ${lv}`).toBeLessThan(1.25);
      }
    }
  });
});

describe("ser mais forte importa (o andar segura o jogador)", () => {
  it("herói com metade do nível do inimigo sai muito ferido; com o dobro, passeia", () => {
    for (const cls of classes) {
      const enemyLevel = 2500; // andar 10
      const weak = averageDuel({ classId: cls.id, heroLevel: 1250, enemyId: "skeleton", enemyLevel }, 3);
      const strong = averageDuel({ classId: cls.id, heroLevel: 5000, enemyId: "skeleton", enemyLevel }, 3);
      const onCurve = averageDuel({ classId: cls.id, heroLevel: enemyLevel, enemyId: "skeleton", enemyLevel }, 3);
      // metade do nível custa ≥ 3× mais vida que estar on-curve (e passa de 25%)
      expect(weak.avgHpLostFraction, cls.id).toBeGreaterThan(3 * onCurve.avgHpLostFraction);
      expect(weak.avgHpLostFraction, cls.id).toBeGreaterThan(0.25);
      expect(strong.winRate, cls.id).toBe(1);
      expect(strong.avgHpLostFraction, cls.id).toBeLessThan(0.1);
    }
  });

  it("subir o nível reduz o custo da mesma luta", () => {
    const at = (lv: number) => simulateDuel({ classId: "guardian", heroLevel: lv, enemyId: "orc", enemyLevel: 1000, seed: 3 }).hpLostFraction;
    expect(at(1000)).toBeGreaterThan(at(1500));
    expect(at(1500)).toBeGreaterThan(at(2200));
  });

  it("tipo de dano importa: Gosma Gélida (Def. Esp. alta) segura mais o mago que o guerreiro físico", () => {
    // mesma luta, nível alto: o arcanista (magia) demora mais contra a Gélida do que contra a Gosma comum
    const lv = 500;
    const vsFrost = averageDuel({ classId: "arcanist", heroLevel: lv, enemyId: "frostslime", enemyLevel: lv }, 3);
    const vsSlime = averageDuel({ classId: "arcanist", heroLevel: lv, enemyId: "slime", enemyLevel: lv }, 3);
    const ratioMage = vsFrost.avgDurationSec / vsSlime.avgDurationSec;
    const gFrost = averageDuel({ classId: "guardian", heroLevel: lv, enemyId: "frostslime", enemyLevel: lv }, 3);
    const gSlime = averageDuel({ classId: "guardian", heroLevel: lv, enemyId: "slime", enemyLevel: lv }, 3);
    const ratioPhys = gFrost.avgDurationSec / gSlime.avgDurationSec;
    expect(ratioMage).toBeGreaterThan(ratioPhys);
  });
});

describe("desgaste e sustentabilidade da caçada idle (ADR-021, reescrito no ADR-030)", () => {
  const cases: Array<[number, number]> = [
    [1, 1],
    [5, 100],
    [10, 2500],
    [11, 5000],
    [40, 19_500],
  ];
  it.each(cases)("andar %i: sem poção nem equipamento, o herói on-curve NÃO aguenta idle (cai em < 30 lutas)", (floor, minLevel) => {
    for (const cls of classes) {
      const r = simulateHunt({ classId: cls.id, heroLevel: minLevel, floor, fights: 150, seed: 2 });
      expect(r.defeated, cls.id).toBe(true);
      expect(r.fights, cls.id).toBeLessThan(30);
      expect(r.fights, cls.id).toBeGreaterThan(1);
    }
  });

  it("com equipamento celestial o herói on-curve aguenta 150 lutas (equipamento é o remédio)", () => {
    for (const cls of classes) {
      const gear = rollGearSet(cls.id, 500, 3, { rarity: "celestial", x: 2.5 });
      const lost = averageDuel({ classId: cls.id, heroLevel: 500, enemyId: "orc", enemyLevel: 500, gear }, 3).avgHpLostFraction;
      expect(lost, cls.id).toBeLessThan(0.03);
    }
  });

  it("herói com 60% do nível cai rápido (o andar é um limite real)", () => {
    for (const cls of classes) {
      const r = simulateHunt({ classId: cls.id, heroLevel: 3000, floor: 11, fights: 150, seed: 2 });
      expect(r.defeated, cls.id).toBe(true);
      expect(r.fights, cls.id).toBeLessThan(10);
    }
  });

  it("a regen de PROCURANDO existe mas é pequena (≤ 2%/s): não apaga o desgaste", () => {
    expect(config.combat.regenOnSearchingPctPerSec).toBeGreaterThan(0);
    expect(config.combat.regenOnSearchingPctPerSec).toBeLessThanOrEqual(0.02);
  });
});

describe("pacing do Rei (P-009 — XP moderado e desacelerando)", () => {
  const pacing = towerPacing(25); // ciclo médio luta+procura+premiação (ADR-030): ≈25 s
  const total = pacing.at(-1)!.cumulativeHours;

  it("andar 1 é rápido (≤ 1 h) e o jogo inteiro é demorado, mas finito (1.000–2.000 h)", () => {
    expect(pacing[0]!.hours).toBeLessThanOrEqual(1);
    expect(total).toBeGreaterThan(1000);
    expect(total).toBeLessThan(2000);
  });

  it("do andar 4 ao 9 cada andar demora mais que o anterior (curva desacelera)", () => {
    for (let f = 4; f <= 9; f += 1) {
      expect(pacing[f]!.hours, `andar ${f + 1}`).toBeGreaterThan(pacing[f - 1]!.hours);
    }
  });

  it("do andar 11 ao 40 cada andar custa entre 15 e 60 h e cresce devagar", () => {
    for (let f = 10; f < 40; f += 1) {
      expect(pacing[f]!.hours, `andar ${f + 1}`).toBeGreaterThan(15);
      expect(pacing[f]!.hours, `andar ${f + 1}`).toBeLessThan(60);
      if (f > 10) expect(pacing[f]!.hours).toBeGreaterThanOrEqual(pacing[f - 1]!.hours);
    }
  });

  it("o andar 10 (2.500→5.000 só com inimigos nv 2.500) é o gargalo declarado", () => {
    const max = Math.max(...pacing.map((p) => p.hours));
    expect(pacing[9]!.hours).toBe(max);
    expect(pacing[9]!.hours).toBeGreaterThan(100);
  });
});

describe("sorteio de inimigo do andar", () => {
  it("é determinístico para a mesma semente", () => {
    for (let s = 1; s <= 20; s += 1) {
      expect(pickEnemyForFloor(12, s).id).toBe(pickEnemyForFloor(12, s).id);
    }
  });

  it("segue os pesos do pool (±3 pontos em 20.000 sorteios)", () => {
    const counts = new Map<string, number>();
    const N = 20_000;
    for (let s = 0; s < N; s += 1) {
      const id = pickEnemyForFloor(12, s * 2654435761).id;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    for (const o of floorPoolOdds(12)) {
      expect(Math.abs((counts.get(o.enemy.id) ?? 0) / N - o.chance), o.enemy.id).toBeLessThan(0.03);
    }
  });

  it("nunca sorteia inimigo fora do pool do andar", () => {
    const ids = new Set(config.tower.floors[0]!.pool.map((p) => p.enemyId));
    for (let s = 0; s < 500; s += 1) expect(ids.has(pickEnemyForFloor(1, s * 40503).id)).toBe(true);
  });
});

describe("equipamento (ADR-023) — calibração medida", () => {
  const level = 500;
  const mean = (opts?: Parameters<typeof rollGearSet>[3]) => {
    let lost = 0;
    let dur = 0;
    let n = 0;
    for (const cls of classes) {
      for (let i = 1; i <= 4; i += 1) {
        const gear = opts === undefined ? undefined : rollGearSet(cls.id, level, i, opts);
        for (const e of enemies.slice(0, 4)) {
          const r = averageDuel({ classId: cls.id, heroLevel: level, enemyId: e.id, enemyLevel: level, gear }, 2);
          lost += r.avgHpLostFraction;
          dur += r.avgDurationSec;
          n += 1;
        }
        if (opts === undefined) break;
      }
    }
    return { lost: lost / n, dur: dur / n };
  };

  it("um conjunto médio de drops AJUDA de forma clara (menos vida perdida, luta mais curta)", () => {
    const bare = mean();
    const geared = mean({});
    expect(geared.lost).toBeLessThan(bare.lost * 0.8);
    expect(geared.dur).toBeLessThan(bare.dur * 0.95);
  });

  it("mas não torna o herói invencível: o custo médio continua > 0", () => {
    expect(mean({}).lost).toBeGreaterThan(0.005);
  });

  it("o equipamento melhora com a raridade e com o X (conjunto Celestial/X 2,5 ≥ médio ≥ nada)", () => {
    const bare = mean();
    const avg = mean({});
    const god = mean({ rarity: "celestial", x: 2.5 });
    expect(god.lost).toBeLessThanOrEqual(avg.lost);
    expect(avg.lost).toBeLessThan(bare.lost);
    expect(god.dur).toBeLessThan(avg.dur);
  });

  it("o conjunto é determinístico por seed", () => {
    expect(rollGearSet("ranger", level, 5).stats).toEqual(rollGearSet("ranger", level, 5).stats);
  });
});
