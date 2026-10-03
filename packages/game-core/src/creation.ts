/**
 * Criação de Rei e de heróis.
 *
 * §8 — o jogador é o REI, meta-personagem. Heróis são súditos campeões,
 * independentes dele. §46 — o nível do Rei é o nível da conta; o Rei NÃO
 * entra no combate normal.
 *
 * Nada aqui inventa curva de poder: os números de growth vêm da config
 * (marcados como provisórios onde o Master-Prompt é silencioso).
 */

import type { CombatStats, Hero, HeroOrigin, King, Wallet, Team } from "@tia/contracts";
import type { AccountId, ClassId, HeroId, KingId } from "@tia/contracts";
import { classes, config, growthFromAttributes, type CharacterAttributes, type Rarity, type ClassGrowth, type KingSkinConfig } from "@tia/config";
import { newHeroId, newKingId } from "./ids.js";

/** @param nowInjected-clock em ms; injetado para que o teste seja determinístico. */
export interface CreateKingParams {
  accountId: AccountId;
  nickname: string;
  skinId: string;
  now: number;
}

export function createKing(params: CreateKingParams): King {
  const skin = config.account.king.skins.find((s) => s.id === params.skinId) ?? config.account.king.skins[0]!;
  return {
    id: newKingId(params.accountId),
    accountId: params.accountId,
    nickname: params.nickname,
    displayName: params.nickname,
    skinId: skin.id,
    // §5 — retrato do Rei: o busto (`portraits/hero`). A skin muda o
    // corpo; o rosto é o mesmo. Quem mostra o corpo olha `skinId`.
    portraitAssetId: config.account.king.portraitAssetId,
    level: 1,
    // §45 — pool do Rei, separado do dos heróis. Começa em zero.
    xp: 0n,
    createdAt: params.now,
    // §47 — base do cálculo de offline.
    lastActiveAt: params.now,
  };
}

export function createWallet(accountId: AccountId, coins = 0n, diamonds = 0n): Wallet {
  return { accountId, coins, diamonds };
}

/**
 * Skin liberada para o nível atual do Rei (§5 — a skin é cosmética; as
 * regras de desbloqueio vêm da config, nunca deste arquivo).
 */
export function isSkinUnlocked(skin: KingSkinConfig, kingLevel: number): boolean {
  if (skin.unlock.kind === "default") return true;
  return kingLevel >= skin.unlock.kingLevel;
}

export class SkinLockedError extends Error {
  constructor(skinId: string) {
    super(`Skin indisponível: ${skinId}`);
    this.name = "SkinLockedError";
  }
}

/**
 * Troca a skin do Rei. Cosmético — não toca em economia nem progressão.
 * Skin desconhecida ou bloqueada lança `SkinLockedError`; a UI só oferece
 * skins liberadas, e o guard aqui existe para o save não receber skin
 * inválida por caminho nenhum.
 */
export function changeKingSkin(king: King, skinId: string): void {
  const skin = config.account.king.skins.find((s) => s.id === skinId);
  if (!skin || !isSkinUnlocked(skin, king.level)) throw new SkinLockedError(skinId);
  king.skinId = skin.id;
}

/**
 * Time inicial. §15 — a equipe começa com 1 slot. O slot 1 já existe, e é
 * grátis; os slots 2 e 3 só entram com nível do Rei + Coin.
 *
 * `members` é sempre um array de tamanho `unlockedSlots`, preenchido com
 * `null` nos slots vazios. Um slot vazio nunca é um herói "fantasma".
 */
export function createTeam(accountId: AccountId): Team {
  return {
    accountId,
    unlockedSlots: 1,
    members: [null, null, null],
    activeHeroId: null,
  };
}

/** nº de slots efetivamente utilizáveis (≤ unlockedSlots). */
export function activeTeamSize(team: Team): number {
  return team.members.slice(0, team.unlockedSlots).filter((m): m is HeroId => m !== null).length;
}

export interface CreateHeroParams {
  accountId: AccountId;
  classId: ClassId;
  /** Identidade do herói (arte própria, ADR-032). */
  identityId?: string;
  name: string;
  /** Padrão: a raridade do herói inicial (`heroAcquisition.starterRarity`, adendo ADR-024). */
  rarity?: Hero["rarity"];
  /** Atributos próprios (aquisição com variação). Padrão: os da classe. */
  attributes?: CharacterAttributes;
  /** Qualidade da rolagem (0–100). Padrão: 50 = herói padrão da classe. */
  quality?: number;
  level?: number;
  origin?: HeroOrigin;
  now: number;
  index: number;
}

/**
 * Cria um herói. As stats saem da curva da classe e do nível.
 * Nenhuma skill é atribuída aqui: §22 fixa o modelo (1 ativa, 2 passivas) e
 * `P-022` ainda não define progressão — o conjunto de skills entra na Fase 6
 * via catálogo, não como literal neste arquivo.
 */
