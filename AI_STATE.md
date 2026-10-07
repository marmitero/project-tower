# AI_STATE — handoff vivo do Tower Idle Adventure

**Última atualização:** 2026-10-07 (Lote 14 aprovado; Lote 15 entregue: Bioma 4 da Onda 2 — Pináculo de Obsidiana, andares 26–30; kit de arena p04_obsidiana e 5 novos atlas de inimigos — Couraçado de Obsidiana T, Espoliador de Lava D, Predador das Cinzas V, Canalizador de Magma M, Senhor da Obsidiana E; roster sobe para 70 inimigos; `npm run check` verde — 783 testes + 28 arquitetura —, bundle do preview com 918 requisições HTTP 200; aguarda "lote 15 aprovado")
**Estado:** **FASES 1–13 concluídas — MVP LOCAL JOGÁVEL** (ADR-028). **AGORA: fase de arte "otimização e estilização" (Onda 2 em andamento)** — Lotes 1–14 aprovados; **Lote 15 entregue, aguardando o usuário escrever "lote 15 aprovado"** (**26 heróis** — 100% com retrato próprio —, **70 inimigos** — 100% com sprite/atlas real —, **14 arenas geradas** cobrindo andares 1 a 30, 12 retratos do Rei). Depois da Onda 2: **FASE 14 — Painel Admin** e Fase Online. **Quem for continuar a arte: leia [`docs/ART_HANDOFF.md`](docs/ART_HANDOFF.md) e OLHE `docs/art-review/` antes de gerar.** Como jogar no Windows: [`docs/PLAY_LOCAL.md`](docs/PLAY_LOCAL.md) (`JOGAR.bat`).
**Preview:** servidor estático autocontido (ADR-018) — `node scripts/serve-preview.mjs` (porta 5173). Se o ambiente resetar, subir UMA linha; não depende de `node_modules`.
**Repositório:** `marmitero/project-tower`
**Branch desta sessão:** `arena/01a10c78-project-tower`

> **Este é o primeiro documento a ler em qualquer sessão nova.** Ele existe para que qualquer pessoa ou agente continue o projeto sem acesso a conversas anteriores.
>
> **Ordem de leitura:** `README.md` → este arquivo → (se a tarefa for arte) [`docs/ART_HANDOFF.md`](docs/ART_HANDOFF.md) → o documento do sistema relevante ([`docs/README.md`](docs/README.md) é o mapa). Para a arte, **olhe também as imagens** em `docs/art-review/lote-NN/` e `assets/generated/` — o estilo é mantido por referência visual.

---

## 1. Regras obrigatórias para quem continuar

1. **Leia este arquivo primeiro.** Depois `git status`, `git log`, e então o documento do sistema relevante. Uma anotação antiga não prevalece sobre o estado mais recente.
2. **Trabalhe apenas na branch da sessão** (`arena/01a10c78-project-tower`) e faça push apenas para ela. Nunca troque ou crie outra branch.
3. **Aja primeiro, pergunte depois.** Faça tudo o que puder. Só interrompa o usuário para: decisão de gameplay/economia crítica não definida, credencial, ou ação externa que exija confirmação humana. **Nunca peça senha, token, service-role key ou código MFA.**
4. **Nunca invente regra de economia ou gameplay** (§73). Registre como `PENDING` em [`docs/PENDING_RULES.md`](docs/PENDING_RULES.md) e peça decisão humana.
5. **Nunca declare algo como testado, implementado ou implantado sem evidência.** Separe sempre: verificado no repositório / relato do usuário / proposta.
6. **Documentação antes do código**, e `AI_STATE` atualizado ao final de **toda** etapa, mesmo parcial.
7. **O `Master-Prompt.md` é a fonte de autoridade.** Em caso de conflito com qualquer outra fonte, ele vence. Ver [`docs/DECISIONS_LOG.md`](docs/DECISIONS_LOG.md) ADR-001.
8. **Rode `node scripts/check-docs.mjs` antes de commitar.** Ele valida encoding, links e rastreabilidade de pendências.

---

## 2. O projeto em uma visão

**Tower Idle Adventure** é um RPG idle 2D de navegador onde o jogador é o **Rei**: administra um reino, escolhe entre seus súditos/heróis quem enfrenta a Torre, e coleta equipment raro. O Rei não combate — toda a agência dele é indireta.

Plataforma inicial: navegador desktop. Futura: Android via navegador. Idioma: PT-BR.

O `Master-Prompt.md` tem **125 seções** e é denso em regras explícitas. As cinco mais estruturantes:

1. Torre é **sempre 1×1** (§17)
2. Torre **não tem Boss** — a regra "andar 10/20/30" está abolida (§21, §55)
3. XP é **dividido** entre membros da equipe (§20)
4. Equipamento é **raro** (5% de drop) e o X é **independente por atributo** (§32, §36)
5. **Fragmentos nunca** dropam de inimigo comum (§12)

---

## 3. O que existe no repositório

```text
project-tower/
├── Master-Prompt.md          47 KB · 125 seções · ESPECIFICAÇÃO CENTRAL
├── AI_STATE.md               este arquivo
├── README.md
├── docs/                     30 documentos
├── package.json              monorepo (workspaces + scripts de verificação)
├── tsconfig.json             TypeScript strict + aliases dos pacotes
├── vitest.config.ts          projetos `arch`, `unit` e `integration`
├── .env.example              variáveis de ambiente documentadas
├── assets/
│   ├── sprites/              pack Nika Studio (422 PNG + licença) — VERSIONADO (ADR-019)
│   ├── generated/            58 artefatos gerados (UI, SFX, retratos) — VERSIONADO
│   ├── ATTRIBUTION.md        crédito exigido pela licença
│   └── SOURCES.md            origem, recuperação e regras de arte nova
├── reference/                material importado de repos de referência
│   └── tower-idle-adventure/ docs de design, protótipos, schema Supabase
├── scripts/
│   ├── check-docs.mjs        validador de documentação
│   ├── extract-ui.mjs        extrai a ui_kit do pack (determinístico)
│   ├── gen-audio.mjs         gera os 22 SFX procedurais (determinístico)
│   ├── build-assets.mjs      pipeline de assets (gera manifest, falha alto)
│   ├── check-assets.mjs      bloqueia placeholders (§62)
│   ├── check-no-secret.mjs   bloqueia segredos versionados (§91)
│   └── check-debug-mode.mjs  garante Debug Mode só em dev (§93)
├── packages/
│   ├── config/               @tia/config — TODO balanceamento centralizado
│   ├── contracts/            @tia/contracts — IDs, comandos, entidades, eventos
│   ├── engine/               @tia/engine — Battle Engine PURO (§64)
│   ├── game-core/            @tia/game-core — regras, estado, nickname, PersistenceService
│   └── ui/                   @tia/ui — HUD (formata, não calcula)
├── apps/
│   ├── game-web/             Vite + React + Phaser
│   └── admin-web/            shell reservado (Fase Online)
└── tests/
    ├── arch/                 invariantes de arquitetura (INV-11 … INV-18)
    └── integration/          o loop da Torre ponta a ponta
```

**Ordem de dependência (sem ciclos, verificada por teste):**

```text
config  →  contracts  →  engine  →  game-core  →  ui
                                    ↓
                              apps/game-web
```

## 4. Achados da FASE 0 (Inspeção)

### 4.1 O repositório de referência

O `Master-Prompt.md` §61 manda inspecionar <https://github.com/marmitero/tower-idle-adventure> antes de criar assets. **A inspeção foi feita.**

**Achado 1 — o repositório contém 450 arquivos:**
- **422 PNGs** de um pack profissional (Fantasy Dungeon, Nika Studio v1.4)
- 14 documentos de design (~2.000 linhas)
- 1 protótipo HTML estático
- 1 migration SQL com smoke tests

**Consequência: nenhum asset novo é necessário para a vertical slice.**

**Achado 2 — o repositório de referência implementa um jogo com regras DIFERENTES das deste projeto.** 18 divergências substanciais foram mapeadas e resolvidas em ADR-002. As mais importantes:

