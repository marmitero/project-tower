# Roadmap — Otimização e estilização

> **Continuar a arte sem o histórico da conversa:** [`ART_HANDOFF.md`](ART_HANDOFF.md) (regras do usuário, receitas de prompt, fluxo por comando, onde editar, estado e fila de lotes).

**Versão:** 0.3 · **Data:** 2026-10-04 · **Estado:** ✅ Gate 0 aprovado · **F0 implementada** (ADR-033) · **Lotes 1–5 aprovados** · **Lote 6 aplicado** (ADR-042: 26 heróis — meta M3 batida) — aguarda "lote 06 aprovado"
**Decisão:** [ADR-032](DECISIONS_LOG.md) · **Documento técnico irmão:** [`ART_PIPELINE.md`](ART_PIPELINE.md) (especificação medida dos sprites, prompts, chroma key, validação, integração)
**Fonte do pedido:** mensagem do usuário de 2026-10-03 ("otimização e estilização") · **Regras superiores:** `Master-Prompt.md` §10, §22, §23, §59–§62, §105

> Este roadmap cobre **só** esta etapa, que antecede o Painel Admin (FASE 14). Ele não altera regra de gameplay além do que está dito na §4 (5ª classe e variantes de herói) e na §5 (pool de 5 inimigos por andar).

---

## 1. A meta (o que "pronto" significa)

| # | Meta do usuário | Critério de aceite medível |
|---|---|---|
| M1 | **Cada andar tem sua própria arena**, diferente das outras, respeitando a movimentação | Andares 1–10: **10 kits de arena únicos** (parede, piso, luminária, adereços, clima). Andares 11–40: **6 biomas × variação por andar** (§3.3). Nenhuma arena quebra o scroll horizontal, a pista de luta nem a legibilidade (§3.2) |
| M2 | **5 inimigos por andar**, cada um de um estilo (veloz, tanque…) e estética única, com sprite sheet gerado e movimentação fiel ao que já temos | Andares 1–10: **50 inimigos** (11 existentes + **39 novos**), 5 papéis por andar. Todo inimigo passa no **teste de fidelidade de movimento** (§6.3) |
| M3 | **5 variações de herói por classe** → **≥ 25 heróis** no lançamento | 5 classes × 5 = **25 heróis** (4 existentes + **21 novos**), cada um **mecanicamente distinto** (Master-Prompt §10) e com sprite sheet + retrato |
| M4 | **Skins do Rei = retratos PNG** de RPG clássico, **≥ 10** | **12 retratos** (3 gerações × 4), 512 px + versão 256 px |
| M5 | **Botões do HUD são assets** com visual de videogame antigo (Game Boy Advance) | Os 8 botões de navegação + botões de ação usam o kit (5 estados: normal, hover, pressionado, ativo, desabilitado) + 8 ícones de aba. Rótulos continuam em HTML PT-BR (sem texto rasterizado) |
| M6 | **Tela de login / Criação do Rei com fundo próprio** destacando "Idle Tower Adventure", pronta para o login Google | Fundo + logotipo próprios; **zona reservada** para o botão Google (§7) — ligar o login depois não move nada |
| M7 | **Limite de 10 gerações de imagem por sessão** | Cada **lote** gera **no máximo 10**, para, explica, aplica no jogo e espera o seu OK (§2) |
| M8 | **Mesma arte do jogo** + **fundo magenta sólido** para chroma key | Spec de estilo medida (`ART_PIPELINE.md` §1) + `#FF00FF` em todo asset com transparência |
| M9 | **Poses/movimentações corretas** em todo personagem e inimigo | idle · walk · attack · hurt · death, 4 quadros, âncora e escala do pack (`ART_PIPELINE.md` §2) |
| M10 | **Otimização** (nome da etapa) | Orçamentos da §8: arte adicionada ≤ 25 MB no repositório, carga por andar (lazy), memória de textura por andar, ≥ 55 fps |

---

## 2. A regra dos 10 — o ciclo de um LOTE

> **1 lote = 1 sessão = no máximo 10 chamadas de `generate_image`** (conta TODAS: refações e falhas também). Planejado: **8 itens + 2 de reserva** para refazer o que falhar.

