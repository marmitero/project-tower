import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

const pkg = (name: string) => resolve(import.meta.dirname, "..", "..", "packages", name, "src", "index.ts");
const pkgTsx = (name: string) => resolve(import.meta.dirname, "..", "..", "packages", name, "src", "index.ts");

export default defineConfig({
  // §67 — o bundle precisa funcionar em servidor de produção e abrir
  // direto no dispositivo. `relative` evita que o preview quebre por
  // caminho base.
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@tia/config": pkg("config"),
      "@tia/contracts": pkg("contracts"),
      "@tia/engine": pkg("engine"),
      "@tia/game-core": pkg("game-core"),
      "@tia/ui": pkgTsx("ui"),
    },
  },
  server: {
    // O preview do sandbox é um host diferente de localhost. Aceitar
    // qualquer origem em dev é o comportamento padrão do Vite; o
    // `host: true` é que faz ele escutar em 0.0.0.0 e ficar acessível.
    host: true,
    port: 5173,
    // O host de preview do ambiente (`{port}-{id}.e2b.app`) precisa estar
    // na lista, senão o Vite responde 403 e o preview fica em branco.
    // `allowedHosts: true` é o equivalente moderno de `disableHostCheck`
    // e é aceitável em DEV; a configuração é diferente em produção.
    allowedHosts: true,
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: true,
  },
  build: {
    target: "es2022",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ["phaser"],
          react: ["react", "react-dom"],
        },
      },
    },
  },
});
