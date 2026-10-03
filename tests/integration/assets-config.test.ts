/**
 * Config × manifesto de assets.
 *
 * O §62/ADR-004 manda referenciar assets por **ID do manifesto**, nunca por
 * caminho montado em runtime. Este teste é o que torna isso mecânico: cada
 * assetId declarado em `@tia/config` (heróis, inimigos, Rei) e cada id
 * exigido pela renderização precisa EXISTIR no manifesto.
 *
 * É o guard de remodelagem da P-002: renomear uma classe, trocar o sprite de
 * um herói ou reescrever o catálogo inteiro reprova aqui — nunca em runtime,
 * com um quadrado no lugar de um personagem (§62).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { config, classes, enemies, equipmentErrors } from "@tia/config";
import { requiredAssetIds } from "../../apps/game-web/src/render/assets.js";

const MANIFEST_PATH = resolve(
  import.meta.dirname,
  "../../apps/game-web/public/assets/manifest.json",
);

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as {
  entries: Record<string, string>;
};

const manifestIds = new Set(Object.keys(manifest.entries));

/** Todos os assetIds que o catálogo de config declara. */
function configAssetIds(): { label: string; id: string }[] {
  const out: { label: string; id: string }[] = [];
  for (const c of classes) {
    out.push({ label: `classes.${c.id}.portrait`, id: c.assets.portrait });
    for (const [key, id] of Object.entries(c.assets.sheets)) {
      out.push({ label: `classes.${c.id}.sheets.${key}`, id });
    }
  }
  for (const e of enemies) {
    if (e.assets.portrait) out.push({ label: `enemies.${e.id}.portrait`, id: e.assets.portrait });
    for (const [key, id] of Object.entries(e.assets.sheets)) {
      out.push({ label: `enemies.${e.id}.sheets.${key}`, id });
    }
  }
  for (const b of config.boss.bosses) {
    for (const [key, id] of Object.entries(b.assets.sheets)) {
      out.push({ label: `boss.${b.id}.sheets.${key}`, id });
    }
    if (b.assets.portrait) out.push({ label: `boss.${b.id}.portrait`, id: b.assets.portrait });
  }
  for (const t of config.equipment.templates) {
    out.push({ label: `equipment.templates.${t.id}.icon`, id: t.iconAssetId });
  }
  out.push({ label: "account.king.portrait", id: config.account.king.portraitAssetId });
  for (const skin of config.account.king.skins) {
    out.push({ label: `account.king.skins.${skin.id}`, id: skin.assetId });
  }
  return out;
}

describe("todo assetId da config existe no manifesto", () => {
  it("heróis, inimigos e Rei resolvem para arte real (§62)", () => {
    const missing = configAssetIds().filter(({ id }) => !manifestIds.has(id));
    expect(
      missing.map((m) => `${m.label} → ${m.id}`),
      "assetIds sem arte no manifesto — ou o pack mudou, ou alguém remapeou errado",
    ).toEqual([]);
  });

  it("o catálogo referencia arte suficiente para não ficar vazio", () => {
    //4 heróis × (1 retrato + 6 folhas) + inimigos com folhas + Rei.
    expect(configAssetIds().length).toBeGreaterThan(50);
  });
});

describe("equipamento (ADR-023)", () => {
  it("todo ícone de template existe no manifesto e a validação do catálogo concorda", () => {
    expect(equipmentErrors(config.equipment, manifestIds)).toEqual([]);
  });

  it("os ícones gerados de equipamento são PNG 64×64 com transparência (sem fundo magenta)", async () => {
    const sharp = (await import("sharp")).default;
    for (const id of ["helm", "chest", "legs", "boots", "glove", "wings", "crossbow", "wraps"]) {
      const file = resolve(import.meta.dirname, `../../assets/generated/items/${id}.png`);
      const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      expect([info.width, info.height]).toEqual([64, 64]);
      let transparent = 0;
      let magenta = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3]! < 10) transparent += 1;
        else if (data[i]! > 200 && data[i + 1]! < 60 && data[i + 2]! > 200) magenta += 1;
      }
      expect(transparent, `${id}: sem fundo transparente`).toBeGreaterThan(300);
      expect(magenta, `${id}: sobrou magenta opaco`).toBe(0);
    }
  });
});

describe("a renderização só exige arte que existe", () => {
  it("requiredAssetIds() ⊆ manifesto", () => {
    const missing = requiredAssetIds().filter((id) => !manifestIds.has(id));
    expect(missing, "requiredAssetIds referencia ids fora do manifesto").toEqual([]);
  });
});

describe("heróis e Rei não brigam por identidade visual", () => {
  it("cada herói tem corpo próprio, diferente do corpo do Rei na criação", () => {
    const heroBodies = new Set(classes.map((c) => c.assets.sheets.idle));
    expect(heroBodies.size).toBe(4);
    // As skins do Rei são estáticas (hero_skins/*); os corpos dos heróis são
    // folhas animadas (characters/*). São universos separados por design.
    for (const skin of config.account.king.skins) {
      expect(skin.assetId.startsWith("hero_skins/")).toBe(true);
    }
    for (const c of classes) {
      expect(c.assets.sheets.idle.startsWith("characters/")).toBe(true);
    }
  });
});
