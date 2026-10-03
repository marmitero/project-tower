/**
 * Progressão: XP e níveis.
 *
 * §45 — "O XP do Rei e o XP dos heróis são SEPARADOS. Nunca misturar." Essa
 * frase é tratada aqui como restrição estrutural, não como preferência: as
 * funções de Rei e de herói não aceitam a mesma entrada, e não existe uma
 * função genérica "grantXp(entity)" que aceitaria as duas.
 *
 * §20 — o XP é dividido entre os membros da equipe. A divisão é feita
 * exatamente uma vez, no ponto de crédito, e nunca dentro do herói.
 */

import type { Hero, King } from "@tia/contracts";
import { config, evalCurve } from "@tia/config";
import { divideXp } from "@tia/engine";
import { heroStatsAtLevel } from "./creation.js";
import type { ClassGrowth } from "@tia/config";

export interface XpAward {
  xpGained: bigint;
  levelsGained: number;
  level: number;
  /** Verdadeiro quando o nível bateu no teto da config. */
  capped: boolean;
}

/** XP necessário para sair de `level` para `level+1`. */
export function kingXpToNext(level: number): number {
  return evalCurve(config.xp.king.curve, level);
}

export function heroXpToNext(level: number): number {
  return evalCurve(config.xp.hero.curve, level);
}

/**
 * Credita XP ao REI. §45 — este é o ÚNICO caminho de XP do Rei.
 * O XP do herói não pode entrar aqui; a_SEPARAÇÃO é garantida pela
 * assinatura (King) e por testes.
 */
export function grantKingXp(king: King, amount: bigint): XpAward {
  if (amount < 0n) throw new Error("grantKingXp: XP negativo");
  const cap = config.xp.king.levelCap;
  const before = king.level;
  let xp = king.xp + amount;
  let level = before;
  let levelsGained = 0;

  while (level < cap) {
    const need = BigInt(kingXpToNext(level));
    if (xp < need) break;
    xp -= need;
    level += 1;
    levelsGained += 1;
  }

  if (level >= cap) {
    // No teto o XP para de acumular. Sem isso, um jogador que fica offline
    // 8h acumularia um número que não tem para onde ir e que o jogador leria
    // como progresso.
    //
    // O nível é gravado MESMO no caminho do teto: sem isto, uma recompensa
    // grande o bastante para cruzar o cap devolveria `level: 100` sem
    // alterar `king.level`, e a próxima chamada recomeçaria do nível 1.
    king.level = cap;
    king.xp = 0n;
    return { xpGained: 0n, levelsGained: cap - before, level: cap, capped: true };
  }

  king.level = level;
  king.xp = xp;
  return { xpGained: amount, levelsGained, level, capped: false };
}

/**
 * Credita XP a UM herói. §20 — o valor chega JÁ dividido; esta função nunca
 * divide, porque dividir duas vezes seria exatamente o tipo de bug que faz
 * o jogador achar que perdeu XP.
 */
export function grantHeroXp(hero: Hero, amount: bigint, growth: ClassGrowth): XpAward {
  if (amount < 0n) throw new Error("grantHeroXp: XP negativo");
  const cap = config.xp.hero.levelCap;
  const before = hero.level;
  let xp = hero.xp + amount;
  let level = before;
  let levelsGained = 0;

  while (level < cap) {
    const need = BigInt(heroXpToNext(level));
    if (xp < need) break;
    xp -= need;
    level += 1;
    levelsGained += 1;
  }

  if (level >= cap) {
    // Mesmo caminho do Rei: grava o nível e zera o XP no teto.
    hero.level = cap;
    hero.xp = 0n;
    applyHeroLevelStats(hero, growth, cap);
    return { xpGained: 0n, levelsGained: cap - before, level: cap, capped: true };
  }

  hero.level = level;
  hero.xp = xp;
  // ⛔ P-006b — a progressão de stats por nível é linear e provisória.
  // Subir de nível SEM mudar os stats produziria um herói que "cresceu" e não
  // ficou mais forte, o que é pior que não subir.
  applyHeroLevelStats(hero, growth, level);
  return { xpGained: amount, levelsGained, level, capped: false };
}

/**
 * Re-deriva os stats do nível e CONSERVA o HP já perdido: o HP máximo ganho
 * pelo level-up entra no HP atual (ADR-020/021). Sem isso, subir de nível
 * faria a barra "encolher" (mesmo HP absoluto sobre um máximo maior).
 */
function applyHeroLevelStats(hero: Hero, growth: ClassGrowth, level: number): void {
  const oldMax = hero.stats.hp;
  hero.stats = heroStatsAtLevel(growth, level);
  const gained = hero.stats.hp - oldMax;
  if (typeof hero.currentHp === "number" && hero.currentHp > 0 && gained > 0) {
    hero.currentHp = Math.min(hero.stats.hp, hero.currentHp + gained);
  }
}

/**
 * Divide o XP total da batalha entre os heróis da equipe (§20).
 *
 * Retorna o XP Individual de cada herói, NA MESMA ORDEM da lista. Divisão
 * por posição, não por identidade: quem lê o resultado precisa saber qual
 * índice corresponde a qual herói, e essa informação fica na chamada.
 */
export function splitTeamXp(totalXp: number, teamSize: number): number[] {
  return divideXp(totalXp, teamSize, config.xp.teamSplit);
}

/** Progresso 0..1 do nível atual, para a barra do HUD. */
export function kingProgress(king: King): number {
  const need = kingXpToNext(king.level);
  if (need <= 0) return 1;
  return Math.min(1, Number(king.xp) / need);
}

export function heroProgress(hero: Hero): number {
  const need = heroXpToNext(hero.level);
  if (need <= 0) return 1;
  return Math.min(1, Number(hero.xp) / need);
}

/** Nível do herói que a Torre exige (P-019 depende disto). */
export function kingLevelProgress(king: King): { level: number; next: number | null; ratio: number } {
  return {
    level: king.level,
    next: king.level >= config.xp.king.levelCap ? null : king.level + 1,
    ratio: kingProgress(king),
  };
}

/**
 * Quantos abates faltam para o Rei subir de nível, dado o nível do inimigo.
 * Estimativa para a UI da Torre (ADR-021) — `null` no teto ou sem recompensa.
 */
export function killsToNextKingLevel(king: King, enemyLevel: number): number | null {
  if (king.level >= config.xp.king.levelCap) return null;
  const perKill = evalCurve(config.tower.rewards.kingXp, enemyLevel);
  if (perKill <= 0) return null;
  const remaining = Math.max(0, kingXpToNext(king.level) - Number(king.xp));
  return Math.max(1, Math.ceil(remaining / perKill));
}
