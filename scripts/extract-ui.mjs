#!/usr/bin/env node
/**
 * Extração de peças de UI a partir das sheets grandes do pack.
 *
 * §62 — o produto final não pode ser entregue com UI de protótipo, e o
 * jogo é PT-BR. As sheets `ui_kit.png` e `ui_dialog.png` trazem rótulos em
 * inglês ("INVENTORY", "ITEMS", "EQUIP", "OK", "CANCEL", "100 / 100")
 * RASTERIZADOS na imagem: intransponíveis para PT-BR. Qualquer peça com
 * texto embutido é descartada, nunca entregue.
 *
 * O que este script extrai: as peças SEM texto verificadas visual e
 * numericamente — molduras 9-slice, painel, divisores, slots, setas,
 * emblemas, cofre e as BARRAS decompostas.
 *
 * POR QUE A DECOMPOSIÇÃO DAS BARRAS: a barra da sheet vem com
 * "100 / 100" assado em cima do preenchimento. Não existe recorte da
 * barra inteira que sobreviva ao §62. A solução é faturar a barra em
 * partes sem texto — trilho vazio, preenchimento colorido, cap esquerdo
 * (ícone) e cap direito — e compor em runtime, com números renderizados
 * em PT-BR pelo jogo. A geometria medida está no `extraction-report.json`.
 *
 * SELEÇÃO vs GUARDRAIL: a SELEÇÃO é uma allowlist curada — cada retângulo
 * abaixo foi medido pixel a pixel (contraste local nas bordas) e audiado
 * por pixels claros. O detector automático de texto NÃO seleciona peça
 * nenhuma; ele é um GUARDRAIL que falha o build se uma peça aprovada
 * apresentar assinatura forte de glifos. Por que não o contrário: quatro
 * detectores automáticos já falharam sozinhos (branco puro, branco com
 * borda, brilho total, assinatura de colunas) — metal polido brilha mais
 * que papel e uma seta tem a forma da letra "I". Heurística escolhe
 * peça; humano escolhe peça; heurística apenas barra regressão.
 *
 * SAÍDA: `assets/generated/ui/` (versionado — arte do projeto) +
 * `extraction-report.json` com métricas de cada peça e a geometria de
 * composição das barras.
 */

