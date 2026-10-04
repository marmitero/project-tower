/**
 * Pipeline de arte (ADR-032, docs/ART_PIPELINE.md): chroma key, normalização para `ita-atlas-v1`,
 * validação de fidelidade de movimento, ladrilhos contínuos, recolor, paleta, contador de gerações
 * e auditoria. TODOS os fixtures vêm do próprio pack — nenhuma geração é necessária.
 */
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ITA_ATLAS, gbaAssetIds, ICON_NAMES as CONFIG_ICONS, GBA_PREFIX } from "@tia/config";
import { despeckleCells } from "../../tools/art/despeckle.mjs";
import { contentBands, reflowRows } from "../../tools/art/reflow.mjs";
import { KIT_LAYOUT, sliceKit } from "../../tools/art/kit.mjs";
import { ICON_NAMES as TOOL_ICONS, UIKIT, sliceButtons, sliceIcons } from "../../tools/art/uikit.mjs";
import { ATLAS, BUDGET, CHROMA, HEIGHT_BY_KIND, THRESHOLDS } from "../../tools/art/spec.mjs";
import { bbox, blit, centroid, countColours, crop, newRaw, readRaw, resizeNearest, writePng } from "../../tools/art/image.mjs";
import { atlasMeta, baselineFor, buildGuide, guideOnMagenta, normalizeAtlas, sliceGrid, targetHeightFor } from "../../tools/art/atlas.mjs";
import { chromaKey, normalizeKeyColour, residualMagenta } from "../../tools/art/key.mjs";
import { framesOf, iou, validateAtlas } from "../../tools/art/validate.mjs";
import { makeSeamlessX, seamJump, stripTest } from "../../tools/art/seamless.mjs";
import { dominantHue, hsvToRgb, recolor, rgbToHsv } from "../../tools/art/recolor.mjs";
import { quantize, meanError } from "../../tools/art/quantize.mjs";
import { packPng } from "../../tools/art/pack.mjs";
import { measurePixelGrid } from "../../tools/art/measure.mjs";
import { contactSheet } from "../../tools/art/contact.mjs";
import { auditGenerated } from "../../tools/art/audit.mjs";
import { generationsIn, loadProvenance, provenanceErrors, recordGeneration, renderProvenanceMd } from "../../tools/art/provenance.mjs";

type Raw = { w: number; h: number; data: Uint8Array };

const CHARS = resolve(import.meta.dirname, "../../assets/sprites/characters");
const tmp = () => mkdtempSync(join(tmpdir(), "ita-art-"));

/** Simula a saída de um gerador: o guia numa grade maior (célula 320), em escala e deslocamento diferentes, sobre magenta com ruído. */
function fakeGenerated(guide: Raw, opts: { cell?: number; scale?: number; dx?: number; hue?: boolean; swapRows?: boolean } = {}): Raw {
  const cell = opts.cell ?? 320;
  const scale = opts.scale ?? 1.2;
  const out = newRaw(cell * ATLAS.cols, cell * ATLAS.rows.length, [255, 0, 255, 255]);
  const frames = framesOf(guide) as Raw[][];
  const rows = opts.swapRows ? [4, 3, 2, 1, 0] : [0, 1, 2, 3, 4];
  rows.forEach((src, r) => {
    for (let c = 0; c < ATLAS.cols; c += 1) {
      let f = frames[src]![c]!;
      if (opts.hue) f = recolor(f, { from: dominantHue(f), to: 20, width: 90 }) as Raw;
      const big = resizeNearest(f, Math.round(256 * scale), Math.round(256 * scale)) as Raw;
      const cellImg = newRaw(cell, cell, [255, 0, 255, 255]);
      blit(cellImg, big, Math.round((cell - big.w) / 2) + (opts.dx ?? 0), cell - big.h - 6);
      blit(out, cellImg, c * cell, r * cell);
    }
  });
  // ruído leve no fundo (um gerador de verdade nunca entrega #FF00FF exato)
  let seed = 3;
  for (let i = 0; i < out.data.length; i += 4) {
    if (out.data[i] === 255 && out.data[i + 1] === 0 && out.data[i + 2] === 255) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const n = (seed % 9) - 4;
      out.data[i] = 255 - Math.abs(n);
      out.data[i + 1] = Math.abs(n) * 2;
      out.data[i + 2] = 255 - Math.abs(n);
    }
  }
  return out;
}

