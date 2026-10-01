# Log de Decisões (ADR) — Tower Idle Adventure

**Última atualização:** 2026-09-30
**Escopo:** registra decisões de arquitetura e as divergências entre o `Master-Prompt.md` e o repositório de referência `marmitero/tower-idle-adventure`.

---

## 0. Por que este documento existe

O `Master-Prompt.md` (seção 61) manda **inspecionar** o repositório de referência `https://github.com/marmitero/tower-idle-adventure` antes de criar ou substituir assets. A inspeção foi feita e encontrou **450 arquivos**: um pack completo de sprites (422 PNG) e 14 documentos de design já existente.

A inspeção revelou um problema importante: **o repositório de referência implementa um jogo com regras diferentes das do `Master-Prompt.md`.** Várias das divergências são **[Abolidas]** — o `Master-Prompt.md` as revoga explicitamente com linguagem normativa ("essa regra está ABOLIDA", "nunca").

Decisão de prevailedência: **`Master-Prompt.md` vence sempre.** O repositório de referência é aproveitado como **fonte de assets** (essencial, e não duplicável) e como **fonte de decisões técnicas reaproveitáveis** (fórmulas de combate, estrutura de schema, threat model), mas **nunca** como fonte de regras de gameplay que conflitem.

---

## ADR-001 — Precedência documental

**Status:** aceito · **Data:** 2026-09-30

**Contexto.** Existem duas fontes de design: o `Master-Prompt.md` deste repositório e os documentos de `marmitero/tower-idle-adventure`. Elas divergem em pontos fundamentais.

**Decisão.** Ordem de autoridade:

1. `Master-Prompt.md`
2. Decisão humana registrada neste log / no `AI_STATE.md`
3. `docs/*.md` deste repositório
4. `marmitero/tower-idle-adventure` (apenas assets + decisões técnicas sem conflito)

**Consequência.** Fórmulas de combate, traços de arma, estrutura de slots, threat model e inventário de assets do repositório de referência **são aproveitados**. Regras de fluxo de jogo, progressão e economia que o `Master-Prompt.md` revoga **são descartadas**. Cada descarte está registrado em ADR-002.

---

## ADR-002 — Divergências com o repositório de referência

**Status:** aceito · **Data:** 2026-09-30

Cada linha abaixo é uma divergência real encontrada na inspeção. "Ato" é o comportamento adotado neste repositório.