| Tema | Referência | Este projeto |
|---|---|---|
| Combate na Torre | Encontros de 1–3 inimigos | **1×1** |
| Boss na Torre | Boss solo no andar 10 | **Abolido** |
| Heróis iniciais | 3, todos recebidos por marco | **4, escolhe 1** |
| Nível | Compartilhado conta/equipe | **XP do Rei ≠ XP do herói** |
| XP de equipe | Sem divisão | **Dividido** |
| Slots de equipe | 3 desde o início | **1 → 2 (nível 10) → 3 (nível 25)** |
| Drop de equipamento | 15% | **5%** |
| Offline | Inexistente | **2h Free / 8h VIP** |
| Mercado | Fora do escopo | **Com taxa de 15%** |
| Login | E-mail OTP | **Google Auth** |

**Decisão (ADR-001):** o `Master-Prompt.md` **vence sempre**. A referência foi aproveitada para **assets** e para **decisões técnicas sem conflito** (fórmulas de combate, traços de arma, slots de equipamento, estrutura de schema, threat model), **nunca** para regras de gameplay conflitantes.

**Achado 3 —(asset pack detalhado em [`docs/ASSET_INVENTORY.md`](docs/ASSET_INVENTORY.md)):**

| Categoria | Qtd | Dimensão |
|---|---:|---|
| Characters | 108 | 1024×1024 (grade 4×4, frames 256×256) |
| Icons | 224 | 64×64 |
| Tileset | 65 | 128×128 |
| VFX | 7 | varied |
| Portraits | 8 | 256×256 |
| Hero skins | 8 | 2048×2048 |

- Total: **92,1 MiB** → precisa de subset para o bundle
- Licença: MIT, **crédito obrigatório** a Nika Studio
- ⚠️ `ui/ui_kit.png` tem **palavras em inglês rasterizadas** ("INVENTORY", "ITEMS", "EQUIP") — **não usável como UI final** num jogo PT-BR
- ⚠️ `hero_skins/*.png.png` têm extensão duplicada — preservar, mapear por ID estável

---

## 5. Decisões tomadas nesta sessão (Tipo B — técnicas)

Todas em [`docs/DECISIONS_LOG.md`](docs/DECISIONS_LOG.md).

| ADR | Decisão |
|---|---|
| **001** | Precedência documental: `Master-Prompt.md` > decisão humana > `docs/` > referência externa |
| **002** | 18 divergências mapeadas e resolvidas |
| **003** | Reis e heróis com **XP separado** (abandona "nível compartilhado" da referência) |
| **004** | Adotar o pack de sprites da referência; IDs estáveis; não empacotar os 92 MiB *(parcialmente superado pelo ADR-019: os 92 MiB passaram a ser versionados em 2026-10-02)* |
| **005** | Monorepo + `packages/engine` puro + `PersistenceService` LOCAL→SUPABASE |
| **006** | Configuração centralizada como **dado tipado e validado**, não constante |
| **007** | `SEARCHING` é **estado persistido** do game loop, não `setTimeout` de componente |
| **008** | Servidor autoritativo desde a fundação; batch idempotente com `requestId` |
| **009** | Tempo medido em **timestamp absoluto** com relógio injetado; o loop limita o passo a 250 ms para que voltar de uma aba não processe 30 s de combate de uma vez |
| **010** | A invariante 1×1 é imposta pela **assinatura** (`startTowerBattle` recebe um herói, não uma equipe), não por um `if` que alguém pode remover |
| **011** | O `GameState` é a **única** porta de mutação; `data` é exposto como `Readonly` e toda mudança incrementa `revision` (§86) |
| **012** | Criação do Rei sem auto-criação (§62); retrato ≠ skin; regras de nickname em dados (`config.account.nickname`) |
| **013** | Catálogo de heróis como dado remodelável; assets por ID do manifesto estruturados em folhas; validação cruzada config × manifesto no CI |
| **014** | OpenRpg (MIT) como base de dados de classes/status/skills/itens; atributos STR/DEX/CON/INT/WIS/CHA derivando growth; catálogo de skills; divergências mapeadas em `docs/OPENRPG_REFERENCE.md` |
| **015** | P-002 resolvida por delegação do usuário: identidades definitivas (Aldric/Kaia/Maelis/Vorath) em `config/src/heroes.ts` — nome, epíteto, lore, personalidade, voz, raridade, skill assinada, statPriority, aquisição (§12) |

---

## 6. Pendências — o estado mais importante

**P-002 (2026-10-01), P-005/P-006/P-009 e P-010/P-016/P-023/P-024/P-025/P-033 (2026-10-03) RESOLVIDAS; 3 críticas restantes** (+ riscos R-01…R-05 em PENDING_RULES §6b). Nenhuma foi inventada. Detalhes em [`docs/PENDING_RULES.md`](docs/PENDING_RULES.md).

### As 3 críticas restantes (P-002, P-005, P-006, P-010 resolvidas)

| ID | Pendência | Bloqueia | Material de apoio |
|---|---|---|---|
| ~~🔴 **P-002**~~ | ~~Definição dos 4 heróis iniciais~~ ✅ | — resolvida | Identidades em `packages/config/src/heroes.ts` (Aldric/Kaia/Maelis/Vorath), ADR-015 |
| ~~🔴 **P-005**~~ | ~~Estrutura e curva da Torre~~ ✅ | — resolvida | 40 andares por faixa de nível, ADR-021 |
| ~~🔴 **P-006**~~ | ~~Inimigos: stats, papéis, resistências~~ ✅ | — resolvida | 11 inimigos por papel, ADR-021 |
| 🔴 **P-008** | Todos os valores de Coin | Fase 10 | — |
| ~~🔴 **P-010**~~ | ~~Faixa e granularidade do X~~ ✅ | — resolvida | X fracionário 0,50–2,50, ADR-023 |
| 🔴 **P-011** | Taxa de conversão offline → recompensa | Fase 11 | — |
| 🔴 **P-036** | Sumidouros principais de Coin | Fase 10 | — |

### Por que elas não foram preenchidas

O §73 é explícito:

> **Tipo C — Regra de gameplay/economia crítica: não inventar. Registrar PENDING e, quando necessário, solicitar decisão humana.**

Um valor inventado em silêncio é **pior** que um valor ausente, porque parece decisão. E em economia, um número plausível e errado é descoberto pelo **jogador**, no meio do jogo, quando já é caro de mudar.

### Recomendação de prioridade

~~P-002~~, ~~P-005/P-006/P-009~~ resolvidas. P-008/P-036 (Coin) foram decididas provisoriamente na Fase 10 e P-011/P-011a resolvidas (ADR-025/026). P-017/P-018/P-021(Boss)/P-029/P-062 foram decididas provisoriamente na Fase 12 (ADR-027). Nenhuma pendência crítica bloqueia mais o MVP:

```text
~~P-010~~ → Fase 9 ✅ · P-008/P-036 (Coin) → Fase 10 ✅ (provisório) · P-011 (offline) → Fase 11 ✅ · P-018 → Fase 12
```

---

## 7. Próximo passo

### **FASE 3 — Rei** ✅ CONCLUÍDA (gate batido)

O que a Fase 3 entregou:

```text
✅ Fluxo de criação: boot sem save → CreationScreen (nome + skin) → createGame → saveNow
✅ Nickname: normalizeNickname + validateNickname (códigos de erro, mensagens PT-BR)
   regras em config.account.nickname (⛔ P-007 provisório)
✅ Retrato do Rei na HUD e no perfil (portraits/hero) + skin por corpo (hero_skins/<id>)
✅ Skin: catálogo royal|paladin (⛔ P-006c), changeSkin cosmético + desbloqueio por nível
✅ XP do Rei com curva da config (⛔ P-009) exibida no perfil (pt-BR)
✅ 1 Rei por conta (§8): boot reidrata o MESMO Rei; sem auto-criação
✅ lastActiveAt (§47) nascendo do relógio e do markActive()
✅ Regressões corrigidas: relógio vivo do estado (tickSearch completava nunca)
   e save imediato na criação (F5 não perde o Rei)
```

**Gate — VERIFICADO por `tests/integration/creation-flow.test.ts`:**
"um jogador cria seu Rei, tem nome único e vê nível, skin e retrato."

### Gate de saída da FASE 2 — VERIFICADO

