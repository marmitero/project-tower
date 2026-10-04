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
import { HERO_ROSTER, classes, heroIdentityForClass, heroPortraitId, type HeroIdentityDef } from "@tia/config";

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
 * O códice completo: uma entrada por identidade do elenco (4 iniciais + adicionais, ADR-033),
 * com o que o jogador possui marcado. Herói sem `identityId` (save antigo ou aquisição anterior
 * ao ADR-033) conta como a identidade INICIAL da classe. A ordem é a do catálogo (escala de raridade).
 */
export function heroCodex(owned: readonly Hero[]): HeroCodexEntry[] {
  return HERO_ROSTER.map((identity) => {
    const mine = owned.filter((h) => (h.identityId ? h.identityId === identity.id : heroIdentityForClass(h.classId).id === identity.id));
    const hero = mine[0] ?? null;
    const cls = classes.find((c) => c.id === identity.classId);
    return {
      identity,
      status: hero ? "owned" : "locked",
      hero,
      copies: mine.length,
      portraitAssetId: heroPortraitId({ classId: identity.classId, identityId: identity.id }) ?? cls?.assets.portrait ?? "",
      acquisitionHint: hero ? "" : identity.acquisition.hint,
    };
  });
}
