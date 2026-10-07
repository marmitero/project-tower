# Plano Mestre de Transformação UI/UX: De Dashboard Web para RPG Dark Fantasy Autêntico

**Data:** 2026-10-07  
**Status:** 📋 Proposto para Validação e Aprovação do Usuário  
**Objetivo Central:** Eliminar completamente a sensação de "site / dashboard administrativo" e transformar o Project Tower em uma experiência visual imersiva de console RPG Dark Fantasy (na linhagem de *Diablo II*, *Darkest Dungeon*, *Castlevania: Symphony of the Night* e *Final Fantasy Tactics*), com materiais físicos diegéticos, alinhamento simétrico rigoroso, paleta mineral gótica e acabamento de alta fidelidade pixel art.

---

## 1. Diagnóstico Completo da Interface Atual (Auditoria Crítica)

Abaixo está o mapeamento detalhado de cada tela, painel e componente do jogo, identificando os elementos que ainda denunciam uma estrutura de "site moderno" e a causa raiz estética de cada um:

### 1.1. Painel Superior (HUD & Identidade do Rei)
* **Como está hoje:**
  - Barra retangular horizontal fixa (`.tia-hud`) com cantos retos, fundo cinza escuro translúcido e linha inferior de 2px.
  - O retrato do Rei fica em um quadrado simples de 48×48px com uma borda amarela básica.
  - Moedas ("Coin") e "Diamante" usam `StatPill` com fundo plano e texto pequeno, alinhados à direita como widgets de dashboard de SaaS.
  - A barra de progresso do Rei é uma barra fina horizontal esticada no meio da tela.
* **Por que parece site:** Lembra uma "navbar" de aplicação corporativa com avatar de perfil no canto esquerdo e contadores de saldo na direita.
* **O que deve ser:** Um **Estandarte Real / Brasão Heráldico**. O avatar do Rei deve ser emoldurado em um escudo de bronze/ouro com rebites físicos e louros (`crest_gold`). As moedas e diamantes devem repousar sobre bandejas entalhadas de veludo escuro e borda metálica (`plaque_narrow`), com o ícone do recurso em destaque tridimensional. O centro deve exibir o status da Caçada como uma flâmula militar em arco.

### 1.2. Painel Esquerdo (Team Panel — Coluna de Combate)
* **Como está hoje:**
  - Coluna lateral com título "Equipe" e um botão "Gerenciar".
  - 3 cartões retangulares verticais (`.tia-slotcard`) empilhados com borda 9-slice escura, contendo retrato quadrado, barras de XP/HP finas e um botão retangular "Tornar ativo".
  - Slots bloqueados exibem um texto cinza `Bloqueado · Rei Nv X + Y Coin`.
* **Por que parece site:** Lembra uma lista de tarefas (cards do Trello) com botões de ação e barras de progresso web.
* **O que deve ser:** **A Sala de Guerra / Pedestais dos Campeões**. Em vez de caixas cinzas de texto, cada herói ativo deve ocupar um **Nicho Gótico com Pedestal de Pedra Rúnica** (`ui/pedestal_stone`). O herói ativo em combate na Torre recebe uma aura iluminada e uma bandeira de "VANGUARDA". Barras de HP e XP devem ter frascos cilíndricos com reflexo líquido e ponteiras em formato de gema de coração (`bar_cap_left_heart`) e orbe de mana (`bar_cap_left_orb`). Slots bloqueados devem ser cobertos por uma **Grade de Ferro Enferrujado (Portcullis)** com um cadeado em forma de crânio e inscrição cravada no ferro.

### 1.3. Painel Direito (Chat Global / Crônicas)
* **Como está hoje:**
  - Caixa de chat vertical estilo Discord/Twitch com lista de mensagens `[14:32] Nome: mensagem`, campo de texto `<input>` genérico no rodapé e botão "Enviar".
  - Botão de recolher/silenciar com texto plano.
* **Por que parece site:** É a cópia exata de uma janela de bate-papo de aplicação web contemporânea.
* **O que deve ser:** **As Crônicas da Taverna / Livro dos Feitos do Reino**. O painel deve ser visualmente construído como um **Pergaminho de Couro Encadernado em Ferro**. O topo exibe o selo da Taverna do Javali Dourado (`ui/chat_header_scroll`). Mensagens do sistema (loot épico, derrotas de chefes) aparecem como proclamas reais com letras capitulares douradas. Mensagens de jogadores têm cor de pergaminho antigo (`#e8dfc8`) com brasões de classe ao lado do nome. A barra de rolagem é estilizada em madeira e ferro, e o botão de silenciar é um selo de cera que se rompe ou se fecha.

