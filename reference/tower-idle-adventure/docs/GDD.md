# GDD — Tower Idle Adventure

**Versão:** 0.5 — fonte visual inicial e licenciamento documentados
**Estado:** baseline do MVP fechado para pré-produção; nenhum gameplay implementado. Regras exatas e números estão em [MVP_DECISIONS.md](MVP_DECISIONS.md). Sistemas de longo prazo explicitamente marcados como pós-MVP.
**Data da atualização:** 2026-09-28

## 1. Visão do produto

**Tower Idle Adventure** é um RPG idle 2D para navegador no qual o jogador prepara uma equipe em um lobby, escolhe um andar da torre adequado ao seu nível e deixa a equipe lutar automaticamente. O **MVP** é PvE individual persistente, sem interação entre jogadores; sistemas sociais/competitivos pertencem à visão pós-MVP. O baseline completo de produto, números e aceite do primeiro corte está em [MVP_DECISIONS.md](MVP_DECISIONS.md).

**Fantasia central:** montar uma equipe cada vez melhor, observar combates rápidos e satisfatórios e encontrar uma combinação rara de equipamento, atributos e características que transforme a build.

**Público:** jogadores de RPGs de progressão, auto-battlers e idle games que preferem decisões de preparação e otimização a controle manual de cada ação.

**Plataforma e formato do MVP:** Game Web no navegador, PT-BR, desktop-first (alvo formal ≥1280×720; Chrome, Edge e Firefox recentes), com adaptação básica e painéis recolhíveis em telas menores. Mobile nativo e suporte mobile completo são pós-MVP.

## 2. Pilares de design

1. **Preparar, caçar, melhorar:** o lobby é a base de cura, equipamento, evolução, compras e configuração da automação.
2. **Combate legível e veloz:** equipes de um a três inimigos, ações guiadas por velocidade e feedback visual inequívoco para ataque, crítico, dano e derrota.
3. **Loot com decisões reais:** raridade, qualidade de rolagem e atributos permitem que um item de nível menor seja melhor para uma build específica.
4. **Idle sem perda de agência:** a caçada permanece no andar escolhido; derrotas retornam a equipe ao lobby. No MVP não existe autoavanço; eventual autoavanço VIP é pós-MVP.
5. **Social sem mundo compartilhado:** chat, guildas, arena, mercados e chefes são serviços/sessões próprios; não há personagens de outros jogadores caminhando na hunt pessoal.
6. **Arte estática, identidade coerente:** o início do projeto usa o pack de sprites Fantasy Dungeon, do Nika Studio, presente em `sprites/`; depois serão adicionados/criados assets conforme a direção visual, mantendo arquivos raster estáticos e efeitos/animações em código. Nada de geração procedural de arte durante a partida.

### Arte inicial e proveniência

O projeto adota como base inicial o pack Fantasy Dungeon de Nika Studio, já presente em [`../sprites/`](../sprites/) e inventariado em [`../sprites/ASSET_MANIFEST.md`](../sprites/ASSET_MANIFEST.md). O inventário e os mapeamentos ali listados são candidatos de avaliação; ainda não houve integração ao cliente nem aprovação visual final de cada sprite. O README incluído declara uso pessoal/comercial com crédito “Assets by Nika Studio” e proíbe revenda isolada; como o pacote também inclui um LICENSE MIT, preservar os avisos e seguir temporariamente as condições mais conservadoras até resolver a divergência. Não é parecer jurídico. Assets adicionais podem ser criados/adquiridos depois em lotes de dez; sem arte procedural em runtime.

## 3. Público, sessão e loop principal

### Loop principal

