import { defaultEquipmentConfig } from "./equipment.js";
import { defaultHeroAcquisition } from "./acquisition.js";
import { defaultBossConfig } from "./boss.js";
import { defaultBotConfig, defaultMarketConfig, defaultOfflineConfig } from "./market.js";
import { buildDefaultFloors, defaultTowerDifficulty, defaultTowerRewards, defaultXpCurve, LEVEL_CAP, type TowerConfig } from "./tower.js";
import type {
  LootConfig,
  XpConfig,
  TeamConfig,
  SearchingConfig,
  HudConfig,
  CombatConfig,
  EconomyConfig,
  InventoryConfig,
  AccountConfig,
  GameConfig,
} from "./types.js";

// ---------------------------------------------------------------------------
// §8/§5/§6 — Conta
// ---------------------------------------------------------------------------

export const account: AccountConfig = {
  // §8 — "Cada conta possui 1 REI."
  kingPerAccount: 1,

  nickname: {
    // ⛔ P-007 — o §6 exige unicidade, validação e anti-abuso, mas não define
    // comprimento, caracteres, lista reservada ou política de troca.
    minLength: 3,
    maxLength: 20,
    pattern: "^[\\p{L}\\p{N}_-]+$",
    reserved: ["admin", "root", "system", "moderator", "reina", "reio"],
  },

  king: {
    // ⛔ P-006 — o §5 diz "nome + skin" sem dizer quais. O pack tem 8
    // hero_skins; escolher quais são iniciais é decisão de produto.
    // As duas primeiras são candidatas por leitura visual (royal, paladin).
    //
    // `assetId` segue o ID do manifesto (`hero_skins/<id>`), não um
    // apelido: o jogo nunca monta caminho, ele pede ID (§62).
    skins: [
      // ADR-033 / Lote 1: a skin do Rei é um RETRATO de RPG clássico (512 na criação e no Rei,
      // 256 no HUD). As 12 do roadmap chegam em 3 lotes; as duas do pack ficam como `legacy`
      // (saves antigos continuam válidos, a UI não as oferece mais).
      { id: "rei_real", name: "Rei Real", assetId: "portraits/king/rei_real", hudAssetId: "portraits/king/rei_real_s", unlock: { kind: "default" } },
      { id: "rei_guerreiro", name: "Rei Guerreiro", assetId: "portraits/king/rei_guerreiro", hudAssetId: "portraits/king/rei_guerreiro_s", unlock: { kind: "default" } },
      { id: "rainha", name: "Rainha", assetId: "portraits/king/rainha", hudAssetId: "portraits/king/rainha_s", unlock: { kind: "default" } },
      { id: "rei_sabio", name: "Rei Sábio", assetId: "portraits/king/rei_sabio", hudAssetId: "portraits/king/rei_sabio_s", unlock: { kind: "default" } },
      // Lote 2 (ADR-036): +8 retratos, liberados por nível do Rei (recompensa de progressão — edite `kingLevel`
      // ou troque por `{ kind: "default" }` para liberar já). O Rei só chega ao Nv 14 em ≈ 4 h de jogo ativo.
      { id: "rei_sombrio", name: "Rei Sombrio", assetId: "portraits/king/rei_sombrio", hudAssetId: "portraits/king/rei_sombrio_s", unlock: { kind: "kingLevel", kingLevel: 3 } },
      { id: "rei_gelo", name: "Rei do Gelo", assetId: "portraits/king/rei_gelo", hudAssetId: "portraits/king/rei_gelo_s", unlock: { kind: "kingLevel", kingLevel: 5 } },
      { id: "rei_sol", name: "Rei Sol", assetId: "portraits/king/rei_sol", hudAssetId: "portraits/king/rei_sol_s", unlock: { kind: "kingLevel", kingLevel: 8 } },
      { id: "rei_cacador", name: "Rei Caçador", assetId: "portraits/king/rei_cacador", hudAssetId: "portraits/king/rei_cacador_s", unlock: { kind: "kingLevel", kingLevel: 10 } },
      { id: "rei_arcano", name: "Rei Arcano", assetId: "portraits/king/rei_arcano", hudAssetId: "portraits/king/rei_arcano_s", unlock: { kind: "kingLevel", kingLevel: 15 } },
      { id: "rei_rubro", name: "Rei Rubro", assetId: "portraits/king/rei_rubro", hudAssetId: "portraits/king/rei_rubro_s", unlock: { kind: "kingLevel", kingLevel: 20 } },
      { id: "rei_esmeralda", name: "Rei Esmeralda", assetId: "portraits/king/rei_esmeralda", hudAssetId: "portraits/king/rei_esmeralda_s", unlock: { kind: "kingLevel", kingLevel: 30 } },
      { id: "rei_anciao", name: "Rei Ancião", assetId: "portraits/king/rei_anciao", hudAssetId: "portraits/king/rei_anciao_s", unlock: { kind: "kingLevel", kingLevel: 50 } },
      { id: "royal", name: "Real", assetId: "hero_skins/royal", legacy: true, unlock: { kind: "default" } },
      { id: "paladin", name: "Paladino", assetId: "hero_skins/paladin", legacy: true, unlock: { kind: "default" } },
    ],
    portraitAssetId: "portraits/hero",
  },
};

