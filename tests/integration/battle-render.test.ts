/**
 * Camada de renderização da batalha — contrato (ADR-029).
 *
 * Por que existe: a suíte inteira passou "verde" enquanto o jogador via uma
 * TELA PRETA na batalha. O Phaser nunca rodou nos testes (jsdom não tem
 * WebGL), então nada garantia que arena, sprites e efeitos chegavam à tela.
 * Este arquivo cobre tudo o que dá para provar SEM navegador:
 *
 *   - todo asset que a arena/VFX/personagens pedem existe no manifesto e em disco;
 *   - os retângulos dos VFX cabem na folha REAL (lê o cabeçalho do PNG);
 *   - todo tema de andar tem arena; a escolha de ladrilhos é determinística;
 *   - a FONTE de dados da cena (`buildBattleView`) reflete o estado do jogo
 *     (batalha, herói andando, tema) — o elo que quebrou na tela preta;
 *   - o plano de feedback liga cada evento ao efeito certo.
 *
 * A prova visual (Phaser real) é `scripts/browser-smoke.mjs` (ver docs/TESTING.md).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { HEROES, classes, config, enemies } from "@tia/config";
import { GameState, createHero } from "@tia/game-core";
import { asAccountId } from "@tia/contracts";
import type { BattleEvent, Hero } from "@tia/contracts";
import { ARENA_THEMES, DEFAULT_THEME_ID, arenaThemeFor, themeAssetIds } from "../../apps/game-web/src/render/arenaThemes.js";
import { ARENA_LAYOUT, computeArenaGeometry, hash01, pickFloorTile, pickWallTile } from "../../apps/game-web/src/render/arenaLayout.js";
import { VFX_ATLAS, VFX_KINDS, vfxScale } from "../../apps/game-web/src/render/vfxAtlas.js";
import { damageVfx, planBatch } from "../../apps/game-web/src/render/BattleRenderer.js";
import { buildBattleView } from "../../apps/game-web/src/render/battleSource.js";

const ROOT = resolve(import.meta.dirname, "../..");
const manifest = JSON.parse(readFileSync(resolve(ROOT, "apps/game-web/public/assets/manifest.json"), "utf8")) as {
  entries: Record<string, string>;
};

/** Onde o PNG mora no repositório (`assets/sprites` ou `assets/generated`). */
function pngOnDisk(assetId: string): string | null {
  const rel = manifest.entries[assetId];
  if (!rel) return null;
  for (const root of ["assets/sprites", "assets/generated"]) {
    const p = resolve(ROOT, root, rel);
    if (existsSync(p)) return p;
  }
  return null;
}

