/**
 * Boss como DADO (FASE 12, ADR-027, regra AR do ADR-022).
 *
 * Um Boss é uma ATIVIDADE separada da Torre (§21/§55): a equipe inteira (até 3) enfrenta UM
 * chefe, todos atacando ao mesmo tempo (§24/§80). Nada aqui é código de comportamento — o
 * engine só executa o vocabulário que um `BossDef` descreve (skills, fases, resistências,
 * limite de tempo). O futuro Painel Administrativo edita `config.boss` pelo `ContentPack` v4;
 * o jogo reavalia no mesmo instante.
 *
 * Origem das decisões (todas editáveis aqui):
 *  - OpenRpg não tem sistema de Boss; o que ele oferece (e foi aproveitado) é: inimigo = template
 *    de dados (`EntityTemplate`), batalha de EQUIPE × inimigo (`Demos.Battler`: Team × Team em
 *    formação), alvos Único/Área (`CombatTargetTypes`) e habilidades data-driven. Por isso o
 *    chefe aqui é um template de inimigo + equipe + skills de área.
 *  - O repositório de referência (Sentinela da Torre) forneceu a identidade: nível alto, muita
 *    vida, imune a Atordoamento e recompensa grande e repetível.
 *
 * Escalonamento: o chefe usa a MESMA estrutura linear dos inimigos (`enemyStatsAtLevel`) a
 * partir dos atributos; `multipliers` o tornam um chefe. Recompensas são medidas em "abates
 * equivalentes" da Torre no nível do chefe (`kills × curva da Torre`) — acompanham a economia
 * sozinhas, em qualquer nível, e o editor só mexe em quantos abates o chefe vale.
 */

import type { Rarity } from "./types.js";
import { RARITY_ORDER } from "./rarity.js";
import { ATTRIBUTE_IDS, type CharacterAttributes } from "./attributes.js";
import { CHARACTER_SHEET_KEYS, charSheets, classes, type CharacterAssets } from "./catalog.js";

/** Efeitos de status que um chefe pode resistir (os que existem no engine). */
export type BossStatusId = "stun" | "poison";
export const BOSS_STATUS_IDS: readonly BossStatusId[] = ["stun", "poison"];
export const BOSS_STATUS_LABELS: Record<BossStatusId, string> = { stun: "Atordoamento", poison: "Veneno" };

/** Skill do chefe (mesmo vocabulário do `SkillDef` do engine — dado puro). */
export interface BossSkillDef {
  /** Id local ao chefe; no combate vira `boss:<bossId>:<id>`. */
  id: string;
  name: string;
  /** `all_enemies` = área sobre TODA a equipe (OpenRpg `CombatTargetTypes.AoE`). */
  targeting: "single" | "all_enemies";
  damageType: "physical" | "magic";
  coefficient: number;
  hitCount: number;
  cooldownMs: number;
  enabled: boolean;
}

export type BossStatKey = "attack" | "specialAttack" | "defense" | "specialDefense" | "speed" | "critChance";
export const BOSS_STAT_KEYS: readonly BossStatKey[] = ["attack", "specialAttack", "defense", "specialDefense", "speed", "critChance"];

/** Fase do chefe: dispara por HP restante OU por tempo de luta (enrage) — uma vez só. */
export interface BossPhaseDef {
  id: string;
  /** Rótulo PT-BR do banner ("Fúria"). */
  label: string;
  /** Dispara quando o HP do chefe cai para esta % ou menos (1–99). */
  hpBelowPct?: number;
  /** Dispara quando a luta passa deste tempo (ms) — o "enrage". */
  afterMs?: number;
  /** Multiplicadores únicos sobre os stats do chefe naquele instante. */
  statMultipliers?: Partial<Record<BossStatKey, number>>;
  /** Soma ao IAS (luta mais rápida). */
  attackSpeedBonus?: number;
  /** Cura única, em % do HP máximo. */
  healPct?: number;
  /** Skills novas (passam na frente das anteriores). */
  skills?: BossSkillDef[];
}

/** Regra de tentativas (⛔ P-029): como o jogador pode repetir o chefe. */
export type BossAttemptRule =
  /** Sem limite (útil para testes e para chefes de treino). */
  | { kind: "none" }
  /** Recarga individual após vitória e (menor) após derrota. Janela móvel, sem fuso. */
  | { kind: "cooldown"; afterWinMs: number; afterLossMs: number }
  /** No máximo `maxAttempts` por janela móvel de `windowMs` (a janela abre na 1ª tentativa). */
  | { kind: "window"; windowMs: number; maxAttempts: number };