```text
1. PREPARAR   → ler o brief do lote (§9), conferir as referências, montar os "atlas-guia" por script (0 geração)
2. GERAR      → até 10 chamadas, tudo salvo em assets/_incoming/lote-NN/ (fora do Git)
3. PARAR      → ao chegar em 10, ou ao fechar os 8 itens + reservas usadas, não gerar mais nada
4. PROCESSAR  → scripts (0 geração): chroma key → fatiar → normalizar → validar → contact sheet
5. APLICAR    → manifesto, config/dados, renderer/UI; testes; build:preview; browser-smoke + capturas
6. EXPLICAR   → relatório ao usuário: o que foi gerado (tabela arquivo → item → status), capturas,
                métricas de fidelidade, o que foi rejeitado e por quê, custo (gerações usadas/restantes)
7. PRÓXIMO    → lista o próximo lote (itens + reservas herdadas)
8. COMMIT/PUSH → só os assets finais normalizados + PROVENANCE
9. ESPERAR    → NÃO começa o lote seguinte sem o "lote NN aprovado" do usuário
```

- **Reserva:** gerações de reserva não usadas **não** acumulam para o mesmo lote (o teto é 10); o item rejeitado vai para o **topo do lote seguinte**.
- **Sem geração fora do lote:** scripts, validadores, recolor determinístico (§6.5 de `ART_PIPELINE.md`) e espelhamento **não** são gerações — por isso o pipeline faz o máximo por código.
- **Reprodutibilidade:** cada asset ganha uma linha em `assets/generated/PROVENANCE.md` (lote, prompt-id, referências usadas, nº de tentativas). As imagens-fonte grandes **não** são versionadas (mesma política dos ícones, `assets/SOURCES.md`).

---

## 3. Escopo — o que o "cada andar" significa na prática

O jogo tem **40 andares** (10 faixas largas + 30 "pináculos" de 500 níveis). Cumprir a letra do pedido em todos eles é **200 inimigos + 40 arenas**: ≈ 23 lotes só de inimigos se uma geração render um inimigo. Por isso o roadmap entrega em **ondas**, e a decisão do escopo é do usuário (Gate 0):

| Onda | O que entrega | Gerações planejadas | Lotes (8 + 2 reserva) |
|---|---|---:|---:|
| **Onda 1 — Lançamento** | UI GBA + login + 12 retratos do Rei + **25 heróis** + **andares 1–10 completos** (10 arenas, 50 inimigos) | **83** | **11–13** |
| **Onda 2 — Pináculos (famílias)** | Andares 11–40 em 6 biomas: 6 kits de arena + 2 folhas de marcos + **30 inimigos** (5 por bioma; o tier do andar muda por recolor + marco próprio) | **38** | **5–6** |
| **Onda 3 — Literal** (opcional, pós-lançamento) | Os outros **120 inimigos** e 22 arenas para que os andares 11–40 também tenham 5 inimigos exclusivos cada | ≈ 142 | ≈ 18 |

**Padrão adotado:** executar a Onda 1; decidir sobre as Ondas 2 e 3 depois de ver o resultado no jogo (a Onda 1 cobre as primeiras ≈ 360 h de jogo: o andar 10 acaba no Rei Nv 5.000).

### 3.1 Os andares 1–10 (arena + 5 inimigos por papel)

Papéis: **T** Tanque · **D** Dano · **V** Veloz · **M** Mago · **E** Elite (raro). Os 5 slots por andar são os mesmos 5 papéis; o papel `balanced` deixa de ser slot (o Esqueleto vira **D**). **Negrito** = já existe no pack (sheets prontas). Os nomes dos novos são **conceitos provisórios** (editáveis até o lote do andar).

| Andar | Arena (identidade) | T | D | V | M | E |
|---:|---|---|---|---|---|---|
| 1 · Entrada da Torre | Masmorra de pedra cinza, portão, tochas laranja, barris/caixas (refeita com kit próprio) | **Gosma** | **Goblin** | **Morcego** | Duende de Faíscas | Goblin Capitão |
| 2 · Porão Úmido | Pedra escura molhada, poças, ralos, musgo, lanternas verde-pálido | Sapo-Lodo Gigante | Rato de Esgoto Bruto | Enguia Rastejante | **Morcego Tóxico** | Troll do Esgoto |
| 3 · Galeria das Ossadas | Nichos de crânios, piso de ossos e areia, velas | Golem de Ossos | **Esqueleto** | Cão de Ossos | Crânio Necrovela | Cavaleiro de Ossos |
| 4 · Catacumbas Antigas | Sarcófagos, arcos, lajes rachadas, urnas, névoa roxa | Estátua Guardiã | **Orc** (saqueador de tumbas) | Escaravelho de Tumba | Sacerdote Mumificado | Múmia Real |
| 5 · Salão dos Ecos | Salão de cristal azul, colunas, mármore polido, lustres | Sentinela de Cristal | Duelista Fantasma | Espectro Sussurrante | Cantor de Ecos | Maestro do Vazio |
| 6 · Fornalha Esquecida | Forjas, lava em fendas, piso de metal escuro, bigornas, braseiros | Golem de Escória | Ferreiro Possuído | Salamandra Veloz | **Orc Flamejante** | Mestre da Forja |
| 7 · Jardim Gélido | Pedra com gelo, árvores cristalizadas, neve, brasas azuis | **Gosma Gélida** | Urso Glacial | Raposa Boreal | Feiticeira da Geada | Cavaleiro do Inverno |
| 8 · Ninho das Sombras | Pedra negra, teias, olhos nas paredes, névoa escura | Casulo Gigante | Aranha Presas-Negras | Sombra Rastejante | Tecelã de Pesadelos | **Goblin Sombrio** |
| 9 · Corredor Sangrento | Tapete rubro, correntes, armas penduradas, tochas vermelhas | Carrasco Encouraçado | **Esqueleto Sangrento** | Sanguessuga Alada | Bruxa de Sangue | Conde Carmesim |
| 10 · Câmara dos Mil Passos | Obsidiana e ouro, engrenagens de relógio, piso gasto por passos | Colosso de Obsidiana | Guerreiro Eterno | Relógio Vivo | Oráculo dos Passos | **Arqueiro de Elite** |

