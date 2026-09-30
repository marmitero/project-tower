/**
 * PersistenceService — implementação LOCAL (localStorage).
 *
 * §83 — a camada precisa permitir trocar LOCAL → SUPABASE sem reescrever
 * todos os sistemas. Isso se sustenta por três decisões:
 *
 *   1. Nenhum sistema importa esta classe diretamente; todos recebem a
 *      interface `PersistenceService`.
 *   2. O `Storage` é injetado, não lido de `globalThis`. Isso permite testar
 *      sem navegador e, mais importante, permite rodar o MESMO save em
 *      Node e no navegador sem caminho especial.
 *   3. A serialização é explícita: `bigint` NÃO sobrevive a
 *      `JSON.stringify` (vira TypeError), e o save tem `bigint` em
 *      `coins`, `xp` e recompensas. Um codificador que esquece disso perde
 *      a carteira do jogador silenciosamente.
 */

import type { SaveData } from "@tia/contracts";
import { config } from "@tia/config";
import { assertSaveShape, migrateSave, PersistenceError, type PersistenceService } from "./types.js";

/** Superfície mínima do Web Storage. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const SAVE_PREFIX = "tia:save:";

/** Storage em memória — usado em teste, SSR e quando localStorage falha. */
export class MemoryStorage implements KeyValueStorage {
  private readonly map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  get size(): number {
    return this.map.size;
  }
}

// ---------------------------------------------------------------------------
// Codificação com bigint
// ---------------------------------------------------------------------------

const BIGINT_TAG = "__bigint__";

/**
 * `JSON.stringify` lança TypeError em `bigint`. Um save de idle game TEM
 * bigint em toda a economia, então serializar sem converter significa que
 * o primeiro `save()` do jogador lança e o progresso da sessão se perde.
 */
export function encodeSave(data: unknown): string {
  return JSON.stringify(data, replacer);
}

export function decodeSave(payload: string): SaveData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    throw new PersistenceError("parse", "Save corrompido: JSON inválido.");
  }
  const revived = reviver(parsed);
  assertSaveShape(revived);
  return migrated(revived);
}

function replacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") return { [BIGINT_TAG]: value.toString() };
  return value;
}

function reviver(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reviver);
  if (value !== null && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (Object.keys(obj).length === 1 && typeof obj[BIGINT_TAG] === "string") {
      return BigInt(obj[BIGINT_TAG] as string);
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) out[k] = reviver(v);
    return out;
  }
  return value;
}

/**
 * §83 — rebalancear incrementa `configVersion`. Um save antigo é
 * reinterpretado com a config atual; a ESTRUTURA nunca muda em silêncio.
 */
function migrated(save: SaveData): SaveData {
  if (save.configVersion === config.configVersion) return save;
  return migrateSave(save, config.configVersion);
}

// ---------------------------------------------------------------------------
// Implementação
// ---------------------------------------------------------------------------

export class LocalStoragePersistence implements PersistenceService {
  readonly backend = "local" as const;
  readonly configVersion = config.configVersion;

  constructor(
    private readonly storage: KeyValueStorage = defaultStorage(),
    private readonly prefix = SAVE_PREFIX,
  ) {}

  private key(accountId: string): string {
    return `${this.prefix}${accountId}`;
  }

  async load(accountId: string): Promise<SaveData | null> {
    const raw = this.storage.getItem(this.key(accountId));
    if (raw === null) return null;
    return decodeSave(raw);
  }

  async save(accountId: string, data: SaveData): Promise<void> {
    // `asserts` exige que o parâmetro seja um `unknown` narrowed por forma.
    assertSaveShape(data as unknown);
    this.storage.setItem(this.key(accountId), encodeSave(data));
  }

  async patch(accountId: string, patch: Partial<SaveData>): Promise<void> {
    const current = await this.load(accountId);
    if (!current) throw new PersistenceError("not_found", "Nada para atualizar: nenhum save carregado.");
    await this.save(accountId, { ...current, ...patch });
  }

  async exportSave(accountId: string): Promise<string | null> {
    return this.storage.getItem(this.key(accountId));
  }

  async importSave(accountId: string, payload: string): Promise<SaveData> {
    const data = decodeSave(payload);
    await this.save(accountId, data);
    return data;
  }

  async clear(accountId: string): Promise<void> {
    this.storage.removeItem(this.key(accountId));
  }
}

/**
 * Resolve o storage real, com degradação.
 *
 * Safari em modo privado e qualquer contexto sem `localStorage` lançam em
 * QUALQUER acesso à propriedade — inclusive em `typeof`. Por isso o acesso é
 * try/catch, e o fallback é memória: o jogo funciona, só não persiste entre
 * recargas, em vez de quebrar na inicialização.
 */
function defaultStorage(): KeyValueStorage {
  try {
    if (typeof globalThis !== "undefined") {
      const candidate = (globalThis as { localStorage?: KeyValueStorage }).localStorage;
      if (candidate) {
        const probe = `${SAVE_PREFIX}__probe__`;
        candidate.setItem(probe, "1");
        candidate.removeItem(probe);
        return candidate;
      }
    }
  } catch {
    // Cai no MemoryStorage abaixo.
  }
  return new MemoryStorage();
}
