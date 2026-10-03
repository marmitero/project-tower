#!/usr/bin/env node
/**
 * Jogar localmente — o caminho SEM instalação (só precisa do Node.js).
 *
 * Quem baixa o zip do GitHub dá duplo clique em `JOGAR.bat` (Windows) ou roda `./jogar.sh`/`npm run play`.
 * Isto sobe o servidor estático zero-dependências (`serve-preview.mjs`) sobre o bundle versionado
 * em `apps/game-web/preview/` + os assets versionados, e abre o navegador. Não usa `npm install`,
 * `node_modules` nem internet.
 *
 * Decisões que existem por causa de um iniciante no Windows:
 *  - Escuta só em loopback (127.0.0.1/::1): não aparece o aviso do Firewall do Windows.
 *  - Porta FIXA 5173: o save fica no localStorage, que é por ENDEREÇO. Porta diferente = save diferente.
 *    Se a 5173 já tem o NOSSO jogo, só abre o navegador nela; se tem outro programa, usa a próxima
 *    livre e AVISA.
 *  - Mensagens sem acento no Windows (o console legado quebra acentos); no resto, com acento.
 *  - Nunca `file://`: módulos ES e `fetch` do manifesto não funcionam fora de http.
 *
 * Flags: `--debug` (serve o build de debug, só para desenvolvimento) e `--no-open` (não abre o navegador).
 */
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { ROOT, startServer } from "./serve-preview.mjs";

const args = new Set(process.argv.slice(2));
const DEBUG = args.has("--debug");
const NO_OPEN = args.has("--no-open");
const WIN = process.platform === "win32";
const PREFERRED_PORT = Number(process.env.PORT ?? 5173);
const GAME_TITLE = "Tower Idle Adventure";

const plain = (t) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const say = (t = "") => console.log(WIN ? plain(t) : t);

function fail(lines) {
  say("");
  say("  [!] Não foi possível abrir o jogo.");
  for (const l of lines) say(`      ${l}`);
  say("");
  process.exit(1);
}

const major = Number(process.versions.node.split(".")[0]);
if (major < 18) {
  fail([
    `Seu Node.js é antigo (versão ${process.versions.node}). O jogo precisa da versão 18 ou mais nova.`,
    "Baixe a versão LTS em https://nodejs.org e instale por cima.",
  ]);
}

const previewDir = join(ROOT, "apps", "game-web", DEBUG ? "preview-debug" : "preview");
if (!existsSync(join(previewDir, "index.html"))) {
  fail(
    DEBUG
      ? ["O build de debug ainda não existe. Rode: npm install  e depois  npm run play:debug"]
      : [
          "Não encontrei a pasta do jogo (apps/game-web/preview).",
          "Provavelmente o zip não foi EXTRAÍDO por inteiro. Clique com o botão direito no zip",
          "e escolha \"Extrair tudo...\", depois abra a pasta extraída e rode JOGAR.bat de lá.",
        ],
  );
}
if (!existsSync(join(ROOT, "assets", "sprites")) || !existsSync(join(ROOT, "apps", "game-web", "public", "assets", "manifest.json"))) {
  fail(["Faltam as imagens do jogo (pasta assets). Extraia o zip por inteiro e tente de novo."]);
}

/** O que está respondendo nesta porta é o nosso jogo? */
async function isOurGame(port) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(1500) });
    return res.ok && (await res.text()).includes(GAME_TITLE);
  } catch {
    return false;
  }
}

function openBrowser(url) {
  if (NO_OPEN) return;
  try {
    const [cmd, cmdArgs] = WIN
      ? ["cmd", ["/c", "start", "", url]]
      : process.platform === "darwin"
        ? ["open", [url]]
        : ["xdg-open", [url]];
    const child = spawn(cmd, cmdArgs, { detached: true, stdio: "ignore" });
    child.on("error", () => undefined); // sem navegador/gerenciador: o endereço já está na tela
    child.unref();
  } catch {
    /* idem */
  }
}

let server = null;
let port = PREFERRED_PORT;
for (let i = 0; i < 10 && !server; i++, port++) {
  try {
    server = await startServer({ port, previewDir });
  } catch (error) {
    if (error?.code !== "EADDRINUSE" && error?.code !== "EACCES") throw error;
    if (i === 0 && (await isOurGame(port))) {
      const url = `http://localhost:${port}`;
      say("");
      say(`  O jogo JÁ está aberto em ${url} (esta janela só abriu o navegador de novo).`);
      openBrowser(url);
      process.exit(0);
    }
    say(`  A porta ${port} está ocupada por outro programa; tentando a próxima...`);
  }
}
if (!server) fail([`Não achei nenhuma porta livre a partir de ${PREFERRED_PORT}. Feche outros programas e tente de novo.`]);

const url = `http://localhost:${server.port}`;
say("");
say("  =====================================================");
say(`   ${GAME_TITLE.toUpperCase()}${DEBUG ? "  (MODO DEBUG — só para desenvolvimento)" : ""}`);
say("  =====================================================");
say("");
say(`   O jogo está rodando em:   ${url}`);
say("");
say("   - O navegador deve abrir sozinho. Se não abrir, copie o endereço");
say("     acima e cole na barra de endereços do Chrome, Edge ou Firefox.");
say("   - Deixe ESTA janela aberta enquanto joga.");
say("   - Para PARAR o jogo: feche esta janela (ou aperte Ctrl+C).");
say("   - Seu progresso fica salvo no navegador, nesse endereço.");
if (server.port !== PREFERRED_PORT) {
  say("");
  say(`   ATENÇÃO: usando a porta ${server.port} (a ${PREFERRED_PORT} estava ocupada). O progresso salvo`);
  say(`   pela porta ${PREFERRED_PORT} NÃO aparece aqui — cada endereço tem o seu save.`);
}
say("");
openBrowser(url);

const stop = () => {
  say("\n  Jogo encerrado. Até a próxima!");
  void server.close().then(() => process.exit(0));
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