1. Criar/entrar em conta de alpha fechado por convite e escolher Guerreiro, Arcanista ou Ladino.
2. No lobby, montar equipe de até três, consultar equipamentos/inventário e configurar skills e consumíveis.
3. Equipar kit inicial Comum, curar gratuitamente e comprar somente poções/revives em Coins.
4. Selecionar manualmente um dos andares liberados e iniciar a hunt.
5. Vencer encontros comuns de 1–3 inimigos, recebendo XP, Coins e rolagens de equipamento; a primeira vitória comum nos andares 3 e 6 desbloqueia companheiros.
6. Repetir o mesmo andar; no andar 10, derrotar o boss individual recorrente.
7. Em derrota, retornar ao lobby e curar; se toggle de retorno automático estiver ligado, reiniciar o mesmo andar após 5 s.
8. Comparar/equipar loot e preparar a próxima sessão. A última hunt mantém até 100 eventos confirmados (substituídos ao iniciar outra); não há histórico longo. Valores, fórmulas, drops e critérios completos estão em `MVP_DECISIONS.md`.

Sem recompensa offline: fechar o cliente/perder conexão congela a simulação no último evento confirmado. VIP, caixas, venda/negociação, social e PvP são pós-MVP.

### Ritmo desejado

Combates curtos, leitura visual imediata e encadeamento automático entre encontros. O jogador toma decisões antes e entre hunts; não precisa clicar em cada ataque. Meta inicial documentada em `MVP_DECISIONS.md`: encontro comum 10–30 s e boss 25–60 s, medida no nível recomendado e com gear Comum médio. Ainda não foi testada; G3 deverá medir duração, legibilidade e frequência de intervenção e poderá ajustar números com evidência.

## 4. Classes, personagens e equipe

- **MVP fechado:** Guerreiro, Arcanista e Ladino; na criação escolhe-se um, a primeira vitória comum no andar 3 desbloqueia à escolha um companheiro e a primeira no andar 6 o último. Equipe de 1–3 integrantes organizada no lobby, sem duplicatas; todos compartilham nível 1–20 e começam em 1★.
- Cada classe tem afinidade única de arma (+5% ao atributo ofensivo principal): Guerreiro/Espada, Arcanista/Cajado e Ladino/Adaga. Qualquer arma pode ser equipada sem restrição.
- Duas skills fixas por classe, com automação liga/desliga por slot; sem energia, evolução de skill ou cópias no MVP. Stats e kits completos estão em `MVP_DECISIONS.md`.
- Estrelas 2★–5★, caixa de personagem, duplicatas e fusão permanecem visão pós-MVP, não regras habilitadas ou entregues no primeiro corte.

## 5. Torre e combate

O baseline aprovado de fórmulas de dano, velocidade, alvos e traços de armas está em [Combate e balanceamento](COMBAT_DESIGN.md). Valores poderão ser ajustados após playtests, mas não permanecem pendentes de aprovação conceitual.

- Cada andar tem requisito mínimo de nível, inimigos e faixas próprias de recompensa; andares mais altos oferecem recompensas potencialmente maiores/mais raras.
- No MVP, o jogador seleciona manualmente o andar e a hunt permanece nele; não há VIP nem avanço automático. Autoavanço por VIP é pós-MVP.
- No andar, encontros repetidos contêm equipes de 1 a 3 inimigos. Ao encerrar um encontro com vitória, outro começa automaticamente enquanto a hunt continuar.
- O baseline aprovado separa Velocidade (ordem inicial) de IAS (intervalo entre ações); fórmulas, dano, alvos, crítico, armas e limites estão em `COMBAT_DESIGN.md`. Implementação/playtest continuam pendentes; qualquer ajuste exige evidência documentada.
- Bot MVP: poções ligadas por padrão, limiar inicial 50% (configurável em 10–90% de 5 em 5), lista de raridades permitidas e ordem de consumo definida; revive desligado por padrão, prioridade esquerda→direita, uma vez por personagem/encontro; skills usam ordem fixa por slot. Retorno após derrota desligado por padrão; se ligado, cura no lobby, espera 5 s e reinicia o mesmo andar. Loja rápida mantém o contexto e não pausa o combate. Configuração completa em `MVP_DECISIONS.md`.
- Derrota encerra encontro e volta ao lobby; cura lá é grátis. Se automação de retorno estiver ligada, volta ao mesmo andar após 5 s e nunca progride de andar por conta própria. Revive restaura a percentagem do HP máximo e é consumido no evento de queda antes da derrota total. O jogador pode encerrar a hunt a qualquer momento; XP/Coins de inimigos já derrotados ficam, grupo incompleto não rola equipamento e o Lobby cura gratuitamente.
- O MVP tem os inimigos, stats-base, papéis e boss Sentinela definidos em `MVP_DECISIONS.md`. Entre encontros, HP de sobreviventes persiste, cooldowns ficam prontos, status expiram e personagem caído sem revive só retorna após cura no Lobby. Sentinela é imune a Atordoamento e recebe Veneno normalmente; não há PvP. Ajuste numérico segue playtest.