| Item | Status | Evidência |
|---|---|---|
| `engine` sem React/Phaser/DOM/timers/`Math.random` | ✅ | `tests/arch/imports.test.ts` — INV-11 |
| `TowerBattle` 1×1, `BossBattle` equipe×1 | ✅ | `engine/src/__tests__/simulate.test.ts` + `tests/integration/tower-loop.test.ts` |
| `validateConfig()` roda no boot e falha alto | ✅ | `apps/game-web/src/main.tsx` + 39 testes de config |
| Tabelas de probabilidade somam 100% | ✅ | `config/src/__tests__/config.test.ts` |
| `PersistenceService` com abstração | ✅ | `game-core/src/persistence/` — Local implementa a interface; Supabase entra na Fase Online |
| Build Vite passa | ✅ | `npm run build` |
| Assets em `public/assets/` (< 8 MB) | ⛔ | **BLOQUEADO** — ver §11 |
| Debug Mode ausente do bundle de produção | ✅ | `scripts/check-debug-mode.mjs` |
| `check-docs` passando | ✅ | `OK 32 documentos verificados, 0 erros` |

### **FASE 4 — Personagens** ✅ CONCLUÍDA (gate batido, ADR-016)

O que a Fase 4 entregou:

```text
✅ Escolha 1-entre-N (§10 literal): createNew recebe starterIdentityId e o
   save nasce com APENAS o herói escolhido (origin: "starter")
✅ Passo 2 da criação "Convocação do Campeão": 4 candidatos com retrato,
   nome+epíteto, raridade, classe/estilo e skill assinada (dados do catálogo)
✅ Códice derivado (game-core/src/codex.ts heroCodex): os outros 3 aparecem
   bloqueados com dica de aquisição §12-safe — NÃO é campo de save
✅ §19 preservado: escolha = posse; equipe continua ato explícito do jogador
✅ XP/níveis de herói já funcionais (ADR-014: grantHeroXp → heroStatsAtLevel
   recalcula stats; heroPower; heroProgress na UI)
```

**Gate — VERIFICADO por `tests/integration/creation-flow.test.ts` e
`tests/integration/tower-loop.test.ts`:** "o jogador escolhe 1 herói na
criação, recebe apenas aquele, e os outros 3 ficam no códice bloqueados."
Testes que precisam de mais heróis usam o helper `recruit()` (recrutamento
explícito — o sistema real de aquisição é Fase 9+).

### **FASE 5 + 8 — Equipe e Searching** ✅ CONCLUÍDAS (gates batidos, ADR-017)

O que as fases entregaram:

```text
✅ Equipe/slots (§15/§46): slot 1 livre; slot 2 = Rei Nv 10 + 50.000 Coin;
   slot 3 = Rei Nv 25 + 250.000 Coin (⛔ P-003 provisório, config.team.slots)
✅ unlockSlot atômico + em ordem; UI completa: escolher slot, remover,
   tornar ativo, motivo de bloqueio (nível vs Coin) no botão
✅ XP dividido 1/n (⛔ P-004: config.xp.teamSplit, rounding floor) —
   divisão integrada em applyRewards por MEMBRO da equipe (§20)
✅ Searching (§26–§29): loop idle completo — vitória → PROCURANDO ~3s
   (2,7–3,2s) → nova batalha; timestamp absoluto persistido (ADR-007);
   navegar/recarregar não pausa (⛔ P-012: última gravação vence)
✅ Derrota encerra a caçada, sem auto-restart; "Recomeçar a caçada" é ato
   do jogador (⛔ P-019); caído não recebe XP (⛔ P-020b)
✅ UI: "PROCURANDO… X.Xs" com animação, pílula "Caçada" no HUD
```

**Gate — VERIFICADO:** `team-slot-unlock.test.ts` + `team-xp-split.test.ts` +
`searching-state.test.ts` (21 testes) e suíte completa (350 verdes).

### Depois da Fase 5+8

```text
FASE 6  ✅ Combate              ← CONCLUÍDA (ADR-020: HP persistente, skills, feedback visual)
FASE 7  ✅ Torre                ← CONCLUÍDA (ADR-021/022)
FASE 9  ✅ Equipamentos         ← CONCLUÍDA (ADR-023/024)
FASE 10 ✅ Economia (Market)    ← CONCLUÍDA (ADR-025; preços provisórios)
FASE 11 ✅ Offline              ← CONCLUÍDA (ADR-026; simulação do online)
FASE 12 ✅ Boss                 ← CONCLUÍDA (ADR-027; chefes 100% dado)
FASE 13 MVP LOCAL               ← PRÓXIMO PASSO (etapa 7) — o vertical slice
FASE 14 Painel Admin            pós-MVP (docs/ADMIN_PANEL.md)
```

---

## 8. Regras que não podem quebrar

Cada uma tem teste automatizado obrigatório em [`docs/TESTING.md`](docs/TESTING.md).

Todas as 15 têm teste **passando** hoje. Os arquivos abaixo existem e rodam em `npm run test` e `npm run test:arch`.

| # | Regra | Seção | Onde está verificada |
|---|---|---|---|
| 1 | Torre é **sempre 1×1** | §17, §79 | `engine/.../simulate.test.ts`, `tests/integration/tower-loop.test.ts` |
| 2 | Torre **nunca** tem boss | §21, §55 | `tower-loop.test.ts` (100 andares), `config.test.ts` |
| 3 | Boss usa **toda a equipe** | §24, §80 | `simulate.test.ts` (3 atacam no mesmo tick) |
| 4 | XP do Rei ≠ XP do herói | §45 | `game-core/.../progression.test.ts` |
| 5 | XP é **dividido** por tamanho da equipe | §20, §81 | `progression.test.ts`, `tower-loop.test.ts` |
| 6 | Fragmentos **nunca** de inimigo comum | §12 | `loot.test.ts` (2000 bundles), `tower-loop.test.ts` |
| 7 | X **independente por atributo** | §36 | `loot.test.ts` |
| 8 | Drop de equipamento = **5%** | §32 | `loot.test.ts` (20 000 rolagens) |
| 9 | `SEARCHING` ~3s e **não pausa** ao navegar | §27, §29 | `hunt.test.ts` |
| 10 | Offline **2h Free** / **8h VIP** | §47, §48 | `hunt.test.ts` |
| 11 | Mercado cobra **15%** | §41 | `config.test.ts` (config pronta; UI na Fase 10) |
| 12 | Heróis **ilimitados** | §13 | `team.test.ts`, `inventory.test.ts` |
| 13 | **1 conta = 1 Rei** | §8 | `config.test.ts` (`kingPerAccount === 1`) |
| 14 | Engine **não importa React** | §63, §64 | `tests/arch/imports.test.ts` — INV-11 a INV-18 |
| 15 | Probabilidades somam **100%** | §32, §33 | `config.test.ts` |

---

## 9. Mapa de documentos

