# Diretrizes de Arte

**Versão:** 0.1 · **Data:** 2026-09-30 · **Estado:** especificado
**Fonte:** §4, §9, §15, §28, §59, §60, §61, §62, §105 do `Master-Prompt.md`

---

## 1. Regras absolutas

### 1.1 Inspecione antes de criar

> *"Antes de criar/substituir assets: 1. inspecionar o repositório; 2. verificar assets existentes; 3. verificar sprites; 4. verificar dimensões; 5. verificar personagens; 6. verificar inimigos; 7. verificar ícones; 8. verificar efeitos; 9. verificar backgrounds; 10. identificar recursos utilizáveis. **Utilizar primeiro o que já existe.**"* (§61)

**Inspeção executada.** O repositório de referência `marmitero/tower-idle-adventure` contém **422 PNGs** de um pack completo e profissional. Esse pack é a base adotada. Ver [`ASSET_INVENTORY.md`](ASSET_INVENTORY.md). **2026-10-02 (ADR-019):** o pack está **versionado neste repositório** (`assets/sprites/`, com licença); o repositório de referência não é mais necessário.

### 1.2 Placeholders

> *"Placeholders são permitidos SOMENTE durante desenvolvimento interno."* (§62)

Se necessário, devem ser:

- ✅ **marcados** — com nome de arquivo ou flag
- ✅ **documentados** — listados em `PLACEHOLDERS.md`
- ❌ **substituídos** antes de qualquer entrega

> **Nunca** entregar o produto final com quadrados, círculos, emojis, personagens geométricos ou UI de protótipo. (§62)

Checklist de release — varredura automática por placeholder é **teste de CI**:

```text
[ ] Nenhum arquivo chamado *placeholder*, *_tmp*, *_wip*, *_todo*
[ ] Nenhum asset com menos de 8px de dimensão
[ ] Nenhum emoji em asset de arte principal
[ ] Nenhum asset de UI mock no diretório de produção
[ ] PLACEHOLDERS.md vazio ou ausente
```

---

## 2. Direção visual

> *"O jogo deve parecer um **RPG mobile premium** adaptado para browser. Não uma aplicação SaaS."* (§59)

| Atributo | Valor |
|---|---|
| Gênero visual | Pixel art top-down, fantasia sombria |
| Escala | Sprites 256×256 por frame |
| Iluminação | Sombras projetadas, contraste alto |
| Paleta | Sombria na Torre, quente no Reino |
| Legibilidade | Silhueta distinguível a 96px |
| Densidade | Encenação, não interface |

### 2.1 Prioridade de pixels

O §59 dá a ordem do orçamento visual:

> 1. **batalha** · 2. **personagens** · 3. **inimigos** · 4. **efeitos** · 5. **HUD** · 6. **progressão** · 7. **menus

Batalha primeiro. Isso significa: se faltar orçamento de otimização, a battle arena mantém resolução e o inventário perde colunas.

---

## 3. Especificação dos assets disponíveis

O pack **Fantasy Dungeon — PNG Sprites** (Nika Studio, v1.4) tem especificação declarada e uniforme:

| Tipo | Dimensão | Layout |
|---|---|---|
| **Animation sheet** | 1024×1024 | Grade 4×4 de frames 256×256 |
| **Tiles** | 128×128 | — |
| **Ícones** | 64×64 | — |
| **Portraits** | 8 arquivos | — |

**Layout da sheet de animação** (crítico para implementação):

```text
┌─────┬─────┬─────┬─────┐
│  0  │  1  │  2  │  3  │  ← frames da animação
├─────┼─────┼─────┼─────┤
│DOWN │ UP  │LEFT │RIGHT│  ← cada LINHA = uma direção
├─────┼─────┼─────┼─────┤
│ ... │ ... │ ... │ ...  │
├─────┼─────┼─────┼─────┤
│ ... │ ... │ ... │ ...  │
└─────┴─────┴─────┴─────┘
```

> ⚠️ **Cada linha é uma direção, não um frame.** Configurar isso errado produz personagens "andar de lado para cima".

### 3.1 Configuração de importação

O README do pack é explícito:

```text
Pixel art → filtro NEAREST (point), SEM mipmaps, SEM compressão com perda
```

No Phaser:

```ts
const config: Phaser.Types.Loader.ImageConfig = {
  pixelArt: true,        // nearest-neighbor
  mipmapFilter: "NEAREST",
};
```

