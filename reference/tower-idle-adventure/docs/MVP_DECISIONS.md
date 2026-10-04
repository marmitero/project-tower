# Escopo e decisões fechadas do MVP

**Versão:** 0.3 — fonte visual inicial do MVP registrada
**Status:** baseline de MVP decidido pelo agente a pedido do usuário e sincronizado aos documentos-fonte; serve de referência para pré-produção. Alterações futuras podem ser solicitadas pelo usuário.
**Importante:** isto fecha decisões de design, não afirma que qualquer sistema já foi implementado ou balanceado em runtime.

## 1. Objetivo do MVP

Entregar primeiro uma experiência pequena, completa e segura que prove o loop de preparação, hunt automática, loot, comparação e retorno ao lobby. O MVP é um **RPG PvE individual persistente**: cada conta tem seu próprio estado e mundo de hunt; não há interação entre jogadores.

O MVP deve comprovar:

1. criar/entrar em conta e manter progresso;
2. escolher uma classe, montar equipe de até três e equipar dez slots;
3. selecionar e repetir manualmente um andar;
4. combater automaticamente encontros de 1–3 inimigos usando a fórmula aprovada;
5. obter XP, Coins e equipamentos com raridade/x/traços;
6. configurar poções, revives, skills e retorno após derrota;
7. curar gratuitamente e preparar-se no lobby;
8. manter conteúdo do MVP por painel administrativo sem editar código;
9. impedir que o cliente/browser determine resultados ou altere dados de conteúdo/economia.

## 2. O que entra no MVP

- Web desktop em português brasileiro; tela responsiva básica, mas desktop é o alvo de suporte formal.
- Supabase Auth para contas persistentes e servidor autoritativo Supabase; Game Web e Admin Web separados na Vercel.
- Uma torre/região inicial com 10 andares e 1 tema visual.
- Três personagens/classe iniciais e formação até 3.
- Combate automático e baseline integral de `COMBAT_DESIGN.md`.
- Nível compartilhado da conta/equipe até nível 20; personagens iniciais em 1★.
- Os dez slots de equipamento, nove tipos de arma, todos os atributos, seis raridades, x inteiro independente por atributo e característica em Lendário/Celestial.
- Catálogo inicial compacto, itens pessoais não negociáveis, inventário, comparação, tooltip, nota e poder.
- Drops, XP, Coins, loja NPC somente em Coins, seis poções e três revives.
- Hunt individual no andar escolhido, 1 boss individual recorrente no andar 10, HUD e log da última sessão (até 100 eventos confirmados).
- Painel Administrativo isolado com CRUD sem código dos tipos de conteúdo definidos em `ADMIN_PANEL_SPEC.md`.
- Arte 2D estática: o pack Fantasy Dungeon de Nika Studio, já versionado em `sprites/`, é a base inicial. Assets adicionais poderão ser adicionados/criados posteriormente em lotes de dez; efeitos/animações em código. O inventário e a nota conservadora de licença/atribuição estão em [`../sprites/ASSET_MANIFEST.md`](../sprites/ASSET_MANIFEST.md).

## 3. Fora do MVP (roadmap pós-MVP)

- VIP, Battle Pass, compras pagas, bônus pagos, Diamonds e qualquer pagamento real.
- Caixas de equipamento/personagem, gacha, duplicatas, estrelas 2–5 e fusão de personagens.
- Mercado da Comunidade, venda de itens/personagens/Diamonds, taxas e negociação entre jogadores.
- Chat global/guilda/privado, amizades, guildas, arena PvP, guerra de guildas.
- Boss em equipe, boss da guilda e boss global; o MVP contém somente o boss individual.
- Simulação/recompensas offline; hunt pausa quando o cliente perde conexão/fecha.
- Equipamento + crafting, aprimoramento manual de item, árvore de talentos e nível de skills; crescimento inicial ocorre por nível, equipe, equipamento e loot.
- Eventos ao vivo na experiência do jogador. O painel pode criar/editar rascunhos de eventos, mas o runtime de eventos fica para fase posterior.
- App nativo/mobile e localização além de PT-BR.