| # | Tema | Referência (`tower-idle-adventure`) | `Master-Prompt.md` | Ato neste repo |
|---|---|---|---|---|
| 1 | **Combate na Torre** | Encontros de **1–3 inimigos** (Múltipla escolha) | **Sempre 1×1** (§17, §79) | **1×1.** Modo `TowerBattle`. |
| 2 | **Boss na Torre** | Boss solo recorrente no **andar 10** | **Abolido** (§21, §55) | **Torre não tem boss.** Boss é sistema separado. |
| 3 | **Heróis iniciais** | 3 classes, todas recebidas via marco (andar 3 / 6) | **4 heróis, jogador escolhe 1** (§10) | **4 heróis, escolha de 1**, sem marco. |
| 4 | **Nível** | Nível **compartilhado** conta/equipe, 1–20 | **XP do Rei** e **XP do herói são separados** (§45) | Dois eixos de XP independentes. Rei = nível da conta. |
| 5 | **XP de equipe** | Toda a conta recebe o XP integral, **sem divisão** | **XP é dividido** entre membros da equipe (§20, §81) | Divisor configurável por tamanho de equipe. |
| 6 | **Slots de equipe** | 3 slots livres desde o início | **1 slot; 2º no nível 10; 3º no nível 25** (§15, §46) | Desbloqueio por nível + Coin. |
| 7 | **Equipamento slots** | 10 slots (Arma + 9) | Estrutura de slots com arma e item de qualidade | **10 slots reaproveitados** (ADR-004), compatível. |
| 8 | **Chance de drop** | 15% de rolagem por grupo | **5%** (§32) | **5%**, configurável. |
| 9 | **Tabela de raridade** | Tabelas por faixa de andar (70/23/6/1/0/0 etc.) | **Comum 50 / Incomum 30 / Raro 15 / Épico 4 / Lendário 0,9 / Celestial 0,1** (§33) | **Tabela do Master-Prompt** como baseline. |
| 10 | **Progressão offline** | **Inexistente** — fechar o cliente congela | **2h Free / 8h VIP** (§47, §48) | **Implementado**, com limite de acúmulo. |
| 11 | **Venda de equipamento** | Só descarte; sem venda | **Venda por Coin** (§39) | **Venda implementada.** |
| 12 | **Mercado** | Fora do escopo | **Mercado da Comunidade com taxa 15%** (§40, §41) | **Implementado na fase online.** |
| 13 | **Login** | E-mail OTP, alpha por convite | **Google Auth como método oficial** (§7, §88) | **Google Auth.** |
| 14 | **Fragmentos** | Sistema inexistente | **Fragmentos → Character**; **não dropam de inimigo comum** (§12) | **Implementado**, restrito a Boss/caixas/eventos. |
| 15 | **VIP** | Fora do escopo | **Arquitetura desde cedo** (§49) | Estrutura de dados desde FASE 0, efeitos pós-MVP. |
| 16 | **Personagens** | 3 (3 + 2 desbloqueáveis) | **Ilimitados** (§13) | **Sem limite artificial.** |
| 17 | **Estado Procurando** | Encadeamento sem pausa explícita | **Estado real de ~3s com animação** (§27, §28) | **Estado explícito `SEARCHING`.** |
| 18 | **Geração procedural de arte** | proibida | proibida (§62) | **Alinhado.** Reaproveitado. |

---

## ADR-003 — Reescrita da estrutura de progressão

**Status:** aceito · **Data:** 2026-09-30

**Contexto.** O modelo da referência é "conta com nível compartilhado". O `Master-Prompt.md` separa explicitamente **XP do Rei** (nível da conta) de **XP dos heróis** (nível individual) e nunca os mistura (§45). Essa separação é o que torna a decisão de estratégia de equipe real: investir Coin e XP num herói específico tem um custo mensurável, porque a equipe que não foi investida se torna mais fraca.

**Decisão.** Dois eixos de progressão independentes.

- `king.level` — nível da conta. Controla desbloqueios, slots, acesso a conteúdo.
- `hero.level` — nível individual. Controla poder de combate e evolução.

**Consequência.** A referência `hunt_session_private_state` e qualquer coluna de "nível compartilhado" são **descartadas**. O schema precisa de `king_xp` e `hero_xp` separados. Toda UI de loot e de comparação deve mostrar **os dois** níveis, porque eles competem pelo mesmo orçamento de atenção do jogador.

---

## ADR-004 — Reaproveitamento do pack de sprites

**Status:** aceito · **Data:** 2026-09-30

**Contexto.** O `Master-Prompt.md` §61 exige inspecionar assets existentes antes de criar substitutos, e §62 proíbe entregar o produto com placeholders. A inspeção encontrou 422 PNGs de qualidade, organizados, com licença e manifesto já escrito. Criar arte nova agora seria desperdício e violaria a ordem "utilizar primeiro o que já existe".

**Decisão.** O pack **Fantasy Dungeon (Nika Studio, v1.4)** é a base de arte do projeto. Ele será **copiado para este repositório** com créditos e licença preservados, e referenciado por IDs estáveis.

**Consequência.**

- `sprites/` é a fonte; `public/assets/` receberá apenas o **subset usado**, não os 92 MiB inteiros.
- Nomes de arquivo com extensão duplicada (ex.: `hero_skins/assassin.png.png`) são preservados; IDs estáveis vêm do manifesto.
- A sheet `ui/ui_kit.png` contém **palavras em inglês rasterizadas** ("INVENTORY", "ITEMS", "EQUIP") e **não pode** ser usada como UI final num jogo PT-BR. Rótulos são renderizados em HTML/CSS.
- Crédito "Assets by Nika Studio" é obrigatório. Ver [`ASSET_INVENTORY.md`](ASSET_INVENTORY.md).

