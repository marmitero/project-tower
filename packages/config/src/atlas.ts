/**
 * Atlas compacto `ita-atlas-v1` — o que o RENDERER precisa saber (ADR-032).
 *
 * Espelha `tools/art/spec.mjs` (a fonte dos números para o pipeline de arte);
 * `tests/integration/art-pipeline.test.ts` garante que os dois não divergem.
 * Formato: 4 colunas × 5 linhas de quadros 256², voltado à DIREITA; a esquerda é espelhada.
 */
import { classes } from "./catalog.js";
import type { CharacterAssets } from "./catalog.js";
import { heroById } from "./heroes.js";

export const ITA_ATLAS = Object.freeze({
  format: "ita-atlas-v1",
  cell: 256,
  cols: 4,
  rows: Object.freeze({ idle: 0, walk: 1, attack: 2, hurt: 3, death: 4 }),
  fps: Object.freeze({ idle: 7, walk: 10, attack: 12, hurt: 12, death: 8 }),
  loop: Object.freeze({ idle: true, walk: true, attack: false, hurt: false, death: false }),
});

/** Chave, dentro de `CombatantSeed.sprites`, que carrega o id do atlas. */
export const ATLAS_SPRITE_KEY = "atlas";

/**
 * Registro `nome → id de manifesto` que viaja pelo engine até a cena (`CombatantSeed.sprites`):
 * as folhas legadas + (se houver) `atlas`. A cena prefere o atlas e cai nas folhas.
 */
export function spriteRecord(assets: Pick<CharacterAssets, "sheets" | "atlas">): Record<string, string> {
  const record: Record<string, string> = { ...(assets.sheets as unknown as Record<string, string>) };
  if (assets.atlas) record[ATLAS_SPRITE_KEY] = assets.atlas;
  return record;
}

/** Sprites de um herói: atlas da IDENTIDADE (se tiver) → atlas da classe → folhas da classe. */
export function heroSpriteRecord(hero: { classId: string; identityId?: string }): Record<string, string> | undefined {
  const cls = classes.find((c) => c.id === hero.classId);
  if (!cls) return undefined;
  const record = spriteRecord(cls.assets);
  const atlas = hero.identityId ? heroById[hero.identityId]?.assets?.atlas : undefined;
  if (atlas) record[ATLAS_SPRITE_KEY] = atlas;
  return record;
}

/** Retrato de um herói: o da identidade (se tiver) ou o da classe. */
export function heroPortraitId(hero: { classId: string; identityId?: string }): string | undefined {
  const own = hero.identityId ? heroById[hero.identityId]?.assets?.portrait : undefined;
  return own ?? classes.find((c) => c.id === hero.classId)?.assets.portrait;
}
