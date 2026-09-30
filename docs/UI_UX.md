# UI / UX

**Versão:** 0.1 · **Data:** 2026-09-30 · **Estado:** especificado
**Fonte:** §28, §29, §59, §60, §62, §67, §68, §69, §95, §105, §121 do `Master-Prompt.md`

---

## 1. O princípio

> *"O jogador deve olhar para a aplicação e imediatamente perceber: **Isso é um jogo.**"* (§0)

E o que **não** é:

- ❌ um dashboard
- ❌ um CRUD
- ❌ uma coleção de telas
- ❌ uma planilha gamificada
- ❌ um mockup
- ❌ uma aplicação SaaS com aparência de jogo

**O teste de três perguntas** antes de aprovar qualquer tela (§106, §121):

1. **Isso parece um jogo?**
2. **Isso gera uma decisão interessante para o jogador?**
3. **Isso valoriza progressão, coleção, combate ou economia?**

### 1.1 O que separa "jogo" de "sistema web"

| Web/SaaS | Jogo |
|---|---|
| Telas com botões | **Arena viva com personagens agindo** |
| Tabelas e formulários | Fichas de personagem com personalidade |
| Métricas e gráficos | Feedback de impacto, crítico, morte |
| Navegação por menu | **HUD sobreposta ao mundo** |
| Estado estático | **Contínuamente mudando** |
| "Dados atualizados às 14:32" | "Seu herói está lutando" |
| Alerta de sucesso | Recompensa que **brilha** |

O §59 é explícito sobre a prioridade visual:

> 1. batalha · 2. personagens · 3. inimigos · 4. efeitos · 5. HUD · 6. progressão · 7. menus

**Batalha primeiro.** Não é um detalhe — é a ordem em que o orçamento de pixels deve ser gasto.

---

## 2. A tela principal

```text
┌──────────────────────────────────────────────────────────────────────┐
│ ┌────────┐  ╔══════════════════════════════════════╗ ┌────────────┐ │
│ │ 👑 Rei │  ║  TORRE — ANDAR 12 — GALERIA DAS SOMBRAS║ │  Automação │ │
│ │ Nv.18  │  ╚══════════════════════════════════════╝ │  ● on      │ │
│ │ @reino │                                          │  Herói: B  │ │
│ └────────┘                                          └────────────┘ │
│                                                                       │
│ ┌──────────────┐                              ┌────────────────────┐ │
│ │              │         ARENA                │  COMOÉ ENFRENTANDO  │ │
│ │  ⚔  Aventureiro │      (Phaser)           │  Slime de Cinaza Nv11│ │
│ │     Nv.20     │  ❤ 1.240/1.500            │  Poder  980         │ │
│ │  Poder 1.842  │                              │                    │ │
│ │  ▰▰▰▰▰▰▰▰░░  │      [ PROCURANDO… ]        │  ✓ Herói A adequado │ │
│ │  🗡 Espada   │                              │  △ Herói C fraco    │ │
│ └──────────────┘                              └────────────────────┘ │
│                                                                       │
│ ┌─────────────────────────────┐  ┌────────────────────────────────┐ │
│ │ ▸ +142 XP Rei   ⊙ +38 Coin │  │ 💬 Chat Global          [ 3 ]  │ │
│ │ ▸ +71 XP Aventureiro        │  │ [ Aventureiro: boa sorte! ]   │ │
│ │ ▸ ⚔ Comum: Machado Nv.11   │  │ [ Herói B: thanks!       ]   │ │
│ └─────────────────────────────┘  │ [ escrever...            ]  │ │
│  [TORRE] [Heróis] [Inventário] [Perfil] [Mercado] [Chat] [Config]   │
└──────────────────────────────────────────────────────────────────────┘
```

### 2.1 O que a HUD deve comunicar

O §69 define a lista obrigatória, e o princípio é explícito:

> **Em aproximadamente 2 segundos o jogador deve entender o estado geral da partida.**

| Elemento | Onde |
|---|---|
| Rei, nickname, nível | Canto superior esquerdo |
| Recursos (Coin, XP) | Barra de eventos |
| Personagem ativo | Painel esquerdo, com destaque |
| Nível, HP, poder do herói | Painel esquerdo |
| Equipamento | Slot de arma visível |
| Andar atual | Topo central, grande |
| Inimigo atual | Painel direito |
| Estado da batalha | Centro da arena |
| Automação | Canto superior direito |
| Loot | Feed de eventos |
| Chat | Painel direito, recolhível |
| Navegação | Barra inferior |

### 2.2 O painel do herói ativo

O §19 exige que a UI torne claro: herói ativo, nível, vida, poder, equipamento, progresso, inimigo atual.

> **Não assumir que o primeiro personagem sempre luta.**

O painel do herói é **clicável e mostra a equipe** ao lado, com um toque troca o herói ativo **sem reiniciar a hunt**. Essa é a decisão mais frequente do jogo, então ela precisa custar **um toque**.

---

## 3. A arena de batalha

O §60 é severo:

> Não criar `Hero: 120 HP / Enemy: 300 HP / -15 / -20 / -25` como experiência principal.

