/**
 * "Soak" — estabilidade do MVP local. Um jogador scriptado joga horas SIMULADAS (Torre, loot,
 * venda, Market, slots, Arena, Bot, save/recarga no meio do caminho) enquanto invariantes são
 * conferidos o tempo todo. Pega o que teste pontual não pega: NaN que escorre pelo save,
 * mochila acima do limite, Coin negativa, herói com HP absurdo, save que não faz ida-e-volta.
 *
 * Determinístico: relógio e sementes fixos. Se falhar, a mensagem diz o minuto e o invariante.
 */
import { describe, expect, it } from "vitest";
import { config } from "@tia/config";
import {
  GameState,
  LocalStoragePersistence,
  MemoryStorage,
  bagItems,
  decodeSave,
  encodeSave,
  createDebugTools,
} from "@tia/game-core";
import { asAccountId } from "@tia/contracts";

const START = 1_700_000_000_000;
const STARTERS = ["hero_aldric", "hero_kaia", "hero_maelis", "hero_vorath"] as const;
const FRAME_MS = 250; // o passo máximo que o loop real permite

function assertSane(value: unknown, path: string): void {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`número inválido em ${path}: ${value}`);
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => assertSane(v, `${path}[${i}]`));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) assertSane(v, `${path}.${k}`);
  }
}

/**
 * Forma comparável do save. Duas diferenças são INTENCIONAIS ao recarregar: a luta em curso não
 * é retomada (a caçada recomeça pelo "Procurando…") e `lastSavedAt` marca o instante da gravação.
 */
function normalized(data: unknown): string {
  return encodeSave({ ...(data as object), hunt: null, lastSavedAt: 0 });
}

function invariants(state: GameState, label: string): void {
  const d = state.data;
  const at = `[${label}]`;
  assertSane(d, `${at} save`);
  expect(d.wallet.coins >= 0n, `${at} Coin negativa`).toBe(true);
  expect(d.wallet.diamonds >= 0n, `${at} Diamante negativo`).toBe(true);
  expect(d.king.level, `${at} nível do Rei`).toBeGreaterThanOrEqual(1);
  expect(d.king.level, `${at} nível do Rei acima do teto`).toBeLessThanOrEqual(config.xp.king.levelCap);
  expect(d.king.xp >= 0n, `${at} XP do Rei negativo`).toBe(true);
  for (const h of d.heroes) {
    expect(h.level, `${at} nível do herói`).toBeGreaterThanOrEqual(1);
    expect(h.level, `${at} herói acima do teto`).toBeLessThanOrEqual(config.xp.hero.levelCap);
  }
  expect(bagItems(d.inventory, d.heroes).length, `${at} mochila acima do limite`).toBeLessThanOrEqual(config.inventory.equipmentMaxItems);
  const ids = d.inventory.equipment.map((e) => e.id);
  expect(new Set(ids).size, `${at} ids de equipamento duplicados`).toBe(ids.length);
  for (const s of d.inventory.items) expect(s.quantity, `${at} estoque negativo`).toBeGreaterThanOrEqual(0);
  const b = state.activeBattle;
  if (b) {
    for (const c of [...b.allies, ...b.enemies]) {
      expect(c.hp, `${at} HP acima do máximo`).toBeLessThanOrEqual(c.maxHp + 1e-6);
      expect(Number.isFinite(c.hp), `${at} HP inválido`).toBe(true);
    }
  }
  expect(d.tower.currentFloor).toBeGreaterThanOrEqual(1);
  expect(d.tower.currentFloor).toBeLessThanOrEqual(config.tower.floors.length);
}

/** Um jogador razoável, sem trapacear: equipa, vende, compra poção, sobe de andar, enfrenta o chefe. */
function playerTurn(state: GameState): void {
  const d = state.data;
  const hero = state.heroById(d.team.activeHeroId!);
  if (!hero) return;

  // equipa o que ocupa slot vazio
  for (const e of bagItems(d.inventory, d.heroes)) {
    if (!hero.equipped[e.slot]) {
      try {
        state.equip(hero.id, e.id);
      } catch {
        /* nível do item etc. — é jogo, não falha */
      }
    }
  }
  // mochila cheia: vende tudo até "raro"
  const bag = bagItems(d.inventory, d.heroes);
  if (bag.length > config.inventory.equipmentMaxItems * 0.8) {
    state.sellItems(state.previewBulkSale({ maxRarity: "rare" }).map((e) => e.id));
  }
  // poções quando sobra Coin
  if (d.wallet.coins > 5_000n && state.ownedCount("potion_basic") < 5) {
    try {
      state.buyItem("potion_basic", 5);
    } catch {
      /* bloqueado por nível/preço */
    }
  }
  // slots
  if (d.king.level >= 10 && d.team.unlockedSlots < 2 && d.wallet.coins >= 60_000n) state.unlockTeamSlot(1);
  // sobe de andar assim que abre
  if (state.highestUnlockedFloor > state.currentFloor) state.selectFloor(state.highestUnlockedFloor);
  // Arena: primeiro chefe liberado e pronto
  if (!state.activeBossId && state.bossAvailability("boss_rei_gosma").state === "ready" && state.activeBattle === null) {
    try {
      state.startBoss("boss_rei_gosma");
    } catch {
      /* equipe/estado não permite agora */
    }
  }
  if (state.bossResult) state.dismissBossResult();
}

