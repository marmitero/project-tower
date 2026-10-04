/**
 * Debug Mode (§77) — ferramentas de DESENVOLVIMENTO para testar o jogo sem esperar horas.
 *
 * Regras (§77/§93):
 *  - **Nunca** é oferecido ao jogador final. O painel só é montado quando `VITE_DEBUG_MODE=true`
 *    no build (`apps/game-web/src/debug-flag.ts`); `scripts/check-debug-mode.mjs` confere.
 *  - Toda ação passa pelas MESMAS regras do jogo sempre que possível (`startTower`, `startBoss`,
 *    `claimOffline`, `rollEquipmentOf`…). O que "trapaceia" (dar Coin, subir nível) faz isso de
 *    forma explícita e devolve um texto para o log do painel.
 *  - Itens criados aqui nascem com `origin: "admin"`, nunca como `drop`.
 *  - Lógica pura, sem React/DOM: tudo é testável em Node (`__tests__/debug.test.ts`).
 *
 * Itens do §77 que ainda NÃO existem no MVP local (chat, autenticação, mercado da comunidade)
 * aparecem em `DEBUG_UNAVAILABLE`, com o motivo, para o painel mostrá-los desligados.
 */

import { classes, config, heroById, type BossDef } from "@tia/config";
import { RARITY_ORDER, type Rarity } from "@tia/config";
import type { Equipment, EquipmentId, Hero, HeroId, SaveData } from "@tia/contracts";
import { Prng } from "@tia/engine";
import { createHero, heroGrowth, heroStatsAtLevel } from "./creation.js";
import { addEquipment, heroCombatStats } from "./inventory.js";
import { grantFragments, grantShopItem } from "./shop.js";
import { rollEquipment, rollEquipmentOf, type LootContext } from "./loot.js";
import { clampFloor, floorDef } from "./tower.js";
import { bossById, recordOf, emptyBossRecord } from "./boss.js";
import { grantKingXp, grantHeroXp } from "./progression.js";
import type { GameState } from "./state.js";

/** Fatia do `GameState` que o Debug Mode enxerga (devolvida por `GameState.debugContext()`). */
export interface DebugContext {
  save: SaveData;
  now(): number;
  rng(key: string): Prng;
  nextItemIndex(): number;
  touch(): void;
}

/** Itens do §77 que dependem de fases futuras (online). */
export const DEBUG_UNAVAILABLE: readonly { id: string; label: string; reason: string }[] = [
  { id: "chat", label: "Testar chat", reason: "O chat é da fase Online (Supabase Realtime)." },
  { id: "auth", label: "Testar autenticação", reason: "Login Google/Supabase é da fase Online." },
  { id: "community_market", label: "Testar Mercado da Comunidade", reason: "Depende do servidor (taxa de 15%, §41); o Market do Reino é testável pela aba Market." },
];

const MAX_AMOUNT = 10n ** 15n;

function clampBig(n: bigint): bigint {
  return n > MAX_AMOUNT ? MAX_AMOUNT : n < 0n ? 0n : n;
}

const fmt = (n: number | bigint) => n.toLocaleString("pt-BR");

export interface LootTestReport {
  kills: number;
  drops: number;
  byRarity: Record<Rarity, number>;
  /** X médio de todos os atributos rolados. */
  avgX: number;
  dropRate: number;
}

export interface DebugTools {
  /** Mensagem curta do que foi feito (ou do que não pôde ser feito). */
  addCoins(amount: number): string;
  addDiamonds(amount: number): string;
  addKingXp(amount: number): string;
  addHeroXp(heroId: HeroId, amount: number): string;
  setKingLevel(level: number): string;
  setHeroLevel(heroId: HeroId, level: number): string;
  setHeroStars(heroId: HeroId, stars: number): string;
  /** `identityId` (opcional): cria o herói com a identidade/arte própria (revisão de arte, Lote 5). */
  createHero(classId: string, rarity: Rarity, identityId?: string): Hero;
  addFragments(classId: string, rarity: Rarity, amount: number): string;
  createEquipment(opts: { rarity: Rarity; templateId?: string; level?: number; x?: number }): Equipment;
  addConsumable(itemId: string, quantity: number): string;
  setFloor(floor: number): string;
  healAll(): string;
  startBattle(): string;
  killEnemy(): string;
  killHero(): string;
  startBoss(bossId: string): string;
  resetBossAttempts(): string;
  testLoot(kills: number, sourceLevel?: number): LootTestReport;
  testOffline(hours: number): string;
}

