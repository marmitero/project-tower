import { describe, expect, it } from "vitest";
import {
  ATLAS_SPRITE_KEY,
  BOSS_ARENA_KIT_ID,
  CONTENT_PACK_SCHEMA_VERSION,
  DEFAULT_ARENA_KIT_ID,
  HEROES,
  applyContentPack,
  arenaKitAssetIds,
  arenaKitById,
  arenaKitErrors,
  arenaKits,
  classes,
  config,
  defaultArenaKits,
  defaultContentPack,
  enemies,
  exportContentPack,
  heroPortraitId,
  heroSpriteRecord,
  migrateContentPack,
  resetContentToDefaults,
  spriteRecord,
  validateContentPack,
  type ContentPack,
} from "../index.js";

describe("kits de arena como dado (ContentPack v5, ADR-032)", () => {
  it("os kits de fábrica são válidos e cobrem todo andar, o chefe e o padrão", () => {
    const themes = config.tower.floors.map((f) => f.visual.theme);
    expect(arenaKitErrors(defaultArenaKits(), { floorThemes: themes })).toEqual([]);
    expect(arenaKits.map((k) => k.id)).toEqual(expect.arrayContaining([DEFAULT_ARENA_KIT_ID, BOSS_ARENA_KIT_ID]));
  });

  it("kit desconhecido cai no padrão", () => {
    expect(arenaKitById("nao-existe").id).toBe(DEFAULT_ARENA_KIT_ID);
    expect(arenaKitById(null).id).toBe(DEFAULT_ARENA_KIT_ID);
  });

  it("a validação lista cada defeito (id repetido, parede vazia, peso, tint, torchEvery, kit de andar inexistente)", () => {
    const kits = defaultArenaKits();
    kits.push({ ...kits[0]!, wall: [], torchEvery: 0, tint: -1, props: [{ assetId: "x", weight: 0 }] });
    const text = arenaKitErrors(kits, { floorThemes: ["fantasma"] }).join("\n");
    expect(text).toMatch(/id repetido/);
    expect(text).toMatch(/wall precisa/);
    expect(text).toMatch(/torchEvery/);
    expect(text).toMatch(/tint/);
    expect(text).toMatch(/weight/);
    expect(text).toMatch(/kit inexistente "fantasma"/);
    expect(arenaKitErrors([], {})).not.toEqual([]);
    expect(arenaKitErrors(defaultArenaKits().filter((k) => k.id !== BOSS_ARENA_KIT_ID)).join()).toMatch(/Arena dos Chefes/);
  });

  it("confere ids contra o manifesto quando ele é informado", () => {
    const errs = arenaKitErrors(defaultArenaKits(), { assetIds: new Set(["tileset/wall_a"]) });
    expect(errs.some((e) => e.includes("asset inexistente no manifesto"))).toBe(true);
  });

  it("arenaKitAssetIds não repete ids", () => {
    const ids = arenaKitAssetIds(arenaKitById("masmorra"));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("o pack exportado traz `arenas`; editar um kit e aplicar vale no jogo; restaurar volta ao padrão", () => {
    try {
      const pack = exportContentPack("t");
      expect(pack.schemaVersion).toBe(CONTENT_PACK_SCHEMA_VERSION);
      expect(pack.arenas.length).toBe(defaultArenaKits().length);
      pack.arenas.find((k) => k.id === "masmorra")!.torchEvery = 9;
      expect(validateContentPack(pack)).toEqual([]);
      const live = arenaKits; // referência viva continua válida
      applyContentPack(pack);
      expect(live).toBe(arenaKits);
      expect(arenaKitById("masmorra").torchEvery).toBe(9);
    } finally {
      resetContentToDefaults();
    }
    expect(arenaKitById("masmorra").torchEvery).toBe(4);
  });

  it("pack sem kit para um andar (ou sem kit de chefe) é rejeitado", () => {
    const pack = defaultContentPack();
    pack.arenas = pack.arenas.filter((k) => k.id !== "p02_carmesim");
    expect(validateContentPack(pack).join()).toMatch(/kit inexistente "p02_carmesim"/);
  });

  it("pack v4 (sem `arenas`) migra para v5 com os kits de fábrica", () => {
    const v4 = JSON.parse(JSON.stringify(defaultContentPack())) as Omit<Partial<ContentPack>, "schemaVersion"> & { schemaVersion: number };
    delete v4.arenas;
    v4.schemaVersion = 4;
    const migrated = migrateContentPack(v4) as ContentPack;
    expect(migrated.schemaVersion).toBe(5);
    expect(migrated.arenas.length).toBe(defaultArenaKits().length);
    expect(validateContentPack(v4)).toEqual([]);
  });
});

describe("arte por identidade e atlas (ADR-032)", () => {
  it("spriteRecord só acrescenta `atlas` quando existe", () => {
    const sheets = classes[0]!.assets.sheets;
    expect(spriteRecord({ sheets })[ATLAS_SPRITE_KEY]).toBeUndefined();
    expect(spriteRecord({ sheets, atlas: "enemies/x" })[ATLAS_SPRITE_KEY]).toBe("enemies/x");
    expect(spriteRecord({ sheets, atlas: "enemies/x" }).idle).toBe(sheets.idle);
  });

  it("herói sem atlas próprio usa as folhas da classe; com atlas próprio (Kaia), o atlas dele", () => {
    for (const h of HEROES) {
      const cls = classes.find((c) => c.id === h.classId)!;
      const rec = heroSpriteRecord({ classId: h.classId, identityId: h.id })!;
      expect(rec.idle).toBe(cls.assets.sheets.idle);
      expect(rec[ATLAS_SPRITE_KEY]).toBe(h.assets?.atlas);
      expect(heroPortraitId({ classId: h.classId, identityId: h.id })).toBe(h.assets?.portrait ?? cls.assets.portrait);
    }
    expect(heroSpriteRecord({ classId: "inexistente" })).toBeUndefined();
  });

  it("a arte da IDENTIDADE tem prioridade sobre a da classe", () => {
    const h = HEROES[0]!;
    const prev = h.assets;
    try {
      h.assets = { atlas: "heroes/guardian_2_teste", portrait: "portraits/heroes/teste" };
      expect(heroSpriteRecord({ classId: h.classId, identityId: h.id })![ATLAS_SPRITE_KEY]).toBe("heroes/guardian_2_teste");
      expect(heroPortraitId({ classId: h.classId, identityId: h.id })).toBe("portraits/heroes/teste");
      // outro herói da mesma classe, sem identidade, continua na arte da classe
      expect(heroSpriteRecord({ classId: h.classId })![ATLAS_SPRITE_KEY]).toBeUndefined();
    } finally {
      if (prev) h.assets = prev;
      else delete h.assets;
    }
  });

  it("inimigo com `assets.atlas` válido passa na validação; atlas vazio é rejeitado", () => {
    const pack = defaultContentPack();
    pack.enemies[0]!.assets.atlas = "enemies/f01_teste";
    expect(validateContentPack(pack)).toEqual([]);
    pack.enemies[0]!.assets.atlas = "";
    expect(validateContentPack(pack).join()).toMatch(/assets\.atlas/);
    expect(enemies.length).toBeGreaterThan(0);
  });
});