Esses sistemas continuam no GDD/Roadmap de longo prazo, mas não bloqueiam a entrega do MVP.

## 4. Conta, progressão e elenco

### Conta e nível

- Alpha fechado por convite; autenticação por Supabase Auth com e-mail verificado (link/OTP). Sem login social ou pagamentos no MVP.
- A conta possui um **nível compartilhado** para os personagens desbloqueados. O perfil, os cards e requisito de andar usam esse nível; isso evita grind separado para companheiros no primeiro corte.
- Elenco inicial: começa com o personagem escolhido, equipe de 1–3 em qualquer ordem, sem duplicatas. Cada personagem desbloqueado recebe e equipa automaticamente um conjunto inicial de 10 itens Comuns nível 1 (arma compatível com sua afinidade), com x rolado normalmente; nenhum item/roster inicial depende de caixa. Perfil novo começa com 300 Coins, 3 Poções Comuns e 1 Revive de 30%.
- Nível 1–20. XP necessária para passar do nível `L` ao seguinte: `100 × L`. Ao chegar ao nível 20, XP extra não eleva nível acima do limite.
- XP de cada inimigo derrotado: `30 + 15 × andar`. Toda a conta recebe a recompensa integral, sem dividir XP pelo tamanho da equipe. Personagens não desbloqueados não recebem ações nem loot.
- Os três personagens MVP são sempre 1★, com dois slots de skill. Estrelas e regras 2★–5★ ficam para pós-MVP.

### Seleção e desbloqueios

- Na criação, escolher 1 entre **Guerreiro, Arcanista e Ladino**; a escolha é permanente no MVP.
- A primeira vitória contra um encontro comum no andar 3 desbloqueia à escolha um dos dois personagens restantes; a primeira vitória comum no andar 6 desbloqueia o último. São marcos permanentes/garantidos, não é necessário “limpar” ou terminar o andar e não usam caixas aleatórias.
- Personagem desbloqueado entra no nível compartilhado atual. A equipe pode ser reorganizada no lobby; qualquer membro ativo participa da batalha.
- Afinidades MVP: Guerreiro → Espada; Arcanista → Cajado; Ladino → Adaga. Qualquer personagem pode equipar qualquer arma; sem afinidade, usa normalmente, apenas sem o bônus de +5% aprovado.

### Stats-base e crescimento por nível

Valores no nível 1; incrementos por nível (percentuais abaixo são pontos percentuais por nível):

| Classe | HP | Ataque | Ataque Especial | Defesa | Defesa Especial | Crítico | Vel. Ataque | Velocidade |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Guerreiro | 180 | 14 | 5 | 12 | 9 | 5% | 0% | 8 |
| Arcanista | 125 | 5 | 16 | 7 | 12 | 8% | 0% | 10 |
| Ladino | 145 | 13 | 6 | 8 | 7 | 12% | 5% | 14 |

| Classe | HP/nível | Ataque/nível | Ataque Esp./nível | Defesa/nível | Def. Esp./nível | Crítico/nível | Vel. Ataque/nível | Velocidade/nível |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Guerreiro | +18 | +2,0 | +0,5 | +1,5 | +1,0 | +0,15 p.p. | +0,25 p.p. | +0,3 |
| Arcanista | +13 | +0,5 | +2,5 | +0,8 | +1,5 | +0,20 p.p. | +0,30 p.p. | +0,5 |
| Ladino | +15 | +1,8 | +0,8 | +1,0 | +0,8 | +0,25 p.p. | +0,45 p.p. | +0,7 |

Crescimento é linear: `Stat(L) = Stat(1) + incremento × (L−1)`. Equipamentos e buffs são somados/aplicados depois; caps de crítico/IAS seguem `COMBAT_DESIGN.md`.

### Skills MVP

