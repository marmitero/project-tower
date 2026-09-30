/**
 * Catálogo de classes de herói e de inimigos.
 *
 * ⚠️ LEIA ANTES DE EDITAR QUALQUER NÚMERO AQUI.
 *
 * O Master-Prompt §10 exige 4 heróis com "diferenças reais de função,
 * atributos, skills, estilo de combate e progressão" e proíbe quatro
 * personagens "visualmente diferentes mas mecanicamente iguais". Ele NÃO
 * define nome, classe, atributos-base, skills, raridade ou curva de cada um.
 *
 * Essa é `P-002`, marcada como 🔴 CRÍTICA em `docs/PENDING_RULES.md`:
 * "a identidade dos 4 heróis É o conteúdo central do jogo... Quatro heróis
 * errados significa reescrever a coleta, o balanceamento e a Torre inteira."
 *
 * O que está aqui é um esqueleto FUNCIONAL, derivado dos candidatos de arte
 * do pack (`ASSET_INVENTORY.md` §5.3) e da necessidade de cobrir físico ×
 * mágico. É provisório, não é uma regra. Substituir por decisão aprovada.
 *
 * Regra estructural que NÃO é pendente e está respeitada aqui: os quatro
 * precisam ser distinguíveis por ATRIBUTO, não só por sprite. Físico (hero,
 * archer) e mágico (mage, necromancer) cobertos; um de cada par com identidade
 * de velocidade e um de cada par com identidade de sustain/DoT.
 */

import type { EquipSlotId, Rarity, StatId, WeaponType } from "./types.js";

/** Atributos-base e crescimento por nível. ⛔ P-002 / P-006b provisório. */
export interface ClassGrowth {
  hp: number;
  hpPerLevel: number;
  attack: number;
  attackPerLevel: number;
  specialAttack: number;
  specialAttackPerLevel: number;
  defense: number;
  defensePerLevel: number;
  specialDefense: number;
  specialDefensePerLevel: number;
  /** Fração: 0.05 = 5%. */
  critChance: number;
  /** Fração: 0.20 = 20% mais rápido. */
  attackSpeed: number;
  speed: number;
}

export interface HeroClassDef {
  id: string;
  name: string;
  role: string;
  /** Físico, mágico ou híbrido — o eixo de decisão do §18. */
  damageType: "physical" | "magic" | "hybrid";
  baseRarity: Rarity;
  affinityWeapon: WeaponType | null;
  spriteAssetId: string;
  portraitAssetId: string;
  growth: ClassGrowth;
  /** ⛔ P-002 provisório — §22: 1 ativa, 2 passivas. */
  activeSkillId: string;
  passiveSkillIds: string[];
}

