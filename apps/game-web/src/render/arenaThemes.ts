/**
 * Temas de arena — agora VISÃO do dado do config (ADR-032).
 *
 * A tabela deixou de morar aqui: os kits são `ArenaKitDef` em `packages/config/src/arenas.ts`
 * (parte do ContentPack, editável pelo Painel ADM). Este módulo só adapta o nome que o
 * renderer já usava (`ArenaTheme`) e resolve kit desconhecido para o padrão.
 */
import { arenaKitAssetIds, arenaKitById, arenaKits, DEFAULT_ARENA_KIT_ID, type ArenaKitDef, type ArenaPropDef } from "@tia/config";

export type ArenaProp = ArenaPropDef;
export type ArenaTheme = ArenaKitDef;

export { DEFAULT_ARENA_KIT_ID as DEFAULT_THEME_ID };

/** Kit do tema (ou o padrão, se o id não existir). */
export function arenaThemeFor(themeId: string | null | undefined): ArenaTheme {
  return arenaKitById(themeId);
}

/** Todos os temas vivos. */
export function allArenaThemes(): readonly ArenaTheme[] {
  return arenaKits;
}

/** Todos os IDs de asset usados por um tema (para carregar de uma vez). */
export function themeAssetIds(theme: ArenaTheme): string[] {
  return arenaKitAssetIds(theme);
}
