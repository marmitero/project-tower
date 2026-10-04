/**
 * Equipamento como DADO (ADR-023 — arquitetura "admin-ready", ADR-022).
 *
 * Tudo que define um item mora aqui, em objetos JSON-serializáveis:
 * slots, templates (catálogo), raridades (força, linhas de atributo),
 * notas, escala por nível, requisito de nível, venda, traços de arma e
 * características de raridade. Nada é função e nada é literal na lógica:
 * o futuro Painel Administrativo (FASE 14, `docs/ADMIN_PANEL.md`) edita estes
 * objetos pelo `ContentPack` e o jogo reavalia.
 *
 * Fórmula central (§37) — implementada UMA vez, em `game-core/src/gear.ts`:
 *
 *   valor(stat) = BASE(stat, nívelDoItem) × peso × RARIDADE × X
 *
 *   BASE (stat "de referência") = unidade % × stat médio das classes no nível
 *   do item — é isso que faz o equipamento escalar com o nível (risco R-02 do
 *   ADR-021: sem escala, um item de +12 de ataque é irrelevante no nível 5.000).
 *   Stats em fração (crítico, velocidade de ataque) e `speed` usam unidade
 *   fixa, sem escala por nível.
 *
 * Inspiração OpenRpg (`docs/OPENRPG_REFERENCE.md` §5): a escada de qualidade
 * (QualityType Junk→Mythical) vira nossas 6 raridades; "ItemTemplate +
 * efeitos estáticos" vira template + traço/característica; a classe de item
 * limita quais atributos podem aparecer (pool por template).
 */

import type { EquipSlotId, Rarity, StatId, WeaponType } from "./types.js";
import { classes } from "./catalog.js";
import { RARITY_ORDER } from "./rarity.js";

// ---------------------------------------------------------------------------
// Efeitos de equipamento (traço de arma e característica de raridade)
// ---------------------------------------------------------------------------

/**
 * Vocabulário de efeitos que o engine sabe executar. É um conjunto FECHADO e
 * versionado: o painel combina estes blocos, não inventa mecânica nova.
 * Valores em fração (0,10 = 10%).
 */
export type GearEffect =
  /** +chance de crítico (aditivo, respeita `combat.critCap`). */
  | { kind: "critChance"; value: number }
  /** +velocidade de ataque (IAS, aditivo; respeita os caps do engine). */
  | { kind: "attackSpeed"; value: number }
  /** +% de dano de um tipo (multiplicativo sobre o dano já mitigado). */
  | { kind: "damageBonus"; damageType: "physical" | "magic" | "any"; value: number }
  /** Ignora esta fração da Defesa (ou Def. Esp.) do alvo. */
  | { kind: "defensePierce"; value: number }
  /** Cura esta fração do dano direto causado (1× por golpe, até o HP faltante). */
  | { kind: "lifesteal"; value: number }
  /** −% no cooldown das skills (não afeta IAS). */
  | { kind: "cooldownReduction"; value: number }
  /** Chance por ação de aplicar dano periódico (renova, não acumula). */
  | { kind: "dot"; chance: number; coefficient: number; pulses: number; intervalMs: number }
  /** Chance por ação de atordoar o alvo (perde 1 ação; não acumula). */
  | { kind: "stun"; chance: number; durationMs: number }
  /** Ao receber ataque direto, chance de contra-atacar (não recursa). */
  | { kind: "counter"; chance: number; coefficient: number }
  /** Ataque básico mágico cura `value × Ataque Esp.` (até o HP faltante). */
  | { kind: "basicHeal"; value: number }
  /** O ataque básico vira N golpes de `coefficient` (cada um pode critar). */
  | { kind: "multiHit"; hits: number; coefficient: number }
  /** Ataque básico atinge todos os inimigos (coef. por alvo quando há >1; 1,0 com alvo único). */
  | { kind: "area"; perTargetCoefficient: number };

export type GearEffectKind = GearEffect["kind"];

export const GEAR_EFFECT_KINDS: readonly GearEffectKind[] = [
  "critChance",
  "attackSpeed",
  "damageBonus",
  "defensePierce",
  "lifesteal",
  "cooldownReduction",
  "dot",
  "stun",
  "counter",
  "basicHeal",
  "multiHit",
  "area",
];

/** Traço intrínseco de um tipo de arma (§72). NÃO escala com X nem raridade. */
export interface WeaponTraitDef {
  id: string;
  weaponType: WeaponType;
  name: string;
  description: string;
  effects: GearEffect[];
  /** Aviso de contexto para a UI (ex.: Cajado só brilha em Boss). */
  tip?: string;
}

/** Característica de Lendário/Celestial (§34). NÃO escala com X nem raridade. */
export interface FeatureDef {
  id: string;
  name: string;
  description: string;
  effects: GearEffect[];
}

