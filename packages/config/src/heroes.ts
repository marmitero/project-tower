/**
 * Identidades dos 4 heróis iniciais (P-002 — DECIDIDA em 2026-10-01).
 *
 * O usuário delegou e autorizou a decisão: "algo completo e complexo, sem ser
 * muito genérico, editável depois". Este arquivo é a **camada de identidade**:
 * nome, epíteto, lore, personalidade, voz, raridade, estilo de combate e
 * aquisição. A MECÂNICA fica em `catalog.ts` (atributos/skills) e a derivação
 * de stats em `attributes.ts` — as três camadas se referenciam por id.
 *
 * Ancoragem (ADR-014/015): arquétipos e escada de raridade seguem o OpenRpg
 * (Fighter/Mage, QualityType Common→…→Mythical≈Celestial); nomes, epítetos e
 * lore são criação nossa (autorização do usuário). Fontes de aquisição
 * respeitam §12: fragmentos NUNCA droppam de inimigos comuns da Torre —
 * apenas Bosses, eventos, caixas, summons, mercado e recompensas especiais.
 *
 * Remodelar um herói = editar uma entrada aqui + (se mexer em mecânica) o
 * `catalog.ts`. Nada de código depende dos nomes.
 */

import type { Rarity, StatId } from "./types.js";

/** De onde o herói pode vir DEPOIS da escolha inicial (§10). */
export type AcquisitionOrigin = "starter" | "boss" | "event" | "summon" | "market";

export interface HeroIdentityDef {
  /** id estável do herói (nunca o nome de exibição). */
  id: string;
  /** Classe mecânica (`catalog.ts` — 1:1 no MVP). */
  classId: string;
  /** Nome de exibição. */
  name: string;
  /** "o Inabalável" etc. */
  epithet: string;
  /** 2–3 frases de lore (PT-BR). */
  lore: string;
  /** 3 traços de personalidade. */
  personality: [string, string, string];
  /** Notas de voz para dublagem/efeitos (⛔ P-061 futuro). */
  voiceNotes: string;
  /** Raridade = identidade de aquisição ("preciso conseguir esse personagem", §109). */
  rarity: Rarity;
  /** Assinatura da skill ativa (deve casar com `catalog.ts`). */
  signatureSkillId: string;
  /** Estilo de combate em uma frase. */
  combatStyle: string;
  range: "melee" | "ranged";
  /** Prioridade de atributos para auto-equip/loot futuro (§36). */
  statPriority: [StatId, StatId, StatId];
  acquisition: {
    origin: AcquisitionOrigin;
    /** Flavor da obtenção futura — SEMPRE fonte que o §12 permite. */
    hint: string;
  };
}

export const HEROES: HeroIdentityDef[] = [
  {
    id: "hero_aldric",
    classId: "guardian",
    name: "Aldric",
    epithet: "o Inabalável",
    lore:
      "Sentinela da Porta Velha de Karth, Aldric segurou três cercos sozinho enquanto o reino recuava para as colinas. " +
      "Perdeu um olho, não a palavra: enquanto ele estiver de pé, nada passa.",
    personality: ["estoico", "protetor", "teimoso"],
    voiceNotes: "Voz grave e frases curtas; quase nunca eleva o tom; silêncios longos entre as palavras.",
    rarity: "common",
    signatureSkillId: "skill_counter",
    combatStyle: "Contra-ataque e mitigação — vence desgastando quem ousa atacá-lo.",
    range: "melee",
    statPriority: ["defense", "hp", "specialDefense"],
    acquisition: {
      origin: "starter",
      hint: "Herói inicial; depois, Mercado comum e recompensas especiais.",
    },
  },
  {
    id: "hero_kaia",
    classId: "ranger",
    name: "Kaia",
    epithet: "a Pássaro-Livre",
    lore:
      "Filha dos arautos do Vento-Sul, Kaia caçava mensageiros das nuvens antes de caçar monstros. " +
      "Dizem que a flecha dela só chega depois que o alvo já se arrependeu.",
    personality: ["leve", "sarcástica", "independente"],
    voiceNotes: "Fala rápido e com sorriso na voz; provoca antes de acertar; riu das próprias piadas.",
    rarity: "uncommon",
    signatureSkillId: "skill_volley",
    combatStyle: "Rajada e velocidade — vence no tempo entre os golpes.",
    range: "ranged",
    statPriority: ["attackSpeed", "critChance", "attack"],
    acquisition: {
      origin: "starter",
      hint: "Herói inicial; depois, fragmentos em eventos e caixas especiais.",
    },
  },
  {
    id: "hero_maelis",
    classId: "arcanist",
    name: "Maelis",
    epithet: "a Estelar",
    lore:
      "Maelis catalogou estrelas que não existem mais. Quando a última biblioteca de Vhal ardeu, " +
      "ela engoliu as chamas num punhado de luz — e virou a coisa mais perigosa da sala.",
    personality: ["curiosa", "distraída", "devastadora"],
    voiceNotes: "Dicção clara e didática; pausa como quem revela um segredo; ri quando a conta fecha.",
    rarity: "rare",
    signatureSkillId: "skill_nova",
    combatStyle: "Explosão em área — vence antes que a luta comece.",
    range: "ranged",
    statPriority: ["specialAttack", "attackSpeed", "critChance"],
    acquisition: {
      origin: "starter",
      hint: "Herói inicial; depois, fragmentos em Bosses e summons.",
    },
  },
  {
    id: "hero_vorath",
    classId: "shadowcaller",
    name: "Vorath",
    epithet: "o Silente",
    lore:
      "Ninguém lembra de Vorath ter chegado; ele já estava lá quando os mortos se levantaram. " +
      "Drena o que os outros derramam — e cobra juros da dívida.",
    personality: ["silencioso", "paciente", "perturbadoramente educado"],
    voiceNotes: "Sussurro estável, sem urgência; nunca completa a ameaça em voz alta.",
    rarity: "epic",
    signatureSkillId: "skill_hex",
    combatStyle: "Veneno e drenagem — vence em todas as lutas longas.",
    range: "ranged",
    statPriority: ["specialAttack", "specialDefense", "hp"],
    acquisition: {
      origin: "starter",
      hint: "Herói inicial; depois, eventos especiais e ofertas raras no Mercado.",
    },
  },
];

export const heroById: Readonly<Record<string, HeroIdentityDef>> = Object.freeze(
  Object.fromEntries(HEROES.map((h) => [h.id, h])),
);

/** Identidade pela classe (MVP: 1 herói por classe). Lança se não houver. */
export function heroIdentityForClass(classId: string): HeroIdentityDef {
  const hero = HEROES.find((h) => h.classId === classId);
  if (!hero) throw new Error(`Sem identidade de herói para a classe: ${classId}`);
  return hero;
}
