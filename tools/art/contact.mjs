/**
 * Contact sheet: guia (esquerda) × candidato (direita), 5 animações × 4 quadros, em fundo xadrez.
 */
import { ATLAS } from "./spec.mjs";
import { blit, newRaw, resizeNearest } from "./image.mjs";
import { framesOf } from "./validate.mjs";

export function contactSheet(cand, guide, size = 128) {
  const gap = 24;
  const half = ATLAS.cols * size;
  const sheet = newRaw(half * 2 + gap, ATLAS.rows.length * size, [32, 28, 44, 255]);
  const draw = (frames, ox) => {
    frames.forEach((row, r) =>
      row.forEach((f, c) => {
        const bg = newRaw(size, size);
        for (let y = 0; y < size; y += 1) {
          for (let x = 0; x < size; x += 1) {
            const v = ((x >> 4) + (y >> 4)) % 2 === 0 ? 70 : 54;
            const i = (y * size + x) * 4;
            bg.data[i] = bg.data[i + 1] = v;
            bg.data[i + 2] = v + 10;
            bg.data[i + 3] = 255;
          }
        }
        blit(bg, resizeNearest(f, size, size), 0, 0);
        blit(sheet, bg, ox + c * size, r * size);
      }),
    );
  };
  draw(framesOf(guide), 0);
  draw(framesOf(cand), half + gap);
  return sheet;
}
