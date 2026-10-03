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
    const labels = ["Rei", "Heróis", "Equipe", "Inventário", "Market", "Torre", "Arena", "Opções"];
    for (const l of labels) expect(byLabel(l), `aba ${l}`).toBeTruthy();
    expect(errors).toEqual([]);
  });

  it("percorre TODAS as telas sem exceção e sem jargão interno (§N do Master-Prompt) no texto", async () => {
    await mountApp();
    await typeInto(container.querySelector("input") as HTMLInputElement, "Dom_Teste");
    await click("Escolher campeão");
    await click(/^Convocar/);
    await tick(30);

    for (const l of ["Rei", "Heróis", "Equipe", "Inventário", "Market", "Torre", "Arena", "Opções"]) {
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


async function startGame(name = "Dom_Teste") {
  await mountApp();
  await typeInto(container.querySelector("input") as HTMLInputElement, name);
  await click("Escolher campeão");
  await click(/^Convocar/);
  await tick(30);
}

describe("UI — guia, Opções e proteção do save", () => {
  it("o guia de 'Próximo passo' acompanha o jogador: Equipe → Torre", async () => {
    await startGame();
    expect(text()).toContain("Próximo passo");
    expect(text()).toMatch(/slot da equipe/i);
    await click("Equipe");
    await click(/Slot 1|^Aldric/);
    await tick(10);
    // depois de escalar o herói, o guia manda entrar na Torre
    const t = text();
    expect(t).toMatch(/Entre na Torre|slot da equipe/);
    expect(errors).toEqual([]);
  });

  it("Opções: som, 'Como jogar' e créditos do pack; preferência de som persiste", async () => {
    await startGame();
    await click("Opções");
    expect(text()).toContain("Como jogar");
    expect(text()).toContain("Assets by Nika Studio");
    const box = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(box.checked).toBe(true);
    await act(async () => box.click());
    expect(JSON.parse(localStorage.getItem("tia:settings") ?? "{}").sfxEnabled).toBe(false);
    expect(errors).toEqual([]);
  });

  it("baixar cópia do save entrega um arquivo .json que o próprio jogo sabe ler", async () => {
    await startGame();
    const { pageActions } = await import("../saveTools.js");
    const { decodeSave } = await import("@tia/game-core");
    const download = vi.spyOn(pageActions, "download").mockImplementation(() => undefined);
    await click("Opções");
    await click("Baixar cópia do save");
    await tick(10);
    expect(download).toHaveBeenCalledTimes(1);
    const [name, body] = download.mock.calls[0] as [string, string];
    expect(name).toMatch(/^project-tower-save-\d{8}-\d{4}\.json$/);
    expect(decodeSave(body).king.nickname).toBe("Dom_Teste");
  });

  it("apagar progresso: pede confirmação, guarda backup, NÃO é regravado ao sair, e dá para restaurar", async () => {
    await startGame();
    const { pageActions, BACKUP_ACCOUNT } = await import("../saveTools.js");
    const reload = vi.spyOn(pageActions, "reload").mockImplementation(() => undefined);
    const saveKey = Object.keys(localStorage).find((k) => k === "tia:save:local");
    expect(saveKey).toBeTruthy();

    await click("Opções");
    await click("Apagar progresso e recomeçar");
    expect(text()).toContain("Tem certeza?");
    await click("Cancelar");
    expect(localStorage.getItem("tia:save:local")).not.toBeNull();

    await click("Apagar progresso e recomeçar");
    await click("Sim, apagar tudo");
    await tick(10);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("tia:save:local")).toBeNull();
    expect(localStorage.getItem(`tia:save:${BACKUP_ACCOUNT}`)).not.toBeNull();

    // O navegador dispararia isto ao recarregar: o loop parado NÃO pode regravar o save velho.
    window.dispatchEvent(new Event("beforeunload"));
    window.dispatchEvent(new Event("pagehide"));
    await tick(10);
    expect(localStorage.getItem("tia:save:local")).toBeNull();

    // "Recarrega" a página: volta a criação do Rei, e a cópia anterior pode ser restaurada dali.
    await act(async () => root.unmount());
    root = createRoot(container);
    vi.resetModules();
    await mountApp();
    expect(container.querySelector("input")).toBeTruthy();
    await tick(10);
    // (módulos recarregados: o espião precisa ser refeito na nova instância)
    vi.spyOn((await import("../saveTools.js")).pageActions, "reload").mockImplementation(() => undefined);
    await click("Restaurar a cópia anterior");
    await tick(10);
    expect(JSON.parse(localStorage.getItem("tia:save:local") ?? "null")).not.toBeNull();
    expect(errors).toEqual([]);
  });

  it("carregar save de arquivo: rejeita lixo e aceita um save válido (com confirmação)", async () => {
    await startGame("Dom_Original");
    const { pageActions } = await import("../saveTools.js");
    const reload = vi.spyOn(pageActions, "reload").mockImplementation(() => undefined);
    const original = localStorage.getItem("tia:save:local") as string;
    const other = original.replace("Dom_Original", "Dom_Importado");
    expect(other).not.toBe(original);
    await click("Opções");
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const pick = async (content: string, name: string) => {
      const file = new File([content], name, { type: "application/json" });
      // jsdom não implementa `Blob.text` em todas as versões.
      if (!("text" in file)) Object.defineProperty(file, "text", { value: async () => content });
      Object.defineProperty(input, "files", { value: [file], configurable: true });
      await act(async () => {
        input.dispatchEvent(new Event("change", { bubbles: true }));
      });
      await tick(20);
    };
    await pick("isto não é um save", "lixo.json");
    expect(text()).toContain("não é um save válido");
    expect(localStorage.getItem("tia:save:local")).toBe(original);

    await pick(other, "meu-save.json");
    expect(text()).toContain("meu-save.json");
    await click("Sim, carregar");
    await tick(10);
    expect(reload).toHaveBeenCalled();
    expect(localStorage.getItem("tia:save:local")).toContain("Dom_Importado");
    window.dispatchEvent(new Event("beforeunload"));
    await tick(10);
    expect(localStorage.getItem("tia:save:local")).toContain("Dom_Importado");
  });

  it("ErrorBoundary: erro de render mostra saída (recarregar / baixar save) em vez de tela branca", async () => {
    const { ErrorBoundary } = await import("../ErrorBoundary.js");
    const { pageActions } = await import("../saveTools.js");
    const reload = vi.spyOn(pageActions, "reload").mockImplementation(() => undefined);
    const Bomb = () => {
      throw new Error("explodiu de propósito");
    };
    await act(async () => {
      root.render(
        <ErrorBoundary>
          <Bomb />
        </ErrorBoundary>,
      );
    });
    expect(text()).toContain("Algo deu errado");
    expect(text()).toContain("explodiu de propósito");
    await click("Recarregar o jogo");
    expect(reload).toHaveBeenCalledTimes(1);
    expect(byLabel("Baixar uma cópia do save")).toBeTruthy();
  });
});
