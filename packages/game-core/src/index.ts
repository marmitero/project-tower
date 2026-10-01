/**
 * @tia/game-core — regras de negócio e estado.
 *
 * Este pacote é a fronteira entre o engine puro (`@tia/engine`) e a
 * apresentação. Ele NÃO importa React, Phaser nem DOM — só usa a
 * `KeyValueStorage` injetada, o que o torna testável em Node.
 *
 * Ordem de dependência (sem ciclos):
 *   config → contracts → engine → game-core
 */

export {
  LOCAL_ACCOUNT,
  newKingId,
  newHeroId,
  newEquipmentId,
  newItemStackId,
  newBattleId,
  newListingId,
  newRequestId,
  asClass,
  normalizeAccountId,
} from "./ids.js";

export {
  createKing,
  createWallet,
  createTeam,
  createHero,
  heroStatsAtLevel,
  addStats,
  emptyStats,
  activeTeamSize,
  isSkinUnlocked,
  changeKingSkin,
  SkinLockedError,
} from "./creation.js";
export type { CreateKingParams, CreateHeroParams } from "./creation.js";

export { normalizeNickname, validateNickname, NICKNAME_MESSAGES } from "./nickname.js";
export type { NicknameErrorCode, NicknameValidation } from "./nickname.js";

export {
  kingXpToNext,
  heroXpToNext,
  grantKingXp,
  grantHeroXp,
  splitTeamXp,
  kingProgress,
  heroProgress,
  kingLevelProgress,
} from "./progression.js";
export type { XpAward } from "./progression.js";

export {
  rollEquipment,
  rollFragments,
  rollRewardBundle,
  equipmentStats,
  equipmentPower,
  heroFinalStats,
  sourceAllowsFragments,
  emptyRewardBundle,
} from "./loot.js";
export type { LootSource, LootContext, FragmentDrop, RollBundleParams } from "./loot.js";

export {
  createInventory,
  addEquipment,
  removeEquipment,
  findEquipment,
  sellEquipment,
  sellPriceOf,
  equipItem,
  unequipItem,
  equippedItems,
  heroPower,
  heroCombatStats,
  addStack,
  removeStack,
  heroById,
  InventoryFullError,
  SlotOccupiedError,
  AlreadyEquippedError,
} from "./inventory.js";

export {
  slotRequirement,
  isSlotUnlocked,
  unlockSlot,
  placeHero,
  removeHero,
  firstAssigned,
  setActiveHero,
  requireActiveHero,
  teamHeroes,
  SlotLockedError,
  InsufficientFundsError,
  TeamFullError,
  HeroAlreadyInTeamError,
  NoActiveHeroError,
} from "./team.js";

export {
  FIRST_FLOOR,
  enemyForFloor,
  enemyStatsAtLevel,
  enemyLevelForFloor,
  describeFloor,
  towerRewardsForFloor,
  startTowerBattle,
  resolveTowerWin,
  towerSource,
  TowerLockedError,
} from "./tower.js";
export type { StartTowerBattleParams, ResolveTowerWinParams } from "./tower.js";

export {
  rollSearchingDuration,
  beginSearching,
  isSearchingComplete,
  searchingProgress,
  isHunting,
  handleHeroDefeat,
  offlineCapMs,
  createOfflineProgress,
  computeOffline,
  commitOffline,
  touchActive,
  emptyOfflineSummary,
  OFFLINE_CAP_FREE_MS,
  OFFLINE_CAP_VIP_MS,
} from "./hunt.js";

export { GameState } from "./state.js";
export type { GameStateDeps, GameEvents } from "./state.js";

export { LocalStoragePersistence, MemoryStorage, SAVE_PREFIX, encodeSave, decodeSave } from "./persistence/local.js";
export type { KeyValueStorage } from "./persistence/local.js";
export { PersistenceError, assertSaveShape, migrateSave } from "./persistence/types.js";
export type { PersistenceService } from "./persistence/types.js";
