# HUD / UX — arquitetura visual da tela principal

**Versão:** 0.3 — arquitetura e click-through UX G2
**Estado:** HUD de jogo não implementada; wireframes e protótipo não funcional em [`G2_UX_BLUEPRINT.md`](G2_UX_BLUEPRINT.md) e `prototypes/g2-hud/index.html`. Teste de usabilidade com participantes ainda não ocorreu; G2 não está concluída.

Esta especificação transforma o briefing de interface em arquitetura de layout e componentes. É conceitual, original e não reproduz arte, ícones, personagens ou identidade de outro jogo. Ainda não fixa framework, medidas em pixels ou design visual final.

## 1. Objetivo e princípios

A HUD dá suporte ao loop **preparar → equipar → configurar automação → escolher andar → lutar automaticamente → obter XP/loot → melhorar**. Em cerca de dois segundos, a pessoa deve identificar perfil/nível, poder da equipe, personagens vivos/HP, andar/encontro, automação e loot recente. Chat não existe no MVP; será tratado como módulo separado em fase posterior.

Princípios:

- Batalha no centro e maior área visual; estado da equipe imediatamente legível.
- Informação essencial sempre visível; detalhes de atributos, comparação, odds, skills e inventário em painéis secundários/tooltips.
- Mesma estrutura de navegação e painéis no lobby e na hunt; muda o conteúdo central, não a orientação espacial.
- Painéis podem ser recolhidos; em telas menores a batalha conserva prioridade.
- Cada estado importante usa mais de um sinal visual, não apenas cor; reduzir efeitos/piscadas respeitando movimento reduzido.
- HUD apresenta o estado de sessão recebido do jogo; regras de combate/economia não são executadas nem validadas visualmente pelo cliente.

## 2. Arquitetura espacial proposta

### Desktop

1. **Barra superior persistente**
   - **Esquerda:** perfil compacto — avatar/nome, nível compartilhado/XP, poder total e Coins. Sem VIP, Diamonds ou buffs pagos no MVP.
   - **Centro:** navegação MVP: Lobby, Personagem/Equipe, Inventário/Equipamentos, Skills, Torre e Loja NPC. Social, market, guilda, arena, bosses compartilhados e monetização ficam ocultos até fases posteriores.
   - **Direita:** painel compacto de Automação, recolhível, com estado geral e atalhos para configurações/consumíveis.
2. **Coluna lateral esquerda persistente, abaixo do perfil**
   - Equipe `n/3`; três cards compactos no máximo, com sprite, nome, estrelas, nível, HP, poder, buffs/debuffs e indicador de skill/cooldown quando relevante.
   - Personagem derrotado exibe texto/ícone de derrota além de HP vazio; não depender apenas da cor.
3. **Área central de gameplay**
   - Cabeçalho discreto do andar: número/nome, nível mínimo e resumo de tempo, inimigos derrotados, loot e Coins da sessão; inclui atalho visível de loja rápida no canto superior durante a hunt.
   - Palco da batalha com sprites, inimigos, HP, animações/efeitos em código, números de dano e feedback de habilidade/arma.
   - No lobby, o palco é substituído pela HUB/área de preparação; atalhos levam a cura, equipe, equipamento, skills, loja e escolha de andar.
4. **Faixa inferior central**
   - Log da hunt mais recente, compacto, rolável e minimizável, com até 100 eventos confirmados; permanece no Lobby e após reconexão até iniciar outra hunt. Sem histórico longo no MVP. Eventos importantes podem gerar aviso não bloqueante.
5. **Canto inferior direito**
   - No MVP, usar para avisos/estado de conexão e alertas de sistema; chat é pós-MVP e não aparece como módulo desativado na interface.
6. **Camada de painéis/overlays**
   - MVP: inventário, personagem/equipe, equipamentos, skills, torre, loja NPC e loja rápida. Loja rápida mantém a batalha visível ao fundo e, conforme decisão fechada, não pausa combate. Outros módulos são pós-MVP.

