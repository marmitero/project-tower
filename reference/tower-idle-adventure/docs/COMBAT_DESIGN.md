# Combate automático e balanceamento de armas

**Versão:** 0.2 — baseline de combate para o MVP
**Estado:** núcleo de combate e parâmetros de armas aprovados pelo usuário; roster, stats-base, skills e políticas MVP complementados em [MVP_DECISIONS.md](MVP_DECISIONS.md). Ainda não implementado nem validado em runtime/playtest. O baseline poderá ser reequilibrado no futuro mediante evidência e registro.

Este documento é a referência para regras universais de combate automático. Decisões de aplicação específica do MVP ficam no documento de escopo; decisões para modos pós-MVP (PvP, bosses adicionais) permanecem explicitamente fora do lançamento inicial. Aprovação documental não significa implementação pronta.

## 1. Princípios e convenções

- O servidor/simulador resolve o combate; a HUD só apresenta eventos e envia configurações.
- Atributo **Ataque** escala dano físico; **Ataque Especial** escala dano mágico. Defesa física e Defesa Especial mitigam o tipo correspondente.
- Equipamentos fornecem seus oito atributos através da fórmula aprovada de raridade e rolagem x inteiro independente para cada atributo. Traços do tipo de arma são um efeito separado, fixo por subtipo e não multiplicado pelo x do item nem pela raridade.
- Todos podem usar qualquer arma. Afinidade dá uma vantagem moderada, nunca é requisito para equipar.
- Resultados são reprodutíveis para estado e seed iguais; empates usam uma ordem estável. O baseline de design está fechado para G1; encontros com 1, 2 e 3 inimigos devem ser simulados e playtestados na vertical slice antes de qualquer declaração de balanceamento final.

## 2. Fórmulas-base aprovadas

### Dano físico e mágico

Para ataque direto sem crítico:

```text
DanoBase = PoderOfensivo × CoeficienteDaAção × 100 / (100 + DefesaAlvo)
DanoFinal = max(1, floor(DanoBase × ModificadoresDeDano))
```

- `PoderOfensivo` é Ataque contra Defesa, ou Ataque Especial contra Defesa Especial.
- `CoeficienteDaAção` é 1,0 para ataque básico normal; skills e traços podem declarar outro coeficiente.
- Defesa não fica negativa. Com Defesa 100, o alvo recebe metade do dano pré-modificadores; com Defesa 300, recebe um quarto. A fórmula reduz retornos sem tornar defesa infinita.
- Ataques básicos acertam sempre na proposta inicial, pois não há atributo de precisão/evasão no conjunto definido. Esquiva só existe se uma skill/efeito a declarar.
- Calcular com precisão decimal e arredondar para baixo ao aplicar HP; um golpe que acertou causa no mínimo 1 de dano.

### Crítico

- Chance efetiva = chance crítica acumulada do personagem + modificadores planos do tipo de arma, limitada a **75%**.
- Crítico multiplica o dano final mitigado por **1,5**, depois dos modificadores de dano. Multiplicador crítico adicional, se existir no futuro, é um efeito separado.
- Maça adiciona **10 pontos percentuais** de chance crítica como valor inicial de playtest, antes do limite.

### Velocidade e frequência de ação

Separar os dois atributos para que tenham funções claras:

- **Velocidade:** define a ordem inicial de ação no começo de cada encontro; maior valor age primeiro. Empate: desempate estável por formação/slot e, se ainda necessário, seed de combate.
- **Velocidade de Ataque:** define a recorrência depois da primeira ação: `intervalo = T0 / (1 + IAS)`, com `T0 = 2,0 s` e `IAS` convertido de percentual para fração. IAS efetivo limitado a `-50%…+100%`, dando intervalo de `4…1 s` e evitando loops extremos. Ações de skills usam o mesmo intervalo; cooldowns são medidos em tempo de simulação e não são reduzidos por IAS.
- A unidade que age recebe seu próximo horário pelo intervalo próprio; quando vários eventos empatam, Velocidade e a ordem estável decidem. Para o MVP, o servidor só avança enquanto existe sessão de jogo conectada: perder a conexão/fechar o cliente congela no último evento confirmado, sem rewards offline. O modelo de relógio e reconexão será detalhado tecnicamente no G2, sem mudar essa regra de produto.

