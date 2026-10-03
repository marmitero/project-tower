import type { GameConfig } from "./types.js";
import { RARITY_ORDER } from "./rarity.js";
import { config } from "./game.js";
import {
  CHARACTER_SHEET_KEYS,
  EQUIPABLE_STATS,
  STARTER_HERO_CLASSES,
  classes,
  type CharacterAssets,
} from "./catalog.js";
import { enemies, ENEMY_ROLES } from "./enemies.js";
import { curveErrors } from "./curves.js";
import { skills, skillsById } from "./skills.js";
import { EXTRA_HEROES, HERO_ROSTER, HEROES, RESERVED_HEROES } from "./heroes.js";
import { equipmentErrors } from "./equipment.js";
import { heroAcquisitionErrors } from "./acquisition.js";
import { botErrors, marketErrors, offlineErrors } from "./market.js";
import {
  ATTRIBUTE_IDS,
  growthFromAttributes,
  type CharacterAttributes,
  type DerivedGrowth,
} from "./attributes.js";

export class ConfigValidationError extends Error {
  readonly errors: string[];
  constructor(errors: string[]) {
    super(`Configuração inválida:\n  - ${errors.join("\n  - ")}`);
    this.name = "ConfigValidationError";
    this.errors = errors;
  }
}

/**
 * Valida a configuração e falha ALTO.
 *
 * Roda no boot do jogo (desenvolvimento e produção). Uma config inválida
 * é um erro de programação, não um estado de runtime: ela nunca deve chegar
 * perto de um jogador, porque a alternativa é um loot com 102% de chance
 * e um mercado com 18% de taxa em vez de 15%.
 */
