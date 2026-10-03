/**
 * @tia/ui — HUD e componentes.
 *
 * §37 — "A implementação matemática exata deve ficar centralizada. Nunca
 * duplicar fórmulas em componentes de UI." Este pacote não importa
 * `@tia/engine` NEM `@tia/game-core`: ele formata números que recebeu, e
 * nada mais. Se precisasse de uma fórmula, essa fórmula estaria errada
 * de qualquer jeito.
 */

export { ProgressBar, StatPill, Panel, ActionButton, MissingAssetsWarning } from "./Hud.js";
export type { ProgressBarProps, StatPillProps, PanelProps, ButtonIcon } from "./Hud.js";