// ---------------------------------------------------------------------------
// §15/§16/§46 — Equipe
// ---------------------------------------------------------------------------

export const team: TeamConfig = {
  // §16 — "Máximo inicial: 3 HERÓIS."
  maxSize: 3,
  slots: [
    // §15 — SLOT 1: disponível inicialmente.
    { index: 0, kingLevel: 1, costCoin: 0 },
    // §15 — SLOT 2: "Nível mínimo: 10", exige nível E Coin.
    // ⛔ P-003 — o custo em Coin não foi definido pelo Master-Prompt.
    { index: 1, kingLevel: 10, costCoin: 50_000 },
    // §15 — SLOT 3: "Nível mínimo: 25", exige nível E Coin.
    // ⛔ P-003 — idem.
    { index: 2, kingLevel: 25, costCoin: 250_000 },
  ],
};

// ---------------------------------------------------------------------------
// §20/§45/§81 — XP
// ---------------------------------------------------------------------------

export const xp: XpConfig = {
  // §45 — "Nunca misturar." ADR-003.
  separatePools: true,

  // §20/§81 — o XP é dividido entre os membros da equipe.
  // ⛔ P-004 — curva linear provisória. Soma = 1.0.
  // Requisito do design: quanto mais heróis na equipe, maior a flexibilidade
  // de progressão, porém menor a velocidade individual de evolução (§20).
  teamSplit: {
    1: 1.0,
    2: 0.5,
    3: 1 / 3,
  },
  rounding: "floor",

  // P-009 (ADR-021) — teto 20.000 (Rei e heróis) e curva que DESACELERA:
  // XP para sair do nível N = floor(20 × (N + 30)^1,35). O offset 30 suaviza
  // o início (andar 1 ≈ 30 min); o expoente > 1 faz cada nível custar mais que
  // o anterior. O herói usa a mesma curva do Rei (pools continuam separados).
  // Calibrado em `docs/TOWER_SYSTEM.md` §7 (≈1.340 h ativas até o Nv 20.000).
  king: {
    levelCap: LEVEL_CAP,
    curve: defaultXpCurve(),
  },
  hero: {
    levelCap: LEVEL_CAP,
    curve: defaultXpCurve(),
  },
};

// ---------------------------------------------------------------------------
// §30/§32/§33/§34/§35/§36 — Loot
// ---------------------------------------------------------------------------

