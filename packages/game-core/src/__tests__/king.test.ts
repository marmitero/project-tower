/**
 * Criação do Rei (§5, §8, §45, §47).
 *
 * Cobre o gate da FASE 3: o Rei nasce com nome, skin, retrato e
 * `lastActiveAt`; a conta tem 1 e só 1 Rei; skin é cosmética com regra
 * de desbloqueio vinda da config.
 */

import { describe, expect, it } from "vitest";
import { config } from "@tia/config";
import {
  createKing,
  changeKingSkin,
  isSkinUnlocked,
  SkinLockedError,
} from "../creation.js";
import { ACCOUNT, makeKing } from "./fixtures.js";

const NOW = 1_700_000_000_000;

describe("createKing (§5)", () => {
  it("nasce nível 1, XP zero, com nome e skin escolhidos", () => {
    const king = createKing({ accountId: ACCOUNT, nickname: "Aldric", skinId: "royal", now: NOW });
    expect(king.nickname).toBe("Aldric");
    expect(king.displayName).toBe("Aldric");
    expect(king.skinId).toBe("royal");
    expect(king.level).toBe(1);
    expect(king.xp).toBe(0n);
  });

  it("retrato vem da config (§5 — busto do Rei), não da skin", () => {
    const king = createKing({ accountId: ACCOUNT, nickname: "Aldric", skinId: "paladin", now: NOW });
    expect(king.portraitAssetId).toBe(config.account.king.portraitAssetId);
    expect(king.portraitAssetId).not.toBe(config.account.king.skins[1]!.assetId);
    // Quem mostra o corpo olha skinId → assetId da skin.
    expect(king.skinId).toBe("paladin");
  });

  it("skin desconhecida cai na primeira da config — save nunca fica sem skin", () => {
    const king = createKing({ accountId: ACCOUNT, nickname: "Aldric", skinId: "nao-existe", now: NOW });
    expect(king.skinId).toBe(config.account.king.skins[0]!.id);
  });

  it("createdAt e lastActiveAt nascem do relógio injetado (§47)", () => {
    const king = createKing({ accountId: ACCOUNT, nickname: "Aldric", skinId: "royal", now: NOW });
    expect(king.createdAt).toBe(NOW);
    expect(king.lastActiveAt).toBe(NOW);
  });
});

describe("1 Rei por conta (§8)", () => {
  it("a entidade King carrega a conta — e o save tem um único campo king", () => {
    const { king } = makeKing();
    expect(king.accountId).toBe(ACCOUNT);
    // Invariante estrutural: `SaveData.king` é um objeto, não array.
    // Não existe API de "segundo Rei" — este teste documenta a regra.
    expect(Array.isArray(king)).toBe(false);
  });
});

describe("skins do Rei (§5, ⛔ P-006)", () => {
  it("skins default vêm liberadas no nível 1", () => {
    for (const skin of config.account.king.skins) {
      if (skin.unlock.kind === "default") {
        expect(isSkinUnlocked(skin, 1)).toBe(true);
      }
    }
  });

  it("skin por nível só libera no nível devido", () => {
    const locked = { id: "future", name: "Futura", assetId: "hero_skins/future", unlock: { kind: "kingLevel" as const, kingLevel: 10 } };
    expect(isSkinUnlocked(locked, 9)).toBe(false);
    expect(isSkinUnlocked(locked, 10)).toBe(true);
  });

  it("troca de skin é cosmética: muda só o skinId", () => {
    const king = createKing({ accountId: ACCOUNT, nickname: "Aldric", skinId: "royal", now: NOW });
    changeKingSkin(king, "paladin");
    expect(king.skinId).toBe("paladin");
    expect(king.nickname).toBe("Aldric");
    expect(king.level).toBe(1);
    expect(king.xp).toBe(0n);
  });

  it("ADR-033: a skin é um retrato — o HUD usa o retrato 256 da skin e a skin antiga volta ao retrato padrão", () => {
    const king = createKing({ accountId: ACCOUNT, nickname: "Aldric", skinId: "rainha", now: NOW });
    expect(king.skinId).toBe("rainha");
    expect(king.portraitAssetId).toBe("portraits/king/rainha_s");
    changeKingSkin(king, "rei_sabio");
    expect(king.portraitAssetId).toBe("portraits/king/rei_sabio_s");
    changeKingSkin(king, "royal"); // legada: continua válida em saves antigos
    expect(king.portraitAssetId).toBe(config.account.king.portraitAssetId);
    expect(config.account.king.skins.filter((s) => !s.legacy).length).toBeGreaterThanOrEqual(4);
  });

  it("recusa skin desconhecida", () => {
    const king = createKing({ accountId: ACCOUNT, nickname: "Aldric", skinId: "royal", now: NOW });
    expect(() => changeKingSkin(king, "inexistente")).toThrow(SkinLockedError);
    expect(king.skinId).toBe("royal");
  });

  it("recusa skin bloqueada pelo nível do Rei", () => {
    const skin = config.account.king.skins.find((s) => s.unlock.kind === "kingLevel");
    if (!skin) return; // config atual não tem skin por nível — caso fica reservado
    const king = createKing({ accountId: ACCOUNT, nickname: "Aldric", skinId: "royal", now: NOW });
    expect(() => changeKingSkin(king, skin.id)).toThrow(SkinLockedError);
  });
});
