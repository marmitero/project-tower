/**
 * Validação de fidelidade de movimento (docs/ART_PIPELINE.md §6.2).
 *
 * Compara um atlas `ita-atlas-v1` com o ATLAS-GUIA (poses do pack) e devolve, por teste,
 * `ok` · `review` · `fail`; o veredito é `approved` · `review` · `redo`.
 * Os limiares moram em `spec.mjs` (CALIBRAR no Lote 1).
 */
import { ATLAS, HEIGHT_BY_KIND, THRESHOLDS } from "./spec.mjs";
import { baselineFor, ATLAS_H, ATLAS_W, targetHeightFor } from "./atlas.mjs";
import { bbox, centroid, countColours, frameOf, newRaw } from "./image.mjs";
import { residualMagenta } from "./key.mjs";

const worst = (a, b) => (a === "fail" || b === "fail" ? "fail" : a === "review" || b === "review" ? "review" : "ok");
const grade = (value, ok, review, lowerIsBetter = true) => {
  if (lowerIsBetter) return value <= ok ? "ok" : value <= review ? "review" : "fail";
  return value >= ok ? "ok" : value >= review ? "review" : "fail";
};

/** Métricas de um quadro 256². */
export function frameMetrics(frame) {
  const b = bbox(frame);
  if (!b) return null;
  const c = centroid(frame);
  return { bbox: b, cx: c.x, cy: c.y, area: c.area, bottom: b.y1 };
}

/** Escala o quadro em torno da âncora (nearest inverso) — para comparar silhuetas em escalas diferentes. */
export function scaleAboutAnchor(frame, k, ax, ay) {
  const out = newRaw(frame.w, frame.h);
  for (let y = 0; y < frame.h; y += 1) {
    for (let x = 0; x < frame.w; x += 1) {
      const sx = Math.round(ax + (x - ax) / k);
      const sy = Math.round(ay + (y - ay) / k);
      if (sx < 0 || sy < 0 || sx >= frame.w || sy >= frame.h) continue;
      const s = (sy * frame.w + sx) * 4;
      const d = (y * frame.w + x) * 4;
      out.data[d] = frame.data[s];
      out.data[d + 1] = frame.data[s + 1];
      out.data[d + 2] = frame.data[s + 2];
      out.data[d + 3] = frame.data[s + 3];
    }
  }
  return out;
}

export function iou(a, b, min = 128) {
  let inter = 0;
  let union = 0;
  for (let i = 3; i < a.data.length; i += 4) {
    const pa = a.data[i] >= min;
    const pb = b.data[i] >= min;
    if (pa && pb) inter += 1;
    if (pa || pb) union += 1;
  }
  return union === 0 ? 0 : inter / union;
}

/** Extrai os 20 quadros (linha × coluna) de um atlas. */
export function framesOf(atlas) {
  return ATLAS.rows.map((_, r) => Array.from({ length: ATLAS.cols }, (__, c) => frameOf(atlas, c, r, ATLAS.cell)));
}

/** Série de movimento de uma animação, normalizada pela altura do idle. */
function motionSeries(metrics, H) {
  const first = metrics[0];
  return metrics.map((m) => [m.bbox.w / H, m.bbox.h / H, (m.cx - first.cx) / H, (m.bottom - first.bottom) / H]);
}

/**
 * @param {{w:number,h:number,data:Uint8Array}} cand atlas candidato (RGBA com alfa)
 * @param {{w:number,h:number,data:Uint8Array}} guide atlas-guia
 * @param {{kind:string}} opts
 */