As duas skills listadas ocupam os dois slots 1★ e começam habilitadas no bot; o jogador pode desligar cada uma. Sem energia, sem upgrade de skill no MVP. Cooldowns em segundos de simulação; prioridade automática é slot 1 e depois slot 2, usando ataque básico se nenhuma estiver pronta.

| Classe | Slot | Skill | Efeito | Cooldown |
|---|---:|---|---|---:|
| Guerreiro | 1 | Golpe Pesado | Dano físico de coeficiente 1,50 contra alvo único. | 6 s |
| Guerreiro | 2 | Guarda Firme | Multiplica Defesa e Defesa Especial do próprio usuário por 1,20 durante 6 s; reaplicação renova, não acumula. | 12 s |
| Arcanista | 1 | Orbe Arcano | Dano mágico de coeficiente 1,50 contra alvo único. | 4 s |
| Arcanista | 2 | Explosão Astral | Dano mágico em todos os inimigos, coeficiente 0,70 por alvo. | 10 s |
| Ladino | 1 | Corte Duplo | Dois golpes físicos de coeficiente 0,65 no mesmo alvo; críticos independentes. | 6 s |
| Ladino | 2 | Passo Veloz | +20 pontos percentuais de IAS aditivos por 5 s, sujeito ao cap global; reaplicação renova, não acumula. | 12 s |

## 5. Torre, andar e inimigos

### Andares

Uma área inicial — **Torre das Brumas** — com nível mínimo e pools de inimigos. Requisito de acesso: o nível compartilhado da conta deve ser igual ou maior ao requisito. A escolha do andar é manual, sem autoavanço no MVP.

| Andar | Nível mínimo | Tema/pool inicial |
|---:|---:|---|
| 1 | 1 | Slime de Cinza, Goblin Vigia, Morcego de Eco |
| 2 | 3 | Slime de Cinza, Goblin Vigia, Lobo de Bruma |
| 3 | 5 | Goblin Vigia, Morcego de Eco, Lobo de Bruma |
| 4 | 7 | Lobo de Bruma, Esqueleto Sentinela, Orc Quebrador |
| 5 | 9 | Esqueleto Sentinela, Orc Quebrador, Espectro da Torre |
| 6 | 11 | Orc Quebrador, Espectro da Torre, Golem Rúnico |
| 7 | 13 | Espectro da Torre, Golem Rúnico, Mago do Vazio |
| 8 | 15 | Golem Rúnico, Mago do Vazio, Esqueleto Sentinela |
| 9 | 17 | Mago do Vazio, Golem Rúnico, Orc Quebrador |
| 10 | 19 | Pool do andar 9; boss individual recorrente |

Encontros comuns têm 1–3 inimigos. Distribuição por faixa: andares 1–3: 70% um / 25% dois / 5% três; andares 4–6: 50% / 35% / 15%; andares 7–10: 40% / 40% / 20%. Cada inimigo é sorteado uniformemente e independentemente do pool do andar; repetição do mesmo tipo no grupo é permitida. Os pesos de inimigos dentro do pool são iguais no primeiro corte e editáveis pelo Admin Panel. Meta inicial de duração sem consumíveis, no nível recomendado e com gear Comum médio: encontro comum 10–30 s; boss 25–60 s. São metas a medir em G3, não resultados já obtidos; ajuste de números será baseado em playtest.

Inimigos têm stats/nível e ataques configurados como dados. Nível do grupo é o nível mínimo do andar. Não há interação com jogadores no cenário. Baseline numérico nível `L` (inimigos comuns): HP `80 + 22L`; Ataque `7 + 1,2L`; Ataque Especial `6 + 1,2L`; Defesa e Defesa Especial `5 + 0,9L`; Crítico 2%; IAS 0%; Velocidade `8 + 0,5L`. Papel multiplica os stats correspondentes antes do combate:

| Papel | HP | Ataque | Ataque Esp. | Defesa | Def. Esp. | Velocidade |
|---|---:|---:|---:|---:|---:|---:|
| Equilibrado | 1,00 | 1,00 | 1,00 | 1,00 | 1,00 | 1,00 |
| Guardião | 1,35 | 0,85 | 0,75 | 1,25 | 1,25 | 0,90 |
| Ágil | 0,85 | 1,15 | 0,80 | 0,85 | 0,85 | 1,30 |
| Conjurador | 0,90 | 0,75 | 1,30 | 0,90 | 1,10 | 1,05 |

Atribuições iniciais: Slime, Esqueleto e Golem = Guardião; Goblin e Morcego = Ágil; Lobo e Orc = Equilibrado; Espectro e Mago = Conjurador. Guardião/Ágil/Equilibrado usam Ataque físico; Conjurador usa Ataque Especial mágico; todos têm somente ataque básico de coeficiente 1,0 e IAS 0% (intervalo de 2 s). Inimigos escolhem personagem vivo com menor percentual de HP, depois menor HP absoluto, depois slot de equipe. Frações são mantidas no servidor; aplicar piso apenas no dano/HP efetivamente perdido. Ao encerrar encontro, HP de sobreviventes persiste para o próximo; cooldowns ficam prontos e buffs/debuffs/DoTs expiram. Personagem derrotado sem revive permanece caído nos encontros seguintes até cura no Lobby. Templates podem ser ajustados pelo Admin Panel antes de publicação, com versão e auditoria.

### Boss individual

No andar 10, após cada 10 encontros comuns vencidos (contador por conta/andar que persiste ao sair e reconectar), o próximo encontro é **Sentinela da Torre** solo (um inimigo, nível 19); enquanto estiver devido, não há grupo comum. Após derrotá-lo, contador reinicia em zero; se a equipe perder/retirar-se, boss continua devido para a próxima entrada. É repetível e não encerra a hunt nem sobe o jogador de andar. Parte do template comum nível 19, com HP ×6, Ataque ×1,5, Ataque Especial ×1,35, ambas as Defesas ×1,35 e Velocidade ×0,8; Crítico permanece 2% e IAS 0%. Tem ataques básicos, sem fases ou mecânica exclusiva. É imune a Atordoamento; Veneno funciona normalmente, sem redução. Boss concede 5× XP e Coins de um inimigo do andar e garante 1 rolagem de equipamento na tabela de boss do andar 10. Nenhum boss co-op/guild/global no MVP.

## 6. Equipamentos, geração e UI de poder

### Catálogo e nível do item

- Dez slots: Arma + nove slots defensivos/companheiro já definidos. No catálogo inicial: 9 templates de arma (um por subtipo) e 9 templates de outros slots; novos modelos podem ser inseridos pelo painel sem código.
- Cada template tem vetor-base para os oito atributos a nível 1. A tabela abaixo fecha os 18 vetores do catálogo inicial; a ordem é Ataque / Ataque Especial / Defesa / Defesa Especial / Vida / Crítico / IAS / Velocidade. Crítico e IAS são percentuais (armazenados como fração, por exemplo 1% = 0,01). Para nível do item `N`: `Base_i(N) = Base_i(1) × [1 + 0,08 × (N−1)]`. Essa escala ocorre antes de raridade e x.

| Template de arma | Ataque | Atq. Esp. | Defesa | Def. Esp. | Vida | Crítico | IAS | Velocidade |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Espada | 1,5 | 0,2 | 0,3 | 0,3 | 2,5 | 0,4% | 0,4% | 0,8 |
| Adaga | 1,2 | 0,2 | 0,2 | 0,2 | 1,8 | 0,5% | 1% | 1,2 |
| Machado | 1,8 | 0,2 | 0,2 | 0,2 | 2 | 0,3% | 0,2% | 0,4 |
| Maça | 1,2 | 0,2 | 0,3 | 0,2 | 2 | 0,6% | 0,2% | 0,4 |
| Besta | 1,2 | 0,2 | 0,2 | 0,2 | 1,8 | 0,4% | 1% | 0,8 |
| Cajado | 0,2 | 1,5 | 0,2 | 0,4 | 1,8 | 0,4% | 0,4% | 0,8 |
| Livro Arcano | 0,2 | 1,5 | 0,2 | 0,4 | 2,5 | 0,4% | 0,3% | 0,8 |
| Luvas (arma) | 1,2 | 0,2 | 0,2 | 0,2 | 1,8 | 0,4% | 0,6% | 0,8 |
| Garras | 1,3 | 0,2 | 0,2 | 0,2 | 1,8 | 0,4% | 0,6% | 1,2 |