describe("spec e formato", () => {
  it("o renderer (config) espelha o pipeline: mesma célula, colunas, linhas e fps", () => {
    expect(ITA_ATLAS.format).toBe(ATLAS.format);
    expect(ITA_ATLAS.cell).toBe(ATLAS.cell);
    expect(ITA_ATLAS.cols).toBe(ATLAS.cols);
    for (const [i, name] of ATLAS.rows.entries()) {
      expect(ITA_ATLAS.rows[name as keyof typeof ITA_ATLAS.rows]).toBe(i);
      expect(ITA_ATLAS.fps[name as keyof typeof ITA_ATLAS.fps]).toBe(ATLAS.fps[name as keyof typeof ATLAS.fps]);
      expect(ITA_ATLAS.loop[name as keyof typeof ITA_ATLAS.loop]).toBe(ATLAS.loop[name as keyof typeof ATLAS.loop]);
    }
  });

  it("atlasMeta descreve o ita-atlas-v1", () => {
    const m = atlasMeta("enemies/x", { kind: "humanoid" });
    expect(m.format).toBe("ita-atlas-v1");
    expect(m.anims.attack).toEqual({ row: 2, frames: 4, fps: 12, loop: false });
    expect(m.flipForLeft).toBe(true);
  });

  it("alvos de altura ficam dentro da faixa medida de cada tipo", () => {
    for (const [kind, [lo, hi]] of Object.entries(HEIGHT_BY_KIND) as [string, [number, number]][]) {
      const t = targetHeightFor(kind);
      expect(t).toBeGreaterThanOrEqual(lo);
      expect(t).toBeLessThanOrEqual(hi);
    }
    expect(() => targetHeightFor("dragao")).toThrow();
  });
});

describe("medidas do pack (a base da 'movimentação fiel')", () => {
  it("o atlas-guia do Guardião tem a âncora e a altura documentadas", async () => {
    const guide = (await buildGuide(CHARS, "hero")) as Raw;
    expect(guide.w).toBe(1024);
    expect(guide.h).toBe(1280);
    const frames = framesOf(guide) as Raw[][];
    const idle0 = bbox(frames[0]![0]!)!;
    expect(Math.abs(idle0.y1 - 243)).toBeLessThanOrEqual(3);
    expect(idle0.h).toBeGreaterThanOrEqual(176);
    expect(idle0.h).toBeLessThanOrEqual(192);
    // idle: quadros 2–3 "respiram" 4 px mais baixo
    expect(bbox(frames[0]![2]!)!.y1 - idle0.y1).toBe(ATLAS.idleBreathPx);
    // ataque estende a largura; morte fica deitada na mesma base
    expect(bbox(frames[2]![3]!)!.w).toBeGreaterThan(idle0.w * 1.3);
    const death = bbox(frames[4]![3]!)!;
    expect(death.w).toBeGreaterThan(death.h * 2);
    expect(Math.abs(death.y1 - 243)).toBeLessThanOrEqual(6);
  });

  it("mede o pixel de arte do pack (≈ 3 px; gosma ≈ 4 px)", async () => {
    const sheet = (await readRaw(join(CHARS, "hero/hero_idle_sheet.png"))) as Raw;
    expect(measurePixelGrid(crop(sheet, 0, 3 * 256, 256, 256)).p).toBe(3);
    const slime = (await readRaw(join(CHARS, "slime/slime_idle_sheet.png"))) as Raw;
    expect(measurePixelGrid(crop(slime, 0, 3 * 256, 256, 256)).p).toBe(4);
  });

  it("todo arquétipo-guia existe no pack", async () => {
    for (const name of ["hero", "slime", "bat", "orc", "boss", "mage", "skeleton"]) {
      const g = (await buildGuide(CHARS, name)) as Raw;
      expect(bbox(g)).not.toBeNull();
    }
  });
});

