/**
 * BattleScene — apresentação da batalha 1×1 (§63, §64, §60, §66).
 *
 * Fica no escuro enquanto `GameEvents.onBattleEvents` não chega: o `App`
 * empurra os eventos para `battleFeedbackQueue` e o `update()` drena e
 * executa o plano de `BattleRenderer` (números de dano, lunge de ataque,
 * flash/tremor de crítico, morte com fade, banner de fim). O renderer só
 * apresenta — as fórmulas vivem no engine (§64).
 */
import { formatCompact } from "../format.js";
import Phaser from "phaser";
import type { BattleEvent, BattleState } from "@tia/contracts";
import { skillsById } from "@tia/config";
import { type AssetManifest, assetUrl, getManifest } from "./assets";
import { battleFeedbackQueue, planBatch } from "./BattleRenderer";
import { playSfx } from "./sfx";

export interface BattleSceneData {
  manifest: AssetManifest;
  state: BattleState | null;
}

export interface BattleCanvasOptions {
  state: BattleState | null;
  onSceneCreate?: (scene: BattleScene) => void;
  onMissingAssets?: (missing: readonly string[]) => void;
}

/** §68 — `prefers-reduced-motion` corta tremor/avanço; números e banner ficam. */
function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const REDUCED_MOTION = prefersReducedMotion();
const NOOP = (): void => undefined;

export interface LayoutPoint {
  x: number;
  y: number;
}

/**
 * Posição dos combatentes (§63): aliado à esquerda, inimigo à direita,
 * arena vertical centrada. Dado o TAMANHO REAL do canvas — nunca `innerWidth`.
 */
export function computeLayout(
  mode: "tower" | "boss",
  width: number,
  height: number,
  allyCount = 1,
): { ally: LayoutPoint; enemy: LayoutPoint; allies: LayoutPoint[] } {
  if (mode === "boss") {
    // Equipe em formação diagonal à esquerda (até 3), chefe grande à direita (ADR-027, §24).
    const n = Math.max(1, Math.min(3, Math.floor(allyCount)));
    const allies = Array.from({ length: n }, (_, i) => ({ x: width * (0.14 + 0.12 * i), y: height * (0.8 - 0.09 * i) }));
    return { ally: allies[0]!, allies, enemy: { x: width * 0.74, y: height * 0.74 } };
  }
  const ally = { x: width * 0.3, y: height * 0.7 };
  return { ally, allies: [ally], enemy: { x: width * 0.7, y: height * 0.7 } };
}

interface FighterView {
  id: string;
  side: "ally" | "enemy";
  sprite: Phaser.GameObjects.Sprite | null;
  bar: Phaser.GameObjects.Graphics | null;
  label: Phaser.GameObjects.Text | null;
  base: LayoutPoint;
  /** Posição do aliado na formação (0 = primeiro). */
  index: number;
  dead: boolean;
  /** Chaves de animação por folha (preenchido quando as sheets carregam). */
  anims?: Record<SheetName, string>;
}

type SheetName = "idle" | "attack" | "hurt" | "death";
const SHEET_NAMES: readonly SheetName[] = ["idle", "attack", "hurt", "death"];

const SHEET_FRAMES = { frameWidth: 256, frameHeight: 256 };
/** rows do sheet Nika (README_IMPORT): 0=down, 1=up, 2=left, 3=right. */
const ROW_LEFT = 2;
const ROW_RIGHT = 3;
const FRAME_COUNT = 4;

export class BattleScene extends Phaser.Scene {
  private data_: BattleSceneData = {
    manifest: { version: 0, entries: {}, missing: [], orphaned: [] },
    state: null,
  };
  private battle: BattleState | null = null;
  private mode: "tower" | "boss" = "tower";
  private readonly fighters = new Map<string, FighterView>();
  private readonly loadingSheets = new Set<string>();
  private notice: Phaser.GameObjects.Text | null = null;
  private built = false;

  constructor() {
    super({ key: "battle" });
  }

  init(data: BattleSceneData): void {
    this.data_ = data;
    if (data.state) this.battle = data.state;
    this.mode = "tower";
  }

  create(): void {
    this.drawBackground();
    this.notice = this.add
      .text(this.scale.width / 2, this.scale.height / 2, "", {
        fontSize: "14px",
        color: "#f7eec2",
        backgroundColor: "#000000cc",
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(100);
    this.scale.on("resize", this.onResize, this);
    this.rebuild();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off("resize", this.onResize, this);
    });
  }