/** Um sorteio de fragmentos de herói (da CONTA, por classe e raridade — §12). */
export interface BossFragmentDrop {
  /** Classe do herói, ou `"any"` = classe sorteada a cada vitória. */
  classId: string;
  rarity: Rarity;
  min: number;
  max: number;
  /** Chance de a vitória entregar este sorteio (0..1). */
  chance: number;
}

export interface BossRewards {
  /** Quantos abates equivalentes da Torre (no nível do chefe) rendem as Coin. */
  coinKills: number;
  kingXpKills: number;
  /** Total dividido entre os heróis da equipe (`xp.teamSplit`). */
  heroXpKills: number;
  /** Multiplica Coin/XP na PRIMEIRA vitória sobre o chefe (1 = sem bônus). */
  firstClearMultiplier: number;
  /** Rolagens de equipamento GARANTIDAS (sem os 5% da Torre) e a raridade mínima delas. */
  equipment: { rolls: number; minRarity: Rarity };
  /** Fragmentos a cada vitória. */
  fragments: BossFragmentDrop[];
  /** Fragmentos extras, só na primeira vitória. */
  firstClearFragments: BossFragmentDrop[];
}

export interface BossDef {
  id: string;
  name: string;
  /** Subtítulo ("Guardião do Porão"). */
  title: string;
  description: string;
  /** Desligar tira da Arena sem apagar. */
  enabled: boolean;
  /** Nível do Rei exigido para desafiar. */
  requiredKingLevel: number;
  /** Nível do chefe (escala os stats como o nível de um inimigo). */
  level: number;
  damageType: "physical" | "magic";
  /** Atributos-base (mesma estrutura dos inimigos/heróis, `attributes.ts`). */
  attributes: CharacterAttributes;
  /** Multiplica vida, ataques e defesas do template, como `EnemySeed.statMultiplier`. */
  statMultiplier: number;
  /** O que faz dele um CHEFE, em relação a um inimigo comum do mesmo nível. */
  multipliers: { hp: number; attack: number; defense: number; speed: number };
  /** Imunidade (1) ou resistência parcial (0–1) a atordoamento/veneno. */
  statusResist: Partial<Record<BossStatusId, number>>;
  skills: BossSkillDef[];
  phases: BossPhaseDef[];
  /** Duração máxima da luta; estourar = derrota (impede lutas infinitas). */
  timeLimitMs: number;
  attempts: BossAttemptRule;
  rewards: BossRewards;
  assets: CharacterAssets;
  /** Escala do sprite e tintura 0xRRGGBB (ou null) — só apresentação. */
  scale: number;
  tint: number | null;
}

/** Regras do Bot DENTRO da Arena (o Bot da Torre continua em `config.bot`). */
export interface BossBotConfig {
  /** Se as opções do Bot (poção/revive) valem na Arena. */
  enabled: boolean;
  maxPotionsPerBattle: number;
  maxRevivesPerBattle: number;
  potionCooldownMs: number;
}

export interface BossConfig {
  bosses: BossDef[];
  /** Mínimo de heróis na equipe para entrar (1 = o herói ativo pode ir sozinho). */
  minTeamSize: number;
  /** A equipe entra com o HP cheio (a Arena não depende do desgaste da Torre). */
  startAtFullHp: boolean;
  /**
   * `false` = o HP que sobra NÃO volta para os heróis: a Arena não pune a caçada da Torre
   * (derrota no chefe não "derruba" o herói lá). `true` = o HP final persiste (como na Torre).
   */
  persistHpAfter: boolean;
  /** Ao terminar, a caçada da Torre retoma sozinha (idle, §111). `false` = fica pausada. */
  resumeTowerAfter: boolean;
  /**
   * ADR-030 — multiplicadores de dificuldade da Torre "congelados" para os chefes: os stats do
   * chefe saem do inimigo-base dividido pela dificuldade ATUAL da Torre e multiplicado por esta
   * referência. Assim rebalancear a Torre (`tower.enemyHpMultiplier`/`enemyAttackMultiplier`) não
   * mexe nos chefes; a dificuldade deles se edita aqui e em `multipliers` de cada `BossDef`.
   */
  towerReference: { hpMultiplier: number; attackMultiplier: number };
  bot: BossBotConfig;
}

// ---------------------------------------------------------------------------
// Padrões de fábrica
// ---------------------------------------------------------------------------

