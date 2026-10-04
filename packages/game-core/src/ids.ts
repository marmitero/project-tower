/**
 * Geração de IDs.
 *
 * Duas exigências que pareciam conflitantes:
 *   §64 — o combate precisa ser determinístico.
 *   §86 — o servidor precisa poder PROVAR qual item foi sorteado.
 *
 * Um `Math.random()` em `newHeroId()` resolveria a segunda e quebraria a
 * primeira. A solução é um ID derivado do estado que o gerou: o mesmo save,
 * reexecutado, produz exatamente os mesmos IDs. Isso torna a auditoria
 * possível sem sacrificar reprodutibilidade.
 */

import type {
  AccountId,
  BattleId,
  ClassId,
  EquipmentId,
  HeroId,
  ItemStackId,
  KingId,
  ListingId,
  RequestId,
} from "@tia/contracts";
import { asBattleId, asClassId, asEquipmentId, asHeroId, asItemStackId, asKingId, asListingId, asRequestId } from "@tia/contracts";
import { hashString } from "@tia/engine";

function suffix(accountId: string, kind: string, counter: number, salt: string): string {
  const h = hashString(`${accountId}|${kind}|${counter}|${salt}`).toString(36);
  return `${kind}_${counter.toString(36)}_${h}`;
}

export function newKingId(accountId: string, salt = ""): KingId {
  return asKingId(suffix(accountId, "king", 0, salt));
}

export function newHeroId(accountId: string, index: number, salt = ""): HeroId {
  return asHeroId(suffix(accountId, "hero", index, salt));
}

export function newEquipmentId(accountId: string, index: number, seed: number): EquipmentId {
  return asEquipmentId(suffix(accountId, "equip", index, String(seed)));
}

export function newItemStackId(accountId: string, index: number, definitionId: string): ItemStackId {
  return asItemStackId(suffix(accountId, "item", index, definitionId));
}

export function newBattleId(accountId: string, sequence: number, seed: number): BattleId {
  return asBattleId(suffix(accountId, "btl", sequence, String(seed)));
}

export function newListingId(accountId: string, index: number): ListingId {
  return asListingId(suffix(accountId, "lst", index, ""));
}

export function newRequestId(accountId: string, sequence: number): RequestId {
  return asRequestId(suffix(accountId, "req", sequence, ""));
}

/** Classe de herói: string validada, convertida no branded type. */
export function asClass(value: string): ClassId {
  return asClassId(value);
}

/** Normaliza o id de conta vindo de fora (localStorage, URL, sessão). */
export function normalizeAccountId(raw: string): string {
  const trimmed = raw.trim();
  return trimmed.length === 0 ? "local" : trimmed;
}

export const LOCAL_ACCOUNT: AccountId = "local" as AccountId;
