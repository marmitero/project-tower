/**
 * Nickname do Rei (§6, §5).
 *
 * Os limites vêm da config (⛔ P-007 provisório): se a decisão mudar,
 * estes casos continuam válidos — eles testam o CONTRATO, não os números.
 */

import { describe, expect, it } from "vitest";
import { config } from "@tia/config";
import { normalizeNickname, validateNickname, NICKNAME_MESSAGES } from "../nickname.js";

const RULES = config.account.nickname;

describe("normalizeNickname", () => {
  it("remove espaço das pontas", () => {
    expect(normalizeNickname("  Aldric  ")).toBe("Aldric");
  });

  it("preserva o que o jogador digitou no meio", () => {
    expect(normalizeNickname("Aldric")).toBe("Aldric");
    expect(normalizeNickname("Al-dric_01")).toBe("Al-dric_01");
  });

  it("espaco interno NÃO some na normalização — quem rejeita é a validação", () => {
    expect(normalizeNickname("Ald ric")).toBe("Ald ric");
  });
});

describe("validateNickname", () => {
  it("aceita nome dentro das regras", () => {
    const r = validateNickname("Aldric");
    expect(r).toEqual({ ok: true, value: "Aldric" });
  });

  it("aceita letras acentuadas (o pattern usa \\p{L})", () => {
    expect(validateNickname("João-Arcanjo").ok).toBe(true);
    expect(validateNickname("Æthelred").ok).toBe(true);
  });

  it("aceita números, hífen e sublinhado", () => {
    expect(validateNickname("Rei_42-teste").ok).toBe(true);
  });

  it("rejeita vazio e só-espaços", () => {
    expect(validateNickname("")).toEqual({ ok: false, code: "empty" });
    expect(validateNickname("   ")).toEqual({ ok: false, code: "empty" });
  });

  it("rejeita curto demais", () => {
    const short = "a".repeat(RULES.minLength - 1);
    expect(validateNickname(short)).toEqual({ ok: false, code: "too_short" });
  });

  it("rejeita longo demais", () => {
    const long = "a".repeat(RULES.maxLength + 1);
    expect(validateNickname(long)).toEqual({ ok: false, code: "too_long" });
  });

  it("aceita nos limites exatos", () => {
    expect(validateNickname("a".repeat(RULES.minLength)).ok).toBe(true);
    expect(validateNickname("a".repeat(RULES.maxLength)).ok).toBe(true);
  });

  it("rejeita caracteres fora do pattern (emoji, pontuação, espaço)", () => {
    expect(validateNickname("Aldric⚔️")).toEqual({ ok: false, code: "invalid_chars" });
    expect(validateNickname("Aldric!")).toEqual({ ok: false, code: "invalid_chars" });
    expect(validateNickname("Ald ric")).toEqual({ ok: false, code: "invalid_chars" });
  });

  it("rejeita nomes reservados, sem diferenciar maiúsculas", () => {
    for (const reserved of RULES.reserved) {
      expect(validateNickname(reserved).ok).toBe(false);
      expect(validateNickname(reserved.toUpperCase())).toEqual({ ok: false, code: "reserved" });
    }
    expect(validateNickname("Admin")).toEqual({ ok: false, code: "reserved" });
    expect(validateNickname("aDmIn")).toEqual({ ok: false, code: "reserved" });
  });

  it("palavra que CONTÉM um reservado é aceita (só o nome inteiro é proibido)", () => {
    expect(validateNickname("Administrador").ok).toBe(true);
    expect(validateNickname("Rootinho").ok).toBe(true);
  });

  it("ordem de checagem: tamanho antes de caracteres", () => {
    // "a." é curto E tem caractere inválido — reporta o mais próximo
    // de o jogador consertar.
    expect(validateNickname("a.")).toEqual({ ok: false, code: "too_short" });
  });

  it("toda mensagem em PT-BR existe para todo código", () => {
    for (const code of ["empty", "too_short", "too_long", "invalid_chars", "reserved"] as const) {
      expect(NICKNAME_MESSAGES[code].length).toBeGreaterThan(0);
    }
  });
});
