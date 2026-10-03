/**
 * A matriz `docs/MVP_ACCEPTANCE.md` não pode mentir: todo item do §78 e todo passo do §118 está
 * listado, e todo arquivo citado em crase existe no repositório.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "..", "..");
const doc = readFileSync(resolve(ROOT, "docs", "MVP_ACCEPTANCE.md"), "utf8");

const section = (title: string) => {
  const start = doc.indexOf(title);
  const next = doc.indexOf("\n## ", start + 1);
  return doc.slice(start, next === -1 ? undefined : next);
};
const rows = (text: string) => text.split("\n").filter((l) => /^\| \d+ \|/.test(l));

describe("docs/MVP_ACCEPTANCE.md", () => {
  it("lista os 22 itens do §78 e os 20 passos do §118", () => {
    expect(rows(section("## 1. §78"))).toHaveLength(22);
    expect(rows(section("## 2. §118"))).toHaveLength(20);
  });

  it("todo arquivo citado existe", () => {
    const cited = [...doc.matchAll(/`([\w./-]+\.(?:ts|tsx|mjs|md|bat|json))`/g)].map((m) => m[1]!);
    expect(cited.length).toBeGreaterThan(30);
    const missing = [...new Set(cited)].filter((p) => !existsSync(resolve(ROOT, p)));
    expect(missing).toEqual([]);
  });

  it("nenhum item fica sem evidência (✅/🔶 + pelo menos um arquivo)", () => {
    for (const r of [...rows(section("## 1. §78")), ...rows(section("## 2. §118"))]) {
      expect(r, r).toMatch(/✅|🔶/);
      expect(r, r).toMatch(/`[^`]+\.(ts|tsx|mjs)`|Market do Reino|Mercado/);
    }
  });
});