import { writeFile, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const SHEETS = {
  kit: join(ROOT, "assets/sprites/ui/ui_kit.png"),
  dialog: join(ROOT, "assets/sprites/ui/ui_dialog.png"),
};
const OUT = join(ROOT, "assets/generated/ui");

/**
 * Allowlist de peças. Coordenadas absolutas em pixels, medidas por
 * contraste local (contorno preto grosso do estilo + gradientes), NÃO por
 * palpite. A sheet é 2048x2048 — se mudar, as coordenadas são inválidas
 * e o script falha de propósito.
 */
const SHEET_SIZE = 2048;

const REGIONS = [
  // ── Molduras 9-slice (a sheet tem TRÊS, não quatro; a quarta região da
  // versão anterior era um recorte deslocado sobre a terceira moldura) ──
  { id: "frame_9slice_stone", sheet: "kit", x: 36, y: 1269, w: 332, h: 334, slice9: 24 },
  { id: "frame_9slice_brick", sheet: "kit", x: 398, y: 1269, w: 332, h: 334, slice9: 24 },
  { id: "frame_9slice_dark", sheet: "kit", x: 758, y: 1270, w: 334, h: 333, slice9: 24 },

  // ── Painel decorativo ──
  { id: "panel_ornate", sheet: "kit", x: 1235, y: 907, w: 723, h: 247, slice9: 40 },

  // ── Divisores horizontais (pares esquerda/direita + pergaminho) ──
  { id: "divider_gold", sheet: "kit", x: 1232, y: 1187, w: 381, h: 84 },
  { id: "divider_stone", sheet: "kit", x: 1651, y: 1192, w: 334, h: 77 },
  { id: "divider_diamond", sheet: "kit", x: 1228, y: 1308, w: 388, h: 84 },
  { id: "divider_gold_thin", sheet: "kit", x: 1651, y: 1311, w: 336, h: 79 },
  { id: "divider_scroll", sheet: "kit", x: 1270, y: 1416, w: 614, h: 116 },

  // ── Setas de navegação ──
  { id: "arrow_left", sheet: "kit", x: 1272, y: 780, w: 120, h: 110 },
  { id: "arrow_right", sheet: "kit", x: 1429, y: 780, w: 119, h: 110 },
  { id: "arrow_up", sheet: "kit", x: 1586, y: 780, w: 117, h: 110 },
  { id: "arrow_down", sheet: "kit", x: 1742, y: 780, w: 117, h: 110 },

  // ── Frames de slot de item (5 slots, faixa x=1235..1993) ──
  { id: "slot_frame_sword", sheet: "kit", x: 1235, y: 467, w: 143, h: 113 },
  { id: "slot_frame_shield", sheet: "kit", x: 1388, y: 467, w: 144, h: 113 },
  { id: "slot_frame_potion", sheet: "kit", x: 1543, y: 467, w: 143, h: 113 },
  { id: "slot_frame_bag", sheet: "kit", x: 1697, y: 467, w: 143, h: 113 },
  { id: "slot_frame_gear", sheet: "kit", x: 1851, y: 467, w: 143, h: 113 },

  // ── Emblemas decorativos (fileira de quatro peças) ──
  { id: "crest_blue", sheet: "kit", x: 1169, y: 1555, w: 170, h: 195 },
  { id: "crest_red", sheet: "kit", x: 1393, y: 1555, w: 166, h: 207 },
  { id: "crest_steel", sheet: "kit", x: 1613, y: 1555, w: 165, h: 207 },
  { id: "crest_gold", sheet: "kit", x: 1821, y: 1550, w: 173, h: 180 },

  // ── Placas vazias e faixa azul (superfícies para rótulos em HTML) ──
  { id: "plaque_wide", sheet: "kit", x: 691, y: 1660, w: 173, h: 60 },
  { id: "plaque_narrow", sheet: "kit", x: 886, y: 1660, w: 182, h: 60 },
  { id: "banner_blue", sheet: "kit", x: 484, y: 1660, w: 185, h: 60 },

  // ── Cofre de recompensa ──
  { id: "chest", sheet: "kit", x: 1505, y: 1779, w: 266, h: 190 },
];

/**
 * Barras decompostas. Todas as peças de UMA barra compartilham a mesma
 * janela vertical (a "banda" da barra), para que a composição em runtime
 * seja apenas empilhar na mesma origem:
 *
 *   1. trilho vazio (bar_track) esticado até a largura desejada;
 *   2. fill colorido recortado pela fração preenchida;
 *   3. cap esquerdo (ícone) e cap direito por cima.
 *
 * `capOffsetY` é o desencaixe do cap (que é mais alto que o trilho) em
 * relação ao topo da banda. Os números são PT-BR renderizados pelo jogo —
 * nunca na arte (§62).
 *
 * bar_cap_left_xp NÃO é extraído: o cap da barra de XP traz as letras
 * "XP" rasterizadas. O cap de coração (HP) e o de orbe (MP) servem como
 * cap esquerdo genérico.
 */
const BAR_PARTS = [
  { id: "bar_track", sheet: "kit", x: 1754, y: 328, w: 221, h: 101, bar: "template", role: "track", capOffsetY: -7 },
  { id: "bar_fill_hp", sheet: "kit", x: 1366, y: 58, w: 198, h: 101, bar: "hp", role: "fill" },
  { id: "bar_fill_mp", sheet: "kit", x: 1365, y: 192, w: 199, h: 101, bar: "mp", role: "fill" },
  { id: "bar_fill_xp", sheet: "kit", x: 1370, y: 328, w: 194, h: 101, bar: "xp", role: "fill" },
  { id: "bar_cap_left_heart", sheet: "kit", x: 1244, y: 51, w: 122, h: 114, bar: "hp", role: "cap_left" },
  { id: "bar_cap_left_orb", sheet: "kit", x: 1244, y: 185, w: 122, h: 114, bar: "mp", role: "cap_left" },
  { id: "bar_cap_right", sheet: "kit", x: 1968, y: 51, w: 36, h: 114, bar: "hp", role: "cap_right" },
];

/**
 * Regiões rejeitadas e por quê — o relatório guarda para que ninguém
 * repita o trabalho.
 */
const REJECTED = [
  { id: "bar_hp_frame", reason: "texto rasterizado '100 / 100' — substituída por bar_track + bar_fill_hp" },
  { id: "bar_mp_frame", reason: "texto rasterizado — substituída por bar_track + bar_fill_mp" },
  { id: "bar_xp_frame", reason: "texto rasterizado + cap com letras 'XP' — substituída por partes" },
  { id: "button_red_banner", sheet: "dialog", reason: "texto rasterizado no bloco vermelho (verificado em zoom)" },
  { id: "button_blue_banner", sheet: "dialog", reason: "texto rasterizado no bloco azul" },
  { id: "label_strip", sheet: "dialog", reason: "tira clara com glifos inequívocos em zoom" },
  { id: "ornament_strip_1", sheet: "kit", x: 54, y: 1660, w: 220, h: 60, reason: "ornamento complexo com formas de glifo — requer revisão humana" },
  { id: "ornament_strip_2", sheet: "kit", x: 297, y: 1660, w: 164, h: 60, reason: "idem" },
];

/** Texto do pack: núcleo quase-branco/creme, r,g,b > 228. */
function brightPixels(data, w, h) {
  let n = 0;
  for (let i = 0; i < w * h * 4; i += 4) {
    if (data[i] > 228 && data[i + 1] > 228 && data[i + 2] > 228) n++;
  }
  return n;
}

/**
 * Guardrail por COMPONENTES CONECTADOS sobre pixels claros.
 *
 * Calibração medida nesta sheet (ver histórico do projeto):
 *   peças com texto: bhMed 16-25 (barra "100/100", título, botão "OK")
 *   ícones/ornamentos: bhMed 0-7 (espada, poção, seta, cofre, crista)
 *
 * A mediana da altura dos blobs é o que separa glifo de brilho especular:
 * um glifo tem 16-25 px de altura com contorno; um reflexo de metal é
 * um blob de 2-7 px.
 */
function glyphSignature(data, w, h) {
  const seen = new Uint8Array(w * h);
  const heights = [];
  const isBright = (x, y) => {
    const i = (y * w + x) * 4;
    return data[i] > 228 && data[i + 1] > 228 && data[i + 2] > 228;
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (seen[idx] || !isBright(x, y)) continue;
      const stack = [[x, y]];
      seen[idx] = 1;
      let miny = y, maxy = y, count = 0;
      while (stack.length) {
        const [cx, cy] = stack.pop();
        count++;
        if (cy < miny) miny = cy;
        if (cy > maxy) maxy = cy;
        for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]]) {
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const nidx = ny * w + nx;
          if (!seen[nidx] && isBright(nx, ny)) {
            seen[nidx] = 1;
            stack.push([nx, ny]);
          }
        }
      }
      if (count >= 6) heights.push(maxy - miny + 1);
    }
  }
  heights.sort((a, b) => a - b);
  const bhMed = heights.length ? heights[heights.length >> 1] : 0;
  return { bhMed, blobs: heights.length };
}

