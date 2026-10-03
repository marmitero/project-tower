/**
 * Arena — cenário de fundo da batalha (§63, §64).
 *
 * Duas faixas de ladrilhos do pack Nika, com rolagem horizontal:
 *   - PAREDE (fundo, movimento a 55% da velocidade — paralaxe);
 *   - PISO (duas fileiras, velocidade cheia), com adereços de chão
 *     (ossos, barril, sangue…) substituindo ladrilhos da fileira de trás.
 *
 * `setSpeed(px/s)` é o que faz o herói "andar até o próximo inimigo": a
 * cena liga a rolagem enquanto a caçada procura (~3 s) e desliga quando o
 * inimigo entra. A escolha de cada ladrilho é determinística (hash do
 * índice absoluto da coluna), então a cena é reproduzível e testável.
 *
 * O tema (peças, tintura) vem de `arenaThemes.ts` — dado, não código.
 */
import Phaser from "phaser";
import { type ArenaTheme, themeAssetIds } from "./arenaThemes";

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

interface Cell {
  image: Phaser.GameObjects.Image;
  /** Adereço sobre o piso-base (várias peças do pack têm fundo transparente). */
  overlay: Phaser.GameObjects.Image | null;
  index: number;
  row: number;
}

export class Arena {
  private theme: ArenaTheme;
  private wallCells: Cell[] = [];
  private floorCells: Cell[] = [];
  private shade: Phaser.GameObjects.Graphics | null = null;
  private geo: ArenaGeometry = computeArenaGeometry(1, 1);
  private width = 1;
  private height = 1;
  /** Distância percorrida (px de piso). */
  private scroll = 0;
  private speed = 0;
  private target = 0;
  private laidOut = false;

  constructor(
    private readonly scene: Phaser.Scene,
    theme: ArenaTheme,
    /** ID de manifesto → chave de textura carregada (URL), ou `null` se não existir. */
    private readonly textureOf: (assetId: string) => string | null,
  ) {
    this.theme = theme;
  }

  get themeId(): string {
    return this.theme.id;
  }

  /** IDs que precisam estar carregados antes de `layout`. */
  assetIds(): string[] {
    return themeAssetIds(this.theme);
  }

  setTheme(theme: ArenaTheme): void {
    if (theme.id === this.theme.id) return;
    this.theme = theme;
    if (this.laidOut) this.rebuild();
  }

  /** px/s de rolagem do PISO (0 = parado). A transição é suave. */
  setSpeed(pxPerSecond: number): void {
    this.target = Math.max(0, pxPerSecond);
  }

  get currentSpeed(): number {
    return this.speed;
  }

  get distance(): number {
    return this.scroll;
  }

