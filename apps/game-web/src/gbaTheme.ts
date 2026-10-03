/**
 * Tema GBA da interface (ADR-033, Lote 1): botões, ícones e fundo como arte gerada.
 *
 * A arte entra por VARIÁVEIS CSS (`--gba-<cor>-<estado>`, `--gba-icon-<nome>`) montadas a partir do
 * manifesto de assets — o CSS nunca monta caminho (§62). A classe `tia-gba` só é ligada quando o
 * kit inteiro existe no manifesto; sem ele, a interface cai no visual anterior (sem quebrar).
 *
 * Tudo aqui é DADO editável: para trocar o kit, regenere `ui/gba/*` e mexa só nestas listas.
 */
import { ICON_NAMES, BUTTON_COLOURS, BUTTON_STATES, GBA_PREFIX } from "@tia/config";

export const GBA_CLASS = "tia-gba";

export interface GbaTheme {
  vars: Record<string, string>;
  /** Ids exigidos pelo tema que NÃO estão no manifesto (vazio ⇒ tema completo). */
  missing: string[];
}

/** Monta as variáveis CSS do tema. `resolve` devolve a URL ABSOLUTA do id (ou `undefined`). */
export function buildGbaTheme(resolve: (assetId: string) => string | undefined): GbaTheme {
  const vars: Record<string, string> = {};
  const missing: string[] = [];
  const put = (name: string, id: string) => {
    const url = resolve(id);
    if (url) vars[name] = `url("${url}")`;
    else missing.push(id);
  };
  for (const colour of BUTTON_COLOURS) for (const state of BUTTON_STATES) put(`--gba-${colour}-${state}`, `${GBA_PREFIX}${colour}_${state}`);
  for (const icon of ICON_NAMES) put(`--gba-icon-${icon}`, `${GBA_PREFIX}icon_${icon}`);
  for (const part of ["round_normal", "round_pressed", "toggle_off", "toggle_on", "tab_on", "tab_off"]) put(`--gba-${part.replace("_", "-")}`, `${GBA_PREFIX}${part}`);
  return { vars, missing };
}

/** Aplica o tema ao documento. Devolve `true` se o kit está completo. */
export function applyGbaTheme(root: HTMLElement, theme: GbaTheme): boolean {
  for (const [name, value] of Object.entries(theme.vars)) root.style.setProperty(name, value);
  const complete = theme.missing.length === 0;
  root.classList.toggle(GBA_CLASS, complete);
  return complete;
}
