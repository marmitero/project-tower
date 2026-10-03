import type {
  CharacterAttributes,
  Rarity,
  StatId,
  EquipSlotId,
  WeaponType,
  StatusId,
  BattleMode,
  BotSettings,
} from "@tia/config";
import type { HeroId, EquipmentId, ClassId, BattleId } from "./ids.js";

/** Nível em que um herói/equipamento opera. */
export interface CombatStats {
  hp: number;
  attack: number;
  specialAttack: number;
  defense: number;
  specialDefense: number;
  /** Fração: 0.10 = 10%. */
  critChance: number;
  /** IAS — fração. 0.20 = 20% mais rápido. */
  attackSpeed: number;
  speed: number;
}

export interface StatusEffect {
  effectId: string;
  sourceId: string;
  targetId: string;
  statusId: StatusId;
  stacks: number;
  maxStacks: number;
  /** Multiplicador aplicado enquanto ativo. */
  multiplier: number;
  stat?: StatId;
  durationMs: number;
  remainingMs: number;
  /** Só DoT: intervalo entre pulsos (ms). */
  tickIntervalMs?: number;
  dispellable: boolean;
}

export interface Combatant {
  id: string;
  side: "ally" | "enemy";
  name: string;
  level: number;
  stats: CombatStats;
  hp: number;
  maxHp: number;
  attackSpeed: number;
  speed: number;
  critChance: number;
  nextActionAtMs: number;
  statuses: StatusEffect[];
  isDefeated: boolean;
  /**
   * Dicas de apresentação (asset ids por folha: idle/attack/hurt/death…).
   * O engine só repassa — quem usa é o renderer (§64).
   */
  sprites?: Record<string, string>;
  /** Tintura de apresentação 0xRRGGBB (cor do andar, ADR-021). Só o renderer usa. */
  tint?: number;
  /** Só para o lado aliado. */
  heroId?: HeroId;
  /** Só para o lado inimigo. */
  enemyId?: string;
}

export interface BattleState {
  battleId: BattleId;
  mode: BattleMode;
  seed: number;
  tick: number;
  elapsedMs: number;
  allies: Combatant[];
  enemies: Combatant[];
  effects: StatusEffect[];
  status: "active" | "won" | "lost" | "finished";
  /** Emitidos desde o último step. Consumidos pelo renderer. */
  events: BattleEvent[];
}

// ---------------------------------------------------------------------------
// Eventos (§66)
// ---------------------------------------------------------------------------

export type BattleEvent = {
  tick: number;
  elapsedMs: number;
} & (
  | { type: "battle_started"; combatantIds: string[] }
  | { type: "turn_started"; actorId: string }
  | { type: "attack_started"; actorId: string; skillId?: string }
  | { type: "skill_used"; actorId: string; skillId: string }
  | {
      type: "damage_dealt";
      sourceId: string;
      targetId: string;
      amount: number;
      kind: "physical" | "magic" | "dot";
    }
  | {
      type: "damage_mitigated";
      sourceId: string;
      targetId: string;
      beforeDefense: number;
      mitigatedPercent: number;
    }
  | { type: "critical_hit"; sourceId: string; targetId: string; amount: number }
  | { type: "heal_dealt"; sourceId: string; targetId: string; amount: number }
  /** Poção de reviver (Bot ou manual): o combatente caído volta à luta (ADR-025). */
  | { type: "character_revived"; targetId: string; currentHp: number; maxHp: number }
  | {
      type: "status_applied";
      targetId: string;
      statusId: StatusId;
      stacks: number;
      durationMs: number;
    }
  | { type: "status_removed"; targetId: string; statusId: StatusId; reason: string }
  | { type: "effect_triggered"; sourceId: string; effectId: string; label: string }
  | {
      type: "character_damaged";
      targetId: string;
      currentHp: number;
      maxHp: number;
    }
  | { type: "character_defeated"; targetId: string }
  | {
      type: "enemy_damaged";
      targetId: string;
      currentHp: number;
      maxHp: number;
    }
  | { type: "enemy_defeated"; targetId: string }
  | { type: "battle_won"; rewardBundleId: string }
  | { type: "battle_lost" }
  | { type: "battle_finished"; durationMs: number; ticks: number }
);

export type BattleEventType = BattleEvent["type"];

// ---------------------------------------------------------------------------
// Entidades de domínio
// ---------------------------------------------------------------------------

export interface King {
  id: string;
  accountId: string;
  nickname: string;
  displayName: string;
  skinId: string;
  portraitAssetId: string;
  /** §46 — o nível do Rei é o nível da conta. */
  level: number;
  /** §45 — pool de XP DO REI, separado do dos heróis. */
  xp: bigint;
  createdAt: number;
  /** §47 — base do offline progress. */
  lastActiveAt: number;
}