Os painéis laterais e a barra superior mantêm posição sem impor dimensões finais. A grade deve encolher/reorganizar por breakpoint e permitir recolher equipe/chat/automação. Em viewport estreito, atributos secundários e mensagens/avisos antigos saem antes da batalha e HP da equipe; equipe e automação ficam recolhíveis.

## 3. Árvore de componentes proposta

Nomes abaixo descrevem responsabilidades, não obrigam framework:

```text
GameHudShell
├── PersistentTopBar
│   ├── PlayerProfilePanel
│   │   ├── AvatarAndIdentity
│   │   ├── LevelXpSummary
│   │   ├── TeamPowerSummary
│   │   └── CoinBalance
│   ├── PrimaryNavigation
│   │   ├── Lobby / Team / Inventory / Skills / Tower / Shop
│   │   └── NavigationItem / OverflowMenu
│   └── AutomationPanel
│       ├── AutomationStatus
│       ├── PotionRuleControl
│       ├── ReviveRuleControl
│       ├── SkillAutomationControl
│       └── ReturnAfterDefeatToggle
├── MainWorkspace
│   ├── TeamSidebar
│   │   ├── TeamHeader
│   │   └── CharacterStatusCard (0–3)
│   ├── CentralActivityColumn
│   │   ├── ActivityContextHeader (andar / modo / sessão)
│   │   ├── BattleStage | LobbyHubStage | FloorSelectionStage
│   │   ├── QuickShopLauncher (canto superior na hunt)
│   │   └── SessionEventLog
│   └── SystemNoticeDock
│       └── Connection / Error / ImportantEventNotice
└── OverlayHost
    ├── QuickShopPanel
    ├── Character / Team / Inventory / Equipment / Skills Panels
    ├── Tower / NPC Shop Panels
    ├── TooltipLayer / ConfirmationDialog / ToastQueue
    └── ConnectionAndErrorNotice
```

Os componentes recebem dados e emitem intenções/eventos de UI. Devem ser pequenos o bastante para testar apresentação/estados isoladamente e não se acoplar diretamente entre si. `GameHudShell` organiza layout; uma camada de estado/view-model converte dados de sessão e respostas dos serviços para props legíveis; serviços de domínio controlam regras e persistência.

## 4. Estado e fluxo de dados

### Snapshot de apresentação (proposta)

Um `HudSessionViewModel` somente de leitura agrega, conforme disponível:

- perfil MVP: identidade, nível compartilhado, XP, poder da equipe e saldo de Coins;
- equipe: personagens ativos, nível/estrelas, HP, estado vivo/derrotado, poder e efeitos temporários;
- atividade: modo (lobby/preparação/seleção/hunt), andar, encontro, inimigos, duração e contadores da sessão;
- automação: configurações habilitadas, limiar de HP, consumíveis elegíveis/contagens, skills automáticas habilitadas por slot e estado de cada regra;
- progresso: feed recente de eventos, XP/Coin/itens e resumo da sessão;
- conexão/avisos: estado de sessão e erros/reconexão. Chat e canais não existem no MVP.

A HUD renderiza o snapshot e envia comandos intencionais — por exemplo, `SetPotionRule`, `SetReviveRule`, `SetSkillAutoRule`, `SelectFloor`, `EndHunt`, `OpenQuickShop` e `EquipItem`. A autoridade do servidor confirma compras, inventário, drops, HP, combate e alterações persistentes. A UI pode mostrar carregamento/pendente e erro/reconexão; não deve afirmar consumo ou compra antes de confirmação.

### Dependências entre componentes

- `PlayerProfilePanel` MVP depende de perfil/progressão/Coins; VIP é pós-MVP.
- `CharacterStatusCard` depende de snapshot da equipe/combate; abre detalhes/skills do membro e reflete eventos de HP/derrota.
- `ActivityContextHeader` e `BattleStage` dependem de modo, andar, encontro e eventos de batalha; a lista de eventos também alimenta `SessionEventLog`.
- `AutomationPanel` depende da configuração do bot, skills automáticas equipadas e estoques elegíveis; mudar controles envia comandos, e a confirmação/erro atualiza estado e badge.
- `QuickShopPanel` depende do catálogo/saldo/estoque atual; compra atualiza perfil/inventário/log quando confirmada, sem retirar a pessoa do contexto da hunt.
- No MVP, `SystemNoticeDock` depende do estado de conexão/erros; componentes de chat são pós-MVP e não renderizados.
- `PrimaryNavigation` escolhe uma view/painel dentro de `OverlayHost`; não apaga sessão nem reinicia a hunt.

