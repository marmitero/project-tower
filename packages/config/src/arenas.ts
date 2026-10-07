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
  const f01 = (n: string) => `arenas/f01_entrada/${n}`;
  const f02 = (n: string) => `arenas/f02_porao/${n}`;
  const f03 = (n: string) => `arenas/f03_ossadas/${n}`;
  const f04 = (n: string) => `arenas/f04_catacumbas/${n}`;
  const f05 = (n: string) => `arenas/f05_ecos/${n}`;
  const f06 = (n: string) => `arenas/f06_fornalha/${n}`;
  const f07 = (n: string) => `arenas/f07_jardim/${n}`;
  const f08 = (n: string) => `arenas/f08_sombras/${n}`;
  const f09 = (n: string) => `arenas/f09_sangrento/${n}`;
  const f10 = (n: string) => `arenas/f10_passos/${n}`;
  const p01 = (n: string) => `arenas/p01_arcano/${n}`;
  return [
    {
      // Lote 1 (ADR-033): primeiro kit GERADO — a Entrada da Torre (andar 1). Pedra azul-acinzentada,
      // tochas laranja, portão, janela com grade e estandarte; adereços baixos de guarnição.
      // A lista de paredes repete as peças comuns para que o estandarte, o portão e a janela
      // apareçam raramente (≈ 1 em 12 cada) — é só dado: edite os pesos repetindo/removendo ids.
      id: "f01_entrada",
      name: "Entrada da Torre",
      wall: [
        f01("wall_0"), f01("wall_1"), f01("wall_2"), f01("wall_0"), f01("wall_4"), f01("wall_1"),
        f01("banner"), f01("wall_2"), f01("wall_3"), f01("wall_0"), f01("wall_4"), f01("gate"),
      ],
      torch: f01("torch"),
      torchEvery: 4,
      floor: [f01("floor_0"), f01("floor_1"), f01("floor_0"), f01("floor_2"), f01("floor_3")],
      props: [
        { assetId: f01("prop_0"), weight: 3 },
        { assetId: f01("prop_1"), weight: 3 },
        { assetId: f01("prop_2"), weight: 2 },
        { assetId: f01("prop_3"), weight: 2 },
      ],
      tint: 0xffffff,
    },
    {
      // Lote 2 (ADR-036): pedra escura molhada, musgo, poças, ralos e lanternas verde-pálido. `banner` = correntes com musgo; `gate` = túnel de esgoto com grade.
      id: "f02_porao",
      name: "Porão Úmido",
      wall: [
        f02("wall_0"), f02("wall_1"), f02("wall_2"), f02("wall_0"), f02("wall_4"), f02("wall_1"),
        f02("banner"), f02("wall_2"), f02("wall_3"), f02("wall_0"), f02("wall_4"), f02("gate"),
      ],
      torch: f02("torch"),
      torchEvery: 4,
      floor: [f02("floor_0"), f02("floor_1"), f02("floor_2"), f02("floor_3"), f02("floor_1")],
      props: [
        { assetId: f02("prop_0"), weight: 3 },
        { assetId: f02("prop_1"), weight: 3 },
        { assetId: f02("prop_2"), weight: 2 },
        { assetId: f02("prop_3"), weight: 2 },
      ],
      tint: 0xffffff,
    },
    {
      // Lote 2: pedra ocre cor de osso, nichos de crânios, velas e areia. `banner` = nicho de crânios; `gate` = passagem emoldurada de ossos. Piso escurecido por ganho 0,78 no pipeline (luminância).
      id: "f03_ossadas",
      name: "Galeria das Ossadas",
      wall: [
        f03("wall_0"), f03("wall_1"), f03("wall_2"), f03("wall_0"), f03("wall_4"), f03("wall_1"),
        f03("banner"), f03("wall_2"), f03("wall_3"), f03("wall_0"), f03("wall_4"), f03("gate"),
      ],
      torch: f03("torch"),
      torchEvery: 4,
      floor: [f03("floor_0"), f03("floor_1"), f03("floor_2"), f03("floor_3"), f03("floor_0")],
      props: [
        { assetId: f03("prop_0"), weight: 3 },
        { assetId: f03("prop_1"), weight: 2 },
        { assetId: f03("prop_2"), weight: 3 },
        { assetId: f03("prop_3"), weight: 2 },
      ],
      tint: 0xffffff,
    },
    {
      // Lote 2: pedra cinza-violeta, sarcófagos selados, tocha de chama roxa, tapeçaria com olho dourado, porta de cripta. Piso bem escuro (luminância 0,12–0,19): a laje central (floor_0) aparece menos.
      id: "f04_catacumbas",
      name: "Catacumbas Antigas",
      wall: [
        f04("wall_0"), f04("wall_1"), f04("wall_2"), f04("wall_0"), f04("wall_4"), f04("wall_1"),
        f04("banner"), f04("wall_2"), f04("wall_3"), f04("wall_0"), f04("wall_4"), f04("gate"),
      ],
      torch: f04("torch"),
      torchEvery: 5,
      floor: [f04("floor_1"), f04("floor_2"), f04("floor_3"), f04("floor_1"), f04("floor_0"), f04("floor_2")],
      props: [
        { assetId: f04("prop_0"), weight: 3 },
        { assetId: f04("prop_1"), weight: 2 },
        { assetId: f04("prop_2"), weight: 2 },
        { assetId: f04("prop_3"), weight: 2 },
      ],
      tint: 0xffffff,
    },
    {
      // Lote 7: Salão dos Ecos (andar 5). Paredes azul-marinho com cristais ciano embutidos, tocha de cristal,
      // estandarte azul e prata, portão em arco de cristal e piso de mármore escuro com veios azuis.
      id: "f05_ecos",
      name: "Salão dos Ecos",
      wall: [
        f05("wall_0"), f05("wall_1"), f05("wall_2"), f05("wall_0"), f05("wall_4"), f05("wall_1"),
        f05("banner"), f05("wall_2"), f05("wall_3"), f05("wall_0"), f05("wall_4"), f05("gate"),
      ],
      torch: f05("torch"),
      torchEvery: 4,
      floor: [f05("floor_0"), f05("floor_1"), f05("floor_2"), f05("floor_3"), f05("floor_0")],
      props: [
        { assetId: f05("prop_0"), weight: 3 },
        { assetId: f05("prop_1"), weight: 3 },
        { assetId: f05("prop_2"), weight: 2 },
        { assetId: f05("prop_3"), weight: 2 },
      ],
      tint: 0xffffff,
    },
    {
      // Lote 8: Fornalha Esquecida (andar 6). Basalto escuro e placas de ferro com fendas de lava,
      // braseiro com chamas, estandarte de bronze e martelo, portão reforçado e piso escuro de ferro fundido.
      id: "f06_fornalha",
      name: "Fornalha Esquecida",
      wall: [
        f06("wall_0"), f06("wall_1"), f06("wall_2"), f06("wall_0"), f06("wall_4"), f06("wall_1"),
        f06("banner"), f06("wall_2"), f06("wall_3"), f06("wall_0"), f06("wall_4"), f06("gate"),
      ],
      torch: f06("torch"),
      torchEvery: 4,
      floor: [f06("floor_0"), f06("floor_1"), f06("floor_2"), f06("floor_3"), f06("floor_0")],
      props: [
        { assetId: f06("prop_0"), weight: 3 },
        { assetId: f06("prop_1"), weight: 3 },
        { assetId: f06("prop_2"), weight: 2 },
        { assetId: f06("prop_3"), weight: 2 },
      ],
      tint: 0xffffff,
    },
    {
      // Lote 8: Jardim Gélido (andar 7). Pedra escura congelada com geada e estalactites de gelo,
      // tocha de chama fria azul, estandarte com floco de neve, portão em arco de gelo e piso de pedra gélida.
      id: "f07_jardim",
      name: "Jardim Gélido",
      wall: [
        f07("wall_0"), f07("wall_1"), f07("wall_2"), f07("wall_0"), f07("wall_4"), f07("wall_1"),
        f07("banner"), f07("wall_2"), f07("wall_3"), f07("wall_0"), f07("wall_4"), f07("gate"),
      ],
      torch: f07("torch"),
      torchEvery: 4,
      floor: [f07("floor_0"), f07("floor_1"), f07("floor_2"), f07("floor_3"), f07("floor_0")],
      props: [
        { assetId: f07("prop_0"), weight: 3 },
        { assetId: f07("prop_1"), weight: 3 },
        { assetId: f07("prop_2"), weight: 2 },
        { assetId: f07("prop_3"), weight: 2 },
      ],
      tint: 0xffffff,
    },
    {
      // Lote 9: Ninho das Sombras (andar 8). Pedra negra com teias espessas e olhos violetas nas fendas,
      // tocha de fogo sombrio violeta, estandarte de teia e aranha, portão de ferro com teias e piso escuro.
      id: "f08_sombras",
      name: "Ninho das Sombras",
      wall: [
        f08("wall_0"), f08("wall_1"), f08("wall_2"), f08("wall_0"), f08("wall_4"), f08("wall_1"),
        f08("banner"), f08("wall_2"), f08("wall_3"), f08("wall_0"), f08("wall_4"), f08("gate"),
      ],
      torch: f08("torch"),
      torchEvery: 4,
      floor: [f08("floor_0"), f08("floor_1"), f08("floor_2"), f08("floor_3"), f08("floor_0")],
      props: [
        { assetId: f08("prop_0"), weight: 3 },
        { assetId: f08("prop_1"), weight: 3 },
        { assetId: f08("prop_2"), weight: 2 },
        { assetId: f08("prop_3"), weight: 2 },
      ],
      tint: 0xffffff,
    },
    {
      // Lote 10: Corredor Sangrento (andar 9). Paredes de fortaleza de pedra cinza-escura com tapeçarias
      // rubras rasgadas e correntes de ferro, tocha carmesim, estandarte de cálice dourado e piso escuro com veios rubros.
      id: "f09_sangrento",
      name: "Corredor Sangrento",
      wall: [
        f09("wall_0"), f09("wall_1"), f09("wall_2"), f09("wall_0"), f09("wall_4"), f09("wall_1"),
        f09("banner"), f09("wall_2"), f09("wall_3"), f09("wall_0"), f09("wall_4"), f09("gate"),
      ],
      torch: f09("torch"),
      torchEvery: 4,
      floor: [f09("floor_0"), f09("floor_1"), f09("floor_2"), f09("floor_3"), f09("floor_0")],
      props: [
        { assetId: f09("prop_0"), weight: 3 },
        { assetId: f09("prop_1"), weight: 3 },
        { assetId: f09("prop_2"), weight: 2 },
        { assetId: f09("prop_3"), weight: 2 },
      ],
      tint: 0xffffff,
    },
    {
      // Lote 11: Câmara dos Mil Passos (andar 10). Mármore obsidiana e bronze celestial,
      // relógios de sol dourados entalhados, tocha com chama âmbar estelar, estandarte dourado
      // com constelações, portão de bronze com engrenagens e ponteiros, piso com algarismos rúnicos circulares.
      id: "f10_passos",
      name: "Câmara dos Mil Passos",
      wall: [
        f10("wall_0"), f10("wall_1"), f10("wall_2"), f10("wall_0"), f10("wall_4"), f10("wall_1"),
        f10("banner"), f10("wall_2"), f10("wall_3"), f10("wall_0"), f10("wall_4"), f10("gate"),
      ],
      torch: f10("torch"),
      torchEvery: 4,
      floor: [f10("floor_0"), f10("floor_1"), f10("floor_2"), f10("floor_3"), f10("floor_0")],
      props: [
        { assetId: f10("prop_0"), weight: 3 },
        { assetId: f10("prop_1"), weight: 3 },
        { assetId: f10("prop_2"), weight: 2 },
        { assetId: f10("prop_3"), weight: 2 },
      ],
      tint: 0xffffff,
    },
    {
      // Lote 12 (ADR-049): Pináculo Arcano (andares 11–15, Bioma 1 da Onda 2). Alvenaria de pedra índigo
      // com cristais arcanos e runas ciano reluzentes, tocha com chama ciano mística, estandarte com
      // constelações astrais, portão em arco de cristal arcano e piso de lajes escuras com veios de energia mágica.
      id: "p01_arcano",
      name: "Pináculo Arcano",
      wall: [
        p01("wall_0"), p01("wall_1"), p01("wall_2"), p01("wall_0"), p01("wall_4"), p01("wall_1"),
        p01("banner"), p01("wall_2"), p01("wall_3"), p01("wall_0"), p01("wall_4"), p01("gate"),
      ],
      torch: p01("torch"),
      torchEvery: 4,
      floor: [p01("floor_0"), p01("floor_1"), p01("floor_2"), p01("floor_3"), p01("floor_0")],
      props: [
        { assetId: p01("prop_0"), weight: 3 },
        { assetId: p01("prop_1"), weight: 3 },
        { assetId: p01("prop_2"), weight: 2 },
        { assetId: p01("prop_3"), weight: 2 },
      ],
      tint: 0xffffff,
    },
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
