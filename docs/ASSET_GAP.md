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
| **Retratos** | 8 |
| **Ícones** | 224 |
| **VFX** | 7 |
| **Tiles e props** | 51 + 20 |
| **UI** | 2 sheets |
| **Áudio** | **0** |

**Conclusão:** a arte de personagem está coberta. As lacunas reais são **áudio** (zero), **UI em PT-BR** (nada utilizável) e **retratos dos heróis** (faltam 3 dos 4).

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

### 2.5 Ícones e VFX

224 ícones organizados em 14 categorias (armas, escudos, ranged, magia, poções, gemas, consumíveis, scrolls, chaves, feitiços). 7 VFX: `hit`, `slash`, `fire`, `lightning`, `heal`, `levelup`, `glow_warm`.

`vfx_hit` + `vfx_slash` cobrem `damage_dealt`; `vfx_levelup` cobre a subida de nível; `vfx_heal` e `vfx_fire` e `vfx_lightning` cobrem os efeitos de status e de skill.

---

## 3. FALTANDO — lacunas reais

### 🔴 3.1 Áudio — não existe nenhum arquivo

**Gravidade:** alta · **Bloqueia:** §60, §63, a sensação de "jogo" e a identidade sonora

O repositório de referência inteiro (`marmitero/tower-idle-adventure`) **não tem um único `.mp3`, `.ogg` ou `.wav`**. A página do autor confirma: *"KNOWN LIMITATIONS: ... no audio."*

O que o MVP precisa e não existe:

| Som | Quando | Prioridade |
|---|---|---|
| Impacto de ataque básico | `damage_dealt` | 🔴 alta |
| Impacto crítico | `critical_hit` | 🔴 alta |
| Ataque de skill | `skill_used` | 🔴 alta |
| Morte de inimigo | `enemy_defeated` | 🔴 alta |
| Morte de herói | `character_defeated` | 🟡 média |
| Vitória de batalha | `battle_won` | 🔴 alta |
| Derrota | `battle_lost` | 🟡 média |
| Level up | Rei ou herói subindo | 🟡 média |
| Drop de equipamento | `reward` raro/mítico | 🟡 média |
| Moeda | ganho de Coin | 🟡 média |
| Som ambiente da Torre | loop | 🟢 baixa |
| "Procurando..." | transição §27 | 🟢 baixa |
| Clique de UI | todos os botões | 🟢 baixa |
| Som de slot desbloqueado | §15 | 🟢 baixa |

**Sem isso, a §60 ("precisa parecer um jogo") fica apenas parcialmente satisfeita.** Feedback visual sem som é a diferença entre um protótipo e um jogo.

**Opções:** (a) comprar um pack de SFX 8-bit/RPG; (b) gerar; (c) usar CC0. **Decisão de produto — não escolhida aqui.** O que NÃO pode é ficar sem som e chamar de pronto.

### 🔴 3.2 UI — nenhuma peça utilizável em PT-BR

**Gravidade:** alta · **Bloqueia:** §62, §67

A pasta tem **2 arquivos**: `ui_kit.png` (4,3 MB) e `ui_dialog.png` (4,5 MB).

O `ASSET_MANIFEST.md` do próprio pack registra o problema: *"A sheet `ui/ui_kit.png` contém palavras em inglês desenhadas dentro da imagem (por exemplo, 'INVENTORY', 'ITEMS', 'EQUIP'). O jogo é PT-BR: preferir peças sem texto incorporado e renderizar os rótulos em HTML/CSS."*

Ressalva adicional: a página do autor diz *"full UI kit (HP/MP/XP bars, inventory, buttons)"*, mas isso descreve o **pacote Unity**, não estes PNGs. O que existe aqui são duas sheets grandes; se contêm molduras reutilizáveis, isso precisa ser verificado visualmente antes de contar com elas.

**O que falta de fato:**

