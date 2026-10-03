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

import type { CurveDef } from "./curves.js";
import type { TowerConfig } from "./tower.js";
import type { EquipmentConfig } from "./equipment.js";
import type { HeroAcquisitionConfig } from "./acquisition.js";
import type { BossConfig } from "./boss.js";
import type { BotConfig, MarketConfig, OfflineConfig } from "./market.js";

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

  /**
   * P-009 (ADR-021) — XP necessário para sair do nível N = `evalCurve(curve, N)`.
   * Curva como DADO (ADR-022): editável/serializável pelo painel administrativo.
   */
  king: {
    levelCap: number;
    curve: CurveDef;
  };

  hero: {
    levelCap: number;
    curve: CurveDef;
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
    /** X mínimo e máximo (⛔ P-010, ADR-023): fracionário — o exemplo do §36 é "× 1.72". */
    min: number;
    max: number;
    /** Casas decimais gravadas no item (2 = centésimos). */
    decimals: number;
    /**
     * Forma da distribuição: `u` = média de `samples` uniformes (sino),
     * normalizado e elevado a `power` ⇒ média perto de 1,0 e god roll raro.
     */
    shape: { samples: number; power: number };
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
  /**
   * ADR-021 — a constante de defesa cresce com o NÍVEL do alvo:
   * `K = defenseConstant + defenseConstantPerLevel × (nível − 1)`.
   * Sem isso (K fixo), a mitigação tenderia a 100% em níveis altos e a duração
   * das lutas cresceria linearmente com o nível.
   */
  defenseConstantPerLevel: number;
  critCap: number;
  critMultiplier: number;
  baseActionIntervalMs: number;
  iasCapMin: number;
  iasCapMax: number;
  minDamage: number;
  /** ADR-020 (⛔ P-019) — recomeçar a caçada cura o herói? */
  healOnHuntRestart: boolean;
  /**
   * ADR-021 — regeneração do herói ativo durante PROCURANDO, em % do HP máximo
   * por segundo (aplicada ao fim da procura). Ajuste explícito ao ADR-020:
   * sem ela, o herói "on-curve" (nível = nível do andar) perderia HP a cada
   * luta e a caçada idle terminaria em derrota inevitável.
   */
  regenOnSearchingPctPerSec: number;
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
  /** Capacidade da mochila: itens NÃO equipados (⛔ P-016 provisório). */
  equipmentMaxItems: number;
  /**
   * O que fazer com um drop quando a mochila está cheia (⛔ P-016, ADR-023):
   * `autoSell` vende na hora pelo preço normal (idle não trava nem perde valor);
   * `discard` descarta o item.
   */
  onFull: "autoSell" | "discard";
  pageSize: number;
  defaultSort: "rarityDesc" | "powerDesc" | "qualityDesc" | "levelDesc";
}

// ---------------------------------------------------------------------------
// Configuração completa
// ---------------------------------------------------------------------------

/** Painel de dados da caçada (ADR-031): janela das taxas por hora (XP/h, Coin/h, Custo/h). */
export interface HudConfig {
  /** Janela móvel (ms) usada para calcular as taxas por hora. */
  ledgerWindowMs: number;
  /** Antes disto (ms desde o início da contagem) a UI avisa "medindo…" em vez de mostrar a taxa. */
  ledgerWarmupMs: number;
}

export interface GameConfig {
  configVersion: number;
  hud: HudConfig;
  account: AccountConfig;
  team: TeamConfig;
  xp: XpConfig;
  loot: LootConfig;
  searching: SearchingConfig;
  combat: CombatConfig;
  economy: EconomyConfig;
  inventory: InventoryConfig;
  tower: TowerConfig;
  /** Equipamento como dado (ADR-023). */
  equipment: EquipmentConfig;
  /** Aquisição de heróis (ADR-024). */
  heroAcquisition: HeroAcquisitionConfig;
  /** Market do Rei: poções, revives e caixas por Coin (ADR-025). */
  market: MarketConfig;
  /** Bot do jogador + Hub (ADR-025). */
  bot: BotConfig;
  /** Offline como simulação do online (ADR-026). */
  offline: OfflineConfig;
  /** Bosses da Arena: chefes, fases, tentativas e recompensas (ADR-027). */
  boss: BossConfig;
}
