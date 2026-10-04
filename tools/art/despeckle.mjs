/**
 * Limpeza de fragmentos soltos (Lote 4, ADR-038): geradores às vezes deixam pedaços do quadro vizinho
 * (ponta de espada, sandália) dentro da célula. Eles inflam o bbox, deslocam a âncora e reprovam a
 * margem. Por célula da grade, mantém o MAIOR componente e só os componentes próximos dele
 * (arco de golpe, arma destacada); apaga o resto. Zero geração, determinístico.
 */
import { ATLAS } from "./spec.mjs";

const NEIGHBOURS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];

/**
 * @param {{w:number,h:number,data:Uint8Array}} raw RGBA já com chave (alfa 0 = fundo)
 * @returns {{raw: object, removedPixels: number, cellsTouched: number}}
 */
export function despeckleCells(raw, { cols = ATLAS.cols, rows = ATLAS.rows.length, minArea = 150, reach = 30, alphaMin = 8 } = {}) {
  const out = { w: raw.w, h: raw.h, data: new Uint8Array(raw.data) };
  const cw = Math.floor(raw.w / cols);
  const ch = Math.floor(raw.h / rows);
  let removedPixels = 0;
  let cellsTouched = 0;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const ox = c * cw;
      const oy = r * ch;
      const lab = new Int32Array(cw * ch).fill(-1);
      const info = [];
      const solid = (x, y) => out.data[((oy + y) * raw.w + ox + x) * 4 + 3] >= alphaMin;
      for (let i = 0; i < cw * ch; i += 1) {
        const sx = i % cw;
        const sy = (i / cw) | 0;
        if (lab[i] >= 0 || !solid(sx, sy)) continue;
        const id = info.length;
        const o = { n: 0, x0: cw, y0: ch, x1: 0, y1: 0 };
        const stack = [i];
        lab[i] = id;
        while (stack.length) {
          const p = stack.pop();
          const x = p % cw;
          const y = (p / cw) | 0;
          o.n += 1;
          if (x < o.x0) o.x0 = x;
          if (x > o.x1) o.x1 = x;
          if (y < o.y0) o.y0 = y;
          if (y > o.y1) o.y1 = y;
          for (const [dx, dy] of NEIGHBOURS) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= cw || ny >= ch) continue;
            const q = ny * cw + nx;
            if (lab[q] >= 0 || !solid(nx, ny)) continue;
            lab[q] = id;
            stack.push(q);
          }
        }
        info.push(o);
      }
      if (info.length < 2) continue;
      const main = info.reduce((a, b) => (b.n > a.n ? b : a));
      const keep = info.map(
        (o) =>
          o === main ||
          (o.n >= minArea && o.x1 >= main.x0 - reach && o.x0 <= main.x1 + reach && o.y1 <= main.y1 + 4 && o.y1 >= main.y0 - reach),
      );
      let touched = false;
      for (let i = 0; i < cw * ch; i += 1) {
        if (lab[i] < 0 || keep[lab[i]]) continue;
        out.data[((oy + ((i / cw) | 0)) * raw.w + ox + (i % cw)) * 4 + 3] = 0;
        removedPixels += 1;
        touched = true;
      }
      if (touched) cellsTouched += 1;
    }
  }
  return { raw: out, removedPixels, cellsTouched };
}
