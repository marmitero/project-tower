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
import { classes, config } from "@tia/config";
import { normalizeBotSettings } from "../bot.js";
import { isLegacyEquipment, migrateLegacyEquipment } from "../loot.js";

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
    // v3 → v4 (ADR-023/024): equipamento por template e herói com atributos próprios.
    //  - itens antigos ("slot.raridade", X inteiro 1–50) são RECONSTRUÍDOS do seed no
    //    modelo novo (id, dono, nível, raridade, slot e origem preservados);
    //  - heróis ganham `attributes`/`quality` (os da classe) e os INICIAIS passam a
    //    `uncommon` (adendo: todos incomuns na seleção). Heróis não iniciais mantêm a raridade.
    if (out.configVersion < 4) {
      out = {
        ...out,
        inventory: { ...out.inventory, equipment: out.inventory.equipment.map((e) => (isLegacyEquipment(e) ? migrateLegacyEquipment(e) : e)) },
        heroes: out.heroes.map((h) => {
          const cls = classes.find((c) => c.id === h.classId);
          const attributes = h.attributes ?? { ...(cls?.attributes ?? { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 }) };
          return {
            ...h,
            attributes,
            quality: typeof h.quality === "number" ? h.quality : 50,
            rarity: h.origin === "starter" ? config.heroAcquisition.starterRarity : h.rarity,
          };
        }),
      };
    }
    // v4 → v5 (ADR-025/026): Bot, contadores do Market e offline por ausência. Opções ausentes
    // nascem no padrão da config; o `accumulatedMs` do modelo antigo (acumulado vitalício) é zerado.
    if (out.configVersion < 5) {
      out = {
        ...out,
        bot: normalizeBotSettings((out as Partial<SaveData>).bot),
        market: { boxesOpened: Math.max(0, Math.floor((out as Partial<SaveData>).market?.boxesOpened ?? 0)) },
        offline: { ...out.offline, accumulatedMs: 0 },
      };
    }
    out.configVersion = toConfigVersion;
  }
  return out;
}
