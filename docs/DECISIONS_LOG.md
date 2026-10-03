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

---

## ADR-013 — Catálogo de heróis como dado remodelável, com validação cruzada de assets

**Status:** aceito · **Data:** 2026-10-01 · **Fase 4 (P-002)**

**Contexto.** `P-002` (identidade definitiva dos 4 heróis) é decisão de
produto e continua aberta. O usuário decidiu avançar com a **inserção
genérica**: os 4 heróis entram com a arte que o pack oferece hoje, sem
fechar nomes/skills/curvas. O risco é o óbvio: uma "identidade provisória"
que vira regra de facto por estar colada no código — e um catálogo que,
quando a decisão chegar, exija reescrita em vez de remodelagem.

**Decisão.** Três camadas separadas:

1. **Catálogo é dado.** `packages/config/src/catalog.ts` declara os 4 heróis
   (papéis, perfis de atributo, skills por id) e os inimigos como objetos
   tipados. Identidade definitiva = editar dados, não código.
2. **Assets por ID do manifesto, estruturados.** Cada personagem declara
   `assets: { portrait?, sheets: { idle, walk, run, attack, hurt, death } }`.
   `charSheets(id)` expande para as 6 folhas — renovar o pack é uma edição
   de catálogo + teste, nunca caça a strings espalhadas.
3. **Validação em dois níveis.** `validateCatalog()` (forma dos dados:
   4 heróis distintos, físico × mágico, folhas não vazias) roda no boot junto
   de `validateConfig()`; `tests/integration/assets-config.test.ts` cruza
   TODO assetId do config e da renderização com o manifesto.

**Consequência.** "Quatro personagens visualmente diferentes mas
mecanicamente iguais" (§10) reprova no CI (growths e papéis precisam ser
distintos). "Herói sem sprite" (§62) reprova no CI (id fora do manifesto).
Quando `P-002` for decidida, a entrega é um diff de dados em `catalog.ts` —
nomes, skills, raridades e números — sem tocar em game-core, engine ou UI.

---

## ADR-014 — OpenRpg como base de dados de classes, status, skills e itens

**Status:** aceito · **Data:** 2026-10-01 · **decisão do usuário**

