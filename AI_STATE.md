# AI_STATE — handoff vivo do Tower Idle Adventure

**Última atualização:** 2026-09-30
**Estado:** **FASE 1 (Documentação) e FASE 2 (Fundação) concluídas** · FASE 3 (Rei) é a próxima
**Repositório:** `marmitero/project-tower`
**Branch desta sessão:** `arena/01a0f1f1-project-tower`

> **Este é o primeiro documento a ler em qualquer sessão nova.** Ele existe para que qualquer pessoa ou agente continue o projeto sem acesso a conversas anteriores.

---

## 1. Regras obrigatórias para quem continuar

1. **Leia este arquivo primeiro.** Depois `git status`, `git log`, e então o documento do sistema relevante. Uma anotação antiga não prevalece sobre o estado mais recente.
2. **Trabalhe apenas na branch da sessão** (`arena/01a0f1f1-project-tower`) e faça push apenas para ela. Nunca troque ou crie outra branch.
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
│   ├── sprites/              pack de arte (422 PNG, 92 MiB) — NÃO versionado
│   ├── ATTRIBUTION.md        crédito exigido pela licença
│   └── SOURCES.md            origem, recuperação e regras de arte nova
├── scripts/
│   ├── check-docs.mjs        validador de documentação
│   ├── build-assets.mjs      pipeline de assets (gera manifest, falha alto)
│   ├── check-assets.mjs      bloqueia placeholders (§62)
│   ├── check-no-secret.mjs   bloqueia segredos versionados (§91)
│   └── check-debug-mode.mjs  garante Debug Mode só em dev (§93)
├── packages/
│   ├── config/               @tia/config — TODO balanceamento centralizado
│   ├── contracts/            @tia/contracts — IDs, comandos, entidades, eventos
│   ├── engine/               @tia/engine — Battle Engine PURO (§64)
│   ├── game-core/            @tia/game-core — regras, estado, PersistenceService
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
| **004** | Adotar o pack de sprites da referência; IDs estáveis; não empacotar os 92 MiB |
| **005** | Monorepo + `packages/engine` puro + `PersistenceService` LOCAL→SUPABASE |
| **006** | Configuração centralizada como **dado tipado e validado**, não constante |
| **007** | `SEARCHING` é **estado persistido** do game loop, não `setTimeout` de componente |
| **008** | Servidor autoritativo desde a fundação; batch idempotente com `requestId` |
| **009** | Tempo medido em **timestamp absoluto** com relógio injetado; o loop limita o passo a 250 ms para que voltar de uma aba não processe 30 s de combate de uma vez |
| **010** | A invariante 1×1 é imposta pela **assinatura** (`startTowerBattle` recebe um herói, não uma equipe), não por um `if` que alguém pode remover |
| **011** | O `GameState` é a **única** porta de mutação; `data` é exposto como `Readonly` e toda mudança incrementa `revision` (§86) |

---

## 6. Pendências — o estado mais importante

**67 pendências catalogadas, 7 críticas.** Nenhuma foi inventada. Detalhes em [`docs/PENDING_RULES.md`](docs/PENDING_RULES.md).

### As 7 críticas