// ---------------------------------------------------------------------------
// Templates e raridades
// ---------------------------------------------------------------------------

export type Grade = "S" | "A" | "B" | "C" | "D" | "E" | "F";
export const GRADES: readonly Grade[] = ["S", "A", "B", "C", "D", "E", "F"];

export interface ItemTemplateStat {
  stat: StatId;
  /** Peso da linha: multiplica a unidade do atributo. */
  weight: number;
}

export interface ItemTemplate {
  id: string;
  name: string;
  slot: EquipSlotId;
  /** Só para `slot === "weapon"`. */
  weaponType?: WeaponType;
  /**
   * Linhas de atributo possíveis. A PRIMEIRA é a principal (sempre rola); as
   * demais formam o pool de onde saem as linhas extras (quantas depende da
   * raridade — `rarity[r].statLines`).
   */
  stats: ItemTemplateStat[];
  /** Id do ícone no manifesto de assets. */
  iconAssetId: string;
  /** Peso no sorteio do template (entre os do mesmo slot). */
  dropWeight: number;
  /** Se o nome ganha o sufixo do material do tier ("de Ferro"). */
  tiered: boolean;
}

export interface EquipSlotDef {
  id: EquipSlotId;
  name: string;
  /** Peso no sorteio do slot (todos 1 = uniforme). */
  dropWeight: number;
}

export interface RarityDef {
  label: string;
  /** Multiplicador de força (§37: BASE × RARIDADE × X). ⛔ P-033 provisório. */
  multiplier: number;
  /** Quantas linhas de atributo o item rola. */
  statLines: number;
  /** Se o item rola uma característica especial (§34: Lendário e Celestial). */
  hasFeature: boolean;
  /** Cor da raridade (CSS). A UI SEMPRE acompanha cor com texto e forma. */
  color: string;
}

export interface GradeDef {
  grade: Grade;
  /** Nota mínima (0–100) para a letra. Ordenado do maior para o menor. */
  minQuality: number;
}

export interface TierDef {
  /** A partir deste nível de item. */
  minLevel: number;
  /** "Ferro", "Aço"... — sufixo "de X" dos templates `tiered`. */
  material: string;
}

export type StatUnit =
  /** `value` = fração do stat de referência no nível do item (ex.: 0,06 = 6%). */
  | { mode: "ofReference"; value: number }
  /** `value` = valor absoluto por linha, sem escala por nível. */
  | { mode: "flat"; value: number };

export interface EquipmentConfig {
  slots: EquipSlotDef[];
  templates: ItemTemplate[];
  rarity: Record<Rarity, RarityDef>;
  grades: GradeDef[];
  tiers: TierDef[];
  /** Unidade de cada atributo (a escala do equipamento com o nível). */
  unit: Record<StatId, StatUnit>;
  /**
   * Requisito para equipar (⛔ P-033): nível do herói ≥ `ceil(nível do item ×
   * levelRatio)`. 0,9 = o herói a 90% do nível do andar já usa o que ele solta
   * (casa com a janela de sustentabilidade medida no ADR-021).
   */
  requirement: { levelRatio: number };
  /** +% multiplicativo no atributo ofensivo principal com a arma de afinidade (P-024). */
  affinityBonus: number;
  /**
   * Preço de venda (⛔ P-008 provisório, fechado na FASE 10):
   * `moedaPorAbate(nível) × killsEquivalent[raridade] × (qMin..qMax pela nota)`.
   * Usa a mesma curva de Coin da Torre — o preço escala sozinho com o jogo.
   */
  sell: {
    killsEquivalent: Record<Rarity, number>;
    qualityFactorMin: number;
    qualityFactorMax: number;
  };
  weaponTraits: WeaponTraitDef[];
  features: FeatureDef[];
  /**
   * ADR-030 — a Velocidade de Ataque (IAS) de um item cresce com o NÍVEL do item: com T₀ de 2 s,
   * só equipamento de nível alto leva o ataque perto de 1 s. `fator = minFactor + (1 − minFactor)
   * × min(1, (nível / fullAtLevel)^exponent)`. Os demais atributos não usam esta curva.
   */
  attackSpeedLevelCurve: { fullAtLevel: number; exponent: number; minFactor: number };
  /** Tetos para a SOMA de efeitos de vários itens (um balanço contra empilhamento). */
  effectCaps: {
    critChance: number;
    attackSpeed: number;
    damageBonus: number;
    defensePierce: number;
    lifesteal: number;
    cooldownReduction: number;
  };
}

// ---------------------------------------------------------------------------
// Padrões de fábrica
// ---------------------------------------------------------------------------

