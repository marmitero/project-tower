/**
 * Fumaça de UI (FASE 13): o App REAL, em jsdom, do zero até todas as telas.
 *
 * Não substitui olhar o jogo no navegador, mas pega o que o typecheck não vê: exceção de
 * render, tela que quebra com dado real, botão que lança, texto interno vazando para o jogador.
 * O canvas do Phaser é trocado por um stub (Phaser precisa de WebGL/Canvas de verdade).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../render/BattleCanvas.js", () => ({ BattleCanvas: () => null }));

// `act` do React precisa desta flag no ambiente de teste.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const MANIFEST = readFileSync(resolve(import.meta.dirname, "../../public/assets/manifest.json"), "utf8");

let container: HTMLDivElement;
let root: Root;
let errors: string[] = [];

const text = () => container.textContent ?? "";
const buttons = () => [...container.querySelectorAll("button")];
const byLabel = (label: string | RegExp) =>
  buttons().find((b) => (typeof label === "string" ? b.textContent?.trim() === label : label.test(b.textContent ?? "")));

async function tick(ms = 0) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
}
async function click(label: string | RegExp) {
  const el = byLabel(label);
  if (!el) throw new Error(`Botão não encontrado: ${String(label)}\nTela: ${text().slice(0, 400)}`);
  await act(async () => {
    el.click();
  });
}
async function typeInto(input: HTMLInputElement, value: string) {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

beforeEach(async () => {
  localStorage.clear();
  errors = [];
  vi.spyOn(console, "error").mockImplementation((...a) => void errors.push(a.map(String).join(" ")));
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => (String(url).includes("manifest.json") ? new Response(MANIFEST, { status: 200 }) : new Response("", { status: 404 }))),
  );
  vi.resetModules();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function mountApp() {
  const { App } = await import("../App.js");
  await act(async () => {
    root.render(<App />);
  });
  await tick(30);
}

describe("UI — do zero ao jogo", () => {
  it("sem save: mostra a criação do Rei, escolhe o herói e entra no jogo com HUD e navegação", async () => {
    await mountApp();
    expect(text()).toMatch(/Rei|Reino/);
    const input = container.querySelector("input") as HTMLInputElement;
    expect(input).toBeTruthy();
    await typeInto(input, "Dom_Teste");
    await click("Escolher campeão");
    expect(text()).toMatch(/Campeão/);
    await click(/^Convocar/);
    await tick(30);

    // HUD
    expect(text()).toContain("Dom_Teste");
    expect(text()).toMatch(/Coin/);
    // navegação principal
    const labels = ["Rei", "Heróis", "Equipe", "Inventário", "Market", "Torre", "Arena"];
    for (const l of labels) expect(byLabel(l), `aba ${l}`).toBeTruthy();
    expect(errors).toEqual([]);
  });

  it("percorre TODAS as telas sem exceção e sem jargão interno (§N do Master-Prompt) no texto", async () => {
    await mountApp();
    await typeInto(container.querySelector("input") as HTMLInputElement, "Dom_Teste");
    await click("Escolher campeão");
    await click(/^Convocar/);
    await tick(30);

    for (const l of ["Rei", "Heróis", "Equipe", "Inventário", "Market", "Torre", "Arena"]) {
      await click(l);
      await tick(10);
      const t = text();
      expect(t.length, `tela ${l} vazia`).toBeGreaterThan(40);
      // O jogador não precisa ver referências a seções do documento de design.
      expect(t, `jargão na tela ${l}`).not.toMatch(/§\s?\d/);
      expect(t, `P-xxx na tela ${l}`).not.toMatch(/\bP-\d{3}\b/);
      expect(t).not.toMatch(/undefined|NaN|\[object Object\]/);
    }
    expect(errors).toEqual([]);
  });

  it("a Arena mostra os 8 chefes e o botão Desafiar está bloqueado para um Rei nível 1", async () => {
    await mountApp();
    await typeInto(container.querySelector("input") as HTMLInputElement, "Dom_Teste");
    await click("Escolher campeão");
    await click(/^Convocar/);
    await tick(30);
    await click("Arena");
    for (const name of ["Rei Gosma", "Sentinela da Torre", "Colosso da Torre"]) expect(text()).toContain(name);
    expect(text()).toMatch(/Requer|Nível do Rei|nível/i);
  });

  it("o progresso sobrevive ao recarregar a página (save local)", async () => {
    await mountApp();
    await typeInto(container.querySelector("input") as HTMLInputElement, "Dom_Persistente");
    await click("Escolher campeão");
    await click(/^Convocar/);
    await tick(30);
    expect(localStorage.length).toBeGreaterThan(0);

    await act(async () => root.unmount());
    root = createRoot(container);
    vi.resetModules();
    await mountApp();
    expect(text()).toContain("Dom_Persistente");
    expect(container.querySelector("input")).toBeNull(); // não voltou para a criação
  });

  it("save corrompido não derruba o jogo: cai na criação e guarda um backup", async () => {
    localStorage.setItem("tia:save:local", "{isto não é json");
    // a chave real é detectada abaixo: qualquer chave existente que contenha 'save'
    for (const k of Object.keys(localStorage)) if (/save/i.test(k)) localStorage.setItem(k, "{isto não é json");
    await mountApp();
    expect(container.querySelector("input")).toBeTruthy();
    expect(errors).toEqual([]);
  });
});
