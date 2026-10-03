/**
 * Equipamento — leitura e matemática (ADR-023).
 *
 * Um item grava só o que o sorteio decidiu (template, nível, raridade, X por
 * linha, traço, característica, seed). Os STATS são derivados aqui, em tempo de
 * execução, a partir da `config.equipment` viva — editar a escala, a raridade
 * ou um template no painel reescala todos os itens existentes, sem migração.
 *
 *   valor(stat) = BASE(stat, nível do item) × peso da linha × RARIDADE × X
 *
 * Este é o ÚNICO lugar com essa fórmula (§37).
 */

import type { CombatStats, Equipment, Hero, Inventory } from "@tia/contracts";
import type { EquipmentId } from "@tia/contracts";
import {
  classes,
  config,
  evalCurve,
  materialForLevel,
  referenceStat,
  type FeatureDef,
  type GearEffect,
  type ItemTemplate,
  type Rarity,
  type StatId,
  type WeaponTraitDef,
} from "@tia/config";
import { powerOf } from "@tia/engine";
import { addStats, emptyStats } from "./creation.js";

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------

export function templateById(id: string): ItemTemplate | undefined {
  return config.equipment.templates.find((t) => t.id === id);
}

export function traitById(id: string | undefined): WeaponTraitDef | undefined {
  return id ? config.equipment.weaponTraits.find((t) => t.id === id) : undefined;
}

export function featureById(id: string | undefined): FeatureDef | undefined {
  return id ? config.equipment.features.find((f) => f.id === id) : undefined;
}

/** Traço intrínseco do tipo de arma (1 por tipo — validado pela config). */
export function traitForWeaponType(type: string | undefined): WeaponTraitDef | undefined {
  return type ? config.equipment.weaponTraits.find((t) => t.weaponType === type) : undefined;
}

/** Nome de exibição: "Espada de Ferro", "Aura Radiante". */
export function itemName(item: Equipment): string {
  const t = templateById(item.itemTypeId);
  if (!t) return "Item desconhecido";
  return t.tiered ? `${t.name} de ${materialForLevel(config.equipment.tiers, item.level)}` : t.name;
}

/** Item cujo template saiu do catálogo (conteúdo editado): fica inerte, nunca quebra o save. */
export function isOrphan(item: Equipment): boolean {
  return !templateById(item.itemTypeId);
}

// ---------------------------------------------------------------------------
// Stats e poder
// ---------------------------------------------------------------------------

const REFERENCE_STATS = ["hp", "attack", "specialAttack", "defense", "specialDefense"] as const;
type ReferenceStat = (typeof REFERENCE_STATS)[number];

/** Valor de UMA linha do item. */
export function lineValue(item: Equipment, stat: StatId): number {
  const template = templateById(item.itemTypeId);
  const line = template?.stats.find((s) => s.stat === stat);
  const x = item.xValues[stat];
  if (!line || x === undefined) return 0;
  const unit = config.equipment.unit[stat];
  const rarity = config.equipment.rarity[item.rarity].multiplier;
  const base = unit.mode === "ofReference" ? referenceStat(stat as ReferenceStat, item.level) * unit.value : unit.value;
  const raw = base * line.weight * rarity * x;
  const isFraction = stat === "critChance" || stat === "attackSpeed";
  return isFraction ? Math.round(raw * 10_000) / 10_000 : stat === "speed" ? Math.round(raw * 10) / 10 : Math.max(1, Math.floor(raw));
}

export function equipmentStats(item: Equipment): CombatStats {
  const stats = emptyStats();
  for (const stat of Object.keys(item.xValues) as StatId[]) stats[stat] += lineValue(item, stat);
  return stats;
}

/** §71 — o poder exibido no item é o poder dos SEUS stats. Comparativo, não preditivo. */
export function equipmentPower(item: Equipment): number {
  return powerOf(equipmentStats(item));
}

/** Efeitos do item: traço da arma (do tipo) + característica de raridade. */
export function itemEffects(item: Equipment): GearEffect[] {
  const out: GearEffect[] = [];
  const trait = traitById(item.traitId) ?? traitForWeaponType(item.weaponType);
  if (trait && item.slot === "weapon") out.push(...trait.effects);
  const feature = featureById(item.featureId);
  if (feature) out.push(...feature.effects);
  return out;
}

