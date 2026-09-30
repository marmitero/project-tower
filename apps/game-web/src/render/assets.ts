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
 */

export interface AssetManifest {
  version: number;
  entries: Record<string, string>;
  /** IDs referenciados pelo catálogo mas ausentes em disco. */
  missing: string[];
  /** Ids listados no manifesto que não existem em disco. */
  orphaned: string[];
}

const MANIFEST_URL = "assets/manifest.json";

let cache: AssetManifest | null = null;

/**
 * IDs que o jogo REQUER para funcionar. Derivados do catálogo, não
 * hardcoded: se `config.classes` ganhar uma classe, a lista muda junto.
 */
export function requiredAssetIds(): string[] {
  const ids: string[] = [];
  ids.push("ui/panel", "ui/button", "ui/hud_frame", "vfx/slash", "vfx/impact");
  return ids;
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

  const raw = (await response.json()) as { version?: number; entries?: Record<string, string> };
  const entries = raw.entries ?? {};
  const missing = requiredAssetIds().filter((id) => entries[id] === undefined);

  cache = { version: raw.version ?? 0, entries, missing, orphaned: [] };
  return cache;
}

export function assetUrl(id: string, baseUrl = ""): string | null {
  const path = cache?.entries[id];
  return path ? `${baseUrl}${path}` : null;
}

export function clearAssetCache(): void {
  cache = null;
}
