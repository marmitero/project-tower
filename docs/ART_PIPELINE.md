# Pipeline de arte — otimização e estilização

**Versão:** 0.2 · **Data:** 2026-10-03 · **Estado:** ✅ **F0 IMPLEMENTADA** (ferramentas, formato e renderer prontos e testados; **0 imagens geradas** — o Lote 1 é o primeiro). As seções marcam **[medido]** (fato do pack) e **[as-built]** (como ficou no código)
**Roadmap:** [`STYLIZATION_ROADMAP.md`](STYLIZATION_ROADMAP.md) · **Decisão:** [ADR-032](DECISIONS_LOG.md) · **Base:** [`ART_GUIDELINES.md`](ART_GUIDELINES.md), [`ASSET_INVENTORY.md`](ASSET_INVENTORY.md), [`ASSET_GAP.md`](ASSET_GAP.md), [`OPENRPG_REFERENCE.md`](OPENRPG_REFERENCE.md)

> Tudo aqui foi **medido nos arquivos reais** do repositório (`assets/sprites/characters/*`, `render/BattleScene.ts`, `render/Arena*.ts`), não presumido. Onde um número é **proposta** (a calibrar no Lote 1), está marcado **(calibrar)**.

---

## 1. Especificação de estilo (a arte do jogo hoje)

| Atributo | Valor observado |
|---|---|
| Técnica | Pixel art com contorno escuro de 1 "pixel de arte", brilho especular nos metais e na gosma, luz vinda do **alto-esquerda**. **[medido]** O pack **não é pixel art exata**: há suavização (≈ 430–620 "cores significativas" por personagem, ~50 mil cores reais no Guardião e no Esqueleto; só o Arcanista tem paleta enxuta de 31). Daí a regra: **miramos o look, não a paleta** — a paleta de 64 cores é aplicada só no empacotamento (§6.4) |
| Vista | Top-down 3/4 (corpo inteiro, cabeça grande ≈ 1/4–1/3 do corpo); nas lutas só as vistas **esquerda/direita** são usadas |
| Escala do pixel | **[medido]** moda dos intervalos entre bordas de cor: **3 px** (Guardião, Orc, Arcanista) e **4 px** (Gosma) — `art measure`. A colagem à grade (`--snap 3`) existe mas fica **desligada** até o Lote 1 provar que ajuda |
| Paleta | Escura e saturada de fantasia sombria; cada criatura tem 1 cor dominante + 1 de acento + contorno quase preto da mesma matiz (o contorno da gosma é verde-escuro, não preto) |
| Legibilidade | Silhueta distinguível a 96 px; sprite sempre mais claro/saturado que o piso da arena |
| Fundo | Transparente (alfa) nos entregáveis; **magenta `#FF00FF` sólido nas gerações** |
| Texto na arte | **Proibido** (rótulos são HTML PT-BR). Única exceção negociada: o logotipo (§12) |
| Filtro | `NEAREST`, sem mipmap, sem compressão com perda |

Regra de ouro: o que for gerado precisa ficar **ao lado** dos sprites do pack, na mesma tela, sem parecer de outro jogo. O relatório de cada lote traz uma **contact sheet** com o novo asset lado a lado com o equivalente do pack.

---

## 2. Especificação de movimento (o que "movimentação fiel" significa)

### 2.1 Formato atual das folhas (pack Nika)

- **Folha:** 1024×1024 RGBA, grade **4×4** de quadros **256×256**; **cada linha é uma direção**: `0` baixo · `1` cima · **`2` esquerda** · **`3` direita**; as colunas são os quadros.
- **6 folhas por personagem:** `idle`, `walk`, `run`, `attack`, `hurt`, `death`. O **combate usa só** `idle`, `walk`, `attack`, `hurt`, `death` e **só as linhas 2 e 3** (`ROW_LEFT = 2`, `ROW_RIGHT = 3`, `FRAME_COUNT = 4` em `BattleScene.ts`). Herói luta virado à direita; inimigo, à esquerda.
- **Velocidades (quadros/s)** no `BattleScene`: `idle 7 · walk 10 · attack 12 · hurt 12 · death 8`; `idle`/`walk` repetem, as demais tocam uma vez (a morte termina no último quadro).

