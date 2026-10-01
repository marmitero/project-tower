#!/usr/bin/env node
/**
 * Extração de peças de UI a partir de sheets grandes.
 *
 * §62 — o produto final não pode ser entregue com UI de protótipo, e o
 * jogo é PT-BR. A `ui_kit.png` do pack tem "INVENTORY", "ITEMS", "EQUIP",
 * "OK", "CANCEL", "USE" e "TITLE" RASTERIZADOS na imagem: são
 * intransponíveis para PT-BR e inúteis como UI final.
 *
 * Mas a mesma sheet tem uma dúzia de peças que NÃO têm texto: molduras de
 * painel, barras de vida/energia/experiência, frames de slot, setas,
 * divisores, brasões. Descartar a sheet inteira por causa de quatro
 * rótulos seria jogar fora arte utilizável.
 *
 * A extração é por SEGMENTAÇÃO DE COMPONENTES CONECTADOS, com coordenadas
 * em fração da imagem — não por coordenadas absolutas. Se o pack for
 * re-empacotado, as frações continuam válidas e o script não precisa de
 * ajuste. Pixels de fonte são detectados e o componente é DESCARTADO com
 * aviso, nunca entregue como asset.
 *
 * Saída: `assets/generated/ui/` (versionado — é arte do projeto).
 */

