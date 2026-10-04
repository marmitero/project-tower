/**
 * Torre como CONTEÚDO (ADR-021/022): faixas de andar decididas pelo usuário,
 * variedade de papéis por andar e o contrato ContentPack (export → JSON → apply).
 */
import { afterEach, describe, expect, it } from "vitest";
import {
  ENEMY_ROLES,
  FIRST_FLOOR_BANDS,
  LEVEL_CAP,
  applyContentPack,
  config,
  defaultContentPack,
  enemies,
  evalCurve,
  exportContentPack,
  resetContentToDefaults,
  validateConfig,
  validateContentPack,
  type ContentPack,
} from "../index.js";

afterEach(() => resetContentToDefaults());

const floors = () => config.tower.floors;
const roleOf = (id: string) => enemies.find((e) => e.id === id)!.role;

describe("andares — regra do usuário (2026-10-03)", () => {
  it("os 10 primeiros andares têm exatamente as faixas pedidas", () => {
    const got = floors().slice(0, 10).map((f) => [f.minLevel, f.maxLevel]);
    expect(got).toEqual([
      [1, 10], [10, 25], [25, 50], [50, 100], [100, 250],
      [250, 500], [500, 1000], [1000, 1500], [1500, 2500], [2500, 5000],
    ]);
    expect(FIRST_FLOOR_BANDS).toHaveLength(10);
  });

  it("a partir do andar 11 há 1 andar por 500 níveis, até o teto de 20.000", () => {
    const rest = floors().slice(10);
    expect(floors()).toHaveLength(40);
    rest.forEach((f, i) => {
      expect(f.index).toBe(11 + i);
      expect(f.minLevel).toBe(5000 + i * 500);
      expect(f.maxLevel).toBe(5500 + i * 500);
    });
    expect(floors()[10]!.minLevel).toBe(5000); // andar 11: 5000–5500
    expect(floors()[11]!.minLevel).toBe(5500); // andar 12: 5500–6000
    expect(floors()[12]!.minLevel).toBe(6000); // andar 13: 6000–6500
    expect(floors().at(-1)!.maxLevel).toBe(LEVEL_CAP);
  });

  it("nível dos inimigos = nível-base do andar (andar 10 → 2.500; andar 12 → 5.500)", () => {
    for (const f of floors()) expect(f.enemyLevel, `andar ${f.index}`).toBe(f.minLevel);
    expect(floors()[9]!.enemyLevel).toBe(2500);
    expect(floors()[11]!.enemyLevel).toBe(5500);
  });

  it("o Rei precisa do nível-base do andar (§46)", () => {
    for (const f of floors()) expect(f.requiredKingLevel).toBe(f.minLevel);
  });

  it("teto 20.000 para Rei e heróis", () => {
    expect(config.xp.king.levelCap).toBe(20_000);
    expect(config.xp.hero.levelCap).toBe(20_000);
  });

  it("nenhum andar tem boss: pool só de inimigos comuns da Torre (§21/§55)", () => {
    for (const f of floors()) {
      for (const p of f.pool) expect(p.enemyId).not.toMatch(/boss|slimeking/);
    }
  });
});

describe("variedade de inimigos por andar", () => {
  it("todo andar tem tanque, dano e veloz; mago a partir do 3; elite a partir do 9 (exceto os raros dos andares 1–4)", () => {
    for (const f of floors()) {
      const roles = new Set(f.pool.map((p) => roleOf(p.enemyId)));
      expect(roles.has("tank"), `andar ${f.index} tank`).toBe(true);
      expect(roles.has("dps"), `andar ${f.index} dps`).toBe(true);
      expect(roles.has("swift"), `andar ${f.index} swift`).toBe(true);
      if (f.index >= 3) expect(roles.has("caster"), `andar ${f.index} caster`).toBe(true);
      if (f.index >= 9) expect(roles.has("elite"), `andar ${f.index} elite`).toBe(true);
      // Exceção de design (§3.1): os andares 1–4 têm um elite RARO (Capitão, Troll, Cavaleiro, Múmia Real). Andares 5–8 não têm elite
      // até os próximos lotes.
      if (f.index >= 5 && f.index < 9) expect(roles.has("elite"), `andar ${f.index} sem elite`).toBe(false);
    }
  });

  it("o roster usa todos os papéis e só sprites existentes (25 inimigos)", () => {
    expect(enemies).toHaveLength(25);
    // `balanced` é papel legado: o Esqueleto virou "dps" (§3.1); o tipo continua válido para packs editados.
    expect(new Set(enemies.map((e) => e.role))).toEqual(new Set(ENEMY_ROLES.filter((r) => r !== "balanced")));
  });

  it("elites são raros: ≤ 12% do pool de qualquer andar", () => {
    for (const f of floors()) {
      const total = f.pool.reduce((s, p) => s + p.weight, 0);
      const elite = f.pool.filter((p) => roleOf(p.enemyId) === "elite").reduce((s, p) => s + p.weight, 0);
      expect(elite / total, `andar ${f.index}`).toBeLessThanOrEqual(0.12);
    }
  });

  it("magos causam dano mágico e a Gosma Gélida resiste a magia", () => {
    for (const e of enemies.filter((x) => x.role === "caster")) expect(e.damageType).toBe("magic");
    const frost = enemies.find((e) => e.id === "frostslime")!;
    expect(frost.growth.specialDefense).toBeGreaterThan(frost.growth.defense);
  });
});