Contagem: 50 vagas = **11 existentes + 39 novos** (andar 1: 2 · andar 2: 4 · 3: 4 · 4: 4 · 5: 5 · 6: 4 · 7: 4 · 8: 4 · 9: 4 · 10: 4).

> **Consequência de gameplay (única do §5):** hoje o andar 1 sorteia só tanque/dano/veloz e o Mago entra no andar 3, o Elite no 9+. Com 5 por andar, **todo andar tem os 5 papéis**; o Elite é **raro** (peso baixo) e o Mago do andar 1–2 usa `statMultiplier` baixo. Isso exige **uma passada de balanceamento** (`npm run report:balance`, matchups por andar) antes de cada onda de inimigos entrar no jogo — o ritmo de XP e o desgaste (ADR-030/031) não podem mudar.

### 3.2 Regras de arena que respeitam a movimentação

A arena é uma **faixa de ladrilhos que rola** (`render/Arena.ts`, `arenaLayout.ts`): parede em 40 % da altura com parallax 0,55, **2 fileiras de piso**, adereços só na fileira de trás (20 % de chance), o herói à esquerda (x ≈ 0,3) e o inimigo entrando pela direita (520 ms), `y ≈ 0,76` da altura. Logo, todo kit de arena **obedece**:

1. **Ladrilho 128×128** (mesmo tamanho do pack); a parede tem a base transparente (`wallOverlap` 12 %) que sobrepõe o piso.
2. **Continuidade horizontal:** qualquer ladrilho pode ficar ao lado de qualquer outro da mesma lista → bordas laterais compatíveis (padrão e cor); o script `art:seamless` corrige e o validador mede o salto de cor nas bordas.
3. **Pista de luta livre:** nada alto ou escuro sobre as 2 fileiras do piso; adereços só no fundo e **baixos** (não cobrem o sprite); contraste piso×sprite preservado (luminância média do piso 25–55 %).
4. **Sem elementos verticais que atravessem a pista** (colunas, estátuas) — ficam na parede.
5. **Clima como dado, não como arte fixa:** partículas/vinheta/tintura por andar (`ambient`, `lighting`) — poucos efeitos, **desligados com `prefers-reduced-motion`**.
6. **Identidade em 3 camadas:** (a) kit de ladrilhos exclusivo, (b) paleta/tintura, (c) 1 adereço-marco exclusivo do andar (aparece raramente na fileira de trás).
7. Cada kit declara `wall[4] + fixture[1–2] + floor[4] + props[4] + landmark[1]` = **≤ 16 ladrilhos = 1 geração** (grade 4×4).

### 3.3 Os pináculos (andares 11–40)

| Bioma | Andares | Identidade |
|---|---|---|
| Pináculo Arcano | 11–15 | Cristal violeta, runas, lustres flutuantes |
| Pináculo Carmesim | 16–20 | Carne e osso, vitrais rubros, correntes |
| Pináculo de Jade | 21–25 | Musgo, bambu de pedra, lanternas verdes |
| Pináculo de Obsidiana | 26–30 | Vidro negro, veios de lava, ferro |
| Pináculo Celeste | 31–35 | Nuvens, mármore dourado, vitrais de luz |
| Pináculo do Vazio | 36–40 | Pedra flutuante, cosmos, névoa estelar |

Cada andar = **kit do bioma** + **rampa de paleta própria** (recolor determinístico) + **marco próprio** (2 folhas de 16 marcos = 30 andares) + clima próprio. Cada bioma tem **5 inimigos exclusivos** (T/D/V/M/E) que sobem de *tier* por andar (recolor + nome; como as 6 faixas "elite" que o próprio pack já usa) — 30 designs em vez de 150.

