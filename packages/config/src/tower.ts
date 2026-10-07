/**
 * Torre — andares e recompensas (P-005/P-006/P-009 — RESOLVIDAS, ADR-021).
 *
 * Regras decididas pelo usuário (2026-10-03):
 *  - Cada andar atende uma FAIXA de nível do Rei. Os 10 primeiros são
 *    irregulares (1–10, 10–25, 25–50, 50–100, 100–250, 250–500, 500–1000,
 *    1000–1500, 1500–2500, 2500–5000); depois, 1 andar por 500 níveis até 20.000.
 *  - O nível dos inimigos = nível-BASE (mínimo) do andar. O andar 10 inteiro
 *    (2.500→5.000) tem inimigos nível 2.500.
 *  - Teto de nível: 20.000 (Rei e heróis).
 *  - Cada andar tem um pool de inimigos de papéis diferentes (tank, dps, ...).
 *
 * ADR-022 (admin-ready): `FloorDef` é DADO puro (JSON). Nenhum comportamento
 * depende do índice do andar além de ler esta lista; o painel administrativo
 * edita/insere/remove andares e o jogo aplica via `ContentPack`.
 */

import type { CurveDef } from "./curves.js";

export interface FloorPoolEntry {
  enemyId: string;
  /** Peso relativo de sorteio (> 0). A chance real = peso / soma dos pesos do andar. */
  weight: number;
}

export interface FloorVisual {
  /** Tema (rótulo livre usado pela UI/cenário; hoje só decorativo). */
  theme: string;
  /** Cor multiplicada sobre o sprite do inimigo (0xRRGGBB) — `null` = sem tintura. */
  enemyTint: number | null;
}

export interface FloorDef {
  /** 1-indexado e contíguo (1..N). */
  index: number;
  name: string;
  /** Início da faixa de nível recomendada. */
  minLevel: number;
  /** Fim da faixa (o andar seguinte começa aqui ou logo depois). */
  maxLevel: number;
  /** Nível dos inimigos. Padrão da regra: = `minLevel` (editável por andar). */
  enemyLevel: number;
  /** §46 — requisito de nível do REI (não do herói). Padrão: = `minLevel`. */
  requiredKingLevel: number;
  pool: FloorPoolEntry[];
  visual: FloorVisual;
}

export interface TowerRewardsConfig {
  /** XP do Rei por abate, em função do NÍVEL DO INIMIGO. */
  kingXp: CurveDef;
  /** XP total dos heróis por abate (antes do split de equipe), em função do nível do inimigo. */
  heroXp: CurveDef;
  /** ⛔ P-008 provisório — Coin por abate, em função do nível do inimigo. */
  coins: CurveDef;
}

export interface TowerConfig {
  /**
   * Multiplicador global de dificuldade: escala vida/ataques/defesas de TODO
   * inimigo (equivale a mexer em `statMultiplier` de todos de uma vez).
   */
  enemyStatMultiplier: number;
  /** Multiplica só a VIDA dos inimigos: controla a DURAÇÃO das lutas (rewards não mudam). */
  enemyHpMultiplier: number;
  /** Multiplica só Ataque/Ataque Esp. dos inimigos: controla o HP que o herói perde por luta. */
  enemyAttackMultiplier: number;
  rewards: TowerRewardsConfig;
  floors: FloorDef[];
}

// ---------------------------------------------------------------------------
// Faixas e nomes
// ---------------------------------------------------------------------------

/** Faixas irregulares dos 10 primeiros andares (decisão do usuário). */
export const FIRST_FLOOR_BANDS: ReadonlyArray<readonly [number, number]> = [
  [1, 10],
  [10, 25],
  [25, 50],
  [50, 100],
  [100, 250],
  [250, 500],
  [500, 1000],
  [1000, 1500],
  [1500, 2500],
  [2500, 5000],
];

/** A partir do andar 11: 1 andar por 500 níveis, até o teto. */
export const UNIFORM_FLOOR_STEP = 500;
export const LEVEL_CAP = 20_000;

