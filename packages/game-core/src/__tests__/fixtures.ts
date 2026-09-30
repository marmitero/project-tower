/**
 * Fixtures de teste.
 *
 * Nada aqui usa `Date.now()`, `Math.random()` ou relógio real. Um teste que
 * depende de wall clock falha 1 vez em N e faz a suíte parecer instável —
 * e "instável" é a palavra que faz as pessoas ignorarem o sinal vermelho
 * quando ele for real.
 */

import type { CombatStats, Hero, King, Team, Wallet } from "@tia/contracts";
import type { AccountId, HeroId } from "@tia/contracts";
import { asAccountId, asHeroId } from "@tia/contracts";
import { classes, type ClassGrowth } from "@tia/config";
import { createHero, createKing, createTeam, createWallet } from "../creation.js";
import { createInventory } from "../inventory.js";

export const ACCOUNT: AccountId = asAccountId("test-account");

/** Relógio manual. `advance(ms)` move o tempo. */
export class FakeClock {
  constructor(private t: number) {}
  now = (): number => this.t;
  advance(ms: number): number {
    this.t += ms;
    return this.t;
  }
  set(ms: number): number {
    this.t = ms;
    return this.t;
  }
}

export function makeKing(level = 1, coins = 0n): { king: King; wallet: Wallet } {
  const king = createKing({ accountId: ACCOUNT, nickname: "Testador", skinId: "royal", now: 0 });
  king.level = level;
  return { king, wallet: createWallet(ACCOUNT, coins, 0n) };
}

export function makeTeam(): Team {
  return createTeam(ACCOUNT);
}

export function makeHero(index = 0, classIndex = 0, level = 1): Hero {
  const cls = classes[classIndex % classes.length]!;
  return createHero({
    accountId: ACCOUNT,
    classId: cls.id as Hero["classId"],
    name: `${cls.name} ${index}`,
    now: 0,
    index,
    level,
  });
}

export function makeInventory() {
  return createInventory(ACCOUNT);
}

export function growthOf(classIndex = 0): ClassGrowth {
  return classes[classIndex % classes.length]!.growth;
}

export function heroId(n: number): HeroId {
  return asHeroId(`hero_test_${n}`);
}

export const BASE_STATS: CombatStats = {
  hp: 100,
  attack: 20,
  specialAttack: 20,
  defense: 10,
  specialDefense: 10,
  critChance: 0.1,
  attackSpeed: 0,
  speed: 10,
};

/** Grandeza de Coin para scenarios de slot. */
export const COIN_MILLION = 1_000_000n;