### Armas e afinidades

Além dos nove slots de equipamento, todo personagem possui um slot **Arma**. Tipos: Espada, Adaga, Machado, Maça, Besta, Cajado, Livro Arcano, Luvas e Garras. Qualquer personagem pode equipar qualquer tipo; afinidades MVP são Guerreiro/Espada, Arcanista/Cajado e Ladino/Adaga, concedendo +5% no atributo ofensivo principal. Traços e gatilhos aprovados constam em `COMBAT_DESIGN.md`; Sentinela, único boss MVP, é imune a Atordoamento e não resiste a Veneno. **Espada — Contracorte (validado pelo usuário):** ao receber ataque direto de alvo único, 20% de chance de contra-atacar agressor com dano físico de 50% do Ataque atual; sem recursão ou proc por DoT. Parâmetros podem ser revisitados mediante playtest/evidência.

A característica intrínseca do tipo de arma é separada da característica aleatória adicional de itens Lendários/Celestiais; um efeito não substitui o outro. O subtipo de arma também é distinto do slot de armadura Luva.

### Apresentação visual do combate

Sprites estáticos estilo card, com balanço/avanço ao agir, piscar ao receber dano, variante de impacto crítico e duas piscadas seguidas de desaparecimento ao morrer. Efeito visual distingue corte de lâmina e impacto contundente. Partículas, números, flashes e transições são implementados em código; leitura e acessibilidade devem prevalecer sobre excesso de efeitos. A animação não precisa alterar o sprite-fonte.

## 6. Equipamentos, loot e progressão

Slots definidos para o MVP: **Arma, Peitoral, Elmo, Calça, Bota, Luva, Colar, Aura, Asa e Pet**. Todo item tem os oito atributos; os 18 vetores-base, fórmula de nível e catálogo inicial estão fechados em `MVP_DECISIONS.md`. Arma tem nove tipos.

Raridades: **Comum, Incomum, Raro, Épico, Lendário, Celestial**, com multiplicadores de atributos-base de 1,0; 1,2; 1,5; 2,0; 2,5; 3,0. Cada atributo do item possui seu próprio x, gerado aleatoriamente de forma independente. Regra confirmada: x é sempre um número inteiro de 1 a 50; o fator aplicado é `x/10`, de 0,1x a 5,0x em passos de 0,1. Exemplo de exibição: rolagem `x=37`, fator aplicado `×3,7`. Não usar valores fracionários como `x=4,72`.

Equipamentos Lendários e Celestiais recebem exatamente uma característica adicional sorteada do pool igualitário de quatro efeitos (Roubo Vital, Ruptura de Guarda, Foco Crítico, Concentração). Valores e limites estão definidos em `MVP_DECISIONS.md`; não escalam por raridade nem x.

Inventário MVP comporta 300 itens não equipados por conta; no limite, termina o grupo atual, volta ao Lobby e bloqueia novo encontro até descartar itens. Descarte é permanente e exige confirmação; não há venda no MVP. Tooltip/detalhe mostra identidade, slot, nível, raridade, atributos-base e finais, x por atributo, característica, nota, poder total, origem e condição de equipamento. Nota/poder são informativos e não substituem comparação atributo a atributo.

## 7. Economia e lojas

**MVP:** Coins é a única moeda. XP, Coins por inimigo, limite de nível, odds, recompensas de boss e preços/cura de seis poções e três revives estão fechados em `MVP_DECISIONS.md`. A loja NPC vende apenas esses consumíveis; não há caixa, material, Diamond, transação paga ou mercado entre jogadores.