const FIRST_FLOOR_NAMES: readonly string[] = [
  "Entrada da Torre",
  "Porão Úmido",
  "Galeria das Ossadas",
  "Catacumbas Antigas",
  "Salão dos Ecos",
  "Fornalha Esquecida",
  "Jardim Gélido",
  "Ninho das Sombras",
  "Corredor Sangrento",
  "Câmara dos Mil Passos",
];

/** Tintura por grupo de andares (decorativa; editável por andar). */
function tintForFloor(index: number): number | null {
  if (index <= 15) return null;
  if (index <= 20) return 0xd2b4ff;
  if (index <= 30) return 0xffa8a8;
  return 0xa8ffd0;
}

function themeForFloor(index: number): string {
  // Kits próprios gerados por andar e bioma (Lotes 1–2, 7, 8, 9, 10, 11, 12, ADR-033/036/043/044/045/047/048/049); os demais seguem nos grupos antigos.
  if (index === 1) return "f01_entrada";
  if (index === 2) return "f02_porao";
  if (index === 3) return "f03_ossadas";
  if (index === 4) return "f04_catacumbas";
  if (index === 5) return "f05_ecos";
  if (index === 6) return "f06_fornalha";
  if (index === 7) return "f07_jardim";
  if (index === 8) return "f08_sombras";
  if (index === 9) return "f09_sangrento";
  if (index === 10) return "f10_passos";
  if (index >= 11 && index <= 15) return "p01_arcano";
  if (index >= 16 && index <= 20) return "p02_carmesim";
  if (index <= 30) return "pináculo carmesim";
  return "pináculo de jade";
}

/**
 * Plano de aparição dos inimigos por andar (usado SÓ para gerar o pool padrão;
 * depois disso a verdade é `FloorDef.pool`). `toFloor` ausente = até o último.
 *
 * Todo andar tem tank + dps + veloz + mago desde o 1. Andares 1–2 já seguem a tabela de 5 papéis do
 * roadmap (ADR-033/036); do 3 em diante valem os inimigos de antes até o lote de cada andar. O Elite
 * do andar 1 (Goblin Capitão) é raro (peso 1); os demais elites entram no 9+.
 */
