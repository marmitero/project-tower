/**
 * Atlas dos efeitos visuais (VFX) do pack Nika — DADO puro, editável.
 *
 * As 6 folhas de `assets/sprites/vfx/` têm 2048×2048 com UMA faixa de
 * quadros no meio (não é uma grade 4×4 como as folhas de personagem).
 * Os retângulos abaixo foram MEDIDOS (bounding box do canal alfa de cada
 * quadro); mudar a arte = remedir e editar esta tabela, sem tocar na cena.
 *
 * `rects`: [x, y, largura, altura] de cada quadro dentro da folha.
 * `anchor`: ponto do quadro que fica sobre o alvo (`bottom` = pés, para
 *   efeitos que sobem do chão; `center` = impacto no corpo).
 * `height`: altura final do efeito em múltiplos da altura do combatente.
 */

export type VfxKind = "slash" | "hit" | "fire" | "lightning" | "heal" | "levelup";

export type VfxRect = readonly [x: number, y: number, w: number, h: number];

export interface VfxDef {
  /** ID no manifesto de assets. */
  assetId: string;
  rects: readonly VfxRect[];
  fps: number;
  anchor: "center" | "bottom";
  height: number;
  /** `ADD` deixa o brilho aditivo (fogo, raio, cura); `NORMAL` mantém a cor do pixel. */
  blend: "add" | "normal";
}

export const VFX_ATLAS: Readonly<Record<VfxKind, VfxDef>> = {
  slash: {
    assetId: "vfx/vfx_slash",
    rects: [
      [119, 823, 297, 435],
      [450, 817, 442, 448],
      [937, 812, 555, 460],
      [1495, 824, 395, 466],
    ],
    fps: 22,
    anchor: "center",
    height: 0.85,
    blend: "add",
  },
  hit: {
    assetId: "vfx/vfx_hit",
    rects: [
      [107, 970, 209, 156],
      [473, 948, 250, 215],
      [874, 911, 270, 273],
      [1273, 940, 257, 234],
      [1695, 922, 234, 258],
    ],
    fps: 24,
    anchor: "center",
    height: 0.55,
    blend: "add",
  },
  fire: {
    assetId: "vfx/vfx_fire",
    rects: [
      [62, 935, 323, 156],
      [478, 904, 341, 207],
      [819, 832, 410, 341],
      [1229, 791, 362, 413],
      [1645, 791, 341, 404],
    ],
    fps: 16,
    anchor: "center",
    height: 0.95,
    blend: "add",
  },
  lightning: {
    assetId: "vfx/vfx_lightning",
    rects: [
      [85, 301, 236, 1400],
      [534, 288, 343, 1473],
      [1028, 288, 508, 1477],
      [1536, 288, 431, 1496],
    ],
    fps: 14,
    anchor: "bottom",
    height: 2.1,
    blend: "add",
  },
  // A base de pedra do pack foi cortada (y ≤ 1440): fica só a cura subindo.
  heal: {
    assetId: "vfx/vfx_heal",
    rects: [
      [104, 1052, 272, 388],
      [489, 866, 274, 574],
      [876, 770, 280, 670],
      [1272, 649, 281, 791],
      [1657, 618, 320, 822],
    ],
    fps: 11,
    anchor: "bottom",
    height: 1.25,
    blend: "add",
  },
  levelup: {
    assetId: "vfx/vfx_levelup",
    rects: [
      [49, 1257, 280, 233],
      [435, 1091, 288, 399],
      [835, 899, 295, 591],
      [1242, 739, 296, 751],
      [1650, 547, 321, 943],
    ],
    fps: 9,
    anchor: "bottom",
    height: 1.5,
    blend: "add",
  },
};

export const VFX_KINDS = Object.keys(VFX_ATLAS) as VfxKind[];

/** ID de textura/quadro usados pela cena (um por tipo + índice do quadro). */
export function vfxFrameName(kind: VfxKind, index: number): string {
  return `${kind}#${index}`;
}

/** Escala para que o quadro MAIS ALTO tenha `def.height × alturaDoCombatente` pixels. */
export function vfxScale(def: VfxDef, fighterHeightPx: number): number {
  const tallest = Math.max(...def.rects.map((r) => r[3]));
  return (def.height * fighterHeightPx) / tallest;
}
