/**
 * PRNG determinístico (xorshift128).
 *
 * Por que existe: o §64 exige que o engine processe `Battle State + Combat
 * Rules + Stats + Equipment = Resultado`. Se o resultado depende de
 * `Math.random()`, então nenhum teste de fórmula é reproduzível, nenhum
 * bug de loot pode ser auditado e o servidor não consegue provar qual item
 * foi sorteado (§86).
 *
 * `Math.random()` é PROIBIDO dentro deste pacote. Verificado por teste
 * (`INV-11` em packages/engine/src/__tests__/purity.test.ts).
 *
 * Uso por fluxo nomeado: `rngFor("loot", battleId)` e `rngFor("combat",
 * battleId)` sao independentes, entao mudar a quantidade de rolagens de loot
 * nao altera o resultado do combate.
 */

export class Prng {
  private x: number;
  private y: number;
  private z: number;
  private w: number;

  constructor(seed: number) {
    // Semente precisa nao ser zero para o xorshift nao degenerar.
    const s = seed >>> 0 || 0x9e3779b9;
    this.x = s;
    this.y = (s ^ 0x6d2b79f5) >>> 0;
    this.z = (s + 0x85ebca6b) >>> 0;
    this.w = (s ^ 0xc2b2ae35) >>> 0;
    for (let i = 0; i < 12; i += 1) this.next();
  }

  /** Float em [0, 1). */
  next(): number {
    const t = this.x ^ (this.x << 11);
    this.x = this.y;
    this.y = this.z;
    this.z = this.w;
    this.w = (this.w ^ (this.w >>> 19) ^ (t ^ (t >>> 8))) >>> 0;
    return this.w / 0x100000000;
  }

  /** Inteiro em [min, max], ambos inclusivos. */
  int(min: number, max: number): number {
    if (min > max) throw new Error(`Prng.int: min (${min}) > max (${max})`);
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** Float em [min, max). */
  float(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  bool(probability = 0.5): boolean {
    return this.next() < probability;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error("Prng.pick: array vazio");
    // `noUncheckedIndexedAccess` deixa o retorno `T | undefined` mesmo
    // depois do guard de tamanho; o índice é garantido pelo `int`.
    return items[this.int(0, items.length - 1)] as T;
  }

  /**
   * Índice according a pesos. Soma dos pesos não precisa ser 1 — é
   * proporcional. Retorna -1 se todos os pesos forem 0.
   */
  weightedIndex(weights: readonly number[]): number {
    const total = weights.reduce((a, b) => a + b, 0);
    if (total <= 0) return -1;
    let roll = this.next() * total;
    for (let i = 0; i < weights.length; i += 1) {
      roll -= weights[i] ?? 0;
      if (roll < 0) return i;
    }
    return weights.length - 1;
  }

  /** Escolhe uma chave de objeto segundo pesos na mesma ordem das chaves. */
  weightedKey<K extends string>(weights: Record<K, number>): K {
    const keys = Object.keys(weights) as K[];
    const index = this.weightedIndex(keys.map((k) => weights[k]));
    if (index < 0) throw new Error("Prng.weightedKey: todos os pesos são 0");
    return keys[index] as K;
  }

  /** Deriva um novo PRNG de forma determinística, sem consumir este. */
  derive(salt: string): Prng {
    let h = 2166136261;
    for (let i = 0; i < salt.length; i += 1) {
      h ^= salt.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return new Prng((h ^ (this.w >>> 0)) >>> 0);
  }
}

/** Hash estável de string para 32 bits (FNV-1a). */
export function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Fluxos de RNG independentes e nomeados.
 * Regra: o fluxo de loot nunca influencia o de combate.
 */
export class RngHub {
  private readonly streams = new Map<string, Prng>();

  constructor(private readonly masterSeed: number) {}

  for(stream: string, key: string): Prng {
    const id = `${stream}:${key}`;
    let rng = this.streams.get(id);
    if (!rng) {
      rng = new Prng((this.masterSeed ^ hashString(id)) >>> 0);
      this.streams.set(id, rng);
    }
    return rng;
  }

  /** Cria um PRNG novo a partir de uma seed, sem tocar nos streams. */
  isolated(seed: number): Prng {
    return new Prng(seed);
  }
}
