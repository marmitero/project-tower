/**
 * Container do canvas de batalha.
 *
 * §63 — GAME RENDERING é um degrau separado da UI/HUD. Este componente é
 * a ponte: inicializa o Phaser UMA vez e entrega à cena uma FONTE de dados
 * (`source`), que a cena consulta a cada frame. Nenhuma decisão de gameplay
 * passa por aqui.
 *
 * ADR-029 — antes, a batalha era empurrada para a cena por um `useEffect`.
 * O empurrão se perdia (cena criada de forma assíncrona; `GameState` mutado
 * no lugar) e o jogador via só "Aguardando a batalha...". Puxar o estado a
 * cada frame elimina a corrida de inicialização.
 *
 * §67 — o canvas é dimensionado pelo CSS do container, com
 * `Phaser.Scale.RESIZE`. Um canvas com tamanho fixo seria a primeira coisa
 * a quebrar ao virar o celular.
 */

import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { BattleScene, TOWER_SCENE_KEY } from "./BattleScene.js";
import { loadAssetManifest } from "./assets.js";
import type { BattleViewSource } from "./battleSource.js";

declare global {
  interface Window {
    /** Leitura (somente) do estado da cena — usada nos testes de navegador. */
    __tiaBattle?: { snapshot: () => Record<string, unknown> | null };
  }
}

export function BattleCanvas({ source }: { source: BattleViewSource }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  // A fonte é lida pela cena a cada frame; guardá-la numa ref evita recriar o Phaser se o App re-renderizar.
  const sourceRef = useRef<BattleViewSource>(source);
  sourceRef.current = source;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let game: Phaser.Game | null = null;

    void (async () => {
      const manifest = await loadAssetManifest();
      if (disposed || !hostRef.current) return;

      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: hostRef.current,
        backgroundColor: "#0b0a12",
        // Pixel art (README do pack): filtro nearest, sem suavização.
        pixelArt: true,
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        banner: false,
        // Cena adicionada abaixo, com dados de início — assim ela nasce UMA vez só
        // (antes: `scene:[BattleScene]` + `scene.start` no preBoot = duas partidas).
        scene: [],
      });
      game.scene.add(TOWER_SCENE_KEY, BattleScene, true, { manifest, getView: () => sourceRef.current() });
      const g = game;
      window.__tiaBattle = {
        snapshot: () => (g.scene.getScene(TOWER_SCENE_KEY) as BattleScene | null)?.debugSnapshot() ?? null,
      };
    })();

    return () => {
      disposed = true;
      delete window.__tiaBattle;
      // `destroy` é obrigatório: manter o canvas vivo depois do unmount
      // deixa o rAF rodando e o WebGL context vazado em cada hot reload.
      game?.destroy(true);
    };
  }, []);

  return <div className="tia-canvas" ref={hostRef} aria-label="Arena de batalha" />;
}
