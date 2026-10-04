/**
 * Render por atlas (ADR-032): a origem do sprite (atlas × folhas), o espelhamento do inimigo e o
 * orçamento de textura por andar — a parte do renderer que dispensa Phaser.
 */
import { describe, expect, it } from "vitest";
import { ATLAS_SPRITE_KEY, ITA_ATLAS, charSheets } from "@tia/config";
import {
  LEGACY_ROW_LEFT,
  LEGACY_ROW_RIGHT,
  animKeyFor,
  resolveSpriteSource,
  sourceUrls,
} from "../../apps/game-web/src/render/spriteSource.js";
import { DEFAULT_TEXTURE_BUDGET_BYTES, TextureBudget } from "../../apps/game-web/src/render/textureBudget.js";

const urlOf = (id: string) => `assets/${id}.png`;
const sheets = charSheets("goblin") as unknown as Record<string, string>;

describe("origem do sprite", () => {
  it("folhas legadas: aliado = linha 3 (direita), inimigo = linha 2 (esquerda), sem espelho", () => {
    const ally = resolveSpriteSource(sheets, "ally", urlOf);
    const enemy = resolveSpriteSource(sheets, "enemy", urlOf);
    expect(ally.kind).toBe("sheets");
    expect(ally.startFrame.idle).toBe(LEGACY_ROW_RIGHT * 4);
    expect(enemy.startFrame.attack).toBe(LEGACY_ROW_LEFT * 4);
    expect(ally.flipX).toBe(false);
    expect(enemy.flipX).toBe(false);
    expect(new Set(sourceUrls(ally)).size).toBe(5); // 1 textura por animação
  });

  it("atlas: 1 textura, linhas idle/walk/attack/hurt/death, inimigo espelhado", () => {
    const sprites = { ...sheets, [ATLAS_SPRITE_KEY]: "enemies/f01_teste" };
    const enemy = resolveSpriteSource(sprites, "enemy", urlOf);
    const ally = resolveSpriteSource(sprites, "ally", urlOf);
    expect(enemy.kind).toBe("atlas");
    expect(sourceUrls(enemy)).toEqual(["assets/enemies/f01_teste.png"]);
    expect(enemy.flipX).toBe(true);
    expect(ally.flipX).toBe(false);
    for (const [name, row] of Object.entries(ITA_ATLAS.rows)) {
      expect(enemy.startFrame[name as keyof typeof enemy.startFrame]).toBe(row * ITA_ATLAS.cols);
    }
    // chaves de animação distintas por linha, estáveis entre chamadas
    const keys = (["idle", "walk", "attack", "hurt", "death"] as const).map((n) => animKeyFor(enemy, n));
    expect(new Set(keys).size).toBe(5);
    expect(animKeyFor(enemy, "idle")).toBe(animKeyFor(resolveSpriteSource(sprites, "enemy", urlOf), "idle"));
  });

  it("atlas ausente no manifesto ou `preferAtlas:false` caem nas folhas (fallback visual)", () => {
    const sprites = { ...sheets, [ATLAS_SPRITE_KEY]: "enemies/nao-existe" };
    const noUrl = (id: string) => (id.startsWith("enemies/") ? null : urlOf(id));
    expect(resolveSpriteSource(sprites, "enemy", noUrl).kind).toBe("sheets");
    expect(resolveSpriteSource(sprites, "enemy", urlOf, { preferAtlas: false }).kind).toBe("sheets");
  });

  it("sem nada resolvível, não inventa textura (a cena mostra o aviso §62)", () => {
    const r = resolveSpriteSource(undefined, "ally", urlOf);
    expect(r.urls).toEqual({});
    expect(sourceUrls(r)).toEqual([]);
    expect(animKeyFor(r, "idle")).toBeNull();
  });
});

describe("orçamento de textura por andar", () => {
  const MB = 1024 * 1024;

  it("dentro do limite não descarrega nada", () => {
    const b = new TextureBudget(10 * MB);
    b.touch("a", 4 * MB, 1);
    b.touch("b", 4 * MB, 2);
    expect(b.plan(new Set())).toEqual([]);
    expect(b.total()).toBe(8 * MB);
  });

  it("estourando, descarrega as MENOS recentes e nunca as fixadas", () => {
    const b = new TextureBudget(10 * MB);
    b.touch("velha", 4 * MB, 1);
    b.touch("media", 4 * MB, 2);
    b.touch("nova", 4 * MB, 3);
    expect(b.plan(new Set())).toEqual(["velha"]);
    expect(b.plan(new Set(["velha"]))).toEqual(["media"]);
    expect(b.plan(new Set(["velha", "media", "nova"]))).toEqual([]);
  });

  it("tocar de novo renova a idade; esquecer remove do total", () => {
    const b = new TextureBudget(6 * MB);
    b.touch("a", 4 * MB, 1);
    b.touch("b", 4 * MB, 2);
    b.touch("a", 4 * MB, 3); // a ficou mais nova que b
    expect(b.plan(new Set())).toEqual(["b"]);
    b.forget("b");
    expect(b.total()).toBe(4 * MB);
    expect(b.has("b")).toBe(false);
  });

  it("o limite padrão comporta herói + inimigo em folhas legadas (≈ 40 MB) com folga", () => {
    expect(DEFAULT_TEXTURE_BUDGET_BYTES).toBeGreaterThan(40 * MB * 2);
    expect(new TextureBudget().limit).toBe(DEFAULT_TEXTURE_BUDGET_BYTES);
  });
});
