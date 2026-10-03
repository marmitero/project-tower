/**
 * Inimigos da Torre (P-006 — RESOLVIDA, ADR-021).
 *
 * Um inimigo é DADO serializável (`EnemySeed`): identidade, papel, tipo de
 * dano, 6 atributos (a mesma base OpenRpg dos heróis, `attributes.ts`) e
 * sprites. Os stats por nível (`growth`) são DERIVADOS dos atributos pela
 * mesma função dos heróis — por isso herói e inimigo escalam pela mesma
 * estrutura em qualquer nível e o equilíbrio de 1 a 20.000 é uma propriedade
 * da fórmula, não de uma tabela com milhares de números.
 *
 * ADR-022 (admin-ready): o painel administrativo (FASE 14) edita/adiciona/
 * remove `EnemySeed`s; `buildEnemy` recompõe `growth`. Nada aqui é código
 * de comportamento — só dados.
 *
 * §62 — só sprites que existem no pack. `boss` e `slimeking` ficam RESERVADOS
 * para a FASE 12 (boss é atividade separada, nunca da Torre — §21/§55); os
 * sprites das classes de herói (`hero`, `mage`, `archer`, `necromancer`) não
 * são reaproveitados como inimigos.
 */

import { charSheets, type CharacterAssets, type ClassGrowth } from "./catalog.js";
import { growthFromAttributes, type CharacterAttributes } from "./attributes.js";

/**
 * Papel de combate — é o que faz a escolha de herói ser uma decisão (§18/§107):
 *
 * - `tank`     — muita vida e defesa, golpes fracos: luta longa.
 * - `dps`      — vida média, golpes fortes: luta curta e dolorida.
 * - `swift`    — vida baixa, velocidade/crítico altos: muitos golpes pequenos.
 * - `caster`   — dano MÁGICO: ignora a Defesa e enfrenta a Defesa Especial.
 * - `balanced` — sem ponto fraco nem forte.
 * - `elite`    — versão reforçada (multiplicador), rara no pool.
 */
export type EnemyRole = "tank" | "dps" | "swift" | "caster" | "balanced" | "elite";

export const ENEMY_ROLES: readonly EnemyRole[] = ["tank", "dps", "swift", "caster", "balanced", "elite"];

/** Rótulos PT-BR da UI — dado editável, não string espalhada pelos componentes. */
export const ENEMY_ROLE_LABELS: Record<EnemyRole, string> = {
  tank: "Tanque",
  dps: "Dano",
  swift: "Veloz",
  caster: "Mago",
  balanced: "Equilibrado",
  elite: "Elite",
};

export type EnemyDamageType = "physical" | "magic";

/** Forma persistível/editável de um inimigo (sem campos derivados). */
export interface EnemySeed {
  id: string;
  name: string;
  role: EnemyRole;
  /** Tipo do ataque básico: físico usa Ataque×Defesa; mágico usa Ataque Esp.×Defesa Esp. */
  damageType: EnemyDamageType;
  attributes: CharacterAttributes;
  /**
   * Multiplica vida, ataques e defesas (não velocidade/crítico/IAS). Ajuste FINO
   * de força sem mexer nos 6 atributos. Os valores padrão foram calibrados por
   * simulação (`balance.ts`) para que cada papel custe a mesma fração de vida
   * a um herói on-curve: tank ≈10%, dps ≈14%, veloz ≈9%, mago ≈13%,
   * equilibrado ≈11%, elite ≈20% (média das 4 classes).
   */
  statMultiplier: number;
  /** `portrait` é opcional: nem todo inimigo tem retrato no pack (§62). */
  assets: CharacterAssets;
}

/** Inimigo pronto para o jogo: seed + stats por nível derivados. */
export interface EnemyDef extends EnemySeed {
  growth: ClassGrowth;
}

/** Deriva `growth` dos atributos e aplica o multiplicador de força do inimigo. */
export function buildEnemy(seed: EnemySeed): EnemyDef {
  const g = growthFromAttributes(seed.attributes);
  const m = seed.statMultiplier;
  const scale = (v: number) => +(v * m).toFixed(2);
  return {
    ...seed,
    growth: {
      hp: Math.floor(g.hp * m),
      hpPerLevel: scale(g.hpPerLevel),
      attack: Math.floor(g.attack * m),
      attackPerLevel: scale(g.attackPerLevel),
      specialAttack: Math.floor(g.specialAttack * m),
      specialAttackPerLevel: scale(g.specialAttackPerLevel),
      defense: Math.floor(g.defense * m),
      defensePerLevel: scale(g.defensePerLevel),
      specialDefense: Math.floor(g.specialDefense * m),
      specialDefensePerLevel: scale(g.specialDefensePerLevel),
      critChance: g.critChance,
      attackSpeed: g.attackSpeed,
      speed: g.speed,
    },
  };
}

const attrs = (
  strength: number,
  dexterity: number,
  constitution: number,
  intelligence: number,
  wisdom: number,
): CharacterAttributes => ({ strength, dexterity, constitution, intelligence, wisdom, charisma: 4 });

/**
 * Roster padrão — 15 inimigos (tank 3, dps 4, swift 1, caster 3, balanced 1, elite 3).
 * Fábrica dos DEFAULTS: o estado vivo é `enemies` (pode ser substituído por
 * um ContentPack, ver `content.ts`).
 */