describe("chroma key", () => {
  it("remove o fundo magenta ruidoso e preserva o personagem", async () => {
    const guide = (await buildGuide(CHARS, "hero")) as Raw;
    const generated = fakeGenerated(guide, { scale: 1, cell: 256 });
    expect(residualMagenta(generated)).toBeGreaterThan(0.5); // antes: quase tudo é magenta
    const { raw, stats } = chromaKey(generated);
    expect(stats.residual).toBeLessThanOrEqual(THRESHOLDS.residualMagenta);
    expect(stats.residualOk).toBe(true);
    // a silhueta chaveada ≈ a do guia (IoU alto); franja e ilhas não sobram
    const a = (framesOf(raw) as Raw[][])[0]![0]!;
    const b = (framesOf(guide) as Raw[][])[0]![0]!;
    expect(iou(a, b)).toBeGreaterThan(0.85); // a erosão de 1 px da franja rosada custa ≈ 6–10 %
  });

  it("usa os mesmos limiares do pipeline de ícones já em produção", () => {
    expect(CHROMA).toMatchObject({ hard: 120, soft: 60 });
  });

  it("não come um personagem violeta (só mexe na franja)", () => {
    const img = newRaw(32, 32, [255, 0, 255, 255]);
    for (let y = 8; y < 24; y += 1) for (let x = 8; x < 24; x += 1) img.data.set([120, 40, 170, 255], (y * 32 + x) * 4);
    const { raw } = chromaKey(img);
    const inner = (16 * 32 + 16) * 4;
    expect([...raw.data.slice(inner, inner + 4)]).toEqual([120, 40, 170, 255]);
    expect(raw.data[3]).toBe(0);
  });
});