  /**
   * Recebe o estado da batalha (independente do React). Se os combatentes
   * mudaram, reconstrói as views; barras/HP são sincronizados no `update`.
   */
  setBattle(state: BattleState | null): void {
    this.battle = state;
    this.rebuild();
  }

  /** Sincroniza barra/nome com o estado (§63). */
  syncHealth(): void {
    this.refreshHealth();
  }

  override update(): void {
    this.refreshHealth();
    const events = battleFeedbackQueue.drain();
    if (events.length > 0) {
      for (const { event, plan } of planBatch(events)) {
        this.applyFeedback(event, plan);
      }
    }
  }

  private onResize(gameSize: Phaser.Structs.Size): void {
    this.cameras.main.setSize(gameSize.width, gameSize.height);
    this.drawBackground();
    this.relayout();
  }

  private drawBackground(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    this.cameras.main.setBackgroundColor("#0b0a12");
    if (this.bgGraphic) this.bgGraphic.destroy();
    this.bgGraphic = this.add.graphics().setDepth(-2);
    this.bgGraphic.fillStyle(0x2a2140, 1);
    this.bgGraphic.fillRect(0, h * 0.72, w, h * 0.28);
    this.bgGraphic.fillStyle(0x3a2c55, 1);
    this.bgGraphic.fillRect(0, h * 0.72, w, 3);
  }

  private bgGraphic: Phaser.GameObjects.Graphics | null = null;

  private rebuild(): void {
    if (!this.sys || !this.sys.settings || !this.sys.settings.active) return;
    const battle = this.battle;
    if (!battle) {
      this.clearFighters();
      this.setNotice("Aguardando a batalha...");
      return;
    }
    this.setNotice(null);
    this.mode = battle.mode === "boss" ? "boss" : "tower";
    const wanted = new Set<string>();
    for (const c of battle.allies) wanted.add(c.id);
    for (const c of battle.enemies) wanted.add(c.id);
    let changed = this.fighters.size !== wanted.size;
    for (const id of wanted) if (!this.fighters.has(id)) changed = true;
    if (!changed && this.built) {
      this.refreshHealth();
      return;
    }
    this.clearFighters();
    for (const c of battle.allies) this.createFighter(c.id, "ally", c.hp <= 0, c.sprites);
    for (const c of battle.enemies) this.createFighter(c.id, "enemy", c.hp <= 0, c.sprites);
    this.built = true;
    this.relayout();
    this.refreshHealth();
  }

  private clearFighters(): void {
    for (const f of this.fighters.values()) {
      f.sprite?.destroy();
      f.bar?.destroy();
      f.label?.destroy();
    }
    this.fighters.clear();
    this.built = false;
  }

  private relayout(): void {
    const layout = computeLayout(this.mode, this.scale.width, this.scale.height, this.battle?.allies.length ?? 1);
    for (const f of this.fighters.values()) {
      f.base = this.basePoint(f, layout);
      f.sprite?.setPosition(f.base.x, f.base.y);
      f.sprite?.setScale(this.scaleFor(f));
      this.placeChrome(f);
    }
  }

  /** Ponto-base do combatente; mantém nome e barra DENTRO do canvas mesmo com o chefe grande. */
  private basePoint(f: FighterView, layout: ReturnType<typeof computeLayout>): LayoutPoint {
    const p = f.side === "ally" ? (layout.allies[f.index] ?? layout.ally) : layout.enemy;
    const maxY = this.scale.height - 128 * this.scaleFor(f) - 40;
    return { x: p.x, y: Math.min(p.y, Math.max(this.scale.height * 0.4, maxY)) };
  }

  private spriteScale(): number {
    const m = Math.min(this.scale.width, this.scale.height);
    return Math.max(0.3, Math.min(0.62, m / 780));
  }

  /** Escala do sprite: base × `scale` do combatente (chefe), encolhendo a equipe na Arena. */
  private scaleFor(f: FighterView): number {
    const c = this.combatant(f.id);
    let mul = c?.scale ?? 1;
    if (this.mode === "boss" && f.side === "ally") mul *= (this.battle?.allies.length ?? 1) > 2 ? 0.82 : 0.92;
    return Math.min(this.spriteScale() * mul, (this.scale.height * 0.62) / 256);
  }

  private placeChrome(f: FighterView): void {
    const s = this.scaleFor(f);
    const half = 128 * s;
    f.label?.setPosition(f.base.x, f.base.y + half + 8);
    this.redrawBar(f);
  }

