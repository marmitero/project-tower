/**
 * Controles da caçada (Entrar / Voltar / Recomeçar / Descansar / Retomar) — usados no painel de
 * dados sob o jogo e na tela da Torre. Só despacha intenções; as regras estão em `GameState`.
 */

import { ActionButton } from "@tia/ui";
import { GameState, heroCombatStats } from "@tia/game-core";

const act = (fn: () => void) => () => {
  try {
    fn();
  } catch (error) {
    console.warn("[ui]", error);
  }
};

export function HuntControls({ state }: { state: GameState }) {
  const hunt = state.data.hunt;
  const activeId = state.data.team.activeHeroId;
  const hero = state.data.heroes.find((h) => h.id === activeId) ?? null;
  const heroMaxHp = hero ? heroCombatStats(hero, state.data.inventory).hp : 0;
  const hpRatio = hero && heroMaxHp > 0 ? hero.currentHp / heroMaxHp : 1;
  const busy = state.activeBattle !== null;

  return (
    <div className="tia-controls">
      <ActionButton
        icon="enter"
        label={
          hunt?.kind === "defeated"
            ? state.bot.autoReturnFromHub
              ? "Voltar agora para a Torre"
              : "Recomeçar a caçada"
            : busy
              ? "Em combate"
              : hunt?.kind === "searching"
                ? "Procurando…"
                : "Entrar na Torre"
        }
        disabled={!activeId || busy || hunt?.kind === "searching"}
        onClick={act(() => {
          if (hunt?.kind === "defeated") state.restartHunt();
          else state.startTower();
        })}
      />
      {hunt?.kind !== "defeated" && (
        <ActionButton
          icon="rest"
          label="Descansar (recuperar HP)"
          variant="secondary"
          disabled={!activeId || busy || hunt?.kind === "searching" || hpRatio >= 1}
          onClick={act(() => state.restActiveHero())}
        />
      )}
      {hunt?.kind === "paused" && (
        <ActionButton label="Retomar a caçada" variant="secondary" disabled={busy} onClick={act(() => state.beginSearch())} />
      )}
    </div>
  );
}
