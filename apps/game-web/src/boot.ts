/**
 * Bootstrap do jogo.
 *
 * §63 — a arquitetura é GAME LOGIC → GAME STATE → GAME RENDERING → UI/HUD
 * → PERSISTENCE. Este arquivo é a cola entre os degraus, e é o ÚNICO lugar
 * que conhece React, Phaser e o relógio do navegador ao mesmo tempo.
 *
 * Três decisões que evitam a classe de bug mais comum em idle games:
 *
 * 1. O relógio é lido AQUI e injetado no GameState. Nada dentro da lógica
 *    chama `Date.now()` — é o que permite testar o ciclo inteiro em Node
 *    com tempo controlado.
 *
 * 2. O loop é um `requestAnimationFrame` com passo ACUMULADO. Usar o
 *    delta bruto do frame faria a velocidade do jogo depender da taxa de
 *    atualização do monitor: 144Hz daria o dobro decoins que 72Hz.
 *
 * 3. O save é gravado por INTERVALO e em `visibilitychange`, nunca a cada
 *    tick. Serializar o save inteiro a 10Hz é desperdício; não gravar
 *    nunca é perder progresso.
 */

import { GameState, LocalStoragePersistence, LOCAL_ACCOUNT } from "@tia/game-core";
import type { BotAction, LootNotice, PersistenceService } from "@tia/game-core";
import { asAccountId, type BattleEvent, type SaveData } from "@tia/contracts";

const SAVE_INTERVAL_MS = 15_000;
const MAX_STEP_MS = 250;
/** §47 — `lastActiveAt` é tocado a cada ~5 s: é o que mede o tempo fora (offline). */
const HEARTBEAT_MS = 5_000;

/** Relógio do navegador, isolado para poder ser substituído em teste. */
export type Clock = () => number;

export interface BootOptions {
  accountId?: string;
  clock?: Clock;
  persistence?: PersistenceService;
  seed?: number;
  onStateChanged?: (state: GameState) => void;
  onBattleEvents?: (events: BattleEvent[]) => void;
  /** Cada drop de equipamento e o destino dele (ADR-023). */
  onLoot?: (drops: LootNotice[]) => void;
  /** O Bot bebeu poção, usou revive ou mudou de Hub (ADR-025). */
  onBotAction?: (action: BotAction) => void;
}

/**
 * Cria ou carrega o estado.
 *
 * Um save corrompido NÃO derruba o jogo: ele é guardado sob uma chave
 * de backup e um novo save nasce. Perder o save é ruim; ficar numa tela
 * de erro eternity é pior, porque o jogador não tem como sair sem
 * limpar o storage na mão.
 *
 * Sem save NÃO existe Rei: `state: null` devolve o controle para a UI,
 * que mostra o fluxo de criação (§5 — nome + skin). Criar o Rei com nome
 * inventado aqui seria placeholder de regra — e §62 proíbe.
 */
export async function boot(options: BootOptions = {}): Promise<{ state: GameState | null; recovered: boolean }> {
  const clock: Clock = options.clock ?? (() => Date.now());
  const accountId = options.accountId ?? LOCAL_ACCOUNT;
  const persistence = options.persistence ?? new LocalStoragePersistence();
  const seed = options.seed ?? deriveSeed(accountId, clock());

  let recovered = false;
  let save: SaveData | null = null;
  try {
    save = await persistence.load(accountId);
  } catch (error) {
    await quarantineCorruptSave(persistence, accountId);
    recovered = true;
    console.warn("[boot] save ilegível; será preciso criar um novo Rei. Detalhe:", error);
  }

  const deps = { persistence, now: clock, masterSeed: seed };
  const listeners = {
    onStateChanged: options.onStateChanged,
    onBattleEvents: options.onBattleEvents,
    onLoot: options.onLoot,
    onBotAction: options.onBotAction,
  };

  if (save) return { state: GameState.hydrate(save, deps, listeners), recovered };
  return { state: null, recovered };
}

/**
 * Cria o Rei, escolhe o herói inicial e grava o primeiro save (§5 — nome +
 * skin; §10 — o jogador escolhe 1 herói e recebe apenas aquele). Vive aqui
 * e não no React pelo mesmo motivo do `boot`: quem conhece relógio,
 * persistência e semente é este arquivo.
 */