Se sessão estiver desconectada ou desatualizada, mostrar aviso e último estado confirmado; comandos econômicos aguardam conexão/validação. Baseline de reconexão sem catch-up está em [`G2_TECHNICAL_BLUEPRINT.md`](G2_TECHNICAL_BLUEPRINT.md); o protótipo não exerce esse fluxo contra servidor.

## 5. Estados de tela e máquina de transição

Separar **modo principal**, **estado derivado da batalha** e **overlays** para evitar dezenas de telas duplicadas.

### Modos principais

- **LOBBY:** HUB, cura gratuita e preparação.
- **PREPARAÇÃO:** personagem, equipe, equipamentos e skills.
- **SELEÇÃO DE ANDAR:** requisitos e preview de recompensas.
- **BATALHA:** hunt ativa e encontros encadeados.

### Estados derivados/visuais

- **BATALHA EM ANDAMENTO:** HP, atores e automação ativos.
- **EVENTO DE LOOT:** realce temporário no feed/toast; não bloqueia o combate.
- **PERSONAGEM FERIDO:** HP reduzido mostrado no card correspondente.
- **PERSONAGEM DERROTADO:** card marca estado e mantém dados da equipe.
- **EQUIPE DERROTADA:** termina hunt e leva ao fluxo de retorno/lobby.
- **CONEXÃO/RECONEXÃO:** estado informativo sobre atualização e comandos pendentes.

### Overlays independentes

- **LOJA RÁPIDA ABERTA:** painel/modal sobre o contexto; ao fechar, retorna à batalha/lobby que estava ativo. No MVP, combate continua e não pausa.
- **MENU SECUNDÁRIO:** qualquer módulo aberto via navegação; manter sessão e contexto.
- Tooltip, confirmação, mensagens de sistema e avisos são camadas menores e não trocam modo principal.

### Transições

`LOBBY → PREPARAÇÃO → SELEÇÃO DE ANDAR → BATALHA → (encontro seguinte → BATALHA)`.

`BATALHA → EQUIPE DERROTADA → LOBBY`; cura gratuita acontece no lobby. O toggle **“Voltar após derrota”** inicia desligado; ligado, cura no lobby, espera 5 s e reinicia o mesmo andar, nunca sobe de andar. O botão **Encerrar hunt** retorna ao lobby a qualquer momento; recompensas de inimigos já derrotados persistem e grupo incompleto não rola equipamento. Abrir/fechar overlay não troca modo. Loja rápida não pausa o combate. Fechar/perder conexão congela no último evento confirmado e não concede rewards offline.

## 6. Painel de automação

Exibir estado ativo/inativo e recursos restantes. Regras MVP fechadas em `MVP_DECISIONS.md`:

- poção: ligada por padrão; limiar inicial de 50%, ajustável de 10% a 90% em passos de 5; raridades elegíveis configuráveis;
- revive: desligado por padrão; tipos de 30%/50%/total elegíveis e prioridade por slot esquerdo→direito;
- skills: liga/desliga cada uma; uso pela ordem crescente do slot, ataque básico quando nenhuma estiver pronta;
- voltar após derrota: desligado por padrão; ligado, retorna ao lobby, cura, espera 5 s e recomeça o mesmo andar;
- sem controle VIP/auto subir andar no MVP.

Se estoque elegível acabar, não sugerir que automação segue funcionando: mostrar estado sem consumível, contagem e atalho da loja. Validação e execução pertencem ao servidor.

## 7. HUD de combate e armas

A batalha mostra no palco os eventos visualmente relevantes: avanço/balanço de ação, dano/crit, hit recebido, efeitos de lâmina/impacto/magia, status aplicados e morte. Feedback deve corresponder ao evento confirmado pela simulação, sem efeitos enganosos.