### 1.4. Área Central (Stage / BattleCanvas / Caçada)
* **Como está hoje:**
  - O canvas do jogo fica solto em um contêiner escuro central com botões flutuantes ("Métricas", "Retornar ao Reino").
  - O painel de estatísticas (`HuntPanel`) é uma tabela/grid plano de DPS, ouro por minuto e abates.
* **Por que parece site:** Falta integração cênica entre a janela de combate Phaser e a moldura do navegador.
* **O que deve ser:** **O Portal da Torre / Arcade Cabinet**. O canvas de batalha deve ser encapsulado por uma **Arcada de Pedra Gótica** com tochas laterais animadas ou entalhadas. A moldura do jogo deve passar a impressão de estarmos olhando através de um portal mágico para os andares da torre. O painel de métricas da caçada deve se desdobrar como uma ardósia de batalha ou tábua de runas esculpida.

### 1.5. Console Inferior de Navegação (`.tia-nav`)
* **Como está hoje:**
  - Barra horizontal de botões retangulares: "Rei", "Heróis", "Equipe", "Mochila", "Mercado", "Torre", "Boss", "Opções".
  - Mesmo com as cores do kit GBA, o alinhamento ainda parece uma barra de navegação/menu de rodapé de site.
* **Por que parece site:** Botões enfileirados sem base mecânica ou console unificado.
* **O que deve ser:** **Console de Comando Tátil / Chaves Rúnicas de Pedra**. A barra de navegação deve ser uma peça maciça de ferro forjado e pedra vulcânica, onde cada botão é uma placa metálica chanfrada com 3 níveis de profundidade física (elevado em repouso, brilho de runa dourada no hover, afundamento mecânico de 3px no clique com som de pedra estalando). A aba ativa emite uma luz mística que projeta um feixe suave na borda superior.

### 1.6. Telas de Menu e Gerenciamento (Overlays / Modais)
* **Inventário (`InventoryScreen`):**
  - *Problema:* Lista de cards com chips de filtro web ("Todos", "Equipamentos", "Consumíveis").
  - *Visão RPG:* Um **Baú do Tesouro / Armaria com Paper Doll**. No lado esquerdo, a silhueta anatômica do herói com os 6 slots corporais (Elmo, Armadura, Arma Primária, Escudo, Anel, Amuleto). No lado direito, uma grade quadrada de 5×4 slots de veludo e madeira escura com contornos metálicos indicando a raridade do item por gemas nos cantos.
* **Tela de Equipe (`TeamScreen`):**
  - *Problema:* Três caixas de slot com botões cinzas e lista de "Disponíveis" abaixo em tabela simples.
  - *Visão RPG:* **Tribunal dos Campeões**. Três pedestais centrais de pedra com os modelos dos heróis em pose de guarda; abaixo, o banco de reservas exibido como medalhões heráldicos em prateleiras de carvalho escuro.
* **Tela de Heróis (`HeroesScreen`):**
  - *Problema:* Lista corrida de heróis com botões repetidos "Slot 1", "Slot 2", "Slot 3".
  - *Visão RPG:* **Códice dos Campeões**. Layout de livro aberto ou cartas de tarô místicas. Cada herói tem sua carta estilizada com sua constelação/classe, atributos esculpidos em relevo e botão de convocação com selo de cera.
* **Tela de Mercado (`MarketScreen`):**
  - *Problema:* Cards cinzas com botão "Comprar" ou "Vender" simples.
  - *Visão RPG:* **Bazar do Andarilho Cego / Balcão da Guilda Mercante**. Balcão de madeira rústica, balança de pratos dourada para cotação de câmbio, moedas empilhadas e mercadorias expostas sobre panos de linho cru.
* **Tela da Torre (`TowerScreen`):**
  - *Problema:* Seletor numérico de andares em lista ou botões simples.
  - *Visão RPG:* **Mapa da Espiral Negra**. Mapa vertical estilizado entalhado em placa de ardósia, mostrando a progressão dos andares, biomas temáticos (Caverna de Ecos, Fornalha, Pináculos da Onda 2) com os portões de cada andar e recompensas em brasões pendurados.

---

## 2. Benchmark de UI/UX em Clássicos do RPG Dark Fantasy

A pesquisa estética em referências consagradas do gênero revela as seguintes regras de ouro:

