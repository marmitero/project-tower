# ASSET_GAP — o que falta de arte para o MVP

**Data:** 2026-09-30
**Fonte analisada:** *Fantasy Dungeon — PNG Sprites* v1.4 (Nika Studio), 422 PNGs, 92 MiB, em `assets/sprites/`
**Método:** inventário programático do manifesto gerado por `scripts/build-assets.mjs`, cruzado com o catálogo de `packages/config` e as exigências do `Master-Prompt.md`.

Este documento é factual: diz o que existe, o que não existe e o que a regra exige. Ele **não** decide nomes, identidade de classe nem regras de gameplay — essas continuam em `docs/PENDING_RULES.md`.

---

## 1. Resumo

| | |
|---|---|
| **Personagens completos** | 17 (6 animações × 4 direções) |
| **NPCs parciais** | 2 (`merchant`, `villager` — só idle/walk) |
| **Heróis candidatos a P-002** | 4 (`hero`, `mage`, `archer`, `necromancer`) — todos com sheet completa |
| **Skins do Rei** | 8 |
| **Retratos** | 8 do pack + 3 gerados no estilo do pack = **11** (os 4 heróis cobertos) |
| **Ícones** | 224 |
| **VFX** | 7 |
| **Tiles e props** | 51 + 20 |
| **UI** | 2 sheets → **33 peças extraídas sem texto** (2026-10-01) |
| **Áudio** | 0 → **22 SFX procedurais gerados** (2026-10-01) |

**Conclusão (atualizada 2026-10-01):** a arte de personagem está coberta. As três lacunas vermelhas do inventário original — **áudio**, **UI em PT-BR** e **retratos dos heróis** — foram fechadas por geração/extração própria (ver §3). O que resta é conteúdo de segundo plano (§3.4–3.6): animação de "Procurando...", mapeamento andar→bioma e ícones de sistema.

---

## 2. Coberto — o vertical slice é possível com este pack

### 2.1 Personagens

Todos os 17 têm os 6 conjuntos completos, em 4 direções, 1024×1024 com grade 4×4 de 256×256:

`hero` · `mage` · `archer` · `necromancer` · `goblin` · `shadowgoblin` · `skeleton` · `bloodskeleton` · `slime` · `frostslime` · `slimeking` · `bat` · `toxicbat` · `orc` · `fireorc` · `elitearcher` · `boss`

Isso cobre a §66 inteira: `idle` para parado, `walk`/`run` para deslocamento, `attack` para o golpe, `hurt` para o dano recebido, `death` para `character_defeated`/`enemy_defeated`.

### 2.2 Os 4 candidatos a P-002

| Sprite | Perfil mecânico (⛔ provisório) | Animação |
|---|---|---|
| `characters/hero` | físico / reativo | completa |
| `characters/mage` | mágico / área | completa |
| `characters/archer` | físico / velocidade | completa |
| `characters/necromancer` | mágico / DoT | completa |

Cobertura físico × mágico atendida. **A identidade de cada um continua sendo P-002** — o pack resolve a disponibilidade, não a decisão.

### 2.3 Inimigos da Torre e Chefes

Os 13 inimigos que o catálogo provisório referencia (`P-006`) existem com animação completa, incluindo `slimeking` e `boss` para a §24. `merchant` e `villager` servem como NPC do Reino (§4).

### 2.4 Cenário

`tileset/` com 45 tiles (3 biomas, armadilhas, portas, escadas) e `tileset/environment/` com 20 props e conjuntos animados (`brazier_anim`, `water_anim`, `animated_tiles`). Suficiente para uma tela de combate com identidade visual própria por andar — o que a §22 exige.

> **Atualização (ADR-029, 2026-10-03):** o cenário e os 6 VFX de combate **agora estão em uso** na batalha — `render/arenaThemes.ts` (peças de `tileset/` por tema de andar e de chefe) e `render/vfxAtlas.ts` (retângulos medidos; as folhas de VFX têm 2048×2048 com uma faixa de quadros, não grade 4×4). A folha `walk` dos personagens é usada na caminhada entre inimigos. Fica em aberto o §3.4 (animação de "Procurando" — hoje é a caminhada do herói com o cenário rolando, que cumpre a §28 sem arte nova) e `vfx_levelup` (catalogado, sem gatilho em batalha).

