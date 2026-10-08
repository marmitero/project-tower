Você é o responsável pelo redesign visual e estrutural da interface do jogo atualmente aberto neste projeto.

IMPORTANTE:

NÃO estamos criando um novo jogo.

NÃO altere as mecânicas, regras, sistemas, banco de dados, lógica de batalha, progressão, inventário, personagens, economia ou funcionalidades existentes, salvo quando uma pequena alteração técnica for indispensável para suportar a nova interface.

O objetivo desta tarefa é transformar COMPLETAMENTE a linguagem visual e a experiência de UI/UX do jogo.

============================================================
1. REFERÊNCIAS VISUAIS
============================================================

Utilize como referência principal a imagem fornecida nesta conversa.

A imagem possui:

- lado esquerdo = ESTÉTICA ATUAL DO NOSSO JOGO
- lado direito = REFERÊNCIA DA NOVA ESTÉTICA

Também utilize o próprio jogo atual como referência funcional.

O resultado deve absorver:

- linguagem visual;
- composição;
- hierarquia;
- tratamento dos painéis;
- cores;
- bordas;
- botões;
- ícones;
- barras;
- janelas;
- menus;
- inventários;
- cards;
- tipografia;
- estados visuais;
- overlays;
- sombras;
- profundidade;
- organização espacial;
- relação entre HUD e cenário;
- sensação de "jogo".

NÃO copie literalmente elementos protegidos de outro jogo.

A referência deve ser utilizada para absorver PRINCÍPIOS DE DESIGN, não para reproduzir uma interface específica pixel por pixel.

O resultado precisa parecer uma interface ORIGINAL pertencente ao nosso próprio jogo.

============================================================
2. OBJETIVO ESTÉTICO
============================================================

A interface atual parece excessivamente com:

- painel administrativo;
- dashboard;
- website;
- formulário;
- sistema empresarial;
- janela genérica de aplicação web.

Isso precisa desaparecer.

A nova interface deve parecer:

- um MMORPG/browser game;
- um RPG online;
- um jogo idle moderno;
- uma interface construída com assets do próprio universo;
- uma interface visualmente rica;
- uma interface com personalidade;
- uma interface que poderia existir em um jogo mobile premium.

A pessoa deve olhar para a tela e pensar:

"Estou dentro de um jogo."

e NÃO:

"Estou navegando em um site."

============================================================
3. FILOSOFIA VISUAL
============================================================

A nova UI deve seguir o conceito:

GAME FIRST / UI SECOND.

O cenário e a área principal de gameplay são o elemento central.

A interface deve ser construída AO REDOR do jogo.

Não devemos ter uma página web longa contendo o jogo no meio.

Não devemos fazer o cenário parecer um iframe inserido dentro de um dashboard.

Não devemos usar grandes blocos cinza ou azul-escuro com aparência de formulário.

Não devemos utilizar containers genéricos de HTML sem tratamento visual.

Cada painel precisa parecer uma peça visual pertencente ao jogo.

============================================================
4. PALETA DE CORES
============================================================

Abandonar a predominância visual atual de:

- azul-marinho;
- cinza;
- preto azulado;
- branco/cinza de formulário.

Adotar uma linguagem visual predominantemente:

- marrom escuro;
- vinho;
- terracota;
- cobre;
- laranja queimado;
- dourado;
- creme;
- roxo/magenta como cor de destaque;
- tons escuros para profundidade.

A referência possui uma combinação visual semelhante a:

FUNDO:
marrom extremamente escuro / quase preto.

PAINÉIS:
marrom, vinho, terracota e cobre.

BORDAS:
tons dourados, cobre ou bege.

DESTAQUES:
roxo, magenta, lilás e rosa.

BOTÕES:
terracota, laranja queimado, marrom, roxo e dourado dependendo da função.

TEXTO:
creme, bege claro ou branco quente.

VALORES:
cores específicas para comunicar informação.

EXEMPLO DE DIREÇÃO DE PALETA:

- #211719 — fundo extremamente escuro
- #321D1E — painel escuro
- #512B2A — painel intermediário
- #713B35 — marrom/terracota
- #995544 — terracota
- #C56E55 — destaque quente
- #D79A5A — cobre/dourado
- #E6C58A — dourado claro
- #F0DCC0 — texto claro
- #7D3F91 — roxo
- #A74FBA — magenta/roxo claro

