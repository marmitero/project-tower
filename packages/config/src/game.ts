import type {
  LootConfig,
  XpConfig,
  TeamConfig,
  SearchingConfig,
  CombatConfig,
  EconomyConfig,
  InventoryConfig,
  AccountConfig,
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
      { id: "royal", name: "Real", assetId: "hero_skins/royal", unlock: { kind: "default" } },
      { id: "paladin", name: "Paladino", assetId: "hero_skins/paladin", unlock: { kind: "default" } },
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

  // ⛔ P-009 — as curvas de XP não foram definidas. Determinam QUANDO os
  // slots 2 e 3 ficam disponíveis (níveis 10 e 25), ou seja, o ritmo do jogo.
  king: {
    levelCap: 100,
    requiredPerLevel: (kingLevel: number) => Math.floor(100 * Math.pow(kingLevel, 1.5)),
  },
  hero: {
    levelCap: 100,
    requiredPerLevel: (heroLevel: number) => Math.floor(80 * Math.pow(heroLevel, 1.45)),
  },
};

// ---------------------------------------------------------------------------
// §30/§32/§33/§34/§35/§36 — Loot
// ---------------------------------------------------------------------------

export const loot: LootConfig = {
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
    // ⛔ P-010 — a faixa do X não está definida no Master-Prompt. O exemplo
    // do §36 (Attack × 1.72, Defense × 0.93, HP × 2.08) é compatível com
    // inteiro 1-50 e fator x/10, que é a convenção reaproveitada da
    // referência, mas NÃO é uma regra deste projeto.
    min: 1,
    max: 50,
  },

  // §12 — REGRA ABSOLUTA. Fragmentos nunca vêm de inimigo comum da Torre.
  fragmentsFromCommonTower: false,
};

// ---------------------------------------------------------------------------
// §27/§28/§29 — Estado Procurando
// ---------------------------------------------------------------------------

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
  critCap: 0.75,
  critMultiplier: 1.5,
  baseActionIntervalMs: 2_000,
  iasCapMin: -0.5,
  iasCapMax: 1.0,
  minDamage: 1,
};

// ---------------------------------------------------------------------------
// §39/§41/§43/§44/§49 — Economia
// ---------------------------------------------------------------------------

const RARITY_MULTIPLIER: Record<string, number> = {
  common: 1.0,
  uncommon: 1.2,
  rare: 1.5,
  epic: 2.0,
  legendary: 2.5,
  celestial: 3.0,
};

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
    // ⛔ P-008 — o preço de venda não foi definido pelo Master-Prompt.
    // Provisório: proporcional ao Poder, escalado pela raridade, para que
    // revenda tenha significado sem inflar a economia.
    sellPrice: (rarity, power) =>
      Math.max(1, Math.floor(power * 0.35 * (RARITY_MULTIPLIER[rarity] ?? 1))),
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

export const inventory: InventoryConfig = {
  // §13 — "O jogador possui PERSONAGENS ILIMITADOS. Não criar limite
  // artificial de quantidade de heróis possuídos."
  heroLimit: null,
  // ⛔ P-016 — o §13 fala em heróis ilimitados e é SILENCIOSO sobre
  // equipamentos. Um limite é necessário (UI, memória, banda).
  equipmentMaxItems: 300,
  pageSize: 50,
  defaultSort: "rarityDesc",
};

// ---------------------------------------------------------------------------
// Configuração agregada
// ---------------------------------------------------------------------------

import type { GameConfig } from "./types.js";

/**
 * A configuração completa.
 *
 * `configVersion` é gravado em cada save. Rebalancear incrementa esta
 * versão; saves antigos são MIGRADOS, nunca reinterpretados — senão um
 * item só com a memória de outra zona hora vira lixo silenciosamente.
 */
export const config: GameConfig = {
  configVersion: 1,
  account,
  team,
  xp,
  loot,
  searching,
  combat,
  economy,
  inventory,
};

export default config;