export const DEFAULT_SLOTS: EquipSlotDef[] = [
  { id: "weapon", name: "Arma", dropWeight: 1 },
  { id: "chest", name: "Peitoral", dropWeight: 1 },
  { id: "head", name: "Elmo", dropWeight: 1 },
  { id: "legs", name: "Calça", dropWeight: 1 },
  { id: "boots", name: "Bota", dropWeight: 1 },
  { id: "glove", name: "Luva", dropWeight: 1 },
  { id: "amulet", name: "Colar", dropWeight: 1 },
  { id: "aura", name: "Aura", dropWeight: 1 },
  { id: "wings", name: "Asas", dropWeight: 1 },
  { id: "pet", name: "Companheiro", dropWeight: 1 },
];

type StatSpec = [StatId, number];

function tpl(
  id: string,
  name: string,
  slot: EquipSlotId,
  stats: StatSpec[],
  iconAssetId: string,
  opts: { weaponType?: WeaponType; tiered?: boolean; dropWeight?: number } = {},
): ItemTemplate {
  return {
    id,
    name,
    slot,
    ...(opts.weaponType ? { weaponType: opts.weaponType } : {}),
    stats: stats.map(([stat, weight]) => ({ stat, weight })),
    iconAssetId,
    dropWeight: opts.dropWeight ?? 1,
    tiered: opts.tiered ?? true,
  };
}

/**
 * 18 templates (⛔ P-025): 9 armas — uma por tipo do §72 — e 9 peças dos demais
 * slots. A primeira linha de cada template é a principal.
 *
 * Cajado e Livro Arcano têm `dropWeight` 3 (as outras 7 armas, 1): 6 das 13 vezes a
 * arma sorteada é mágica — metade do roster ataca com Ataque Esp., então a metade
 * dos drops de arma serve a cada lado (aquisição balanceada entre físicos e mágicos).
 */
export function defaultTemplates(): ItemTemplate[] {
  const W = (type: WeaponType) => ({ weaponType: type });
  return [
    // --- armas (peso 1 cada entre armas; a arma é 1 slot de 10) -----------
    tpl("weapon_sword", "Espada", "weapon", [["attack", 2.4], ["critChance", 0.7], ["hp", 0.6], ["defense", 0.5]], "icons2/icons_swords_0", W("sword")),
    tpl("weapon_dagger", "Adaga", "weapon", [["attack", 2.2], ["critChance", 0.9], ["attackSpeed", 0.9], ["speed", 0.6]], "icons2/icons_ranged_12", W("dagger")),
    tpl("weapon_axe", "Machado", "weapon", [["attack", 2.6], ["hp", 0.6], ["critChance", 0.6], ["defense", 0.4]], "icons1/icons_blunt_0", W("axe")),
    tpl("weapon_mace", "Maça", "weapon", [["attack", 2.4], ["critChance", 0.8], ["defense", 0.6], ["hp", 0.6]], "icons1/icons_blunt_3", W("mace")),
    tpl("weapon_crossbow", "Besta", "weapon", [["attack", 2.2], ["attackSpeed", 0.9], ["critChance", 0.8], ["speed", 0.6]], "items/crossbow", W("crossbow")),
    tpl("weapon_staff", "Cajado", "weapon", [["specialAttack", 2.4], ["specialDefense", 0.6], ["hp", 0.5], ["critChance", 0.6]], "icons1/icons_magic_wpn_0", { ...W("staff"), dropWeight: 3 }),
    tpl("weapon_arcane_book", "Livro Arcano", "weapon", [["specialAttack", 2.3], ["specialDefense", 0.7], ["hp", 0.6], ["attackSpeed", 0.7]], "icons1/icons_magic_wpn_6", { ...W("arcaneBook"), dropWeight: 3 }),
    tpl("weapon_wraps", "Luvas de Combate", "weapon", [["attack", 2.1], ["attackSpeed", 0.9], ["critChance", 0.7], ["defense", 0.5]], "items/wraps", W("wraps")),
    tpl("weapon_claws", "Garras", "weapon", [["attack", 2.1], ["critChance", 0.9], ["attackSpeed", 0.8], ["hp", 0.5]], "icons2/icons_swords_10", W("claws")),
    // --- demais slots -----------------------------------------------------
    tpl("chest_plate", "Peitoral", "chest", [["defense", 2.0], ["hp", 0.8], ["specialDefense", 0.6], ["attack", 0.4]], "items/chest"),
    tpl("head_helm", "Elmo", "head", [["specialDefense", 1.5], ["defense", 0.8], ["hp", 0.8], ["critChance", 0.4]], "items/helm"),
    tpl("legs_greaves", "Calça", "legs", [["hp", 2.0], ["defense", 0.8], ["specialDefense", 0.5], ["speed", 0.6]], "items/legs"),
    tpl("boots_runner", "Botas", "boots", [["defense", 1.0], ["speed", 1.0], ["attackSpeed", 0.7], ["hp", 0.6]], "items/boots"),
    tpl("glove_gauntlet", "Manoplas", "glove", [["attack", 1.2], ["defense", 0.6], ["critChance", 0.6], ["attackSpeed", 0.6]], "items/glove"),
    tpl("amulet_gem", "Colar", "amulet", [["specialAttack", 1.5], ["specialDefense", 0.8], ["hp", 0.7], ["critChance", 0.5]], "icons1/icons_keys_jewel_8"),
    tpl("aura_light", "Aura Radiante", "aura", [["critChance", 1.2], ["attack", 0.6], ["specialAttack", 0.6], ["speed", 0.6]], "icons2/spell_holy_dark_3", { tiered: false }),
    tpl("wings_wind", "Asas do Vento", "wings", [["attackSpeed", 1.2], ["speed", 0.9], ["defense", 0.5], ["critChance", 0.5]], "items/wings", { tiered: false }),
    tpl("pet_lamb", "Carneirinho Lanoso", "pet", [["hp", 1.5], ["defense", 0.6], ["attack", 0.5], ["specialAttack", 0.5]], "icons3/spell_nature_arc_15", { tiered: false }),
  ];
}