---

## 4. Heróis: 25 = 5 classes × 5 variações

### 4.1 A 5ª classe (decisão de design que isto exige)

Hoje há **4 classes** (Guardião, Arqueiro, Arcanista, Invocador Sombrio). "5 por classe, ≥ 25" pede **5 classes**. Padrão adotado: **Clérigo** (`cleric`, suporte/sustain — "Cure/Cura" do roster do OpenRpg, ver `OPENRPG_REFERENCE.md` §4), com cura própria e efeito de equipe na Arena dos Chefes (a Torre é 1×1: cura-se a si mesmo). **Os 4 heróis iniciais continuam sendo os 4 do §10**; o Clérigo e todas as variações novas são obtidos pelo jogo (Market, caixas, summons, Chefes — sistema `acquisition.ts`, ADR-024). A 5ª classe é **dado** (`catalog.ts` + `skills.ts` + `heroes.ts`), com ADR própria (ADR-033) **antes** do lote de arte dela.

### 4.2 Regra de diferença real (Master-Prompt §10)

> "Proibido quatro personagens visualmente diferentes e mecanicamente iguais."

Cada variação traz **identidade própria**: atributos (delta sobre o modelo da classe, no estilo `StaticEffect` do OpenRpg), skill assinatura distinta, estilo de combate e afinidade de arma. Há um **teste de CI**: nenhum par de heróis da mesma classe repete `(atributos, skill assinatura)`.

### 4.3 O elenco (conceitos provisórios; nomes finais no ADR-033)

| Classe (papel) | 1 · existente | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| **Guardião** (tanque) | **Aldric** · cavaleiro azul | Escudeiro da Muralha (escudo-torre) | Cavaleiro Rubro (tanque agressivo) | Monge de Ferro (punhos — *Chi Blast*) | Lorde Cinzento (cavaleiro negro, roubo de vida) |
| **Arqueiro** (veloz, físico à distância) | **Kaia** · arqueira | Caçador Furtivo (adagas — *Backstab*) | Besteiro Pesado (*Focus Strike*) | Guardiã da Floresta (falcão) | Arqueiro Nômade (sol e areia) |
| **Arcanista** (mágico, área) | **Maelis** · estelar | Piromante (*Fire Bolt*) | Criomante (*Ice Storm*) | Tempestuário (raio) | Mago Ancião (arcano puro) |
| **Invocador Sombrio** (DoT, sustain) | **Vorath** · invocador | Necromante dos Ossos | Bruxa do Pântano (*Poison Blade*) | Ceifeira (roubo de vida) | Demonólogo |
| **Clérigo** (suporte) — **nova** | — | Sacerdotisa da Aurora (*Cure*) | Monge Curandeiro | Bispo Guerreiro (maça) | Druida da Vida |

Os nomes entre parênteses itálicos são as **habilidades-base do OpenRpg** (`Chi Blast`, `Focus Strike`, `Backstab`, `Fire Bolt`, `Ice Storm`, `Poison Blade`, `Cure`) que viram skills assinatura adaptadas (mesmo método do `OPENRPG_REFERENCE.md` §4: dano/cura, alvo, custo, recarga).

### 4.4 Dados novos para o herói

- `HeroIdentityDef.assets` (opcional): `{ portrait, sprites }` — **hoje o sprite vem da CLASSE** (`cls.assets.sheets`, lido em `render/battleSource.ts`); com 25 aparências o renderer passa a ler **primeiro a identidade do herói**, depois a classe (compatível: os 4 iniciais seguem como estão).
- Retrato do herói: 256×256 (HUD/Equipe/Códice) — mesmo enquadramento de busto do `portraits/hero.png`.

---

## 5. Skins do Rei, botões e login

### 5.1 Skins do Rei = retratos (M4)

Hoje a "skin" do Rei é um corpo do pack (`hero_skins/*`, 8 imagens 2048²) e o retrato do HUD é fixo (`portraits/hero`). Passa a ser: **skin = retrato PNG de RPG clássico** (busto, pixel art no estilo do pack), **12 retratos** (4 por geração, 2×2), cada um em **512×512** (tela de criação/Rei) e **256×256** (HUD). Lista de temas: Rei Real (coroa de ouro) · Rei Guerreiro · Rainha · Rei Sábio (barba, cetro) · Rei Sombrio · Rei do Gelo · Rei Dourado/Sol · Rei Caçador · Rei Arcano · Rei Rubro · Rei Esmeralda · Rei Ancião. O `skinId` salvo continua válido (ids antigos mapeiam para os 8 primeiros; **migração de save** sem perda). Desbloqueio por `unlock` (já existe no config) — alguns como recompensa futura.

