/**
 * Bot do jogador (ADR-025): as opções de automação que o Rei configura e que valem ONLINE e
 * OFFLINE — o mesmo código decide nos dois (o offline é a simulação do online, ADR-026).
 *
 *   autoPotion       bebe poção quando o HP do herói em luta fica abaixo de X%
 *   autoRevive       se o herói cai e há revive, ele volta à MESMA luta
 *   autoReturnFromHub  caiu sem revive → recupera no Hub e volta ao mesmo andar
 *
 * Os padrões e os limites vêm de `config.bot` (editável pelo painel futuro).
 */

import type { BotSettings } from "@tia/config";
import { config } from "@tia/config";

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export function createBotSettings(): BotSettings {
  return clone(config.bot.defaults);
}

export type BotSettingsPatch = {
  autoPotion?: Partial<BotSettings["autoPotion"]>;
  autoRevive?: Partial<BotSettings["autoRevive"]>;
  autoReturnFromHub?: boolean;
};

/**
 * Completa o que faltar com o padrão e corrige o que estiver fora da faixa. Nunca lança: um save
 * antigo ou um valor estranho não pode travar o jogo (a automação cai no padrão).
 */
export function normalizeBotSettings(raw: unknown): BotSettings {
  const d = config.bot.defaults;
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as BotSettingsPatch;
  const pct = typeof r.autoPotion?.hpBelowPct === "number" && Number.isFinite(r.autoPotion.hpBelowPct) ? r.autoPotion.hpBelowPct : d.autoPotion.hpBelowPct;
  const itemId = (v: unknown, fallback: string) => (typeof v === "string" && v.length > 0 ? v : fallback);
  return {
    autoPotion: {
      enabled: typeof r.autoPotion?.enabled === "boolean" ? r.autoPotion.enabled : d.autoPotion.enabled,
      hpBelowPct: Math.round(Math.min(config.bot.hpThresholdMaxPct, Math.max(config.bot.hpThresholdMinPct, pct))),
      itemId: itemId(r.autoPotion?.itemId, d.autoPotion.itemId),
    },
    autoRevive: {
      enabled: typeof r.autoRevive?.enabled === "boolean" ? r.autoRevive.enabled : d.autoRevive.enabled,
      itemId: itemId(r.autoRevive?.itemId, d.autoRevive.itemId),
    },
    autoReturnFromHub: typeof r.autoReturnFromHub === "boolean" ? r.autoReturnFromHub : d.autoReturnFromHub,
  };
}

/** Aplica uma alteração parcial (a UI manda só o que mudou) e devolve as opções normalizadas. */
export function patchBotSettings(current: BotSettings, patch: BotSettingsPatch): BotSettings {
  return normalizeBotSettings({
    autoPotion: { ...current.autoPotion, ...patch.autoPotion },
    autoRevive: { ...current.autoRevive, ...patch.autoRevive },
    autoReturnFromHub: patch.autoReturnFromHub ?? current.autoReturnFromHub,
  });
}