/** Cria as ferramentas sobre um `GameState`. Chame só quando o Debug Mode estiver ligado. */
export function createDebugTools(state: GameState): DebugTools {
  const ctx = state.debugContext();
  const hero = (id: HeroId): Hero => {
    const h = state.heroById(id);
    if (!h) throw new Error(`Herói não encontrado: ${id}`);
    return h;
  };
  const fullHp = (h: Hero) => {
    h.currentHp = heroCombatStats(h, ctx.save.inventory).hp;
  };

  return {
    addCoins(amount) {
      ctx.save.wallet.coins = clampBig(ctx.save.wallet.coins + BigInt(Math.trunc(amount)));
      ctx.touch();
      return `Coin: ${fmt(ctx.save.wallet.coins)}.`;
    },
    addDiamonds(amount) {
      ctx.save.wallet.diamonds = clampBig(ctx.save.wallet.diamonds + BigInt(Math.trunc(amount)));
      ctx.touch();
      return `Diamante: ${fmt(ctx.save.wallet.diamonds)}.`;
    },
    addKingXp(amount) {
      const r = grantKingXp(ctx.save.king, BigInt(Math.max(0, Math.trunc(amount))));
      ctx.touch();
      return `Rei: +${fmt(r.xpGained)} XP (nível ${r.level}).`;
    },
    addHeroXp(heroId, amount) {
      const h = hero(heroId);
      const r = grantHeroXp(h, BigInt(Math.max(0, Math.trunc(amount))), heroGrowth(h));
      ctx.touch();
      return `${h.name}: +${fmt(r.xpGained)} XP (nível ${r.level}).`;
    },
    setKingLevel(level) {
      const target = Math.min(config.xp.king.levelCap, Math.max(1, Math.trunc(level)));
      ctx.save.king.level = target;
      ctx.save.king.xp = 0n;
      ctx.touch();
      return `Rei no nível ${fmt(target)}.`;
    },
    setHeroLevel(heroId, level) {
      const h = hero(heroId);
      const target = Math.min(config.xp.hero.levelCap, Math.max(1, Math.trunc(level)));
      h.level = target;
      h.xp = 0n;
      h.stats = heroStatsAtLevel(heroGrowth(h), target);
      fullHp(h);
      ctx.touch();
      return `${h.name} no nível ${fmt(target)}.`;
    },
    setHeroStars(heroId, stars) {
      const h = hero(heroId);
      h.stars = Math.max(0, Math.trunc(stars));
      ctx.touch();
      return `${h.name}: ${h.stars} estrela(s) (P-015 provisório).`;
    },
    createHero(classId, rarity, identityId) {
      if (!classes.some((c) => c.id === classId)) throw new Error(`Classe desconhecida: ${classId}`);
      const identity = identityId ? heroById[identityId] : undefined;
      if (identityId && (!identity || identity.classId !== classId)) throw new Error(`Identidade desconhecida para ${classId}: ${identityId}`);
      let index = ctx.save.heroes.length;
      while (ctx.save.heroes.some((x) => x.id === createHero({ accountId: ctx.save.king.accountId as never, classId: classId as never, name: "x", now: 0, index }).id)) index += 1;
      const cls = classes.find((c) => c.id === classId)!;
      const h = createHero({
        accountId: ctx.save.king.accountId as never,
        classId: classId as never,
        name: identity ? identity.name : `${cls.name} (debug ${index})`,
        ...(identity ? { identityId: identity.id } : {}),
        rarity,
        origin: "admin",
        now: ctx.now(),
        index,
      });
      ctx.save.heroes.push(h);
      ctx.touch();
      return h;
    },
    addFragments(classId, rarity, amount) {
      grantFragments(ctx.save.inventory, classId, rarity, Math.max(0, Math.trunc(amount)), ctx.now());
      ctx.touch();
      return `+${fmt(Math.trunc(amount))} fragmento(s) de ${classId} (${rarity}).`;
    },
    createEquipment({ rarity, templateId, level, x }) {
      const index = ctx.nextItemIndex();
      const lootCtx: LootContext & { createdAt: number } = {
        accountId: ctx.save.king.accountId as never,
        origin: "admin",
        source: { kind: "admin" },
        sourceLevel: Math.max(1, Math.trunc(level ?? ctx.save.king.level)),
        itemIndex: index,
        createdAt: ctx.now(),
      };
      const item = rollEquipmentOf(ctx.rng(`debug:item:${index}`), lootCtx, { rarity, templateId });
      if (x !== undefined) {
        const fixed = Math.min(config.loot.x.max, Math.max(config.loot.x.min, x));
        for (const stat of Object.keys(item.xValues)) (item.xValues as Record<string, number>)[stat] = fixed;
      }
      addEquipment(ctx.save.inventory, item, ctx.save.heroes);
      ctx.touch();
      return item;
    },
    addConsumable(itemId, quantity) {
      grantShopItem(ctx.save.inventory, itemId, Math.max(0, Math.trunc(quantity)), ctx.now());
      ctx.touch();
      return `+${fmt(Math.trunc(quantity))} × ${itemId}.`;
    },
    setFloor(floor) {
      const target = clampFloor(floor);
      const def = floorDef(target);
      // A Torre exige o nível do Rei da faixa (§46); o debug sobe o nível em vez de burlar a regra.
      const raised = ctx.save.king.level < def.requiredKingLevel;
      if (raised) {
        ctx.save.king.level = def.requiredKingLevel;
        ctx.save.king.xp = 0n;
      }
      ctx.save.tower.currentFloor = target;
      ctx.touch();
      return `Andar ${target} (${def.name})${raised ? ` — Rei elevado ao nível ${fmt(def.requiredKingLevel)}` : ""}; vale a partir da próxima luta.`;
    },
    healAll() {
      for (const h of ctx.save.heroes) fullHp(h);
      ctx.touch();
      return "Todos os heróis com a vida cheia.";
    },
    startBattle() {
      if (state.activeBattle) return "Já há uma luta em curso.";
      state.startTower();
      return "Luta da Torre iniciada.";
    },
    killEnemy() {
      const b = state.activeBattle;
      if (!b) return "Nenhuma luta em curso.";
      for (const e of b.enemies) {
        e.hp = 0;
        e.isDefeated = true;
      }
      state.advanceBattle(100);
      return "Inimigo derrotado.";
    },
    killHero() {
      const b = state.activeBattle;
      if (!b) return "Nenhuma luta em curso.";
      for (const a of b.allies) {
        a.hp = 0;
        a.isDefeated = true;
      }
      state.advanceBattle(100);
      return "Equipe derrotada.";
    },
    startBoss(bossId) {
      const def: BossDef | undefined = bossById(bossId);
      if (!def) throw new Error(`Chefe desconhecido: ${bossId}`);
      if (ctx.save.king.level < def.requiredKingLevel) ctx.save.king.level = def.requiredKingLevel;
      ctx.save.boss.records[def.id] = emptyBossRecord();
      for (const h of state.team) fullHp(h);
      state.startBoss(def.id);
      return `${def.name}: luta iniciada (tentativas zeradas, nível do Rei ajustado se preciso).`;
    },
    resetBossAttempts() {
      for (const def of config.boss.bosses) {
        const rec = recordOf(ctx.save.boss, def.id);
        rec.cooldownUntil = 0;
        rec.windowAttempts = 0;
        rec.windowStartAt = 0;
      }
      ctx.touch();
      return "Recargas e tentativas dos chefes zeradas.";
    },
    testLoot(kills, sourceLevel) {
      const n = Math.min(100_000, Math.max(1, Math.trunc(kills)));
      const level = Math.max(1, Math.trunc(sourceLevel ?? ctx.save.king.level));
      const rng = new Prng((ctx.now() ^ 0x9e3779b9) >>> 0 || 1);
      const byRarity = Object.fromEntries(RARITY_ORDER.map((r) => [r, 0])) as Record<Rarity, number>;
      let drops = 0;
      let xSum = 0;
      let xCount = 0;
      for (let i = 0; i < n; i += 1) {
        const item = rollEquipment(rng, { accountId: ctx.save.king.accountId as never, origin: "drop", source: { kind: "tower_enemy" }, sourceLevel: level, itemIndex: i });
        if (!item) continue;
        drops += 1;
        byRarity[item.rarity] += 1;
        for (const v of Object.values(item.xValues) as number[]) {
          xSum += v;
          xCount += 1;
        }
      }
      return { kills: n, drops, byRarity, avgX: xCount ? xSum / xCount : 0, dropRate: drops / n };
    },
    testOffline(hours) {
      const ms = Math.max(0, hours) * 3_600_000;
      const now = ctx.now();
      ctx.save.king.lastActiveAt = now - ms;
      ctx.save.offline.lastActiveAt = now - ms;
      const r = state.claimOffline();
      return `Ausência simulada de ${hours} h: creditado ${Math.round(r.creditedDurationMs / 60_000)} min${r.wasCapped ? " (teto)" : ""}. Veja o relatório.`;
    },
  };
}

// Reexport útil para o painel.
export type { EquipmentId };
