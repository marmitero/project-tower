# Inventário de Assets

**Versão:** 0.1 · **Data:** 2026-09-30 · **Estado:** inspecionado
**Fonte:** §61, §62 do `Master-Prompt.md` + inspeção direta do repositório `marmitero/tower-idle-adventure`

---

## 1. Procedimento executado

O §61 exige dez passos de inspeção **antes** de criar ou substituir qualquer asset. Todos foram executados:

| # | Passo | Resultado |
|---|---|---|
| 1 | Inspecionar o repositório | ✅ `marmitero/tower-idle-adventure` clonado e analisado |
| 2 | Verificar assets existentes | ✅ **450 arquivos** (422 PNG + 3 de licença/readme/manifesto) |
| 3 | Verificar sprites | ✅ 108 sheets de personagem |
| 4 | Verificar dimensões | ✅ IHDR lido em todos os 422 PNG |
| 5 | Verificar personagens | ✅ 19 diretórios (17 completos + 2 NPCs parciais) |
| 6 | Verificar inimigos | ✅ 12 inimigos, 1 boss, 5 variantes elites |
| 7 | Verificar ícones | ✅ 224 ícones de 64×64 |
| 8 | Verificar efeitos | ✅ 7 sheets de VFX |
| 9 | Verificar backgrounds | ✅ 65 tiles de cenário + environment |
| 10 | Identificar recursos utilizáveis | ✅ **≥ 90% do necessário para a vertical slice** |

> **Conclusão da inspeção: não é necessário criar nenhum asset novo para a vertical slice.**
> Isso é a conclusão mais importante da Fase 0, e é exatamente o que o §61 pedia.

---

## 2. Origem e licença

| Campo | Valor |
|---|---|
| **Pack** | Fantasy Dungeon — PNG Sprites |
| **Autoria** | Nika Studio |
| **Versão** | v1.4 |
| **Página** | <https://nikastudio.itch.io/fantasy-dungeon-top-down-pixel-rpg-asset-pack-unity-6-urp> |
| **Licença declarada** | Uso pessoal/comercial permitido · **crédito obrigatório** · proibido revender o pack isolado |
| **Licença incluída** | MIT (Copyright © 2026 Nika Studio) |
| **Crédito obrigatório** | `Assets by Nika Studio` + link da página |

### 2.1 Postura conservadora

O README do pack declara uso comercial permitido com crédito e proíbe revenda isolada; o `LICENSE.txt` incluído é MIT. **Há uma divergência de interpretação**, e não é parecer jurídico.

**Adotar a condição mais conservadora:**

1. ✅ Usar o pack.
2. ✅ Dar crédito a Nika Studio com link.
3. ✅ **Não** revender o pack isoladamente.
4. ✅ Preservar `LICENSE.txt` e `README_IMPORT.txt` em qualquer redistribuição.
5. ✅ Não redistribuir o pack completo fora do jogo sem o crédito.

> Os dois arquivos de licença **devem** ser copiados para este repositório junto com o subset de assets.

### 2.2 Sobre a origem por IA

O README do pack declara que a arte foi feita com ferramentas de IA (Higgsfield), selecionada, recortada e montada. Os arquivos são **raster estáticos preexistentes**.

**Isso não autoriza geração procedural em runtime.** Toda arte do jogo é arquivo estático versionado.

---

## 3. Especificação técnica

| Tipo | Dimensão | Quantidade | Uso |
|---|---|---:|---|
| **Animation sheet** | 1024×1024 | 116 | Personagens (grade 4×4, frames 256×256) |
| **Ícones** | 64×64 | 224 | Itens, armas, poções, magias |
| **Tiles** | 128×128 | 58 | Cenário |
| **UI** | 2048×2048 | 16 | Kit de interface (⚠️ ver §7) |
| **Retratos** | 256×256 | 8 | Rei e NPCs |

**Layout da sheet** (crítico):

