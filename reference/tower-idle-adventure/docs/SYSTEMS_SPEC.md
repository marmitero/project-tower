# Especificação de sistemas — Tower Idle Adventure

**Versão:** 0.4 — alinhamento com prova de schema G2
**Estado:** baseline de combate aprovado pelo usuário; decisões de produto do MVP fechadas pelo agente sob autorização explícita do usuário. Nada foi implementado ou validado em runtime.

`MVP_DECISIONS.md` é a fonte de verdade para roster, progressão, stats-base, catálogo, nota/poder, loot, loja e comportamento do bot no MVP. `COMBAT_DESIGN.md` é a fonte de verdade para as regras universais de combate e armas. Este arquivo conecta os contratos e identifica sistemas intencionalmente adiados; itens pós-MVP não são dependências da primeira entrega.

## 1. Equipamentos e atributos

### Slots e fórmula

Dez slots: **Arma**, Peitoral, Elmo, Calça, Bota, Luva (armadura), Colar, Aura, Asa e Pet. Subtipos de arma: Espada, Adaga, Machado, Maça, Besta, Cajado, Livro Arcano, Luvas (arma) e Garras. Luvas como arma e Luva como armadura são IDs distintos. Qualquer personagem pode equipar qualquer arma.

Todo item tem Ataque, Ataque Especial, Defesa, Defesa Especial, Vida, Chance Crítica, Velocidade de Ataque e Velocidade; cada atributo recebe `x_i` inteiro e independente de 1 a 50. Para item de nível `N`:

```text
Base_i(N) = Base_i(1) × [1 + 0,08 × (N − 1)]
ValorFinal_i = Base_i(N) × MultiplicadorRaridade × (x_i / 10)
```

Crítico e IAS são frações internamente (por exemplo, 10% = 0,10) e exibidos em percentual. Valores-base dos 18 templates MVP estão tabelados em `MVP_DECISIONS.md`. Precisão decimal é mantida internamente; UI pode arredondar sem alterar a rolagem. Exemplo de tooltip: `Rolagem x: 37; fator aplicado: ×3,7`; x fracionário, como 4,72, nunca é permitido.

| Raridade | Multiplicador |
|---|---:|
| Comum | 1,0 |
| Incomum | 1,2 |
| Raro | 1,5 |
| Épico | 2,0 |
| Lendário | 2,5 |
| Celestial | 3,0 |

Drop MVP: nível do item `min(nível compartilhado da conta, nível mínimo do andar + 2)`. Os dez itens do kit inicial são Comuns nível 1. Requisito para equipar: nível da conta igual ou maior ao nível do item.

### Características e traços

Somente itens Lendários/Celestiais recebem exatamente uma característica aleatória adicional, sorteada com chances iguais no pool MVP; seus efeitos não escalam com raridade ou x. Pool, magnitudes e limites constam em `MVP_DECISIONS.md` (Roubo Vital, Ruptura de Guarda, Foco Crítico e Concentração). Essa característica pode coexistir com o traço intrínseco da arma.

| Tipo | Traço aprovado | Limite principal |
|---|---|---|
| Espada | Contracorte: 20% de chance após receber ataque direto de alvo único; contra-ataca o agressor com dano físico de coeficiente 0,50 do Ataque atual. | Não recursa nem ativa por DoT. |
| Adaga | 20% por ação para aplicar Veneno: 3 pulsos de 10% do Ataque, 1/s. | Não acumula; reaplicar renova; pulsos não critam nem disparam procs. |
| Machado | +15% de dano físico final em ataques básicos e skills físicas. | Não beneficia dano mágico, cura ou DoT. |
| Maça | +10 pontos percentuais de chance crítica. | Teto crítico de 75%; crítico 1,5×. |
| Besta | +20% de IAS aditivo. | Sujeito a cap; não reduz cooldowns. |
| Cajado | Ataque Especial contra todos; coeficiente 1,0 em alvo único e 0,70 por alvo em grupos. | Mitigação e crítico independentes por alvo. |
| Livro Arcano | Ataque básico de Ataque Especial cura portador em 10% do Ataque Especial. | Uma vez por ação; limitado ao HP faltante. |
| Luvas (arma) | 15% por ação para Atordoar e fazer o alvo perder a próxima ação agendada. | Não acumula; imunidades são dados de conteúdo. |
| Garras | Dois golpes de coeficiente 0,60 no mesmo alvo, cada um podendo critar. | Uma ação; outros procs por acerto rolam uma vez. |

