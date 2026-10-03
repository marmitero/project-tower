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
import { REQUIRED, IMAGE_EXT, AUDIO_EXT } from "./build-assets.mjs";
import { auditGenerated } from "../tools/art/audit.mjs";

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

const SKIP_DIRS = new Set(["node_modules", "dist", "build", "preview", ".git", "coverage", "public/assets"]);

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

  // Catálogo REQUIRED: os IDs que o jogo pede de verdade, contra o
  // manifesto efetivo (pack + arte gerada). Um guard que só conta arquivos
  // não protege contra o pack inteiro existir com os nomes errados.
  const ids = new Set();
  const collectIds = async (dir, stripExt) => {
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) await collectIds(full, stripExt);
      else if (IMAGE_EXT.has(extname(e.name).toLowerCase()) || AUDIO_EXT.has(extname(e.name).toLowerCase())) {
        ids.add(stripExt(full));
      }
    }
  };
  await collectIds(join(ROOT, "assets", "sprites"), (p) => relative(join(ROOT, "assets", "sprites"), p).split(sep).join("/").replace(/\.(png|webp|jpe?g|wav|ogg|mp3|opus|m4a)$/i, "").replace(/\.(png|webp|jpe?g)$/i, ""));
  await collectIds(join(ROOT, "assets", "generated"), (p) => relative(join(ROOT, "assets", "generated"), p).split(sep).join("/").replace(/\.(png|webp|jpe?g|wav|ogg|mp3|opus|m4a)$/i, ""));

  const missing = REQUIRED.filter((id) => !ids.has(id));
  if (missing.length > 0) {
    console.error("[assets] FALHA — IDs obrigatórios ausentes (§62):");
    for (const id of missing) console.error(`  - ${id}`);
    process.exit(1);
  }

  // Relatório de extração de UI: nenhuma peça rejeitada pode ter sido
  // deixada para trás em assets/generated/ui.
  try {
    const report = JSON.parse(await readFile(join(ROOT, "assets", "generated", "ui", "extraction-report.json"), "utf8"));
    const bad = (report.pieces || []).filter((p) => p.status !== "ok");
    if (bad.length > 0) {
      console.error("[assets] FALHA — peças de UI não aprovadas no diretório de saída (§62):");
      for (const p of bad) console.error(`  - ${p.id}: ${p.status}`);
      process.exit(1);
    }
    console.log(`[assets] UI gerada: ${report.pieces.length} peças aprovadas, ${report.rejected.length} regiões descartadas por texto`);
  } catch {
    console.warn("[assets] sem extraction-report.json — rode `node scripts/extract-ui.mjs`.");
    if (STRICT) process.exit(1);
  }

  // Arte gerada pela fase de estilização (ADR-032): formato, orçamentos e contador de gerações.
  const art = await auditGenerated(join(ROOT, "assets", "generated"));
  if (art.problems.length > 0) {
    console.error("[assets] FALHA — arte gerada fora da especificação (docs/ART_PIPELINE.md):");
    for (const p of art.problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log(`[assets] arte gerada: ${art.stats.atlases} atlas, ${art.stats.arenaKits} kits de arena, ${(art.stats.artBytes / 1024).toFixed(0)} KB (orçamento 25 MB)`);

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