| Documento | Conteúdo |
|---|---|
| [`docs/README.md`](docs/README.md) | Índice completo e convenções |
| [`docs/GDD.md`](docs/GDD.md) | Visão, pilares, fantasia central, escopo, critérios de sucesso |
| [`docs/GAME_SYSTEMS.md`](docs/GAME_SYSTEMS.md) | Mapa de sistemas e dependências |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Fases, gates, entregáveis |
| [`docs/PENDING_RULES.md`](docs/PENDING_RULES.md) | **As 67 pendências** |
| [`docs/DECISIONS_LOG.md`](docs/DECISIONS_LOG.md) | ADR-001 a ADR-008 |
| [`docs/CONFIGURATION.md`](docs/CONFIGURATION.md) | Onde cada número do MP mora |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Stack, monorepo, contratos |
| [`docs/CHARACTER_SYSTEM.md`](docs/CHARACTER_SYSTEM.md) | Rei, heróis, equipe, fragmentos |
| [`docs/SKILL_SYSTEM.md`](docs/SKILL_SYSTEM.md) | Skills e efeitos |
| [`docs/COMBAT_SYSTEM.md`](docs/COMBAT_SYSTEM.md) | Battle Engine, fórmulas, eventos |
| [`docs/WEAPON_SYSTEM.md`](docs/WEAPON_SYSTEM.md) | 9 armas e traços |
| [`docs/EQUIPMENT_SYSTEM.md`](docs/EQUIPMENT_SYSTEM.md) | Slots, raridades, X, god rolls |
| [`docs/TOWER_SYSTEM.md`](docs/TOWER_SYSTEM.md) | Andares e estado Procurando |
| [`docs/BOSS_SYSTEM.md`](docs/BOSS_SYSTEM.md) | Atividades de Boss |
| [`docs/PLAY_LOCAL.md`](docs/PLAY_LOCAL.md) | Jogar no Windows (passo a passo), problemas comuns, como o zip é verificado |
| [`docs/MVP_ACCEPTANCE.md`](docs/MVP_ACCEPTANCE.md) | Matriz de aceite do MVP (§78 + §118 → testes) |
| [`docs/BALANCE_REPORT.md`](docs/BALANCE_REPORT.md) | Balanceamento da Torre (gerado) |
| [`docs/ADMIN_PANEL.md`](docs/ADMIN_PANEL.md) | Painel Admin futuro + contrato `ContentPack` |
| [`docs/INVENTORY_SYSTEM.md`](docs/INVENTORY_SYSTEM.md) | Inventário, filtros, comparação |
| [`docs/AUTOMATION_SYSTEM.md`](docs/AUTOMATION_SYSTEM.md) | Loop idle, offline, VIP |
| [`docs/ECONOMY_SYSTEM.md`](docs/ECONOMY_SYSTEM.md) | Moedas, fontes, sumidouros |
| [`docs/AUTH_SYSTEM.md`](docs/AUTH_SYSTEM.md) | Guest, Google Auth, nickname |
| [`docs/CHAT_SYSTEM.md`](docs/CHAT_SYSTEM.md) | Chat Global server-authoritative |
| [`docs/SOCIAL_SYSTEM.md`](docs/SOCIAL_SYSTEM.md) | Guildas, rankings, arena |
| [`docs/MARKET_SYSTEM.md`](docs/MARKET_SYSTEM.md) | Mercado e taxa de 15% |
| [`docs/MMO_SYSTEMS.md`](docs/MMO_SYSTEMS.md) | Visão agregada dos sistemas MMO |
| [`docs/UI_UX.md`](docs/UI_UX.md) | HUD, telas, responsividade |
| [`docs/ART_GUIDELINES.md`](docs/ART_GUIDELINES.md) | Direção de arte, pipeline, QA |
| [`docs/ASSET_INVENTORY.md`](docs/ASSET_INVENTORY.md) | **Inventário concreto dos 422 sprites** |
| [`docs/ASSET_GAP.md`](docs/ASSET_GAP.md) | **Lacunas de arte para o MVP** (áudio, UI, retratos) |
| [`docs/STYLIZATION_ROADMAP.md`](docs/STYLIZATION_ROADMAP.md) | **Roadmap da fase de arte** (ondas, lotes de 10 gerações, metas M1–M10) |
| [`docs/ART_PIPELINE.md`](docs/ART_PIPELINE.md) | **Pipeline de arte** (spec medida dos sprites, `ita-atlas-v1`, prompts, chroma key, validação) |
| [`docs/AUDIO_GUIDELINES.md`](docs/AUDIO_GUIDELINES.md) | Áudio (esboço — FASE Polish) |
| [`docs/SECURITY.md`](docs/SECURITY.md) | Threat model, RLS, anti-cheat |
| [`docs/PERFORMANCE.md`](docs/PERFORMANCE.md) | Orçamento de performance |
| [`docs/TESTING.md`](docs/TESTING.md) | Estratégia, matriz §78, invariantes |
| [`scripts/check-docs.mjs`](scripts/check-docs.mjs) | Validador de documentação |

---

## 10. Riscos ativos

| Risco | Mitigação |
|---|---|
| **Inventar regra de economia para "destravar"** | §73 proíbe. Valores pendentes ficam marcados e centralizados. 7 críticas esperando decisão humana |
| **Deixar o `Master-Prompt.md` ser diluído pela referência** | ADR-001 e ADR-002. Em conflito, o MP vence |
| **Regra estrutural quebrada silenciosamente** | §79/§80 são testes de release. 15 invariantes com teste dedicado |
| **Colocar a lógica no React** | `tests/arch/imports.test.ts` — 18 invariantes, roda em `npm run test:arch` |
| **Espalhar números de balanceamento** | `packages/config` + `validateConfig()` no boot + INV-18 (todo arquivo de balanceamento cita §/P/ADR) |
| **Hardcodar caminho de sprite no código** | `scripts/build-assets.mjs` gera o manifesto `id -> caminho`; o código nunca monta caminho |
| **Deixar Debug Mode em produção** | `scripts/check-debug-mode.mjs` — falha se `debugger` sobrar ou se debug ficar sem guarda de ambiente |
| **UI com rótulos em inglês** | `scripts/extract-ui.mjs` só entrega peças sem texto (guardrail por componentes conectados); barras são decompostas e os números saem em PT-BR pelo runtime. Rótulos sempre em HTML/CSS |
| **Placeholder chegar ao público** | `scripts/check-assets.mjs` detecta emoji-as-sprite, SVG inline e retângulo-colorido; `--strict` bloqueia o release sem sprites |
| **`bigint` se perder na serialização** | `encodeSave`/`decodeSave` com tag explícita; teste com valor acima de `Number.MAX_SAFE_INTEGER` |
| **Save corrompido travar o boot** | `boot()` põe o ilegível em quarentena e cria um novo save, em vez de crashar |

---

## 11. O que NÃO foi feito (e por quê)

| Não feito | Por quê |
|---|---|
| **Assets de arte** | ✅ RESOLVIDO. Pack **versionado neste repositório** desde 2026-10-02 (ADR-019): 422 PNGs em `assets/sprites/` (com LICENSE.txt da Nika Studio) + 58 artefatos gerados versionados em `assets/generated/` (33 peças de UI sem texto, 22 SFX, 3 retratos). Material de referência do repo de origem em `reference/tower-idle-adventure/`. `scripts/build-assets.mjs` monta o manifesto (480 entradas) e `scripts/check-assets.mjs` valida catálogo REQUIRED + relatório de extração. `npm run check:assets:strict` segue sendo o gate de release. O repositório `marmitero/tower-idle-adventure` NÃO é mais necessário. |
| **Música e ambiência** | FASE de Polish (§15). Os 22 SFX cobrem o MVP (§60/§63); a estrutura alvo está em `docs/AUDIO_GUIDELINES.md` §3. |
| **Implementação do Supabase** | A interface `PersistenceService` existe e a implementação LOCAL é real. A de Supabase entra na Fase Online, com RLS. |
| **Inventário visual completo** | A lógica existe e é testada; a tela mostra a lista com raridade, nota e X. Falta ordenar/paginar conforme `P-025`/`P-016`. |
| **Tela de criação do Rei** | É a Fase 3. Depende de `P-007` (formato do nickname) e `P-006c` (skins iniciais). |
| **Catálogo de skills** | `P-022` (progressão) e `P-020` (prioridade) continuam abertas. O engine já aceita `SkillDef`; o catálogo não foi inventado. |
| **Mercado** | `P-014` (regras de anúncio) e `P-041` (anonimato) abertas. A taxa de 15% já está na config e validada. |
| **Admin-web** | Shell reservado. A Fase Online define o que ele faz. |
| **Invocar os 4 heróis definitivos** | §73 — Tipo C. `P-002` é crítica. Existe um **catálogo provisório** em `packages/config/src/catalog.ts`, marcado com `⛔ P-002`, para que a fundação funcione. **Não é uma decisão.** |

---

## 12. Resumo para a próxima sessão

**Estado:** FASE 1–5 e 8 concluídas. **FASE 5+8 (Equipe/Searching) fechadas em
2026-10-01** (ADR-017): slots com desbloqueio por nível+Coin (P-003: 50k/250k
provisório), XP dividido 1/n (P-004), loop idle de searching ~3s com
timestamps absolutos (P-012) e derrota sem auto-restart (P-019/P-020b). As 5
pendências foram ratificadas por delegação — os números de Coin são os mais
frágeis e serão revalidados na Fase 10. Antes disso: FASE 4 (escolha de herói
§10 + códice, ADR-016) e as identidades P-002 (ADR-015) — mudar um herói é
editar `config/src/heroes.ts`.