const attrs = (
  strength: number,
  dexterity: number,
  constitution: number,
  intelligence: number,
  wisdom: number,
): CharacterAttributes => ({ strength, dexterity, constitution, intelligence, wisdom, charisma: 6 });

const MIN = 60_000;
const HOUR = 60 * MIN;

/** Constrói uma skill de chefe (campos repetitivos com padrão). */
const skill = (
  id: string,
  name: string,
  targeting: BossSkillDef["targeting"],
  damageType: BossSkillDef["damageType"],
  coefficient: number,
  cooldownMs: number,
  hitCount = 1,
): BossSkillDef => ({ id, name, targeting, damageType, coefficient, hitCount, cooldownMs, enabled: true });

const frag = (classId: string, rarity: Rarity, min: number, max: number, chance = 1): BossFragmentDrop => ({ classId, rarity, min, max, chance });

/**
 * Os 8 chefes de fábrica: um por faixa de progressão (níveis 10 → 19.500), cada um com uma
 * identidade (resistência, skill de área, fase) e uma classe de herói "da casa" que ele
 * entrega em fragmentos — assim o jogador escolhe QUAL chefe caçar para QUAL herói quer.
 */
export function defaultBosses(): BossDef[] {
  return [
    {
      id: "boss_rei_gosma",
      name: "Rei Gosma",
      title: "Soberano do Porão Úmido",
      description: "Uma gosma coroada que engoliu o primeiro andar. Fácil de acertar, difícil de derrubar: fica furiosa pela metade.",
      enabled: true,
      requiredKingLevel: 10,
      level: 10,
      damageType: "physical",
      attributes: attrs(18, 6, 38, 4, 14),
      statMultiplier: 1.0,
      multipliers: { hp: 2.5, attack: 2.6, defense: 1.2, speed: 0.8 },
      statusResist: {},
      skills: [skill("salpico", "Salpico Viscoso", "all_enemies", "physical", 0.6, 8_000)],
      phases: [
        { id: "furia", label: "Gosma Furiosa", hpBelowPct: 50, statMultipliers: { attack: 1.25 }, attackSpeedBonus: 0.15 },
      ],
      timeLimitMs: 120_000,
      attempts: { kind: "cooldown", afterWinMs: 10 * MIN, afterLossMs: 2 * MIN },
      rewards: {
        coinKills: 40, kingXpKills: 30, heroXpKills: 30, firstClearMultiplier: 3,
        equipment: { rolls: 1, minRarity: "common" },
        fragments: [frag("guardian", "common", 3, 5), frag("any", "common", 1, 2, 0.5)],
        firstClearFragments: [frag("guardian", "common", 8, 8)],
      },
      assets: { portrait: "portraits/slime", sheets: charSheets("slimeking") },
      scale: 1.7,
      tint: null,
    },
    {
      id: "boss_sentinela",
      name: "Sentinela da Torre",
      title: "Vigia das Catacumbas",
      description: "Armadura ancestral que nunca dorme. Ninguém a atordoa: vence quem aguenta o ritmo dela.",
      enabled: true,
      requiredKingLevel: 50,
      level: 37,
      damageType: "physical",
      attributes: attrs(30, 8, 34, 6, 18),
      statMultiplier: 1.0,
      multipliers: { hp: 4.5, attack: 2.0, defense: 1.35, speed: 0.8 },
      statusResist: { stun: 1 },
      skills: [skill("escudo", "Golpe de Escudo", "single", "physical", 1.8, 7_000)],
      phases: [
        { id: "postura", label: "Postura Final", hpBelowPct: 40, statMultipliers: { attack: 1.3, defense: 1.2 } },
      ],
      timeLimitMs: 120_000,
      attempts: { kind: "cooldown", afterWinMs: 15 * MIN, afterLossMs: 2 * MIN },
      rewards: {
        coinKills: 45, kingXpKills: 35, heroXpKills: 35, firstClearMultiplier: 3,
        equipment: { rolls: 1, minRarity: "common" },
        fragments: [frag("ranger", "common", 3, 5), frag("any", "uncommon", 1, 2, 0.4)],
        firstClearFragments: [frag("ranger", "uncommon", 6, 6)],
      },
      assets: { portrait: "portraits/boss", sheets: charSheets("boss") },
      scale: 1.55,
      tint: null,
    },
    {
      id: "boss_matriarca_gelida",
      name: "Matriarca Gélida",
      title: "Mãe do Jardim Gélido",
      description: "Gosma de gelo que resiste à magia. Sua nevasca atinge a equipe toda e ela se cura ao congelar.",
      enabled: true,
      requiredKingLevel: 250,
      level: 158,
      damageType: "magic",
      attributes: attrs(10, 8, 34, 18, 34),
      statMultiplier: 0.9,
      multipliers: { hp: 6.5, attack: 2.8, defense: 1.3, speed: 0.85 },
      statusResist: { poison: 0.5 },
      skills: [skill("nevasca", "Nevasca", "all_enemies", "magic", 0.7, 9_000)],
      phases: [
        { id: "lamuria", label: "Lamúria Gélida", hpBelowPct: 50, healPct: 0.1, statMultipliers: { specialAttack: 1.25 } },
      ],
      timeLimitMs: 120_000,
      attempts: { kind: "cooldown", afterWinMs: 30 * MIN, afterLossMs: 3 * MIN },
      rewards: {
        coinKills: 50, kingXpKills: 40, heroXpKills: 40, firstClearMultiplier: 3,
        equipment: { rolls: 1, minRarity: "uncommon" },
        fragments: [frag("arcanist", "common", 4, 6), frag("arcanist", "uncommon", 2, 3, 0.6)],
        firstClearFragments: [frag("arcanist", "uncommon", 10, 10)],
      },
      assets: { sheets: charSheets("frostslime") },
      scale: 1.7,
      tint: 0x9fd8ff,
    },
    {
      id: "boss_senhor_forja",
      name: "Senhor da Forja",
      title: "Mestre da Fornalha Esquecida",
      description: "Orc de brasa viva. Cada erupção queima a equipe inteira, e a fornalha esquenta conforme a luta avança.",
      enabled: true,
      requiredKingLevel: 1000,
      level: 630,
      damageType: "magic",
      attributes: attrs(14, 8, 30, 34, 14),
      statMultiplier: 0.95,
      multipliers: { hp: 9, attack: 1.6, defense: 1.3, speed: 0.85 },
      statusResist: { stun: 0.5 },
      skills: [skill("erupcao", "Erupção", "all_enemies", "magic", 0.8, 10_000)],
      phases: [
        { id: "brasa", label: "Brasa Viva", hpBelowPct: 60, attackSpeedBonus: 0.2 },
        { id: "fornalha", label: "Fornalha", hpBelowPct: 30, statMultipliers: { specialAttack: 1.4 } },
      ],
      timeLimitMs: 150_000,
      attempts: { kind: "cooldown", afterWinMs: HOUR, afterLossMs: 5 * MIN },
      rewards: {
        coinKills: 55, kingXpKills: 45, heroXpKills: 45, firstClearMultiplier: 3,
        equipment: { rolls: 1, minRarity: "uncommon" },
        fragments: [frag("shadowcaller", "uncommon", 3, 5), frag("any", "rare", 1, 2, 0.35)],
        firstClearFragments: [frag("shadowcaller", "rare", 8, 8)],
      },
      assets: { sheets: charSheets("fireorc") },
      scale: 1.65,
      tint: 0xff9a5a,
    },
    {
      id: "boss_rainha_morcegos",
      name: "Rainha dos Morcegos",
      title: "Senhora do Ninho das Sombras",
      description: "Imune a veneno, ela cobre a equipe com uma nuvem tóxica e acelera quando está ferida.",
      enabled: true,
      requiredKingLevel: 2500,
      level: 1575,
      damageType: "magic",
      attributes: attrs(10, 34, 22, 30, 16),
      statMultiplier: 1.0,
      multipliers: { hp: 10.5, attack: 1.2, defense: 1.25, speed: 0.9 },
      statusResist: { poison: 1, stun: 0.5 },
      skills: [skill("nuvem", "Nuvem Tóxica", "all_enemies", "magic", 0.55, 8_000, 2)],
      phases: [
        { id: "frenesi", label: "Frenesi", hpBelowPct: 50, statMultipliers: { speed: 1.3 }, attackSpeedBonus: 0.25 },
      ],
      timeLimitMs: 150_000,
      attempts: { kind: "window", windowMs: 8 * HOUR, maxAttempts: 3 },
      rewards: {
        coinKills: 60, kingXpKills: 50, heroXpKills: 50, firstClearMultiplier: 3,
        equipment: { rolls: 2, minRarity: "uncommon" },
        fragments: [frag("ranger", "rare", 2, 4), frag("any", "rare", 1, 2, 0.4)],
        firstClearFragments: [frag("any", "rare", 10, 10)],
      },
      assets: { sheets: charSheets("toxicbat") },
      scale: 1.8,
      tint: 0xc77dff,
    },
    {
      id: "boss_carrasco",
      name: "Carrasco Sangrento",
      title: "Algoz do Corredor Sangrento",
      description: "Esqueleto de lâmina pesada: golpeia o mais ferido da equipe e entra em fúria total no final.",
      enabled: true,
      requiredKingLevel: 5000,
      level: 3150,
      damageType: "physical",
      attributes: attrs(36, 22, 24, 6, 10),
      statMultiplier: 1.1,
      multipliers: { hp: 9, attack: 1.2, defense: 1.3, speed: 0.9 },
      statusResist: { stun: 0.75 },
      skills: [skill("execucao", "Execução", "single", "physical", 2.2, 8_000)],
      phases: [
        { id: "furia_total", label: "Fúria Total", hpBelowPct: 35, statMultipliers: { attack: 1.5 }, attackSpeedBonus: 0.15 },
      ],
      timeLimitMs: 150_000,
      attempts: { kind: "window", windowMs: 8 * HOUR, maxAttempts: 2 },
      rewards: {
        coinKills: 70, kingXpKills: 55, heroXpKills: 55, firstClearMultiplier: 3,
        equipment: { rolls: 2, minRarity: "rare" },
        fragments: [frag("guardian", "rare", 3, 5), frag("any", "epic", 1, 2, 0.3)],
        firstClearFragments: [frag("guardian", "epic", 8, 8)],
      },
      assets: { sheets: charSheets("bloodskeleton") },
      scale: 1.7,
      tint: 0xff6b6b,
    },
    {
      id: "boss_lorde_sombras",
      name: "Lorde das Sombras",
      title: "Regente do Pináculo",
      description: "Eclipses que atingem todos e uma lâmina que escolhe o mais frágil. Se a luta demora, ele enlouquece.",
      enabled: true,
      requiredKingLevel: 10000,
      level: 6300,
      damageType: "magic",
      attributes: attrs(20, 30, 20, 34, 18),
      statMultiplier: 1.15,
      multipliers: { hp: 9, attack: 1.2, defense: 1.3, speed: 0.9 },
      statusResist: { stun: 0.5, poison: 0.5 },
      skills: [
        skill("eclipse", "Eclipse", "all_enemies", "magic", 0.9, 9_000),
        skill("lamina", "Lâmina Sombria", "single", "magic", 1.6, 6_000),
      ],
      phases: [
        { id: "enrage", label: "Loucura das Sombras", afterMs: 75_000, statMultipliers: { specialAttack: 1.5, attack: 1.5 }, attackSpeedBonus: 0.3 },
      ],
      timeLimitMs: 150_000,
      attempts: { kind: "window", windowMs: 12 * HOUR, maxAttempts: 2 },
      rewards: {
        coinKills: 80, kingXpKills: 60, heroXpKills: 60, firstClearMultiplier: 3,
        equipment: { rolls: 2, minRarity: "rare" },
        fragments: [frag("arcanist", "epic", 2, 4), frag("any", "legendary", 1, 1, 0.12)],
        firstClearFragments: [frag("any", "epic", 10, 10)],
      },
      assets: { sheets: charSheets("shadowgoblin") },
      scale: 1.75,
      tint: 0x7a5cff,
    },
    {
      id: "boss_colosso",
      name: "Colosso da Torre",
      title: "Guardião do Topo",
      description: "O último dos guardiões. Imune a atordoamento, racha a própria armadura e desce a martelada em quem estiver mais fraco.",
      enabled: true,
      requiredKingLevel: 19500,
      level: 12300,
      damageType: "physical",
      attributes: attrs(40, 14, 40, 8, 20),
      statMultiplier: 1.2,
      multipliers: { hp: 4.5, attack: 1.0, defense: 1.3, speed: 0.85 },
      statusResist: { stun: 1, poison: 0.5 },
      skills: [
        skill("pisotear", "Pisotear", "all_enemies", "physical", 0.8, 8_000),
        skill("martelada", "Martelada", "single", "physical", 2.5, 7_000),
      ],
      phases: [
        { id: "rachadura", label: "Armadura Rachada", hpBelowPct: 70, statMultipliers: { defense: 0.85 } },
        { id: "furia", label: "Fúria do Colosso", hpBelowPct: 40, statMultipliers: { attack: 1.35 }, attackSpeedBonus: 0.2 },
        { id: "ultimo_folego", label: "Último Fôlego", hpBelowPct: 15, healPct: 0.08, statMultipliers: { attack: 1.2 } },
      ],
      timeLimitMs: 180_000,
      attempts: { kind: "window", windowMs: 24 * HOUR, maxAttempts: 1 },
      rewards: {
        coinKills: 100, kingXpKills: 75, heroXpKills: 75, firstClearMultiplier: 3,
        equipment: { rolls: 3, minRarity: "epic" },
        fragments: [frag("shadowcaller", "legendary", 2, 3), frag("any", "legendary", 1, 2, 0.5), frag("any", "celestial", 1, 1, 0.03)],
        firstClearFragments: [frag("any", "legendary", 10, 10)],
      },
      assets: { portrait: "portraits/boss", sheets: charSheets("boss") },
      scale: 2.0,
      tint: 0xffd24a,
    },
  ];
}