function pngSize(path: string): { w: number; h: number } {
  const b = readFileSync(path);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

describe("arena — temas e assets", () => {
  it("todo tema de andar da Torre tem arena (e o de chefe existe)", () => {
    const used = new Set(config.tower.floors.map((f) => f.visual.theme));
    for (const t of used) expect(ARENA_THEMES[t], `tema de andar sem arena: ${t}`).toBeDefined();
    expect(ARENA_THEMES.boss).toBeDefined();
    expect(ARENA_THEMES[DEFAULT_THEME_ID]).toBeDefined();
    expect(arenaThemeFor("tema-que-nao-existe").id).toBe(DEFAULT_THEME_ID);
  });

  it("todo asset de todo tema existe no manifesto e em disco", () => {
    for (const theme of Object.values(ARENA_THEMES)) {
      expect(theme.wall.length).toBeGreaterThan(0);
      expect(theme.floor.length).toBeGreaterThan(0);
      for (const id of themeAssetIds(theme)) {
        expect(manifest.entries[id], `${theme.id}: ${id} fora do manifesto`).toBeDefined();
        expect(pngOnDisk(id), `${theme.id}: ${id} sem PNG`).not.toBeNull();
      }
    }
  });

  it("a escolha de ladrilhos é determinística e respeita a cadência de tochas", () => {
    const t = ARENA_THEMES.masmorra!;
    expect(hash01(7, 3)).toBe(hash01(7, 3));
    expect(hash01(7, 3)).not.toBe(hash01(8, 3));
    for (let i = -8; i < 40; i += 1) {
      expect(pickWallTile(t, i)).toEqual(pickWallTile(t, i));
      expect(pickWallTile(t, i).torch === true).toBe(((i % t.torchEvery) + t.torchEvery) % t.torchEvery === 0);
    }
    // adereços só na fileira de trás, com a frequência configurada (±8 pontos)
    let props = 0;
    for (let i = 0; i < 2000; i += 1) {
      if (pickFloorTile(t, i, 0).prop) props += 1;
      expect(pickFloorTile(t, i, 1).prop).toBeUndefined();
    }
    expect(Math.abs(props / 2000 - ARENA_LAYOUT.propChance)).toBeLessThan(0.08);
  });

  it("a geometria cobre o canvas inteiro (parede + piso) em qualquer tamanho", () => {
    for (const [w, h] of [[976, 380], [360, 180], [1920, 380]] as const) {
      const g = computeArenaGeometry(w, h);
      expect(g.rowY).toHaveLength(g.floorRows);
      expect(g.wallBottom).toBeGreaterThan(0);
      expect(g.rowY[0]).toBe(g.wallBottom);
      expect(g.rowY[g.floorRows - 1]! + g.floorTile).toBeCloseTo(h, 0);
    }
  });
});

describe("VFX — atlas medido contra as folhas reais", () => {
  it.each(VFX_KINDS)("%s: asset no manifesto e quadros dentro da folha", (kind) => {
    const def = VFX_ATLAS[kind];
    const path = pngOnDisk(def.assetId);
    expect(path, `${def.assetId} sem PNG`).not.toBeNull();
    const { w, h } = pngSize(path!);
    expect(def.rects.length).toBeGreaterThanOrEqual(4);
    for (const [x, y, rw, rh] of def.rects) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(rw).toBeGreaterThan(0);
      expect(rh).toBeGreaterThan(0);
      expect(x + rw).toBeLessThanOrEqual(w);
      expect(y + rh).toBeLessThanOrEqual(h);
    }
    expect(vfxScale(def, 160)).toBeGreaterThan(0);
  });
});

describe("personagens — folhas existem", () => {
  it("heróis e inimigos têm as folhas exigidas pela cena no manifesto (idle/attack/hurt/death)", () => {
    const sheets = [
      ...classes.map((c) => ({ who: c.id, s: c.assets.sheets })),
      ...enemies.map((e) => ({ who: e.id, s: e.assets.sheets })),
    ];
    for (const { who, s } of sheets) {
      for (const key of ["idle", "attack", "hurt", "death", "walk"] as const) {
        expect(manifest.entries[s[key]], `${who}.${key}`).toBeDefined();
        expect(pngOnDisk(s[key]), `${who}.${key} sem PNG`).not.toBeNull();
        const { w, h } = pngSize(pngOnDisk(s[key])!);
        // layout 4×4 de quadros 256×256 que a cena assume (SHEET_FRAMES)
        expect([w, h], `${who}.${key}`).toEqual([1024, 1024]);
      }
    }
  });
});

