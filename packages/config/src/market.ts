/**
 * Market (loja do Rei, vende por Coin) como DADO — ADR-025, regra AR (ADR-022).
 *
 * Não confundir com o "Mercado" entre jogadores (`docs/MARKET_SYSTEM.md`, taxa de 15%,
 * server-authoritative, fase própria): este é o Market do NPC — o jogador paga Coin e
 * recebe itens. Aqui ficam as abas, os itens (poções, revives, caixas), os preços e as
 * tabelas de sorteio das caixas. Nada é função e nada é literal na lógica: o futuro
 * Painel Administrativo edita `config.market` pelo `ContentPack` (v3) e o jogo reavalia.
 *
 * Preço (`PriceDef`):
 *  - `fixed`   — Coin fixa (poções de HP fixo: úteis só numa faixa de nível, então o preço
 *                fixo se auto-regula: ficam baratas e irrelevantes quando o nível passa);
 *  - `perKill` — N abates do andar mais alto que o Rei pode enfrentar (mesma curva de Coin da
 *                Torre, `tower.rewards.coins`), com piso `min`. Acompanha a economia sozinho:
 *                um item de 30% de HP custa o mesmo EM TEMPO DE JOGO no nível 100 e no 10.000.
 *
 * Caixas (§11/§12 do Master-Prompt): são um SEGUNDO meio de obter heróis, para níveis altos —
 * por isso exigem nível do Rei e custam muitos abates. A fonte principal é o Boss (Fase 12).
 */

import type { Rarity } from "./types.js";
import { RARITY_ORDER } from "./rarity.js";

export type PriceDef =
  | { kind: "fixed"; coins: number }
  /** `coins = max(min, round(kills × Coin por abate no andar mais alto liberado))`. */
  | { kind: "perKill"; kills: number; min: number };

export type ConsumableEffect =
  /** Cura HP fixo (limitado ao HP faltante). */
  | { kind: "healFlat"; amount: number }
  /** Cura uma fração do HP máximo. */
  | { kind: "healPct"; pct: number }
  /** Revive um herói caído com esta fração do HP máximo. */
  | { kind: "revivePct"; pct: number };

export interface MarketTabDef {
  id: string;
  name: string;
}

interface ShopItemBase {
  id: string;
  name: string;
  /** Id de uma aba em `market.tabs`. */
  tab: string;
  description: string;
  /** Só cor/ênfase na UI. */
  rarity: Rarity;
  /** Id de ícone do manifesto de assets. */
  iconId: string;
  price: PriceDef;
  /** Nível do Rei mínimo para comprar (1 = livre). */
  requiredKingLevel: number;
  /** Desligar tira da loja sem apagar (o que o jogador já tem continua usável). */
  enabled: boolean;
}

export interface ConsumableItemDef extends ShopItemBase {
  kind: "consumable";
  effect: ConsumableEffect;
}

/** Um resultado possível de abrir a caixa (sorteio por `weight`). */
export interface BoxOutcome {
  /** `fragments`: N fragmentos de um herói (classe sorteada) dessa raridade; `hero`: o herói completo. */
  kind: "fragments" | "hero";
  rarity: Rarity;
  weight: number;
}

export interface BoxItemDef extends ShopItemBase {
  kind: "box";
  /** Quantos fragmentos vêm quando o sorteio dá `fragments`. */
  fragments: { min: number; max: number };
  outcomes: BoxOutcome[];
}

export type ShopItemDef = ConsumableItemDef | BoxItemDef;

export interface MarketConfig {
  tabs: MarketTabDef[];
  items: ShopItemDef[];
  /** Máximo por compra (anti-clique acidental e limite de UI). */
  maxQtyPerPurchase: number;
  /** Máximo de unidades de um mesmo item na mochila. */
  maxStack: number;
}

const POTIONS = "potions";
const REVIVES = "revives";
const BOXES = "boxes";

function potion(id: string, name: string, description: string, rarity: Rarity, iconId: string, effect: ConsumableEffect, price: PriceDef): ConsumableItemDef {
  return { kind: "consumable", id, name, tab: POTIONS, description, rarity, iconId, effect, price, requiredKingLevel: 1, enabled: true };
}
function revive(id: string, name: string, description: string, rarity: Rarity, iconId: string, pct: number, price: PriceDef): ConsumableItemDef {
  return { kind: "consumable", id, name, tab: REVIVES, description, rarity, iconId, effect: { kind: "revivePct", pct }, price, requiredKingLevel: 1, enabled: true };
}