```text
┌──────┬──────┬──────┬──────┐
│  0   │  1   │  2   │  3   │  ← colunas = frames da animação
├──────┼──────┼──────┼──────┤
│ DOWN │  UP  │ LEFT │ RIGHT│  ← linhas = direções
├──────┼──────┼──────┼──────┤
│ DOWN │  UP  │ LEFT │ RIGHT│
├──────┼──────┼──────┼──────┤
│ DOWN │  UP  │ LEFT │ RIGHT│
└──────┴──────┴──────┴──────┘
```

> ⚠️ **Cada LINHA é uma direção.** Configurar ao contrário faz o personagem "andar de lado para cima".

### 3.1 Importação

```ts
// Phaser — pixel art sem filtro
{
  pixelArt: true,
  mipmapFilter: "NEAREST",
}
```

| Regra | Motivo |
|---|---|
| Filtro **NEAREST** | `linear` borra pixel art |
| **Sem** mipmaps | Introduz blur em distância |
| **Sem** compressão com perda |png8/quantização destrói a paleta |
| Ordem `down, up, left, right` | Linha 0 = `down` (padrão do pack) |

---

## 4. Tamanho do pack

| Métrica | Valor |
|---|---|
| Total de PNGs | **422** |
| Tamanho total | **92,1 MiB** |
| Maior arquivo | `ui/ui_dialog.png` — 4,47 MB |
| Média por PNG | ~223 KB |

### 4.1 A regra do subset

> **Não copie os 92 MiB para o bundle.** (§61 — "selecionar somente arquivos usados por uma release")

```text
sprites/                        ← fonte, 92 MiB, fora do bundle
  characters/  hero_skins/  icons*/  portraits/  tileset/  ui/  vfx/

apps/game-web/public/assets/    ← subset, estimativa < 8 MB
  characters/     4 heróis + 5 inimigos + 1 boss
  tileset/        1 conjunto por área
  vfx/            4–5 efeitos
  icons/          ~40 icones referenciados
```

Os 8 maiores arquivos (2048×2048) são `ui/`, `hero_skins/` e `portraits/` — **esses não entram no bundle** até serem redimensionados.

---

## 5. Personagens

### 5.1 Conjuntos completos (6 sheets cada)

| Diretório | Candidato a | Status |
|---|---|---|
| `hero` | Guerreiro / herói inicial | ⭐ candidato forte |
| `mage` | Arcanista | ⭐ candidato forte |
| `archer` | Arqueiro | ⭐ candidato forte |
| `necromancer` | Mago sombrio / invocador | ⭐ candidato forte |
| `fireorc` | Piromante | ⭐ candidato forte |
| `orc` | Bruto | ⭐ candidato |
| `bloodskeleton` | Inimigo | ✅ inimigo |
| `skeleton` | Inimigo | ✅ inimigo |
| `goblin` | Inimigo | ✅ inimigo |
| `shadowgoblin` | Inimigo (elite) | ✅ inimigo |
| `slime` | Inimigo | ✅ inimigo |
| `frostslime` | Inimigo (variante) | ✅ inimigo |
| `bat` | Inimigo | ✅ inimigo |
| `toxicbat` | Inimigo (variante) | ✅ inimigo |
| `slimeking` | Inimigo / boss | ✅ inimigo |
| `boss` | **Boss** | ✅ boss |
| `elitearcher` | Inimigo (elite) | ✅ inimigo |

Cada um tem: `idle`, `walk`, `run`, `attack`, `hurt`, `death`.

### 5.2 Parciais (3 sheets — apenas idle/atk/walk)

| Diretório | Uso | Nota |
|---|---|---|
| `merchant` | NPC do Reino | ⚠️ sem hurt/death |
| `villager` | NPC do Reino | ⚠️ sem hurt/death |

> Não são conjuntos completos de personagem jogável — servem como NPC do Reino (loja, tutorials).

### 5.3 Candidatos para os 4 heróis iniciais

