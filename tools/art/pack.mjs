/**
 * Empacotamento: paleta fixa + PNG indexado + orçamentos de bytes (docs/ART_PIPELINE.md §6.4).
 */
import { statSync } from "node:fs";
import { BUDGET, PACK } from "./spec.mjs";
import { writePng } from "./image.mjs";
import { quantize } from "./quantize.mjs";

/** Quantiza para ≤ `colours` cores (sem dithering) e grava PNG indexado; devolve os bytes. */
export async function packPng(raw, outPath, colours = PACK.colours) {
  const { raw: q } = quantize(raw, colours);
  await writePng(q, outPath, { palette: true, colours: 256 });
  return statSync(outPath).size;
}

export function overBudget(path, kind) {
  const limit = kind === "arena" ? BUDGET.arenaKitBytes : BUDGET.atlasBytes;
  const size = statSync(path).size;
  return { size, limit, over: size > limit };
}