export function defaultBossConfig(): BossConfig {
  return {
    bosses: defaultBosses(),
    minTeamSize: 1,
    startAtFullHp: true,
    persistHpAfter: false,
    resumeTowerAfter: true,
    towerReference: { hpMultiplier: 1.8, attackMultiplier: 0.065 },
    bot: { enabled: true, maxPotionsPerBattle: 8, maxRevivesPerBattle: 3, potionCooldownMs: 2_500 },
  };
}

// ---------------------------------------------------------------------------
// Validação (usada pelo ContentPack)
// ---------------------------------------------------------------------------

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isInt = (v: unknown): v is number => isNum(v) && Number.isInteger(v);

function skillErrors(at: string, s: unknown, ids: Set<string>): string[] {
  const e: string[] = [];
  if (!s || typeof s !== "object") return [`${at}: inválida`];
  const k = s as Partial<BossSkillDef>;
  if (typeof k.id !== "string" || !/^[a-z0-9_]+$/.test(k.id)) e.push(`${at}: id deve ser [a-z0-9_]+`);
  else {
    if (ids.has(k.id)) e.push(`${at}: id duplicado "${k.id}"`);
    ids.add(k.id);
  }
  if (typeof k.name !== "string" || k.name.length === 0) e.push(`${at}: name vazio`);
  if (k.targeting !== "single" && k.targeting !== "all_enemies") e.push(`${at}: targeting deve ser single ou all_enemies`);
  if (k.damageType !== "physical" && k.damageType !== "magic") e.push(`${at}: damageType inválido`);
  if (!isNum(k.coefficient) || k.coefficient <= 0 || k.coefficient > 20) e.push(`${at}: coefficient deve estar em (0, 20]`);
  if (!isInt(k.hitCount) || k.hitCount < 1 || k.hitCount > 10) e.push(`${at}: hitCount deve ser inteiro em [1, 10]`);
  if (!isNum(k.cooldownMs) || k.cooldownMs < 1_000) e.push(`${at}: cooldownMs deve ser >= 1000`);
  if (typeof k.enabled !== "boolean") e.push(`${at}: enabled deve ser booleano`);
  return e;
}