export function validateConfig(cfg: GameConfig = config): GameConfig {
  const errors: string[] = [];
  const check = (ok: boolean, message: string) => {
    if (!ok) errors.push(message);
  };

  // --- Probabilidades -------------------------------------------------------
  const raritySum = RARITY_ORDER.reduce((acc, r) => acc + cfg.loot.rarity[r], 0);
  check(
    Math.abs(raritySum - 1) < 1e-6,
    `loot.rarity soma ${raritySum.toFixed(6)}, esperado 1.0`,
  );
  check(
    cfg.loot.equipmentChance >= 0 && cfg.loot.equipmentChance <= 1,
    `loot.equipmentChance fora de [0,1]: ${cfg.loot.equipmentChance}`,
  );
  check(
    cfg.economy.market.taxRate >= 0 && cfg.economy.market.taxRate <= 1,
    `economy.market.taxRate fora de [0,1]: ${cfg.economy.market.taxRate}`,
  );

  // --- XP (§20, §81) --------------------------------------------------------
  // teamSplit[N] é a PARcela de CADA herói quando o time tem N membros —
  // não é cumulativo entre tamanhos. O que não pode passar de 1.0 é o TOTAL
  // distribuído em cada tamanho: teamSplit[N] × N.
  for (const size of [1, 2, 3] as const) {
    const share = cfg.xp.teamSplit[size];
    const totalDistributed = share * size;
    check(
      share > 0 && share <= 1,
      `xp.teamSplit[${size}] invalido: ${share} (deve estar em (0,1])`,
    );
    check(
      totalDistributed <= 1 + 1e-9,
      `xp.teamSplit[${size}] × ${size} = ${totalDistributed.toFixed(4)}, `
        + `distribuiria mais XP do que a recompensa`,
    );
  }
  // §20 — "maior é a flexibilidade, porém menor é a velocidade individual".
  // Uma divisão crescente violaria a regra.
  check(
    cfg.xp.teamSplit[1] >= cfg.xp.teamSplit[2] &&
      cfg.xp.teamSplit[2] >= cfg.xp.teamSplit[3],
    "xp.teamSplit deve ser monótona decrescente (§20: mais heróis => menos XP individual)",
  );
  check(cfg.xp.separatePools, "xp.separatePools deve ser true (§45: nunca misturar)");

  // --- Equipe (§15, §16, §46) ----------------------------------------------
  check(cfg.team.maxSize === 3, `team.maxSize deve ser 3 (§16), recebido ${cfg.team.maxSize}`);
  check(
    cfg.team.slots.length === cfg.team.maxSize,
    `team.slots tem ${cfg.team.slots.length} entradas, esperado ${cfg.team.maxSize}`,
  );
  for (let i = 0; i < cfg.team.slots.length; i += 1) {
    const slot = cfg.team.slots[i]!;
    check(slot.index === i, `team.slots[${i}].index é ${slot.index}`);
    check(slot.kingLevel >= 1, `team.slots[${i}].kingLevel deve ser >= 1`);
    check(slot.costCoin >= 0, `team.slots[${i}].costCoin não pode ser negativo`);
  }
  for (let i = 1; i < cfg.team.slots.length; i += 1) {
    check(
      cfg.team.slots[i]!.kingLevel > cfg.team.slots[i - 1]!.kingLevel,
      "team.slots[].kingLevel deve ser estritamente crescente",
    );
  }
  // §15/§46 — desbloqueio exige nível mínimo E Coin. O slot 2 e o 3 precisam
  // cobrar Coin; um slot pago apenas com nível violaria a regra.
  check(
    cfg.team.slots[0]!.costCoin === 0,
    "team.slots[0] (inicial) não pode cobrar Coin",
  );
  for (let i = 1; i < cfg.team.slots.length; i += 1) {
    check(
      cfg.team.slots[i]!.costCoin > 0,
      `team.slots[${i}] deve ter custo em Coin (§46: nível mínimo + Coin)`,
    );
  }

  // --- Combate (§17, §21, §24, §55) ---------------------------------------
  check(
    cfg.combat.towerBattleSize.allies === 1 && cfg.combat.towerBattleSize.enemies === 1,
    "combat.towerBattleSize deve ser 1x1 (§17: REGRA FUNDAMENTAL)",
  );
  check(
    cfg.combat.towerAutoBossFloors.length === 0,
    "combat.towerAutoBossFloors deve ser VAZIO (§21/§55: essa regra está ABOLIDA)",
  );
  check(
    cfg.combat.critCap > 0 && cfg.combat.critCap < 1,
    `combat.critCap deve estar em (0,1), recebido ${cfg.combat.critCap}`,
  );
  check(
    cfg.combat.critMultiplier > 1,
    "combat.critMultiplier deve ser > 1",
  );
  check(
    cfg.combat.iasCapMin < 0 && cfg.combat.iasCapMax > 0,
    "combat.iasCap deve permitir build de velocidade e de lentidão",
  );
  check(
    cfg.combat.iasCapMin < cfg.combat.iasCapMax,
    "combat.iasCapMin deve ser menor que iasCapMax",
  );
  check(
    cfg.combat.defenseConstant > 0,
    "combat.defenseConstant deve ser positivo",
  );
  check(
    cfg.combat.minDamage >= 1,
    "combat.minDamage deve ser >= 1 (golpe que acertou causa no mínimo 1)",
  );

  // --- Loot (§12, §30, §32, §36) ------------------------------------------
  check(
    cfg.loot.x.min < cfg.loot.x.max,
    `loot.x.min (${cfg.loot.x.min}) deve ser menor que max (${cfg.loot.x.max})`,
  );
  check(cfg.loot.x.min > 0, "loot.x.min deve ser > 0 (X zero anularia o atributo)");
  check(
    Number.isInteger(cfg.loot.x.decimals) && cfg.loot.x.decimals >= 0 && cfg.loot.x.decimals <= 4,
    "loot.x.decimals deve ser inteiro em [0, 4]",
  );
  check(
    Number.isInteger(cfg.loot.x.shape.samples) && cfg.loot.x.shape.samples >= 1 && cfg.loot.x.shape.power > 0,
    "loot.x.shape inválido (samples inteiro >= 1, power > 0)",
  );
  check(
    cfg.loot.x.independentPerAttribute,
    "loot.x.independentPerAttribute deve ser true (§36)",
  );
  check(
    cfg.loot.fragmentsFromCommonTower === false,
    "loot.fragmentsFromCommonTower deve ser FALSE (§12: PROIBIDO dropar de inimigo comum)",
  );
  check(
    cfg.loot.equipmentChance <= 0.5,
    "loot.equipmentChance acima de 50% descaracteriza equipamento como recurso de valor (§30)",
  );

  // --- Procurando (§27, §29) ----------------------------------------------
  check(
    cfg.searching.minMs > 0 && cfg.searching.maxMs >= cfg.searching.minMs,
    "searching.minMs/maxMs invalidos",
  );
  const searchAvg = (cfg.searching.minMs + cfg.searching.maxMs) / 2;
  check(
    searchAvg >= 2_000 && searchAvg <= 4_000,
    `média do searching fora de 2-4s: ${searchAvg}ms (§27 pede ~3s)`,
  );
  check(
    cfg.searching.pausesOnNavigation === false,
    "searching.pausesOnNavigation deve ser false (§29: a busca não deve quebrar o fluxo)",
  );
  check(
    cfg.searching.usesAbsoluteTimestamp,
    "searching.usesAbsoluteTimestamp deve ser true (ADR-007)",
  );

  // --- Economia (§39, §41) -------------------------------------------------
  check(
    cfg.economy.market.taxDestination === "sink",
    "economy.market.taxDestination deve ser 'sink' (§41: consumida pelo servidor)",
  );
  check(
    Math.abs(cfg.economy.market.taxRate - 0.15) < 1e-9,
    `economy.market.taxRate é ${cfg.economy.market.taxRate}, §41 fixa 15%`,
  );
  check(
    cfg.economy.equipment.sellEnabled,
    "economy.equipment.sellEnabled deve ser true (§39)",
  );
  check(
    cfg.economy.market.minPrice <= cfg.economy.market.maxPrice,
    "economy.market.minPrice deve ser <= maxPrice",
  );

  // --- Conta (§8) ----------------------------------------------------------
  check(
    cfg.account.kingPerAccount === 1,
    "account.kingPerAccount deve ser 1 (§8)",
  );
  check(
    cfg.account.nickname.minLength > 0 &&
      cfg.account.nickname.maxLength >= cfg.account.nickname.minLength,
    "account.nickname com limites invalidos",
  );
  const skinIds = cfg.account.king.skins.map((s) => s.id);
  check(
    new Set(skinIds).size === skinIds.length,
    "account.king.skins tem IDs duplicados",
  );
  check(
    cfg.account.king.skins.length > 0,
    "account.king.skins não pode ser vazio (§5: criação permite escolher uma skin)",
  );
  check(
    cfg.account.king.skins.filter((s) => s.unlock.kind === "default").length > 0,
    "deve existir ao menos uma skin disponível por padrão",
  );
  check(
    cfg.account.king.portraitAssetId.length > 0,
    "account.king.portraitAssetId não pode ser vazio",
  );
  check(
    cfg.account.king.skins.every((s) => s.assetId.length > 0),
    "account.king.skins[].assetId não pode ser vazio",
  );

  // --- Inventário (§13) ----------------------------------------------------
  check(
    cfg.inventory.heroLimit === null,
    "inventory.heroLimit deve ser null (§13: heróis ilimitados, sem limite artificial)",
  );
  check(cfg.inventory.equipmentMaxItems > 0, "inventory.equipmentMaxItems deve ser > 0");
  check(cfg.inventory.pageSize > 0, "inventory.pageSize deve ser > 0");
  check(
    cfg.inventory.onFull === "autoSell" || cfg.inventory.onFull === "discard",
    "inventory.onFull deve ser 'autoSell' ou 'discard'",
  );

  // --- Equipamento (ADR-023) e aquisição de heróis (ADR-024) ---------------
  errors.push(...equipmentErrors(cfg.equipment));
  errors.push(...heroAcquisitionErrors(cfg.heroAcquisition));
  errors.push(...marketErrors(cfg.market));
  errors.push(...botErrors(cfg.bot, cfg.market));
  errors.push(...offlineErrors(cfg.offline));

  errors.push(...collectCatalogErrors());

  if (errors.length > 0) throw new ConfigValidationError(errors);
  return cfg;
}

