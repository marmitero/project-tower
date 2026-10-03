/**
 * Ladrilhos de arena que emendam (docs/ART_PIPELINE.md §6.3).
 * A arena repete ladrilhos em FAIXA horizontal (`Arena.ts`), então o eixo que importa é X.
 */
import { ARENA } from "./spec.mjs";
import { cloneRaw } from "./image.mjs";

/** Distância média RGB (0–255) entre duas colunas; pixels transparentes em ambos são ignorados. */
export function columnDiff(raw, xa, xb) {
  let sum = 0;
  let n = 0;
  for (let y = 0; y < raw.h; y += 1) {
    const a = (y * raw.w + xa) * 4;
    const b = (y * raw.w + xb) * 4;
    if (raw.data[a + 3] < 16 && raw.data[b + 3] < 16) continue;
    if ((raw.data[a + 3] < 16) !== (raw.data[b + 3] < 16)) {
      sum += 255;
      n += 1;
      continue;
    }
    sum += (Math.abs(raw.data[a] - raw.data[b]) + Math.abs(raw.data[a + 1] - raw.data[b + 1]) + Math.abs(raw.data[a + 2] - raw.data[b + 2])) / 3;
    n += 1;
  }
  return n === 0 ? 0 : sum / n;
}

/** Salto de cor na emenda (última coluna → primeira). */
export const seamJump = (raw) => columnDiff(raw, raw.w - 1, 0);

/**
 * Torna o ladrilho contínuo em X: mistura o ladrilho com ele mesmo deslocado de meia largura,
 * com peso 0 nas bordas (onde o deslocado é contínuo) e 1 no centro.
 */
export function makeSeamlessX(raw) {
  const out = cloneRaw(raw);
  const { w, h } = raw;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const wt = 1 - Math.abs((2 * (x + 0.5)) / w - 1); // 0 nas bordas, 1 no centro
      const o = (y * w + x) * 4;
      const s = (y * w + ((x + (w >> 1)) % w)) * 4;
      const ao = raw.data[o + 3];
      const as = raw.data[s + 3];
      const aw = ao * wt + as * (1 - wt);
      for (let c = 0; c < 3; c += 1) out.data[o + c] = Math.round(raw.data[o + c] * wt + raw.data[s + c] * (1 - wt));
      out.data[o + 3] = aw >= 128 ? 255 : 0;
    }
  }
  return out;
}

/** PRNG determinístico (mulberry32). */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Tira de teste: sorteia `count` ladrilhos (como o jogo) e mede o salto de cor em cada emenda.
 * Devolve a imagem e `{ mean, max, ok }`.
 */
export function stripTest(tiles, count = 12, seed = 7) {
  const next = rng(seed);
  const size = tiles[0].w;
  const picks = Array.from({ length: count }, () => tiles[Math.floor(next() * tiles.length)]);
  const strip = { w: size * count, h: tiles[0].h, data: new Uint8Array(size * count * tiles[0].h * 4) };
  picks.forEach((t, i) => {
    for (let y = 0; y < t.h; y += 1) strip.data.set(t.data.subarray(y * t.w * 4, (y + 1) * t.w * 4), (y * strip.w + i * size) * 4);
  });
  const jumps = [];
  for (let i = 1; i < count; i += 1) jumps.push(columnDiff(strip, i * size - 1, i * size));
  const mean = jumps.reduce((a, b) => a + b, 0) / jumps.length;
  const max = Math.max(...jumps);
  return { strip, mean, max, ok: max <= ARENA.maxSeamJump };
}

/** Luminância média (0–1) dos pixels opacos. */
export function meanLuma(raw) {
  let sum = 0;
  let n = 0;
  for (let i = 0; i < raw.data.length; i += 4) {
    if (raw.data[i + 3] < 128) continue;
    sum += (0.2126 * raw.data[i] + 0.7152 * raw.data[i + 1] + 0.0722 * raw.data[i + 2]) / 255;
    n += 1;
  }
  return n === 0 ? 0 : sum / n;
}
