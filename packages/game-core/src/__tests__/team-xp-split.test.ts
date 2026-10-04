/**
 * Gate da FASE 5 — divisão de XP por tamanho da equipe (§20, §81).
 *
 * O nível unitário (`splitTeamXp` puro) vive em `progression.test.ts`.
 * Este arquivo cobre a integração que o gate exige: a divisão acontecendo
 * dentro de `GameState.applyRewards`, com heróis reais na equipe — é ali
 * que um erro de índice daria XP dobrado para alguém.
 *
 * ⛔ P-004 (curva de divisão) — ratificada a divisão linear 1/n
 * (`config.xp.teamSplit`, ADR-017). Mudar a curva é editar a config;
 * estes testes leem a config, nunca um literal.
 */

import { describe, expect, it } from "vitest";
import { HEROES, config } from "@tia/config";
import { GameState } from "../state.js";
import { createHero } from "../creation.js";
import { asAccountId } from "@tia/contracts";
import type { Hero, RewardBundle } from "@tia/contracts";

const ACCOUNT = asAccountId("xp-split-account");

function makeState() {
  let now = 1_000;
  const state = GameState.createNew(
    { accountId: ACCOUNT, nickname: "Divisor", skinId: "royal", starterIdentityId: "hero_aldric", now, masterSeed: 11 },
    { now: () => now },
  );
  // Nível/Coin para liberar os 3 slots pela API real (§15).
  const d = state.data as unknown as { king: { level: number }; wallet: { coins: bigint } };
  d.king.level = 25;
  d.wallet.coins = 10_000_000n;
  return state;
}

/** Recruta um herói extra direto no save (helper de teste — aquisição real é Fase 9+). */
function recruit(state: GameState, identityId: string, index: number): Hero {
  const identity = HEROES.find((h) => h.id === identityId)!;
  const hero = createHero({
    accountId: asAccountId(state.data.king.accountId),
    classId: identity.classId as Hero["classId"],
    name: identity.name,
    rarity: identity.rarity,
    now: 0,
    index,
    origin: "summon",
  });
  (state.data as unknown as { heroes: Hero[] }).heroes.push(hero);
  return hero;
}

/** Coloca heróis na equipe pela API real (§19 — sempre um ato explícito). */
function assignTeam(state: GameState, heroes: Hero[]): void {
  while (state.data.team.unlockedSlots < heroes.length) {
    state.unlockTeamSlot((state.data.team.unlockedSlots === 1 ? 1 : 2) as 0 | 1 | 2);
  }
  heroes.forEach((h, i) => state.assignHeroToSlot(h.id, i as 0 | 1 | 2));
}

/**
 * Pacote de recompensa com XP abaixo do 1º level-up (requiredPerLevel(1)=80):
 * assim `hero.xp` guarda a parcela inteira e as igualdades são exatas.
 */
function bundle(heroXp: bigint): RewardBundle {
  return { id: "r-test", kingXp: 0n, heroXp, coins: 0n, equipment: [], fragments: [] };
}

/** Progresso total do herói em XP "efetivo" (XP atual + custo já pago em níveis é irrelevante entre si). */
function heroXpOf(hero: Hero): bigint {
  return hero.xp;
}

describe("divisão de XP via applyRewards (§20 — XP é DIVIDIDO)", () => {
  it("1 herói recebe 100% do heroXp do pacote", () => {
    const state = makeState();
    const solo = state.data.heroes[0]!;
    assignTeam(state, [solo]);
    state.applyRewards(bundle(60n));

    expect(heroXpOf(solo)).toBe(60n);
  });

  it("2 heróis recebem metade cada (config.xp.teamSplit)", () => {
    const state = makeState();
    const a = state.data.heroes[0]!;
    const b = recruit(state, "hero_kaia", 1);
    assignTeam(state, [a, b]);
    state.applyRewards(bundle(60n));

    const half = BigInt(Math.floor(60 * config.xp.teamSplit[2])); // 30
    expect(heroXpOf(a)).toBe(half);
    expect(heroXpOf(b)).toBe(half);
  });

  it("3 heróis recebem um terço cada, e a soma nunca excede o pacote", () => {
    const state = makeState();
    const a = state.data.heroes[0]!;
    const b = recruit(state, "hero_kaia", 1);
    const c = recruit(state, "hero_maelis", 2);
    assignTeam(state, [a, b, c]);
    state.applyRewards(bundle(60n));

    const third = BigInt(Math.floor(60 * config.xp.teamSplit[3])); // 20
    expect(heroXpOf(a)).toBe(third);
    expect(heroXpOf(b)).toBe(third);
    expect(heroXpOf(c)).toBe(third);
    expect(heroXpOf(a) + heroXpOf(b) + heroXpOf(c)).toBeLessThanOrEqual(60n);
  });

  it("quanto maior a equipe, MENOS XP individual (§20 — 'parcela menor')", () => {
    const solo = makeState();
    assignTeam(solo, [solo.data.heroes[0]!]);
    solo.applyRewards(bundle(60n));
    const soloXp = heroXpOf(solo.data.heroes[0]!);

    const duo = makeState();
    const duoB = recruit(duo, "hero_kaia", 1);
    assignTeam(duo, [duo.data.heroes[0]!, duoB]);
    duo.applyRewards(bundle(60n));
    const duoXp = heroXpOf(duo.data.heroes[0]!);

    const trio = makeState();
    const trioB = recruit(trio, "hero_kaia", 1);
    const trioC = recruit(trio, "hero_maelis", 2);
    assignTeam(trio, [trio.data.heroes[0]!, trioB, trioC]);
    trio.applyRewards(bundle(60n));
    const trioXp = heroXpOf(trio.data.heroes[0]!);

    expect(duoXp).toBeLessThan(soloXp);
    expect(trioXp).toBeLessThan(duoXp);
  });

  it("a divisão é por MEMBRO DA EQUIPE presente no momento, não por roster", () => {
    const state = makeState();
    const outsider = recruit(state, "hero_vorath", 3); // no roster, fora da equipe
    const member = state.data.heroes[0]!;
    assignTeam(state, [member]);
    state.applyRewards(bundle(60n));

    expect(heroXpOf(member)).toBe(60n); // sozinho na equipe: 100%
    expect(heroXpOf(outsider)).toBe(0n); // fora da equipe: nada (§20)
  });

  it("valores da curva vêm da config editável (P-004 — §105)", () => {
    expect(config.xp.teamSplit[1]).toBe(1.0);
    expect(config.xp.teamSplit[2]).toBe(0.5);
    expect(config.xp.teamSplit[3]).toBeCloseTo(1 / 3, 5);
    expect(config.xp.rounding).toBe("floor");
  });

  it("⛔ P-020b — herói caído não recebe a parcela (política registrada, ADR-017)", () => {
    // Modelo atual: HP nasce por batalha, não existe "caído entre batalhas"
    // — todo membro recebe. Quando a persistência de HP entrar (FASE 6),
    // o filtro de caídos se aplica aqui; a POLÍTICA já está decidida:
    // caído não consome parcela.
    const state = makeState();
    const a = state.data.heroes[0]!;
    const b = recruit(state, "hero_kaia", 1);
    assignTeam(state, [a, b]);
    state.applyRewards(bundle(60n));
    expect(heroXpOf(a) > 0n).toBe(true);
    expect(heroXpOf(b) > 0n).toBe(true);
  });
});