| Template defensivo/companheiro | Ataque | Atq. Esp. | Defesa | Def. Esp. | Vida | Crítico | IAS | Velocidade |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Peitoral | 0,2 | 0,2 | 0,9 | 0,8 | 4 | 0,25% | 0,25% | 0,25 |
| Elmo | 0,2 | 0,2 | 0,5 | 0,5 | 2 | 0,35% | 0,25% | 0,25 |
| Calça | 0,2 | 0,2 | 0,7 | 0,5 | 3 | 0,25% | 0,25% | 0,25 |
| Bota | 0,2 | 0,2 | 0,3 | 0,3 | 2 | 0,25% | 0,35% | 0,8 |
| Luva (armadura) | 0,3 | 0,2 | 0,3 | 0,3 | 2 | 0,35% | 0,6% | 0,5 |
| Colar | 0,2 | 0,3 | 0,2 | 0,2 | 2 | 0,6% | 0,4% | 0,5 |
| Aura | 0,3 | 0,3 | 0,3 | 0,4 | 2,5 | 0,35% | 0,35% | 0,5 |
| Asa | 0,2 | 0,2 | 0,2 | 0,2 | 2,5 | 0,35% | 0,35% | 0,8 |
| Pet | 0,3 | 0,3 | 0,4 | 0,4 | 3 | 0,35% | 0,35% | 0,5 |

- Item dropado na Torre: `itemLevel = min(nívelDaConta, nívelMínimoDoAndar + 2)`. Exige nível de item para equipar: `nívelDaConta ≥ itemLevel`. Equipamento inicial é rolado normalmente por status com x inteiro, como qualquer item obtido.
- Inventário de equipamento: máximo de 300 itens não equipados por conta; itens equipados não contam. Ao atingir 300, concluir encontro atual e recompensas, voltar ao Lobby e bloquear novo encontro até liberar espaço. Itens podem ser descartados permanentemente no Lobby com confirmação; venda/market não existe no MVP.
- Fórmula completa: `ValorFinal_i = BaseTemplate_i(1) × FatorNível × MultiplicadorRaridade × (x_i/10)`. Todo item tem os oito atributos e cada `x_i` é sorteado uniformemente entre 1 e 50 no servidor.
- Raridades e multiplicadores aprovados: Comum 1; Incomum 1,2; Raro 1,5; Épico 2; Lendário 2,5; Celestial 3.

### Característica de raridade

Lendário e Celestial recebem exatamente 1 característica, com chances iguais entre as quatro entradas do pool MVP. Valores independem de raridade e x:

- **Roubo Vital:** cura o portador em 5% do dano direto causado, no máximo uma vez por ação; limitada ao HP faltante; DoT não cura.
- **Ruptura de Guarda:** ataques diretos ignoram 10% da Defesa (Ataque) ou Defesa Especial (Ataque Especial) do alvo.
- **Foco Crítico:** +5 pontos percentuais de chance crítica, sujeito ao cap de 75%.
- **Concentração:** reduz cooldown de skills em 5%; não modifica IAS nem intervalo de ataque.

### Nota e poder