// ---------------------------------------------------------------------------
// Requisito e afinidade
// ---------------------------------------------------------------------------

/** Nível mínimo do herói para usar o item (⛔ P-033): `ceil(nível × levelRatio)`. */
export function requiredHeroLevel(item: Equipment): number {
  return Math.max(1, Math.ceil(item.level * config.equipment.requirement.levelRatio));
}

export function meetsRequirement(hero: Pick<Hero, "level">, item: Equipment): boolean {
  return hero.level >= requiredHeroLevel(item);
}

/** Atributo(s) ofensivo(s) principal(is) da classe — o que a afinidade de arma reforça. */
export function offensiveStatsOf(classId: string): ("attack" | "specialAttack")[] {
  const cls = classes.find((c) => c.id === classId);
  if (!cls) return ["attack"];
  return cls.damageType === "magic" ? ["specialAttack"] : cls.damageType === "physical" ? ["attack"] : ["attack", "specialAttack"];
}

/** Afinidade (P-024): a arma do tipo da classe dá bônus; NUNCA bloqueia equipar. */
export function hasAffinity(hero: Pick<Hero, "affinityWeapon">, item: Equipment): boolean {
  return item.slot === "weapon" && !!item.weaponType && hero.affinityWeapon === item.weaponType;
}

// ---------------------------------------------------------------------------
// Herói + equipamento
// ---------------------------------------------------------------------------

/** Itens equipados do herói que ele PODE usar agora (nível suficiente, template válido). */
export function activeEquipped(inv: Inventory, hero: Hero): Equipment[] {
  const ids = Object.values(hero.equipped) as EquipmentId[];
  const out: Equipment[] = [];
  for (const id of ids) {
    const item = inv.equipment.find((e) => e.id === id);
    if (item && !isOrphan(item) && meetsRequirement(hero, item)) out.push(item);
  }
  return out;
}

/** Stats finais do herói: base do nível + equipamento ativo + afinidade (§71). */
export function heroFinalStats(
  hero: Pick<Hero, "stats" | "classId" | "affinityWeapon">,
  equipped: readonly Equipment[],
): CombatStats {
  let total: CombatStats = { ...hero.stats };
  for (const item of equipped) total = addStats(total, equipmentStats(item));
  if (equipped.some((i) => hasAffinity(hero, i))) {
    for (const stat of offensiveStatsOf(hero.classId)) {
      total[stat] = Math.floor(total[stat] * (1 + config.equipment.affinityBonus));
    }
  }
  return total;
}

/** Efeitos somados de tudo que está equipado e ativo (o engine aplica os tetos). */
export function heroGearEffects(equipped: readonly Equipment[]): GearEffect[] {
  return equipped.flatMap(itemEffects);
}

// ---------------------------------------------------------------------------
// Comparação (UI)
// ---------------------------------------------------------------------------

export const COMPARED_STATS: readonly StatId[] = ["hp", "attack", "specialAttack", "defense", "specialDefense", "critChance", "attackSpeed", "speed"];

/** Diferença `candidate − current` por stat (current pode ser nulo = slot vazio). */
export function compareItems(candidate: Equipment, current: Equipment | null | undefined): Record<StatId, number> {
  const a = equipmentStats(candidate);
  const b = current ? equipmentStats(current) : emptyStats();
  const out = {} as Record<StatId, number>;
  for (const s of COMPARED_STATS) out[s] = Math.round((a[s] - b[s]) * 10_000) / 10_000;
  return out;
}

// ---------------------------------------------------------------------------
// Venda (⛔ P-008 provisório)
// ---------------------------------------------------------------------------

/**
 * Preço de venda: `Coin por abate no nível do item × abates equivalentes da raridade ×
 * fator da nota`. Usa a MESMA curva de Coin da Torre — o preço acompanha o jogo.
 */
export function sellPrice(item: { level: number; rarity: Rarity; quality: number }): bigint {
  const perKill = Math.max(1, evalCurve(config.tower.rewards.coins, item.level));
  const { killsEquivalent, qualityFactorMin, qualityFactorMax } = config.equipment.sell;
  const q = Math.min(1, Math.max(0, item.quality / 100));
  const factor = qualityFactorMin + (qualityFactorMax - qualityFactorMin) * q;
  return BigInt(Math.max(1, Math.floor(perKill * killsEquivalent[item.rarity] * factor)));
}
