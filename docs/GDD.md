# GDD — Game Design Document

**Tower Idle Adventure**
**Versão:** 0.1 · **Data:** 2026-09-30 · **Estado:** pré-produção, nenhum código implementado
**Fonte de autoridade:** [`../Master-Prompt.md`](../Master-Prompt.md)

---

## 1. O que é

Um **RPG 2D idle de auto-batalha e loot para navegador**, com identidade de jogo mobile premium, jogável em desktop e futuramente em Android pelo navegador.

Não é um dashboard, um CRUD, uma planilha gamificada, uma visual novel ou um SaaS com aparência de jogo. O teste de aceitação visual é binário: alguém abre a aplicação e sente **"isso é um jogo"** — não "isso é um sistema web com botões".

**Gênero:** 2D Idle RPG · Auto-Battle · Loot RPG · Tower Progression · Collection RPG · MMORPG assíncrono · Social RPG.

**Plataforma inicial:** navegador desktop. **Plataforma futura:** Android via navegador. Responsividade é requisito desde o primeiro dia (§67, §68).

---

## 2. A fantasia central

O jogador **não é um aventureiro**. O jogador é o **Rei**.

> "Eu sou o Rei. Eu escolho meus campeões, fortaleço meu reino, equipei meus súditos, decido quem enviará para a Torre e construo uma equipe cada vez mais poderosa."

O Rei é uma **identidade e uma meta-personagem**, não um combatente. Ele não aparece na arena. Ele administra. A sua agência é inteiramente indireta: tudo que ele faz, faz escolhendo *quem*, *com o quê* e *contra quem*.

Os personagens jogáveis são **súditos, heróis, campeões**. Eles lutam em nome do Rei.

Essa separação é o que produz todas as decisões interestinges do jogo:

| Decisão | Quem decide | O que o jogador controla |
|---|---|---|
| "Qual herói mando para o andar 40?" | Rei | Investimento individual vs. breadth |
| "Uso o slot 2 agora ou economizo?" | Rei | Oportunidade vs. legado |
| "Vendo o Celestial ou o Incomum com 3 stats bons?" | Rei | Coin agora vs. build depois |
| "Ataco o Boss com 1 herói fraco ou espero os 3?" | Rei | Risco vs. recompensa |

Se o Rei participasse do combate, nenhuma dessas perguntas existiria.

---

## 3. Pilares de design

1. **Administração, não operação.** O jogador configura, decide, observa. Nunca clica para atacar (§56, §58). O combate roda sozinho; o não-clicar é o jogo.
2. **Uma decisão por tela.** Toda tela deve fazer o jogador hesitar entre duas opções defensáveis. Se não há decisão, a tela é complexidade sem propósito (§106).
3. **A Torre testa, a equipe prepara.** A pergunta que a Torre deve gerar é *"qual dos meus heróis é melhor para continuar avançando?"* — nunca *"coloquei os três e esmagaram tudo"* (§107).
4. **Loot tem valor.** O jogador deve pensar *"será que finalmente veio um item bom?"* — nunca *"tenho 300 equipamentos inúteis"* (§108). Equipamento bom é raro e difícil (§34).
5. **Coleção é desejo.** *"Preciso conseguir esse personagem."* Fragmentos, Bosses, eventos e mercado alimentam isso (§109).
6. **Idle é atividade, não tela parada.** Sistemas funcionam continuamente enquanto o jogador administra e observa (§111).
7. **O reino continua.** Fechar o navegador não zera o mundo. Voltar entrega um reino que progrediu (§47).
8. **Identidade, não_TEMPLATE.** Nada de CRUD, nada de cards, nada de estética SaaS, nada de personagem quadrado, nada de emoji como arte (§59, §105).

---

## 4. Loop principal

```
CRIAR REI (nome + skin)
        ↓
ESCOLHER 1 DOS 4 HERÓIS INICIAIS
        ↓
MONTAR EQUIPE (1 slot → 2 no nível 10 → 3 no nível 25)
        ↓
SELECIONAR ANDAR DA TORRE
        ↓
SELECIONAR HERÓI ATIVO  ← a decisão central
        ↓
ENTRAR NA TORRE
        ↓
┌─────────────────────────────────────────┐
│  BATALHA 1×1  (TowerBattle)              │
│    herói  vs  inimigo                    │
│    combate automático                    │
│    skills automáticas                    │
└─────────────────────────────────────────┘
        ↓
   VENCEU?
   ├── não → derrota → equipe retorna ao Reino, perde coerce o progression, loop continua/reinicia
   └── sim
        ↓
VITÓRIA
        ↓
XP DO HERÓI + XP DO REI + COIN + (5%?) EQUIPAMENTO
        ↓
ESTADO "PROCURANDO..."  ~3s  com animação real
        ↓
NOVO INIMIGO
        ↓
REPETE
```

