/**
 * BattleScene — apresentação da batalha (§63, §64, §60, §66, ADR-029).
 *
 * O que a cena mostra, de baixo para cima:
 *   1. ARENA (`Arena.ts`) — parede + piso de ladrilhos do pack, com tema por andar;
 *   2. COMBATENTES — sprites das folhas idle/walk/attack/hurt/death, sombra, nome e barra;
 *   3. EFEITOS — corte/faísca/fogo/raio/cura do pack (`vfxAtlas.ts`), números, banners.
 *
 * Fluxo de uma caçada (o que o jogador vê):
 *   - PROCURANDO (~3 s): o herói ANDA para a direita e o cenário rola para a esquerda;
 *   - o INIMIGO ENTRA pela direita caminhando, e o cenário para;
 *   - luta: ataque/dano/skill/morte com efeitos;
 *   - vitória: a cena segura o corpo caído por um instante e volta a andar.
 *
 * A cena PUXA os dados (`getView()` a cada frame) em vez de receber empurrões
 * do React — ver `battleSource.ts` (causa raiz do bug da tela preta).
 * O renderer só apresenta — as fórmulas vivem no engine (§64).
 */
import { formatCompact } from "../format.js";
import Phaser from "phaser";
import type { BattleEvent, BattleState } from "@tia/contracts";
import { skillsById } from "@tia/config";
import { type AssetManifest, assetUrl } from "./assets";
import { Arena } from "./Arena";
import { arenaThemeFor, DEFAULT_THEME_ID, themeAssetIds } from "./arenaThemes";
import { battleFeedbackQueue, planBatch, type FeedbackPlan, type VfxRequest } from "./BattleRenderer";
import { EMPTY_VIEW, type BattleViewSource, type IdleActor } from "./battleSource";
import { playSfx } from "./sfx";
import { VFX_ATLAS, VFX_KINDS, type VfxKind, vfxFrameName, vfxScale } from "./vfxAtlas";

export interface BattleSceneData {
  manifest: AssetManifest;
  getView: BattleViewSource;
}

/** §68 — `prefers-reduced-motion` corta tremor/avanço/rolagem; números e banner ficam. */
function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const REDUCED_MOTION = prefersReducedMotion();

/** Tudo que é número de apresentação mora aqui (editável sem tocar na lógica da cena). */
export const BATTLE_PRESENTATION = {
  /** Velocidade de caminhada, em alturas-do-canvas por segundo. */
  walkSpeed: 0.55,
  /** Duração da entrada do inimigo (ms). */
  enterMs: 520,
  /** Quanto a cena segura o fim da luta (corpo caído, banner) antes de voltar a andar (ms). */
  holdMs: 1500,
  /** Altura aproximada do personagem dentro do quadro 256×256 das folhas (feet = base do quadro). */
  characterHeight: 192,
  /** Escala do sprite por pixel de altura do canvas. */
  scalePerCanvasPx: 0.0022,
} as const;

export interface LayoutPoint {
  x: number;
  y: number;
}

/**
 * Posição dos combatentes (§63): aliado à esquerda, inimigo à direita,
 * `y` = linha dos PÉS. Dado o TAMANHO REAL do canvas — nunca `innerWidth`.
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
    return { ally: allies[0]!, allies, enemy: { x: width * 0.74, y: height * 0.76 } };
  }
  const ally = { x: width * 0.3, y: height * 0.76 };
  return { ally, allies: [ally], enemy: { x: width * 0.7, y: height * 0.76 } };
}

type SheetName = "idle" | "walk" | "attack" | "hurt" | "death";
/** Sem estas a luta não pode ser desenhada; `walk` é opcional (cai no `idle`). */
const REQUIRED_SHEETS: readonly SheetName[] = ["idle", "attack", "hurt", "death"];
const ALL_SHEETS: readonly SheetName[] = ["idle", "walk", "attack", "hurt", "death"];

const SHEET_FRAMES = { frameWidth: 256, frameHeight: 256 };
/** rows do sheet Nika (README_IMPORT): 0=down, 1=up, 2=left, 3=right. */
const ROW_LEFT = 2;
const ROW_RIGHT = 3;
const FRAME_COUNT = 4;

