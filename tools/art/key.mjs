/**
 * Chroma key #FF00FF → alfa (+ despill, erosão de borda rosada, remoção de ilhas).
 * Núcleo herdado de `scripts/gen-item-icons.mjs` (14 ícones já em produção).
 */
import { CHROMA, THRESHOLDS } from "./spec.mjs";
import { cloneRaw } from "./image.mjs";

const magentaness = (d, i) => Math.min(d[i], d[i + 2]) - d[i + 1];

/** Fração de pixels OPACOS que ainda parecem magenta (rosa/violeta saturado). */
export function residualMagenta(raw, threshold = 40) {
  let opaque = 0;
  let bad = 0;
  for (let i = 0; i < raw.data.length; i += 4) {
    if (raw.data[i + 3] < 128) continue;
    opaque += 1;
    if (magentaness(raw.data, i) > threshold && raw.data[i] > 150 && raw.data[i + 2] > 150) bad += 1;
  }
  return opaque === 0 ? 0 : bad / opaque;
}

function neighbours4(w, h, x, y) {
  const out = [];
  if (x > 0) out.push(y * w + x - 1);
  if (x < w - 1) out.push(y * w + x + 1);
  if (y > 0) out.push((y - 1) * w + x);
  if (y < h - 1) out.push((y + 1) * w + x);
  return out;
}

/** Remove componentes (8-conexos) opacos com área ≤ `maxArea`. */
export function removeIslands(raw, maxArea = 3) {
  const { w, h, data } = raw;
  const seen = new Uint8Array(w * h);
  let removed = 0;
  for (let start = 0; start < w * h; start += 1) {
    if (seen[start] || data[start * 4 + 3] === 0) continue;
    const stack = [start];
    const comp = [];
    seen[start] = 1;
    while (stack.length) {
      const p = stack.pop();
      comp.push(p);
      const px = p % w;
      const py = (p / w) | 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = px + dx;
          const ny = py + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const q = ny * w + nx;
          if (seen[q] || data[q * 4 + 3] === 0) continue;
          seen[q] = 1;
          stack.push(q);
        }
      }
    }
    if (comp.length <= maxArea) {
      for (const p of comp) data[p * 4 + 3] = 0;
      removed += comp.length;
    }
  }
  return removed;
}

/**
 * @param {{w:number,h:number,data:Uint8Array}} raw
 * @param {{binary?:boolean, islands?:number}} [opts]
 */
export function chromaKey(raw, opts = {}) {
  const out = cloneRaw(raw);
  const { w, h, data } = out;
  const { hard, soft, minChannel, softMinChannel } = CHROMA;

  for (let i = 0; i < data.length; i += 4) {
    const m = magentaness(data, i);
    const r = data[i];
    const b = data[i + 2];
    if (m > hard && r > minChannel && b > minChannel) data[i + 3] = 0;
    else if (m > soft && r > softMinChannel && b > softMinChannel) {
      data[i + 3] = Math.min(data[i + 3], Math.round(255 * (1 - (m - soft) / (hard - soft))));
    }
  }

  // anel de 2 px ao redor do que foi removido: é onde mora a franja rosa
  const ring = new Uint8Array(w * h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (data[(y * w + x) * 4 + 3] !== 0) continue;
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < w && ny < h) ring[ny * w + nx] = 1;
        }
      }
    }
  }
  // despill (puxa R/B para G+40) só na franja; erode 1 px de borda ainda rosada
  const kill = [];
  for (let p = 0; p < w * h; p += 1) {
    const i = p * 4;
    if (!ring[p] || data[i + 3] === 0) continue;
    const m = magentaness(data, i);
    if (m > 20) {
      const g = data[i + 1];
      data[i] = Math.min(data[i], g + 40);
      data[i + 2] = Math.min(data[i + 2], g + 40);
    }
    if (m > 10) {
      const x = p % w;
      const y = (p / w) | 0;
      if (neighbours4(w, h, x, y).some((q) => data[q * 4 + 3] === 0)) kill.push(p);
    }
  }
  for (const p of kill) data[p * 4 + 3] = 0;

  if (opts.binary !== false) {
    for (let i = 0; i < data.length; i += 4) data[i + 3] = data[i + 3] >= 128 ? 255 : 0;
  }
  const islands = removeIslands(out, opts.islands ?? 3);
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) data[i] = data[i + 1] = data[i + 2] = 0;
  }
  const residual = residualMagenta(out);
  return { raw: out, stats: { islandsRemoved: islands, residual, residualOk: residual <= THRESHOLDS.residualMagenta } };
}

/**
 * Fundo "quase magenta" (Lote 5, ADR-040): alguns geradores devolvem o fundo rosa-claro (ex.: 253,142,252)
 * em vez de #FF00FF, e o chroma key deixa uma franja enorme. Se os 4 cantos concordam entre si e NÃO são
 * magenta puro, todo pixel perto dessa cor (distância RGB ≤ `tolerance`) vira #FF00FF antes da chave.
 * Não mexe em folhas que já vêm com magenta de verdade. Determinístico, zero geração.
 *
 * @returns {{raw: {w:number,h:number,data:Uint8Array}, replaced: number, colour: number[]|null}}
 */
export function normalizeKeyColour(raw, { tolerance = 60, cornerAgreement = 24 } = {}) {
  const { w, h, data } = raw;
  const at = (x, y) => [data[(y * w + x) * 4], data[(y * w + x) * 4 + 1], data[(y * w + x) * 4 + 2]];
  const corners = [at(2, 2), at(w - 3, 2), at(2, h - 3), at(w - 3, h - 3)];
  const base = corners[0];
  const agree = corners.every((c) => Math.hypot(c[0] - base[0], c[1] - base[1], c[2] - base[2]) <= cornerAgreement);
  const isPure = Math.hypot(base[0] - 255, base[1], base[2] - 255) <= 24;
  const pinkish = Math.min(base[0], base[2]) - base[1] > 60 && base[0] > 150 && base[2] > 150;
  if (!agree || isPure || !pinkish) return { raw, replaced: 0, colour: null };
  const out = cloneRaw(raw);
  let replaced = 0;
  for (let i = 0; i < out.data.length; i += 4) {
    const d = Math.hypot(out.data[i] - base[0], out.data[i + 1] - base[1], out.data[i + 2] - base[2]);
    if (d <= tolerance) {
      out.data[i] = 255;
      out.data[i + 1] = 0;
      out.data[i + 2] = 255;
      replaced += 1;
    }
  }
  return { raw: out, replaced, colour: base };
}
