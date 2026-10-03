/**
 * Loot.
 *
 * Regras do Master-Prompt aplicadas aqui, todas verificáveis por teste:
 *
 *   §30 — equipamento é recurso de valor, não moeda.
 *   §32 — "Nenhum equipamento: 95% / Equipamento: 5%".
 *   §33 — raridades: Common 50 / Uncommon 30 / Rare 15 / Epic 4 /
 *          Legendary 0,9 / Celestial 0,1. "Configuração inicial, não regra
 *          imutável" — por isso vivem na config, não como literal.
 *   §36 — "cada atributo tem seu próprio X". Um item NÃO tem um X único nem
 *          um X por categoria. São 8 rolagens independentes.
 *   §12 — fragmentos de personagem NUNCA vêm de inimigo comum da Torre.
 *
 * O fluxo de RNG é separado do de combate: sortear mais loot não pode
 * alterar o resultado de uma batalha.
 */

import type { Equipment, LootOrigin, RewardBundle } from "@tia/contracts";
import type { AccountId, ClassId, EquipmentId } from "@tia/contracts";
import { asClassId, asEquipmentId } from "@tia/contracts";
import { config, RARITY_ORDER, type ItemTemplate, type Rarity, type StatId } from "@tia/config";
import { Prng, qualityGrade } from "@tia/engine";
import { newEquipmentId } from "./ids.js";
import { templateById, traitForWeaponType } from "./gear.js";

export type LootSource =
  | { kind: "tower_enemy" } // §12 — NUNCA gera fragmento
  | { kind: "boss" }
  | { kind: "event" }
  | { kind: "summon" }
  | { kind: "chest" }
  | { kind: "market" }
  | { kind: "admin" };

/** O Master-Prompt é explícito sobre a procedência de fragmentos. */
export function sourceAllowsFragments(source: LootSource): boolean {
  // §12 — a única proibição nomeada é inimigo comum da Torre. Todas as
  // demais fontes (boss, evento, summon, caixa, mercado, admin) são as
  // fontes legítimas citadas na regra.
  return source.kind !== "tower_enemy";
}

export interface LootContext {
  accountId: AccountId;
  origin: LootOrigin;
  source: LootSource;
  /** Nível do inimigo que.droppou — escala o item. */
  sourceLevel: number;
  /** Índice sequencial do item no save; parte do ID determinístico. */
  itemIndex: number;
}

/**
 * Rola UM X (§36, ⛔ P-010 → ADR-023): fracionário, em sino, média ≈ 1,05.
 *
 *   u = média de `samples` uniformes (sino em [0,1])
 *   X = min + (max − min) × u^power        (arredondado a `decimals` casas)
 *
 * `power` > 1 puxa a massa para baixo e deixa o "god roll" (X ≥ 2,0) raro: ~1%.
 */
export function rollX(rng: Prng): number {
  const { min, max, decimals, shape } = config.loot.x;
  let u = 0;
  for (let i = 0; i < shape.samples; i += 1) u += rng.next();
  u /= shape.samples;
  const x = min + (max - min) * Math.pow(u, shape.power);
  const f = Math.pow(10, decimals);
  return Math.min(max, Math.max(min, Math.round(x * f) / f));
}

/** Sorteia o template: primeiro o slot (pesos dos slots), depois o template do slot. */
export function pickTemplate(rng: Prng): ItemTemplate {
  const slots = config.equipment.slots;
  const slot = slots[rng.weightedIndex(slots.map((s) => s.dropWeight))]!;
  const pool = config.equipment.templates.filter((t) => t.slot === slot.id);
  return pool[rng.weightedIndex(pool.map((t) => t.dropWeight))]!;
}

/**
 * Escolhe as linhas de atributo do item: a PRIMEIRA do template é a principal
 * (sempre rola); as demais saem do pool, sem repetir, ponderadas pelo peso.
 */
export function pickStatLines(rng: Prng, template: ItemTemplate, lines: number): StatId[] {
  const [primary, ...rest] = template.stats;
  const chosen: StatId[] = [primary!.stat];
  const pool = [...rest];
  while (chosen.length < lines && pool.length > 0) {
    const idx = rng.weightedIndex(pool.map((p) => p.weight));
    chosen.push(pool.splice(idx, 1)[0]!.stat);
  }
  return chosen;
}