---

## ADR-005 — Arquitetura de software

**Status:** aceito · **Data:** 2026-09-30

**Contexto.** O `Master-Prompt.md` §63 indica TypeScript + Vite + React + Phaser. A referência usa a mesma direção e já resolveu problemas concretos: como simular idle sem processo sempre ligado, como manter RLS, como separar Game Web de Admin Web.

**Decisão.**

- **Monorepo** com `apps/game-web` (cliente), `apps/admin-web` (painel, fase posterior), `packages/engine` (Battle Engine puro), `packages/config` (configuração central), `packages/contracts` (tipos compartilhados).
- **Battle Engine em pacote puro, sem React, sem DOM.** Consome estado, devolve eventos. Testável em Node sem browser.
- **Renderer Phaser** separado do engine; a UI React é HUD sobreposta, não o battlefield.
- **Persistência atrás de `PersistenceService`**, trocável `LOCAL → SUPABASE` sem reescrever sistemas (§83).
- **Vercel + Supabase** para a fase online, reaproveitando o desenho validado da referência.

**Consequência.** A regra "a lógica do jogo não deve depender de componentes React" (§63) é verificável por teste: o pacote `engine` não pode importar `react`.

---

## ADR-006 — Configuração centralizada como entrega da Fase 2

**Status:** aceito · **Data:** 2026-09-30

**Contexto.** O `Master-Prompt.md` repete, em pelo menos 8 seções (§15, §20, §32, §33, §46, §105), a proibição de espalhar números de balanceamento pelo código. A referência fez o oposto em parte: seus valores vivem em prosa dentro do `MVP_DECISIONS.md`, o que não é consumível por código.

**Decisão.** Todo número ajustável vive em **dados tipados** em `packages/config`, exportados como objetos nomeados, com validação em tempo de carga (tabelas de probabilidade somam 100%, IDs referenciados existem, etc.). Documentação e código leem **a mesma fonte**.

**Consequência.** Rebalancear a taxa de drop ou o preço do slot 3 é uma edição de arquivo de dados com teste automático — não uma caça a constantes. Criado [`CONFIGURATION.md`](CONFIGURATION.md).

---

## ADR-007 — "Procurando" é estado de primeira classe, não um timer de UI

**Status:** aceito · **Data:** 2026-09-30

**Contexto.** §27–29 exigem um estado de ~3s entre batalhas, com animação, **e** que o jogador possa navegar por inventário/personagem/configurações durante ele sem quebrar o fluxo.

**Decisão.** `SEARCHING` é um estado do **game loop**, com `searchStartedAt` e `searchDurationMs` persistidos, não um `setTimeout` num componente. A duração é sorteada numa faixa configurável (ex.: 2.7s–3.2s) para parecer orgânica sem ser imprevisível.

**Consequência.** O loop sobrevive à troca de tela, à perda de foco e ao fechamento/abertura da aba. O progresso offline reaproveita exatamente o mesmo estado. Testes cobrem: timer não reseta ao navegar, não acelera com múltiplas abas, e é idempotente sob reconexão.

---

## ADR-008 — O cliente nunca é autoridade (refeito desde a fundação)

**Status:** aceito · **Data:** 2026-09-30

**Contexto.** §86 exige server authority no lançamento. A referência descobriu o problema prático cedo: Edge Functions são endpoints curtos, não um game server sempre ligado, e a tentação de "compensar" desconexão processando tempo decorrido gera rewards duplicados.

**Decisão.** No MVP local, a **simulação roda no cliente** é explicitamente não-autoritativa (é Guest, sem economia real). A arquitetura, porém, já é escrita para o servidor: todo serviço de gameplay é assíncrono, todo comando tem `requestId` idempotente, e todo relógio relevante tem origem no servidor. O Battle Engine é **o mesmo código** nos dois lados — roda no cliente para apresentar e no servidor para decidir.

