/**
 * Temas de arena — DADO puro, editável (§63, §64).
 *
 * Cada tema escolhe peças do pack Nika (`tileset/*`, 128×128, vista de
 * cima) para montar a arena de combate: uma parede ao fundo e um piso em
 * primeiro plano, mais adereços que passam enquanto o herói caminha até o
 * próximo inimigo. Os temas são ligados ao andar por `FloorVisual.theme`
 * (`packages/config/src/tower.ts`); tema desconhecido cai em `DEFAULT_THEME`.
 *
 * Tudo aqui são IDs do manifesto de assets: trocar a aparência de um andar
 * é editar esta tabela (ou, no futuro, o ContentPack pelo painel ADM).
 */

/**
 * Adereço de chão. As peças `tileset/environment/*` do pack são LADRILHOS
 * completos (o barril já vem sobre o piso), então um adereço substitui um
 * ladrilho da fileira do fundo — não é um sprite solto sobre o piso.
 */
export interface ArenaProp {
  /** ID do manifesto. */
  assetId: string;
  /** Peso relativo de sorteio entre os adereços do tema. */
  weight: number;
}

export interface ArenaTheme {
  id: string;
  /** Parede ao fundo: ladrilhos sorteados (repetem em faixa contínua). */
  wall: readonly string[];
  /** Parede com tocha, repetida a cada `torchEvery` ladrilhos. */
  torch: string | null;
  torchEvery: number;
  floor: readonly string[];
  props: readonly ArenaProp[];
  /** Cor multiplicada sobre parede e piso (0xRRGGBB); `0xffffff` = sem tintura. */
  tint: number;
}

export const DEFAULT_THEME_ID = "masmorra";

export const ARENA_THEMES: Readonly<Record<string, ArenaTheme>> = {
  masmorra: {
    id: "masmorra",
    wall: ["tileset/wall_a", "tileset/wall_b", "tileset/wall_a", "tileset/wall_crack"],
    torch: "tileset/wall_torch",
    torchEvery: 4,
    floor: ["tileset/floor_plain", "tileset/floor_cracked", "tileset/floor_plain", "tileset/floor_plain"],
    props: [
      { assetId: "tileset/environment/barrel", weight: 3 },
      { assetId: "tileset/environment/crate", weight: 3 },
      { assetId: "tileset/environment/pot", weight: 2 },
      { assetId: "tileset/environment/bones", weight: 2 },
      { assetId: "tileset/environment/rubble", weight: 2 },
    ],
    tint: 0xffffff,
  },
  "gelo e sombra": {
    id: "gelo e sombra",
    wall: ["tileset/wall_b", "tileset/wall_a", "tileset/wall_crack"],
    torch: "tileset/wall_torch",
    torchEvery: 6,
    floor: ["tileset/floor_light", "tileset/floor_plain", "tileset/floor_light"],
    props: [
      { assetId: "tileset/environment/skull", weight: 2 },
      { assetId: "tileset/environment/rubble", weight: 2 },
    ],
    tint: 0xb8d4ff,
  },
  "sangue e brasa": {
    id: "sangue e brasa",
    wall: ["tileset/wall_a", "tileset/wall_crack", "tileset/wall_b"],
    torch: "tileset/brazier_big",
    torchEvery: 3,
    floor: ["tileset/floor_cracked", "tileset/floor_plain", "tileset/floor_cracked"],
    props: [
      { assetId: "tileset/environment/blood", weight: 3 },
      { assetId: "tileset/environment/bones", weight: 2 },
      { assetId: "tileset/environment/barrel", weight: 1 },
    ],
    tint: 0xffc9a8,
  },
  "pináculo arcano": {
    id: "pináculo arcano",
    wall: ["tileset/crystal_wall", "tileset/wall_a", "tileset/crystal_wall", "tileset/wall_pillar"],
    torch: "tileset/wall_torch",
    torchEvery: 5,
    floor: ["tileset/floor_light", "tileset/floor_plain"],
    props: [
      { assetId: "tileset/environment/candle", weight: 3 },
    ],
    tint: 0xd2b4ff,
  },
  "pináculo carmesim": {
    id: "pináculo carmesim",
    wall: ["tileset/wall_a", "tileset/skull_wall", "tileset/wall_b"],
    torch: "tileset/brazier_big",
    torchEvery: 4,
    floor: ["tileset/floor_cracked", "tileset/floor_light"],
    props: [
      { assetId: "tileset/environment/blood", weight: 3 },
    ],
    tint: 0xffa8a8,
  },
  "pináculo de jade": {
    id: "pináculo de jade",
    wall: ["tileset/wall_moss", "tileset/wall_a", "tileset/wall_moss"],
    torch: "tileset/wall_torch",
    torchEvery: 5,
    floor: ["tileset/floor_mossy", "tileset/floor_plain", "tileset/floor_mossy"],
    props: [
      { assetId: "tileset/environment/moss", weight: 3 },
      { assetId: "tileset/environment/pot", weight: 1 },
    ],
    tint: 0xa8ffd0,
  },
  // Arena de chefes: caveira, brasas e sangue — mais pesada que a Torre.
  boss: {
    id: "boss",
    wall: ["tileset/skull_wall", "tileset/wall_a", "tileset/skull_wall", "tileset/wall_pillar"],
    torch: "tileset/brazier_big",
    torchEvery: 3,
    floor: ["tileset/floor_cracked", "tileset/floor_light", "tileset/bone_floor"],
    props: [
      { assetId: "tileset/environment/bones", weight: 3 },
      { assetId: "tileset/environment/blood", weight: 2 },
      { assetId: "tileset/environment/skull", weight: 2 },
    ],
    tint: 0xe6c8c8,
  },
};

export function arenaThemeFor(themeId: string | null | undefined): ArenaTheme {
  return (themeId ? ARENA_THEMES[themeId] : undefined) ?? ARENA_THEMES[DEFAULT_THEME_ID]!;
}

/** Todos os IDs de asset usados por um tema (para carregar de uma vez). */
export function themeAssetIds(theme: ArenaTheme): string[] {
  const ids = new Set<string>([...theme.wall, ...theme.floor, ...theme.props.map((p) => p.assetId)]);
  if (theme.torch) ids.add(theme.torch);
  return [...ids];
}