### 5.2 Botões estilo Game Boy Advance (M5)

- **Kit** (1 geração, grade de quadros 64×64, fatiamento 9-slice 16 px): variantes **Índigo** (primário) e **Prata** (secundário) × **5 estados** + botão pequeno/redondo/alternador. As cores **Rubi** (perigo), **Esmeralda** (confirmar) e **Âmbar** (aviso) saem do mesmo desenho por **recolor determinístico** (rampa de paleta) — sem gastar geração.
- **Paleta GBA-ITA** (proposta, calibrada no Lote 1): contorno `#10102A`; Índigo `#2B2A6B · #4A48A8 · #7C7AE6 · #C9C8FF`; Prata `#5B6075 · #8D93A8 · #C4C9D8 · #F0F2FA`; Rubi `#6A1B2B · #B2354B · #E8667A`; Esmeralda `#1E5A3A · #3E9B63 · #8EDB9D`; Âmbar `#7A4B12 · #C98A27 · #F2D36B`. Biselado 1 px claro em cima/esquerda, escuro embaixo/direita, sombra de 1 px.
- **Ícones de aba** (1 geração, 16 ícones 64×64): Rei (coroa) · Heróis (elmo) · Equipe (estandarte) · Inventário (mochila) · Market (moeda/balança) · Torre (torre) · Arena (espadas) · Opções (engrenagem) + 8 de ação (poção, descanso, entrar, voltar, silenciar, chat, fechar, dados).
- **Integração:** o `ActionButton` (`@tia/ui`) passa a usar o kit por CSS (`border-image` 9-slice + variáveis, como o `--asset-frame-9` atual); rótulos seguem em HTML (PT-BR). Os botões não-`ActionButton` do HUD (Gerenciar, chat, "Dados ▴") migram para o mesmo kit.

---

## 6. Otimização — os orçamentos (M10)

| Item | Hoje | Meta da etapa |
|---|---|---|
| Arte adicionada ao repositório (Ondas 1+2) | — | **≤ 25 MB** (PNG de paleta; ver `ART_PIPELINE.md` §6.4) |
| Folhas por personagem | 6 sheets × 1024² (≈ 6 MP) | **1 atlas compacto** ~1024×1280 (≈ 1,3 MP): −78 % de pixels |
| Carga de arte | tudo que o tema usa, no 1º quadro | **por andar (lazy)**: kit + 5 inimigos do andar atual; o do andar anterior é descartado ao trocar |
| Memória de textura por andar | não medida | **≤ 24 MB** (kit + 5 inimigos + herói ativo) |
| Quadros por segundo | não medido em dispositivo | **≥ 55 fps** em desktop médio e **≥ 30 fps** em Android médio (idle da batalha) |
| Zip/preview | 501 requisições | `check:preview` ganha **orçamento de bytes** (falha se o bundle passar do limite) |
| Registro de uso | manifesto de 480 entradas | manifesto **por andar/pacote**; `check:assets` reprova asset órfão e atlas fora de especificação |

Trabalho de otimização que **não** gasta geração (Etapa F0, §8): empacotador de atlas, quantização de paleta, carregamento por andar, descarte de texturas, medição de memória/fps no `browser-smoke`.

---

## 7. Tela de login / Criação do Rei (M6)

**Contrato de layout** (o fundo é arte; o conteúdo é HTML por cima). Três artes, um contrato de zonas — editável em `CreationLayout` (dado):

```text
┌──────────────────────────────────────────────────────────┐
│                  ZONA LOGO  (8%–30% da altura)            │  ← logotipo "Idle Tower Adventure" (PNG com chroma)
│                                                            │
│   ┌────────────────────────────────────────────────────┐  │
│   │ ZONA FORMULÁRIO (centro, largura 320–480 px)       │  │  ← nome do Rei · retrato (skin) · herói
│   │   [ nome ] [ retrato ] [ herói ]  [ Convocar ]     │  │
│   └────────────────────────────────────────────────────┘  │
│   ┌────────────────────────────────────────────────────┐  │
│   │ ZONA DE LOGIN (reservada, 48 px de altura)         │  │  ← HOJE vazia; amanhã "Entrar com Google"
│   └────────────────────────────────────────────────────┘  │
│        créditos ("Assets by Nika Studio") · versão          │
└──────────────────────────────────────────────────────────┘
```

