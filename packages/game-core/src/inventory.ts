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
 * Equipar não move o item entre listas; ele aparece nas duas, o que evita a
 * lista "sumir com o item" ao equipar.
 */

import type { CombatStats, Equipment, Hero, Inventory, ItemStack } from "@tia/contracts";
import type { AccountId, EquipmentId, HeroId } from "@tia/contracts";
import { config, type EquipSlotId } from "@tia/config";
import { powerOf } from "@tia/engine";
import { heroFinalStats, equipmentPower } from "./loot.js";
import { emptyStats, addStats } from "./creation.js";

export function createInventory(accountId: AccountId): Inventory {
  return { accountId, equipment: [], items: [] };
}

export class InventoryFullError extends Error {
  constructor(max: number) {
    super(`Inventário cheio (${max}). ⛔ P-016 — limite provisório, não regra do Master-Prompt.`);
    this.name = "InventoryFullError";
  }
}

export function addEquipment(inv: Inventory, item: Equipment): Inventory {
  if (inv.equipment.length >= config.inventory.equipmentMaxItems) {
    throw new InventoryFullError(config.inventory.equipmentMaxItems);
  }
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

/** Preço de venda. ⛔ P-008 provisório — fórmula está na config. */
export function sellPriceOf(item: Equipment): bigint {
  return BigInt(config.economy.equipment.sellPrice(item.rarity, equipmentPower(item)));
}

/**
 * §39 — vende um item por Coin. A COIN entra na carteira; o item sai.
 * Não há "venda parcial" nem "venda com confirmação": quem chama, já
 * confirmou com o jogador.
 */
export function sellEquipment(
  inv: Inventory,
  wallet: { coins: bigint },
  id: EquipmentId,
): { item: Equipment; price: bigint } {
  if (!config.economy.equipment.sellEnabled) {
    throw new Error("Venda de equipamento desabilitada (§39 exige que exista)");
  }
  const item = removeEquipment(inv, id);
  const price = sellPriceOf(item);
  wallet.coins += price;
  return { item, price };
}

/** Itens de um herói, na ordem dos slots. */
export function equippedItems(inv: Inventory, hero: Hero): Equipment[] {
  const ids = Object.values(hero.equipped) as EquipmentId[];
  return ids
    .map((id) => inv.equipment.find((e) => e.id === id))
    .filter((e): e is Equipment => e !== undefined);
}

export class SlotOccupiedError extends Error {
  constructor(slot: EquipSlotId) {
    super(`Slot ${slot} já está ocupado. Desequipar antes.`);
    this.name = "SlotOccupiedError";
  }
}

export class AlreadyEquippedError extends Error {
  constructor(id: EquipmentId) {
    super(`Item ${id} já está equipado em outro herói.`);
    this.name = "AlreadyEquippedError";
  }
}

/**
 * Equipa um item num herói.
 *
 * Um item não pode estar em dois heróis ao mesmo tempo — é o que torna
 * "equipar" uma operação com dono, e não um campo livre.
 */
export function equipItem(
  inv: Inventory,
  hero: Hero,
  itemId: EquipmentId,
  allHeroes: readonly Hero[],
): Equipment {
  const item = findEquipment(inv, itemId);
  if (!item) throw new Error(`Equipamento não encontrado: ${itemId}`);

  // ⛔ P-024 — a afinidade de arma é um TRAÇO de classe, não uma restrição.
  // Equipar uma arma fora da afinidade é permitido; o que muda é o traço
  // (Contracorte +10pp de crítico só vale para espada, e assim por diante).
  // Bloquear aqui transformaria uma preferência de build numa parede.

  for (const other of allHeroes) {
    if (other.id === hero.id) continue;
    if (Object.values(other.equipped).includes(itemId)) {
      throw new AlreadyEquippedError(itemId);
    }
  }

  const existing = hero.equipped[item.slot];
  if (existing) throw new SlotOccupiedError(item.slot);

  hero.equipped[item.slot] = itemId;
  return item;
}

export function unequipItem(hero: Hero, slot: EquipSlotId): EquipmentId | null {
  const current = hero.equipped[slot];
  if (current) delete hero.equipped[slot];
  return current ?? null;
}

/** §71 — "Poder" do herói = poder dos SEUS stats finais. */
export function heroPower(hero: Hero, inv: Inventory): number {
  return Math.round(powerOf(heroCombatStats(hero, inv)));
}

/** Stats finais do herói para entrar em batalha. */
export function heroCombatStats(hero: Hero, inv: Inventory): CombatStats {
  return heroFinalStats(hero.stats, equippedItems(inv, hero));
}

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