### 2.2 Medidas (caixa dos pixels opacos num quadro de 256 px)

| Personagem | idle (alt. × larg.) | Base dos pés (y) | Observações |
|---|---|---:|---|
| Guardião (`hero`) | 181 × 115–121 | **243** | idle = 2 poses repetidas (quadros 0–1 iguais, 2–3 iguais e **4 px mais baixos**: "respiração") |
| Arcanista (`mage`) | 192 × 128 | 246 | cajado alto; base ≈ 243–246 |
| Orc | 176–179 × 136–139 | 243 | idle com o mesmo balanço de 4 px |
| Gosma (`slime`) | 113–117 × 136 | 243 | achatada; ataque estica até 177 de largura |
| Morcego (`bat`) | 132 × 114 | 243 (sombra no chão) | voa, mas a **base do quadro** é a mesma |
| Chefe (`boss`) | 152 × 155–175 | 243 | maior; largura 175 |

| Folha | Quadros | O que muda |
|---|---|---|
| `idle` | 4 (2 poses × 2) | Balanço vertical de 4 px, sem deslocamento horizontal |
| `walk` | 4 distintos | Alternância de passos; altura 177–181, largura 114–124 |
| `attack` | 4 | Preparação → avanço → golpe estendido (**largura sobe de ≈ 115 para ≈ 160–195 px**, altura cai ≈ 20 px) → recuo |
| `hurt` | 4 | Recuo progressivo: altura cai 181 → 145–154 e largura sobe até ≈ 169 (corpo inclinando para trás) |
| `death` | 4 | Queda até **deitado**: ≈ 200–212 × 71–86, **base ainda em 243** |

### 2.3 Contrato de âncora (vale para TODO personagem novo)

1. **Âncora:** centro horizontal do corpo em **x = 128 ± 8** e **base dos pés em y = 243** (quadros 0–1 do `idle`; 247 nos quadros de "respiração").
2. **Altura em pé** (quadro 0 do `idle`): humanoide **176–192 px**, criatura baixa (gosma, aranha) **105–125 px**, voador **125–140 px**, elite = humanoide +8 %, chefe **150–200 px**. Dentro de **uma entidade** a escala é **única** em todos os quadros (nada de "encolher" entre poses).
3. **Nada corta a borda** do quadro de 256 px (≥ 4 px de margem), nem no golpe mais largo.
4. **Mesmo número de quadros** do pack (4 por animação) e **mesma intenção de pose**: preparar → golpear → recuar (`attack`); recuar/inclinar (`hurt`); cair e ficar deitado (`death`).
5. Personagem de **dois lados**: o jogo usa o **atlas da direita** e **espelha** (`flipX`) para a esquerda; por isso o desenho não pode depender de assimetria que "troque de lado" (cicatriz/arma na mão certa são aceitáveis — o espelho vale para ambos os lados).

---

## 3. O formato novo — `ita-atlas-v1` (atlas compacto)

Para **otimizar** (−78 % de pixels) e para **uma geração render um personagem inteiro**, cada personagem novo passa a ser **1 atlas** (voltado para a direita):

```text
largura  = 4 colunas × 256 px = 1024 px
altura   = 5 linhas  × 256 px = 1280 px      (relação 4:5 — pedido ao gerador)
linha 0 = idle (4 quadros)     linha 3 = hurt (4 quadros)
linha 1 = walk (4 quadros)     linha 4 = death (4 quadros)
linha 2 = attack (4 quadros)
```