| Jogo de Referência | Elemento Marcante de UI | Aplicação Direta no Project Tower |
| :--- | :--- | :--- |
| **Diablo II / Resurrected** | • Orbes de vida/mana de vidro esculpido com demônios/anjos<br>• Inventário com grade física de baú e Paper Doll anatômico<br>• Texturas de pedra gótica, ferro martelado e veludo | Substituir os cards planos de itens por slots em grade de baú; introduzir a silhueta anatômica no inventário; barras com ponteiras e volume líquido 3D. |
| **Darkest Dungeon** | • Painéis estilo pergaminho encadernado em couro negro<br>• Estética de gravura em madeira com alto contraste<br>• Chat e eventos como Crônica Histórica / Taverna<br>• Placas de nome em pergaminho rasgado e selos de cera | Transformar o Chat em "Crônicas da Taverna"; estilizar tooltips e modais como páginas de grimório antigo; selos de cera para indicar raridade e status. |
| **Castlevania: SOTN** | • Molduras em pedra lavrada e vitrais góticos<br>• Tipografia dourada chanfrada com reflexo metálico<br>• Ícones de armas e relíquias com molduras quadradas em relevo | Aplicar gradientes metálicos chanfrados nas tipografias; molduras de slot em ferro trabalhado para as armas e escudos. |
| **Final Fantasy Tactics** | • Telas táticas com heróis em pedestais de pedra com sombra própria<br>• Menus em placas de ardósia e linho<br>• Brasões heráldicos para classes e facções | Reformular a tela de Equipe e o Team Panel com pedestais táteis de pedra rúnica e brasões das 4 classes fundamentais. |

---

## 3. O Que Mudará e Como Mudará (Arquitetura Visual dos 6 Pilares)

### Pilar 1: Molduras e Painéis Táteis Diegéticos (Slabs & Grimoire)
* **Mudança Estrutural:** Eliminar qualquer contêiner com `border: 1px solid #333` ou fundos lisos planos.
* **Como será feito:**
  - Painéis principais (`.tia-panel`, `.tia-side`) utilizarão molduras 9-slice esculpidas em pedra vulcânica e cantoneiras de ferro (`--ui-frame-9slice-stone`).
  - O interior dos painéis receberá textura sutil de ardósia escura com vinheta radial profunda (`radial-gradient(circle at center, #181524 0%, #0d0b13 100%)`).
  - Divisores horizontais usarão ornamentos de ouro e runas esculpidas (`--ui-divider-gold` e `--ui-divider-stone`) em vez de linhas `<hr>` cinzas.

### Pilar 2: O Paper Doll e a Grade do Baú no Inventário
* **Mudança Estrutural:** O inventário deixa de ser uma listagem vertical de compras e passa a ser uma estante de armamento.
* **Como será feito:**
  - **Lado Esquerdo (Manequim do Campeão):** Silhueta de herói em pedra polida (`ui/mannequin_silhouette.png`) com 6 caixas de encaixe ao redor:
    1. Elmo (topo centro)
    2. Armadura de Peito (centro)
    3. Mão Principal / Arma (esquerda)
    4. Mão Secundária / Escudo (direita)
    5. Amulet / Relíquia (topo direita)
    6. Botas / Grevas (inferior centro)
  - **Lado Direito (O Baú / Cofre):** Grade 5×4 de slots quadrados (48×48px) em ferro cinzelado (`ui/slot_frame_gear`). Itens equipados brilham com o tom de sua raridade. Passar o cursor ou tocar em um item abre um tooltip estilizado como folha de grimório com estatísticas em alto relevo.

### Pilar 3: A Sala de Guerra e Pedestais da Equipe (Team Panel & Screen)
* **Mudança Estrutural:** Substituição das caixas de slot por estrados de batalha tridimensionais.
* **Como será feito:**
  - Cada slot de herói será um nicho arqueado com um pedestal de pedra rúnica na base (`ui/pedestal_stone.png`).
  - O herói ativo em combate na Torre exibe seu sprite animado ou retrato com brasão de glória dourado e título "LÍDER DE VANGUARDA".
  - Slots trancados exibem grades de ferro forjado e cadeado de caveira (`ui/portcullis_lock.png`) com o custo de desbloqueio gravado na barra de aço inferior.

### Pilar 4: Crônicas da Taverna (Chat Diegético)
* **Como será feito:**
  - O cabeçalho do chat exibe uma flâmula decorada com o emblema da guilda (`ui/chat_header_scroll.png`).
  - As mensagens são renderizadas como entradas de um diário de aventuras, em tipografia serifada de pergaminho antigo.
  - Avisos do sistema recebem caixas com borda dourada e ícone de trombeta/selo real.
  - O campo de entrada de texto se transforma em uma caixa entalhada em madeira com botão de envio em bronze prensado.

