/**
 * Reflow de linhas (Correção Kaia, ADR-035): alguns geradores devolvem a folha 4×5 numa tela QUADRADA
 * (1024×1024) em vez de 4:5 (1024×1280). Esticar a imagem deforma o personagem (≈ +25 % de altura) e
 * reprova a fidelidade. Aqui as 5 linhas são achadas pelo VAZIO entre elas (projeção vertical do alfa)
 * e reposicionadas, SEM reamostrar, numa tela 4:5 de células 256 — a base de cada linha na âncora.
 * Zero geração. Só age quando a proporção não é 4:5; devolve a própria imagem se já for.
 */
import { ATLAS } from "./spec.mjs";
import { blit, crop, newRaw } from "./image.mjs";

/** Faixas [y0, y1] com conteúdo (alfa > 0), separadas por ≥ `minGap` linhas vazias. */
export function contentBands(raw, { alphaMin = 8, minPixels = 3, minGap = 6 } = {}) {
  const counts = new Array(raw.h).fill(0);
  for (let y = 0; y < raw.h; y += 1) {
    for (let x = 0; x < raw.w; x += 1) if (raw.data[(y * raw.w + x) * 4 + 3] >= alphaMin) counts[y] += 1;
  }
  const bands = [];
  let start = null;
  let gap = 0;
  for (let y = 0; y < raw.h; y += 1) {
    if (counts[y] >= minPixels) {
      if (start === null) start = y;
      gap = 0;
    } else if (start !== null) {
      gap += 1;
      if (gap >= minGap) {
        bands.push([start, y - gap]);
        start = null;
        gap = 0;
      }
    }
  }
  if (start !== null) bands.push([start, raw.h - 1 - gap]);
  return bands;
}

/** @returns {{raw: object, reflowed: boolean, bands?: number[][]}} */
export function reflowRows(raw, { rows = ATLAS.rows.length, cell = ATLAS.cell, cols = ATLAS.cols } = {}) {
  const wantRatio = cols / rows;
  if (Math.abs(raw.w / raw.h - wantRatio) < 0.02) return { raw, reflowed: false };
  const bands = contentBands(raw);
  if (bands.length !== rows) throw new Error(`reflow: esperava ${rows} linhas de conteúdo, achei ${bands.length} (${JSON.stringify(bands)})`);
  const colW = raw.w / cols;
  const out = newRaw(cell * cols, cell * rows);
  const scale = (cell * cols) / raw.w;
  if (Math.abs(scale - 1) > 0.001) throw new Error("reflow: a largura precisa ser a do atlas (cols × célula); reduza/amplie antes");
  void colW;
  bands.forEach(([y0, y1], r) => {
    const h = y1 - y0 + 1;
    if (h > cell - 2) throw new Error(`reflow: a linha ${r + 1} tem ${h}px (> ${cell - 2})`);
    blit(out, crop(raw, 0, y0, raw.w, h), 0, r * cell + ATLAS.anchor.y - h + 1);
  });
  return { raw: out, reflowed: true, bands };
}