export function createHero(params: CreateHeroParams): Hero {
  const cls = classes.find((c) => c.id === params.classId);
  if (!cls) {
    throw new Error(`Classe desconhecida: ${String(params.classId)}`);
  }
  const level = Math.max(1, Math.floor(params.level ?? 1));
  const attributes = { ...(params.attributes ?? cls.attributes) };
  const rarity = params.rarity ?? config.heroAcquisition.starterRarity;
  const stats = heroStatsAtLevel(growthForHero(attributes, rarity), level);
  return {
    id: newHeroId(params.accountId, params.index),
    ownerAccountId: params.accountId,
    classId: params.classId,
    ...(params.identityId ? { identityId: params.identityId } : {}),
    name: params.name,
    spriteAssetId: cls.assets.sheets.idle,
    portraitAssetId: cls.assets.portrait,
    rarity,
    attributes,
    quality: params.quality ?? 50,
    level,
    // §45 — pool do herói, separado do do Rei.
    xp: 0n,
    // ⛔ P-015 — escala de estrelas provisória.
    stars: 1,
    stats,
    // ADR-020 — herói nasce com HP cheio; vencer não cura depois disso.
    currentHp: stats.hp,
    // ⛔ P-024 — afinidade de arma provisória, por classe.
    affinityWeapon: cls.affinityWeapon,
    equipped: {},
    fragments: {},
    obtainedAt: params.now,
    origin: params.origin ?? "starter",
  };
}

/**
 * Crescimento de UM herói (ADR-024): atributos próprios → derivação OpenRpg
 * (`growthFromAttributes`) × multiplicador da raridade (`heroAcquisition`).
 * `uncommon` = ×1,0 — os heróis iniciais valem exatamente o que a Torre calibrou.
 * Crítico, IAS e velocidade não escalam por raridade (são identidade de classe).
 */
export function growthForHero(attributes: CharacterAttributes, rarity: Rarity): ClassGrowth {
  const g = growthFromAttributes(attributes);
  const m = config.heroAcquisition.rarityStatMultiplier[rarity] ?? 1;
  if (m === 1) return g;
  const flat = (v: number) => Math.floor(v * m);
  const per = (v: number) => +(v * m).toFixed(1);
  return {
    ...g,
    hp: flat(g.hp),
    hpPerLevel: per(g.hpPerLevel),
    attack: flat(g.attack),
    attackPerLevel: per(g.attackPerLevel),
    specialAttack: flat(g.specialAttack),
    specialAttackPerLevel: per(g.specialAttackPerLevel),
    defense: flat(g.defense),
    defensePerLevel: per(g.defensePerLevel),
    specialDefense: flat(g.specialDefense),
    specialDefensePerLevel: per(g.specialDefensePerLevel),
  };
}

/** Crescimento do herói VIVO (usa os atributos e a raridade dele, não os da classe). */
export function heroGrowth(hero: Pick<Hero, "attributes" | "rarity">): ClassGrowth {
  return growthForHero(hero.attributes, hero.rarity);
}

/**
 * Stats em um nível. Linear em propósito (⛔ P-006b): a curva real de
 * progressão do herói ainda não foi definida no Master-Prompt, e uma curva
 * inventada aqui apareceria como "regra" no tooltip sem ser uma.
 */
export function heroStatsAtLevel(growth: ClassGrowth, level: number): CombatStats {
  const n = Math.max(0, level - 1);
  return {
    hp: Math.floor(growth.hp + growth.hpPerLevel * n),
    attack: Math.floor(growth.attack + growth.attackPerLevel * n),
    specialAttack: Math.floor(growth.specialAttack + growth.specialAttackPerLevel * n),
    defense: Math.floor(growth.defense + growth.defensePerLevel * n),
    specialDefense: Math.floor(growth.specialDefense + growth.specialDefensePerLevel * n),
    critChance: growth.critChance,
    attackSpeed: growth.attackSpeed,
    speed: growth.speed,
  };
}

/** Soma de stats — usada para a "stat final" (§71: poder = stats + equipamento). */
export function addStats(a: CombatStats, b: CombatStats): CombatStats {
  return {
    hp: a.hp + b.hp,
    attack: a.attack + b.attack,
    specialAttack: a.specialAttack + b.specialAttack,
    defense: a.defense + b.defense,
    specialDefense: a.specialDefense + b.specialDefense,
    critChance: a.critChance + b.critChance,
    attackSpeed: a.attackSpeed + b.attackSpeed,
    speed: a.speed + b.speed,
  };
}

/** Stats zerados. Base para somar equipamento sobre um herói. */
export function emptyStats(): CombatStats {
  return {
    hp: 0,
    attack: 0,
    specialAttack: 0,
    defense: 0,
    specialDefense: 0,
    critChance: 0,
    attackSpeed: 0,
    speed: 0,
  };
}

export type { KingId };