**Contexto.** A P-002 (identidade dos 4 heróis) e a P-022 (skills) exigiam
dados que não podíamos inventar sem base. O usuário indicou o
[OpenRpg](https://github.com/openrpg/OpenRpg) (MIT) como **base** para
classes, status, itens, balanceamento e skills — o que casar com o projeto.

**Decisão.** Adotar o OpenRpg como referência de DADOS e CONVENÇÕES (nunca de
regra de gameplay — o Master-Prompt prevalece):

1. **Status:** atributos STR/DEX/CON/INT/WIS/CHA como identidade da classe;
   `growth` de combate vira PROJEÇÃO derivada por fórmulas citáveis
   (CON×5→HP, FOR/DES→ataque, etc.) em `config/src/attributes.ts`.
2. **Skills:** catálogo `config/src/skills.ts` no nosso modelo de
   `SKILL_SYSTEM.md`, com conteúdo baseado no roster de 10 abilities do
   OpenRpg (formato de dano/alvo/custo/cooldown, gating por classe).
3. **Itens/balance:** escada de qualidade mapeada (Mythical↔Celestial),
   template×instância (já alinhado), modificação ↔ nosso X (§36), loot por
   `DropRate` por entrada, curvas (`PresetCurves`) como família de referência
   para P-009/P-005.
4. **Registro:** `docs/OPENRPG_REFERENCE.md` lista tudo que foi adotado, o
   que foi rejeitado e POR QUÊ (raças, MP, defesa flat, tipos de dano
   detalhados, odds de raridade…).

**Consequência.** Trocar a fantasia de uma classe = editar 6 atributos; a
skill vira dado de catálogo; toda divergência com o Master-Prompt tem vencedor
declarado na referência. Atribuição MIT registrada (§10 do documento).

---

## ADR-015 — P-002 resolvida: identidades definitivas dos 4 heróis

**Status:** aceito · **Data:** 2026-10-01 · **decisão delegada e autorizada pelo usuário**

**Contexto.** `P-002` era a última pendência crítica que segurava a Fase 4.
O usuário delegou a decisão ("você decide — algo completo e complexo, sem ser
muito genérico, editável depois; pode adaptar do OpenRpg ou criar") e autorizou
a criação dos conteúdos.

**Decisão.** Quatro identidades definitivas em
`packages/config/src/heroes.ts` (camada separada da mecânica):

| id | Herói | Classe | Raridade | Assinatura |
|---|---|---|---|---|
| `hero_aldric` | Aldric, o Inabalável | Guardião (tank reativo) | Common | `skill_counter` |
| `hero_kaia` | Kaia, a Pássaro-Livre | Arqueira (velocidade) | Uncommon | `skill_volley` |
| `hero_maelis` | Maelis, a Estelar | Arcanista (área) | Rare | `skill_nova` |
| `hero_vorath` | Vorath, o Silente | Invocador (DoT) | Epic | `skill_hex` |

Cada identidade tem: nome + epíteto, lore (2–3 frases), 3 traços de
personalidade, notas de voz (prepara P-061), raridade (escala de aquisição,
§109), skill assinada, estilo de combate, alcance, `statPriority` (prepara
auto-equip) e dica de aquisição futura — sempre de fontes que o §12 permite
(nunca inimigos comuns da Torre).

**Ancoragem.** Arquétipos e escada de raridade seguem o OpenRpg (ADR-014);
nomes/epítetos/lore são criação autorizada. A mecânica (atributos→stats,
skills) continua em `catalog.ts`/`attributes.ts`, referenciada por id.

**Consequência.** P-002 sai das críticas (7→6). A Fase 4 destrava: heróis
nascem nomeados com raridade própria; P-024 (afinidades) e P-061 (voz) ganham
âncora. Remodelar qualquer herói é editar uma entrada de dado — nome, lore,
raridade, prioridade de stats — sem tocar em código.

---

## ADR-016 — Escolha do herói inicial, códice e aquisição (FASE 4)

- **Data**: 2026-10-01
- **Status**: Aceito
- **Decidido por**: Usuário (autoridade delegada: "você decide")
- **Afeta**: `game-core/state.ts`, `game-core/codex.ts`, `game-web/CreationScreen.tsx`, `game-web/App.tsx`, testes de criação/loop

### Contexto

A Fase 4 (Personagens) pedia "escolha 1-entre-N com impacto real (§10) + XP de herói + níveis funcionais + integração com o fluxo de criação". O XP/nível já estavam funcionais (`grantHeroXp`/`heroStatsAtLevel`/`heroPower`, ADR-014) — a lacuna real era o fluxo de escolha. Havia uma ambiguidade material: o §10 diz "recebe apenas aquele", mas o save nascia com os 4 heróis possuídos.

### Decisões

1. **§10 literal: o jogador recebe APENAS o herói escolhido.** `GameState.createNew` ganha `starterIdentityId: string` obrigatório (id da identidade, ex. `hero_aldric`) e o save nasce com **1 herói** (`origin: "starter"`). Antes: os 4 nasciam possuídos — decisão antiga anulada por ser contraditória ao texto.
2. **Momento da escolha: passo 2 do `CreationScreen`** ("Convocação do Campeão"). §63: a UI coleta a intenção e devolve `{nickname, skinId, heroId}`; quem cria o save é o `createGame` (boot.ts). A escolha é uma tela própria porque precisa de peso (§10) — escondê-la junto com o nome a transformaria em formulário.
3. **§19 preservado: escolha = POSSE, não entrada na equipe.** Nenhum herói é colocado em slot pelo jogo; equipe continua ato explícito do jogador. O teste "NENHUM herói entra na equipe sem o jogador colocar" continua válido.
4. **Códice derivado, sem mudança de schema do save.** `heroCodex(owned)` (`game-core/src/codex.ts`) deriva as 4 entradas do catálogo (`@tia/config` HEROES): `{identity, status: owned|locked, hero, portraitAssetId, acquisitionHint}`. Os 3 bloqueados aparecem na tela Heróis com a dica §12-safe da identidade. Um campo de save duplicaria o catálogo e criaria duas fontes de verdade. Quando o sistema de aquisição entrar (Fase 9+), desbloquear = criar o herói no save; o códice se atualiza sozinho.
5. **Identificador da escolha = `identityId` (`hero_*`)** — o mesmo do roster P-002 (ADR-015). `createGame` (boot.ts) recebe `heroId` e repassa.
6. **Testes que precisam de mais heróis recrutam explicitamente** (`recruit()` no `tower-loop.test.ts`, helper de teste documentado). O sistema real de aquisição é Fase 9+; até lá o save nasce com 1 e é isso que os testes de criação cobram.

### Alternativas rejeitadas

- **Manter 4 heróis possuídos + "o escolhido começa na equipe"**: violaria §19 (escolha ≠ entrada na equipe) e §10 ("recebe apenas aquele").
- **Salvar o códice no save** (`heroesCodex: [{identityId, unlocked}]`): duplicação de catálogo; o save passaria a saber algo que é derivável. Revisitável se a aquisição ganhar progresso por-identidade (ex.: 12/30 fragmentos) — aí o progresso vira dado salvo em `heroFragments`.
- **Escolher o herói DEPOIS da criação (tela à parte do hub)**: atrasaria o impacto inicial da escolha que o §10 quer na experiência inicial.

### Consequências

- Save e UI refletem §10/§12/§19 literalmente.
- A aquisição dos outros 3 é a próxima lacuna de gameplay (Fase 9+: fragmentos/summons/mercado) — decisão de economia fica para P-005/P-006.
- A construção visual dos retratos da escolha é retrato do pack + moldura; retratos ilustrados são aprimoramento visual opcional futuro (não é "mudar herói").

---

## ADR-017 — Ratificações da FASE 5+8: slots, XP dividido, searching e derrota

- **Data**: 2026-10-01
- **Status**: Aceito (valores econômicos PROVISÓRIOS — ratificação humana recomendada)
- **Decidido por**: Usuário (autoridade delegada: "tome as decisões necessárias e relate-as no final")
- **Afeta**: `config/src/game.ts`, `game-core` (team/progression/hunt/state), `game-web` (TeamScreen/TowerScreen/Hud), testes-gate

### Contexto

As Fases 5 (Equipe) e 8 (Searching) tinham 4 pendências classificadas como bloqueantes
(`P-003`, `P-004`, `P-012`, `P-019`) mais `P-020b`. O motor já existia em grande parte
(`unlockSlot`, `splitTeamXp`, `beginSearch`/`tickSearch`, loop idle no `boot.ts`); o que faltava
era **fechar as decisões** e as lacunas de UI/integração. A instrução vigente delega decisão
("tome as decisões necessárias… sempre com arquitetura editável"), então cada pendência foi
resolvida com o valor mais conservador e tudo mora em config editável.

### Decisões (ratificações)

1. **⛔ P-003 — custo dos slots 2 e 3: 50.000 e 250.000 Coin** (`config.team.slots`).
   Racional: escala compatível com as recompensas provisórias da Torre; a razão slot 3 ≈ 5×
   slot 2 acompanha a diferença de nível (10 → 25). Provísório até a economia (P-008/P-036,
   Fase 10) — mudar é editar `config.team.slots[i].costCoin`.
2. **⛔ P-004 — curva de divisão de XP: linear 1/n** (`config.xp.teamSplit = {1: 1.0, 2: 0.5,
   3: 1/3}`, `rounding: "floor"`). Racional: é literalmente o §20 ("dividido entre os membros");
   alternativas não-lineares (100/65/43) mudam a estratégia de equipe e ficam para quando houver
   dados de pacing. O `floor` garante que a soma nunca exceda o pacote (§81).
3. **⛔ P-012 — multi-aba/background: timestamps absolutos persistidos; o relógio é a única
   verdade (§29)**. Navegar/recarregar não pausa nem reinicia a procura (o `startedAt` viaja no
   save). Blur da aba não pausa (`pausesOnTabBlur: false` — parar transformaria cada menu em
   pausa). No MVP local, duas abas = última gravação vence; detecção de conflito e sessão
   única são trabalho da Fase Online (Supabase, com versioning de save).
4. **⛔ P-019 — derrota encerra a caçada; recomeçar é ato do jogador.**
   `hunt = "defeated"`, nenhuma recompensa é creditada, o loop NÃO reinicia sozinho; o botão
   "Recomeçar a caçada" (um `startTower()` explícito) é o caminho de volta. HP não persiste
   entre batalhas no modelo atual (cada batalha nasce com stats completos) — a política de
   **HP persistente entre batalhas** fica em aberto para a FASE 6 (Combate), quando o modelo de
   dano/cura existir de verdade. Nada sobre recuperação é inventado até lá.
5. **⛔ P-020b — herói caído não recebe a parcela de XP.** No modelo atual não existe "caído
   entre batalhas" (todo membro recebe); quando a persistência de HP entrar, o filtro se aplica
   em `applyRewards`: caído não consome parcela, a divisão é sobre os vivos.

### Decisões de UI (mesma etapa)

- **Equipe**: cada herói do pool entra no slot que o jogador escolher (§19 — nada entra sozinho);
  slot tem "Remover"; "Desbloquear" mostra o motivo do bloqueio (nível vs Coin) e desabilita.
- **Torre**: "PROCURANDO… X.Xs" com contagem regressiva e animação de pontos (§28 — animação
  real de identidade visual fica para `P-028`, junto de `P-005`); botão "Recomeçar a caçada"
  após derrota.
- **HUD**: pílula "Caçada" (No Reino / Em combate / Procurando / Derrota) — o loop precisa ser
  visível para "parecer jogo" (§62).

### Alternativas rejeitadas

- **Perguntar ao usuário antes de codar**: a instrução vigente pede autonomia com relato final;
  os valores são provisórios e centralizados — o custo de mudar depois é baixo.
- **Pausar em blur/background (P-012)**: contradiz §29 ("navegar não pausa") e criaria
  divergência entre o que o relógio diz e o que o save diz.
- **Auto-restart após derrota (P-019)**: esconderia do jogador o fato de que a equipe perdeu;
  a tensão da derrota (§56) exige um gesto humano para retomar.

### Consequências

- As Fases 5 e 8 têm seus gates verdes: `team-slot-unlock.test.ts`, `team-xp-split.test.ts`,
  `searching-state.test.ts` (21 testes novos) + suíte completa (350).
- Os números de Coin são os mais frágeis desta ADR — serão revalidados na Fase 10 (Economia).
- FASE 6 (Combate) herda a decisão de HP entre batalhas em aberto (ver P-019).

---

## ADR-018 — Preview estático autocontido (correção do "preview expirado")

- **Data**: 2026-10-01
- **Status**: Aceito
- **Decidido por**: Agente (decisão técnica — Tipo B), a pedido do usuário ("audite, corrija")
- **Afeta**: `scripts/serve-preview.mjs` (novo), `apps/game-web/vite.config.ts`, scripts npm

### Contexto

O preview do sandbox aparecia "expirado" sempre que o usuário ia abri-lo. Auditoria:

1. O processo do dev server (vite) **morria entre turnos** junto com o ambiente —
   o mesmo fenômeno que já resetou o workspace 11× (HEAD volta ao commit base,
   `node_modules` e cópias grandes de assets somem).
2. Não é OOM (3,7 GB livres, sem kills no kernel) nem 403 de host
   (`allowedHosts: true` já estava correto).
3. O dev server depende de `node_modules` para subir de novo; depois de um
   restore do ambiente, `npm run dev` nem sequer inicia.

### Decisão

1. **`scripts/serve-preview.mjs` — servidor estático zero-dependências** (só
   stdlib do Node): serve o bundle em `apps/game-web/preview/` + assets em
   `apps/game-web/public/` (fallback `assets/sprites/`). Sobe com
   `node scripts/serve-preview.mjs` mesmo sem `node_modules`.
2. **Bundle leve persistido** (`vite build --mode preview --outDir preview`):
   1,5 MB, sem sourcemap e sem copiar `public/` (os assets já vivem em
   `public/assets/`). `apps/game-web/preview/` NÃO está na lista de exclusão
   de snapshot (diferente de `dist/`), então sobrevive a restores.
3. **Uma única cópia de assets no workspace** (`public/assets`, 92 MB):
   `assets/sprites` vira symlink para o pack re-clonado em `/tmp` durante o
   trabalho; o peso do workspace fica ~105 MB, dentro do orçamento de
   snapshot (~128 MB) — as cópias duplicadas (184 MB) eram o principal
   suspeito dos resets recorrentes.
4. Porta **5173 em 0.0.0.0** estável (a mesma URL de preview continua válida).

### Consequências

- O preview volta a subir em segundos a qualquer momento; se o ambiente
  resetar de novo, basta `node scripts/serve-preview.mjs` (não precisa de
  build nem install) enquanto `preview/` e `public/assets/` existirem.
- `npm run build` de produção continua completo (com public copy e sourcemaps);
  `npm run build:preview` é o caminho leve.
- Validação de que os resets cessaram: próxima sessão iniciar com o HEAD
  intacto.

---

## ADR-019 — Assets versionados no repositório (autosuficiência total)

- **Data**: 2026-10-02
- **Status**: Aceito
- **Decidido por**: Usuário ("faça push delas para nosso repo… de modo que não precisamos mais usar o tower-idle-adventure para nada")
- **Afeta**: `.gitignore`, `assets/`, `reference/`, `scripts/serve-preview.mjs`, documentação

### Contexto

Os assets do pack viviam fora do Git (`assets/sprites/` ignorado) e eram
recuperados com `git clone` do repositório `marmitero/tower-idle-adventure`
a cada reset do ambiente. O usuário decidiu que o projeto deve ser
**autosuficiente**: tudo dentro de `marmitero/project-tower`, sem dependência
do repo de origem (só o OpenRpg como referência técnica, quando necessário).

### Decisões

1. **`assets/sprites/` — 422 PNGs + arquivos de licença do pack — VERSIONADOS**
   (94 MiB). A licença MIT © 2026 Nika Studio exige manter o aviso de
   copyright — `LICENSE.txt`, `ASSET_MANIFEST.md` e `README_IMPORT.txt`
   ficam na raiz do pack, junto dos arquivos.
2. **`assets/generated/` — 58 artefatos gerados — VERSIONADOS** (3,5 MiB):
   33 peças de UI extraídas, 22 SFX procedurais e **3 retratos gerados**
   (estes, irreprodutíveis por script). O custo é baixo e a alternativa
   (destruí-los num reset) já quase aconteceu.
3. **`reference/tower-idle-adventure/` — material de referência importado**
   (352 KiB): README, 14 docs de design, protótipos `g2-hud` e o schema
   Supabase (migrations/seed/tests) para a futura fase Online. Nada do
   build referencia esta pasta — é consulta. Ver `reference/README.md`.
4. **`apps/*/public/assets/` continua gerado** (cópia de trabalho de
   `scripts/build-assets.mjs`), exceto o `manifest.json`, que é o contrato
   `id -> caminho` e agora é **realmente** versionado — o padrão antigo
   `apps/*/public/assets/` + `!…manifest.json` tinha um bug: gitignore não
   re-inclui arquivos sob um diretório excluído; virou `assets/*` + exceção.
5. **Entrada de `assets/sprites` no Git é o diretório real**, não symlink
   (um symlink trackeado apontando para `/tmp` foi a causa de um trabalho
   de cópia ser sobrescrito por `git reset --hard`).
6. **`scripts/serve-preview.mjs` ganhou `assets/generated` como raiz** —
   com sprites, generated e manifesto versionados, o preview sobe com
   `node scripts/serve-preview.mjs` direto de um clone limpo.

### Consequências

- Clone do repo = jogo completo; `npm run assets:build` só repõe a cópia
  de trabalho para o vite dev/build de produção.
- O histórico ganha ~95 MiB de blobs (uma vez; o pack é estático).
- `marmitero/tower-idle-adventure` deixa de ser dependência operacional;
  a proveniência do pack e os créditos continuam documentados em
  `assets/SOURCES.md` e `assets/ATTRIBUTION.md`.

### ADR-020 — HP persistente entre batalhas (P-019), skills na batalha e apresentação de combate (FASE 6)

**Data:** 2026-10-03 · **Status:** ✅ Aceita · **Tipo:** C (regra de gameplay — decidida por delegação, padrão ADR-017) + B (técnica)
**Contexto:** FASE 6 (Combate). `ROADMAP.md` §7 + `COMBAT_SYSTEM.md` §5–§7 + §60/§66/§68. ⛔ P-019 (HP entre batalhas) e P-020 (prioridade de skills) precisavam de decisão.

1. **HP persistente entre batalhas (⛔ P-019 — FECHADA).** O herói ganha `currentHp` (contratos, ADR-020; migrado em saves v1→v2 com `currentHp = stats.hp`). A batalha nasce com o HP atual (`CombatantSeed.startHp`, clampado em [0, maxHp]). **Vitória mantém** o HP restante; **derrota zera** e encerra a caçada (ADR-017); **a chain automática NÃO cura** — a tensão do andar. Recuperação é ato do jogador: `restartHunt()` (após derrota: cura + entra na Torre) e `restActiveHero()` (cura + `hunt = {kind:"paused", reason:"rest"}` — o loop nunca reativa sozinho). A cura é `config.combat.healOnHuntRestart` (default `true`; `false` = modo duro). Cooldowns reiniciam e status expiram por batalha (`COMBAT_SYSTEM.md` §7.2).

2. **Skills na batalha (P-020 — ordem fixa ratificada).** O herói luta com as skills `kind: "active"` da classe (`engineSkillsFor`), que disparam sozinhas por cooldown (§56) — prioridade = ordem do catálogo (a primeira pronta dispara); reordenar `config/skills.ts` altera a fila sem tocar no engine. `attack_started.skillId` identifica a skill. Inimigos da Torre usam só ataque básico (sem skills no `EnemyDef`).

3. **Apresentação (§60/§64/§66).** Pipeline puramente reativo: `GameEvents.onBattleEvents` → fila `battleFeedbackQueue` → `BattleScene.update()` drena e executa `planBatch` (`BattleRenderer.ts`): lunge no `attack_started`, número de dano + flash + tremor leve por hit, **crítico** distinto sem depender de cor (número maior + flash + shake + `audio/sfx/critical`), nome da skill no uso, morte com fade, banner VITÓRIA!/DERROTA, SFX por evento (22 WAVs, `render/sfx.ts`). `prefers-reduced-motion` corta shake/lunge e mantém números/banner (§68).

4. **Sprites (identidade Nika, ADR-019).** Sheets 1024×1024 em grade 4×4 de 256px, rows = down/up/left/right (`README_IMPORT.txt`). Aliado olha para a direita (row 3), inimigo para a esquerda (row 2); uma folha por animação (idle 7fps loop, attack/hurt 12fps, death 8fps), as 4 carregadas juntas; escala do sprite derivada do tamanho real do canvas (§63). Assets de apresentação no campo `Combatant.sprites` (herói: sheets da classe; inimigo: `def.assets.sheets`).

**Alternativas rejeitadas:** (a) curar ao fim de cada vitória — mata a tensão do andar (o motivo do P-019 existir); (b) estado `HuntState` novo para descanso — a variante `paused` existente já cobre; (c) React lendo eventos por polling — o renderer é Phaser, o React só monta o canvas; (d) números de dano gerados no engine — §64: engine emite, renderer apresenta.

**Consequências:** regras todas em config/dados (`healOnHuntRestart`, skills, sheets); `BattleRenderer.ts` é o único lugar que muda "como a batalha se parece"; saves ganham migração v1→v2; testes `combat-hp.test.ts` (engine + game-core) cobrem vitória/derrota/chain/descanso. **Risco:** o desfecho da batalha depende da seed (derivada do accountId) — os testes fixam vitória/derrota por configuração de andar, não por sorte.