- **JSON junto** (`<id>.atlas.json`): `{ "format": "ita-atlas-v1", "cell": 256, "cols": 4, "anchor": [128, 243], "anims": { "idle": {"row":0,"fps":7,"loop":true}, … }, "facing": "right", "flipForLeft": true }`.
- **Compatibilidade:** os 19 personagens do pack **continuam** como estão (6 folhas × 4 direções). `CharacterAssets` passa a aceitar **`sheets` (legado) ou `atlas` (novo)**; o `BattleScene` escolhe pela presença do campo. As linhas 2–3 do legado e o `flipX` do atlas produzem o mesmo resultado na tela.
- **Calibração (Lote 1):** se o gerador não respeitar a grade 4×5, a **Opção B** divide em **2 gerações** — *Atlas Locomoção* (`idle`, `walk`) e *Atlas Combate* (`attack`, `hurt`, `death`) — e o normalizador junta os dois no mesmo `ita-atlas-v1`.
- **Linha de skill (futuro):** o formato reserva `row 5` opcional para a pose de conjuração (herói com skill); não é gerada nesta etapa.

---

## 4. Como cada tipo de asset é gerado

Todas as gerações usam `generate_image` **com imagens de referência** (até 10 por chamada). A referência é o que garante a **estética** (folha do pack) e a **movimentação** (atlas-guia).

### 4.1 Atlas-guia (zero geração — feito por script)

`art:atlas` monta, a partir das folhas do pack, uma imagem 1024×1280 com a **linha 3 (direita)** de `idle`, `walk`, `attack`, `hurt`, `death` de um personagem-modelo, sobre **fundo magenta**. Esse é o "esqueleto de poses" que o gerador deve **redesenhar** com outro personagem.

| Tipo do novo personagem | Modelo do atlas-guia | Por quê |
|---|---|---|
| Humanoide guerreiro/tanque | `hero` (Guardião) ou `orc` | Postura, golpe lateral, queda |
| Humanoide à distância/conjurador | `mage` / `archer` / `necromancer` | Arma/cajado levantado, projétil |
| Criatura baixa/amorfa | `slime` | Esticar/achatar, queda "derretendo" |
| Voador | `bat` | Batida de asa, mergulho |
| Esquelético | `skeleton` / `bloodskeleton` | Ossos, queda desmontando |
| Elite/grande | `boss` / `elitearcher` | Escala maior, golpe pesado |

### 4.2 Modelo de prompt — personagem (inglês, para o gerador)

```text
[REFERENCES] image 1 = pose guide atlas (4 columns x 5 rows, magenta background); image 2..3 = style references from the game's sprite pack.
Redraw the guide as a NEW character: <CONCEITO: papel, estilo, cores, arma>.
KEEP EXACTLY: the 4x5 grid, the position and silhouette size of every frame, the pose of every frame
(row 1 idle, row 2 walk, row 3 attack, row 4 hurt, row 5 death), the character facing RIGHT, feet on the same baseline.
STYLE: 16-bit-era pixel art, 1px dark outline in the hue of the material, 3-4 tone shading, top-left light,
chunky pixels ~4px, same rendering as the style references. Top-down 3/4 view.
BACKGROUND: solid flat #FF00FF magenta everywhere, no shadow on the ground, no grid lines, no text, no watermark.
DO NOT use pink or magenta anywhere on the character. Character height <ALTURA> px in a 256px cell.
```

### 4.3 Os outros tipos

| Tipo | Entrada | Saída pedida | Pós-processo |
|---|---|---|---|
| **Kit de arena** (1 por andar) | 2–3 ladrilhos do pack (parede, piso, tocha) como estilo + descrição do andar | Grade **4×4** de ladrilhos 256 (parede ×4 · luminária ×2 · piso ×4 · adereços ×4 · marco ×1 · 1 livre) | `art:seamless`, reduz para 128, tira de teste, `ArenaKit` JSON |
| **Retratos** (Rei e heróis) | `portraits/hero.png` + `generated/portraits/*` | **2×2** bustos 512 px sobre magenta | key, recorte, 512 + 256, moldura aplicada por CSS |
| **Kit de botões** | `generated/ui/frame_9slice_*` (silhueta) + paleta GBA-ITA | Grade de quadros 64 px: 2 variantes × 5 estados + 6 extras | fatiar, 9-slice (16 px), recolor |
| **Ícones** | ícones do pack (`icons1/*`, 64 px) | Grade **4×4** de ícones 64 px sobre magenta | key, fatiar, 64×64 |
| **Fundo de login** | 1 captura da arena + paleta | 1 imagem 16:9 **sem texto** | recortes 16:9 / 4:3 / retrato, WebP/PNG paleta |
| **Logotipo** | — | Letras pixel art sobre magenta | key; **ou** recomposição HTML (D8) |

