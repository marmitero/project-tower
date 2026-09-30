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
import type { PersistenceService } from "@tia/game-core";
import { asAccountId, type BattleEvent, type SaveData } from "@tia/contracts";

const SAVE_INTERVAL_MS = 15_000;
const MAX_STEP_MS = 250;

/** Relógio do navegador, isolado para poder ser substituído em teste. */
export type Clock = () => number;

export interface BootOptions {
  accountId?: string;
  clock?: Clock;
  persistence?: PersistenceService;
  seed?: number;
  onStateChanged?: (state: GameState) => void;
  onBattleEvents?: (events: BattleEvent[]) => void;
}

/**
 * Cria ou carrega o estado.
 *
 * Um save corrompido NÃO derruba o jogo: ele é guardado sob uma chave
 * de backup e um novo save nasce. Perder o save é ruim; ficar numa tela
 * de erro eternity é pior, porque o jogador não tem como sair sem
 * limpar o storage na mão.
 */
export async function boot(options: BootOptions = {}): Promise<{ state: GameState; recovered: boolean }> {
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
    console.warn("[boot] save ilegível; um novo save foi criado. Detalhe:", error);
  }

  const deps = { persistence, now: clock, masterSeed: seed };
  const listeners = {
    onStateChanged: options.onStateChanged,
    onBattleEvents: options.onBattleEvents,
  };

  if (save) return { state: GameState.hydrate(save, deps, listeners), recovered };

  return {
    state: GameState.createNew({ accountId: asAccountId(accountId), nickname: "Rei", skinId: "royal", now: clock(), masterSeed: seed }),
    recovered,
  };
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
  let running = true;
  let frame = 0;

  const tick = () => {
    if (!running) return;
    const now = clock();
    const rawDelta = now - last;
    last = now;
    const dt = Math.min(MAX_STEP_MS, Math.max(0, rawDelta));

    try {
      if (state.activeBattle) {
        state.advanceBattle(dt);
      } else if (state.data.hunt?.kind === "searching") {
        // §29 — navegar não pausa. O tick do loop é o ÚNICO lugar que
        // decide se a busca terminou.
        state.tickSearch();
      } else if (state.data.hunt === null && state.data.team.activeHeroId) {
        state.beginSearch();
      }
    } catch (error) {
      // Uma exceção no tick NÃO pode derrubar o loop: o jogador ficaria
      // olhando uma tela parada. Loga e segue no próximo frame.
      console.error("[loop] erro no tick:", error);
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