export function defaultRarity(): Record<Rarity, RarityDef> {
  return {
    common: { label: "Comum", multiplier: 1.0, statLines: 2, hasFeature: false, color: "#9aa3ad" },
    uncommon: { label: "Incomum", multiplier: 1.2, statLines: 2, hasFeature: false, color: "#5fc46a" },
    rare: { label: "Raro", multiplier: 1.5, statLines: 3, hasFeature: false, color: "#4a9be8" },
    epic: { label: "Épico", multiplier: 2.0, statLines: 3, hasFeature: false, color: "#a974e8" },
    legendary: { label: "Lendário", multiplier: 2.5, statLines: 4, hasFeature: true, color: "#f0963a" },
    celestial: { label: "Celestial", multiplier: 3.0, statLines: 4, hasFeature: true, color: "#ffe27a" },
  };
}

/**
 * Notas calibradas por simulação (`npm run report:balance`) contra a
 * distribuição do X: S ≈ topo 1%, A ≈ 4%, B ≈ 15%, C ≈ 30%, D ≈ 30%, E ≈ 15%,
 * F ≈ 5% (alvos; o relatório confere). Mexer no X exige recalibrar.
 */
export function defaultGrades(): GradeDef[] {
  return [
    { grade: "S", minQuality: 59 },
    { grade: "A", minQuality: 49 },
    { grade: "B", minQuality: 38 },
    { grade: "C", minQuality: 28 },
    { grade: "D", minQuality: 21 },
    { grade: "E", minQuality: 15 },
    { grade: "F", minQuality: 0 },
  ];
}

/** Materiais por faixa de nível do item (cosmético — nome do item). */
export function defaultTiers(): TierDef[] {
  return [
    { minLevel: 1, material: "Ferro" },
    { minLevel: 100, material: "Aço" },
    { minLevel: 500, material: "Prata" },
    { minLevel: 1500, material: "Mithril" },
    { minLevel: 5000, material: "Ônix" },
    { minLevel: 10000, material: "Éter" },
  ];
}

export function defaultUnits(): Record<StatId, StatUnit> {
  return {
    hp: { mode: "ofReference", value: 0.06 },
    attack: { mode: "ofReference", value: 0.06 },
    specialAttack: { mode: "ofReference", value: 0.06 },
    defense: { mode: "ofReference", value: 0.06 },
    specialDefense: { mode: "ofReference", value: 0.06 },
    critChance: { mode: "flat", value: 0.012 },
    attackSpeed: { mode: "flat", value: 0.035 },
    speed: { mode: "flat", value: 1.0 },
  };
}