/**
 * Flood-fill do fundo da sheet para TRANSPARENTE, a partir das bordas do
 * recorte. Só o fundo CONECTADO à borda vira transparente: pixels escuros
 * dentro da arte (contornos, sombras) são preservados.
 */
function keyOutBackground(data, w, h) {
  // Estima a cor de fundo local pela mediana das bordas.
  const border = [];
  for (let x = 0; x < w; x++) {
    border.push([x, 0], [x, h - 1]);
  }
  for (let y = 1; y < h - 1; y++) {
    border.push([0, y], [w - 1, y]);
  }
  const rs = [], gs = [], bs = [];
  for (const [x, y] of border) {
    const i = (y * w + x) * 4;
    rs.push(data[i]); gs.push(data[i + 1]); bs.push(data[i + 2]);
  }
  rs.sort((a, b) => a - b); gs.sort((a, b) => a - b); bs.sort((a, b) => a - b);
  const br = rs[rs.length >> 1], bg = gs[gs.length >> 1], bb = bs[bs.length >> 1];

  const nearBg = (x, y) => {
    const i = (y * w + x) * 4;
    return Math.abs(data[i] - br) <= 9 && Math.abs(data[i + 1] - bg) <= 9 && Math.abs(data[i + 2] - bb) <= 9;
  };
  const visited = new Uint8Array(w * h);
  const stack = [];
  for (const [x, y] of border) {
    if (!visited[y * w + x] && nearBg(x, y)) {
      visited[y * w + x] = 1;
      stack.push([x, y]);
    }
  }
  while (stack.length) {
    const [x, y] = stack.pop();
    data[(y * w + x) * 4 + 3] = 0;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const nidx = ny * w + nx;
      if (!visited[nidx] && nearBg(nx, ny)) {
        visited[nidx] = 1;
        stack.push([nx, ny]);
      }
    }
  }
  return { bg: [br, bg, bb] };
}