describe("normalização + validação de fidelidade", () => {
  it("um redesenho fiel (outra escala, outra grade, outra cor) é APROVADO", async () => {
    const guide = (await buildGuide(CHARS, "hero")) as Raw;
    const generated = fakeGenerated(guide, { hue: true, dx: 14 });
    const { raw: keyed } = chromaKey(generated);
    const { atlas, report } = normalizeAtlas(keyed, { kind: "humanoid" });
    expect(atlas.w).toBe(1024);
    expect(atlas.h).toBe(1280);
    expect(report.warnings).toEqual([]);
    const result = validateAtlas(atlas, guide, { kind: "humanoid" });
    const failing = result.checks.filter((c: { status: string }) => c.status !== "ok");
    expect(failing, JSON.stringify(failing)).toEqual([]);
    expect(result.verdict).toBe("approved");
  });

  it("a normalização crava âncora, escala e margem", async () => {
    const guide = (await buildGuide(CHARS, "slime")) as Raw;
    const { raw: keyed } = chromaKey(fakeGenerated(guide, { scale: 1.1 }));
    const { atlas } = normalizeAtlas(keyed, { kind: "low" });
    const frames = framesOf(atlas) as Raw[][];
    for (const [r, anim] of ATLAS.rows.entries()) {
      for (let c = 0; c < 4; c += 1) {
        const b = bbox(frames[r]![c]!)!;
        expect(Math.abs(b.y1 - baselineFor(anim, c))).toBeLessThanOrEqual(1);
        expect(b.x0).toBeGreaterThanOrEqual(ATLAS.margin);
        expect(b.x1).toBeLessThan(256 - ATLAS.margin);
      }
    }
    const h = bbox(frames[0]![0]!)!.h;
    expect(Math.abs(h - targetHeightFor("low"))).toBeLessThanOrEqual(2);
    const cx = centroid(frames[0]![0]!)!.x;
    expect(Math.abs(cx - ATLAS.anchor.x)).toBeLessThanOrEqual(2);
  });

  it("animações trocadas de linha (morte onde devia ser idle) → REFAZER", async () => {
    const guide = (await buildGuide(CHARS, "hero")) as Raw;
    const { raw: keyed } = chromaKey(fakeGenerated(guide, { swapRows: true }));
    const { atlas } = normalizeAtlas(keyed, { kind: "humanoid" });
    const result = validateAtlas(atlas, guide, { kind: "humanoid" });
    expect(result.verdict).toBe("redo");
    expect(result.checks.some((c: { name: string; status: string }) => c.name.startsWith("silhueta") && c.status === "fail")).toBe(true);
  });

  it("tamanho errado e quadro vazio são reprovados com motivo", async () => {
    const guide = (await buildGuide(CHARS, "hero")) as Raw;
    expect(validateAtlas(newRaw(512, 512), guide, { kind: "humanoid" }).verdict).toBe("redo");
    const holey = { ...guide, data: new Uint8Array(guide.data) } as Raw;
    for (let y = 0; y < 256; y += 1) holey.data.fill(0, (y * 1024 + 768) * 4, (y * 1024 + 1024) * 4); // idle[3] vazio
    const r = validateAtlas(holey, guide, { kind: "humanoid" });
    expect(r.verdict).toBe("redo");
    expect(r.checks.find((c: { name: string }) => c.name === "quadros")!.detail).toContain("idle[3]");
  });

  it("o próprio guia é o candidato perfeito (IoU 1, erro de movimento 0)", async () => {
    const guide = (await buildGuide(CHARS, "orc")) as Raw;
    const r = validateAtlas(guide, guide, { kind: "humanoid" });
    expect(r.checks.filter((c: { name: string; status: string }) => /movimento|silhueta/.test(c.name) && c.status !== "ok")).toEqual([]);
  });

  it("contact sheet e fatiamento têm as dimensões esperadas", async () => {
    const guide = (await buildGuide(CHARS, "hero")) as Raw;
    const sheet = contactSheet(guide, guide) as Raw;
    expect(sheet.h).toBe(5 * 128);
    expect(sheet.w).toBeGreaterThan(2 * 4 * 128);
    const g = sliceGrid(guideOnMagenta(guide), 4, 5);
    expect(g.cw).toBe(256);
    expect(g.ch).toBe(256);
  });
});

describe("arena: ladrilho contínuo", () => {
  const gradient = (): Raw => {
    const t = newRaw(128, 128, [0, 0, 0, 255]);
    for (let y = 0; y < 128; y += 1) for (let x = 0; x < 128; x += 1) t.data.set([x * 2, 60 + y, 200 - x, 255], (y * 128 + x) * 4);
    return t;
  };

  it("makeSeamlessX derruba o salto da emenda", () => {
    const tile = gradient();
    const before = seamJump(tile) as number;
    const fixed = makeSeamlessX(tile) as Raw;
    expect(before).toBeGreaterThan(80);
    expect(seamJump(fixed)).toBeLessThan(before * 0.2);
    expect(fixed.w).toBe(128);
  });

  it("a tira de teste de ladrilhos contínuos passa; a de ladrilhos crus, não", () => {
    const raw = gradient();
    const seamless = [makeSeamlessX(raw), makeSeamlessX(recolor(raw, { from: 0, to: 120, width: 180 }))] as Raw[];
    expect(stripTest(seamless).ok).toBe(true);
    expect(stripTest([raw]).ok).toBe(false);
  });
});

