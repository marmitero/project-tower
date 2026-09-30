/**
 * Seleção de alvo.
 *
 * Regra reaproveitada da referência (ADR-001, Tipo B): ataque de alvo único
 * prioriza o alvo com menor % de HP restante. Empate: menor HP absoluto,
 * depois menor id. Sempre determinístico — nunca sorteado.
 *
 * Isso importa mais do que parece. Em um jogo 1×1 (§17), o inimigo não tem
 * escolha; em um Boss (§24), é a IA do Boss. Em ambos, "qual alvo" precisa
 * ser reproduzível para que o teste do §80 signifique algo.
 */

import type { Combatant } from "@tia/contracts";

export function isAlive(c: Combatant): boolean {
  return !c.isDefeated && c.hp > 0;
}

function aliveOf(side: Combatant[]): Combatant[] {
  return side.filter(isAlive);
}

/**
 * Alvo de ataque de alvo único.
 * Retorna null se o lado não tem ninguém vivo.
 */
export function selectSingleTarget(candidates: Combatant[]): Combatant | null {
  const alive = aliveOf(candidates);
  if (alive.length === 0) return null;

  return alive.reduce((best, current) => {
    const bestPct = best.hp / best.maxHp;
    const curPct = current.hp / current.maxHp;
    if (curPct < bestPct) return current;
    if (curPct > bestPct) return best;
    if (current.hp < best.hp) return current;
    if (current.hp > best.hp) return best;
    return current.id < best.id ? current : best;
  });
}

/** Todos os inimigos vivos, na ordem estável de id. */
export function allEnemies(candidates: Combatant[]): Combatant[] {
  return aliveOf(candidates).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** Aliado com menor % de HP — usado por cura. */
export function selectAllyToHeal(candidates: Combatant[]): Combatant | null {
  return selectSingleTarget(candidates);
}

/**
 * Ordem inicial de ação: maior Velocidade age primeiro.
 * Empate: id estável. NUNCA sorteado — a §64 exige determinismo.
 */
export function initialTurnOrder(combatants: Combatant[]): Combatant[] {
  return aliveOf(combatants).sort((a, b) => {
    if (b.speed !== a.speed) return b.speed - a.speed;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/**
 * O inimigo da Torre (1×1) NÃO tem escolha de alvo: há exatamente um herói.
 * A função existe para tornar explícito que a escolha é trivial, e para que
 * um teste possa afirmar isso em vez de o código "acidentalmente" funcionar.
 */
export function towerTargetFor(hero: Combatant | null): Combatant | null {
  return hero && isAlive(hero) ? hero : null;
}
