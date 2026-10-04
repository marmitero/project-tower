/**
 * Mede o "pixel de arte" de uma imagem. As folhas do pack NÃO são pixel art exata (há
 * suavização), então a medida é estatística: a MODA dos intervalos entre bordas de cor
 * (diferença de cor > 40) em linhas e colunas, ignorando intervalos < 2 (ruído de suavização).
 * Medido no pack (2026-10-03): Guardião 3 px · Orc 3 px · Arcanista 3 px · Gosma 4 px.
 */
export function measurePixelGrid(raw) {
  const hist = new Map();
  const edge = (i, j) =>
    Math.abs(raw.data[i] - raw.data[j]) + Math.abs(raw.data[i + 1] - raw.data[j + 1]) + Math.abs(raw.data[i + 2] - raw.data[j + 2]) > 40;
  const scan = (outer, inner, at) => {
    for (let a = 0; a < outer; a += 1) {
      let last = -1;
      for (let b = 1; b < inner; b += 1) {
        const i = at(a, b);
        const j = at(a, b - 1);
        if (raw.data[i + 3] < 128 || raw.data[j + 3] < 128) {
          last = -1;
          continue;
        }
        if (!edge(i, j)) continue;
        if (last >= 0 && b - last >= 2) hist.set(b - last, (hist.get(b - last) ?? 0) + 1);
        last = b;
      }
    }
  };
  scan(raw.h, raw.w, (y, x) => (y * raw.w + x) * 4);
  scan(raw.w, raw.h, (x, y) => (y * raw.w + x) * 4);
  const total = [...hist.values()].reduce((a, b) => a + b, 0);
  if (total === 0) return { p: 1, confidence: 0, runs: 0 };
  const [p, n] = [...hist.entries()].sort((a, b) => b[1] - a[1])[0];
  return { p, confidence: n / total, runs: total };
}