---

## 5. Chroma key e limpeza (zero geração)

- **Cor-chave:** `#FF00FF`. Nenhum personagem/inimigo/ícone usa rosa ou magenta próximos de `#FF00FF` (o validador reprova).
- **Algoritmo** (herdado de `scripts/gen-item-icons.mjs`, já em produção para 14 ícones): `magentaness = min(R, B) − G`; `> 120` e `R,B > 150` ⇒ alfa 0; `60–120` ⇒ alfa em rampa + **despill** (puxa R/B para G + 40). O `art:key` acrescenta **erosão de 1 px** da borda e remoção de ilhas ≤ 3 px.
- **Validação:** ≤ 0,1 % de pixels residuais com `magentaness > 40`; **franja** (anel de 2 px) sem matiz rosa; alfa só 0 ou ≥ 200 fora de 1 px de borda (pixel art não tem meia-transparência larga).
- Ladrilhos **opacos** (piso) não usam magenta; ladrilhos com base transparente (parede) e adereços sim.

---

## 6. Normalização, fidelidade e otimização

### 6.1 Normalizador (`art:normalize`)

Fatiar a grade (4×5) em quadros → chave → **escala única por entidade** (altura do quadro 0 do `idle` ⇒ altura-alvo da §2.3) com reamostragem **nearest** e **colagem à grade de pixel** medida → **âncora** (centro x = 128, base y = 243; `idle` quadros 2–3 +4 px) → recentrar horizontalmente pelo **tronco** (não pela arma) → conferir margem de 4 px → grava `ita-atlas-v1` + JSON.

### 6.2 Como "movimentação fiel" vira número (`art:validate`)

Cada atlas novo é comparado com o **atlas-guia** que o originou:

| Teste | Mede | Aprovação (calibrar) |
|---|---|---|
| Quadros | 20 quadros não vazios | todos |
| Âncora | desvio da base dos pés vs 243 | ≤ 3 px (≤ 6 px na `death`) |
| Escala | altura do `idle` vs alvo da §2.3 | ± 8 % |
| Perfil de movimento | **[as-built]** erro médio absoluto das 4 séries por quadro — largura, altura, deslocamento x do centroide e da base, tudo ÷ altura do idle — contra o guia (a correlação foi trocada: séries quase planas, como o `idle`, não têm correlação definida) | ≤ 12 % (revisão ≤ 20 %) |
| Silhueta | IoU da máscara (alinhada pela âncora, escala normalizada) com o guia | `attack`/`hurt`/`death` ≥ 0,45; `idle`/`walk` ≥ 0,55 |
| Borda | pixels opacos na margem de 4 px | 0 |
| Chroma | resíduo e franja (§5) | dentro do limite |
| Paleta | nº de cores significativas (passos de 16 níveis) — **[medido]** o pack varia de 31 a 620 | ≤ 700 (só reprova pintura/foto); a paleta de 64 cores é o empacotamento |

**[as-built]** `npm run art:validate`/`art:ingest`: cada teste sai `ok`/`revisar`/`FALHA`; o veredito é **APROVADO** · **REVISÃO VISUAL** (algum `revisar`) · **REFAZER** (alguma `FALHA`). **Cuidado:** o guia tem de ser o MESMO que foi dado ao gerador — validar contra outro arquétipo (ex.: orc contra o Guardião) cai em REVISÃO porque a pose da morte/ataque difere de verdade (testado). A decisão final é sempre visual (contact sheet com o guia ao lado e um GIF/tira de cada animação no relatório). Os limiares saem do **Lote 1** (3 pilotos) e ficam no config do script.