export const classes: HeroClassDef[] = [
  {
    id: "guardian",
    name: "Guardião",
    role: "Reativo / tank",
    damageType: "physical",
    baseRarity: "common",
    affinityWeapon: "sword",
    spriteAssetId: "char/hero",
    portraitAssetId: "portrait/hero",
    growth: {
      hp: 180, hpPerLevel: 22,
      attack: 24, attackPerLevel: 3.1,
      specialAttack: 8, specialAttackPerLevel: 0.6,
      defense: 22, defensePerLevel: 2.4,
      specialDefense: 12, specialDefensePerLevel: 1.0,
      critChance: 0.05,
      attackSpeed: 0,
      speed: 10,
    },
    // ⛔ P-022 — a identidade da skill e sua progressão ainda não são regra.
    activeSkillId: "skill_counter",
    passiveSkillIds: ["passive_bulwark", "passive_riposte"],
  },
  {
    id: "arcanist",
    name: "Arcanista",
    role: "Mágico / área",
    damageType: "magic",
    baseRarity: "uncommon",
    affinityWeapon: "staff",
    spriteAssetId: "char/mage",
    portraitAssetId: "portrait/mage",
    growth: {
      hp: 120, hpPerLevel: 12,
      attack: 10, attackPerLevel: 1.1,
      specialAttack: 30, specialAttackPerLevel: 4.2,
      defense: 10, defensePerLevel: 1.0,
      specialDefense: 18, specialDefensePerLevel: 1.6,
      critChance: 0.05,
      attackSpeed: 0,
      speed: 9,
    },
    // Único com área real — por isso é o herói de Boss.
    activeSkillId: "skill_nova",
    passiveSkillIds: ["passive_arcane_surge", "passive_manaskin"],
  },
  {
    id: "ranger",
    name: "Arqueiro",
    role: "Velocidade / físico à distância",
    damageType: "physical",
    baseRarity: "common",
    affinityWeapon: "crossbow",
    spriteAssetId: "char/archer",
    portraitAssetId: "portrait/archer",
    growth: {
      hp: 140, hpPerLevel: 15,
      attack: 22, attackPerLevel: 2.9,
      specialAttack: 12, specialAttackPerLevel: 1.4,
      defense: 12, defensePerLevel: 1.2,
      specialDefense: 10, specialDefensePerLevel: 0.9,
      critChance: 0.12,
      // IAS é a identidade dele, não um brinde.
      attackSpeed: 0.2,
      speed: 16,
    },
    activeSkillId: "skill_volley",
    passiveSkillIds: ["passive_ricochet", "passive_momentum"],
  },
  {
    id: "shadowcaller",
    name: "Invocador Sombrio",
    role: "DoT / multi-hit",
    damageType: "magic",
    baseRarity: "rare",
    affinityWeapon: "claws",
    spriteAssetId: "char/necromancer",
    portraitAssetId: "portrait/necromancer",
    growth: {
      hp: 130, hpPerLevel: 14,
      attack: 12, attackPerLevel: 1.3,
      specialAttack: 26, specialAttackPerLevel: 3.6,
      defense: 11, defensePerLevel: 1.1,
      specialDefense: 16, specialDefensePerLevel: 1.5,
      critChance: 0.08,
      attackSpeed: 0.1,
      speed: 12,
    },
    activeSkillId: "skill_hex",
    passiveSkillIds: ["passive_venom", "passive_drain"],
  },
];

/** Os 4 heróis iniciais (§10 — o jogador ESCOLHE 1). */
export const STARTER_HERO_CLASSES: readonly string[] = classes.map((c) => c.id);

// ---------------------------------------------------------------------------
// Inimigos da Torre (⛔ P-006 — stats, papéis e resistências)
// ---------------------------------------------------------------------------

export type EnemyRole = "guardian" | "swift" | "caster" | "balanced" | "elite";

export interface EnemyDef {
  id: string;
  name: string;
  role: EnemyRole;
  spriteAssetId: string;
  growth: ClassGrowth;
  /** Faixa de andares da Torre onde aparece, 1-indexado. */
  minFloor: number;
  maxFloor: number;
}

