/**
 * Arena dos Chefes (FASE 12, ADR-027): lista de chefes, requisitos, recompensas, recarga e a luta
 * em curso; mais o modal de resultado (fragmentos em destaque) que devolve o jogador ao Reino.
 *
 * Só apresentação: nível mínimo, recarga/tentativas, recompensa e sorteio moram em `@tia/game-core`
 * e nos dados de `config.boss` — esta tela lê, formata e despacha a intenção "desafiar".
 */

import { ActionButton, Panel, ProgressBar, StatPill } from "@tia/ui";
import { BOSS_STATUS_LABELS, classes, config, type BossDef, type BossFragmentDrop, type Rarity } from "@tia/config";
import { GameState, bossBaseRewards, bossStats, fragmentSummary, type BossResult } from "@tia/game-core";
import { formatCompact, formatInt } from "./format.js";
import { assetUrl } from "./render/assets.js";

const rarityLabel = (r: Rarity) => config.equipment.rarity[r].label;
const className = (id: string) => classes.find((c) => c.id === id)?.name ?? id;

/** 125000 → "2:05"; usado na recarga e no cronômetro da luta. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

function windowText(ms: number): string {
  const h = ms / 3_600_000;
  return h >= 1 ? `${Number.isInteger(h) ? h : h.toFixed(1)} h` : `${Math.round(ms / 60_000)} min`;
}

function attemptsText(def: BossDef): string {
  const a = def.attempts;
  if (a.kind === "none") return "Sem limite de tentativas";
  if (a.kind === "cooldown") return `Recarga: ${windowText(a.afterWinMs)} após vencer · ${windowText(a.afterLossMs)} após perder`;
  return `${a.maxAttempts} tentativa(s) a cada ${windowText(a.windowMs)}`;
}

function FragmentChip({ f }: { f: Pick<BossFragmentDrop, "classId" | "rarity" | "min" | "max" | "chance"> }) {
  const who = f.classId === "any" ? "Fragmento de herói (classe sorteada)" : `Fragmento de ${className(f.classId)}`;
  const qty = f.min === f.max ? `${f.min}` : `${f.min}–${f.max}`;
  const chance = f.chance < 1 ? ` · ${Math.round(f.chance * 100)}%` : "";
  return (
    <li className={`tia-boss__frag tia-rarity--${f.rarity}`}>
      {qty}× {who} <strong>{rarityLabel(f.rarity)}</strong>
      {chance}
    </li>
  );
}

function BossCard({ state, def, canChallenge, why }: { state: GameState; def: BossDef; canChallenge: boolean; why: string | null }) {
  const nowMs = state.nowMs;
  const avail = state.bossAvailability(def.id);
  const rec = state.bossRecord(def.id);
  const stats = bossStats(def);
  const base = bossBaseRewards(def);
  const portrait = def.assets.portrait ? assetUrl(def.assets.portrait) : null;
  const first = rec.firstClearAt === null;
  const resist = Object.entries(def.statusResist).filter(([, v]) => (v ?? 0) > 0) as [keyof typeof BOSS_STATUS_LABELS, number][];

  let badge: { text: string; tone: "good" | "bad" | "warn" | "neutral" } = { text: "Pronto", tone: "good" };
  if (avail.state === "disabled") badge = { text: "Indisponível", tone: "bad" };
  else if (avail.state === "locked") badge = { text: `Requer Rei Nv ${formatInt(def.requiredKingLevel)}`, tone: "bad" };
  else if (avail.state === "cooldown") badge = { text: `Recarga ${formatClock((avail.availableAt ?? nowMs) - nowMs)}`, tone: "warn" };
  else if (avail.state === "no_attempts") badge = { text: `Sem tentativas · volta em ${formatClock((avail.availableAt ?? nowMs) - nowMs)}`, tone: "warn" };
  else if (avail.attemptsLeft !== null) badge = { text: `Pronto · ${avail.attemptsLeft} tentativa(s)`, tone: "good" };

  return (
    <li className={`tia-boss${avail.state === "locked" ? " tia-boss--locked" : ""}`}>
      <div className="tia-boss__head">
        <span className="tia-boss__portrait" style={def.tint !== null ? { borderColor: `#${def.tint.toString(16).padStart(6, "0")}` } : undefined}>
          {portrait ? <img src={portrait} alt="" /> : <span aria-hidden="true">{def.name.slice(0, 1)}</span>}
        </span>
        <div className="tia-boss__title">
          <strong>{def.name}</strong>
          <span className="tia-muted">{def.title}</span>
          <span className="tia-note">
            Nível {formatInt(def.level)} · {def.damageType === "magic" ? "dano mágico" : "dano físico"} · HP {formatCompact(stats.hp)}
          </span>
        </div>
        <StatPill label="Estado" value={badge.text} tone={badge.tone} />
      </div>

      <p className="tia-note">{def.description}</p>

      <ul className="tia-boss__tags" aria-label="Habilidades do chefe">
        {resist.map(([id, v]) => (
          <li key={id} className="tia-boss__tag tia-boss__tag--resist">
            {v >= 1 ? `Imune a ${BOSS_STATUS_LABELS[id]}` : `Resiste a ${BOSS_STATUS_LABELS[id]} (${Math.round(v * 100)}%)`}
          </li>
        ))}
        {def.skills.filter((s) => s.enabled).map((s) => (
          <li key={s.id} className="tia-boss__tag">
            {s.name} · {s.targeting === "all_enemies" ? "atinge a equipe toda" : "um alvo"}
          </li>
        ))}
        {def.phases.map((p) => (
          <li key={p.id} className="tia-boss__tag tia-boss__tag--phase">
            {p.label}
            {p.hpBelowPct !== undefined ? ` · abaixo de ${p.hpBelowPct}% de vida` : ""}
            {p.afterMs !== undefined ? ` · após ${formatClock(p.afterMs)}` : ""}
          </li>
        ))}
      </ul>

      <div className="tia-boss__rewards">
        <strong>Recompensas por vitória</strong>
        <span className="tia-note">
          +{formatCompact(base.coins)} Coin · +{formatCompact(base.kingXp)} XP do Rei · +{formatCompact(base.heroXp)} XP de herói (dividido) ·{" "}
          {def.rewards.equipment.rolls > 0 ? `${def.rewards.equipment.rolls} equipamento(s) garantido(s) (${rarityLabel(def.rewards.equipment.minRarity)} ou melhor)` : "sem equipamento"}
        </span>
        <ul className="tia-boss__frags">
          {def.rewards.fragments.map((f, i) => (
            <FragmentChip key={i} f={f} />
          ))}
        </ul>
        {first && (
          <div className="tia-boss__first">
            <strong>Primeira vitória: Coin e XP ×{def.rewards.firstClearMultiplier} + fragmentos extras</strong>
            <ul className="tia-boss__frags">
              {def.rewards.firstClearFragments.map((f, i) => (
                <FragmentChip key={i} f={f} />
              ))}
            </ul>
          </div>
        )}
      </div>

      <p className="tia-note">
        {attemptsText(def)} · tempo máximo {formatClock(def.timeLimitMs)} · vitórias {formatInt(rec.wins)}
        {rec.bestTimeMs !== null && <> · recorde {formatClock(rec.bestTimeMs)}</>}
      </p>

      <ActionButton
        label={canChallenge ? "Desafiar com a equipe" : (why ?? "Indisponível")}
        disabled={!canChallenge}
        onClick={() => {
          try {
            state.startBoss(def.id);
          } catch (error) {
            console.warn("[ui]", error);
          }
        }}
      />
    </li>
  );
}

/** A luta de chefe em curso: HP do chefe, fase, cronômetro e a equipe. */
function LiveFight({ state }: { state: GameState }) {
  const battle = state.activeBattle;
  if (!battle || battle.mode !== "boss") return null;
  const boss = battle.enemies[0];
  if (!boss) return null;
  const left = (battle.timeLimitMs ?? 0) - battle.elapsedMs;
  return (
    <Panel title={`Em luta — ${boss.name}`}>
      <ProgressBar
        label={boss.phaseLabel ? `${boss.name} · ${boss.phaseLabel}` : boss.name}
        value={boss.hp}
        max={boss.maxHp}
        color="#f7768e"
        readout={`${formatCompact(Math.max(0, boss.hp))}/${formatCompact(boss.maxHp)}`}
      />
      {battle.timeLimitMs !== undefined && (
        <p className={`tia-note${left < 20_000 ? " tia-note--bad" : ""}`} aria-live="off">
          Tempo restante: {formatClock(left)}
        </p>
      )}
      <ul className="tia-boss__team">
        {battle.allies.map((a) => (
          <li key={a.id}>
            <ProgressBar
              label={a.isDefeated ? `${a.name} (caído)` : a.name}
              value={Math.max(0, a.hp)}
              max={a.maxHp}
              color={a.isDefeated ? "#565f89" : "#9ece6a"}
              readout={`${formatCompact(Math.max(0, a.hp))}/${formatCompact(a.maxHp)}`}
            />
          </li>
        ))}
      </ul>
      <ActionButton label="Desistir da luta" variant="danger" onClick={() => state.forfeitBoss()} />
    </Panel>
  );
}

