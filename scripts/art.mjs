#!/usr/bin/env node
/**
 * CLI do pipeline de arte (docs/ART_PIPELINE.md). Zero gerações: tudo aqui é código.
 *
 *   node scripts/art.mjs guide <personagem> [--out guia.png]          atlas-guia 4×5 do pack (+ versão magenta)
 *   node scripts/art.mjs key <in> <out>                                chroma key #FF00FF
 *   node scripts/art.mjs normalize <in-com-alfa> <out> --kind humanoid normaliza para ita-atlas-v1
 *   node scripts/art.mjs validate <atlas> --guide hero --kind humanoid fidelidade de movimento
 *   node scripts/art.mjs contact <atlas> --guide hero --out folha.png  contact sheet guia × candidato
 *   node scripts/art.mjs ingest <bruto> --id enemies/x --kind humanoid [--guide hero] [--out assets/generated] [--snap 4]
 *   node scripts/art.mjs seamless <in> <out> [--size 128]              ladrilho contínuo em X
 *   node scripts/art.mjs recolor <in> <out> --from 270 --to 0 [--width 50]
 *   node scripts/art.mjs pack <in> <out> [--colours 64]                PNG de paleta
 *   node scripts/art.mjs measure <png>                                 mede o pixel de arte
 *   node scripts/art.mjs provenance add|status|render --batch L1 ...   contador de gerações do lote
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { GUIDE_BY_KIND, HEIGHT_BY_KIND, ARENA, PACK } from "../tools/art/spec.mjs";
import { readRaw, writePng, resizeSmart, frameOf } from "../tools/art/image.mjs";
import { chromaKey } from "../tools/art/key.mjs";
import { atlasMeta, buildGuide, guideOnMagenta, normalizeAtlas } from "../tools/art/atlas.mjs";
import { formatReport, validateAtlas } from "../tools/art/validate.mjs";
import { contactSheet } from "../tools/art/contact.mjs";
import { makeSeamlessX, seamJump } from "../tools/art/seamless.mjs";
import { dominantHue, recolor } from "../tools/art/recolor.mjs";
import { packPng, overBudget } from "../tools/art/pack.mjs";
import { measurePixelGrid } from "../tools/art/measure.mjs";
import { generationsIn, loadProvenance, recordGeneration, renderProvenanceMd } from "../tools/art/provenance.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const CHARS = join(ROOT, "assets/sprites/characters");
const PROV = join(ROOT, "assets/generated/provenance.json");

function parse(argv) {
  const pos = [];
  const opt = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith("--")) {
      const k = argv[i].slice(2);
      const v = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[(i += 1)] : "true";
      opt[k] = v;
    } else pos.push(argv[i]);
  }
  return { pos, opt };
}

const die = (msg) => {
  console.error(`art: ${msg}`);
  process.exit(1);
};
const need = (v, what) => v ?? die(`falta ${what} (veja o cabeçalho de scripts/art.mjs)`);

const { pos, opt } = parse(process.argv.slice(2));
const [cmd, ...args] = pos;

async function main() {
  switch (cmd) {
    case "guide": {
      const name = need(args[0], "<personagem>");
      const guide = await buildGuide(CHARS, name);
      const out = resolve(opt.out ?? `${name}.guide.png`);
      await writePng(guide, out);
      await writePng(guideOnMagenta(guide), out.replace(/\.png$/, ".magenta.png"));
      console.log(`guia: ${out} (+ .magenta.png — esta vai de referência ao gerador)`);
      return;
    }
    case "key": {
      const { raw, stats } = chromaKey(await readRaw(need(args[0], "<in>")));
      await writePng(raw, resolve(need(args[1], "<out>")));
      console.log(`chroma key: ilhas removidas ${stats.islandsRemoved}, resíduo ${(stats.residual * 100).toFixed(3)}% ${stats.residualOk ? "ok" : "ACIMA DO LIMITE"}`);
      return;
    }
    case "normalize": {
      const kind = need(opt.kind, "--kind");
      const { atlas, report } = normalizeAtlas(await readRaw(need(args[0], "<in>")), { kind, snap: opt.snap ? Number(opt.snap) : 0 });
      await writePng(atlas, resolve(need(args[1], "<out>")));
      console.log(`normalizado: escala ${report.scale.toFixed(3)}, idle ${report.targetHeight}px`);
      for (const w of report.warnings) console.log(`  aviso: ${w}`);
      return;
    }
    case "validate": {
      const kind = need(opt.kind, "--kind");
      const guide = await buildGuide(CHARS, opt.guide ?? GUIDE_BY_KIND[kind]);
      const report = validateAtlas(await readRaw(need(args[0], "<atlas>")), guide, { kind });
      console.log(formatReport(report));
      process.exitCode = report.verdict === "redo" ? 2 : 0;
      return;
    }
    case "contact": {
      const kind = opt.kind ?? "humanoid";
      const guide = await buildGuide(CHARS, opt.guide ?? GUIDE_BY_KIND[kind]);
      const sheet = contactSheet(await readRaw(need(args[0], "<atlas>")), guide);
      await writePng(sheet, resolve(opt.out ?? "contact.png"));
      console.log(`contact sheet: ${opt.out ?? "contact.png"}`);
      return;
    }
    case "ingest": {
      const id = need(opt.id, "--id");
      const kind = need(opt.kind, "--kind");
      const guideName = opt.guide ?? GUIDE_BY_KIND[kind];
      const outDir = resolve(opt.out ?? join(ROOT, "assets/generated"));
      const { raw: keyed, stats } = chromaKey(await readRaw(need(args[0], "<bruto>")));
      const { atlas, report } = normalizeAtlas(keyed, { kind, snap: opt.snap ? Number(opt.snap) : 0 });
      const guide = await buildGuide(CHARS, guideName);
      const verdict = validateAtlas(atlas, guide, { kind });
      const png = join(outDir, `${id}.png`);
      const bytes = await packPng(atlas, png);
      const meta = atlasMeta(id, { kind, guide: guideName, scale: +report.scale.toFixed(4) });
      writeFileSync(png.replace(/\.png$/, ".atlas.json"), `${JSON.stringify(meta, null, 2)}\n`);
      const review = join(ROOT, "assets/_review", `${id}.contact.png`);
      await writePng(contactSheet(atlas, guide), review);
      const budget = overBudget(png, "atlas");
      console.log(`${id}: contact sheet em ${review}`);
      console.log(`${id}: ${bytes} bytes${budget.over ? ` (ACIMA do orçamento de ${budget.limit})` : ""}; chroma ${stats.residualOk ? "ok" : "resíduo alto"}`);
      for (const w of report.warnings) console.log(`  aviso: ${w}`);
      console.log(formatReport(verdict));
      process.exitCode = verdict.verdict === "redo" ? 2 : 0;
      return;
    }
    case "seamless": {
      const size = Number(opt.size ?? ARENA.tile);
      let raw = await readRaw(need(args[0], "<in>"));
      if (raw.w !== size || raw.h !== size) raw = resizeSmart(raw, size, size);
      const before = seamJump(raw);
      const fixed = makeSeamlessX(raw);
      await writePng(fixed, resolve(need(args[1], "<out>")));
      console.log(`emenda: salto ${before.toFixed(1)} → ${seamJump(fixed).toFixed(1)}`);
      return;
    }
    case "recolor": {
      const raw = await readRaw(need(args[0], "<in>"));
      if (opt.from === undefined) console.log(`matiz dominante: ${Math.round(dominantHue(raw))}°`);
      const out = recolor(raw, { from: Number(opt.from ?? dominantHue(raw)), to: Number(need(opt.to, "--to")), width: Number(opt.width ?? 50), satMul: Number(opt.sat ?? 1), valMul: Number(opt.val ?? 1) });
      await writePng(out, resolve(need(args[1], "<out>")));
      return;
    }
    case "pack": {
      const bytes = await packPng(await readRaw(need(args[0], "<in>")), resolve(need(args[1], "<out>")), Number(opt.colours ?? PACK.colours));
      console.log(`${args[1]}: ${bytes} bytes (paleta de ${opt.colours ?? PACK.colours} cores)`);
      return;
    }
    case "measure": {
      const raw = await readRaw(need(args[0], "<png>"));
      const m = measurePixelGrid(opt.frame ? frameOf(raw, Number(opt.frame.split(",")[0]), Number(opt.frame.split(",")[1])) : raw);
      console.log(`pixel de arte ≈ ${m.p}px (confiança ${(m.confidence * 100).toFixed(0)}%, ${m.runs} trechos)`);
      return;
    }
    case "provenance": {
      const sub = args[0];
      const prov = loadProvenance(PROV);
      if (sub === "status") {
        const batches = [...new Set(prov.entries.map((e) => e.batch))];
        console.log(batches.length ? batches.map((b) => `${b}: ${generationsIn(prov, b)}/${prov.maxPerBatch}`).join("\n") : "nenhuma geração registrada");
        return;
      }
      if (sub === "add") {
        const r = recordGeneration(PROV, { batch: need(opt.batch, "--batch"), asset: need(opt.asset, "--asset"), kind: need(opt.kind, "--kind"), prompt: need(opt.prompt, "--prompt"), refs: opt.refs ? opt.refs.split(",") : [], verdict: opt.verdict });
        console.log(`registrado: ${r.used} usadas, ${r.left} restantes no lote ${opt.batch}`);
      }
      if (sub === "add" || sub === "render") {
        const md = join(dirname(PROV), "PROVENANCE.md");
        mkdirSync(dirname(md), { recursive: true });
        writeFileSync(md, renderProvenanceMd(loadProvenance(PROV)));
        console.log(`atualizado: ${md}`);
        return;
      }
      die("use provenance add|status|render");
      return;
    }
    default:
      console.log(`uso: node scripts/art.mjs <guide|key|normalize|validate|contact|ingest|seamless|recolor|pack|measure|provenance> ...
tipos (--kind): ${Object.keys(HEIGHT_BY_KIND).join(", ")}`);
      process.exitCode = cmd ? 1 : 0;
  }
}

main().catch((e) => die(e.message));