type AnimKeys = Partial<Record<SheetName, string>>;

interface FighterView {
  id: string;
  side: "ally" | "enemy";
  sprite: Phaser.GameObjects.Sprite | null;
  shadow: Phaser.GameObjects.Ellipse | null;
  bar: Phaser.GameObjects.Graphics | null;
  label: Phaser.GameObjects.Text | null;
  base: LayoutPoint;
  /** Posição do aliado na formação (0 = primeiro). */
  index: number;
  dead: boolean;
  /** Ainda caminhando até o ponto de luta (nome/barra aparecem ao chegar). */
  entering: boolean;
  anims?: AnimKeys;
}

interface Walker {
  heroId: string;
  sprite: Phaser.GameObjects.Sprite | null;
  shadow: Phaser.GameObjects.Ellipse | null;
  anims?: AnimKeys;
  state: "idle" | "walk" | null;
}

export class BattleScene extends Phaser.Scene {
  private data_: BattleSceneData = {
    manifest: { version: 0, entries: {}, missing: [], orphaned: [] },
    getView: () => EMPTY_VIEW,
  };
  private battle: BattleState | null = null;
  private mode: "tower" | "boss" = "tower";
  private readonly fighters = new Map<string, FighterView>();
  private notice: Phaser.GameObjects.Text | null = null;
  private built = false;

  private arena: Arena | null = null;
  private themeId: string | null = null;
  private walker: Walker | null = null;
  private holdUntil = 0;
  private enterUntil = 0;

  private readonly loadingKeys = new Set<string>();
  private readonly failedKeys = new Set<string>();
  private readonly waiters: Array<{ keys: string[]; cb: () => void }> = [];
  private vfxReady = false;

  constructor() {
    super({ key: "battle" });
  }

  init(data: BattleSceneData): void {
    this.data_ = { ...this.data_, ...data };
    this.mode = "tower";
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#0b0a12");
    this.arena = new Arena(this, arenaThemeFor(DEFAULT_THEME_ID), (id) => this.textureKey(id));
    this.notice = this.add
      .text(this.scale.width / 2, this.scale.height * 0.2, "", {
        fontSize: "14px",
        color: "#f7eec2",
        backgroundColor: "#000000cc",
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(100)
      .setVisible(false);

    this.load.on(Phaser.Loader.Events.COMPLETE, this.flushWaiters, this);
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, this.onFileError, this);
    this.scale.on("resize", this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off("resize", this.onResize, this);
      this.load.off(Phaser.Loader.Events.COMPLETE, this.flushWaiters, this);
      this.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, this.onFileError, this);
      this.arena?.destroy();
    });

