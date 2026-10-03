/**
 * HUD.
 *
 * §67 — DESKTOP-FIRST + MOBILE-READY, desde o primeiro desenvolvimento.
 * §37 — nenhuma fórmula duplicada aqui: o HUD recebe números prontos do
 * `game-core` e não calcula poder, dano nem progressão.
 *
 * §39 do Master-Prompt (mobile): o jogo não pode depender de hover, mouse
 * ou teclado. Todo elemento interativo tem alvo de toque ≥44px e não usa
 * `:hover` como única forma de revelar informação.
 */

import type { ReactNode } from "react";

export interface ProgressBarProps {
  label: string;
  value: number;
  max: number;
  color: string;
  /** Texto à direita. Formato vem pronto do chamador. */
  readout?: string;
}

export function ProgressBar({ label, value, max, color, readout }: ProgressBarProps) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <div className="tia-bar" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
      <div className="tia-bar__fill" style={{ width: `${ratio * 100}%`, background: color }} />
      <span className="tia-bar__label">{label}</span>
      {readout !== undefined && <span className="tia-bar__readout">{readout}</span>}
    </div>
  );
}

export interface StatPillProps {
  label: string;
  value: ReactNode;
  tone?: "neutral" | "good" | "bad" | "warn";
}

export function StatPill({ label, value, tone = "neutral" }: StatPillProps) {
  return (
    <div className={`tia-pill tia-pill--${tone}`}>
      <span className="tia-pill__label">{label}</span>
      <span className="tia-pill__value">{value}</span>
    </div>
  );
}

export interface PanelProps {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function Panel({ title, children, actions }: PanelProps) {
  return (
    <section className="tia-panel">
      <header className="tia-panel__head">
        <h2 className="tia-panel__title">{title}</h2>
        {actions && <div className="tia-panel__actions">{actions}</div>}
      </header>
      <div className="tia-panel__body">{children}</div>
    </section>
  );
}

/**
 * Botão com alvo de toque adequado.
 * §39 mobile-ready: 44px é o mínimo recomendado por plataforma; abaixo
 * disso o acerto erra em telas pequenas, e o jogador conclui que o
 * botão "não funciona" em vez de que ele era pequeno demais.
 */
/** Ícones de botão (kit GBA, `ui/gba/icon_*`): o CSS mapeia `data-icon` → imagem; o rótulo continua HTML. */
export type ButtonIcon =
  | "crown" | "helmet" | "banner" | "backpack" | "market" | "tower" | "swords" | "gear"
  | "potion" | "rest" | "enter" | "back" | "mute" | "chat" | "close" | "data";

export function ActionButton({
  label,
  onClick,
  disabled,
  variant = "primary",
  hint,
  icon,
  type = "button",
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  /** primary = índigo · secondary = prata · danger = rubi · confirm = esmeralda · warning = âmbar. */
  variant?: "primary" | "secondary" | "danger" | "confirm" | "warning";
  hint?: string;
  icon?: ButtonIcon;
  /** `submit` para botões dentro de formulário (form.onSubmit faz o resto). */
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      className={`tia-btn tia-btn--${variant}`}
      onClick={onClick}
      disabled={disabled}
      title={hint}
      {...(icon ? { "data-icon": icon } : {})}
    >
      {label}
    </button>
  );
}

/** Aviso de assets ausentes. §62 — visível, não silencioso. */
export function MissingAssetsWarning({ ids }: { ids: readonly string[] }) {
  if (ids.length === 0) return null;
  return (
    <div className="tia-warn" role="alert">
      <strong>Assets de arte ausentes.</strong>
      <span>
        O produto final não pode ser entregue assim (sem quadrados, círculos ou emojis).
        Faltam: {ids.join(", ")}
      </span>
    </div>
  );
}
