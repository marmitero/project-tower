/**
 * Market do Rei (ADR-025): preço, compra, uso de poções/revives, caixas e invocação por fragmentos.
 *
 * Regra pura sobre `Inventory`/`Wallet`/`Hero[]` — sem relógio, sem React. O `GameState` orquestra
 * (tempo, batalha ativa, eventos). Tudo que é número vem de `config.market`/`config.heroAcquisition`.
 *
 * Itens empilháveis moram em `Inventory.items` (`ItemStack`):
 *   - poções, revives e caixas: `kind: "consumable"`, `definitionId = id do item do Market`;
 *   - fragmentos: `kind: "fragment"`, `definitionId = "<classId>:<raridade>"` (por CLASSE e RARIDADE).
 */

import type { Hero, Inventory, ItemStack, King, Wallet } from "@tia/contracts";
import { asAccountId } from "@tia/contracts";
import {
  classes,
  config,
  evalCurve,
  heroById as heroIdentityById,
  type BoxItemDef,
  type ConsumableEffect,
  type ConsumableItemDef,
  type PriceDef,
  type Rarity,
  type ShopItemDef,
} from "@tia/config";
import type { Prng } from "@tia/engine";
import { addStack, removeStack } from "./inventory.js";
import { newItemStackId } from "./ids.js";
import { createAcquiredHero, rollHeroAcquisition } from "./hero-acquisition.js";
import { enemyLevelForFloor, highestUnlockedFloor } from "./tower.js";

export type ShopErrorCode = "unknown_item" | "disabled" | "level_locked" | "bad_quantity" | "insufficient_funds" | "stack_full" | "none_owned" | "not_openable";