describe("soak — o jogo aguenta horas de jogo", () => {
  for (const starter of STARTERS) {
    it(`3 h simuladas com ${starter}: invariantes, save/recarga e Arena sem quebrar`, () => {
      const storage = new MemoryStorage();
      const persistence = new LocalStoragePersistence(storage);
      let now = START;
      const acc = `soak-${starter}`;
      let state = GameState.createNew(
        { accountId: asAccountId(acc), nickname: "Soak", skinId: "royal", starterIdentityId: starter, now, masterSeed: 99 },
        { persistence, now: () => now },
      );
      const hero = state.data.heroes[0]!;
      state.assignHeroToSlot(hero.id, 0);
      state.selectActiveHero(hero.id);
      state.startTower();

      const totalMs = 3 * 3_600_000;
      let nextTurn = 0;
      let nextReload = 15 * 60_000;
      let reloads = 0;
      let bossFights = 0;
      for (let t = 0; t < totalMs; t += FRAME_MS) {
        now += FRAME_MS;
        state.advanceIdle(FRAME_MS);
        if (t >= nextTurn) {
          nextTurn += 10_000;
          playerTurn(state);
          if (state.activeBossId) bossFights++;
          invariants(state, `${starter} t=${Math.round(t / 60000)}min`);
        }
        if (t >= nextReload) {
          nextReload += 15 * 60_000;
          // "F5": grava, recarrega e confere a ida-e-volta do save.
          const before = normalized(state.data);
          void state.save();
          const stored = storage.getItem(`tia:save:${acc}`);
          expect(stored, "save não foi gravado").not.toBeNull();
          const reloaded = GameState.hydrate(decodeSave(stored!), { persistence, now: () => now, masterSeed: 99 }, {});
          expect(normalized(reloaded.data), "save não faz ida-e-volta").toBe(before);
          state = reloaded;
          reloads++;
        }
      }
      invariants(state, `${starter} fim`);
      expect(reloads).toBeGreaterThanOrEqual(10);
      // Em 3 h um jogador razoável EVOLUI: Rei acima do nível 10 e andar além do 1.
      expect(state.data.king.level).toBeGreaterThan(10);
      expect(state.data.tower.bestFloor).toBeGreaterThanOrEqual(2);
      // Debug Mode (ferramenta de dev) não deixa o estado inválido mesmo sendo trapaça.
      const tools = createDebugTools(state);
      tools.setKingLevel(config.xp.king.levelCap);
      tools.addCoins(1e12);
      invariants(state, `${starter} pós-debug`);
      // A Arena foi exercitada de verdade (o Rei passa do nível 10 bem antes de 3 h).
      const rec = state.data.boss.records["boss_rei_gosma"];
      expect((rec?.wins ?? 0) + (rec?.losses ?? 0), "o chefe nunca foi desafiado").toBeGreaterThanOrEqual(1);
      expect(bossFights).toBeGreaterThanOrEqual(1);
    }, 120_000);
  }

  it("24 h offline em sequência (5 aberturas de 2 h) nunca quebra nem cria Coin do nada", async () => {
    const persistence = new LocalStoragePersistence(new MemoryStorage());
    let now = START;
    const state = GameState.createNew(
      { accountId: asAccountId("soak-off"), nickname: "Soak", skinId: "royal", starterIdentityId: "hero_aldric", now, masterSeed: 3 },
      { persistence, now: () => now },
    );
    const hero = state.data.heroes[0]!;
    state.assignHeroToSlot(hero.id, 0);
    state.selectActiveHero(hero.id);
    state.startTower();
    for (let i = 0; i < 5; i++) {
      now += 6 * 3_600_000;
      const coins = state.data.wallet.coins;
      const r = state.claimOffline();
      expect(r.creditedDurationMs).toBeLessThanOrEqual(config.offline.capFreeMs);
      expect(state.data.wallet.coins).toBeGreaterThanOrEqual(coins);
      invariants(state, `offline #${i}`);
    }
  }, 60_000);
});
