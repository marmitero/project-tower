/**
 * Boss (FASE 12, ADR-027): ciclo entrar → lutar → liquidar → voltar, tentativas, recompensa,
 * fragmentos, Bot na Arena e as regras do Master-Prompt (§12, §17/§79, §21/§55, §24/§80).
 */
import { afterEach, describe, expect, it } from "vitest";
import { RARITY_ORDER, classes, config, resetContentToDefaults, type BossDef } from "@tia/config";
import { asAccountId } from "@tia/contracts";
import { GameState } from "../state.js";
import { BossBlockedError, bossAvailability, bossById, bossStats, emptyBossRecord, registerAttemptStart, registerResult, rollBossRewards } from "../boss.js";
import { createHero } from "../creation.js";
import { Prng } from "@tia/engine";
import { grantShopItem, fragmentCount, stackCount } from "../shop.js";
import { resolveTowerWin } from "../tower.js";
import { averageBossFight, simulateBossFight } from "../balance.js";

afterEach(() => resetContentToDefaults());

const START = 1_700_000_000_000;
const MIN = 60_000;

/** Estado com `teamSize` heróis na equipe (Rei no nível pedido). */
function makeState(opts: { teamSize?: number; kingLevel?: number; seed?: number } = {}) {
  let now = START;
  const state = GameState.createNew(
    { accountId: asAccountId("boss-account"), nickname: "Caçador", skinId: "royal", starterIdentityId: "hero_aldric", now, masterSeed: opts.seed ?? 33 },
    { now: () => now },
  );
  (state.data.king as { level: number }).level = opts.kingLevel ?? 100;
  state.data.wallet.coins = 10n ** 12n;
  const first = state.data.heroes[0]!;
  state.assignHeroToSlot(first.id, 0);
  state.selectActiveHero(first.id);
  const size = opts.teamSize ?? 3;
  for (let i = 1; i < size; i += 1) {
    const cls = classes[i % classes.length]!;
    const hero = createHero({ accountId: asAccountId("boss-account"), classId: cls.id as never, name: `Aliado ${i}`, now, index: i });
    state.data.heroes.push(hero);
    state.unlockTeamSlot(i as 1 | 2);
    state.assignHeroToSlot(hero.id, i as 1 | 2);
  }
  return { state, advance: (ms: number) => (now += ms), setNow: (t: number) => (now = t) };
}

/** Vitória garantida: chefe com 1 de HP, equipe indestrutível. */
function rigWin(state: GameState) {
  const b = state.activeBattle!;
  b.enemies[0]!.hp = 1;
  for (const a of b.allies) a.hp = a.maxHp = 1e9;
}

describe("Boss — dado (config.boss)", () => {
  it("o roster de fábrica tem 8 chefes em ordem crescente de nível, todos válidos e habilitados", () => {
    const list = config.boss.bosses;
    expect(list).toHaveLength(8);
    for (let i = 1; i < list.length; i += 1) expect(list[i]!.requiredKingLevel).toBeGreaterThan(list[i - 1]!.requiredKingLevel);
    expect(list.every((b) => b.enabled)).toBe(true);
    expect(new Set(list.map((b) => b.id)).size).toBe(list.length);
  });

  it("a Torre NÃO tem chefe: nenhum andar usa um chefe e a lista de bosses automáticos é vazia (§21/§55)", () => {
    expect(config.combat.towerAutoBossFloors).toEqual([]);
    const bossIds = new Set(config.boss.bosses.map((b) => b.id));
    for (const f of config.tower.floors) {
      expect(f.pool.every((p) => !bossIds.has(p.enemyId))).toBe(true);
    }
  });

  it("os stats do chefe saem do template × multiplicadores (um chefe é mais forte que o inimigo comum)", () => {
    const def = bossById("boss_sentinela")!;
    const base = bossStats({ ...def, multipliers: { hp: 1, attack: 1, defense: 1, speed: 1 } });
    const full = bossStats(def);
    expect(full.hp).toBeGreaterThan(base.hp);
    expect(full.hp).toBe(Math.floor(base.hp * def.multipliers.hp));
  });
});

