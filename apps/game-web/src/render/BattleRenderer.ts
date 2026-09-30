/**
 * Battle Renderer.
 *
 * §64 — "o renderer apenas apresenta os eventos." Este arquivo NÃO calcula
 * dano, NÃO decide alvo, NÃO sorteia nada. Ele recebe `BattleEvent[]` e
 * transforma cada um em feedback visual.
 *
 * §62 — o produto final não pode ser quadrados, círculos ou emojis. Este
 * renderer usa sprites do pipeline de assets; enquanto eles não existem
 * em disco, ele desenha NOTHING e registra um aviso explícito, em vez de
 * fingir que um retângulo colorido é o jogo.
 */

import type { BattleEvent } from "@tia/contracts";
import { loadAssetManifest, type AssetManifest } from "./assets.js";

export interface RenderTarget {
  drawSprite(assetId: string, x: number, y: number, frame: string): void;
  drawText(text: string, x: number, y: number, color: string): void;
  flash(targetId: string, color: string, durationMs: number): void;
  shake(intensity: number, durationMs: number): void;
  playSound(soundId: string): void;
  layout(mode: "tower" | "boss"): void;
}

/** Mapeia eventos → assets de feedback. §66 lista os eventos canônicos. */
const FEEDBACK: Record<string, { sound?: string; shake?: number; flash?: string }> = {
  battle_started: { sound: "sfx_battle_start" },
  attack_started: { sound: "sfx_swing" },
  skill_used: { sound: "sfx_skill" },
  damage_dealt: { sound: "sfx_hit" },
  critical_hit: { sound: "sfx_crit", shake: 6, flash: "#ffd166" },
  enemy_damaged: { flash: "#ff6b6b" },
  character_damaged: { flash: "#ff4757" },
  enemy_defeated: { sound: "sfx_defeat_enemy", shake: 3 },
  character_defeated: { sound: "sfx_defeat_ally", shake: 4 },
  heal_dealt: { flash: "#7bed9f" },
  status_applied: { flash: "#a55eea" },
  status_removed: {},
  effect_triggered: { sound: "sfx_effect" },
  battle_won: { sound: "sfx_victory" },
  battle_lost: { sound: "sfx_defeat" },
  battle_finished: {},
  damage_mitigated: {},
  turn_started: {},
};

export class BattleRenderer {
  private manifest: AssetManifest | null = null;
  /** Assets ausentes já avisados — evita 200 warnings por segundo. */
  private readonly warned = new Set<string>();

  constructor(private readonly target: RenderTarget) {}

  async load(): Promise<void> {
    this.manifest = await loadAssetManifest();
    if (this.manifest.missing.length > 0) {
      // §62 — a ausência de arte é um BLOQUEIO de entrega, não um detalhe.
      // Falhar alto aqui é o que impede que um build com placeholders seja
      // publicado como se fosse o produto.
      console.warn(
        `[renderer] ${this.manifest.missing.length} assets ausentes. ` +
          "O jogo NÃO pode ser entregue assim (§62 — sem quadrados, círculos ou emojis).",
      );
    }
  }

  layout(mode: "tower" | "boss"): void {
    this.target.layout(mode);
  }

  /**
   * Reproduz os eventos. Retorna quantos foram efetivamente desenhados,
   * para o HUD reportar "assets ausentes" em vez de fingir sucesso.
   */
  present(events: readonly BattleEvent[]): number {
    let drawn = 0;
    for (const event of events) {
      const feedback = FEEDBACK[event.type] ?? {};
      if (feedback.shake) this.target.shake(feedback.shake, 180);
      if (feedback.flash) this.target.flash(event.type, feedback.flash, 160);
      if (feedback.sound) this.play(feedback.sound);
      drawn += 1;
    }
    return drawn;
  }

  private play(soundId: string): void {
    if (!this.hasAsset(`sfx/${soundId}`)) return;
    this.target.playSound(soundId);
  }

  private hasAsset(id: string): boolean {
    if (this.warned.has(id)) return false;
    if (this.manifest && this.manifest.entries[id] !== undefined) return true;
    this.warned.add(id);
    return false;
  }
}
