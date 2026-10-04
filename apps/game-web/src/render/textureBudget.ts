/**
 * Orçamento de memória das texturas de PERSONAGEM (carga por andar — ADR-032).
 *
 * Sem isto, cada inimigo visto ao longo de uma sessão idle ficava na GPU para sempre
 * (folha legada = 5 × 4 MB RGBA por personagem). O orçamento rastreia as texturas de personagem
 * carregadas e, passando do limite, aponta as MENOS recentes que NÃO estão em uso (`pinned`) para
 * serem descarregadas; elas recarregam sob demanda se o inimigo voltar.
 *
 * Puro (sem Phaser) para ser testável. Ladrilhos de arena, VFX e UI não entram: são poucos e
 * compartilhados.
 *
 * Limite: 96 MB hoje (folhas legadas); ao migrar tudo para atlas compacto (1,25 MB/PNG ×
 * ≤ 6 personagens por andar + 1 MB de ladrilhos) o alvo do roadmap é ≤ 24 MB por andar.
 */
export const DEFAULT_TEXTURE_BUDGET_BYTES = 96 * 1024 * 1024;

export class TextureBudget {
  private readonly entries = new Map<string, { bytes: number; lastUsed: number }>();

  constructor(private limitBytes = DEFAULT_TEXTURE_BUDGET_BYTES) {}

  setLimit(bytes: number): void {
    this.limitBytes = bytes;
  }

  get limit(): number {
    return this.limitBytes;
  }

  /** Registra/atualiza o uso de uma textura (bytes = largura × altura × 4). */
  touch(key: string, bytes: number, now: number): void {
    this.entries.set(key, { bytes, lastUsed: now });
  }

  forget(key: string): void {
    this.entries.delete(key);
  }

  has(key: string): boolean {
    return this.entries.has(key);
  }

  total(): number {
    let sum = 0;
    for (const e of this.entries.values()) sum += e.bytes;
    return sum;
  }

  /** Chaves a descarregar (menos recentes primeiro) para voltar ao limite; nunca as `pinned`. */
  plan(pinned: ReadonlySet<string>): string[] {
    let total = this.total();
    if (total <= this.limitBytes) return [];
    const order = [...this.entries.entries()].filter(([k]) => !pinned.has(k)).sort((a, b) => a[1].lastUsed - b[1].lastUsed);
    const out: string[] = [];
    for (const [key, e] of order) {
      if (total <= this.limitBytes) break;
      out.push(key);
      total -= e.bytes;
    }
    return out;
  }
}
