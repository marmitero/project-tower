/**
 * Atlas-guia, fatiamento e normalização para `ita-atlas-v1` (docs/ART_PIPELINE.md §3, §6.1).
 */
import { join } from "node:path";
import { ATLAS, HEIGHT_BY_KIND, LEGACY } from "./spec.mjs";
import { bbox, blit, centroid, crop, frameOf, newRaw, readRaw, resizeNearest, resizeSmart } from "./image.mjs";

export const ATLAS_W = ATLAS.cols * ATLAS.cell;
export const ATLAS_H = ATLAS.rows.length * ATLAS.cell;

/**
 * Monta o atlas-guia a partir do pack: linha DIREITA de cada folha, 1024×1280, transparente.
 * @param {string} charactersDir `assets/sprites/characters`
 * @param {string} name `hero`, `slime`...
 */
export async function buildGuide(charactersDir, name) {
  const atlas = newRaw(ATLAS_W, ATLAS_H);
  for (const [r, anim] of ATLAS.rows.entries()) {
    const sheet = await readRaw(join(charactersDir, name, `${name}_${anim}_sheet.png`));
    if (sheet.w !== LEGACY.cell * LEGACY.cols) throw new Error(`${name}/${anim}: folha com largura inesperada (${sheet.w})`);
    for (let c = 0; c < ATLAS.cols; c += 1) {
      blit(atlas, frameOf(sheet, c, LEGACY.rowRight, LEGACY.cell), c * ATLAS.cell, r * ATLAS.cell);
    }
  }
  return atlas;
}

/** Guia sobre fundo magenta (a imagem que vai como referência ao gerador). */
export function guideOnMagenta(guide) {
  const bg = newRaw(guide.w, guide.h, [255, 0, 255, 255]);
  blit(bg, guide, 0, 0);
  return bg;
}

/** Divide numa grade `cols × rows` de células iguais (tamanho livre). */
export function sliceGrid(raw, cols, rows) {
  const cw = Math.floor(raw.w / cols);
  const ch = Math.floor(raw.h / rows);
  const cells = [];
  for (let r = 0; r < rows; r += 1) {
    const line = [];
    for (let c = 0; c < cols; c += 1) line.push(crop(raw, c * cw, r * ch, cw, ch));
    cells.push(line);
  }
  return { cells, cw, ch };
}

export function targetHeightFor(kind) {
  const range = HEIGHT_BY_KIND[kind];
  if (!range) throw new Error(`tipo desconhecido: ${kind} (use ${Object.keys(HEIGHT_BY_KIND).join(", ")})`);
  return Math.round((range[0] + range[1]) / 2);
}

/** Linha-base (y) do quadro: 243, e 247 nos quadros 2–3 do idle. */
export function baselineFor(anim, col) {
  return ATLAS.anchor.y + (anim === "idle" && col >= 2 ? ATLAS.idleBreathPx : 0);
}

/**
 * Normaliza uma imagem JÁ com alfa (saída de `chromaKey`) de grade 4×5 em atlas `ita-atlas-v1`.
 *  - escala ÚNICA (altura do idle quadro 0 → altura-alvo do tipo);
 *  - movimento relativo preservado (um só deslocamento horizontal, vindo do idle quadro 0);
 *  - base dos pés por quadro na âncora;
 *  - margem de 4 px garantida (desloca, e avisa).
 * @param {{w:number,h:number,data:Uint8Array}} keyed
 * @param {{kind:string, targetHeight?:number, snap?:number}} opts
 */
export function normalizeAtlas(keyed, opts) {
  const { cells } = sliceGrid(keyed, ATLAS.cols, ATLAS.rows.length);
  const target = opts.targetHeight ?? targetHeightFor(opts.kind);
  const idle0 = cells[0][0];
  const b0 = bbox(idle0);
  if (!b0) throw new Error("quadro 0 do idle vazio: nada a normalizar");
  const scale = target / b0.h;
  const c0 = centroid(idle0);
  const cx0 = c0.x * scale;
  const out = newRaw(ATLAS_W, ATLAS_H);
  const warnings = [];
  const frames = [];

  for (const [r, anim] of ATLAS.rows.entries()) {
    for (let c = 0; c < ATLAS.cols; c += 1) {
      const cell = cells[r][c];
      const b = bbox(cell);
      if (!b) {
        warnings.push(`${anim}[${c}]: quadro vazio`);
        frames.push(null);
        continue;
      }
      const piece = resizeSmart(crop(cell, b.x0, b.y0, b.w, b.h), Math.max(1, Math.round(b.w * scale)), Math.max(1, Math.round(b.h * scale)));
      let left = Math.round(ATLAS.anchor.x + b.x0 * scale - cx0);
      const top = baselineFor(anim, c) - piece.h + 1;
      const lo = ATLAS.margin;
      const hi = ATLAS.cell - ATLAS.margin - piece.w;
      if (left < lo || left > hi) {
        warnings.push(`${anim}[${c}]: fora da margem de ${ATLAS.margin}px (x=${left}); deslocado`);
        left = Math.max(lo, Math.min(hi, left));
      }
      if (top < ATLAS.margin) warnings.push(`${anim}[${c}]: topo a ${top}px da borda`);
      blit(out, piece, c * ATLAS.cell + left, r * ATLAS.cell + Math.max(0, top));
      frames.push({ anim, col: c, w: piece.w, h: piece.h, left, top });
    }
  }

  let result = out;
  if (opts.snap && opts.snap > 1) result = snapToGrid(out, opts.snap);
  return { atlas: result, report: { scale, targetHeight: target, sourceIdleHeight: b0.h, frames, warnings } };
}

/** Cola o desenho numa grade de pixel de arte `p` (reduz por vizinho e amplia de volta). */
export function snapToGrid(raw, p) {
  const small = resizeSmart(raw, Math.round(raw.w / p), Math.round(raw.h / p));
  return resizeNearest(small, raw.w, raw.h); // mantém o tamanho exato do atlas
}

export function atlasMeta(id, extra = {}) {
  return {
    format: ATLAS.format,
    id,
    cell: ATLAS.cell,
    cols: ATLAS.cols,
    anchor: [ATLAS.anchor.x, ATLAS.anchor.y],
    facing: "right",
    flipForLeft: true,
    anims: Object.fromEntries(
      ATLAS.rows.map((name, row) => [name, { row, frames: ATLAS.cols, fps: ATLAS.fps[name], loop: ATLAS.loop[name] }]),
    ),
    ...extra,
  };
}