  private redrawBar(f: FighterView): void {
    if (!f.bar) return;
    const s = this.scaleFor(f);
    const width = Math.max(64, 160 * s);
    const height = 7;
    const x = f.base.x - width / 2;
    const y = f.base.y + 128 * s + 22;
    const battle = this.battle;
    const c = this.combatant(f.id);
    const ratio = c && c.maxHp > 0 ? Math.max(0, Math.min(1, c.hp / c.maxHp)) : 0;
    f.bar.clear();
    f.bar.fillStyle(0x241c33, 1);
    f.bar.fillRect(x, y, width, height);
    if (battle) {
      f.bar.fillStyle(f.side === "ally" ? 0x6cc26c : 0xc26c6c, 1);
      f.bar.fillRect(x, y, width * ratio, height);
    }
  }

  private refreshHealth(): void {
    for (const f of this.fighters.values()) {
      const c = this.combatant(f.id);
      if (!c || !f.label) continue;
      if (!f.dead) f.label.setText(`${c.name}${c.phaseLabel ? ` · ${c.phaseLabel}` : ""}  ${formatCompact(Math.max(0, c.hp))}/${formatCompact(c.maxHp)}`);
      this.redrawBar(f);
    }
  }

  private combatant(id: string): BattleState["allies"][number] | null {
    const b = this.battle;
    if (!b) return null;
    return b.allies.find((c) => c.id === id) ?? b.enemies.find((c) => c.id === id) ?? null;
  }

  private createFighter(
    id: string,
    side: "ally" | "enemy",
    dead: boolean,
    sheets?: Record<string, string>,
  ): void {
    const layout = computeLayout(this.mode, this.scale.width, this.scale.height, this.battle?.allies.length ?? 1);
    const index = side === "ally" ? Math.max(0, this.battle?.allies.findIndex((c) => c.id === id) ?? 0) : 0;
    const view: FighterView = {
      id,
      side,
      sprite: null,
      bar: null,
      label: null,
      base: layout.enemy,
      index,
      dead,
    };
    view.base = this.basePoint(view, layout);
    const base = view.base;
    const c = this.combatant(id);
    view.label = this.add
      .text(base.x, base.y, c ? `${c.name}  ${formatCompact(c.hp)}/${formatCompact(c.maxHp)}` : id, {
        fontSize: "13px",
        color: "#f7eec2",
        backgroundColor: "#1b1428cc",
        padding: { x: 8, y: 3 },
      })
      .setOrigin(0.5, 0)
      .setDepth(10);
    view.bar = this.add.graphics().setDepth(9);
    this.fighters.set(id, view);

    // As 4 folhas de combate (idle/attack/hurt/death) são carregadas JUNTAS:
    // cada animação usa a sua própria folha (§60 — ataque/dano/morte visíveis).
    const urls = {} as Record<SheetName, string>;
    for (const name of SHEET_NAMES) {
      const url = sheets?.[name] ? assetUrl(sheets[name]) : null;
      if (!url) {
        // §62 — ausência de arte é bloqueio visível, nunca silenciosa.
        this.setNotice(`assets ausentes: ${name} (§62)`);
        return;
      }
      urls[name] = url;
    }
    const pending = SHEET_NAMES.map((n) => urls[n]).filter((u) => !this.textures.exists(u));
    if (pending.length === 0) {
      this.spawnSprite(view, urls);
      return;
    }
    for (const u of pending) {
      if (this.loadingSheets.has(u)) continue;
      this.loadingSheets.add(u);
      this.load.spritesheet(u, u, SHEET_FRAMES);
    }
    this.load.once("complete", () => {
      for (const u of pending) this.loadingSheets.delete(u);
      // a cena pode ter sido reconstruída enquanto carregava
      if (this.fighters.get(view.id) !== view) return;
      if (SHEET_NAMES.every((n) => this.textures.exists(urls[n]))) this.spawnSprite(view, urls);
    });
    this.load.start();
  }

