/**
 * Efeitos de equipamento no combate (ADR-023).
 *
 * O engine NÃO conhece itens, raridades nem templates: recebe uma lista de
 * `GearEffect` (vocabulário fechado, definido em `@tia/config`) por combatente
 * e a reduz a um `GearProfile` — números prontos para a simulação. Quem sabe
 * montar a lista (traço da arma + característica de cada peça) é o game-core.
 *
 * Soma de efeitos de vários itens: escalares somam e respeitam `caps` (um
 * balanço contra empilhamento); efeitos com chance (dot, stun, counter) ficam
 * como lista e rolam cada um; `multiHit` e `area` não empilham (vale o maior).
 */

import type { GearEffect } from "@tia/config";

export interface GearCaps {
  critChance: number;
  attackSpeed: number;
  damageBonus: number;
  defensePierce: number;
  lifesteal: number;
  cooldownReduction: number;
}

type Of<K extends GearEffect["kind"]> = Extract<GearEffect, { kind: K }>;

export interface GearProfile {
  critChance: number;
  attackSpeed: number;
  damagePhysical: number;
  damageMagic: number;
  defensePierce: number;
  lifesteal: number;
  cooldownReduction: number;
  basicHeal: number;
  dots: Of<"dot">[];
  stuns: Of<"stun">[];
  counters: Of<"counter">[];
  multiHit: Of<"multiHit"> | null;
  area: Of<"area"> | null;
}

export function emptyGearProfile(): GearProfile {
  return {
    critChance: 0,
    attackSpeed: 0,
    damagePhysical: 0,
    damageMagic: 0,
    defensePierce: 0,
    lifesteal: 0,
    cooldownReduction: 0,
    basicHeal: 0,
    dots: [],
    stuns: [],
    counters: [],
    multiHit: null,
    area: null,
  };
}

const NO_CAPS: GearCaps = {
  critChance: Infinity,
  attackSpeed: Infinity,
  damageBonus: Infinity,
  defensePierce: Infinity,
  lifesteal: Infinity,
  cooldownReduction: Infinity,
};

export function buildGearProfile(effects: readonly GearEffect[] | undefined, caps: GearCaps = NO_CAPS): GearProfile {
  const p = emptyGearProfile();
  let dmgAny = 0;
  for (const e of effects ?? []) {
    switch (e.kind) {
      case "critChance": p.critChance += e.value; break;
      case "attackSpeed": p.attackSpeed += e.value; break;
      case "damageBonus":
        if (e.damageType === "physical") p.damagePhysical += e.value;
        else if (e.damageType === "magic") p.damageMagic += e.value;
        else dmgAny += e.value;
        break;
      case "defensePierce": p.defensePierce += e.value; break;
      case "lifesteal": p.lifesteal += e.value; break;
      case "cooldownReduction": p.cooldownReduction += e.value; break;
      case "basicHeal": p.basicHeal += e.value; break;
      case "dot": p.dots.push(e); break;
      case "stun": p.stuns.push(e); break;
      case "counter": p.counters.push(e); break;
      case "multiHit":
        if (!p.multiHit || e.hits * e.coefficient > p.multiHit.hits * p.multiHit.coefficient) p.multiHit = e;
        break;
      case "area":
        if (!p.area || e.perTargetCoefficient > p.area.perTargetCoefficient) p.area = e;
        break;
    }
  }
  p.critChance = Math.min(p.critChance, caps.critChance);
  p.attackSpeed = Math.min(p.attackSpeed, caps.attackSpeed);
  p.damagePhysical = Math.min(p.damagePhysical + dmgAny, caps.damageBonus);
  p.damageMagic = Math.min(p.damageMagic + dmgAny, caps.damageBonus);
  p.defensePierce = Math.min(p.defensePierce, caps.defensePierce);
  p.lifesteal = Math.min(p.lifesteal, caps.lifesteal);
  p.cooldownReduction = Math.min(p.cooldownReduction, caps.cooldownReduction);
  return p;
}
