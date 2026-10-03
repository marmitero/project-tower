/**
 * Códice de heróis (§10 — "os outros permanecem indisponíveis, obtíveis
 * depois pelo sistema geral de aquisição").
 *
 * O códice NÃO é salvo: ele é derivado do catálogo (`@tia/config` HEROES)
 * menos o que o save possui. Um campo de save duplicaria o catálogo e
 * criaria duas fontes de verdade — o catálogo já é o registro editável.
 *
 * Os bloqueados aparecem na UI com a dica de aquisição (§12 — nunca
 * inimigos comuns da Torre). Quando o sistema de aquisição entrar (Fase 9+),
 * desbloquear = criar o herói no save; o códice se atualiza sozinho.
 */

import type { Hero } from "@tia/contracts";
import { HEROES, classes, type HeroIdentityDef } from "@tia/config";

export type CodexStatus = "owned" | "locked";

export interface HeroCodexEntry {
  identity: HeroIdentityDef;
  status: CodexStatus;
  /** Herói possuído correspondente (o primeiro; null quando bloqueado). */
  hero: Hero | null;
  /** Quantos heróis dessa classe o jogador possui (ADR-024: os Reis podem dropar repetidos, com raridade/atributos diferentes). */
  copies: number;
  /** Retrato do pack (`portraits/*`). */
  portraitAssetId: string;
  /** Dica de aquisição para os bloqueados (§12). */
  acquisitionHint: string;
}

/**
 * O códice completo: 4 entradas (as identidades do catálogo), com o que o
 * jogador possui marcado. A ordem é a do catálogo (escala de raridade).
 */
export function heroCodex(owned: readonly Hero[]): HeroCodexEntry[] {
  return HEROES.map((identity) => {
    const mine = owned.filter((h) => h.classId === identity.classId);
    const hero = mine[0] ?? null;
    const cls = classes.find((c) => c.id === identity.classId);
    return {
      identity,
      status: hero ? "owned" : "locked",
      hero,
      copies: mine.length,
      portraitAssetId: cls?.assets.portrait ?? "",
      acquisitionHint: hero ? "" : identity.acquisition.hint,
    };
  });
}
