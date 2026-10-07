import { existsSync } from "fs";
import { join } from "path";
import { readRaw, writePng, bbox, crop, resizeSmart } from "../tools/art/image.mjs";
import { chromaKey, removeIslands } from "../tools/art/key.mjs";

const INCOMING = "assets/_incoming/L_UI_3";
const OUT = "assets/generated/ui";

const SPECS = [
  { file: "raw_class_crest_rogue.png", out: "class_crest_rogue.png", maxW: 64, maxH: 64 },
  { file: "raw_paperdoll_frame.png", out: "paperdoll_frame.png", maxW: 240, maxH: 320 },
  { file: "raw_market_canopy.png", out: "market_canopy.png", maxW: 384, maxH: 96 },
  { file: "raw_scales_mercantile.png", out: "scales_mercantile.png", maxW: 96, maxH: 96 },
  { file: "raw_wax_seal_gold.png", out: "wax_seal_gold.png", maxW: 64, maxH: 64 },
  { file: "raw_wax_seal_ruby.png", out: "wax_seal_ruby.png", maxW: 64, maxH: 64 },
  { file: "raw_chest_vault_open.png", out: "chest_vault_open.png", maxW: 96, maxH: 96 },
  { file: "raw_torch_sconce.png", out: "torch_sconce.png", maxW: 48, maxH: 96 },
];

for (const spec of SPECS) {
  const inPath = join(INCOMING, spec.file);
  const outPath = join(OUT, spec.out);
  if (!existsSync(inPath)) {
    console.error(`Arquivo ausente: ${inPath}`);
    continue;
  }
  const raw = await readRaw(inPath);
  const keyed = chromaKey(raw, { islands: 16 }).raw;
  // despill rosado residual
  for (let p = 0; p < keyed.data.length; p += 4) {
    if (keyed.data[p + 3] && Math.min(keyed.data[p], keyed.data[p + 2]) - keyed.data[p + 1] > 35) {
      keyed.data[p + 3] = 0;
    }
  }
  removeIslands(keyed, 40);
  const box = bbox(keyed, 32);
  if (!box) {
    console.error(`Bbox vazio para ${spec.file}`);
    continue;
  }
  const trimmed = crop(keyed, box.x0, box.y0, box.w, box.h);
  const scale = Math.min(spec.maxW / trimmed.w, spec.maxH / trimmed.h, 1.0);
  const targetW = Math.max(4, Math.round(trimmed.w * scale));
  const targetH = Math.max(4, Math.round(trimmed.h * scale));
  const scaled = resizeSmart(trimmed, targetW, targetH);
  await writePng(scaled, outPath);
  console.log(`Ingerido: ${spec.out} (${scaled.w}x${scaled.h}) a partir de ${spec.file} [${trimmed.w}x${trimmed.h}]`);
}