Os valores (`T0` e caps) fazem parte do baseline aprovado; o balanceamento pode ajustá-los futuramente após medir duração/legibilidade junto às bases de atributos por nível.

## 3. Alvos e skills automáticas — baseline aprovado

- Ataque básico de alvo único prioriza o inimigo com menor percentual de HP restante; empate: menor HP absoluto, depois posição/ID estável. Skills em área usam a lista de alvos declarada pela skill.
- Skill de cura, se houver, prioriza aliado vivo com menor percentual de HP; empate por posição/ID estável.
- O jogador pode ligar/desligar a automação de cada skill equipada. Quando chegar a vez da unidade, ela usa a skill habilitada e pronta de menor número de slot; se nenhuma estiver pronta/habilitada, faz ataque básico. Isso oferece comportamento determinístico até existir uma configuração de prioridade.
- Custo de recurso, cooldown e condições adicionais são declarados por skill. O ataque básico não consome energia.
- Revives e poções são regras automáticas independentes da rotação de ataque; seus gatilhos e ordem precisam ser implementados sem consumo duplicado no mesmo evento.

## 4. Traços de arma — parâmetros iniciais para playtest

Os valores abaixo são o **baseline de design aprovado** pelo usuário, não uma promessa de equilíbrio matemático definitivo. Todo efeito deve produzir evento visual/log legível. Traços não escalam diretamente com raridade nem com x; bônus explícitos são constantes do tipo de arma. Alterações posteriores devem vir de playtests e ser registradas como decisão.

| Arma | Atributo usado e efeito proposto | Regras para evitar abuso |
|---|---|---|
| **Espada — Contracorte** | **Validado pelo usuário:** ao receber um ataque direto de alvo único, 20% de chance de contra-atacar o agressor com dano físico de coeficiente 0,50 (50% do Ataque atual). | Reação não consome nem reinicia o intervalo de ataque; não ativa contra si própria e não dispara por dano ao longo do tempo. Usa a fórmula física e pode critar conforme a chance do personagem. |
| **Adaga — Veneno** | Ataque físico; 20% de chance por ação de arma de aplicar veneno: 3 pulsos, um por segundo, cada um com coeficiente 0,10 de Ataque físico (antes da mitigação). | Veneno não acumula; reaplicar renova a duração. Pulsos não critam e não acionam outros efeitos “ao acertar”. MVP: Sentinela da Torre recebe o efeito sem resistência; resistência para bosses futuros/PvP é conteúdo pós-MVP. |
| **Machado — Dano aumentado** | Ataque físico; +15% de dano físico final em ataques básicos e skills físicas. | Não aumenta dano mágico, cura nem dano periódico; bônus é multiplicativo com a fórmula da ação. |
| **Maça — Crítico aumentado** | Ataque físico; +10 pontos percentuais de chance crítica efetiva. | Respeita teto de 75%; não aumenta dano crítico (permanece 1,5×). |
| **Besta — Velocidade de ataque** | Ataque físico à distância; +20% de IAS aditivo antes do limite global de IAS. | Não muda Velocidade/iniciativa nem reduz cooldown de skill. |
| **Cajado — Área** | Ataque Especial/Defesa Especial; atinge todos os inimigos. Contra um único alvo, coeficiente 1,0; havendo 2 ou mais, cada alvo recebe coeficiente 0,70. | Todos os alvos resolvem mitigação/crítico separadamente; sem multiplicar eventos de proc por alvo. O valor AoE deve ser testado com grupos de 1–3. |
| **Livro Arcano — Sifão Arcano** | Ataque Especial; após ataque básico mágico que acerta, cura o próprio portador em `floor(0,10 × Ataque Especial)`, limitado ao HP faltante. | Uma cura por ação, não por alvo/skill/instância de dano; não cura aliados nesta proposta. Nome é provisório. |
| **Luvas — Atordoamento** | Ataque físico; 15% de chance por ação de arma de atordoar o alvo, fazendo-o perder a próxima ação agendada. | Uma rolagem por ação; stun não acumula. MVP: Sentinela da Torre é imune; inimigos comuns não têm resistência. Configuração de bosses futuros/PvP é pós-MVP. |
| **Garras — Golpe duplo** | Ataque físico; faz dois golpes consecutivos de coeficiente 0,60 cada contra o mesmo alvo (120% total antes de crítico). Cada golpe pode critar separadamente. | Conta como uma ação para cooldown/IAS; outros procs “ao acertar” rolam uma vez por ação, evitando dobrar veneno/efeitos acessórios. |