/** Valores de fábrica do drop (independentes do estado vivo — base do ContentPack padrão). */
export const defaultLoot = (): LootConfig => ({
  // §32 — "Nenhum equipamento: 95% / Equipamento: 5%".
  equipmentChance: 0.05,

  // §33 — Common 50% / Uncommon 30% / Rare 15% / Epic 4% / Legendary 0.9% / Celestial 0.1%.
  // Soma = 1.000 (validado por validateConfig e por teste).
  rarity: {
    common: 0.5,
    uncommon: 0.3,
    rare: 0.15,
    epic: 0.04,
    legendary: 0.009,
    celestial: 0.001,
  },

  // §36 — o X é gerado INDIVIDUALMENTE por atributo.
  x: {
    independentPerAttribute: true,
    // ⛔ P-010 — o §36 só dá o EXEMPLO (Attack × 1.72, Defense × 0.93, HP × 2.08).
    // ADR-023: X fracionário em centésimos, entre 0,50 e 2,50, em sino (média
    // ≈ 1,05; ≥ 2,00 em ~1% das linhas). A convenção antiga (inteiro 1–50) foi
    // abandonada por não casar com o exemplo do §36.
    min: 0.5,
    max: 2.5,
    decimals: 2,
    shape: { samples: 3, power: 2 },
  },

  // §12 — REGRA ABSOLUTA. Fragmentos nunca vêm de inimigo comum da Torre.
  fragmentsFromCommonTower: false,
});

export const loot: LootConfig = defaultLoot();

// ---------------------------------------------------------------------------
// §27/§28/§29 — Estado Procurando
// ---------------------------------------------------------------------------

/** ADR-031 — janela de 10 min para XP/h, Coin/h e Custo/h; "medindo…" no primeiro minuto. */
export const hud: HudConfig = { ledgerWindowMs: 10 * 60_000, ledgerWarmupMs: 60_000 };

export const searching: SearchingConfig = {
  // §27 — "aproximadamente 3 segundos". Exemplos do MP: 2.7s / 3.0s / 3.2s.
  minMs: 2_700,
  maxMs: 3_200,
  // ADR-007 — estado do game loop com timestamp persistido.
  usesAbsoluteTimestamp: true,
  // §29 — "O timer deve continuar ou ser tratado de maneira consistente."
  // Escolhido: continuar. Parar transformaria cada menu num botão de pausa.
  pausesOnNavigation: false,
  // ⛔ P-012 — comportamento multi-aba/blur não definido.
  pausesOnTabBlur: false,
};

// ---------------------------------------------------------------------------
// §17/§24/§25/§55 — Combate
// ---------------------------------------------------------------------------

export const combat: CombatConfig = {
  // §17/§79 — INVARIANTE CENTRAL. Verificado por teste.
  towerBattleSize: { allies: 1, enemies: 1 },
  // §24/§80 — no Boss, toda a equipe ataca simultaneamente.
  bossBattleSize: { allies: "team", enemies: 1 },
  // §21/§55 — lista vazia de propósito: "essa regra está ABOLIDA".
  towerAutoBossFloors: [],

  // Fórmulas reaproveitadas do repositório de referência (ADR-001).
  // São decisão técnica Tipo B, coerentes com o Master-Prompt.
  defenseConstant: 100,
  // ADR-021 — K cresce 5 por nível do alvo (a duração/dano das lutas fica estável do Nv 30 ao 20.000) (calibrado em simulação herói×inimigo).
  defenseConstantPerLevel: 5,
  critCap: 0.75,
  critMultiplier: 1.5,
  // ADR-023 — T₀ = 1 s com IAS 0. Antes: 2 s, e o engine passava o multiplicador de status (=1)
  // como se fosse o IAS ⇒ todo combatente agia a cada 1 s e a DES/IAS de equipamento não valia nada.
  // ADR-030: intervalo = T₀ / (1 + IAS), T₀ = 2 s, IAS em [−0,5; +1,0] ⇒ 4 s … 1 s (rápido só com equipamento de nível alto).
  baseActionIntervalMs: 2_000,
  iasCapMin: -0.5,
  iasCapMax: 1.0,
  minDamage: 1,

  // ADR-020 (⛔ P-019) — HP persiste entre batalhas da mesma caçada;
  // recomeçar a caçada (após derrota, ou botão "Descansar") cura 100%.
  // Trocar para `false` reabre a política de recuperação sem tocar em código.
  healOnHuntRestart: true,
  // ADR-030 — ≈3% do HP por procura de ≈3 s (era 15%): sem equipamento o desgaste acumula e pede poção.
  regenOnSearchingPctPerSec: 0.01,
};

