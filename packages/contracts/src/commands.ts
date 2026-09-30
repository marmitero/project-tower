/**
 * Comandos do cliente para o servidor.
 *
 * REGRA INVARIANTE (Master-Prompt.md §86, §93, SECURITY.md §3):
 *
 *   NENHUM comando pode conter damage, coins, xp, rarity, x, result,
 *   winner, isAdmin, role ou timestamp.
 *
 * O cliente diz o que QUER. O servidor decide o que ACONTECE.
 *
 * O campo `accountId` NÃO existe de propósito. O servidor deriva a conta do
 * JWT — um `accountId` no payload seria um IDOR imediato.
 */

import type {
  EquipmentId,
  HeroId,
  ListingId,
  RequestId,
} from "./ids.js";

/** Campos proibidos em qualquer comando. Testado por `commands.test.ts`. */
export const FORBIDDEN_COMMAND_FIELDS = [
  "damage",
  "coins",
  "coin",
  "diamonds",
  "xp",
  "level",
  "rarity",
  "x",
  "xValues",
  "quality",
  "result",
  "winner",
  "isAdmin",
  "role",
  "userId",
  "authorId",
  "timestamp",
  "elapsedMs",
  "balance",
  "accountId",
] as const;

export type ForbiddenCommandField = (typeof FORBIDDEN_COMMAND_FIELDS)[number];

interface BaseCommand {
  /**
   * Idempotência. Retry com o mesmo requestId retorna o MESMO resultado —
   * é isso que diferencia "a rede falhou" de "a ação duplicou".
   */
  requestId: RequestId;
  /** Rejeita estado obsoleto. Lock otimista contra corrida. */
  expectedRevision: number;
}

export interface EnterTowerCommand extends BaseCommand {
  type: "enter_tower";
  floorIndex: number;
}

export interface SelectActiveHeroCommand extends BaseCommand {
  type: "select_active_hero";
  heroId: HeroId;
}

export interface SetTeamCommand extends BaseCommand {
  type: "set_team";
  /** Array de tamanho = slots desbloqueados; null = slot vazio. */
  members: (HeroId | null)[];
}

export interface UnlockSlotCommand extends BaseCommand {
  type: "unlock_slot";
  slotIndex: 0 | 1 | 2;
}

export interface EquipItemCommand extends BaseCommand {
  type: "equip_item";
  equipmentId: EquipmentId;
  heroId: HeroId;
}

export interface UnequipItemCommand extends BaseCommand {
  type: "unequip_item";
  equipmentId: EquipmentId;
}

export interface SellItemCommand extends BaseCommand {
  type: "sell_item";
  equipmentId: EquipmentId;
}

export interface DiscardItemCommand extends BaseCommand {
  type: "discard_item";
  equipmentId: EquipmentId;
}

export interface CreateListingCommand extends BaseCommand {
  type: "create_listing";
  equipmentId: EquipmentId;
  price: bigint;
}

export interface CancelListingCommand extends BaseCommand {
  type: "cancel_listing";
  listingId: ListingId;
}

export interface BuyListingCommand extends BaseCommand {
  type: "buy_listing";
  listingId: ListingId;
}

export interface ClaimNicknameCommand extends BaseCommand {
  type: "claim_nickname";
  nickname: string;
}

export interface SendChatMessageCommand extends BaseCommand {
  type: "send_chat_message";
  channelId: string;
  body: string;
}

export interface ClaimOfflineProgressCommand extends BaseCommand {
  type: "claim_offline_progress";
}

export interface AdvanceHuntCommand extends BaseCommand {
  type: "advance_hunt";
  /**
   * Lote alvo, NÃO tempo decorrido. O cliente nunca diz "passaram 300s".
   * O servidor executa um lote de tamanho fixo e devolve.
   */
  untilBattleId: string | null;
}

export type GameCommand =
  | EnterTowerCommand
  | SelectActiveHeroCommand
  | SetTeamCommand
  | UnlockSlotCommand
  | EquipItemCommand
  | UnequipItemCommand
  | SellItemCommand
  | DiscardItemCommand
  | CreateListingCommand
  | CancelListingCommand
  | BuyListingCommand
  | ClaimNicknameCommand
  | SendChatMessageCommand
  | ClaimOfflineProgressCommand
  | AdvanceHuntCommand;

export type GameCommandType = GameCommand["type"];

export const GAME_COMMAND_TYPES: readonly GameCommandType[] = [
  "enter_tower",
  "select_active_hero",
  "set_team",
  "unlock_slot",
  "equip_item",
  "unequip_item",
  "sell_item",
  "discard_item",
  "create_listing",
  "cancel_listing",
  "buy_listing",
  "claim_nickname",
  "send_chat_message",
  "claim_offline_progress",
  "advance_hunt",
];
