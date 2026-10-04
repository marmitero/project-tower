import { afterEach, describe, expect, it, vi } from "vitest";
import { CHAT_LIMITS, createSimulatedChat, sanitizeChatText } from "../chat.js";

afterEach(() => vi.useRealTimers());

describe("chat — validação de entrada", () => {
  it("remove controles, comprime espaços e corta no limite", () => {
    expect(sanitizeChatText("  oi\u0000\n  mundo  ")).toBe("oi mundo");
    expect(sanitizeChatText("   ")).toBeNull();
    expect(sanitizeChatText("x".repeat(500))!.length).toBe(CHAT_LIMITS.maxChars);
  });
});

describe("chat simulado (transporte provisório — ADR-031)", () => {
  it("se declara simulado e nasce com histórico (aviso do sistema)", () => {
    const chat = createSimulatedChat({ selfName: "Rei", seed: 1, autoTalk: false });
    expect(chat.simulated).toBe(true);
    expect(chat.history()[0]!.kind).toBe("system");
    expect(chat.history().length).toBeGreaterThan(2);
  });

  it("enviar publica como `self` com o nome do jogador; vazio e spam são recusados", () => {
    let t = 1_000;
    const chat = createSimulatedChat({ selfName: "Rei", seed: 1, autoTalk: false, now: () => t });
    const got: string[] = [];
    chat.subscribe((m) => got.push(`${m.kind}:${m.author}:${m.text}`));
    expect(chat.send("  ").ok).toBe(false);
    expect(chat.send("olá").ok).toBe(true);
    expect(got).toEqual(["self:Rei:olá"]);
    expect(chat.send("de novo").ok).toBe(false);
    t += CHAT_LIMITS.minIntervalMs;
    expect(chat.send("de novo").ok).toBe(true);
  });

  it("os NPCs falam sozinhos enquanto há inscritos e PARAM (timer limpo) ao cancelar", () => {
    vi.useFakeTimers();
    const chat = createSimulatedChat({ selfName: "Rei", seed: 7, talkEveryMs: { min: 1_000, max: 2_000 } });
    const got: string[] = [];
    const off = chat.subscribe((m) => got.push(m.text));
    vi.advanceTimersByTime(10_000);
    expect(got.length).toBeGreaterThanOrEqual(4);
    off();
    expect(vi.getTimerCount()).toBe(0);
    const n = got.length;
    vi.advanceTimersByTime(20_000);
    expect(got.length).toBe(n);
  });

  it("o histórico é limitado", () => {
    let t = 0;
    const chat = createSimulatedChat({ selfName: "Rei", seed: 1, autoTalk: false, now: () => (t += CHAT_LIMITS.minIntervalMs) });
    for (let i = 0; i < CHAT_LIMITS.historySize + 20; i += 1) chat.send(`m${i}`);
    expect(chat.history().length).toBe(CHAT_LIMITS.historySize);
  });
});