> ⚠️ **Isto é uma lista de CANDIDATOS DE ARTE, não uma decisão de design.** A definição dos 4 heróis é `P-002` e precisa de aprovação humana. Ver [`CHARACTER_SYSTEM.md` §3.3](CHARACTER_SYSTEM.md#33-os-4-heróis-iniciais).

Combinando a disponibilidade de sprites com os 9 traços de arma já especificados:

| # | Sprite | Arma natural | Perfil mecânico | Por que serve como 4º distinto |
|---|---|---|---|---|
| 1 | `hero` | Espada | Reativo / tank | Referência de sustainably tank; Contracorte brilha |
| 2 | `mage` | Cajado / Livro | Mágico / área | Único com **dano mágico real**; área útil no Boss |
| 3 | `archer` | Besta | Velocidade / físico | **Físico à distância**, separado do mágico; IAS é identidade |
| 4 | `necromancer` | Adaga / Garras | DoT / multi-hit | Identidade mais distinta: veneno, negação, dreno |

**Por que estes quatro:**

- Cobrem **físico × mágico** — obriga a decisão de herói por tipo de inimigo (§18, §107).
- Têm **traços de arma complementares** — Contracorte (reativo), AoE (mágico), IAS (velocidade), Veneno (sustain).
- O `mage` é o **único** com área real, o que o torna o herói de Boss.
- O `necromancer` é visualmente o mais distinto dos quatro.

> Este conjunto satisfaz a exigência do §10: *"diferenças reais de função, atributos, skills, estilo de combate e progressão"* — mas a **proposta** de design (stats, skills, progressão) ainda precisa de aprovação.

---

## 6. Inimigos

| Diretório | Papel sugerido | Notas |
|---|---|---|
| `slime` | Guardião | Lento, muita HP, físico |
| `frostslime` | Conjurador | Variante elemental |
| `goblin` | Ágil | Rápido, físico |
| `shadowgoblin` | Ágil (elite) | Recolore do goblin |
| `skeleton` | Guardião | Tanque de osso |
| `bloodskeleton` | Guardião (elite) | Variante |
| `bat` | Ágil | Voa, rápido |
| `toxicbat` | Conjurador | Variante com veneno |
| `orc` | Equilibrado | Corpo a corpo forte |
| `elitearcher` | Ágil (elite) | À distância |
| `fireorc` | Conjurador | Dano mágico |
| `necromancer` | Conjugador | Inimigo ou herói |
| `slimeking` | Boss intermediário | Visual de rei slime |
| `boss` | **Boss principal** | Sheet completa |

> ⚠️ A coluna "papel sugerido" usa a taxonomia do repositório de referência como ponto de partida. Os **números** de stats são `P-006` e estão bloqueados.

**Cobertura de 12 inimigos + 5 variantes elites** é suficiente para os primeiros andares da Torre e para 2–3 Bosses. Reposicionar `fireorc` e `necromancer` como inimigos de andares mais altos resolve a necessidade sem asset novo.

---

## 7. Cenário, VFX e UI

### 7.1 Tileset (65 arquivos)

| Grupo | Exemplos | Uso |
|---|---|---|
| Pisos | `floor_plain`, `cave_floor`, `cave_floor2`, `dirt_floor`, `bone_floor` | Base da arena |
| Paredes | `cave_wall`, `coffin_wall`, `crystal_wall` | Limites |
| Estruturas | `door`, `door_wood_open/closed`, `archway` | Estrutura de dungeon |
| Armadilhas | `arrow_trap`, `bear_trap` | Decoração de andar |
| Environment | `brazier_big`, `candle`, `barrel`, `crate`, `chest_open`, `bones`, `blood`, `cobweb`, `moss`, `pot`, `banner` | Props |
| Animados | `animated_tiles`, `brazier_anim`, `deco_shadows` | Movimento e profundidade |

> O conjunto `brazier_anim` + `animated_tiles` serve diretamente à **animação de "Procurando"** do §28 — movimento ambiental durante a espera.

### 7.2 VFX (7 arquivos)

| Arquivo | Uso no combate |
|---|---|
| `vfx_hit` | Impacto físico (§60) |
| `vfx_slash` | Corte de lâmina (Espada, Adaga, Garras) |
| `vfx_fire` | Dano mágico de fogo |
| `vfx_lightning` | Dano mágico elétrico |
| `vfx_heal` | Cura (Livro Arcano, skills de sustain) |
| `vfx_levelup` | **Subida de nível** — momento de recompensa |
| `glow_warm` | Luz ambiente, brilho de raridade |

> `vfx_levelup` e `glow_warm` cobrem dois momentos de recompensa que o §60 exige: progressão (§45) e raridade (§34).

### 7.3 Ícones (224 arquivos)

| Pasta | Quantidade | Conteúdo |
|---|---:|---|
| `icons1` | 97 | Armas (`icons_blunt_*`, `icons_magic_wpn_*`), armaduras (`helmet`, `boots_v1`, `gloves_v1`), `coin`, `gem_v1`, `amulet_v1` |
| `icons2` | 99 | Poções, ranged, misc |
| `icons3` | 28 | Magias (`spell_holy_dark_*`, `spell_nature_arc_*`), poções |

Já existem: `coin`, `gem_v1` (→ **Diamonds**, §44), poções, e famílias de ícones de arma e armadura.

> ⚠️ **Revisão individual obrigatória.** Com 224 ícones de nomes genéricos (`icons_blunt_3`), não é possível assumir o que cada um representa. A revisão é por lote, com QA visual.

### 7.4 UI ⚠️ — Restrição importante

| Arquivo | Dimensão | Status |
|---|---|---|
| `ui_kit.png` | 2048×2048 | ⛔ **NÃO USAR como UI final** |
| `ui_dialog.png` | 2048×2048 | ⚠️ Avaliar partes sem texto |

> **A `ui_kit.png` contém palavras em inglês rasterizadas** — "INVENTORY", "ITEMS", "EQUIP" — desenhadas dentro da imagem. O jogo é PT-BR.
>
> **Decisão (ADR-004):** a UI do jogo é construída em **HTML/CSS**. Essa sheet não é usada como UI final. No máximo, partes decorativas sem texto podem ser aproveitadas.

---

## 8. Retratos e skins do Rei

### 8.1 Retratos (8)

`hero`, `mage`, `goblin`, `orc`, `skeleton`, `slime`, `boss`, `merchant`, `villager`

Para o **Rei** (§4, retrato/busto/rosto+torso), os candidatos são `hero`, `mage`, `orc` — os 3 com linguagem visual "nobre". `goblin`, `slime`, `skeleton` são inimigos, não Reyes.

### 8.2 Skins (8)

`royal`, `paladin`, `darkknight`, `crimson`, `frost`, `assassin`, `mage`, `ranger`

> ⚠️ **Nomes de arquivo com extensão duplicada:** `assassin.png.png`. Preservar os originais e mapear por ID estável via manifesto. **Não renomear em lote** sem testar referências.

A skin `royal` é a candidata natural para o Rei inicial, por nome e leitura visual.

> **P-006** — quais das 8 são as **skins iniciais** do Rei é decisão de produto, não de arte. O §5 permite exatamente "nome + skin" no início.

---

## 9. IDs estáveis

**Nunca** referenciar asset por caminho de arquivo no código:

```ts
export const ASSET_IDS = {
  // heróis
  heroWarrior:  "char/hero",
  heroMage:     "char/mage",
  heroArcher:   "char/archer",
  heroNecro:    "char/necromancer",

  // inimigos
  enemySlime:   "char/slime",
  enemyGoblin:  "char/goblin",
  enemySkeleton:"char/skeleton",
  enemyOrc:     "char/orc",
  enemyBat:     "char/bat",
  bossMain:     "char/boss",

  // cenário
  floorPlain:   "tile/floor_plain",
  caveFloor:    "tile/cave_floor",
  caveWall:     "tile/cave_wall",
  brazierAnim:  "tile/brazier_anim",
  animatedTile: "tile/animated_tiles",

  // vfx
  vfxHit:       "vfx/hit",
  vfxSlash:     "vfx/slash",
  vfxFire:      "vfx/fire",
  vfxLightning: "vfx/lightning",
  vfxHeal:      "vfx/heal",
  vfxLevelUp:   "vfx/levelup",
  glowWarm:     "vfx/glow_warm",

  // ícones
  iconCoin:     "icon/coin",
  iconGem:      "icon/gem_v1",

  // rei
  kingSkinRoyal:"skin/royal",
  portraitHero: "portrait/hero",
} as const;
```

O manifesto mapeia `ID → caminho real`, permitindo renomear ou substituir um arquivo sem tocar em código — importante porque os nomes atuais têm a extensão duplicada.

---

## 10. Tabela de rastreabilidade

O que cada requisito do `Master-Prompt.md` resolve, com assets existentes:

| Requisito | Asset que atende | Status |
|---|---|---|
| §4 Retrato do Rei | `portraits/hero` + `hero_skins/royal` | ✅ |
| §5 Skins do Rei | `hero_skins/` (8) | ✅ |
| §9 Heróis com sprite e retrato | `characters/` (17 completos) | ✅ |
| §10 4 heróis distintos | `hero`, `mage`, `archer`, `necromancer` | ✅ arte (P-002 decisão) |
| §22 Inimigos da Torre | `slime`, `goblin`, `skeleton`, `orc`, `bat`… | ✅ arte (P-006 stats) |
| §23/§54 Bosses | `boss`, `slimeking` | ✅ arte (P-018 conteúdo) |
| §28 Animação de procura | `idle` + `brazier_anim` + `animated_tiles` | ✅ |
| §60 Batalha com efeitos | `vfx/` (7) | ✅ |
| §60 Morte/hurt | `death`, `hurt` sheets | ✅ |
| §34 Raridade de equipamento | Ícones por família + CSS | ✅ |
| §44 Coin / Diamonds | `icon/coin`, `icon/gem_v1` | ✅ |
| §70 Inventário | Ícones 64×64 | ✅ |
| §22 Andares com identidade | `tileset/` + `environment/` | ✅ |
| §62 Sem placeholders | Pack real, 422 PNG | ✅ |

> **Nenhum requisito visual do `Master-Prompt.md` exige asset novo.**

---

## 11. Ações necessárias

| # | Ação | Bloqueio |
|---|---|---|
| 1 | Copiar `sprites/` para este repositório (fonte) | — |
| 2 | Copiar `LICENSE.txt` e `README_IMPORT.txt` **obrigatório** | — |
| 3 | Gerar `manifest.json` com `ID → caminho → dimensão → origem` | — |
| 4 | Selecionar subset para `public/assets/` (< 8 MB) | — |
| 5 | Redimensionar `ui/`, `hero_skins/`, `portraits/` (2048² → 256²) | — |
| 6 | Copiar `ASSET_MANIFEST.md` (origem e licença) | — |
| 7 | Revisão visual por lote dos 224 ícones | Fase 9 |
| 8 | Escolha das skins iniciais do Rei | `P-006` |
| 9 | Escolha final dos 4 heróis | `P-002` |

---

## 12. Referências

- [`ART_GUIDELINES.md`](ART_GUIDELINES.md) — direção de arte, pipeline, QA
- [`UI_UX.md`](UI_UX.md) — como a arte aparece na interface
- [`CHARACTER_SYSTEM.md`](CHARACTER_SYSTEM.md) — os 4 heróis
- [`TOWER_SYSTEM.md`](TOWER_SYSTEM.md) — inimigos
- [`DECISIONS_LOG.md`](DECISIONS_LOG.md#adr-004--reaproveitamento-do-pack-de-sprites) — ADR-004
- Pack original: <https://nikastudio.itch.io/fantasy-dungeon-top-down-pixel-rpg-asset-pack-unity-6-urp>