**Assets (2026-10-01):** as três lacunas vermelhas do inventário foram fechadas — UI em PT-BR (33 peças sem texto extraídas da `ui_kit`; barras decompostas em trilho+fills+caps para compor em runtime com números em PT-BR), áudio (22 SFX procedurais gerados por `scripts/gen-audio.mjs`, incluindo a escada de raridade do §108) e retratos dos 4 heróis (3 gerados no estilo do pack). Pipeline: 480 entradas no manifesto, `check:assets` e `check:assets:strict` verdes. Detalhes em `docs/ASSET_GAP.md` §3.

### Fase 6 — Combate (ADR-020, 2026-10-03)

- **HP persistente (P-019 fechada):** `Hero.currentHp`; a batalha nasce com o HP atual
  (`CombatantSeed.startHp`); vitória mantém, derrota zera, a chain NÃO cura.
  Recuperação é ato do jogador: `GameState.restartHunt()` / `restActiveHero()` (pausa
  `hunt={kind:"paused",reason:"rest"}`), governados por `config.combat.healOnHuntRestart`.
  `configVersion` 1→2 + migração do save (`currentHp = stats.hp`).
- **Skills (P-020 ratificada):** `engineSkillsFor(classId)` → skills ativas da classe, por
  cooldown, ordem do catálogo; `attack_started.skillId` identifica a skill.
- **Apresentação:** `GameEvents.onBattleEvents` → `battleFeedbackQueue` → `BattleScene.update()`
  executa `planBatch` (`render/BattleRenderer.ts`): lunge, número flutuante (crítico maior),
  flash, shake, morte com fade, banner VITÓRIA!/DERROTA, nome da skill, SFX (`render/sfx.ts`).
  `prefers-reduced-motion` respeitado. **Para mudar "como a batalha se parece": só `BattleRenderer.ts`.**
- **Sprites:** sheets Nika 1024×1024, grade 4×4 de 256px, rows down/up/left/right; aliado olha à direita (row 3), inimigo à esquerda (row 2).
- Testes: `combat-hp.test.ts` (engine 6 + game-core 8). Suíte: **364 verdes**.
- **Limites conhecidos (herdados para a Fase 7+):** inimigos não têm skills; efeitos de status
  (stun/veneno) ainda não têm ícone; sem música. As 4 folhas de combate (idle/attack/hurt/death)
  carregam juntas por combatente e cada animação usa a sua própria folha.

### Fase 7 — Torre (ADR-021/022, 2026-10-03)

- **Andares:** `config.tower.floors` (40, `FloorDef`): faixas 1–10, 10–25, 25–50, 50–100, 100–250, 250–500, 500–1000, 1000–1500, 1500–2500, 2500–5000 e **1 andar por 500 níveis até 20.000**. **Nível do inimigo = nível-base da faixa**; gate = nível do Rei (`TowerLockedError`, `highestUnlockedFloor`). Seleção manual na `TowerScreen`.
- **Teto 20.000** (Rei e heróis). XP necessário `floor(4300·N^0,644)` e XP/abate `floor(50·(E+3)^0,98)` (ADR-031; era 20·(N+30)^1,35); Coin/abate `floor(12·(E+3))` (⛔ P-008 provisória). **≈ 759 h** até o teto; Nv 100 ≈ 24 h; andar 10 ≈ 139 h (gargalo, R-03).
- **Inimigos:** 11 (`packages/config/src/enemies.ts`), 6 atributos + papel (tank/dps/swift/caster/balanced/elite) + dano físico/mágico; pool por andar com sorteio determinístico. `boss`/`slimeking` reservados à Fase 12.
- **Engine:** defesa `K = 100 + 5×(nível−1)`; regen 5%/s em PROCURANDO; `attack = FOR×1,0 + DES×0,3`; Arqueiro FOR 24/DES 24. Calibração global `tower.enemyHpMultiplier 2,5 / enemyAttackMultiplier 0,05`. `configVersion` 3.
- **Admin-Ready (ADR-022):** `exportContentPack`/`validateContentPack`/`applyContentPack`/`defaultContentPack`/`resetContentToDefaults` em `packages/config/src/content.ts`. **Regra para as Fases 9–12:** todo conteúdo novo = dado serializável + validável + dentro do `ContentPack` + teste de round-trip. Painel = FASE 14 (`docs/ADMIN_PANEL.md`), **não implementar antes do MVP**.
- **Relatório:** `npm run report:balance` (`-- --md` regenera `docs/BALANCE_REPORT.md`; rodar após qualquer mudança de curva/inimigo).
- **Futuro registrado (não implementar):** Rei anunciar personagens evoluídos no Mercado (`docs/MARKET_SYSTEM.md` §10b).
- Testes: `tower-content`, `tower-balance`, `tower-floors`, `level-scaling`, `combat-hp`; suíte **441 verdes**.

### Fase 9 — Equipamento (ADR-023/024, 2026-10-03)

- **Modelo:** `Equipment` guarda `itemTypeId, level, rarity, xValues, quality, grade, seed, traitId, featureId`; stats **derivados** (`ref(nível) × unidade × peso × raridade × X`). X fracionário 0,50–2,50 (2 casas, sino, ≥2,0 ≈ 1%). Linhas por raridade 2/2/3/3/4/4. Notas S–F: 59/49/38/28/21/15/0. Catálogo: 10 slots, 18 templates, 9 traços de arma, 4 características — `packages/config/src/equipment.ts`.
- **Loot/Inventário:** `packages/game-core/src/{loot,gear,inventory}.ts`; 300 itens não equipados, `onFull` = `autoSell`; venda por dados (Coin/abate × abates equivalentes × fator de nota), venda em massa com pré-visualização; equipado/travado não vende; requisito `ceil(0,9 × nível)`; afinidade +5%.
- **Engine:** `GearEffect` (vocabulário fechado: crítico, vel., dano, perfuração, roubo vital, recarga, sifão, veneno, atordoamento, contracorte, golpe duplo, área) com tetos em `equipment.effectCaps`; `packages/engine/src/gear.ts`. **Conserto do IAS:** `intervalo = T₀/(1+IAS)`, T₀ 1000 ms (antes o IAS era ignorado).
- **Heróis (ADR-024):** todos incomuns na seleção; `Hero.rarity/attributes/quality`; `rollHeroAcquisition` (atributos ±15%, raridade 50/30/15/4/0,9/0,1, mesma regra para toda classe); cópias no códice; o drop de Rei entra na Fase 12.
- **ContentPack v2** (blocos `equipment`, `loot`, `inventory`, `heroAcquisition`); `configVersion` 4; migração de itens legados pelo `seed`.
- **UI:** `InventoryScreen.tsx` (grade, filtros, comparação, equipar/vender/travar, venda em massa), toasts de drop; ícones gerados em `assets/generated/items/` (`scripts/gen-item-icons.mjs`).
- **Balanço:** `npm run report:balance` ganhou a seção de equipamento (`rollGearSet`): nv 500, set médio reduz custo de vida por luta de ~10% para 2–5%; god roll (Celestial X 2,5) ≈ 0% — inalcançável por probabilidade. A Torre **não** foi recalibrada: o equipamento é a progressão de poder (aceito; revalidar em playtest).
- **Cuidado:** os ícones soltos da raiz de `assets/sprites/icons1/` têm nomes que não casam com o conteúdo — usar só as folhas `icons_*_N`.
- Testes: suíte `unit+integration+arch` ≥ 546 verdes (`gear-effects`, `hero-acquisition`, `equipment-flow`, `content-pack-v2`, `equipment`, `gear`, `loot`, `inventory`, `tower-balance`).

### Fase 10+11 — Market, Bot e offline (ADR-025/026, 2026-10-03)

