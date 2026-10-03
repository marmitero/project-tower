/**
 * Auditoria da arte GERADA (`assets/generated`) — roda no `check:assets` (docs/ART_PIPELINE.md §6.4, §12).
 *  - atlas de personagem (enemies/, heroes/): 1024×1280, ≤ 400 KB, com `.atlas.json` ita-atlas-v1;
 *  - kits de arena (arenas/<kit>/): ladrilhos 128×128, kit ≤ 250 KB;
 *  - total da arte gerada (sem áudio e sem a UI extraída do pack) ≤ 25 MB;
 *  - procedência: nenhum lote com mais de 10 gerações.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import sharp from "sharp";
import { ARENA, ATLAS, BUDGET } from "./spec.mjs";
import { loadProvenance, provenanceErrors } from "./provenance.mjs";

function* walk(dir) {
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else yield full;
  }
}

const isPng = (f) => f.toLowerCase().endsWith(".png");
const norm = (p) => p.split("\\").join("/");

/** @returns {Promise<{problems:string[], stats:{atlases:number, arenaKits:number, artBytes:number}}>} */
export async function auditGenerated(generatedDir) {
  const problems = [];
  const stats = { atlases: 0, arenaKits: 0, artBytes: 0 };

  const COUNTED = ["enemies/", "heroes/", "arenas/", "login/", "portraits/king/", "portraits/heroes/", "ui/gba/"];
  for (const file of walk(generatedDir)) {
    const rel = norm(relative(generatedDir, file));
    if (isPng(file) && COUNTED.some((p) => rel.startsWith(p))) stats.artBytes += statSync(file).size;
  }

  // atlas de personagem
  for (const top of ["enemies", "heroes"]) {
    for (const file of walk(join(generatedDir, top))) {
      if (!isPng(file)) continue;
      const rel = norm(relative(generatedDir, file));
      stats.atlases += 1;
      const meta = await sharp(file).metadata();
      if (meta.width !== ATLAS.cols * ATLAS.cell || meta.height !== ATLAS.rows.length * ATLAS.cell) {
        problems.push(`${rel}: ${meta.width}×${meta.height}, esperado ${ATLAS.cols * ATLAS.cell}×${ATLAS.rows.length * ATLAS.cell} (ita-atlas-v1)`);
      }
      const size = statSync(file).size;
      if (size > BUDGET.atlasBytes) problems.push(`${rel}: ${size} bytes acima do orçamento de ${BUDGET.atlasBytes}`);
      const metaPath = file.replace(/\.png$/i, ".atlas.json");
      if (!existsSync(metaPath)) problems.push(`${rel}: falta ${rel.replace(/\.png$/i, ".atlas.json")}`);
      else {
        try {
          const json = JSON.parse(readFileSync(metaPath, "utf8"));
          if (json.format !== ATLAS.format) problems.push(`${rel}: .atlas.json com format "${json.format}"`);
        } catch {
          problems.push(`${rel}: .atlas.json ilegível`);
        }
      }
    }
  }

  // kits de arena
  const arenasDir = join(generatedDir, "arenas");
  if (existsSync(arenasDir)) {
    for (const kit of readdirSync(arenasDir, { withFileTypes: true }).filter((e) => e.isDirectory())) {
      stats.arenaKits += 1;
      let bytes = 0;
      for (const file of walk(join(arenasDir, kit.name))) {
        if (!isPng(file)) continue;
        bytes += statSync(file).size;
        const meta = await sharp(file).metadata();
        if (meta.width !== ARENA.tile || meta.height !== ARENA.tile) problems.push(`arenas/${kit.name}/${norm(relative(join(arenasDir, kit.name), file))}: ${meta.width}×${meta.height}, esperado ${ARENA.tile}×${ARENA.tile}`);
      }
      if (bytes > BUDGET.arenaKitBytes) problems.push(`arenas/${kit.name}: ${bytes} bytes acima do orçamento de ${BUDGET.arenaKitBytes}`);
    }
  }

  if (stats.artBytes > BUDGET.artTotalBytes) problems.push(`arte gerada soma ${stats.artBytes} bytes, acima de ${BUDGET.artTotalBytes}`);

  // procedência
  problems.push(...provenanceErrors(loadProvenance(join(generatedDir, "provenance.json"))));
  return { problems, stats };
}
