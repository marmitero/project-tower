/**
 * Kit de arena: fatia a folha 4×4 (1 geração) em ladrilhos 128×128 e mede o que importa à arena
 * (emenda em X entre ladrilhos sorteados, luminância do piso). Zero geração.
 *
 * Layout pedido ao gerador (docs/ART_PIPELINE.md §4.3):
 *   linha 1 = parede ×4 · linha 2 = fixture(tocha), banner, marco(portão), parede extra
 *   linha 3 = piso ×4    · linha 4 = adereços ×4 (sobre magenta)
 */
import { ARENA } from "./spec.mjs";
import { chromaKey } from "./key.mjs";
import { crop, resizeSmart, cloneRaw } from "./image.mjs";
import { makeSeamlessX, meanLuma, stripTest } from "./seamless.mjs";

export const KIT_LAYOUT = Object.freeze([
  "wall_0", "wall_1", "wall_2", "wall_3",
  "torch", "banner", "gate", "wall_4",
  "floor_0", "floor_1", "floor_2", "floor_3",
  "prop_0", "prop_1", "prop_2", "prop_3",
]);

function isMag(r, g, b) {
  return r > 180 && g < 70 && b > 180;
}

function cleanTileBorders(tile) {
  const { w, h, data } = tile;
  for (let x = 0; x < w; x++) {
    const i0 = x * 4;
    if (isMag(data[i0], data[i0 + 1], data[i0 + 2])) {
      const src = (w + x) * 4;
      data[i0] = data[src];
      data[i0 + 1] = data[src + 1];
      data[i0 + 2] = data[src + 2];
      data[i0 + 3] = 255;
    }
    const iB = ((h - 1) * w + x) * 4;
    if (isMag(data[iB], data[iB + 1], data[iB + 2])) {
      const src = ((h - 2) * w + x) * 4;
      data[iB] = data[src];
      data[iB + 1] = data[src + 1];
      data[iB + 2] = data[src + 2];
      data[iB + 3] = 255;
    }
  }
  for (let y = 0; y < h; y++) {
    const iL = (y * w) * 4;
    if (isMag(data[iL], data[iL + 1], data[iL + 2])) {
      const src = (y * w + 1) * 4;
      data[iL] = data[src];
      data[iL + 1] = data[src + 1];
      data[iL + 2] = data[src + 2];
      data[iL + 3] = 255;
    }
    const iR = (y * w + w - 1) * 4;
    if (isMag(data[iR], data[iR + 1], data[iR + 2])) {
      const src = (y * w + w - 2) * 4;
      data[iR] = data[src];
      data[iR + 1] = data[src + 1];
      data[iR + 2] = data[src + 2];
      data[iR + 3] = 255;
    }
  }
}

function unifyHorizontalSeams(tilesList, margin = 14) {
  if (!tilesList || tilesList.length === 0) return;
  const base = tilesList[0];
  const { w, h } = base;
  const edge = new Uint8Array(h * 4);
  for (let y = 0; y < h; y++) {
    const il = (y * w + 0) * 4;
    const ir = (y * w + w - 1) * 4;
    for (let c = 0; c < 3; c++) {
      edge[y * 4 + c] = Math.round((base.data[il + c] + base.data[ir + c]) / 2);
    }
    edge[y * 4 + 3] = 255;
  }
  for (const tile of tilesList) {
    for (let y = 0; y < h; y++) {
      const eIdx = y * 4;
      for (let x = 0; x < margin; x++) {
        const wt = x / margin;
        const idx = (y * w + x) * 4;
        for (let c = 0; c < 3; c++) {
          tile.data[idx + c] = Math.round(edge[eIdx + c] * (1 - wt) + tile.data[idx + c] * wt);
        }
      }
      for (let x = w - margin; x < w; x++) {
        const wt = (w - 1 - x) / margin;
        const idx = (y * w + x) * 4;
        for (let c = 0; c < 3; c++) {
          tile.data[idx + c] = Math.round(edge[eIdx + c] * (1 - wt) + tile.data[idx + c] * wt);
        }
      }
    }
  }
}