Afinidade MVP: Guerreiro/Espada, Arcanista/Cajado e Ladino/Adaga. Com afinidade, +5% multiplicativo no atributo ofensivo principal final da arma. Afinidade nunca bloqueia equipamento. Baseline completo e aprovado está em `COMBAT_DESIGN.md`; aplicação por inimigo/boss no MVP está em `MVP_DECISIONS.md` (Sentinela imune a stun, sem resistência a veneno). Valores podem ser reajustados com evidência de playtest, mantendo registro.

## 2. Nota e poder

Nota e Poder são métricas distintas e informativas; nenhuma delas equipa item automaticamente nem substitui comparação da build.

```text
QualidadePct = média(x_i / 50) × 100
```

Peso igual para os oito atributos; raridade e traços não alteram Nota. Faixas: S ≥90; A ≥80; B ≥70; C ≥60; D ≥50; E ≥40; F <40.

```text
CritPP = ChanceCrítica × 100
IASPP  = VelocidadeDeAtaque × 100
Poder = Ataque + AtaqueEspecial + 0,75×Defesa + 0,75×DefesaEspecial
        + 0,02×Vida + 1,5×CritPP + IASPP + 0,5×Velocidade
```

A mesma soma dos oito stats finais calcula o poder total de personagem/equipe. Características condicionais e traços de arma não entram no número; devem ficar visíveis em texto separado no tooltip para não sugerir previsão de combate que a métrica não oferece.

## 3. Loot e geração

Pipeline canônico do servidor: identificar recompensa de encontro; rolar a chance de drop; escolher raridade conforme tabela do andar/boss; escolher template elegível uniformemente; definir nível de item; sortear oito `x_i` inteiros independentes de 1–50; se Lendário/Celestial, sortear uma característica do pool; persistir seed/versão/origem e calcular Nota/Poder. Tabelas e probabilidades completas estão em `MVP_DECISIONS.md`; resultados precisam ser reprodutíveis para seed e versão iguais.

**Não há caixas/gacha no MVP.** Caixas de equipamento/personagem e seus odds completos, duplicatas, proteção e transparência são pós-MVP, não endpoints ou interface a serem entregues na primeira versão. Arte não é procedimental: identidade visual usa assets estáticos aprovados; apenas rolagens e seleção de dados são aleatórias no servidor.

## 4. Personagens e estrelas

MVP contém Guerreiro, Arcanista e Ladino, todos 1★, dois slots/skills cada, nível compartilhado da conta 1–20 e desbloqueios garantidos na primeira vitória comum dos andares 3 e 6. Cada conta começa escolhendo um personagem; roster, crescimento, skills, valores e kit inicial estão em `MVP_DECISIONS.md`. Sem energia, upgrade de skill, duplicatas ou fusão no MVP.

Estrelas 2★–5★, slots adicionais, bônus de 5★ e fusão de duplicatas pertencem a uma fase posterior. Referência histórica de design para eventual evolução: 1★=2, 2★=3, 3★=4, 4★=5, 5★=5 slots e +20% dano de skills; proposta de fusão seria duas unidades idênticas na mesma estrela consumidas para criar a seguinte, limitada a 5★. Nenhuma dessas regras está habilitada no MVP; custo, UX, confirmação e proteção contra perda terão de ser revisados antes dessa fase.

## 5. Combate automático e bot

### Resolução