NÃO é obrigatório utilizar exatamente esses HEX.

Eles representam a direção visual.

A paleta deve ser consistente em TODA a aplicação.

============================================================
5. PROFUNDIDADE E CAMADAS
============================================================

A interface precisa deixar de ser "flat".

Utilizar:

- múltiplas camadas;
- sombras internas;
- sombras externas;
- bordas decorativas;
- highlights;
- bevels discretos;
- gradientes sutis;
- textura;
- iluminação;
- separadores ornamentais;
- pequenos detalhes gráficos.

Porém:

NÃO transformar a interface em um excesso de efeitos.

A profundidade deve parecer produzida por assets de um jogo, e não por efeitos CSS exagerados.

============================================================
6. PAINÉIS
============================================================

Todos os painéis importantes devem possuir identidade visual própria.

Substituir containers genéricos por painéis com:

- cabeçalho visual;
- moldura;
- bordas;
- cantos trabalhados;
- título;
- ícone contextual;
- área interna;
- estados de hover;
- estados ativos;
- estados desabilitados.

Exemplo:

Em vez de:

[ MARKET ]

usar algo semelhante à ideia:

┌──────────────────────────────┐
│  ÍCONE   MARKET              │
│──────────────────────────────│
│                              │
│       conteúdo               │
│                              │
└──────────────────────────────┘

Mas com acabamento visual de RPG.

O título do painel deve parecer parte do painel, não um simples <h2>.

============================================================
7. JANELAS MODAIS
============================================================

Janelas como:

- Market;
- Inventário;
- Boss;
- Perfil;
- Equipe;
- Equipamentos;
- Configurações;
- informações;
- recompensas;
- menus;

devem aparecer como JANELAS DO JOGO.

Elas devem:

- ficar sobre o cenário;
- escurecer o ambiente atrás;
- possuir moldura;
- possuir cabeçalho;
- possuir botão de fechar visualmente integrado;
- possuir profundidade;
- possuir hierarquia interna.

Ao abrir uma janela importante:

O jogo continua visualmente presente ao fundo.

A janela deve parecer uma interface sobreposta ao mundo.

============================================================
8. REGRA ABSOLUTA — O JOGO NÃO SE MOVE
============================================================

ESTA É UMA DAS REGRAS MAIS IMPORTANTES DE TODA A IMPLEMENTAÇÃO.

A ÁREA CENTRAL DE GAMEPLAY DEVE SER ESTÁTICA.

O cenário/jogo central:

- NÃO pode subir;
- NÃO pode descer;
- NÃO pode deslocar lateralmente;
- NÃO pode ser empurrado pela interface;
- NÃO pode acompanhar scroll da página;
- NÃO pode ser afetado por scrollbar de um painel;
- NÃO deve mudar de posição quando uma janela é aberta.

A viewport do jogo deve permanecer ancorada.

Pense nela como uma peça física fixa da interface.

============================================================
9. SCROLLBAR — REGRA ABSOLUTA
============================================================

SE um painel possuir muito conteúdo:

A BARRA DE ROLAGEM DEVE MOVIMENTAR SOMENTE O CONTEÚDO DESSE PAINEL.

Exemplo:

Se o:

- Inventário
- Market
- Chat
- Lista de personagens
- Lista de itens
- Lista de bosses
- Logs
- Configurações

precisar de scroll:

somente o conteúdo interno correspondente deve rolar.

O restante da interface permanece imóvel.

O cenário central permanece imóvel.

A HUD permanece imóvel.

Os botões principais permanecem imóveis.

A página inteira NÃO deve possuir uma scrollbar que movimente todo o jogo.

============================================================
10. VIEWPORT FIXO
============================================================

Estruturar a aplicação como uma interface de jogo.

Conceito:

┌─────────────────────────────────────────────────────────┐
│                     TOP HUD                             │
├───────────────┬─────────────────────────┬───────────────┤
│               │                         │               │
│   LEFT HUD    │      GAME VIEWPORT      │   RIGHT HUD   │
│               │                         │               │
│               │      ÁREA CENTRAL       │               │
│               │                         │               │
├───────────────┴─────────────────────────┴───────────────┤
│                     BOTTOM HUD                           │
└─────────────────────────────────────────────────────────┘