/** @returns {{tiles: Record<string, {w:number,h:number,data:Uint8Array}>, report: object}} */
export function sliceKit(sheet, { seamless = false, floorGain = 1 } = {}) {
  const cell = sheet.w / 4;
  const tiles = {};
  KIT_LAYOUT.forEach((name, i) => {
    let raw = crop(sheet, (i % 4) * cell, Math.floor(i / 4) * cell, cell, cell);
    const isProp = name.startsWith("prop_");
    const isFixture = name === "torch" || name === "banner" || name === "gate";
    const isWallOrFixture = name.startsWith("wall_") || isFixture;

    // Se o gerador deixou margem de magenta no topo/base da parede, recorta a parte de conteúdo
    if (isWallOrFixture) {
      let minY = cell, maxY = 0;
      for (let y = 0; y < cell; y++) {
        let nonMagInRow = 0;
        for (let x = 0; x < cell; x++) {
          const idx = (y * cell + x) * 4;
          if (!isMag(raw.data[idx], raw.data[idx + 1], raw.data[idx + 2])) nonMagInRow++;
        }
        if (nonMagInRow > cell * 0.1) {
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
      const spanH = maxY - minY + 1;
      // Se houver mais de 10% de magenta cortando o topo ou o fundo, recortar a área útil
      if (minY > Math.round(cell * 0.08) || maxY < Math.round(cell * 0.92)) {
        if (spanH >= Math.round(cell * 0.4)) {
          raw = crop(raw, 0, minY, cell, spanH);
        }
      }
    }

    let tile = isProp ? chromaKey(raw).raw : raw;
    tile = resizeSmart(tile, ARENA.tile, ARENA.tile);
    if (!isProp) {
      // Limpa bordas residuais de grade/magenta
      cleanTileBorders(tile);

      // Se for fixture e ficou com magenta no fundo, compor sobre a parede base
      if (isFixture && tiles.wall_0) {
        let magInTile = 0;
        for (let p = 0; p < tile.data.length; p += 4) {
          if (isMag(tile.data[p], tile.data[p + 1], tile.data[p + 2])) magInTile++;
        }
        if (magInTile > 10) {
          const comp = cloneRaw(tiles.wall_0);
          for (let y = 0; y < tile.h; y++) {
            for (let x = 0; x < tile.w; x++) {
              const idx = (y * tile.w + x) * 4;
              if (!isMag(tile.data[idx], tile.data[idx + 1], tile.data[idx + 2])) {
                comp.data[idx] = tile.data[idx];
                comp.data[idx + 1] = tile.data[idx + 1];
                comp.data[idx + 2] = tile.data[idx + 2];
                comp.data[idx + 3] = 255;
              }
            }
          }
          tile = comp;
        }
      }

      // Ladrilhos de parede/piso são opacos: descarta qualquer alfa residual do reamostrador
      for (let p = 3; p < tile.data.length; p += 4) tile.data[p] = 255;
      if (seamless) tile = makeSeamlessX(tile);
      // Piso claro demais apaga o contraste com o sprite (luminância 25–55 %): ganho multiplicativo
      // determinístico, só no piso (ADR-036) — zero geração
      if (name.startsWith("floor_") && floorGain !== 1) {
        for (let p = 0; p < tile.data.length; p += 4) for (let c = 0; c < 3; c += 1) tile.data[p + c] = Math.min(255, Math.round(tile.data[p + c] * floorGain));
      }
    }
    tiles[name] = tile;
  });
  const group = (prefix) => KIT_LAYOUT.filter((n) => n.startsWith(prefix)).map((n) => tiles[n]);
  const walls = [...group("wall_"), tiles.torch, tiles.banner, tiles.gate];
  const floors = group("floor_");
  if (seamless) {
    unifyHorizontalSeams(walls, 14);
    unifyHorizontalSeams(floors, 14);
  }
  const wallStrip = stripTest(walls, 24);
  const floorStrip = stripTest(floors, 24);
  const luma = floors.map(meanLuma);
  return {
    tiles,
    wallStrip: wallStrip.strip,
    floorStrip: floorStrip.strip,
    report: {
      wallSeam: { mean: wallStrip.mean, max: wallStrip.max, ok: wallStrip.ok },
      floorSeam: { mean: floorStrip.mean, max: floorStrip.max, ok: floorStrip.ok },
      floorLuma: luma,
      floorLumaOk: luma.every((l) => l >= ARENA.floorLuma[0] && l <= ARENA.floorLuma[1]),
    },
  };
}