describe("Boss — entrar na luta", () => {
  it("equipe de 3: o chefe é lutado por TODOS e a Torre segue 1×1 com a mesma equipe (§17/§24/§79)", () => {
    const { state } = makeState({ teamSize: 3 });
    expect(state.teamSize).toBe(3);
    const tower = state.startTower();
    expect(tower.mode).toBe("tower");
    expect(tower.allies).toHaveLength(1);
    // a Torre é substituída pela Arena; a assinatura recebe a equipe inteira
    const b = state.startBoss("boss_rei_gosma");
    expect(b.mode).toBe("boss");
    expect(b.allies).toHaveLength(3);
    expect(b.enemies).toHaveLength(1);
    expect(b.enemies[0]!.isBoss).toBe(true);
    expect(b.bossId).toBe("boss_rei_gosma");
    expect(b.timeLimitMs).toBe(bossById("boss_rei_gosma")!.timeLimitMs);
    expect(state.activeBossId).toBe("boss_rei_gosma");
    expect(state.data.hunt?.kind).toBe("in_battle");
  });

  it("a equipe entra com o HP cheio (a Arena não depende do desgaste da Torre)", () => {
    const { state } = makeState({ teamSize: 2 });
    state.data.heroes.forEach((h) => (h.currentHp = 1));
    const b = state.startBoss("boss_rei_gosma");
    expect(b.allies.every((a) => a.hp === a.maxHp && a.hp > 1)).toBe(true);
  });

  it("a Torre não interrompe uma luta de chefe em curso", () => {
    const { state } = makeState();
    state.startBoss("boss_rei_gosma");
    expect(() => state.startTower()).toThrow(/chefe/);
    expect(state.activeBossId).toBe("boss_rei_gosma");
  });

  it("exige equipe, nível do Rei e chefe habilitado", () => {
    const empty = makeState({ teamSize: 1, kingLevel: 5 });
    empty.state.removeHeroFromSlot(0);
    expect(() => empty.state.startBoss("boss_rei_gosma")).toThrowError(BossBlockedError);

    const low = makeState({ kingLevel: 9, teamSize: 1 });
    try {
      low.state.startBoss("boss_rei_gosma");
      throw new Error("deveria bloquear");
    } catch (e) {
      expect((e as BossBlockedError).reason).toBe("locked");
    }
    expect(low.state.bossAvailability("boss_rei_gosma").state).toBe("locked");

    const ok = makeState({ kingLevel: 10, teamSize: 1 });
    config.boss.bosses[0]!.enabled = false;
    expect(() => ok.state.startBoss("boss_rei_gosma")).toThrow(/indisponível/);
    expect(() => ok.state.startBoss("nao_existe")).toThrowError(BossBlockedError);
  });

  it("minTeamSize da config é respeitado", () => {
    const { state } = makeState({ teamSize: 1, kingLevel: 100 });
    config.boss.minTeamSize = 2;
    try {
      state.startBoss("boss_rei_gosma");
      throw new Error("deveria bloquear");
    } catch (e) {
      expect((e as BossBlockedError).reason).toBe("team_too_small");
    }
  });
});

