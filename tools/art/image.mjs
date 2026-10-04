/**
 * Operações de imagem RGBA crua (sem dependências além de `sharp` para ler/gravar).
 * `Raw = { w, h, data: Buffer|Uint8Array }` — 4 bytes por pixel, alfa não pré-multiplicado.
 */
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export async function readRaw(src) {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { w: info.width, h: info.height, data: new Uint8Array(data) };
}

export function newRaw(w, h, fill = [0, 0, 0, 0]) {
  const data = new Uint8Array(w * h * 4);
  if (fill[0] || fill[1] || fill[2] || fill[3]) {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = fill[0];
      data[i + 1] = fill[1];
      data[i + 2] = fill[2];
      data[i + 3] = fill[3];
    }
  }
  return { w, h, data };
}

export const cloneRaw = (r) => ({ w: r.w, h: r.h, data: new Uint8Array(r.data) });

export async function writePng(raw, path, opts = {}) {
  mkdirSync(dirname(path), { recursive: true });
  const png = opts.palette
    ? { palette: true, colours: opts.colours ?? 64, dither: 0, compressionLevel: 9, effort: 10 }
    : { compressionLevel: 9 };
  await sharp(Buffer.from(raw.data.buffer, raw.data.byteOffset, raw.data.byteLength), {
    raw: { width: raw.w, height: raw.h, channels: 4 },
  })
    .png(png)
    .toFile(path);
}

/** Recorta (fora dos limites = transparente). */
export function crop(raw, x, y, w, h) {
  const out = newRaw(w, h);
  for (let j = 0; j < h; j += 1) {
    const sy = y + j;
    if (sy < 0 || sy >= raw.h) continue;
    for (let i = 0; i < w; i += 1) {
      const sx = x + i;
      if (sx < 0 || sx >= raw.w) continue;
      const s = (sy * raw.w + sx) * 4;
      const d = (j * w + i) * 4;
      out.data[d] = raw.data[s];
      out.data[d + 1] = raw.data[s + 1];
      out.data[d + 2] = raw.data[s + 2];
      out.data[d + 3] = raw.data[s + 3];
    }
  }
  return out;
}

/** Cola `src` em `dst` (alfa "over"). */
export function blit(dst, src, dx, dy) {
  for (let j = 0; j < src.h; j += 1) {
    const y = dy + j;
    if (y < 0 || y >= dst.h) continue;
    for (let i = 0; i < src.w; i += 1) {
      const x = dx + i;
      if (x < 0 || x >= dst.w) continue;
      const s = (j * src.w + i) * 4;
      const sa = src.data[s + 3] / 255;
      if (sa === 0) continue;
      const d = (y * dst.w + x) * 4;
      const da = dst.data[d + 3] / 255;
      const oa = sa + da * (1 - sa);
      for (let c = 0; c < 3; c += 1) {
        dst.data[d + c] = Math.round((src.data[s + c] * sa + dst.data[d + c] * da * (1 - sa)) / (oa || 1));
      }
      dst.data[d + 3] = Math.round(oa * 255);
    }
  }
}

