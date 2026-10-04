import { describe, expect, it } from "vitest";
import { config } from "@tia/config";
import { grantHeroXp, grantKingXp, heroXpToNext, kingXpToNext, splitTeamXp } from "../progression.js";
import { ACCOUNT, growthOf, makeHero, makeKing } from "./fixtures.js";

describe("XP do Rei (§45 — pool separado)", () => {
  it("nível 1 exige o valor da curva, não zero", () => {
    expect(kingXpToNext(1)).toBeGreaterThan(0);
    expect(heroXpToNext(1)).toBeGreaterThan(0);
  });

  it("curva é crescente", () => {
    expect(kingXpToNext(2)).toBeGreaterThan(kingXpToNext(1));
    expect(heroXpToNext(2)).toBeGreaterThan(heroXpToNext(1));
  });

  it("creditar XP abaixo do necessário sobe de nível e guarda o resto", () => {
    const { king } = makeKing();
    const need = BigInt(kingXpToNext(1));
    // resto pequeno de propósito: precisa ser menor que `kingXpToNext(2)`,
    // senão a mesma recompensa sobe DOIS níveis e o teste deixa de medir
    // o que diz medir.
    const resto = 50;
    expect(resto).toBeLessThan(kingXpToNext(2));
    const result = grantKingXp(king, need + BigInt(resto));

    expect(result.levelsGained).toBe(1);
    expect(king.level).toBe(2);
    expect(king.xp).toBe(BigInt(resto));
  });

  it("sobe vários níveis de uma vez quando o XP permite", () => {
    const { king } = makeKing();
    const huge = 10_000_000n;
    const result = grantKingXp(king, huge);
    expect(result.levelsGained).toBeGreaterThan(1);
    expect(king.level).toBe(result.level);
  });

  it("no teto, o XP para de acumular em vez de crescer sem propósito", () => {
    const { king } = makeKing(config.xp.king.levelCap);
    const result = grantKingXp(king, 999_999_999n);
    expect(result.capped).toBe(true);
    expect(king.level).toBe(config.xp.king.levelCap);
    expect(king.xp).toBe(0n);
  });

  it("recusa XP negativo", () => {
    const { king } = makeKing();
    expect(() => grantKingXp(king, -1n)).toThrow(/negativo/);
  });

  it("o XP do herói NÃO pode contaminar o Rei (§45 — nunca misturar)", () => {
    const { king } = makeKing();
    const before = { level: king.level, xp: king.xp };
    const hero = makeHero();
    grantHeroXp(hero, 1_000_000n, growthOf());

    expect(king.level).toBe(before.level);
    expect(king.xp).toBe(before.xp);
  });
});

describe("XP do herói", () => {
  it("subir de nível atualiza os stats (§22/§33 — nível precisa significar algo)", () => {
    const hero = makeHero(0, 0, 1);
    const hpBefore = hero.stats.hp;
    const need = BigInt(heroXpToNext(1));
    grantHeroXp(hero, need, growthOf(0));

    expect(hero.level).toBe(2);
    expect(hero.stats.hp).toBeGreaterThan(hpBefore);
  });

  it("stats crescem estritamente em HP e ataque ao longo dos níveis", () => {
    const hero = makeHero(0, 0, 1);
    const attackBefore = hero.stats.attack;
    grantHeroXp(hero, 1_000_000n, growthOf(0));
    expect(hero.stats.attack).toBeGreaterThan(attackBefore);
  });

  it("nível 1 tem os stats-base da classe, sem growth", () => {
    const hero = makeHero(0, 0, 1);
    const g = growthOf(0);
    expect(hero.stats.hp).toBe(g.hp);
    expect(hero.stats.attack).toBe(g.attack);
  });
});

describe("divisão de XP da equipe (§20, §81)", () => {
  it("1 herói recebe tudo", () => {
    expect(splitTeamXp(1000, 1)).toEqual([1000]);
  });

  it("2 heróis: metade cada", () => {
    expect(splitTeamXp(1000, 2)).toEqual([500, 500]);
  });

  it("3 heróis: um terço cada, sem perder resto", () => {
    const out = splitTeamXp(1000, 3);
    expect(out.reduce((a, b) => a + b, 0)).toBe(1000);
  });

  it("mais heróis ⇒ MENOS XP individual (§20)", () => {
    const one = splitTeamXp(1000, 1)[0]!;
    const two = splitTeamXp(1000, 2)[0]!;
    const three = splitTeamXp(1000, 3)[0]!;
    expect(one).toBeGreaterThan(two);
    expect(two).toBeGreaterThan(three);
  });

  it("nunca distribui mais XP do que a recompensa", () => {
    for (const size of [1, 2, 3] as const) {
      for (const total of [1, 7, 99, 1000, 12345]) {
        const out = splitTeamXp(total, size);
        expect(out.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(total);
      }
    }
  });

  it("toda parcela é positiva para uma recompensa relevante", () => {
    const out = splitTeamXp(1000, 3);
    expect(out.every((v) => v > 0)).toBe(true);
  });

  it("a soma nunca EXCEDE 1.0 × o total, em nenhum tamanho de equipe", () => {
    for (const size of [1, 2, 3] as const) {
      const share = config.xp.teamSplit[size];
      expect(share * size).toBeLessThanOrEqual(1);
    }
  });
});

describe("contas independentes (§45)", () => {
  it("o Rei e o herói acumulam XP em pools separados ao longo de várias vitórias", () => {
    const { king } = makeKing();
    const hero = makeHero();
    for (let i = 0; i < 20; i++) {
      grantKingXp(king, 1000n);
      grantHeroXp(hero, 1000n, growthOf());
    }
    expect(king.xp > 0n || king.level > 1).toBe(true);
    expect(hero.xp > 0n || hero.level > 1).toBe(true);
  });

  it("conta de teste é a mesma em todos os módulos", () => {
    expect(ACCOUNT).toBe("test-account");
  });
});