Diamonds, caixas de equipamento/personagem, materiais, mercado/fees e outros sumidouros de Coins são ideias da visão pós-MVP e não devem aparecer como sistemas ativos na interface nem integrar a primeira versão. Se retomados, exigir odds públicas, modelo de inflação, transação atômica, antifraude, auditoria e revisão jurídica/plataforma.

## 8. Free, VIP e monetização (pós-MVP)

O alpha/MVP é gratuito, fechado por convite e sem VIP, passe, anúncios, pagamento ou moeda premium. Benefícios VIP (+30% XP, +15% farm, autoandar), passe diário e compra por Diamonds são conceitos pós-MVP sujeitos a decisão formal, orçamento, regras regionais e validação de impacto econômico/competitivo. Nenhum deles é gate para o MVP.

## 9. Recursos sociais e atividades (pós-MVP)

Estes recursos pertencem ao roadmap posterior e não existem no MVP. Quando desenvolvidos, serão serviços/sessões compartilhados, sem exploração em mapa aberto conjunto:

- Chat global e chat de guilda.
- Guildas, membros, funções e chat.
- Amizades e chat privado entre amigos.
- Arena PvP (regras, matchmaking, temporadas e combate assíncrono/ao vivo pendentes).
- Batalhas de guilda.
- Mercado da comunidade.
- Expansões de boss em equipe, de guilda e global são pós-MVP; o MVP tem apenas Sentinela individual recorrente no andar 10. Boss global será evento coletivo, com regra de last hit e recompensas a definir.

Chat e mercado exigem denúncia, bloqueio, filtros, limites contra spam, moderação e trilhas de auditoria. O boss global precisa ter regra transparente contra last-hit farming, desconexão e disputa de autoria.

## 10. UX e HUD

A organização espacial e arquitetura propostas para a HUD principal estão em [HUD / UX — arquitetura visual](HUD_UX_SPEC.md). A tela mantém perfil no topo esquerdo, equipe logo abaixo, navegação central no topo, automação no topo direito, batalha/HUB no centro e log embaixo. No MVP, o canto inferior direito exibe avisos de conexão/sistema; chat é pós-MVP. A HUD comunica HP/equipe, andar, encontro, automação e loot sem expor permanentemente todos os detalhes.

1. Conta de alpha fechado, seleção inicial de classe e tutorial de entrada.
2. Lobby: equipe, status, cura grátis, equipamento, skills, inventário e loja NPC de consumíveis.
3. Inventário: filtros, comparação, tooltip detalhado e ações de equipar/descartar protegidas.
4. Configuração de poções, revives, skills e retorno automático conforme `MVP_DECISIONS.md`.
5. Seleção manual de andar com requisito e preview de recompensas.
6. Hunt: combate, HP/equipe, andar/encontro, log e acesso à loja rápida sem pausar combate.
7. Perfil/progresso/Coins e preferências de acessibilidade.

Chat, amigos, guilda, market, PvP, VIP, passe, Diamonds e boss compartilhado são telas pós-MVP, inicialmente ocultas.

## 11. Direção de arte e áudio

- Identidade visual coesa e legível em escala pequena. A base inicial é o pack externo Fantasy Dungeon de Nika Studio, referenciado em `sprites/ASSET_MANIFEST.md`; preservar crédito/licença e verificar cada sprite no contexto do jogo.
- Assets adicionais de personagens, inimigos, ícones, equipamento, cenários, UI e efeitos estáticos poderão ser criados/adicionados em **lotes de 10**, cada lote com manifesto, dimensões, transparência, naming, origem/licença e checklist de QA.
- Nada de arte gerada proceduralmente em runtime. Cada imagem aprovada vira arquivo estático versionado; movimentos/efeitos podem ser código sobre esses assets. Créditos e limitações dos assets externos devem ser mantidos.
- Paleta, referências, tamanhos, limites de animação, pipeline e política de fontes/áudio serão fechados no guia de arte antes da produção de assets adicionais.

## 12. Acessibilidade e qualidade

