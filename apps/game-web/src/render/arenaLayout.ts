/**
 * Arena — parte PURA (sem Phaser): geometria e escolha determinística dos
 * ladrilhos. Separada de `Arena.ts` para ser testável em Node.
 */
import type { ArenaTheme } from "./arenaThemes";

export interface ArenaGeometry {
  /** Altura (px) da parede; o piso começa aqui. */
  wallBottom: number;
  wallTile: number;
  floorTile: number;
  floorRows: number;
  /** Y de cada fileira do piso. */
  rowY: number[];
}

/** Proporções da arena (relativas à altura do canvas) — editáveis. */
export const ARENA_LAYOUT = {
  wallHeight: 0.4,
  /** Parte inferior do ladrilho de parede que é só transparência: sobrepõe o piso. */
  wallOverlap: 0.12,
  floorRows: 2,
  parallax: 0.55,
  /** Chance de um ladrilho da fileira de trás virar adereço. */
  propChance: 0.2,
} as const;

export function computeArenaGeometry(width: number, height: number): ArenaGeometry {
  const wallBottom = Math.round(height * ARENA_LAYOUT.wallHeight);
  const floorH = height - wallBottom;
  const floorTile = floorH / ARENA_LAYOUT.floorRows;
  const wallTile = Math.max(32, wallBottom / (1 - ARENA_LAYOUT.wallOverlap));
  const rowY = Array.from({ length: ARENA_LAYOUT.floorRows }, (_, i) => wallBottom + i * floorTile);
  void width;
  return { wallBottom, wallTile, floorTile, floorRows: ARENA_LAYOUT.floorRows, rowY };
}

/** Hash inteiro determinístico (mulberry-like) em [0, 1). */
export function hash01(a: number, b = 0): number {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export type TileChoice = { assetId: string; torch?: boolean; prop?: boolean };

/** Peça da PAREDE na coluna absoluta `index` (tocha a cada `torchEvery`). */
export function pickWallTile(theme: ArenaTheme, index: number): TileChoice {
  if (theme.torch && theme.torchEvery > 0 && ((index % theme.torchEvery) + theme.torchEvery) % theme.torchEvery === 0) {
    return { assetId: theme.torch, torch: true };
  }
  const list = theme.wall;
  return { assetId: list[Math.floor(hash01(index, 11) * list.length) % list.length]! };
}

/** Peça do PISO na coluna absoluta `index`, fileira `row` (0 = fundo). */
export function pickFloorTile(theme: ArenaTheme, index: number, row: number): TileChoice {
  if (row === 0 && theme.props.length > 0 && hash01(index, 29) < ARENA_LAYOUT.propChance) {
    const total = theme.props.reduce((n, p) => n + p.weight, 0);
    let roll = hash01(index, 31) * total;
    for (const p of theme.props) {
      roll -= p.weight;
      if (roll < 0) return { assetId: p.assetId, prop: true };
    }
    return { assetId: theme.props[0]!.assetId, prop: true };
  }
  const list = theme.floor;
  return { assetId: list[Math.floor(hash01(index * 7 + row, 17) * list.length) % list.length]! };
}