describe("recolor e paleta", () => {
  it("gira o matiz sem tocar em cinzas nem no alfa", () => {
    const img = newRaw(3, 1);
    img.data.set([40, 60, 200, 255, 128, 128, 128, 255, 40, 60, 200, 0], 0);
    const hue = rgbToHsv(40, 60, 200)[0]!;
    const out = recolor(img, { from: hue, to: 0, width: 60 }) as Raw;
    const h2 = rgbToHsv(out.data[0]!, out.data[1]!, out.data[2]!)[0]!;
    expect(Math.min(h2, 360 - h2)).toBeLessThan(5); // agora é vermelho
    expect([...out.data.slice(4, 8)]).toEqual([128, 128, 128, 255]); // cinza intacto
    expect(out.data[11]).toBe(0);
    expect(hsvToRgb(0, 1, 1)).toEqual([255, 0, 0]);
  });

  it("o PNG de paleta reduz bytes e fica ≤ 64 cores", async () => {
    const dir = tmp();
    try {
      const guide = (await buildGuide(CHARS, "hero")) as Raw;
      await writePng(guide, join(dir, "full.png"));
      const bytes = (await packPng(guide, join(dir, "pal.png"), 64)) as number;
      expect(bytes).toBeLessThan(statSync(join(dir, "full.png")).size * 0.6);
      const back = (await readRaw(join(dir, "pal.png"))) as Raw;
      expect(countColours(back, 1)).toBeLessThanOrEqual(64);
      expect(bytes).toBeLessThan(BUDGET.atlasBytes);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("quantização de paleta", () => {
  it("garante o limite de cores com erro baixo (o `colours` do sharp não garantia)", async () => {
    const guide = (await buildGuide(CHARS, "skeleton")) as Raw;
    expect(countColours(guide, 16)).toBeGreaterThan(400); // o pack NÃO é paleta enxuta
    const { raw, palette } = quantize(guide, 64) as { raw: Raw; palette: number[][] };
    expect(palette.length).toBeLessThanOrEqual(64);
    expect(countColours(raw, 1)).toBeLessThanOrEqual(64);
    expect(meanError(guide, raw)).toBeLessThan(6); // de 255
    expect(bbox(raw)).toEqual(bbox(guide)); // a silhueta não muda (alfa binário só afeta bordas moles)
  });

  it("o Arcanista (paleta enxuta de 31 cores) passa intacto", async () => {
    const mage = (await buildGuide(CHARS, "mage")) as Raw;
    expect(countColours(mage, 1)).toBeLessThanOrEqual(64);
    expect(meanError(mage, quantize(mage, 64).raw)).toBeLessThan(1);
  });
});

describe("procedência e contador de gerações (regra: ≤ 10 por lote)", () => {
  it("o 11º registro do lote é recusado", () => {
    const dir = tmp();
    try {
      const file = join(dir, "provenance.json");
      for (let i = 0; i < 10; i += 1) recordGeneration(file, { batch: "L1", asset: `a${i}`, kind: "atlas", prompt: "p" });
      expect(generationsIn(loadProvenance(file), "L1")).toBe(10);
      expect(() => recordGeneration(file, { batch: "L1", asset: "a10", kind: "atlas", prompt: "p" })).toThrow(/limite de 10/);
      expect(() => recordGeneration(file, { batch: "L2", asset: "b0", kind: "atlas", prompt: "p" })).not.toThrow();
      expect(provenanceErrors(loadProvenance(file))).toEqual([]);
      expect(renderProvenanceMd(loadProvenance(file))).toContain("Lote L1 — 10/10");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("um arquivo adulterado (11 no mesmo lote) é reprovado na auditoria", async () => {
    const dir = tmp();
    try {
      const entries = Array.from({ length: 11 }, (_, i) => ({ batch: "L1", asset: `a${i}`, kind: "atlas", prompt: "p", date: "2026-10-03" }));
      writeFileSync(join(dir, "provenance.json"), JSON.stringify({ version: 1, maxPerBatch: 10, entries }));
      const { problems } = await auditGenerated(dir);
      expect(problems.join("\n")).toMatch(/lote L1: 11 gerações/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("auditoria da arte gerada", () => {
  it("aceita atlas e kit corretos; reprova tamanho errado, JSON ausente e ladrilho fora de 128", async () => {
    const dir = tmp();
    try {
      mkdirSync(join(dir, "enemies"), { recursive: true });
      const guide = (await buildGuide(CHARS, "slime")) as Raw;
      await packPng(guide, join(dir, "enemies/ok.png"), 64);
      writeFileSync(join(dir, "enemies/ok.atlas.json"), JSON.stringify(atlasMeta("enemies/ok")));
      await writePng(newRaw(512, 512), join(dir, "enemies/ruim.png"));
      mkdirSync(join(dir, "arenas/kit"), { recursive: true });
      await writePng(newRaw(64, 64, [9, 9, 9, 255]), join(dir, "arenas/kit/wall_0.png"));
      const { problems, stats } = await auditGenerated(dir);
      expect(stats.atlases).toBe(2);
      expect(stats.arenaKits).toBe(1);
      const text = problems.join("\n");
      expect(text).toMatch(/ruim\.png: 512×512/);
      expect(text).toMatch(/falta enemies\/ruim\.atlas\.json/);
      expect(text).toMatch(/wall_0\.png: 64×64/);
      expect(text).not.toMatch(/ok\.png/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("o repositório de verdade passa na auditoria", async () => {
    const { problems } = await auditGenerated(resolve(import.meta.dirname, "../../assets/generated"));
    expect(problems).toEqual([]);
  });
});

/** Folha 512×512 (células de 128) sobre magenta, com um bloco colorido no centro de cada célula. */
function syntheticSheet(block: [number, number, number], size: [number, number] = [76, 60]): Raw {
  const sheet = newRaw(512, 512, [255, 0, 255, 255]) as Raw;
  for (let c = 0; c < 16; c++) {
    const b = newRaw(size[0], size[1], [block[0], block[1], block[2], 255]) as Raw;
    blit(sheet, b, (c % 4) * 128 + ((128 - size[0]) >> 1), Math.floor(c / 4) * 128 + ((128 - size[1]) >> 1));
  }
  return sheet;
}

describe("kit de arena, botões GBA e ícones (ADR-033, Lote 1)", () => {
  it("KIT_LAYOUT tem 16 nomes únicos: 5 paredes, tocha, banner, portão, 4 pisos, 4 adereços", () => {
    expect(KIT_LAYOUT.length).toBe(16);
    expect(new Set(KIT_LAYOUT).size).toBe(16);
    expect(KIT_LAYOUT.filter((n: string) => n.startsWith("wall_")).length).toBe(5);
    expect(KIT_LAYOUT.filter((n: string) => n.startsWith("floor_")).length).toBe(4);
    expect(KIT_LAYOUT.filter((n: string) => n.startsWith("prop_")).length).toBe(4);
  });

  it("sliceKit devolve todos os ladrilhos no tamanho da arena; piso/parede opacos, adereço com alfa", () => {
    const sheet = syntheticSheet([90, 80, 70], [100, 100]);
    const { tiles } = sliceKit(sheet);
    expect(Object.keys(tiles).sort()).toEqual([...KIT_LAYOUT].sort());
    for (const name of KIT_LAYOUT) {
      const t = tiles[name] as Raw;
      expect(t.w).toBe(t.h);
      const alphas = new Set<number>();
      for (let i = 3; i < t.data.length; i += 4) alphas.add(t.data[i]!);
      if (name.startsWith("prop_")) expect(alphas.has(0), name).toBe(true);
      else expect([...alphas], name).toEqual([255]);
    }
  });

  it("sliceButtons: as peças do pipeline são EXATAMENTE as do config (a UI nunca pede arte que o pipeline não faz)", () => {
    const pieces = sliceButtons(syntheticSheet([50, 50, 150]));
    const fromTool = Object.keys(pieces).sort();
    const fromConfig = gbaAssetIds()
      .map((id) => id.slice(GBA_PREFIX.length))
      .filter((n) => !n.startsWith("icon_"))
      .sort();
    expect(fromTool).toEqual(fromConfig);
    expect(Object.keys(UIKIT.extras).sort()).toEqual(["amber", "emerald", "ruby"]);
  });

  it("estados de um mesmo botão têm a MESMA caixa; cores extras vêm do recolor (matiz diferente do índigo)", () => {
    const pieces = sliceButtons(syntheticSheet([50, 50, 150])) as Record<string, Raw>;
    for (const colour of ["indigo", "silver", "ruby", "emerald", "amber"]) {
      const boxes = ["normal", "hover", "pressed", "disabled"].map((s) => `${pieces[`${colour}_${s}`]!.w}x${pieces[`${colour}_${s}`]!.h}`);
      expect(new Set(boxes).size, colour).toBe(1);
    }
    const hue = (n: string) => dominantHue(pieces[n]!);
    expect(Math.abs(hue("ruby_normal") - hue("indigo_normal"))).toBeGreaterThan(60);
    expect(Math.abs(hue("emerald_normal") - hue("ruby_normal"))).toBeGreaterThan(60);
  });

  it("os ícones do pipeline e do config são os mesmos 16, na mesma ordem; cada um sai 64×64", () => {
    expect([...TOOL_ICONS]).toEqual([...CONFIG_ICONS]);
    const icons = sliceIcons(syntheticSheet([200, 160, 40], [70, 70])) as Record<string, Raw>;
    expect(Object.keys(icons)).toEqual([...CONFIG_ICONS]);
    for (const i of Object.values(icons)) expect([i.w, i.h]).toEqual([64, 64]);
  });
});

describe("reflow de folha quadrada (ADR-035)", () => {
  /** Folha 1024×1024 com 5 faixas de conteúdo (como o gerador devolveu a Kaia), cada uma com 4 blocos. */
  function squareSheet(): Raw {
    const sheet = newRaw(1024, 1024) as Raw;
    const bands: Array<[number, number]> = [[50, 227], [265, 441], [474, 649], [674, 845], [868, 1019]];
    for (const [y0, y1] of bands) {
      for (let c = 0; c < 4; c++) blit(sheet, newRaw(60, y1 - y0 + 1, [90, 120, 80, 255]) as Raw, c * 256 + 100, y0);
    }
    return sheet;
  }

  it("acha as 5 linhas pelo vazio entre elas", () => {
    expect(contentBands(squareSheet())).toEqual([[50, 227], [265, 441], [474, 649], [674, 845], [868, 1019]]);
  });

  it("monta 1024×1280 SEM esticar: cada linha mantém a altura e a base na âncora", () => {
    const { raw, reflowed } = reflowRows(squareSheet()) as { raw: Raw; reflowed: boolean };
    expect(reflowed).toBe(true);
    expect([raw.w, raw.h]).toEqual([1024, 1280]);
    const bands = contentBands(raw) as number[][];
    expect(bands.length).toBe(5);
    expect(bands.map(([a, b]) => b! - a! + 1)).toEqual([178, 177, 176, 172, 152]);
    bands.forEach(([, y1], r) => expect(y1).toBe(r * 256 + 243));
  });

  it("folha já em 4:5 passa intacta", () => {
    const ok = newRaw(1024, 1280) as Raw;
    const out = reflowRows(ok);
    expect(out.reflowed).toBe(false);
    expect(out.raw).toBe(ok);
  });

  it("número de linhas errado é erro claro (reprovar e refazer, não deformar)", () => {
    const bad = newRaw(1024, 1024) as Raw;
    blit(bad, newRaw(60, 100, [90, 120, 80, 255]) as Raw, 100, 100);
    expect(() => reflowRows(bad)).toThrow(/esperava 5 linhas/);
  });
});

describe("despeckle (Lote 4, ADR-039)", () => {
  const COLS = 4;
  const ROWS = 5;
  const W = 400;
  const H = 500;
  const solid = (raw: Raw, x: number, y: number) => raw.data[(y * raw.w + x) * 4 + 3]! > 0;

  it("apaga o fragmento solto do quadro vizinho e mantém o corpo e a arma encostada", () => {
    const raw = newRaw(W, H, [0, 0, 0, 0]) as Raw;
    // célula (0,0) = 100×100: corpo 30×60, fragmento 6×8 longe, arma 14×14 colada ao corpo
    blit(raw, newRaw(30, 60, [90, 120, 80, 255]) as Raw, 35, 30);
    blit(raw, newRaw(14, 14, [200, 200, 200, 255]) as Raw, 70, 40);
    blit(raw, newRaw(6, 8, [200, 50, 50, 255]) as Raw, 2, 90);
    const out = despeckleCells(raw, { cols: COLS, rows: ROWS, minArea: 150, reach: 30 }) as { raw: Raw; removedPixels: number; cellsTouched: number };
    expect(out.removedPixels).toBe(48);
    expect(out.cellsTouched).toBe(1);
    expect(solid(out.raw, 4, 92)).toBe(false);
    expect(solid(out.raw, 50, 50)).toBe(true);
    expect(solid(out.raw, 75, 45)).toBe(true);
    expect(solid(raw, 4, 92)).toBe(true); // não muta a entrada
  });

  it("célula limpa fica intacta e a operação é determinística", () => {
    const raw = newRaw(W, H, [0, 0, 0, 0]) as Raw;
    blit(raw, newRaw(30, 60, [90, 120, 80, 255]) as Raw, 135, 30);
    const a = despeckleCells(raw, { cols: COLS, rows: ROWS }) as { raw: Raw; removedPixels: number };
    const b = despeckleCells(raw, { cols: COLS, rows: ROWS }) as { raw: Raw; removedPixels: number };
    expect(a.removedPixels).toBe(0);
    expect(Buffer.from(a.raw.data).equals(Buffer.from(b.raw.data))).toBe(true);
    expect(Buffer.from(a.raw.data).equals(Buffer.from(raw.data))).toBe(true);
  });
});

describe("normalizeKeyColour (Lote 5, ADR-040)", () => {
  const PINK = [253, 142, 252, 255];
  const sheet = (bg: number[]) => {
    const raw = newRaw(120, 120, bg) as Raw;
    blit(raw, newRaw(30, 50, [90, 120, 80, 255]) as Raw, 40, 30);
    return raw;
  };
  const alpha = (raw: Raw, x: number, y: number) => raw.data[(y * raw.w + x) * 4 + 3]!;

  it("fundo rosa-claro dos 4 cantos vira magenta e o chroma key passa a limpar tudo", () => {
    const raw = sheet(PINK);
    const fixed = normalizeKeyColour(raw);
    expect(fixed.colour).toEqual([253, 142, 252]);
    expect(fixed.replaced).toBe(120 * 120 - 30 * 50);
    const keyed = chromaKey(fixed.raw).raw as Raw;
    expect(alpha(keyed, 5, 5)).toBe(0);
    expect(alpha(keyed, 50, 50)).toBe(255);
  });

  it("não mexe em folha com magenta verdadeiro nem em fundo que não é rosado", () => {
    const pure = sheet([255, 0, 255, 255]);
    expect(normalizeKeyColour(pure).colour).toBeNull();
    expect(normalizeKeyColour(pure).raw).toBe(pure);
    const grey = sheet([128, 128, 128, 255]);
    expect(normalizeKeyColour(grey).colour).toBeNull();
  });

  it("cantos que discordam (personagem encostado na borda) deixam a folha intacta", () => {
    const raw = sheet(PINK);
    blit(raw, newRaw(10, 10, [20, 20, 20, 255]) as Raw, 0, 0);
    expect(normalizeKeyColour(raw).colour).toBeNull();
  });
});