function fragmentErrors(at: string, list: unknown, classIds: Set<string>): string[] {
  const e: string[] = [];
  if (!Array.isArray(list)) return [`${at} deve ser uma lista`];
  for (const [i, f] of (list as BossFragmentDrop[]).entries()) {
    const p = `${at}[${i}]`;
    if (!f || typeof f !== "object") {
      e.push(`${p}: inválido`);
      continue;
    }
    if (f.classId !== "any" && !classIds.has(f.classId)) e.push(`${p}: classe desconhecida "${String(f.classId)}" (use uma classe ou "any")`);
    if (!RARITY_ORDER.includes(f.rarity)) e.push(`${p}: rarity inválida`);
    if (!isInt(f.min) || f.min < 1 || !isInt(f.max) || f.max < f.min) e.push(`${p}: min >= 1 e max >= min (inteiros)`);
    if (!isNum(f.chance) || f.chance < 0 || f.chance > 1) e.push(`${p}: chance deve estar em [0, 1]`);
  }
  return e;
}

/** `levelCap` = teto de nível do Rei (os chefes não podem exigir mais que isso). */
export function bossErrors(b: unknown, levelCap = Number.POSITIVE_INFINITY): string[] {
  const errors: string[] = [];
  if (typeof b !== "object" || b === null) return ["boss ausente"];
  const c = b as Partial<BossConfig>;
  const check = (cond: boolean, msg: string) => {
    if (!cond) errors.push(msg);
  };
  check(isInt(c.minTeamSize) && c.minTeamSize >= 1 && c.minTeamSize <= 3, "boss.minTeamSize deve ser inteiro em [1, 3]");
  check(typeof c.startAtFullHp === "boolean", "boss.startAtFullHp deve ser booleano");
  check(typeof c.persistHpAfter === "boolean", "boss.persistHpAfter deve ser booleano");
  check(typeof c.resumeTowerAfter === "boolean", "boss.resumeTowerAfter deve ser booleano");
  if (c.towerReference !== undefined) {
    check(isNum(c.towerReference.hpMultiplier) && c.towerReference.hpMultiplier > 0, "boss.towerReference.hpMultiplier deve ser > 0");
    check(isNum(c.towerReference.attackMultiplier) && c.towerReference.attackMultiplier > 0, "boss.towerReference.attackMultiplier deve ser > 0");
  }
  const bot = c.bot;
  if (!bot) errors.push("boss.bot ausente");
  else {
    check(typeof bot.enabled === "boolean", "boss.bot.enabled deve ser booleano");
    check(isInt(bot.maxPotionsPerBattle) && bot.maxPotionsPerBattle >= 0, "boss.bot.maxPotionsPerBattle deve ser inteiro >= 0");
    check(isInt(bot.maxRevivesPerBattle) && bot.maxRevivesPerBattle >= 0, "boss.bot.maxRevivesPerBattle deve ser inteiro >= 0");
    check(isNum(bot.potionCooldownMs) && bot.potionCooldownMs >= 0, "boss.bot.potionCooldownMs deve ser >= 0");
  }
  if (!Array.isArray(c.bosses)) {
    errors.push("boss.bosses deve ser uma lista");
    return errors;
  }
  const classIds = new Set(classes.map((k) => k.id));
  const ids = new Set<string>();
  for (const [i, d] of c.bosses.entries()) {
    const at = `boss.bosses[${i}]${d && typeof d.id === "string" ? ` (${d.id})` : ""}`;
    if (!d || typeof d !== "object") {
      errors.push(`${at}: inválido`);
      continue;
    }
    check(typeof d.id === "string" && /^[a-z0-9_]+$/.test(d.id), `${at}: id deve ser [a-z0-9_]+`);
    check(!ids.has(d.id), `${at}: id duplicado`);
    ids.add(d.id);
    check(typeof d.name === "string" && d.name.length > 0, `${at}: name vazio`);
    check(typeof d.title === "string", `${at}: title deve ser texto`);
    check(typeof d.description === "string", `${at}: description deve ser texto`);
    check(typeof d.enabled === "boolean", `${at}: enabled deve ser booleano`);
    check(isInt(d.requiredKingLevel) && d.requiredKingLevel >= 1 && d.requiredKingLevel <= levelCap, `${at}: requiredKingLevel deve ser inteiro em [1, ${levelCap}]`);
    check(isInt(d.level) && d.level >= 1, `${at}: level deve ser inteiro >= 1`);
    check(d.damageType === "physical" || d.damageType === "magic", `${at}: damageType inválido`);
    for (const a of ATTRIBUTE_IDS) check(isNum(d.attributes?.[a]) && d.attributes[a] >= 0, `${at}: atributo ${a} inválido`);
    check(isNum(d.statMultiplier) && d.statMultiplier > 0, `${at}: statMultiplier deve ser > 0`);
    const m = d.multipliers;
    check(!!m && isNum(m.hp) && m.hp > 0 && isNum(m.attack) && m.attack > 0 && isNum(m.defense) && m.defense > 0 && isNum(m.speed) && m.speed > 0, `${at}: multipliers (hp/attack/defense/speed) devem ser > 0`);
    for (const [k, v] of Object.entries(d.statusResist ?? {})) {
      check((BOSS_STATUS_IDS as readonly string[]).includes(k), `${at}: statusResist.${k} desconhecido (stun/poison)`);
      check(isNum(v) && v >= 0 && v <= 1, `${at}: statusResist.${k} deve estar em [0, 1]`);
    }
    const skillIds = new Set<string>();
    if (!Array.isArray(d.skills)) errors.push(`${at}: skills deve ser uma lista`);
    else for (const [j, s] of d.skills.entries()) errors.push(...skillErrors(`${at}.skills[${j}]`, s, skillIds));
    const phaseIds = new Set<string>();
    if (!Array.isArray(d.phases)) errors.push(`${at}: phases deve ser uma lista`);
    else {
      for (const [j, p] of d.phases.entries()) {
        const pa = `${at}.phases[${j}]`;
        if (!p || typeof p !== "object") {
          errors.push(`${pa}: inválida`);
          continue;
        }
        check(typeof p.id === "string" && /^[a-z0-9_]+$/.test(p.id), `${pa}: id deve ser [a-z0-9_]+`);
        check(!phaseIds.has(p.id), `${pa}: id duplicado`);
        phaseIds.add(p.id);
        check(typeof p.label === "string" && p.label.length > 0, `${pa}: label vazio`);
        const hasHp = p.hpBelowPct !== undefined;
        const hasTime = p.afterMs !== undefined;
        check(hasHp || hasTime, `${pa}: precisa de gatilho (hpBelowPct ou afterMs)`);
        if (hasHp) check(isNum(p.hpBelowPct) && p.hpBelowPct >= 1 && p.hpBelowPct <= 99, `${pa}: hpBelowPct deve estar em [1, 99]`);
        if (hasTime) check(isNum(p.afterMs) && p.afterMs > 0, `${pa}: afterMs deve ser > 0`);
        for (const [k, v] of Object.entries(p.statMultipliers ?? {})) {
          check((BOSS_STAT_KEYS as readonly string[]).includes(k), `${pa}: statMultipliers.${k} desconhecido`);
          check(isNum(v) && v > 0 && v <= 10, `${pa}: statMultipliers.${k} deve estar em (0, 10]`);
        }
        if (p.attackSpeedBonus !== undefined) check(isNum(p.attackSpeedBonus) && p.attackSpeedBonus >= -0.5 && p.attackSpeedBonus <= 1, `${pa}: attackSpeedBonus deve estar em [-0,5; 1]`);
        if (p.healPct !== undefined) check(isNum(p.healPct) && p.healPct > 0 && p.healPct <= 1, `${pa}: healPct deve estar em (0, 1]`);
        for (const [k, s] of (p.skills ?? []).entries()) errors.push(...skillErrors(`${pa}.skills[${k}]`, s, skillIds));
      }
    }
    check(isNum(d.timeLimitMs) && d.timeLimitMs >= 10_000, `${at}: timeLimitMs deve ser >= 10000`);
    const a = d.attempts;
    if (!a || typeof a !== "object") errors.push(`${at}: attempts ausente`);
    else if (a.kind === "cooldown") {
      check(isNum(a.afterWinMs) && a.afterWinMs >= 0 && isNum(a.afterLossMs) && a.afterLossMs >= 0, `${at}.attempts: afterWinMs/afterLossMs devem ser >= 0`);
    } else if (a.kind === "window") {
      check(isNum(a.windowMs) && a.windowMs > 0 && isInt(a.maxAttempts) && a.maxAttempts >= 1, `${at}.attempts: windowMs > 0 e maxAttempts inteiro >= 1`);
    } else if (a.kind !== "none") errors.push(`${at}.attempts.kind deve ser none, cooldown ou window`);
    const r = d.rewards;
    if (!r || typeof r !== "object") errors.push(`${at}: rewards ausente`);
    else {
      for (const k of ["coinKills", "kingXpKills", "heroXpKills"] as const) check(isNum(r[k]) && r[k] >= 0, `${at}.rewards.${k} deve ser >= 0`);
      check(isNum(r.firstClearMultiplier) && r.firstClearMultiplier >= 1, `${at}.rewards.firstClearMultiplier deve ser >= 1`);
      check(!!r.equipment && isInt(r.equipment.rolls) && r.equipment.rolls >= 0 && r.equipment.rolls <= 10 && RARITY_ORDER.includes(r.equipment.minRarity), `${at}.rewards.equipment: rolls inteiro em [0, 10] e minRarity válida`);
      errors.push(...fragmentErrors(`${at}.rewards.fragments`, r.fragments, classIds));
      errors.push(...fragmentErrors(`${at}.rewards.firstClearFragments`, r.firstClearFragments, classIds));
    }
    for (const key of CHARACTER_SHEET_KEYS) check(typeof d.assets?.sheets?.[key] === "string", `${at}: sprite ${key} ausente`);
    check(isNum(d.scale) && d.scale >= 0.5 && d.scale <= 4, `${at}: scale deve estar em [0,5; 4]`);
    check(d.tint === null || (isNum(d.tint) && d.tint >= 0 && d.tint <= 0xffffff), `${at}: tint deve ser null ou 0xRRGGBB`);
  }
  return errors;
}