export function validateAtlas(cand, guide, opts) {
  const checks = [];
  const add = (name, status, detail) => checks.push({ name, status, detail });

  if (cand.w !== ATLAS_W || cand.h !== ATLAS_H) {
    add("dimensões", "fail", `${cand.w}×${cand.h}, esperado ${ATLAS_W}×${ATLAS_H}`);
    return finish(checks);
  }
  add("dimensões", "ok", `${ATLAS_W}×${ATLAS_H}`);

  const cf = framesOf(cand);
  const gf = framesOf(guide);
  const cm = cf.map((row) => row.map(frameMetrics));
  const gm = gf.map((row) => row.map(frameMetrics));

  const empty = [];
  cm.forEach((row, r) => row.forEach((m, c) => !m && empty.push(`${ATLAS.rows[r]}[${c}]`)));
  add("quadros", empty.length ? "fail" : "ok", empty.length ? `vazios: ${empty.join(", ")}` : "20 quadros preenchidos");
  if (empty.length) return finish(checks);

  // âncora: base dos pés
  let anchorStatus = "ok";
  let anchorWorst = 0;
  for (const [r, anim] of ATLAS.rows.entries()) {
    const tol = THRESHOLDS.anchorPx[anim] ?? THRESHOLDS.anchorPx.default;
    for (let c = 0; c < ATLAS.cols; c += 1) {
      const dev = Math.abs(cm[r][c].bottom - baselineFor(anim, c));
      anchorWorst = Math.max(anchorWorst, dev);
      anchorStatus = worst(anchorStatus, dev <= tol ? "ok" : dev <= tol * 2 ? "review" : "fail");
    }
  }
  add("âncora", anchorStatus, `pior desvio da base dos pés: ${anchorWorst}px`);

  // escala
  const H = cm[0][0].bbox.h;
  const GH = gm[0][0].bbox.h;
  const target = targetHeightFor(opts.kind);
  const range = HEIGHT_BY_KIND[opts.kind];
  const dev = Math.abs(H - target) / target;
  const inRange = H >= range[0] * (1 - THRESHOLDS.scaleTol) && H <= range[1] * (1 + THRESHOLDS.scaleTol);
  add("escala", inRange ? "ok" : dev <= THRESHOLDS.scaleTol * 2 ? "review" : "fail", `idle ${H}px (faixa ${range[0]}–${range[1]}px para "${opts.kind}")`);

  // margem
  let bleed = 0;
  for (const row of cf) {
    for (const f of row) {
      for (let y = 0; y < f.h; y += 1) {
        for (let x = 0; x < f.w; x += 1) {
          const edge = x < ATLAS.margin || y < ATLAS.margin || x >= f.w - ATLAS.margin || y >= f.h - ATLAS.margin;
          if (edge && f.data[(y * f.w + x) * 4 + 3] >= 16) bleed += 1;
        }
      }
    }
  }
  add("margem", bleed === 0 ? "ok" : "fail", bleed === 0 ? `${ATLAS.margin}px livres em todos os quadros` : `${bleed} pixels opacos na margem de ${ATLAS.margin}px`);

  // chroma
  const resid = residualMagenta(cand);
  add("chroma", resid <= THRESHOLDS.residualMagenta ? "ok" : resid <= THRESHOLDS.residualMagenta * 5 ? "review" : "fail", `${(resid * 100).toFixed(3)}% de pixels rosados`);

  // paleta
  const colours = countColours(cand, 16);
  add("paleta", colours <= THRESHOLDS.maxColours ? "ok" : colours <= THRESHOLDS.maxColours * 1.5 ? "review" : "fail", `${colours} cores significativas (pack: 31–620; limite ${THRESHOLDS.maxColours})`);

  // movimento + silhueta, por animação
  const k = GH / H;
  for (const [r, anim] of ATLAS.rows.entries()) {
    const cs = motionSeries(cm[r], H);
    const gs = motionSeries(gm[r], GH);
    let sum = 0;
    let n = 0;
    for (let f = 0; f < ATLAS.cols; f += 1) {
      for (let s = 0; s < 4; s += 1) {
        sum += Math.abs(cs[f][s] - gs[f][s]);
        n += 1;
      }
    }
    const err = sum / n;
    add(`movimento:${anim}`, grade(err, THRESHOLDS.motion.ok, THRESHOLDS.motion.review), `erro médio ${(err * 100).toFixed(1)}% da altura`);

    let iouSum = 0;
    for (let f = 0; f < ATLAS.cols; f += 1) {
      const scaled = scaleAboutAnchor(cf[r][f], k, ATLAS.anchor.x, baselineFor(anim, f));
      iouSum += iou(scaled, gf[r][f]);
    }
    const mean = iouSum / ATLAS.cols;
    const t = THRESHOLDS.iou[anim];
    add(`silhueta:${anim}`, grade(mean, t.ok, t.review, false), `IoU médio ${mean.toFixed(2)} (aprova ≥ ${t.ok})`);
  }
  return finish(checks);
}

function finish(checks) {
  const status = checks.reduce((acc, c) => worst(acc, c.status), "ok");
  return { verdict: status === "ok" ? "approved" : status === "review" ? "review" : "redo", checks };
}

export const VERDICT_PT = { approved: "APROVADO", review: "REVISÃO VISUAL", redo: "REFAZER" };

export function formatReport(report) {
  const mark = { ok: "ok    ", review: "revisar", fail: "FALHA " };
  const lines = report.checks.map((c) => `  [${mark[c.status]}] ${c.name.padEnd(20)} ${c.detail}`);
  return `${lines.join("\n")}\n  → ${VERDICT_PT[report.verdict]}`;
}