### Pilar 5: HUD Heráldico e Console de Navegação Arcada
* **Como será feito:**
  - **HUD:** O avatar do Rei recebe um escudo heráldico de ouro com brasão de nível (`crest_gold`). As carteiras de Coin e Diamantes usam placas de entalhe metálico com moedas físicas em pixel art.
  - **Navegação Inferior:** Os 8 botões tornam-se teclas chanfradas de pedra e bronze com ícones dedicados em pixel art GBA. Ao serem clicados, afundam mecanicamente 3 pixels, simulando botões táteis de arcade clássico ou painel de pedra de santuário. A aba selecionada emite uma luz rúnica dourada.

### Pilar 6: Tipografia, Paleta e Acabamento de Relevo (Chiseled Stone)
* **Como será feito:**
  - Substituição da fonte sem serifa genérica nos títulos por tipografia com serifas lapidadas estilo Dark Fantasy (*Cinzel* / *MedievalSharp* com fallback para serifa gótica).
  - Títulos e rótulos importantes recebem duplo relevo sombreado: `text-shadow: 1px 1px 0 #000, 2px 2px 0 #120e1e, 0 0 6px rgba(212, 175, 55, 0.4)`.
  - Paleta padronizada:
    * Fundo Primário: Ardósia Profunda `#0c0a14`
    * Fundo Secundário: Pedra de Cripta `#14121e`
    * Ouro Antigo (Títulos e Destaques): `#d4af37` / `#ffdf94`
    * Aço Temperado (Bordas e Molduras): `#5a546c` / `#8a829e`
    * Vermelho Sangue (HP / Perigo / Boss): `#b83344` / `#ff5566`
    * Azul Místico (Mana / Escudo): `#3a69a8` / `#66a3ff`
    * Verde Esmeralda (XP / Sucesso): `#3b7a42` / `#6bd979`
    * Roxo Arcano (Relíquias / Épico): `#6b3ba8` / `#b379ff`

---

## 4. Mapeamento de Assets de UI: Existentes vs. Novos a Gerar

### 4.1. Assets Existentes Aprovados em `assets/generated/ui/` (33 Peças Já Prontas):
Estes assets já estão integrados e serão aproveitados no seu potencial máximo de 9-slice e composição:
1. `frame_9slice_stone.png` — Moldura primária de painéis e cards
2. `frame_9slice_brick.png` — Moldura alternativa / estados de hover
3. `frame_9slice_dark.png` — Moldura de slots de inventário e cofres
4. `panel_ornate.png` — Moldura monumental para modais, tomos e overlays
5. `divider_gold.png`, `divider_stone.png`, `divider_diamond.png`, `divider_scroll.png` — Divisores de seções
6. `bar_track.png`, `bar_fill_hp.png`, `bar_fill_mp.png`, `bar_fill_xp.png` — Calhas e preenchimentos líquidos
7. `bar_cap_left_heart.png`, `bar_cap_left_orb.png`, `bar_cap_right.png` — Ponteiras estilizadas de barras
8. `crest_gold.png`, `crest_steel.png`, `crest_blue.png`, `crest_red.png` — Brasões para o Rei e Chefes
9. `plaque_wide.png`, `plaque_narrow.png` — Placas para contadores de recursos e nomes
10. `slot_frame_sword.png`, `slot_frame_shield.png`, `slot_frame_potion.png`, `slot_frame_bag.png`, `slot_frame_gear.png` — Molduras de tipos de itens
11. `chest.png` — Baú de tesouro clássico
12. Kit GBA: 20 botões (5 cores × 4 estados) e 16 ícones funcionais em pixel art

### 4.2. Novos Assets Propostos para Geração (Lote UI 2 — 8 Peças de Alto Impacto):
Para fechar todas as lacunas que impediam a interface de ser 100% estilo jogo, propomos a geração de 8 assets específicos em pixel art Dark Fantasy:

| Asset ID | Dimensão | Descrição Visual e Aplicação |
| :--- | :---: | :--- |
| `ui/mannequin_silhouette` | 256×320 | Silhueta anatômica do herói entalhada em ardósia escura para o Paper Doll do Inventário. |
| `ui/pedestal_stone` | 192×80 | Pedestal de pedra esculpida com runas incandescentes para a base dos heróis no Team Panel e Team Screen. |
| `ui/portcullis_lock` | 160×160 | Grade de ferro pesado forjado com correntes e cadeado em forma de caveira para slots e andares bloqueados. |
| `ui/parchment_scroll` | 320×480 | Textura de pergaminho antigo de couro desgastado com bordas queimadas para o fundo do Bestiário e tooltips. |
| `ui/chat_header_scroll` | 384×64 | Flâmula heráldica em madeira e ferro gravada "Crônicas da Taverna" para o topo do Chat. |
| `ui/class_crest_warrior` | 48×48 | Brasão heráldico estilizado da classe Guerreiro (espadas cruzadas e escudo de ferro). |
| `ui/class_crest_cleric` | 48×48 | Brasão heráldico estilizado da classe Clérigo (cálice sagrado e sol radiante de ouro). |
| `ui/class_crest_mage` | 48×48 | Brasão heráldico estilizado da classe Mago (orbe crepitante e livro arcano em ametista). |