### 6.3 Arena (`art:seamless`)

1. Para cada ladrilho de parede/piso, **mistura as bordas** (offset de meia largura + máscara) até a diferença de cor entre bordas opostas ficar ≤ ΔE 6.
2. **Tira de teste:** monta 12 ladrilhos sorteados lado a lado (a mesma função `pickWallTile`/`pickFloorTile` do jogo) e mede o salto de cor entre vizinhos; reprova acima do limite e salva a imagem para a revisão.
3. **Pista:** luminância média do piso 25–55 %; adereços com altura ≤ 70 % do ladrilho; marco só na fileira de trás.
4. Reduz de 256 para **128 px** com `nearest` (pixel grid de 2×).

### 6.4 Otimização (`art:pack`)

- **PNG de paleta** **[as-built]**: quantizador próprio por corte mediano (`tools/art/quantize.mjs`), **64 cores, sem dithering**, alfa binário. Não usamos a opção `colours` do `sharp`: medida em 2026-10-03, pediu 64 e saiu 256. **[medido]** no Guardião: erro médio 3/255 por canal, **623 KB → 116 KB (−81 %)**; no Esqueleto 571 → 115 KB.
- **Atlas compacto** (§3): 1280×1024 por personagem em vez de 6 × 1024².
- **Carga por andar** (`Arena`/`BattleScene` + `boot`): ao entrar num andar carrega `ArenaKit` + 5 inimigos; ao sair, `textures.remove` das do andar anterior (exceto herói ativo e os do próximo andar já pré-carregado). Orçamento de memória: **≤ 24 MB por andar**.
- **Orçamento em CI:** `check:assets` falha se um atlas/kit sair da especificação, se houver asset órfão ou se um arquivo passar de **400 KB** (atlas) / **250 KB** (kit); `check:preview` ganha limite total de bytes do bundle.
- **Medição:** `browser-smoke` registra fps médio e `performance.memory`/contagem de texturas do Phaser por andar visitado.

### 6.5 Recolor determinístico (`art:recolor`) — zero geração

Mapeia as **rampas de matiz** do atlas para outra rampa (rotação de matiz + ajuste de saturação/valor **por faixa de luminância**, preservando contorno e brilho especular). Usos: cores de botão (Rubi/Esmeralda/Âmbar), **tier por andar** dos inimigos de bioma (Onda 2), variações de tintura de arena. **Não** é usado para fingir "inimigo novo" nos andares 1–10 (lá cada inimigo é um design próprio).

---

## 7. Arena: contrato de dados (admin-ready) — **[as-built]**

A tabela deixou de ser código (`ARENA_THEMES` no render) e virou **dado do config**: `ArenaKitDef` em `packages/config/src/arenas.ts`, parte do **ContentPack v5** (`pack.arenas`), validada por `arenaKitErrors` (ids únicos, ≥ 1 parede e ≥ 1 piso, pesos > 0, `tint`, `torchEvery` ≥ 1, kits `masmorra` e `boss` obrigatórios, todo `FloorVisual.theme` com kit, ids contra o manifesto). `render/arenaThemes.ts` é só uma visão desses kits. Campos **reservados** (iluminação, ambiente, marco) entram como opcionais aditivos quando o renderer os implementar:

```ts
// já existe (as-built):
interface ArenaKitDef {
  id: string; name: string;                // "f02_porao_umido"
  wall: string[]; torch: string | null; torchEvery: number;   // IDs do manifesto
  floor: string[]; props: { assetId: string; weight: number }[];
  tint: number;                            // 0xRRGGBB
}
// reservado (ainda NÃO existe): landmark, lighting {vignette,color}, ambient {kind,density}
// geometria (altura da parede, fileiras, parallax) continua em ARENA_LAYOUT — não é arte
```