O feed e indicadores reconhecem traços de arma: veneno da Adaga, dano aumentado do Machado, crítico da Maça, velocidade de ataque da Besta, ataque em área do Cajado, cura do Livro Arcano, atordoamento das Luvas, ataque duplo das Garras e **Contracorte** da Espada (contra-ataque visual de corte). Contracorte foi validado (20% de chance, 50% do Ataque); o baseline dos demais traços também foi aprovado. Valores de `COMBAT_DESIGN.md` podem aparecer na UI; ajustes posteriores devem seguir balanceamento versionado/testado. Fórmulas e gatilhos estão em `COMBAT_DESIGN.md` e `SYSTEMS_SPEC.md`.

## 8. Regras de conteúdo e detalhes fora da HUD

- Perfil resume; tela de personagem mostra atributos completos.
- Cards da equipe resumem HP, poder, nível/estrelas, buffs/debuffs e estado. Skills/cooldowns só quando significativos/legíveis.
- Tooltip/painel de item revela slot/subtipo, raridade, nível, base, multiplicador de raridade, **x inteiro próprio de cada atributo**, fator aplicado (`x/10`, exibido em passos de 0,1), valor final, característica, poder e nota. Exemplo: `Rolagem x: 37; fator: ×3,7`; nunca exibir rolagens como `x=4,72`.
- Equipment view apresenta dez slots: arma, peitoral, elmo, calça, bota, luva (armadura), colar, aura, asa e pet. O subtipo de arma é separado do slot de armadura “Luva”.
- Tela de comparação deve explicar diferenças de stats e afinidade (+5% ao atributo ofensivo principal); raridade não substitui os dados reais. Estrelas além de 1★ são pós-MVP.
- Banners de item raro/loot são concisos e podem ser desligados/reduzidos em acessibilidade; log mantém no servidor até 100 eventos confirmados da última hunt, conforme `MVP_DECISIONS.md`.

## 9. Responsividade, acessibilidade e hierarquia

Prioridade visual: 1) batalha, 2) HP/estado da equipe, 3) andar/encontro, 4) automação/estoque, 5) progresso/loot, 6) perfil, 7) navegação, 8) avisos de sistema, 9) detalhes secundários.

Em resoluções menores: recolher automação/equipe em painéis acionáveis, transformar navegação em overflow e abrir módulos em camada; não reduzir excessivamente a área central. MVP tem suporte formal desktop-first ≥1280×720; mobile completo é pós-MVP.

A UI deve suportar navegação por teclado/foco visível, texto legível e contraste, tooltips acessíveis por foco/clique (não só hover), sinais redundantes para morte/alertas, redução de animações/piscadas e alertas sonoros opcionais. Limites para flashes e frequência de notificações devem ser validados.

## 10. Decisões fechadas e trabalho antes do protótipo

Fechados para o MVP: desktop-first (mínimo recomendado 1280×720, Chrome/Edge/Firefox recentes), PT-BR, painéis recolhíveis em telas menores, gameplay central prioritário, loja rápida sem pausar, bot/revive/retorno conforme as regras acima, sem offline/social/VIP, e poder da equipe pela fórmula de `MVP_DECISIONS.md`. A ordem de skills é fixa por slot e valores de armas seguem `COMBAT_DESIGN.md`; números podem ser balanceados após playtest.

Trabalho restante de G2/G3, não pendência de escopo: revisar wireframes/click-through de `G2_UX_BLUEPRINT.md` com 5–8 testers convidados, incorporar achados críticos e fechar art direction (tipografia/paleta/componentes/ícones) e medidas visuais. O protótipo atual é apenas de navegação local; não é produção. Mobile completo, chat e módulos sociais são pós-MVP.

Antes de implementar a HUD: ler AI_State, GDD e esta especificação; conferir o estado do repositório; propor/validar a arquitetura, estados e dependências; registrar decisões; então implementar apenas após os gates do Roadmap. Ao fechar a etapa, executar testes aplicáveis e atualizar AI_State, documentação, commit e push, inclusive se o trabalho continuar parcial.
