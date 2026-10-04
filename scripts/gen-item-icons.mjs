// Converte as artes-fonte dos ícones de equipamento (fundo magenta #FF00FF) em PNG 64×64
// transparente, em `assets/generated/items/<nome>.png`.
//
// Uso: node scripts/gen-item-icons.mjs <pasta-com-gen_<nome>.png>
// Os ícones que o pack Nika não traz (elmo, botas, manoplas, peitoral, calça, asas, besta, ataduras) e os do Market (revives e caixas)
// foram GERADOS (IA) no estilo dos ícones do pack; as fontes grandes não são versionadas,
// só o resultado de 64 px. Registro em `assets/SOURCES.md`.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const NAMES = { gen_helm: "helm", gen_boots: "boots", gen_glove: "glove", gen_chest: "chest", gen_legs: "legs", gen_wings: "wings", gen_crossbow: "crossbow", gen_wraps: "wraps", gen_revive1: "revive_basic", gen_revive2: "revive_improved", gen_revive3: "revive_magic", gen_box1: "box_basic", gen_box2: "box_rare", gen_box3: "box_legendary" };
const [src = "/tmp/ic"] = process.argv.slice(2);
const out = join(process.cwd(), "assets/generated/items");
await mkdir(out, { recursive: true });

for (const [file, name] of Object.entries(NAMES)) {
  if (!existsSync(join(src, `${file}.png`))) continue; // só regenera o que tem fonte
  const { data, info } = await sharp(join(src, `${file}.png`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  // chave de cor: quanto mais perto de magenta puro, mais transparente (borda suave)
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const magentaness = Math.min(r, b) - g; // alto = magenta
    if (magentaness > 120 && r > 150 && b > 150) data[i + 3] = 0;
    else if (magentaness > 60 && r > 120 && b > 120) {
      data[i + 3] = Math.round(255 * (1 - (magentaness - 60) / 60));
      // remove o halo rosa
      data[i] = Math.min(data[i], data[i + 1] + 40);
      data[i + 2] = Math.min(data[i + 2], data[i + 1] + 40);
    }
  }
  const keyed = await sharp(data, { raw: info }).png().toBuffer();
  await sharp(keyed)
    .trim({ threshold: 1 })
    .resize(60, 60, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: "lanczos3" })
    .extend({ top: 2, bottom: 2, left: 2, right: 2, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(join(out, `${name}.png`));
  console.log("ok", name);
}
