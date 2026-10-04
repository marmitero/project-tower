/**
 * Registro de procedência + contador de gerações por lote (regra do usuário: ≤ 10 por sessão).
 * Fonte de verdade: `assets/generated/provenance.json`; `PROVENANCE.md` é renderizado dele.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export const MAX_GENERATIONS_PER_BATCH = 10;

export function loadProvenance(file) {
  if (!existsSync(file)) return { version: 1, maxPerBatch: MAX_GENERATIONS_PER_BATCH, entries: [] };
  return JSON.parse(readFileSync(file, "utf8"));
}

export function generationsIn(prov, batch) {
  return prov.entries.filter((e) => e.batch === batch).length;
}

/** Erros de consistência (lote acima do limite, campos faltando). */
export function provenanceErrors(prov) {
  const errors = [];
  const perBatch = new Map();
  for (const [i, e] of prov.entries.entries()) {
    for (const k of ["batch", "asset", "kind", "prompt", "date"]) if (!e[k]) errors.push(`entrada ${i}: campo "${k}" ausente`);
    perBatch.set(e.batch, (perBatch.get(e.batch) ?? 0) + 1);
  }
  for (const [batch, n] of perBatch) {
    if (n > (prov.maxPerBatch ?? MAX_GENERATIONS_PER_BATCH)) errors.push(`lote ${batch}: ${n} gerações (limite ${prov.maxPerBatch ?? MAX_GENERATIONS_PER_BATCH})`);
  }
  return errors;
}

/** Registra UMA geração; lança se o lote já estourou o limite. */
export function recordGeneration(file, entry) {
  const prov = loadProvenance(file);
  const used = generationsIn(prov, entry.batch);
  if (used >= (prov.maxPerBatch ?? MAX_GENERATIONS_PER_BATCH)) {
    throw new Error(`Lote ${entry.batch}: limite de ${prov.maxPerBatch} gerações atingido. Pare, explique ao usuário e espere o "lote NN aprovado".`);
  }
  prov.entries.push({ date: new Date().toISOString().slice(0, 10), ...entry });
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(prov, null, 2)}\n`);
  return { used: used + 1, left: prov.maxPerBatch - used - 1 };
}

export function renderProvenanceMd(prov) {
  const batches = [...new Set(prov.entries.map((e) => e.batch))];
  const lines = [
    "# Procedência da arte gerada",
    "",
    "Gerado por `npm run art:provenance -- render` a partir de `provenance.json` — **não editar à mão**.",
    `Regra: no máximo **${prov.maxPerBatch} gerações de imagem por lote** (1 lote = 1 sessão).`,
    "",
  ];
  if (batches.length === 0) lines.push("_Nenhuma geração registrada ainda._", "");
  for (const b of batches) {
    const es = prov.entries.filter((e) => e.batch === b);
    lines.push(`## Lote ${b} — ${es.length}/${prov.maxPerBatch} gerações`, "", "| # | Asset | Tipo | Veredito | Referências | Prompt |", "|---|---|---|---|---|---|");
    es.forEach((e, i) => lines.push(`| ${i + 1} | \`${e.asset}\` | ${e.kind} | ${e.verdict ?? "—"} | ${(e.refs ?? []).join(", ") || "—"} | ${String(e.prompt).replace(/\|/g, "/").slice(0, 120)} |`));
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}
