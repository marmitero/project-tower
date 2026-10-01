import type { GameConfig } from "./types.js";
import { RARITY_ORDER } from "./rarity.js";
import { config } from "./game.js";

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
  check(
    cfg.loot.x.min >= 1,
    "loot.x.min deve ser >= 1",
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

  if (errors.length > 0) throw new ConfigValidationError(errors);
  return cfg;
}