export class ShopError extends Error {
  readonly code: ShopErrorCode;
  constructor(code: ShopErrorCode, message: string) {
    super(message);
    this.name = "ShopError";
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Catálogo e preço
// ---------------------------------------------------------------------------

export function shopItemById(id: string): ShopItemDef | undefined {
  return config.market.items.find((i) => i.id === id);
}

export function shopItemsOfTab(tabId: string): ShopItemDef[] {
  return config.market.items.filter((i) => i.tab === tabId);
}

/** Nível de inimigo do andar mais alto que o Rei pode enfrentar: a referência dos preços `perKill`. */
export function priceReferenceLevel(kingLevel: number): number {
  return enemyLevelForFloor(highestUnlockedFloor(kingLevel));
}

/** Coin por abate no nível de referência do Rei (mesma curva da Torre). */
export function coinsPerKillFor(kingLevel: number): number {
  return Math.max(1, evalCurve(config.tower.rewards.coins, priceReferenceLevel(kingLevel)));
}

export function priceFor(price: PriceDef, kingLevel: number): bigint {
  if (price.kind === "fixed") return BigInt(Math.max(1, Math.floor(price.coins)));
  const raw = Math.round(price.kills * coinsPerKillFor(kingLevel));
  return BigInt(Math.max(price.min, raw));
}

export function itemPrice(item: ShopItemDef, kingLevel: number): bigint {
  return priceFor(item.price, kingLevel);
}

// ---------------------------------------------------------------------------
// Pilhas
// ---------------------------------------------------------------------------

export function stackCount(inv: Inventory, definitionId: string): number {
  return inv.items.find((s) => s.definitionId === definitionId)?.quantity ?? 0;
}

export function fragmentKey(classId: string, rarity: Rarity): string {
  return `${classId}:${rarity}`;
}

export function fragmentCount(inv: Inventory, classId: string, rarity: Rarity): number {
  return stackCount(inv, fragmentKey(classId, rarity));
}

function grant(inv: Inventory, kind: ItemStack["kind"], definitionId: string, quantity: number, now: number): void {
  addStack(inv, {
    id: newItemStackId(inv.accountId, inv.items.length, definitionId),
    ownerAccountId: inv.accountId,
    kind,
    definitionId,
    quantity,
    acquiredAt: now,
  });
}

/** Entrega fragmentos (caixa, Boss, evento). Nunca de inimigo comum da Torre (§12). */
export function grantFragments(inv: Inventory, classId: string, rarity: Rarity, amount: number, now: number): void {
  if (amount > 0) grant(inv, "fragment", fragmentKey(classId, rarity), amount, now);
}

/** Entrega itens do Market (admin/eventos/testes). Respeita `maxStack`. */
export function grantShopItem(inv: Inventory, itemId: string, quantity: number, now: number): void {
  if (!shopItemById(itemId)) throw new ShopError("unknown_item", `Item desconhecido: ${itemId}`);
  const room = Math.max(0, config.market.maxStack - stackCount(inv, itemId));
  const q = Math.min(quantity, room);
  if (q > 0) grant(inv, "consumable", itemId, q, now);
}

// ---------------------------------------------------------------------------
// Compra
// ---------------------------------------------------------------------------

export interface PurchaseResult {
  item: ShopItemDef;
  quantity: number;
  cost: bigint;
}

/** Por que o item não pode ser comprado AGORA (para a UI mostrar o botão desligado com motivo). */
export function purchaseBlock(item: ShopItemDef, king: Pick<King, "level">, inv: Inventory): ShopError | null {
  if (!item.enabled) return new ShopError("disabled", `${item.name} não está à venda.`);
  if (king.level < item.requiredKingLevel) return new ShopError("level_locked", `${item.name} exige o Rei no nível ${item.requiredKingLevel}.`);
  if (stackCount(inv, item.id) >= config.market.maxStack) return new ShopError("stack_full", `Você já tem o máximo de ${item.name}.`);
  return null;
}

/**
 * Compra `quantity` unidades pagando Coin. Atômica: valida tudo antes de mexer em qualquer coisa.
 * O preço é calculado no momento da compra (nível atual do Rei).
 */
export function buyShopItem(inv: Inventory, wallet: Wallet, king: Pick<King, "level">, itemId: string, quantity: number, now: number): PurchaseResult {
  const item = shopItemById(itemId);
  if (!item) throw new ShopError("unknown_item", `Item desconhecido: ${itemId}`);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > config.market.maxQtyPerPurchase) {
    throw new ShopError("bad_quantity", `Quantidade inválida (1 a ${config.market.maxQtyPerPurchase}).`);
  }
  const blocked = purchaseBlock(item, king, inv);
  if (blocked) throw blocked;
  if (stackCount(inv, item.id) + quantity > config.market.maxStack) {
    throw new ShopError("stack_full", `A mochila guarda no máximo ${config.market.maxStack} de ${item.name}.`);
  }
  const cost = itemPrice(item, king.level) * BigInt(quantity);
  if (wallet.coins < cost) throw new ShopError("insufficient_funds", `Faltam ${(cost - wallet.coins).toString()} Coin.`);
  wallet.coins -= cost;
  grant(inv, "consumable", item.id, quantity, now);
  return { item, quantity, cost };
}

// ---------------------------------------------------------------------------
// Poções e revives
// ---------------------------------------------------------------------------

/** HP que o efeito entrega num herói com `maxHp`. */
export function effectAmount(effect: ConsumableEffect, maxHp: number): number {
  if (effect.kind === "healFlat") return Math.floor(effect.amount);
  return Math.max(1, Math.floor(maxHp * effect.pct));
}

export function consumableById(id: string): ConsumableItemDef | undefined {
  const it = shopItemById(id);
  return it && it.kind === "consumable" ? it : undefined;
}

/** Itens de cura (poções de HP) que o jogador tem, do que cura menos ao que cura mais (para este `maxHp`). */
export function ownedPotions(inv: Inventory, maxHp: number): { item: ConsumableItemDef; count: number; amount: number }[] {
  const out: { item: ConsumableItemDef; count: number; amount: number }[] = [];
  for (const it of config.market.items) {
    if (it.kind !== "consumable" || it.effect.kind === "revivePct") continue;
    const count = stackCount(inv, it.id);
    if (count > 0) out.push({ item: it, count, amount: effectAmount(it.effect, maxHp) });
  }
  return out.sort((a, b) => a.amount - b.amount);
}

export function ownedRevives(inv: Inventory, maxHp: number): { item: ConsumableItemDef; count: number; amount: number }[] {
  const out: { item: ConsumableItemDef; count: number; amount: number }[] = [];
  for (const it of config.market.items) {
    if (it.kind !== "consumable" || it.effect.kind !== "revivePct") continue;
    const count = stackCount(inv, it.id);
    if (count > 0) out.push({ item: it, count, amount: effectAmount(it.effect, maxHp) });
  }
  return out.sort((a, b) => a.amount - b.amount);
}

/**
 * Escolha do Bot. "auto" = a MENOR poção que cura o que falta (menos desperdício); se nenhuma
 * cobre, a MAIOR que houver. Id específico = só aquela (se houver estoque).
 */
export function pickPotion(inv: Inventory, setting: string, missingHp: number, maxHp: number): ConsumableItemDef | null {
  const owned = ownedPotions(inv, maxHp);
  if (owned.length === 0) return null;
  if (setting !== "auto") return owned.find((o) => o.item.id === setting)?.item ?? null;
  const enough = owned.find((o) => o.amount >= missingHp);
  return (enough ?? owned[owned.length - 1])!.item;
}

/** "auto" = o revive de MENOR % que houver (o mais barato). */
export function pickRevive(inv: Inventory, setting: string, maxHp: number): ConsumableItemDef | null {
  const owned = ownedRevives(inv, maxHp);
  if (owned.length === 0) return null;
  if (setting !== "auto") return owned.find((o) => o.item.id === setting)?.item ?? null;
  return owned[0]!.item;
}

/** Consome 1 unidade. Devolve false se não havia. */
export function spendOne(inv: Inventory, itemId: string): boolean {
  return removeStack(inv, itemId, 1);
}

// ---------------------------------------------------------------------------
// Caixas
// ---------------------------------------------------------------------------

export type BoxResult =
  | { kind: "fragments"; classId: string; rarity: Rarity; amount: number }
  | { kind: "hero"; hero: Hero };

export interface BoxDraw {
  kind: "fragments" | "hero";
  rarity: Rarity;
  classId: string;
  /** Só para `fragments`. */
  amount: number;
}

/**
 * Um sorteio da caixa. A classe é UNIFORME entre as classes do catálogo — a mesma regra para
 * qualquer herói (ADR-024: aquisição balanceada independente de classe). Ordem fixa dos números
 * (determinismo): desfecho → classe → quantidade.
 */
export function drawBox(rng: Prng, box: BoxItemDef): BoxDraw {
  const idx = rng.weightedIndex(box.outcomes.map((o) => o.weight));
  const outcome = box.outcomes[Math.max(0, idx)]!;
  const cls = classes[rng.int(0, classes.length - 1)]!;
  const amount = outcome.kind === "fragments" ? rng.int(box.fragments.min, box.fragments.max) : 0;
  return { kind: outcome.kind, rarity: outcome.rarity, classId: cls.id, amount };
}

/** Nome do herói de uma classe (identidade do catálogo). */
export function heroNameForClass(classId: string): string {
  return Object.values(heroIdentityById).find((h) => h.classId === classId)?.name ?? classId;
}

export interface BoxOpening {
  box: BoxItemDef;
  results: BoxResult[];
}

/**
 * Abre `quantity` caixas que o jogador possui. `rngFor(i)` dá o PRNG da i-ésima abertura
 * (a semente vem do contador persistido — não repete ao recarregar). Heróis completos entram em
 * `heroes`; fragmentos entram em `inv`. Atômica na validação; o sorteio não falha depois dela.
 */
export function openBoxes(params: {
  inv: Inventory;
  heroes: Hero[];
  boxId: string;
  quantity: number;
  rngFor: (i: number) => Prng;
  now: number;
}): BoxOpening {
  const { inv, heroes, boxId, quantity, rngFor, now } = params;
  const item = shopItemById(boxId);
  if (!item || item.kind !== "box") throw new ShopError("not_openable", `Não é uma caixa: ${boxId}`);
  if (!Number.isInteger(quantity) || quantity < 1) throw new ShopError("bad_quantity", "Quantidade inválida.");
  if (stackCount(inv, boxId) < quantity) throw new ShopError("none_owned", `Você não tem ${quantity}× ${item.name}.`);
  removeStack(inv, boxId, quantity);

  const results: BoxResult[] = [];
  for (let i = 0; i < quantity; i += 1) {
    const rng = rngFor(i);
    const draw = drawBox(rng, item);
    if (draw.kind === "fragments") {
      grantFragments(inv, draw.classId, draw.rarity, draw.amount, now);
      results.push({ kind: "fragments", classId: draw.classId, rarity: draw.rarity, amount: draw.amount });
    } else {
      const hero = createHeroOfRarity({ accountId: inv.accountId, classId: draw.classId, rarity: draw.rarity, rng, origin: "summon", heroes, now });
      heroes.push(hero);
      results.push({ kind: "hero", hero });
    }
  }
  return { box: item, results };
}

// ---------------------------------------------------------------------------
// Invocação por fragmentos (craft/summon, §12)
// ---------------------------------------------------------------------------

/** Cria um herói completo de uma raridade (atributos rolados pela regra de aquisição, ADR-024). */
export function createHeroOfRarity(params: {
  accountId: string;
  classId: string;
  rarity: Rarity;
  rng: Prng;
  origin: "boss" | "event" | "summon" | "market" | "admin";
  heroes: readonly Hero[];
  now: number;
}): Hero {
  const roll = rollHeroAcquisition(params.rng, params.classId, params.rarity);
  return createAcquiredHero({
    accountId: asAccountId(params.accountId),
    name: heroNameForClass(params.classId),
    roll,
    origin: params.origin,
    now: params.now,
    index: params.heroes.length,
  });
}

export function fragmentsRequired(rarity: Rarity): number {
  return config.heroAcquisition.fragmentsRequired[rarity];
}

/** Gasta os fragmentos e cria o herói (`origin: "summon"`). */
export function summonFromFragments(params: {
  inv: Inventory;
  heroes: Hero[];
  classId: string;
  rarity: Rarity;
  rng: Prng;
  now: number;
}): Hero {
  const { inv, heroes, classId, rarity, rng, now } = params;
  if (!classes.some((c) => c.id === classId)) throw new ShopError("unknown_item", `Classe desconhecida: ${classId}`);
  const need = fragmentsRequired(rarity);
  if (fragmentCount(inv, classId, rarity) < need) throw new ShopError("none_owned", `Faltam fragmentos (${fragmentCount(inv, classId, rarity)}/${need}).`);
  removeStack(inv, fragmentKey(classId, rarity), need);
  const hero = createHeroOfRarity({ accountId: inv.accountId, classId, rarity, rng, origin: "summon", heroes, now });
  heroes.push(hero);
  return hero;
}

/** Resumo para a UI: fragmentos que o jogador tem (por classe/raridade), com a meta de invocação. */
export function fragmentSummary(inv: Inventory): { classId: string; rarity: Rarity; count: number; required: number }[] {
  const out: { classId: string; rarity: Rarity; count: number; required: number }[] = [];
  for (const s of inv.items) {
    if (s.kind !== "fragment") continue;
    const [classId, rarity] = s.definitionId.split(":") as [string, Rarity];
    out.push({ classId, rarity, count: s.quantity, required: fragmentsRequired(rarity) });
  }
  return out;
}
