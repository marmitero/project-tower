/**
 * Preferências do jogador (som). Ficam FORA do save do jogo de propósito: não são progresso,
 * não devem ser migradas com ele nem ir para o servidor (Fase 14+) e sobrevivem a "apagar progresso".
 *
 * Edição futura: acrescentar um campo em `Settings` + `DEFAULT_SETTINGS` + `sanitize`.
 */

export interface Settings {
  sfxEnabled: boolean;
  /** 0 a 1. */
  sfxVolume: number;
}

export const DEFAULT_SETTINGS: Readonly<Settings> = { sfxEnabled: true, sfxVolume: 0.4 };
export const SETTINGS_KEY = "tia:settings";

type Store = Pick<Storage, "getItem" | "setItem">;

function defaultStore(): Store | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null; // modo privado/sem storage: usa só a memória
  }
}

export function sanitizeSettings(raw: unknown): Settings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<keyof Settings, unknown>>;
  const vol = typeof r.sfxVolume === "number" && Number.isFinite(r.sfxVolume) ? Math.min(1, Math.max(0, r.sfxVolume)) : DEFAULT_SETTINGS.sfxVolume;
  return { sfxEnabled: typeof r.sfxEnabled === "boolean" ? r.sfxEnabled : DEFAULT_SETTINGS.sfxEnabled, sfxVolume: vol };
}

let current: Settings | null = null;
const listeners = new Set<(s: Settings) => void>();

export function loadSettings(store: Store | null = defaultStore()): Settings {
  try {
    const raw = store?.getItem(SETTINGS_KEY);
    return sanitizeSettings(raw ? JSON.parse(raw) : null);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function getSettings(): Settings {
  if (!current) current = loadSettings();
  return current;
}

export function updateSettings(patch: Partial<Settings>, store: Store | null = defaultStore()): Settings {
  current = sanitizeSettings({ ...getSettings(), ...patch });
  try {
    store?.setItem(SETTINGS_KEY, JSON.stringify(current));
  } catch {
    // Cota cheia/sem storage: a preferência vale só nesta sessão.
  }
  for (const l of listeners) l(current);
  return current;
}

export function subscribeSettings(fn: (s: Settings) => void): () => void {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

/** Só para testes. */
export function resetSettingsCache(): void {
  current = null;
}
