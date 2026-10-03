# Log de Decisões (ADR) — Tower Idle Adventure

**Última atualização:** 2026-10-03 (ADR-028)
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

### ADR-021 — Torre: andares por faixa de nível, inimigos por atributos, XP desacelerando e teto 20.000 (P-005/P-006/P-009) — FASE 7

**Data:** 2026-10-03 · **Status:** ✅ Aceita · **Tipo:** C (regra de gameplay — decisões do usuário + delegação) + B (técnica)
**Contexto:** FASE 7 (Torre). `ROADMAP.md` §8, `TOWER_SYSTEM.md`, `PENDING_RULES.md` P-005/P-006/P-009. O usuário decidiu (2026-10-03): XP **moderado** e **desacelerando**; **variedade de papéis** de inimigo por andar; **teto 20.000** (Rei e heróis, "expressivamente demorado"); faixas de andar 1–10, 10–25, 25–50, 50–100, 100–250, 250–500, 500–1000, 1000–1500, 1500–2500, 2500–5000 e depois **1 andar por 500 níveis até 20.000** (40 andares); **nível do inimigo = nível-base (mínimo) do andar** (andar 10 → inimigos nv 2.500; andar 12 → 5.500).

**Decisões do usuário (aplicadas literalmente):**

1. **Andares por faixa.** `config.tower.floors` — 40 `FloorDef` explícitos (índice, nome, `minLevel`, `maxLevel`, `enemyLevel`, `requiredKingLevel`, `pool`, `visual`). Padrões: `enemyLevel = requiredKingLevel = minLevel`.
2. **Teto 20.000** para Rei e heróis (`config.xp.*.levelCap`).
3. **Curva de XP que desacelera:** XP para sair do nível N = `floor(20 × (N + 30)^1,35)` (Rei e herói usam a mesma curva; pools continuam separados — ADR-003). XP por abate = `floor(50 × (E + 3)^0,95)` com E = nível do inimigo. O expoente da necessidade (1,35) é maior que o da recompensa (0,95): cada nível custa mais abates que o anterior.

**Decisões por delegação (todas em config/dados):**

4. **Pacing (P-009).** Medido por `towerPacing()` com ciclo luta+procura ≈ 15 s: andar 1 ≈ 30 min; andares 2–4 ≈ 25 min–1 h; 5 ≈ 4 h; 6 ≈ 7 h; 7–8 ≈ 18 h; 9 ≈ 47 h; **10 ≈ 168 h**; andares 11–40 de 27 h a 44 h cada; **total ≈ 1.360 h de jogo ativo** (≈ 340 dias a 4 h/dia). `docs/BALANCE_REPORT.md` (gerado por `npm run report:balance`) tem a tabela completa. **O andar 10 é um gargalo declarado**: é consequência direta da regra do usuário (2.500→5.000 só derrotando inimigos nv 2.500, uma faixa de 2.500 níveis). Se o ritmo incomodar, ajusta-se `config.tower.floors[9]` (`maxLevel`/`enemyLevel`) ou as curvas — sem código.
5. **Inimigos por atributos (P-006).** `EnemySeed` = id, nome, **papel** (`tank | dps | swift | caster | balanced | elite`), **tipo de dano** (`physical | magic`), 6 atributos OpenRpg, `statMultiplier`, sprites. Os stats por nível vêm da **mesma** `growthFromAttributes` dos heróis — herói e inimigo escalam pela mesma estrutura linear, então o equilíbrio vale do Nv 1 ao 20.000 sem tabela por nível. 11 inimigos (todos com sprite do pack): tank Gosma/Gosma Gélida (Def. Esp. alta); dps Goblin/Orc/Esqueleto Sangrento; veloz Morcego; mago Morcego Tóxico/Orc Flamejante; equilibrado Esqueleto; elite Arqueiro de Elite/Goblin Sombrio. `boss` e `slimeking` ficam **reservados à FASE 12** (§21/§55 — boss nunca na Torre).
6. **Pools.** Todo andar tem tanque + dano + veloz desde o 1; mago entra no 3; elite no 9 (≤ 12% do pool). Sorteio ponderado e **determinístico** pela seed da batalha (`pickEnemyForFloor`).
7. **Físico × mágico importa.** O engine ganhou `CombatantSeed.basicAttackType`: físico = Ataque × Defesa; mágico = Atq. Esp. × Def. Esp. (arcanista/invocador sombrio e inimigos mágicos). A Gosma Gélida, por exemplo, segura mais o mago.
8. **Constante de defesa por nível** (`combat.defenseConstantPerLevel = 5`): `K = 100 + 5 × (nível − 1)`. Com K fixo, a mitigação tenderia a 100% em nível alto e a luta duraria ∝ nível (medido: Aldric×slime 6 s no Nv 1 → 1.644 s no Nv 20.000). Com K por nível a luta e o dano ficam **estáveis do Nv 30 ao 20.000** (±25%, coberto por teste).
9. **Dificuldade calibrada por simulação** (`balance.ts`, mesmo engine do jogo): `enemyHpMultiplier = 2,5` (lutas de ≈ 8–20 s; tanque mais longa), `enemyAttackMultiplier = 0,05` e `statMultiplier` por inimigo → o herói **on-curve** (nível = nível do inimigo) perde ≈ 8% (veloz), 9–10% (tanque), 10% (equilibrado), 12–13% (dano/mago) e ≈ 19% (elite) da vida por luta, média das 4 classes. O Ataque dos inimigos é baixo por construção: o piso da dificuldade vem do **nível**, não de um golpe que tira metade da vida.
10. **Regeneração em PROCURANDO** (`combat.regenOnSearchingPctPerSec = 0,05` → ≈ 15% do HP por procura de ≈ 3 s), aplicada ao fim da procura. **Ajuste explícito ao ADR-020**: a chain continua sem cura "mágica" (nenhuma cura ao vencer), mas sem regen passiva um herói on-curve perderia ≈ 12% por luta e a caçada idle terminaria em derrota inevitável (provado por teste com regen = 0). Resultado medido: herói **≥ 0,9×** o nível do andar aguenta idle; **0,8×** cai em 18–65 lutas; **0,6×** cai em < 10. O andar é um limite real. Descansar/Reiniciar (ADR-020) seguem curando 100%.
11. **Level-up conserva o HP perdido:** o HP máximo ganho entra no HP atual (herói caído continua caído). Sem isso a barra "encolhia" ao subir de nível.
12. **Equilíbrio dos 4 heróis (ajuste de P-002/ADR-015).** `attack = FOR×1,0 + DES×0,3` (era 0,8/0,2: magos tinham ~50% mais ofensa por INT×1,2) e **Arqueiro** com STR 18→24, INT 10→8, SAB 12→10. Resultado: custo médio por luta 11,5% (Guardião) a 14,1% (Arqueiro) — razão 1,2× (teste exige ≤ 1,4×). Identidades (nomes/skills/raridade) intactas.
13. **Seleção manual de andar** (`GameState.selectFloor`, gate por nível do Rei, `TowerLockedError`); vale na **próxima** luta; `currentFloor` é normalizado no load (`clampFloor`) para que conteúdo editado nunca quebre um save. `bestFloor` continua sendo o maior andar vencido. Recompensa segue o **nível do inimigo enfrentado**, não o andar atual.
14. **Moeda por abate (P-008, provisória):** `floor(12 × (E + 3))` — linear no nível do inimigo (andar 1 ≈ 48/abate; slots 50k/250k ficam acessíveis nos andares 3–4). Continua ⛔ P-008 na FASE 10.
15. **Saves:** `configVersion` 2 → 3 (shape igual; sem reescrita).

**Alternativas rejeitadas:** (a) expoente 1,5/1,0 — ≈ 3.700 h, o andar 10 viraria 420 h; (b) K fixo + stats lineares — luta ∝ nível; (c) tabela de stats por andar — milhares de números, quebra a regra "arquitetura editável"; (d) boss/slimeking como elite — §21/§55; (e) curar ao vencer — mata a tensão (ADR-020); (f) andar derivado de fórmula (`ceil(f×1,2)`) — impossível expressar as faixas irregulares do usuário.

**Consequências:** nenhuma regra da Torre depende de um andar específico no código; tudo é `FloorDef`/`EnemySeed`/`CurveDef`. Testes: `tower-content.test.ts` (faixas literais, papéis, packs), `tower-balance.test.ts` (duelos, sustentabilidade, pacing, sorteio), `tower-floors.test.ts`, `level-scaling.test.ts`. **Riscos (ver `PENDING_RULES.md`):** (1) heróis que entram tarde com XP baixo precisam de catch-up (o XP é dividido por n; um herói novo no nv 1 num time de nível 5.000 não dá para treinar no andar do Rei); (2) equipamento com valores base fixos (`EQUIP_TEMPLATES`) é irrelevante em nível alto — a FASE 9 precisa escalar com tier/nível.

### ADR-022 — Conteúdo data-driven e arquitetura "admin-ready" (ContentPack)

**Data:** 2026-10-03 · **Status:** ✅ Aceita · **Tipo:** B (técnica) · **Contexto:** o usuário quer, no futuro, um **painel administrativo** para editar/adicionar/remover inimigos, bosses e heróis manualmente, **sem IA e sem código**, e quer as próximas etapas organizadas para que o que for editado lá se aplique **diretamente** no jogo. **Nada do painel é implementado agora** (FASE 14 — `ADMIN_PANEL.md`); esta ADR cria o alicerce.

