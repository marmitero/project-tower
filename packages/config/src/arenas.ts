/**
 * Kits de arena — DADO editável (ADR-032; antes eram `ARENA_THEMES` em código de render).
 *
 * Cada kit escolhe ladrilhos do manifesto de assets para montar a arena de combate: parede ao
 * fundo, piso em primeiro plano e adereços que passam enquanto o herói caminha. O andar aponta
 * para um kit por `FloorVisual.theme` (= `ArenaKitDef.id`); kit desconhecido cai em
 * `DEFAULT_ARENA_KIT_ID`. A GEOMETRIA (altura da parede, fileiras, parallax) não é arte e
 * continua em `render/arenaLayout.ts`.
 *
 * Faz parte do ContentPack (schema v5): o Painel ADM edita estes kits sem código.
 * Campos reservados para lotes futuros (iluminação, ambiente, marco) entram como opcionais
 * ADITIVOS quando o renderer os implementar (com `schemaVersion` + migração).
 */

export interface ArenaPropDef {
  /** ID do manifesto (peça `tileset/environment/*` ou ladrilho gerado). */
  assetId: string;
  /** Peso relativo de sorteio entre os adereços do kit. */
  weight: number;
}

export interface ArenaKitDef {
  /** id estável — é o que `FloorVisual.theme` referencia. */
  id: string;
  /** Nome de exibição (Painel ADM / depuração). */
  name: string;
  /** Parede ao fundo: ladrilhos sorteados (repetem em faixa contínua). */
  wall: string[];
  /** Parede com luminária/tocha, repetida a cada `torchEvery` ladrilhos. */
  torch: string | null;
  torchEvery: number;
  /** Piso em primeiro plano. */
  floor: string[];
  props: ArenaPropDef[];
  /** Cor multiplicada sobre parede e piso (0xRRGGBB); 0xffffff = sem tintura. */
  tint: number;
}

export const DEFAULT_ARENA_KIT_ID = "masmorra";
/** Kit da Arena dos Chefes (não é de nenhum andar). */
export const BOSS_ARENA_KIT_ID = "boss";

/** Kits de fábrica (peças do pack Nika). Os kits gerados por andar (Onda 1) entram aqui. */
export function defaultArenaKits(): ArenaKitDef[] {
  return [
    {
      id: "masmorra",
      name: "Masmorra",
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
    {
      id: "gelo e sombra",
      name: "Gelo e sombra",
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
    {
      id: "sangue e brasa",
      name: "Sangue e brasa",
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
    {
      id: "pináculo arcano",
      name: "Pináculo arcano",
      wall: ["tileset/crystal_wall", "tileset/wall_a", "tileset/crystal_wall", "tileset/wall_pillar"],
      torch: "tileset/wall_torch",
      torchEvery: 5,
      floor: ["tileset/floor_light", "tileset/floor_plain"],
      props: [{ assetId: "tileset/environment/candle", weight: 3 }],
      tint: 0xd2b4ff,
    },
    {
      id: "pináculo carmesim",
      name: "Pináculo carmesim",
      wall: ["tileset/wall_a", "tileset/skull_wall", "tileset/wall_b"],
      torch: "tileset/brazier_big",
      torchEvery: 4,
      floor: ["tileset/floor_cracked", "tileset/floor_light"],
      props: [{ assetId: "tileset/environment/blood", weight: 3 }],
      tint: 0xffa8a8,
    },
    {
      id: "pináculo de jade",
      name: "Pináculo de jade",
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
    {
      // Arena de chefes: caveira, brasas e sangue — mais pesada que a Torre.
      id: "boss",
      name: "Arena dos Chefes",
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
  ];
}

/** Kits VIVOS (mutados em lugar por `applyContentPack`). */
export const arenaKits: ArenaKitDef[] = defaultArenaKits();

export function arenaKitById(id: string | null | undefined): ArenaKitDef {
  return (id ? arenaKits.find((k) => k.id === id) : undefined) ?? arenaKits.find((k) => k.id === DEFAULT_ARENA_KIT_ID) ?? arenaKits[0]!;
}

/** Todos os ids de asset usados por um kit (para carregar de uma vez). */
export function arenaKitAssetIds(kit: ArenaKitDef): string[] {
  const ids = new Set<string>([...kit.wall, ...kit.floor, ...kit.props.map((p) => p.assetId)]);
  if (kit.torch) ids.add(kit.torch);
  return [...ids];
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/**
 * Validação dos kits. `assetIds` (opcional) confere cada id contra o manifesto;
 * `floorThemes` (opcional) exige que todo `FloorVisual.theme` exista como kit.
 */
export function arenaKitErrors(kits: unknown, opts: { assetIds?: ReadonlySet<string>; floorThemes?: readonly string[] } = {}): string[] {
  const errors: string[] = [];
  if (!Array.isArray(kits) || kits.length === 0) return ["arenas deve ser uma lista não vazia"];
  const seen = new Set<string>();
  const checkAsset = (at: string, id: unknown) => {
    if (typeof id !== "string" || id.length === 0) errors.push(`${at}: id de asset inválido`);
    else if (opts.assetIds && !opts.assetIds.has(id)) errors.push(`${at}: asset inexistente no manifesto "${id}"`);
  };
  for (const [i, k] of (kits as ArenaKitDef[]).entries()) {
    const at = `arenas[${i}] (${String(k?.id)})`;
    if (!k || typeof k.id !== "string" || k.id.length === 0) {
      errors.push(`${at}: id vazio`);
      continue;
    }
    if (seen.has(k.id)) errors.push(`${at}: id repetido`);
    seen.add(k.id);
    if (typeof k.name !== "string" || k.name.length === 0) errors.push(`${at}: name vazio`);
    if (!Array.isArray(k.wall) || k.wall.length < 1) errors.push(`${at}: wall precisa de ao menos 1 ladrilho`);
    else k.wall.forEach((id, j) => checkAsset(`${at}.wall[${j}]`, id));
    if (!Array.isArray(k.floor) || k.floor.length < 1) errors.push(`${at}: floor precisa de ao menos 1 ladrilho`);
    else k.floor.forEach((id, j) => checkAsset(`${at}.floor[${j}]`, id));
    if (k.torch !== null) checkAsset(`${at}.torch`, k.torch);
    if (!isNum(k.torchEvery) || !Number.isInteger(k.torchEvery) || k.torchEvery < 1) errors.push(`${at}: torchEvery deve ser inteiro ≥ 1`);
    if (!Array.isArray(k.props)) errors.push(`${at}: props deve ser lista`);
    else {
      k.props.forEach((p, j) => {
        checkAsset(`${at}.props[${j}]`, p?.assetId);
        if (!isNum(p?.weight) || p.weight <= 0) errors.push(`${at}.props[${j}]: weight deve ser > 0`);
      });
    }
    if (!isNum(k.tint) || k.tint < 0 || k.tint > 0xffffff) errors.push(`${at}: tint deve ser 0xRRGGBB`);
  }
  if (!seen.has(DEFAULT_ARENA_KIT_ID)) errors.push(`arenas: falta o kit padrão "${DEFAULT_ARENA_KIT_ID}"`);
  if (!seen.has(BOSS_ARENA_KIT_ID)) errors.push(`arenas: falta o kit da Arena dos Chefes "${BOSS_ARENA_KIT_ID}"`);
  for (const t of opts.floorThemes ?? []) if (!seen.has(t)) errors.push(`andar referencia kit inexistente "${t}"`);
  return errors;
}
