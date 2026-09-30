/**
 * Arquitetura — as garantias que a documentação promete.
 *
 * §63/§64: "A lógica do jogo não deve depender diretamente de componentes
 * React." §64: "O Battle Engine deve ser independente da apresentação."
 *
 * Essas regras não podem ser uma frase em README que se desfaz no primeiro
 * `import React from "react"` dentro do engine. Este teste lê o CÓDIGO e
 * falha se a dependência aparecer.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "dist" || entry === "__tests__") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith(".ts") || full.endsWith(".tsx")) out.push(full);
  }
  return out;
}

function read(path: string): string {
  return readFileSync(path, "utf8");
}

function sourcesOf(pkg: string, sub = "src"): string[] {
  return walk(join(ROOT, "packages", pkg, sub));
}

/** Linhas de código real: sem comentários, sem strings multi-linha. */
function codeLines(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
}

describe("INV-11 — @tia/engine é puro", () => {
  const files = sourcesOf("engine").filter((f) => !f.includes("__tests__"));

  it("o engine tem fontes", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(["react", "react-dom", "phaser"])("não importa %s", (mod) => {
    for (const file of files) {
      expect(codeLines(read(file))).not.toMatch(new RegExp(`from ["']${mod}`));
    }
  });

  it("não usa DOM", () => {
    for (const file of files) {
      const code = codeLines(read(file));
      expect(code).not.toMatch(/\bdocument\./);
      expect(code).not.toMatch(/\bwindow\./);
      expect(code).not.toMatch(/\bnavigator\./);
    }
  });

  it("não usa timers", () => {
    for (const file of files) {
      const code = codeLines(read(file));
      expect(code).not.toMatch(/setTimeout|setInterval|requestAnimationFrame/);
    }
  });

  it("não usa Math.random — o combate precisa ser reprodutível (§64)", () => {
    for (const file of files) {
      expect(codeLines(read(file))).not.toMatch(/Math\.random/);
    }
  });

  it("não usa Date.now — o tempo vem injetado", () => {
    for (const file of files) {
      expect(codeLines(read(file))).not.toMatch(/Date\.now|new Date\(/);
    }
  });

  it("não depende de @tia/game-core (a dependência é de baixo para cima)", () => {
    for (const file of files) {
      expect(codeLines(read(file))).not.toMatch(/@tia\/game-core/);
    }
  });

  it("não depende de @tia/ui nem @tia/game-web", () => {
    for (const file of files) {
      const code = codeLines(read(file));
      expect(code).not.toMatch(/@tia\/ui/);
      expect(code).not.toMatch(/@tia\/game-web/);
    }
  });

  it("importa SOMENTE config, contracts e arquivos locais", () => {
    for (const file of files) {
      const code = codeLines(read(file));
      const externals = [...code.matchAll(/from ["']([^"']+)["']/g)]
        .map((m) => m[1]!)
        .filter((p) => !p.startsWith("."));
      for (const spec of externals) {
        expect(["@tia/config", "@tia/contracts"]).toContain(spec);
      }
    }
  });
});

describe("INV-12 — @tia/game-core não depende de apresentação", () => {
  const files = sourcesOf("game-core").filter((f) => !f.includes("__tests__"));

  it.each(["react", "react-dom", "phaser"])("não importa %s", (mod) => {
    for (const file of files) {
      expect(codeLines(read(file))).not.toMatch(new RegExp(`from ["']${mod}`));
    }
  });

  it("não usa Math.random", () => {
    for (const file of files) {
      expect(codeLines(read(file))).not.toMatch(/Math\.random/);
    }
  });

  it("não usa timers", () => {
    for (const file of files) {
      expect(codeLines(read(file))).not.toMatch(/setTimeout|setInterval|requestAnimationFrame/);
    }
  });

  it("não toca em document/window diretamente — só via KeyValueStorage injetada", () => {
    for (const file of files) {
      const code = codeLines(read(file));
      // `globalThis.localStorage` é permitido: é a degradação do adapter.
      // `document.` e `window.` não são.
      expect(code).not.toMatch(/\bdocument\./);
      expect(code).not.toMatch(/\bwindow\./);
    }
  });

  it("importa apenas config, contracts, engine e arquivos locais", () => {
    for (const file of files) {
      const code = codeLines(read(file));
      const externals = [...code.matchAll(/from ["']([^"']+)["']/g)]
        .map((m) => m[1]!)
        .filter((p) => !p.startsWith("."));
      for (const spec of externals) {
        expect(["@tia/config", "@tia/contracts", "@tia/engine"]).toContain(spec);
      }
    }
  });
});

describe("INV-13 — @tia/config é dado, não lógica", () => {
  const files = sourcesOf("config").filter((f) => !f.includes("__tests__"));

  it("não importa nenhum outro pacote interno", () => {
    for (const file of files) {
      const code = codeLines(read(file));
      const externals = [...code.matchAll(/from ["']([^"']+)["']/g)]
        .map((m) => m[1]!)
        .filter((p) => !p.startsWith("."));
      for (const spec of externals) {
        expect(spec.startsWith("@tia/")).toBe(false);
      }
    }
  });

  it("não importa React nem Phaser", () => {
    for (const file of files) {
      const code = codeLines(read(file));
      expect(code).not.toMatch(/from ["'](react|phaser)/);
    }
  });
});

describe("INV-14 — barrel sem ciclo", () => {
  it("index.ts de cada pacote só reexporta; não define lógica", () => {
    for (const pkg of ["config", "contracts", "engine", "game-core"]) {
      const indexPath = join(ROOT, "packages", pkg, "src", "index.ts");
      const code = codeLines(read(indexPath));
      // Um barrel que implementa alguma coisa força os testes a importar o
      // barrel e mascara dependências circulares.
      expect(code).not.toMatch(/^(?!export)\s*(function|class|const|let)\s/m);
    }
  });
});

describe("INV-15 — a dependência aponta para baixo", () => {
  it("@tia/config não depende de nada interno", () => {
    const files = sourcesOf("config");
    for (const file of files) {
      expect(codeLines(read(file))).not.toMatch(/@tia\/(contracts|engine|game-core|ui)/);
    }
  });

  it("@tia/contracts só depende de config e de si mesmo", () => {
    const files = sourcesOf("contracts");
    for (const file of files) {
      const code = codeLines(read(file));
      expect(code).not.toMatch(/@tia\/(engine|game-core|ui)/);
    }
  });

  it("@tia/engine não sobe para game-core nem ui", () => {
    const files = sourcesOf("engine");
    for (const file of files) {
      const code = codeLines(read(file));
      expect(code).not.toMatch(/@tia\/(game-core|ui)/);
    }
  });
});

describe("INV-16 — nenhum segredo no repositório", () => {
  it("não há service_role key nem token privado em fontes", () => {
    const files = [
      ...walk(join(ROOT, "packages")),
      ...(existsDir(join(ROOT, "apps")) ? walk(join(ROOT, "apps")) : []),
      ...(existsDir(join(ROOT, "scripts")) ? walk(join(ROOT, "scripts")) : []),
    ];
    for (const file of files) {
      const code = read(file);
      expect(code).not.toMatch(/service_role\s*[:=]\s*["'][A-Za-z0-9._-]{20,}/);
      expect(code).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/);
      expect(code).not.toMatch(/-----BEGIN [A-Z ]*PRIVATE KEY-----/);
    }
  });

  it("nenhuma variável de ambiente com valor default escondido", () => {
    const files = walk(join(ROOT, "packages"));
    for (const file of files) {
      const code = codeLines(read(file));
      // §73 — segredo no cliente é segredo comprometido. Um `?? "valor"`
      // num env var é o começo desse caminho.
      expect(code).not.toMatch(/process\.env\.[A-Z_]+\s*\?\?\s*["'][^"']+["']/);
    }
  });
});

describe("INV-17 — Debug Mode é exclusivo de desenvolvimento", () => {
  it("nenhum pacote de produção referencia DEBUG_MODE sem guarda", () => {
    const dirs = [join(ROOT, "packages", "game-core", "src"), join(ROOT, "packages", "engine", "src")];
    for (const dir of dirs) {
      for (const file of walk(dir)) {
        const code = codeLines(read(file));
        if (code.includes("DEBUG_MODE") || code.includes("debugMode")) {
          expect(code).toMatch(/import\.meta\.env|process\.env|NODE_ENV/);
        }
      }
    }
  });
});

function existsDir(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

describe("INV-18 — o Master-Prompt é a autoridade", () => {
  it("todo arquivo de código de balanceamento cita a seção de origem", () => {
    // Não é possível auditar um número que não diz de onde veio. Os
    // arquivos com números de balanceamento precisam citar o § ou ⛔ P-.
    const files = [
      ...sourcesOf("config"),
      ...sourcesOf("game-core"),
    ].filter((f) => !f.includes("__tests__"));

    for (const file of files) {
      const rel = relative(ROOT, file);
      const code = read(file);
      // Arquivos puramente estruturais (ids, barrel) não têm balanceamento.
      if (/ids\.ts$|index\.ts$/.test(rel)) continue;
      expect(code, `arquivo sem rastreabilidade: ${rel}`).toMatch(/§|⛔ P-|ADR-/);
    }
  });
});
