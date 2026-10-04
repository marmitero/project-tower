/**
 * IDs tipados por branded type.
 *
 * Branded types existem para o compilador impedir que um `HeroId` vire um
 * `EquipmentId`. Em um sistema onde um ID trocado significa dar o item
 * errado a alguém, isso é uma classe inteira de bug que deixa de existir.
 */

type Brand<T, B extends string> = T & { readonly __brand: B };

export type AccountId = Brand<string, "AccountId">;
export type KingId = Brand<string, "KingId">;
export type HeroId = Brand<string, "HeroId">;
export type ClassId = Brand<string, "ClassId">;
export type EquipmentId = Brand<string, "EquipmentId">;
export type ItemStackId = Brand<string, "ItemStackId">;
export type BattleId = Brand<string, "BattleId">;
export type ListingId = Brand<string, "ListingId">;
export type RequestId = Brand<string, "RequestId">;
export type CurrencyId = Brand<string, "CurrencyId">;
export type MessageId = Brand<string, "MessageId">;

export const asAccountId = (v: string): AccountId => v as AccountId;
export const asKingId = (v: string): KingId => v as KingId;
export const asHeroId = (v: string): HeroId => v as HeroId;
export const asClassId = (v: string): ClassId => v as ClassId;
export const asEquipmentId = (v: string): EquipmentId => v as EquipmentId;
export const asItemStackId = (v: string): ItemStackId => v as ItemStackId;
export const asBattleId = (v: string): BattleId => v as BattleId;
export const asListingId = (v: string): ListingId => v as ListingId;
export const asRequestId = (v: string): RequestId => v as RequestId;
export const asCurrencyId = (v: string): CurrencyId => v as CurrencyId;
export const asMessageId = (v: string): MessageId => v as MessageId;