`FloorVisual.theme` aponta para o `ArenaKitDef.id` do andar; tema desconhecido continua caindo no padrão (`masmorra`). Os 7 kits de fábrica (peças do pack) seguem valendo; os kits gerados por andar entram na Onda 1.

---

## 8. Heróis e inimigos: contrato de dados

| Dado | Mudança |
|---|---|
| `EnemySeed.assets.atlas?` **[as-built]** | `{ sheets: charSheets("goblin"), atlas: "enemies/f05_cantor_de_ecos" }` — `atlas` tem prioridade; **`sheets` vira o fallback visual** (o arquétipo do guia) se o PNG não carregar; validado no ContentPack |
| `FloorDef.pool` | 5 entradas (T/D/V/M/E) por andar; `DEFAULT_POOL_PLAN` reescrito (**uma passada de balanceamento**: `report:balance`) |
| `HeroIdentityDef.assets?` **[as-built]** | `{ portrait?, atlas? }` — o renderer lê a **identidade** primeiro, depois a classe (`heroSpriteRecord`, `heroPortraitId`); os 4 iniciais seguem pela classe |
| `classes` | 5ª classe `cleric` (ADR-033) |
| Teste de CI | nenhum par de heróis da mesma classe com `(atributos, skill assinatura)` iguais; todo herói/inimigo tem atlas e retrato válidos |

---

## 9. Retratos e skins do Rei

- **Moldura de busto** igual ao `portraits/hero.png`: ombros visíveis, rosto 3/4, olhos a ≈ 38 % da altura, centrado; fundo magenta na geração → o jogo coloca fundo/moldura por CSS (`--asset-frame-9`).
- **Rei:** 12 temas (roadmap §5.1) em 3 folhas 2×2; saídas **512×512** (criação/Rei) e **256×256** (HUD). `KingSkinConfig` ganha `portraitAssetId` e `unlock`; o save guarda só o `skinId` (ids antigos são mapeados na migração, sem perda).
- **Heróis:** 256×256, mesmo enquadramento; geradas 4 por folha.

---

## 10. UI estilo Game Boy Advance

- **Kit:** quadros 64×64, **9-slice de 16 px**, 5 estados (normal, hover, pressionado, ativo, desabilitado), variantes Índigo/Prata geradas; Rubi/Esmeralda/Âmbar por recolor (§6.5). Biselado: 1 px claro em cima/esquerda, escuro embaixo/direita; sombra de 1 px; cantos arredondados de 3 px de arte.
- **CSS:** `border-image-source: var(--ui-btn-indigo-normal)` etc., mesmas variáveis absolutas do `--asset-frame-9` (um `url()` relativo dentro de variável CSS quebra no bundle — aprendido na Fase 13). Sem texto rasterizado.
- **Acessibilidade:** o contraste do rótulo contra o botão ≥ 4,5:1; o estado `ativo` não depende só de cor (bisel invertido); alvo de toque ≥ 44 px (`--touch`).
- **Ícones:** 64×64, exibidos a 24–32 px com `image-rendering: pixelated`; `aria-hidden` (o rótulo textual continua).

---

## 11. Login / Criação do Rei

- **Fundo:** composição pensada para recorte (`object-fit: cover` + `object-position` no ponto focal da torre); regiões do formulário e da zona de login em **tons calmos** (sem detalhe de alto contraste atrás do texto).
- **Zonas** (dado `CreationLayout`): logo 8–30 % da altura · formulário 320–480 px, centralizado · **zona de login 48 px** logo abaixo do formulário (vazia hoje) · rodapé com créditos/versão.
- **Zona do Google:** contêiner de tamanho fixo, `role="group"`, `aria-label="Entrar com conta"`; o botão Google (`AUTH_SYSTEM.md`) é montado **dentro** dela; nenhum ajuste de posição depois.
- **Logotipo:** PNG com chroma **ou** recomposição HTML (fonte pixel + ornamento gerado) caso o texto gerado venha com erro; em ambos os casos o `aria-label`/`<h1>` do texto "Idle Tower Adventure" é HTML.

