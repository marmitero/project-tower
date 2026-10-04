/**
 * BattleRenderer — plano de apresentação dos eventos (§6, §60, §64).
 *
 * Este módulo é PURO: dada uma fila de eventos, decide o que a cena deve
 * mostrar/tocar. Nada aqui fala com React, Phaser ou áudio — a execução é
 * da `BattleScene` (visual) e de `sfx.ts` (som). Alterar o "como a batalha
 * se parece" é alterar `planBatch`, sem tocar em engine ou game-core.
 */
import { formatCompact } from "../format.js";
import type { BattleEvent } from "@tia/contracts";
import { skillsById } from "@tia/config";
import type { VfxKind } from "./vfxAtlas";

/** Efeito visual do pack a tocar (sheets de `vfxAtlas.ts`). */
export interface VfxRequest {
  kind: VfxKind;
  /** Onde: no alvo do evento, em quem agiu, ou no adversário de quem agiu. */
  on: "target" | "source" | "opponent";
  /** Multiplicador sobre o tamanho padrão do efeito (padrão 1). */
  scale?: number;
}

/** O que um único evento pede da cena. */
export interface FeedbackPlan {
  /** Id de áudio do manifesto (`audio/sfx/...`). */
  sfx?: string;
  /** O atacante avança rumo ao alvo (ataque). */
  lunge?: boolean;
  /** Tremor de tela. */
  shakeMs?: number;
  shakeIntensity?: number;
  /** Preenchimento branco no alvo (impacto). */
  flash?: boolean;
  /** Número flutuante no alvo. */
  number?: { text: string; kind: "crit" | "damage" | "mitigated" | "heal" };
  /** Animação de morte + fade do combatente. */
  death?: boolean;
  /** O combatente caído volta à luta (poção de reviver). */
  revive?: boolean;
  /** Efeitos do pack (corte, faísca, fogo, raio, cura) — ADR-029. */
  vfx?: VfxRequest[];
  /** Nome da skill acima do usuário. */
  skillName?: boolean;
  /** Banner central de fim de batalha. */
  banner?: "won" | "lost";
  /** Texto do banner quando não é o padrão ("TEMPO ESGOTADO"). */
  bannerText?: string;
  /** Rótulo flutuante sobre quem o gerou ("Imune", "Resistiu"). */
  label?: string;
  /** Nova fase do chefe: faixa, tremor e pulso no alvo. */
  phase?: string;
}

export interface PlannedFeedback {
  event: BattleEvent;
  plan: FeedbackPlan;
}

/**
 * Fila de entrada: o `App` empurra (`onBattleEvents`), a `BattleScene`
 * drena em cada frame. Limitada para nunca crescer sem freio se o Phaser
 * estiver em aba oculta (§63).
 */
const MAX_QUEUE = 512;
const queue: BattleEvent[] = [];

export const battleFeedbackQueue = {
  push(events: readonly BattleEvent[]): void {
    for (const e of events) {
      queue.push(e);
      if (queue.length > MAX_QUEUE) queue.shift();
    }
  },
  drain(): BattleEvent[] {
    return queue.splice(0, queue.length);
  },
  clear(): void {
    queue.length = 0;
  },
};

/** Efeito do golpe por tipo de dano: físico corta, mágico explode, dano contínuo só faísca. */
export function damageVfx(kind: "physical" | "magic" | "dot"): VfxRequest[] {
  if (kind === "physical") return [{ kind: "slash", on: "target" }, { kind: "hit", on: "target", scale: 0.8 }];
  if (kind === "magic") return [{ kind: "fire", on: "target" }];
  return [{ kind: "hit", on: "target", scale: 0.55 }];
}

const SFX_HITS = ["audio/sfx/hit_01", "audio/sfx/hit_02", "audio/sfx/hit_03"];

/** Plano de um evento isolado (sem o contexto do lote). */
function planOne(event: BattleEvent): FeedbackPlan {
  switch (event.type) {
    case "attack_started":
      return { lunge: true };
    case "skill_used":
      // Skill mágica: o raio cai sobre o adversário de quem lançou.
      return {
        skillName: true,
        sfx: "audio/sfx/skill",
        ...(skillsById[event.skillId]?.damageType === "magic" ? { vfx: [{ kind: "lightning", on: "opponent" }] } : {}),
      };
    case "damage_dealt":
      return {
        flash: true,
        vfx: damageVfx(event.kind),
        number: { text: formatCompact(event.amount), kind: "damage" },
        sfx: SFX_HITS[Math.abs(hash(event.targetId + event.amount)) % SFX_HITS.length],
        shakeMs: 90,
        shakeIntensity: 0.0025,
      };
    case "damage_mitigated":
      return {
        number: {
          text: `-${Math.round(event.mitigatedPercent)}%`,
          kind: "mitigated",
        },
      };
    case "critical_hit":
      // O número em si vem do `damage_dealt` pareado (planBatch); aqui o
      // que importa é o DESTAQUE: som, flash e tremor maiores (§6.2 —
      // crítico é distinto sem depender de cor: som + tamanho + tremor).
      return {
        sfx: "audio/sfx/critical",
        vfx: [{ kind: "hit", on: "target", scale: 1.5 }],
        flash: true,
        shakeMs: 220,
        shakeIntensity: 0.006,
      };
    case "heal_dealt":
      return {
        number: { text: formatCompact(event.amount), kind: "heal" },
        vfx: [{ kind: "heal", on: "target" }],
        sfx: "audio/sfx/heal",
      };
    case "enemy_defeated":
      return { death: true, sfx: "audio/sfx/death_enemy", vfx: [{ kind: "hit", on: "target", scale: 1.8 }] };
    case "character_defeated":
      return { death: true, sfx: "audio/sfx/death_hero", vfx: [{ kind: "hit", on: "target", scale: 1.6 }] };
    case "character_revived":
      return { revive: true, sfx: "audio/sfx/heal", vfx: [{ kind: "heal", on: "target", scale: 1.2 }] };
    case "battle_won":
      return { banner: "won", sfx: "audio/sfx/victory" };
    case "battle_lost":
      return {
        banner: "lost",
        sfx: "audio/sfx/defeat",
        ...(event.reason === "timeout" ? { bannerText: "TEMPO ESGOTADO" } : {}),
      };
    // ADR-027 — Boss: resistência a status e mudança de fase têm apresentação própria.
    case "effect_triggered":
      return event.effectId === "immune" || event.effectId === "resisted" ? { label: event.label } : {};
    case "phase_changed":
      return { phase: event.label, sfx: "audio/sfx/skill" };
    default:
      // turn_started, battle_started/finished, status_*: só sincronizam
      // estado (barras), sem apresentação própria.
      return {};
  }
}

/**
 * Plano de um LOTE (§6.1 — timeline). Resolve o pareamento
 * `critical_hit` ↔ `damage_dealt` (o engine emite `damage_dealt` e depois
 * `critical_hit` para o mesmo golpe): o dano vira número de CRÍTICO (maior)
 * e o evento `critical_hit` não gera número duplicado.
 */
export function planBatch(events: readonly BattleEvent[]): PlannedFeedback[] {
  const crits = new Set<string>();
  for (const e of events) {
    if (e.type === "critical_hit") {
      crits.add(`${e.sourceId}|${e.targetId}|${e.amount}`);
    }
  }
  return events.map((event) => {
    const plan = planOne(event);
    if (event.type === "damage_dealt") {
      const key = `${event.sourceId}|${event.targetId}|${event.amount}`;
      if (crits.has(key) && plan.number) {
        plan.number.kind = "crit";
      }
    }
    return { event, plan };
  });
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return h;
}
