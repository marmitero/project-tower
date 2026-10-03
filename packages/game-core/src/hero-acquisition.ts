/**
 * Aquisição de heróis pelo jogo (adendo de 2026-10-03, ADR-024).
 *
 * Os Reis (Boss, FASE 12) poderão dropar mais de 1 herói do mesmo tipo, cada
 * um com raridade e atributos PRÓPRIOS. Este módulo é a regra pura e
 * determinística dessa rolagem — o drop em si entra com o Boss; aqui só existe
 * a função que o Boss, o Mercado ou o painel chamarão.
 *
 * Balanceamento independente de classe: a rolagem NÃO olha para a classe além
 * de ler os atributos-base dela. Raridade, variação de atributo e multiplicador
 * vêm de `config.heroAcquisition`, os mesmos para todas (testado).
 *
 * Ordem das rolagens (fixa — determinismo): raridade → 6 fatores de atributo
 * na ordem de `ATTRIBUTE_IDS`.
 */

import type { Hero, HeroOrigin } from "@tia/contracts";
import type { AccountId, ClassId } from "@tia/contracts";
import { ATTRIBUTE_IDS, classes, config, type CharacterAttributes, type Rarity } from "@tia/config";
import type { Prng } from "@tia/engine";
import { createHero } from "./creation.js";

export interface HeroRoll {
  classId: string;
  rarity: Rarity;
  attributes: CharacterAttributes;
  /** 0–100: posição média da rolagem dos atributos na faixa [min, max]. */
  quality: number;
}

/** Sorteia raridade e atributos de um herói da classe dada. */
export function rollHeroAcquisition(rng: Prng, classId: string): HeroRoll {
  const cls = classes.find((c) => c.id === classId);
  if (!cls) throw new Error(`Classe desconhecida: ${classId}`);
  const acq = config.heroAcquisition;

  const rarity = rng.weightedKey(acq.rarityChance);
  const { min, max, samples } = acq.attributeRoll;

  const attributes = { ...cls.attributes };
  let uSum = 0;
  for (const id of ATTRIBUTE_IDS) {
    let u = 0;
    for (let i = 0; i < samples; i += 1) u += rng.next();
    u /= samples;
    uSum += u;
    attributes[id] = Math.max(1, Math.round(cls.attributes[id] * (min + (max - min) * u)));
  }
  return { classId, rarity, attributes, quality: (uSum / ATTRIBUTE_IDS.length) * 100 };
}

/** Cria o herói adquirido a partir de uma rolagem (mesmo `createHero` do inicial). */
export function createAcquiredHero(params: {
  accountId: AccountId;
  name: string;
  roll: HeroRoll;
  origin: Exclude<HeroOrigin, "starter">;
  now: number;
  index: number;
}): Hero {
  return createHero({
    accountId: params.accountId,
    classId: params.roll.classId as ClassId,
    name: params.name,
    rarity: params.roll.rarity,
    attributes: params.roll.attributes,
    quality: params.roll.quality,
    origin: params.origin,
    now: params.now,
    index: params.index,
  });
}