*(Orçamento do lote: 8 chamadas planejadas + 0 de reserva = 8 imagens, respeitando o teto estrito de 10 chamadas por lote).*

---

## 5. Roteiro de Implementação Passo a Passo (Fases)

### Fase 1: Geração e Ingestão do Lote de Arte UI 2
1. Gerar os 8 assets listados na seção 4.2 via pipeline de arte determinístico.
2. Normalizar, recortar e integrar em `assets/generated/ui/`.
3. Atualizar manifesto de assets (`manifest.json`) e variáveis de tema em `@tia/config` e `gbaTheme.ts`.

### Fase 2: Reestruturação da Tela de Inventário (Paper Doll + Grade de Baú)
1. Reestruturar `apps/game-web/src/InventoryScreen.tsx` em layout de dois painéis simétricos:
   - Esquerda: Manequim Paper Doll com os 6 slots de equipamento clicáveis.
   - Direita: Grade do Baú de 5×4 slots táteis em ardósia, com contornos luminosos de raridade.
2. Estilizar os cards de detalhes de item como pergaminhos de grimório antigo com selos de cera.

### Fase 3: Reestruturação do Team Panel e Team Screen (Sala de Guerra)
1. Atualizar `TeamPanel.tsx` para incorporar os pedestais de pedra (`ui/pedestal_stone.png`), destaque visual dinâmico do herói ativo e grades de ferro (`ui/portcullis_lock.png`) para slots travados.
2. Atualizar a tela `TeamScreen` para apresentar os três heróis em formação tática de combate sobre estrado de pedra, e os heróis do banco como fichas heráldicas.

### Fase 4: Reestruturação do Chat Global (Crônicas da Taverna)
1. Atualizar `ChatPanel.tsx` com o pergaminho de cabeçalho heráldico.
2. Estilizar a lista de mensagens com textura de livro antigo, brasões de classe dos emissores e avisos reais decorados para eventos globais.
3. Repaginar o campo de input e botão de envio como caixa de madeira entalhada e alavanca de bronze.

### Fase 5: Refinamento do HUD, Console de Navegação e Tipografia Global
1. Aplicar a moldura de brasão (`crest_gold`) ao redor do avatar do Rei no HUD e bandejas metálicas nas moedas e diamantes.
2. Refinar a navegação inferior com acabamento tátil de relevo mecânico e iluminação rúnica.
3. Importar e aplicar a fonte serifada estilizada de fantasia com sombras lapidadas em toda a hierarquia de títulos e cabeçalhos.
4. Executar bateria de testes `npm run check` garantindo 100% de aprovação (783 testes, lint de arquitetura e preview estático HTTP 200).

---

## 6. Critérios de Aceite Visuais e de Imersão

- [ ] **Zero Sensação de Dashboard:** Nenhum painel, botão ou formulário parece uma página web ou sistema administrativo; todos os elementos possuem textura, peso físico e materiais diegéticos (pedra, ferro, ouro, pergaminho).
- [ ] **Alinhamento e Simetria Perfeitos:** Telas divididas em proporções harmônicas (ex: 40% manequim / 60% baú no inventário; grade 4×4 balanceada nos chefes).
- [ ] **Feedback Tátil Concreto:** Todo botão e slot reage ao clique com afundamento mecânico de 2–3px e ao hover com iluminação rúnica dourada.
- [ ] **Desktop-First & Mobile-Ready:** Em telas grandes, aproveitamento imersivo do espaço com molduras completas; em telas compactas (smartphones), adaptação fluida com alvos de toque nunca inferiores a 44px.
- [ ] **Acessibilidade e Contraste:** Textos perfeitamente legíveis mesmo sobre texturas de pedra/pergaminho através de sombras em duplo contorno de alto contraste.
- [ ] **Pipeline 100% Verde:** Todos os testes unitários, testes de arquitetura e checagens de preview do repositório continuam passando sem exceção.

---

*(Fim do Plano — Aguardando aprovação explícita do usuário para início da geração dos assets do Lote UI 2 e execução das Fases).*
