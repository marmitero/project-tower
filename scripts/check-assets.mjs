#!/usr/bin/env node
/**
 * Verificação de assets.
 *
 * §62 do Master-Prompt: "NUNCA entregar o produto final com quadrados,
 * círculos, emojis, personagens geométricos, UI de protótipo."
 *
 * Este é o guard que torna essa frase MECANICAMENTE verificável. Ele roda duas
 * checagens:
 *
 * 1. O pipeline de assets tem os arquivos obrigatórios.
 * 2. O código NÃO contém os placeholders que ele proíbe. Se alguém
 *    "resolver" a falta de arte desenhando um `<div>` colorido ou um
 *    emoji no lugar de um sprite, este script pega — mesmo que o
 *    manifesto esteja correto.
 *
 * No desenvolvimento, a ausência de arte é esperada e o script avisa. A
 * decisão de bloquear fica com `--strict`, usado antes de publicar.
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { statSync } from "node:fs";
import { join, relative, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const STRICT = process.argv.includes("--strict");

function isDir(dir) {
  try {
    return statSync(dir).isDirectory();
  } catch {
    return false;
  }
}

const SRC_DIRS = [join(ROOT, "apps"), join(ROOT, "packages")].filter(isDir);

const SKIP_DIRS = new Set(["node_modules", "dist", "build", ".git", "coverage", "public/assets"]);

/**
 * Padrões de placeholder PROIBIDOS em código de UI/render.
 *
 * A lista é específica, não uma regex genérica de "retângulo": o objetivo
 * é pegar o gesto exato de substituir arte por geometria, sem colocar um
 * linter no caminho de um `border-radius` legítimo.
 */
const PLACEHOLDER_PATTERNS = [
  // Só emojis DE VERDADE: aspas + símbolo. Um `⛔` solto num comentário é
  // marcação de pendência, não sprite — e é o símbolo mais usado do
  // código, então includê-lo aqui produziria falso positivo em toda linha
  // de documentação.
  { name: "emoji como sprite", re: /["'`][\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F2FF}]/gu },
  { name: "canvas fillText como sprite de personagem", re: /\.fillText\(\s*["'`]?[☀-➿]/gu },
  { name: "retângulo-colorido como sprite", re: /add\.rectangle\([^)]*(?:0x[0-9a-fA-F]{6})[^)]*\)[^;]*setFillStyle|graphics\.fillStyle\(\s*0x[0-9a-f]{6}\s*\)[^;]*fillRect/gu },
  { name: "data-URI SVG inline", re: /src\s*=\s*["']data:image\/svg\+xml/gu },
];

async function walk(dir, out = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) await walk(full, out);
    } else if ([".ts", ".tsx", ".js", ".jsx"].includes(extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

async function main() {
  const problems = [];
  const files = [];
  for (const dir of SRC_DIRS) files.push(...(await walk(dir)));

  for (const file of files) {
    const rel = relative(ROOT, file).split(sep).join("/");
    const lines = (await readFile(file, "utf8")).split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const { name, re } of PLACEHOLDER_PATTERNS) {
        re.lastIndex = 0;
        if (re.test(line)) problems.push({ file: rel, line: i + 1, kind: name });
      }
    }
  }

  // O pipeline de assets: quantos arquivos existem de fato em
  // assets/sprites/ (ver assets/SOURCES.md — a pasta não é versionada).
  const count = async (dir) => {
    const entries = await readdir(dir, { withFileTypes: true });
    let n = 0;
    for (const e of entries) {
      if (e.isDirectory()) n += await count(join(dir, e.name));
      else if (/\.(png|webp|jpg|jpeg)$/i.test(e.name)) n += 1;
    }
    return n;
  };

  let assetCount = 0;
  for (const dir of [join(ROOT, "assets", "sprites"), join(ROOT, "sprites")]) {
    try {
      await stat(dir);
      assetCount = await count(dir);
      if (assetCount > 0) break;
    } catch {
      // tenta o próximo caminho
    }
  }

  if (problems.length > 0) {
    console.error("[assets] FALHA — placeholders proibidos em código (§62):");
    for (const p of problems) console.error(`  ${p.file}:${p.line} — ${p.kind}`);
    process.exit(1);
  }

  console.log(`[assets] ${files.length} fontes verificadas, 0 placeholders proibidos`);
  console.log(`[assets] ${assetCount} imagens em assets/sprites/`);

  if (assetCount === 0) {
    const msg = "[assets] Nenhuma imagem processada. O jogo NÃO pode ser distribuído assim (§62).";
    if (STRICT) {
      console.error(msg);
      process.exit(1);
    }
    console.warn(msg);
    console.warn("[assets] Recupere o pack com o comando de `assets/SOURCES.md`, depois rode `node scripts/build-assets.mjs`.");
  }
}

main().catch((error) => {
  console.error("[assets] erro:", error);
  process.exit(1);
});
