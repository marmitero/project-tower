/**
 * Pipeline de assets.
 *
 * §62 — o produto final não pode ser quadrados, círculos, emojis ou
 * personagens geométricos. Isso significa que o pipeline precisa SABER
 * quando um asset está faltando e falhar visivelmente, em vez de servir
 * um placeholder e deixar a decisão de "¿isso está pronto?" para o dia
 * da entrega.
 *
 * O manifesto é a única fonte de verdade: `id -> caminho`. O código nunca
 * concatena caminho de arquivo em runtime; ele pede um ID. Assim,
 * renomear um asset é uma edição de dados e o typecheck encontra quem usa.
 *
 * Os IDs espelham a estrutura REAL do pack em `assets/sprites/`
 * (ver `assets/SOURCES.md`). A lista anterior — `ui/panel`, `ui/button`,
 * `ui/hud_frame`, `vfx/slash`, `vfx/impact` — foi escrita antes de o pack
 * existir e não correspondia a nenhum arquivo. O aviso de "asset faltando"
 * ficava vermelho mesmo com 422 imagens presentes, e um aviso que sempre
 * aparece é um aviso que ninguém lê.
 */

export interface AssetManifest {
  version: number;
  count?: number;
  entries: Record<string, string>;
  /** IDs referenciados pelo jogo mas ausentes no manifesto. */
  missing: string[];
  /** Ids listados no manifesto que não existem em disco. */
  orphaned: string[];
}

/** Prefixo de `public/` — o Vite serve essa pasta na raiz do site. */
const MANIFEST_URL = "assets/manifest.json";

let cache: AssetManifest | null = null;

/**
 * IDs que o jogo REQUER para funcionar.
 *
 * Este é o contrato entre o código e o pack. Se um item sai daqui, é
 * porque a cena parou de precisar dele — não porque ficou incômodo
 * procurar. Espelha `REQUIRED` em `scripts/build-assets.mjs`.
 */
export function requiredAssetIds(): string[] {
  return [
    // Heróis candidatos a P-002: idle + attack nos quatro.
    "characters/hero/hero_idle_sheet",
    "characters/hero/hero_attack_sheet",
    "characters/hero/hero_death_sheet",
    "characters/mage/mage_idle_sheet",
    "characters/mage/mage_attack_sheet",
    "characters/archer/archer_idle_sheet",
    "characters/archer/archer_attack_sheet",
    "characters/necromancer/necromancer_idle_sheet",
    "characters/necromancer/necromancer_attack_sheet",

    // Inimigos comuns da Torre: precisam de idle + death (§66 exige
    // `enemy_defeated` com feedback visual).
    "characters/slime/slime_idle_sheet",
    "characters/slime/slime_death_sheet",
    "characters/goblin/goblin_idle_sheet",
    "characters/goblin/goblin_death_sheet",
    "characters/skeleton/skeleton_idle_sheet",
    "characters/orc/orc_idle_sheet",
    "characters/bat/bat_idle_sheet",
    "characters/fireorc/fireorc_idle_sheet",

    // Boss (§24) e Rei (§4, §5).
    "characters/boss/boss_idle_sheet",
    "hero_skins/royal",
    "portraits/hero",

    // VFX de feedback: `damage_dealt`, ataque e `battle_won`.
    "vfx/vfx_hit",
    "vfx/vfx_slash",
    "vfx/vfx_levelup",

    // Cenário mínimo de uma tela de combate.
    "tileset/floor_plain",
    "tileset/cave_wall",
  ];
}

export async function loadAssetManifest(baseUrl = ""): Promise<AssetManifest> {
  if (cache) return cache;

  const response = await fetch(`${baseUrl}${MANIFEST_URL}`).catch(() => null);
  if (!response || !response.ok) {
    // Sem manifesto, o jogo NÃO deve fingir que tem arte. A lista de
    // ausentes é toda ela, e a UI mostra um aviso de "assets não
    // processados" em vez de renderizar quadrados.
    cache = { version: 0, entries: {}, missing: requiredAssetIds(), orphaned: [] };
    return cache;
  }

  const raw = (await response.json()) as {
    version?: number;
    count?: number;
    entries?: Record<string, string>;
  };
  const entries = raw.entries ?? {};
  const missing = requiredAssetIds().filter((id) => entries[id] === undefined);

  cache = {
    version: raw.version ?? 0,
    count: raw.count ?? Object.keys(entries).length,
    entries,
    missing,
    orphaned: [],
  };
  return cache;
}

/** URL de um asset pelo ID, ou `null` se o ID não existir. */
export function assetUrl(id: string, baseUrl = ""): string | null {
  const path = cache?.entries[id];
  return path ? `${baseUrl}${MANIFEST_URL.slice(0, MANIFEST_URL.lastIndexOf("/") + 1)}${path}` : null;
}

export function clearAssetCache(): void {
  cache = null;
}