// ---------------------------------------------------------------------------
// §39/§41/§43/§44/§49 — Economia
// ---------------------------------------------------------------------------

export const economy: EconomyConfig = {
  market: {
    // §41 — ÚNICO número econômico fechado do projeto.
    // "Toda transação entre jogadores terá 15% de taxa", consumida pelo
    // servidor como sink. Vendedor recebe 85%, nunca 100%.
    taxRate: 0.15,
    taxDestination: "sink",
    // ⛔ P-014 — limite e faixa de preço não definidos.
    listingLimit: 20,
    minPrice: 100,
    maxPrice: 100_000_000,
  },
  equipment: {
    // §39 — "Equipamentos podem ser vendidos por Coin."
    sellEnabled: true,
    // ⛔ P-008 — o preço de venda não foi definido pelo Master-Prompt. O preço
    // é DADO (`equipment.sell`, ADR-023): Coin-por-abate × raridade × nota.
  },
  vip: {
    // §49 — "VIP deve ser mantido no projeto... A arquitetura deve ser criada
    // desde cedo." Estrutura presente, valores só na fase de monetização.
    enabled: false,
    // ⛔ P-013 — o §73 proíbe inventar vantagem de VIP. Vazio de propósito.
    benefits: {},
  },
};

// ---------------------------------------------------------------------------
// §13/§70 — Inventário
// ---------------------------------------------------------------------------

/** Valores de fábrica da mochila. */
export const defaultInventory = (): InventoryConfig => ({
  // §13 — "O jogador possui PERSONAGENS ILIMITADOS. Não criar limite
  // artificial de quantidade de heróis possuídos."
  heroLimit: null,
  // ⛔ P-016 — o §13 fala em heróis ilimitados e é SILENCIOSO sobre
  // equipamentos. Um limite é necessário (UI, memória, banda).
  equipmentMaxItems: 300,
  onFull: "autoSell",
  pageSize: 50,
  defaultSort: "rarityDesc",
});

export const inventory: InventoryConfig = defaultInventory();

// ---------------------------------------------------------------------------
// Configuração agregada
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// ADR-021/022 — Torre (andares, recompensas, dificuldade). Dado puro.
// ---------------------------------------------------------------------------

export const tower: TowerConfig = {
  // 1 = os atributos de `enemies.ts` valem como estão. Calibrado em simulação
  // (`packages/game-core/src/__tests__/tower-balance.test.ts`).
  ...defaultTowerDifficulty(),
  rewards: defaultTowerRewards(),
  floors: buildDefaultFloors(),
};

/**
 * A configuração completa.
 *
 * `configVersion` é gravado em cada save. Rebalancear incrementa esta
 * versão; saves antigos são MIGRADOS, nunca reinterpretados — senão um
 * item só com a memória de outra zona hora vira lixo silenciosamente.
 */
export const config: GameConfig = {
  configVersion: 8,
  account,
  team,
  xp,
  loot,
  hud,
  searching,
  combat,
  economy,
  inventory,
  tower,
  equipment: defaultEquipmentConfig(),
  heroAcquisition: defaultHeroAcquisition(),
  market: defaultMarketConfig(),
  bot: defaultBotConfig(),
  offline: defaultOfflineConfig(),
  boss: defaultBossConfig(),
};

export default config;
