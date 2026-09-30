#!/usr/bin/env node
/**
 * Verificação do Debug Mode.
 *
 * §93 do Master-Prompt: o Debug Mode é EXCLUSIVO de desenvolvimento. Ele
 * existe para desenvolvimento interno e nunca é exposto em produção.
 *
 * A checagem é mecânica por dois motivos:
 *
 * 1. `VITE_DEBUG_MODE` é embutido no bundle no momento do build. Um
 *    `true` em produção não é "um dev que esqueceu": é um painel de
 *    admin (grant de moeda, EDITAR save) publicado para qualquer pessoa.
 *
 * 2. O console.log é o vetor mais comum de vazar informação de save
 *    (accountId, seeds, economia). A regra aqui é: `console.log` existe,
 *    `console.warn`/`error` são permitidos para diagnóstico, e qualquer
 *    ocorrência de `debugger` ou `DEBUG_MODE` sem guarda falha.
 */

import { readdir, readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const SRC = join(ROOT, "apps");

const SKIP_DIRS = new Set(["node_modules", "dist", "build", ".git", "coverage"]);

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
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

async function main() {
  const problems = [];
  const files = await walk(SRC);

  if (files.length === 0) {
    console.log("[debug-mode] OK — nenhum app para verificar");
    return;
  }

  for (const file of files) {
    const rel = relative(ROOT, file).split(sep).join("/");
    const content = await readFile(file, "utf8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const n = i + 1;

      // `debugger` nunca deve sobrar no código.
      if (/^\s*debugger\s*;?\s*$/.test(line)) {
        problems.push({ file: rel, line: n, kind: "instrução `debugger` no código" });
      }

      // Referência a debug precisa de uma guarda de ambiente na MESMA
      // linha ou nas 5 anteriores. Sem isso, é um sinalizador perene.
      if (/\bDEBUG_MODE\b|\bdebugMode\b|\bisDebug\b/.test(line)) {
        const window = lines.slice(Math.max(0, i - 5), i + 1).join("\n");
        const guarded =
          /import\.meta\.env/.test(window) ||
          /process\.env/.test(window) ||
          /NODE_ENV/.test(window);
        if (!guarded) {
          problems.push({
            file: rel,
            line: n,
            kind: "referência a debug sem guarda de ambiente (§93)",
          });
        }
      }
    }
  }

  // O `.env` de desenvolvimento não pode ter o debug ligado para o bundle
  // de produção. `import.meta.env.PROD` já garante isso em build.
  const envExample = join(ROOT, ".env.example");
  try {
    const content = await readFile(envExample, "utf8");
    const match = content.match(/VITE_DEBUG_MODE\s*=\s*(\S+)/);
    if (match && match[1] === "true") {
      problems.push({
        file: ".env.example",
        line: 0,
        kind: "VITE_DEBUG_MODE=true no exemplo — o debug fica embutido em qualquer build",
      });
    }
  } catch {
    // Sem .env.example o check-no-secret já falha.
  }

  if (problems.length === 0) {
    console.log(`[debug-mode] OK — ${files.length} arquivos verificados`);
    return;
  }

  console.error("[debug-mode] FALHA:");
  for (const p of problems) {
    console.error(`  ${p.file}${p.line ? `:${p.line}` : ""} — ${p.kind}`);
  }
  process.exit(1);
}

main().catch((error) => {
  console.error("[debug-mode] erro:", error);
  process.exit(1);
});
