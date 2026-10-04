/**
 * Inventário, equipamento e venda.
 *
 * §13 — heróis são ILIMITADOS. Não existe `heroLimit` em lugar nenhum do
 * código, e a config declara `heroLimit: null` justamente para que a
 * ausência seja explícita e testável.
 *
 * §39 — "Equipamentos podem ser vendidos por Coin." Venda é irreversível e
 * por isso exige confirmação fora deste módulo: aqui só existe a operação.
 *
 * §70 — o inventário lista o que está EQUIPADO separado do que não está.
 * Equipar não move o item entre listas (`inventory.equipment` guarda TODOS os
 * itens; `hero.equipped` aponta para os usados), o que evita a lista "sumir com
 * o item" ao equipar. A capacidade da mochila conta só os NÃO equipados.
 *
 * ADR-023 — mochila cheia: `inventory.onFull` (autoSell por padrão); venda em
 * massa por filtro; item equipado não é vendido; trocar de item no mesmo slot
 * devolve o anterior à mochila; o HP atual acompanha o HP máximo do equipamento.
 */

import type { CombatStats, Equipment, Hero, Inventory, ItemStack } from "@tia/contracts";
import type { AccountId, EquipmentId, HeroId } from "@tia/contracts";
import { config, RARITY_ORDER, type EquipSlotId, type GearEffect, type Rarity } from "@tia/config";
import { powerOf } from "@tia/engine";
import {
  activeEquipped,
  equipmentPower,
  heroFinalStats,
  heroGearEffects,
  isOrphan,
  meetsRequirement,
  requiredHeroLevel,
  sellPrice,
} from "./gear.js";
import { emptyStats, addStats } from "./creation.js";

export function createInventory(accountId: AccountId): Inventory {
  return { accountId, equipment: [], items: [] };
}

export class InventoryFullError extends Error {
  constructor(max: number) {
    super(`Mochila cheia (${max} itens). ⛔ P-016 — limite provisório, não regra do Master-Prompt.`);
    this.name = "InventoryFullError";
  }
}

/** Ids de todos os itens equipados por algum herói. */
export function equippedIdSet(heroes: readonly Hero[]): Set<string> {
  const out = new Set<string>();
  for (const h of heroes) for (const id of Object.values(h.equipped)) if (id) out.add(id);
  return out;
}

/** Itens na mochila (NÃO equipados) — é isto que a capacidade limita. */
export function bagItems(inv: Inventory, heroes: readonly Hero[]): Equipment[] {
  const used = equippedIdSet(heroes);
  return inv.equipment.filter((e) => !used.has(e.id));
}

export function bagCount(inv: Inventory, heroes: readonly Hero[]): number {
  return bagItems(inv, heroes).length;
}

export function isBagFull(inv: Inventory, heroes: readonly Hero[]): boolean {
  return bagCount(inv, heroes) >= config.inventory.equipmentMaxItems;
}

export function addEquipment(inv: Inventory, item: Equipment, heroes: readonly Hero[] = []): Inventory {
  if (isBagFull(inv, heroes)) throw new InventoryFullError(config.inventory.equipmentMaxItems);
  inv.equipment.push(item);
  return inv;
}

export function removeEquipment(inv: Inventory, id: EquipmentId): Equipment {
  const index = inv.equipment.findIndex((e) => e.id === id);
  if (index < 0) throw new Error(`Equipamento não encontrado: ${id}`);
  const [item] = inv.equipment.splice(index, 1);
  return item!;
}

export function findEquipment(inv: Inventory, id: EquipmentId): Equipment | undefined {
  return inv.equipment.find((e) => e.id === id);
}

/** Preço de venda (⛔ P-008 provisório — dados em `config.equipment.sell`). */
export function sellPriceOf(item: Equipment): bigint {
  return sellPrice(item);
}

export interface StoreResult {
  /** `stored`: foi para a mochila. `autoSold`: vendido na hora. `discarded`: descartado. */
  outcome: "stored" | "autoSold" | "discarded";
  price: bigint;
}

/**
 * Guarda um drop respeitando a política de mochila cheia (`inventory.onFull`).
 * Idle não pode travar nem perder valor em silêncio: o padrão é vender na hora.
 */