- **Market** (`MarketScreen.tsx`, `packages/game-core/src/shop.ts`, dados em `packages/config/src/market.ts`): abas Poções/Revives/Caixas; compra atômica por Coin (preço fixo ou em abates, nível mínimo); caixas (Nv 250/1.500/5.000) sorteiam fragmentos ou herói completo com chances baixas; fragmentos são da **conta** (`classe:raridade`) e a invocação usa `heroAcquisition.fragmentsRequired`. Ícones: 6 novos gerados (`items/revive_*`, `items/box_*`).
- **Bot** (`bot.ts`, `BotPanel.tsx`, `SaveData.bot`): auto-poção (limite de vida, item "auto" ou específico), auto-revive (mesma luta, via gancho `onAlliesDown` do engine), voltar do Hub sozinho. Salvaguardas em `config.bot`. **Hub** = `hunt: defeated` + `bot.hubRecoveryMs` (60 s) → volta curado ao MESMO andar.
- **Offline = simulação do online** (`GameState.claimOffline`, `runSimulation`, relógio virtual `clock()`): teto 2 h Free / 8 h VIP **por ausência** (o modelo "acumulado" caiu); mínimo 30 s; relatório `OfflineReport` e modal "Bem-vindo de volta". O boot agora **chama** `claimOffline` (antes só marcava `lastActiveAt`) e há heartbeat de 5 s no loop.
- **Loop único:** `advanceIdle(dt)` (luta/busca/Hub/nova busca) é usado pelo loop do navegador e pela simulação.
- **ContentPack v3** (`market`, `bot`, `offline`); `configVersion` 5; migração 4→5 (Bot/Market padrão, `accumulatedMs` zerado); `hunt in_battle` sem luta em memória vira `null` ao carregar.
- **Balanço:** `BALANCE_REPORT.md` ganhou a seção "Market" (≈ 22 h / 129 h / 675 h de caça por herói completo via Caixa Básica/Rara/Lendária).
- Testes: `market-bot-offline`, `heal-revive` (engine), `tower-content` (Market como conteúdo), `hunt` (por ausência); suíte completa verde.
- **Cuidados:** `GameState.clock()` deve ser usado em TODA marca de tempo do estado de caça (só `lastSavedAt` usa o relógio real); `simulating` suprime listeners/toasts; no sorteio de caixa a semente vem de `market.boxesOpened`.

### Fase 12 — Boss (ADR-027, 2026-10-03)

- **Boss = dado.** `config.boss` (`packages/config/src/boss.ts`, ContentPack **v4**, `configVersion` 6, save v6): `BossDef` com nível, stats, resistências (`statusResist`), skills (área na equipe), **fases** (HP% ou tempo/enrage; multiplicadores, cura, skills), `timeLimitMs`, **tentativas** (`none`/`cooldown`/`window`), recompensas em *abates equivalentes*, fragmentos e sprites. Adicionar chefe = clonar objeto + id novo. Validação `bossErrors`; pack inválido é recusado por inteiro. Regras e roster: `docs/BOSS_SYSTEM.md` §14.
- **Engine:** mesmo `simulate.ts` da Torre (`mode: "boss"`, equipe × 1, ataque simultâneo): `phases`, `statusResist`, `timeLimitMs` (timeout = derrota), eventos `phase_changed`. **Game-core:** `boss.ts` (disponibilidade, tentativa consumida ao entrar, recompensa, normalização do save); `GameState.startBoss/forfeitBoss/bossAvailability/bossResult/dismissBossResult`; Bot na Arena com limites próprios; **offline nunca roda chefe**; `startTower` é bloqueado durante a luta.
- **UI:** aba **Arena** (`BossScreen.tsx`), cena própria no `BattleScene` (equipe em diagonal × chefe grande, banner de fase), modal de resultado (fragmentos em destaque) que devolve ao Reino.
- **Calibração por tamanho de equipe** (`BALANCE_REPORT.md`, seção "Chefes da Arena"): chefe 1 vence com 1 herói; chefe 2 com 2; chefes 3–8 exigem 3 heróis no nível do chefe. Nível do chefe ≈ nível do Rei exigido × f(n) (f = 1 / 0,74 / 0,63).
- Testes: `engine/boss-battle` (16), `game-core/boss` (33), `config/boss-content` (12), assets dos chefes (integração), migração de save v5→v6. Suíte completa verde.
- **Cuidados:** a tentativa é consumida ao ENTRAR; `GameState.clock()` em toda marca de tempo; recalibrar chefes se mexer em IAS/equipamento/XP (`npm run report:balance -- --md`).

### Fase de arte — "otimização e estilização" (ADR-032…042) — F0 + Lotes 1–5 aprovados; **Lote 6 entregue aguardando aprovação**

> **Playbook completo (regras do usuário, estilo, prompts que funcionaram, fluxo por comando, onde editar, tabelas do estado atual, fila L7–L11, armadilhas): [`docs/ART_HANDOFF.md`](docs/ART_HANDOFF.md).** Os itens abaixo são o histórico por lote.

- **Correção da Kaia (ADR-035):** corpo próprio `heroes/ranger_kaia` (9/10 gerações do L1); o Arqueiro Esquelético virou o herói reservado **Ossian** (`RESERVED_HEROES`, fora do elenco); `ingest` ganhou o *reflow* de folhas quadradas. Aguardando o usuário.
- **Lote 1 (ADR-034):** Borin, Duende de Faíscas, arena `f01_entrada`, botões/ícones GBA, login (fundo + logotipo), 4 retratos do Rei; obtenção por identidade; `CREATION_LAYOUT`/`uitheme.ts`/`gbaTheme.ts`; skins `legacy`. Contador de gerações em `assets/generated/PROVENANCE.md`.

