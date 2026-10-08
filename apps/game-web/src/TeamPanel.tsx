/**
 * Painel da Equipe (coluna esquerda, ADR-031): os 3 slots com herói, nível, XP e HP à vista.
 * Os cards são `div`s (não botões): o gerenciamento fica na tela Equipe ("Gerenciar"); aqui só
 * cabem as ações rápidas de uso frequente (escolher o herói ativo).
 */

import { ActionButton, ProgressBar } from "@tia/ui";
import { classes } from "@tia/config";
import { GameState, heroCombatStats, heroProgress, slotRequirement } from "@tia/game-core";
import { assetUrl } from "./render/assets.js";
import { formatCompact, formatInt } from "./format.js";

export function TeamPanel({ state, onManage }: { state: GameState; onManage: () => void }) {
  const team = state.data.team;
  return (
    <aside className="tia-side tia-teampanel" aria-label="Equipe">
      <header className="tia-side__head">
        <h2>Equipe</h2>
        <ActionButton label="Gerenciar" variant="secondary" onClick={onManage} />
      </header>
      <div className="tia-teampanel__slots">
        {([0, 1, 2] as const).map((index) => {
          const unlocked = index < team.unlockedSlots;
          const hero = state.data.heroes.find((h) => h.id === team.members[index]);
          if (!unlocked) {
            const req = slotRequirement(index);
            return (
              <div className="tia-slotcard tia-slotcard--locked" key={index}>
                <span className="tia-slotcard__tag">Slot {index + 1}</span>
                <span className="tia-muted">
                  Bloqueado · Rei Nv {formatInt(req.kingLevel)} + {formatInt(req.costCoin)} Coin
                </span>
              </div>
            );
          }
          if (!hero) {
            return (
              <div className="tia-slotcard tia-slotcard--empty" key={index}>
                <span className="tia-slotcard__tag">Slot {index + 1}</span>
                <span className="tia-muted">Vazio — coloque um herói em Gerenciar.</span>
              </div>
            );
          }
          const active = team.activeHeroId === hero.id;
          const cls = classes.find((c) => c.id === hero.classId);
          const portrait = assetUrl(hero.portraitAssetId);
          const maxHp = heroCombatStats(hero, state.data.inventory).hp;
          const hp = Math.max(0, hero.currentHp);
          return (
            <div className={`tia-slotcard${active ? " tia-slotcard--active tia-slotcard--em-campo" : ""}`} key={index}>
              {active && <div className="tia-slotcard__em-campo-banner">EM CAMPO</div>}
              <div className="tia-slotcard__head">
                {portrait && <img className="tia-slotcard__portrait" src={portrait} alt="" />}
                <div className="tia-slotcard__id">
                  <strong>{hero.name}</strong>
                  <span className="tia-muted">
                    {cls?.name ?? hero.classId} · Nv {formatInt(hero.level)}
                  </span>
                </div>
                <span className="tia-slotcard__tag">{active ? "Ativo" : `Slot ${index + 1}`}</span>
              </div>
              <ProgressBar label="XP" value={heroProgress(hero)} max={1} color="#e0af68" readout={`${Math.round(heroProgress(hero) * 100)}%`} />
              <ProgressBar
                label="HP"
                value={hp}
                max={Math.max(1, maxHp)}
                color={hp / Math.max(1, maxHp) <= 0.3 ? "#d93845" : "#3db85c"}
                readout={`${formatCompact(hp)}/${formatCompact(maxHp)}`}
              />
              {!active && (
                <ActionButton
                  label="Tornar ativo"
                  variant="secondary"
                  hint="Escolhe quem luta na Torre"
                  onClick={() => {
                    try {
                      state.selectActiveHero(hero.id);
                    } catch (error) {
                      console.warn("[ui]", error);
                    }
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
