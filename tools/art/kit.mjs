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
import { crop, resizeSmart } from "./image.mjs";
import { makeSeamlessX, meanLuma, stripTest } from "./seamless.mjs";

export const KIT_LAYOUT = Object.freeze([
  "wall_0", "wall_1", "wall_2", "wall_3",
  "torch", "banner", "gate", "wall_4",
  "floor_0", "floor_1", "floor_2", "floor_3",
  "prop_0", "prop_1", "prop_2", "prop_3",
]);

/** @returns {{tiles: Record<string, {w:number,h:number,data:Uint8Array}>, report: object}} */
export function sliceKit(sheet, { seamless = false } = {}) {
  const cell = sheet.w / 4;
  const tiles = {};
  KIT_LAYOUT.forEach((name, i) => {
    const raw = crop(sheet, (i % 4) * cell, Math.floor(i / 4) * cell, cell, cell);
    const isProp = name.startsWith("prop_");
    let tile = isProp ? chromaKey(raw).raw : raw;
    tile = resizeSmart(tile, ARENA.tile, ARENA.tile);
    if (!isProp) {
      // ladrilhos de parede/piso são opacos: descarta qualquer alfa residual do reamostrador
      for (let p = 3; p < tile.data.length; p += 4) tile.data[p] = 255;
      if (seamless) tile = makeSeamlessX(tile);
    }
    tiles[name] = tile;
  });
  const group = (prefix) => KIT_LAYOUT.filter((n) => n.startsWith(prefix)).map((n) => tiles[n]);
  const walls = [...group("wall_"), tiles.torch, tiles.banner, tiles.gate];
  const wallStrip = stripTest(walls, 24);
  const floorStrip = stripTest(group("floor_"), 24);
  const luma = group("floor_").map(meanLuma);
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
