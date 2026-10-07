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
 * Roster padrão — 25 inimigos (tank 5, dps 5, swift 4, caster 5, elite 6).
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
    // Lote 3 (ADR-037): tanques dos andares 3 e 4 — atlas próprio.
    { id: "bone_golem", name: "Golem de Ossos", role: "tank", damageType: "physical", statMultiplier: 0.985,
      attributes: attrs(23, 4, 37, 4, 14),
      assets: { sheets: charSheets("skeleton"), atlas: "enemies/bone_golem" } },
    { id: "guardian_statue", name: "Estátua Guardiã", role: "tank", damageType: "physical", statMultiplier: 1.0,
      attributes: attrs(21, 4, 38, 4, 21),
      assets: { sheets: charSheets("orc"), atlas: "enemies/guardian_statue" } },
    // Lote 7 (ADR-043): tanque do andar 5 (Salão dos Ecos) — atlas próprio.
    { id: "crystal_sentry", name: "Sentinela de Cristal", role: "tank", damageType: "physical", statMultiplier: 1.02,
      attributes: attrs(22, 4, 38, 4, 18),
      assets: { sheets: charSheets("orc"), atlas: "enemies/crystal_sentry" } },
    // Lote 8 (ADR-044): tanque do andar 6 (Fornalha Esquecida) — atlas próprio.
    { id: "slag_golem", name: "Golem de Escória", role: "tank", damageType: "physical", statMultiplier: 1.01,
      attributes: attrs(24, 4, 38, 4, 16),
      assets: { sheets: charSheets("orc"), atlas: "enemies/slag_golem" } },
    // Lote 9 (ADR-045): tanque do andar 8 (Ninho das Sombras) — atlas próprio.
    { id: "giant_cocoon", name: "Casulo Gigante", role: "tank", damageType: "physical", statMultiplier: 0.98,
      attributes: attrs(18, 6, 36, 4, 20),
      assets: { sheets: charSheets("orc"), atlas: "enemies/giant_cocoon" } },
    // Lote 10: tanque do andar 9 (Corredor Sangrento).
    { id: "armored_executioner", name: "Carrasco Encouraçado", role: "tank", damageType: "physical", statMultiplier: 1.02,
      attributes: attrs(24, 8, 36, 6, 12),
      assets: { sheets: charSheets("orc"), atlas: "enemies/armored_executioner" } },
    // Lote 10: tanque do andar 10 (Câmara dos Mil Passos).
    { id: "obsidian_colossus", name: "Colosso de Obsidiana", role: "tank", damageType: "physical", statMultiplier: 1.0,
      attributes: attrs(26, 6, 38, 8, 14),
      assets: { sheets: charSheets("orc"), atlas: "enemies/obsidian_colossus" } },
    // Lote 12 (ADR-049): tanque dos andares 11–15 (Pináculo Arcano) — atlas próprio.
    { id: "crystal_golem", name: "Golem de Cristal Arcano", role: "tank", damageType: "physical", statMultiplier: 0.96,
      attributes: attrs(24, 6, 38, 8, 14),
      assets: { sheets: charSheets("orc"), atlas: "enemies/crystal_golem" } },
    // --- dps ----------------------------------------------------------
    { id: "goblin", name: "Goblin", role: "dps", damageType: "physical", statMultiplier: 1.23,
      attributes: attrs(28, 20, 14, 6, 8),
      assets: { portrait: "portraits/goblin", sheets: charSheets("goblin") } },
    // Lote 2: dano do andar 2 — o brutamontes do esgoto (corpo de goblin como fallback visual).
    { id: "sewer_rat", name: "Rato de Esgoto Bruto", role: "dps", damageType: "physical", statMultiplier: 1.12,
      attributes: attrs(32, 16, 16, 4, 8),
      assets: { sheets: charSheets("goblin"), atlas: "enemies/sewer_rat" } },
    // Lote 7 (ADR-043): dano do andar 5 (Salão dos Ecos) — atlas próprio.
    { id: "ghost_duelist", name: "Duelista Fantasma", role: "dps", damageType: "physical", statMultiplier: 1.08,
      attributes: attrs(32, 16, 22, 6, 10),
      assets: { sheets: charSheets("skeleton"), atlas: "enemies/ghost_duelist" } },
    // Lote 8 (ADR-044): dano do andar 6 (Fornalha Esquecida) — atlas próprio.
    { id: "possessed_smith", name: "Ferreiro Possuído", role: "dps", damageType: "physical", statMultiplier: 1.06,
      attributes: attrs(36, 12, 22, 4, 8),
      assets: { sheets: charSheets("hero"), atlas: "enemies/possessed_smith" } },
    // Lote 9 (ADR-045): dano do andar 7 (Jardim Gélido) — atlas próprio.
    { id: "frost_bear", name: "Urso Glacial", role: "dps", damageType: "physical", statMultiplier: 1.05,
      attributes: attrs(36, 12, 22, 4, 10),
      assets: { sheets: charSheets("orc"), atlas: "enemies/frost_bear" } },
    // Lote 9 (ADR-045): dano do andar 8 (Ninho das Sombras) — atlas próprio.
    { id: "blackfang_spider", name: "Aranha Presas-Negras", role: "dps", damageType: "physical", statMultiplier: 1.06,
      attributes: attrs(32, 18, 20, 6, 8),
      assets: { sheets: charSheets("orc"), atlas: "enemies/blackfang_spider" } },
    { id: "orc", name: "Orc", role: "dps", damageType: "physical", statMultiplier: 1.01,
      attributes: attrs(34, 10, 22, 4, 10),
      assets: { portrait: "portraits/orc", sheets: charSheets("orc") } },
    { id: "bloodskeleton", name: "Esqueleto Sangrento", role: "dps", damageType: "physical", statMultiplier: 1.15,
      attributes: attrs(30, 22, 16, 6, 8),
      assets: { sheets: charSheets("bloodskeleton") } },
    // Lote 11: dano do andar 10 (Câmara dos Mil Passos) — atlas próprio.
    { id: "eternal_warrior", name: "Guerreiro Eterno", role: "dps", damageType: "physical", statMultiplier: 1.05,
      attributes: attrs(30, 20, 20, 6, 10),
      assets: { sheets: charSheets("hero"), atlas: "enemies/eternal_warrior" } },
    // Lote 12 (ADR-049): dano dos andares 11–15 (Pináculo Arcano) — atlas próprio.
    { id: "rune_blade", name: "Espadachim Rúnico", role: "dps", damageType: "physical", statMultiplier: 1.05,
      attributes: attrs(30, 22, 18, 8, 10),
      assets: { sheets: charSheets("hero"), atlas: "enemies/rune_blade" } },
    // --- swift --------------------------------------------------------
    { id: "bat", name: "Morcego", role: "swift", damageType: "physical", statMultiplier: 1.12,
      attributes: attrs(14, 34, 10, 6, 8),
      assets: { sheets: charSheets("bat") } },
    // Lote 3: velozes — a Enguia (andar 2), o Cão de Ossos (3) e o Escaravelho de Tumba (4).
    { id: "sewer_eel", name: "Enguia Rastejante", role: "swift", damageType: "physical", statMultiplier: 1.1,
      attributes: attrs(16, 32, 12, 4, 8),
      assets: { sheets: charSheets("slime"), atlas: "enemies/sewer_eel" } },
    { id: "bone_hound", name: "Cão de Ossos", role: "swift", damageType: "physical", statMultiplier: 1.12,
      attributes: attrs(18, 34, 10, 4, 6),
      assets: { sheets: charSheets("goblin"), atlas: "enemies/bone_hound" } },
    { id: "tomb_scarab", name: "Escaravelho de Tumba", role: "swift", damageType: "physical", statMultiplier: 1.0,
      attributes: attrs(15, 31, 16, 4, 9),
      assets: { sheets: charSheets("slime"), atlas: "enemies/tomb_scarab" } },
    // Lote 7 (ADR-043): veloz do andar 5 (Salão dos Ecos) — atlas próprio.
    { id: "whispering_wraith", name: "Espectro Sussurrante", role: "swift", damageType: "magic", statMultiplier: 1.05,
      attributes: attrs(14, 28, 16, 12, 16),
      assets: { sheets: charSheets("bat"), atlas: "enemies/whispering_wraith" } },
    // Lote 8 (ADR-044): veloz do andar 6 (Fornalha Esquecida) — atlas próprio.
    { id: "swift_salamander", name: "Salamandra Veloz", role: "swift", damageType: "physical", statMultiplier: 1.08,
      attributes: attrs(18, 34, 12, 4, 8),
      assets: { sheets: charSheets("goblin"), atlas: "enemies/swift_salamander" } },
    // Lote 9 (ADR-045): veloz do andar 7 (Jardim Gélido) — atlas próprio.
    { id: "boreal_fox", name: "Raposa Boreal", role: "swift", damageType: "physical", statMultiplier: 1.06,
      attributes: attrs(16, 36, 10, 4, 8),
      assets: { sheets: charSheets("goblin"), atlas: "enemies/boreal_fox" } },
    // Lote 9 (ADR-045): veloz do andar 8 (Ninho das Sombras) — atlas próprio.
    { id: "shadow_crawler", name: "Sombra Rastejante", role: "swift", damageType: "magic", statMultiplier: 1.05,
      attributes: attrs(10, 34, 12, 20, 12),
      assets: { sheets: charSheets("goblin"), atlas: "enemies/shadow_crawler" } },
    // Lote 10: veloz do andar 9 (Corredor Sangrento) — atlas próprio.
    { id: "winged_leech", name: "Sanguessuga Alada", role: "swift", damageType: "physical", statMultiplier: 1.05,
      attributes: attrs(14, 34, 12, 10, 8),
      assets: { sheets: charSheets("bat"), atlas: "enemies/winged_leech" } },
    // Lote 11: veloz do andar 10 (Câmara dos Mil Passos) — atlas próprio.
    { id: "living_clock", name: "Relógio Vivo", role: "swift", damageType: "physical", statMultiplier: 1.05,
      attributes: attrs(16, 36, 12, 6, 8),
      assets: { sheets: charSheets("hero"), atlas: "enemies/living_clock" } },
    // Lote 12 (ADR-049): veloz dos andares 11–15 (Pináculo Arcano) — atlas próprio.
    { id: "arcane_wisp", name: "Fogo-Fátuo Arcano", role: "swift", damageType: "magic", statMultiplier: 1.05,
      attributes: attrs(8, 36, 12, 22, 12),
      assets: { sheets: charSheets("slime"), atlas: "enemies/arcane_wisp" } },
    // --- caster -------------------------------------------------------
    { id: "toxicbat", name: "Morcego Tóxico", role: "caster", damageType: "magic", statMultiplier: 1.1,
      attributes: attrs(6, 24, 12, 28, 14),
      assets: { sheets: charSheets("toxicbat") } },
    // ADR-033/Lote 1: o primeiro inimigo com atlas próprio (`ita-atlas-v1`). Mago do andar 1–2:
    // multiplicador baixo (o andar 1 não pode punir quem ainda não tem equipamento).
    { id: "spark_imp", name: "Duende de Faíscas", role: "caster", damageType: "magic", statMultiplier: 0.78,
      attributes: attrs(6, 20, 10, 26, 12),
      assets: { sheets: charSheets("mage"), atlas: "enemies/spark_imp" } },
    // Lote 3: mago do andar 3 (multiplicador baixo: ainda é o começo da Torre).
    { id: "candle_skull", name: "Crânio Necrovela", role: "caster", damageType: "magic", statMultiplier: 0.9,
      attributes: attrs(6, 16, 10, 28, 16),
      assets: { sheets: charSheets("bat"), atlas: "enemies/candle_skull" } },
    // Lote 4: mago do andar 4 — o Sacerdote das Catacumbas (cajado de ankh).
    { id: "mummy_priest", name: "Sacerdote Mumificado", role: "caster", damageType: "magic", statMultiplier: 0.92,
      attributes: attrs(6, 14, 14, 28, 18),
      assets: { sheets: charSheets("mage"), atlas: "enemies/mummy_priest" } },
    // Lote 8 (ADR-044): mago do andar 5 (Salão dos Ecos) — atlas próprio.
    { id: "echo_singer", name: "Cantor de Ecos", role: "caster", damageType: "magic", statMultiplier: 0.88,
      attributes: attrs(6, 18, 12, 30, 16),
      assets: { sheets: charSheets("mage"), atlas: "enemies/echo_singer" } },
    // Lote 9 (ADR-045): mago do andar 7 (Jardim Gélido) — atlas próprio.
    { id: "frost_witch", name: "Feiticeira da Geada", role: "caster", damageType: "magic", statMultiplier: 0.88,
      attributes: attrs(6, 18, 12, 32, 14),
      assets: { sheets: charSheets("mage"), atlas: "enemies/frost_witch" } },
    // Lote 10: mago do andar 8 (Ninho das Sombras) — atlas próprio.
    { id: "nightmare_weaver", name: "Tecelã de Pesadelos", role: "caster", damageType: "magic", statMultiplier: 0.9,
      attributes: attrs(6, 16, 14, 32, 16),
      assets: { sheets: charSheets("mage"), atlas: "enemies/nightmare_weaver" } },
    // Lote 10: mago do andar 9 (Corredor Sangrento) — atlas próprio.
    { id: "blood_witch", name: "Bruxa de Sangue", role: "caster", damageType: "magic", statMultiplier: 0.9,
      attributes: attrs(6, 16, 14, 32, 18),
      assets: { sheets: charSheets("mage"), atlas: "enemies/blood_witch" } },
    // Lote 11: mago do andar 10 (Câmara dos Mil Passos) — atlas próprio.
    { id: "steps_oracle", name: "Oráculo dos Passos", role: "caster", damageType: "magic", statMultiplier: 0.9,
      attributes: attrs(6, 16, 14, 32, 18),
      assets: { sheets: charSheets("mage"), atlas: "enemies/steps_oracle" } },
    // Lote 12 (ADR-049): mago dos andares 11–15 (Pináculo Arcano) — atlas próprio.
    { id: "astral_sorcerer", name: "Feiticeiro Astral", role: "caster", damageType: "magic", statMultiplier: 0.9,
      attributes: attrs(6, 16, 12, 34, 18),
      assets: { sheets: charSheets("mage"), atlas: "enemies/astral_sorcerer" } },
    { id: "fireorc", name: "Orc Flamejante", role: "caster", damageType: "magic", statMultiplier: 0.88,
      attributes: attrs(10, 8, 22, 32, 12),
      assets: { sheets: charSheets("fireorc") } },
    // --- (legado) balanced — o Esqueleto virou "dps" no Lote 3 (§3.1: o papel balanced deixa de ser slot) ---
    { id: "skeleton", name: "Esqueleto", role: "dps", damageType: "physical", statMultiplier: 0.97,
      attributes: attrs(24, 14, 24, 8, 14),
      assets: { portrait: "portraits/skeleton", sheets: charSheets("skeleton") } },
    // --- elite (raros; multiplicador de força) --------------------------
    // Lote 2: Elite RARO do andar 1 (fecha os 5 papéis do andar).
    { id: "goblin_captain", name: "Goblin Capitão", role: "elite", damageType: "physical", statMultiplier: 1.2,
      attributes: attrs(30, 22, 22, 8, 12),
      assets: { sheets: charSheets("orc"), atlas: "enemies/goblin_captain" } },
    // Lote 3: elites RAROS dos andares 2 e 3.
    { id: "sewer_troll", name: "Troll do Esgoto", role: "elite", damageType: "physical", statMultiplier: 1.1,
      attributes: attrs(32, 12, 30, 6, 10),
      assets: { sheets: charSheets("orc"), atlas: "enemies/sewer_troll" } },
    { id: "bone_knight", name: "Cavaleiro de Ossos", role: "elite", damageType: "physical", statMultiplier: 1.14,
      attributes: attrs(27, 20, 26, 6, 14),
      assets: { sheets: charSheets("skeleton"), atlas: "enemies/bone_knight" } },
    // Lote 4: elite RARO do andar 4.
    { id: "royal_mummy", name: "Múmia Real", role: "elite", damageType: "physical", statMultiplier: 1.18,
      attributes: attrs(30, 14, 28, 10, 16),
      assets: { sheets: charSheets("skeleton"), atlas: "enemies/royal_mummy" } },
    // Lote 8 (ADR-044): elite RARO do andar 5 (Salão dos Ecos).
    { id: "void_maestro", name: "Maestro do Vazio", role: "elite", damageType: "magic", statMultiplier: 1.08,
      attributes: attrs(18, 14, 26, 28, 18),
      assets: { sheets: charSheets("orc"), atlas: "enemies/void_maestro" } },
    // Lote 8 (ADR-044): elite RARO do andar 6 (Fornalha Esquecida).
    { id: "forge_master", name: "Mestre da Forja", role: "elite", damageType: "physical", statMultiplier: 1.08,
      attributes: attrs(34, 12, 32, 6, 12),
      assets: { sheets: charSheets("orc"), atlas: "enemies/forge_master" } },
    // Lote 9 (ADR-045): elite RARO do andar 7 (Jardim Gélido).
    { id: "winter_knight", name: "Cavaleiro do Inverno", role: "elite", damageType: "physical", statMultiplier: 1.08,
      attributes: attrs(34, 14, 30, 6, 14),
      assets: { sheets: charSheets("orc"), atlas: "enemies/winter_knight" } },
    // Lote 10: elite RARO do andar 9 (Corredor Sangrento).
    { id: "crimson_count", name: "Conde Carmesim", role: "elite", damageType: "magic", statMultiplier: 1.08,
      attributes: attrs(24, 22, 28, 26, 18),
      assets: { sheets: charSheets("orc"), atlas: "enemies/crimson_count" } },
    // Lote 12 (ADR-049): elite RARO dos andares 11–15 (Pináculo Arcano).
    { id: "rift_stalker", name: "Rastreador da Fenda", role: "elite", damageType: "magic", statMultiplier: 1.1,
      attributes: attrs(26, 26, 26, 14, 12),
      assets: { sheets: charSheets("orc"), atlas: "enemies/rift_stalker" } },
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
