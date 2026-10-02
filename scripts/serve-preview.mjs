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
 *   3. assets/sprites         — fallback (symlink para o pack re-clonado)
 *
 * Rotas desconhecidas que NÃO pedem asset caem no index.html (SPA).
 * Porta 5173 em 0.0.0.0: é a porta que o preview do ambiente exponha.
 */

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, normalize, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const ROOTS = [
  join(ROOT, "apps", "game-web", "preview"),
  join(ROOT, "apps", "game-web", "public"),
  join(ROOT, "assets", "sprites"),
];
const INDEX = join(ROOTS[0], "index.html");

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

const server = createServer(async (req, res) => {
  const urlPath = req.url === "/" ? "/index.html" : (req.url ?? "/index.html");

  // 1) asset ou arquivo direto nas raízes, em ordem
  for (const root of ROOTS) {
    const candidate = safeJoin(root, urlPath);
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
});

const PORT = Number(process.env.PORT ?? 5173);
const HOST = process.env.HOST ?? "0.0.0.0";
server.listen(PORT, HOST, () => {
  console.log(`[preview] servindo apps/game-web/preview + public em http://${HOST}:${PORT}`);
  for (const root of ROOTS) console.log(`[preview] raiz: ${root}`);
});
