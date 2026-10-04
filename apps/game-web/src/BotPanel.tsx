/**
 * Painel do Bot (ADR-025): as opções de automação que valem ONLINE e OFFLINE.
 * Só apresentação — limites e padrões vêm de `config.bot`; a regra mora em `game-core`.
 */

import { ActionButton, Panel } from "@tia/ui";
import { config } from "@tia/config";
import { GameState, effectAmount, heroCombatStats, ownedPotions, ownedRevives } from "@tia/game-core";
import { formatInt } from "./format.js";

export function BotPanel({ state }: { state: GameState }) {
  const bot = state.bot;
  const hero = state.data.heroes.find((h) => h.id === state.data.team.activeHeroId) ?? null;
  const maxHp = hero ? heroCombatStats(hero, state.data.inventory).hp : 1000;
  const potions = ownedPotions(state.data.inventory, maxHp);
  const revives = ownedRevives(state.data.inventory, maxHp);
  const allPotions = config.market.items.filter((i) => i.kind === "consumable" && i.effect.kind !== "revivePct");
  const allRevives = config.market.items.filter((i) => i.kind === "consumable" && i.effect.kind === "revivePct");

  return (
    <Panel title="Bot — automação (online e offline)">
      <p className="tia-note">
        O Bot age por você, inclusive quando o jogo está fechado: ao voltar, o tempo fora (até {Math.round(config.offline.capFreeMs / 3_600_000)} h)
        é simulado como se você tivesse ficado jogando.
      </p>

      <label className="tia-bot__row">
        <input
          type="checkbox"
          checked={bot.autoPotion.enabled}
          onChange={(e) => state.setBot({ autoPotion: { enabled: e.target.checked } })}
        />
        <span>Usar poção automaticamente quando a vida do herói ficar abaixo de</span>
        <strong>{bot.autoPotion.hpBelowPct}%</strong>
      </label>
      <input
        className="tia-bot__range"
        type="range"
        aria-label="Limite de vida para usar poção"
        min={config.bot.hpThresholdMinPct}
        max={config.bot.hpThresholdMaxPct}
        step={5}
        value={bot.autoPotion.hpBelowPct}
        onChange={(e) => state.setBot({ autoPotion: { hpBelowPct: Number(e.target.value) } })}
      />
      <label className="tia-bot__row">
        <span>Poção a usar</span>
        <select value={bot.autoPotion.itemId} onChange={(e) => state.setBot({ autoPotion: { itemId: e.target.value } })}>
          <option value="auto">Automático (a menor que cobre o dano)</option>
          {allPotions.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name} (você tem {formatInt(state.ownedCount(i.id))})
            </option>
          ))}
        </select>
      </label>

      <label className="tia-bot__row">
        <input
          type="checkbox"
          checked={bot.autoRevive.enabled}
          onChange={(e) => state.setBot({ autoRevive: { enabled: e.target.checked } })}
        />
        <span>Usar reviver automaticamente se o herói cair (continua na mesma luta)</span>
      </label>
      <label className="tia-bot__row">
        <span>Reviver a usar</span>
        <select value={bot.autoRevive.itemId} onChange={(e) => state.setBot({ autoRevive: { itemId: e.target.value } })}>
          <option value="auto">Automático (o mais fraco que houver)</option>
          {allRevives.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name} (você tem {formatInt(state.ownedCount(i.id))})
            </option>
          ))}
        </select>
      </label>

      <label className="tia-bot__row">
        <input
          type="checkbox"
          checked={bot.autoReturnFromHub}
          onChange={(e) => state.setBot({ autoReturnFromHub: e.target.checked })}
        />
        <span>
          Se cair sem reviver: recuperar no Hub ({Math.round(config.bot.hubRecoveryMs / 1000)} s) e voltar sozinho ao mesmo andar
        </span>
      </label>

      <p className="tia-muted">
        Estoque:{" "}
        {potions.length + revives.length === 0
          ? "nenhuma poção ou reviver — compre no Market."
          : [...potions, ...revives]
              .map((o) => `${o.item.name} ×${formatInt(o.count)} (${o.item.effect.kind === "revivePct" ? "revive " : "+"}${formatInt(effectAmount(o.item.effect, maxHp))})`)
              .join(" · ")}
      </p>
      <ActionButton
        label="Restaurar padrões"
        variant="secondary"
        onClick={() => state.setBot(config.bot.defaults)}
      />
    </Panel>
  );
}