| ID | Pendência | Bloqueia | Material de apoio |
|---|---|---|---|
| 🔴 **P-002** | **Definição dos 4 heróis iniciais** | Fase 4 → vertical slice | 4 sprites candidatos (`hero`, `mage`, `archer`, `necromancer`) que cobrem físico × mágico e têm traços de arma complementares — [`ASSET_INVENTORY.md` §5.3](docs/ASSET_INVENTORY.md#53-candidatos-para-os-4-heróis-iniciais) |
| 🔴 **P-005** | Estrutura e curva da Torre | Fase 7 | — |
| 🔴 **P-006** | Inimigos: stats, papéis, resistências | Fase 7 | 12 inimigos + 5 elites + 1 boss com sprites prontos |
| 🔴 **P-008** | Todos os valores de Coin | Fase 10 | — |
| 🔴 **P-010** | Faixa e granularidade do X | Fase 9 | Referência usa inteiro 1–50 com fator `x/10` |
| 🔴 **P-011** | Taxa de conversão offline → recompensa | Fase 11 | — |
| 🔴 **P-036** | Sumidouros principais de Coin | Fase 10 | — |

### Por que elas não foram preenchidas

O §73 é explícito:

> **Tipo C — Regra de gameplay/economia crítica: não inventar. Registrar PENDING e, quando necessário, solicitar decisão humana.**

Um valor inventado em silêncio é **pior** que um valor ausente, porque parece decisão. E em economia, um número plausível e errado é descoberto pelo **jogador**, no meio do jogo, quando já é caro de mudar.

### Recomendação de prioridade

Se apenas **uma** decisão for tomada, que seja **P-002 (os 4 heróis)**. É a única que destrava a cadeia inteira:

```text
P-002 (4 heróis) → Fase 4 → Fase 5 → Fase 6 → Fase 7 (precisa P-005/P-006)
P-002 também destrava P-024 (afinidades) e P-061 (identidade sonora)
```

---

## 7. Próximo passo

### **FASE 3 — Rei** (parcialmente bloqueada: `P-006c`, `P-007`, `P-009`)

O que a Fase 2 entregou e que a Fase 3 consome:

```text
✅ GameState com Rei, carteira e lastActiveAt
✅ createKing() com skin e validação de config
✅ grantKingXp() com curva da config (⛔ P-009) e teto de nível
✅ markActive() / computeOffline() com teto de 2h (§47)
✅ HUD do Rei com barra de XP e carteira
```

O que falta para fechar a Fase 3:

```text
1. Tela de CRIAÇÃO do Rei (nome + skin) — ⛔ P-007, P-006c
2. Curva de XP do Rei revisada com dados de sessão real — ⛔ P-009
3. Skin desbloqueável por nível (§5)
4. Passagem da tela de criação para o jogo rodando
```

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

### Depois da Fase 3

```text
FASE 4  Personagens            ⛔ P-002 — crítico
FASE 5  Equipe                 ⛔ P-003, P-004
FASE 6  Combate
FASE 7  Torre                  ⛔ P-005, P-006
FASE 8  Searching loop         ⛔ P-012, P-019
FASE 9  Equipamentos           ⛔ P-010
FASE 10 Economia                ⛔ P-008, P-036
FASE 11 Offline                 ⛔ P-011
FASE 12 Boss                    ⛔ P-018
FASE 13 MVP LOCAL               ← o vertical slice
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
| **Empacotar os 92 MiB de sprites** | `scripts/build-assets.mjs` gera o manifesto `id -> caminho`; o código nunca monta caminho |
| **Deixar Debug Mode em produção** | `scripts/check-debug-mode.mjs` — falha se `debugger` sobrar ou se debug ficar sem guarda de ambiente |
| **UI com rótulos em inglês** | `ui_kit.png` proibida como UI final. UI em HTML/CSS |
| **Placeholder chegar ao público** | `scripts/check-assets.mjs` detecta emoji-as-sprite, SVG inline e retângulo-colorido; `--strict` bloqueia o release sem sprites |
| **`bigint` se perder na serialização** | `encodeSave`/`decodeSave` com tag explícita; teste com valor acima de `Number.MAX_SAFE_INTEGER` |
| **Save corrompido travar o boot** | `boot()` põe o ilegível em quarentena e cria um novo save, em vez de crashar |

---

## 11. O que NÃO foi feito (e por quê)

| Não feito | Por quê |
|---|---|
| **Assets de arte** | O pack de sprites (422 PNGs) não está mais disponível no sandbox. O pipeline (`scripts/build-assets.mjs`) está pronto e **falha alto** quando os obrigatórios faltam. `npm run check:assets:strict` é o gate de release. |
| **Implementação do Supabase** | A interface `PersistenceService` existe e a implementação LOCAL é real. A de Supabase entra na Fase Online, com RLS. |
| **Inventário visual completo** | A lógica existe e é testada; a tela mostra a lista com raridade, nota e X. Falta ordenar/paginar conforme `P-025`/`P-016`. |
| **Tela de criação do Rei** | É a Fase 3. Depende de `P-007` (formato do nickname) e `P-006c` (skins iniciais). |
| **Catálogo de skills** | `P-022` (progressão) e `P-020` (prioridade) continuam abertas. O engine já aceita `SkillDef`; o catálogo não foi inventado. |
| **Mercado** | `P-014` (regras de anúncio) e `P-041` (anonimato) abertas. A taxa de 15% já está na config e validada. |
| **Admin-web** | Shell reservado. A Fase Online define o que ele faz. |
| **Invocar os 4 heróis definitivos** | §73 — Tipo C. `P-002` é crítica. Existe um **catálogo provisório** em `packages/config/src/catalog.ts`, marcado com `⛔ P-002`, para que a fundação funcione. **Não é uma decisão.** |

---

## 12. Resumo para a próxima sessão

**Estado:** FASE 1 e FASE 2 concluídas. Fundação completa e verificada: monorepo, config validada, contratos, engine puro, `game-core`, HUD, shell Vite/React/Phaser rodando e 259 testes verdes (231 unit+integration + 28 arch).

**O que fazer:** **FASE 3 — Rei**. Criar a tela de criação do Rei (nome + skin), ligá-la ao `GameState` que já existe. Começa por decidir `P-007` (nickname) e `P-006c` (skins iniciais), mas o resto da tela não depende delas.

**O que perguntar ao usuário:** as 7 pendências críticas, começando por **P-002 (os 4 heróis)**. O catálogo provisório funciona para desenvolvimento, mas o §10 exige "diferenças reais" e isso só se confirma com decisão humana.

**Como validar:**

```bash
npm run check     # docs + typecheck + testes + arch + assets + segredos + debug
npm run verify    # check + build
npm run dev       # http://localhost:5173
```

**Estado atual do servidor de dev:** rodando em `http://localhost:5173` com `allowedHosts: true` (necessário para o preview do ambiente não receber 403).

**Onde estão as regras:** [`Master-Prompt.md`](Master-Prompt.md) é a autoridade. Dúvida de regra? Leia lá primeiro.