describe("curva de XP desacelera com o nível (P-009)", () => {
  it("o custo por nível é estritamente crescente do 1 ao 19.999", () => {
    let prev = -1;
    for (let lv = 1; lv < LEVEL_CAP; lv += 1) {
      const need = evalCurve(config.xp.king.curve, lv);
      expect(need, `nível ${lv}`).toBeGreaterThan(prev);
      prev = need;
    }
  });

  it("a configuração padrão é válida", () => {
    expect(() => validateConfig()).not.toThrow();
  });
});

describe("ContentPack (ADR-022)", () => {
  it("o pack padrão é válido e exportar o estado vivo devolve o mesmo conteúdo", () => {
    expect(validateContentPack(defaultContentPack())).toEqual([]);
    const live = exportContentPack("padrão");
    expect(live).toEqual(defaultContentPack());
  });

  it("round-trip: export → JSON → apply preserva tudo (nenhuma função no pack)", () => {
    const json = JSON.stringify(exportContentPack());
    expect(json).not.toMatch(/undefined|function/);
    const before = JSON.stringify(exportContentPack());
    applyContentPack(JSON.parse(json));
    expect(JSON.stringify(exportContentPack())).toBe(before);
  });

  it("o pack não carrega campos derivados (growth) — o editor mexe só nos dados-fonte", () => {
    for (const e of exportContentPack().enemies) expect("growth" in e).toBe(false);
  });

  it("editar o pack muda o jogo SEM código: inimigo novo, andar editado, XP editado", () => {
    const pack = exportContentPack("editado") as ContentPack;
    const slime = pack.enemies.find((e) => e.id === "slime")!;
    pack.enemies.push({ ...structuredClone(slime), id: "slime_rei", name: "Gosma Real", statMultiplier: 3 });
    pack.tower.floors[0]!.name = "Hall Editado";
    pack.tower.floors[0]!.pool = [{ enemyId: "slime_rei", weight: 1 }];
    pack.tower.floors[0]!.enemyLevel = 7;
    pack.progression.king.curve.base = 40;

    applyContentPack(pack);

    expect(enemies.some((e) => e.id === "slime_rei")).toBe(true);
    expect(enemies.find((e) => e.id === "slime_rei")!.growth.hp).toBeGreaterThan(
      enemies.find((e) => e.id === "slime")!.growth.hp * 2,
    );
    expect(config.tower.floors[0]!.name).toBe("Hall Editado");
    const c = config.xp.king.curve;
    expect(c.base).toBe(40);
    expect(evalCurve(c, 10)).toBe(Math.floor(40 * Math.pow(10 + (c.offset ?? 0), c.exponent)));
    expect(() => validateConfig()).not.toThrow();
  });

  it("adicionar e remover andares é só editar a lista", () => {
    const pack = exportContentPack() as ContentPack;
    const extra = structuredClone(pack.tower.floors.at(-1)!);
    extra.index = 41;
    extra.name = "Andar Extra";
    pack.tower.floors.push(extra);
    applyContentPack(pack);
    expect(config.tower.floors).toHaveLength(41);
    pack.tower.floors.pop();
    pack.tower.floors.pop();
    applyContentPack(pack);
    expect(config.tower.floors).toHaveLength(39);
  });

  it("mantém as mesmas referências vivas (imports antigos continuam válidos)", () => {
    const enemiesRef = enemies;
    const floorsRef = config.tower.floors;
    const pack = exportContentPack() as ContentPack;
    pack.enemies.pop();
    pack.tower.floors.forEach((f) => (f.pool = f.pool.filter((p) => p.enemyId !== "shadowgoblin")));
    applyContentPack(pack);
    expect(enemies).toBe(enemiesRef);
    expect(config.tower.floors).toBe(floorsRef);
  });

  const broken: Array<[string, (p: ContentPack) => void, RegExp]> = [
    ["inimigo desconhecido no pool", (p) => (p.tower.floors[0]!.pool[0]!.enemyId = "fantasma"), /desconhecido/],
    ["id de inimigo duplicado", (p) => p.enemies.push(structuredClone(p.enemies[0]!)), /duplicado/],
    ["índice de andar não contíguo", (p) => (p.tower.floors[3]!.index = 9), /contíguo/],
    ["pool vazio", (p) => (p.tower.floors[2]!.pool = []), /pool vazio/],
    ["peso zero", (p) => (p.tower.floors[1]!.pool[0]!.weight = 0), /peso/],
    ["faixa invertida", (p) => (p.tower.floors[4]!.maxLevel = 1), /maxLevel/],
    ["curva inválida", (p) => (p.progression.king.curve.base = -5), /base/],
    ["papel inválido", (p) => ((p.enemies[0] as { role: string }).role = "boss"), /role/],
    ["requisito acima do teto", (p) => (p.tower.floors[5]!.requiredKingLevel = 999_999), /teto/],
    ["sprite ausente", (p) => delete (p.enemies[0]!.assets.sheets as unknown as Record<string, string>).idle, /sprite/],
  ];
  it.each(broken)("rejeita pack inválido: %s", (_n, mutate, re) => {
    const pack = exportContentPack() as ContentPack;
    mutate(pack);
    const errors = validateContentPack(pack);
    expect(errors.join("\n")).toMatch(re);
    expect(() => applyContentPack(pack)).toThrow();
  });

  it("aplicar pack inválido é atômico: o jogo não muda", () => {
    const before = JSON.stringify(exportContentPack());
    const pack = exportContentPack() as ContentPack;
    pack.tower.floors[0]!.name = "NÃO DEVE APARECER";
    pack.tower.floors[1]!.pool[0]!.enemyId = "fantasma";
    expect(() => applyContentPack(pack)).toThrow();
    expect(JSON.stringify(exportContentPack())).toBe(before);
  });

  it("lixo cru (JSON de fora) nunca derruba a validação", () => {
    for (const junk of [null, 42, "x", [], {}, { schemaVersion: 1 }, { schemaVersion: 1, enemies: [{}], tower: {}, progression: {} }]) {
      expect(() => validateContentPack(junk)).not.toThrow();
      expect(validateContentPack(junk).length).toBeGreaterThan(0);
    }
  });
});