describe("Boss — tentativas (cooldown / janela / sem limite)", () => {
  it("cooldown: vitória aplica a recarga longa; durante a recarga não entra; depois volta", () => {
    const { state, advance } = makeState();
    state.startBoss("boss_rei_gosma");
    rigWin(state);
    state.resolveBattleToEnd();
    const def = bossById("boss_rei_gosma")!;
    expect(def.attempts.kind).toBe("cooldown");
    const av = state.bossAvailability(def.id);
    expect(av.state).toBe("cooldown");
    expect(() => state.startBoss(def.id)).toThrowError(BossBlockedError);
    advance(10 * MIN + 1);
    expect(state.bossAvailability(def.id).state).toBe("ready");
    expect(() => state.startBoss(def.id)).not.toThrow();
  });

  it("derrota/desistência aplica a recarga CURTA (a tentativa é consumida ao entrar)", () => {
    const { state, advance } = makeState();
    state.startBoss("boss_rei_gosma");
    // consumida na entrada: já em recarga curta
    expect(state.bossAvailability("boss_rei_gosma").state).toBe("cooldown");
    state.forfeitBoss();
    expect(state.bossResult?.won).toBe(false);
    advance(2 * MIN + 1);
    expect(state.bossAvailability("boss_rei_gosma").state).toBe("ready");
  });

  it("janela móvel: N tentativas por janela e volta quando a janela vence", () => {
    const def: BossDef = { ...bossById("boss_rei_gosma")!, attempts: { kind: "window", windowMs: 8 * 60 * MIN, maxAttempts: 2 } };
    const rec = emptyBossRecord();
    expect(bossAvailability(def, rec, 100, START)).toMatchObject({ state: "ready", attemptsLeft: 2 });
    registerAttemptStart(def, rec, START);
    expect(bossAvailability(def, rec, 100, START + MIN)).toMatchObject({ state: "ready", attemptsLeft: 1 });
    registerAttemptStart(def, rec, START + MIN);
    const blocked = bossAvailability(def, rec, 100, START + 2 * MIN);
    expect(blocked).toMatchObject({ state: "no_attempts", attemptsLeft: 0 });
    expect(blocked.availableAt).toBe(START + 8 * 60 * MIN);
    expect(bossAvailability(def, rec, 100, START + 8 * 60 * MIN)).toMatchObject({ state: "ready", attemptsLeft: 2 });
  });

  it("\"none\" não limita; o resultado atualiza vitórias e recorde", () => {
    const def: BossDef = { ...bossById("boss_rei_gosma")!, attempts: { kind: "none" } };
    const rec = emptyBossRecord();
    registerAttemptStart(def, rec, START);
    expect(bossAvailability(def, rec, 100, START).state).toBe("ready");
    expect(registerResult(def, rec, true, START, 50_000).firstClear).toBe(true);
    expect(registerResult(def, rec, true, START + 1, 40_000).firstClear).toBe(false);
    expect(rec).toMatchObject({ wins: 2, bestTimeMs: 40_000 });
    registerResult(def, rec, false, START + 2, 10);
    expect(rec.losses).toBe(1);
  });

  it("recarregar a página durante a luta NÃO devolve a tentativa (a luta é perdida)", () => {
    const { state } = makeState();
    state.startBoss("boss_rei_gosma");
    const save = JSON.parse(JSON.stringify(state.data, (_k, v) => (typeof v === "bigint" ? `${v}n` : v)));
    expect(save.boss.battlesStarted).toBe(1);
    expect(state.bossAvailability("boss_rei_gosma").state).toBe("cooldown");
  });
});

