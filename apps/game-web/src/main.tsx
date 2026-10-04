import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { config, validateConfig } from "@tia/config";
import { App } from "./App.js";
import { ErrorBoundary } from "./ErrorBoundary.js";
import "./styles.css";

/**
 * Validação de configuração no BOOT.
 *
 * §32 e o gate de arquitetura: a config é centralizada justamente para
 * poder ser validada num único ponto. Uma config inválida é um erro de
 * programação, não um estado de runtime — e um erro de programação não
 * deve chegar a um jogador como "a taxa do mercado é 18% em vez de 15%"
 * três dias depois do lançamento.
 */
try {
  validateConfig(config);
} catch (error) {
  console.error("[boot] configuração inválida — o jogo NÃO pode iniciar:", error);
  const root = document.getElementById("root");
  if (root) {
    root.textContent = "Erro de configuração do jogo. Veja o console.";
  }
  throw error;
}

const container = document.getElementById("root");
if (!container) throw new Error("#root não encontrado no index.html");

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
