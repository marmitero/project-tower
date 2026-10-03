/**
 * Fonte de dados da cena de batalha.
 *
 * CAUSA RAIZ do "tela preta" (ADR-029): a cena recebia a batalha por
 * *push* (`setBattle`) a partir de um `useEffect` do React. Esse empurrão
 * dependia de (1) a cena já existir quando o efeito rodava e (2) a
 * referência da batalha mudar. O Phaser é criado de forma assíncrona e o
 * `GameState` é mutado no lugar — o empurrão se perdia e a cena ficava
 * para sempre em "Aguardando a batalha...".
 *
 * Agora a cena PUXA (pull): a cada frame ela chama `getView()` e reage ao
 * que mudou. Não existe ordem de inicialização nem referência a vigiar.
 */
import type { BattleState } from "@tia/contracts";
import { classes } from "@tia/config";
import { floorDef, type GameState } from "@tia/game-core";
import { DEFAULT_THEME_ID } from "./arenaThemes";

/** Um herói/inimigo exibido FORA de uma batalha (caminhando ou parado). */
export interface IdleActor {
  id: string;
  name: string;
  /** IDs de manifesto das folhas (`idle`, `walk`, `attack`, `hurt`, `death`…). */
  sprites: Record<string, string>;
}

export interface BattleView {
  battle: BattleState | null;
  /** A caçada está procurando o próximo inimigo: a arena rola e o herói anda. */
  walking: boolean;
  /** Herói ativo (para mostrar andando/parado quando não há batalha). */
  hero: IdleActor | null;
  /** Tema de arena (`FloorVisual.theme`, ou `boss`). */
  theme: string;
}

export type BattleViewSource = () => BattleView;

export const EMPTY_VIEW: BattleView = { battle: null, walking: false, hero: null, theme: DEFAULT_THEME_ID };

/** Lê o que a cena precisa direto do `GameState` (sem React, sem cópia). */
export function buildBattleView(state: GameState): BattleView {
  const data = state.data;
  const battle = state.activeBattle;
  const activeId = data.team.activeHeroId;
  const hero = activeId ? (state.team.find((h) => h.id === activeId) ?? state.team[0]) : state.team[0];
  const cls = hero ? classes.find((c) => c.id === hero.classId) : undefined;

  let theme = DEFAULT_THEME_ID;
  if (battle?.mode === "boss") theme = "boss";
  else theme = floorDef(state.currentFloor).visual.theme;

  return {
    battle,
    walking: !battle && data.hunt?.kind === "searching",
    hero:
      hero && cls
        ? { id: hero.id, name: hero.name, sprites: cls.assets.sheets as unknown as Record<string, string> }
        : null,
    theme,
  };
}