- `QualidadePct = média(x_i / 50) × 100`, com peso igual para os oito atributos. Raridade não aumenta a nota; a nota mede só qualidade das rolagens.
- Faixas: S ≥90; A ≥80; B ≥70; C ≥60; D ≥50; E ≥40; F <40.
- Para calcular o **Poder total de atributos**, primeiro converta chance crítica e IAS para pontos percentuais (`CritPP = crítico ×100`, `IASPP = IAS ×100`):

```text
Poder = Ataque + AtaqueEspecial + 0,75×Defesa + 0,75×DefesaEspecial
        + 0,02×Vida + 1,5×CritPP + IASPP + 0,5×Velocidade
```

Poder de item usa os oito stats finais do item; poder de personagem/equipe aplica a mesma fórmula a stats-base no nível atual + equipamentos equipados + afinidade estática. Não inclui HP atual, buff temporário, característica aleatória nem traço de arma (inclusive Foco Crítico); esses efeitos ficam descritos/comparados separadamente no tooltip. Poder é uma estimativa comparativa, não determinante automático de item.

## 7. Loot, XP, Coins e consumíveis

### Recompensas

- Por inimigo comum derrotado: `XP = 30 + 15×andar` e `Coins = 15 + 5×andar`; creditar cada inimigo quando cair, inclusive se o grupo for interrompido/retirado. Toda a conta recebe a recompensa integral; sem divisão por tamanho da equipe.
- Um grupo comum faz **uma rolagem de equipamento de 15%** somente após derrotar todos os inimigos, não uma por inimigo. Se houver drop, rola raridade e slot/template conforme a tabela. Grupo interrompido não rola item.
- Em faixas 1–3, 4–6 e 7–9, raridades por drop: `Comum/Incomum/Raro/Épico/Lendário/Celestial` = `70/23/6/1/0/0%`, `60/25/12/2,7/0,3/0%`, `45/28/18/7/1,8/0,2%`, respectivamente. Encontros comuns do andar 10 usam a faixa 7–9; o boss usa a tabela própria abaixo.
- Boss do andar 10: tabela `30/25/24/15/5/1%`, total 100%, e drop de 1 equipamento garantido.
- Escolha de slot/template uniforme entre entradas elegíveis no MVP. Admin Panel poderá ajustar pesos com validação de soma 100% para raridades/tabelas onde aplicável.

### Loja NPC de Coins

Somente consumíveis no primeiro corte; nenhum equipamento/caixa comprado e nenhuma moeda Diamante.

| Poção | Cura do HP máximo | Preço Coins |
|---|---:|---:|
| Comum | 20% | 25 |
| Incomum | 30% | 60 |
| Rara | 40% | 125 |
| Épica | 55% | 280 |
| Lendária | 70% | 650 |
| Celestial | 100% | 1.500 |

| Revive | HP restaurado ao reviver | Preço Coins |
|---|---:|---:|
| 30% | 30% do HP máximo | 200 |
| 50% | 50% do HP máximo | 400 |
| Total | 100% do HP máximo | 800 |

Poções curam o personagem que atingiu o limiar; valor limitado ao HP faltante. Revive atua sobre um personagem derrotado, não ressuscita a equipe inteira. Consumíveis têm estoque máximo de 99 por tipo no MVP.

## 8. Bot, derrota e sessão