- **Fundo** (1 geração, sem texto): a Torre ao entardecer, composta para **cortar bem** em 16:9, 4:3 e retrato (`object-fit: cover`, ponto focal na torre; **áreas calmas** atrás das zonas de formulário e de login para legibilidade).
- **Logotipo** (1 geração, magenta, letras pixel art "IDLE TOWER ADVENTURE"): se o texto vier errado, o logotipo é **recomposto em HTML/CSS** com fonte pixel (a leitura em PT-BR/inglês não pode depender da sorte do gerador) — o PNG vira só a moldura/ornamento.
- **Google Login depois:** a **zona de login existe desde já** (contêiner com tamanho fixo e `aria-label`, vazio e sem placeholder visível — §62 não é violado: não há arte provisória). Quando o `AUTH_SYSTEM.md` entrar, só o botão é montado dentro da zona; posição, espaçamento e estética não mudam.

---

## 8. Etapas (não-geração) e Gates

| Etapa | Conteúdo | Gerações |
|---|---|---:|
| **Gate 0** | O usuário aprova este roadmap e responde às decisões da §10 | 0 |
| **F0 — Fundação** ✅ **FEITA (2026-10-03, ADR-033; `art:atlas` virou `art:guide`, + `art:ingest`)** | `ART_PIPELINE`: scripts `art:atlas` (monta atlas-guia), `art:key` (chroma + despill), `art:normalize` (âncora/escala), `art:seamless`, `art:recolor`, `art:validate` (fidelidade de movimento), `art:contact` (contact sheet), `art:pack` (atlas + paleta); formato `ita-atlas-v1` + leitura no renderer (esquerda por espelhamento); carga por andar; orçamentos no `check:assets`/`check:preview`; testes. **ADR-033 (5ª classe e 25 identidades).** | 0 |
| **Lotes 1–11/13** | Onda 1 (§9) | 83 + reservas |
| **Gate 1** | Fim da Onda 1: o usuário decide as Ondas 2 e 3 | 0 |
| **Onda 2** | Pináculos em famílias (§3.3) | 38 + reservas |
| **O-final** | Medição de fps/memória em dispositivo, ajuste fino dos orçamentos, `docs/ART_GUIDELINES.md`/`ASSET_INVENTORY.md`/`assets/SOURCES.md` atualizados, regressão visual | 0 |

**Depois desta etapa:** FASE 14 (Painel Admin). O Painel já nasce com as arenas, inimigos e heróis como **dados** (`ArenaKit`, `EnemySeed.assets`, `HeroIdentityDef.assets`) editáveis sem código.

---

## 9. Os lotes da Onda 1 (≤ 10 gerações cada)

Cada lote: **8 itens planejados + 2 reservas**. Resultado aplicado no jogo ao final de cada lote.

