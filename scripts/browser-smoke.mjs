#!/usr/bin/env node
/**
 * Fumaça de NAVEGADOR da batalha (ADR-029) — prova visual com o Phaser real.
 *
 * Por que existe: a suíte (jsdom) nunca renderizou o Phaser, e por isso a
 * "tela preta" da batalha passou despercebida. Este script abre o jogo num
 * Chromium de verdade, joga os primeiros passos e AFIRMA, lendo
 * `window.__tiaBattle.snapshot()`:
 *   - a cena ligou, a arena tem tema e rolou (o herói andou);
 *   - uma batalha apareceu com sprite para os DOIS lados;
 *   - nenhuma requisição 404 e nenhum erro de console/página.
 * Também salva capturas em `--out <dir>` (padrão: os do SO).
 *
 * NÃO faz parte de `npm run check` (precisa de um Chromium). Instalação
 * descartável, fora do repositório:
 *   mkdir /tmp/br && cd /tmp/br && npm i puppeteer-core @sparticuz/chromium
 *   (em Linux sem libs: extrair bin/al2023.tar.br e usar LD_LIBRARY_PATH)
 * Uso:  NODE_PATH=/tmp/br/node_modules node scripts/browser-smoke.mjs [--url http://127.0.0.1:5173/] [--out dir]
 *   ou  CHROME=/caminho/do/chrome.exe (usa o Chrome/Edge instalado, com `puppeteer-core`)
 */
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const args = process.argv.slice(2);
const arg = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const URL_ = arg("--url", "http://127.0.0.1:5173/");
const OUT = arg("--out", join(tmpdir(), "tia-browser-smoke"));
mkdirSync(OUT, { recursive: true });

const require = createRequire(join(process.env.NODE_PATH?.split(":")[0] ?? process.cwd(), "x.js"));
let puppeteer;
let chromium = null;
try {
  puppeteer = require("puppeteer-core");
  if (!process.env.CHROME) chromium = require("@sparticuz/chromium");
} catch {
  console.log("browser-smoke: puppeteer-core não instalado — pulando (veja o cabeçalho do script).");
  process.exit(0);
}

const executablePath = process.env.CHROME ?? (await chromium.default.executablePath());
const launchArgs = chromium ? [...chromium.default.args, "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] : [];
const browser = await puppeteer.launch({ executablePath, args: launchArgs, headless: "shell", defaultViewport: { width: 1366, height: 768 } });
const page = await browser.newPage();
const problems = [];
page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
page.on("console", (m) => m.type() === "error" && problems.push(`console: ${m.text()}`));
page.on("response", (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()} ${r.url()}`));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const click = (t) =>
  page.evaluate((t) => {
    const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim().startsWith(t));
    if (!b) return false;
    b.click();
    return true;
  }, t);

await page.goto(URL_, { waitUntil: "networkidle0" });
await page.type("input", "Dom_Teste");
for (const step of ["Escolher campeão", "Convocar", "Equipe", "Slot 1", "Tornar ativo", "Torre", "Fechar"]) {
  if (!(await click(step))) problems.push(`botão ausente: ${step}`);
  await sleep(250);
}

// Layout do HUB (ADR-031): tudo cabe na tela, o jogo fica ENTRE a equipe e o chat, a nav fica no topo.
const layout = await page.evaluate(() => {
  const r = (sel) => document.querySelector(sel)?.getBoundingClientRect() ?? null;
  const box = (b) => b && { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
  return {
    scrollH: document.documentElement.scrollHeight,
    innerH: window.innerHeight,
    scrollW: document.documentElement.scrollWidth,
    innerW: window.innerWidth,
    nav: box(r(".tia-nav")),
    hud: box(r(".tia-hud")),
    team: box(r(".tia-teampanel")),
    game: box(r(".tia-gamebox")),
    chat: box(r(".tia-chat")),
    hunt: box(r(".tia-hunt")),
  };
});
console.log("layout:", JSON.stringify(layout));
const L = layout;
if (!L.nav || !L.hud || !L.team || !L.game || !L.chat || !L.hunt) problems.push("layout: faltam blocos do HUB");
else {
  if (L.nav.y > L.hud.y) problems.push("layout: a navegação não está acima da barra de XP");
  if (!(L.team.x + L.team.w <= L.game.x + 1 && L.game.x + L.game.w <= L.chat.x + 1)) problems.push("layout: o jogo não está entre a equipe e o chat");
  if (L.hunt.y < L.game.y + L.game.h - 1) problems.push("layout: o painel de dados não está sob o jogo");
  if (L.scrollH > L.innerH + 4) problems.push(`layout: a página rola na vertical (${L.scrollH} > ${L.innerH})`);
  if (L.scrollW > L.innerW + 4) problems.push("layout: a página rola na horizontal");
  if (L.game.h < 250) problems.push(`layout: o jogo ficou pequeno (${L.game.h}px de altura)`);
}
await page.screenshot({ path: join(OUT, "layout.png") });

const seen = { walked: false, fought: false, bothSprites: false, maxDistance: 0, themes: new Set() };
for (let i = 0; i < 40; i += 1) {
  await sleep(350);
  const snap = await page.evaluate(() => window.__tiaBattle?.snapshot() ?? null);
  if (!snap) continue;
  seen.themes.add(snap.arena?.theme);
  seen.maxDistance = Math.max(seen.maxDistance, snap.arena?.distance ?? 0);
  if (snap.walker?.state === "walk") seen.walked = true;
  if (snap.battleId) {
    seen.fought = true;
    if (snap.fighters.length >= 2 && snap.fighters.every((f) => f.hasSprite)) seen.bothSprites = true;
  }
  if (i % 6 === 0) await page.screenshot({ path: join(OUT, `shot-${String(i).padStart(2, "0")}.png`) });
  if (seen.walked && seen.bothSprites && seen.maxDistance > 300) break;
}
await browser.close();

const failures = [...problems];
if (!seen.walked) failures.push("o herói nunca apareceu andando entre inimigos");
if (!seen.fought) failures.push("nenhuma batalha chegou à cena (TELA PRETA?)");
if (!seen.bothSprites) failures.push("a batalha não desenhou herói E inimigo");
if (seen.maxDistance <= 300) failures.push("a arena não rolou");
if (failures.length > 0) {
  console.error("browser-smoke FALHOU:\n - " + failures.join("\n - "));
  process.exit(1);
}
console.log(`browser-smoke OK — arena rolou ${seen.maxDistance}px, temas: ${[...seen.themes].join(", ")}; capturas em ${OUT}`);