export function storeDrop(
  inv: Inventory,
  wallet: { coins: bigint },
  heroes: readonly Hero[],
  item: Equipment,
): StoreResult {
  if (!isBagFull(inv, heroes)) {
    inv.equipment.push(item);
    return { outcome: "stored", price: 0n };
  }
  if (config.inventory.onFull === "autoSell" && config.economy.equipment.sellEnabled) {
    const price = sellPriceOf(item);
    wallet.coins += price;
    return { outcome: "autoSold", price };
  }
  return { outcome: "discarded", price: 0n };
}

export class ItemEquippedError extends Error {
  constructor(id: EquipmentId) {
    super(`Item ${id} está equipado. Desequipe antes de vender.`);
    this.name = "ItemEquippedError";
  }
}

export class ItemLockedError extends Error {
  constructor(id: EquipmentId) {
    super(`Item ${id} está travado (anunciado no mercado).`);
    this.name = "ItemLockedError";
  }
}

/**
 * §39 — vende um item por Coin. A COIN entra na carteira; o item sai.
 * Item equipado ou travado no mercado NÃO é vendido (proteção contra o clique errado).
 * Quem chama já confirmou com o jogador.
 */
export function sellEquipment(
  inv: Inventory,
  wallet: { coins: bigint },
  id: EquipmentId,
  heroes: readonly Hero[] = [],
): { item: Equipment; price: bigint } {
  if (!config.economy.equipment.sellEnabled) {
    throw new Error("Venda de equipamento desabilitada (§39 exige que exista)");
  }
  const found = findEquipment(inv, id);
  if (!found) throw new Error(`Equipamento não encontrado: ${id}`);
  if (found.lockedByListingId) throw new ItemLockedError(id);
  if (equippedIdSet(heroes).has(id)) throw new ItemEquippedError(id);
  const item = removeEquipment(inv, id);
  const price = sellPriceOf(item);
  wallet.coins += price;
  return { item, price };
}

/** Venda em massa pelos ids (pula equipados/travados). */
export function sellMany(
  inv: Inventory,
  wallet: { coins: bigint },
  ids: readonly EquipmentId[],
  heroes: readonly Hero[],
): { sold: Equipment[]; total: bigint; skipped: number } {
  const sold: Equipment[] = [];
  let total = 0n;
  let skipped = 0;
  for (const id of ids) {
    try {
      const r = sellEquipment(inv, wallet, id, heroes);
      sold.push(r.item);
      total += r.price;
    } catch {
      skipped += 1;
    }
  }
  return { sold, total, skipped };
}

/** Filtro de venda em massa: tudo que for NÃO equipado, destravado e abaixo dos limites. */
export interface BulkSaleFilter {
  /** Vende até esta raridade (inclusive). */
  maxRarity: Rarity;
  /** Vende só itens com Nota estritamente menor (0–100). Omitido = qualquer nota. */
  qualityBelow?: number;
  slot?: EquipSlotId;
}

export function selectForBulkSale(inv: Inventory, heroes: readonly Hero[], f: BulkSaleFilter): Equipment[] {
  const maxIdx = RARITY_ORDER.indexOf(f.maxRarity);
  return bagItems(inv, heroes).filter(
    (e) =>
      !e.lockedByListingId &&
      RARITY_ORDER.indexOf(e.rarity) <= maxIdx &&
      (f.qualityBelow === undefined || e.quality < f.qualityBelow) &&
      (f.slot === undefined || e.slot === f.slot),
  );
}

/** Itens de um herói, na ordem dos slots. */
export function equippedItems(inv: Inventory, hero: Hero): Equipment[] {
  const ids = Object.values(hero.equipped) as EquipmentId[];
  return ids
    .map((id) => inv.equipment.find((e) => e.id === id))
    .filter((e): e is Equipment => e !== undefined);
}

export class AlreadyEquippedError extends Error {
  constructor(id: EquipmentId) {
    super(`Item ${id} já está equipado em outro herói.`);
    this.name = "AlreadyEquippedError";
  }
}

export class EquipRequirementError extends Error {
  readonly requiredLevel: number;
  constructor(requiredLevel: number, heroLevel: number) {
    super(`Requer herói nível ${requiredLevel} (o herói está no ${heroLevel}).`);
    this.name = "EquipRequirementError";
    this.requiredLevel = requiredLevel;
  }
}