/** Caixa dos pixels com alfa ≥ `min`; `null` se vazio. */
export function bbox(raw, min = 16) {
  let x0 = raw.w;
  let y0 = raw.h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < raw.h; y += 1) {
    for (let x = 0; x < raw.w; x += 1) {
      if (raw.data[(y * raw.w + x) * 4 + 3] >= min) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null;
  return { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** Centro de massa (alfa) e área. */
export function centroid(raw, min = 16) {
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (let y = 0; y < raw.h; y += 1) {
    for (let x = 0; x < raw.w; x += 1) {
      if (raw.data[(y * raw.w + x) * 4 + 3] >= min) {
        sx += x;
        sy += y;
        n += 1;
      }
    }
  }
  return n === 0 ? null : { x: sx / n, y: sy / n, area: n };
}

/** Reamostra por vizinho mais próximo (preserva pixel art ao ampliar). */
export function resizeNearest(raw, nw, nh) {
  const out = newRaw(nw, nh);
  for (let y = 0; y < nh; y += 1) {
    const sy = Math.min(raw.h - 1, Math.floor(((y + 0.5) * raw.h) / nh));
    for (let x = 0; x < nw; x += 1) {
      const sx = Math.min(raw.w - 1, Math.floor(((x + 0.5) * raw.w) / nw));
      const s = (sy * raw.w + sx) * 4;
      const d = (y * nw + x) * 4;
      out.data[d] = raw.data[s];
      out.data[d + 1] = raw.data[s + 1];
      out.data[d + 2] = raw.data[s + 2];
      out.data[d + 3] = raw.data[s + 3];
    }
  }
  return out;
}

/** Reduz por média de área (cores pré-multiplicadas); o alfa sai binarizado em `alphaCut`. */
export function resizeBox(raw, nw, nh, alphaCut = 128) {
  const out = newRaw(nw, nh);
  for (let y = 0; y < nh; y += 1) {
    const y0 = (y * raw.h) / nh;
    const y1 = ((y + 1) * raw.h) / nh;
    for (let x = 0; x < nw; x += 1) {
      const x0 = (x * raw.w) / nw;
      const x1 = ((x + 1) * raw.w) / nw;
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let wsum = 0;
      for (let sy = Math.floor(y0); sy < Math.ceil(y1); sy += 1) {
        const wy = Math.min(sy + 1, y1) - Math.max(sy, y0);
        for (let sx = Math.floor(x0); sx < Math.ceil(x1); sx += 1) {
          const wx = Math.min(sx + 1, x1) - Math.max(sx, x0);
          const w = wx * wy;
          const s = (Math.min(sy, raw.h - 1) * raw.w + Math.min(sx, raw.w - 1)) * 4;
          const sa = raw.data[s + 3] / 255;
          r += raw.data[s] * sa * w;
          g += raw.data[s + 1] * sa * w;
          b += raw.data[s + 2] * sa * w;
          a += sa * w;
          wsum += w;
        }
      }
      const d = (y * nw + x) * 4;
      if (a > 0 && wsum > 0) {
        out.data[d] = Math.round(r / a);
        out.data[d + 1] = Math.round(g / a);
        out.data[d + 2] = Math.round(b / a);
        const af = (a / wsum) * 255;
        out.data[d + 3] = alphaCut > 0 ? (af >= alphaCut ? 255 : 0) : Math.round(af);
      }
    }
  }
  return out;
}

/** Escolhe nearest para ampliar e box para reduzir. */
export function resizeSmart(raw, nw, nh) {
  return nw >= raw.w && nh >= raw.h ? resizeNearest(raw, nw, nh) : resizeBox(raw, nw, nh);
}

export function flipX(raw) {
  const out = newRaw(raw.w, raw.h);
  for (let y = 0; y < raw.h; y += 1) {
    for (let x = 0; x < raw.w; x += 1) {
      const s = (y * raw.w + x) * 4;
      const d = (y * raw.w + (raw.w - 1 - x)) * 4;
      out.data[d] = raw.data[s];
      out.data[d + 1] = raw.data[s + 1];
      out.data[d + 2] = raw.data[s + 2];
      out.data[d + 3] = raw.data[s + 3];
    }
  }
  return out;
}

/** Quantidade de cores distintas (com agrupamento por `step` de 8 níveis) entre pixels opacos. */
export function countColours(raw, step = 8) {
  const set = new Set();
  for (let i = 0; i < raw.data.length; i += 4) {
    if (raw.data[i + 3] < 128) continue;
    set.add(((raw.data[i] / step) | 0) * 65536 + ((raw.data[i + 1] / step) | 0) * 256 + ((raw.data[i + 2] / step) | 0));
  }
  return set.size;
}

export function frameOf(raw, col, row, cell = 256) {
  return crop(raw, col * cell, row * cell, cell, cell);
}
