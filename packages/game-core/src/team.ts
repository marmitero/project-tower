/**
 * Equipe e slots.
 *
 * §15 — SLOT 1: disponível desde o início.
 *        SLOT 2: nível mínimo 10 + Coin.
 *        SLOT 3: nível mínimo 25 + Coin.
 * §16 — máximo de 3 heróis na equipe.
 * §46 — o nível exigido é o nível do REI (o nível da conta), não o do herói.
 *
 * A distinção do §46 é implementada pela assinatura: `unlockSlot` recebe o
 * `King`, não o herói. Não existe caminho nesta função que verifique o nível
 * de um herói, porque o requisito nunca foi sobre o herói.
 */

import type { Hero, King, Team, Wallet } from "@tia/contracts";
import type { HeroId } from "@tia/contracts";
import { config } from "@tia/config";
import { activeTeamSize } from "./creation.js";

export class SlotLockedError extends Error {
  readonly requiredLevel: number;
  constructor(requiredLevel: number) {
    super(`Slot requer nível do Rei ${requiredLevel} (§15/§46).`);
    this.name = "SlotLockedError";
    this.requiredLevel = requiredLevel;
  }
}

export class InsufficientFundsError extends Error {
  readonly required: bigint;
  readonly available: bigint;
  constructor(required: bigint, available: bigint) {
    super(`Coin insuficiente: precisa de ${required}, tem ${available}.`);
    this.name = "InsufficientFundsError";
    this.required = required;
    this.available = available;
  }
}

export class TeamFullError extends Error {
  constructor() {
    super(`Equipe cheia: máximo ${config.team.maxSize} heróis (§16).`);
    this.name = "TeamFullError";
  }
}

export class HeroAlreadyInTeamError extends Error {
  constructor(id: HeroId) {
    super(`Herói ${id} já está na equipe.`);
    this.name = "HeroAlreadyInTeamError";
  }
}

export class NoActiveHeroError extends Error {
  constructor() {
    super("Nenhum herói ativo. §19 — o jogador escolhe; nunca é presumido.");
    this.name = "NoActiveHeroError";
  }
}

/** Custo e requisito de um slot, lidos da config (§15 — centralizados). */
export function slotRequirement(index: 0 | 1 | 2): { kingLevel: number; costCoin: number } {
  const slot = config.team.slots[index];
  return { kingLevel: slot.kingLevel, costCoin: slot.costCoin };
}

export function isSlotUnlocked(team: Team, index: 0 | 1 | 2): boolean {
  return index < team.unlockedSlots;
}

/**
 * Desbloqueia um slot. §15 — exige nível do Rei E Coin, simultaneamente.
 * Se qualquer um dos dois faltar, NENHUM é consumido.
 */
export function unlockSlot(
  team: Team,
  king: King,
  wallet: Wallet,
  index: 0 | 1 | 2,
): { spent: bigint; unlockedSlots: 1 | 2 | 3 } {
  if (index === 0) {
    // Slot 1 já nasce liberado. Chamar isto aqui é um erro de programador.
    throw new Error("Slot 1 já está disponível desde o início (§15).");
  }
  if (index < team.unlockedSlots) {
    throw new Error(`Slot ${index + 1} já está desbloqueado.`);
  }
  if (index > team.unlockedSlots) {
    // Pular do slot 1 direto para o 3 ignoraria o custo do slot 2.
    throw new Error("Slots devem ser desbloqueados em ordem (§15).");
  }

  const req = slotRequirement(index);
  if (king.level < req.kingLevel) throw new SlotLockedError(req.kingLevel);

  const cost = BigInt(req.costCoin);
  if (wallet.coins < cost) throw new InsufficientFundsError(cost, wallet.coins);

  wallet.coins -= cost;
  team.unlockedSlots = (index + 1) as 1 | 2 | 3;
  return { spent: cost, unlockedSlots: team.unlockedSlots };
}

/** Coloca um herói num slot. §13 — heróis são ilimitados, slots não. */
export function placeHero(team: Team, heroId: HeroId, slot: 0 | 1 | 2): void {
  if (slot >= team.unlockedSlots) throw new SlotLockedError(config.team.slots[slot]!.kingLevel);
  if (team.members.includes(heroId)) throw new HeroAlreadyInTeamError(heroId);
  team.members[slot] = heroId;
}

export function removeHero(team: Team, slot: 0 | 1 | 2): HeroId | null {
  const current = team.members[slot] ?? null;
  if (current === null) return null;
  team.members[slot] = null;
  if (team.activeHeroId === current) {
    // O herói ativo saiu da equipe: não pode continuar ativo.
    team.activeHeroId = firstAssigned(team);
  }
  return current;
}

export function firstAssigned(team: Team): HeroId | null {
  for (const member of team.members) if (member !== null) return member;
  return null;
}

/** Ids dos membros, na ordem dos slots, sem `null`. */
export function assignedIds(team: Team): HeroId[] {
  return team.members.filter((m): m is HeroId => m !== null);
}

/**
 * §19 — "O jogador escolhe o herói ativo." A escolha é explícita: se a
 * função não foi chamada, `activeHeroId` é `null`, e a Torre não roda.
 *
 * Essa é a diferença entre "o sistema escolhe o primeiro herói da lista" e
 * "o jogador escolhe". A primeira é um padrão silencioso que o jogador nunca
 * pediu; a segunda é uma decisão.
 */
export function setActiveHero(team: Team, heroId: HeroId): void {
  if (!team.members.includes(heroId)) {
    throw new Error(`Herói ${heroId} não está na equipe.`);
  }
  team.activeHeroId = heroId;
}

/** Herói ativo ou erro. Nada aqui "escolhe por você". */
export function requireActiveHero(team: Team): HeroId {
  if (!team.activeHeroId) throw new NoActiveHeroError();
  return team.activeHeroId;
}

export function teamHeroes(team: Team, roster: readonly Hero[]): Hero[] {
  const out: Hero[] = [];
  for (const member of team.members) {
    if (member === null) continue;
    const hero = roster.find((h) => h.id === member);
    if (hero) out.push(hero);
  }
  return out;
}

export { activeTeamSize };