- Poções: automação ligada por padrão; limiar inicial 50%, configurável de 10% a 90% em passos de 5; lista de raridades permitidas. Gatilho quando personagem vivo fica no limiar ou abaixo; após uma ação que cause dano, verificar alvos em menor percentual de HP (empate: slot à esquerda). Consumir o item permitido de menor raridade cuja cura leve o alvo ao limiar ou acima; se nenhum alcançar, usar o mais forte permitido. Uma poção por decisão e cooldown compartilhado de 5 s.
- Revive: automação desligada por padrão; prioridade por slot de equipe (esquerda para direita); no máximo 1 revive por personagem por encontro. Consumo ocorre quando uma unidade cai, antes de declarar derrota total; se mais de um tipo estiver permitido, usar o que restaure menos HP e preservar o mais forte.
- Skills: duas por personagem e habilitadas por padrão; resolução crescente por slot quando prontas.
- Auto-retorno pós-derrota: disponível para Free, desligado por padrão. Se ligado e a equipe inteira cair, encerrar encontro, voltar ao Lobby, curar a equipe de graça, esperar 5 s e recomeçar **o mesmo andar**. Nunca ascende andar.
- Sem revive e sem auto-retorno: derrota total retorna ao Lobby para cura manual; recompensas por inimigos já derrotados permanecem, mas encontro incompleto não rola equipamento.
- Jogador pode encerrar hunt/retornar ao Lobby a qualquer momento. Isso interrompe o grupo em andamento, preserva XP/Coins de inimigos já derrotados, não rola equipamento por encontro incompleto e cura gratuitamente no Lobby. Loot de grupos já vencidos permanece.
- Histórico da última hunt: persistir no servidor até 100 eventos confirmados, exibir no Lobby e após reconexão; iniciar nova hunt substitui o log. Não há histórico longo de combate no MVP.
- Loja rápida é modal/painel, **não pausa o combate**. Compra é confirmada pelo servidor; item fica utilizável depois da confirmação.
- Sem progresso offline: fechar ou perder conexão pausa na última ação confirmada e não gera XP/Coins/loot até reconectar. Nenhum avanço ou reward pode ser fabricado pelo relógio do cliente.

## 9. Economia, multiplayer e monetização no MVP

- Moeda única **Coins**; sem Diamonds, compras reais, VIP, passe, bônus XP/Farm ou caixas aleatórias.
- Free/invited players only: teste fechado por convite com e-mail verificado. MVP sem anúncios, market ou transferência entre contas.
- Sem chat, amigos, guildas, PvP, guild wars, market comunitário e bosses em equipe/guild/global. Essas funcionalidades permanecem pós-MVP.
- Equipamento e personagens são não negociáveis no primeiro corte; personagens extras são recompensas garantidas por progressão.
- Revisão LGPD/termos e classificação etária ainda é gate antes do beta público; até lá limitar coleta de dados e usar testers convidados.

## 10. Painel Administrativo no MVP

Admin Web separado na Vercel e backend Supabase conforme `TECH_ARCHITECTURE.md` e `ADMIN_PANEL_SPEC.md`. Owner/editor autorizados podem sem código CRUD de equipamentos, personagens, skills, inimigos, boss, andares, pools de encontros/loot, loja/consumíveis e eventos (eventos ficam como rascunho até o runtime pós-MVP). Publicação valida schema/odds, gera versão imutável, mantém auditoria e permite rollback. Jogadores comuns não veem shell, não acessam dados/admin APIs e nunca recebem credenciais administrativas.

## 11. Compatibilidade e critérios de aceite

- Alvo: navegadores desktop recentes Chrome, Edge e Firefox; layout mínimo recomendado 1280×720. PT-BR no lançamento MVP.
- Catálogo inicial: 3 classes/personagens, 2 skills por classe, 10 andares, 9 tipos de inimigo comum + 1 boss, 18 templates de equipamento, 4 características de raridade, 6 poções e 3 revives.
- Um tester convidado consegue concluir: login → selecionar classe → equipar → andar 1 → ganhar loot/XP → usar loja/bot → derrotar equipe → curar e retornar.
- A progressão libera os outros dois personagens na primeira vitória comum dos andares 3 e 6; o boss do 10 pode ser repetido.
- O servidor é a autoridade de combate, XP, loot, Coins, consumíveis e publicação de conteúdo. Retries não duplicam recompensas.
- Um usuário comum não consegue carregar a interface administrativa nem executar operações admin mesmo conhecendo a URL.
- Todos os itens mostram os oito valores finais, raridade, rolagem inteira por atributo, fator derivado, nota, poder e característica; inventário respeita o limite de 300 sem perder drops já concedidos.
- Nenhuma funcionalidade marcada pós-MVP bloqueia essa primeira entrega.
