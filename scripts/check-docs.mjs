#!/usr/bin/env node
/**
 * Validador de integridade da documentação.
 *
 * Verifica regras que, se violadas, quebram o ciclo de trabalho do projeto:
 *  1. Nenhum caractere fora do conjunto esperado (pega corrupção de encoding).
 *  2. Todo documento listado em docs/README.md existe.
 *  3. Todo link relativo entre documentos aponta para arquivo existente.
 *  4. Todo PENDING tem uma âncora correspondente em PENDING_RULES.md.
 *
 * Uso: node scripts/check-docs.mjs
 */
import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DOCS = join(ROOT, "docs");

/** Faixas de code point permitidas além do latin básico.
 *  CJK, kana, hangul e formas de largura completa ficam de fora de propósito:
 *  são exatamente o tipo de corrupção que este validador existe para pegar. */
const ALLOWED_RANGES = [
  [0x2010, 0x201f], // hifenização e aspas tipográficas
  [0x2190, 0x21ff], // setas
  [0x2500, 0x257f], // caixas de desenho
  [0x2600, 0x27bf], // símbolos e dingbats (✅ ❌ ⚠ ⛔ 🔴 🟡 🟢 ⚪)
  [0x2b00, 0x2bff], // símbolos adicionais (⭐ ✨)
  [0xfe0f, 0xfe0f], // seletor de variação
  [0x1f300, 0x1faff], // emoji pictográficos (👑 🗡 💬 🚫)
];

const isAllowed = (cp) =>
  (cp >= 0x20 && cp <= 0x2e7f) || // latin, acentuação, pontuação
  ALLOWED_RANGES.some(([lo, hi]) => cp >= lo && cp <= hi);

const errors = [];
const warnings = [];

// --- 1. Varredura de caracteres ------------------------------------------------
const mdFiles = existsSync(DOCS)
  ? (await readdir(DOCS)).filter((f) => f.endsWith(".md"))
  : [];
const allDocs = ["AI_STATE.md", "README.md", ...mdFiles.map((f) => `docs/${f}`)];

for (const rel of allDocs) {
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) {
    errors.push(`[ausente] ${rel}`);
    continue;
  }
  const lines = (await readFile(abs, "utf8")).split("\n");
  lines.forEach((line, i) => {
    for (const ch of line) {
      const cp = ch.codePointAt(0);
      if (!isAllowed(cp)) {
        errors.push(
          `[encoding] ${rel}:${i + 1} caractere U+${cp.toString(16).toUpperCase().padStart(4, "0")} "${ch}"`,
        );
        return;
      }
    }
  });
}

// --- 2. Índice completo --------------------------------------------------------
const index = await readFile(join(DOCS, "README.md"), "utf8");
const indexDir = dirname(join(DOCS, "README.md"));
for (const m of index.matchAll(/\]\((?!https?:)([^)#]+\.md)(?:#[^)]*)?\)/g)) {
  const abs = resolve(indexDir, m[1]);
  if (!existsSync(abs)) errors.push(`[link] docs/README.md -> ${m[1]} não existe`);
}

// --- 3. Links relativos internos ----------------------------------------------
for (const rel of allDocs) {
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) continue;
  const text = await readFile(abs, "utf8");
  for (const m of text.matchAll(/\]\((?!https?:|#|mailto:)([^)#\s]+?)(?:#[^)]*)?\)/g)) {
    const target = m[1];
    if (target.startsWith("/")) continue;
    const resolved = resolve(dirname(abs), target);
    if (!existsSync(resolved)) {
      errors.push(`[link] ${rel} -> ${target} não existe`);
    }
  }
}

// --- 4. Âncoras de PENDING -----------------------------------------------------
const pendingFile = join(DOCS, "PENDING_RULES.md");
if (!existsSync(pendingFile)) {
  errors.push("[pendente] docs/PENDING_RULES.md não existe");
} else {
  const pending = await readFile(pendingFile, "utf8");
  const declared = new Set(
    [...pending.matchAll(/^###\s+(P-\d{3})\s/gm)].map((m) => m[1].toLowerCase()),
  );
  for (const rel of allDocs) {
    const abs = join(ROOT, rel);
    if (!existsSync(abs)) continue;
    const text = await readFile(abs, "utf8");
    for (const m of text.matchAll(/PENDING_RULES\.md#(p-\d{3})/gi)) {
      if (!declared.has(m[1].toLowerCase())) {
        errors.push(`[pendente] ${rel} referencia âncora inexistente: #${m[1]}`);
      }
    }
    // PENDINGS inline (fora de tabela) exigem um ID rastreável
    for (const m of text.matchAll(/\*\*(P-\d{3})\*\*/g)) {
      if (!declared.has(m[1].toLowerCase())) {
        errors.push(`[pendente] ${rel} cita ${m[1]} sem definição em PENDING_RULES.md`);
      }
    }
  }
  for (const id of declared) {
    const uses = allDocs.filter((rel) => {
      const abs = join(ROOT, rel);
      if (!existsSync(abs)) return false;
      return readFile(abs, "utf8").then((t) => t.toLowerCase().includes(id));
    });
    if (uses.length <= 1) warnings.push(`[pendente] ${id} declarado mas nunca referenciado`);
  }
}

// --- Relatório -----------------------------------------------------------------
for (const w of warnings) console.log(`AVISO  ${w}`);
if (errors.length === 0) {
  console.log(`OK  ${allDocs.length} documentos verificados, 0 erros.`);
  process.exit(0);
}
for (const e of errors) console.log(`ERRO  ${e}`);
console.log(`\n${errors.length} erro(s) na documentação.`);
process.exit(1);
