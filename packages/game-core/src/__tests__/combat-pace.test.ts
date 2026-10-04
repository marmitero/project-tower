/**
 * Ritmo e desafio do combate (ADR-030): ataque base ≈ 2 s, só equipamento de nível alto acelera,
 * o desgaste sem equipamento pede poção e os chefes NÃO herdam a dificuldade da Torre.
 */
import { afterEach, describe, expect, it } from "vitest";
import { classes, config, resetContentToDefaults, HEROES } from "@tia/config";
import { asAccountId } from "@tia/contracts";
import { actionIntervalMs } from "@tia/engine";
import { GameState } from "../state.js";
import { attackSpeedLevelFactor } from "../gear.js";
import { rollGearSet } from "../balance.js";
import { bossById, bossStats } from "../boss.js";
import { heroStatsAtLevel } from "../creation.js";

afterEach(() => resetContentToDefaults());

/** IAS total que o engine usa: base da classe + soma do equipamento (limitado pelos caps). */
function totalIas(classId: string, level: number, gear?: ReturnType<typeof rollGearSet>): number {
  const cls = classes.find((c) => c.id === classId)!;
  return gear ? gear.stats.attackSpeed : heroStatsAtLevel(cls.growth, level).attackSpeed;
}

describe("velocidade de ataque (ADR-030)", () => {
  it("sem equipamento, toda classe ataca a cada 1,5–2 s em qualquer nível", () => {
    for (const cls of classes) {
      for (const level of [1, 100, 5000, 20_000]) {
        const ms = actionIntervalMs(totalIas(cls.id, level), config.combat);
        expect(ms, `${cls.id} nv ${level}`).toBeGreaterThanOrEqual(1500);
        expect(ms, `${cls.id} nv ${level}`).toBeLessThanOrEqual(2000);
      }
    }
  });

  it("o fator de IAS do item cresce com o nível do item e fecha em 1 no nível de referência", () => {
    const f = [1, 10, 100, 1000, 5000, 10_000, 20_000].map((l) => attackSpeedLevelFactor(l));
    for (let i = 1; i < f.length; i += 1) expect(f[i]!).toBeGreaterThanOrEqual(f[i - 1]!);
    expect(f[0]!).toBeLessThan(0.15);
    expect(f[5]!).toBeCloseTo(1, 5);
    expect(f[6]!).toBeCloseTo(1, 5);
  });

  it("equipamento Celestial 2,5× de nível baixo/médio continua perto de 2 s; de nível alto chega perto de 1 s", () => {
    for (const cls of classes) {
      const at = (level: number) => actionIntervalMs(totalIas(cls.id, level, rollGearSet(cls.id, level, 3, { rarity: "celestial", x: 2.5 })), config.combat);
      expect(at(50), `${cls.id} nv 50`).toBeGreaterThan(1500);
      expect(at(500), `${cls.id} nv 500`).toBeGreaterThan(1350);
      expect(at(10_000), `${cls.id} nv 10000`).toBeLessThan(1250);
      expect(at(20_000), `${cls.id} nv 20000`).toBeLessThanOrEqual(1100);
    }
  });

  it("o intervalo nunca passa do piso de 1 s (teto de IAS) nem de 4 s", () => {
    expect(actionIntervalMs(99, config.combat)).toBe(1000);
    expect(actionIntervalMs(-99, config.combat)).toBe(4000);
  });
});

describe("chefes não herdam a dificuldade da Torre (ADR-030)", () => {
  it("mudar enemyHpMultiplier/enemyAttackMultiplier da Torre não altera os stats do chefe", () => {
    const def = bossById("boss_sentinela")!;
    const before = bossStats(def);
    config.tower.enemyHpMultiplier *= 3;
    config.tower.enemyAttackMultiplier *= 3;
    const after = bossStats(def);
    expect(after.hp).toBe(before.hp);
    expect(after.attack).toBe(before.attack);
    expect(after.specialAttack).toBe(before.specialAttack);
  });

  it("a referência do chefe é editável: dobrar towerReference.hpMultiplier dobra a vida", () => {
    const def = bossById("boss_sentinela")!;
    const before = bossStats(def).hp;
    config.boss.towerReference.hpMultiplier *= 2;
    expect(bossStats(def).hp).toBeGreaterThan(before * 1.95);
  });
});

describe("desgaste real sem equipamento (jogo completo, 20 min no andar 1)", () => {
  const MIN20 = 20 * 60_000;
  function run(buyPotions: boolean) {
    const identity = HEROES[0]!;
    let now = 1_700_000_000_000;
    const st = GameState.createNew(
      { accountId: asAccountId("pace"), nickname: "Ritmo", skinId: "royal", starterIdentityId: identity.id, now, masterSeed: 5 },
      { now: () => now },
    );
    const hero = st.data.heroes[0]!;
    st.assignHeroToSlot(hero.id, 0);
    st.selectActiveHero(hero.id);
    st.startTower();
    let bought = 0;
    let defeats = 0;
    let wasDefeated = false;
    let lowest = 1;
    for (let t = 0; t < MIN20; t += 250) {
      now += 250;
      st.advanceIdle(250);
      if (buyPotions && t % 10_000 === 0) {
        for (let i = 0; i < 4; i += 1) {
          try { st.buyItem("potion_basic", 1); bought += 1; } catch { break; }
        }
      }
      const kind = st.data.hunt?.kind;
      if (kind === "defeated" && !wasDefeated) defeats += 1;
      wasDefeated = kind === "defeated";
      const b = (st as unknown as { battle: { allies: Array<{ hp: number; maxHp: number }> } | null }).battle;
      if (b) lowest = Math.min(lowest, b.allies[0]!.hp / b.allies[0]!.maxHp);
    }
    const stock = st.data.inventory.items.reduce((a, i) => a + i.quantity, 0);
    return { defeats, lowest, used: bought - stock };
  }

  it("sem poções o herói cai várias vezes (vai ao Hub)", () => {
    const r = run(false);
    expect(r.defeats).toBeGreaterThanOrEqual(3);
    expect(r.lowest).toBeLessThan(0.1);
  });

  it("comprando poções com o Coin o herói não cai e usa poções ao longo da caçada", () => {
    const r = run(true);
    expect(r.defeats).toBe(0);
    expect(r.used).toBeGreaterThanOrEqual(8);
    expect(r.lowest).toBeGreaterThan(0.2);
  });
});