/**
 * Preços — ⛔ P-008/P-036 (provisório, calibrado em `docs/BALANCE_REPORT.md`):
 *  - HP fixo: ~0,7–2,4 Coin por HP, subindo com o tier (conveniência). Na faixa de nível em que
 *    cada poção é relevante (HP do herói: nv 1 ≈ 150, nv 100 ≈ 1.800, nv 500 ≈ 8.000) custa
 *    de ~1 a ~3 abates.
 *  - % de HP e revives: em ABATES (`perKill`), então acompanham a economia.
 *  - Caixas: milhares de abates, com nível mínimo — "extremamente caras".
 */
export function defaultMarketItems(): ShopItemDef[] {
  return [
    // ---- Poções ----------------------------------------------------------------------------
    potion("potion_basic", "Poção Básica", "Recupera 60 de vida.", "common", "icons1/icons_potions_8", { kind: "healFlat", amount: 60 }, { kind: "fixed", coins: 45 }),
    potion("potion_modest", "Poção Modesta", "Recupera 150 de vida.", "uncommon", "icons1/icons_potions_0", { kind: "healFlat", amount: 150 }, { kind: "fixed", coins: 130 }),
    potion("potion_improved", "Poção Melhorada", "Recupera 400 de vida.", "rare", "icons1/icons_potions_6", { kind: "healFlat", amount: 400 }, { kind: "fixed", coins: 380 }),
    potion("potion_rare", "Poção Rara", "Recupera 800 de vida.", "rare", "icons1/icons_potions_5", { kind: "healFlat", amount: 800 }, { kind: "fixed", coins: 1100 }),
    potion("potion_epic", "Poção Épica", "Recupera 1.000 de vida.", "epic", "icons1/icons_potions_4", { kind: "healFlat", amount: 1000 }, { kind: "fixed", coins: 1500 }),
    potion("potion_legendary", "Poção Lendária", "Recupera 2.500 de vida.", "legendary", "icons2/icons_potions_14", { kind: "healFlat", amount: 2500 }, { kind: "fixed", coins: 4000 }),
    potion("potion_magic", "Poção Mágica", "Recupera 30% da vida máxima.", "rare", "icons1/icons_potions_1", { kind: "healPct", pct: 0.3 }, { kind: "perKill", kills: 6, min: 150 }),
    potion("potion_magic_rare", "Poção Mágica Rara", "Recupera 50% da vida máxima.", "epic", "icons1/icons_potions_7", { kind: "healPct", pct: 0.5 }, { kind: "perKill", kills: 12, min: 400 }),
    potion("potion_magic_supreme", "Poção Mágica Suprema", "Recupera 100% da vida máxima.", "legendary", "icons2/icons_potions_11", { kind: "healPct", pct: 1 }, { kind: "perKill", kills: 30, min: 1000 }),
    // ---- Revives ---------------------------------------------------------------------------
    revive("revive_basic", "Poção de Reviver Básica", "Revive o personagem com 30% da vida.", "uncommon", "items/revive_basic", 0.3, { kind: "perKill", kills: 8, min: 200 }),
    revive("revive_improved", "Poção de Reviver Melhorada", "Revive o personagem com 50% da vida.", "epic", "items/revive_improved", 0.5, { kind: "perKill", kills: 20, min: 500 }),
    revive("revive_magic", "Poção de Reviver Mágica", "Revive o personagem com 100% da vida.", "legendary", "items/revive_magic", 1, { kind: "perKill", kills: 60, min: 1500 }),
    // ---- Caixas ----------------------------------------------------------------------------
    {
      kind: "box",
      id: "box_basic",
      name: "Caixa Básica",
      tab: BOXES,
      description: "Sorteia fragmentos de heróis Comuns. Chance pequena de um herói Comum completo e minúscula de um Raro.",
      rarity: "common",
      iconId: "items/box_basic",
      price: { kind: "perKill", kills: 800, min: 100_000 },
      requiredKingLevel: 250,
      enabled: true,
      fragments: { min: 1, max: 3 },
      outcomes: [
        { kind: "fragments", rarity: "common", weight: 934 },
        { kind: "hero", rarity: "common", weight: 60 },
        { kind: "hero", rarity: "rare", weight: 6 },
      ],
    },
    {
      kind: "box",
      id: "box_rare",
      name: "Caixa Rara",
      tab: BOXES,
      description: "Sorteia fragmentos de heróis Raros. Chance pequena de um herói Raro completo e minúscula de um Épico.",
      rarity: "rare",
      iconId: "items/box_rare",
      price: { kind: "perKill", kills: 3000, min: 1_000_000 },
      requiredKingLevel: 1500,
      enabled: true,
      fragments: { min: 1, max: 3 },
      outcomes: [
        { kind: "fragments", rarity: "rare", weight: 944 },
        { kind: "hero", rarity: "rare", weight: 50 },
        { kind: "hero", rarity: "epic", weight: 6 },
      ],
    },
    {
      kind: "box",
      id: "box_legendary",
      name: "Caixa Lendária",
      tab: BOXES,
      description: "Sorteia fragmentos de heróis Lendários. Chance pequena de um herói Lendário completo.",
      rarity: "legendary",
      iconId: "items/box_legendary",
      price: { kind: "perKill", kills: 8000, min: 10_000_000 },
      requiredKingLevel: 5000,
      enabled: true,
      fragments: { min: 1, max: 3 },
      outcomes: [
        { kind: "fragments", rarity: "legendary", weight: 970 },
        { kind: "hero", rarity: "legendary", weight: 30 },
      ],
    },
  ];
}