A composição real pode variar conforme a interface existente.

O importante é:

O GAME VIEWPORT é o centro.

Ele é fixo.

Os painéis são elementos da HUD.

============================================================
11. RESPONSIVIDADE
============================================================

A interface deve funcionar em:

- desktop;
- notebook;
- tablet;
- celular.

Porém NÃO simplesmente empilhando todos os elementos como uma página responsiva tradicional.

Em telas menores:

A experiência deve continuar parecendo um jogo.

Utilizar:

- drawers;
- painéis deslizantes;
- abas;
- janelas sobrepostas;
- HUD compactada;
- menus contextuais;
- botões de acesso rápido.

No mobile:

O GAME VIEWPORT continua sendo o centro.

Os painéis podem abrir sobre ele.

O usuário NÃO deve precisar rolar a página inteira para encontrar o jogo.

============================================================
12. BOTÕES
============================================================

Os botões atuais precisam ser completamente redesenhados.

Evitar aparência de:

- botão HTML;
- botão Bootstrap;
- botão de dashboard;
- botão de formulário.

Criar aparência de botão de jogo.

Cada botão deve possuir:

NORMAL
HOVER
ACTIVE/PRESSED
DISABLED
SELECTED

Utilizar:

- pequenas sombras;
- bordas;
- highlights;
- ícones;
- cores contextualizadas;
- feedback visual.

Botões importantes podem ter:

- dourado;
- roxo;
- terracota;
- magenta.

Botões secundários:

- marrom;
- cobre;
- vinho.

============================================================
13. ÍCONES
============================================================

Sempre que existir um ícone adequado:

PREFERIR ÍCONE + TEXTO

em vez de simplesmente texto.

Exemplos:

Inventário
Equipamentos
Equipe
Market
Boss
Mapa
Perfil
Configurações
Shop
Quests
Chat

Os ícones devem possuir uma linguagem visual consistente.

NÃO misturar estilos incompatíveis de ícones.

Evitar emojis como substitutos permanentes de ícones de interface.

Se o projeto já possuir assets adequados, reutilizá-los.

Se houver necessidade de novos assets:

criar placeholders coerentes com a linguagem visual do jogo.

============================================================
14. CARDS
============================================================

Itens, personagens, equipamentos, inimigos, recompensas etc. devem utilizar cards com identidade visual.

Os cards devem possuir:

- imagem;
- nome;
- raridade;
- informações;
- valor;
- nível;
- status;
- ação.

A raridade deve possuir linguagem visual própria.

Exemplo:

COMMON
UNCOMMON
RARE
EPIC
LEGENDARY
MYTHIC

Não simplesmente escrever a raridade em texto.

Utilizar:

- bordas;
- pequenos brilhos;
- cor;
- ícone;
- background;
- ornamentação.

============================================================
15. BARRAS DE VIDA / XP / RECURSOS
============================================================

As barras atuais devem ser redesenhadas.

Não utilizar simplesmente:

████████████ 80%

Criar barras visualmente integradas ao jogo.

Devem possuir:

- moldura;
- preenchimento;
- brilho discreto;
- textura;
- indicador;
- números quando necessário.

Aplicar o mesmo princípio para:

HP
XP
Mana
Energia
Progresso
Cooldown
Recursos.

============================================================
16. TIPOGRAFIA
============================================================

A tipografia deve abandonar a aparência de dashboard.

Utilizar:

- fonte principal altamente legível;
- fonte/display para títulos quando apropriado;
- hierarquia clara;
- pesos diferentes.

Títulos podem possuir personalidade fantasy/RPG.

Texto funcional deve continuar extremamente legível.

NÃO exagerar com fontes decorativas.

A leitura deve sempre vir antes da decoração.

============================================================
17. CHAT
============================================================

O chat deve parecer parte do mundo.

Não deve parecer uma caixa de comentários de website.

Criar:

- janela própria;
- cabeçalho;
- abas/canais;
- mensagens;
- nome do jogador;
- timestamp quando necessário;
- cores para diferentes tipos de mensagem;
- campo de entrada estilizado;
- botão de envio;
- scroll SOMENTE dentro do chat.

O chat nunca deve mover o cenário.

============================================================
18. HUD
============================================================

A HUD deve comunicar informação sem ocupar espaço desnecessário.

