/**
 * Quantização de paleta por corte mediano (sem dithering, alfa binário).
 * Existe porque a opção `colours` do `sharp` não limitou a paleta nas medições de 2026-10-03
 * (pedido de 64 cores saiu com 256) — aqui o limite é GARANTIDO e testado.
 */
import { cloneRaw } from "./image.mjs";

/** @returns {{raw:{w:number,h:number,data:Uint8Array}, palette:number[][]}} */
export function quantize(raw, colours = 64) {
  const hist = new Map(); // chave 5 bits/canal -> {r,g,b,n}
  for (let i = 0; i < raw.data.length; i += 4) {
    if (raw.data[i + 3] < 128) continue;
    const key = ((raw.data[i] >> 3) << 10) | ((raw.data[i + 1] >> 3) << 5) | (raw.data[i + 2] >> 3);
    const e = hist.get(key);
    if (e) {
      e.r += raw.data[i];
      e.g += raw.data[i + 1];
      e.b += raw.data[i + 2];
      e.n += 1;
    } else hist.set(key, { r: raw.data[i], g: raw.data[i + 1], b: raw.data[i + 2], n: 1 });
  }
  const items = [...hist.values()].map((e) => ({ r: e.r / e.n, g: e.g / e.n, b: e.b / e.n, n: e.n }));
  if (items.length === 0) return { raw: cloneRaw(raw), palette: [] };

  let boxes = [items];
  const range = (box) => {
    let min = [255, 255, 255];
    let max = [0, 0, 0];
    for (const p of box) {
      const v = [p.r, p.g, p.b];
      for (let c = 0; c < 3; c += 1) {
        if (v[c] < min[c]) min[c] = v[c];
        if (v[c] > max[c]) max[c] = v[c];
      }
    }
    const spans = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
    const channel = spans.indexOf(Math.max(...spans));
    return { channel, span: spans[channel] };
  };
  while (boxes.length < colours) {
    // divide a caixa de maior (extensão × população)
    let best = -1;
    let bestScore = 0;
    boxes.forEach((b, i) => {
      if (b.length < 2) return;
      const score = range(b).span * b.reduce((a, p) => a + p.n, 0);
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    });
    if (best < 0) break;
    const box = boxes[best];
    const { channel } = range(box);
    const key = ["r", "g", "b"][channel];
    box.sort((a, b) => a[key] - b[key]);
    const half = box.reduce((a, p) => a + p.n, 0) / 2;
    let acc = 0;
    let cut = 1;
    for (let i = 0; i < box.length - 1; i += 1) {
      acc += box[i].n;
      cut = i + 1;
      if (acc >= half) break;
    }
    boxes.splice(best, 1, box.slice(0, cut), box.slice(cut));
  }
  const palette = boxes.map((b) => {
    const n = b.reduce((a, p) => a + p.n, 0);
    return [Math.round(b.reduce((a, p) => a + p.r * p.n, 0) / n), Math.round(b.reduce((a, p) => a + p.g * p.n, 0) / n), Math.round(b.reduce((a, p) => a + p.b * p.n, 0) / n)];
  });

  const out = cloneRaw(raw);
  const cache = new Map();
  for (let i = 0; i < out.data.length; i += 4) {
    if (out.data[i + 3] < 128) {
      out.data[i] = out.data[i + 1] = out.data[i + 2] = out.data[i + 3] = 0;
      continue;
    }
    const key = (out.data[i] << 16) | (out.data[i + 1] << 8) | out.data[i + 2];
    let idx = cache.get(key);
    if (idx === undefined) {
      let bestD = Infinity;
      idx = 0;
      for (let p = 0; p < palette.length; p += 1) {
        const dr = palette[p][0] - out.data[i];
        const dg = palette[p][1] - out.data[i + 1];
        const db = palette[p][2] - out.data[i + 2];
        const d = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
        if (d < bestD) {
          bestD = d;
          idx = p;
        }
      }
      cache.set(key, idx);
    }
    out.data[i] = palette[idx][0];
    out.data[i + 1] = palette[idx][1];
    out.data[i + 2] = palette[idx][2];
    out.data[i + 3] = 255;
  }
  return { raw: out, palette };
}

/** Erro médio absoluto por canal (0–255) entre duas imagens, nos pixels opacos de `a`. */
export function meanError(a, b) {
  let sum = 0;
  let n = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    if (a.data[i + 3] < 128) continue;
    sum += Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]);
    n += 3;
  }
  return n === 0 ? 0 : sum / n;
}