Mas:

> *"Os números podem existir. Mas deve haver: sprites, animações, ataques, impactos, efeitos, dano, morte, skills, movimento, feedback."*

### 3.1 O que precisa ser visível

| Momento | Feedback |
|---|---|
| Oponente aparece | Entrada com transição |
| Idle | Animação de respiração (o tempo morto parece vivo) |
| Herói ataca | Lunge + efeito de arma + som |
| Dano | Número + tremor do sprite |
| **Crítico** | Flash + número maior + som distinto + partícula |
| Dano mágico | VFX elemental (≠ impacto físico) |
| Skill | Nome + VFX dedicado + ícone na barra |
| Buff/debuff | Ícone **sobre o sprite** |
| Morte | Piscadas e dissolução |
| Vitória/derrota | Banner + transição |

### 3.2 A animação "Procurando"

O §28 é categórico: *"Não simplesmente mostrar 'Aguardando...'"*.

Elementos combinados:

- Herói em animação **idle** olhando para os lados
- Partículas leves de busca
- Ícone de lupa/procura com pulso
- Textura: *"Procurando..."* com animação de pontos
- Movimento ambiental leve na arena

O objetivo declarado: **transformar o tempo de espera em parte da experiência**.

> Os assets disponíveis têm 6 folhas de animação por personagem (`idle`, `walk`, `run`, `attack`, `hurt`, `death`), o que permite uma animação de espera real sem asset novo.

### 3.3 Escala e legibilidade

O jogo vai rodar em **Android browser** (§68). Isso impõe:

- Sprites grandes o suficiente para ler em 360px de largura.
- Números com **tamanho proporcional à importância**.
- **Crítico distinguível sem cor** (tamanho + som + forma) — acessibilidade.
- Opção de **reduzir efeitos** que remove partículas/tremor mas mantém feedback essencial.
- O sprite **nunca** é a única fonte de informação.

---

## 4. Navegação e telas

```text
REINO (hub)                    ← cura, equipe, inventário, config
 ├─ TORRE                       ← seleção de andar + herói
 │   └─ BATALHA                 ← arena + HUD
 ├─ HERÓIS                      ← coleção, fragmentos, build
 │   └─ FICHA DO HERÓI          ← atributos, skills, equipamento
 ├─ INVENTÁRIO                  ← filtros, comparação, vender
 │   └─ COMPARAR                ← item a item
 ├─ MERCADO                     ← online
 ├─ BOSS ARENA                  ← online/posterior
 ├─ PERFIL                      ← Rei, progresso, ranking
 ├─ CHAT                        ← online
 └─ CONFIGURAÇÕES               ← gráficos, áudio, acessibilidade
```

### 4.1 A navegação durante a hunt

O §29 exige que o jogador possa abrir inventário, personagem, perfil, equipamentos e configurações **durante o estado de procura**, sem quebrar o fluxo.

Decisão técnica: **o estado de hunt continua rodando por baixo de qualquer tela**. Abrir o inventário durante a hunt:

- Não pausa a caça.
- Não reinicia o `SEARCHING`.
- Mostra um indicador discreto: *" hunt em andamento — Andar 12 · 1.240 XP"*.
- A arena continua **visível** em tamanho reduzido, ou como thumbnail.

> Isso é o que materializa o §111: *"idle significa sistemas funcionando continuamente enquanto o jogador administra e observa"*.

---

## 5. Responsividade

> **DESKTOP-FIRST + MOBILE-READY** (§67, §95)

O projeto **não** pode ser desktop-only. Preparar desde o início: mouse, touch, telas pequenas e grandes, portrait e landscape, HUD adaptativa, menus colapsáveis, botões touch-friendly, escala do battle renderer.

### 5.1 Breakpoints

| Breakpoint | Largura | Layout |
|---|---|---|
| `xs` (portrait) | < 480px | HUD em 2 linhas, arena compacta, menus em sheet, chat recolhido |
| `sm` | 480–767px | Arena 16:9, painéis em drawer |
| `md` | 768–1023px | Layout compacto, painéis laterais estreitos |
| `lg` (desktop) | 1024–1439px | **Layout principal**, painéis laterais + chat |
| `xl` | ≥ 1440px | Arena maior, mais colunas no inventário |

### 5.2 Regras de input

O §68 é explícito: **nada** pode depender de hover, mouse ou teclado obrigatório.

| Não pode | Deve |
|---|---|
| Hover para revelar informação | Toque/clique revela |
| Menu suspenso por hover | Menu por toque |
| Arrastar para reorganizar | Botão de mover + confirmar |
| Tooltip só no hover | Tooltip no toque, com fechar |
| Botão < 44px | Alvo de toque ≥ 44×44px |
| `cursor: pointer` como única pista | Ícone + rótulo + estado de foco |

### 5.3 Orientação

- **Landscape** é o layout de batalha completo.
- **Portrait**: arena menor, painéis como **drawers**, HUD compacta.
- Trocar de orientação **não** pode perder estado nem reiniciar hunt.

---

## 6. Acessibilidade

O §121 pede um jogo que o jogador **sinta**. Parte disso é o jogo ser jogável por mais gente.