Usar o baseline aprovado em `COMBAT_DESIGN.md`: dano físico/mágico `PoderOfensivo × coeficiente × 100/(100+Defesa)`, crítico efetivo limitado a 75% e multiplicador 1,5×, Velocidade para ordem inicial, IAS para intervalo `2,0/(1+IAS)` com cap −50% a +100%, alvo automático por menor percentual de HP e desempates determinísticos. Cálculos do servidor são autoridade; o cliente apenas apresenta eventos confirmados.

O MVP tem encontros de 1–3 inimigos, combate encadeado no mesmo andar selecionado, 3 personagens no máximo e boss individual recorrente no andar 10. Entre grupos, HP dos sobreviventes persiste, cooldowns ficam prontos, efeitos expiram e personagem caído sem revive permanece caído até a cura no Lobby. XP/Coins são creditados por inimigo derrotado; equipamento só é rolado após vitória do grupo. Stats/níveis/papéis de inimigos estão definidos em `MVP_DECISIONS.md`. O servidor emite eventos para dano, crítico, procs, status, morte e recompensa. Não há PvP, combate cooperativo ou jogador visível no cenário pessoal.

### Skills e consumíveis

Skills usam prioridade fixa crescente pelo número do slot; se nenhuma estiver pronta e habilitada, personagem usa ataque básico. As duas skills e cooldowns de cada classe estão na tabela MVP; não há energia nem prioridade configurável no primeiro corte.

- Poções ligadas por padrão; limiar padrão 50%, configurável de 10% a 90% em passos de 5. Usar item permitido de menor raridade que satisfaça o limiar; se nenhum satisfizer, usar o mais forte permitido. No máximo uma poção por decisão, cooldown compartilhado de 5 s.
- Revive desligado por padrão; consumir quando um membro cair, antes de declarar derrota total, prioridade por slot esquerda→direita e máximo de um revive por personagem por encontro. Restaura a fração do HP máximo indicada pelo consumível.
- Retorno automático desligado por padrão. Quando ligado, equipe toda derrotada volta ao Lobby, cura gratuitamente, espera 5 s e recomeça o mesmo andar; nunca avança automaticamente.
- Sem revive/retorno, volta ao Lobby para cura manual; recompensas já concedidas por inimigos derrotados persistem; encontro interrompido não rola equipamento.
- Loja rápida é modal e não pausa combate. Compra só é considerada concluída após confirmação do servidor.
- Sem progresso offline: desconexão/fechamento congela no último evento confirmado; nenhum XP, Coins ou loot pode ser gerado pelo relógio do cliente.
- Saída manual encerra hunt em qualquer momento; inimigos já derrotados mantêm XP/Coins, encontro incompleto não rola equipamento e Lobby cura gratuitamente. Inventário máximo de 300 itens não equipados; cheio, retorna ao Lobby após grupo atual.

As configurações exatas e mensagens de UI também estão em `MVP_DECISIONS.md`; sua implementação, idempotência e testes continuam pendentes de produção.

## 6. Progressão, economia e escopo do produto

MVP: uma moeda (Coins); XP de inimigo `30 + 15×andar`; Coins `15 + 5×andar`; XP para subir de `L` para `L+1` igual a `100×L`; cap nível 20; loja NPC vende somente seis poções e três revives. Preços, cura, odds, boss, login por convite e kit inicial são especificados integralmente em `MVP_DECISIONS.md`. Sem materiais, Diamonds, pagamentos, VIP, passe, caixas, market ou transferências entre contas.

VIP e pass, bônus de XP/farm, moedas premium, lojas pagas, mercado e recursos competitivos são pós-MVP. Qualquer conteúdo desse grupo só entra após escopo explícito, modelo econômico, privacidade/conformidade e proteção técnica aprovados. Não supor que proposta antiga no GDD equivale a sistema ativo.

## 7. Market comunitário (pós-MVP)

Não pertence ao MVP. Para eventual implementação futura, preservam-se estes invariantes técnicos: compra atômica (validar anúncio/saldo/propriedade, debitar/creditar, transferir item e marcar vendido numa transação idempotente); servidor não confia em preço/saldo/propriedade enviados pelo cliente; catálogo, taxas, limites e expiração são validados no servidor; retries/desconexões não duplicam; fraude, bots e ações administrativas têm logs e rate limits. Diamantes negociáveis exigem controles adicionais de fraude e inflação.