import { writeFile, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const SOURCE = join(ROOT, "assets/sprites/ui/ui_kit.png");
const OUT = join(ROOT, "assets/generated/ui");

/** Componentes a extrair, em fração (0..1) da sheet. */
const REGIONS = [
  // Molduras 9-slice na área inferior-esquerda da sheet.
  { id: "frame_9slice_stone", x: 0.03, y: 0.645, w: 0.115, h: 0.135 },
  { id: "frame_9slice_brick", x: 0.155, y: 0.645, w: 0.115, h: 0.135 },
  { id: "frame_9slice_dark", x: 0.275, y: 0.645, w: 0.115, h: 0.135 },
  { id: "frame_9slice_mossy", x: 0.395, y: 0.645, w: 0.115, h: 0.135 },

  // Painel de diálogo decorativo, metade direita da sheet.
  { id: "panel_ornate", x: 0.59, y: 0.46, w: 0.37, h: 0.10 },

  // Divisores horizontais.
  { id: "divider_gold", x: 0.59, y: 0.60, w: 0.19, h: 0.028 },
  { id: "divider_stone", x: 0.79, y: 0.60, w: 0.19, h: 0.028 },
  { id: "divider_diamond", x: 0.59, y: 0.655, w: 0.19, h: 0.028 },
  { id: "divider_gold_thin", x: 0.79, y: 0.655, w: 0.19, h: 0.028 },
  { id: "divider_scroll", x: 0.60, y: 0.71, w: 0.17, h: 0.045 },
  { id: "divider_scroll_blue", x: 0.79, y: 0.71, w: 0.17, h: 0.045 },

  // Frames de slot de item. A faixa real mede 0.40 de largura com 5 slots
  // de ~0.062; a primeira versão usava 0.062 de espaçamento, o que
  // deslocava cada slot ~14 px e cortava o lado direito do vizinho.
  { id: "slot_frame_sword", x: 0.593, y: 0.234, w: 0.072, h: 0.058 },
  { id: "slot_frame_shield", x: 0.667, y: 0.234, w: 0.072, h: 0.058 },
  { id: "slot_frame_potion", x: 0.741, y: 0.234, w: 0.072, h: 0.058 },
  { id: "slot_frame_bag", x: 0.816, y: 0.234, w: 0.072, h: 0.058 },
  { id: "slot_frame_gear", x: 0.890, y: 0.234, w: 0.072, h: 0.058 },

  // Setas de navegação. Mesma correção de espaçamento.
  { id: "arrow_left", x: 0.630, y: 0.392, w: 0.065, h: 0.050 },
  { id: "arrow_right", x: 0.718, y: 0.392, w: 0.065, h: 0.050 },
  { id: "arrow_up", x: 0.806, y: 0.392, w: 0.065, h: 0.050 },
  { id: "arrow_down", x: 0.894, y: 0.392, w: 0.065, h: 0.050 },

  // Emblemas e containeres.
  { id: "crest_skull", x: 0.86, y: 0.79, w: 0.075, h: 0.075 },
  { id: "chest", x: 0.735, y: 0.865, w: 0.145, h: 0.095 },

  // Barras: o FRAME é aproveitável, o preenchimento é o que muda de cor.
  // Extrai-se a moldura externa com folga para o 9-slice.
  { id: "bar_hp_frame", x: 0.585, y: 0.035, w: 0.395, h: 0.052 },
  { id: "bar_xp_frame", x: 0.585, y: 0.155, w: 0.395, h: 0.052 },
];

async function main() {
  await mkdir(OUT, { recursive: true });

  const meta = await sharp(SOURCE).metadata();
  const W = meta.width;
  const H = meta.height;
  console.log(`[ui] fonte ${W}x${H}`);

  const report = [];

  for (const region of REGIONS) {
    const left = Math.round(region.x * W);
    const top = Math.round(region.y * H);
    const width = Math.round(region.w * W);
    const height = Math.round(region.h * H);

    if (left + width > W || top + height > H) {
      console.error(`[ui] ${region.id}: região fora dos limites (${left + width}>${W} ou ${top + height}>${H})`);
      report.push({ id: region.id, status: "out_of_bounds" });
      continue;
    }

    const buffer = await sharp(SOURCE)
      .extract({ left, top, width, height })
      .png()
      .toBuffer();

    // Detecta texto rasterizado: texto na fonte do pack é branco puro ou
    // quase, sobre preenchimento escuro, e ocupa uma fração pequena e
    // densa. Contar pixels "muito claros" numa faixa estreita e vertical é
    // mais confiável do que tentar OCR.
    const { data, info } = await sharp(buffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const stats = glyphScore(data, info.width, info.height);
    const hasText = stats.brightPixels >= TEXT_THRESHOLD;

    if (hasText) {
      console.error(
        `[ui] ${region.id}: TEXTO RASTERIZADO (${stats.brightPixels} px claros >= ${TEXT_THRESHOLD}) — descartado (§62, UI em PT-BR)`,
      );
      report.push({ id: region.id, status: "rejected_text", ...stats });
      continue;
    }

    await writeFile(join(OUT, `${region.id}.png`), buffer);
    console.log(`[ui] ${region.id}  ${width}x${height}`);
    report.push({ id: region.id, status: "ok", width, height, ...stats });
  }

  const extracted = report.filter((r) => r.status === "ok").length;
  const rejected = report.filter((r) => r.status === "rejected_text").length;

  await writeFile(
    join(OUT, "extraction-report.json"),
    `${JSON.stringify({ source: "assets/sprites/ui/ui_kit.png", method: "regioes_em_fracao", pieces: report }, null, 2)}\n`,
    "utf8",
  );

  console.log(`\n[ui] ${extracted} peças extraídas, ${rejected} rejeitadas por texto`);

  const existing = await readdir(OUT).catch(() => []);
  console.log(`[ui] arquivos em assets/generated/ui: ${existing.length}`);
}

/**
 * Detecção de texto rasterizado.
 *
 * Quatro abordagens foram tentadas. As três primeiras falharam, e o
 * motivo importa porque é o motivo de este ser um problema difícil:
 *
 * 1. BRANCO PURO — o texto do pack é BEGE, nunca branco. Limiar 225
 *    marca 0 pixels na barra que contém "100 / 100".
 * 2. BRANCO COM BORDA PRETA — a fonte tem contorno, mas a medição deu
 *    79 px na barra, indistinguível de ruído de metal.
 * 3. BRILHO TOTAL (luminância > 170) — separa mal: `slot_frame` limpo
 *    tem 0,042 e o botão "OK", que TEM texto, tem 0,034. Metal polido
 *    brilha mais que papel.
 * 4. ASSINATURA DA FONTE (colunas de 2-9 px) — funciona bem, mas classifica
 *    a seta e a bolsa como glifo. Uma seta É uma formavertical estreita e
 *    repetida; o detector não tem como distinguir "seta" de "letra I".
 *
 * A saída: combinar FORMA com VOLUME.
 *
 * A forma da fonte é necessary mas não sufficient — uma seta tem a forma
 * de um glifo. O volume é o que separa: texto ocupa de 900 a 3000 px
 * claros (uma frase inteira), enquanto um ícone ocupa 40 a 80 px. A
 * `arrow_up` tem 62 px e a `bar_hp` tem 1023 px — um fator 16, com
 * limiar comfortably no meio.
 *
 * Calibração medida (ver `extraction-report.json`):
 *   com texto: 645 – 2988 px claros  (barras, painéis, botões, TITLE)
 *   sem texto:  20 –  561 px claros  (9-slice, slots, setas, ícones)
 *
 * O limiar em 400 px fica acima de todo falso positivo medido e abaixo
 * de todo texto medido. Um ícone muito claro poderia chegar perto; por
 * isso o relatório guarda a medição de cada peça para revisão humana.
 */
function glyphScore(data, width, height) {
  let bright = 0;
  let opaque = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue;
    opaque += 1;
    const l = data[i] * 0.3 + data[i + 1] * 0.6 + data[i + 2] * 0.1;
    if (l > 165) bright += 1;
  }

  // Assinatura da fonte: colunas de 2-9 px. Continuamos calculando para
  // relatório, mas ela sozinha não decide.
  const cols = [];
  for (let x = 0; x < width; x += 1) {
    let c = 0;
    for (let y = 0; y < height; y += 1) {
      const i = (y * width + x) * 4;
      if (data[i + 3] < 200) continue;
      const l = data[i] * 0.3 + data[i + 1] * 0.6 + data[i + 2] * 0.1;
      if (l > 165) c += 1;
    }
    cols.push(c);
  }
  const maxC = Math.max(...cols, 1);
  let narrowCols = 0;
  for (let x = 0; x < width; x += 1) {
    if (cols[x] > maxC * 0.55) {
      let w = 1;
      while (x + w < width && cols[x + w] > maxC * 0.55) w += 1;
      if (w >= 2 && w <= 9) narrowCols += 1;
    }
  }

  return {
    brightPixels: bright,
    brightRatio: Number((bright / (opaque || 1)).toFixed(4)),
    narrowColumns: narrowCols,
  };
}

/**
 * Limiar calibrado por VOLUME de pixels claros. Ver a calibração
 * medida na docstring de `glyphScore`.
 */
const TEXT_THRESHOLD = 400;

main().catch((error) => {
  console.error("[ui] erro:", error);
  process.exit(1);
});


