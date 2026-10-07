# Planejamento de Transformação UI/UX Game-First — Etapa 13.2

**Data:** 2026-10-07 · **Status:** Proposto e Arquitetado (ADR-055) · **Meta:** Transição completa de "estética de site" para "jogo autêntico Dark Fantasy RPG".

---

## 1. Diagnóstico da Interface Atual

A interface atual foi construída para atender com velocidade aos fluxos do MVP, resultando em características típicas de páginas/dashboards web convencionais:
- **Painéis planos monocromáticos:** Contêineres retos em CSS com cores planas (`#1c1a2a`), bordas simples de 1px cinza (`#2e2b42`) sem texturas, chanfros ou detalhes fantásticos.
- **Botões genéricos:** Retângulos com cantos levemente arredondados, sem volume físico, sem relevo de clique (push-down 3D mecânico) e sem molduras metálicas.
- **Barras de recursos planas:** Elementos tipo barra de progresso web padrão (retângulos preenchidos), sem ponteiras de gárgula, sem gemas de vida/mana e sem ornamentos de metal batido.
- **Navegação de abas horizontais:** Parecida com abas de aplicativo corporativo, sem temática de console de RPG.

---

## 2. Nova Identidade Visual: Game-First Dark Fantasy Pixel UI

Para que o exterior tenha o mesmo peso, acabamento e identidade visual das arenas e dos 80 personagens pixel art, a interface será estruturada nos seguintes pilares:

### 2.1. Molduras e Painéis Táteis (9-Slice Borders & Texturas de Jogo)
- **Moldura Rúnica / Ferro Forjado:** Bordas 9-slice estilizadas em pixel art com cantos ornamentados, rebites de bronze e chanfro iluminado no topo esquerdo.
- **Fundo com Textura e Vinheta:** Painéis com textura sutil de pedra polida escura ou pergaminho envelhecido, com gradiente radial escuro nas bordas para focar a atenção do jogador nos dados.
- **Divisores Temáticos:** Linhas ornamentadas com uma pequena gema ou runa celta/fantástica no centro separando seções internas.

### 2.2. Botões com Físico de Jogo e Resposta Tátil
- **Volume Tridimensional:** Botões com topo iluminado e sombra projetada na base (efeito biselado/beveled de 3 tons de pixel).
- **Tipos de Botão Temáticos:**
  * **Primário / Confirmação:** Ouro antigo / bronze lustroso com inscrição brilhante.
  * **Secundário:** Madeira nobre escura com bordas de ferro batido.
  * **Perigo / Desafio:** Placa de ferro negro com gema ou filete rubi brilhante.
- **Microinterações:**
  * Ao passar o mouse: brilho dourado rúnico ao longo da borda.
  * Ao clicar / tocar (`:active`): deslocamento de 2–3px para baixo e para a direita, dando sensação mecânica real de pressão de tecla de fliperama/console.

### 2.3. Barras de Vida, Mana e Recursos com Ornamentos
- **Calha de Metal Esculpido:** As barras de HP e XP passam a ficar dentro de uma calha de ferro ornamentada.
- **Ponteiras e Gemas:** Extremidades com detalhes em voluta ou gárgulas em miniatura, e uma gema cravada no início da barra (Rubi para HP, Safira para Mana, Âmbar para XP).
- **Preenchimento Iluminado:** Gradiente com reflexo de luz cilíndrico na parte superior da barra, dando volume líquido ou de energia mágica.

### 2.4. HUD e Console de Navegação
- **Barra de Navegação em Console Inferior:** Abas desenhadas como selos ou placas entalhadas em metal, com ícones estilizados e destaque iluminado na aba ativa.
- **Placa de Identidade do Rei:** No topo, o avatar do Rei envolto em uma moldura de escudo/brasão heraldico com nível em placa dourada.

---

## 3. Arquitetura Técnica e Fases de Execução

1. **Assets Base de UI (`packages/ui/assets/`):**
   - Spritesheets e vetores rasterizados para:
     * `frame_stone_9slice.png` e `frame_iron_9slice.png`
     * `btn_gold.png`, `btn_iron.png`, `btn_ruby.png` (estados normal, hover, pressed)
     * `bar_frame_hp.png`, `bar_frame_xp.png`
     * `icon_set_game.png`
2. **Atualização do Pacote `@tia/ui`:**
   - Componentes `Panel`, `ActionButton`, `ProgressBar`, `StatPill` adaptados para utilizar as classes 9-slice e estilização de jogo retro-moderno.
3. **Reestilização das Telas do Jogo:**
   - **Torre e Caçada:** HUD de combate integrado à moldura da Arena.
   - **Boss:** Cards 4×4 em estilo de cartas de desafio com borda dourada/bronze e modal pop-up como tomo arcano.
   - **Rei e Heróis:** Vitrines de equipamentos estilizadas como manequim de inventário de RPG clássico.
   - **Inventário e Market:** Grade de slots de itens com fundos de couro/tecido reforçado e contornos de raridade em neon arcano.
   - **Equipe:** Formação tática em estrado de pedra com pedestais de batalha.
