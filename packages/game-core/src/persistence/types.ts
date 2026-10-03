/**
 * PersistenceService — a fronteira entre o jogo e o armazenamento.
 *
 * §83: "Criar PersistenceService. A camada deve permitir posteriormente
 * trocar LOCAL → SUPABASE sem reescrever todos os sistemas."
 *
 * Nenhum sistema do jogo sabe qual implementação está em uso. Todos recebem
 * a interface. Essa é a única forma de a troca ser realmente de graça — e
 * não de "recomeçar a persistência" seis meses depois.
 */

import type { SaveData } from "@tia/contracts";

export interface PersistenceService {
  readonly backend: "local" | "supabase";

  /**
   * Versão de config com que o save foi gravado. Rebalancear incrementa
   * `configVersion`; saves antigos são MIGRADOS, nunca reinterpretados.
   */
  readonly configVersion: number;

  load(accountId: string): Promise<SaveData | null>;
  save(accountId: string, data: SaveData): Promise<void>;

  /** Grava só o que mudou. Evita serializar o save inteiro por tick. */
  patch(accountId: string, patch: Partial<SaveData>): Promise<void>;

  /** Serializa o save num instante (usado no intervalo entre ticks). */
  exportSave(accountId: string): Promise<string | null>;

  importSave(accountId: string, payload: string): Promise<SaveData>;
  clear(accountId: string): Promise<void>;
}

export class PersistenceError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "PersistenceError";
    this.code = code;
  }
}

/** Valida a forma mínima de um save antes de confiar nele. */
export function assertSaveShape(data: unknown): asserts data is SaveData {
  if (typeof data !== "object" || data === null) {
    throw new PersistenceError("invalid", "save não é um objeto");
  }
  const d = data as Record<string, unknown>;
  for (const key of ["schemaVersion", "configVersion", "king", "wallet", "team", "inventory", "revision"]) {
    if (d[key] === undefined) {
      throw new PersistenceError("invalid", `save sem campo obrigatório: ${key}`);
    }
  }
  if (d.schemaVersion !== 1) {
    throw new PersistenceError("schema", `schemaVersion ${String(d.schemaVersion)} não suportada`);
  }
}

/**
 * Migração de save.
 *
 * O ponto: um rebalanceamento muda numeros, nao a ESTRUTURA. Um save antigo
 * continua válido — ele só carrega uma `configVersion` diferente, e o código
 * reinterpreta com a config atual. A migracao só é necessária quando o
 * SHAPE muda, e aí é uma funcao nomeada e testada.
 */
export function migrateSave(data: SaveData, toConfigVersion: number): SaveData {
  let out: SaveData = { ...data };
  if (out.configVersion < toConfigVersion) {
    // v1 → v2 (ADR-020): `Hero.currentHp` passa a existir. Saves antigos
    // nascem com HP cheio — o campo ausente não pode matar herói por engano.
    if (out.configVersion < 2) {
      out = {
        ...out,
        heroes: out.heroes.map((h) =>
          typeof h.currentHp === "number" ? h : { ...h, currentHp: h.stats.hp },
        ),
      };
    }
    // v2 → v3 (ADR-021): curvas de XP, teto 20.000 e andares por faixa. O SHAPE
    // do save não mudou (nível/XP continuam números), então não há reescrita:
    // o andar salvo é normalizado em `GameState.hydrate` (clampFloor), porque
    // o conteúdo é editável (ADR-022) e o andar pode deixar de existir.
    out.configVersion = toConfigVersion;
  }
  return out;
}
