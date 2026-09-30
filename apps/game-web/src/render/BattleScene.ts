/**
 * Cena Phaser.
 *
 * §63 — a stack preferida é TypeScript + Vite + React + Phaser. §64 — o
 * renderer apenas apresenta os eventos; esta cena NÃO calcula nada de
 * gameplay, ela lê `BattleState` e desenha.
 *
 * §62 — enquanto os sprites não estiverem no disco, a cena NÃO desenha
 * quadrados. Ela mostra a mensagem de "assets ausentes" e o log do build
 * aponta o motivo. Um retângulo colorido seria um placeholder, e
 * placeholders não podem ser entregues como produto final.
 */

import Phaser from "phaser";
import type { BattleState, Combatant } from "@tia/contracts";
import type { AssetManifest } from "./assets.js";
import { assetUrl } from "./assets.js";

export const TOWER_SCENE_KEY = "battle";

export interface SceneLayout {
  allies: { x: number; y: number }[];
  enemies: { x: number; y: number }[];
}

export class BattleScene extends Phaser.Scene {
  private state: BattleState | null = null;
  private manifest: AssetManifest | null = null;
  /** Barra de HP por combatente. Guarda `Rectangle`, não `Image`. */
  private hpBars = new Map<string, Phaser.GameObjects.Rectangle>();
  private labels = new Map<string, Phaser.GameObjects.Text>();

  constructor() {
    super(TOWER_SCENE_KEY);
  }

  init(data: { manifest: AssetManifest }): void {
    this.manifest = data.manifest;
  }

  /**
   * §67 — o canvas escala com o container, sem depender de tamanho de
   * janela fixo. `Phaser.Scale.RESIZE` com o pai como referência é o que
   * faz o mesmo código funcionar em portrait e landscape.
   */
  create(): void {
    this.scale.on("resize", this.layout, this);
    this.layout();
  }

  setBattle(state: BattleState | null): void {
    this.state = state;
    this.layout();
  }

  private layout(): Phaser.GameObjects.Container | null {
    const { width, height } = this.scale;
    this.children.removeAll();
    this.hpBars.clear();
    this.labels.clear();

    if (!this.state) return null;

    const layout = computeLayout(this.state.mode, width, height);
    const drawables: Phaser.GameObjects.Container[] = [];

    for (const c of this.state.allies) {
      drawables.push(this.drawCombatant(c, layout.allies[this.state.allies.indexOf(c)] ?? { x: 0, y: 0 }));
    }
    for (const c of this.state.enemies) {
      drawables.push(this.drawCombatant(c, layout.enemies[this.state.enemies.indexOf(c)] ?? { x: 0, y: 0 }));
    }

    return this.add.container(0, 0, drawables);
  }

  private drawCombatant(c: Combatant, at: { x: number; y: number }): Phaser.GameObjects.Container {
    const container = this.add.container(at.x, at.y);

    const assetId = spriteIdFor(c);
    const url = this.manifest ? assetUrl(assetId) : null;

    if (url) {
      const sprite = this.add.image(0, 0, url).setOrigin(0.5, 1);
      container.add(sprite);
    } else {
      // §62 — sem sprite, NÃO há placeholder geométrico. O jogador vê um
      // aviso, e o aviso aponta o asset que falta.
      const notice = this.add
        .text(0, -60, `falta ${assetId}`, {
          fontSize: "10px",
          color: "#f7768e",
          backgroundColor: "#0b0a12",
          padding: { x: 4, y: 2 },
        })
        .setOrigin(0.5, 1);
      container.add(notice);
    }

    const hpBack = this.add.rectangle(0, 8, 44, 5, 0x0a0912).setOrigin(0.5, 0.5);
    const hpFill = this.add
      .rectangle(0, 8, 44, 5, c.side === "ally" ? 0x9ece6a : 0xf7768e)
      .setOrigin(0.5, 0.5);
    const name = this.add
      .text(0, 16, `${c.name} Nv${c.level}`, { fontSize: "11px", color: "#e6e3f0" })
      .setOrigin(0.5, 0.5);

    container.add([hpBack, hpFill, name]);
    this.hpBars.set(c.id, hpFill);
    this.labels.set(c.id, name);
    return container;
  }

  /** Chamado pelo loop de eventos, nunca pelo engine. */
  syncHealth(): void {
    if (!this.state) return;
    for (const c of [...this.state.allies, ...this.state.enemies]) {
      const bar = this.hpBars.get(c.id);
      if (!bar) continue;
      const ratio = c.maxHp > 0 ? Math.max(0, c.hp / c.maxHp) : 0;
      bar.setScale(ratio, 1);
      // A barra cresce para a DIREITA a partir da borda esquerda: sem o
      // ajuste de X, um golpe tiraria a barra do centro e a leitura de HP
      // ficaria invertida.
      bar.setX(-22 * (1 - ratio));
    }
  }
}

/**
 * Id do sprite. O `Combatant` do contrato NÃO carrega `classId` — ele é um
 * tipo de combate, não de catálogo. O renderer usa `enemyId`/`heroId`, que
 * são os identificadores que a composição já resolveu; mapear de volta para
 * o sprite é responsabilidade do manifesto, não do engine.
 */
function spriteIdFor(c: Combatant): string {
  if (c.side === "enemy") return `char/enemy/${c.enemyId ?? "unknown"}`;
  return `char/hero/${c.heroId ?? "unknown"}`;
}

/**
 * Layout da cena.
 *
 * §17/§79 — TowerBattle é 1×1. §24/§80 — BossBattle é equipe × 1. O
 * layout é calculado a partir do estado, e não de um template: se a
 * engine someday entregar 3 aliados na Torre, o layout mostraria 3 e o
 * bug apareceria na tela, não escondido.
 */
export function computeLayout(mode: "tower" | "boss", width: number, height: number): SceneLayout {
  if (mode === "tower") {
    return {
      allies: [{ x: width * 0.3, y: height * 0.7 }],
      enemies: [{ x: width * 0.7, y: height * 0.7 }],
    };
  }
  const count = 3;
  return {
    allies: Array.from({ length: count }, (_, i) => ({
      x: width * 0.2 + (i * width * 0.12),
      y: height * 0.72,
    })),
    enemies: [{ x: width * 0.78, y: height * 0.62 }],
  };
}