1. **Conteúdo = dado serializável.** Inimigos, andares e curvas são JSON puro (`EnemySeed`, `FloorDef`, `CurveDef`). XP deixou de ser lambda (`requiredPerLevel`) e virou `curve: { kind:"power", base, exponent, offset }` — o painel edita 3 números.
2. **`ContentPack`** (`packages/config/src/content.ts`): `{ schemaVersion, name, enemies, tower{multiplicadores, rewards, floors}, progression }`. API: `exportContentPack()`, `validateContentPack(unknown)` (lista **todos** os erros; aceita JSON cru), `applyContentPack(pack)` (valida antes; **atômica**; muta em lugar `enemies`, `config.tower.*`, `config.xp.*` — imports existentes continuam válidos), `defaultContentPack()`, `resetContentToDefaults()`.
3. **Derivados nunca entram no pack:** `EnemyDef.growth` é recomposto por `buildEnemy(seed)`.
4. **Validação dupla:** `validateConfig/validateCatalog` (conteúdo vivo) e `validateContentPack` (conteúdo de fora). Regras de integridade: ids únicos, andares contíguos (1..N), pool não vazio, pesos > 0, inimigo referenciado existe, faixas coerentes, requisito ≤ teto, curvas válidas, sprites das 6 folhas.
5. **Regra para as próximas fases (AR — "Admin-Ready").** Toda nova entidade de conteúdo nasce como dado de pack, nunca como literal em código: **FASE 9** itens/templates de equipamento/armas/raridades; **FASE 10** preços/recompensas; **FASE 12** bosses (com `bossId`, atributos, skills, recompensas, fragmentos); **FASES 4/9–12** heróis (`HeroIdentityDef`), classes e skills migram para o pack. Cada uma entrega `validate*` + teste de round-trip export→JSON→apply.
6. **Persistência dos overrides = FASE 14.** Um `ContentStore` (local no MVP; Supabase na fase Online) guarda o pack ativo e o carrega no boot **antes** de `validateConfig`. O jogo sempre tem o pack padrão como fallback; pack inválido nunca é aplicado.
7. **Progresso do jogador não referencia conteúdo por posição.** O save guarda ids (`classId`, `currentFloor` normalizado no load) — remover um andar/inimigo no painel não corrompe saves.

**Alternativas rejeitadas:** (a) painel editando arquivos `.ts` — exige código/IA, é exatamente o que o usuário não quer; (b) manter lambdas e "regenerar" — não serializa; (c) banco de dados já agora — prematuro e prende o MVP local a infraestrutura online; (d) editar `config` em runtime sem validação — um número ruim derrubaria o jogo.

**Consequências:** `docs/ADMIN_PANEL.md` descreve o escopo do futuro painel e o contrato; ROADMAP ganha a **FASE 14 — Painel Administrativo** (pós-MVP); `docs/CONFIGURATION.md` documenta o fluxo de edição.

### ADR-023 — Equipamento (FASE 9): modelo, X fracionário, efeitos de combate e conserto da velocidade de ataque

**Data:** 2026-10-03 · **Status:** ✅ Aceita · **Tipo:** B (técnica) + C delegada (P-010/P-016/P-023/P-024/P-025/P-033 — "você decide") · **Contexto:** FASE 9 do `Master-Prompt.md` (§30–§41, §71–§72), com o OpenRpg como inspiração (slots, escada de qualidade, `Equipment` por atributos) e a regra AR (ADR-022): **todo conteúdo de equipamento é dado de pack**, editável pelo painel futuro.

**1. O item (`Equipment`).** Guarda só o que é sorteado: `itemTypeId` (template), `level`, `rarity`, `xValues` (um X por linha de atributo, **2 casas decimais**), `quality`/`grade`, `seed`, `traitId`, `featureId`. Os **stats finais são derivados** em runtime: `valor = referência(nível) × unidade × peso da linha × multiplicador da raridade × X`. Editar o catálogo (peso, unidade, raridade) muda **todos** os itens existentes sem migração. Item cujo template foi removido vira **órfão**: inerte (vale 0), nunca quebra o save.

**2. X (P-010).** Fracionário, **0,50–2,50**, 2 casas. Distribuição em sino (média de 3 uniformes, elevada a 2): média ≈ 1,05; ≥ 2,00 em ≈ 1% das linhas; ≤ 0,70 em ≈ 15%. Medido em 100 mil rolagens (média 1,055; ≥ 2,00: 1,08%; ≤ 0,70: 14,9%). Cada linha tem X **independente** (§36).

**3. Linhas por raridade (P-025).** Comum/Incomum 2, Raro/Épico 3, Lendário/Celestial 4. A **primeira linha do template é sempre rolada** (a "identidade" da peça); as demais saem do pool por peso. Multiplicadores de raridade 1 / 1,2 / 1,5 / 2 / 2,5 / 3 (§33 dá as chances; os multiplicadores são decisão técnica herdada da referência).

**4. Nota (§35).** `quality` = média das linhas **normalizada pela faixa de X**, ou seja, **independente da raridade** (teste: média de nota de Comum e Celestial difere < 3 pontos). Letras S–F por limiar em `equipment.grades`: **S ≥ 59, A ≥ 49, B ≥ 38, C ≥ 28, D ≥ 21, E ≥ 15, F** — calibrados contra a distribuição medida de notas (poucos S, maioria entre C e E; a calibração é ponto de partida de playtest). **A escala antiga (S ≥ 90…) estava fora da distribuição e foi abandonada.**

**5. Escala por nível (R-02).** `referenceStat(stat, nível)` usa o **stat do herói on-curve naquele nível** (a mesma `growthFromAttributes`). O item vale uma **fração** do herói — por isso não fica irrelevante em nível alto. Nível do item = nível do inimigo que dropou. Unidade padrão **6%** do stat de referência por linha (`ofReference`) para HP/ataques/defesas; crítico, vel. de ataque e velocidade são `flat` (+1,2 pp / +0,02 / +1,0 por unidade). Material do tier no nome ("Espada de Aço") por `equipment.tiers`.

**6. Requisito de nível (P-033).** Equipar exige herói ≥ `ceil(0,9 × nível do item)` (`equipment.requirement.levelRatio`). Item acima do nível por edição de conteúdo fica **inativo**, não quebra.

**7. Afinidade (P-024).** A arma do tipo da classe dá **+5%** no(s) ataque(s) que a classe usa (`equipment.affinityBonus`). Armas fora da afinidade equipam normalmente (bônus, não parede).

**8. Traços de arma (P-023) e características (§34).** **Vocabulário fechado de efeitos** `GearEffect` (`critChance`, `attackSpeed`, `damageBonus`, `defensePierce`, `lifesteal`, `cooldownReduction`, `basicHeal`, `dot`, `stun`, `counter`, `multiHit`, `area`), executado pelo **engine sem conhecer itens**: o game-core monta a lista (traço do tipo da arma + característica do item) e o engine a reduz a um `GearProfile`. Efeitos escalares somam e respeitam **tetos** (`equipment.effectCaps`: crítico 40%, vel. 60%, dano 60%, perfuração 40%, roubo vital 20%, recarga 40%); `multiHit`/`area` não empilham (vale o melhor). Espada = Contracorte; Adaga = Veneno; Machado = +15% dano físico; Maça = +10 pp crítico; Besta = +20% vel.; Cajado = Área (**arma de Boss**: na Torre 1×1 não tem vantagem); Livro = Sifão; Manoplas = Atordoamento; Garras = Golpe duplo. Características (Lendário/Celestial; **não escalam** com X nem raridade): Roubo Vital, Ruptura de Guarda, Foco Crítico, Concentração. Regras do engine: atordoamento **consome a ação** do alvo; veneno age por **pulsos sem crítico** e renova em vez de empilhar; contracorte **não gera reação** (sem recursão); tudo determinístico por seed.

**9. Conserto da velocidade de ataque (ajuste a ADR-001/§66).** O engine passava o **multiplicador de status** como se fosse o IAS: todo combatente agia a cada 1 s e **DES/IAS não valiam nada**. Agora `intervalo = T₀ / (1 + IAS_total)`, **T₀ = 1000 ms** (`combat.baseActionIntervalMs`), IAS ∈ [−0,5; +1] ⇒ **2000…500 ms**; IAS_total = DES (`stats.attackSpeed`) + bônus de equipamento; status de velocidade multiplica a cadência. Isso mudou a calibração: **custo de vida por inimigo** (`BALANCE_REPORT.md`) agora é tank 9%, dps 12–13%, caster 12–15%, elite 22–24%; o **Morcego** (`swift`) teve o `statMultiplier` reduzido para 1,12 (7% de vida, luta de 6 s) para não custar mais que o tanque. Efeitos na sustentabilidade idle estão em `BALANCE_REPORT.md` (R-04).

**10. Calibração medida (`npm run report:balance`).** Conjunto completo médio de drops (nível 500): perda de vida por luta **10–11% → 2–5%** e luta 12–21% mais curta, conforme a classe (conjunto médio ≈ +30–45% HP, +26–44% defesa, +14–18% ataque, +3,3 pp crítico, +0,049 IAS). Tudo Comum X 1,0 já dá 2–7%. **God roll** (tudo Celestial X 2,5) → 0% em 2–4 s: existe, é essencialmente inalcançável (0,1% por drop × 5% de drop × 10 slots) e é o teto prometido pelo §35. Pesos de drop de arma: Cajado/Livro 3 e as outras 7 armas 1 ⇒ 46% das armas são mágicas (metade do roster ataca com Atq. Esp.).

**11. Venda (P-008 provisório).** Preço **por dados**: `Coin por abate no nível do item × abates equivalentes da raridade (3/5/12/40/150/600) × fator de nota (0,5–2,0)`. Mesma curva de Coin da Torre → o preço acompanha o jogo. Item equipado ou travado no mercado **não vende**. Venda em massa por filtro (até raridade X, nota abaixo de N), com **pré-visualização** do total antes de confirmar.

**12. Mochila (P-016).** 300 itens **não equipados** (equipar libera espaço). Cheia ⇒ `inventory.onFull`: `autoSell` (padrão — vende na hora pelo preço normal; o idle nunca trava nem perde valor) ou `discard`. Coin e XP do pacote são creditados **antes** — o limite nunca reverte recompensa. UI mostra cada drop (`onLoot`).

**13. HP e equipamento.** O HP máximo do herói = HP-base + HP do equipamento. Equipar concede o delta ao HP atual; desequipar tira o delta sem matar (mínimo 1); herói caído continua caído. Trocar equipamento durante a luta do herói é **bloqueado** (mudaria o combatente em curso).