export const DEFAULT_POOL_PLAN: ReadonlyArray<{
  enemyId: string;
  fromFloor: number;
  toFloor?: number;
  weight: number;
}> = [
  // Andar 1 — Entrada da Torre (Lotes 1–2): Gosma T · Goblin D · Morcego V · Duende de Faíscas M · Goblin Capitão E (raro).
  { enemyId: "slime", fromFloor: 1, toFloor: 1, weight: 4 },
  { enemyId: "goblin", fromFloor: 1, toFloor: 1, weight: 4 },
  { enemyId: "bat", fromFloor: 1, toFloor: 1, weight: 3 },
  { enemyId: "spark_imp", fromFloor: 1, toFloor: 1, weight: 2 },
  { enemyId: "goblin_captain", fromFloor: 1, toFloor: 1, weight: 1 },
  // Andar 2 — Porão Úmido (Lotes 2–3): Sapo-Lodo T · Rato de Esgoto D · Enguia V · Morcego Tóxico M · Troll do Esgoto E (raro).
  { enemyId: "mud_toad", fromFloor: 2, toFloor: 2, weight: 4 },
  { enemyId: "sewer_rat", fromFloor: 2, toFloor: 2, weight: 4 },
  { enemyId: "sewer_eel", fromFloor: 2, toFloor: 2, weight: 3 },
  { enemyId: "toxicbat", fromFloor: 2, toFloor: 2, weight: 2 },
  { enemyId: "sewer_troll", fromFloor: 2, toFloor: 2, weight: 1 },
  // Andar 3 — Galeria das Ossadas (Lote 3): Golem de Ossos T · Esqueleto D · Cão de Ossos V · Crânio Necrovela M · Cavaleiro de Ossos E (raro).
  { enemyId: "bone_golem", fromFloor: 3, toFloor: 3, weight: 4 },
  { enemyId: "skeleton", fromFloor: 3, toFloor: 3, weight: 4 },
  { enemyId: "bone_hound", fromFloor: 3, toFloor: 3, weight: 3 },
  { enemyId: "candle_skull", fromFloor: 3, toFloor: 3, weight: 2 },
  { enemyId: "bone_knight", fromFloor: 3, toFloor: 3, weight: 1 },
  // Andar 4 — Catacumbas Antigas (Lotes 3–4): Estátua Guardiã T · Orc D · Escaravelho V · Sacerdote Mumificado M · Múmia Real E (raro).
  { enemyId: "guardian_statue", fromFloor: 4, toFloor: 4, weight: 4 },
  { enemyId: "orc", fromFloor: 4, toFloor: 4, weight: 4 },
  { enemyId: "tomb_scarab", fromFloor: 4, toFloor: 4, weight: 3 },
  { enemyId: "mummy_priest", fromFloor: 4, toFloor: 4, weight: 2 },
  { enemyId: "royal_mummy", fromFloor: 4, toFloor: 4, weight: 1 },
  // Andar 5 — Salão dos Ecos (Lotes 7–8): Sentinela T · Duelista D · Espectro Sussurrante V · Cantor de Ecos M · Maestro do Vazio E (raro).
  { enemyId: "crystal_sentry", fromFloor: 5, toFloor: 5, weight: 4 },
  { enemyId: "ghost_duelist", fromFloor: 5, toFloor: 5, weight: 4 },
  { enemyId: "whispering_wraith", fromFloor: 5, toFloor: 5, weight: 3 },
  { enemyId: "echo_singer", fromFloor: 5, toFloor: 5, weight: 2 },
  { enemyId: "void_maestro", fromFloor: 5, toFloor: 5, weight: 1 },
  // Andar 6 — Fornalha Esquecida (Lote 8): Golem de Escória T · Ferreiro Possuído D · Salamandra Veloz V · Orc Flamejante M · Mestre da Forja E (raro).
  { enemyId: "slag_golem", fromFloor: 6, toFloor: 6, weight: 4 },
  { enemyId: "possessed_smith", fromFloor: 6, toFloor: 6, weight: 4 },
  { enemyId: "swift_salamander", fromFloor: 6, toFloor: 6, weight: 3 },
  { enemyId: "fireorc", fromFloor: 6, toFloor: 6, weight: 2 },
  { enemyId: "forge_master", fromFloor: 6, toFloor: 6, weight: 1 },
  // Andar 7 — Jardim Gélido (Lote 9): Gosma Gélida T · Urso Glacial D · Raposa Boreal V · Feiticeira da Geada M · Cavaleiro do Inverno E (raro).
  { enemyId: "frostslime", fromFloor: 7, toFloor: 7, weight: 4 },
  { enemyId: "frost_bear", fromFloor: 7, toFloor: 7, weight: 4 },
  { enemyId: "boreal_fox", fromFloor: 7, toFloor: 7, weight: 3 },
  { enemyId: "frost_witch", fromFloor: 7, toFloor: 7, weight: 2 },
  { enemyId: "winter_knight", fromFloor: 7, toFloor: 7, weight: 1 },
  // Andar 8 — Ninho das Sombras (Lotes 9–10): Casulo Gigante T · Aranha Presas-Negras D · Sombra Rastejante V · Tecelã de Pesadelos M · Goblin Sombrio E (raro).
  { enemyId: "giant_cocoon", fromFloor: 8, toFloor: 8, weight: 4 },
  { enemyId: "blackfang_spider", fromFloor: 8, toFloor: 8, weight: 4 },
  { enemyId: "shadow_crawler", fromFloor: 8, toFloor: 8, weight: 3 },
  { enemyId: "nightmare_weaver", fromFloor: 8, toFloor: 8, weight: 2 },
  { enemyId: "shadowgoblin", fromFloor: 8, toFloor: 8, weight: 1 },
  // Andar 9 — Corredor Sangrento (Lote 10): Carrasco Encouraçado T · Esqueleto Sangrento D · Sanguessuga Alada V · Bruxa de Sangue M · Conde Carmesim E (raro).
  { enemyId: "armored_executioner", fromFloor: 9, toFloor: 9, weight: 4 },
  { enemyId: "bloodskeleton", fromFloor: 9, toFloor: 9, weight: 4 },
  { enemyId: "winged_leech", fromFloor: 9, toFloor: 9, weight: 3 },
  { enemyId: "blood_witch", fromFloor: 9, toFloor: 9, weight: 2 },
  { enemyId: "crimson_count", fromFloor: 9, toFloor: 9, weight: 1 },
  // Andar 10 — Câmara dos Mil Passos (Lote 11, fecha Onda 1): Colosso de Obsidiana T · Guerreiro Eterno D · Relógio Vivo V · Oráculo dos Passos M · Arqueiro de Elite E (raro).
  { enemyId: "obsidian_colossus", fromFloor: 10, toFloor: 10, weight: 4 },
  { enemyId: "eternal_warrior", fromFloor: 10, toFloor: 10, weight: 4 },
  { enemyId: "living_clock", fromFloor: 10, toFloor: 10, weight: 3 },
  { enemyId: "steps_oracle", fromFloor: 10, toFloor: 10, weight: 2 },
  { enemyId: "elitearcher", fromFloor: 10, toFloor: 10, weight: 1 },
  // Andares 11–15 — Pináculo Arcano (Lote 12, Bioma 1 da Onda 2): Golem de Cristal Arcano T · Espadachim Rúnico D · Fogo-Fátuo Arcano V · Feiticeiro Astral M · Rastreador da Fenda E (raro).
  { enemyId: "crystal_golem", fromFloor: 11, toFloor: 15, weight: 4 },
  { enemyId: "rune_blade", fromFloor: 11, toFloor: 15, weight: 4 },
  { enemyId: "arcane_wisp", fromFloor: 11, toFloor: 15, weight: 3 },
  { enemyId: "astral_sorcerer", fromFloor: 11, toFloor: 15, weight: 2 },
  { enemyId: "rift_stalker", fromFloor: 11, toFloor: 15, weight: 1 },
  // Andares 16–20 — Pináculo Carmesim (Lote 13, Bioma 2 da Onda 2): Gárgula de Sangue T · Retalhador Carmesim D · Cão de Carne V · Cultista do Sangue M · Abominação Sanguínea E (raro).
  { enemyId: "blood_gargoyle", fromFloor: 16, toFloor: 20, weight: 4 },
  { enemyId: "crimson_slayer", fromFloor: 16, toFloor: 20, weight: 4 },
  { enemyId: "flesh_hound", fromFloor: 16, toFloor: 20, weight: 3 },
  { enemyId: "blood_cultist", fromFloor: 16, toFloor: 20, weight: 2 },
  { enemyId: "sanguine_abomination", fromFloor: 16, toFloor: 20, weight: 1 },
  // Andares 21+ — ainda com os inimigos de antes; trocam por bioma nos lotes futuros (docs/STYLIZATION_ROADMAP.md §3.3).
  { enemyId: "toxicbat", fromFloor: 21, weight: 2 },
  { enemyId: "bat", fromFloor: 21, weight: 3 },
  { enemyId: "slime", fromFloor: 21, weight: 2 },
  { enemyId: "goblin", fromFloor: 21, weight: 2 },
  { enemyId: "skeleton", fromFloor: 21, weight: 3 },
  { enemyId: "orc", fromFloor: 21, weight: 3 },
  { enemyId: "shadowgoblin", fromFloor: 21, weight: 1 },
  { enemyId: "elitearcher", fromFloor: 21, weight: 1 },
];

