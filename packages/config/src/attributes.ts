/**
 * Atributos-base e derivação de stats (baseado no OpenRpg).
 *
 * Fonte: `OpenRpg.Genres.Fantasy` (MIT, github.com/openrpg/OpenRpg) —
 * `FantasyVitalsStatPopulator` (MaxHealth = base + CON×5, MaxMana = base +
 * INT×5), `FantasyMeleeStatPopulator` (modificadores STR/100 e DEX/100 por
 * tipo de dano) e `FantasyAttributeStatPopulator`. Ver
 * `docs/OPENRPG_REFERENCE.md` para o mapeamento completo e as divergências.
 *
 * A ideia estrutural que importamos: a **identidade da classe são os
 * atributos**; os stats de combate são PROJEÇÃO derivada. Trocar a fantasia
 * de uma classe é editar 6 números — o balance inteiro se recompõe.
 *
 * As fórmulas abaixo são ajustadas à escala do nosso jogo (o Master-Prompt
 * não define escala de atributo; isso é ⛔ P-002 provisório). Elas são
 * DADO+função pura, testáveis sem navegador.
 */

export interface CharacterAttributes {
  /** Dano físico bruto e tanqueza de ataque. */
  strength: number;
  /** Precisão, velocidade e crítico. */
  dexterity: number;
  /** Vida e defesa física. */
  constitution: number;
  /** Poder mágico. */
  intelligence: number;
  /** Defesa mágica e sustain. */
  wisdom: number;
  /** Identidade social/economia futura (venda, NPC) — sem efeito em combate hoje. */
  charisma: number;
}

export type AttributeId = keyof CharacterAttributes;

export const ATTRIBUTE_IDS: readonly AttributeId[] = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
];

/** Mesma forma de `ClassGrowth` do catálogo — stats derivados por nível. */
export interface DerivedGrowth {
  hp: number;
  hpPerLevel: number;
  attack: number;
  attackPerLevel: number;
  specialAttack: number;
  specialAttackPerLevel: number;
  defense: number;
  defensePerLevel: number;
  specialDefense: number;
  specialDefensePerLevel: number;
  critChance: number;
  attackSpeed: number;
  speed: number;
}

/**
 * Deriva os stats de combate dos atributos.
 *
 * Fórmulas (citadas em `docs/OPENRPG_REFERENCE.md` §4):
 *
 * - `hp = 40 + CON×5` — OpenRpg vitals (CON×5) com base nossa;
 * - `attack = FOR×1,0 + DES×0,3` (ADR-021; era 0,8/0,2: o dano mágico, INT×1,2, dava
 *   aos magos ~50% mais ofensa que aos físicos) — STR≈maçada, DEX≈perfurante, a média
 *   ponderada≈cortante (OpenRpg melee modifiers STR/100, DEX/100);
 * - `specialAttack = INT×1,2 + SAB×0,3` — INT domina, SAB sustenta;
 * - `defense = 2 + CON×0,8`; `specialDefense = 2 + SAB×0,9`;
 * - `critChance = 0,02 + DES×0,004` (teto de 0,75 do engine é validado);
 * - `attackSpeed = max(0, (DES−10)×0,01)` (ADR-030: era 0,02) — identidade de velocidade;
 * - `speed = 6 + DES×0,5`.
 *
 * Linhas "perLevel" são ~11–14% do base (ritmo compatível com a curva de XP
 * do Rei, ⛔ P-009). Todo resultado é `Math.floor` onde inteiro faz sentido.
 */
export function growthFromAttributes(a: CharacterAttributes): DerivedGrowth {
  const hp = 40 + a.constitution * 5;
  const attack = a.strength * 1.0 + a.dexterity * 0.3;
  const specialAttack = a.intelligence * 1.2 + a.wisdom * 0.3;
  const defense = 2 + a.constitution * 0.8;
  const specialDefense = 2 + a.wisdom * 0.9;
  return {
    hp: Math.floor(hp),
    hpPerLevel: Math.floor(hp * 0.12),
    attack: Math.floor(attack),
    attackPerLevel: +(attack * 0.13).toFixed(1),
    specialAttack: Math.floor(specialAttack),
    specialAttackPerLevel: +(specialAttack * 0.14).toFixed(1),
    defense: Math.floor(defense),
    defensePerLevel: +(defense * 0.11).toFixed(1),
    specialDefense: Math.floor(specialDefense),
    specialDefensePerLevel: +(specialDefense * 0.11).toFixed(1),
    critChance: +(0.02 + a.dexterity * 0.004).toFixed(3),
    attackSpeed: +Math.max(0, (a.dexterity - 10) * 0.01).toFixed(2),
    speed: +(6 + a.dexterity * 0.5).toFixed(1),
  };
}