---

## 12. Nomes, pastas e manifesto

```text
assets/_incoming/lote-NN/           ← saídas brutas dos geradores (no .gitignore; nunca versionadas)
assets/generated/
  enemies/<id>.png + <id>.atlas.json         (ex.: enemies/f05_cantor_de_ecos)
  heroes/<classe>_<n>_<slug>.png + .atlas.json
  portraits/king/<skin>.png (512)  ·  portraits/king/<skin>_256.png
  portraits/heroes/<slug>.png (256)
  arenas/<kit-id>/{wall_0..3,floor_0..3,fixture_0..1,prop_0..3,landmark}.png   (128 px)
  ui/gba/<variante>_<estado>.png  ·  ui/gba/icons/<nome>.png
  login/{bg_16x9,bg_4x3,bg_portrait}.png  ·  login/logo.png
  PROVENANCE.md                      ← lote, prompt-id, referências, tentativas, métricas de fidelidade
```

IDs do manifesto = caminho sem extensão (mesma regra de hoje). `scripts/build-assets.mjs` indexa as pastas novas; `check-assets.mjs` valida dimensões, alfa, magenta residual, tamanho e órfãos.

---

## 13. Scripts da Etapa F0 — **[as-built]** (`scripts/art.mjs` + `tools/art/*`)

| Script | Função |
|---|---|
| `art:guide` | monta o atlas-guia 4×5 (+ versão sobre magenta, a que vai ao gerador) a partir de um personagem do pack |
| `art:key` | chroma key + despill + limpeza |
| `art:normalize` | fatia, escala única, âncora, grade de pixel → `ita-atlas-v1` |
| `art:validate` | testes de fidelidade (§6.2) + chroma + paleta; gera JSON e contact sheet |
| `art:seamless` | ladrilhos que emendam + tira de teste (§6.3) |
| `art:recolor` | rampas de matiz (§6.5) |
| `art:pack` | quantiza (64 cores) e grava PNG indexado; confere o orçamento de bytes |
| `art:contact` | contact sheet guia × candidato (5 animações × 4 quadros, fundo xadrez) |
| `art:ingest` | **o atalho do lote**: chave → normaliza → valida → empacota → grava `<id>.png` + `<id>.atlas.json` + contact sheet em `assets/_review/` (ignorado pelo Git) |
| `art:measure` | mede o pixel de arte de uma imagem |
| `art:kit` | **kit de arena** (folha 4×4 → 16 ladrilhos 64×64: 5 paredes, tocha, banner, portão, 4 pisos, 4 adereços; mede emenda em X e luminância do piso) |
| `art:buttons` | **kit de botões GBA** (folha 4×4 → índigo/prata × 4 estados + redondo/toggle/aba; rubi, esmeralda e âmbar saem por *recolor* do índigo = 0 geração; sombra magenta removida por tom rosado) |
| `art:icons` | **16 ícones** (folha 4×4 → 64×64 centrados, na ordem de `ICON_NAMES`) |
| `art:portraits` | folha 2×2 de retratos do Rei → `portraits/king/<id>` (512) + `<id>_s` (256, HUD) |
| `art:trim` / `art:backdrop` | apara/enquadra o logotipo e reduz o fundo do login (16:9) |
| *(embutido no `ingest`)* **reflow** | `tools/art/reflow.mjs` (ADR-035): se o gerador devolver a folha fora de 4:5 (ex.: 1024×1024), reposiciona as 5 linhas sem esticar; erro claro se não achar exatamente 5 linhas |
| `art:provenance` | `add`/`status`/`render`: **contador de gerações por lote** (recusa a 11ª) e `PROVENANCE.md` |