/**
 * Equipa um item num herói. Um item não pode estar em dois heróis ao mesmo
 * tempo. Se o slot já estiver ocupado, o item anterior é SUBSTITUÍDO (volta
 * para a mochila — sem passo extra de "desequipar"). Exige o nível mínimo do
 * item (⛔ P-033). A afinidade de arma (⛔ P-024) é bônus, NUNCA bloqueio.
 */
export function equipItem(
  inv: Inventory,
  hero: Hero,
  itemId: EquipmentId,
  allHeroes: readonly Hero[],
): { item: Equipment; replaced: Equipment | null } {
  const item = findEquipment(inv, itemId);
  if (!item) throw new Error(`Equipamento não encontrado: ${itemId}`);
  if (isOrphan(item)) throw new Error(`Item sem template no catálogo: ${item.itemTypeId}`);
  if (item.lockedByListingId) throw new ItemLockedError(itemId);
  if (!meetsRequirement(hero, item)) throw new EquipRequirementError(requiredHeroLevel(item), hero.level);

  for (const other of allHeroes) {
    if (other.id === hero.id) continue;
    if (Object.values(other.equipped).includes(itemId)) throw new AlreadyEquippedError(itemId);
  }

  const beforeMaxHp = heroCombatStats(hero, inv).hp;
  const previousId = hero.equipped[item.slot];
  const replaced = previousId && previousId !== itemId ? findEquipment(inv, previousId) ?? null : null;
  hero.equipped[item.slot] = itemId;
  rescaleHeroHp(hero, inv, beforeMaxHp);
  return { item, replaced };
}

export function unequipItem(inv: Inventory, hero: Hero, slot: EquipSlotId): EquipmentId | null {
  const current = hero.equipped[slot];
  if (!current) return null;
  const beforeMaxHp = heroCombatStats(hero, inv).hp;
  delete hero.equipped[slot];
  rescaleHeroHp(hero, inv, beforeMaxHp);
  return current;
}

/**
 * O HP atual acompanha o HP máximo (ADR-023): equipar +300 HP máx. concede +300 HP
 * atuais (e desequipar tira, sem matar: mínimo 1). Herói caído (0) continua caído —
 * trocar de peça não é cura. Evita tanto "equipo e fico com barra vazia" quanto
 * "equipo, desequipo e me curo".
 */
export function rescaleHeroHp(hero: Hero, inv: Inventory, beforeMaxHp: number): void {
  if (hero.currentHp <= 0) return;
  const afterMax = heroCombatStats(hero, inv).hp;
  hero.currentHp = Math.max(1, Math.min(afterMax, hero.currentHp + (afterMax - beforeMaxHp)));
}

/** §71 — "Poder" do herói = poder dos SEUS stats finais. */
export function heroPower(hero: Hero, inv: Inventory): number {
  return Math.round(powerOf(heroCombatStats(hero, inv)));
}

/** Stats finais do herói para entrar em batalha (só equipamento que ele pode usar). */
export function heroCombatStats(hero: Hero, inv: Inventory): CombatStats {
  return heroFinalStats(hero, activeEquipped(inv, hero));
}

/** Efeitos de equipamento que entram no combate do herói. */
export function heroCombatEffects(hero: Hero, inv: Inventory): GearEffect[] {
  return heroGearEffects(activeEquipped(inv, hero));
}

export { equipmentPower };

export { emptyStats, addStats };

/** Itens empilháveis (consumíveis, materiais, fragmentos, moeda). */
export function addStack(inv: Inventory, stack: ItemStack): ItemStack {
  const existing = inv.items.find((s) => s.kind === stack.kind && s.definitionId === stack.definitionId);
  if (existing) {
    existing.quantity += stack.quantity;
    return existing;
  }
  inv.items.push(stack);
  return stack;
}

export function removeStack(inv: Inventory, definitionId: string, quantity: number): boolean {
  const index = inv.items.findIndex((s) => s.definitionId === definitionId);
  if (index < 0) return false;
  const stack = inv.items[index]!;
  if (stack.quantity < quantity) return false;
  stack.quantity -= quantity;
  if (stack.quantity === 0) inv.items.splice(index, 1);
  return true;
}

export function heroById(heroes: readonly Hero[], id: HeroId): Hero | undefined {
  return heroes.find((h) => h.id === id);
}
