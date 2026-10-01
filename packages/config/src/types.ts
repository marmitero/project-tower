/**
 * Tipos de configuracao de balanceamento.
 *
 * Regra do Master-Prompt.md §32/§33/§46/§105: todo numero ajustavel mora
 * aqui. Nao existe constante de balanceamento em outro lugar do codigo.
 *
 * Convencao de `Pending`:
 *   - Um valor definido pelo Master-Prompt.md e um literal com a referencia
 *     de secao no comentario.
 *   - Um valor NAO definido e um literal provisorio marcado com `P-0xx`,
 *     mais a anotacao `⛔ PENDENTE`. Nunca chame isso de regra.
 */

export type Rarity =
  | "common"
  | "uncommon"
  | "rare"
  | "epic"
  | "legendary"
  | "celestial";

export type StatId =
  | "hp"
  | "attack"
  | "specialAttack"
  | "defense"
  | "specialDefense"
  | "critChance"
  | "attackSpeed"
  | "speed";

export type EquipSlotId =
  | "weapon"
  | "chest"
  | "head"
  | "legs"
  | "boots"
  | "glove"
  | "amulet"
  | "aura"
  | "wings"
  | "pet";

export type WeaponType =
  | "sword"
  | "dagger"
  | "axe"
  | "mace"
  | "crossbow"
  | "staff"
  | "arcaneBook"
  | "wraps"
  | "claws";

export type StatusId = "poison" | "stun" | "burn" | "regen" | "shield";

export type BattleMode = "tower" | "boss";

// ---------------------------------------------------------------------------
// Conta e identidade (§5, §6, §8)
// ---------------------------------------------------------------------------

export interface KingSkinConfig {
  id: string;
  name: string;
  assetId: string;
  unlock:
    | { kind: "default" }
    | { kind: "kingLevel"; kingLevel: number };
}

export interface AccountConfig {
  /** §8 — cada conta possui 1 REI. Regra dura. */
  kingPerAccount: 1;

  nickname: {
    minLength: number; // ⛔ P-007 provisório
    maxLength: number; // ⛔ P-007 provisório
    pattern: string; // ⛔ P-007 provisório
    reserved: string[]; // ⛔ P-007 provisório
  };

  king: {
    skins: KingSkinConfig[]; // ⛔ P-006 — quais das 8 do pack são iniciais
    /**
     * Retrato do Rei (busto). O pack tem um único busto de Rei
     * (`portraits/hero`); as skins mudam o corpo, não o rosto.
     */
    portraitAssetId: string;
  };
}

// ---------------------------------------------------------------------------
// Equipe e slots (§14, §15, §16, §46)
// ---------------------------------------------------------------------------

export interface TeamSlotConfig {
  index: number;
  /** §15 — nível mínimo do Rei para desbloquear. */
  kingLevel: number;
  /** §15/§46 — desbloqueio exige nível mínimo E Coin, simultaneamente. */
  costCoin: number; // ⛔ P-003 provisório
}

export interface TeamConfig {
  /** §16 — máximo inicial de heróis na equipe. */
  maxSize: 3;
  slots: [TeamSlotConfig, TeamSlotConfig, TeamSlotConfig];
}

// ---------------------------------------------------------------------------
// XP (§20, §45, §81)
// ---------------------------------------------------------------------------

export interface XpConfig {
  /**
   * §45 — "Nunca misturar." O Rei e o herói têem pools independentes.
   * Regra estrutural: o modelo de "nível compartilhado" foi descartado
   * (ADR-003) porque destruiria a decisão de investimento individual.
   */
  separatePools: true;

  /**
   * §20/§81 — o XP é dividido entre os membros da equipe.
   * ⛔ P-004: curva provisoriamente linear. O Master-Prompt fala em
   * "parcela menor" e "parcela ainda menor", o que admite uma curva
   * não-linear. O total distribuído é mantido <= 1.0 para permitir
   * ajustar a curva depois sem rebalancear o resto do jogo.
   */
  teamSplit: Record<1 | 2 | 3, number>;

  rounding: "floor" | "round" | "ceil";

  king: {
    levelCap: number; // ⛔ P-009 provisório
    requiredPerLevel: (kingLevel: number) => number; // ⛔ P-009 provisório
  };

  hero: {
    levelCap: number; // ⛔ P-009 provisório
    requiredPerLevel: (heroLevel: number) => number; // ⛔ P-009 provisório
  };
}