  private spawnSprite(view: FighterView, urls: Record<SheetName, string>): void {
    const row = view.side === "ally" ? ROW_RIGHT : ROW_LEFT;
    const rate: Record<SheetName, number> = { idle: 7, attack: 12, hurt: 12, death: 8 };
    for (const name of SHEET_NAMES) {
      const key = `${urls[name]}:${row}`;
      if (this.anims.exists(key)) continue;
      const start = row * FRAME_COUNT;
      this.anims.create({
        key,
        frames: Array.from({ length: FRAME_COUNT }, (_, k) => ({ key: urls[name], frame: start + k })),
        frameRate: rate[name],
        repeat: name === "idle" ? -1 : 0,
      });
    }
    view.anims = {
      idle: `${urls.idle}:${row}`,
      attack: `${urls.attack}:${row}`,
      hurt: `${urls.hurt}:${row}`,
      death: `${urls.death}:${row}`,
    };

    const sprite = this.add
      .sprite(view.base.x, view.base.y, urls.idle, row * FRAME_COUNT)
      .setOrigin(0.5, 1)
      .setScale(this.scaleFor(view))
      .setDepth(5);
    // Cor do andar (ADR-021): só apresentação, vinda do dado do andar via engine.
    const tint = this.combatant(view.id)?.tint;
    if (tint !== undefined) sprite.setTint(tint);
    if (view.dead) {
      // já nasce caído: último quadro da folha de morte, esmaecido
      sprite.setTexture(urls.death, row * FRAME_COUNT + FRAME_COUNT - 1).setAlpha(0.25);
    } else {
      sprite.play(view.anims.idle);
    }
    view.sprite = sprite;
    this.placeChrome(view);
    this.setNotice(null);
  }

