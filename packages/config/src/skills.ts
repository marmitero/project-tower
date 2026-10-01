/**
 * Catálogo de skills dos heróis (§9, §25 — modelo de `docs/SKILL_SYSTEM.md`).
 *
 * Conteúdo baseado no roster de abilities do OpenRpg (MIT,
 * github.com/openrpg/OpenRpg — `AbilityTemplateDataGenerator`: 10 skills com
 * `Damage{type, potency}`, `TargetType`, `ManaCost`, `Cooldown` e gating por
 * classe). Adaptemos ao nosso modelo (coeficiente sobre ataque, sem MP ainda)
 * — o mapeamento está em `docs/OPENRPG_REFERENCE.md` §5.
 *
 * Os IDs são os mesmos já referenciados pelo catálogo de classes (P-002 /
 * P-022): `skill_*` ativa + 2 `passive_*`. Nomes e números são ⛔ P-022
 * provisórios — mas agora são DADO, não placeholder solto.
 */

import type { StatusId } from "./types.js";

export type SkillTargeting = "single" | "all_enemies" | "self" | "ally_lowest_hp";
export type SkillDamageType = "physical" | "magic" | "none";
export type SkillTag = "dano" | "buff" | "controle" | "cura" | "sustain" | "reativo";

export interface SkillDef {
  id: string;
  /** Nome de exibição (PT-BR). */
  name: string;
  description: string;
  /** Classe dona da skill; null = qualquer herói (futuro). */
  classId: string | null;
  /** §56 — skills disparam sozinhas; o jogador só configura. */
  kind: "active" | "passive";
  targeting: SkillTargeting;
  damageType: SkillDamageType;
  /** Multiplicador do poder ofensivo; null para buff/cura/pura passiva. */
  coefficient: number | null;
  /** Golpes por execução ("dois golpes de 0,6" = coefficient 0.6, hitCount 2). */
  hitCount?: number;
  cooldownMs: number;
  durationMs?: number;
  statusId?: StatusId;
  canCrit: boolean;
  tags: SkillTag[];
  /**
   * Custo de recurso (OpenRpg `ManaCost`). ⛔ Sem efeito hoje: os contratos
   * ainda não têm MP — fica pronto para a Fase 6 decidir (ver
   * `docs/OPENRPG_REFERENCE.md` §7).
   */
  manaCost: number;
}

/**
 * Roster inicial: 3 skills por herói (1 ativa + 2 passivas, §22).
 *
 * Correspondências com o OpenRpg (potências e formatos servem de base):
 * - `skill_counter`    ≈ Power Strike (single, alto potency, custo médio)
 * - `skill_volley`     ≈ Slash (multi-target, potency menor por alvo)
 * - `skill_nova`       ≈ Ice Storm / Fire Bolt (mágica, área)
 * - `skill_hex`        ≈ Poison Blade (single + status)
 * - `passive_*`        ≈ efeitos estáticos de classe (StaticEffect)
 */