| Lote | Itens (1 geração cada, salvo indicação) | Aplicado no jogo |
|---|---|---|
| **L1 — UI, login e calibração** | 1 kit de botões GBA · 2 ícones (16) · 3 fundo do login · 4 logotipo · 5 **piloto de herói** (Guardião nº 2) · 6 **piloto de inimigo** (Duende de Faíscas, andar 1) · 7 **piloto de arena** (kit do andar 1) · 8 retratos do Rei A (4) | HUD/botões GBA, nova tela de criação, Rei com 4 retratos, 1 herói, 1 inimigo e a arena 1 de ponta a ponta. **Gate de calibração:** decide a **Opção A (1 geração por personagem)** ou **B (2 por personagem)** e ajusta os limiares de fidelidade (`ART_PIPELINE.md` §6.2) |
| **L2** | 9 retratos do Rei B (4) · 10 retratos do Rei C (4) · 11 Goblin Capitão (E, andar 1) · 12–14 arenas dos andares 2, 3, 4 · 15–16 inimigos do andar 2 (2 de 4) | 12 retratos do Rei; andar 1 completo; arenas 2–4 · **[as-built L2, ADR-036]** entregue: 12 retratos, Capitão, arenas 2–4, Sapo-Lodo e Rato (2 de 4 do andar 2; os outros 2 vão ao L3) |
| **L3** | Andar 2: 2 inimigos restantes · Andar 3: 4 inimigos · Andar 4: 2 inimigos (de 4) | Andares 2 e 3 completos · **[as-built L3, ADR-037]** entregue: 8 inimigos (Enguia, Troll, Golem, Cão, Necrovela, Cavaleiro, Estátua, Escaravelho); o andar 4 fica com 2 de 4 novos (Sacerdote e Múmia Real no L4) |
| **L4** | Andar 4: 2 restantes · **5 heróis do Clérigo** · 1 folha de retratos (4) | Andar 4 completo (cobre o Nv 1→100, ≈ 24 h) · Clérigo no jogo · **[as-built L4, ADR-038/039]** entregue: Sacerdote Mumificado, Múmia Real, 5 atlas do Clérigo, 4 retratos (Oráculo sem retrato próprio → L7); engine de cura; 8/10 gerações |
| **L5** | 8 heróis (Guardião 3–5, Arqueiro 2–5, Arcanista 2) | +8 heróis · **[as-built L5, ADR-040]** entregue: 7 atlas novos (Cavaleiro Rubro, Monge de Ferro, Lorde Cinzento, Caçador Furtivo, Besteiro Pesado, Guardiã da Floresta, Piromante) + **Ossian liberado** (sem geração) = Guardião 5/5, Arqueiro 5/5, Clérigo 5/5, Arcanista 2/5, Invocador 1/5 = **18 heróis**; o Arqueiro Nômade fica como 6º arqueiro (refazer, 1 geração); 10/10 gerações (3 folhas reprovadas por layout) |
| **L6** | 7 heróis (Arcanista 3–5, Invocador 2–5) · 1 folha de retratos | +7 heróis · **[as-built L6, ADR-042]** entregue: **8 atlas** (Criomante, Tempestuário, Mago Ancião, Necromante dos Ossos, Bruxa do Pântano, Ceifeira, Demonólogo **+ o Arqueiro Nômade refeito**, dívida do L5) e **1 folha 2×2 de retratos** (Criomante, Tempestuário, Mago Ancião e Vorath); 10/10 gerações (1 refação — o Necromante dos Ossos veio com *hurt/death* de outro personagem). Arcanista 5/5, Invocador 5/5, Arqueiro 6 ⇒ **26 heróis (meta M3 batida)**; 8 skills assinatura novas. Os retratos dos 4 invocadores e do Nômade ficam para o L7 |
| **L7** | 4 folhas de retratos (heróis restantes) · arena do andar 5 · 3 inimigos do andar 5 | **26 heróis completos com retratos** · andar 5 em andamento · **[as-built L7, ADR-043]** entregue: 16 retratos (26/26 heróis cobertos), kit `f05_ecos`, Sentinela, Duelista e Espectro; 8/10 gerações |
| **L8** | Andar 5: 2 restantes · arena 6 + 4 inimigos do andar 6 · arena 7 | **Andares 5 e 6 completos**, arena 7 pronta · **[as-built L8, ADR-044]** entregue: Cantor de Ecos, Maestro do Vazio (fechando andar 5 com 5/5), kit `f06_fornalha`, Golem de Escória, Ferreiro Possuído, Salamandra Veloz, Mestre da Forja (fechando andar 6 com 5/5), kit `f07_jardim`; 10/10 gerações |
| **L9** | Andar 7: 4 inimigos · arena 8 + 3 inimigos do andar 8 | **Andar 7 completo**, andar 8 com arena e 3 inimigos · **[as-built L9, ADR-045]** entregue: Urso Glacial, Raposa Boreal, Feiticeira da Geada, Cavaleiro do Inverno (fechando andar 7 com 5/5), kit `f08_sombras`, Casulo Gigante, Aranha Presas-Negras, Sombra Rastejante; 9/10 gerações |
| **L10** | Andar 8: 1 restante · arena 9 + 4 inimigos · arena 10 + 1 inimigo | Andares 8 e 9 completos · **[as-built L10, ADR-047]** entregue: Tecelã de Pesadelos (fechando andar 8 com 5/5), kit `f09_sangrento`, Carrasco Encouraçado, Sanguessuga Alada, Bruxa de Sangue, Conde Carmesim (fechando andar 9 com 5/5), Colosso de Obsidiana (abertura do andar 10); 7/10 gerações (3 reservas) |
| **L11** | Andar 10: arena 10 + 3 inimigos restantes · **6 gerações de reserva** para refações/acabamento | **Andares 1–10 completos (Onda 1 100% finalizada)** · **[as-built L11, ADR-048]** entregue: kit `f10_passos` (Câmara dos Mil Passos), Guerreiro Eterno D, Relógio Vivo V, Oráculo dos Passos M (fechando andar 10 com 5/5 e roster de 50 inimigos); 4/10 gerações (6 reservas); Onda 1 de arte 100% concluída |

Contagem das 83 planejadas: UI 2 + login 2 + retratos do Rei 3 + heróis 21 + folhas de retratos 6 + inimigos 39 + arenas 10 = **83** (os 3 pilotos do L1 já estão dentro dos 21 heróis, 39 inimigos e 10 arenas). O `PROVENANCE.md` confere o somatório a cada lote. Se a taxa de refação passar de ≈ 25 %, os lotes passam de 11 para até 13; se a **Opção B** vencer, as folhas de herói e de inimigo custam o dobro (≈ 143 planejadas ⇒ ≈ 18 lotes).