export interface BuildEquipmentContext {
  accountId: AccountId;
  origin: LootOrigin;
  sourceLevel: number;
  itemIndex: number;
  createdAt?: number;
}

/**
 * Constrói o item a partir de raridade + template já decididos.
 * Ordem das rolagens (fixa): linhas → X por linha → característica → seed.
 */
export function buildEquipment(rng: Prng, ctx: BuildEquipmentContext, rarity: Rarity, template: ItemTemplate): Equipment {
  const eq = config.equipment;
  const rdef = eq.rarity[rarity];

  // §36 — X INDIVIDUAL por atributo: "Attack × 1.72, Defense × 0.93" é o caso
  // comum — um item pode ser ótimo e ruim ao mesmo tempo.
  const lines = pickStatLines(rng, template, rdef.statLines);
  const xValues: Partial<Record<StatId, number>> = {};
  for (const stat of lines) xValues[stat] = rollX(rng);

  // §34/§35 — a Nota é a média normalizada dos X, independente da raridade.
  // Raridade alta com nota baixa é um resultado legítimo e desejável.
  const { quality, grade } = qualityGrade(Object.values(xValues) as number[], config.loot.x, eq.grades);

  const trait = template.slot === "weapon" ? traitForWeaponType(template.weaponType) : undefined;
  const feature = rdef.hasFeature && eq.features.length > 0 ? rng.pick(eq.features) : undefined;

  // O seed fica no item: permite reconstruir como ele nasceu (§86).
  const seed = rng.int(1, 0x7fffffff);

  return {
    id: newEquipmentId(ctx.accountId, ctx.itemIndex, seed),
    ownerAccountId: ctx.accountId,
    slot: template.slot,
    itemTypeId: template.id,
    ...(template.weaponType ? { weaponType: template.weaponType } : {}),
    level: Math.max(1, Math.floor(ctx.sourceLevel)),
    rarity,
    xValues,
    quality,
    grade,
    ...(trait ? { traitId: trait.id } : {}),
    ...(feature ? { featureId: feature.id } : {}),
    createdAt: ctx.createdAt ?? 0,
    origin: ctx.origin,
    seed,
  };
}

/**
 * Sorteia um equipamento. Retorna `null` nos 95% de casos sem drop.
 *
 * Ordem das rolagens: equipmentChance → raridade → slot → template → (buildEquipment).
 * Adicionar uma rolagem no meio muda todos os itens seguintes.
 */
export function rollEquipment(rng: Prng, ctx: LootContext): Equipment | null {
  // §32 — 5% de chance de drop.
  if (!rng.bool(config.loot.equipmentChance)) return null;
  // §33 — raridade, ponderada pela tabela da config.
  const rarity = rng.weightedKey(config.loot.rarity as Record<Rarity, number>);
  const template = pickTemplate(rng);
  return buildEquipment(rng, ctx, rarity, template);
}

/** Rolagem FORÇADA (sem os 5%): para a UI de debug, testes e futuras caixas/bosses. */
export function rollEquipmentOf(rng: Prng, ctx: LootContext, forced: { rarity?: Rarity; templateId?: string } = {}): Equipment {
  const rarity = forced.rarity ?? rng.weightedKey(config.loot.rarity as Record<Rarity, number>);
  const template = (forced.templateId ? templateById(forced.templateId) : undefined) ?? pickTemplate(rng);
  return buildEquipment(rng, ctx, rarity, template as ItemTemplate);
}

/**
 * Migração (config v3 → v4): itens antigos (`itemTypeId` "slot.raridade", X
 * inteiro 1–50) são RECONSTRUÍDOS a partir do seed no modelo novo, preservando
 * id, dono, nível, raridade, slot, origem e data. Determinístico.
 */
export function isLegacyEquipment(item: Equipment): boolean {
  return item.itemTypeId.includes(".");
}

