/**
 * App — a cola entre estado de jogo e tela.
 *
 * §63 — a UI nunca decide regra. Este componente LÊ o `GameState`, formata
 * e despacha intenções. Se uma decisão de gameplay aparecesse aqui, ela
 * estaria no lugar errado: em `game-core`, testável sem navegador.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActionButton, MissingAssetsWarning, Panel, ProgressBar, StatPill } from "@tia/ui";
import { config } from "@tia/config";
import {
  GameState,
  kingProgress,
  heroProgress,
  heroPower,
  searchingProgress,
  slotRequirement,
  teamHeroes,
} from "@tia/game-core";
import type { HeroId } from "@tia/contracts";
import { boot, startLoop, type LoopHandle } from "./boot.js";
import { loadAssetManifest, type AssetManifest } from "./render/assets.js";
import { BattleCanvas } from "./render/BattleCanvas.js";

type Screen = "king" | "heroes" | "tower" | "team" | "inventory";

const SCREENS: { id: Screen; label: string }[] = [
  { id: "king", label: "Rei" },
  { id: "heroes", label: "Heróis" },
  { id: "team", label: "Equipe" },
  { id: "inventory", label: "Inventário" },
  { id: "tower", label: "Torre" },
];

export function App() {
  const [state, setState] = useState<GameState | null>(null);
  const [screen, setScreen] = useState<Screen>("king");
  const [now, setNow] = useState(() => Date.now());
  const [manifest, setManifest] = useState<AssetManifest | null>(null);
  const loopRef = useRef<LoopHandle | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const { state: gameState } = await boot({
        onStateChanged: (s) => {
          if (!cancelled) setState(s);
        },
      });
      if (cancelled) return;

      setState(gameState);
      gameState.markActive();
      void loadAssetManifest().then((m) => {
        if (!cancelled) setManifest(m);
      });

      // O loop é o ÚNICO motor de tempo. Nenhum `setInterval` espalhado
      // pela UI: dois timers brigariam por quem "possui" o estado.
      loopRef.current = startLoop(gameState, () => Date.now(), () => {
        setNow(Date.now());
      });
    })();

    return () => {
      cancelled = true;
      loopRef.current?.stop();
      loopRef.current = null;
    };
  }, []);

  const assign = useCallback((heroId: HeroId, slot: 0 | 1 | 2) => {
    setState((prev) => {
      if (!prev) return prev;
      try {
        prev.assignHeroToSlot(heroId, slot);
      } catch (error) {
        console.warn("[ui]", error);
      }
      return prev;
    });
  }, []);

  if (!state) {
    return (
      <div className="tia-app tia-app--loading">
        <p>Carregando…</p>
      </div>
    );
  }

  const data = state.data;
  const hunt = data.hunt;
  const searching = hunt?.kind === "searching" ? searchingProgress(hunt, now) : 0;

  return (
    <div className="tia-app">
      <Hud state={state} />

      {manifest && manifest.missing.length > 0 && <MissingAssetsWarning ids={manifest.missing} />}

      <BattleCanvas battle={state.activeBattle} />

      <main className="tia-main">
        {screen === "king" && <KingScreen state={state} />}
        {screen === "heroes" && <HeroesScreen state={state} onAssign={assign} />}
        {screen === "team" && <TeamScreen state={state} onAssign={assign} />}
        {screen === "inventory" && <InventoryScreen state={state} />}
        {screen === "tower" && <TowerScreen state={state} searching={searching} />}
      </main>

      <nav className="tia-nav" aria-label="Navegação principal">
        {SCREENS.map((s) => (
          <ActionButton
            key={s.id}
            label={s.label}
            variant={screen === s.id ? "primary" : "secondary"}
            onClick={() => setScreen(s.id)}
          />
        ))}
      </nav>
    </div>
  );
}

function Hud({ state }: { state: GameState }) {
  const king = state.data.king;
  return (
    <header className="tia-hud">
      <div className="tia-hud__identity">
        <strong>{king.nickname}</strong>
        <span>Rei · Nv {king.level}</span>
      </div>
      <div className="tia-hud__bars">
        <ProgressBar
          label="Rei"
          value={kingProgress(king)}
          max={1}
          color="#7aa2f7"
          readout={`Nv ${king.level}`}
        />
      </div>
      <div className="tia-hud__wallet">
        <StatPill label="Coin" value={state.data.wallet.coins.toLocaleString("pt-BR")} tone="warn" />
        <StatPill label="Diamante" value={state.data.wallet.diamonds.toLocaleString("pt-BR")} />
      </div>
    </header>
  );
}

function KingScreen({ state }: { state: GameState }) {
  const king = state.data.king;
  const offline = state.offlinePreview;
  return (
    <Panel title="O Rei">
      <p>
        O Rei é a meta-personagem do jogador. Ele não entra no combate: sua função é a conta, os slots e
        a progressão do Reino (§8, §46).
      </p>
      <ProgressBar
        label={`Nível ${king.level}`}
        value={kingProgress(king)}
        max={1}
        color="#7aa2f7"
        readout={`${king.xp.toString()} XP`}
      />
      {offline.creditedDurationMs > 0 && (
        <StatPill
          label="Offline pendente"
          value={`${Math.round(offline.creditedDurationMs / 60000)} min`}
          tone="good"
        />
      )}
    </Panel>
  );
}

function HeroesScreen({
  state,
  onAssign,
}: {
  state: GameState;
  onAssign: (id: HeroId, slot: 0 | 1 | 2) => void;
}) {
  const inv = state.data.inventory;
  const roster = state.data.heroes;
  return (
    <Panel title={`Heróis (${roster.length})`}>
      <p className="tia-note">
        Heróis são ilimitados (§13). Todo herói tem XP próprio, separado do Rei (§45).
      </p>
      {roster.map((hero) => {
        const assigned = state.data.team.members.indexOf(hero.id);
        return (
          <div className="tia-hero" key={hero.id}>
            <div className="tia-hero__head">
              <strong>{hero.name}</strong>
              <span>{hero.classId}</span>
            </div>
            <ProgressBar
              label={`Nv ${hero.level}`}
              value={heroProgress(hero)}
              max={1}
              color="#9ece6a"
              readout={`${hero.xp.toString()} XP`}
            />
            <StatPill label="Poder" value={Math.round(heroPower(hero, inv))} />
            {assigned >= 0 ? (
              <StatPill label="Slot" value={assigned + 1} tone="good" />
            ) : (
              <div className="tia-hero__assign">
                <ActionButton label="Slot 1" onClick={() => onAssign(hero.id, 0)} disabled={state.data.team.unlockedSlots < 1} />
                <ActionButton label="Slot 2" onClick={() => onAssign(hero.id, 1)} disabled={state.data.team.unlockedSlots < 2} />
                <ActionButton label="Slot 3" onClick={() => onAssign(hero.id, 2)} disabled={state.data.team.unlockedSlots < 3} />
              </div>
            )}
          </div>
        );
      })}
    </Panel>
  );
}

function TeamScreen({
  state,
  onAssign,
}: {
  state: GameState;
  onAssign: (id: HeroId, slot: 0 | 1 | 2) => void;
}) {
  const team = state.data.team;
  const members = teamHeroes(team, state.data.heroes);
  const unassigned = state.data.heroes.filter((h) => !team.members.includes(h.id));

  return (
    <Panel title="Equipe">
      <p className="tia-note">
        A equipe é gerenciamento e progressão. Na Torre, apenas 1 herói luta por vez (§17/§79); no Boss,
        a equipe inteira ataca junto (§24/§80).
      </p>
      <div className="tia-slots">
        {([0, 1, 2] as const).map((index) => {
          const req = slotRequirement(index);
          const unlocked = index < team.unlockedSlots;
          const member = members.find((_, i) => team.members[i] === team.members[index]) ?? null;
          const hero = state.data.heroes.find((h) => h.id === team.members[index]);
          return (
            <div className="tia-slot" key={index}>
              <strong>Slot {index + 1}</strong>
              {unlocked ? (
                <>
                  <span>{hero ? hero.name : "vazio"}</span>
                  {hero && (
                    <ActionButton
                      label={team.activeHeroId === hero.id ? "Ativo" : "Tornar ativo"}
                      variant={team.activeHeroId === hero.id ? "primary" : "secondary"}
                      onClick={() => state.selectActiveHero(hero.id)}
                    />
                  )}
                </>
              ) : (
                <>
                  <span>
                    Requer Rei Nv {req.kingLevel} + {req.costCoin.toLocaleString("pt-BR")} Coin
                  </span>
                  <ActionButton
                    label="Desbloquear"
                    onClick={() => {
                      try {
                        state.unlockTeamSlot(index);
                      } catch (error) {
                        console.warn("[ui]", error);
                      }
                    }}
                  />
                </>
              )}
              {!member && <span className="tia-muted"> </span>}
            </div>
          );
        })}
      </div>

      {unassigned.length > 0 && (
        <div className="tia-pool">
          <strong>Disponíveis</strong>
          {unassigned.map((h) => (
            <ActionButton key={h.id} label={h.name} variant="secondary" onClick={() => onAssign(h.id, 0)} />
          ))}
        </div>
      )}
    </Panel>
  );
}

function InventoryScreen({ state }: { state: GameState }) {
  const items = state.data.inventory.equipment;
  const sorted = useMemo(() => {
    const order = config.inventory.defaultSort;
    return [...items].sort((a, b) => (order === "qualityDesc" ? b.quality - a.quality : a.rarity.localeCompare(b.rarity)));
  }, [items]);

  return (
    <Panel title={`Inventário (${items.length}/${config.inventory.equipmentMaxItems})`}>
      {sorted.length === 0 ? (
        <p className="tia-muted">Nenhum equipamento. 5% dos inimigos deixam drop (§32).</p>
      ) : (
        <ul className="tia-items">
          {sorted.map((item) => (
            <li key={item.id} className="tia-item">
              <span className={`tia-rarity tia-rarity--${item.rarity}`}>{item.rarity}</span>
              <span className="tia-item__slot">{item.slot}</span>
              <span className="tia-item__grade">Nota {item.grade} ({item.quality.toFixed(1)})</span>
              <span className="tia-item__xs">
                {Object.entries(item.xValues)
                  .filter(([, x]) => x > 0)
                  .slice(0, 3)
                  .map(([stat, x]) => `${stat} ×${(x / 10).toFixed(2)}`)
                  .join(" · ")}
              </span>
              <ActionButton
                label="Vender"
                variant="secondary"
                onClick={() => {
                  try {
                    state.sell(item.id);
                  } catch (error) {
                    console.warn("[ui]", error);
                  }
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function TowerScreen({ state, searching }: { state: GameState; searching: number }) {
  const floor = state.currentFloor;
  const info = state.floorInfo(floor);
  const hunt = state.data.hunt;

  return (
    <Panel title={`Torre — Andar ${floor}`}>
      <p className="tia-note">
        {info.name} · Nível {info.enemyLevel} · Requer Rei Nv {info.requiredKingLevel}
      </p>
      <StatPill label="Melhor andar" value={state.data.tower.bestFloor} />
      <StatPill label="Status" value={hunt?.kind ?? "idle"} tone={hunt?.kind === "defeated" ? "bad" : "neutral"} />

      {hunt?.kind === "searching" && (
        <div className="tia-searching">
          <span>PROCURANDO…</span>
          <ProgressBar label="" value={searching} max={1} color="#e0af68" />
        </div>
      )}

      {!state.data.team.activeHeroId && (
        <p className="tia-muted">
          Escolha um herói ativo. A Torre não escolhe por você (§19).
        </p>
      )}

      <ActionButton
        label={state.activeBattle ? "Em combate" : "Entrar na Torre"}
        disabled={!state.data.team.activeHeroId || state.activeBattle !== null || hunt?.kind === "searching"}
        onClick={() => {
          try {
            state.startTower();
          } catch (error) {
            console.warn("[ui]", error);
          }
        }}
      />
    </Panel>
  );
}
