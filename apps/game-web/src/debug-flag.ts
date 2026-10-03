/**
 * Debug Mode (§77/§93) — interruptor ÚNICO, decidido em tempo de BUILD.
 *
 * `VITE_DEBUG_MODE=true` só deve existir em máquina de desenvolvimento (`npm run play:debug`
 * ou um `.env.local` seu). Em qualquer build normal o valor é `false`, o bundler troca a
 * constante por `false` e o painel (e seu `import()`) sai do arquivo final — o jogador
 * não tem como ligar. `scripts/check-debug-mode.mjs` falha o `npm run check` se isso mudar.
 */
export const DEBUG_ENABLED: boolean = import.meta.env.VITE_DEBUG_MODE === "true";