### 2.5 Ícones e VFX

224 ícones organizados em 14 categorias (armas, escudos, ranged, magia, poções, gemas, consumíveis, scrolls, chaves, feitiços). 7 VFX: `hit`, `slash`, `fire`, `lightning`, `heal`, `levelup`, `glow_warm`.

`vfx_hit` + `vfx_slash` cobrem `damage_dealt`; `vfx_levelup` cobre a subida de nível; `vfx_heal` e `vfx_fire` e `vfx_lightning` cobrem os efeitos de status e de skill.

---

## 3. FALTANDO — lacunas reais

### ✅ 3.1 Áudio — RESOLVIDO (2026-10-01): 22 SFX gerados

**Gravidade:** alta · **Status:** fechado para o MVP

O repositório de referência não tem um único arquivo de áudio. A decisão registrada aqui era "(a) pack, (b) gerar, (c) CC0 — não escolhida". **Escolhida: (b) gerar.** `scripts/gen-audio.mjs` sintetiza SFX procedurais — arte final do projeto, versionada, determinística e sem dependência externa — em `assets/generated/audio/sfx/` (WAV mono 44,1 kHz, < 2 s, pico −1 dBTP, conforme `AUDIO_GUIDELINES.md` §4).

| Som | Arquivo | Prioridade |
|---|---|---|
| Impacto de ataque básico | `hit_01/02/03.wav` | 🔴 |
| Impacto crítico | `critical.wav` | 🔴 |
| Ataque de skill | `skill.wav` | 🔴 |
| Morte de inimigo | `death_enemy.wav` | 🔴 |
| Vitória de batalha | `victory.wav` | 🔴 |
| Level up | `levelup.wav` | 🟡 |
| Morte de herói / Derrota | `death_hero.wav` / `defeat.wav` | 🟡 |
| Escada de loot (§108) | `drop_common/rare/epic/legendary/celestial.wav` | 🟡 |
| Moeda / UI | `coin.wav`, `click.wav`, `back.wav`, `error.wav` | 🟡 |
| "Procurando..." (§28) | `searching.wav` | 🟢 |
| Cura / erro de ataque | `heal.wav`, `miss.wav` | 🟢 |

A escada de raridade é progressiva em altura e duração (raro→celestial), como o §108 exige. Os IDs no manifesto (`audio/sfx/*`) são a fronteira: um pack profissional pode substituir os arquivos sem mudar código. **Música e ambiência continuam fora do MVP** (tarefa da FASE de Polish, §15).

### ✅ 3.2 UI — RESOLVIDA (2026-10-01): 33 peças sem texto, PT-BR por renderização

**Gravidade:** alta · **Status:** fechado para o MVP

`scripts/extract-ui.mjs` fatia as duas sheets em peças reutilizáveis **sem um único pixel de texto rasterizado** (guardrail por componentes conectados + auditoria numérica; ver `assets/generated/ui/extraction-report.json`):

| Peça | IDs | Uso |
|---|---|---|
| Molduras 9-slice ×3 | `ui/frame_9slice_stone/brick/dark` | painéis, janelas, toasts |
| Painel decorativo | `ui/panel_ornate` | diálogos, títulos |
| Divisores ×5 | `ui/divider_gold/stone/diamond/gold_thin/scroll` | seções do HUD |
| Slots de item ×5 | `ui/slot_frame_sword/shield/potion/bag/gear` | inventário, equipamento |
| Setas ×4 | `ui/arrow_left/right/up/down` | navegação, tabs |
| Emblemas ×4 | `ui/crest_blue/red/steel/gold` | decoração, conquistas |
| Placas / faixa | `ui/plaque_wide/narrow`, `ui/banner_blue` | superfícies para rótulos HTML |
| Cofre | `ui/chest` | loot, recompensas |
| **Barras decompostas** | `ui/bar_track`, `ui/bar_fill_hp/mp/xp`, `ui/bar_cap_left_heart/orb`, `ui/bar_cap_right` | HUD HP/MP/XP |