## 8. Conta, sessão e backend

Stack aprovada: Game Web e Admin Web separados na Vercel; Supabase Auth, PostgreSQL, Edge Functions e Storage no backend/servidor, Realtime se necessário. O cliente envia intenções, nunca determina dano, cooldown, loot, XP, saldo, consumo ou propriedade. RLS, roles, segredo de serviço e APIs administrativas seguem `TECH_ARCHITECTURE.md` e `ADMIN_PANEL_SPEC.md`.

Jogadores não podem ver/acessar o Admin Web nem suas APIs. O CMS no-code cria e publica, sem editar código, os tipos de conteúdo MVP suportados; ainda não foi implementado. A migration-base de schema e RLS passou smoke tests limitados via PGlite; o usuário relata registro no histórico e tabelas em `public`, forte evidência de aplicação no projeto dev, mas ainda não há teste contra Data API/Auth reais. O onboarding é browser-first: o usuário relata Supabase dev conectado ao repo `marmitero/tower-idle-adventure`, Working Directory `.`, Deploy to production ON e Production branch `main`; Automatic Preview/Branching está desligado por limitação do plano. O agente não acessou o Dashboard independentemente; o usuário confirmou a branch `main` e as evidências de schema descritas no AI_State. Não exigir instalação local de CLI/Docker. Versionamento, APIs, transações, Admin, backup/restore, limites, MFA, custos e segurança continuam pendentes de G2; ver evidências/limitações em [`G2_TECHNICAL_BLUEPRINT.md`](G2_TECHNICAL_BLUEPRINT.md) e [`THREAT_MODEL.md`](THREAT_MODEL.md).

## 9. HUD e autoridade

`HUD_UX_SPEC.md` define estrutura visual e view-model. No MVP, a interface prioriza lobby, perfil/nível/Coins, equipe, inventário/equipamentos, skills, torre, hunt, loja NPC/modal e log da última hunt (até 100 eventos, persistido até começar outra). Abas sociais, VIP, Diamonds, market, guilda, arena e chat ficam ocultas até suas respectivas fases pós-MVP. A UI só comunica sucesso após confirmação do serviço autoritativo.

## 10. Contratos para testes futuros

- Cada stat de item é `Base(1) × fator nível × raridade × x/10`, com oito x inteiros independentes em 1–50.
- Personagem pode equipar qualquer subtipo; afinidade não bloqueia e concede +5% ao atributo ofensivo principal.
- Contracorte tem 20%/50% do Ataque e não recursa/não ativa em DoT; os outros oito traços respeitam seus gatilhos e limites em `COMBAT_DESIGN.md`.
- Só Lendário/Celestial recebe uma característica, independente de raridade/x; só uma escolha do pool igualitário.
- Nota, Poder, XP, loot e combate são reproduzíveis para mesmo estado, seed e versão de conteúdo.
- Tabelas configuradas totalizam 100%; retries não duplicam recompensa, consumo, progressão ou transação.
- Batalha encerra/pausa de forma idempotente ao perder conexão e não gera reward offline.
- Jogador comum não carrega Admin Web nem executa API administrativa.

Nenhum teste de runtime foi executado porque o jogo ainda não foi implementado. Implementação, testes automatizados e playtests são saídas futuras dos Gates G2/G3/G4.

## 11. Registro e manutenção

Atualizar este documento apenas junto às decisões-fonte. Alterações de escopo/valores MVP devem ser refletidas em `MVP_DECISIONS.md`, `GDD.md`, `ROADMAP.md` e `AI_STATE.md`; alterações universais de combate também em `COMBAT_DESIGN.md`. Ler `AI_STATE.md` antes de cada etapa e fechar cada etapa com commit e push na branch obrigatória, registrando testes reais e limitações.