  /** Toca uma animação de ação e volta ao idle ao terminar (se vivo). */
  private playAction(view: FighterView, name: "attack" | "hurt"): void {
    const sprite = view.sprite;
    if (!sprite || !view.anims || view.dead) return;
    sprite.play(view.anims[name], true);
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      if (!view.dead && view.sprite && view.anims) view.sprite.play(view.anims.idle, true);
    });
  }

  private setNotice(text: string | null): void {
    if (!this.notice) return;
    if (!text) {
      this.notice.setVisible(false);
      return;
    }
    this.notice.setText(text).setVisible(true);
  }

  // -----------------------------------------------------------------
  // Apresentação dos eventos (§60/§66) — tudo configurável em BattleRenderer.
  // -----------------------------------------------------------------

  private applyFeedback(
    event: BattleEvent,
    plan: import("./BattleRenderer").FeedbackPlan,
  ): void {
    if (plan.sfx) playSfx(plan.sfx);

    const target = "targetId" in event && event.targetId ? String(event.targetId) : undefined;
    const source = "sourceId" in event && event.sourceId ? String(event.sourceId) : undefined;
    const targetView = target ? this.fighters.get(target) : undefined;
    const sourceView = source ? this.fighters.get(source) : undefined;

    if (plan.lunge && sourceView) this.playAction(sourceView, "attack");
    if (plan.lunge && sourceView?.sprite && !REDUCED_MOTION) {
      const dir = sourceView.side === "ally" ? 1 : -1;
      this.tweens.add({
        targets: sourceView.sprite,
        x: sourceView.base.x + dir * 34,
        duration: 90,
        yoyo: true,
        ease: "Quad.easeOut",
      });
    }

    if (plan.skillName && sourceView) {
      const skillId = "skillId" in event && event.skillId ? String(event.skillId) : undefined;
      const name = (skillId && skillsById[skillId]?.name) || "Skill";
      const label = this.add
        .text(sourceView.base.x, sourceView.base.y - 128 * this.scaleFor(sourceView) - 28, name, {
          fontSize: "14px",
          color: "#ffd873",
          backgroundColor: "#2a1c00cc",
          padding: { x: 8, y: 3 },
        })
        .setOrigin(0.5, 1)
        .setDepth(20);
      this.tweens.add({
        targets: label,
        y: label.y - 18,
        alpha: 0,
        delay: 380,
        duration: 320,
        onComplete: () => label.destroy(),
      });
    }

    if (plan.flash && targetView?.sprite) {
      targetView.sprite.setTintFill(0xffffff);
      this.time.delayedCall(90, () => targetView.sprite?.clearTint());
      if ("kind" in event && (event as { kind?: string }).kind !== "heal") {
        this.playAction(targetView, "hurt");
      }
    }

    if (plan.number && targetView) {
      this.floatNumber(targetView, plan.number);
    }

    if (plan.shakeMs && !REDUCED_MOTION) {
      this.cameras.main.shake(plan.shakeMs, plan.shakeIntensity ?? 0.003);
    }

    if (plan.death && targetView) {
      this.killFighter(targetView);
    }

    if (plan.revive && targetView) {
      this.reviveFighter(targetView);
    }

    if (plan.label && sourceView) {
      this.floatNumber(sourceView, { text: plan.label, kind: "mitigated" });
    }

    if (plan.phase && targetView) {
      this.showPhase(plan.phase, targetView);
    }

    if (plan.banner) {
      this.showBanner(plan.banner, plan.bannerText);
    }
  }

  /** Poção de reviver: o herói levanta (cancela o fade da morte) e a luta segue. */
  private reviveFighter(view: FighterView): void {
    view.dead = false;
    const sprite = view.sprite;
    if (!sprite) return;
    this.tweens.killTweensOf(sprite);
    sprite.setAlpha(1);
    const tint = this.combatant(view.id)?.tint;
    if (tint !== undefined) sprite.setTint(tint);
    else sprite.clearTint();
    if (view.anims) sprite.play(view.anims.idle, true);
    this.floatNumber(view, { text: "REVIVEU!", kind: "heal" });
  }

  private killFighter(view: FighterView): void {
    view.dead = true;
    const sprite = view.sprite;
    if (!sprite) return;
    if (view.anims) sprite.play(view.anims.death, true);
    this.tweens.add({
      targets: sprite,
      alpha: 0.15,
      delay: 420,
      duration: 420,
    });
  }

  private floatNumber(
    view: FighterView,
    number: NonNullable<import("./BattleRenderer").FeedbackPlan["number"]>,
  ): void {
    // §68 — o tamanho comunica a importância: crítico > dano > detalhes.
    const style: Record<typeof number.kind, { size: string; color: string; stroke: string }> = {
      crit: { size: "26px", color: "#ffdf6e", stroke: "#7a2b00" },
      damage: { size: "18px", color: "#ff8d6e", stroke: "#5c1400" },
      heal: { size: "18px", color: "#7dff9e", stroke: "#0b4d22" },
      mitigated: { size: "12px", color: "#b9a8d8", stroke: "#2a2140" },
    } as const;
    const s = style[number.kind];
    const jitter = (Math.random() - 0.5) * 40;
    const text = this.add
      .text(view.base.x + jitter, view.base.y - 128 * this.scaleFor(view) - 10, number.text, {
        fontSize: s.size,
        color: s.color,
        stroke: s.stroke,
        strokeThickness: 4,
        fontStyle: "bold",
      })
      .setOrigin(0.5, 1)
      .setDepth(30);
    if (number.kind === "crit" && !REDUCED_MOTION) {
      text.setScale(0.6);
      this.tweens.add({ targets: text, scale: 1, duration: 120, ease: "Back.easeOut" });
    }
    this.tweens.add({
      targets: text,
      y: text.y - 52,
      alpha: 0,
      delay: number.kind === "crit" ? 320 : 160,
      duration: 480,
      onComplete: () => text.destroy(),
    });
  }

  /** O chefe entrou em nova fase (ADR-027): faixa laranja, tremor e pulso vermelho no sprite. */
  private showPhase(text: string, view: FighterView): void {
    if (view.sprite && !REDUCED_MOTION) {
      view.sprite.setTintFill(0xff3b3b);
      this.time.delayedCall(220, () => {
        const tint = this.combatant(view.id)?.tint;
        if (tint !== undefined) view.sprite?.setTint(tint);
        else view.sprite?.clearTint();
      });
      this.cameras.main.shake(260, 0.006);
    }
    const banner = this.add
      .text(this.scale.width / 2, this.scale.height * 0.2, text.toUpperCase(), {
        fontSize: "26px",
        color: "#ff9a5a",
        stroke: "#1b1428",
        strokeThickness: 6,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(50)
      .setAlpha(0);
    this.tweens.add({ targets: banner, alpha: 1, duration: 160 });
    this.tweens.add({ targets: banner, alpha: 0, delay: 1300, duration: 400, onComplete: () => banner.destroy() });
  }

  private showBanner(kind: "won" | "lost", override?: string): void {
    const text = override ?? (kind === "won" ? "VITÓRIA!" : "DERROTA");
    const color = kind === "won" ? "#ffd873" : "#ff6e6e";
    const banner = this.add
      .text(this.scale.width / 2, this.scale.height * 0.36, text, {
        fontSize: "42px",
        color,
        stroke: "#1b1428",
        strokeThickness: 8,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(50)
      .setAlpha(0);
    if (!REDUCED_MOTION) banner.setScale(0.7);
    this.tweens.add({
      targets: banner,
      alpha: 1,
      scale: 1,
      duration: 220,
      ease: "Back.easeOut",
    });
    this.tweens.add({
      targets: banner,
      alpha: 0,
      delay: 1500,
      duration: 420,
      onComplete: () => banner.destroy(),
    });
  }
}

export const TOWER_SCENE_KEY = "battle";