**Decisão-chave — barras:** a barra inteira da sheet traz "100 / 100" rasterizado. Não há recorte que sobreviva ao §62. As barras são entregues em **partes sem texto** (trilho vazio + fills coloridos + caps de ícone); o jogo compõe em runtime e renderiza os números em **PT-BR**. O cap da barra de XP foi descartado — traz as letras "XP" rasterizadas. Geometria de composição no `extraction-report.json` (`composition`).

Regiões **descartadas por texto** (catalogadas no relatório, para ninguém repetir o trabalho): barras inteiras da `ui_kit`, os banners vermelho/azul da `ui_dialog` e duas tiras ornamentais ambíguas.

**Botões:** as duas sheets NÃO têm botão utilizável — todos trazem rótulo em inglês. Botões são construídos com as molduras 9-slice + texto HTML em PT-BR (a superfície web é renderização de primeira classe neste produto).

| Peça | Situação |
|---|---|
| Moldura de painel, 9-slice | ✅ 3 variantes |
| Botões (normal/hover/press/disabled) | ✅ composição 9-slice + HTML (as sheets não têm botão sem texto) |
| Barra de HP / MP / XP | ✅ decompostas, texto em PT-BR no runtime |
| Ícone de raridade (6 variantes) | ❌ ver §3.6 |
| Ícone de status (poison/stun/burn/regen/shield) | ❌ ver §3.6 |
| Cursor / joystick mobile | ❌ ver §3.6 |
| Toast / notificação | ✅ composição (9-slice + texto) |
| Tela de criação do Rei / seleção de herói | ✅ composição + retratos (§3.3) |

### ✅ 3.3 Retratos dos heróis — RESOLVIDO (2026-10-01): 4 de 4

**Gravidade:** média · **Status:** fechado

O pack tem 8 retratos (`hero`, `goblin`, `skeleton`, `slime`, `orc`, `boss`, `merchant`, `villager`) e faltavam `mage`, `archer` e `necromancer`. Os 3 foram **gerados no estilo do retrato `hero.png` do pack** (mesmo enquadramento de busto, mesmo fundo azul-petroleo, mesma paleta suave) em `assets/generated/portraits/`, normalizados para 256×256 — as 4 telas de seleção de herói ficam com identidade visual coerente.

Os retratos entram no manifesto no mesmo namespace `portraits/*` do pack: o jogo pede `portraits/mage` sem saber que é arte gerada. Ficam como arte própria do projeto; substituição por arte de terceiro é plugável pelo manifesto.

### 🟡 3.4 Animação do "Procurando..."

**Gravidade:** média · **Bloqueia:** §28

A §28 exige *"uma animação de busca que comunique que o jogo está procurando"*, não um texto. O pack não tem nada que represente busca/prospecção. `vfx_glow_warm` e `brazier_anim` são candidatos a elemento ambiente, mas não são "procura".

**Falta:** sprite ou VFX de procura (varinha luminosa, poeira, runa girando, radar). Alternativa sem arte: animação CSS de texto com glow pulsante — aceitável, desde que **comente como decisão provisória** (`P-028`).

### 🟡 3.5 Torre — sem identidade visual por andar

> **Plano:** arena própria por andar, 5 inimigos por andar e demais metas estão em [`STYLIZATION_ROADMAP.md`](STYLIZATION_ROADMAP.md) (ADR-032); especificação em [`ART_PIPELINE.md`](ART_PIPELINE.md).

**Gravidade:** média · **Bloqueia:** §22

A §22 fala em *"progressão visual"* e a `P-028` cobre isso. O tileset tem 3 biomas (dungeon, cave, bone) e 20 props, o que dá base. **Falta:** um mapeamento andar→bioma e a arte de estágio (e.g., o que muda quando o jogador sobe de andar). Não é arte ausente, é direção de arte ausente.