**Consequência.** Trocar de authority não exige reescrever combate, só trocar quem o executa e quem persiste o resultado. A referência `expected_revision` e o ledger append-only são adoptados desde a primeira migration.

---

## ADR-009 — Tempo em timestamp absoluto, relógio injetado

**Status:** aceito · **Data:** 2026-09-30

**Contexto.** §47 e §28–29 dependem de durações (busca ~3s, offline 2h) que
precisam continuar certas quando a aba perde foco, quando o relógio do
sistema ajusta e nos testes.

**Decisão.** Todo tempo de jogo é **timestamp absoluto** comparado contra um
relógio injetado (`now()`), nunca `Date.now()` espalhado. O loop limita o
passo a 250 ms para que voltar de uma aba não processe 30 s de combate de
uma vez.

**Consequência.** Testes usam `FakeClock` e ficam determinísticos; o offline
reaproveita a mesma contagem. Corolário da Fase 3: o relógio do `GameState`
precisa ser **vivo** — o congelamento do clock na criação (bug corrigido)
impedia `tickSearch` de completar em execução real.

---

## ADR-010 — A invariante 1×1 é imposta pela assinatura

**Status:** aceito · **Data:** 2026-09-30

**Contexto.** §17 manda "torre normal é sempre 1 herói contra 1 inimigo" e §55
proíbe boss automático por andar. Um `if` defensivo é removível por acidente.

**Decisão.** `startTowerBattle` recebe **um herói**, não uma equipe — o tipo
impede escrever um 1×N. Boss é `BossBattle`, tipo separado, atividade à parte.

**Consequência.** Impossível reintroduzir torre 1×N sem mudar a assinatura —
mudança visível em review e nos testes de arquitetura.

---

## ADR-011 — `GameState` é a única porta de mutação

**Status:** aceito · **Data:** 2026-09-30

**Contexto.** §86 (integridade) e o futuro server-authoritative exigem que
toda mutação passe por um ponto único; caso contrário, `revision` e o
histórico de eventos perdem o significado.

**Decisão.** `GameState.data` é `Readonly`; toda mudança é método do
`GameState` e incrementa `revision`. Não há "mexer no save à mão" em código
de jogo (só em helper de teste).

**Consequência.** Persistência (§86) e o futuro batch idempotente (ADR-008)
conseguem observar e validar cada transição.

---

## ADR-012 — Criação do Rei: sem auto-criação, retrato ≠ skin

**Status:** aceito · **Data:** 2026-10-01 · **Fase 3**

**Contexto.** O placeholder antigo criava um Rei chamado "Rei" ao abrir o
jogo — invenção fora do Master-Prompt (§62 proíbe regra inventada na cola).
Além disso, o §5 mistura "nome + skin" com a representação visual do Rei,
que na HUD/perfil é um **retrato/busto** (§4), não a skin completa.

**Decisão.** Três regras:

1. **Sem save não existe Rei.** `boot()` devolve `state: null`; a UI abre a
   tela de criação; `createGame` cria e grava (`saveNow`). Um F5 nunca perde
   o Rei.
2. **Retrato ≠ skin.** `portraitAssetId` (busto, HUD/perfil) é fixo
   (`portraits/hero`); `skinId` (`hero_skins/<id>`) é a aparência completa,
   trocável e cosmética, com desbloqueio por nível (`SkinLockedError`).
3. **Regra do nome em dados.** Limites, charset e lista reservada vivem em
   `config.account.nickname` (⛔ P-007 provisório); a validação é
   `game-core/nickname.ts` com códigos de erro, não strings soltas na UI.

**Consequência.** Unicidade real de nome é server-authoritative no online;
aqui, 1 conta = 1 Rei (§8) + lista reservada. As 6 skins não escolhidas
ficam fora do catálogo até `P-006c` ser decidido.
