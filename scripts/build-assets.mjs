#!/usr/bin/env node
/**
 * Pipeline de assets.
 *
 * §62 — o produto final não pode ser entregue com quadrados, círculos,
 * emojis ou UI de protótipo. Este script é o que garante isso de forma
 * MECÂNICA: ele varre o diretório de assets, gera o manifesto
 * `id -> caminho` e falha se o catálogo exigir algo que não existe.
 *
 * Por que falhar e não avisar: um aviso no log some na primeira semana.
 * Um `process.exit(1)` no CI impede que o build chegue perto de um
 * jogador.
 *
 * Uso:
 *   node scripts/build-assets.mjs [--src sprites] [--out apps/game-web/public/assets] [--check]
 */

import { readdir, mkdir, writeFile } from "node:fs/promises";
import { join, relative, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");

function parseArgs(argv) {
  const args = { src: "sprites", out: "apps/game-web/public/assets", check: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--src") args.src = argv[++i];
    else if (argv[i] === "--out") args.out = argv[++i];
    else if (argv[i] === "--check") args.check = true;
  }
  return args;
}

const IMAGE_EXT = new Set([".png", ".webp", ".jpg", ".jpeg"]);

/** Lista recursivamente arquivos de imagem. */
async function walkImages(dir, base = dir) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walkImages(full, base)));
    else if (IMAGE_EXT.has(extname(entry.name).toLowerCase())) out.push(full);
  }
  return out;
}

/** `a/b/c.png` -> `a/b/c`. Frames (`..._0.png`) ficam sob o id do sheet. */
function idFor(absPath, srcDir) {
  const rel = relative(srcDir, absPath).split(sep).join("/");
  return rel.replace(IMAGE_EXT_RE, "");
}

const IMAGE_EXT_RE = /\.(png|webp|jpe?g)$/i;

/** Ids que o jogo exige. Espelha `requiredAssetIds()` em src/render/assets.ts. */
const REQUIRED = [
  "ui/panel",
  "ui/button",
  "ui/hud_frame",
  "vfx/slash",
  "vfx/impact",
];

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const srcDir = join(ROOT, args.src);
  const outDir = join(ROOT, args.out);

  const files = await walkImages(srcDir);
  const entries = {};
  for (const file of files) {
    const id = idFor(file, srcDir);
    entries[id] = `${args.out.split("/").pop()}/${relative(outDir, file).split(sep).join("/")}`;
  }

  const missing = REQUIRED.filter((id) => entries[id] === undefined);

  const manifest = {
    version: 1,
    generatedFrom: args.src,
    count: Object.keys(entries).length,
    entries,
  };

  if (!args.check) {
    await mkdir(outDir, { recursive: true });
    await writeFile(join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  }

  console.log(`[assets] ${Object.keys(entries).length} arquivos em ${args.src}`);

  if (missing.length > 0) {
    console.error("");
    console.error("[assets] FALHA — assets obrigatórios ausentes (§62):");
    for (const id of missing) console.error(`  - ${id}`);
    console.error("");
    console.error("[assets] O produto final NÃO pode usar quadrados, círculos ou emojis.");
    console.error("[assets] Rode o pipeline de arte antes de buildar para distribuição.");
    process.exit(1);
  }

  console.log("[assets] manifesto OK");
}

main().catch((error) => {
  console.error("[assets] erro:", error);
  process.exit(1);
});

export { walkImages, idFor, REQUIRED, IMAGE_EXT };