O jogador pode, a qualquer momento durante a animação de procura, abrir inventário, personagem, perfil, equipamentos ou configurações. **O loop não para** (§29).

### Ritmo

- Combate 1×1: **~8 a ~20 segundos** (a ser medido em playtest).
- Procura: **~3 segundos** (2.7s–3.2s, faixa configurável).
- Ciclo completo inimigo-a-inimigo: **~11 a ~23 segundos**.

> **PENDING** — as durações acima são metas de design, não medidas. Devem ser calibradas na vertical slice. Ver [`PENDING_RULES.md`](PENDING_RULES.md#p-001).

---

## 5. O Rei

O Rei representa a conta. Ele tem nome, nível, progresso, recursos, inventário, personagens, equipamentos, progresso da Torre e configurações.

**O nível do Rei é o nível da conta** (§46). Ele controla:

| Nível do Rei | Desbloqueio |
|---:|---|
| 1 | 1º slot de equipe, Torre andar 1 |
| 10 | 2º slot de equipe (requer também Coin) |
| 25 | 3º slot de equipe (requere também Coin) |

**Identidade visual:** retrato/busto PNG, avatar de perfil, com rosto e tórax. Aparece na HUD e no perfil. Não precisa de sprite de corpo completo nem aparece na arena (§4).

**Criação:** nome + skin, no primeiro acesso. Sem customização corporal complexa. A arquitetura permite skins premium, de evento e desbloqueáveis no futuro (§5).

**Nickname:** único em todo o ambiente online, com validação de disponibilidade, normalização e proteção contra abuso (§6). Usado em perfil, chat, rankings, mercado, guilda e arena.

**Regra de uma conta:** 1 conta = 1 Rei. Não criar múltiplos Reis sem necessidade (§8).

---

## 6. Heróis / Súditos

Heróis são **entidades colecionáveis independentes do Rei**. Cada um tem identidade, nome, sprite, retrato, classe, nível, XP, estrelas, skills, atributos, equipamento, arma, progressão, estado e classificação de raridade (§9).

### Os 4 heróis iniciais

O jogador **escolhe 1 dos 4**. Os outros três permanecem indisponíveis e só podem ser obtidos depois pelo sistema geral de aquisição (§10).

> **PENDING (crítico)** — os quatro heróis não estão definidos no `Master-Prompt.md`: nem nomes, nem classes, nem atributos-base, nem skills, nem estilo de combate. Apenas a exigência de que sejam **mecanicamente diferentes**, não só visualmente (§10).
>
> O §105 proíbe explicitamente "criar quatro personagens visualmente diferentes mas mecanicamente iguais". Como a diferença mecânica é o core da identidade do jogo e a escolha inicial precisa ter "impacto real na experiência inicial", **definir os 4 heróis é decisão de produto e precisa de aprovação humana**.
>
> Ver [`PENDING_RULES.md`](PENDING_RULES.md#p-002). Os archetypes sugeridos pelo inventory de assets (Guerreiro, Mago, Arqueiro, Ladino) são **candidatos de arte**, não decisão de design.

### Progressão do herói

- Nível próprio, **independente do nível do Rei** (§45). Nunca misturar os dois XPs.
- Estrelas (`★`) existem como entidade mas a escala 2★–5★ é **PENDING** (§9 lista "estrelas"; o §10 não define a escala).
- Itens do inventário são ilimitados (§13) — sem limite artificial de colecionáveis.

---

## 7. Equipe

A equipe tem **no máximo 3 heróis** (§16). Começa com **1 slot**.

| Slot | Requisito | Custo |
|---|---|---|
| 1 | Nível do Rei 1 | — |
| 2 | Nível do Rei **10** | **PENDING** (configurável) |
| 3 | Nível do Rei **25** | **PENDING** (configurável) |

> **PENDING** — os valores em Coin dos slots 2 e 3 não foram definidos. O §15 exige que sejam "configuráveis" e "não hardcoded", mas não fornece os números. Ver [`PENDING_RULES.md`](PENDING_RULES.md#p-003).

### Por que uma equipe se o combate da Torre é 1×1?

Porque a equipe é uma **ferramenta de gerenciamento e uma decisão de compromisso**, não um multiplicador de poder (§18).

```
Herói A — Nível 20 — forte contra inimigos físicos
Herói B — Nível 15 — forte contra inimigos mágicos
Herói C — Nível 10 — especialista em outro tipo de inimigo
```

Leva-se **um** herói por batalha. Os outros dois ficam esperando. Levar mais gente à Torre significa:

- **Mais flexibilidade** para escolher quem enfrenta o próximo inimigo.
- **Menos XP por herói**, porque o XP é dividido (§20).

Esse é o trade-off central do jogo:

> **Largura (mais heróis listos) vs. Profundidade (um herói muito forte).**

### Divisão de XP

Todos os heróis na equipe recebem XP, mas o total é **dividido** entre eles (§20, §81):

| Time | XP por herói |
|---|---|
| 1 herói | **100%** |
| 2 heróis | **50%** cada |
| 3 heróis | **33,3%** cada |

> **PENDING** — a tabela acima é a leitura mais simples e simétrica da regra, mas o §20 diz que "o sistema exato de divisão deve ser centralizado e configurável" e manda "não espalhar fórmulas". Divisão linear simples é o default provisório; uma curva não-linear (ex.: 100% / 65% / 43%) é alternativa válida e altera muito a estratégia. Ver [`PENDING_RULES.md`](PENDING_RULES.md#p-004).

O trade-off declarado pelo §20: *"quanto mais personagens o jogador leva na equipe, maior é a flexibilidade de progressão, porém menor é a velocidade individual de evolução."*

---

## 8. A Torre

A Torre é o coração do jogo. Os andares representam **dificuldade e progressão dos inimigos** (§22).

### Regra fundamental

> **Combates normais são SEMPRE 1×1.** (§17, §79)

```
1 herói selecionado  ×  1 inimigo
```

**Nunca** 3×1, 2×1 ou 3×3 em batalha normal de Torre. Essa é uma regra de arquitetura, não de preferência: ela é garantida por teste automatizado obrigatório (§79).

### Regra abolida

> **A Torre NÃO possui boss obrigatório em andar 10, 20 ou 30.** (§21, §55)

Essa regra está **explicitamente abolida**. A Torre define dificuldade, inimigos, progressão e recompensas — nada mais. Boss é sistema separado.

### Estrutura

- Andares numerados, com dificuldade crescente.
- Cada andar tem um requisito (nível do Rei, e/ou andar anterior concluído).
- Cada andar sorteia inimigos de um pool.
- Andar desbloqueado permanece disponível para repetição — o jogador escolhe onde farmar.

> **PENDING (crítico)** — número de andares, curva de nível de inimigo, composição de pools, XP e Coin por inimigo **não foram definidos**. Ver [`PENDING_RULES.md`](PENDING_RULES.md#p-005) a `#p-008`.

### Escolha do herói

A UI deve tornar claro, sempre: herói ativo, nível, HP, poder, equipamento, progresso, andar e inimigo atual (§19). **Não assumir que o primeiro personagem sempre luta.**

---

## 9. Boss

Boss é uma **atividade separada** da Torre (§21, §23).

| | Torre | Boss |
|---|---|---|
| **Heróis** | 1 (o ativo) | **Toda a equipe** |
| **Alvos** | 1 inimigo | 1 Boss |
| **Combate** | `1 × 1` | `Equipe × 1` |
| **Área** | Andar da Torre | Boss Arena / Dungeon / World / Guilda / Evento |
| **Frequência** | Contínua | Programada / desafiador |

Essa distinção precisa estar presente em **lógica, documentação, Battle Engine, UI, testes e balanceamento** (§25).

### Fragmentos de personagem

A fonte mais importante de fragmentos é o **Boss** (§12, §54).

> **REGRA ABSOLUTA:** fragmentos de personagem **NÃO dropam de inimigos comuns da Torre** (§12).
>
> Isso é uma regra dura de design e economy, e precisa de teste automatizado (§78 lista "fragmentos" entre os testes obrigatórios). Um fragmento que cai de um slime destrói a fantasia de "preciso daquele personagem" (§109).

**Fontes válidas:** Boss, eventos, caixas, summons, recompensas especiais, mercado.

---

## 10. Equipamentos

Equipamentos são **recursos de valor**, não moeda descartável (§30).

### Princípios

- **Raros.** 5% de chance base de dropar equipamento; 95% dos inimigos não dão nada (§32).
- **Não necessariamente bons.** Um Lendário pode ter rolls ruins. Um Comum com rolls altos pode ser melhor para a build (§34, §35, §38).
- **X individual por atributo.** Nunca "todo atributo tem o mesmo X" (§36).

```text
BASE  ×  RARIDADE  ×  X  =  VALOR FINAL
```

### Raridades

| Raridade | Chance dentro dos drops |
|---|---:|
| Common | 50% |
| Uncommon | 30% |
| Rare | 15% |
| Epic | 4% |
| Legendary | 0.9% |
| Celestial | 0.1% |

Configuração inicial, não regra imutável (§33).

### God rolls

A qualidade final depende de raridade + atributos + X + combinações + função do item + build. Raro não significa perfeito. Esses itens são os realmente valiosos (§35).

Detalhe completo em [`EQUIPMENT_SYSTEM.md`](EQUIPMENT_SYSTEM.md).

---

## 11. Economia

**Coin** é a moeda principal: desbloquear slots, comprar, melhorar, sistemas, mercado, progressão (§43).

> **PENDING (crítico)** — a economia de Coin é uma **decisão de gameplay/economia crítica** (Tipo C, §73). Valores de drop de Coin, preços de slots, preços de venda de equipamento, custos de mercado e taxas além dos 15% já definidos **não foram especificados** e não devem ser inventados. Ver [`PENDING_RULES.md`](PENDING_RULES.md).

### Fontes e sumidouros

A economia precisa ter fontes e sumidouros **claramente documentados** (§43). Estrutura em [`ECONOMY_SYSTEM.md`](ECONOMY_SYSTEM.md).

### Outras moedas

Coin, Diamonds e moedas especiais são previstos. Cada moeda precisa ter origem, uso, limite, persistência, auditoria e regras de segurança documentados (§44).

### XP — dois eixos, nunca misturados

| | XP do Rei | XP do Herói |
|---|---|---|
| Controla | nível da conta, desbloqueios, slots, Tower access | nível do personagem, evolução individual |
| Fonte |{andar concluído, marcos, eventos} | {vitórias na Torre, Boss} |

§45: *"Nunca misturar."*

---

## 12. Idle e Automação

O jogador **não clica em cada ataque** (§56, §58). O loop é:

```
CONFIGURAR → INICIAR → BATALHA → RECOMPENSA → PROCURANDO → NOVO INIMIGO → REPETIR
```

O jogador pode sair e voltar (§57).

### Offline progress

O reino continua funcionando (§47, §48).

| Plano | Offline máximo acumulado |
|---|---:|
| Free | **2 horas** |
| VIP | **8 horas** |

O sistema registra `lastActiveAt`, calcula a duração, **limita**, simula/projeta as recompensas e entrega ao jogador no retorno. O tempo offline não pode gerar recompensa infinita.

> **PENDING (crítico)** — a **taxa de conversão de tempo offline em recompensa** não foi definida. É a decisão mais sensível da economia do jogo (define se o jogo é "idle justo" ou "idle(IP farmável") e impacta a relação com o limite de 2h/8h). Ver [`PENDING_RULES.md`](PENDING_RULES.md#p-011).

---

## 13. VIP

VIP **deve ser mantido no projeto**, com arquitetura criada desde cedo: nível de VIP, benefícios, duração, status, compra futura e recompensas (§49).

Não implementar pagamentos reais até a etapa adequada. Nenhum valor de benefício VIP é definido — é **PENDING** e é Tipo C (§73).

---

## 14. Sistemas sociais e MMO

Chat Global é funcional no MVP **online** (§50). No MVP local, desativado.

**Regra dura:** chat não é UI. Não pode ser um array de mensagens no frontend. O fluxo é:

```
Cliente → Backend/Realtime → Validação → Persistência → Broadcast → Outros clientes
```

O cliente não pode forjar autor, timestamp, permissões ou identidade (§51).

Outros sistemas (§52, §53, §54): guildas, arena/PvP server-authoritative, rankings, mercado da comunidade.

**Mercado:** taxa fixa de **15%**, consumida pelo servidor, como sink econômico (§41). A transação é atômica.

Detalhamento em [`CHAT_SYSTEM.md`](CHAT_SYSTEM.md), [`SOCIAL_SYSTEM.md`](SOCIAL_SYSTEM.md), [`MARKET_SYSTEM.md`](MARKET_SYSTEM.md), [`MMO_SYSTEMS.md`](MMO_SYSTEMS.md).

---

## 15. Direção de arte

O jogo deve parecer um **RPG mobile premium**, não uma aplicação SaaS. Prioridade visual:

1. batalha
2. personagens
3. inimigos
4. efeitos
5. HUD
6. progressão
7. menus

**A batalha precisa ser visualmente percebida** (§60). Não pode ser `Hero: 120 HP / Enemy: 300 HP / -15 / -20 / -25` como experiência principal. Os números podem existir como *suplemento*, mas precisam existir sprites, animações, ataques, impactos, efeitos, movimento, morte e feedback.

**Assets existentes primeiro** (§61). A inspeção do repositório de referência encontrou um pack completo de 422 sprites de qualidade, que é a base adotada. Ver [`ART_GUIDELINES.md`](ART_GUIDELINES.md) e [`ASSET_INVENTORY.md`](ASSET_INVENTORY.md).

**Placeholders** são permitidos só em desenvolvimento interno, e devem ser marcados, documentados e substituídos. **Nunca** entregar o produto final com quadrados, círculos, emojis ou personagens geométricos (§62).

---

## 16. Conta e identidade

| Fase | Autenticação | Persistência |
|---|---|---|
| **MVP local** | Modo Guest | Local (`localStorage` / IndexedDB) |
| **MVP online** | **Google Auth** | Nuvem (Supabase) |
| **Lançamento** | Google Auth como método oficial | Nuvem, server-authoritative |

Arquitetar para provedores futuros sem reescrever (§7, §88).

---

## 17. Princípios de design (checklist de decisão)

Antes de aprovar qualquer feature, três perguntas (§106, §121):

1. **Isso parece um jogo?**
2. **Isso gera uma decisão interessante para o jogador?**
3. **Isso valoriza progressão, coleção, combate ou economia?**

E o teste de falha do §121 — se a resposta a qualquer uma for não, o produto falha:

> O jogador deve sentir: *"Esse é o meu Rei"* · *"Esses são os meus campeões"* · *"Qual deles devo fortalecer?"* · *"Será que esse equipamento é bom?"* · *"Consigo chegar mais longe nessa Torre?"* · *"Preciso daquele personagem"* · *"Vou tentar esse Boss"* · *"Meu reino continuou progredindo enquanto eu estava fora"*.

### O que nunca fazer (§105)

- criar apenas menus, mockups, CRUD
- transformar tudo em cards
- usar estética SaaS
- personagens quadrados, emojis como arte
- batalha só por números
- todo inimigo dropar equipamento
- todo equipamento ser bom
- **3×1 na Torre**
- **boss automático nos andares 10/20/30**
- lógica dentro do React
- confiar no cliente para economia
- hardcodar probabilidades ou custos espalhados
- ignorar AI_STATE ou documentação
- inventar regras econômicas críticas
- deixar placeholders no produto final

---

## 18. Escopo por fase

| Fase | Conteúdo | Gate |
|---|---|---|
| **0 · Inspeção** | repositório, assets, código, docs, gaps | ✅ concluída |
| **1 · Documentação** | este conjunto de docs + AI_STATE | ✅ **concluída** |
| **2 · Fundação** | projeto, estado, serviços, persistence, Battle Engine, renderer, UI, asset pipeline | pendente |
| **3 · Rei** | Rei, nickname, skin, perfil, nível da conta | pendente |
| **4 · Personagens** | 4 iniciais, seleção, atributos, XP, níveis, skills | pendente |
| **5 · Equipe** | slots 1/2/3, seleção de herói ativo | pendente |
| **6 · Combate** | 1×1, engine, dano, skills, feedback visual | pendente |
| **7 · Torre** | andares, dificuldade, inimigos, recompensas | pendente |
| **8 · Searching loop** | Vitória → Recompensa → Procurando ~3s → Próximo | pendente |
| **9 · Equipamentos** | slots, armas, raridades, X, loot, inventário, equipar, vender | pendente |
| **10 · Economia** | Coin, fontes, sumidouros, custos, configuração | pendente |
| **11 · Offline** | lastActiveAt, duração, limite 2h/8h | pendente |
| **12 · Boss** | Boss Arena, Boss Battle, equipe×1, fragmentos | pendente |
| **13 · MVP Local** | vertical slice completo e jogável | pendente |
| **Online** | Google Auth, Supabase, RLS, Cloud Save, Chat, Server Authority | pendente |
| **Social** | chat, guildas, perfis, rankings, mercado | pendente |
| **Market** | anúncios, compra, taxa 15%, histórico | pendente |
| **PvP** | arena, matchmaking, ranking (server-authoritative) | pendente |
| **Monetização** | VIP, Battle Pass, Diamonds, caixas | pendente |
| **Polish** | animações, efeitos, áudio, UX, acessibilidade | pendente |
| **Beta → Lançamento** | escala, moderação, operação | pendente |

Detalhamento em [`ROADMAP.md`](ROADMAP.md).

---

## 19. Definição de sucesso

### MVP local (§118)

O MVP é bem-sucedido quando o jogador puder:

1. criar seu Rei
2. escolher sua identidade
3. escolher 1 dos 4 heróis
4. montar sua equipe
5. desbloquear slots
6. escolher um herói para a Torre
7. entrar em batalha
8. lutar 1×1
9. ganhar
10. receber XP
11. receber Coin
12. eventualmente encontrar equipamento
13. equipá-lo
14. continuar
15. observar a animação Procurando
16. enfrentar o próximo inimigo
17. melhorar seu personagem
18. avançar na Torre
19. fechar o navegador
20. retornar e recuperar progresso offline

### Online (§119)

Google Login + Cloud Save + nickname único + Chat Global + Realtime + Server Authority + Mercado + Segurança.

### Lançamento (§120)

> O jogador é o Rei. Os personagens são seus súditos. Ele escolhe quais campeões evoluir. A Torre testa individualmente cada campeão. Equipamentos são raros e valiosos. Bosses são atividades especiais onde a equipe inteira luta. O reino continua progredindo enquanto o jogador administra sua conta. A economia funciona online. Outros jogadores podem negociar. O chat cria vida no mundo. O jogador pode continuar sua jornada no desktop ou Android pelo navegador.

---

## 20. Decisões de design

### Fechadas pelo Master-Prompt (Tipo A — implementar exatamente)

Todas as regras marcadas como **REGRA**, **FUNDAMENTAL**, **OBRIGATÓRIA**, **PROIBIDO** ou **NUNCA** nas 125 seções. As 20 mais estruturantes:

1. O jogador é o Rei; o Rei não combate
2. 4 heróis iniciais, jogador escolhe 1
3. Heróis ilimitados
4. Equipe de até 3; 1 slot; 2º nível 10; 3º nível 25
5. Torre é **sempre 1×1**
6. Torre **não tem** boss em andar 10/20/30
7. Boss é sistema separado; **toda a equipe** participa
8. XP do Rei ≠ XP do herói
9. XP é **dividido** entre membros da equipe
10. 5% de chance de dropar equipamento
11. Raridades 50/30/15/4/0.9/0.1
12. X é **individual por atributo**
13. Fragmentos **não** dropam de inimigos comuns
14. Estado "Procurando" de ~3s, com animação
15. Navegação livre durante a procura
16. Offline: 2h Free, 8h VIP
17. Google Auth como método oficial
18. Mercado com taxa de 15%
19. Regra de uma conta = um Rei
20. Battle Engine independente da apresentação

### Decisões técnicas já tomadas nesta sessão (Tipo B)

ADR-001 a ADR-008 em [`DECISIONS_LOG.md`](DECISIONS_LOG.md).

### Pendentes de decisão humana (Tipo C)

Ver [`PENDING_RULES.md`](PENDING_RULES.md). Resumo do que mais bloqueia:

| ID | Pendência | Bloqueia |
|---|---|---|
| P-002 | Definição dos 4 heróis iniciais | Fase 4 |
| P-005 | Estrutura da Torre (andares, curva) | Fase 7 |
| P-008 | Valores de XP e Coin | Fase 10 |
| P-011 | Taxa de conversão offline | Fase 11 |

---

## 21. Referências

- [`../Master-Prompt.md`](../Master-Prompt.md) — especificação central
- [`AI_STATE.md`](../AI_STATE.md) — estado vivo e handoff
- [`GAME_SYSTEMS.md`](GAME_SYSTEMS.md) — mapa de todos os sistemas
- [`ROADMAP.md`](ROADMAP.md) — fases e gates
- [`PENDING_RULES.md`](PENDING_RULES.md) — decisões que não podem ser inventadas
- [`DECISIONS_LOG.md`](DECISIONS_LOG.md) — ADR e divergências
- Repositório de referência: <https://github.com/marmitero/tower-idle-adventure> (fonte de assets e decisões técnicas)
