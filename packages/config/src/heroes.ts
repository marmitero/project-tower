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
import type { AttributeId } from "./attributes.js";

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
  /**
   * Raridade do herói INICIAL (adendo de 2026-10-03, ADR-024): os 4 são
   * `uncommon` — ninguém começa com vantagem de raridade. A variação de
   * raridade/qualidade existe só na AQUISIÇÃO pelo jogo (`acquisition.ts`).
   */
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
  /**
   * Arte PRÓPRIA da identidade (ADR-032): retrato e atlas `ita-atlas-v1`. Ausente ⇒ o herói usa
   * a arte da classe (`catalog.ts`). É o que permite 5 heróis visualmente distintos por classe.
   */
  assets?: { portrait?: string; atlas?: string };
  /**
   * Identidade mecânica da variação (ADR-033): delta de atributos sobre o modelo da classe, de
   * soma zero e |Δ| ≤ 6 (validado). Aplicado na rolagem de aquisição; ausente = o modelo da classe.
   */
  attributeDelta?: Partial<Record<AttributeId, number>>;
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
    rarity: "uncommon",
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
    // ADR-035: a Kaia tem corpo PRÓPRIO (arqueira de capa verde, como no retrato). Antes ela herdava
    // as folhas da classe — o Arqueiro Esquelético do pack — que agora é o Ossian (RESERVED_HEROES).
    assets: { atlas: "heroes/ranger_kaia" },
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
    rarity: "uncommon",
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
    rarity: "uncommon",
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

/**
 * Identidades ADICIONAIS (ADR-033): as variações obtidas pelo jogo (Mercado, caixas, summons,
 * Chefes). NÃO são oferecidas na criação (`HEROES` = só os 4 iniciais do §10). Cada lote de arte
 * acrescenta aqui as que ganharam atlas próprio.
 */
export const EXTRA_HEROES: HeroIdentityDef[] = [
  {
    id: "hero_borin",
    classId: "guardian",
    name: "Borin",
    epithet: "o Escudeiro da Muralha",
    lore:
      "Borin carregava o escudo de um cavaleiro até o dia em que o cavaleiro caiu e o escudo ficou. " +
      "Desde então ele não recua um passo: onde Borin pisa, a muralha passa a existir.",
    personality: ["teimoso", "leal", "bonachão"],
    voiceNotes: "Voz rouca e calorosa; resmunga piadas entre os golpes; ri alto quando o escudo aguenta.",
    rarity: "uncommon",
    signatureSkillId: "skill_counter",
    combatStyle: "Muralha viva — aguenta mais, bate menos; vence quem desiste primeiro.",
    range: "melee",
    statPriority: ["hp", "defense", "specialDefense"],
    acquisition: {
      origin: "market",
      hint: "Mercado comum, caixas e invocações de Guardião.",
    },
    assets: { atlas: "heroes/guardian_borin" },
    attributeDelta: { constitution: 2, strength: -4, wisdom: 2 },
  },
];

/**
 * Identidades RESERVADAS para o futuro (ADR-035): já têm nome, lore e arte, mas ainda NÃO entram no
 * elenco — não são sorteadas na aquisição nem aparecem no códice. Para liberar uma, mova a entrada
 * para `EXTRA_HEROES` (e defina `attributeDelta` — a CI exige poder ±8 % — e uma skill própria).
 */
export const RESERVED_HEROES: HeroIdentityDef[] = [
  {
    id: "hero_ossian",
    classId: "ranger",
    name: "Ossian",
    epithet: "o Arqueiro Sem Sono",
    lore:
      "Ossian caiu defendendo uma ponte que já não existe e se recusou a descansar: seus ossos ainda puxam a corda, " +
      "e as flechas ainda acham o alvo. Serve a quem lhe der uma ponte nova para guardar.",
    personality: ["paciente", "sombrio", "leal"],
    voiceNotes: "Quase não fala; o estalar dos ossos faz o papel de risada; um suspiro seco antes de cada disparo.",
    rarity: "uncommon",
    // Skill própria fica para quando o herói for liberado (só existem as 4 skills de classe até o L5).
    signatureSkillId: "skill_volley",
    combatStyle: "Atirador paciente — não se cansa, não erra a distância, não recua.",
    range: "ranged",
    statPriority: ["attack", "critChance", "attackSpeed"],
    acquisition: {
      origin: "event",
      hint: "Reservado: evento especial da Torre e caixas de invocação de Arqueiro (quando liberado).",
    },
    // Retrato do pack (esqueleto); o corpo é o do Arqueiro Esquelético do pack (`characters/archer/*`),
    // que a classe Arqueiro mantém como folha-padrão.
    assets: { portrait: "portraits/skeleton" },
  },
];

/** Elenco completo (iniciais + adicionais) — o que o códice e a aquisição enxergam. */
export const HERO_ROSTER: HeroIdentityDef[] = [...HEROES, ...EXTRA_HEROES];

export const heroById: Readonly<Record<string, HeroIdentityDef>> = Object.freeze(
  Object.fromEntries(HERO_ROSTER.map((h) => [h.id, h])),
);

/** Identidade pela classe (MVP: 1 herói por classe). Lança se não houver. */
export function heroIdentityForClass(classId: string): HeroIdentityDef {
  const hero = HEROES.find((h) => h.classId === classId);
  if (!hero) throw new Error(`Sem identidade de herói para a classe: ${classId}`);
  return hero;
}

/** Todas as identidades de uma classe (a inicial primeiro). */
export function identitiesForClass(classId: string): HeroIdentityDef[] {
  return HERO_ROSTER.filter((h) => h.classId === classId);
}

/**
 * Qual identidade um herói ADQUIRIDO recebe. Determinístico e SEM consumir o PRNG da rolagem (as
 * rolagens existentes ficam idênticas): `u` ∈ [0,1) vem da qualidade já rolada.
 */
export function pickAcquiredIdentity(classId: string, u: number): HeroIdentityDef {
  const pool = identitiesForClass(classId);
  if (pool.length === 0) throw new Error(`Sem identidade de herói para a classe: ${classId}`);
  return pool[Math.min(pool.length - 1, Math.floor(u * pool.length))]!;
}