**14. Saves.** `configVersion` 3 → **4**. Itens legados (`"slot.raridade"`, X inteiro 1–50) são **reconstruídos do `seed`** no modelo novo (id/dono/nível/raridade/slot/origem preservados); migração determinística e idempotente. Heróis ganham `attributes`/`quality` (ADR-024).

**15. ContentPack v2.** `schemaVersion` 2 acrescenta os blocos `equipment`, `loot` (chance, tabela de raridade, forma do X), `inventory` e `heroAcquisition`. Pack v1 é migrado completando os padrões. Validação lista todos os erros com o caminho; aplicar é atômico. Editar um preço, um peso, um traço, uma raridade ou **adicionar um item novo** é só editar o pack (teste `content-pack-v2.test.ts`).

**16. Ícones.** O pack Nika não traz peitoral, calça, asas, botas, manoplas, elmo, besta nem ataduras. Foram **gerados** (IA, 64×64, fundo transparente) no estilo do pack: `assets/generated/items/*.png` via `scripts/gen-item-icons.mjs`. Os demais usam ícones do pack (`icons1/2/3`). **Atenção:** os arquivos soltos de `assets/sprites/icons1/` (`amulet_v1`, `boots_v1`, `helmet`, `bread`…) **não correspondem ao nome** (ex.: `helmet.png` é uma poção) — só os de folha (`icons_*_N`) são confiáveis.

**Alternativas rejeitadas:** (a) X inteiro 1–50 da referência — não casa com o exemplo ×1,72 do §36; (b) stats finais gravados no item — um rebalanceamento exigiria migração; (c) valores base fixos por template (`EQUIP_TEMPLATES`) — irrelevantes em nível alto (R-02); (d) efeitos como funções por item — não serializa e o painel não consegue editar; (e) vender equipado — perda por clique errado; (f) descartar com mochila cheia — o idle perderia valor sem o jogador ver.

**Consequências:** testes `loot`, `inventory`, `gear`, `gear-effects` (engine), `hero-acquisition`, `equipment` (config), `content-pack-v2`, `equipment-flow` (integração), `tower-balance` (equipamento); relatório `BALANCE_REPORT.md` com a seção de equipamento. **Pendências remanescentes:** P-008 (Coin) na Fase 10; nota (letras) e pesos são ponto de partida de playtest.

### ADR-024 — Aquisição de heróis balanceada (adendo de 2026-10-03)

**Data:** 2026-10-03 · **Status:** ✅ Aceita · **Tipo:** C (decisão do usuário aplicada) · **Pedido:** (a) na seleção de personagem **todos os heróis são Incomuns**; (b) no jogo, os **Reis (Boss) poderão dropar mais de 1 herói do mesmo tipo**, com **raridade/atributos diferentes**; (c) a aquisição deve ser **balanceada em raridade/qualidade/atributos independente de classe/herói**.

1. **Seleção inicial.** `HeroIdentityDef.rarity` = `uncommon` nos 4 (ADR-015 atualizada) e `heroAcquisition.starterRarity = "uncommon"`. Heróis iniciais usam os atributos-base da classe e nota 50. `uncommon` tem multiplicador de stats **1,0**, então o herói inicial vale **exatamente** o que a Torre calibrou.
2. **Herói = classe + raridade + atributos próprios.** `Hero.rarity`, `Hero.attributes` (6 atributos OpenRpg), `Hero.quality` (0–100). Os stats vêm de `growthForHero(attributes, rarity)`; dois heróis da mesma classe são entidades distintas (ids diferentes, XP separado). O códice mostra `copies` (quantos de cada classe).
3. **Rolagem** (`rollHeroAcquisition`, regra pura e determinística; o drop em si entra com o Boss na FASE 12): raridade pela tabela do §33 (50/30/15/4/0,9/0,1); cada atributo da classe recebe um fator `0,85–1,15` em sino (média de 3 uniformes); `quality` = posição média na faixa. **Mesma configuração para toda classe** — testes (`hero-acquisition.test.ts`): a distribuição de raridade e de nota é a mesma entre classes, e o poder médio por raridade fica a ±5% do incomum em qualquer classe.
4. **Multiplicador de stats por raridade de herói** (modesto: herói raro é melhor, não é outro jogo): 0,94 / 1,00 / 1,06 / 1,12 / 1,20 / 1,30. Tudo em `config.heroAcquisition` (editável via ContentPack v2).
5. **Saves.** Migração `configVersion < 4`: heróis iniciais passam a incomuns; atributos da classe e nota 50 para os demais.

**Alternativas rejeitadas:** (a) raridade diferente por classe na seleção (era Comum/Incomum/Raro/Épico) — contradiz o adendo; (b) multiplicador alto de raridade (1,0→2,0) — um Celestial invalidaria a Torre calibrada; (c) atributos aleatórios sem âncora na classe — apagaria a identidade (§10).

### ADR-025 — Market (NPC), Poções/Revives/Caixas e Bot

**Data:** 2026-10-03 · **Status:** ✅ Aceita (preços provisórios, ver P-008/P-036) · **Tipo:** C (decisão do usuário aplicada + decisões delegadas) · **Pedido:** Market com vendas por Coin, em abas (Poções, Revives, Caixas); poções de cura fixa e em %, revives 30/50/100%, caixas de fragmentos/heróis **extremamente caras, de chance baixa e sem ser foco de obtenção** (segundo meio, para níveis altos); preços a decidir.

1. **Market ≠ Mercado da Comunidade.** O Market é uma loja do Reino (compra com Coin, sem taxa, sem outros jogadores). O Mercado entre jogadores (taxa de 15%, §41) continua futuro e server-authoritative (`MARKET_SYSTEM.md`). O Market é **100% dado**: `config.market` (itens, abas, preços, chances, nível mínimo) entra no `ContentPack` v3 e é validado como o resto.
2. **Poções e revives.** Cura fixa: Básica **60**, Modesta **150**, Melhorada **400**, Rara **800**, Épica **1.000**, Lendária **2.500** de vida; em %: Mágica **30%**, Mágica Rara **50%**, Mágica Suprema **100%** da vida máxima. Revives: Básica **30%**, Melhorada **50%**, Mágica **100%** (o herói volta com essa fração).
3. **Preços (decisão minha, provisória).** Curas fixas custam em **Coin fixo**: 45 · 130 · 380 · 1.100 · 1.500 · 4.000 (≈ 0,7–2,4 Coin por HP — de 1 a ~80 abates no Nv 1, baratas depois: é a conveniência que perde valor com o nível, como na referência). Curas em % e revives são cobradas em **abates** (`perKill`, com piso): Mágica 6 · Rara 12 · Suprema 30 abates; Revive 8 · 20 · 60 abates — o preço acompanha a economia (o Coin/abate vem da curva da Torre no maior andar liberado). Nenhum item é preço fixo para sempre: tudo em `config.market.items[*].price`.
4. **Caixas.** Básica = **800** abates (mín. 100 mil Coin), exige Rei **Nv 250**; Rara = **3.000** abates (mín. 1 mi), Nv **1.500**; Lendária = **8.000** abates (mín. 10 mi), Nv **5.000**. Chances (pesos): Básica 93,4% fragmentos Comuns (1–3) · 6% herói Comum completo · 0,6% herói Raro; Rara 94,4% fragmentos Raros · 5% herói Raro · 0,6% herói Épico; Lendária 97% fragmentos Lendários · 3% herói Lendário. Medido em `BALANCE_REPORT.md`: ≈ **22 h / 129 h / 675 h** de caça por herói completo da raridade da caixa — a Torre e os Bosses seguem como caminho principal; a caixa é o segundo meio, caro, para quem já está alto.
5. **Fragmentos são da CONTA**, por classe e raridade (`"classe:raridade"` na mochila), não de um herói — dá para juntar fragmentos de um herói que ainda não se tem. Invocação (`summonHero`) gasta `heroAcquisition.fragmentsRequired` (20/30/40/70/100/250) e cria o herói pela regra de aquisição (ADR-024) com a raridade garantida. Fragmentos nunca saem de inimigo comum da Torre (§12): só caixa/Boss/evento.
6. **Sorteio determinístico e salvo.** A abertura usa o contador `SaveData.market.boxesOpened` como semente: recarregar não repete resultado; mesma conta/mesmos contadores ⇒ mesmo sorteio (testado).
7. **Bot (`SaveData.bot`, padrões em `config.bot`).** Opções do jogador, iguais online e offline: **auto-poção** (liga/desliga, limite de vida 5–95%, padrão 40%, item "automático" = a **menor** que cobre o dano, senão a maior; ou um item específico), **auto-revive** (traz o herói de volta **à mesma luta**) e **voltar do Hub sozinho** (padrão ligado). Salvaguardas: recarga de **2,5 s** entre poções (tempo de batalha), máx. **6** poções e **2** revives por luta — uma luta perdida não esvazia a mochila.
8. **Hub.** Cair sem revive leva ao Hub (`hunt = defeated`): a equipe recupera por **60 s** (`bot.hubRecoveryMs`), volta com o HP cheio e a caçada retoma pelo PROCURANDO **no mesmo andar** (o andar é do save, nunca é alterado). Com "voltar sozinho" desligado vale a política antiga (ADR-020): o herói fica caído até o jogador agir.
9. **Engine.** `healCombatant` e `reviveCombatant` + gancho `onAlliesDown` no `step`: o game-core injeta a política (Bot), o engine segue puro (§63). A UI trata `character_revived` (sprite levanta).
10. **Ícones.** Poções e mágicas usam o pack; revives e caixas (6) foram **gerados** no estilo do pack (`gen-item-icons.mjs`, `assets/SOURCES.md`).
11. **P-036 (sumidouros).** Consumíveis do Bot e caixas são o principal sumidouro de Coin do MVP, ao lado dos slots 2/3 (ADR-017). **P-008** segue provisório: todos os valores acima são config.

