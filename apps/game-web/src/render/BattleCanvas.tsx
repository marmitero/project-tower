/**
 * Container do canvas de batalha.
 *
 * §63 — GAME RENDERING é um degrau separado da UI/HUD. Este componente
 * é a ponte: ele só inicializa o Phaser, passa o `BattleState` para a
 * cena e descarta. Nenhuma decisão de gameplay passa por aqui.
 *
 * §67 — o canvas é dimensionado pelo CSS do container, com
 * `Phaser.Scale.RESIZE`. Um canvas com tamanho fixo seria a primeira coisa
 * a quebrar ao virar o celular.
 */

import { useEffect, useRef } from "react";
import Phaser from "phaser";
import type { BattleState } from "@tia/contracts";
import { BattleScene, TOWER_SCENE_KEY } from "./BattleScene.js";
import { loadAssetManifest } from "./assets.js";

export function BattleCanvas({ battle }: { battle: BattleState | null }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<BattleScene | null>(null);

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
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        // §62 — sem arte não há jogo. A cena mostra o que falta em vez
        // de desenhar geometria.
        banner: false,
        scene: [BattleScene],
        callbacks: {
          preBoot: (g) => {
            g.scene.start(TOWER_SCENE_KEY, { manifest });
          },
        },
      });

      gameRef.current = game;
      sceneRef.current = (game.scene.getScene(TOWER_SCENE_KEY) as BattleScene) ?? null;
      sceneRef.current?.setBattle(battle);
    })();

    return () => {
      disposed = true;
      gameRef.current = null;
      sceneRef.current = null;
      // `destroy` é obrigatório: manter o canvas vivo depois do unmount
      // deixa o rAF rodando e o WebGL context vazado em cada hot reload.
      game?.destroy(true);
    };
    // A cena é criada UMA vez; a batalha é atualizada pelo efeito abaixo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    sceneRef.current?.setBattle(battle);
  }, [battle]);

  useEffect(() => {
    if (!battle) return;
    const id = window.setInterval(() => sceneRef.current?.syncHealth(), 120);
    return () => window.clearInterval(id);
  }, [battle]);

  return <div className="tia-canvas" ref={hostRef} aria-label="Arena de batalha" />;
}