/**
 * Valida o catálogo (heróis, inimigos, assets).
 *
 * As verificações de EXISTÊNCIA dos assets no manifesto ficam em
 * `tests/integration/assets-config.test.ts` — aqui se valida a forma dos
 * dados. Juntas, as duas garantem que remodelar o catálogo não produz um
 * herói sem sprite (§62) nem um clone disfarçado de herói novo (§10).
 */
export function validateCatalog(): void {
  const errors = collectCatalogErrors();
  if (errors.length > 0) throw new ConfigValidationError(errors);
}

/** O growth armazenado é exatamente o derivado dos atributos? */
function sameGrowth(attrs: CharacterAttributes, growth: ClassGrowthLike): boolean {
  const derived = growthFromAttributes(attrs);
  return (Object.keys(derived) as (keyof DerivedGrowth)[]).every(
    (k) => Math.abs(derived[k] - growth[k]) < 1e-9,
  );
}

type ClassGrowthLike = DerivedGrowth;

function collectCatalogErrors(): string[] {
  const errors: string[] = [];
  const check = (ok: boolean, message: string) => {
    if (!ok) errors.push(message);
  };

  const checkAssets = (label: string, assets: CharacterAssets, requirePortrait: boolean) => {
    for (const key of CHARACTER_SHEET_KEYS) {
      check(
        assets.sheets[key].length > 0,
        `${label}.assets.sheets.${key} não pode ser vazio`,
      );
    }
    if (requirePortrait) {
      check(
        (assets.portrait ?? "").length > 0,
        `${label}.assets.portrait não pode ser vazio`,
      );
    }
  };

  // --- Heróis (§10 — 4 heróis, diferenças reais) ---------------------------
  check(
    classes.length === 4,
    `classes deve ter exatamente 4 heróis iniciais (§10), tem ${classes.length}`,
  );
  const classIds = new Set(classes.map((c) => c.id));
  check(classIds.size === classes.length, "classes[].id duplicado");
  check(
    STARTER_HERO_CLASSES.length === classes.length,
    "STARTER_HERO_CLASSES deve cobrir exatamente as classes do catálogo",
  );
  for (const id of STARTER_HERO_CLASSES) {
    check(classIds.has(id), `STARTER_HERO_CLASSES referencia classe inexistente: ${id}`);
  }

  // §18 — a escolha de herói só é decisão se cobrir físico × mágico.
  const types = new Set(classes.map((c) => c.damageType));
  check(types.has("physical"), "classes precisa cobrir dano físico (§18)");
  check(types.has("magic"), "classes precisa cobrir dano mágico (§18)");

  // §10 — papéis distintos; "diferenças reais", não só sprite diferente.
  const roles = new Set(classes.map((c) => c.role));
  check(roles.size === classes.length, "classes[].role deve ser único por herói (§10)");

  const growths = new Set(classes.map((c) => JSON.stringify(c.growth)));
  check(
    growths.size === classes.length,
    "classes[].growth idêntico entre heróis (§10 — proibido serem mecanicamente iguais)",
  );

  for (const c of classes) {
    checkAssets(`classes.${c.id}`, c.assets, true);
    check(c.activeSkillId.length > 0, `classes.${c.id}.activeSkillId não pode ser vazio`);
    check(
      c.passiveSkillIds.length === 2,
      `classes.${c.id}.passiveSkillIds deve ter 2 passivas (§22)`,
    );

    // Atributos (base OpenRpg) — a identidade que deriva o growth.
    for (const attr of ATTRIBUTE_IDS) {
      const value = c.attributes[attr];
      check(
        Number.isFinite(value) && value > 0,
        `classes.${c.id}.attributes.${attr} deve ser > 0 (recebeu ${String(value)})`,
      );
    }
    check(
      sameGrowth(c.attributes, c.growth),
      `classes.${c.id}.growth não bate com growthFromAttributes(attributes) — derive, não escreva à mão`,
    );
    check(
      c.growth.critChance <= 0.75,
      `classes.${c.id}.growth.critChance acima do teto do engine (critCap 0.75)`,
    );

    // Skills referenciadas existem e pertencem à classe (§22).
    const active = skillsById[c.activeSkillId];
    check(!!active, `classes.${c.id}.activeSkillId não existe no catálogo de skills: ${c.activeSkillId}`);
    check(active?.kind === "active", `classes.${c.id}.activeSkillId deve apontar para skill ativa`);
    check(active?.classId === c.id, `classes.${c.id}.activeSkillId pertence a outra classe`);
    for (const pid of c.passiveSkillIds) {
      const passive = skillsById[pid];
      check(!!passive, `classes.${c.id}.passiveSkillIds não existe no catálogo: ${pid}`);
      check(passive?.kind === "passive", `classes.${c.id}: ${pid} deve ser passiva`);
      check(passive?.classId === c.id, `classes.${c.id}: ${pid} pertence a outra classe`);
    }
  }

  // --- Identidades dos heróis (P-002 — decidida 2026-10-01) ----------------
  check(HEROES.length === 4, `HEROES deve ter 4 identidades (P-002), tem ${HEROES.length}`);
  check(new Set(HEROES.map((h) => h.id)).size === HEROES.length, "HEROES[].id duplicado");
  check(
    new Set(HEROES.map((h) => h.name.toLocaleLowerCase("pt-BR"))).size === HEROES.length,
    "HEROES[].name duplicado (§6 — nomes distintos)",
  );
  check(
    new Set(HEROES.map((h) => h.classId)).size === HEROES.length,
    "HEROES[].classId duplicado (MVP: 1 herói por classe)",
  );
  // Identidades adicionais (ADR-033): ids/nomes únicos no elenco, não-iniciais, delta de soma zero.
  check(new Set(HERO_ROSTER.map((h) => h.id)).size === HERO_ROSTER.length, "HERO_ROSTER[].id duplicado");
  check(
    new Set(HERO_ROSTER.map((h) => h.name.toLocaleLowerCase("pt-BR"))).size === HERO_ROSTER.length,
    "HERO_ROSTER[].name duplicado (§6 — nomes distintos)",
  );
  for (const h of EXTRA_HEROES) {
    check(classIds.has(h.classId), `EXTRA_HEROES.${h.id}.classId inexistente: ${h.classId}`);
    check(h.acquisition.origin !== "starter", `EXTRA_HEROES.${h.id} não pode ser inicial (§10: só os 4)`);
    check(h.lore.length >= 40 && h.epithet.length > 0 && h.combatStyle.length > 0, `EXTRA_HEROES.${h.id}: identidade sem substância`);
    const deltas = Object.values(h.attributeDelta ?? {});
    check(deltas.reduce((a, b) => a + b, 0) === 0, `EXTRA_HEROES.${h.id}.attributeDelta deve somar zero`);
    check(deltas.every((d) => Math.abs(d) <= 6), `EXTRA_HEROES.${h.id}.attributeDelta fora de ±6`);
    check(!!skillsById[h.signatureSkillId], `EXTRA_HEROES.${h.id}.signatureSkillId inexistente`);
    check(
      !/(inimigo comum|monstro comum|drop de inimigo)/i.test(h.acquisition.hint),
      `EXTRA_HEROES.${h.id}.acquisition.hint menciona fonte proibida (§12)`,
    );
  }
  // Reservados (ADR-035): ficam FORA do elenco, mas precisam ser válidos para a liberação futura.
  for (const h of RESERVED_HEROES) {
    check(classIds.has(h.classId), `RESERVED_HEROES.${h.id}.classId inexistente: ${h.classId}`);
    check(!HERO_ROSTER.some((r) => r.id === h.id || r.name.toLocaleLowerCase("pt-BR") === h.name.toLocaleLowerCase("pt-BR")), `RESERVED_HEROES.${h.id} repete id/nome do elenco`);
    check(h.lore.length >= 40 && h.epithet.length > 0, `RESERVED_HEROES.${h.id}: identidade sem substância`);
    check(!!skillsById[h.signatureSkillId], `RESERVED_HEROES.${h.id}.signatureSkillId inexistente`);
  }
  for (const h of HEROES) {
    check(classIds.has(h.classId), `HEROES.${h.id}.classId inexistente: ${h.classId}`);
    const cls = classes.find((c) => c.id === h.classId);
    check(
      cls?.activeSkillId === h.signatureSkillId,
      `HEROES.${h.id}.signatureSkillId deve casar com a skill ativa da classe (${cls?.activeSkillId ?? "—"})`,
    );
    check(h.epithet.length > 0, `HEROES.${h.id}.epithet não pode ser vazio`);
    check(h.lore.length >= 40, `HEROES.${h.id}.lore muito curto (identidade precisa ter substância)`);
    check(h.personality.length === 3, `HEROES.${h.id}.personality deve ter 3 traços`);
    check(h.voiceNotes.length > 0, `HEROES.${h.id}.voiceNotes não pode ser vazio`);
    check(RARITY_ORDER.includes(h.rarity), `HEROES.${h.id}.rarity inválida: ${h.rarity}`);
    check(h.combatStyle.length > 0, `HEROES.${h.id}.combatStyle não pode ser vazio`);
    check(new Set(h.statPriority).size === 3, `HEROES.${h.id}.statPriority deve ter 3 stats distintos`);
    for (const stat of h.statPriority) {
      check(EQUIPABLE_STATS.includes(stat), `HEROES.${h.id}.statPriority inválida: ${stat}`);
    }
    check(h.acquisition.hint.length > 0, `HEROES.${h.id}.acquisition.hint não pode ser vazio`);
    // §12 — fragmentos NUNCA de inimigos comuns da Torre.
    check(
      !/inimigos? comuns?/i.test(h.acquisition.hint),
      `HEROES.${h.id}.acquisition.hint menciona fonte proibida (§12)`,
    );
  }

  // --- Skills (§9, §25 — catálogo baseado no OpenRpg) ----------------------
  check(new Set(skills.map((s) => s.id)).size === skills.length, "skills[].id duplicado");
  for (const s of skills) {
    check(s.name.length > 0, `skills.${s.id}.name não pode ser vazio`);
    check(s.manaCost >= 0, `skills.${s.id}.manaCost não pode ser negativo`);
    if (s.kind === "active") {
      check(
        (s.coefficient ?? 0) > 0,
        `skills.${s.id} ativa precisa de coefficient > 0`,
      );
      check(s.cooldownMs > 0, `skills.${s.id} ativa precisa de cooldownMs > 0`);
    }
    if (s.damageType !== "none") {
      check((s.coefficient ?? 0) > 0, `skills.${s.id} com dano precisa de coefficient`);
    }
  }

  // --- Inimigos (P-006 — ADR-021) ------------------------------------------
  const enemyIds = new Set(enemies.map((e) => e.id));
  check(enemyIds.size === enemies.length, "enemies[].id duplicado");
  for (const e of enemies) {
    checkAssets(`enemies.${e.id}`, e.assets, false);
    check(ENEMY_ROLES.includes(e.role), `enemies.${e.id}: role inválido`);
    check(e.statMultiplier > 0, `enemies.${e.id}: statMultiplier deve ser > 0`);
    check(e.growth.hp > 0 && e.growth.hpPerLevel > 0, `enemies.${e.id}: growth sem vida`);
  }

  // --- XP / Torre (P-005/P-009 — ADR-021) ---------------------------------
  for (const who of ["king", "hero"] as const) {
    check(config.xp[who].levelCap >= 1, `xp.${who}.levelCap inválido`);
    errors.push(...curveErrors(`xp.${who}.curve`, config.xp[who].curve));
  }
  check(config.hud.ledgerWindowMs >= 10_000, "hud.ledgerWindowMs deve ser >= 10000");
  check(config.hud.ledgerWarmupMs >= 0 && config.hud.ledgerWarmupMs <= config.hud.ledgerWindowMs, "hud.ledgerWarmupMs deve estar em [0, ledgerWindowMs]");
  check(config.combat.defenseConstantPerLevel >= 0, "combat.defenseConstantPerLevel não pode ser negativo");
  check(
    config.combat.regenOnSearchingPctPerSec >= 0 && config.combat.regenOnSearchingPctPerSec <= 1,
    "combat.regenOnSearchingPctPerSec deve estar em [0,1]",
  );
  for (const k of ["enemyStatMultiplier", "enemyHpMultiplier", "enemyAttackMultiplier"] as const) {
    check(config.tower[k] > 0, `tower.${k} deve ser > 0`);
  }
  for (const k of ["kingXp", "heroXp", "coins"] as const) {
    errors.push(...curveErrors(`tower.rewards.${k}`, config.tower.rewards[k]));
  }
  const floors = config.tower.floors;
  check(floors.length > 0, "tower.floors não pode ser vazio");
  const cap = Math.max(config.xp.king.levelCap, config.xp.hero.levelCap);
  let prevMin = 0;
  for (const [i, f] of floors.entries()) {
    const at = `tower.floors[${i}]`;
    check(f.index === i + 1, `${at}.index deve ser ${i + 1} (contíguo)`);
    check(f.minLevel >= prevMin && f.maxLevel >= f.minLevel, `${at}: faixa de nível inválida`);
    prevMin = f.minLevel;
    check(f.enemyLevel >= 1, `${at}.enemyLevel inválido`);
    check(f.requiredKingLevel >= 1 && f.requiredKingLevel <= cap, `${at}.requiredKingLevel inválido`);
    check(f.pool.length > 0, `${at}.pool vazio`);
    for (const p of f.pool) {
      check(enemyIds.has(p.enemyId), `${at}: inimigo desconhecido "${p.enemyId}"`);
      check(p.weight > 0, `${at}: peso inválido (${p.enemyId})`);
    }
  }

  return errors;
}

