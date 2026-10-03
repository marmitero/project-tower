/**
 * App — a cola entre estado de jogo e tela.
 *
 * §63 — a UI nunca decide regra. Este componente LÊ o `GameState`, formata
 * e despacha intenções. Se uma decisão de gameplay aparecesse aqui, ela
 * estaria no lugar errado: em `game-core`, testável sem navegador.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActionButton, MissingAssetsWarning, Panel, ProgressBar, StatPill } from "@tia/ui";
import { classes, config } from "@tia/config";
import {
  GameState,
  heroCodex,
  kingProgress,
  heroProgress,
  heroPower,
  searchingProgress,
  slotRequirement,
  teamHeroes,
} from "@tia/game-core";
import type { HeroId } from "@tia/contracts";
import { boot, createGame, startLoop, type LoopHandle } from "./boot.js";
import { loadAssetManifest, assetUrl, type AssetManifest } from "./render/assets.js";
import { BattleCanvas } from "./render/BattleCanvas.js";
import { battleFeedbackQueue } from "./render/BattleRenderer.js";
import { CreationScreen, type CreationResult } from "./CreationScreen.js";

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
  const [ready, setReady] = useState(false);
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
        // §64 — os eventos da batalha viram apresentação (BattleScene drena).
        onBattleEvents: (events) => battleFeedbackQueue.push(events),
      });
      if (cancelled) return;

      // Sem save não existe Rei (§5): `state: null` mostra a criação.
      if (gameState) {
        setState(gameState);
        gameState.markActive();
        // O loop é o ÚNICO motor de tempo. Nenhum `setInterval` espalhado
        // pela UI: dois timers brigariam por quem "possui" o estado.
        loopRef.current = startLoop(gameState, () => Date.now(), () => {
          setNow(Date.now());
        });
      }
      setReady(true);
      void loadAssetManifest().then((m) => {
        if (!cancelled) setManifest(m);
        // §62 — a identidade visual vem do pack: a moldura 9-slice e o
        // pergaminho entram como variáveis CSS, sem o CSS montar caminho.
        const frame = assetUrl("ui/frame_9slice_stone");
        const ornate = assetUrl("ui/panel_ornate");
        if (frame) document.documentElement.style.setProperty("--asset-frame-9", `url("${frame}")`);
        if (ornate) document.documentElement.style.setProperty("--asset-panel-ornate", `url("${ornate}")`);
      });
    })();

    return () => {
      cancelled = true;
      loopRef.current?.stop();
      loopRef.current = null;
    };
  }, []);

  /** Intenção de criação do Rei (§5). A regra mora em `createGame`. */
  const create = useCallback((result: CreationResult) => {
    void (async () => {
      const gameState = await createGame({
        nickname: result.nickname,
        skinId: result.skinId,
        heroId: result.heroId,
        onStateChanged: (s) => setState(s),
        onBattleEvents: (events) => battleFeedbackQueue.push(events),
      });
      setState(gameState);
      gameState.markActive();
      loopRef.current = startLoop(gameState, () => Date.now(), () => {
        setNow(Date.now());
      });
    })();
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

  /** Intenção de trocar a skin do Rei (§5, cosmético). */
  const changeSkin = useCallback((skinId: string) => {
    setState((prev) => {
      if (!prev) return prev;
      try {
        prev.changeSkin(skinId);
      } catch (error) {
        console.warn("[ui]", error);
      }
      return prev;
    });
  }, []);

  if (!ready) {
    return (
      <div className="tia-app tia-app--loading">
        <p>Carregando…</p>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="tia-app">
        {manifest && manifest.missing.length > 0 && <MissingAssetsWarning ids={manifest.missing} />}
        <CreationScreen onSubmit={create} />
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
        {screen === "king" && <KingScreen state={state} onChangeSkin={changeSkin} />}
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
  const hunt = state.data.hunt;
  const huntLabel = state.activeBattle
    ? "Em combate"
    : hunt?.kind === "searching"
      ? "Procurando…"
      : hunt?.kind === "defeated"
        ? "Derrota"
        : "No Reino";
  return (
    <header className="tia-hud">
      <div className="tia-hud__identity">
        {assetUrl(king.portraitAssetId) && (
          <img
            className="tia-hud__portrait"
            src={assetUrl(king.portraitAssetId) ?? undefined}
            alt={`Retrato de ${king.nickname}`}
          />
        )}
        <div className="tia-hud__identity-text">
          <strong>{king.nickname}</strong>
          <span>Rei · Nv {king.level}</span>
        </div>
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
        <StatPill
          label="Caçada"
          value={huntLabel}
          tone={hunt?.kind === "defeated" ? "bad" : state.activeBattle ? "good" : "neutral"}
        />
        <StatPill label="Coin" value={state.data.wallet.coins.toLocaleString("pt-BR")} tone="warn" />
        <StatPill label="Diamante" value={state.data.wallet.diamonds.toLocaleString("pt-BR")} />
      </div>
    </header>
  );
}

function KingScreen({ state, onChangeSkin }: { state: GameState; onChangeSkin: (skinId: string) => void }) {
  const king = state.data.king;
  const offline = state.offlinePreview;
  const skins = config.account.king.skins;
  return (
    <Panel title="O Rei">
      <div className="tia-king">
        <img
          className="tia-king__body"
          src={assetUrl(skins.find((s) => s.id === king.skinId)?.assetId ?? king.portraitAssetId) ?? undefined}
          alt={`Aparência ${king.displayName}`}
        />
        <div className="tia-king__facts">
          <p>
            <strong>{king.displayName}</strong> é a meta-personagem da sua conta. O Rei não entra no
            combate: sua função é a conta, os slots e a progressão do Reino (§8, §46).
          </p>
          <ProgressBar
            label={`Nível ${king.level}`}
            value={kingProgress(king)}
            max={1}
            color="#7aa2f7"
            readout={`${king.xp.toLocaleString("pt-BR")} XP`}
          />
          {offline.creditedDurationMs > 0 && (
            <StatPill
              label="Offline pendente"
              value={`${Math.round(offline.creditedDurationMs / 60000)} min`}
              tone="good"
            />
          )}
          <fieldset className="tia-king__skins">
            <legend>Aparência</legend>
            <div className="tia-king__skin-row">
              {skins.map((skin) => (
                <ActionButton
                  key={skin.id}
                  label={skin.name}
                  variant={skin.id === king.skinId ? "primary" : "secondary"}
                  hint={`Vestir ${skin.name}`}
                  onClick={() => onChangeSkin(skin.id)}
                />
              ))}
            </div>
          </fieldset>
        </div>
      </div>
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
  const codex = heroCodex(roster);
  return (
    <Panel title={`Heróis (${roster.length})`}>
      <p className="tia-note">
        Heróis são ilimitados (§13). Todo herói tem XP próprio, separado do Rei (§45).
        Você começou com 1 campeão; os outros são obtidos pelo mundo (§10).
      </p>
      {roster.map((hero) => {
        const assigned = state.data.team.members.indexOf(hero.id);
        const cls = classes.find((c) => c.id === hero.classId);
        const portrait = assetUrl(hero.portraitAssetId);
        return (
          <div className="tia-hero" key={hero.id}>
            <div className="tia-hero__head">
              {portrait && <img className="tia-hero__portrait" src={portrait} alt="" />}
              <strong>{hero.name}</strong>
              <span>
                {cls?.name ?? hero.classId}
                {cls ? ` · ${cls.role}` : ""}
              </span>
            </div>
            <ProgressBar
              label={`Nv ${hero.level}`}
              value={heroProgress(hero)}
              max={1}
              color="#9ece6a"
              readout={`${hero.xp.toLocaleString("pt-BR")} XP`}
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

      <h2 className="tia-codex__title">Códice de campeões</h2>
      <p className="tia-note">
        Os campeões ainda não recrutados aguardam ser encontrados — cada um com sua própria
        história e raridade (§109).
      </p>
      <div className="tia-codex">
        {codex.map((entry) => (
          <div
            className={`tia-codex__entry ${entry.status === "locked" ? "tia-codex__entry--locked" : ""}`}
            key={entry.identity.id}
          >
            {entry.portraitAssetId && (
              <img className="tia-codex__portrait" src={assetUrl(entry.portraitAssetId) ?? undefined} alt="" />
            )}
            <strong>{entry.identity.name}</strong>
            <span className="tia-codex__epithet">{entry.identity.epithet}</span>
            {entry.status === "owned" ? (
              <StatPill label="Status" value="Recrutado" tone="good" />
            ) : (
              <span className="tia-codex__hint">{entry.acquisitionHint}</span>
            )}
          </div>
        ))}
      </div>
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
  const unassigned = state.data.heroes.filter((h) => !team.members.includes(h.id));
  const kingLevel = state.data.king.level;
  const coins = state.data.wallet.coins;

  return (
    <Panel title="Equipe">
      <p className="tia-note">
        A equipe é gerenciamento e progressão. Na Torre, apenas 1 herói luta por vez (§17/§79); no Boss,
        a equipe inteira ataca junto (§24/§80). O XP de herói é dividido entre os membros da equipe:
        quanto mais heróis, mais lento cada um evolui (§20).
      </p>
      <div className="tia-slots">
        {([0, 1, 2] as const).map((index) => {
          const req = slotRequirement(index);
          const unlocked = index < team.unlockedSlots;
          const hero = state.data.heroes.find((h) => h.id === team.members[index]);
          const canAfford = coins >= BigInt(req.costCoin);
          const hasLevel = kingLevel >= req.kingLevel;
          return (
            <div className={`tia-slot ${unlocked ? "" : "tia-slot--locked"}`} key={index}>
              <strong>Slot {index + 1}</strong>
              {unlocked ? (
                <>
                  <span>{hero ? hero.name : "vazio"}</span>
                  {hero ? (
                    <>
                      <ProgressBar
                        label={`Nv ${hero.level}`}
                        value={heroProgress(hero)}
                        max={1}
                        color="#9ece6a"
                        readout={`${hero.xp.toLocaleString("pt-BR")} XP`}
                      />
                      <div className="tia-slot__actions">
                        <ActionButton
                          label={team.activeHeroId === hero.id ? "Ativo" : "Tornar ativo"}
                          variant={team.activeHeroId === hero.id ? "primary" : "secondary"}
                          hint="Escolhe quem luta na Torre (§19)"
                          onClick={() => {
                            try {
                              state.selectActiveHero(hero.id);
                            } catch (error) {
                              console.warn("[ui]", error);
                            }
                          }}
                        />
                        <ActionButton
                          label="Remover"
                          variant="secondary"
                          hint="Tira o herói do slot (não apaga o herói)"
                          onClick={() => {
                            try {
                              state.removeHeroFromSlot(index);
                            } catch (error) {
                              console.warn("[ui]", error);
                            }
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <span className="tia-muted">Coloque um herói pelos botões abaixo.</span>
                  )}
                </>
              ) : (
                <>
                  <span>
                    Requer Rei Nv {req.kingLevel} + {req.costCoin.toLocaleString("pt-BR")} Coin
                  </span>
                  <ActionButton
                    label="Desbloquear"
                    disabled={!hasLevel || !canAfford}
                    hint={
                      !hasLevel
                        ? `Seu Rei está no nível ${kingLevel}`
                        : !canAfford
                          ? "Coin insuficiente"
                          : `Gastar ${req.costCoin.toLocaleString("pt-BR")} Coin`
                    }
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
            </div>
          );
        })}
      </div>

      {unassigned.length > 0 && (
        <div className="tia-pool">
          <strong>Disponíveis</strong>
          <p className="tia-muted">Escolha em qual slot cada herói entra (§19 — nada entra sozinho).</p>
          {unassigned.map((h) => (
            <div className="tia-pool__row" key={h.id}>
              <span className="tia-pool__name">{h.name}</span>
              {([0, 1, 2] as const).map((slot) => (
                <ActionButton
                  key={slot}
                  label={`Slot ${slot + 1}`}
                  variant="secondary"
                  disabled={slot >= team.unlockedSlots || team.members[slot] != null}
                  onClick={() => onAssign(h.id, slot)}
                />
              ))}
            </div>
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
  const remainingMs = state.searchingRemainingMs();
  const activeId = state.data.team.activeHeroId;
  const hero = state.data.heroes.find((h) => h.id === activeId) ?? null;
  const hpRatio = hero && hero.stats.hp > 0 ? hero.currentHp / hero.stats.hp : 1;
  const act = (fn: () => void) => () => {
    try {
      fn();
    } catch (error) {
      console.warn("[ui]", error);
    }
  };

  return (
    <Panel title={`Torre — Andar ${floor}`}>
      <p className="tia-note">
        {info.name} · Nível {info.enemyLevel} · Requer Rei Nv {info.requiredKingLevel}
      </p>
      <StatPill label="Melhor andar" value={state.data.tower.bestFloor} />
      <StatPill
        label="Status"
        value={
          state.activeBattle
            ? "Em combate"
            : hunt?.kind === "searching"
              ? "Procurando…"
              : hunt?.kind === "defeated"
                ? "Derrota"
                : hunt?.kind === "paused"
                  ? "Descansando"
                  : "Pronto"
        }
        tone={
          hunt?.kind === "defeated"
            ? "bad"
            : state.activeBattle
              ? "good"
              : hunt?.kind === "paused"
                ? "good"
                : "neutral"
        }
      />
      {hero && (
        <StatPill
          label="HP do herói"
          value={`${Math.max(0, hero.currentHp)}/${hero.stats.hp}`}
          tone={hpRatio <= 0.3 ? "bad" : hpRatio < 1 ? "neutral" : "good"}
        />
      )}

      {hunt?.kind === "searching" && (
        <div className="tia-searching" aria-live="polite">
          <span className="tia-searching__label">
            PROCURANDO<span className="tia-searching__dots" aria-hidden="true">…</span>{" "}
            {(remainingMs / 1000).toFixed(1)}s
          </span>
          <ProgressBar label="" value={searching} max={1} color="#e0af68" />
        </div>
      )}

      {hunt?.kind === "defeated" && (
        <p className="tia-note tia-note--bad">
          O herói caiu e a caçada terminou — nenhuma recompensa foi perdida, mas nada foi
          creditado (§26). Recomeçar é uma sua decisão (o herói recupera o HP ao reiniciar,
          se a cura estiver configurada — ADR-020).
        </p>
      )}

      {hunt?.kind === "paused" && (
        <p className="tia-note">
          A caçada está em pausa para descanso: o herói recuperou o HP e o loop automático
          ficou parado por sua conta. Retome quando quiser (§7.2).
        </p>
      )}

      {!state.data.team.activeHeroId && (
        <p className="tia-muted">
          Escolha um herói ativo. A Torre não escolhe por você (§19).
        </p>
      )}

      <ActionButton
        label={
          hunt?.kind === "defeated"
            ? "Recomeçar a caçada"
            : state.activeBattle
              ? "Em combate"
              : hunt?.kind === "searching"
                ? "Procurando…"
                : "Entrar na Torre"
        }
        disabled={!activeId || state.activeBattle !== null || hunt?.kind === "searching"}
        onClick={act(() => {
          if (hunt?.kind === "defeated") state.restartHunt();
          else state.startTower();
        })}
      />

      {hunt?.kind !== "defeated" && (
        <ActionButton
          label="Descansar (recuperar HP)"
          variant="secondary"
          disabled={!activeId || state.activeBattle !== null || hunt?.kind === "searching" || hpRatio >= 1}
          onClick={act(() => state.restActiveHero())}
        />
      )}

      {hunt?.kind === "paused" && (
        <ActionButton
          label="Retomar a caçada"
          variant="secondary"
          disabled={state.activeBattle !== null}
          onClick={act(() => state.beginSearch())}
        />
      )}
    </Panel>
  );
}