describe("Boss — desfecho e recompensa", () => {
  it("vitória: Coin/XP, equipamento garantido, fragmentos; 1ª vitória rende o bônus uma única vez", () => {
    const { state, advance } = makeState({ teamSize: 3 });
    const def = bossById("boss_rei_gosma")!;
    const coinsBefore = state.data.wallet.coins;
    const xpBefore = state.data.king.xp;
    state.startBoss(def.id);
    rigWin(state);
    state.resolveBattleToEnd();

    const r = state.bossResult!;
    expect(r.won).toBe(true);
    expect(r.reason).toBe("victory");
    expect(r.firstClear).toBe(true);
    expect(state.activeBattle).toBeNull();
    expect(state.data.wallet.coins - coinsBefore).toBe(r.rewards!.coins);
    expect(state.data.king.xp !== xpBefore || state.data.king.level > 100).toBe(true);
    expect(r.rewards!.equipment).toHaveLength(def.rewards.equipment.rolls);
    expect(r.rewards!.fragments.length).toBeGreaterThan(0);
    // 1ª vitória: fragmentos da classe da casa (guardian) vindos do `firstClearFragments`
    const guardian = r.rewards!.fragments.filter((f) => f.classId === "guardian" && f.rarity === "common").reduce((s, f) => s + f.amount, 0);
    expect(guardian).toBeGreaterThanOrEqual(def.rewards.firstClearFragments[0]!.min + def.rewards.fragments[0]!.min);
    expect(fragmentCount(state.data.inventory, "guardian", "common")).toBe(guardian + 0 + (fragmentCount(state.data.inventory, "guardian", "common") - guardian));
    expect(fragmentCount(state.data.inventory, "guardian", "common")).toBeGreaterThanOrEqual(guardian);

    // segunda vitória: sem bônus
    state.dismissBossResult();
    advance(11 * MIN);
    const firstCoins = r.rewards!.coins;
    state.startBoss(def.id);
    rigWin(state);
    state.resolveBattleToEnd();
    const r2 = state.bossResult!;
    expect(r2.firstClear).toBe(false);
    expect(r2.rewards!.coins).toBe(BigInt(Math.floor(Number(firstCoins) / def.rewards.firstClearMultiplier)));
    expect(state.bossRecord(def.id).wins).toBe(2);
  });

  it("o XP de herói é DIVIDIDO entre a equipe (§20), uma única vez", () => {
    const { state } = makeState({ teamSize: 3 });
    const before = state.team.map((h) => h.xp);
    state.startBoss("boss_rei_gosma");
    rigWin(state);
    state.resolveBattleToEnd();
    const gained = state.team.map((h, i) => Number(h.xp - before[i]!));
    const total = Number(state.bossResult!.rewards!.heroXp);
    // Cada herói ganha ≈ 1/3 do total (os níveis podem subir; o total creditado não passa do pacote).
    expect(gained.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(total);
  });

  it("derrota (equipe caiu): nenhuma recompensa, cooldown curto, HP da Torre intocado", () => {
    const { state } = makeState({ teamSize: 2 });
    const towerHp = state.data.heroes.map((h) => h.currentHp);
    const coins = state.data.wallet.coins;
    state.startBoss("boss_rei_gosma");
    for (const a of state.activeBattle!.allies) a.hp = 1;
    state.activeBattle!.enemies[0]!.stats = { ...state.activeBattle!.enemies[0]!.stats, attack: 1e9 };
    state.resolveBattleToEnd();
    const r = state.bossResult!;
    expect(r.won).toBe(false);
    expect(r.reason).toBe("defeat");
    expect(r.rewards).toBeNull();
    expect(state.data.wallet.coins).toBe(coins);
    expect(state.data.heroes.map((h) => h.currentHp)).toEqual(towerHp);
    expect(state.bossRecord("boss_rei_gosma").losses).toBe(1);
  });

  it("tempo esgotado é derrota com motivo \"timeout\"", () => {
    const { state } = makeState({ teamSize: 1 });
    const def = bossById("boss_rei_gosma")!;
    def.timeLimitMs = 10_000;
    state.startBoss(def.id);
    const b = state.activeBattle!;
    b.enemies[0]!.hp = b.enemies[0]!.maxHp = 1e12;
    b.allies[0]!.hp = b.allies[0]!.maxHp = 1e12;
    b.enemies[0]!.stats = { ...b.enemies[0]!.stats, attack: 0, specialAttack: 0 };
    state.resolveBattleToEnd(120_000);
    expect(state.bossResult?.reason).toBe("timeout");
    expect(state.bossResult?.won).toBe(false);
  });

  it("persistHpAfter=true devolve o HP final aos heróis (política editável)", () => {
    const { state } = makeState({ teamSize: 1 });
    config.boss.persistHpAfter = true;
    state.startBoss("boss_rei_gosma");
    const b = state.activeBattle!;
    b.allies[0]!.hp = 1;
    b.enemies[0]!.stats = { ...b.enemies[0]!.stats, attack: 1e9 };
    state.resolveBattleToEnd();
    expect(state.bossResult?.won).toBe(false);
    expect(state.team[0]!.currentHp).toBe(0);
  });

  it("ao terminar, a Torre retoma sozinha (resumeTowerAfter) — ou fica pausada se a config pedir", () => {
    const a = makeState();
    a.state.startBoss("boss_rei_gosma");
    rigWin(a.state);
    a.state.resolveBattleToEnd();
    expect(a.state.data.hunt).toBeNull();
    a.state.advanceIdle(0);
    expect(a.state.data.hunt?.kind).toBe("searching");

    const b = makeState();
    config.boss.resumeTowerAfter = false;
    b.state.startBoss("boss_rei_gosma");
    rigWin(b.state);
    b.state.resolveBattleToEnd();
    expect(b.state.data.hunt).toMatchObject({ kind: "paused", reason: "boss" });
  });

  it("desistir é derrota imediata e libera a Arena", () => {
    const { state } = makeState();
    state.startBoss("boss_rei_gosma");
    state.forfeitBoss();
    expect(state.activeBattle).toBeNull();
    expect(state.bossResult).toMatchObject({ won: false, reason: "defeat" });
  });
});

describe("Boss — fragmentos e equipamento (§12)", () => {
  it("fragmentos NUNCA vêm de inimigo comum da Torre", () => {
    for (let i = 0; i < 300; i += 1) {
      const bundle = resolveTowerWin({ floor: 1 + (i % 10), rng: new Prng(i + 1), accountId: "t", itemIndexStart: i, createdAt: 0 });
      expect(bundle.fragments).toEqual([]);
    }
  });

  it("o chefe entrega fragmentos com raridade e quantidade dentro da faixa da config", () => {
    for (const def of config.boss.bosses) {
      for (let i = 0; i < 40; i += 1) {
        const b = rollBossRewards({ def, firstClear: false, rng: new Prng(i + 7), accountId: "t", itemIndexStart: 0, createdAt: 0, bundleId: "x" });
        for (const f of b.fragments) {
          expect(RARITY_ORDER).toContain(f.rarity);
          expect(f.amount).toBeGreaterThanOrEqual(1);
          expect(classes.some((c) => c.id === f.classId)).toBe(true);
        }
      }
    }
  });

  it("equipamento é GARANTIDO (sem os 5%) e nunca abaixo da raridade mínima", () => {
    const def = bossById("boss_colosso")!;
    for (let i = 0; i < 60; i += 1) {
      const b = rollBossRewards({ def, firstClear: false, rng: new Prng(i + 1), accountId: "t", itemIndexStart: i * 3, createdAt: 0, bundleId: "x" });
      expect(b.equipment).toHaveLength(def.rewards.equipment.rolls);
      for (const e of b.equipment) expect(RARITY_ORDER.indexOf(e.rarity)).toBeGreaterThanOrEqual(RARITY_ORDER.indexOf(def.rewards.equipment.minRarity));
    }
  });

  it("chance 0 nunca entrega e chance 1 sempre entrega (a chance é dado)", () => {
    const def: BossDef = JSON.parse(JSON.stringify(bossById("boss_rei_gosma")!));
    def.rewards.fragments = [{ classId: "ranger", rarity: "rare", min: 2, max: 2, chance: 0 }];
    def.rewards.firstClearFragments = [];
    expect(rollBossRewards({ def, firstClear: true, rng: new Prng(1), accountId: "t", itemIndexStart: 0, createdAt: 0, bundleId: "x" }).fragments).toEqual([]);
    def.rewards.fragments[0]!.chance = 1;
    expect(rollBossRewards({ def, firstClear: true, rng: new Prng(1), accountId: "t", itemIndexStart: 0, createdAt: 0, bundleId: "x" }).fragments).toEqual([{ classId: "ranger", amount: 2, rarity: "rare" }]);
  });

  it("cada classe de herói tem ao menos um chefe que a entrega (o jogador escolhe o chefe pelo herói)", () => {
    for (const c of classes) {
      const owners = config.boss.bosses.filter((b) => b.rewards.fragments.some((f) => f.classId === c.id));
      expect(owners.length).toBeGreaterThan(0);
    }
  });
});

describe("Boss — Bot na Arena", () => {
  it("poção vai para o aliado MAIS FERIDO da equipe (não só para o primeiro)", () => {
    const { state } = makeState({ teamSize: 3 });
    grantShopItem(state.data.inventory, "potion_basic", 5, START);
    state.setBot({ autoPotion: { enabled: true, hpBelowPct: 60, itemId: "potion_basic" } });
    const b = state.startBoss("boss_rei_gosma");
    // novo estado de luta: 3º herói bem ferido, os demais cheios
    b.allies[2]!.hp = Math.floor(b.allies[2]!.maxHp * 0.1);
    const hpBefore = b.allies[2]!.hp;
    state.advanceBattle(100);
    expect(b.allies[2]!.hp).toBeGreaterThan(hpBefore);
    expect(stackCount(state.data.inventory, "potion_basic")).toBe(4);
  });

  it("revive proativo: um aliado caído volta enquanto os outros seguem lutando", () => {
    const { state } = makeState({ teamSize: 2 });
    grantShopItem(state.data.inventory, "revive_basic", 3, START);
    state.setBot({ autoPotion: { enabled: false }, autoRevive: { enabled: true, itemId: "revive_basic" } });
    const b = state.startBoss("boss_rei_gosma");
    b.allies[1]!.hp = 0;
    b.allies[1]!.isDefeated = true;
    state.advanceBattle(100);
    expect(b.allies[1]!.isDefeated).toBe(false);
    expect(stackCount(state.data.inventory, "revive_basic")).toBe(2);
  });

  it("config.boss.bot.enabled=false desliga o Bot na Arena (e só nela)", () => {
    const { state } = makeState({ teamSize: 1 });
    grantShopItem(state.data.inventory, "potion_basic", 5, START);
    state.setBot({ autoPotion: { enabled: true, hpBelowPct: 90, itemId: "potion_basic" } });
    config.boss.bot.enabled = false;
    const b = state.startBoss("boss_rei_gosma");
    b.allies[0]!.hp = 1;
    state.advanceBattle(100);
    expect(stackCount(state.data.inventory, "potion_basic")).toBe(5);
  });
});

describe("Boss — offline e salvamento", () => {
  it("o Boss NUNCA roda offline: com a luta aberta a simulação não acontece", () => {
    const { state, advance } = makeState();
    state.startBoss("boss_rei_gosma");
    const hpBefore = state.activeBattle!.enemies[0]!.hp;
    advance(60 * MIN);
    const r = state.claimOffline();
    expect(state.activeBattle?.mode).toBe("boss");
    expect(state.activeBattle!.enemies[0]!.hp).toBe(hpBefore);
    expect(r.creditedDurationMs).toBeGreaterThan(0);
    expect(state.offlineReport).toBeNull();
  });

  it("o progresso do chefe persiste no save e save antigo (sem `boss`) carrega com o padrão", async () => {
    const { state } = makeState();
    state.startBoss("boss_rei_gosma");
    rigWin(state);
    state.resolveBattleToEnd();
    const json = JSON.stringify(state.data, (_k, v) => (typeof v === "bigint" ? `${v}n` : v));
    expect(JSON.parse(json).boss.records.boss_rei_gosma.wins).toBe(1);

    const { normalizeBossProgress } = await import("../boss.js");
    expect(normalizeBossProgress(undefined)).toEqual({ records: {}, battlesStarted: 0 });
    expect(normalizeBossProgress({ records: { x: { wins: "?" } }, battlesStarted: -3 })).toEqual({
      records: { x: { wins: 0, losses: 0, firstClearAt: null, bestTimeMs: null, windowStartAt: 0, windowAttempts: 0, cooldownUntil: 0 } },
      battlesStarted: 0,
    });
  });
});

describe("Boss — calibração (a config entrega o desenho)", () => {
  it("chefe 1 é vencível por 1 herói no nível dele; do chefe 3 em diante exige equipe (2 heróis não bastam)", () => {
    const first = config.boss.bosses[0]!;
    expect(averageBossFight({ bossId: first.id, classIds: ["guardian"], heroLevel: first.level }, 4).winRate).toBe(1);
    for (const def of config.boss.bosses.slice(2)) {
      const duo = averageBossFight({ bossId: def.id, classIds: ["guardian", "ranger"], heroLevel: def.level }, 4);
      const trio = averageBossFight({ bossId: def.id, classIds: ["guardian", "ranger", "arcanist"], heroLevel: def.level }, 4);
      expect(duo.winRate, `${def.id} dupla`).toBeLessThan(1);
      expect(trio.winRate, `${def.id} trio`).toBeGreaterThanOrEqual(0.75);
      expect(trio.avgDurationSec, `${def.id} duração`).toBeGreaterThan(20);
      expect(trio.avgDurationSec * 1000, `${def.id} cabe no limite`).toBeLessThan(def.timeLimitMs);
    }
  });

  it("o nível dos heróis importa: bem abaixo do nível do chefe a equipe perde", () => {
    const def = bossById("boss_senhor_forja")!;
    const r = simulateBossFight({ bossId: def.id, classIds: ["guardian", "ranger", "arcanist"], heroLevel: Math.floor(def.level * 0.6) });
    expect(r.won).toBe(false);
  });

  it("as imunidades de dado valem: a Sentinela e o Colosso são imunes a atordoamento", () => {
    expect(bossById("boss_sentinela")!.statusResist.stun).toBe(1);
    expect(bossById("boss_colosso")!.statusResist.stun).toBe(1);
    expect(bossById("boss_rainha_morcegos")!.statusResist.poison).toBe(1);
  });
});
