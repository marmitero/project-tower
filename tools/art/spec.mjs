/**
 * Especificação do pipeline de arte (`docs/ART_PIPELINE.md`) — FONTE ÚNICA dos números.
 *
 * Tudo aqui foi MEDIDO nas folhas do pack Nika (ver `docs/ART_PIPELINE.md` §2) ou é
 * proposta marcada como CALIBRAR (ajustada no Lote 1 com os 3 pilotos). Editar um
 * limiar é editar este arquivo — nenhum outro módulo guarda número de arte.
 *
 * O renderer (`packages/config/src/atlas.ts`) espelha só o que precisa em runtime
 * (linhas, fps, célula); `tests/integration/art-pipeline.test.ts` garante que os dois
 * não divergem.
 */

export const ATLAS = Object.freeze({
  format: "ita-atlas-v1",
  /** Lado do quadro. */
  cell: 256,
  cols: 4,
  /** Ordem das linhas no atlas compacto (voltado à DIREITA). */
  rows: ["idle", "walk", "attack", "hurt", "death"],
  /** Pés do personagem: centro x e base y num quadro de 256. */
  anchor: { x: 128, y: 243 },
  /** Quadros 2–3 do idle ("respiração") ficam 4 px mais baixos. */
  idleBreathPx: 4,
  /** Margem mínima de pixel transparente nas bordas do quadro. */
  margin: 4,
  fps: { idle: 7, walk: 10, attack: 12, hurt: 12, death: 8 },
  loop: { idle: true, walk: true, attack: false, hurt: false, death: false },
});

/** Linhas do formato legado (pack Nika): 0 baixo, 1 cima, 2 esquerda, 3 direita. */
export const LEGACY = Object.freeze({
  cell: 256,
  cols: 4,
  rowLeft: 2,
  rowRight: 3,
  sheets: ["idle", "walk", "attack", "hurt", "death"],
});

/** Cor-chave das gerações. */
export const KEY = Object.freeze({ r: 255, g: 0, b: 255 });

/** Altura (px, quadro 0 do idle) por tipo — faixa medida; a normalização mira o ponto médio. */
export const HEIGHT_BY_KIND = Object.freeze({
  humanoid: [176, 192],
  low: [105, 125],
  flyer: [125, 140],
  elite: [190, 207],
  boss: [150, 200],
});

/** Personagem do pack que serve de atlas-guia por tipo (docs/ART_PIPELINE.md §4.1). */
export const GUIDE_BY_KIND = Object.freeze({
  humanoid: "hero",
  low: "slime",
  flyer: "bat",
  elite: "orc",
  boss: "boss",
});

/** Limiares de fidelidade — CALIBRAR no Lote 1. */
export const THRESHOLDS = Object.freeze({
  /** Desvio da base dos pés vs âncora (px). */
  anchorPx: { default: 3, death: 6 },
  /** Altura do idle vs alvo do tipo (± fração). */
  scaleTol: 0.08,
  /** Erro médio do perfil de movimento (fração da altura do idle): aprova ≤ ok, revisão ≤ review. */
  motion: { ok: 0.12, review: 0.2 },
  /** IoU da silhueta com o guia (quadro a quadro, média por animação). */
  iou: {
    idle: { ok: 0.55, review: 0.4 },
    walk: { ok: 0.55, review: 0.4 },
    attack: { ok: 0.45, review: 0.3 },
    hurt: { ok: 0.45, review: 0.3 },
    death: { ok: 0.45, review: 0.3 },
  },
  /** Fração máxima de pixels residuais "magenta" após o chroma key. */
  residualMagenta: 0.001,
  /**
   * "Cores significativas" (contadas em passos de 16 níveis por canal). Medido no pack: 31 (Arcanista,
   * paleta enxuta) a 620 (Esqueleto, sombreado suave) — o teto reprova só o que parece pintura/foto.
   */
  maxColours: 700,
});

/** Empacotamento final: paleta fixa por atlas (erro médio medido no pack ≈ 3/255, −80 % de bytes). */
export const PACK = Object.freeze({ colours: 64 });

/** Orçamentos de bytes (check:assets). */
export const BUDGET = Object.freeze({
  atlasBytes: 400 * 1024,
  arenaKitBytes: 250 * 1024,
  artTotalBytes: 25 * 1024 * 1024,
  /** Memória de textura (RGBA) por andar, com tudo em atlas compacto. */
  floorTextureBytes: 24 * 1024 * 1024,
});

/** Chroma key — mesmos números de `scripts/gen-item-icons.mjs` (já em produção). */
export const CHROMA = Object.freeze({ hard: 120, soft: 60, minChannel: 150, softMinChannel: 120 });

/** Arena: ladrilhos. */
export const ARENA = Object.freeze({
  /** Lado do ladrilho final. */
  tile: 128,
  /** Salto máximo de cor (distância média RGB 0–255) entre ladrilhos vizinhos. */
  maxSeamJump: 14,
  /** Luminância média aceitável do piso (0–1). */
  floorLuma: [0.1, 0.55],
});