Aplicar `linear` a pixel art produz **borrão** e destrói a leitura dos sprites.

---

## 4. Pipeline de assets

```text
1. INVENTARIAR       → o que existe, com dimensões e origem
2. SELECIONAR        → subset usado por cada tela
3. NORMALIZAR        → nomes, IDs estáveis, manifesto
4. OTIMIZAR          → subsetting, compressão sem perda
5. INTEGRAR          → public/assets/, com IDs
6. VALIDAR           → CI: dimensão, alpha, tamanho, placeholder
7. DOCUMENTAR        → origem, licença, crédito
```

### 4.1 Regra do subset

O pack completo soma **~92 MiB**. Ele **não** vai para o bundle:

```text
sprites/              ← fonte, no repo, fora do bundle
  └── 422 PNG, ~92 MiB

apps/game-web/public/assets/
  ├── characters/     ← só os usados
  ├── tileset/        ← só as áreas
  ├── vfx/            ← só os efeitos necessários
  └── icons/          ← só os referenciados
```

> *"Não copiar tudo para o bundle/deployment do jogo. Preservar `sprites/` como fonte e selecionar somente arquivos usados por uma release."*

### 4.2 IDs estáveis

**Nunca** referenciar asset pelo caminho de arquivo no código. Usar IDs:

```ts
export const ASSET_IDS = {
  hero: "char/hero",
  mage: "char/mage",
  goblin: "char/goblin",
  bossSentinel: "char/boss",
  tilesFloorPlain: "tile/floor_plain",
  vfxHit: "vfx/hit",
  iconCoin: "icon/coin",
} as const;
```

O manifesto mapeia `ID → caminho real`. Isso permite **renomear ou substituir** um asset sem tocar em código — o que vai acontecer, porque os arquivos têm nomes awkward como `hero_skins/assassin.png.png` (extensão duplicada).

---

## 5. Animação de combate

O §60 exige batalha **visualmente percebida**. Com as 6 folhas disponíveis (`idle`, `walk`, `run`, `attack`, `hurt`, `death`), dá-se para cobrir o ciclo completo sem asset novo.

| Momento | Sprite | Código |
|---|---|---|
| Idle | `idle` (linha `down`) | Loop lento, 8–10 fps |
| Aproximação | `walk` | Tween de posição, 150ms |
| Ataque | `attack` | Tween de lunge + impacto no frame 2 |
| Dano recebido | `hurt` | Flash branco + recuo |
| **Crítico** | `attack` + `hurt` | Versão ampliada + partículas |
| Morte | `death` | 2 piscadas, depois dissolução |
| **Procurando** | `idle` | Loop + olhar lateral (§28) |

### 5.1 Regra de não-destruição

> *"A animação não precisa alterar o sprite-fonte."*

Toda animação é **código** sobre o PNG estático:

| Efeito | Implementação |
|---|---|
| Lunge | Tween de `x` |
| Squash/flash | Tint + alpha |
| Tremor de tela | Camera shake |
| Partículas | Phaser particle emitter |
| Número de dano | Bitmap text + tween |
| Dissolução | Alpha + escala + rotação |

> **Nada de arte gerada proceduralmente em runtime.** (§62, direção do projeto) — rolagens e seleção de dados são aleatórios no servidor; a **arte é estática e versionada**.

---

## 6. Cor e raridade

A cor é o canal mais forte de informação de raridade — e **não pode ser o único** (acessibilidade).

| Raridade | Cor | Forma do frame | Texto |
|---|---|---|---|
| Common | Cinza | Reto | "Comum" |
| Uncommon | Verde | Reto + borda fina | "Incomum" |
| Rare | Azul | Borda dupla | "Raro" |
| Epic | Roxo | Borda dupla + brilho | "Épico" |
| Legendary | Laranja | Borda dupla + shimmer | "Lendário" |
| Celestial | Dourado/branco | Borda dupla + partículas | "Celestial" |

Três canais: **cor + forma + texto**. Um jogador daltônico distingue pelo frame e pelo texto.

### 6.1 Raridade no mundo (na arena)

Itens **equipados** no herói devem ser distinguíveis na arena por um **brilho sutil** na cor do frame — o jogador precisa ver que está com um Celestial **sem abrir um menu**.

---