async function extractPiece(buffer, region) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { w, h } = { w: info.width, h: info.height };
  const { bg } = keyOutBackground(data, w, h);
  const bright = brightPixels(data, w, h);
  const sig = glyphSignature(data, w, h);

  // GUARDRAIL: assinatura forte de texto reprova a peça (§62).
  const strongText = sig.bhMed >= 12 && sig.blobs >= 6;
  if (strongText) {
    return { status: "rejected_text", brightPixels: bright, ...sig, background: bg, out: null };
  }
  const out = await sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
  return { status: "ok", brightPixels: bright, ...sig, background: bg, out };
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const sources = {};
  for (const [key, path] of Object.entries(SHEETS)) {
    const meta = await sharp(path).metadata();
    if (meta.width !== SHEET_SIZE || meta.height !== SHEET_SIZE) {
      console.error(`[ui] ${path}: dimensão ${meta.width}x${meta.height} != ${SHEET_SIZE}x${SHEET_SIZE} — as coordenadas medidas não são válidas`);
      process.exit(1);
    }
    sources[key] = path;
    console.log(`[ui] fonte ${key}: ${meta.width}x${meta.height}`);
  }

  const report = [];
  const pieces = [...REGIONS, ...BAR_PARTS];
  let ok = 0, rejected = 0;

  for (const region of pieces) {
    const src = sources[region.sheet];
    const buffer = await sharp(src)
      .extract({ left: region.x, top: region.y, width: region.w, height: region.h })
      .png()
      .toBuffer();

    const result = await extractPiece(buffer, region);
    const entry = {
      id: region.id,
      status: result.status,
      source: region.sheet,
      bounds: { x: region.x, y: region.y, w: region.w, h: region.h },
      brightPixels: result.brightPixels,
      glyphBlobs: result.blobs,
      glyphBhMedian: result.bhMed,
    };
    if (region.slice9) entry.slice9 = region.slice9;
    if (region.role) entry.role = region.role;
    if (region.bar) entry.bar = region.bar;
    if (region.capOffsetY !== undefined) entry.capOffsetY = region.capOffsetY;

    if (result.status === "ok") {
      await writeFile(join(OUT, `${region.id}.png`), result.out);
      ok++;
      console.log(`[ui] ${region.id}  ${region.w}x${region.h}  bright=${result.brightPixels} bhMed=${result.bhMed}`);
    } else {
      rejected++;
      console.error(`[ui] ${region.id}: ASSINATURA DE TEXTO (bhMed=${result.bhMed}, blobs=${result.blobs}) — rejeitada (§62)`);
    }
    report.push(entry);
  }

  const composition = {
    note: "Composição de barras: trilho esticado + fill recortado pela fração + caps. Números em PT-BR renderizados pelo jogo, nunca na arte.",
    bandHeight: 101,
    capHeight: 114,
    capOffsetY: -7,
    fillClip: "recortar bar_fill_* horizontalmente pela fração preenchida; o lado esquerdo é a origem do fill",
    ids: {
      track: "ui/bar_track",
      fills: { hp: "ui/bar_fill_hp", mp: "ui/bar_fill_mp", xp: "ui/bar_fill_xp" },
      capLeft: ["ui/bar_cap_left_heart", "ui/bar_cap_left_orb"],
      capRight: "ui/bar_cap_right",
    },
  };

  await writeFile(
    join(OUT, "extraction-report.json"),
    `${JSON.stringify(
      {
        source: Object.fromEntries(Object.entries(SHEETS).map(([k, v]) => [k, v.replace(ROOT + "/", "")])),
        method: "allowlist_curada_em_pixels + guardrail_componentes_conectados",
        sheetSize: SHEET_SIZE,
        composition,
        pieces: report,
        rejected: REJECTED,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log(`\n[ui] ${ok} peças extraídas, ${rejected} rejeitadas pelo guardrail`);
  const existing = await readdir(OUT).catch(() => []);
  console.log(`[ui] arquivos em assets/generated/ui: ${existing.length}`);
  if (rejected > 0) process.exit(1);
}

main().catch((error) => {
  console.error("[ui] erro:", error);
  process.exit(1);
});