export const skills: SkillDef[] = [
  // ---- Guardião (reativo/tank) ---------------------------------------------
  {
    id: "skill_counter",
    name: "Contra-ataque",
    description: "Golpe de retaliação quando bloqueia — dano físico concentrado.",
    classId: "guardian",
    kind: "active",
    targeting: "single",
    damageType: "physical",
    coefficient: 1.35,
    cooldownMs: 6000,
    canCrit: true,
    tags: ["dano", "reativo"],
    manaCost: 8,
  },
  {
    id: "passive_bulwark",
    name: "Baluarte",
    description: "Postura firme: +15% de defesa passivamente.",
    classId: "guardian",
    kind: "passive",
    targeting: "self",
    damageType: "none",
    coefficient: null,
    cooldownMs: 0,
    canCrit: false,
    tags: ["buff"],
    manaCost: 0,
  },
  {
    id: "passive_riposte",
    name: "Riposte",
    description: "Após defender um golpe, 20% de chance de revidar imediatamente.",
    classId: "guardian",
    kind: "passive",
    targeting: "single",
    damageType: "physical",
    coefficient: 0.6,
    cooldownMs: 0,
    canCrit: true,
    tags: ["dano", "reativo"],
    manaCost: 0,
  },

  // ---- Arqueiro (velocidade/perfurante) ------------------------------------
  {
    id: "skill_volley",
    name: "Volta de Flechas",
    description: "Rajada de flechas atinge todos os inimigos em campo.",
    classId: "ranger",
    kind: "active",
    targeting: "all_enemies",
    damageType: "physical",
    coefficient: 0.85,
    hitCount: 2,
    cooldownMs: 8000,
    canCrit: true,
    tags: ["dano"],
    manaCost: 4,
  },
  {
    id: "passive_ricochet",
    name: "Ricochete",
    description: "Tiros saltam: 25% de chance de um segundo golpe a 40% do dano.",
    classId: "ranger",
    kind: "passive",
    targeting: "single",
    damageType: "physical",
    coefficient: 0.4,
    cooldownMs: 0,
    canCrit: false,
    tags: ["dano"],
    manaCost: 0,
  },
  {
    id: "passive_momentum",
    name: "Momento",
    description: "Cada acerto seguido acelera o próximo golpe (+3% IAS, empilha 5×).",
    classId: "ranger",
    kind: "passive",
    targeting: "self",
    damageType: "none",
    coefficient: null,
    durationMs: 5000,
    cooldownMs: 0,
    canCrit: false,
    tags: ["buff"],
    manaCost: 0,
  },

  // ---- Arcanista (mágico/área) ---------------------------------------------
  {
    id: "skill_nova",
    name: "Nova Arcana",
    description: "Descarga elemental explode em área — dano mágico em todos.",
    classId: "arcanist",
    kind: "active",
    targeting: "all_enemies",
    damageType: "magic",
    coefficient: 1.0,
    cooldownMs: 10000,
    canCrit: true,
    tags: ["dano"],
    manaCost: 15,
  },
  {
    id: "passive_arcane_surge",
    name: "Surto Arcano",
    description: "Cada skill mágica amplifica a próxima em +12% (empilha 3×).",
    classId: "arcanist",
    kind: "passive",
    targeting: "self",
    damageType: "none",
    coefficient: null,
    durationMs: 6000,
    cooldownMs: 0,
    canCrit: false,
    tags: ["buff"],
    manaCost: 0,
  },
  {
    id: "passive_manaskin",
    name: "Pele de Mana",
    description: "20% do dano mágico recebido é absorvido por um escudo.",
    classId: "arcanist",
    kind: "passive",
    targeting: "self",
    damageType: "none",
    coefficient: null,
    cooldownMs: 0,
    canCrit: false,
    tags: ["sustain"],
    manaCost: 0,
  },

  // ---- Invocador Sombrio (DoT/multi-hit) -----------------------------------
  {
    id: "skill_hex",
    name: "Malefício",
    description: "Maldição perfura a alma: dano mágico e veneno garantido.",
    classId: "shadowcaller",
    kind: "active",
    targeting: "single",
    damageType: "magic",
    coefficient: 1.15,
    cooldownMs: 7000,
    statusId: "poison",
    durationMs: 6000,
    canCrit: true,
    tags: ["dano", "controle"],
    manaCost: 6,
  },
  {
    id: "passive_venom",
    name: "Veneno",
    description: "Golpes aplicam veneno (4% do dano por segundo, 4s).",
    classId: "shadowcaller",
    kind: "passive",
    targeting: "single",
    damageType: "none",
    coefficient: null,
    statusId: "poison",
    durationMs: 4000,
    cooldownMs: 0,
    canCrit: false,
    tags: ["sustain", "controle"],
    manaCost: 0,
  },
  {
    id: "passive_drain",
    name: "Drenar",
    description: "Cura em 30% do dano mágico causado por skills.",
    classId: "shadowcaller",
    kind: "passive",
    targeting: "self",
    damageType: "none",
    coefficient: 0.3,
    cooldownMs: 0,
    canCrit: false,
    tags: ["cura", "sustain"],
    manaCost: 0,
  },
];

/** Índice rápido por id. */
export const skillsById: Readonly<Record<string, SkillDef>> = Object.freeze(
  Object.fromEntries(skills.map((s) => [s.id, s])),
);