## 7. UI e ícones

> ⚠️ **A sheet `ui/ui_kit.png` do pack tem palavras em inglês rasterizadas** ("INVENTORY", "ITEMS", "EQUIP") e **não pode ser usada como UI final** num jogo PT-BR.

Regras:

- **Rótulos sempre em HTML/CSS**, nunca na imagem.
- Ícones do pack (`icons1/`, `icons2/`, `icons3/` — 224 arquivos, 64×64) são utilizáveis, mas **revisados individualmente**: o mesmo ícone pode ter significados diferentes em contextos diferentes.
- Frames e painéis: preferencialmente CSS com **borda + gradiente**, o que dá nitidez em qualquer DPI e controle total de cor.

### 7.1 Escala de DPI

Pixel art em telas retina fica borrada com `linear`. Dois caminhos:

1. **Nearest-neighbor** em tudo — consistente, mas UI fica serrilhada em telas de alta densidade.
2. **UI em CSS/vector, sprites em nearest** — melhor dos dois.

Decisão técnica: **caminho 2**. O battlesfield usa pixel art; a UI usa CSS.

---

## 8. Direção de arte por andares

A Tower precisa **parecer** que sobe. Cada andar com tileset/variante própria:

```text
Andar 1–3   Dungeon inicial       — pedra clara, tochas
Andar 4–6   Mais escuro           — pedra, brasas
Andar 7–10  Caverna úmida         — água, slime verde
```

Recursos: `tileset/` (65 tiles) e `tileset/environment/` com props, decoração, tiles animados e sombras.

> **P-028** — o mapeamento de andares para variantes visuais **não está definido**. Depende de P-005 (número de andares).

---

## 9.-workflow de produção de assets adicionais

Assets novos, quando necessários:

```text
1. Lote de até 10 arquivos
2. Cada lote tem:
   ├── Manifesto (nome, ID, dimensão, origem, licença)
   ├── Licença e atribuição
   ├── Checklist de QA
   └── Registro de origem (IA, artist, purchase)
3. QA: consistência de paleta, nitidez, transparência, tamanho
4. Versão junto com o código que os usa
```

**Nenhuma arte nova é necessária para a vertical slice** — o pack cobre personagens, inimigos, ambiente, VFX e ícones.

---

## 10. QA de assets

Teste automatizado em CI:

```ts
test("todo asset do subset é válido", () => {
  for (const asset of manifest.assets) {
    expect(asset.width).toBeLessThanOrEqual(4096);
    expect(asset.height).toBeLessThanOrEqual(4096);
    expect(asset.width * asset.height).toBeLessThan(16_000_000);
    expect(asset.bytes).toBeLessThan(5 * 1024 * 1024);
    expect(asset.hasAlpha).toBe(true);
  };
});

test("nenhum placeholder em produção", () => {
  // varre nomes e detecta assets de 1–16px (placeholders típicos)
});
```

---

## 11. Checklist de pronto

- [ ] Pack da referência inspecionado e **usado** (§61)
- [ ] Créditos e licença preservados
- [ ] Subset no bundle, não os 92 MiB
- [ ] IDs estáveis, não caminhos de arquivo
- [ ] `pixelArt: true` em todas as sheets
- [ ] Layout 4×4 correto (linha = direção)
- [ ] Ciclo de combate coberto: idle/walk/attack/hurt/death
- [ ] Animação de "Procurando" real (§28)
- [ ] Raridade por cor **+** forma **+** texto
- [ ] Nenhum rótulo rasterizado em inglês
- [ ] UI em CSS, sprites em nearest
- [ ] Cada andar com identidade visual
- [ ] CI valida dimensões, alpha e tamanho
- [ ] CI detecta placeholder
- [ ] Nenhum asset procedural em runtime

---

## 12. Referências

- [`ASSET_INVENTORY.md`](ASSET_INVENTORY.md) — inventário concreto do pack
- [`UI_UX.md`](UI_UX.md) — como a arte aparece na interface
- [`COMBAT_SYSTEM.md`](COMBAT_SYSTEM.md) — eventos que viram animação
- [`AUDIO_GUIDELINES.md`](AUDIO_GUIDELINES.md) — o outro canal de feedback
- [`DECISIONS_LOG.md`](DECISIONS_LOG.md#adr-004--reaproveitamento-do-pack-de-sprites) — ADR-004
