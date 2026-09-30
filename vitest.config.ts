import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@tia/config": resolve(import.meta.dirname, "packages/config/src/index.ts"),
      "@tia/contracts": resolve(import.meta.dirname, "packages/contracts/src/index.ts"),
      "@tia/engine": resolve(import.meta.dirname, "packages/engine/src/index.ts"),
      "@tia/game-core": resolve(import.meta.dirname, "packages/game-core/src/index.ts"),
      "@tia/ui": resolve(import.meta.dirname, "packages/ui/src/index.ts"),
    },
  },
  test: {
    projects: [
      {
        test: {
          name: "arch",
          include: ["tests/arch/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        test: {
          name: "unit",
          include: ["packages/*/src/**/*.test.ts", "packages/*/tests/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
        },
      },
    ],
  },
});