- **Estado:** Gate 0 aprovado; **Etapa F0 implementada (0 gerações usadas)**: `scripts/art.mjs` + `tools/art/*` (guide/key/normalize/validate/contact/ingest/seamless/recolor/pack/measure/provenance; aliases `npm run art:*`), formato `ita-atlas-v1` + `render/spriteSource.ts` (fallback legado), `ArenaKitDef` no ContentPack v5, `assets.atlas` (inimigo) e `HeroIdentityDef.assets`, `TextureBudget`, auditoria de `assets/generated` no `check:assets` (inclui manifesto em dia). Provado no Chromium real com um atlas sintético (descartado). Painel Admin (Fase 14) continua depois da arte.
- **Regra do usuário:** ≤ **10 gerações por sessão**; ao fim do lote parar, explicar, aplicar no jogo, listar o próximo passo e **esperar confirmação**. Sprites com fundo magenta `#FF00FF`; poses/movimentação iguais às do pack.
- **Lote 2 (ADR-036):** +8 retratos do Rei (12 skins, liberadas por nível do Rei), arenas `f02_porao`/`f03_ossadas`/`f04_catacumbas` (`--floor-gain` no kit), Goblin Capitão (elite do andar 1), Sapo-Lodo e Rato (andar 2); grade de skins na tela do Rei. 9/10 gerações (1 reserva).
- **Lote 3 (ADR-037):** 8 inimigos novos (andar 2: Enguia, Troll do Esgoto; 3: Golem de Ossos, Cão de Ossos, Crânio Necrovela, Cavaleiro de Ossos; 4: Estátua Guardiã, Escaravelho de Tumba); andares 2 e 3 completos; roster 23; Esqueleto virou `dps`. 8/10 gerações (2 reservas).
- **Lote 4 (ADR-038/039):** andar 4 completo (Sacerdote Mumificado, Múmia Real); Clérigo = 5ª classe (engine de cura, 5 identidades, 4 retratos); roster 25 inimigos; 8/10 gerações. Aprovado.
- **Lote 5 (ADR-040):** 7 heróis novos (Rubro, Monge de Ferro, Lorde Cinzento, Furtivo, Besteiro, Guardiã, Piromante) + Ossian liberado = 18 heróis; 8 skills assinatura; `normalizeKeyColour`; identidade no Debug; correção do sorteio de identidade; 10/10 gerações. **Aprovado pelo usuário em 2026-10-04.**
- **Lote 6 (ADR-042):** **8 atlas** (Criomante, Tempestuário, Mago Ancião, Necromante dos Ossos, Bruxa do Pântano, Ceifeira, Demonólogo + o **Arqueiro Nômade** refeito, dívida do L5) e **1 folha 2×2 de retratos** (Criomante, Tempestuário, Mago Ancião, Vorath); 8 skills assinatura novas (régua de DPS estendida ao Invocador); 1 refação; 10/10 gerações. **Aprovado pelo usuário em 2026-10-06.**
- **Lote 7 (ADR-043):** **4 folhas 2×2 de retratos (16 retratos novos)** cobrindo 100% dos heróis com retrato individual (26/26) + **arena do andar 5 (`f05_ecos`, Salão dos Ecos)** + **3 inimigos com atlas próprio** (Sentinela de Cristal T, Duelista Fantasma D, Espectro Sussurrante V); 8/10 gerações. **Aprovado pelo usuário.**
- **Lote 8 (ADR-044):** **6 atlas de inimigos** (fechando andar 5 e andar 6 com 5/5: Cantor de Ecos M, Maestro do Vazio E, Golem de Escória T, Ferreiro Possuído D, Salamandra Veloz V, Mestre da Forja E) + **2 kits de arena 4×4** (`f06_fornalha`, `f07_jardim`); 10/10 gerações; roster subiu para 34 inimigos. **Aprovado pelo usuário.**
- **Lote 9 (ADR-045):** **7 atlas de inimigos** (fechando andar 7 com 5/5: Urso Glacial D, Raposa Boreal V, Feiticeira da Geada M, Cavaleiro do Inverno E; e andar 8: Casulo Gigante T, Aranha Presas-Negras D, Sombra Rastejante V) + **kit de arena 4×4** (`f08_sombras`, Ninho das Sombras); 9/10 gerações (1 refação); roster subiu para 41 inimigos. **Aprovado pelo usuário.**
- **Lote 10 (ADR-047):** **6 atlas de inimigos** (fechando andar 8 com 5/5: Tecelã de Pesadelos M; andar 9 com 5/5: Carrasco Encouraçado T, Sanguessuga Alada V, Bruxa de Sangue M, Conde Carmesim E; andar 10: Colosso de Obsidiana T) + **kit de arena 4×4** (`f09_sangrento`, Corredor Sangrento); 7/10 gerações (3 reservas); roster subiu para 47 inimigos. **Aprovado pelo usuário.**
- **Lote 11 (ADR-048 — FECHAMENTO DA ONDA 1):** **3 atlas de inimigos** (fechando andar 10 com 5/5: Guerreiro Eterno D, Relógio Vivo V, Oráculo dos Passos M) + **kit de arena 4×4** (`f10_passos`, Câmara dos Mil Passos); 4/10 gerações (6 reservas); roster atingiu 50 inimigos e 10 arenas dedicadas. **Aprovado pelo usuário.**
- **Lote 12 (ADR-049 — ABERTURA DA ONDA 2):** **5 atlas de inimigos** (Bioma 1: Pináculo Arcano, andares 11–15: Golem de Cristal Arcano T, Espadachim Rúnico D, Fogo-Fátuo Arcano V, Feiticeiro Astral M, Rastreador da Fenda E) + **kit de arena 4×4** (`p01_arcano`, Pináculo Arcano); 8/10 gerações (2 reservas restantes); roster sobe para **55 inimigos** e 11 arenas. **Aprovado pelo usuário.**
- **Lote 13 (ADR-050):** **5 atlas de inimigos** (Bioma 2: Pináculo Carmesim, andares 16–20: Gárgula de Sangue T, Retalhador Carmesim D, Cão de Carne V, Cultista do Sangue M, Abominação Sanguínea E) + **kit de arena 4×4** (`p02_carmesim`); 6/10 gerações (4 reservas); roster sobe para **60 inimigos** e 12 arenas. **Aprovado pelo usuário.**
- **Lote 14 (ADR-051):** **5 atlas de inimigos** (Bioma 3: Pináculo de Jade, andares 21–25: Colosso de Jade T, Espadachim de Jade D, Serpente de Jade V, Geomante de Jade M, Draconiano de Jade E) + **kit de arena 4×4** (`p03_jade`); 6/10 gerações (4 reservas); roster sobe para **65 inimigos** e 13 arenas. **Aprovado pelo usuário.**
- **Lote 15 (ADR-052):** **5 atlas de inimigos** (Bioma 4: Pináculo de Obsidiana, andares 26–30: Couraçado de Obsidiana T, Espoliador de Lava D, Predador das Cinzas V, Canalizador de Magma M, Senhor da Obsidiana E) + **kit de arena 4×4** (`p04_obsidiana`); 8/10 gerações (2 reservas restantes); roster sobe para **70 inimigos** e 14 arenas. **Aguardando aprovação do usuário ("lote 15 aprovado").**
- **Próximo:** **Lote 16** (Bioma 5 da Onda 2: Pináculo de Gelo Eterno, andares 31–35: kit de arena e 5 inimigos de gelo) — **só após o usuário escrever "lote 15 aprovado"**. Planejamento em `docs/STYLIZATION_ROADMAP.md` e `docs/ART_HANDOFF.md`.
- **Medido (muda o plano original):** pack com sombreado suave (31–620 cores significativas) → paleta de 64 cores só no empacotamento; `sharp` ignora `colours` → quantizador próprio; pixel ≈ 3 px; guia de validação = arquétipo dado ao gerador.
- **Pendências registradas (ADR-033):** cura como efeito de skill (engine) antes do Clérigo; ~~obtenção por IDENTIDADE~~ (feita no L1); campos de arena landmark/iluminação/ambiente reservados.
- **Cuidados:** nunca gravar rascunhos em `assets/generated/` (vai ao manifesto) — usar `assets/_incoming|_review` (gitignored); depois de `ingest` rodar `npm run assets:build` e commitar o `manifest.json`; UI gerada sem texto; contador de gerações no `provenance.json`.

### Pós-Fase 13 — HUB em 3 colunas, painel de dados e curva de XP (ADR-031, 2026-10-03)

- **Pedido:** nav no topo, jogo no centro, equipe à esquerda, chat (simulado) à direita, sem rolar a página; painel de dados pequeno e ocultável sob o jogo com XP/h·Coin/h·Custo/h; curva de XP com Nv 1→100 ≈ 24 h.
- **Agora:** `App.tsx` = `nav` + `Hud` + faixa do guia + `.tia-stage` (`TeamPanel` | `.tia-gamebox` com `BattleCanvas`, overlay das telas e `HuntToggle` + `HuntPanel` | `ChatPanel`). `screen` começa `null`; aba ativa fecha. Preferências `statsOpen`/`chatOpen` em `tia:settings`. `HuntLedger` (`game-core/ledger.ts`, janela `config.hud`) alimentado por `settleBattle` e `noteCost` (consumíveis). `chat.ts` = `ChatTransport` + simulado (exceção temporária ao "chat falso" do `CHAT_SYSTEM.md`).
- **Curva:** `xpToLeave = 4300·N^0,644`; XP/abate `50·(E+3)^0,98`. Nv 100 ≈ 23,8 h · Nv 1.000 ≈ 127 h · Nv 20.000 ≈ 759 h. `configVersion` 8.
- **Testes:** `ledger.test.ts`, `chat.test.ts`, bloco de layout no `ui-smoke`, `tower-balance` (âncoras), `browser-smoke` (layout em 1366×768).
- **Cuidados:** botões de slot da coluna esquerda NÃO podem se chamar "Slot N" (colidem com a Equipe); `HuntPanel` lê `state.ledgerRates()` a cada tick; o guia aponta "Tornar ativo" (existe no painel e na tela Equipe); `hud` ainda fora do ContentPack.

### Pós-Fase 13 — Rebalanceamento: ritmo e desafio do combate (ADR-030, 2026-10-03)

- **Pedido:** batalhas mais difíceis (sem equipamento perde mais vida e usa mais poções), mais lentas, ataque ≈ 2 s acelerado por equipamento, rápido só em nível alto.
- **Agora:** `combat.baseActionIntervalMs` 2000; IAS base `(DES−10)×0,01`; IAS de item × `equipment.attackSpeedLevelCurve` (cresce com o nível do item; 1 s só ≈ Nv 10.000); `tower.enemyHpMultiplier` 2,0 / `enemyAttackMultiplier` 0,18; `regenOnSearchingPctPerSec` 0,01; curva de XP `14·(N+30)^1,35` (compensa o ciclo ≈ 1,7× mais longo); chefes passam a usar `boss.towerReference` (não herdam a dificuldade da Torre). `configVersion` 7.
- **Medido (`npm run -s report:balance`):** luta on-curve sem equipamento ≈ 14–22 s e −21…−36% de HP; sem poção o herói cai a cada ≈ 5–6 lutas no andar 1; com compra de poção básica, 0 derrotas e ≈ 0,1–0,2 poção/luta; Celestial 2,5× continua ≈ 0%. Chefes: 3 heróis vencem com −50…−65% de HP (como antes), 1 e 2 perdem.
- **Testes:** `game-core/combat-pace` (novo), `tower-balance` (reescrito o bloco de sustentabilidade), `engine/formula`.
- **Cuidados:** todos os botões estão em config (ver ADR-030). Mexer em T₀/IAS/dificuldade exige regenerar `docs/BALANCE_REPORT.md` e conferir os chefes; o ciclo de pacing assumido é 25 s.

