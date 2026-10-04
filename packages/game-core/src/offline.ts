/**
 * Relatório do offline (ADR-026).
 *
 * O offline NÃO é uma fórmula de conversão: é a SIMULAÇÃO do próprio jogo (batalha → recompensa →
 * procurando → batalha, com o Bot usando poções, revives e o Hub) pelo tempo creditado — "como se o
 * jogador tivesse ficado online por mais aquele período" (decisão do usuário, 2026-10-03). Este
 * módulo só define o que a tela "Bem-vindo de volta" mostra.
 */

export interface OfflineReport {
  /** Tempo real fora. */
  rawDurationMs: number;
  /** Tempo simulado (limitado pelo plano). */
  creditedDurationMs: number;
  wasCapped: boolean;
  capMs: number;
  plan: "free" | "vip";
  /** Andar em que o herói caçou (o do save — "volta pro mesmo andar"). */
  floor: number;
  battlesWon: number;
  /** Quantas vezes o herói caiu. */
  defeats: number;
  /** Idas ao Hub (cair sem revive e recuperar). */
  hubTrips: number;
  kingXp: bigint;
  heroXp: bigint;
  /** Variação líquida de Coin (inclui vendas automáticas e desconta nada além do que o Bot comprar — hoje nada). */
  coins: bigint;
  equipmentFound: number;
  equipmentAutoSold: number;
  /** Poções e revives consumidos, por id do Market. */
  itemsUsed: Record<string, number>;
  kingLevelBefore: number;
  kingLevelAfter: number;
  /** Nível do herói ativo antes/depois. */
  heroLevelBefore: number;
  heroLevelAfter: number;
  /** A simulação parou antes de acabar o tempo (herói caído sem auto-retorno, caçada pausada, trava de segurança). */
  stoppedEarly: null | "paused" | "defeated" | "no_hero" | "safety";
  /** Segundos efetivamente simulados (≤ credited). */
  simulatedMs: number;
}

export function emptyReport(base: Pick<OfflineReport, "rawDurationMs" | "creditedDurationMs" | "wasCapped" | "capMs" | "plan">): OfflineReport {
  return {
    ...base,
    floor: 1,
    battlesWon: 0,
    defeats: 0,
    hubTrips: 0,
    kingXp: 0n,
    heroXp: 0n,
    coins: 0n,
    equipmentFound: 0,
    equipmentAutoSold: 0,
    itemsUsed: {},
    kingLevelBefore: 1,
    kingLevelAfter: 1,
    heroLevelBefore: 1,
    heroLevelAfter: 1,
    stoppedEarly: null,
    simulatedMs: 0,
  };
}
