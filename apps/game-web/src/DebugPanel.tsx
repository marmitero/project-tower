/**
 * Painel do Debug Mode (§77) — SÓ DESENVOLVIMENTO. Carregado por `import()` apenas quando
 * `DEBUG_ENABLED` (ver `debug-flag.ts`). A lógica mora em `@tia/game-core/debug.ts`.
 */
import { useMemo, useState } from "react";
import { ActionButton, Panel } from "@tia/ui";
import { classes, config, identitiesForClass, RARITY_ORDER, type Rarity } from "@tia/config";
import { DEBUG_UNAVAILABLE, createDebugTools, type GameState } from "@tia/game-core";
import type { HeroId } from "@tia/contracts";

interface Props {
  state: GameState;
}

export default function DebugPanel({ state }: Props) {
  const tools = useMemo(() => createDebugTools(state), [state]);
  const [open, setOpen] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [amount, setAmount] = useState(10_000);
  const [heroId, setHeroId] = useState<string>("");
  const [level, setLevel] = useState(100);
  const [classId, setClassId] = useState(classes[0]!.id as string);
  const [identityId, setIdentityId] = useState("");
  const [rarity, setRarity] = useState<Rarity>("rare");
  const [xValue, setXValue] = useState(2);
  const [floor, setFloor] = useState(1);
  const [hours, setHours] = useState(3);
  const [bossId, setBossId] = useState(config.boss.bosses[0]!.id);
  const [templateId, setTemplateId] = useState("");

  const heroes = state.data.heroes;
  const hid = (heroId || heroes[0]?.id) as HeroId | undefined;

  /** Executa uma ação e registra o resultado — erro vira linha no log, nunca derruba o jogo. */
  const run = (fn: () => string | { toString(): string } | object) => {
    try {
      const out = fn();
      const text = typeof out === "string" ? out : "id" in (out as object) ? `Criado: ${(out as { id: string }).id}` : JSON.stringify(out, (_k, v) => (typeof v === "bigint" ? v.toString() : v));
      setLog((l) => [text, ...l].slice(0, 8));
    } catch (error) {
      setLog((l) => [`Erro: ${error instanceof Error ? error.message : String(error)}`, ...l].slice(0, 8));
    }
  };

  if (!open) {
    return (
      <button type="button" className="tia-debug__toggle" onClick={() => setOpen(true)} aria-label="Abrir Debug Mode">
        DEBUG
      </button>
    );
  }

  const num = (v: number, set: (n: number) => void, label: string) => (
    <label className="tia-debug__field">
      {label}
      <input type="number" value={v} onChange={(e) => set(Number(e.target.value))} />
    </label>
  );

  return (
    <aside className="tia-debug" aria-label="Debug Mode (somente desenvolvimento)">
      <Panel title="Debug Mode — só desenvolvimento" actions={<ActionButton label="Fechar" variant="secondary" onClick={() => setOpen(false)} />}>
        <p className="tia-note">Esta janela não existe na versão do jogador (§77/§93).</p>

        <fieldset className="tia-debug__group">
          <legend>Economia e XP</legend>
          {num(amount, setAmount, "Quantidade")}
          <div className="tia-debug__row">
            <ActionButton label="+ Coin" onClick={() => run(() => tools.addCoins(amount))} />
            <ActionButton label="+ Diamante" onClick={() => run(() => tools.addDiamonds(amount))} />
            <ActionButton label="+ XP do Rei" onClick={() => run(() => tools.addKingXp(amount))} />
            <ActionButton label="+ XP do herói" onClick={() => hid && run(() => tools.addHeroXp(hid, amount))} />
          </div>
        </fieldset>

        <fieldset className="tia-debug__group">
          <legend>Nível e estrelas</legend>
          <label className="tia-debug__field">
            Herói
            <select value={hid ?? ""} onChange={(e) => setHeroId(e.target.value)}>
              {heroes.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} (Nv {h.level})
                </option>
              ))}
            </select>
          </label>
          {num(level, setLevel, "Nível / estrelas")}
          <div className="tia-debug__row">
            <ActionButton label="Nível do Rei" onClick={() => run(() => tools.setKingLevel(level))} />
            <ActionButton label="Nível do herói" onClick={() => hid && run(() => tools.setHeroLevel(hid, level))} />
            <ActionButton label="Estrelas" onClick={() => hid && run(() => tools.setHeroStars(hid, level))} />
            <ActionButton label="Curar todos" onClick={() => run(() => tools.healAll())} />
          </div>
        </fieldset>

        <fieldset className="tia-debug__group">
          <legend>Criar herói, fragmentos e equipamento</legend>
          <div className="tia-debug__row">
            <label className="tia-debug__field">
              Classe
              <select value={classId} onChange={(e) => { setClassId(e.target.value); setIdentityId(""); }}>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="tia-debug__field">
              Identidade
              <select value={identityId} onChange={(e) => setIdentityId(e.target.value)}>
                <option value="">sorteada / da classe</option>
                {identitiesForClass(classId).map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="tia-debug__field">
              Raridade
              <select value={rarity} onChange={(e) => setRarity(e.target.value as Rarity)}>
                {RARITY_ORDER.map((r) => (
                  <option key={r} value={r}>
                    {config.equipment.rarity[r].label}
                  </option>
                ))}
              </select>
            </label>
            <label className="tia-debug__field">
              Item
              <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                <option value="">sorteado</option>
                {config.equipment.templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            {num(xValue, setXValue, "X (0,5–2,5)")}
          </div>
          <div className="tia-debug__row">
            <ActionButton label="Criar herói" onClick={() => run(() => tools.createHero(classId, rarity, identityId || undefined))} />
            <ActionButton label="+ Fragmentos" onClick={() => run(() => tools.addFragments(classId, rarity, Math.max(1, Math.round(amount / 1000))))} />
            <ActionButton
              label="Criar equipamento"
              onClick={() => run(() => tools.createEquipment({ rarity, x: xValue, ...(templateId ? { templateId } : {}) }))}
            />
            <ActionButton label="+ 10 poções" onClick={() => run(() => tools.addConsumable("potion_basic", 10))} />
            <ActionButton label="+ 3 revives" onClick={() => run(() => tools.addConsumable("revive_basic", 3))} />
          </div>
        </fieldset>

        <fieldset className="tia-debug__group">
          <legend>Torre, combate e chefes</legend>
          <div className="tia-debug__row">
            {num(floor, setFloor, "Andar")}
            <ActionButton label="Ir ao andar" onClick={() => run(() => tools.setFloor(floor))} />
            <ActionButton label="Iniciar batalha" onClick={() => run(() => tools.startBattle())} />
            <ActionButton label="Matar inimigo" onClick={() => run(() => tools.killEnemy())} />
            <ActionButton label="Matar herói" variant="danger" onClick={() => run(() => tools.killHero())} />
          </div>
          <div className="tia-debug__row">
            <label className="tia-debug__field">
              Chefe
              <select value={bossId} onChange={(e) => setBossId(e.target.value)}>
                {config.boss.bosses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <ActionButton label="Iniciar chefe" onClick={() => run(() => tools.startBoss(bossId))} />
            <ActionButton label="Zerar tentativas" onClick={() => run(() => tools.resetBossAttempts())} />
          </div>
        </fieldset>

        <fieldset className="tia-debug__group">
          <legend>Testar sistemas</legend>
          <div className="tia-debug__row">
            <ActionButton label="Testar loot (10 mil abates)" onClick={() => run(() => tools.testLoot(10_000))} />
            {num(hours, setHours, "Horas fora")}
            <ActionButton label="Testar offline" onClick={() => run(() => tools.testOffline(hours))} />
          </div>
          <ul className="tia-debug__off">
            {DEBUG_UNAVAILABLE.map((d) => (
              <li key={d.id}>
                <ActionButton label={d.label} variant="secondary" disabled hint={d.reason} />
                <span className="tia-muted">{d.reason}</span>
              </li>
            ))}
          </ul>
        </fieldset>

        <ol className="tia-debug__log" aria-live="polite">
          {log.map((line, i) => (
            <li key={`${i}-${line}`}>{line}</li>
          ))}
        </ol>
      </Panel>
    </aside>
  );
}
