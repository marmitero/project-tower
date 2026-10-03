/**
 * Tela da Torre (ADR-021): andar atual, faixa de nível, inimigos por papel, controles da caçada
 * e lista de andares com seleção. Os dados da caçada moraram aqui até o ADR-031 (agora em `HuntPanel`).
 *
 * Só apresentação: toda regra (gate por nível, normalização de andar,
 * recompensas, sorteio) mora em `@tia/game-core` e nos dados de `@tia/config`.
 */

import { Panel } from "@tia/ui";
import { ENEMY_ROLE_LABELS, enemyById, type EnemyRole } from "@tia/config";
import { GameState, allFloors, floorDef, floorPoolOdds } from "@tia/game-core";
import { formatInt } from "./format.js";
import { HuntControls } from "./HuntControls.js";
import { BotPanel } from "./BotPanel.js";

export function TowerScreen({ state }: { state: GameState }) {
  const floor = state.currentFloor;
  const info = state.floorInfo(floor);
  const hunt = state.data.hunt;
  const activeId = state.data.team.activeHeroId;
  const hero = state.data.heroes.find((h) => h.id === activeId) ?? null;
  const def = floorDef(floor);
  const odds = floorPoolOdds(floor);
  const heroGap = hero ? hero.level / Math.max(1, def.enemyLevel) : 1;

  return (
    <>
      <Panel title={`Torre — Andar ${floor} · ${info.name}`}>
        <p className="tia-note">
          Faixa do Rei: Nv {formatInt(def.minLevel)}–{formatInt(def.maxLevel)} · Inimigos nível {formatInt(def.enemyLevel)} · Requer Rei Nv{" "}
          {formatInt(def.requiredKingLevel)}. Os dados da caçada (HP, XP/h, Coin/h, Custo/h…) ficam no painel sob o jogo — botão “Dados” no canto da arena.
        </p>
        {hero && heroGap < 0.9 && (
          <p className="tia-note tia-note--bad">
            Seu herói ativo (Nv {formatInt(hero.level)}) está bem abaixo do nível dos inimigos deste andar — o risco de derrota é alto. Suba de nível
            em um andar mais baixo.
          </p>
        )}
        <ul className="tia-pool" aria-label="Inimigos deste andar">
          {odds.map(({ enemy, chance }) => (
            <li key={enemy.id} className="tia-pool__row">
              <span className={`tia-role tia-role--${enemy.role}`}>{ENEMY_ROLE_LABELS[enemy.role]}</span>
              <span className="tia-pool__name">{enemy.name}</span>
              <span className="tia-pool__dmg">{enemy.damageType === "magic" ? "mágico" : "físico"}</span>
              <span className="tia-pool__chance">{Math.round(chance * 100)}%</span>
            </li>
          ))}
        </ul>

        {hunt?.kind === "defeated" && !state.bot.autoReturnFromHub && (
          <p className="tia-note tia-note--bad">
            O herói caiu e a caçada terminou — nenhuma recompensa foi perdida, mas nada foi creditado. Recomeçar é decisão sua (o herói recupera o HP ao
            reiniciar, se a cura estiver configurada).
          </p>
        )}
        {hunt?.kind === "paused" && (
          <p className="tia-note">
            A caçada está em pausa para descanso: o herói recuperou o HP e o loop automático ficou parado por sua conta. Retome quando quiser.
          </p>
        )}
        {!activeId && <p className="tia-muted">Escolha um herói ativo. A Torre não escolhe por você.</p>}

        <HuntControls state={state} />
      </Panel>
      <BotPanel state={state} />
      <FloorPicker state={state} />
    </>
  );
}

/** Lista de andares: faixa de nível, bloqueado/liberado e seleção manual (ADR-021). */
function FloorPicker({ state }: { state: GameState }) {
  const kingLevel = state.data.king.level;
  const current = state.currentFloor;
  const best = state.data.tower.bestFloor;
  const select = (floor: number) => {
    try {
      state.selectFloor(floor);
    } catch (error) {
      console.warn("[ui]", error);
    }
  };
  return (
    <Panel title="Andares da Torre">
      <p className="tia-note">
        Cada andar atende uma faixa de nível do Rei e todos os inimigos dele têm o nível-base da faixa. A troca vale a
        partir da próxima luta. Melhor andar vencido: {best > 0 ? best : "—"}.
      </p>
      <ul className="tia-floors">
        {allFloors().map((f) => {
          const unlocked = kingLevel >= f.requiredKingLevel;
          const isCurrent = f.index === current;
          const roles = Array.from(
            new Set(f.pool.map((p) => enemyById(p.enemyId)?.role).filter((r): r is EnemyRole => !!r)),
          );
          return (
            <li key={f.index}>
              <button
                type="button"
                className={`tia-floor${isCurrent ? " tia-floor--current" : ""}${unlocked ? "" : " tia-floor--locked"}`}
                disabled={!unlocked || isCurrent}
                aria-current={isCurrent ? "true" : undefined}
                onClick={() => select(f.index)}
              >
                <span className="tia-floor__index">{f.index}</span>
                <span className="tia-floor__main">
                  <span className="tia-floor__name">{f.name}</span>
                  <span className="tia-floor__range">
                    Nv {formatInt(f.minLevel)}–{formatInt(f.maxLevel)} · inimigos nv {formatInt(f.enemyLevel)}
                  </span>
                  <span className="tia-floor__roles">
                    {roles.map((r) => (
                      <span key={r} className={`tia-role tia-role--${r}`}>
                        {ENEMY_ROLE_LABELS[r]}
                      </span>
                    ))}
                  </span>
                </span>
                <span className="tia-floor__state">
                  {isCurrent ? "Atual" : unlocked ? "Liberado" : `Requer Nv ${formatInt(f.requiredKingLevel)}`}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
