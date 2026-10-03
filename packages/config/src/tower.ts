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
  if (index <= 4) return null;
  if (index <= 8) return 0xb8d4ff;
  if (index <= 12) return 0xffc9a8;
  if (index <= 20) return 0xd2b4ff;
  if (index <= 30) return 0xffa8a8;
  return 0xa8ffd0;
}

function themeForFloor(index: number): string {
  if (index <= 4) return "masmorra";
  if (index <= 8) return "gelo e sombra";
  if (index <= 12) return "sangue e brasa";
  if (index <= 20) return "pináculo arcano";
  if (index <= 30) return "pináculo carmesim";
  return "pináculo de jade";
}

/**
 * Plano de aparição dos inimigos por andar (usado SÓ para gerar o pool padrão;
 * depois disso a verdade é `FloorDef.pool`). `toFloor` ausente = até o último.
 *
 * Todo andar tem tank + dps + veloz desde o 1; mago entra no 3; elites no 9+.
 */
export const DEFAULT_POOL_PLAN: ReadonlyArray<{
  enemyId: string;
  fromFloor: number;
  toFloor?: number;
  weight: number;
}> = [
  { enemyId: "slime", fromFloor: 1, toFloor: 6, weight: 4 },
  { enemyId: "slime", fromFloor: 7, weight: 2 },
  { enemyId: "goblin", fromFloor: 1, toFloor: 8, weight: 4 },
  { enemyId: "goblin", fromFloor: 9, weight: 2 },
  { enemyId: "bat", fromFloor: 1, weight: 3 },
  { enemyId: "skeleton", fromFloor: 2, weight: 3 },
  { enemyId: "toxicbat", fromFloor: 3, weight: 2 },
  { enemyId: "frostslime", fromFloor: 4, weight: 3 },
  { enemyId: "orc", fromFloor: 5, weight: 3 },
  { enemyId: "fireorc", fromFloor: 6, weight: 3 },
  { enemyId: "bloodskeleton", fromFloor: 7, weight: 3 },
  { enemyId: "shadowgoblin", fromFloor: 9, weight: 1 },
  { enemyId: "elitearcher", fromFloor: 11, weight: 1 },
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
 * (`docs/TOWER_SYSTEM.md` §7; ciclo luta+procura ≈15 s): ≈1.360 h de jogo ativo do Nv 1 ao 20.000.
 * Recompensa por abate cresce com o nível do inimigo; o XP necessário cresce
 * mais rápido que a recompensa, e é isso que desacelera a progressão.
 */
export function defaultTowerRewards(): TowerRewardsConfig {
  return {
    kingXp: { kind: "power", base: 50, exponent: 0.95, offset: 3 },
    heroXp: { kind: "power", base: 50, exponent: 0.95, offset: 3 },
    // ⛔ P-008 provisório: linear no nível do inimigo (o preço de slot 50k/250k é provisório).
    coins: { kind: "power", base: 12, exponent: 1, offset: 3 },
  };
}

/**
 * Curva de XP padrão (P-009/ADR-021): XP para sair do nível N =
 * floor(20 × (N + 30)^1,35). Offset 30 suaviza o início (andar 1 ≈ 30 min);
 * expoente > 1 faz cada nível custar mais que o anterior. Rei e herói usam a
 * mesma curva (pools continuam separados).
 */
export function defaultXpCurve(): CurveDef {
  return { kind: "power", base: 14, exponent: 1.35, offset: 30 };
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
