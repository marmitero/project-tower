#!/usr/bin/env node
/**
 * Monta as REFERÊNCIAS de um lote de arte a partir do que já está commitado (zero geração).
 *
 * Por que existe: `assets/_incoming/` e `assets/_review/` são ignorados pelo Git e o sandbox é reciclado
 * entre sessões — os guias e as referências de estilo somem. Este script os recria em
 * `assets/_incoming/refs/` (pasta ignorada) para serem anexados ao `generate_image`.
 *
 *   node scripts/art-refs.mjs            # monta tudo
 *
 * Saída (`assets/_incoming/refs/`):
 *   guide_<arquétipo>.magenta.png   atlas-guia 4×5 (hero archer mage necromancer orc goblin slime bat skeleton boss)
 *   style_<id>.png                  atlas aprovados para servir de estilo (heróis e inimigos)
 *   kit_<andar>.png                 kit de arena 4×4 recomposto dos 16 ladrilhos (referência de kit)
 *   king_ref.png                    folha 2×2 de retratos do Rei sobre magenta (referência de retratos)
 * Veja docs/ART_HANDOFF.md §5 (receitas de prompt) para saber qual anexar a cada geração.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildGuide, guideOnMagenta } from "../tools/art/atlas.mjs";
import { KIT_LAYOUT } from "../tools/art/kit.mjs";
import { blit, newRaw, readRaw, resizeSmart, writePng } from "../tools/art/image.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "assets/_incoming/refs");
const GEN = join(ROOT, "assets/generated");
mkdirSync(OUT, { recursive: true });

const GUIDES = ["hero", "archer", "mage", "necromancer", "orc", "goblin", "slime", "bat", "skeleton", "boss"];
for (const g of GUIDES) {
  const guide = await buildGuide(join(ROOT, "assets/sprites/characters"), g);
  await writePng(guideOnMagenta(guide), join(OUT, `guide_${g}.magenta.png`));
}

const STYLES = [
  "heroes/guardian_borin", "heroes/ranger_kaia", "heroes/cleric_aurora", "heroes/arcanist_pyro",
  "enemies/mud_toad", "enemies/goblin_captain", "enemies/spark_imp", "enemies/candle_skull", "enemies/royal_mummy",
];
for (const s of STYLES) {
  const src = join(GEN, `${s}.png`);
  if (existsSync(src)) copyFileSync(src, join(OUT, `style_${s.split("/")[1]}.png`));
}

// kit de arena 4×4 (ladrilhos 128 ampliados 2× para 256x256, preenchendo a célula; props sobre magenta)
const arenaDir = join(GEN, "arenas");
for (const floor of readdirSync(arenaDir)) {
  const sheet = newRaw(1024, 1024, [255, 0, 255, 255]);
  for (let i = 0; i < KIT_LAYOUT.length; i += 1) {
    const name = KIT_LAYOUT[i];
    const f = join(arenaDir, floor, `${name}.png`);
    if (!existsSync(f)) continue;
    const tile = await readRaw(f);
    const isProp = name.startsWith("prop_");
    if (isProp) {
      // Adereço centralizado sobre magenta
      blit(sheet, tile, (i % 4) * 256 + 64, Math.floor(i / 4) * 256 + 64);
    } else {
      // Parede, fixture e piso preenchem toda a célula 256×256 (2× nearest) sem margem de magenta
      const scaled = resizeSmart(tile, 256, 256);
      blit(sheet, scaled, (i % 4) * 256, Math.floor(i / 4) * 256);
    }
  }
  await writePng(sheet, join(OUT, `kit_${floor}.png`));
}

// folha 2×2 de retratos do Rei (512 → 256 por quadrante via blit simples dos _s de 256)
const king = newRaw(512, 512, [255, 0, 255, 255]);
for (const [i, id] of ["rei_real", "rei_guerreiro", "rainha", "rei_sabio"].entries()) {
  const f = join(GEN, "portraits/king", `${id}_s.png`);
  if (existsSync(f)) blit(king, await readRaw(f), (i % 2) * 256, Math.floor(i / 2) * 256);
}
await writePng(king, join(OUT, "king_ref.png"));
console.log(`referências montadas em ${OUT} (${readdirSync(OUT).length} arquivos)`);
