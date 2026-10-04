/**
 * Origem de sprite de um combatente — resolve, SEM Phaser, de onde saem os quadros (ADR-032).
 *
 * Dois formatos convivem:
 *  - **atlas `ita-atlas-v1`** (arte gerada): 1 PNG voltado à direita, 5 linhas (idle/walk/attack/
 *    hurt/death); o inimigo (que olha para a esquerda) usa o MESMO quadro com `flipX`;
 *  - **folhas legadas** (pack Nika): 1 PNG por animação, 4 direções; aliado = linha 3, inimigo = linha 2.
 *
 * `sprites` é o registro que viaja pelo engine (`CombatantSeed.sprites`): `{ idle, walk, …, atlas? }`.
 */
import { ATLAS_SPRITE_KEY, ITA_ATLAS } from "@tia/config";

export type SheetName = "idle" | "walk" | "attack" | "hurt" | "death";
export const SHEET_NAMES: readonly SheetName[] = ["idle", "walk", "attack", "hurt", "death"];

/** Linhas do formato legado (docs/ART_PIPELINE.md §2.1): 0 baixo, 1 cima, 2 esquerda, 3 direita. */
export const LEGACY_ROW_LEFT = 2;
export const LEGACY_ROW_RIGHT = 3;
export const FRAMES_PER_ANIM = ITA_ATLAS.cols;

export interface SpriteSource {
  kind: "atlas" | "sheets";
  /** URL da textura de cada animação (no atlas, todas apontam para o mesmo PNG). */
  urls: Partial<Record<SheetName, string>>;
  /** Índice do 1º quadro de cada animação dentro da textura. */
  startFrame: Partial<Record<SheetName, number>>;
  /** Espelhar horizontalmente (inimigo no atlas). */
  flipX: boolean;
}

export interface ResolveOptions {
  /** `false` ignora o atlas (fallback quando o PNG não carrega). Padrão: `true`. */
  preferAtlas?: boolean;
}

export function resolveSpriteSource(
  sprites: Record<string, string> | undefined,
  side: "ally" | "enemy",
  urlOf: (assetId: string) => string | null,
  opts: ResolveOptions = {},
): SpriteSource {
  const atlasId = opts.preferAtlas === false ? undefined : sprites?.[ATLAS_SPRITE_KEY];
  const atlasUrl = atlasId ? urlOf(atlasId) : null;
  const urls: Partial<Record<SheetName, string>> = {};
  const startFrame: Partial<Record<SheetName, number>> = {};

  if (atlasUrl) {
    for (const name of SHEET_NAMES) {
      urls[name] = atlasUrl;
      startFrame[name] = ITA_ATLAS.rows[name] * FRAMES_PER_ANIM;
    }
    return { kind: "atlas", urls, startFrame, flipX: side === "enemy" };
  }

  const row = side === "ally" ? LEGACY_ROW_RIGHT : LEGACY_ROW_LEFT;
  for (const name of SHEET_NAMES) {
    const id = sprites?.[name];
    const url = id ? urlOf(id) : null;
    if (!url) continue;
    urls[name] = url;
    startFrame[name] = row * FRAMES_PER_ANIM;
  }
  return { kind: "sheets", urls, startFrame, flipX: false };
}

/** URLs distintas (para carregar cada textura uma vez). */
export function sourceUrls(src: SpriteSource): string[] {
  return [...new Set(Object.values(src.urls))];
}

/** Chave de animação estável: textura + quadro inicial (a mesma folha tem 1 anim por linha). */
export function animKeyFor(src: SpriteSource, name: SheetName): string | null {
  const url = src.urls[name];
  return url ? `${url}:${src.startFrame[name] ?? 0}` : null;
}
