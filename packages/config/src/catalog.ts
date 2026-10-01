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
 * Essa é `P-002` (🔴 CRÍTICA). Em 2026-10-01 o usuário decidiu a **inserção
 * genérica**: os 4 heróis entram com o material que o pack oferece
 * (`ASSET_INVENTORY.md` §5.3) e este catálogo fica modelado como DADO, para
 * que a identidade definitiva (nomes, skills, raridades) seja remodelação de
 * dados — não reescrita de código.
 *
 * Regras estructurais que NÃO são pendentes e estão respeitadas aqui:
 * os quatro se distinguem por ATRIBUTO, não só por sprite — físico (hero,
 * archer) e mágico (mage, necromancer) cobertos (§18), um de cada par com
 * identidade de velocidade e um de cada par com identidade de sustain/DoT.
 *
 * Asset IDs são **IDs do manifesto** (`apps/game-web/public/assets/manifest.json`),
 * nunca caminhos montados em runtime (§62). `charSheets()` expande o id do
 * personagem para as 6 folhas conhecidas — se o pack mudar, o teste
 * `tests/integration/assets-config.test.ts` reprova em alto e bom som.
 */

import type { EquipSlotId, Rarity, StatId, WeaponType } from "./types.js";
import { growthFromAttributes, type CharacterAttributes } from "./attributes.js";

/** As 6 folhas de animação de um personagem (§23). Todas obrigatórias. */
export interface CharacterSheets {
  idle: string;
  walk: string;
  run: string;
  attack: string;
  hurt: string;
  death: string;
}

export type CharacterSheetKey = keyof CharacterSheets;

export const CHARACTER_SHEET_KEYS: readonly CharacterSheetKey[] = [
  "idle",
  "walk",
  "run",
  "attack",
  "hurt",
  "death",
];

/**
 * Expande o id de um personagem do pack nas 6 folhas do manifesto.
 *
 * Montar os ids AQUI é dado estático de catálogo, não "runtime montando
 * caminho" (§62) — o teste de manifesto cobre cada id gerado.
 */
export function charSheets(name: string): CharacterSheets {
  return {
    idle: `characters/${name}/${name}_idle_sheet`,
    walk: `characters/${name}/${name}_walk_sheet`,
    run: `characters/${name}/${name}_run_sheet`,
    attack: `characters/${name}/${name}_attack_sheet`,
    hurt: `characters/${name}/${name}_hurt_sheet`,
    death: `characters/${name}/${name}_death_sheet`,
  };
}

/** Aparência de um personagem: retrato (busto) + folhas (corpo). */
export interface CharacterAssets {
  /** `portraits/*` — nem todo inimigo tem; heróis têm sempre. */
  portrait?: string;
  /** `characters/<id>/*` — corpo animado. */
  sheets: CharacterSheets;
}

/** Herói SEMPRE tem retrato (§4 — a HUD mostra o busto). */
export interface HeroAssets extends CharacterAssets {
  portrait: string;
}

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
  assets: HeroAssets;
  /**
   * Identidade da classe (base OpenRpg, `docs/OPENRPG_REFERENCE.md` §3).
   * Os stats de combate (`growth`) são PROJEÇÃO derivada destes números.
   */
  attributes: CharacterAttributes;
  growth: ClassGrowth;
  /** ⛔ P-022 provisório — §22: 1 ativa, 2 passivas. */
  activeSkillId: string;
  passiveSkillIds: string[];
}

const classSeeds: Omit<HeroClassDef, "growth">[] = [
  {
    id: "guardian",
    name: "Guardião",
    role: "Reativo / tank",
    damageType: "physical",
    baseRarity: "common",
    affinityWeapon: "sword",
    assets: { portrait: "portraits/hero", sheets: charSheets("hero") },
    // Identidade (base OpenRpg Fighter): tanque físico bruto.
    attributes: { strength: 26, dexterity: 10, constitution: 28, intelligence: 8, wisdom: 14, charisma: 12 },
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
    assets: { portrait: "portraits/mage", sheets: charSheets("mage") },
    // Identidade (base OpenRpg Mage): puro poder mágico, vidro.
    attributes: { strength: 10, dexterity: 12, constitution: 16, intelligence: 28, wisdom: 20, charisma: 14 },
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
    assets: { portrait: "portraits/archer", sheets: charSheets("archer") },
    // Identidade: velocidade e crítico (DEX alta — modificador perfurante).
    attributes: { strength: 18, dexterity: 24, constitution: 20, intelligence: 10, wisdom: 12, charisma: 14 },
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
    assets: { portrait: "portraits/necromancer", sheets: charSheets("necromancer") },
    // Identidade: sustain/DoT mágico (INT+SAB equilibrados).
    attributes: { strength: 12, dexterity: 16, constitution: 18, intelligence: 24, wisdom: 18, charisma: 16 },
    activeSkillId: "skill_hex",
    passiveSkillIds: ["passive_venom", "passive_drain"],
  },
];

/**
 * As classes com `growth` derivado dos atributos (base OpenRpg).
 * Trocar a fantasia de uma classe = editar `attributes`; o balance se
 * recompõe pela fórmula documentada (`attributes.ts`).
 */
export const classes: HeroClassDef[] = classSeeds.map((seed) => ({
  ...seed,
  growth: growthFromAttributes(seed.attributes),
}));

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
  assets: CharacterAssets;
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
    assets: { portrait: "portraits/slime", sheets: charSheets("slime") },
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
    assets: { portrait: "portraits/goblin", sheets: charSheets("goblin") },
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
    assets: { portrait: "portraits/skeleton", sheets: charSheets("skeleton") },
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
    // Morcego não tem retrato no pack (§62 — nada de placeholder).
    assets: { sheets: charSheets("bat") },
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
    assets: { portrait: "portraits/orc", sheets: charSheets("orc") },
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
    // Sem retrato no pack (§62).
    assets: { sheets: charSheets("fireorc") },
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
    // Sem retrato no pack (§62).
    assets: { sheets: charSheets("shadowgoblin") },
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