Contraste e escala de texto adequados, sinais além da cor, opção de reduzir efeitos/piscadas, controle de volume, interface utilizável por teclado e avisos antes de ações irreversíveis. Considerar respeito à preferência por movimento reduzido e prevenir flashes intensos. Testes cobrem fórmulas, combate determinístico, economia transacional, responsividade, segurança e recuperação de sessão.

## 13. Escopo por fases

O MVP baseline fechado inclui alpha convidado, progressão PvE individual, trio de classes, 10 andares e boss solo, combate automático aprovado, equipamentos/loot/nota/poder, loja/bot, HUD desktop-first e painel administrativo de conteúdo isolado. A definição completa, números e critérios de aceite estão em [`MVP_DECISIONS.md`](MVP_DECISIONS.md). Não implementar gameplay/painel nesta etapa documental: Roadmap autoriza primeiro G2 de pré-produção técnica, depois G3 vertical slice.

**Pós-MVP:** estrelas/duplicatas/caixas, VIP/pagamentos, Diamonds, market, chat/social, guildas, PvP, bosses compartilhados, progresso offline, mobile completo, idiomas adicionais e eventos em runtime. A lista e a ordem podem ser priorizadas futuramente sem alterar o MVP silenciosamente. Ver [Roadmap](ROADMAP.md).

## 14. Decisões de design

### Fechadas para o MVP

Scope, login, trio inicial e afinidades, progressão 1–20, XP/Coins, 10 andares, inimigos/boss, stats de personagens/inimigos/itens, duas skills por classe, loot e raridades, Nota/Poder, consumíveis/preços, revive/retorno, ausência de offline/social/monetização, alvos de browser, HUD e critério de aceite estão fechados em `MVP_DECISIONS.md`. O baseline de combate segue `COMBAT_DESIGN.md` (aprovado pelo usuário; valores ajustáveis com evidência de playtest). Essas decisões foram tomadas pelo agente sob autorização explícita do usuário; não representam escolhas individuais anteriormente confirmadas por ele.

### A definir antes de etapas posteriores, não bloqueiam o MVP

- Detalhes de stars 2★–5★, duplicatas/fusão e caixas/gacha.
- Modelo de VIP, passe, pagamentos, Diamonds, market, fees, proteção econômica e operação/legislação por região.
- Chat, moderação, guildas, PvP, matchmaking, bosses colaborativos e eventos ao vivo.
- Expansão de conteúdo além da Torre das Brumas (classes, áreas, inimigos, skills e equipamentos).
- Validação técnica completa de schema/API/RLS, migrations, limites/custos, MFA, backup/restore e orçamento (G2); a migration-base passou apenas smoke tests PostgreSQL/PGlite e ainda não foi aplicada no Supabase ou provisionada em serviço real.
- Arte-final e protótipos visuais; pipeline e princípios estão registrados, implementação/criação de assets ainda não aconteceu.

## 15. Arquitetura aprovada e painel administrativo

A direção tecnológica aprovada é **Vercel + Supabase**, mantendo Game Web (cliente de navegador) separado do servidor. Vercel entrega a experiência visual; Supabase concentra Auth, banco persistente e endpoints confiáveis para gameplay/economia. Dano, loot, inventário, saldo e transações nunca são decididos pelo cliente. Consulte [Arquitetura técnica](TECH_ARCHITECTURE.md).

Também é requisito aprovado um **Painel Administrativo de Conteúdo** sem necessidade de código para tipos suportados. O painel será uma aplicação Vercel isolada do Game Web, sem link visível para jogadores; jogadores comuns não carregam sua interface nem acessam APIs administrativas. Role é validada no servidor/Supabase. Conteúdo passa por validação, rascunho, publicação versionada, auditoria e rollback; não se pode depender apenas de esconder uma URL. Para o MVP, editar/publicar os tipos que alimentam os sistemas do primeiro corte; eventos podem ser cadastrados como rascunho, sem runtime. Nova lógica de gameplay ainda exigirá desenvolvimento. Ver [especificação do Painel Administrativo](ADMIN_PANEL_SPEC.md).