describe("fonte de dados da cena (buildBattleView)", () => {
  function setup() {
    const now = 1_700_000_000_000;
    const state = GameState.createNew({ accountId: asAccountId("render-account"), nickname: "Testador", skinId: "royal", starterIdentityId: "hero_aldric", now, masterSeed: 42 });
    const d = state.data as unknown as { king: { level: number }; wallet: { coins: bigint } };
    d.king.level = 60;
    d.wallet.coins = 10_000_000n;
    const identity = HEROES.find((h) => h.id === "hero_aldric")!;
    const hero: Hero = state.data.heroes[0] ?? createHero({ accountId: asAccountId("render-account"), classId: identity.classId as Hero["classId"], name: identity.name, rarity: identity.rarity, now: 0, index: 0, origin: "summon" });
    return { state, hero };
  }

  it("sem equipe: sem batalha, sem herói — a cena mostra o aviso, nunca preto", () => {
    const { state } = setup();
    const v = buildBattleView(state);
    expect(v.battle).toBeNull();
    expect(v.walking).toBe(false);
    expect(v.theme).toBe(config.tower.floors[0]!.visual.theme);
  });

  it("com batalha em curso a cena recebe a MESMA batalha (referência) e os sprites dos dois lados", () => {
    const { state, hero } = setup();
    state.assignHeroToSlot(hero.id, 0);
    state.selectActiveHero(hero.id);
    const battle = state.startTower();
    const v = buildBattleView(state);
    expect(v.battle).toBe(battle);
    expect(v.hero?.id).toBe(hero.id);
    for (const c of [...battle.allies, ...battle.enemies]) {
      expect(c.sprites, c.name).toBeDefined();
      for (const key of ["idle", "attack", "hurt", "death"]) expect(manifest.entries[c.sprites![key]!], `${c.name}.${key}`).toBeDefined();
    }
  });

  it("a fonte é PUXADA: reflete mudanças do estado sem trocar de referência nem de componente", () => {
    const { state, hero } = setup();
    state.assignHeroToSlot(hero.id, 0);
    state.selectActiveHero(hero.id);
    const before = buildBattleView(state);
    expect(before.battle).toBeNull();
    state.startTower();
    // a MESMA função (o `getView` que a cena guarda) devolve o novo estado
    expect(buildBattleView(state).battle).not.toBeNull();
  });

  it("andar de chefe usa a arena de chefe", () => {
    const { state, hero } = setup();
    state.assignHeroToSlot(hero.id, 0);
    state.selectActiveHero(hero.id);
    (state.data as unknown as { king: { level: number } }).king.level = 10;
    const boss = config.boss.bosses[0]!;
    state.startBoss(boss.id);
    expect(buildBattleView(state).theme).toBe("boss");
  });
});

describe("plano de feedback — evento → efeito", () => {
  const ev = (e: Record<string, unknown>) => ({ tick: 1, elapsedMs: 10, ...e }) as BattleEvent;

  it("dano físico corta, mágico explode, contínuo só faísca", () => {
    expect(damageVfx("physical").map((v) => v.kind)).toEqual(["slash", "hit"]);
    expect(damageVfx("magic").map((v) => v.kind)).toEqual(["fire"]);
    expect(damageVfx("dot").map((v) => v.kind)).toEqual(["hit"]);
    const [p] = planBatch([ev({ type: "damage_dealt", sourceId: "a", targetId: "b", amount: 5, kind: "physical" })]);
    expect(p!.plan.vfx?.[0]).toMatchObject({ kind: "slash", on: "target" });
  });

  it("cura, morte e reviver têm efeito; crítico ganha faísca maior", () => {
    const plan = (e: Record<string, unknown>) => planBatch([ev(e)])[0]!.plan;
    expect(plan({ type: "heal_dealt", sourceId: "a", targetId: "a", amount: 3 }).vfx?.[0]?.kind).toBe("heal");
    expect(plan({ type: "enemy_defeated", targetId: "b" }).vfx?.[0]?.kind).toBe("hit");
    expect(plan({ type: "character_defeated", targetId: "a" }).vfx?.[0]?.kind).toBe("hit");
    expect(plan({ type: "character_revived", targetId: "a", currentHp: 5, maxHp: 10 }).vfx?.[0]?.kind).toBe("heal");
    expect(plan({ type: "critical_hit", sourceId: "a", targetId: "b", amount: 9 }).vfx?.[0]?.scale).toBeGreaterThan(1);
  });

  it("porcentagem mitigada sai arredondada (não '-19.354838709677423%')", () => {
    const plan = planBatch([ev({ type: "damage_mitigated", sourceId: "a", targetId: "b", beforeDefense: 10, afterDefense: 8, mitigatedPercent: 19.354838709677423 })])[0]!.plan;
    expect(plan.number?.text).toBe("-19%");
  });
});