/** Baseline herdado da referência (P-023): números são ponto de partida de playtest. */
export function defaultWeaponTraits(): WeaponTraitDef[] {
  return [
    {
      id: "trait_counter", weaponType: "sword", name: "Contracorte",
      description: "Ao receber um ataque direto, 20% de chance de contra-atacar com 50% do Ataque.",
      effects: [{ kind: "counter", chance: 0.2, coefficient: 0.5 }],
    },
    {
      id: "trait_venom", weaponType: "dagger", name: "Veneno",
      description: "20% por ação de envenenar: 3 pulsos de 10% do Ataque, 1 por segundo. Renova, não acumula.",
      effects: [{ kind: "dot", chance: 0.2, coefficient: 0.1, pulses: 3, intervalMs: 1000 }],
    },
    {
      id: "trait_brute", weaponType: "axe", name: "Dano bruto",
      description: "+15% de dano físico em ataques básicos e skills físicas.",
      effects: [{ kind: "damageBonus", damageType: "physical", value: 0.15 }],
    },
    {
      id: "trait_crit", weaponType: "mace", name: "Crítico",
      description: "+10 pontos percentuais de chance de crítico (respeita o teto).",
      effects: [{ kind: "critChance", value: 0.1 }],
    },
    {
      id: "trait_swift", weaponType: "crossbow", name: "Velocidade",
      description: "+20% de velocidade de ataque (respeita o teto).",
      effects: [{ kind: "attackSpeed", value: 0.2 }],
    },
    {
      id: "trait_area", weaponType: "staff", name: "Área",
      description: "O ataque atinge todos os inimigos: 70% por alvo em grupo; 100% em alvo único.",
      effects: [{ kind: "area", perTargetCoefficient: 0.7 }],
      tip: "Na Torre (1×1) o Cajado não tem vantagem: é arma de Boss.",
    },
    {
      id: "trait_siphon", weaponType: "arcaneBook", name: "Sifão",
      description: "O ataque básico mágico cura 10% do Ataque Especial (até o HP faltante).",
      effects: [{ kind: "basicHeal", value: 0.1 }],
    },
    {
      id: "trait_stun", weaponType: "wraps", name: "Atordoamento",
      description: "15% por ação de atordoar o alvo, que perde a próxima ação. Não acumula.",
      effects: [{ kind: "stun", chance: 0.15, durationMs: 1000 }],
    },
    {
      id: "trait_double", weaponType: "claws", name: "Golpe duplo",
      description: "O ataque básico vira 2 golpes de 60% cada, e cada um pode ser crítico.",
      effects: [{ kind: "multiHit", hits: 2, coefficient: 0.6 }],
    },
  ];
}

/** Pool de características de Lendário/Celestial (⛔ P-027, herdado da referência). */
export function defaultFeatures(): FeatureDef[] {
  return [
    {
      id: "feat_vital", name: "Roubo Vital",
      description: "Cura 5% do dano direto causado (1× por golpe, até o HP faltante).",
      effects: [{ kind: "lifesteal", value: 0.05 }],
    },
    {
      id: "feat_pierce", name: "Ruptura de Guarda",
      description: "Ataques diretos ignoram 10% da Defesa / Defesa Especial do alvo.",
      effects: [{ kind: "defensePierce", value: 0.1 }],
    },
    {
      id: "feat_focus", name: "Foco Crítico",
      description: "+5 pontos percentuais de chance de crítico (respeita o teto).",
      effects: [{ kind: "critChance", value: 0.05 }],
    },
    {
      id: "feat_focus_mind", name: "Concentração",
      description: "−5% no cooldown das skills (não afeta a velocidade de ataque).",
      effects: [{ kind: "cooldownReduction", value: 0.05 }],
    },
  ];
}

export function defaultEquipmentConfig(): EquipmentConfig {
  return {
    slots: DEFAULT_SLOTS,
    templates: defaultTemplates(),
    rarity: defaultRarity(),
    grades: defaultGrades(),
    tiers: defaultTiers(),
    unit: defaultUnits(),
    requirement: { levelRatio: 0.9 },
    affinityBonus: 0.05,
    sell: {
      // ⛔ P-008 provisório — "quantos abates de Coin vale um item".
      killsEquivalent: { common: 3, uncommon: 5, rare: 12, epic: 40, legendary: 150, celestial: 600 },
      qualityFactorMin: 0.5,
      qualityFactorMax: 2.0,
    },
    weaponTraits: defaultWeaponTraits(),
    features: defaultFeatures(),
    attackSpeedLevelCurve: { fullAtLevel: 10_000, exponent: 0.35, minFactor: 0.05 },
    effectCaps: {
      critChance: 0.4,
      attackSpeed: 0.6,
      damageBonus: 0.6,
      defensePierce: 0.4,
      lifesteal: 0.2,
      cooldownReduction: 0.4,
    },
  };
}

// ---------------------------------------------------------------------------
// Funções puras (sem estado)
// ---------------------------------------------------------------------------

/**
 * Stat médio das classes no nível dado — a régua do equipamento. Deriva do
 * catálogo vivo: editar os atributos de uma classe reescala os itens sozinho.
 */
export function referenceStat(
  stat: "hp" | "attack" | "specialAttack" | "defense" | "specialDefense",
  level: number,
): number {
  const n = Math.max(0, level - 1);
  if (classes.length === 0) return 0;
  let sum = 0;
  for (const c of classes) {
    const g = c.growth;
    sum += g[stat] + g[`${stat}PerLevel` as const] * n;
  }
  return sum / classes.length;
}

/** Material do tier para um nível de item (último tier cujo `minLevel` ≤ nível). */
export function materialForLevel(tiers: readonly TierDef[], level: number): string {
  let out = tiers[0]?.material ?? "";
  for (const t of tiers) if (level >= t.minLevel) out = t.material;
  return out;
}

