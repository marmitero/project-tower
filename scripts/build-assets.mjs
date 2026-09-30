#!/usr/bin/env node
/**
 * Pipeline de assets.
 *
 * §62 — o produto final não pode ser entregue com quadrados, círculos,
 * emojis ou UI de protótipo. Este script é o que torna isso MECÂNICAMENTE
 * verificável: ele varre o pack, gera o manifesto `id -> caminho` e falha
 * se o catálogo exigir algo que não existe.
 *
 * Por que falhar e não avisar: um aviso no log some na primeira semana.
 * um `exit 1` no CI impede que o build chegue perto de um jogador.
 *
 * Uso:
 *   node scripts/build-assets.mjs [--src assets/sprites] [--out apps/game-web/public/assets] [--check]
 *
 * A fonte padrão é `assets/sprites/`, que NÃO é versionada (ver
 * `assets/SOURCES.md`). Sem ela, este script falha com exit 1 — e isso é
 * o comportamento correto: um build que serve placeholder como produto é
 * pior do que um build que não acontece.
 */

import { readdir, mkdir, writeFile, copyFile } from "node:fs/promises";
import { join, relative, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");

function parseArgs(argv) {
  const args = { src: "assets/sprites", out: "apps/game-web/public/assets", check: false, copy: true };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--src") args.src = argv[++i];
    else if (argv[i] === "--out") args.out = argv[++i];
    else if (argv[i] === "--check") args.check = true;
    else if (argv[i] === "--no-copy") args.copy = false;
  }
  return args;
}

const IMAGE_EXT = new Set([".png", ".webp", ".jpg", ".jpeg"]);
const IMAGE_EXT_RE = /\.(png|webp|jpe?g)$/i;

/** Lista recursivamente arquivos de imagem. */
async function walkImages(dir) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walkImages(full)));
    else if (IMAGE_EXT.has(extname(entry.name).toLowerCase())) out.push(full);
  }
  return out;
}

/**
 * `a/b/c.png` -> `a/b/c`.
 *
 * O pack traz extensões duplicadas em `hero_skins/`
 * (`royal.png.png`). O ARQUIVO é preservado como está — renomear em lote
 * quebraria qualquer referência externa sem ganho. O ID, esse sim, é
 * limpo: `hero_skins/royal.png`, para que o código peça um nome e não
 * um artefato do empacotador.
 */
function idFor(absPath, srcDir) {
  const rel = relative(srcDir, absPath).split(sep).join("/");
  return rel.replace(IMAGE_EXT_RE, "").replace(IMAGE_EXT_RE, "");
}

/**
 * IDs que o jogo exige, derivados do catálogo REAL do pack.
 *
 * A lista anterior (`ui/panel`, `ui/button`, `ui/hud_frame`,
 * `vfx/slash`, `vfx/impact`) foi inventada antes de o pack existir. Ela
 * não correspondia a nenhum arquivo e o pipeline acusava 5 ausências que
 * não eram ausências — eram nomes errados. Um guard que reporta um
 * problema inexistente treina a pessoa a ignorá-lo, e um guard ignorado
 * não protege nada.
 *
 * Estes IDs são os que `apps/game-web` pede de verdade.
 */
const REQUIRED = [
  // Heróis candidatos a P-002 — os 4 precisam de idle e attack para
  // qualquer vertical slice.
  "characters/hero/hero_idle_sheet",
  "characters/hero/hero_attack_sheet",
  "characters/mage/mage_idle_sheet",
  "characters/mage/mage_attack_sheet",
  "characters/archer/archer_idle_sheet",
  "characters/archer/archer_attack_sheet",
  "characters/necromancer/necromancer_idle_sheet",
  "characters/necromancer/necromancer_attack_sheet",

  // Morte é obrigatória: §66 exige `character_defeated` e `enemy_defeated`
  // com feedback visual inequívoco.
  "characters/hero/hero_death_sheet",
  "characters/slime/slime_idle_sheet",
  "characters/slime/slime_death_sheet",

  // Skin inicial do Rei (P-006c) e retrato.
  "hero_skins/royal",
  "portraits/hero",

  // VFX de feedback: §66 `damage_dealt`, `critical_hit`, `battle_won`.
  "vfx/vfx_hit",
  "vfx/vfx_slash",
  "vfx/vfx_levelup",

  // Cenário mínimo para uma tela de combate.
  "tileset/floor_plain",
  "tileset/cave_wall",
];

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const srcDir = join(ROOT, args.src);
  const outDir = join(ROOT, args.out);

  const files = await walkImages(srcDir);
  const entries = {};
  const copyPlan = [];

  for (const file of files) {
    const id = idFor(file, srcDir);
    // O valor no manifesto é a URL pública, relativa à raiz do site.
    // O Vite serve `public/` na raiz, então o prefixo do diretório de
    // saída é o próprio prefixo da URL.
    //
    // Duas correções em relação à primeira versão, que estava errada nos
    // dois sentidos: emitia um caminho de filesystem
    // (`assets/../../../../assets/sprites/...`, 404 garantido) e depois
    // passou a emitir `assets/assets/...` (prefixo duplicado), porque o
    // fetch já concatena `assets/manifest.json` na base.
    const relToSrc = relative(srcDir, file).split(sep).join("/");
    entries[id] = relToSrc;
    copyPlan.push([file, join(outDir, relToSrc)]);
  }

  const missing = REQUIRED.filter((id) => entries[id] === undefined);

  const manifest = {
    version: 1,
    generatedFrom: args.src,
    count: Object.keys(entries).length,
    entries,
  };

  if (!args.check) {
    // Copia o pack para `public/` para que o Vite sirva como URL estática.
    // 92 MiB em `public/` não entram no bundle JS, mas SÃO servidos se
    // alguém pedir. A seleção de release é trabalho da Fase 9 —
    // `scripts/subset-assets.mjs` corta para o que o MVP usa.
    await mkdir(outDir, { recursive: true });
    await writeFile(join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    if (args.copy) {
      for (const [from, to] of copyPlan) {
        await mkdir(join(to, ".."), { recursive: true });
        await copyFile(from, to);
      }
    }
  }

  console.log(`[assets] ${Object.keys(entries).length} arquivos em ${args.src}`);

  if (missing.length > 0) {
    console.error("");
    console.error("[assets] FALHA — assets obrigatórios ausentes (§62):");
    for (const id of missing) console.error(`  - ${id}`);
    console.error("");
    console.error("[assets] O produto final NÃO pode usar quadrados, círculos ou emojis.");
    console.error("[assets] Recupere o pack com o comando de `assets/SOURCES.md`.");
    process.exit(1);
  }

  if (!args.check) {
    console.log(`[assets] ${copyPlan.length} arquivos copiados para ${args.out}`);
  }
  console.log("[assets] manifesto OK");
}

main().catch((error) => {
  console.error("[assets] erro:", error);
  process.exit(1);
});

export { walkImages, idFor, REQUIRED, IMAGE_EXT };
