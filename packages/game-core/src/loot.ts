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
import { config, RARITY_ORDER, type EquipSlotId, type Rarity, type StatId } from "@tia/config";
import { EQUIP_SLOTS, EQUIP_TEMPLATES, EQUIPABLE_STATS } from "@tia/config";
import { powerOf, qualityGrade, type Prng } from "@tia/engine";
import { newEquipmentId } from "./ids.js";
import { emptyStats, addStats } from "./creation.js";
import type { CombatStats } from "@tia/contracts";

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
 * Sorteia um equipamento. Retorna `null` nos 95% de casos sem drop.
 *
 * A ordem das rolagens é fixa e documentada porque determinismo exige que
 * ela não mude: equipmentChance → raridade → slot → X por atributo → seed.
 * Adicionar uma rolagem no meio muda todos os itens seguintes.
 */
export function rollEquipment(rng: Prng, ctx: LootContext): Equipment | null {
  // §32 — 5% de chance de drop.
  if (!rng.bool(config.loot.equipmentChance)) return null;

  // §33 — raridade, ponderada pela tabela da config.
  const rarity = rng.weightedKey(config.loot.rarity as Record<Rarity, number>);

  const slot = rng.pick(EQUIP_SLOTS) as EquipSlotId;
  const template = EQUIP_TEMPLATES[slot];

  // §36 — X INDIVIDUAL por atributo. São 8 rolagens independentes, e
  // "Attack × 1.72, Defense × 0.93" do §36 é exatamente o caso comum:
  // um item pode ser ótimo e ruim ao mesmo tempo.
  const xValues: Record<StatId, number> = {
    hp: 0,
    attack: 0,
    specialAttack: 0,
    defense: 0,
    specialDefense: 0,
    critChance: 0,
    attackSpeed: 0,
    speed: 0,
  };
  for (const stat of EQUIPABLE_STATS) {
    xValues[stat] = rng.int(config.loot.x.min, config.loot.x.max);
  }

  // §35 — a nota é a média das rolagens, independente da raridade.
  // Raridade alta com nota baixa é um outcome legítimo e desejável.
  const { quality, grade } = qualityGrade(Object.values(xValues), config.loot.x.max);

  // O seed fica no item: permite reconstruir exatamente como ele nasceu,
  // que é o que o §86 exige do servidor.
  const seed = rng.int(1, 0x7fffffff);
  const id: EquipmentId = newEquipmentId(ctx.accountId, ctx.itemIndex, seed);

  return {
    id,
    ownerAccountId: ctx.accountId,
    slot,
    itemTypeId: `${slot}.${rarity}`,
    weaponType: template.weaponType,
    level: Math.max(1, ctx.sourceLevel),
    rarity,
    xValues,
    quality,
    grade,
    createdAt: 0,
    origin: ctx.origin,
    seed,
  };
}

/**
 * Stats finais de um equipamento.
 *
 * O X é um MULTIPLICADOR, não um somatório: `base × (x / 10)`, com x=10
 * significando "o valor base". Isso é o que faz "Attack × 1.72" ter o
 * significado que o §36 sugere, e é o que torna um god roll raro e um
 * item ruim desejáveis ao mesmo tempo.
 */
export function equipmentStats(item: Equipment): CombatStats {
  const template = EQUIP_TEMPLATES[item.slot];
  const scale = rarityScale(item.rarity);
  const stats = emptyStats();

  for (const stat of EQUIPABLE_STATS) {
    const x = item.xValues[stat] ?? 0;
    const base = stat === template.stat ? template.base : template.base * 0.25;
    const value = base * (x / 10) * scale;
    // Atributos em fração (critChance, attackSpeed) não são escalados por
    // `base`: aplicar um multiplicador de raridade a 0.03 produz 0.09 de
    // crítico num item raro, o que destrói o teto de crítico inteiro.
    if (stat === "critChance") stats.critChance += x / 1000;
    else if (stat === "attackSpeed") stats.attackSpeed += x / 1000;
    else stats[stat] += value;
  }

  return stats;
}

function rarityScale(rarity: Rarity): number {
  switch (rarity) {
    case "common": return 1.0;
    case "uncommon": return 1.2;
    case "rare": return 1.5;
    case "epic": return 2.0;
    case "legendary": return 2.5;
    case "celestial": return 3.0;
  }
}

/** §71 — o poder exibido no item é o poder dos SEUS stats. */
export function equipmentPower(item: Equipment): number {
  return powerOf(equipmentStats(item));
}

/** Stats finais do herói: base do nível + tudo que está equipado (§71). */
export function heroFinalStats(heroStats: CombatStats, equipped: Equipment[]): CombatStats {
  let total = heroStats;
  for (const item of equipped) total = addStats(total, equipmentStats(item));
  return total;
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
  const dropCount = params.rng.int(0, 1); // ⛔ P-008 provisório
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