| Recurso | Requisito |
|---|---|
| Contraste | Mínimo AA (4.5:1 para texto) |
| Cor | **Nunca** o único portador de informação |
| Reduzir efeitos | Remove partículas e tremor; mantém feedback |
| `prefers-reduced-motion` | Respeitado por default |
| Tamanho de texto | Escala 100%–150% |
| Foco visível | Nunca removido |
| Navegação por teclado | Menus e inventário |
| Contraste de raridade | Cor **+** forma **+** texto |
| Áudio | Independente da informação visual |

> Um jogador daltônico precisa distinguir um Celestial de um Legendary. A forma do frame e o texto resolvem.

---

## 7. Feedback — o sistema de notificações

O jogo tem quatro canais de feedback, e cada um tem um **momento certo**:

| Canal | Momento | Duração |
|---|---|---|
| **Arena** | Combate, drop, descoberta | Instantâneo |
| **Feed de eventos** | XP, Coin, loot | Permanente (scroll) |
| **Toast** | Sucesso de ação, erro | 3s |
| **Modal** | Irreversível, confirmação | Até ação |

### 7.1 Regra do drop

O §108 promete *"será que finalmente veio um item bom?"*. Isso exige **pausa e destaque**:

- O item que cai **interrompe** o fluxo por ~1s.
- Raridade, 2–3 atributos principais e o **contexto de build** são mostrados.
- Se o item favorece outra build, isso é dito.
- *God roll* → efeito visual **excepcional**, porque o momento é raro.

> Uma notificação genérica de "+1 equipamento" desperdiça o momento mais valioso do loop.

### 7.2 Irreversibilidade

Ações irreversíveis (descartar, vender, gastar Coin grande) exigem confirmação explícita com **o valor exato em jogo**. Sem ambiguidade: *"Vender Machado Nv.11 por 4.200 Coin? Esta ação não pode ser desfeita."*

---

## 8. Menus — a lista de proibições

Do §105, aplicado a UI:

| Proibido | Por quê |
|---|---|
| **Transformar tudo em cards** | Vira dashboard |
| **Estética SaaS** | Não é um jogo |
| **Apenas menus** | Não é um protótipo |
| **Mockup sem função** | Não é o produto |
| **Tabelas como experiência principal** | É uma planilha |
| **Personagens geométricos** | É um placeholder |
| **Emojis como arte** | É um placeholder |

### 8.1 Personagens na UI

Fichas de personagem precisam de **identidade**: retrato, nome, classe, raridade, nível, uma linha de **papel**. Não um retângulo com um número.

O herói que está na arena é o **mesmo** que aparece na ficha. Consistência entre representação e entidade é o que faz o jogador acreditar que ele tem heróis, não que ele tem registros.

---

## 9. Linguagem

O jogo é **PT-BR**. Três implicações concretas:

1. **Rótulos em HTML/CSS**, nunca rasterizados. A sheet `ui/ui_kit.png` do pack de sprites tem palavras em inglês desenhadas ("INVENTORY", "ITEMS", "EQUIP") e **não pode ser usada como UI final**.
2. **Plurais, gendered e formatação de número** corretos (`1.234` com ponto, `1,5` com vírgula).
3. **Sem texto completo na tela de combate** — o espaço é da arena.

---

## 10. Checklist de pronto

- [ ] Arena com sprites, animações e feedback (§60)
- [ ] Estado "Procurando" com animação real (§28)
- [ ] HUD com todos os elementos do §69
- [ ] Estado geral legível em ~2 segundos
- [ ] Herói ativo trocável em um toque, sem reiniciar (§19)
- [ ] Navegar durante a hunt não pausa nem quebra (§29)
- [ ] Feedback de drop com destaque e contexto de build (§108)
- [ ] 5 breakpoints, portrait e landscape (§95)
- [ ] Nada depende de hover, mouse ou teclado (§68)
- [ ] Alvos de toque ≥ 44px
- [ ] Cor nunca é o único portador de informação
- [ ] Opção "reduzir efeitos" funcional
- [ ] `prefers-reduced-motion` respeitado
- [ ] Confirmação em toda ação irreversível, com valor exato
- [ ] PT-BR correto; nenhum rótulo rasterizado em inglês
- [ ] Nenhum card-SaaS, nenhuma tabela como experiência principal
- [ ] Nenhum placeholder (quadrado, emoji, círculo) na UI final

---

## 11. Referências

- [`GDD.md`](GDD.md) — pilares de design
- [`COMBAT_SYSTEM.md`](COMBAT_SYSTEM.md) — eventos → feedback
- [`TOWER_SYSTEM.md`](TOWER_SYSTEM.md) — a hunt
- [`INVENTORY_SYSTEM.md`](INVENTORY_SYSTEM.md) — tela de comparação
- [`ART_GUIDELINES.md`](ART_GUIDELINES.md) — direção visual
- [`AUDIO_GUIDELINES.md`](AUDIO_GUIDELINES.md) — feedback sonoro
- [`PERFORMANCE.md`](PERFORMANCE.md) — orçamento de render
