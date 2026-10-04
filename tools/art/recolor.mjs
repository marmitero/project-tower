/**
 * Recolor determinístico por rampas de matiz (docs/ART_PIPELINE.md §6.5) — 0 gerações.
 * Gira o matiz numa janela em torno de `from` até `to`, preservando luminosidade, contorno
 * (pixels de baixa saturação não mexem) e alfa.
 */
import { cloneRaw } from "./image.mjs";

export function rgbToHsv(r, g, b) {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const d = max - min;
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  let h = 0;
  if (d !== 0) {
    if (max === rr) h = ((gg - bb) / d) % 6;
    else if (max === gg) h = (bb - rr) / d + 2;
    else h = (rr - gg) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, max === 0 ? 0 : d / max, max];
}

export function hsvToRgb(h, s, v) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

const hueDist = (a, b) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

/**
 * @param {{w:number,h:number,data:Uint8Array}} raw
 * @param {{from:number,to:number,width?:number,satMul?:number,valMul?:number,minSat?:number}} o
 */
export function recolor(raw, o) {
  const out = cloneRaw(raw);
  const width = o.width ?? 40;
  const minSat = o.minSat ?? 0.18;
  const delta = ((o.to - o.from + 540) % 360) - 180;
  for (let i = 0; i < out.data.length; i += 4) {
    if (out.data[i + 3] === 0) continue;
    const [h, s, v] = rgbToHsv(out.data[i], out.data[i + 1], out.data[i + 2]);
    if (s < minSat) continue;
    const d = hueDist(h, o.from);
    if (d > width) continue;
    const weight = 1 - d / width; // 1 no centro da janela, 0 na borda
    const nh = (h + delta * weight + 360) % 360;
    const ns = Math.min(1, s * (1 + ((o.satMul ?? 1) - 1) * weight));
    const nv = Math.min(1, v * (1 + ((o.valMul ?? 1) - 1) * weight));
    const [r, g, b] = hsvToRgb(nh, ns, nv);
    out.data[i] = r;
    out.data[i + 1] = g;
    out.data[i + 2] = b;
  }
  return out;
}

/** Matiz médio (peso = saturação × valor) dos pixels opacos — ajuda a escolher `--from`. */
export function dominantHue(raw) {
  let x = 0;
  let y = 0;
  for (let i = 0; i < raw.data.length; i += 4) {
    if (raw.data[i + 3] < 128) continue;
    const [h, s, v] = rgbToHsv(raw.data[i], raw.data[i + 1], raw.data[i + 2]);
    if (s < 0.18) continue;
    const w = s * v;
    x += Math.cos((h * Math.PI) / 180) * w;
    y += Math.sin((h * Math.PI) / 180) * w;
  }
  return (Math.atan2(y, x) * 180) / Math.PI + (Math.atan2(y, x) < 0 ? 360 : 0);
}