describe("Market, Bot e offline como CONTEÚDO (ADR-025/026)", () => {
  it("o catálogo padrão valida e traz o que o usuário pediu", () => {
    expect(validateContentPack(defaultContentPack())).toEqual([]);
    const ids = config.market.items.map((i) => i.id);
    for (const id of ["potion_basic", "potion_modest", "potion_improved", "potion_rare", "potion_epic", "potion_legendary", "potion_magic", "potion_magic_rare", "potion_magic_supreme", "revive_basic", "revive_improved", "revive_magic", "box_basic", "box_rare", "box_legendary"]) {
      expect(ids).toContain(id);
    }
    expect(config.market.tabs.map((t) => t.id).length).toBe(3);
  });

  it("curas fixas e % do pedido", () => {
    const eff = (id: string) => (config.market.items.find((i) => i.id === id) as { effect: { kind: string; amount?: number; pct?: number } }).effect;
    expect(eff("potion_basic")).toEqual({ kind: "healFlat", amount: 60 });
    expect(eff("potion_legendary")).toEqual({ kind: "healFlat", amount: 2500 });
    expect(eff("potion_magic")).toEqual({ kind: "healPct", pct: 0.3 });
    expect(eff("potion_magic_supreme")).toEqual({ kind: "healPct", pct: 1 });
    expect(eff("revive_basic")).toEqual({ kind: "revivePct", pct: 0.3 });
    expect(eff("revive_magic")).toEqual({ kind: "revivePct", pct: 1 });
  });

  it("caixas: chances baixas, exigem Rei forte e herói completo é raro", () => {
    for (const box of config.market.items.filter((i) => i.kind === "box")) {
      if (box.kind !== "box") continue;
      const total = box.outcomes.reduce((s, o) => s + o.weight, 0);
      const heroChance = box.outcomes.filter((o) => o.kind === "hero").reduce((s, o) => s + o.weight, 0) / total;
      expect(heroChance).toBeLessThan(0.1);
      expect(box.requiredKingLevel).toBeGreaterThanOrEqual(250);
    }
  });

  it("offline: 2 h Free e 8 h VIP; padrões do Bot vêm da config", () => {
    expect(config.offline.capFreeMs).toBe(2 * 3_600_000);
    expect(config.offline.capVipMs).toBe(8 * 3_600_000);
    expect(config.bot.defaults.autoReturnFromHub).toBe(true);
  });

  it("pack inválido do Market é reportado com o caminho e não altera nada", () => {
    const pack = JSON.parse(JSON.stringify(defaultContentPack())) as ContentPack;
    pack.market.items[0]!.price = { kind: "fixed", coins: -5 };
    pack.bot.defaults.autoPotion.itemId = "nao_existe";
    const errors = validateContentPack(pack);
    expect(errors.length).toBeGreaterThanOrEqual(2);
    const before = config.market.items.length;
    expect(() => applyContentPack(pack)).toThrow();
    expect(config.market.items.length).toBe(before);
  });
});