export function defaultEnemySeeds(): EnemySeed[] {
  return [
    // --- tank ---------------------------------------------------------
    { id: "slime", name: "Gosma", role: "tank", damageType: "physical", statMultiplier: 1.0,
      attributes: attrs(16, 6, 34, 4, 16),
      assets: { portrait: "portraits/slime", sheets: charSheets("slime") } },
    { id: "frostslime", name: "Gosma Gélida", role: "tank", damageType: "magic", statMultiplier: 0.83,
      // Resiste a magia (Defesa Esp. alta): a escolha do herói mágico importa.
      attributes: attrs(10, 6, 30, 14, 32),
      assets: { sheets: charSheets("frostslime") } },
    // Lote 2 (ADR-036): tanque do andar 2 (Porão Úmido) — atlas próprio.
    { id: "mud_toad", name: "Sapo-Lodo Gigante", role: "tank", damageType: "physical", statMultiplier: 1.04,
      attributes: attrs(20, 4, 36, 4, 16),
      assets: { sheets: charSheets("slime"), atlas: "enemies/mud_toad" } },
    // --- dps ----------------------------------------------------------
    { id: "goblin", name: "Goblin", role: "dps", damageType: "physical", statMultiplier: 1.23,
      attributes: attrs(28, 20, 14, 6, 8),
      assets: { portrait: "portraits/goblin", sheets: charSheets("goblin") } },
    // Lote 2: dano do andar 2 — o brutamontes do esgoto (corpo de goblin como fallback visual).
    { id: "sewer_rat", name: "Rato de Esgoto Bruto", role: "dps", damageType: "physical", statMultiplier: 1.12,
      attributes: attrs(32, 16, 16, 4, 8),
      assets: { sheets: charSheets("goblin"), atlas: "enemies/sewer_rat" } },
    { id: "orc", name: "Orc", role: "dps", damageType: "physical", statMultiplier: 1.01,
      attributes: attrs(34, 10, 22, 4, 10),
      assets: { portrait: "portraits/orc", sheets: charSheets("orc") } },
    { id: "bloodskeleton", name: "Esqueleto Sangrento", role: "dps", damageType: "physical", statMultiplier: 1.15,
      attributes: attrs(30, 22, 16, 6, 8),
      assets: { sheets: charSheets("bloodskeleton") } },
    // --- swift --------------------------------------------------------
    { id: "bat", name: "Morcego", role: "swift", damageType: "physical", statMultiplier: 1.12,
      attributes: attrs(14, 34, 10, 6, 8),
      assets: { sheets: charSheets("bat") } },
    // --- caster -------------------------------------------------------
    { id: "toxicbat", name: "Morcego Tóxico", role: "caster", damageType: "magic", statMultiplier: 1.1,
      attributes: attrs(6, 24, 12, 28, 14),
      assets: { sheets: charSheets("toxicbat") } },
    // ADR-033/Lote 1: o primeiro inimigo com atlas próprio (`ita-atlas-v1`). Mago do andar 1–2:
    // multiplicador baixo (o andar 1 não pode punir quem ainda não tem equipamento).
    { id: "spark_imp", name: "Duende de Faíscas", role: "caster", damageType: "magic", statMultiplier: 0.78,
      attributes: attrs(6, 20, 10, 26, 12),
      assets: { sheets: charSheets("mage"), atlas: "enemies/spark_imp" } },
    { id: "fireorc", name: "Orc Flamejante", role: "caster", damageType: "magic", statMultiplier: 0.88,
      attributes: attrs(10, 8, 22, 32, 12),
      assets: { sheets: charSheets("fireorc") } },
    // --- balanced -----------------------------------------------------
    { id: "skeleton", name: "Esqueleto", role: "balanced", damageType: "physical", statMultiplier: 0.97,
      attributes: attrs(24, 14, 24, 8, 14),
      assets: { portrait: "portraits/skeleton", sheets: charSheets("skeleton") } },
    // --- elite (raros; multiplicador de força) --------------------------
    // Lote 2: Elite RARO do andar 1 (fecha os 5 papéis do andar).
    { id: "goblin_captain", name: "Goblin Capitão", role: "elite", damageType: "physical", statMultiplier: 1.2,
      attributes: attrs(30, 22, 22, 8, 12),
      assets: { sheets: charSheets("orc"), atlas: "enemies/goblin_captain" } },
    { id: "elitearcher", name: "Arqueiro de Elite", role: "elite", damageType: "physical", statMultiplier: 1.26,
      attributes: attrs(26, 32, 18, 8, 12),
      assets: { sheets: charSheets("elitearcher") } },
    { id: "shadowgoblin", name: "Goblin Sombrio", role: "elite", damageType: "magic", statMultiplier: 1.19,
      attributes: attrs(18, 28, 18, 26, 16),
      assets: { sheets: charSheets("shadowgoblin") } },
  ];
}

/** Estado VIVO do roster. Substituído em lugar por `applyContentPack` (mesma referência). */
export const enemies: EnemyDef[] = defaultEnemySeeds().map(buildEnemy);

export function enemyById(id: string): EnemyDef | undefined {
  return enemies.find((e) => e.id === id);
}