### Pós-Fase 13 — Tela preta da batalha e arena (ADR-029, 2026-10-03)

- **Bug (relato do usuário no Windows):** batalha em tela preta com "Aguardando batalha...". **Causa:** a cena Phaser recebia a batalha por *push* de um `useEffect` e nunca a recebia (cena assíncrona + `GameState` mutado no lugar). A arte JÁ estava inserida; era ligação. Detalhes e as outras 5 causas em `docs/DECISIONS_LOG.md` ADR-029.
- **Agora:** a cena PUXA (`render/battleSource.ts` → `getView()` por frame). Arena de ladrilhos com tema por andar (`arenaThemes.ts`, `Arena.ts`, `arenaLayout.ts`), herói anda durante "Procurando" e o inimigo entra caminhando, VFX do pack (`vfxAtlas.ts`: corte/faísca/fogo/raio/cura), sombra, recuo, `actorId` ligado, `pixelArt`.
- **Testes:** `tests/integration/battle-render.test.ts` (18) + `scripts/browser-smoke.mjs` (Chromium real; fora do `check`; veja `docs/TESTING.md` §11). **Lição:** "verde" em jsdom não prova que o Phaser desenha — verificar visualmente após mexer em `render/`.
- **Cuidados:** mexer em `apps/game-web/src` exige `npm run build:preview` + commit do bundle; os retângulos de `vfxAtlas.ts` são medidos (folhas 2048², uma faixa de quadros) — remedir se trocar a arte; adereços do pack são LADRILHOS (com fundo), por isso vão sobre um piso-base.
- **Para obter navegador no sandbox:** `npm i puppeteer-core @sparticuz/chromium` em `/tmp/br`, extrair `bin/al2023.tar.br` e usar `LD_LIBRARY_PATH=<dir>/lib`.

### Fase 13 — MVP Local (ADR-028, 2026-10-03)

- **Debug Mode (§77/§93):** `packages/game-core/src/debug.ts` (`createDebugTools`, lógica pura, passa pelas regras do jogo; itens com `origin: "admin"`; `DEBUG_UNAVAILABLE` lista chat/auth/mercado da comunidade) + `apps/game-web/src/DebugPanel.tsx` (botão "DEBUG"). **Só existe no bundle com `VITE_DEBUG_MODE=true`** (`debug-flag.ts`; `lazy`). `npm run play:debug` / `JOGAR-DEBUG.bat` compilam `--mode debug` em `apps/game-web/preview-debug/` (gitignored). O bundle versionado **nunca** tem debug (`scripts/check-debug-mode.mjs` + `scripts/check-preview.mjs`).
- **Opções** (`SettingsScreen.tsx`): som (`settings.ts`, fora do save), salvar agora, **baixar/carregar save**, **apagar progresso** (confirmação + backup em `tia:save:local:backup` + "Restaurar a cópia anterior"), "Como jogar", créditos (Nika Studio). `saveTools.ts` concentra export/import/reset; `pageActions` isola `reload`/`download` p/ teste. Também aparece na tela de criação ("Já tenho um save…"). **Importar/apagar PARA o loop antes** (senão `beforeunload` regravaria o save antigo — coberto por teste); `startLoop.stop()` agora remove `beforeunload`/`pagehide`.
- **Guia "Próximo passo"** (`guide.ts`): regras puras e ordenadas (equipe → Torre → equipar → poção → slot 2 → Arena); nunca age pelo jogador. **ErrorBoundary** (`ErrorBoundary.tsx`): recarregar / baixar cópia do save. Interface sem `§N`/`P-xxx`/ADR (o smoke de UI reprova).
- **Testes novos:** `apps/game-web/src/__tests__/ui-smoke.test.tsx` (React real em jsdom, projeto `ui` do vitest; canvas do Phaser trocado por stub), `settings.test.ts`, `tests/integration/mvp-journey.test.ts` (§118, 20 passos), `soak.test.ts` (3 h × 4 heróis + offline em sequência, invariantes e ida-e-volta do save), `acceptance-doc.test.ts` (matriz `docs/MVP_ACCEPTANCE.md` não mente).
- **Windows sem instalação:** `JOGAR.bat` (ASCII + CRLF; `.gitattributes` `*.bat -text`) → `scripts/play.mjs` (só Node ≥ 18; loopback 127.0.0.1+::1 → sem aviso de firewall; porta fixa **5173**, usa a próxima só se ocupada por outro programa e AVISA; abre o navegador; mensagens sem acento no Windows) sobre `serve-preview.mjs` (agora exporta `startServer`/`createHandler`; URL malformada → 400, não derruba). `npm run build:preview` grava `apps/game-web/preview/BUILD_INFO.json` (hash das fontes, CRLF normalizado) e `npm run check` (`check:preview`) reprova bundle velho, debug no bundle, qualquer 404 do index/JS/CSS/manifesto/~494 assets e arquivos do repo incompatíveis com Windows. Guia completo: `docs/PLAY_LOCAL.md`.
- **Revisão dos números (jogo real):** `docs/BALANCE_REPORT.md` ganhou "Ritmo das primeiras 4 horas" (Rei nv 10 em 18–24 min, nv 25 em ≈ 46–57 min, nv 50 em ≈ 1,7–2,1 h; 1º drop ≈ 11–15 min; Slot 2 (50 mil Coin) ≈ 1,4 h). **Nenhum número foi alterado**; riscos R-03/R-05 reconfirmados (Guardião é ≈ 30% mais lento). P-008/P-017/P-018/P-029/P-036 seguem provisórias — dependem de playtest humano.
- **Cuidados:** rodar `npm run build:preview` e commitar `apps/game-web/preview/` SEMPRE que mudar `apps/game-web/src` ou `packages/*/src` (o `check` reprova); `.bat` só ASCII/CRLF; não usar `file://`; o save é por navegador+endereço (`localhost:5173`).

**O que fazer:** **FASE 14 — Painel Admin** (`docs/ADMIN_PANEL.md`; ContentPack/`config` já são serializáveis e validados) e a **Fase Online** (Google Auth, Supabase, cloud save, Mercado da comunidade com taxa de 15%). Antes, **jogar o MVP** (`JOGAR.bat`) e ratificar os números provisórios.

**Estimativa até o 1º MVP jogável (FASE 13): 7 etapas — 7 concluídas ✅** —
1) ✅ Fase 5+8, 2) ✅ Fase 6, 3) ✅ Fase 7, 4) ✅ Fase 9, 5) ✅ Fase 10+11,
6) ✅ Fase 12 (Boss), 7) ✅ Fase 13 (MVP Local). **MVP local jogável entregue.**

**O que perguntar ao usuário:** ratificar os números provisórios de Coin e de Boss (P-008/P-017/P-018/P-029) depois de jogar a Fase 13. Fora isso, seguir com autoridade delegada; ratificar preços do Market (P-008/P-036) quando houver playtest.

**Como validar:**

```bash
npm run check     # docs + typecheck + testes (unit/integração/UI) + arch + assets + segredos + debug + bundle/zip do Windows
npm run verify    # check + build
npm run dev       # http://localhost:5173
```

**Estado atual do servidor de dev:** rodando em `http://localhost:5173` com `allowedHosts: true` (necessário para o preview do ambiente não receber 403). Jogar sem instalar nada além do Node: `JOGAR.bat` / `npm run play`.

**Onde estão as regras:** [`Master-Prompt.md`](Master-Prompt.md) é a autoridade. Dúvida de regra? Leia lá primeiro.
