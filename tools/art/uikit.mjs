/**
 * Kit de botões GBA (docs/STYLIZATION_ROADMAP.md §5.2): fatia a folha 4×4 (1 geração), apara
 * cada botão, reduz para a escala de jogo e gera as cores extras por recolor (0 geração).
 */
import { chromaKey } from "./key.mjs";
import { bbox, blit, crop, newRaw, resizeSmart } from "./image.mjs";
import { removeIslands } from "./key.mjs";
import { dominantHue, recolor } from "./recolor.mjs";

/** Escala de jogo: 1/4 do bruto (o pixel de arte gerado tem ≈ 8 px). */
export const UIKIT = Object.freeze({
  shrink: 4,
  /** células da folha → nome (null = descartada: o foco vira `outline` em CSS). */
  cells: [
    "indigo_normal", "indigo_hover", "indigo_pressed", "indigo_disabled",
    "silver_normal", "silver_hover", "silver_pressed", "silver_disabled",
    null, null, "round_normal", "round_pressed",
    "toggle_off", "toggle_on", "tab_on", "tab_off",
  ],
  /** cores extras = recolor do índigo (matiz alvo em graus). */
  extras: { ruby: 350, emerald: 140, amber: 38 },
  recolored: ["normal", "hover", "pressed", "disabled"],
});

export function sliceButtons(sheet) {
  const cell = sheet.w / 4;
  const out = {};
  UIKIT.cells.forEach((name, i) => {
    if (!name) return;
    let raw = crop(sheet, (i % 4) * cell, Math.floor(i / 4) * cell, cell, cell);
    if (name.startsWith("round_")) {
      // os anéis de foco que o gerador desenhou ficam fora do recorte central
      const m = Math.round(cell * 0.27);
      raw = crop(raw, m, m, cell - 2 * m, cell - 2 * m);
    }
    const keyed = chromaKey(raw, { islands: 12 }).raw;
    // a sombra do botão sai magenta-escura (não é a cor-chave exata): some junto com qualquer tom rosado
    for (let p = 0; p < keyed.data.length; p += 4) {
      if (keyed.data[p + 3] && Math.min(keyed.data[p], keyed.data[p + 2]) - keyed.data[p + 1] > 40) keyed.data[p + 3] = 0;
    }
    removeIslands(keyed, 60);
    const box = bbox(keyed, 64);
    if (!box) throw new Error(`célula vazia: ${name}`);
    const trimmed = crop(keyed, box.x0, box.y0, box.w, box.h);
    out[name] = resizeSmart(trimmed, Math.max(4, Math.round(box.w / UIKIT.shrink)), Math.max(4, Math.round(box.h / UIKIT.shrink)));
  });
  // todos os estados de uma família ficam com a MESMA caixa (alinhados pela base): o `pressed`
  // aparece 2 px mais baixo sem mudar o tamanho do botão
  const families = {};
  for (const name of Object.keys(out)) (families[name.split("_")[0]] ??= []).push(name);
  for (const names of Object.values(families)) {
    const h = Math.max(...names.map((n) => out[n].h));
    const w = Math.max(...names.map((n) => out[n].w));
    for (const n of names) {
      const padded = newRaw(w, h);
      blit(padded, out[n], (w - out[n].w) >> 1, h - out[n].h);
      out[n] = padded;
    }
  }
  for (const [colour, hue] of Object.entries(UIKIT.extras)) {
    for (const state of UIKIT.recolored) {
      const base = out[`indigo_${state}`];
      out[`${colour}_${state}`] = recolor(base, { from: dominantHue(out.indigo_normal), to: hue, width: 70, satMul: state === "disabled" ? 0.8 : 1 });
    }
  }
  return out;
}

/** Ícones de menu (4×4 → 16 de 64×64, centrados). Ordem pedida ao gerador. */
export const ICON_NAMES = Object.freeze([
  "crown", "helmet", "banner", "backpack",
  "market", "tower", "swords", "gear",
  "potion", "rest", "enter", "back",
  "mute", "chat", "close", "data",
]);

export function sliceIcons(sheet, size = 64, fill = 58) {
  const cell = sheet.w / 4;
  const out = {};
  ICON_NAMES.forEach((name, i) => {
    const keyed = chromaKey(crop(sheet, (i % 4) * cell, Math.floor(i / 4) * cell, cell, cell), { islands: 12 }).raw;
    const box = bbox(keyed, 64);
    if (!box) throw new Error(`ícone vazio: ${name}`);
    const trimmed = crop(keyed, box.x0, box.y0, box.w, box.h);
    const k = fill / Math.max(box.w, box.h);
    const scaled = resizeSmart(trimmed, Math.max(4, Math.round(box.w * k)), Math.max(4, Math.round(box.h * k)));
    const tile = newRaw(size, size);
    blit(tile, scaled, (size - scaled.w) >> 1, (size - scaled.h) >> 1);
    out[name] = tile;
  });
  return out;
}
