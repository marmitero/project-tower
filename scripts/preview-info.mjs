#!/usr/bin/env node
/**
 * Carimbo do bundle versionado (`apps/game-web/preview/`).
 *
 * O jogador que baixa o zip do GitHub NÃO roda build: ele joga o bundle commitado. Um bundle velho
 * (código mudou, bundle não) é o jeito mais traiçoeiro de entregar "o jogo que eu testei não é o
 * jogo que você baixou". Por isso `npm run build:preview` grava `preview/BUILD_INFO.json` com o
 * hash das fontes, e `npm run check` (check-preview) falha se o hash atual não bate.
 *
 * O hash normaliza CRLF→LF (Windows/Linux dão o mesmo hash) e ignora testes e documentação.
 *
 * Uso: `node scripts/preview-info.mjs write` | `node scripts/preview-info.mjs print`
 */
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
export const PREVIEW_DIR = join(ROOT, "apps", "game-web", "preview");
export const INFO_FILE = join(PREVIEW_DIR, "BUILD_INFO.json");

/** O que entra no bundle: fontes dos pacotes e do app, o index.html e a config do Vite. */
const SOURCE_ROOTS = ["packages", join("apps", "game-web", "src")];
const SOURCE_FILES = [join("apps", "game-web", "index.html"), join("apps", "game-web", "vite.config.ts")];
const SKIP_DIRS = new Set(["node_modules", "dist", "__tests__", "tests", ".git"]);
const SOURCE_EXT = /\.(ts|tsx|js|mjs|css|html|json)$/;
const IS_TEST = /\.test\.tsx?$/;

async function walk(dir, out) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) await walk(full, out);
    } else if (SOURCE_EXT.test(e.name) && !IS_TEST.test(e.name) && e.name !== "package.json" && e.name !== "tsconfig.json") {
      out.push(full);
    }
  }
}

export async function computeSourceHash() {
  const files = [];
  for (const r of SOURCE_ROOTS) await walk(join(ROOT, r), files);
  for (const f of SOURCE_FILES) files.push(join(ROOT, f));
  const rel = files.map((f) => relative(ROOT, f).split(sep).join("/")).sort();
  const hash = createHash("sha256");
  for (const r of rel) {
    const text = (await readFile(join(ROOT, r), "utf8")).replace(/\r\n/g, "\n");
    hash.update(`${r}\0${text}\0`);
  }
  return { sourceHash: hash.digest("hex"), fileCount: rel.length };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const mode = process.argv[2] ?? "print";
  const { sourceHash, fileCount } = await computeSourceHash();
  if (mode === "write") {
    const info = {
      note: "Gerado por `npm run build:preview`. Não edite à mão: `npm run check` compara este hash com as fontes.",
      sourceHash,
      sourceFiles: fileCount,
      debugMode: false,
    };
    await writeFile(INFO_FILE, JSON.stringify(info, null, 2) + "\n");
    console.log(`[preview-info] BUILD_INFO.json gravado (${fileCount} fontes, ${sourceHash.slice(0, 12)}…)`);
  } else {
    console.log(sourceHash);
  }
}