export function BossScreen({ state }: { state: GameState }) {
  const team = state.team;
  const fighting = state.activeBossId !== null;
  const kingLevel = state.data.king.level;
  const frags = fragmentSummary(state.data.inventory);

  const gate = (def: BossDef): { ok: boolean; why: string | null } => {
    if (fighting) return { ok: false, why: "Luta em andamento" };
    const a = state.bossAvailability(def.id);
    if (a.state === "locked") return { ok: false, why: `Requer Rei Nv ${formatInt(def.requiredKingLevel)}` };
    if (a.state === "disabled") return { ok: false, why: "Indisponível" };
    if (a.state === "cooldown") return { ok: false, why: "Em recarga" };
    if (a.state === "no_attempts") return { ok: false, why: "Sem tentativas agora" };
    if (team.length === 0) return { ok: false, why: "Monte uma equipe" };
    if (team.length < config.boss.minTeamSize) return { ok: false, why: `Equipe mínima: ${config.boss.minTeamSize}` };
    return { ok: true, why: null };
  };

  return (
    <>
      <LiveFight state={state} />
      <Panel title="Arena dos Chefes">
        <p className="tia-note">
          Chefes são desafios à parte da Torre: a equipe INTEIRA (até 3 heróis) enfrenta um único chefe, e todos atacam ao mesmo tempo. É a
          fonte de fragmentos de herói, equipamento garantido e Coin. Ao terminar, a caçada da Torre {config.boss.resumeTowerAfter ? "retoma sozinha" : "fica em pausa"} — o HP da Torre{" "}
          {config.boss.persistHpAfter ? "acompanha o da luta" : "não é afetado pela Arena"}.
        </p>
        <StatPill label="Rei" value={`Nv ${formatInt(kingLevel)}`} />
        <StatPill label="Equipe" value={team.length > 0 ? team.map((h) => `${h.name} (Nv ${formatInt(h.level)})`).join(" · ") : "vazia"} tone={team.length > 0 ? "good" : "bad"} />
        {team.length === 1 && <p className="tia-note tia-note--bad">Só 1 herói na equipe: os chefes são calibrados para equipes maiores. Desbloqueie slots e junte fragmentos.</p>}
        {frags.length > 0 && (
          <p className="tia-note">
            Seus fragmentos:{" "}
            {frags.map((f) => `${className(f.classId)} ${rarityLabel(f.rarity)} ${f.count}/${f.required}`).join(" · ")}
          </p>
        )}
      </Panel>
      <Panel title="Chefes">
        <ul className="tia-boss__list">
          {config.boss.bosses.map((def) => {
            const g = gate(def);
            return <BossCard key={def.id} state={state} def={def} canChallenge={g.ok} why={g.why} />;
          })}
        </ul>
      </Panel>
    </>
  );
}