> **Por que esta ordem:** o que **todo jogador vê primeiro** (botões, login, retrato) vem antes; depois os **andares 1–4** (as primeiras ≈ 24 h até o Nv 100); depois os **heróis** (que o jogador consegue pelo Market/caixas cedo); por fim os andares 5–10.

---

## 10. Decisões tomadas por mim (editáveis) e o que confirmar no Gate 0

| # | Decisão adotada | Alternativa | Custo de mudar depois |
|---|---|---|---|
| D1 | **Escopo por ondas**: andares 1–10 completos no lançamento; 11–40 em famílias (Onda 2); literal (Onda 3) sob demanda | Fazer os 40 andares × 5 inimigos exclusivos já (≈ +142 gerações) | Baixo: a Onda 3 só adiciona designs |
| D2 | **5 slots por andar = T/D/V/M/E**; `balanced` sai dos slots | Manter 6 papéis e sortear 5 | Baixo (dado em `DEFAULT_POOL_PLAN`) |
| D3 | **5ª classe = Clérigo** (suporte, cura) | Outra classe (Assassino, Bardo…) | Médio: a arte do lote L4 depende dela |
| D4 | **Heróis iniciais continuam 4** (§10); os outros 21 são obtidos pelo jogo | Iniciais passam a 5 ou 25 | Baixo (config) |
| D5 | **Sprites de herói por identidade**, não por classe | Manter sprite por classe | Alto: por isso é decidido agora |
| D6 | **Skin do Rei = retrato** (12); corpo da skin antiga some da criação | Manter corpo + adicionar retratos | Baixo |
| D7 | **Opção A** (1 geração = 1 personagem em atlas compacto) até o gate do Lote 1 | Opção B (2 gerações) se a fidelidade falhar | Calibrado no L1 |
| D8 | **Logotipo recomposto em HTML** se o texto gerado vier errado | Aceitar o texto gerado | Nenhum |
| D9 | **Lotes de 8 + 2 reservas** | Lotes de 10 itens sem reserva | Nenhum |

**O que preciso que você confirme (Gate 0):** (1) **D1** — escopo da Onda 1 (andares 1–10) e se a Onda 2 segue como "famílias"; (2) **D3** — 5ª classe Clérigo; (3) a lista de **nomes/conceitos** das §3.1 e §4.3 (posso ajustar antes do lote de cada andar); (4) o **"go"** para iniciar a Etapa F0 (sem gerações) seguida do Lote 1.

---

## 11. Riscos

| Risco | Efeito | Mitigação |
|---|---|---|
| O gerador não respeita a grade/âncora do atlas | Animação "treme" ou pula | Atlas-guia como referência + normalizador de âncora/escala + **teste de fidelidade** (§6.2 do pipeline); Opção B |
| Estilo desvia do pack | Arte destoa | Cada geração leva referências do pack + paleta; contact sheet comparativo lado a lado no relatório |
| Magenta contamina a arte (halo rosa) | Contorno rosa nos sprites | Personagens **sem** rosa/magenta próximo de `#FF00FF`; despill no `art:key`; validador de franja |
| Ladrilhos não emendam | Costura visível ao rolar | `art:seamless` + métrica de borda; kit só aprovado com a tira de teste de 12 ladrilhos |
| 25 heróis "iguais com roupa diferente" | Viola §10 | Identidade mecânica obrigatória + teste de CI (§4.2) |
| Peso do bundle/zip | `JOGAR.bat`/preview lentos | Paleta, atlas compacto, carga por andar, orçamento em CI |
| Texto errado no logotipo | Marca com erro de grafia | Recomposição HTML (D8) |
| Licença da arte gerada | Dúvida jurídica | Registro em `PROVENANCE.md`/`assets/SOURCES.md`; o pack Nika já é declarado feito com IA — mesma política; crédito "Assets by Nika Studio" mantido |

---

## 12. Checklist de pronto da etapa

- [ ] Gate 0 respondido · ADR-033 (5ª classe + 25 identidades) aceita
- [ ] Pipeline `art:*` + `ita-atlas-v1` + carga por andar + orçamentos em CI
- [ ] 12 retratos do Rei · kit de botões GBA + 16 ícones · fundo e logotipo do login com zona do Google
- [ ] 25 heróis (sprite + retrato + identidade mecânica distinta)
- [ ] Andares 1–10: 10 arenas únicas + 50 inimigos (5 papéis), todos aprovados no teste de fidelidade
- [ ] `check` verde, `browser-smoke` com capturas por andar, fps/memória dentro do orçamento
- [ ] `ART_GUIDELINES.md`, `ASSET_INVENTORY.md`, `assets/SOURCES.md`, `PROVENANCE.md`, `AI_STATE.md`, README atualizados
- [ ] Decisão do usuário sobre as Ondas 2 e 3