export interface Hero {
  id: HeroId;
  ownerAccountId: string;
  classId: ClassId;
  name: string;
  spriteAssetId: string;
  portraitAssetId: string;
  rarity: Rarity;
  /**
   * Atributos PRÓPRIOS deste herói (ADR-024): dois heróis da mesma classe podem
   * ter atributos diferentes (aquisição com variação). Os stats de combate
   * derivam daqui + `rarity`. Migração: saves antigos recebem os da classe.
   */
  attributes: CharacterAttributes;
  /** Qualidade da rolagem de atributos, 0–100 (50 = o herói padrão da classe). */
  quality: number;
  level: number;
  /** §45 — pool de XP DO HERÓI. */
  xp: bigint;
  /**
   * HP atual do herói — persiste entre batalhas da mesma caçada
   * (ADR-020, § P-019): vencer NÃO cura; a tensão do andar depende disso.
   * Recuperação é um ato do jogador (recomeçar a caçada / descansar).
   * `0` = herói caído. Migração de saves antigos: preenche com o HP máximo.
   */
  currentHp: number;
  stars: number; // ⛔ P-015 provisório
  stats: CombatStats;
  affinityWeapon: WeaponType | null; // ⛔ P-024 provisório
  equipped: Partial<Record<EquipSlotId, EquipmentId>>;
  fragments: Record<string, number>;
  obtainedAt: number;
  origin: HeroOrigin;
}

export type HeroOrigin =
  | "starter"
  | "boss"
  | "event"
  | "summon"
  | "market"
  | "admin";

/** §71 — equipamento é dado estruturado, NUNCA uma string. */
export interface Equipment {
  id: EquipmentId;
  ownerAccountId: string;
  slot: EquipSlotId;
  /** Id do template em `config.equipment.templates` (ex.: "weapon_sword"). */
  itemTypeId: string;
  weaponType?: WeaponType;
  level: number;
  rarity: Rarity;
  /**
   * §36 — X INDIVIDUAL por atributo, só dos atributos que o item rolou (ADR-023:
   * 2–4 linhas conforme a raridade). Fracionário (ex.: 1.72). Os stats finais
   * são DERIVADOS em runtime (template + nível + raridade + X), nunca gravados.
   */
  xValues: Partial<Record<StatId, number>>;
  quality: number;
  grade: "S" | "A" | "B" | "C" | "D" | "E" | "F";
  traitId?: string;
  featureId?: string;
  createdAt: number;
  origin: LootOrigin;
  seed: number;
  /** Trava o item enquanto anunciado no mercado. */
  lockedByListingId?: string;
}

export type LootOrigin =
  | "drop"
  | "market"
  | "reward"
  | "admin"
  | "starter";

export interface ItemStack {
  id: string;
  ownerAccountId: string;
  kind: "consumable" | "material" | "fragment" | "currency";
  definitionId: string;
  quantity: number;
  lockedByListingId?: string;
  acquiredAt: number;
}

export interface Team {
  accountId: string;
  unlockedSlots: 1 | 2 | 3;
  members: (HeroId | null)[];
  /** §19 — escolhido pelo jogador, nunca presumido. */
  activeHeroId: HeroId | null;
}

export interface Wallet {
  accountId: string;
  coins: bigint;
  diamonds: bigint;
}

/** §30/§32/§34 — equipamento é recurso de valor, não moeda. */
export interface Inventory {
  accountId: string;
  /** §70 — equipamentos não equipados. ⛔ P-016 no limite. */
  equipment: Equipment[];
  items: ItemStack[];
}

// ---------------------------------------------------------------------------
// Caça e offline
// ---------------------------------------------------------------------------

/** ADR-007 — o estado de hunt é persistido; `searching` usa timestamp absoluto. */
export type HuntState =
  | { kind: "idle" }
  | { kind: "in_battle"; battleId: string; startedAt: number }
  | { kind: "rewarding"; battleId: string }
  | {
      /** §27 — ~3s. `durationMs` é sorteado em [minMs, maxMs]. */
      kind: "searching";
      startedAt: number;
      durationMs: number;
    }
  | { kind: "defeated"; at: number }
  | { kind: "paused"; at: number; reason: string };

export interface OfflineProgress {
  lastActiveAt: number;
  accumulatedMs: number;
  lastClaimedAt: number;
}

export interface OfflineSummary {
  rawDurationMs: number;
  creditedDurationMs: number;
  wasCapped: boolean;
  simulatedBattles: number;
  rewards: RewardBundle;
  heroFellAt: number | null;
}

export interface RewardBundle {
  id: string;
  kingXp: bigint;
  /** Distribuído por `xp.teamSplit`. */
  heroXp: bigint;
  coins: bigint;
  equipment: Equipment[];
  /** §12 — NUNCA vem de inimigo comum da Torre. */
  fragments: { classId: string; amount: number; rarity?: Rarity }[];
}

export interface TowerFloor {
  index: number;
  name: string;
  /** §46 — requisito de nível do Rei, não do herói. */
  requiredKingLevel: number;
  enemyLevel: number;
  /** Faixa de nível do Rei que o andar atende (ADR-021). */
  minLevel: number;
  maxLevel: number;
  rewardBundleId: string;
  /** §21/§55 — sempre null. A Torre não tem boss. */
  bossId: null;
}

export interface SaveData {
  schemaVersion: number;
  /** Rebalancear não pode corromper save antigo: migrar, nunca reinterpretar. */
  configVersion: number;
  revision: number;
  king: King;
  wallet: Wallet;
  heroes: Hero[];
  team: Team;
  inventory: Inventory;
  tower: { currentFloor: number; bestFloor: number };
  hunt: HuntState | null;
  offline: OfflineProgress;
  /** Opções do Bot do jogador (ADR-025). */
  bot: BotSettings;
  /** Contadores determinísticos do Market (ADR-025): caixas abertas, para a semente do sorteio. */
  market: { boxesOpened: number };
  lastSavedAt: number;
}