export function migrateLegacyEquipment(item: Equipment): Equipment {
  const rng = new Prng(item.seed);
  const pool = config.equipment.templates.filter((t) => t.slot === item.slot);
  const template = pool[rng.weightedIndex(pool.map((t) => t.dropWeight))] ?? pickTemplate(rng);
  const rebuilt = buildEquipment(
    rng,
    { accountId: item.ownerAccountId as AccountId, origin: item.origin, sourceLevel: item.level, itemIndex: 0, createdAt: item.createdAt },
    item.rarity,
    template,
  );
  return { ...rebuilt, id: item.id, seed: item.seed, ...(item.lockedByListingId ? { lockedByListingId: item.lockedByListingId } : {}) };
}

// ---------------------------------------------------------------------------
// Fragmentos (§12)
// ---------------------------------------------------------------------------

export interface FragmentDrop {
  classId: ClassId;
  amount: number;
}

/**
 * Sorteia fragmentos de personagem.
 *
 * REGRA ABSOLUTA (§12): inimigo comum da Torre NUNCA retorna fragmento.
 * A função não tem como produzir um: ela é inalcançável para essa fonte.
 * Isso é deliberado — a regra fica na estrutura, não em um `if` que alguém
 * pode remover sem perceber.
 */
export function rollFragments(
  rng: Prng,
  ctx: LootContext,
  classIds: readonly string[],
  amountRange: { min: number; max: number },
): FragmentDrop[] {
  if (!sourceAllowsFragments(ctx.source)) return [];

  const out: FragmentDrop[] = [];
  for (const classId of classIds) {
    if (!rng.bool(0.35)) continue; // ⛔ P-017 provisório
    out.push({ classId: asClassId(classId), amount: rng.int(amountRange.min, amountRange.max) });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Pacote de recompensa
// ---------------------------------------------------------------------------

export interface RollBundleParams {
  rng: Prng;
  accountId: AccountId;
  itemIndexStart: number;
  source: LootSource;
  sourceLevel: number;
  kingXp: number;
  heroXp: number;
  coins: number;
  fragmentClasses?: readonly string[];
  fragmentAmount?: { min: number; max: number };
  createdAt: number;
  bundleId: string;
}

const ORIGIN_BY_SOURCE: Record<LootSource["kind"], LootOrigin> = {
  tower_enemy: "drop",
  boss: "drop",
  event: "reward",
  summon: "reward",
  chest: "reward",
  market: "market",
  admin: "admin",
};

/** Monta o pacote completo de uma vitória. */
export function rollRewardBundle(params: RollBundleParams): RewardBundle {
  const equipment: Equipment[] = [];
  // 1 rolagem por abate: a chance de equipamento (§32 — 5%) vale POR abate.
  const dropCount = 1;
  for (let i = 0; i < dropCount; i += 1) {
    const item = rollEquipment(params.rng, {
      accountId: params.accountId,
      origin: ORIGIN_BY_SOURCE[params.source.kind],
      source: params.source,
      sourceLevel: params.sourceLevel,
      itemIndex: params.itemIndexStart + i,
    });
    if (item) {
      item.createdAt = params.createdAt;
      equipment.push(item);
    }
  }

  const fragments = params.fragmentClasses
    ? rollFragments(params.rng, {
        accountId: params.accountId,
        origin: ORIGIN_BY_SOURCE[params.source.kind],
        source: params.source,
        sourceLevel: params.sourceLevel,
        itemIndex: params.itemIndexStart,
      }, params.fragmentClasses, params.fragmentAmount ?? { min: 1, max: 3 })
    : [];

  return {
    id: params.bundleId,
    kingXp: BigInt(Math.floor(params.kingXp)),
    // §20 — este valor é o TOTAL. A divisão por membro acontece no ponto de
    // crédito (`splitTeamXp`), uma única vez. Guardar o total no pacote
    // mantém o pacote honesto: ele é o que a batalha rendeu, não o que o
    // herói 1 ganhou.
    heroXp: BigInt(Math.floor(params.heroXp)),
    coins: BigInt(Math.floor(params.coins)),
    equipment,
    fragments,
  };
}

export function emptyRewardBundle(id: string): RewardBundle {
  return { id, kingXp: 0n, heroXp: 0n, coins: 0n, equipment: [], fragments: [] };
}

export { RARITY_ORDER, asEquipmentId };
