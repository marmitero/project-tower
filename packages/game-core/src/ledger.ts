/**
 * Livro-caixa da caçada (ADR-031): quanto XP, Coin e CUSTO a caçada rendeu numa janela móvel, para
 * o painel de dados (XP/h, Coin/h, Custo/h, Lucro/h). Só LÊ o que o jogo já decidiu: quem credita
 * recompensa ou gasta item avisa aqui; o ledger não muda nada no save.
 *
 * Não é persistido: é uma medida da SESSÃO (recarregar a página recomeça a contagem). A janela e o
 * aquecimento vêm de `config.hud` (editáveis). Dinheiro entra como `number` — é só exibição.
 */
import { config } from "@tia/config";

export interface LedgerDelta {
  kingXp?: number;
  heroXp?: number;
  /** Coin ganha (recompensa da luta + venda automática de drop). */
  coins?: number;
  /** Coin GASTA na caçada (poções, reviver, demais consumíveis), no preço de mercado do momento. */
  cost?: number;
}

interface Entry extends Required<LedgerDelta> {
  at: number;
}

export interface LedgerRates {
  kingXpPerHour: number;
  heroXpPerHour: number;
  coinsPerHour: number;
  costPerHour: number;
  /** `coinsPerHour − costPerHour`. */
  netPerHour: number;
  /** Minutos efetivamente medidos (≤ janela). */
  measuredMs: number;
  /** `true` enquanto a medição ainda é curta demais para confiar (< `ledgerWarmupMs`). */
  warmingUp: boolean;
}

export class HuntLedger {
  private entries: Entry[] = [];
  private startedAt: number | null = null;

  /** Registra um ganho/gasto no instante `at` (relógio do jogo). */
  record(at: number, delta: LedgerDelta): void {
    if (this.startedAt === null) this.startedAt = at;
    this.entries.push({ at, kingXp: delta.kingXp ?? 0, heroXp: delta.heroXp ?? 0, coins: delta.coins ?? 0, cost: delta.cost ?? 0 });
    this.prune(at);
  }

  /** Marca o início da contagem (o jogo abriu / o jogador zerou). */
  start(at: number): void {
    this.entries = [];
    this.startedAt = at;
  }

  private prune(now: number): void {
    const from = now - config.hud.ledgerWindowMs;
    let i = 0;
    while (i < this.entries.length && this.entries[i]!.at < from) i += 1;
    if (i > 0) this.entries.splice(0, i);
  }

  rates(now: number): LedgerRates {
    this.prune(now);
    const started = this.startedAt ?? now;
    const measuredMs = Math.min(config.hud.ledgerWindowMs, Math.max(0, now - started));
    // Divisor com piso de 1 min: um ganho no 1º segundo não vira "milhões por hora".
    const divisor = Math.max(measuredMs, 60_000);
    let kingXp = 0;
    let heroXp = 0;
    let coins = 0;
    let cost = 0;
    for (const e of this.entries) {
      kingXp += e.kingXp;
      heroXp += e.heroXp;
      coins += e.coins;
      cost += e.cost;
    }
    const perHour = (v: number) => (v / divisor) * 3_600_000;
    return {
      kingXpPerHour: perHour(kingXp),
      heroXpPerHour: perHour(heroXp),
      coinsPerHour: perHour(coins),
      costPerHour: perHour(cost),
      netPerHour: perHour(coins - cost),
      measuredMs,
      warmingUp: measuredMs < config.hud.ledgerWarmupMs,
    };
  }
}