Todos em Node (`sharp` já é dependência), testados em `tests/integration/art-pipeline.test.ts` (30 testes, incluindo kit/botões/ícones com folhas sintéticas e a igualdade pipeline × config) com fixtures **do próprio pack** — nenhuma geração foi necessária. Os números vivem em `tools/art/spec.mjs` (o renderer espelha o que precisa em `packages/config/src/atlas.ts`; um teste garante que não divergem). O `check:assets` agora audita `assets/generated` (formato, orçamentos, manifesto em dia, procedência ≤ 10 por lote).

**Fluxo de um lote (as-built):** `npm run art:guide -- <arquétipo>` → gerar com a imagem `.magenta.png` + prompt do §4.2 → salvar o bruto em `assets/_incoming/L1/` → `npm run art:ingest -- <bruto> --id enemies/<id> --kind humanoid` → olhar a contact sheet → `npm run art:provenance -- add --batch L1 --asset <id> --kind atlas --prompt "…"` → ligar `assets.atlas` no config → `npm run assets:build` → `npm run check`.

**Kit de interface — as-built (Lote 1).** Os nomes do que o pipeline produz (`UIKIT`, `ICON_NAMES`, `KIT_LAYOUT`) são **iguais** aos de `packages/config/src/uitheme.ts` (`gbaAssetIds()`, `BUTTON_COLOURS`, `ICON_NAMES`) — um teste garante. No jogo: `apps/game-web/src/gbaTheme.ts` transforma o manifesto em variáveis CSS (`--gba-<cor>-<estado>`, `--gba-icon-<nome>`) e liga a classe `tia-gba` **só se o kit estiver completo** (senão, visual anterior). `ActionButton` ganhou `variant` `confirm`/`warning` e `icon` (→ `data-icon`). Layout do login em `CREATION_LAYOUT` (foco do fundo, sombra, largura do logotipo/cartão, **zona reservada ao Google** `[data-auth-slot="google"]`, altura fixa 52 px). Tinta do texto dos botões: claro com sombra de 1 px nos estados escuros; escuro no `pressed` claro e no `disabled` (medido no pixel central de cada peça).

---

## 14. O que o OpenRpg contribui (e o que não)

| Contribui | Como entra |
|---|---|
| Classe = **pacote de efeitos** sobre atributos (`StaticEffect`) | Cada variação de herói é um **delta de atributos** sobre o modelo da classe (identidade mecânica real, §10) |
| Roster de **10 habilidades** (Slash, Power Strike, Chi Blast, Focus Strike, Backstab, Poison Blade, Fire Bolt, Ice Storm, Cure…) | Base das **skills assinatura** das 21 variações novas (mesmo método de adaptação da Fase 6) |
| `Cure`/`Cura` | Nascimento da classe **Clérigo** |
| Modelo de itens/qualidade | Não muda nesta etapa |
| **Arte** | **Nada utilizável**: o OpenRpg é um framework C#; a arte vem do pack Nika (referência de estilo/movimento) + gerações novas |

**`--floor-gain` (Lote 2, ADR-036).** `node scripts/art.mjs kit <folha> --id <kit> --floor-gain 0.78` multiplica a luminância só dos 4 ladrilhos de piso, para quando o gerador devolve um piso mais claro que `ARENA.floorLuma` (0,10–0,55) — mais barato e determinístico que regerar. O valor usado fica na procedência. Receita contra efeitos inventados em inimigos: o prompt deve dizer "ABSOLUTELY NO special effects, only the guide's thin white slash arc".

**Lote 5 (ADR-040) — armadilhas do gerador.** (1) Às vezes devolve a folha em **16:9 com 8×4 ou 6×4 quadros**: o `reflow` recusa (e deve) — refazer com "TALL PORTRAIT 4:5, EXACTLY 4 columns and 5 rows, same character in EVERY frame". (2) Às vezes o fundo vem **rosa-claro** (ex. 253,142,252) em vez de #FF00FF: o `ingest` agora normaliza (`normalizeKeyColour`) e avisa no log. (3) Peça sempre **uma folha por herói**, em paralelo, e confira o formato antes de ingerir.
