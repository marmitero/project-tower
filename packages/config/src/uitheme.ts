/**
 * Kit de interface GBA (ADR-033, Lote 1) — nomes do que o pipeline `art buttons|icons` produz em
 * `assets/generated/ui/gba/`. Fica no config (e não na UI) para que o teste de assets e o
 * `check:assets` enxerguem a MESMA lista que o jogo.
 */
export const GBA_PREFIX = "ui/gba/";

/** Cores de botão: índigo (primário), prata (secundário), rubi (perigo), esmeralda (confirmar), âmbar (aviso). */
export const BUTTON_COLOURS = ["indigo", "silver", "ruby", "emerald", "amber"] as const;
export const BUTTON_STATES = ["normal", "hover", "pressed", "disabled"] as const;

export const ICON_NAMES = [
  "crown", "helmet", "banner", "backpack", "market", "tower", "swords", "gear",
  "potion", "rest", "enter", "back", "mute", "chat", "close", "data",
] as const;

/** Todos os ids de asset do tema (para o manifesto e para os testes). */
export function gbaAssetIds(): string[] {
  const ids: string[] = [];
  for (const c of BUTTON_COLOURS) for (const s of BUTTON_STATES) ids.push(`${GBA_PREFIX}${c}_${s}`);
  for (const i of ICON_NAMES) ids.push(`${GBA_PREFIX}icon_${i}`);
  for (const p of ["round_normal", "round_pressed", "toggle_off", "toggle_on", "tab_on", "tab_off"]) ids.push(`${GBA_PREFIX}${p}`);
  return ids;
}

/** Login / criação do Rei (ADR-033): fundo, logotipo e zona reservada ao login do Google. */
export const LOGIN_ASSETS = { background: "login/background", logo: "login/logo" } as const;

/**
 * Layout da tela de login/criação (ADR-033). DADO editável: a UI lê estes valores como variáveis
 * CSS, então trocar o fundo ou reposicionar o logotipo não exige tocar no componente.
 *
 * `authSlot` é a zona RESERVADA ao login do Google (futuro): hoje vazia, mas já ocupa o espaço
 * (altura fixa, abaixo do cartão, centralizada) — quando o botão chegar, nada se move.
 */
export const CREATION_LAYOUT = {
  /** `object-position` do fundo: mantém a torre iluminada visível em telas estreitas. */
  backdropFocus: "62% 38%",
  /** Escurecimento sobre o fundo para o cartão ler bem (0–1). */
  shade: 0.38,
  logo: { maxWidthPx: 520, maxHeightVh: 26 },
  card: { kingMaxWidthPx: 480, heroMaxWidthPx: 880 },
  authSlot: { heightPx: 52, maxWidthPx: 320 },
} as const;