function poolForFloor(index: number): FloorPoolEntry[] {
  return DEFAULT_POOL_PLAN.filter(
    (p) => index >= p.fromFloor && (p.toFloor === undefined || index <= p.toFloor),
  ).map((p) => ({ enemyId: p.enemyId, weight: p.weight }));
}

/** Gera os andares padrão: 10 irregulares + 1 por 500 níveis até `LEVEL_CAP`. */
export function buildDefaultFloors(): FloorDef[] {
  const floors: FloorDef[] = [];
  const push = (minLevel: number, maxLevel: number) => {
    const index = floors.length + 1;
    floors.push({
      index,
      name: FIRST_FLOOR_NAMES[index - 1] ?? `Pináculo ${index - FIRST_FLOOR_NAMES.length}`,
      minLevel,
      maxLevel,
      enemyLevel: minLevel,
      requiredKingLevel: minLevel,
      pool: poolForFloor(index),
      visual: { theme: themeForFloor(index), enemyTint: tintForFloor(index) },
    });
  };
  for (const [min, max] of FIRST_FLOOR_BANDS) push(min, max);
  let start = FIRST_FLOOR_BANDS[FIRST_FLOOR_BANDS.length - 1]![1];
  while (start < LEVEL_CAP) {
    push(start, Math.min(LEVEL_CAP, start + UNIFORM_FLOOR_STEP));
    start += UNIFORM_FLOOR_STEP;
  }
  return floors;
}