    this.loadVfx();
    // Arena do tema padrão desde o 1º frame (o tema do andar chega em `syncView`).
    this.themeId = null;
    this.syncView();
  }

  override update(_time: number, delta: number): void {
    this.syncView();
    this.arena?.update(delta);
    this.refreshHealth();
    const events = battleFeedbackQueue.drain();
    if (events.length > 0) {
      for (const { event, plan } of planBatch(events)) this.applyFeedback(event, plan);
    }
  }

  /** Estado interno para diagnóstico/testes de navegador (`window.__tia` em build de debug). */
  debugSnapshot(): Record<string, unknown> {
    return {
      battleId: this.battle?.battleId ?? null,
      fighters: [...this.fighters.values()].map((f) => ({ id: f.id, side: f.side, hasSprite: f.sprite !== null, entering: f.entering, dead: f.dead })),
      walker: this.walker ? { heroId: this.walker.heroId, hasSprite: this.walker.sprite !== null, state: this.walker.state } : null,
      arena: this.arena ? { theme: this.arena.themeId, speed: this.arena.currentSpeed, distance: Math.round(this.arena.distance) } : null,
      vfxReady: this.vfxReady,
      notice: this.notice?.visible ? this.notice.text : null,
      size: [this.scale.width, this.scale.height],
    };
  }

  // -----------------------------------------------------------------
  // Texturas (carga assíncrona com fila de espera)
  // -----------------------------------------------------------------

  private textureKey(assetId: string): string | null {
    const url = assetUrl(assetId);
    return url && this.textures.exists(url) ? url : null;
  }

  /** Garante as texturas e chama `cb` quando todas existem (ou falharam). */
  private ensure(items: Array<{ key: string; sheet: boolean }>, cb: () => void): void {
    let started = false;
    for (const item of items) {
      if (this.textures.exists(item.key) || this.loadingKeys.has(item.key) || this.failedKeys.has(item.key)) continue;
      this.loadingKeys.add(item.key);
      if (item.sheet) this.load.spritesheet(item.key, item.key, SHEET_FRAMES);
      else this.load.image(item.key, item.key);
      started = true;
    }
    this.waiters.push({ keys: items.map((i) => i.key), cb });
    if (started && !this.load.isLoading()) this.load.start();
    this.flushWaiters();
  }

  private flushWaiters(): void {
    for (let i = this.waiters.length - 1; i >= 0; i -= 1) {
      const w = this.waiters[i]!;
      if (w.keys.every((k) => this.textures.exists(k) || this.failedKeys.has(k))) {
        this.waiters.splice(i, 1);
        w.cb();
      }
    }
  }

  private onFileError(file: { key: string }): void {
    this.failedKeys.add(file.key);
    this.loadingKeys.delete(file.key);
  }

  // -----------------------------------------------------------------
  // Efeitos do pack (VFX)
  // -----------------------------------------------------------------

  private loadVfx(): void {
    const items = VFX_KINDS.flatMap((k) => {
      const url = assetUrl(VFX_ATLAS[k].assetId);
      return url ? [{ key: url, sheet: false }] : [];
    });
    this.ensure(items, () => {
      for (const kind of VFX_KINDS) {
        const def = VFX_ATLAS[kind];
        const url = assetUrl(def.assetId);
        if (!url || !this.textures.exists(url)) continue;
        const tex = this.textures.get(url);
        const frames = def.rects.map((r, i) => {
          const name = vfxFrameName(kind, i);
          if (!tex.has(name)) tex.add(name, 0, r[0], r[1], r[2], r[3]);
          return { key: url, frame: name };
        });
        const animKey = `vfx:${kind}`;
        if (!this.anims.exists(animKey)) this.anims.create({ key: animKey, frames, frameRate: def.fps, repeat: 0 });
      }
      this.vfxReady = true;
    });
  }

  private playVfx(kind: VfxKind, view: FighterView, opts: { scale?: number; flip?: boolean }): void {
    if (!this.vfxReady) return;
    const def = VFX_ATLAS[kind];
    const url = assetUrl(def.assetId);
    if (!url || !this.anims.exists(`vfx:${kind}`)) return;
    const s = this.scaleFor(view);
    const fighterH = BATTLE_PRESENTATION.characterHeight * s;
    const y = def.anchor === "bottom" ? view.base.y : view.base.y - fighterH * 0.5;
    const sprite = this.add
      .sprite(view.sprite?.x ?? view.base.x, y, url, vfxFrameName(kind, 0))
      .setOrigin(0.5, def.anchor === "bottom" ? 1 : 0.5)
      .setScale(vfxScale(def, fighterH) * (opts.scale ?? 1))
      .setFlipX(opts.flip === true)
      .setDepth(12);
    if (def.blend === "add") sprite.setBlendMode(Phaser.BlendModes.ADD);
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => sprite.destroy());
    sprite.play(`vfx:${kind}`);
  }

  // -----------------------------------------------------------------
  // Sincronização com o estado do jogo (PULL)
  // -----------------------------------------------------------------

  private syncView(): void {
    const view = this.data_.getView();
    const now = this.time?.now ?? 0;

    if (view.theme !== this.themeId) {
      this.themeId = view.theme;
      this.applyTheme(view.theme);
    }

    const battle = view.battle;
    if (battle) {
      this.holdUntil = 0;
      if (this.battle?.battleId !== battle.battleId || !this.built) {
        this.battle = battle;
        this.removeWalker();
        this.rebuild();
      } else {
        this.battle = battle;
      }
      // O cenário só rola enquanto o inimigo está entrando.
      this.arena?.setSpeed(now < this.enterUntil ? this.walkSpeed() : 0);
      return;
    }

    if (this.battle) {
      // Luta acabou: segura corpo caído/banner e só então volta a andar.
      if (this.holdUntil === 0) this.holdUntil = now + BATTLE_PRESENTATION.holdMs;
      if (now >= this.holdUntil) {
        this.battle = null;
        this.holdUntil = 0;
        this.clearFighters();
      } else {
        this.arena?.setSpeed(0);
        return;
      }
    }
    this.syncWalker(view.hero, view.walking);
  }

  private applyTheme(themeId: string): void {
    const theme = arenaThemeFor(themeId);
    const items = themeAssetIds(theme).flatMap((id) => {
      const url = assetUrl(id);
      return url ? [{ key: url, sheet: false }] : [];
    });
    this.ensure(items, () => {
      if (this.themeId !== themeId) return; // o tema mudou de novo enquanto carregava
      this.arena?.setTheme(theme);
      this.arena?.layout(this.scale.width, this.scale.height);
    });
  }

  private walkSpeed(): number {
    return REDUCED_MOTION ? 0 : this.scale.height * BATTLE_PRESENTATION.walkSpeed;
  }

  // -----------------------------------------------------------------
  // Herói fora da luta (andando entre inimigos)
  // -----------------------------------------------------------------

  private syncWalker(hero: IdleActor | null, walking: boolean): void {
    if (!hero) {
      this.removeWalker();
      this.arena?.setSpeed(0);
      this.setNotice("Coloque um herói na equipe e escolha quem luta.");
      return;
    }
    this.setNotice(null);
    if (!this.walker || this.walker.heroId !== hero.id) {
      this.removeWalker();
      this.createWalker(hero);
    }
    const w = this.walker;
    if (w?.sprite && w.anims) {
      const want: "idle" | "walk" = walking && !REDUCED_MOTION ? "walk" : "idle";
      if (w.state !== want) {
        w.state = want;
        w.sprite.play(w.anims[want] ?? w.anims.idle!, true);
      }
    }
    this.arena?.setSpeed(walking ? this.walkSpeed() : 0);
  }

  private createWalker(hero: IdleActor): void {
    const walker: Walker = { heroId: hero.id, sprite: null, shadow: null, state: null };
    this.walker = walker;
    const urls = this.sheetUrls(hero.sprites, ["idle", "walk"]);
    if (!urls.idle) {
      this.setNotice("Arte do herói ausente (idle).");
      return;
    }
    this.ensure(this.sheetItems(urls), () => {
      if (this.walker !== walker || !urls.idle || !this.textures.exists(urls.idle)) return;
      const layout = computeLayout("tower", this.scale.width, this.scale.height);
      const scale = this.spriteScale();
      walker.anims = this.buildAnims(urls, ROW_RIGHT);
      walker.shadow = this.makeShadow(layout.ally, scale);
      walker.sprite = this.add
        .sprite(layout.ally.x, layout.ally.y, urls.idle, ROW_RIGHT * FRAME_COUNT)
        .setOrigin(0.5, 1)
        .setScale(scale)
        .setDepth(5);
      walker.state = null; // o próximo `syncWalker` escolhe idle/walk
    });
  }

  private removeWalker(): void {
    this.walker?.sprite?.destroy();
    this.walker?.shadow?.destroy();
    this.walker = null;
  }

  // -----------------------------------------------------------------
  // Combatentes
  // -----------------------------------------------------------------

  private onResize(gameSize: Phaser.Structs.Size): void {
    this.cameras.main.setSize(gameSize.width, gameSize.height);
    this.arena?.layout(gameSize.width, gameSize.height);
    this.relayout();
    if (this.walker?.sprite) {
      const layout = computeLayout("tower", gameSize.width, gameSize.height);
      const s = this.spriteScale();
      this.walker.sprite.setPosition(layout.ally.x, layout.ally.y).setScale(s);
      this.placeShadow(this.walker.shadow, layout.ally, s);
    }
  }

  private rebuild(): void {
    const battle = this.battle;
    this.clearFighters();
    if (!battle) return;
    this.setNotice(null);
    this.mode = battle.mode === "boss" ? "boss" : "tower";
    for (const c of battle.allies) this.createFighter(c.id, "ally", c.hp <= 0, c.sprites, false);
    for (const c of battle.enemies) this.createFighter(c.id, "enemy", c.hp <= 0, c.sprites, c.hp > 0 && !REDUCED_MOTION);
    this.built = true;
    this.relayout();
    this.refreshHealth();
    if (!REDUCED_MOTION && battle.enemies.some((e) => e.hp > 0)) this.enterUntil = (this.time?.now ?? 0) + BATTLE_PRESENTATION.enterMs;
  }

  private clearFighters(): void {
    for (const f of this.fighters.values()) {
      if (f.sprite) this.tweens.killTweensOf(f.sprite);
      f.sprite?.destroy();
      f.shadow?.destroy();
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
      if (f.sprite && !f.entering) f.sprite.setPosition(f.base.x, f.base.y);
      f.sprite?.setScale(this.scaleFor(f));
      this.placeChrome(f);
    }
  }

  /** Ponto-base (pés) do combatente; mantém nome e barra DENTRO do canvas. */
  private basePoint(f: FighterView, layout: ReturnType<typeof computeLayout>): LayoutPoint {
    const p = f.side === "ally" ? (layout.allies[f.index] ?? layout.ally) : layout.enemy;
    return { x: p.x, y: Math.min(p.y, this.scale.height - 40) };
  }

  /** Escala base do sprite: proporcional à ALTURA do canvas, limitada pela largura. */
  private spriteScale(): number {
    const byHeight = this.scale.height * BATTLE_PRESENTATION.scalePerCanvasPx;
    const byWidth = this.scale.width / 620;
    return Math.max(0.3, Math.min(1, byHeight, byWidth));
  }

  /** Escala do sprite: base × `scale` do combatente (chefe), encolhendo a equipe na Arena. */
  private scaleFor(f: FighterView): number {
    const c = this.combatant(f.id);
    let mul = c?.scale ?? 1;
    if (this.mode === "boss" && f.side === "ally") mul *= (this.battle?.allies.length ?? 1) > 2 ? 0.82 : 0.92;
    const cap = Math.max(0.3, (f.base.y - this.scale.height * 0.08) / BATTLE_PRESENTATION.characterHeight);
    return Math.min(this.spriteScale() * mul, cap);
  }

  private combatant(id: string): BattleState["allies"][number] | null {
    const b = this.battle;
    if (!b) return null;
    return b.allies.find((c) => c.id === id) ?? b.enemies.find((c) => c.id === id) ?? null;
  }

  private makeShadow(base: LayoutPoint, scale: number): Phaser.GameObjects.Ellipse {
    const e = this.add.ellipse(base.x, base.y - 3 * scale, 120 * scale, 26 * scale, 0x000000, 0.4).setDepth(3);
    return e;
  }

  private placeShadow(shadow: Phaser.GameObjects.Ellipse | null, base: LayoutPoint, scale: number): void {
    shadow?.setPosition(base.x, base.y - 3 * scale).setSize(120 * scale, 26 * scale).setDisplaySize(120 * scale, 26 * scale);
  }

  /** URLs das folhas pedidas (as que existem no manifesto). */
  private sheetUrls(sheets: Record<string, string> | undefined, names: readonly SheetName[]): Partial<Record<SheetName, string>> {
    const out: Partial<Record<SheetName, string>> = {};
    for (const name of names) {
      const id = sheets?.[name];
      const url = id ? assetUrl(id) : null;
      if (url) out[name] = url;
    }
    return out;
  }

  private sheetItems(urls: Partial<Record<SheetName, string>>): Array<{ key: string; sheet: boolean }> {
    return Object.values(urls).map((key) => ({ key, sheet: true }));
  }

  private buildAnims(urls: Partial<Record<SheetName, string>>, row: number): AnimKeys {
    const rate: Record<SheetName, number> = { idle: 7, walk: 10, attack: 12, hurt: 12, death: 8 };
    const keys: AnimKeys = {};
    for (const name of ALL_SHEETS) {
      const url = urls[name];
      if (!url || !this.textures.exists(url)) continue;
      const key = `${url}:${row}`;
      if (!this.anims.exists(key)) {
        const start = row * FRAME_COUNT;
        this.anims.create({
          key,
          frames: Array.from({ length: FRAME_COUNT }, (_, k) => ({ key: url, frame: start + k })),
          frameRate: rate[name],
          repeat: name === "idle" || name === "walk" ? -1 : 0,
        });
      }
      keys[name] = key;
    }
    return keys;
  }

  private createFighter(
    id: string,
    side: "ally" | "enemy",
    dead: boolean,
    sheets: Record<string, string> | undefined,
    entering: boolean,
  ): void {
    const layout = computeLayout(this.mode, this.scale.width, this.scale.height, this.battle?.allies.length ?? 1);
    const index = side === "ally" ? Math.max(0, this.battle?.allies.findIndex((c) => c.id === id) ?? 0) : 0;
    const view: FighterView = {
      id,
      side,
      sprite: null,
      shadow: null,
      bar: null,
      label: null,
      base: layout.enemy,
      index,
      dead,
      entering,
    };
    view.base = this.basePoint(view, layout);
    const base = view.base;
    const c = this.combatant(id);
    view.label = this.add
      .text(base.x, base.y + 4, c ? `${c.name}  ${formatCompact(c.hp)}/${formatCompact(c.maxHp)}` : id, {
        fontSize: "13px",
        color: "#f7eec2",
        backgroundColor: "#1b1428cc",
        padding: { x: 8, y: 3 },
      })
      .setOrigin(0.5, 0)
      .setDepth(10)
      .setVisible(!entering);
    view.bar = this.add.graphics().setDepth(9).setVisible(!entering);
    this.fighters.set(id, view);

    // §62 — ausência de arte é bloqueio visível, nunca silenciosa.
    const urls = this.sheetUrls(sheets, ALL_SHEETS);
    const missing = REQUIRED_SHEETS.filter((n) => !urls[n]);
    if (missing.length > 0) {
      this.setNotice(`Arte ausente: ${c?.name ?? id} (${missing.join(", ")}) — rode npm run assets:build`);
      return;
    }
    this.ensure(this.sheetItems(urls), () => {
      // a cena pode ter sido reconstruída enquanto carregava
      if (this.fighters.get(view.id) !== view) return;
      if (REQUIRED_SHEETS.every((n) => urls[n] && this.textures.exists(urls[n]!))) this.spawnSprite(view, urls);
      else this.setNotice(`Arte não carregou: ${c?.name ?? id}`);
    });
  }

  private spawnSprite(view: FighterView, urls: Partial<Record<SheetName, string>>): void {
    const row = view.side === "ally" ? ROW_RIGHT : ROW_LEFT;
    view.anims = this.buildAnims(urls, row);
    const idleKey = view.anims.idle!;
    const scale = this.scaleFor(view);
    const startX = view.entering ? this.scale.width + 130 * scale : view.base.x;

    view.shadow = this.makeShadow({ x: startX, y: view.base.y }, scale);
    const sprite = this.add
      .sprite(startX, view.base.y, urls.idle!, row * FRAME_COUNT)
      .setOrigin(0.5, 1)
      .setScale(scale)
      .setDepth(5);
    // Cor do andar (ADR-021): só apresentação, vinda do dado do andar via engine.
    const tint = this.combatant(view.id)?.tint;
    if (tint !== undefined) sprite.setTint(tint);
    view.sprite = sprite;

    if (view.dead) {
      // já nasce caído: último quadro da folha de morte, esmaecido
      sprite.setTexture(urls.death!, row * FRAME_COUNT + FRAME_COUNT - 1).setAlpha(0.25);
      view.entering = false;
    } else if (view.entering) {
      sprite.play(view.anims.walk ?? idleKey);
      this.tweens.add({
        targets: [sprite, view.shadow],
        x: view.base.x,
        duration: BATTLE_PRESENTATION.enterMs,
        ease: "Sine.easeOut",
        onComplete: () => {
          view.entering = false;
          if (!view.dead && view.sprite && view.anims) view.sprite.play(view.anims.idle!, true);
          this.placeChrome(view);
        },
      });
    } else {
      sprite.play(idleKey);
    }
    this.placeChrome(view);
    this.placeShadow(view.shadow, { x: sprite.x, y: view.base.y }, scale);
    this.setNotice(null);
  }

  /** Toca uma animação de ação e volta ao idle ao terminar (se vivo). */
  private playAction(view: FighterView, name: "attack" | "hurt"): void {
    const sprite = view.sprite;
    const key = view.anims?.[name];
    if (!sprite || !key || view.dead || view.entering) return;
    sprite.play(key, true);
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      if (!view.dead && !view.entering && view.sprite && view.anims) view.sprite.play(view.anims.idle!, true);
    });
  }

  private placeChrome(f: FighterView): void {
    const visible = !f.entering;
    f.label?.setPosition(f.base.x, f.base.y + 4).setVisible(visible);
    f.bar?.setVisible(visible);
    if (visible) this.redrawBar(f);
  }

  private redrawBar(f: FighterView): void {
    if (!f.bar) return;
    const s = this.scaleFor(f);
    const width = Math.max(64, 160 * s);
    const height = 7;
    const x = f.base.x - width / 2;
    const y = f.base.y + 30;
    const c = this.combatant(f.id);
    const ratio = c && c.maxHp > 0 ? Math.max(0, Math.min(1, c.hp / c.maxHp)) : 0;
    f.bar.clear();
    f.bar.fillStyle(0x241c33, 1);
    f.bar.fillRect(x, y, width, height);
    if (this.battle) {
      f.bar.fillStyle(f.side === "ally" ? 0x6cc26c : 0xc26c6c, 1);
      f.bar.fillRect(x, y, width * ratio, height);
    }
  }

  private refreshHealth(): void {
    for (const f of this.fighters.values()) {
      const c = this.combatant(f.id);
      if (!c || !f.label) continue;
      if (!f.dead) f.label.setText(`${c.name}${c.phaseLabel ? ` · ${c.phaseLabel}` : ""}  ${formatCompact(Math.max(0, c.hp))}/${formatCompact(c.maxHp)}`);
      if (!f.entering) this.redrawBar(f);
    }
  }

  private setNotice(text: string | null): void {
    if (!this.notice) return;
    if (!text) {
      this.notice.setVisible(false);
      return;
    }
    this.notice.setPosition(this.scale.width / 2, this.scale.height * 0.2).setText(text).setVisible(true);
  }

  // -----------------------------------------------------------------
  // Apresentação dos eventos (§60/§66) — tudo configurável em BattleRenderer.
  // -----------------------------------------------------------------

  private opponentOf(view: FighterView | undefined): FighterView | undefined {
    if (!view) return undefined;
    for (const f of this.fighters.values()) if (f.side !== view.side && !f.dead) return f;
    return undefined;
  }

  private applyFeedback(event: BattleEvent, plan: FeedbackPlan): void {
    if (plan.sfx) playSfx(plan.sfx);

    // Eventos de ação (`attack_started`, `skill_used`) trazem `actorId`; os de dano, `sourceId`.
    const target = "targetId" in event && event.targetId ? String(event.targetId) : undefined;
    const source =
      "sourceId" in event && event.sourceId
        ? String(event.sourceId)
        : "actorId" in event && event.actorId
          ? String(event.actorId)
          : undefined;
    const targetView = target ? this.fighters.get(target) : undefined;
    const sourceView = source ? this.fighters.get(source) : undefined;

    if (plan.lunge && sourceView) this.playAction(sourceView, "attack");
    if (plan.lunge && sourceView?.sprite && !REDUCED_MOTION && !sourceView.entering) {
      const dir = sourceView.side === "ally" ? 1 : -1;
      const reach = Math.max(36, Math.min(120, this.scale.width * 0.1));
      this.tweens.add({
        targets: [sourceView.sprite],
        x: sourceView.base.x + dir * reach,
        duration: 130,
        yoyo: true,
        ease: "Quad.easeOut",
      });
    }

    if (plan.skillName && sourceView) {
      const skillId = "skillId" in event && event.skillId ? String(event.skillId) : undefined;
      const name = (skillId && skillsById[skillId]?.name) || "Skill";
      const label = this.add
        .text(sourceView.base.x, sourceView.base.y - BATTLE_PRESENTATION.characterHeight * this.scaleFor(sourceView) - 22, name, {
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

    if (plan.vfx) {
      for (const req of plan.vfx) this.spawnVfx(req, sourceView, targetView);
    }

    if (plan.flash && targetView?.sprite) {
      targetView.sprite.setTintFill(0xffffff);
      this.time.delayedCall(90, () => {
        const tint = this.combatant(targetView.id)?.tint;
        if (tint !== undefined) targetView.sprite?.setTint(tint);
        else targetView.sprite?.clearTint();
      });
      if ("kind" in event && (event as { kind?: string }).kind !== "heal") {
        this.playAction(targetView, "hurt");
        if (!REDUCED_MOTION && !targetView.entering && !targetView.dead) {
          // recuo: o golpe empurra o alvo para longe do atacante
          const back = targetView.side === "ally" ? -1 : 1;
          this.tweens.add({ targets: [targetView.sprite], x: targetView.base.x + back * 12, duration: 70, yoyo: true });
        }
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

  private spawnVfx(req: VfxRequest, sourceView: FighterView | undefined, targetView: FighterView | undefined): void {
    const view = req.on === "source" ? sourceView : req.on === "opponent" ? this.opponentOf(sourceView) : targetView;
    if (!view) return;
    // O corte "vem" do atacante: vira o efeito quando o alvo é aliado (golpe vindo da direita).
    this.playVfx(req.kind, view, { scale: req.scale, flip: view.side === "ally" });
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
    if (view.anims?.idle) sprite.play(view.anims.idle, true);
    this.floatNumber(view, { text: "REVIVEU!", kind: "heal" });
  }

  private killFighter(view: FighterView): void {
    view.dead = true;
    const sprite = view.sprite;
    if (!sprite) return;
    this.tweens.killTweensOf(sprite);
    // morreu ainda "entrando": o tween (e o onComplete) foi cancelado — assenta no ponto de luta
    view.entering = false;
    sprite.setX(view.base.x);
    view.shadow?.setX(view.base.x);
    this.placeChrome(view);
    if (view.anims?.death) sprite.play(view.anims.death, true);
    this.tweens.add({
      targets: [sprite, view.shadow].filter((t): t is NonNullable<typeof t> => t !== null),
      alpha: 0.15,
      delay: 520,
      duration: 520,
    });
  }

  private floatNumber(view: FighterView, number: NonNullable<FeedbackPlan["number"]>): void {
    // §68 — o tamanho comunica a importância: crítico > dano > detalhes.
    const style: Record<typeof number.kind, { size: string; color: string; stroke: string }> = {
      crit: { size: "26px", color: "#ffdf6e", stroke: "#7a2b00" },
      damage: { size: "18px", color: "#ff8d6e", stroke: "#5c1400" },
      heal: { size: "18px", color: "#7dff9e", stroke: "#0b4d22" },
      mitigated: { size: "12px", color: "#b9a8d8", stroke: "#2a2140" },
    } as const;
    const s = style[number.kind];
    const jitter = (Math.random() - 0.5) * 40;
    const top = view.base.y - BATTLE_PRESENTATION.characterHeight * this.scaleFor(view);
    const text = this.add
      .text(view.base.x + jitter, top - 4, number.text, {
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
      .text(this.scale.width / 2, this.scale.height * 0.3, text, {
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