**Alternativas rejeitadas:** (a) fragmentos presos ao herói (não deixaria juntar para quem não tem o herói); (b) preço fixo em Coin para tudo (poções % e caixas ficariam grátis ou impossíveis conforme o nível); (c) revive só fora da luta (não é o que o jogador pediu: "voltar pro mesmo andar" e continuar com o Bot); (d) caixa sem nível mínimo (viraria o caminho principal).

**Consequências:** testes `market-bot-offline` (compra atômica, nível mínimo, caixas determinísticas, invocação, Bot, Hub), `heal-revive` (engine), `tower-content` (Market como conteúdo). `configVersion` 5; ContentPack v3.

### ADR-026 — Offline = simulação do online (substitui o modelo "acumulado")

**Data:** 2026-10-03 · **Status:** ✅ Aceita · **Tipo:** C (decisão do usuário aplicada) · **Pedido:** *"o offline deve funcionar como se o jogador tivesse ficado online por mais aquele período (2 h Free, 8 h VIP); se morrer, recupera no Hub e volta para o mesmo andar; continua usando as poções como configurado no Bot e demais funções."*

1. **Não há fórmula de conversão.** Ao voltar, o jogo **simula o próprio jogo** — batalha → recompensa → PROCURANDO → batalha — pelo tempo creditado, com o **mesmo código** do online (`advanceIdle`/`advanceBattle`), só trocando o relógio por um **relógio virtual** (`GameState.clock()`). XP, Coin, drops (mochila cheia ⇒ venda automática), níveis, poções, revives, Hub: tudo é real. Isso encerra **P-011** (taxa de conversão) e **P-011a** (derrota offline): quem decide é o Bot, igual online.
2. **Teto POR ausência** (2 h Free / 8 h VIP, `config.offline`): `min(ausência, teto)`. O modelo antigo (`accumulatedMs`, teto vitalício do §47/§48 lido como "acumulado") foi **abandonado** — depois de 2 h creditadas o jogador nunca mais ganharia nada, e contradiz "como se tivesse ficado online por mais aquele período". `accumulatedMs` permanece no save por compatibilidade e vale 0.
3. **Quando simula.** Ausência ≥ `offline.minAwayMs` (30 s — trocar de aba não dispara) e herói ativo. O boot **chama `claimOffline`** (antes só marcava `lastActiveAt`: bug corrigido) e o retorno à aba também. Heartbeat de `lastActiveAt` a cada **5 s**; nunca ao sair (§47).
4. **Paradas.** A simulação encerra se a caçada está pausada (descanso), se o herói caiu e o Bot **não** volta sozinho, se não há herói, ou na trava de segurança (`maxSimulatedSteps`). O relatório diz o motivo.
5. **Hub offline.** Cair sem revive ⇒ 60 s no Hub (tempo simulado) ⇒ volta curado ao **mesmo andar**; cada ida entra no relatório.
6. **Relatório** (`OfflineReport`): tempo fora/creditado/teto, batalhas, Coin, XP do Rei e do herói (níveis antes/depois), equipamentos (e vendidos), derrotas, idas ao Hub, itens usados. A UI mostra "Bem-vindo de volta" até o jogador fechar.
7. **Determinismo e custo.** Mesmo save + mesma ausência ⇒ mesmo resultado (testado). Passo de batalha ≤ 250 ms; busca e Hub são saltos de tempo. medido: 2 h no andar 1 (≈ 1.250 lutas) simuladas em ≈ 0,2 s; a UI não re-renderiza durante a simulação (`onStateChanged` suprimido, um aviso no fim).
8. **Cheating de relógio.** Local-first confia no relógio do aparelho (relógio adiantado não passa do teto). No online (Supabase) o servidor mede a ausência — fica para a fase online.

**Alternativas rejeitadas:** (a) conversão linear tempo→recompensa (não respeita Bot, Hub, derrota, nem o andar); (b) acumulado vitalício (ver 2); (c) simular só até a primeira derrota (jogador perderia o tempo todo por uma queda — o Hub existe para isso).

**Consequências:** testes `market-bot-offline` (ausência curta, 2 h, teto por ausência, determinismo, poções no offline, Hub, parada sem auto-retorno, pausa) e `hunt.test.ts` (créditos por ausência). `docs/AUTOMATION_SYSTEM.md` §6 atualizado.

### ADR-027 — Boss: atividade separada, 100% dado (FASE 12)

**Data:** 2026-10-03 · **Status:** ✅ Aceita (números provisórios, ver P-017/P-018/P-021/P-029/P-062) · **Tipo:** C (decisão delegada) · **Pedido:** *"defina, com base no que temos até agora + OpenRpg, as regras do BOSS de maneira editável futuramente; tome as demais decisões e me avise no final."*

**Contexto.** O Master-Prompt fixa o que o Boss **é** (§21–§25, §54, §55, §80, §110): equipe inteira (até 3) × 1 chefe, ataque simultâneo, atividade separada da Torre (que segue 1×1, sem chefe em andar nenhum), fonte principal de fragmentos (§12). **Não** fixa conteúdo, tentativas, fragmentos por chefe nem recompensas. O OpenRpg (verificado em `b498764`) **não tem sistema de Boss**; aproveitei dele só os blocos que casam: inimigo como *template de dados* (`EntityTemplate`), batalha de **equipe × inimigo** em formação (`Demos.Battler`), alvos Único/Área (`CombatTargetTypes`) e habilidades/efeitos como dado. A identidade da Sentinela (imune a Atordoamento, muita vida, recompensa grande) veio do repositório de referência antigo.

**Decisão — o Boss é um bloco de dados (`config.boss`, ContentPack schema 4):**

