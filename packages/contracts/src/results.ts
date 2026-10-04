/**
 * Respostas de comando.
 *
 * O servidor NUNCA devolve um resultado calculado pelo cliente, e nunca
 * aceita um resultado vindo dele. Toda a resposta é estado autoritativo.
 */

import type { RequestId } from "./ids.js";
import type { Equipment, SaveData, BattleEvent, RewardBundle } from "./entities.js";

export type CommandErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "invalid_input"
  | "insufficient_funds"
  | "insufficient_level"
  | "item_locked"
  | "already_sold"
  | "revision_conflict"
  | "rate_limited"
  | "nickname_taken"
  | "config_invalid"
  | "internal";

export interface CommandError {
  code: CommandErrorCode;
  /** Mensagem segura para o jogador. Nunca contém detalhe interno. */
  message: string;
}

export type CommandResult<T = unknown> =
  | { ok: true; requestId: RequestId; revision: number; data: T }
  | { ok: false; requestId: RequestId; error: CommandError };

/**
 * Resposta canônica: o cliente substitui seu estado local pelo estado
 * devolvido. Ele nunca calcula uma reconciliação — é por isso que um
 * save divergente se resolve sozinho.
 */
export interface StateSyncResult {
  save: SaveData;
  /** Eventos de batalha a renderizar desde a última resposta. */
  events: BattleEvent[];
  rewards?: RewardBundle;
}

export interface UnlockSlotResult {
  slotIndex: 0 | 1 | 2;
  coinsSpent: bigint;
  unlockedSlots: 1 | 2 | 3;
  inventory: Equipment[];
}

export interface MarketPurchaseResult {
  listingId: string;
  pricePaid: bigint;
  /** §41 — o vendedor NUNCA recebe 100%. */
  sellerNet: bigint;
  /** §41 — "é consumida pelo servidor", sink econômico. */
  serverTax: bigint;
  taxRate: number;
  acquired: Equipment;
}

export interface NicknameCheckResult {
  available: boolean;
  normalized: string;
  reason?: "reserved" | "invalid_format" | "too_short" | "too_long";
}

export interface OfflineClaimResult {
  rawDurationMs: number;
  creditedDurationMs: number;
  wasCapped: boolean;
  capMs: number;
  plan: "free" | "vip";
  rewards: RewardBundle;
}