export const enemies: EnemyDef[] = [
  {
    id: "slime",
    name: "Gosma",
    role: "guardian",
    spriteAssetId: "char/slime",
    growth: {
      hp: 120, hpPerLevel: 18,
      attack: 16, attackPerLevel: 2.2,
      specialAttack: 6, specialAttackPerLevel: 0.4,
      defense: 14, defensePerLevel: 1.4,
      specialDefense: 8, specialDefensePerLevel: 0.7,
      critChance: 0, attackSpeed: -0.2, speed: 6,
    },
    minFloor: 1, maxFloor: 8,
  },
  {
    id: "goblin",
    name: "Goblin",
    role: "swift",
    spriteAssetId: "char/goblin",
    growth: {
      hp: 90, hpPerLevel: 11,
      attack: 18, attackPerLevel: 2.4,
      specialAttack: 6, specialAttackPerLevel: 0.5,
      defense: 9, defensePerLevel: 0.9,
      specialDefense: 7, specialDefensePerLevel: 0.6,
      critChance: 0.05, attackSpeed: 0.15, speed: 14,
    },
    minFloor: 1, maxFloor: 12,
  },
  {
    id: "skeleton",
    name: "Esqueleto",
    role: "guardian",
    spriteAssetId: "char/skeleton",
    growth: {
      hp: 140, hpPerLevel: 20,
      attack: 17, attackPerLevel: 2.3,
      specialAttack: 8, specialAttackPerLevel: 0.6,
      defense: 16, defensePerLevel: 1.6,
      specialDefense: 10, specialDefensePerLevel: 0.9,
      critChance: 0, attackSpeed: 0, speed: 9,
    },
    minFloor: 4, maxFloor: 18,
  },
  {
    id: "bat",
    name: "Morcego",
    role: "swift",
    spriteAssetId: "char/bat",
    growth: {
      hp: 80, hpPerLevel: 10,
      attack: 19, attackPerLevel: 2.5,
      specialAttack: 7, specialAttackPerLevel: 0.5,
      defense: 8, defensePerLevel: 0.8,
      specialDefense: 8, specialDefensePerLevel: 0.7,
      critChance: 0.08, attackSpeed: 0.25, speed: 18,
    },
    minFloor: 6, maxFloor: 20,
  },
  {
    id: "orc",
    name: "Orc",
    role: "balanced",
    spriteAssetId: "char/orc",
    growth: {
      hp: 180, hpPerLevel: 25,
      attack: 24, attackPerLevel: 3.2,
      specialAttack: 9, specialAttackPerLevel: 0.7,
      defense: 18, defensePerLevel: 1.8,
      specialDefense: 11, specialDefensePerLevel: 1.0,
      critChance: 0.05, attackSpeed: 0, speed: 11,
    },
    minFloor: 10, maxFloor: 30,
  },
  {
    id: "fireorc",
    name: "Orc Flamejante",
    role: "caster",
    spriteAssetId: "char/fireorc",
    growth: {
      hp: 150, hpPerLevel: 19,
      attack: 12, attackPerLevel: 1.3,
      specialAttack: 26, specialAttackPerLevel: 3.3,
      defense: 14, defensePerLevel: 1.3,
      specialDefense: 18, specialDefensePerLevel: 1.7,
      critChance: 0.05, attackSpeed: 0, speed: 10,
    },
    minFloor: 14, maxFloor: 30,
  },
  {
    id: "shadowgoblin",
    name: "Goblin Sombrio",
    role: "elite",
    spriteAssetId: "char/shadowgoblin",
    growth: {
      hp: 260, hpPerLevel: 34,
      attack: 30, attackPerLevel: 4.1,
      specialAttack: 14, specialAttackPerLevel: 1.3,
      defense: 20, defensePerLevel: 2.0,
      specialDefense: 16, specialDefensePerLevel: 1.4,
      critChance: 0.12, attackSpeed: 0.2, speed: 16,
    },
    minFloor: 18, maxFloor: 40,
  },
];

// ---------------------------------------------------------------------------
// Equipamento (⛔ P-001 / P-025 — templates e catálogo)
// ---------------------------------------------------------------------------

/** Atributos que um item pode rolar. O MESMO conjunto do herói. */
export const EQUIPABLE_STATS: readonly StatId[] = [
  "hp",
  "attack",
  "specialAttack",
  "defense",
  "specialDefense",
  "critChance",
  "attackSpeed",
  "speed",
];

/** ⛔ P-001 provisório — 10 slots, reaproveitado da referência (ADR-004). */
export const EQUIP_SLOTS: readonly EquipSlotId[] = [
  "weapon",
  "chest",
  "head",
  "legs",
  "boots",
  "glove",
  "amulet",
  "aura",
  "wings",
  "pet",
];

/** ⛔ P-025 provisório — template por slot. Base antes do X. */
export const EQUIP_TEMPLATES: Record<EquipSlotId, { stat: StatId; base: number; weaponType?: WeaponType }> = {
  weapon: { stat: "attack", base: 12, weaponType: "sword" },
  chest: { stat: "defense", base: 9 },
  head: { stat: "specialDefense", base: 7 },
  legs: { stat: "hp", base: 70 },
  boots: { stat: "speed", base: 5 },
  glove: { stat: "attack", base: 6 },
  amulet: { stat: "specialAttack", base: 10 },
  aura: { stat: "critChance", base: 3 },
  wings: { stat: "attackSpeed", base: 4 },
  pet: { stat: "hp", base: 50 },
};