1. **Um `BossDef` descreve tudo**: nível do Rei exigido, nível do chefe, atributos-base × `statMultiplier` × `multipliers` (HP/ataque/defesa/velocidade), tipo de dano, `statusResist` (0–1; 1 = imune a `stun`/`poison`), skills (inclusive de **área** sobre a equipe), **fases**, limite de tempo, regra de tentativas, recompensas, sprites e escala/tintura. **Adicionar um chefe = clonar um objeto e trocar o id** (testado). Nada é código.
2. **Fases** (`phases[]`): disparam **uma vez**, por **HP restante** (`hpBelowPct`) ou por **tempo de luta** (`afterMs` = *enrage*). Efeitos: multiplicadores únicos de stat, bônus de velocidade de ataque, **cura única** (`healPct`) e skills novas. O engine emite `phase_changed`; a UI mostra faixa + tremor.
3. **Resistência/imunidade** (`statusResist`) implementada no engine (`effect_triggered` com *imune*/*resistiu*, determinístico pelo `Prng` da luta). Fecha o **P-021** para chefes; o inimigo comum continua sem resistência.
4. **Tempo limite** (`timeLimitMs`, 120–180 s): estourar = derrota com motivo `timeout` (TEMPO ESGOTADO). Impede luta infinita e dá sentido à fase de *enrage*.
5. **Equipe 1…3 na MESMA luta** (`battle.mode = "boss"`, aliados × 1 chefe, todos atacam ao mesmo tempo). `minTeamSize` é config (padrão 1: o chefe 1 é vencível por 1 herói; do 3º em diante a calibração exige equipe).
6. **Calibração = decisão de design, por tamanho de equipe**, medida com o engine real (`averageBossFight`, `docs/BALANCE_REPORT.md`): com heróis **no nível do chefe**, sem equipamento — chefe 1: 1 herói vence (~66 s, perde ~65% HP); chefe 2: 2 vencem; **chefes 3–8: só 3 heróis vencem** (~50 s, perdem ~55% HP; 2 perdem). O XP é dividido 1/n (§20), então o herói de uma equipe de 3 chega com menos nível que o Rei: o `level` do chefe é ≈ `requiredKingLevel × f(n)` (f(1)=1, f(2)≈0,74, f(3)≈0,63). Resultado: **chefes são o motivo de desbloquear os slots 2 e 3** e de usar equipamento — e mitigam o risco R-01 (heróis tardios) só em parte (continua aberto).
7. **8 chefes de fábrica** (um fragmento de classe por chefe, rodando as 4 classes): Rei Gosma (Nv Rei 10) · Sentinela da Torre (50, imune a Atordoamento) · Matriarca Gélida (250, resiste a Veneno, **cura** na fase) · Senhor da Forja (1.000, 2 fases) · Rainha dos Morcegos (2.500, imune a Veneno) · Carrasco Sangrento (5.000) · Lorde das Sombras (10.000, *enrage* por tempo aos 75 s, 2 skills) · Colosso da Torre (19.500, imune a Atordoamento, **3 fases**, 1 tentativa/dia).
8. **Tentativas (P-029)** — 3 modelos em dado: `none` (sem limite), `cooldown` (recarga após vitória e outra, menor, após derrota) e `window` (N por janela móvel que abre na 1ª tentativa). Chefes 1–4 usam *cooldown* (10/15/30/60 min; 2–5 min após derrota); 5–8 usam *window* (3 por 8 h, 2 por 8 h, 2 por 12 h, 1 por 24 h). **A tentativa é consumida ao ENTRAR** (recarregar a página não a devolve). Janela móvel e relógio do aparelho (sem fuso, sem "meia-noite") — o servidor assume na fase online.
9. **Recompensa (P-017/P-018)**, em **"abates equivalentes"** da Torre no nível do chefe (`coinKills`, `kingXpKills`, `heroXpKills` × curva da Torre): acompanha a economia sozinha em qualquer nível, e o editor só mexe em "quanto o chefe vale". **1ª vitória** multiplica Coin/XP (`firstClearMultiplier` = 3) e dá **fragmentos extras** (`firstClearFragments`). **Equipamento garantido** (`rolls` × raridade mínima, sem os 5% da Torre — §12 não se aplica a equipamento) e **fragmentos** com classe fixa ou `"any"` (sorteada), raridade, faixa e chance. Os fragmentos entram na **conta** (`classe:raridade`, ADR-025) e valem para qualquer herói da classe; a Torre **nunca** os entrega (testado em 300 vitórias). O XP de herói é dividido pela regra da equipe.
10. **Fim da luta**: o resultado (`bossResult`) fica no estado até o jogador fechar o modal (que o leva ao Reino); a Torre **retoma sozinha** (`resumeTowerAfter`, editável). O HP da Torre **não** é afetado (`persistHpAfter = false`): a equipe entra e sai com o HP cheio — a Arena não pune a caçada nem depende dela. **Desistir** = derrota imediata (a tentativa já foi gasta).
11. **Bot na Arena** (`config.boss.bot`): usa as mesmas opções do jogador e o **mesmo código** do Bot da Torre (§65), mas com limites próprios (8 poções, 3 revives por luta; poção vai para o aliado **mais ferido**, revive proativo — o caído sai do combate, §24). Desligável só na Arena.
12. **Offline: o Boss nunca roda** — é atividade do jogador presente (ADR-026 simula só a Torre). Chefe em curso ao fechar a aba: a luta é perdida (nada de recompensa parcial).
13. **UI** (§110): aba **Arena** com cartões por chefe (nível, recarga/tentativas, resistências, skills, recompensas; mostra a equipe atual e avisa se ela é pequena), cena de luta própria (equipe em diagonal à esquerda, chefe grande à direita, barra de HP do chefe, nome da fase), modal de resultado destacando **fragmentos**, equipamentos e XP. SFX reaproveitados (P-062: **sem trilha própria** por ora — `BossDef` aceita um campo de música quando houver áudio).
14. **Sem World/Guild/Event Boss** agora: só arquitetura (o `BossDef` não depende de jogador; recompensa/tentativa trocam por regra de servidor).

**Alternativas rejeitadas:** (a) chefe em andar da Torre (proibido, §21/§55); (b) chefes com mecânica codificada (cada um uma classe) — não editável; (c) tentativas "diárias à meia-noite" — exige fuso/servidor; (d) recompensas em números absolutos de Coin — quebrariam a cada ajuste da curva; (e) devolver a tentativa ao recarregar — convida a *save-scum*; (f) calibrar com `enemyStatMultiplier` global — não separa equipes de 1/2/3.

**Consequências:** `engine/simulate.ts` ganhou `phases`, `statusResist`, `timeLimitMs`; `game-core/boss.ts` (disponibilidade, recompensa, normalização do save); `GameState.startBoss/forfeitBoss/dismissBossResult/bossAvailability`; save v6 (`boss`) e ContentPack v4 com migração; `configVersion` 6. Testes: `engine/boss-battle` (16), `game-core/boss` (33), `config/boss-content` (12), integração de assets dos chefes e migração do save.

### ADR-028 — MVP Local: Debug Mode, save seguro, estabilidade e entrega sem instalação (FASE 13)

**Data:** 2026-10-03 · **Status:** ✅ Aceita · **Tipo:** B/C (decisões técnicas e de UX; nenhum número de gameplay alterado) · **Pedido:** *"Prossiga com a Fase 13. Ao final, faça uma revisão geral… e me diga como testar localmente no Windows 10 Home baixando o zip do GitHub… garanta que mostrará jogo, css, assets e demais recursos."*

**Contexto.** As fases 1–12 entregaram todos os sistemas. Faltava fechar o MVP: ferramenta de teste (Debug Mode §77), save que o jogador possa proteger, estabilidade, texto de jogo sem jargão e — o ponto de risco — **o jogador baixar o zip do GitHub e realmente jogar**, sem `npm install`, num Windows com Node recém-instalado e sem navegador gráfico no ambiente de desenvolvimento para provar a tela.

**Decisão.**

1. **Debug Mode é de build, não de runtime.** Flag `VITE_DEBUG_MODE` embutida no build; `DebugPanel` carregado por `lazy` só se a flag estiver ligada (o bundle do jogador não contém o código nem as strings). Lógica em `game-core/debug.ts` (pura, testável): usa as regras do jogo (`startTower`, `startBoss`, `claimOffline`…); o que "trapaceia" (Coin, nível) é explícito, tem teto e devolve texto de log; `setFloor` eleva o nível do Rei ao exigido pelo andar (não burla a regra §46); itens/heróis criados nascem `origin: "admin"`. O que depende do online (chat, auth, mercado da comunidade) aparece desligado com o motivo. Verificação dupla: `check-debug-mode.mjs` (fontes) e `check-preview.mjs` (bundle versionado).
2. **Save é do jogador.** Opções permite baixar cópia, carregar arquivo (validado ANTES de gravar), apagar progresso (confirmação) e restaurar a cópia anterior — todo caminho destrutivo grava antes um backup (`tia:save:local:backup`, 1 vaga). Importar/apagar **para o loop** antes de recarregar: sem isso o `beforeunload` regravaria o save antigo e a operação seria silenciosamente desfeita (bug real encontrado e coberto por teste). Preferências de som ficam **fora** do save (`tia:settings`): não são progresso e sobrevivem a "apagar". O jogo também grava em `pagehide` (mobile).
3. **Estabilidade.** `ErrorBoundary` (recarregar / baixar save, lido do `localStorage`, não do estado que quebrou) envolve o App. **Soak** como teste: 3 h simuladas × 4 heróis com um jogador scriptado (equipa, vende, compra, sobe de andar, enfrenta a Gosma) conferindo invariantes (sem NaN, Coin ≥ 0, mochila ≤ limite, níveis ≤ teto, HP ≤ máx., ids únicos) e **ida-e-volta do save** a cada 15 min simulados (hunt e `lastSavedAt` diferem de propósito); mais 5 aberturas offline seguidas. O smoke de UI roda o App real em jsdom (criação → todas as telas → Opções/erro) e reprova `§N`, `P-xxx`, `undefined`, `NaN` e `[object Object]` no texto de jogo.
4. **UX do iniciante.** Guia "Próximo passo" (regras puras, ordenadas, só lê o estado) e "Como jogar" nas Opções; interface sem referências internas; correções de texto (poção percentual sem herói ativo, plural de equipamento). A regra "nada entra sozinho na equipe" (§19) foi **mantida**: o guia é quem leva o jogador ao Slot 1.
5. **Entrega no Windows = bundle versionado + servidor de ~150 linhas, só Node.** O zip do GitHub não traz `node_modules` nem `public/assets` gerado; portanto o caminho robusto é `JOGAR.bat` → `scripts/play.mjs` → `serve-preview.mjs` servindo `apps/game-web/preview` + assets versionados. Escolhas: **loopback apenas** (sem aviso de Firewall do Windows; IPv4 e IPv6, pois `localhost` pode resolver para `::1`); **porta fixa 5173** (o `localStorage` é por origem — porta diferente = save diferente; se a porta está ocupada por *outro* programa o jogo usa a próxima e AVISA; se é o nosso jogo, só reabre o navegador); `.bat` **ASCII + CRLF** e `*.bat -text` no `.gitattributes` (o zip do GitHub é gerado por `git archive`, que aplicaria conversão); mensagens do console sem acento no Windows (o console legado quebra UTF-8); nunca `file://`.
6. **O bundle não pode envelhecer.** `build:preview` grava `BUILD_INFO.json` com o hash das fontes (CRLF→LF, sem testes); `check:preview` reprova bundle velho. O mesmo script **sobe o servidor real e rastreia por HTTP** index → JS/CSS (MIME correto) → manifesto → todos os ~494 assets → rota SPA → URL malformada; e confere nomes de arquivo do repositório (reservados/inválidos do Windows, colisão de caixa, caminho > 150) — validado também com `git archive` num diretório limpo sem `node_modules`.
7. **Números: revisados, não alterados.** `balance-report` ganhou "Ritmo das primeiras 4 horas" com o **jogo real**: Rei nv 10 em 18–24 min, nv 25 em ≈ 46–57 min, nv 50 em 1,7–2,1 h, 1º drop em 11–15 min, Slot 2 (50 mil Coin) em ≈ 1,4 h. Plausível para um MVP; Guardião ≈ 30% mais lento (R-05 reconfirmado). Ficam para playtest humano: P-008/P-036 (Coin/Market), P-017/P-018/P-029 (Boss).

**Alternativas rejeitadas:** (a) `file://` ou `index.html` solto (módulos ES/`fetch` não funcionam — falha em branco para o iniciante); (b) exigir `npm install`/Vite no zip (centenas de MB, falha por rede/antivírus, e iniciante); (c) empacotar Node/Electron (peso e manutenção fora do escopo do MVP); (d) servidor em `0.0.0.0` (dispara o Firewall do Windows); (e) Debug por flag de runtime/URL (qualquer jogador ligaria); (f) auto-colocar o herói inicial no Slot 1 (contraria §19); (g) alterar números "por sensação" sem playtest.

**Consequências:** novos arquivos `JOGAR.bat`, `JOGAR-DEBUG.bat`, `jogar.sh`, `.gitattributes`, `scripts/{play,preview-info,check-preview}.mjs`, `docs/{PLAY_LOCAL,MVP_ACCEPTANCE}.md`; `npm run check` inclui `check:preview` e o projeto `ui` (jsdom); **depois de qualquer mudança em `apps/game-web/src` ou `packages/*/src` é obrigatório `npm run build:preview`** e commitar o bundle. Limite honesto: sem navegador gráfico no ambiente, a **aparência final** não foi vista — só o DOM (jsdom) e a entrega HTTP foram verificados.

### ADR-029 — Correção da tela preta e arena de batalha com cenário, caminhada e efeitos (pós-FASE 13)

**Data:** 2026-10-03 · **Status:** ✅ Aceita · **Tipo:** B/C (renderização e UX; nenhum número de gameplay alterado) · **Pedido:** *"o jogo abre e funciona, mas a batalha acontece em uma tela preta, apenas com o escrito 'Aguardando batalha...' e depois 'Vitória' [...] Verifique o que falta para termos: uma arena de fundo, preferencialmente móvel a cada inimigo como se o herói andasse até o próximo, inimigos e heróis se enfrentando, efeitos de ataque/dano/morte [...] audite tudo (se já tiver inserido, verifique por que não aparece), resolva e me explique o que era."*

**Contexto — a auditoria.** Um Chromium real (headless, WebGL por software) foi usado pela primeira vez para jogar o jogo e ler o estado da cena. O bug foi reproduzido idêntico ao relato. **A arte já estava inserida** (as 4 folhas por personagem, o tileset e os 7 VFX estavam no repositório, no manifesto e eram servidos com 200); o problema era de **ligação**, não de arquivo:

1. **Causa raiz — a cena nunca recebia a batalha.** `BattleCanvas` entregava a batalha à cena por *push* (`setBattle` num `useEffect`). O Phaser é criado de forma assíncrona (espera o manifesto) e o `GameState` é mutado no lugar: o 1º empurrão chegava antes da cena existir e os seguintes dependiam de a referência mudar. Resultado medido no navegador: durante todo o "Em combate", `scene.battle === null`, 0 combatentes, aviso "Aguardando a batalha..." na tela. O "VITÓRIA!" aparecia porque os **eventos** chegam por outro canal (fila global) — por isso o jogo "funcionava" e só o desenho faltava.
2. **A cena era iniciada duas vezes** (`scene:[BattleScene]` autostart + `scene.start` no `preBoot`).
3. **Não havia cenário nenhum:** o fundo era um retângulo roxo no rodapé. Sem caminhada, sem tema por andar.
4. **Os efeitos do pack (VFX) não eram usados**, e os eventos `attack_started`/`skill_used` trazem `actorId` mas a cena lia só `sourceId` → **o golpe do atacante e o nome da skill nunca tocavam**.
5. **Layout:** o canvas tinha `width:100%` **e** margem lateral e estourava a tela à direita; nome e barra ficavam meio sprite abaixo dos pés (a conta assumia origem no centro).
6. **Painéis sem moldura:** `url()` relativo dentro de variável CSS é resolvido contra a folha de estilo (`/assets/index-*.css`) → `/assets/assets/ui/...` (404) no bundle. Corrigido com URL absoluta.
7. **Por que a suíte não pegou:** jsdom não tem WebGL — o Phaser nunca rodou em teste (o smoke de UI troca o canvas por um stub), e `check:preview` só confere se os arquivos existem. "Tudo verde" nunca provou que a batalha aparece.

**Decisão.**

1. **A cena PUXA os dados** (`render/battleSource.ts`): `BattleCanvas` entrega uma fonte (`getView`), a cena a consulta a cada frame e reage ao que mudou (`battleId`, tema, "procurando"). Não há mais ordem de inicialização nem referência a vigiar. A cena é registrada uma única vez com os dados de início (`scene.add(..., autoStart, data)`).
2. **Arena com cenário** (`render/Arena.ts`, dado em `arenaThemes.ts`, geometria pura em `arenaLayout.ts`): parede (paralaxe 55 %) + piso em duas fileiras com ladrilhos do pack, tochas/braseiros a cada N colunas e adereços de chão (ossos, entulho, barril, sangue…) sobre um piso-base (várias peças do pack têm transparência). **Tema por andar** via `FloorVisual.theme` (6 temas da Torre) e um tema próprio para **chefes**; tema desconhecido cai em `masmorra`. Escolha de ladrilho determinística (hash do índice da coluna).
3. **O herói anda até o próximo inimigo.** Durante "Procurando..." (~3 s) o herói toca a folha `walk` e o cenário rola; o **inimigo entra caminhando pela direita** (520 ms) e o cenário para; na vitória a cena segura o corpo caído (1,5 s) e volta a andar. Sem herói na equipe a cena mostra um aviso útil (nunca preto). `prefers-reduced-motion` desliga rolagem/entrada/avanço.
4. **Efeitos do pack** (`render/vfxAtlas.ts`, tabela medida): corte e faísca em golpe físico, explosão de fogo em dano mágico, raio sobre o adversário em skill mágica, faísca maior no crítico, estouro na morte, cura subindo em cura/reviver. As folhas de VFX **não** são grades 4×4 (uma faixa de quadros no meio de 2048×2048): os retângulos foram medidos pelo canal alfa e a base de pedra da folha de cura foi cortada. `levelup` está catalogado mas **sem gatilho** (não há evento de nível na batalha) — reservado.
5. **Apresentação corrigida:** `actorId` ligado (investida, animação de ataque e nome da skill voltam a tocar); recuo no alvo; sombra sob cada combatente; pés = base do quadro (nome/barra logo abaixo); escala do sprite proporcional à altura do canvas; `pixelArt: true` (filtro nearest, como pede o README do pack); porcentagem mitigada arredondada ("-19%", não "-19.354838709677423%"); canvas sem `width:100%`.
6. **Guia "Próximo passo":** com herói já no slot e nenhum ativo, o texto agora manda tocar em "Tornar ativo" (antes repetia "coloque num slot", e o novato ficava sem entender por que a Torre não começava).
7. **A prova visual entra no repositório:** `scripts/browser-smoke.mjs` (Chromium real; **reprova no bundle antigo e passa no novo**) e `tests/integration/battle-render.test.ts` (18 testes: assets de temas/personagens no manifesto e em disco, quadros dos VFX dentro da folha real, todo tema de andar tem arena, a fonte da cena reflete o estado, plano evento→efeito). O smoke fica fora de `npm run check` (exige navegador) e é documentado em `docs/TESTING.md`. `window.__tiaBattle.snapshot()` expõe, somente leitura, o estado da cena para esses testes.

**Alternativas rejeitadas:** (a) manter o *push* e "consertar a ordem" com `setTimeout`/retries — frágil, o bug voltaria em outra corrida; (b) `TileSprite` para o piso — não permite ladrilhos/adereços variados por coluna; (c) gerar cenário/efeitos proceduralmente — proibido (§62, assets estáticos); (d) alongar a luta para "dar tempo de ver" — é decisão de ritmo de combate (gameplay), não de render; ficou como **ponto de atenção** abaixo.

**Consequências:** novos `render/{Arena,arenaLayout,arenaThemes,vfxAtlas,battleSource}.ts`; `BattleScene` reescrita; `BattleCanvas` recebe `source`; `App` passa `buildBattleView`. Bundle regenerado (`build:preview`). **Ponto de atenção:** as lutas de início de jogo duram ~1–2 s (ritmo do engine, não alterado) — se parecer rápido demais, o ajuste é do ritmo de combate (candidato a P-0xx), não do renderizador.

### ADR-030 — Rebalanceamento do combate: ataque ≈ 2 s, desgaste real e IAS por nível de item (pós-FASE 13)

**Data:** 2026-10-03 · **Status:** ✅ Aceita · **Tipo:** B/C (balanceamento; tudo em config) · **Pedido:** *"Torne as batalhas mais desafiadoras de modo que o jogador tenha mais dificuldade entre um inimigo e outro, de modo que sem equipamentos o jogador perca mais vida, use mais poções, veja a batalha acontecer mais devagar. Achei a velocidade dos ataques muito rápida também, faça mais moderado (aprox. 2 s por ataque, sendo acelerado por equipamentos, de modo que somente níveis altos consigam ter ataques rápidos)."*

**Diagnóstico (medido).** O combate era real-time 1×, mas T₀ = 1 s e o IAS base por DES (0,02/ponto) deixava o Arqueiro em ≈ 0,8 s já no Nv 1. Sem equipamento a luta on-curve custava só ≈ 10% do HP; a regeneração de PROCURANDO (5%/s ≈ 15% por busca) apagava o desgaste; o herói nunca precisava de poção nem caía. O IAS de equipamento não dependia do nível do item (um Celestial Nv 1 acelerava como um Nv 10.000).

**Decisão (cada número é config editável).**

1. **T₀ = 2000 ms** (`combat.baseActionIntervalMs`): intervalo `2000/(1+IAS)`; limites do IAS mantidos (−0,5…+1,0 ⇒ 4 s…1 s). Vale para heróis, inimigos e chefes.
2. **IAS base mais baixo:** `attackSpeed = (DES−10)×0,01` (era 0,02): sem equipamento todos ficam entre 1,5 e 2 s.
3. **IAS do item cresce com o nível do item** — `equipment.attackSpeedLevelCurve {fullAtLevel 10000, exponent 0,35, minFactor 0,05}` multiplica só a linha de velocidade; `equipment.unit.attackSpeed` 0,02 → 0,035. Resultado medido: Celestial 2,5× (set completo) no Nv 50 ≈ 1,5–1,8 s; Nv 500 ≈ 1,25–1,5 s; Nv ≥ 10.000 ≈ 1,0 s. Raro/comum, em qualquer nível, ficam em 1,6–1,9 s: **ataque rápido é coisa de nível alto com equipamento raro e bom**.
4. **Mais vida perdida, lutas mais longas:** `tower.enemyAttackMultiplier` 0,05 → **0,18**, `enemyHpMultiplier` 2,5 → **2,0**. On-curve sem equipamento: luta de ≈ 14–22 s (era 9–14) e **−21…−36% do HP** (era −6…−12%); tanques ≈ 20–36 s.
5. **Menos cura grátis:** `combat.regenOnSearchingPctPerSec` 0,05 → **0,01** (≈ 3% por busca). Sem poção/equipamento o herói **cai a cada ≈ 5–6 lutas** e vai ao Hub (60 s); comprando Poção Básica com o Coin ele não cai e usa ≈ 0,1–0,2 poção/luta (≈ 30% da renda de Coin do Nv 1). Equipamento continua sendo o remédio: conjunto médio ≈ 8–18% por luta; Celestial 2,5× ≈ 0%.
6. **O ritmo de progressão foi preservado:** o ciclo luta+procura passou de ≈ 15 s para ≈ 25 s, então a curva de XP necessário baixou de `20·(N+30)^1,35` para **`14·(N+30)^1,35`** (Rei e herói). Medido no jogo real: Rei Nv 10 em ≈ 26 min (antes ≈ 24), Nv 50 em ≈ 1,4–1,6 h; pacing total ≈ 1.360 h de ciclo de 25 s (o teste usa `towerPacing(25)`).
7. **Chefes desacoplados da Torre:** novo `boss.towerReference {hpMultiplier 1,8, attackMultiplier 0,065}`. Antes os chefes herdavam `enemyHp/AttackMultiplier` da Torre; mexer na Torre os quebraria em silêncio (a 1ª tentativa deste ADR fez as 3 equipes perderem). Agora a dificuldade deles se edita só ali e em `multipliers` de cada chefe. Recalibrado para o mesmo padrão de antes: 3 heróis vencem com −50…−65% de HP em ≈ 65–80 s (dentro do limite de 120–180 s), 1 e 2 heróis perdem (Gosma cai com 1).
8. **Medição entra no relatório:** seção "Desgaste e poções" em `npm run report:balance` (jogo real, 30 min, com e sem compra de poção); `scripts/balance-report.ts` assume ciclo de 25 s. `configVersion` 7.

**Alternativas rejeitadas:** (a) só dobrar T₀ — as lutas ficariam ≈ 30 s e o desgaste cairia pela metade (menos golpes do inimigo); (b) tirar a regen por completo — faria o 1º minuto de jogo inviável sem poção; (c) IAS de item por nível *linear* — o nível 500 já seria rápido demais; a curva em potência 0,35 segura o meio do jogo; (d) deixar os chefes herdarem a Torre — acoplamento invisível.

**Consequências:** `combat.baseActionIntervalMs`, `attributes.ts`, `equipment.ts` (`attackSpeedLevelCurve`, unidade), `gear.ts` (`attackSpeedLevelFactor`), `tower.ts` (dificuldade, curva de XP), `boss.ts`/`game-core/boss.ts` (`towerReference`), `configVersion` 7; testes `game-core/combat-pace` (novo), `tower-balance` (sustentabilidade reescrita: sem poção cai; Celestial aguenta), `engine/formula`, `engine/heal-revive`; `docs/BALANCE_REPORT.md` regenerado. **Pendente do usuário:** jogar e dizer se o desgaste está duro/leve (alavancas: `enemyAttackMultiplier`, `regenOnSearchingPctPerSec`, `bot.defaults.autoPotion.hpBelowPct`) e se o ataque de 2 s agrada (`baseActionIntervalMs`).

### ADR-031 — HUB em 3 colunas, painel de dados com XP/h·Coin/h·Custo/h e curva de XP com Nv 1→100 ≈ 24 h (pós-FASE 13)

**Data:** 2026-10-03 · **Status:** ✅ Aceita · **Tipo:** B/C (balanceamento + UI; tudo em config) · **Pedido:** *navegação no topo; jogo no centro; equipe à esquerda; chat global (simulado) à direita; sem rolar a página; o painel grande sob o jogo vira um painel pequeno ocultável por botão no canto do jogo, com XP/h, Coin/h e Custo/h; reduzir a curva de XP: Nv 1→100 ≈ 24 h (não 24 h a cada 100 níveis), de modo que um herói Nv 1000 já seja valioso.*

**Decisão — layout.**

1. **Navegação (8 abas) no topo**, acima da barra de XP do Rei. O palco é uma grade `equipe | jogo | chat` com `100dvh`; o canvas Phaser preenche a caixa do jogo (modo RESIZE).
2. **Telas abrem como overlay sobre o jogo** (com "Fechar"; a aba ativa fecha), para a página não rolar: rolagem só dentro do overlay. Estado inicial: nenhuma tela aberta (arena livre). Em luta de chefe o overlay se retira e o painel mostra a luta.
3. **Painel de dados** (`HuntPanel`) compacto sob o jogo, ocultável por botão no canto da arena (`statsOpen` em `tia:settings`). `TowerScreen` perdeu os dados duplicados (ficam inimigos do andar, controles — extraídos para `HuntControls` —, Bot e lista de andares).
4. **Equipe à esquerda** (`TeamPanel`; cards são `div`s, "Gerenciar" abre a tela). **Chat à direita**, recolhível (`chatOpen`).
5. **Chat simulado atrás de `ChatTransport`** (`chat.ts`): `docs/CHAT_SYSTEM.md` §2 proíbe chat falso como solução final; aqui é uma **exceção declarada e temporária** — a UI mostra "simulado — offline", os "jogadores" são fixos, o histórico nasce com um aviso do sistema, a validação (140 caracteres, 1 mensagem/2 s, sem caracteres de controle) é provisória (P-043) e o texto é sempre renderizado como texto. O chat real entra trocando `createChatTransport`.
6. **Telas estreitas:** coluna única; chat em faixa inferior; overlay em tela cheia.

**Decisão — taxas por hora.** `HuntLedger` (`packages/game-core/src/ledger.ts`) recebe do `GameState`: XP do Rei, XP de herói e Coin (recompensa + venda automática de drop) a cada luta vencida, e **custo** a cada consumível usado (Bot ou manual; preço de mercado do momento = `itemPrice(item, nível do Rei)`). Janela móvel `config.hud.ledgerWindowMs` (10 min), aquecimento `ledgerWarmupMs` (60 s; divisor mínimo de 1 min para não exibir "milhões/h"). Não vai para o save (medida da sessão); simulação offline não registra. "Zerar medição" reinicia.

**Decisão — curva de XP (`packages/config/src/tower.ts`).**

| | Antes (ADR-030) | Agora |
|---|---|---|
| XP para sair do nível N (Rei e herói) | `14·(N+30)^1,35` | **`4300·N^0,644`** (potência pura, offset 0) |
| XP por abate (Rei e herói) | `50·(E+3)^0,95` | `50·(E+3)^0,98` |

Calibrada com `simulate`/`towerPacing(25)` (ciclo luta+procura ≈ 25 s) por ajuste dos 3 parâmetros às âncoras do pedido. Tempo acumulado do Rei: **Nv 10 3,8 h · Nv 25 8,2 h · Nv 50 14,1 h · Nv 100 23,8 h · Nv 250 50 h · Nv 500 80 h · Nv 1.000 127 h · Nv 2.500 222 h · Nv 5.000 362 h · Nv 10.000 ≈ 520 h · Nv 20.000 759 h** (era ≈ 1.363 h; Nv 100 era ≈ 2,4–3,5 h). Interpretação adotada de "reduzir a curva": **achatar o crescimento de longo prazo** (total −44 %) e deixar o início MAIS LENTO (Nv 1→100 em 24 h); o tempo acumulado sempre cresce, mas o tempo por 100 níveis cai conforme o Rei avança (efeito inevitável de "24 h para os primeiros 100 e não a cada 100"). Se o jogador quiser o Nv 100 mais cedo ou o Nv 1.000 mais tarde, a alavanca é a base/expoente (3 números). Consequência prevista: slots 2 e 3 abrem em ≈ 3,8 h e ≈ 8,2 h.

**Alternativas rejeitadas:** (a) manter o painel grande com "ocultar" — não resolve a rolagem; (b) chat só com uma caixa vazia — não valida a UX nem o contador de não lidas; (c) o `HuntLedger` gravado no save — taxa de sessão não é progresso e inflaria o save; (d) curva por trechos (tabela) — o tipo `CurveDef` só tem potência; ficou como upgrade futuro anotado em `TOWER_SYSTEM.md` §7.1.

**Consequências:** `GameConfig.hud` (+ validação), `configVersion` **8** (saves antigos migram sem reescrita; o XP em curso dentro do nível é preservado), `GameState.ledgerRates()/resetLedger()`, novos `HuntPanel`, `HuntControls`, `TeamPanel`, `ChatPanel`, `chat.ts`; `App` reorganizado; testes: `ledger.test.ts`, `chat.test.ts`, 5 de layout no `ui-smoke`, `tower-balance` reescrito (âncoras 24 h/127 h/759 h), `browser-smoke` agora afirma o layout (nav acima da barra de XP, jogo entre equipe e chat, dados sob o jogo, página sem rolagem em 1366×768). Pendente: `hud` ainda não faz parte do ContentPack (editável só em `game.ts`); entra com o Painel ADM.

### ADR-032 — Fase "otimização e estilização": roadmap por lotes de 10 gerações e pipeline de arte (pós-FASE 13)

**Data:** 2026-10-03 · **Status:** ✅ Aceita (Gate 0 aprovado em 2026-10-03; F0 implementada — ver ADR-033; **nenhuma imagem gerada ainda**) · **Tipo:** B/C (arte + dados; sem mudança de regra de jogo) · **Pedido:** *roadmap só da etapa "otimização e estilização": arena própria por andar; 5 inimigos por andar com sprite sheet e movimentação fiéis; 5 heróis por classe (≥ 25); ≥ 10 retratos do Rei; botões do HUB estilo videogame antigo; tela de login com fundo próprio e espaço para o Google; **no máximo 10 gerações de imagem por sessão**, parando a cada lote; fundo magenta sólido; documentação própria antes de aplicar; Painel Admin depois.*

**Decisão.**

1. **Documentos:** [`STYLIZATION_ROADMAP.md`](STYLIZATION_ROADMAP.md) (metas M1–M10, ondas, lotes, decisões D1–D9, riscos) e [`ART_PIPELINE.md`](ART_PIPELINE.md) (especificação medida dos sprites, formato, prompts, chroma key, validação, otimização, integração). O Painel Admin (Fase 14) fica **depois** desta fase.
2. **Ciclo do lote (regra do usuário):** 1 lote = 1 sessão = **≤ 10 gerações** (8 planejadas + 2 de reserva); ao fim: parar, processar por script, aplicar no jogo, explicar o que saiu, listar o próximo passo; **só o "lote NN aprovado" do usuário libera o seguinte**. Um contador por lote no `PROVENANCE.md` impede passar de 10.
3. **Escopo por ondas** (a meta literal não cabe em 10 gerações/sessão): **Onda 1** = andares 1–10 completos (50 inimigos, 10 arenas) + UI GBA + login + 12 retratos do Rei + 25 heróis ≈ **83 gerações ≈ 11–13 lotes**; **Onda 2** = andares 11–40 em 6 biomas (≈ 38 gerações); **Onda 3** = andares 11–40 literais (sob demanda, ≈ 142).
4. **Escala por técnica, não por força bruta:** **1 geração = 1 personagem inteiro** (atlas compacto `ita-atlas-v1`, 4 col × 5 linhas: idle/walk/attack/hurt/death, voltado à direita; esquerda por espelhamento), guiado por um **atlas-guia montado das folhas do pack** (movimentação fiel = mesmas poses/âncora/escala); fallback **Opção B** (2 gerações por personagem) decidido no Lote 1 com 3 pilotos. Chroma key `#FF00FF`, normalização, recolor, atlas de paleta e validação de fidelidade são **scripts (0 gerações)**.
5. **Arena por andar vira dado** (`ArenaKit` no config; hoje é `ARENA_THEMES` em código): admin-ready; geometria continua em `ARENA_LAYOUT`.
6. **Heróis:** 5ª classe **Clérigo** (Cura, do OpenRpg) para chegar a 5 × 5; sprite passa a ser **da identidade** (`HeroIdentityDef.assets`), não da classe; os 4 iniciais seguem os do §10 (o resto via `acquisition.ts`); ADR-033 (5ª classe + 25 identidades) é escrita na Etapa F0.
7. **Otimização:** atlas compacto (−78 % de pixels), PNG de paleta, carga por andar, orçamentos (arte ≤ 25 MB; ≤ 24 MB de textura por andar; ≥ 55 fps no desktop) verificados em `check:assets`/`check:preview`/`browser-smoke`.
8. **Texto na arte:** proibido (rótulos em HTML PT-BR, §62); o logotipo pode ser recomposto em HTML se a geração errar as letras.

**Alternativas rejeitadas:** (a) gerar os 40 andares × 5 inimigos literalmente já — ≈ 142 gerações só de Onda 3, sem priorizar o que o jogador vê primeiro; (b) uma geração por animação — multiplicaria os lotes por 5; (c) recolor como "inimigo novo" nos andares 1–10 — contraria "estética única"; (d) manter a classe como dona do sprite — impede 5 heróis distintos por classe; (e) arte via OpenRpg — é framework C#, sem arte.

**Consequências (a implementar após o Gate 0, Etapa F0):** scripts `art:*`, `ita-atlas-v1` + leitura no renderer, `ArenaKit` no config, `EnemySeed.assets`/`HeroIdentityDef.assets`, orçamentos nos checks, ADR-033; `configVersion` sobe quando o config mudar. **Pendente do usuário (Gate 0):** D1 (escopo por ondas), D3 (Clérigo como 5ª classe), nomes/conceitos do roadmap §3.1 e §4.3 e o "go" para F0 + Lote 1.

### ADR-033 — Etapa F0: fundação da fase de arte, elenco de 25 heróis e calibragens medidas (2026-10-03)

**Data:** 2026-10-03 · **Status:** ✅ Aceita (F0 implementada; 0 gerações usadas) · **Tipo:** B/C (infra de arte + dados; sem mudança de regra de jogo) · **Decisor:** delegado ao agente ("tome as decisões e relate") sobre o Gate 0 aprovado.

**O que a F0 entregou.** (1) `scripts/art.mjs` + `tools/art/*` (guia, chave, normalização, validação, contact sheet, `ingest`, seamless, recolor, pack, measure, provenance) com 25 testes; (2) formato `ita-atlas-v1` (1024×1280, 4×5, voltado à direita; inimigo vira por `flipX`) lido pelo renderer (`render/spriteSource.ts`), com **fallback** para as folhas legadas; (3) `ArenaKitDef` no **ContentPack v5** (migração v4→v5) — a arena é dado; (4) `EnemySeed.assets.atlas?` e `HeroIdentityDef.assets?`; (5) `TextureBudget` (96 MB; descarta o que não está em uso) e auditoria no `check:assets` (formato, orçamentos, **manifesto em dia**, ≤ 10 gerações por lote); (6) prova de ponta a ponta no **Chromium real**: um atlas sintético (goblin do pack recolorido, descartado depois) foi baixado, validado e desenhado na batalha virado para o herói.

**Decisões medidas (todas em `tools/art/spec.mjs`, editáveis).**

| Tema | Decisão | Por quê (medido no pack) |
|---|---|---|
| Paleta | O limite de "≤ 64 cores" do plano **caiu**: verificação passa a ≤ 700 cores significativas; as **64 cores só no empacotamento** (`quantize.mjs`) | O pack tem sombreado suave: 433–619 cores significativas (~50–83 mil exatas); só o Arcanista tem 31. Exigir 64 reprovaria o próprio pack |
| Quantização | Quantizador próprio (corte mediano, sem dithering) | O `sharp` ignora `colours` (pedido 64 → 256). Erro médio 3/255; PNG 623 KB → 116 KB (−81 %) |
| Movimento | Erro médio das séries (largura, altura, x do centroide e da base ÷ altura) ≤ 12 % (revisão ≤ 20 %), não correlação | `idle` é quase plano → correlação indefinida |
| Silhueta | IoU ≥ 0,45/0,55; teste de chroma exige > 0,85 contra o guia | A erosão de 1 px da franja rosada custa ~6–10 % de IoU |
| Pixel | `snap` desligado; pixel ≈ 3 px (gosma 4) | Sem grade exata (suavização) |
| Guia | O guia de validação = o arquétipo dado ao gerador (`--kind`) | Guia errado reprova `death`/silhueta de verdade |
| Arena | Kit reduzido ao que o renderer usa (parede, tocha, piso, props, tint); landmark/iluminação/ambiente **reservados**, não criados | Sem placeholders no contrato |

**Elenco de 25 heróis (nomes finais; editáveis em `heroes.ts`).** Cada variação = **delta de atributos de soma zero (|Δ| ≤ 6)** sobre o modelo da classe + **skill assinatura própria** (+ afinidade de arma da classe). Teste de CI proposto: nenhum par da mesma classe repete `(atributos, skill)`. Os 4 iniciais são os do §10 (Aldric/Kaia/Maelis/Vorath, Δ0); **o jogador começa com 1 deles**, os outros 21 vêm do jogo.

| Classe | Existente (Δ0) | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| Guardião `guardian` | Aldric · Contra-ataque | **Borin, Escudeiro da Muralha** (CON+2 STR−4 WIS+2 · *Muralha*: mitigação longa) — *delta ajustado por medição no Lote 1* | **Cavaleiro Rubro** (STR+5 DEX+1 CON−4 WIS−2 · *Carga Rubra*: golpe forte, custa 5 % de HP) | **Monge de Ferro** (DEX+4 WIS+2 STR−2 CON−2 CHA−2 · *Chi Blast*) | **Lorde Cinzento** (STR+3 INT+2 CON−3 WIS−2 · *Dreno Sombrio*: rouba vida) |
| Arqueiro `ranger` | Kaia · Rajada | **Caçador Furtivo** (DEX+5 STR−2 CON−3 · *Backstab*: crítico garantido) | **Besteiro Pesado** (STR+5 DEX−4 CON+1 WIS−2 · *Focus Strike*) | **Guardiã da Floresta** (WIS+4 DEX+1 STR−3 CHA−2 · *Falcão*: multi-hit) | **Arqueiro Nômade** (DEX+2 CON+2 STR−2 CHA−2 · *Flecha do Deserto*: lentidão/veneno) |
| Arcanista `arcanist` | Maelis · Nova | **Piromante** (INT+4 CON−3 WIS−1 · *Fire Bolt*: queima) | **Criomante** (WIS+3 INT+1 DEX−2 CON−2 · *Ice Storm*) | **Tempestuário** (DEX+4 INT+1 CON−3 WIS−2 · *Raio em cadeia*) | **Mago Ancião** (WIS+4 INT+2 CON−3 DEX−3 · *Barragem Arcana*) |
| Invocador `shadowcaller` | Vorath · Maldição | **Necromante dos Ossos** (CON+3 INT+1 DEX−4 · *Gaiola de Ossos*) | **Bruxa do Pântano** (DEX+3 WIS+1 CON−2 INT−2 · *Poison Blade*) | **Ceifeira** (STR+4 INT−2 WIS−2 · *Colheita*: rouba vida) | **Demonólogo** (INT+4 CON−2 DEX−2 · *Fogo Infernal*) |
| **Clérigo `cleric` (nova)** — base STR 10 · DES 10 · CON 20 · INT 14 · SAB 26 · CAR 16, dano mágico, arma `mace`, papel "Suporte / sustain" | — | **Sacerdotisa da Aurora** (Δ0 · *Cura*: cura própria + `regen`) | **Monge Curandeiro** (DEX+4 CON−2 WIS−2 · *Palma Restauradora*) | **Bispo Guerreiro** (STR+6 WIS−4 INT−2 · *Punição*: dano sagrado) | **Druida da Vida** (CON+2 WIS+2 STR−2 DEX−2 · *Florescer*: `regen` forte) |

> Todos os deltas somam zero (conferido); a CI exige poder (resistência × dano) a ±8 % do modelo da classe — o delta inicial de Borin (CON+6…) dava +13 % e foi reduzido. Dependências: a **cura como efeito de skill** ainda não existe no engine (há `regen`/poção); entra junto com o lote do Clérigo (L4), com teste de engine, antes de gastar gerações nele.

**Pendência registrada (não é bug):** `hero-acquisition.ts` ainda não define **qual identidade** o herói recém-obtido recebe (hoje sai só a classe) → ao chegar a arte das identidades, a obtenção por identidade (Market/caixa/summon/Chefe) é uma etapa curta própria (**F0.5**), com teste.

**Alternativas rejeitadas:** (a) paleta de 64 cores como critério de aprovação — reprova o pack; (b) confiar no `sharp` para quantizar — não quantiza; (c) correlação como métrica de movimento; (d) criar já os campos de iluminação/ambiente da arena — contrato com campo sem leitor.

**Consequências:** `configVersion` 8 mantido; ContentPack **schema 5**; save v6 (arenas não entram no save); `check:assets` passa a falhar se a arte gerada não estiver no manifesto (`npm run assets:build`); o Lote 1 só começa com o "go" do usuário.