| Peça | Situação |
|---|---|
| Moldura de painel, 9-slice | ❓ não verificado visualmente |
| Botões (normal/hover/press/disabled) | ❓ idem |
| Barra de HP / XP / Coin | ❌ nenhuma barra dedicada |
| Ícone de raridade (6 variantes) | ❌ |
| Ícone de slot de equipamento (10) | ❌ |
| Ícone de status (poison/stun/burn/regen/shield) | ❌ |
| Cursor / joystick mobile | ❌ |
| Toast / notificação | ❌ |
| Tela de criação do Rei | ❌ |
| Tela de seleção de herói (4 cards) | ❌ |

O HUD atual em HTML/CSS funciona e é responsivo, mas é **funcional, não com identidade visual**. A §62 exige que não pareça protótipo.

### 🟡 3.3 Retratos dos heróis — faltam 3 de 4

**Gravidade:** média · **Bloqueia:** tela de seleção (§10)

Existem 8 retratos: `hero`, `goblin`, `skeleton`, `slime`, `orc`, `boss`, `merchant`, `villager`.

Faltam `mage`, `archer` e `necromancer` — ou seja, **3 dos 4 heróis candidatos não têm retrato**. A tela de criação do Rei e a de seleção de herói precisam de retrato para cada um.

*Opção sem custo:* usar a sheet `idle` do personagem como retrato, recortando o quadro da direção "down". Funciona, mas perde a leitura de "retrato" e é visibly worse que um retrato dedicado.

### 🟡 3.4 Animação do "Procurando..."

**Gravidade:** média · **Bloqueia:** §28

A §28 exige *"uma animação de busca que comunique que o jogo está procurando"*, não um texto. O pack não tem nada que represente busca/prospecção. `vfx_glow_warm` e `brazier_anim` são candidatos a elemento ambiente, mas não são "procura".

**Falta:** sprite ou VFX de procura (varinha luminosa, poeira, runa girando, radar). Alternativa sem arte: animação CSS de texto com glow pulsante — aceitável, desde que **comente como decisão provisória** (`P-028`).

### 🟡 3.5 Torre — sem identidade visual por andar

**Gravidade:** média · **Bloqueia:** §22

A §22 fala em *"progressão visual"* e a `P-028` cobre isso. O tileset tem 3 biomas (dungeon, cave, bone) e 20 props, o que dá base. **Falta:** um mapeamento andar→bioma e a arte de estágio (e.g., o que muda quando o jogador sobe de andar). Não é arte ausente, é direção de arte ausente.

### 🟢 3.6 Ícones de sistema do jogo

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

| # | Ação | Bloqueia | Custo |
|---|---|---|---|
| 1 | **Decidir P-002** (4 heróis) | Fase 4 inteira | Decisão humana |
| 2 | **Resolver áudio** | §60, sensação de jogo | Pack / geração |
| 3 | **Verificar visualmente `ui_kit.png`** e definir o que serve | §62 | 1 hora |
| 4 | **Criar/procurar 3 retratos** (mage, archer, necromancer) | §10 | Baixo |
| 5 | **Criar ou emprestar a animação de "Procurando..."** | §28 | Baixo |
| 6 | **Mapear andar → bioma** | §22 | Direção de arte |
| 7 | **Ícones de sistema** (slots, raridade, moeda, fragmento) | Polish | Baixo |

Itens 1 e 2 são os que de fato impedem chamar o jogo de pronto. Os demais são Transaction e podem ser fechados em qualquer ordem.

---

## 6. Rastreabilidade

- Inventário: `apps/game-web/public/assets/manifest.json` (gerado, 422 entradas)
- Fonte e recuperação: [`../assets/SOURCES.md`](../assets/SOURCES.md)
- Licença e crédito: [`../assets/ATTRIBUTION.md`](../assets/ATTRIBUTION.md)
- Pipeline: `scripts/build-assets.mjs` · guard: `scripts/check-assets.mjs`
- Estilo e regras: [`ART_GUIDELINES.md`](ART_GUIDELINES.md) · [`AUDIO_GUIDELINES.md`](AUDIO_GUIDELINES.md) · [`UI_UX.md`](UI_UX.md)
- Pendências: [`PENDING_RULES.md`](PENDING_RULES.md) — `P-002`, `P-028`, `P-036`, `P-061`