export function defaultMarketConfig(): MarketConfig {
  return {
    tabs: [
      { id: POTIONS, name: "Poções" },
      { id: REVIVES, name: "Revives" },
      { id: BOXES, name: "Caixas" },
    ],
    items: defaultMarketItems(),
    maxQtyPerPurchase: 99,
    maxStack: 9999,
  };
}

// ---------------------------------------------------------------------------
// Bot (automação do jogador) e Offline — também dado (ADR-025/026)
// ---------------------------------------------------------------------------

/** Opções que o JOGADOR configura (persistem no save). */
export interface BotSettings {
  autoPotion: {
    enabled: boolean;
    /** Bebe quando o HP do herói em luta cai abaixo desta % do máximo. */
    hpBelowPct: number;
    /** Id de poção de `market.items`, ou "auto" (a menor que cura o que falta; senão a maior que houver). */
    itemId: string;
  };
  autoRevive: {
    enabled: boolean;
    /** Id de revive de `market.items`, ou "auto" (o de menor % que houver). */
    itemId: string;
  };
  /** Derrotado ⇒ recupera no Hub sozinho e volta ao mesmo andar (online e offline). */
  autoReturnFromHub: boolean;
}

/** Regras do jogo para o Bot e o Hub (editáveis). */
export interface BotConfig {
  defaults: BotSettings;
  /** Intervalo mínimo entre duas poções na mesma luta (tempo de BATALHA, ms). */
  potionCooldownMs: number;
  /** Teto de poções por luta (não esvazia a mochila numa luta perdida). */
  maxPotionsPerBattle: number;
  /** Teto de revives por luta (uma luta perdida não esvazia o estoque de revives). */
  maxRevivesPerBattle: number;
  /** Tempo de recuperação no Hub depois de cair (ms). */
  hubRecoveryMs: number;
  /** Faixa permitida para o limite de HP do jogador (%). */
  hpThresholdMinPct: number;
  hpThresholdMaxPct: number;
}

export interface OfflineConfig {
  /** §48 — Free: 2 h. */
  capFreeMs: number;
  /** §48 — VIP: 8 h. */
  capVipMs: number;
  /** Ausências menores que isto não rodam simulação (troca de aba). */
  minAwayMs: number;
  /** Trava de segurança do laço da simulação (iterações). */
  maxSimulatedSteps: number;
}

export function defaultBotConfig(): BotConfig {
  return {
    defaults: {
      autoPotion: { enabled: true, hpBelowPct: 40, itemId: "auto" },
      autoRevive: { enabled: true, itemId: "auto" },
      autoReturnFromHub: true,
    },
    potionCooldownMs: 2500,
    maxPotionsPerBattle: 6,
    maxRevivesPerBattle: 2,
    hubRecoveryMs: 60_000,
    hpThresholdMinPct: 5,
    hpThresholdMaxPct: 95,
  };
}

export function defaultOfflineConfig(): OfflineConfig {
  return {
    capFreeMs: 2 * 60 * 60 * 1000,
    capVipMs: 8 * 60 * 60 * 1000,
    minAwayMs: 30_000,
    maxSimulatedSteps: 2_000_000,
  };
}