// ---------------------------------------------------------------------------
// Validação (usada por `validateConfig` e pelo ContentPack)
// ---------------------------------------------------------------------------

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function gearEffectErrors(path: string, e: unknown): string[] {
  const errors: string[] = [];
  if (typeof e !== "object" || e === null) return [`${path}: efeito inválido`];
  const eff = e as Record<string, unknown>;
  if (!GEAR_EFFECT_KINDS.includes(eff.kind as GearEffectKind)) {
    return [`${path}: kind desconhecido "${String(eff.kind)}"`];
  }
  const need = (key: string, min: number, max: number) => {
    if (!isNum(eff[key]) || (eff[key] as number) < min || (eff[key] as number) > max) {
      errors.push(`${path}.${key} deve estar em [${min}, ${max}]`);
    }
  };
  switch (eff.kind as GearEffectKind) {
    case "critChance":
    case "attackSpeed":
    case "defensePierce":
    case "lifesteal":
    case "cooldownReduction":
    case "basicHeal":
      need("value", 0, 1);
      break;
    case "damageBonus":
      need("value", 0, 5);
      if (!["physical", "magic", "any"].includes(eff.damageType as string)) errors.push(`${path}.damageType inválido`);
      break;
    case "dot":
      need("chance", 0, 1);
      need("coefficient", 0, 5);
      need("pulses", 1, 20);
      need("intervalMs", 100, 10_000);
      break;
    case "stun":
      need("chance", 0, 1);
      need("durationMs", 100, 3_000);
      break;
    case "counter":
      need("chance", 0, 1);
      need("coefficient", 0, 5);
      break;
    case "multiHit":
      need("hits", 1, 6);
      need("coefficient", 0.05, 2);
      break;
    case "area":
      need("perTargetCoefficient", 0.05, 2);
      break;
  }
  return errors;
}

