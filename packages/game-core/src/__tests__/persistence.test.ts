import { describe, expect, it } from "vitest";
import { config } from "@tia/config";
import { LocalStoragePersistence, MemoryStorage, SAVE_PREFIX, encodeSave, decodeSave } from "../persistence/local.js";
import { PersistenceError, assertSaveShape, migrateSave } from "../persistence/types.js";
import { GameState } from "../state.js";
import { ACCOUNT, COIN_MILLION } from "./fixtures.js";
import type { SaveData } from "@tia/contracts";

function newSave(): SaveData {
  return {
    ...JSON.parse(JSON.stringify({})),
    ...(GameState.createNew({ accountId: ACCOUNT, nickname: "Testador", skinId: "royal", now: 0, masterSeed: 7 }).data as SaveData),
  };
}

describe("codificação com bigint", () => {
  it("bigint NÃO quebra o JSON.stringify", () => {
    const save = newSave();
    save.wallet.coins = 123_456_789n;
    save.king.xp = 987_654_321n;
    expect(() => encodeSave(save)).not.toThrow();
  });

  it("bigint sobrevive ao round-trip", () => {
    const save = newSave();
    save.wallet.coins = 123_456_789n;
    save.king.xp = 987_654_321n;
    save.heroes[0]!.xp = 555n;

    const back = decodeSave(encodeSave(save));
    expect(back.wallet.coins).toBe(123_456_789n);
    expect(back.king.xp).toBe(987_654_321n);
    expect(back.heroes[0]!.xp).toBe(555n);
  });

  it("a Coin continua sendo bigint depois do round-trip (não vira number)", () => {
    const save = newSave();
    save.wallet.coins = 9_007_199_254_740_993n; // acima de Number.MAX_SAFE_INTEGER
    const back = decodeSave(encodeSave(save));
    expect(typeof back.wallet.coins).toBe("bigint");
    expect(back.wallet.coins).toBe(9_007_199_254_740_993n);
  });

  it("a marca do bigint não vaza para o shape do save", () => {
    const save = newSave();
    const back = decodeSave(encodeSave(save));
    expect(back).not.toHaveProperty("__bigint__");
  });

  it("JSON corrompido dá erro de parse, não undefined silencioso", () => {
    expect(() => decodeSave("{não é json")).toThrow(PersistenceError);
  });
});

describe("forma do save", () => {
  it("save sem campo obrigatório é rejeitado", () => {
    const save = newSave() as unknown as Record<string, unknown>;
    delete save.wallet;
    expect(() => assertSaveShape(save)).toThrow(/wallet/);
  });

  it("schemaVersion desconhecida é rejeitada", () => {
    const save = { ...newSave(), schemaVersion: 99 };
    expect(() => assertSaveShape(save)).toThrow(/schemaVersion/);
  });

  it("um objeto vazio é rejeitado", () => {
    expect(() => assertSaveShape({})).toThrow();
    expect(() => assertSaveShape(null)).toThrow();
  });
});

describe("migração de configVersion", () => {
  it("save da versão atual passa sem alteração", () => {
    const save = newSave();
    expect(migrateSave(save, save.configVersion).configVersion).toBe(save.configVersion);
  });

  it("save antigo é WRITADO na versão atual, nunca reinterpretado em silêncio", () => {
    const save = { ...newSave(), configVersion: 0 };
    const migrated = migrateSave(save, config.configVersion);
    expect(migrated.configVersion).toBe(config.configVersion);
  });

  it("carregar um save antigo o atualiza automaticamente", async () => {
    const storage = new MemoryStorage();
    const persistence = new LocalStoragePersistence(storage);
    const save = { ...newSave(), configVersion: 0 };
    await persistence.save(ACCOUNT, save);

    const loaded = await persistence.load(ACCOUNT);
    expect(loaded?.configVersion).toBe(config.configVersion);
  });
});