Priorizar:

1. identidade do jogador;
2. personagem/equipe;
3. recursos;
4. estado atual;
5. ações importantes;
6. navegação;
7. informações secundárias.

Não colocar tudo em grandes caixas.

Utilizar pequenos componentes visuais.

A HUD deve parecer parte do jogo.

============================================================
19. MENUS PRINCIPAIS
============================================================

Menus como:

- Market
- Inventário
- Equipe
- Mapa
- Boss
- Ranking
- Perfil
- Shop
- Configurações

devem parecer sistemas do jogo.

Evitar páginas inteiras brancas ou grandes áreas vazias.

Sempre que possível:

abrir como painel/modal/drawer dentro do próprio ambiente do jogo.

============================================================
20. ANIMAÇÕES
============================================================

Adicionar microanimações onde fizer sentido:

- hover;
- click;
- abertura de painel;
- fechamento;
- mudança de aba;
- recompensa;
- item adquirido;
- mudança de status;
- atualização de recurso.

As animações devem ser rápidas.

Algo entre aproximadamente:

100–250 ms para microinterações.

300–450 ms para transições maiores.

NÃO exagerar.

O jogo é idle e precisa transmitir estabilidade e conforto visual.

============================================================
21. IDLE GAME — IMPORTANTE
============================================================

Como o jogo é um jogo idle:

A interface deve funcionar muito bem quando o jogador simplesmente deixa o jogo aberto.

Não criar uma interface excessivamente agressiva.

O usuário precisa conseguir olhar rapidamente para a tela e entender:

- o que está acontecendo;
- onde seu personagem está;
- qual é o estado atual;
- qual é o progresso;
- quais recursos possui;
- se alguma coisa aconteceu;
- se existe alguma recompensa disponível.

Informações importantes devem possuir feedback visual discreto.

============================================================
22. ESTADO ATUAL → NOVO ESTADO
============================================================

TRANSFORMAR:

"website com elementos de jogo"

EM:

"jogo com interfaces internas".

TRANSFORMAR:

"painéis cinzas/azuis"

EM:

"painéis RPG em marrom/terracota/cobre/roxo".

TRANSFORMAR:

"botões HTML"

EM:

"botões de jogo".

TRANSFORMAR:

"modal genérico"

EM:

"janela do jogo".

TRANSFORMAR:

"cards administrativos"

EM:

"cards de item/personagem".

TRANSFORMAR:

"texto como informação"

EM:

"componentes visuais".

============================================================
23. NÃO FAZER
============================================================

NÃO:

- criar visual de dashboard;
- criar visual de SaaS;
- criar visual de sistema administrativo;
- utilizar Bootstrap-like UI;
- utilizar cards genéricos;
- utilizar excesso de cinza;
- utilizar excesso de azul;
- usar grandes áreas brancas;
- colocar bordas arredondadas genéricas em absolutamente tudo;
- transformar tudo em caixas;
- utilizar emojis como solução visual definitiva;
- criar uma interface que pareça feita apenas com componentes HTML;
- criar scrollbar global;
- mover o jogo quando um painel possuir scroll;
- deslocar o viewport central;
- permitir que o cenário fique preso dentro de uma página que rola;
- substituir o gameplay existente por uma demonstração visual;
- quebrar funcionalidades existentes para conseguir o redesign.

============================================================
24. PRESERVAÇÃO DA FUNCIONALIDADE
============================================================

ANTES DE ALTERAR A UI:

Analise a implementação atual.

Identifique:

- componentes;
- telas;
- modais;
- HUD;
- navegação;
- estados;
- eventos;
- dados;
- funcionalidades existentes;
- assets existentes.

O redesign deve reutilizar a lógica existente sempre que possível.

Separar:

VISUAL
de
LÓGICA.

A mudança deve ser principalmente uma transformação da camada de apresentação.

============================================================
25. COMPONENTIZAÇÃO
============================================================

Criar uma linguagem visual reutilizável.

Criar componentes consistentes para:

GamePanel
GameWindow
GameButton
GameTab
GameCard
GameItemCard
GameCharacterCard
GameResourceBar
GameProgressBar
GameBadge
GameIconButton
GameTooltip
GameModal
GameDrawer
GameNotification
GameChat
GameInventorySlot
GameEquipmentSlot
GameRarity
GameHeader
GameFooter