export async function createGame(
  options: BootOptions & { nickname: string; skinId: string; heroId: string },
): Promise<GameState> {
  const clock: Clock = options.clock ?? (() => Date.now());
  const accountId = options.accountId ?? LOCAL_ACCOUNT;
  const persistence = options.persistence ?? new LocalStoragePersistence();
  const seed = options.seed ?? deriveSeed(accountId, clock());

  const state = GameState.createNew(
    {
      accountId: asAccountId(accountId),
      nickname: options.nickname,
      skinId: options.skinId,
      starterIdentityId: options.heroId,
      now: clock(),
      masterSeed: seed,
    },
    {
      persistence,
      now: clock,
      listeners: {
        onStateChanged: options.onStateChanged,
        onBattleEvents: options.onBattleEvents,
        onLoot: options.onLoot,
        onBotAction: options.onBotAction,
      },
    },
  );
  // Estado nasce sujo? Não — mas o primeiro save não pode esperar o
  // intervalo: um F5 logo depois da criação perderia o Rei.
  await state.saveNow();
  return state;
}

/**
 * Guarda o save ilegível sob uma chave de backup antes de criar o novo.
 * Sem isto, um bug de serialização destrói o progresso de todo mundo e
 * ninguém consegue investigar depois.
 */
async function quarantineCorruptSave(persistence: PersistenceService, accountId: string): Promise<void> {
  try {
    const raw = await persistence.exportSave(accountId);
    if (raw) await persistence.importSave(`${accountId}:corrupt:${Date.now()}`, raw);
    await persistence.clear(accountId);
  } catch {
    // Se nem o backup deu certo, segue: o jogo precisa iniciar.
  }
}

/** Semente estável por conta, sem `Math.random` (§64 — tudo é reproduzível). */
function deriveSeed(accountId: string, now: number): number {
  let h = 2166136261;
  const key = `${accountId}`;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h ^ now) >>> 0;
}

export interface LoopHandle {
  stop(): void;
  forceSave(): Promise<void>;
}

/**
 * Loop principal.
 *
 * O passo é limitado a `MAX_STEP_MS`: uma aba em background que volta
 * depois de 30s não deve processar 30s de combate de uma vez — o jogador
 * receberia uma avalha de recompensas. O offline (§47) existe para esse
 * caso, com as próprias regras e o próprio teto.
 */
export function startLoop(
  state: GameState,
  clock: Clock = () => Date.now(),
  onFrame?: (dtMs: number) => void,
): LoopHandle {
  let last = clock();
  let lastSave = last;
  let lastBeat = last;
  let running = true;
  let frame = 0;

  const tick = () => {
    if (!running) return;
    const now = clock();
    const rawDelta = now - last;
    last = now;
    const dt = Math.min(MAX_STEP_MS, Math.max(0, rawDelta));

    try {
      // Um único ponto de entrada (luta, busca, Hub, nova busca): é o MESMO que a simulação
      // offline usa (ADR-026). §29 — navegar não pausa; o tick decide se a busca terminou.
      state.advanceIdle(dt);
    } catch (error) {
      // Uma exceção no tick NÃO pode derrubar o loop: o jogador ficaria
      // olhando uma tela parada. Loga e segue no próximo frame.
      console.error("[loop] erro no tick:", error);
    }

    if (now - lastBeat >= HEARTBEAT_MS) {
      lastBeat = now;
      state.markActive();
    }

    if (now - lastSave >= SAVE_INTERVAL_MS) {
      lastSave = now;
      void state.saveIfDirty();
    }

    onFrame?.(dt);
    frame = requestAnimationFrame(tick);
  };

  frame = requestAnimationFrame(tick);

  const onVisibility = () => {
    if (document.visibilityState === "hidden") {
      void state.save();
    } else {
      // Voltar para a aba: `last` precisa ser redefinido, senão o delta
      // inclui o tempo em background e a batalha dá um salto.
      last = clock();
      void state.claimOfflineSafe();
    }
  };
  document.addEventListener("visibilitychange", onVisibility);

  window.addEventListener("beforeunload", () => {
    void state.save();
  });

  return {
    stop() {
      running = false;
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", onVisibility);
    },
    async forceSave() {
      await state.save();
    },
  };
}