/**
 * Curvas de recompensa (ADR-021) — calibradas por `towerPacing()`
 * (`docs/TOWER_SYSTEM.md` §7; ciclo luta+procura+premiação ≈25 s). ADR-031: Nv 1→100 ≈ 24 h de jogo
 * ativo; Nv 1.000 ≈ 130 h; Nv 20.000 ≈ 770 h. A recompensa por abate cresce com o nível do inimigo
 * (expoente 0,98 ≈ linear); o XP necessário cresce com expoente 0,644 (curva "reduzida").
 */
export function defaultTowerRewards(): TowerRewardsConfig {
  return {
    kingXp: { kind: "power", base: 50, exponent: 0.98, offset: 3 },
    heroXp: { kind: "power", base: 50, exponent: 0.98, offset: 3 },
    // ⛔ P-008 provisório: linear no nível do inimigo (o preço de slot 50k/250k é provisório).
    coins: { kind: "power", base: 12, exponent: 1, offset: 3 },
  };
}

/**
 * Curva de XP padrão (P-009/ADR-021, refeita no ADR-031): XP para sair do nível N =
 * floor(4300 × N^0,644). Base alta + expoente baixo = o início é lento (≈ 24 h até o Nv 100) e a curva
 * "achata" depois (o jogo todo fecha em ≈ 770 h em vez de ≈ 1.360 h). Rei e herói usam a mesma curva
 * (pools continuam separados).
 */
export function defaultXpCurve(): CurveDef {
  return { kind: "power", base: 4300, exponent: 0.644, offset: 0 };
}

/** Multiplicadores globais de dificuldade — calibrados por `balance.ts` (ver ADR-021). */
export function defaultTowerDifficulty(): { enemyStatMultiplier: number; enemyHpMultiplier: number; enemyAttackMultiplier: number } {
  // HP ×2,5 → lutas de ≈8–20 s (tanques mais longas); Ataque ×0,05 → o herói
  // on-curve perde ≈9–20% da vida por luta (ver `enemies.ts` e ADR-021). O
  // Ataque dos inimigos é baixo POR CONSTRUÇÃO: na Torre idle o herói precisa
  // sobreviver a centenas de lutas seguidas, e o piso da dificuldade vem do
  // nível, não de um golpe que tira metade da vida.
  return { enemyStatMultiplier: 1, enemyHpMultiplier: 2.0, enemyAttackMultiplier: 0.18 };
}