describe("LocalStoragePersistence", () => {
  it("save ausente retorna null, não erro", async () => {
    const p = new LocalStoragePersistence(new MemoryStorage());
    expect(await p.load("inexistente")).toBeNull();
  });

  it("faz round-trip completo", async () => {
    const storage = new MemoryStorage();
    const p = new LocalStoragePersistence(storage);
    const save = newSave();
    save.wallet.coins = 42n;
    await p.save(ACCOUNT, save);

    const loaded = await p.load(ACCOUNT);
    expect(loaded?.wallet.coins).toBe(42n);
    expect(loaded?.king.nickname).toBe(save.king.nickname);
  });

  it("usa o prefixo definido, sem colisão entre contas", async () => {
    const storage = new MemoryStorage();
    const p = new LocalStoragePersistence(storage);
    await p.save("conta-a", newSave());
    await p.save("conta-b", newSave());
    expect(storage.size).toBe(2);
    expect(await p.load("conta-a")).not.toBeNull();
  });

  it("clear remove só a conta pedida", async () => {
    const storage = new MemoryStorage();
    const p = new LocalStoragePersistence(storage);
    await p.save("a", newSave());
    await p.save("b", newSave());
    await p.clear("a");
    expect(await p.load("a")).toBeNull();
    expect(await p.load("b")).not.toBeNull();
  });

  it("exportSave devolve a string; importSave reidrata", async () => {
    const storage = new MemoryStorage();
    const p = new LocalStoragePersistence(storage);
    const save = newSave();
    save.wallet.coins = 777n;
    await p.save(ACCOUNT, save);

    const payload = await p.exportSave(ACCOUNT);
    expect(payload).not.toBeNull();
    await p.clear(ACCOUNT);

    const imported = await p.importSave(ACCOUNT, payload!);
    expect(imported.wallet.coins).toBe(777n);
  });

  it("patch sem save prévio é erro explícito", async () => {
    const p = new LocalStoragePersistence(new MemoryStorage());
    await expect(p.patch(ACCOUNT, { revision: 2 })).rejects.toThrow(PersistenceError);
  });

  it("patch atualiza só o campo indicado", async () => {
    const p = new LocalStoragePersistence(new MemoryStorage());
    const save = newSave();
    save.wallet.coins = 10n;
    await p.save(ACCOUNT, save);
    await p.patch(ACCOUNT, { revision: 99 });
    const loaded = await p.load(ACCOUNT);
    expect(loaded?.revision).toBe(99);
    expect(loaded?.wallet.coins).toBe(10n);
  });

  it("o backend é 'local' — é isso que o GameState recebe, não a classe", async () => {
    const p = new LocalStoragePersistence(new MemoryStorage());
    expect(p.backend).toBe("local");
  });

  it("o prefixo é exportado e estável", () => {
    expect(SAVE_PREFIX).toBe("tia:save:");
  });
});

describe("isolamento entre contas", () => {
  it("um save não pode contaminar o de outra conta", async () => {
    const p = new LocalStoragePersistence(new MemoryStorage());
    const a = newSave();
    a.wallet.coins = 100n;
    const b = newSave();
    b.wallet.coins = 200n;
    await p.save("alice", a);
    await p.save("bob", b);

    expect((await p.load("alice"))?.wallet.coins).toBe(100n);
    expect((await p.load("bob"))?.wallet.coins).toBe(200n);
  });
});

describe("progressão de slot sobrevive ao save", () => {
  it("slot desbloqueado e Coin gasto voltam iguais", async () => {
    const p = new LocalStoragePersistence(new MemoryStorage());
    const state = GameState.createNew({ accountId: ACCOUNT, nickname: "T", skinId: "royal", now: 0, masterSeed: 1 });
    const hero = state.data.heroes[0]!;
    // Ordem: primeiro ocupa o slot, só depois escolhe o herói ativo.
    // `setActiveHero` recusa um herói que não esteja na equipe (§19).
    state.assignHeroToSlot(hero.id, 0);
    state.selectActiveHero(hero.id);

    // Sobe o Rei e dá Coin para desbloquear o slot 2. O `GameState` expõe
    // `data` como SOMENTE LEITURA de propósito: mutar o save por fora
    // contornaria `revision` e a auditoria de economia. O caminho correto
    // para coisas que o GameState ainda não expõe é o `hydrate`+`as any`
    // explícito, nunca fingir que `data` é mutável.
    const data = state.data as SaveData;
    const mutable = data as unknown as { king: { level: number }; wallet: { coins: bigint } };
    mutable.king.level = 50;
    mutable.wallet.coins = COIN_MILLION;

    state.unlockTeamSlot(1);
    const coinsAfter = data.wallet.coins;

    await p.save(ACCOUNT, data);
    const loaded = (await p.load(ACCOUNT))!;

    expect(loaded.team.unlockedSlots).toBe(2);
    expect(loaded.wallet.coins).toBe(coinsAfter);
    expect(loaded.team.members[0]).toBe(hero.id);
    expect(loaded.team.activeHeroId).toBe(hero.id);
  });

  it("membros nulos sobrevivem ao round-trip como null, não undefined", async () => {
    const p = new LocalStoragePersistence(new MemoryStorage());
    const state = GameState.createNew({ accountId: ACCOUNT, nickname: "T", skinId: "royal", now: 0, masterSeed: 1 });
    const data = state.data as SaveData;
    (data.team as { members: (string | null)[] }).members[0] = null;
    await p.save(ACCOUNT, data);
    const loaded = (await p.load(ACCOUNT))!;
    expect(loaded.team.members[0]).toBeNull();
    expect(loaded.team.members).toHaveLength(3);
  });
});