**Por que a Espada:** Contracorte cria uma identidade reativa e confiável no auto-combate, recompensa permanecer lutando e não se confunde com veneno da Adaga, dano do Machado, crítico da Maça, área do Cajado ou ataque duplo das Garras. Os valores de 20%/50% foram confirmados junto com o conceito pelo usuário; ainda podem ser ajustados futuramente por balanceamento sem mudar a identidade.

## 5. Afinidade de arma — baseline aprovado

- Afinidade não bloqueia equipamento. Personagem pode ter **uma afinidade de arma ou nenhuma**; esse dado fica na ficha do personagem.
- Com a arma correspondente equipada, recebe **+5% multiplicativo no atributo ofensivo principal** final: Ataque para Espada/Adaga/Machado/Maça/Besta/Luvas/Garras; Ataque Especial para Cajado/Livro Arcano.
- Afinidade não altera os rolls x, bases, raridade, chances de proc, número de alvos ou número de golpes. Como aumenta o atributo principal, melhora indiretamente dano (e cura do Livro Arcano, quando pertinente).
- A regra e o bônus de 5% estão aprovados. Afinidades MVP: Guerreiro/Espada, Arcanista/Cajado e Ladino/Adaga; roster detalhado em `MVP_DECISIONS.md`.

## 6. Interações e estados

- Efeitos de arma, skills, características Lendárias/Celestiais, poções, revive e VIP devem ter `id`, fonte, alvo, duração, limite/stack e regra de dispel explícitos.
- Efeitos de dano periódico resolvem dano usando o tipo/defesa documentados, não causam crítico e seguem regra explícita de acumular/renovar (veneno não acumula; nova aplicação renova).
- Atordoamento pula uma única ação agendada do alvo e então expira. Aplicações consecutivas não estendem a duração.
- Quando um alvo morre, ações/cooldowns do alvo são cancelados e seus efeitos periódicos expiram.
- Resistência/imunidade é definida por configuração de conteúdo, não por exceção codificada. Aplicação MVP fechada: Sentinela da Torre é imune a Atordoamento e recebe Veneno sem resistência; PvP e outros bosses não fazem parte do MVP.

## 7. Implementação e validação ainda necessárias

O baseline de design MVP está fechado nos documentos `COMBAT_DESIGN.md` e `MVP_DECISIONS.md`; os itens abaixo são tarefas futuras de produção, não decisões abertas para iniciar o MVP:

1. Implementar fórmulas/estados, rotação de skills, buffs, curas, procs e eventos visuais em servidor autoritativo.
2. Criar testes determinísticos de dano, mitigação, crítico, IAS, alvo, contra-ataque, veneno, stun, cooldown, morte/revive e reconexão.
3. Simular e playtestar os parâmetros na vertical slice; medir duração/clareza e registrar qualquer ajuste com evidência e versão, sem reabrir decisões silenciosamente.

O usuário aprovou o baseline deste documento, incluindo Contracorte (20% / 50% Ataque), os demais traços, fórmulas-base e afinidade de +5%. A implementação e validação de runtime ainda não aconteceram.