Não duplicar CSS visual em dezenas de lugares.

A nova identidade deve ser centralizada em tokens/variáveis de design.

============================================================
26. DESIGN TOKENS
============================================================

Criar tokens para:

colors
backgrounds
panel colors
border colors
text colors
rarities
shadows
radius
spacing
typography
button states
z-index
animations

Isso permitirá evoluir a identidade visual futuramente sem reconstruir cada tela.

============================================================
27. Z-INDEX / CAMADAS
============================================================

Definir uma hierarquia clara.

Exemplo conceitual:

BASE
↓
GAME WORLD
↓
GAME HUD
↓
PANEL
↓
MODAL
↓
TOOLTIP
↓
NOTIFICATION
↓
CRITICAL OVERLAY

Uma janela aberta não deve destruir o layout do jogo.

Ela deve simplesmente aparecer acima da camada apropriada.

============================================================
28. JOGO COMO ELEMENTO CENTRAL
============================================================

Reforçando:

O gameplay é o elemento central da aplicação.

O cenário deve possuir dimensões previsíveis.

A viewport deve possuir:

- overflow controlado;
- posição estável;
- tamanho definido;
- clipping apropriado;
- nenhuma influência do scroll global.

Se houver elementos fora da viewport:

eles devem ser tratados pela HUD ou por painéis próprios.

NUNCA usar uma scrollbar global para controlar o conteúdo principal do jogo.

============================================================
29. TESTE OBRIGATÓRIO
============================================================

Depois da implementação, testar:

1. abrir Market;
2. abrir Inventário;
3. abrir Perfil;
4. abrir Boss;
5. abrir Equipe;
6. abrir qualquer tela longa;
7. rolar dentro dela;
8. fechar a tela;
9. abrir múltiplos painéis;
10. utilizar o chat;
11. redimensionar a janela;
12. testar mobile;
13. testar desktop.

Em TODOS esses testes:

O GAME VIEWPORT deve continuar no mesmo lugar.

Se eu rolar um Market longo:

SOMENTE O MARKET ROLA.

Se eu rolar o Chat:

SOMENTE O CHAT ROLA.

Se eu rolar o Inventário:

SOMENTE O INVENTÁRIO ROLA.

O jogo não pode se mover.

============================================================
30. PRIORIDADE VISUAL
============================================================

A hierarquia final deve ser:

1. GAMEPLAY
2. PERSONAGEM / ESTADO ATUAL
3. AÇÕES IMPORTANTES
4. RECURSOS
5. PROGRESSO
6. NAVEGAÇÃO
7. INFORMAÇÕES SECUNDÁRIAS

A interface nunca deve competir visualmente com o gameplay.

============================================================
31. RESULTADO ESPERADO
============================================================

Quando terminar, faça uma comparação mental:

ANTES:

"Um site escuro contendo várias caixas e um jogo."

DEPOIS:

"Um jogo completo que possui uma HUD, menus, inventário, Market, chat e janelas internas."

Essa diferença é o objetivo principal desta tarefa.

O resultado precisa ter:

- personalidade;
- profundidade;
- aparência de jogo;
- coerência visual;
- boa hierarquia;
- ótima legibilidade;
- responsividade;
- sensação de produto final;
- estética moderna de RPG/idle game;
- forte integração entre assets e interface.

============================================================
32. REGRA FINAL
============================================================

NÃO faça apenas uma troca superficial de CSS.

Não basta:

- trocar azul por marrom;
- trocar bordas;
- mudar fonte;
- arredondar cards.

Precisamos mudar a LINGUAGEM VISUAL da aplicação.

Analise cada tela existente e pergunte:

"Se eu removesse todo o texto, isso ainda pareceria uma interface de jogo?"

Se a resposta for não:

redesenhe o componente.

Faça o redesign de maneira progressiva, mantendo as funcionalidades existentes.

Primeiro estabeleça:

1. sistema visual;
2. viewport;
3. HUD;
4. painéis;
5. janelas;
6. botões;
7. cards;
8. barras;
9. chat;
10. responsividade.

Depois aplique o sistema consistentemente em todas as telas.

NÃO pare depois de modificar apenas a tela inicial.

O objetivo é que TODO o jogo compartilhe a mesma nova identidade visual.