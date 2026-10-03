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

import type { EquipSlotId, StatId, WeaponType } from "./types.js";
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
  /** `characters/<id>/*` — corpo animado (formato legado do pack, 4 direções). */
  sheets: CharacterSheets;
  /**
   * Atlas compacto `ita-atlas-v1` (docs/ART_PIPELINE.md §3): 1 PNG voltado à direita com
   * idle/walk/attack/hurt/death; a esquerda é espelhada em runtime. Quando presente e
   * carregável, TEM PRIORIDADE sobre `sheets`; `sheets` vira o fallback visual (o arquétipo
   * do pack que serviu de atlas-guia).
   */
  atlas?: string;
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
    affinityWeapon: "sword",
    assets: { portrait: "portraits/hero", sheets: charSheets("hero") },
    // Identidade (base OpenRpg Fighter): tanque físico bruto.
    attributes: { strength: 26, dexterity: 10, constitution: 28, intelligence: 8, wisdom: 14, charisma: 14 },
    // ⛔ P-022 — a identidade da skill e sua progressão ainda não são regra.
    activeSkillId: "skill_counter",
    passiveSkillIds: ["passive_bulwark", "passive_riposte"],
  },
  {
    id: "arcanist",
    name: "Arcanista",
    role: "Mágico / área",
    damageType: "magic",
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
    affinityWeapon: "crossbow",
    assets: { portrait: "portraits/archer", sheets: charSheets("archer") },
    // Identidade: velocidade e crítico (DEX alta — modificador perfurante).
    // ADR-021: STR 18→24, INT 10→8, SAB 12→10 — com ataque físico = FOR×1,0 + DES×0,3 o arqueiro
    // ficava ~40% abaixo dos outros em duelos on-curve; agora é o "canhão de vidro" físico.
    attributes: { strength: 24, dexterity: 24, constitution: 20, intelligence: 8, wisdom: 10, charisma: 14 },
    activeSkillId: "skill_volley",
    passiveSkillIds: ["passive_ricochet", "passive_momentum"],
  },
  {
    id: "shadowcaller",
    name: "Invocador Sombrio",
    role: "DoT / multi-hit",
    damageType: "magic",
    affinityWeapon: "claws",
    assets: { portrait: "portraits/necromancer", sheets: charSheets("necromancer") },
    // Identidade: sustain/DoT mágico (INT+SAB equilibrados).
    attributes: { strength: 12, dexterity: 16, constitution: 18, intelligence: 24, wisdom: 18, charisma: 12 },
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

// Inimigos da Torre: ver `enemies.ts` (ADR-021/022 — definidos por atributos).

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