// ---------------------------------------------------------------------------
// Loot (§30, §32, §33, §34, §35, §36)
// ---------------------------------------------------------------------------

export interface LootConfig {
  /** §32 — "Nenhum equipamento: 95% / Equipamento: 5%". */
  equipmentChance: number;

  /**
   * §33 — tabela de raridade DENTRO dos drops. Soma 100%.
   * §33: "Esses valores são configuração inicial. Não são regras imutáveis."
   */
  rarity: Record<Rarity, number>;

  /**
   * §36 — o X é gerado individualmente por atributo. Nunca assumir que
   * todo atributo tem o mesmo X.
   */
  x: {
    independentPerAttribute: true;
    min: number; // ⛔ P-010 provisório
    max: number; // ⛔ P-010 provisório
  };

  /**
   * §12 — REGRA ABSOLUTA: fragmentos de personagem NÃO DEVEM dropar de
   * inimigos comuns da Torre. Boss é a fonte principal (§54).
   */
  fragmentsFromCommonTower: false;
}

// ---------------------------------------------------------------------------
// Estado "Procurando" (§27, §28, §29)
// ---------------------------------------------------------------------------

export interface SearchingConfig {
  /** §27 — ~3 segundos. "Não precisa ser exatamente 3.000ms." */
  minMs: number;
  maxMs: number;
  /** ADR-007 — timestamp absoluto persistido, não setTimeout de componente. */
  usesAbsoluteTimestamp: true;
  /** §29 — navegar NÃO pausa a busca. */
  pausesOnNavigation: false;
  pausesOnTabBlur: boolean; // ⛔ P-012 provisório
}

// ---------------------------------------------------------------------------
// Combate (§17, §24, §25, §63, §64)
// ---------------------------------------------------------------------------

export interface CombatConfig {
  /** §17/§79 — REGRA FUNDAMENTAL: Torre é sempre 1x1. */
  towerBattleSize: { allies: 1; enemies: 1 };
  /** §24/§80 — no Boss, TODA a equipe participa. */
  bossBattleSize: { allies: "team"; enemies: 1 };
  /**
   * §21/§55 — REGRA ABOLIDA. A lista existe vazia de propósito: tornar a
   * abolição explícita e testável é melhor do que não existir a chave.
   */
  towerAutoBossFloors: readonly number[];

  /** Fórmula canônica de dano (ADR-001, reaproveitada da referência). */
  defenseConstant: number;
  critCap: number;
  critMultiplier: number;
  baseActionIntervalMs: number;
  iasCapMin: number;
  iasCapMax: number;
  minDamage: number;
}

// ---------------------------------------------------------------------------
// Economia (§39, §41, §43, §44, §49)
// ---------------------------------------------------------------------------

export interface EconomyConfig {
  market: {
    /** §41 — "Toda transação entre jogadores terá 15% de taxa." */
    taxRate: number;
    /** §41 — "é consumida pelo servidor", "funciona como sink econômico". */
    taxDestination: "sink";
    listingLimit: number; // ⛔ P-014 provisório
    minPrice: number; // ⛔ P-014 provisório
    maxPrice: number; // ⛔ P-014 provisório
  };
  equipment: {
    /** §39 — "Equipamentos podem ser vendidos por Coin." */
    sellEnabled: true;
    sellPrice: (rarity: Rarity, power: number) => number; // ⛔ P-008 provisório
  };
  vip: {
    /** §49 — arquitetura criada desde cedo, valores só na fase de monetização. */
    enabled: false;
    benefits: Record<string, number>; // ⛔ P-013 vazio de propósito
  };
}

// ---------------------------------------------------------------------------
// Inventário (§13, §70)
// ---------------------------------------------------------------------------

export interface InventoryConfig {
  /** §13 — heróis ilimitados. Regra dura, sem limite artificial. */
  heroLimit: null;
  equipmentMaxItems: number; // ⛔ P-016 provisório
  pageSize: number;
  defaultSort: "rarityDesc" | "powerDesc" | "qualityDesc" | "levelDesc";
}

// ---------------------------------------------------------------------------
// Configuração completa
// ---------------------------------------------------------------------------

export interface GameConfig {
  configVersion: number;
  account: AccountConfig;
  team: TeamConfig;
  xp: XpConfig;
  loot: LootConfig;
  searching: SearchingConfig;
  combat: CombatConfig;
  economy: EconomyConfig;
  inventory: InventoryConfig;
}