/** Erros legíveis de um `EquipmentConfig` (vazio = válido). `chances` = §33 para cruzar com as raridades. */
export function equipmentErrors(eq: unknown, validAssetIds?: ReadonlySet<string>): string[] {
  const errors: string[] = [];
  const check = (cond: boolean, msg: string) => {
    if (!cond) errors.push(msg);
  };
  if (typeof eq !== "object" || eq === null) return ["equipment ausente"];
  const c = eq as Partial<EquipmentConfig>;
  const SLOT_IDS: EquipSlotId[] = ["weapon", "chest", "head", "legs", "boots", "glove", "amulet", "aura", "wings", "pet"];
  const STATS: StatId[] = ["hp", "attack", "specialAttack", "defense", "specialDefense", "critChance", "attackSpeed", "speed"];
  const WEAPONS: WeaponType[] = ["sword", "dagger", "axe", "mace", "crossbow", "staff", "arcaneBook", "wraps", "claws"];

  // --- slots ---------------------------------------------------------------
  const slotIds = new Set<string>();
  if (!Array.isArray(c.slots) || c.slots.length === 0) errors.push("equipment.slots deve ser uma lista não vazia");
  else {
    for (const [i, s] of c.slots.entries()) {
      const at = `equipment.slots[${i}]`;
      check(SLOT_IDS.includes(s?.id), `${at}: id inválido`);
      check(!slotIds.has(s?.id), `${at}: slot duplicado`);
      slotIds.add(s?.id);
      check(typeof s?.name === "string" && s.name.length > 0, `${at}: name vazio`);
      check(isNum(s?.dropWeight) && s.dropWeight > 0, `${at}: dropWeight deve ser > 0`);
    }
  }

  // --- traços e características -------------------------------------------
  const traitIds = new Set<string>();
  const traitTypes = new Set<string>();
  if (!Array.isArray(c.weaponTraits)) errors.push("equipment.weaponTraits deve ser uma lista");
  else {
    for (const [i, t] of c.weaponTraits.entries()) {
      const at = `equipment.weaponTraits[${i}]`;
      check(typeof t?.id === "string" && /^[a-z0-9_]+$/.test(t.id), `${at}: id deve ser [a-z0-9_]+`);
      check(!traitIds.has(t?.id), `${at}: id duplicado`);
      traitIds.add(t?.id);
      check(WEAPONS.includes(t?.weaponType), `${at}: weaponType inválido`);
      check(!traitTypes.has(t?.weaponType), `${at}: já existe traço para "${t?.weaponType}" (1 por tipo)`);
      traitTypes.add(t?.weaponType);
      check(typeof t?.name === "string" && t.name.length > 0, `${at}: name vazio`);
      check(Array.isArray(t?.effects) && t.effects.length > 0, `${at}: effects vazio`);
      for (const [j, e] of (t?.effects ?? []).entries()) errors.push(...gearEffectErrors(`${at}.effects[${j}]`, e));
    }
  }
  const featureIds = new Set<string>();
  if (!Array.isArray(c.features) || c.features.length === 0) errors.push("equipment.features deve ser uma lista não vazia");
  else {
    for (const [i, f] of c.features.entries()) {
      const at = `equipment.features[${i}]`;
      check(typeof f?.id === "string" && /^[a-z0-9_]+$/.test(f.id), `${at}: id deve ser [a-z0-9_]+`);
      check(!featureIds.has(f?.id), `${at}: id duplicado`);
      featureIds.add(f?.id);
      check(typeof f?.name === "string" && f.name.length > 0, `${at}: name vazio`);
      check(Array.isArray(f?.effects) && f.effects.length > 0, `${at}: effects vazio`);
      for (const [j, e] of (f?.effects ?? []).entries()) errors.push(...gearEffectErrors(`${at}.effects[${j}]`, e));
    }
  }

  // --- raridades -----------------------------------------------------------
  if (typeof c.rarity !== "object" || c.rarity === null) errors.push("equipment.rarity ausente");
  else {
    let prev = 0;
    for (const r of RARITY_ORDER) {
      const d = c.rarity[r];
      const at = `equipment.rarity.${r}`;
      if (!d) {
        errors.push(`${at}: ausente`);
        continue;
      }
      check(typeof d.label === "string" && d.label.length > 0, `${at}.label vazio`);
      check(isNum(d.multiplier) && d.multiplier > 0, `${at}.multiplier deve ser > 0`);
      check(isNum(d.multiplier) && d.multiplier >= prev, `${at}.multiplier não pode ser menor que o da raridade anterior`);
      prev = isNum(d.multiplier) ? d.multiplier : prev;
      check(isNum(d.statLines) && Number.isInteger(d.statLines) && d.statLines >= 1 && d.statLines <= 6, `${at}.statLines deve ser inteiro em [1, 6]`);
      check(typeof d.hasFeature === "boolean", `${at}.hasFeature deve ser booleano`);
      check(typeof d.color === "string" && /^#[0-9a-fA-F]{6}$/.test(d.color), `${at}.color deve ser #RRGGBB`);
    }
  }

  // --- templates -----------------------------------------------------------
  const templateIds = new Set<string>();
  const slotsWithTemplate = new Set<string>();
  const weaponTypesCovered = new Set<string>();
  if (!Array.isArray(c.templates) || c.templates.length === 0) errors.push("equipment.templates deve ser uma lista não vazia");
  else {
    const maxLines = Math.max(...RARITY_ORDER.map((r) => c.rarity?.[r]?.statLines ?? 0));
    for (const [i, t] of c.templates.entries()) {
      const at = `equipment.templates[${i}]${t && typeof t.id === "string" ? ` (${t.id})` : ""}`;
      check(typeof t?.id === "string" && /^[a-z0-9_]+$/.test(t.id), `${at}: id deve ser [a-z0-9_]+`);
      check(!templateIds.has(t?.id), `${at}: id duplicado`);
      templateIds.add(t?.id);
      check(typeof t?.name === "string" && t.name.length > 0, `${at}: name vazio`);
      check(SLOT_IDS.includes(t?.slot), `${at}: slot inválido`);
      check(slotIds.has(t?.slot), `${at}: slot "${t?.slot}" não está em equipment.slots`);
      slotsWithTemplate.add(t?.slot);
      if (t?.slot === "weapon") {
        check(WEAPONS.includes(t.weaponType as WeaponType), `${at}: arma precisa de weaponType válido`);
        if (t.weaponType) weaponTypesCovered.add(t.weaponType);
        check(traitTypes.has(t.weaponType as string), `${at}: o tipo "${t.weaponType}" não tem traço em equipment.weaponTraits`);
      } else {
        check(t?.weaponType === undefined, `${at}: só armas têm weaponType`);
      }
      if (!Array.isArray(t?.stats) || t.stats.length === 0) errors.push(`${at}: stats vazio`);
      else {
        const seen = new Set<string>();
        for (const s of t.stats) {
          check(STATS.includes(s?.stat), `${at}: stat inválido "${s?.stat}"`);
          check(!seen.has(s?.stat), `${at}: stat repetido "${s?.stat}"`);
          seen.add(s?.stat);
          check(isNum(s?.weight) && s.weight > 0, `${at}: peso de "${s?.stat}" deve ser > 0`);
        }
        check(t.stats.length >= Math.min(maxLines, 2), `${at}: tem menos linhas (${t.stats.length}) que o mínimo para as raridades`);
      }
      check(typeof t?.iconAssetId === "string" && t.iconAssetId.length > 0, `${at}: iconAssetId vazio`);
      if (validAssetIds && typeof t?.iconAssetId === "string") {
        check(validAssetIds.has(t.iconAssetId), `${at}: ícone "${t.iconAssetId}" não existe no manifesto`);
      }
      check(isNum(t?.dropWeight) && t.dropWeight > 0, `${at}: dropWeight deve ser > 0`);
      check(typeof t?.tiered === "boolean", `${at}: tiered deve ser booleano`);
    }
    for (const s of slotIds) check(slotsWithTemplate.has(s), `equipment.templates: o slot "${s}" não tem nenhum template`);
  }

  // --- notas, tiers, unidades, requisito, venda, tetos ---------------------
  if (!Array.isArray(c.grades) || c.grades.length === 0) errors.push("equipment.grades deve ser uma lista não vazia");
  else {
    let prevQ = Infinity;
    for (const [i, g] of c.grades.entries()) {
      check(GRADES.includes(g?.grade), `equipment.grades[${i}]: letra inválida`);
      check(isNum(g?.minQuality) && g.minQuality >= 0 && g.minQuality <= 100, `equipment.grades[${i}]: minQuality fora de [0,100]`);
      check(isNum(g?.minQuality) && g.minQuality < prevQ, `equipment.grades[${i}]: minQuality deve decrescer`);
      prevQ = isNum(g?.minQuality) ? g.minQuality : prevQ;
    }
    check(c.grades[c.grades.length - 1]?.minQuality === 0, "equipment.grades: a última nota deve começar em 0 (senão há item sem nota)");
  }
  if (!Array.isArray(c.tiers) || c.tiers.length === 0) errors.push("equipment.tiers deve ser uma lista não vazia");
  else {
    check(c.tiers[0]?.minLevel === 1, "equipment.tiers[0].minLevel deve ser 1");
    let prevL = 0;
    for (const [i, t] of c.tiers.entries()) {
      check(isNum(t?.minLevel) && (i === 0 || t.minLevel > prevL), `equipment.tiers[${i}]: minLevel deve crescer`);
      prevL = isNum(t?.minLevel) ? t.minLevel : prevL;
      check(typeof t?.material === "string" && t.material.length > 0, `equipment.tiers[${i}]: material vazio`);
    }
  }
  if (typeof c.unit !== "object" || c.unit === null) errors.push("equipment.unit ausente");
  else {
    for (const s of STATS) {
      const u = c.unit[s];
      check(!!u && (u.mode === "ofReference" || u.mode === "flat") && isNum(u.value) && u.value > 0, `equipment.unit.${s} inválido`);
      if (u?.mode === "ofReference") {
        check(["hp", "attack", "specialAttack", "defense", "specialDefense"].includes(s), `equipment.unit.${s}: "ofReference" só vale para hp/ataques/defesas`);
      }
    }
  }
  const cv = c.attackSpeedLevelCurve;
  if (cv !== undefined) {
    check(isNum(cv.fullAtLevel) && cv.fullAtLevel >= 1, "equipment.attackSpeedLevelCurve.fullAtLevel deve ser >= 1");
    check(isNum(cv.exponent) && cv.exponent > 0 && cv.exponent <= 2, "equipment.attackSpeedLevelCurve.exponent deve estar em (0, 2]");
    check(isNum(cv.minFactor) && cv.minFactor >= 0 && cv.minFactor <= 1, "equipment.attackSpeedLevelCurve.minFactor deve estar em [0, 1]");
  }
  check(isNum(c.requirement?.levelRatio) && c.requirement.levelRatio >= 0 && c.requirement.levelRatio <= 1, "equipment.requirement.levelRatio deve estar em [0, 1]");
  check(isNum(c.affinityBonus) && c.affinityBonus >= 0 && c.affinityBonus <= 1, "equipment.affinityBonus deve estar em [0, 1]");
  if (!c.sell) errors.push("equipment.sell ausente");
  else {
    for (const r of RARITY_ORDER) check(isNum(c.sell.killsEquivalent?.[r]) && c.sell.killsEquivalent[r] > 0, `equipment.sell.killsEquivalent.${r} deve ser > 0`);
    check(isNum(c.sell.qualityFactorMin) && c.sell.qualityFactorMin > 0, "equipment.sell.qualityFactorMin deve ser > 0");
    check(isNum(c.sell.qualityFactorMax) && c.sell.qualityFactorMax >= (c.sell.qualityFactorMin ?? 0), "equipment.sell.qualityFactorMax deve ser >= min");
  }
  if (!c.effectCaps) errors.push("equipment.effectCaps ausente");
  else {
    for (const k of ["critChance", "attackSpeed", "damageBonus", "defensePierce", "lifesteal", "cooldownReduction"] as const) {
      check(isNum(c.effectCaps[k]) && c.effectCaps[k] >= 0, `equipment.effectCaps.${k} deve ser >= 0`);
    }
  }
  return errors;
}