### 🟢 3.6 Ícones de sistema do jogo

> **Plano:** kit de botões GBA e 16 ícones no Lote 1 (`STYLIZATION_ROADMAP.md` §5, `ART_PIPELINE.md` §10).

**Gravidade:** baixa

224 ícones cobrem itens e feitiços, mas não cobrem meta-jogo: ícone de slot de equipe, de slot bloqueado, de raridade, de moeda custom, de fragmento de personagem, de ticket VIP, de ticket Searching, de energia. Metade pode vir de `icons1/`; o resto precisa de design.

---

## 4. Riscos que este pack traz junto

| Risco | Mitigação |
|---|---|
| **A `ui_kit.png` tem inglês rasterizado** | Não usar como UI final. §62 e o próprio manifest proíbem. Rótulos em HTML/CSS. |
| **Arte pixel-STYLE, não pixel art de grade 1px** | A página do autor é explícita: *"this is HD pixel-STYLE art (AI-assisted), not strict 1px-grid pixel art"*. A escala 256px é generosa; funciona bem, mas não espere consistência de grade. |
| **Feito com IA (Higgsfield)** | Declarado pelo autor e aceito pela licença. Atribuição obrigatória — `assets/ATTRIBUTION.md` é a evidência. |
| **"No reselling the assets themselves"** | Não distribuir o pack. Só usar no jogo. |
| **92 MiB** | `public/assets/` = 94 MiB, ignorado pelo Git. Seleção de release é trabalho da Fase 9. |
| **Nomes com extensão duplicada** (`royal.png.png`) | Preservado como está; o ID no manifesto é limpo para `hero_skins/royal`. |

---

## 5. O que fazer, em ordem

| # | Ação | Bloqueia | Custo | Status |
|---|---|---|---|---|
| 1 | **Decidir P-002** (4 heróis) | Fase 4 inteira | Decisão humana | ⏳ pendente |
| 2 | **Resolver áudio** | §60, sensação de jogo | Pack / geração | ✅ 22 SFX gerados (2026-10-01) |
| 3 | **Verificar visualmente `ui_kit.png`** e definir o que serve | §62 | 1 hora | ✅ 33 peças extraídas (2026-10-01) |
| 4 | **Criar/procurar 3 retratos** (mage, archer, necromancer) | §10 | Baixo | ✅ gerados no estilo do pack (2026-10-01) |
| 5 | **Criar ou emprestar a animação de "Procurando..."** | §28 | Baixo | ⏳ áudio pronto (`searching.wav`); falta o visual |
| 6 | **Mapear andar → bioma** | §22 | Direção de arte | ⏳ |
| 7 | **Ícones de sistema** (slots, raridade, moeda, fragmento) | Polish | Baixo | ⏳ |

O item 1 (P-002) é o que de fato impede chamar o jogo de pronto. Os demais são transacionais e podem ser fechados em qualquer ordem.

---

## 6. Rastreabilidade

- Inventário: `apps/game-web/public/assets/manifest.json` (gerado, 480 entradas: 422 do pack + 58 geradas)
- Fonte e recuperação: [`../assets/SOURCES.md`](../assets/SOURCES.md)
- Licença e crédito: [`../assets/ATTRIBUTION.md`](../assets/ATTRIBUTION.md)
- Pipeline: `scripts/build-assets.mjs` · guard: `scripts/check-assets.mjs` (inclui catálogo REQUIRED + relatório de extração de UI)
- Geração própria: `scripts/extract-ui.mjs` (UI sem texto) · `scripts/gen-audio.mjs` (SFX) · saídas em `assets/generated/{ui,audio,portraits}/`
- Estilo e regras: [`ART_GUIDELINES.md`](ART_GUIDELINES.md) · [`AUDIO_GUIDELINES.md`](AUDIO_GUIDELINES.md) · [`UI_UX.md`](UI_UX.md)
- Pendências: [`PENDING_RULES.md`](PENDING_RULES.md) — `P-002`, `P-028`, `P-036`, `P-061`
