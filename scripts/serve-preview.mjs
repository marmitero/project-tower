#!/usr/bin/env node
/**
 * Servidor estático do preview — ZERO dependências (só stdlib do Node).
 *
 * Por que existe (ADR-018): o preview do sandbox morria entre turnos junto
 * com o ambiente (reset de snapshot mata processos e apaga `node_modules`).
 * Um servidor que não depende de `node_modules` nem de build tools sobe com
 * `node scripts/serve-preview.mjs` em qualquer situação — inclusive num
 * workspace recém-restaurado, desde que o bundle `apps/game-web/preview/`
 * e `apps/game-web/public/assets/` existam (ambos persistem no workspace).
 *
 * Raízes servidas, em ordem:
 *   1. apps/game-web/preview  — bundle de produção leve (vite --mode preview)
 *   2. apps/game-web/public   — assets do pack + manifest.json
 *   3. assets/generated + assets/sprites — versionados; `/assets/<x>` resolve também como `<x>`
 *
 * Rotas desconhecidas que NÃO pedem asset caem no index.html (SPA).
 * Porta 5173 em 0.0.0.0: é a porta que o preview do ambiente exponha.
 */

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, normalize, extname, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");

/** Raízes servidas, em ordem. `previewDir` permite servir o build de debug (`npm run play:debug`). */
export function serverRoots(previewDir = join(ROOT, "apps", "game-web", "preview")) {
  return [
    previewDir,
    join(ROOT, "apps", "game-web", "public"),
    join(ROOT, "assets", "generated"),
    join(ROOT, "assets", "sprites"),
  ];
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".mp3": "audio/mpeg",
  ".opus": "audio/opus",
  ".txt": "text/plain; charset=utf-8",
};

/** Resolve um caminho de URL dentro de uma raiz, sem deixar `..` escapar. */
function safeJoin(root, urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const rel = normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const full = join(root, rel);
  return full.startsWith(root + sep) || full === root ? full : null;
}

async function tryFile(path) {
  try {
    const info = await stat(path);
    if (info.isFile()) return { path, size: info.size };
  } catch {
    /* não existe nesta raiz — tenta a próxima */
  }
  return null;
}

export function createHandler({ previewDir } = {}) {
  const ROOTS = serverRoots(previewDir);
  const INDEX = join(ROOTS[0], "index.html");
  return async (req, res) => {
    const rawUrl = (req.url ?? "/").split("?")[0] || "/";
    const urlPath = rawUrl === "/" ? "/index.html" : rawUrl;

    // 1) asset ou arquivo direto nas raízes, em ordem.
    //    `/assets/<caminho>` também é tentado SEM o prefixo: o manifesto
    //    aponta `<caminho>` relativo ao pack versionado (assets/sprites,
    //    assets/generated). Assim o preview funciona num clone limpo, sem
    //    depender da cópia gerada em `public/assets/` (não versionada).
    const stripped = urlPath.startsWith("/assets/") ? urlPath.slice("/assets".length) : null;
    const attempts = [];
    for (const root of ROOTS) {
    attempts.push([root, urlPath]);
    if (stripped) attempts.push([root, stripped]);
    }
    for (const [root, rel] of attempts) {
    const candidate = safeJoin(root, rel);
    if (!candidate) continue;
    const hit = await tryFile(candidate);
    if (hit) {
      const body = await readFile(hit.path);
      res.writeHead(200, {
        "content-type": MIME[extname(hit.path).toLowerCase()] ?? "application/octet-stream",
        "content-length": hit.size,
        "cache-control": "no-cache",
      });
      res.end(body);
      return;
    }
    }

    // 2) SPA fallback: qualquer rota não-asset recebe o index do bundle
    if (!extname(urlPath)) {
    try {
      const body = await readFile(INDEX);
      res.writeHead(200, {
        "content-type": MIME[".html"],
        "content-length": body.length,
        "cache-control": "no-store",
      });
      res.end(body);
      return;
    } catch {
      /* index ausente: cai no 404 abaixo */
    }
    }

    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("404 — não encontrado");
  };
}

/**
 * Sobe o servidor em cada host pedido (padrão: só loopback, IPv4 + IPv6 — sem aviso de firewall
 * no Windows). Devolve `{ port, close }`. `port: 0` escolhe uma porta livre (testes).
 */
export async function startServer({ port = 5173, hosts = ["127.0.0.1", "::1"], previewDir } = {}) {
  const handler = createHandler({ previewDir });
  const servers = [];
  let boundPort = port;
  for (const [i, host] of hosts.entries()) {
    // Uma URL malformada (ex.: `%E0%A4%A`) lança dentro do handler: sem isto derrubaria o servidor.
    const srv = createServer((req, res) => {
      handler(req, res).catch(() => {
        try {
          res.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
          res.end("400 — pedido inválido");
        } catch {
          /* resposta já iniciada */
        }
      });
    });
    try {
      await new Promise((resolve, reject) => {
        srv.once("error", reject);
        srv.listen(i === 0 ? port : boundPort, host, () => {
          srv.off("error", reject);
          resolve(undefined);
        });
      });
    } catch (error) {
      // O 1º host é obrigatório. Os demais (ex.: ::1 sem IPv6 na máquina) são opcionais.
      if (i === 0) throw error;
      continue;
    }
    if (i === 0) boundPort = srv.address().port;
    servers.push(srv);
  }
  return {
    port: boundPort,
    close: () => Promise.all(servers.map((srv) => new Promise((r) => srv.close(() => r(undefined))))),
  };
}

// CLI: `node scripts/serve-preview.mjs` (preview do ambiente de desenvolvimento, 0.0.0.0).
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const PORT = Number(process.env.PORT ?? 5173);
  const HOST = process.env.HOST ?? "0.0.0.0";
  const { port } = await startServer({ port: PORT, hosts: [HOST] });
  console.log(`[preview] servindo apps/game-web/preview + public em http://${HOST}:${port}`);
  for (const root of serverRoots()) console.log(`[preview] raiz: ${root}`);
}
