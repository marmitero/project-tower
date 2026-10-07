import { readdirSync, existsSync } from "fs";
import { join } from "path";
import { readRaw, writePng, bbox, crop, resizeSmart } from "../tools/art/image.mjs";
import { chromaKey, removeIslands } from "../tools/art/key.mjs";

const INCOMING = "assets/_incoming/L_UI_2";
const OUT = "assets/generated/ui";

const SPECS = [
  { file: "raw_mannequin_silhouette.png", out: "mannequin_silhouette.png", maxW: 192, maxH: 260 },
  { file: "raw_pedestal_stone.png", out: "pedestal_stone.png", maxW: 192, maxH: 80 },
  { file: "raw_portcullis_lock.png", out: "portcullis_lock.png", maxW: 160, maxH: 160 },
  { file: "raw_parchment_scroll.png", out: "parchment_scroll.png", maxW: 320, maxH: 440 },
  { file: "raw_chat_header_scroll.png", out: "chat_header_scroll.png", maxW: 360, maxH: 64 },
  { file: "raw_class_crest_warrior.png", out: "class_crest_warrior.png", maxW: 64, maxH: 64 },
  { file: "raw_class_crest_cleric.png", out: "class_crest_cleric.png", maxW: 64, maxH: 64 },
  { file: "raw_class_crest_mage.png", out: "class_crest_mage.png", maxW: 64, maxH: 64 },
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
