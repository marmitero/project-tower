/**
 * Boss como DADO (FASE 12, ADR-027): validação, ContentPack v4 e migração v3 → v4.
 * Editar o chefe no painel ADM futuro = editar este pack e aplicar — sem código.
 */
import { afterEach, describe, expect, it } from "vitest";
import {
  ContentPackError,
  applyContentPack,
  bossErrors,
  config,
  defaultContentPack,
  migrateContentPack,
  resetContentToDefaults,
  validateConfig,
  validateContentPack,
  type ContentPack,
} from "../index.js";

afterEach(() => resetContentToDefaults());
const fresh = (): ContentPack => structuredClone(defaultContentPack());
const clone = () => structuredClone(config.boss);

describe("bossErrors — validação do roster", () => {
  it("o padrão é válido", () => {
    expect(bossErrors(config.boss, config.xp.king.levelCap)).toEqual([]);
    expect(() => validateConfig(config)).not.toThrow();
  });

  it("recusa chefe com id duplicado, nível inválido, atributos e resistências fora da faixa", () => {
    const b = clone();
    b.bosses[1]!.id = b.bosses[0]!.id;
    b.bosses[2]!.requiredKingLevel = 0;
    b.bosses[3]!.statusResist = { stun: 1.5 } as never;
    b.bosses[4]!.multipliers.hp = 0;
    b.bosses[5]!.timeLimitMs = 100;
    const msg = bossErrors(b, 20_000).join("\n");
    expect(msg).toMatch(/id duplicado/);
    expect(msg).toMatch(/requiredKingLevel/);
    expect(msg).toMatch(/statusResist\.stun/);
    expect(msg).toMatch(/multipliers/);
    expect(msg).toMatch(/timeLimitMs/);
  });

  it("recusa requiredKingLevel acima do teto do Rei", () => {
    const b = clone();
    b.bosses[7]!.requiredKingLevel = 20_001;
    expect(bossErrors(b, 20_000).join()).toMatch(/requiredKingLevel/);
  });

  it("recusa fase sem gatilho, gatilho fora da faixa e cura inválida", () => {
    const b = clone();
    const ph = (b.bosses[0]!.phases[0] ?? { id: "p", label: "Fase" }) as never as Record<string, unknown>;
    b.bosses[0]!.phases = [
      { id: "sem_gatilho", label: "X" } as never,
      { id: "alto", label: "X", hpBelowPct: 150 } as never,
      { id: "cura", label: "X", hpBelowPct: 50, healPct: 3 } as never,
      { ...ph, id: "mult", label: "X", hpBelowPct: 40, statMultipliers: { foo: 2 } } as never,
    ];
    const msg = bossErrors(b, 20_000).join("\n");
    expect(msg).toMatch(/precisa de gatilho/);
    expect(msg).toMatch(/hpBelowPct deve estar/);
    expect(msg).toMatch(/healPct/);
    expect(msg).toMatch(/statMultipliers\.foo/);
  });

  it("recusa tentativas inconsistentes e recompensas com classe/raridade desconhecida", () => {
    const b = clone();
    b.bosses[0]!.attempts = { kind: "window", windowMs: 0, maxAttempts: 0 };
    b.bosses[1]!.attempts = { kind: "banana" } as never;
    b.bosses[2]!.rewards.fragments = [{ classId: "bardo", rarity: "common", min: 1, max: 1, chance: 1 }] as never;
    b.bosses[3]!.rewards.fragments = [{ classId: "guardian", rarity: "mitica", min: 1, max: 1, chance: 1 }] as never;
    b.bosses[4]!.rewards.firstClearMultiplier = 0.5;
    const msg = bossErrors(b, 20_000).join("\n");
    expect(msg).toMatch(/windowMs/);
    expect(msg).toMatch(/attempts\.kind/);
    expect(msg).toMatch(/bardo|classId/);
    expect(msg).toMatch(/mitica|rarity/);
    expect(msg).toMatch(/firstClearMultiplier/);
  });

  it("exige as 5 folhas de sprite do chefe e escala em [0,5; 4]", () => {
    const b = clone();
    delete (b.bosses[0]!.assets.sheets as unknown as Record<string, unknown>).idle;
    b.bosses[1]!.scale = 9;
    const msg = bossErrors(b, 20_000).join("\n");
    expect(msg).toMatch(/sprite idle ausente/);
    expect(msg).toMatch(/scale/);
  });

  it("minTeamSize e política de fim de luta têm tipo/faixa validados", () => {
    const b = clone();
    b.minTeamSize = 5;
    (b as { persistHpAfter: unknown }).persistHpAfter = "sim";
    const msg = bossErrors(b, 20_000).join("\n");
    expect(msg).toMatch(/minTeamSize/);
    expect(msg).toMatch(/persistHpAfter/);
  });
});

describe("ContentPack v4 — Boss", () => {
  it("o pack carrega o bloco boss e ele é idêntico ao da config viva", () => {
    expect(defaultContentPack().boss).toEqual(config.boss);
    expect(validateContentPack(defaultContentPack())).toEqual([]);
  });

  it("editar o chefe no pack muda o jogo SEM código (nível, recompensa, fase, cooldown)", () => {
    const pack = fresh();
    pack.boss.bosses[0]!.requiredKingLevel = 15;
    pack.boss.bosses[0]!.rewards.fragments = [{ classId: "arcanist", rarity: "epic", min: 3, max: 5, chance: 1 }];
    pack.boss.bosses[0]!.attempts = { kind: "window", windowMs: 3_600_000, maxAttempts: 4 };
    pack.boss.minTeamSize = 2;
    applyContentPack(pack);
    expect(config.boss.bosses[0]!.requiredKingLevel).toBe(15);
    expect(config.boss.bosses[0]!.rewards.fragments[0]!.rarity).toBe("epic");
    expect(config.boss.bosses[0]!.attempts.kind).toBe("window");
    expect(config.boss.minTeamSize).toBe(2);
  });

  it("dá para ADICIONAR um chefe novo só com dados (clone + id novo)", () => {
    const pack = fresh();
    const novo = structuredClone(pack.boss.bosses[1]!);
    novo.id = "boss_teste_painel";
    novo.name = "Chefe do Painel";
    pack.boss.bosses.push(novo);
    applyContentPack(pack);
    expect(config.boss.bosses.map((b) => b.id)).toContain("boss_teste_painel");
  });

  it("pack inválido é recusado por inteiro e a config viva NÃO muda", () => {
    const pack = fresh();
    pack.boss.bosses[0]!.id = "ID Inválido";
    const before = JSON.stringify(config.boss);
    expect(() => applyContentPack(pack)).toThrow(ContentPackError);
    expect(JSON.stringify(config.boss)).toBe(before);
  });

  it("migração v3 → v4: pack sem `boss` é completado com o roster padrão", () => {
    const v3 = fresh() as unknown as Record<string, unknown>;
    v3.schemaVersion = 3;
    delete v3.boss;
    expect(validateContentPack(v3)).toEqual([]);
    const migrated = migrateContentPack(v3) as ContentPack;
    expect(migrated.schemaVersion).toBe(4);
    expect(migrated.boss).toEqual(defaultContentPack().boss);
    expect(() => applyContentPack(v3)).not.toThrow();
  });
});
