#!/usr/bin/env node
/**
 * Verificação de segredos.
 *
 * §91 do Master-Prompt: "NUNCA versionar secrets, service-role keys ou
 * tokens privados." §73: um segredo no cliente é um segredo comprometido.
 *
 * Este script varre o repositório procurando padrões que NUNCA devem
 * aparecer em arquivo versionado, e falha se `.env` existir sem o exemplo.
 *
 * Exit code 1 interrompe o CI. Um aviso no log não impede ninguém de
 * commitar uma service-role key.
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "out",
  "coverage",
  ".next",
  ".cache",
  ".arena",
]);

const TEXT_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".md", ".yml", ".yaml", ".sh", ".env"]);

/** Padrões que indicam credencial real. */
const PATTERNS = [
  { name: "service_role key", re: /service_role["']?\s*[:=]\s*["'][A-Za-z0-9._-]{20,}["']/gi },
  { name: "JWT (anon/service)", re: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/g },
  { name: "chave privada PEM", re: /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/g },
  { name: "senha hardcoded", re: /(?:password|senha|secret)\s*[:=]\s*["'][^"'$\s]{8,}["']/gi },
  { name: "Supabase service key com valor", re: /SUPABASE_SERVICE_ROLE_KEY\s*=\s*["'][^"']{20,}["']/g },
  { name: "Google API key", re: /AIza[0-9A-Za-z_-]{35}/g },
];

/** Valoresobviously-provisórios que não devem disparar alarme. */
const FALSE_POSITIVE = [
  /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0[A-Za-z0-9_-]{10,}/,
  /-----BEGIN (?:EXAMPLE|NOTES|PUBLIC KEY)-----/,
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
    } else {
      out.push(full);
    }
  }
  return out;
}

function isFalsePositive(line) {
  return FALSE_POSITIVE.some((re) => re.test(line));
}

async function main() {
  const files = await walk(ROOT);
  const problems = [];

  for (const file of files) {
    const rel = relative(ROOT, file).split(sep).join("/");

    // `.env` e afins não devem ser versionados — só o `.example`.
    if (/^\.env(\.|$)/.test(rel) && !rel.endsWith(".example") && !rel.endsWith(".example.md")) {
      problems.push({ file: rel, line: 0, kind: "arquivo .env versionado (use .env.example)" });
      continue;
    }

    if (!TEXT_EXT.has(extname(file)) && !rel.includes(".env")) continue;

    let content;
    try {
      content = await readFile(file, "utf8");
    } catch {
      continue;
    }
    if (content.includes("node_modules")) continue;

    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (isFalsePositive(line)) continue;
      for (const { name, re } of PATTERNS) {
        re.lastIndex = 0;
        if (re.test(line)) {
          problems.push({ file: rel, line: i + 1, kind: name });
        }
      }
    }
  }

  // O exemplo precisa existir: sem ele, a próxima pessoa não sabe o que
  // preencher e improvisa um `.env` com o valor real.
  const envExample = join(ROOT, ".env.example");
  let hasExample = true;
  try {
    await stat(envExample);
  } catch {
    hasExample = false;
  }

  if (!hasExample) {
    problems.push({ file: ".env.example", line: 0, kind: "ausente — documente as variáveis de ambiente (§91)" });
  }

  if (problems.length === 0) {
    console.log(`[no-secret] OK — ${files.length} arquivos verificados, 0 segredos`);
    return;
  }

  console.error("[no-secret] FALHA — possíveis segredos versionados:");
  for (const p of problems) {
    console.error(`  ${p.file}${p.line ? `:${p.line}` : ""} — ${p.kind}`);
  }
  process.exit(1);
}

main().catch((error) => {
  console.error("[no-secret] erro:", error);
  process.exit(1);
});
