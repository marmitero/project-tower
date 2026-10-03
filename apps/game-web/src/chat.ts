/**
 * Chat global (ADR-031) — a INTERFACE que o jogo usa e uma implementação SIMULADA.
 *
 * `docs/CHAT_SYSTEM.md` §2 proíbe "chat falso" como solução final: o chat de verdade passa por
 * Backend → Validação → Persistência → Broadcast, e autor/horário/identidade vêm do servidor. Por
 * isso a UI só conhece `ChatTransport`; trocar o simulado pelo real (Fase Online) é trocar a fábrica
 * `createChatTransport` — nenhum componente muda. O simulado:
 *  - NÃO é um chat: os "jogadores" são personagens fixos e as falas são sorteadas aqui no navegador;
 *  - existe só para dar vida ao layout e validar a UX (painel recolhível, não lidas, silenciar);
 *  - aplica a mesma validação de entrada que o servidor aplicará (tamanho, controle, rate limit),
 *    mas as constantes abaixo são PROVISÓRIAS (⚠️ P-043).
 * Texto é SEMPRE renderizado como texto (React escapa) — nunca HTML.
 */

export interface ChatMessage {
  id: string;
  author: string;
  text: string;
  /** Instante (ms). No chat real vem do servidor. */
  at: number;
  /** `self` = mensagem do próprio jogador; `system` = aviso do jogo. */
  kind: "player" | "self" | "system";
}

export type ChatSendResult = { ok: true } | { ok: false; reason: string };

export interface ChatTransport {
  /** `true` enquanto não existe servidor: a UI mostra o selo "simulado". */
  readonly simulated: boolean;
  /** Mensagens já recebidas (mais antigas primeiro). */
  history(): ChatMessage[];
  /** Recebe cada mensagem nova. Devolve a função que cancela a inscrição. */
  subscribe(listener: (m: ChatMessage) => void): () => void;
  send(text: string): ChatSendResult;
}

/** ⚠️ P-043 provisório — limites de entrada (o servidor real é quem decide). */
export const CHAT_LIMITS = { maxChars: 140, minIntervalMs: 2_000, historySize: 60 } as const;

/** Remove caracteres de controle e espaços repetidos; `null` se sobrar nada. */
export function sanitizeChatText(raw: string): string | null {
  // eslint-disable-next-line no-control-regex
  const clean = raw.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return clean.length === 0 ? null : clean.slice(0, CHAT_LIMITS.maxChars);
}

// ---------------------------------------------------------------------------
// Simulado
// ---------------------------------------------------------------------------

const NPC_NAMES = ["Lyra_77", "DomBrutus", "Nyx", "Capitão_Rato", "TorreFan", "Mirela", "ZéDoLoot", "Aurora", "Kael", "Pipoca_Rei", "Sombra99", "Valéria"];

const NPC_LINES = [
  "Alguém sabe qual andar dropa mais equipamento?",
  "Acabei de cair no Nv 10, bora subir de novo",
  "Poção básica salvou minha vida agora",
  "Meu Arqueiro tá voando no andar 3",
  "Quem já pegou o Rei Gosma?",
  "Dica: equipamento de nível alto acelera o ataque de verdade",
  "Vendi um Raro por uma boa grana",
  "Esse idle vicia, deixei rodando a noite toda",
  "Tem como juntar fragmentos só na Arena?",
  "Bom dia, Torre!",
  "Perdi 40% de vida numa luta só, tá puxado",
  "Slot 2 desbloqueado, finalmente",
  "Alguém troca Coin por caixa?",
  "O Bot de poção é essencial no início",
  "Já tô no andar 5, o Salão dos Ecos é difícil",
  "Quanto XP por hora vocês estão fazendo?",
  "GG na Arena!",
  "Equipei o set completo, quase não perco vida",
  "Quem joga de Invocador Sombrio? Vale a pena?",
  "Voltei do offline com um monte de Coin",
];

export interface SimulatedChatOptions {
  /** Relógio injetável (testes). */
  now?: () => number;
  /** Semente do sorteio (testes). */
  seed?: number;
  /** `false` desliga as falas automáticas (testes). */
  autoTalk?: boolean;
  /** Intervalo entre falas automáticas. */
  talkEveryMs?: { min: number; max: number };
  /** Nome do jogador local (a mensagem dele aparece como `self`). */
  selfName: string;
}

export function createSimulatedChat(opts: SimulatedChatOptions): ChatTransport {
  const now = opts.now ?? (() => Date.now());
  let seed = (opts.seed ?? Math.floor(Math.random() * 2 ** 31)) >>> 0;
  const rnd = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
  const every = opts.talkEveryMs ?? { min: 6_000, max: 16_000 };
  const log: ChatMessage[] = [];
  const listeners = new Set<(m: ChatMessage) => void>();
  let seq = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastSentAt = Number.NEGATIVE_INFINITY;

  const push = (m: Omit<ChatMessage, "id">) => {
    const msg: ChatMessage = { ...m, id: `sim-${(seq += 1)}` };
    log.push(msg);
    if (log.length > CHAT_LIMITS.historySize) log.shift();
    for (const l of listeners) l(msg);
  };
  const npcTalk = () => {
    push({ author: NPC_NAMES[Math.floor(rnd() * NPC_NAMES.length)]!, text: NPC_LINES[Math.floor(rnd() * NPC_LINES.length)]!, at: now(), kind: "player" });
  };
  const schedule = () => {
    timer = setTimeout(() => {
      npcTalk();
      if (listeners.size > 0) schedule();
      else timer = null;
    }, every.min + rnd() * (every.max - every.min));
  };

  // Histórico de abertura: o painel nasce com vida, e o jogador vê o selo "simulado".
  push({ author: "Sistema", text: "Chat global SIMULADO — mensagens de exemplo. O chat real chega na fase online.", at: now(), kind: "system" });
  for (let i = 0; i < 3; i += 1) npcTalk();

  return {
    simulated: true,
    history: () => [...log],
    subscribe(listener) {
      listeners.add(listener);
      if (opts.autoTalk !== false && timer === null) schedule();
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && timer !== null) {
          clearTimeout(timer);
          timer = null;
        }
      };
    },
    send(text) {
      const clean = sanitizeChatText(text);
      if (clean === null) return { ok: false, reason: "Escreva uma mensagem." };
      const t = now();
      if (t - lastSentAt < CHAT_LIMITS.minIntervalMs) return { ok: false, reason: "Calma! Aguarde um instante para falar de novo." };
      lastSentAt = t;
      push({ author: opts.selfName, text: clean, at: t, kind: "self" });
      return { ok: true };
    },
  };
}

/**
 * Fábrica ÚNICA do chat do jogo. Fase Online: devolver o transporte real (WebSocket/Supabase
 * Realtime) aqui — com identidade vinda do token, nunca do payload.
 */
export function createChatTransport(selfName: string): ChatTransport {
  return createSimulatedChat({ selfName });
}