// ---------------------------------------------------------------------------
// Validação
// ---------------------------------------------------------------------------

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function priceErrors(path: string, p: unknown): string[] {
  if (typeof p !== "object" || p === null) return [`${path}: preço ausente`];
  const price = p as Partial<PriceDef> & { coins?: unknown; kills?: unknown; min?: unknown };
  if (price.kind === "fixed") return isNum(price.coins) && Number.isInteger(price.coins) && price.coins >= 1 ? [] : [`${path}.coins deve ser inteiro >= 1`];
  if (price.kind === "perKill") {
    const e: string[] = [];
    if (!isNum(price.kills) || price.kills <= 0) e.push(`${path}.kills deve ser > 0`);
    if (!isNum(price.min) || !Number.isInteger(price.min) || price.min < 1) e.push(`${path}.min deve ser inteiro >= 1`);
    return e;
  }
  return [`${path}.kind deve ser "fixed" ou "perKill"`];
}

export function marketErrors(m: unknown): string[] {
  const errors: string[] = [];
  if (typeof m !== "object" || m === null) return ["market ausente"];
  const c = m as Partial<MarketConfig>;
  const check = (cond: boolean, msg: string) => {
    if (!cond) errors.push(msg);
  };
  check(isNum(c.maxQtyPerPurchase) && Number.isInteger(c.maxQtyPerPurchase) && c.maxQtyPerPurchase >= 1, "market.maxQtyPerPurchase deve ser inteiro >= 1");
  check(isNum(c.maxStack) && Number.isInteger(c.maxStack) && c.maxStack >= 1, "market.maxStack deve ser inteiro >= 1");
  const tabIds = new Set<string>();
  if (!Array.isArray(c.tabs) || c.tabs.length === 0) errors.push("market.tabs deve ser uma lista não vazia");
  else {
    for (const [i, t] of c.tabs.entries()) {
      check(!!t && typeof t.id === "string" && /^[a-z0-9_]+$/.test(t.id), `market.tabs[${i}].id deve ser [a-z0-9_]+`);
      check(!!t && typeof t.name === "string" && t.name.length > 0, `market.tabs[${i}].name vazio`);
      if (t?.id) {
        check(!tabIds.has(t.id), `market.tabs[${i}]: id duplicado "${t.id}"`);
        tabIds.add(t.id);
      }
    }
  }
  if (!Array.isArray(c.items)) {
    errors.push("market.items deve ser uma lista");
    return errors;
  }
  const ids = new Set<string>();
  for (const [i, it] of c.items.entries()) {
    const at = `market.items[${i}]${it && typeof it.id === "string" ? ` (${it.id})` : ""}`;
    if (!it || typeof it !== "object") {
      errors.push(`${at}: inválido`);
      continue;
    }
    check(typeof it.id === "string" && /^[a-z0-9_]+$/.test(it.id), `${at}: id deve ser [a-z0-9_]+`);
    check(!ids.has(it.id), `${at}: id duplicado`);
    ids.add(it.id);
    check(typeof it.name === "string" && it.name.length > 0, `${at}: name vazio`);
    check(tabIds.has(it.tab), `${at}: aba desconhecida "${String(it.tab)}"`);
    check(RARITY_ORDER.includes(it.rarity), `${at}: rarity inválida`);
    check(typeof it.iconId === "string" && it.iconId.length > 0, `${at}: iconId vazio`);
    check(isNum(it.requiredKingLevel) && Number.isInteger(it.requiredKingLevel) && it.requiredKingLevel >= 1, `${at}: requiredKingLevel deve ser inteiro >= 1`);
    check(typeof it.enabled === "boolean", `${at}: enabled deve ser booleano`);
    errors.push(...priceErrors(`${at}.price`, it.price));
    if (it.kind === "consumable") {
      const e = it.effect;
      if (!e) errors.push(`${at}: effect ausente`);
      else if (e.kind === "healFlat") check(isNum(e.amount) && e.amount > 0, `${at}.effect.amount deve ser > 0`);
      else if (e.kind === "healPct" || e.kind === "revivePct") check(isNum(e.pct) && e.pct > 0 && e.pct <= 1, `${at}.effect.pct deve estar em (0, 1]`);
      else errors.push(`${at}.effect.kind inválido`);
    } else if (it.kind === "box") {
      const f = it.fragments;
      check(!!f && isNum(f.min) && Number.isInteger(f.min) && f.min >= 1 && isNum(f.max) && Number.isInteger(f.max) && f.max >= f.min, `${at}.fragments: min >= 1 e max >= min (inteiros)`);
      if (!Array.isArray(it.outcomes) || it.outcomes.length === 0) errors.push(`${at}.outcomes deve ser uma lista não vazia`);
      else {
        let total = 0;
        for (const [j, o] of it.outcomes.entries()) {
          check(o.kind === "fragments" || o.kind === "hero", `${at}.outcomes[${j}].kind inválido`);
          check(RARITY_ORDER.includes(o.rarity), `${at}.outcomes[${j}].rarity inválida`);
          check(isNum(o.weight) && o.weight > 0, `${at}.outcomes[${j}].weight deve ser > 0`);
          if (isNum(o.weight)) total += o.weight;
        }
        check(total > 0, `${at}.outcomes: soma dos pesos deve ser > 0`);
      }
    } else {
      errors.push(`${at}: kind deve ser "consumable" ou "box"`);
    }
  }
  return errors;
}