  layout(width: number, height: number): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.geo = computeArenaGeometry(this.width, this.height);
    this.laidOut = true;
    this.rebuild();
  }

  update(deltaMs: number): void {
    // Aceleração/frenagem suave: o herói parte e para sem "teleporte".
    const k = Math.min(1, deltaMs / 220);
    this.speed += (this.target - this.speed) * k;
    if (Math.abs(this.speed - this.target) < 0.5) this.speed = this.target;
    if (this.speed <= 0) return;
    this.scroll += (this.speed * deltaMs) / 1000;
    this.place();
  }

  destroy(): void {
    this.clear();
    this.shade?.destroy();
    this.shade = null;
  }

  // ---------------------------------------------------------------------

  private clear(): void {
    for (const c of [...this.wallCells, ...this.floorCells]) {
      c.image.destroy();
      c.overlay?.destroy();
    }
    this.wallCells = [];
    this.floorCells = [];
  }

  private rebuild(): void {
    this.clear();
    const g = this.geo;
    const wallCols = Math.ceil(this.width / g.wallTile) + 2;
    const floorCols = Math.ceil(this.width / g.floorTile) + 2;
    for (let i = 0; i < wallCols; i += 1) this.wallCells.push(this.makeCell(i, 0, -20));
    for (let r = 0; r < g.floorRows; r += 1) {
      for (let i = 0; i < floorCols; i += 1) this.floorCells.push(this.makeCell(i, r, -19 + r * 0.1));
    }
    this.paintShade();
    this.place();
  }

  private makeCell(index: number, row: number, depth: number): Cell {
    const image = this.scene.add.image(0, 0, "__MISSING").setOrigin(0, 0).setDepth(depth);
    image.setTint(this.theme.tint);
    const cell: Cell = { image, overlay: null, index, row };
    this.retexture(cell, depth <= -20);
    return cell;
  }

  /**
   * Escolhe as peças da célula. No PISO, um adereço é desenhado SOBRE um
   * ladrilho de piso (rubble/musgo/sangue têm transparência no pack).
   */
  private retexture(cell: Cell, isWall: boolean): void {
    if (isWall) {
      const key = this.textureOf(pickWallTile(this.theme, cell.index).assetId);
      if (key) cell.image.setTexture(key).setVisible(true);
      else cell.image.setVisible(false);
      return;
    }
    const choice = pickFloorTile(this.theme, cell.index, cell.row);
    const baseId = choice.prop ? (this.theme.floor[0] ?? choice.assetId) : choice.assetId;
    const baseKey = this.textureOf(baseId);
    if (baseKey) cell.image.setTexture(baseKey).setVisible(true);
    else cell.image.setVisible(false);
    const propKey = choice.prop ? this.textureOf(choice.assetId) : null;
    if (propKey) {
      if (!cell.overlay) {
        cell.overlay = this.scene.add.image(0, 0, propKey).setOrigin(0, 0).setDepth(cell.image.depth + 0.05);
        cell.overlay.setTint(this.theme.tint);
      }
      cell.overlay.setTexture(propKey).setVisible(true);
    } else {
      cell.overlay?.setVisible(false);
    }
  }

  /** Posiciona as células conforme a rolagem, reciclando as que saíram pela esquerda. */
  private place(): void {
    const g = this.geo;
    const wallScroll = this.scroll * ARENA_LAYOUT.parallax;
    this.placeStrip(this.wallCells, g.wallTile, wallScroll, true);
    this.placeStrip(this.floorCells, g.floorTile, this.scroll, false);
  }

  private placeStrip(cells: Cell[], tile: number, scroll: number, isWall: boolean): void {
    const g = this.geo;
    const perRow = isWall ? cells.length : Math.floor(cells.length / g.floorRows);
    // +1 px de sobreposição evita fendas de subpixel entre ladrilhos.
    const size = Math.ceil(tile) + 1;
    for (const cell of cells) {
      let x = cell.index * tile - scroll;
      if (x < -tile) {
        const wraps = Math.ceil((-tile - x) / (perRow * tile));
        cell.index += wraps * perRow;
        x = cell.index * tile - scroll;
        this.retexture(cell, isWall);
      }
      const y = isWall ? 0 : g.rowY[cell.row]!;
      const h = isWall ? Math.ceil(g.wallTile) : size;
      cell.image.setPosition(Math.round(x), Math.round(y)).setDisplaySize(size, h);
      cell.overlay?.setPosition(Math.round(x), Math.round(y)).setDisplaySize(size, h);
    }
  }

  /** Escurece o topo e o rodapé: dá profundidade e deixa os sprites em destaque. */
  private paintShade(): void {
    this.shade?.destroy();
    const g = this.scene.add.graphics().setDepth(-6);
    const w = this.width;
    const h = this.height;
    g.fillStyle(0x07060d, 0.34);
    g.fillRect(0, 0, w, h * 0.12);
    g.fillStyle(0x07060d, 0.2);
    g.fillRect(0, h * 0.12, w, h * 0.1);
    // linha de sombra onde a parede encontra o piso
    g.fillStyle(0x07060d, 0.38);
    g.fillRect(0, this.geo.wallBottom, w, Math.max(3, h * 0.02));
    g.fillStyle(0x07060d, 0.3);
    g.fillRect(0, h * 0.92, w, h * 0.08);
    this.shade = g;
  }
}
