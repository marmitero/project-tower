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
import { ATTRIBUTE_IDS, classes, config, heroById, pickAcquiredIdentity, type CharacterAttributes, type Rarity } from "@tia/config";
import type { Prng } from "@tia/engine";
import { createHero } from "./creation.js";

export interface HeroRoll {
  classId: string;
  /** Identidade sorteada (arte e atributos próprios — ADR-033). Decidida pela qualidade, sem gastar PRNG. */
  identityId?: string;
  rarity: Rarity;
  attributes: CharacterAttributes;
  /** 0–100: posição média da rolagem dos atributos na faixa [min, max]. */
  quality: number;
}

/**
 * Sorteia raridade e atributos de um herói da classe dada. `forcedRarity` (caixas e invocação por
 * fragmentos já decidiram a raridade) substitui o sorteio de raridade, mas o PRNG consome a mesma
 * quantidade de números — os atributos saem idênticos com ou sem raridade forçada.
 */
export function rollHeroAcquisition(rng: Prng, classId: string, forcedRarity?: Rarity): HeroRoll {
  const cls = classes.find((c) => c.id === classId);
  if (!cls) throw new Error(`Classe desconhecida: ${classId}`);
  const acq = config.heroAcquisition;

  const rolledRarity = rng.weightedKey(acq.rarityChance);
  const rarity = forcedRarity ?? rolledRarity;
  const { min, max, samples } = acq.attributeRoll;

  // A identidade é escolhida DEPOIS da rolagem (a partir da qualidade): o PRNG consome o mesmo
  // número de valores de sempre e as rolagens existentes continuam idênticas. Já o delta de
  // atributos da identidade entra como base da faixa [min, max] — por isso o cálculo abaixo usa
  // `baseline` e a escolha usa a qualidade de uma passada sem delta.
  const rolled = ATTRIBUTE_IDS.map(() => {
    let u = 0;
    for (let i = 0; i < samples; i += 1) u += rng.next();
    return u / samples;
  });
  const quality0 = (rolled.reduce((a, b) => a + b, 0) / rolled.length) * 100;
  const identity = pickAcquiredIdentity(classId, quality0 / 100);
  const baseline = { ...cls.attributes };
  for (const [id, delta] of Object.entries(identity.attributeDelta ?? {})) baseline[id as keyof CharacterAttributes] += delta;
  const attributes = { ...cls.attributes };
  let uSum = 0;
  ATTRIBUTE_IDS.forEach((id, i) => {
    const u = rolled[i]!;
    uSum += u;
    attributes[id] = Math.max(1, Math.round(baseline[id] * (min + (max - min) * u)));
  });
  return { classId, identityId: identity.id, rarity, attributes, quality: (uSum / ATTRIBUTE_IDS.length) * 100 };
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
  const identity = params.roll.identityId ? heroById[params.roll.identityId] : undefined;
  return createHero({
    accountId: params.accountId,
    classId: params.roll.classId as ClassId,
    ...(identity ? { identityId: identity.id } : {}),
    name: identity?.name ?? params.name,
    rarity: params.roll.rarity,
    attributes: params.roll.attributes,
    quality: params.roll.quality,
    origin: params.origin,
    now: params.now,
    index: params.index,
  });
}
