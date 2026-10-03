/**
 * App — a cola entre estado de jogo e tela.
 *
 * §63 — a UI nunca decide regra. Este componente LÊ o `GameState`, formata
 * e despacha intenções. Se uma decisão de gameplay aparecesse aqui, ela
 * estaria no lugar errado: em `game-core`, testável sem navegador.
 */

import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { ActionButton, MissingAssetsWarning, Panel, ProgressBar, StatPill } from "@tia/ui";
import { classes, config } from "@tia/config";
import {
  GameState,
  heroCodex,
  kingProgress,
  heroProgress,
  heroPower,
  heroCombatStats,
  searchingProgress,
  slotRequirement,
  teamHeroes,
} from "@tia/game-core";
import type { HeroId } from "@tia/contracts";
import type { BotAction, LootNotice } from "@tia/game-core";
import { boot, createGame, startLoop, type LoopHandle } from "./boot.js";
import { loadAssetManifest, assetUrl, type AssetManifest } from "./render/assets.js";
import { BattleCanvas } from "./render/BattleCanvas.js";
import { battleFeedbackQueue } from "./render/BattleRenderer.js";
import { CreationScreen, type CreationResult } from "./CreationScreen.js";
import { TowerScreen } from "./TowerScreen.js";
import { InventoryScreen, LootToasts } from "./InventoryScreen.js";
import { MarketScreen } from "./MarketScreen.js";
import { BossScreen, BossResultModal } from "./BossScreen.js";
import { OfflineReportModal } from "./OfflineReportModal.js";
import { DEBUG_ENABLED } from "./debug-flag.js";

/** Debug Mode: só existe no bundle quando `VITE_DEBUG_MODE=true` (ver `debug-flag.ts`). */
const DebugPanel = DEBUG_ENABLED ? lazy(() => import("./DebugPanel.js")) : null;

type Screen = "king" | "heroes" | "tower" | "team" | "inventory" | "market" | "boss";

const SCREENS: { id: Screen; label: string }[] = [
  { id: "king", label: "Rei" },
  { id: "heroes", label: "Heróis" },
  { id: "team", label: "Equipe" },
  { id: "inventory", label: "Inventário" },
  { id: "market", label: "Market" },
  { id: "tower", label: "Torre" },
  { id: "boss", label: "Arena" },
];

export function App() {
  const [state, setState] = useState<GameState | null>(null);
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Screen>("king");
  const [now, setNow] = useState(() => Date.now());
  const [manifest, setManifest] = useState<AssetManifest | null>(null);
  const loopRef = useRef<LoopHandle | null>(null);
  const [loot, setLoot] = useState<{ id: number; notice: LootNotice; at: number }[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const lootSeq = useRef(0);

  /** Drops recentes (ADR-023): ficam ~8 s na tela; no máx. 4. */
  const pushLoot = useCallback((drops: LootNotice[]) => {
    const at = Date.now();
    setLoot((prev) => [...prev, ...drops.map((notice) => ({ id: (lootSeq.current += 1), notice, at }))].slice(-4));
  }, []);
  const showMessage = useCallback((text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage((m) => (m === text ? null : m)), 5000);
  }, []);

  /** O Bot agiu online (poção, revive, Hub): vira aviso curto. No offline entra no relatório. */
  const onBotAction = useCallback(
    (a: BotAction) => {
      if (a.kind === "potion") showMessage(`Bot: ${a.name} (+${a.healed} de vida).`);
      else if (a.kind === "revive") showMessage(`Bot: ${a.name} — o herói voltou à luta!`);
      else if (a.kind === "hub_enter") showMessage("O herói caiu — recuperando no Hub.");
      else showMessage("O herói se recuperou e voltou à Torre.");
    },
    [showMessage],
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const { state: gameState } = await boot({
        onStateChanged: (s) => {
          if (!cancelled) setState(s);
        },
        // §64 — os eventos da batalha viram apresentação (BattleScene drena).
        onBattleEvents: (events) => battleFeedbackQueue.push(events),
        onLoot: pushLoot,
        onBotAction,
      });
      if (cancelled) return;

      // Sem save não existe Rei: `state: null` mostra a criação.
      if (gameState) {
        setState(gameState);
        // ADR-026 — voltar ao jogo SIMULA o tempo fora (até 2 h Free) antes de o loop começar;
        // o relatório aparece no "Bem-vindo de volta". `claimOffline` também marca `lastActiveAt`.
        gameState.claimOfflineSafe();
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

  /** Intenção de criação do Rei. A regra mora em `createGame`. */
  const create = useCallback((result: CreationResult) => {
    void (async () => {
      const gameState = await createGame({
        nickname: result.nickname,
        skinId: result.skinId,
        heroId: result.heroId,
        onStateChanged: (s) => setState(s),
        onBattleEvents: (events) => battleFeedbackQueue.push(events),
        onLoot: pushLoot,
        onBotAction,
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
        {screen === "inventory" && <InventoryScreen state={state} notify={showMessage} />}
        {screen === "market" && <MarketScreen state={state} notify={showMessage} />}
        {screen === "tower" && <TowerScreen state={state} searching={searching} />}
        {screen === "boss" && <BossScreen state={state} />}
      </main>

      {state.bossResult && (
        <BossResultModal
          result={state.bossResult}
          onClose={() => {
            // Fim da atividade: o jogador volta ao Reino, não à Torre (ADR-027).
            state.dismissBossResult();
            setScreen("king");
          }}
        />
      )}
      {state.offlineReport && <OfflineReportModal report={state.offlineReport} onClose={() => state.dismissOfflineReport()} />}
      <LootToasts notices={loot.filter((l) => now - l.at < 8000)} />
      {message && (
        <p className="tia-flash" role="alert">
          {message}
        </p>
      )}

      {DebugPanel && (
        <Suspense fallback={null}>
          <DebugPanel state={state} />
        </Suspense>
      )}

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
  const huntLabel = state.activeBossId
    ? "Chefe!"
    : state.activeBattle
    ? "Em combate"
    : hunt?.kind === "searching"
      ? "Procurando…"
      : hunt?.kind === "defeated"
        ? state.bot.autoReturnFromHub
          ? `Hub ${Math.ceil(state.hubRemainingMs() / 1000)}s`
          : "Derrota"
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
            combate: sua função é a conta, os slots e a progressão do Reino.
          </p>
          <ProgressBar
            label={`Nível ${king.level}`}
            value={kingProgress(king)}
            max={1}
            color="#7aa2f7"
            readout={`${king.xp.toLocaleString("pt-BR")} XP`}
          />
          <p className="tia-note">
            Offline: ao voltar, o jogo simula até {Math.round(offline.capMs / 3_600_000)} h de caçada como se você tivesse
            ficado jogando (Bot incluso).
          </p>
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
        Heróis são ilimitados. Todo herói tem XP próprio, separado do Rei.
        Você começou com 1 campeão; os outros são obtidos pelo mundo.
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
              <span className={`tia-rarity tia-rarity--${hero.rarity}`}>{config.equipment.rarity[hero.rarity].label}</span>
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
        história e raridade.
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
              <StatPill label="Status" value={entry.copies > 1 ? `Recrutado ×${entry.copies}` : "Recrutado"} tone="good" />
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
        A equipe é gerenciamento e progressão. Na Torre, apenas 1 herói luta por vez; no Boss,
        a equipe inteira ataca junto. O XP de herói é dividido entre os membros da equipe:
        quanto mais heróis, mais lento cada um evolui.
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
                          hint="Escolhe quem luta na Torre"
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
          <p className="tia-muted">Escolha em qual slot cada herói entra — nada entra sozinho.</p>
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
