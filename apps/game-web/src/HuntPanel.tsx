/**
 * Painel de dados da caçada (ADR-031) — o antigo bloco grande sob o jogo virou uma barra compacta
 * colada na arena, ocultável por um botão no canto do jogo (`HuntToggle`). Mostra o estado do
 * herói e do andar + as taxas por hora (XP/h, Coin/h, Custo/h, Lucro/h) medidas pelo `HuntLedger`.
 *
 * Só apresentação: nada aqui decide regra. Durante uma luta de chefe o painel mostra a luta
 * (HP do chefe, tempo, equipe) em vez da Torre, porque a arena está à vista, não a tela de Arena.
 */

import { ActionButton, ProgressBar } from "@tia/ui";
import { GameState, floorDef, heroCombatStats, killsToNextKingLevel, searchingProgress, towerRewardsForEnemyLevel } from "@tia/game-core";
import { formatCompact, formatInt } from "./format.js";
import { HuntControls } from "./HuntControls.js";
import { LiveFight } from "./BossScreen.js";

export function statusOf(state: GameState): { label: string; tone: "good" | "bad" | "neutral" } {
  const hunt = state.data.hunt;
  if (state.activeBattle) return { label: "Em combate", tone: "good" };
  if (hunt?.kind === "searching") return { label: "Procurando…", tone: "neutral" };
  if (hunt?.kind === "defeated") return { label: "Derrota", tone: "bad" };
  if (hunt?.kind === "paused") return { label: "Descansando", tone: "good" };
  return { label: "Pronto", tone: "neutral" };
}

function Cell({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" | "warn" | "neutral" }) {
  return (
    <div className={`tia-hunt__cell${tone && tone !== "neutral" ? ` tia-hunt__cell--${tone}` : ""}`}>
      <span className="tia-hunt__label">{label}</span>
      <strong className="tia-hunt__value">{value}</strong>
    </div>
  );
}

/** Texto de taxa por hora: `+12,3 mil/h`. */
const perHour = (v: number, sign = false) => `${sign && v > 0 ? "+" : ""}${formatCompact(v)}/h`;

export function HuntPanel({ state, now }: { state: GameState; now: number }) {
  if (state.activeBossId) {
    return (
      <section className="tia-hunt tia-hunt--boss" aria-label="Luta de chefe">
        <LiveFight state={state} />
      </section>
    );
  }

  const hunt = state.data.hunt;
  const floor = state.currentFloor;
  const info = state.floorInfo(floor);
  const def = floorDef(floor);
  const rewards = towerRewardsForEnemyLevel(def.enemyLevel);
  const kills = killsToNextKingLevel(state.data.king, def.enemyLevel);
  const hero = state.data.heroes.find((h) => h.id === state.data.team.activeHeroId) ?? null;
  // O máximo real inclui o equipamento (ADR-023): `hero.stats.hp` é só o HP-base.
  const maxHp = hero ? heroCombatStats(hero, state.data.inventory).hp : 0;
  const hpRatio = hero && maxHp > 0 ? Math.max(0, hero.currentHp) / maxHp : 1;
  const status = statusOf(state);
  const rates = state.ledgerRates();
  const searching = hunt?.kind === "searching";

  return (
    <section className="tia-hunt" aria-label="Dados da caçada">
      <div className="tia-hunt__top">
        <div className="tia-hunt__hp">
          {hero ? (
            <ProgressBar
              label={`HP ${hero.name}`}
              value={Math.max(0, hero.currentHp)}
              max={Math.max(1, maxHp)}
              color={hpRatio <= 0.3 ? "#f7768e" : "#9ece6a"}
              readout={`${formatCompact(Math.max(0, hero.currentHp))}/${formatCompact(maxHp)}`}
            />
          ) : (
            <p className="tia-muted">Escolha um herói ativo (Equipe).</p>
          )}
        </div>
        <HuntControls state={state} />
      </div>

      {searching && (
        <div className="tia-searching" aria-live="polite">
          <span className="tia-searching__label">
            PROCURANDO<span className="tia-searching__dots" aria-hidden="true">…</span> {(state.searchingRemainingMs() / 1000).toFixed(1)}s
          </span>
          <ProgressBar label="" value={searchingProgress(hunt, now)} max={1} color="#e0af68" />
        </div>
      )}
      {hunt?.kind === "defeated" && state.bot.autoReturnFromHub && (
        <p className="tia-note tia-note--bad" aria-live="polite">
          Recuperando no Hub: volta em {Math.ceil(state.hubRemainingMs() / 1000)} s ao andar {floor}.
        </p>
      )}

      <div className="tia-hunt__grid">
        <Cell label="Status" value={status.label} tone={status.tone} />
        <Cell label="Andar" value={`${floor} · ${info.name}`} />
        <Cell label="Melhor andar" value={state.data.tower.bestFloor > 0 ? String(state.data.tower.bestFloor) : "—"} />
        <Cell label="Faixa do Rei" value={`Nv ${formatInt(def.minLevel)}–${formatInt(def.maxLevel)}`} />
        <Cell label="Inimigos" value={`Nv ${formatInt(def.enemyLevel)}`} />
        <Cell label="XP por abate" value={`${formatInt(rewards.kingXp)} (herói ${formatInt(rewards.heroXp)})`} />
        <Cell label="Coin por abate" value={formatInt(rewards.coins)} tone="warn" />
        <Cell label="Abates p/ próx. Nv" value={kills !== null ? `≈ ${formatInt(kills)}` : "—"} />
        <Cell label="XP/h Rei" value={perHour(rates.kingXpPerHour)} />
        <Cell label="XP/h herói" value={perHour(rates.heroXpPerHour)} />
        <Cell label="Coin/h" value={perHour(rates.coinsPerHour)} tone="warn" />
        <Cell label="Custo/h" value={perHour(rates.costPerHour)} tone={rates.costPerHour > 0 ? "bad" : "neutral"} />
        <Cell label="Lucro/h" value={perHour(rates.netPerHour, true)} tone={rates.netPerHour < 0 ? "bad" : rates.netPerHour > 0 ? "good" : "neutral"} />
      </div>

      <div className="tia-hunt__foot">
        <span className="tia-muted">
          {rates.warmingUp ? "medindo… " : ""}média dos últimos {Math.max(1, Math.round(rates.measuredMs / 60_000))} min · custo inclui poções, reviver e demais consumíveis
        </span>
        <ActionButton label="Zerar medição" variant="secondary" onClick={() => state.resetLedger()} />
      </div>
    </section>
  );
}

/** Botão no canto do jogo: mostra/oculta o painel de dados. */
export function HuntToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button type="button" className="tia-gamebox__toggle" aria-expanded={open} onClick={onToggle} title={open ? "Ocultar dados da caçada" : "Mostrar dados da caçada"}>
      {open ? "Ocultar dados ▾" : "Dados ▴"}
    </button>
  );
}