export function botErrors(b: unknown, market?: MarketConfig): string[] {
  const errors: string[] = [];
  if (typeof b !== "object" || b === null) return ["bot ausente"];
  const c = b as Partial<BotConfig>;
  const check = (cond: boolean, msg: string) => {
    if (!cond) errors.push(msg);
  };
  check(isNum(c.potionCooldownMs) && c.potionCooldownMs >= 0, "bot.potionCooldownMs deve ser >= 0");
  check(isNum(c.maxRevivesPerBattle) && Number.isInteger(c.maxRevivesPerBattle) && c.maxRevivesPerBattle >= 0, "bot.maxRevivesPerBattle deve ser inteiro >= 0");
  check(isNum(c.maxPotionsPerBattle) && Number.isInteger(c.maxPotionsPerBattle) && c.maxPotionsPerBattle >= 0, "bot.maxPotionsPerBattle deve ser inteiro >= 0");
  check(isNum(c.hubRecoveryMs) && c.hubRecoveryMs >= 0, "bot.hubRecoveryMs deve ser >= 0");
  check(isNum(c.hpThresholdMinPct) && isNum(c.hpThresholdMaxPct) && c.hpThresholdMinPct >= 1 && c.hpThresholdMaxPct <= 100 && c.hpThresholdMinPct <= c.hpThresholdMaxPct, "bot.hpThreshold*Pct: 1 <= min <= max <= 100");
  const d = c.defaults;
  if (!d || !d.autoPotion || !d.autoRevive) errors.push("bot.defaults incompleto");
  else {
    check(typeof d.autoPotion.enabled === "boolean" && typeof d.autoRevive.enabled === "boolean" && typeof d.autoReturnFromHub === "boolean", "bot.defaults: flags devem ser booleanas");
    check(isNum(d.autoPotion.hpBelowPct) && d.autoPotion.hpBelowPct >= (c.hpThresholdMinPct ?? 1) && d.autoPotion.hpBelowPct <= (c.hpThresholdMaxPct ?? 100), "bot.defaults.autoPotion.hpBelowPct fora da faixa permitida");
    if (market) {
      const ok = (id: string, effect: ConsumableEffect["kind"][]) => id === "auto" || market.items.some((i) => i.kind === "consumable" && i.id === id && effect.includes(i.effect.kind));
      check(ok(d.autoPotion.itemId, ["healFlat", "healPct"]), "bot.defaults.autoPotion.itemId não é uma poção do Market");
      check(ok(d.autoRevive.itemId, ["revivePct"]), "bot.defaults.autoRevive.itemId não é um revive do Market");
    }
  }
  return errors;
}

export function offlineErrors(o: unknown): string[] {
  const errors: string[] = [];
  if (typeof o !== "object" || o === null) return ["offline ausente"];
  const c = o as Partial<OfflineConfig>;
  const check = (cond: boolean, msg: string) => {
    if (!cond) errors.push(msg);
  };
  check(isNum(c.capFreeMs) && c.capFreeMs >= 0, "offline.capFreeMs deve ser >= 0");
  check(isNum(c.capVipMs) && c.capVipMs >= (c.capFreeMs ?? 0), "offline.capVipMs deve ser >= capFreeMs");
  check(isNum(c.minAwayMs) && c.minAwayMs >= 0, "offline.minAwayMs deve ser >= 0");
  check(isNum(c.maxSimulatedSteps) && Number.isInteger(c.maxSimulatedSteps) && c.maxSimulatedSteps >= 1000, "offline.maxSimulatedSteps deve ser inteiro >= 1000");
  return errors;
}
