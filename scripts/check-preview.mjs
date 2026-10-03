#!/usr/bin/env node
/**
 * Garantia do "baixei o zip e joguei": confere o bundle VERSIONADO como o jogador vai usá-lo.
 *
 *  1. `BUILD_INFO.json` bate com as fontes atuais (o bundle não está velho).
 *  2. O bundle NÃO contém o Debug Mode (§77/§93).
 *  3. Sobe o MESMO servidor do `JOGAR.bat` numa porta livre e rastreia por HTTP, como um navegador:
 *     index.html → cada <script>/<link> (com o tipo MIME certo) → manifest.json → TODAS as
 *     imagens/sons do manifesto → jogos de arquivos de sprites. Qualquer 404 reprova.
 *  4. Os arquivos que o `JOGAR.bat` e a documentação prometem existem; `.bat` está em CRLF e ASCII.
 *  5. O repositório é extraível no Windows: sem nomes reservados/proibidos, sem colisão de
 *     maiúsculas/minúsculas e com caminhos curtos (limite de 260 caracteres).
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { INFO_FILE, PREVIEW_DIR, computeSourceHash } from "./preview-info.mjs";
import { startServer } from "./serve-preview.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const problems = [];
const fail = (m) => problems.push(m);

// 1) carimbo ---------------------------------------------------------------------------------
let info = null;
try {
  info = JSON.parse(await readFile(INFO_FILE, "utf8"));
} catch {
  fail("apps/game-web/preview/BUILD_INFO.json ausente — rode `npm run build:preview`.");
}
if (info) {
  const now = await computeSourceHash();
  if (info.sourceHash !== now.sourceHash) {
    fail("o bundle apps/game-web/preview está DESATUALIZADO em relação às fontes — rode `npm run build:preview` e commite.");
  }
  if (info.debugMode !== false) fail("BUILD_INFO.json diz que o bundle versionado tem Debug Mode.");
}

// 2) sem debug no bundle ---------------------------------------------------------------------
const bundleFiles = existsSync(join(PREVIEW_DIR, "assets")) ? await readdir(join(PREVIEW_DIR, "assets")) : [];
if (!existsSync(join(PREVIEW_DIR, "index.html"))) fail("apps/game-web/preview/index.html ausente.");
for (const f of bundleFiles.filter((n) => n.endsWith(".js"))) {
  const code = await readFile(join(PREVIEW_DIR, "assets", f), "utf8");
  for (const needle of ["Debug Mode", "tia-debug", "Esta janela não existe na versão do jogador"]) {
    if (code.includes(needle)) fail(`o bundle versionado contém texto do Debug Mode (${f}: "${needle}").`);
  }
}

// 3) rastreio HTTP ---------------------------------------------------------------------------
const server = await startServer({ port: 0, hosts: ["127.0.0.1"] });
const base = `http://127.0.0.1:${server.port}`;
const MIME_OK = {
  ".js": /javascript/,
  ".css": /text\/css/,
  ".html": /text\/html/,
  ".json": /json/,
  ".png": /image\/png/,
  ".wav": /audio\//,
  ".ogg": /audio\//,
  ".mp3": /audio\//,
};
let requests = 0;
async function get(path, expectMime) {
  requests++;
  const res = await fetch(base + path);
  if (res.status !== 200) {
    fail(`GET ${path} → ${res.status}`);
    return null;
  }
  const ext = path.match(/\.[a-z0-9]+$/i)?.[0].toLowerCase() ?? ".html";
  const want = expectMime ?? MIME_OK[ext];
  const type = res.headers.get("content-type") ?? "";
  if (want && !want.test(type)) fail(`GET ${path} → tipo errado "${type}"`);
  return res;
}

try {
  const home = await get("/");
  const html = home ? await home.text() : "";
  if (!html.includes("Tower Idle Adventure")) fail("index.html não tem o título do jogo (o `play.mjs` usa isso para reconhecer o jogo).");
  const refs = [...html.matchAll(/(?:src|href)="(\.\/[^"]+)"/g)].map((m) => m[1].slice(1));
  if (!refs.some((r) => r.endsWith(".js"))) fail("index.html não referencia nenhum .js");
  if (!refs.some((r) => r.endsWith(".css"))) fail("index.html não referencia nenhum .css (o jogo ficaria sem estilo)");
  for (const r of refs) await get(r);

  // O CSS e o JS apontam para a pasta de assets; o manifesto lista tudo o que o jogo pode pedir.
  const res = await get("/assets/manifest.json");
  const manifest = res ? await res.json() : { entries: {} };
  const entries = Object.entries(manifest.entries ?? {});
  if (entries.length < 400) fail(`manifesto com poucas entradas (${entries.length}).`);
  // Em lotes, para não abrir 500 conexões de uma vez.
  for (let i = 0; i < entries.length; i += 25) {
    await Promise.all(entries.slice(i, i + 25).map(([, file]) => get(`/assets/${file}`)));
  }
  // Rotas "bonitas" caem no index (SPA), URLs malformadas não derrubam o servidor.
  const spa = await get("/qualquer-rota", /text\/html/);
  if (spa) await spa.text();
  const bad = await fetch(`${base}/%E0%A4%A`);
  if (bad.status !== 400) fail(`URL malformada deveria dar 400, deu ${bad.status}`);
  await bad.text();
  const alive = await fetch(base + "/");
  if (alive.status !== 200) fail("o servidor caiu depois de uma URL malformada");
  await alive.text();
} finally {
  await server.close();
}

// 4) arquivos prometidos ---------------------------------------------------------------------
for (const f of ["JOGAR.bat", "JOGAR-DEBUG.bat", "jogar.sh", "scripts/play.mjs", "docs/PLAY_LOCAL.md", ".gitattributes"]) {
  if (!existsSync(join(ROOT, f))) fail(`arquivo prometido ausente: ${f}`);
}
for (const f of ["JOGAR.bat", "JOGAR-DEBUG.bat"]) {
  if (!existsSync(join(ROOT, f))) continue;
  const bytes = await readFile(join(ROOT, f));
  const text = bytes.toString("latin1");
  if (/[^\x00-\x7f]/.test(text)) fail(`${f} tem caracteres não-ASCII (o cmd.exe do Windows quebra acentos em .bat).`);
  if (/(^|[^\r])\n/.test(text)) fail(`${f} precisa de quebras de linha CRLF (o Windows pode ignorar labels/blocos com LF).`);
}
const gitattr = existsSync(join(ROOT, ".gitattributes")) ? await readFile(join(ROOT, ".gitattributes"), "utf8") : "";
if (!/^\*\.bat\s+-text/m.test(gitattr)) fail(".gitattributes precisa de `*.bat -text` (impede conversão de CRLF no zip do GitHub).");

// 5) extraível no Windows --------------------------------------------------------------------
let tracked = [];
try {
  tracked = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).split("\n").filter(Boolean);
} catch {
  /* sem git (zip): essa checagem só faz sentido no repositório */
}
const lower = new Map();
for (const p of tracked) {
  if (/[:?*"<>|]/.test(p)) fail(`nome inválido no Windows: ${p}`);
  if (/(^|\/)(con|prn|aux|nul|com[0-9]|lpt[0-9])(\.|\/|$)/i.test(p)) fail(`nome reservado do Windows: ${p}`);
  if (/[. ](\/|$)/.test(p)) fail(`nome termina em ponto/espaço (proibido no Windows): ${p}`);
  if (/[^\x00-\x7f]/.test(p)) fail(`nome com caractere não-ASCII (evite em zips): ${p}`);
  // pasta do zip (~45) + pasta de Downloads do usuário (~50) + caminho do arquivo ≤ 260.
  if (p.length > 150) fail(`caminho longo demais para o Windows (${p.length}): ${p}`);
  const k = p.toLowerCase();
  if (lower.has(k) && lower.get(k) !== p) fail(`colisão de maiúsculas/minúsculas: ${p} × ${lower.get(k)}`);
  lower.set(k, p);
}

if (problems.length) {
  console.error(`[preview] ${problems.length} problema(s):`);
  for (const p of problems) console.error("  ✗ " + p);
  process.exit(1);
}
console.log(`[preview] OK — bundle em dia, sem debug, ${requests} requisições HTTP 200, arquivos do zip compatíveis com o Windows`);