/** Resultado da luta: vitória/derrota/tempo, o que caiu (fragmentos em destaque) e o retorno ao Reino. */
export function BossResultModal({ result, onClose }: { result: BossResult; onClose: () => void }) {
  const r = result.rewards;
  const title = result.won ? "Vitória!" : result.reason === "timeout" ? "Tempo esgotado" : "Derrota";
  return (
    <div className="tia-modal" role="dialog" aria-modal="true" aria-labelledby="tia-boss-title">
      <div className="tia-modal__card">
        <h2 id="tia-boss-title" className={result.won ? "tia-boss__win" : "tia-boss__lose"}>
          {title}
        </h2>
        <p className="tia-note">
          {result.won
            ? `${result.bossName} caiu em ${formatClock(result.durationMs)}.`
            : result.reason === "timeout"
              ? `${result.bossName} resistiu até o fim do tempo (${formatClock(result.durationMs)}).`
              : `A equipe caiu diante de ${result.bossName} após ${formatClock(result.durationMs)}.`}
          {result.firstClear && " Primeira vitória sobre este chefe!"}
        </p>

        {r && r.fragments.length > 0 && (
          <div className="tia-boss__fragbox" aria-label="Fragmentos obtidos">
            <strong>Fragmentos de herói</strong>
            <ul className="tia-boss__frags">
              {r.fragments.map((f, i) => (
                <li key={i} className={`tia-boss__frag tia-rarity--${f.rarity ?? "common"}`}>
                  +{f.amount} × {className(f.classId)} <strong>{rarityLabel(f.rarity ?? "common")}</strong>
                </li>
              ))}
            </ul>
          </div>
        )}

        {r && (
          <ul className="tia-modal__list">
            <li>Coin: <strong>+{formatInt(r.coins)}</strong></li>
            <li>XP do Rei: <strong>+{formatInt(r.kingXp)}</strong></li>
            <li>XP de herói (dividido): <strong>+{formatInt(r.heroXp)}</strong></li>
            {r.equipment.map((e) => (
              <li key={e.id}>
                Equipamento: <strong className={`tia-rarity tia-rarity--${e.rarity}`}>{rarityLabel(e.rarity)}</strong> · Nv {formatInt(e.level)} · Nota {e.grade}
              </li>
            ))}
          </ul>
        )}

        <ul className="tia-modal__list">
          {result.team.map((t) => (
            <li key={t.heroId}>
              {t.name}: {t.fell ? "caiu" : `${formatCompact(t.hp)}/${formatCompact(t.maxHp)} de vida`}
            </li>
          ))}
        </ul>
        <ActionButton label="Voltar ao Reino" onClick={onClose} />
      </div>
    </div>
  );
}
