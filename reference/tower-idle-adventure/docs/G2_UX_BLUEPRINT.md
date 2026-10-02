# G2 — UX blueprint e protótipo de navegação

**Versão:** 0.2 — sprites iniciais candidatos no click-through
**Status:** wireframe e protótipo local sem backend foram preparados para revisão; não é a HUD do jogo nem uma implementação funcional. Usabilidade com jogadores ainda não foi testada, portanto o Gate G2 permanece aberto.

Fonte de verdade de regras: [`MVP_DECISIONS.md`](MVP_DECISIONS.md). A estrutura da HUD permanece em [`HUD_UX_SPEC.md`](HUD_UX_SPEC.md). O arquivo [`../prototypes/g2-hud/index.html`](../prototypes/g2-hud/index.html) é um click-through isolado, com dados fictícios e sem Auth, combate, salvamento, compras ou chamadas de API.

## 1. Objetivos e público

- Provar compreensão de **lobby → equipe/inventário → escolher andar → hunt → retorno** antes da implementação.
- A 1280×720, priorizar palco central e cards de equipe; perfil/Coins, navegação e automação não devem encobrir batalha.
- Mostrar uma ação por tela principal e mover detalhes para painéis secundários, sem esconder estado de HP, consumíveis ou conexão.
- Desktop-first, PT-BR, jogadores convidados; chat, VIP, market, PvP e painel Admin não aparecem nesta experiência.

## 2. Wireframe desktop (mínimo formal: 1280×720)

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ TORRE DAS BRUMAS    Nível 08  ███████ XP   Poder 1.240         Lobby Equipe Itens Torre  Coins│  ~56px
├───────────────────┬───────────────────────────────────────────────────────────────┬──────────┤
│ EQUIPE 2/3         │ HUNT · ANDAR 4                         [Loja rápida] [Encerrar]│ Automação│
│ ┌───────────────┐ │                                               Sessão: 12:04   │ Poção ON │
│ │ guerreiro  78%│ │       ┌─────────┐         VS       ┌─────────┐               │ HP ≤ 50% │
│ │ HP / status  │ │       │ aliado  │                  │ inimigo │               │ Revive OFF
│ └───────────────┘ │       └─────────┘                  └─────────┘               │ Skills ON │
│ ┌───────────────┐ │       ┌─────────┐                  ┌─────────┐               │ Retorno OFF
│ │ arcanista 64% │ │       │ aliado  │                  │ inimigo │               │           │
│ └───────────────┘ │       └─────────┘                  └─────────┘               │           │
│ [slot vazio]      │                                                               │           │
│                   │  Encontro 18 · inimigos derrotados 27 · loot 3 · Coins 480  │           │
├───────────────────┴───────────────────────────────────────────────────────────────┴──────────┤
│ ÚLTIMA HUNT · até 100 eventos confirmados · filtros/avisos · permanece no lobby/reconexão    │  ~120px
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Proporções iniciais para wireframe

- Topbar: 56–64 px; coluna de equipe: 220–240 px; automação: 220–260 px, recolhível.
- Palco central ocupa o maior espaço restante; cabeçalho e controles ficam fora da área de sprites.
- Log inferior: cerca de 120 px, recolhível. Toasts não ocultam HP nem ações importantes.
- Loja rápida abre drawer/modal lateral de até 360 px, mantém o contexto da hunt e **não pausa** a simulação.
- Medidas são pontos de partida para protótipo; devem ser revistas por usabilidade e legibilidade na resolução mínima.

## 3. Wireframe estreito (não é target mobile formal)

```text
┌──────────────────────────────────────┐
│ Torre · Nv 08 · 480 Coins   ☰ Perfil │
├──────────────────────────────────────┤
│ ANDAR 4 · Hunt  [Loja] [Encerrar]    │
│ ┌────────┐   VS   ┌────────┐         │
│ │ grupo  │        │ inimigo│         │  batalha nunca é a primeira área removida
│ └────────┘        └────────┘         │
│ HP de equipe: 78% · 64% ·  —         │
├──────────────────────────────────────┤
│ [Equipe] [Automação] [Log] recolhível│
└──────────────────────────────────────┘
```

Em viewport estreito, perfil detalhado, log longo e equipe completa tornam-se drawers; manter andamento/HP e ação **Encerrar hunt** acessíveis. Não declarar suporte mobile completo com base neste wireframe.

## 4. Navegação e fluxos

### Primeiro acesso

1. Página de convite/login → confirmar e-mail → criar sessão.
2. Escolher um personagem inicial (Guerreiro, Arcanista ou Ladino) → mostrar kit comum já equipado.
3. Lobby → explicar Coins/Poções/Revive e mostrar seleção de andar disponível.

### Preparar e iniciar

1. Lobby abre Equipe (1–3), Equipamentos ou Inventário.
2. Comparação revela diferença de stats e Nota/Poder; descartar exige confirmação explícita.
3. Torre lista nível mínimo, pool/recompensas e bloqueio de nível.
4. Iniciar hunt exige confirmar andar; a tela destaca sessão ativa e versão/conexão não deve aparecer como escolha do usuário.

### Durante a hunt

- HP, alvo/inimigos, andar/encontro e conexão permanecem legíveis; status comunica texto/ícone, não só cor.
- Loja rápida cobre uma parte lateral e mantém a hunt ativa; compra só muda UI após resposta confirmada do servidor.
- Encerrar hunt abre confirmação: grupo atual será interrompido, inimigos já derrotados mantêm XP/Coins, sem drop de equipamento para grupo incompleto, retorno/cura no Lobby.
- Derrota total mostra resumo, causa, loot/XP confirmados e toggle de auto-retorno (desligado por padrão). Se ligado, explicar “cura grátis e reinicia o mesmo andar em 5 s”.
- Desconexão exibe último snapshot confirmado e ação **Reconectar/Retomar**; não inventa progresso offline nem apresenta spinner infinito.

## 5. Conteúdo por tela

| Tela/painel | Informação primária | Ação primária | Guardrail/erro |
|---|---|---|---|
| Login convite | estado do link, e-mail (privado), carregamento | confirmar convite/entrar | convite expirado, e-mail não verificado, retry seguro |
| Lobby | level/XP/Coins, equipe/HP, hunt anterior e status | Escolher andar | sessão antiga não avança até novo comando |
| Equipe | três posições, classes desbloqueadas, poder/HP/afinidade | mover/remover membro | impedir classe duplicada/locked e mais de 3 |
| Equipamento | 10 slots e item atual | comparar/equipar | slot/nível incompatível e item pertencente a outra conta |
| Inventário | filtro, raridade, nível, nota, poder, limite 300 | selecionar/descartar | descartes irreversíveis pedem nome/raridade e confirmação |
| Torre | 10 andares, requisito e pool | selecionar/iniciar | mostrar nível necessário sem sugerir autoavanço |
| Hunt | palco, 1–3 inimigos, HP, estado e últimos eventos | loja/encerrar hunt | não ocultar time nem pausar loja |
| Loja NPC | Coins, consumível, cura/preço/estoque | selecionar/confirmar | mostrar preço total e saldo insuficiente; protótipo não compra |
| Automação | poção, limiar, revive, skills e retorno | ativar/desativar regra | mostrar estoque zero e efeito do toggle |
| Última hunt | até 100 eventos confirmados | filtrar/rolar | substituída ao iniciar outra hunt; não é histórico permanente |

## 6. Estados globais, feedback e acessibilidade

- `loading`: skeleton com contexto e timeout; evitar tela vazia.
- `offline/reconnecting`: congelar visual no último dado confirmado; desabilitar ações econômicas e oferecer retry; sem avanço local.
- `empty`: perfil novo, slots/equipe vazios, inventário sem loot — indicar próximo passo sem criar recompensas fictícias.
- `error`: mensagem curta, código de suporte não sensível e ação segura; nunca confirmar item/compra antes do servidor.
- `inventory full`: indicar 300/300, terminar grupo atual, retornar Lobby e descartar de forma explícita; nunca sumir com drop já creditado.
- `locked floor`: nível requerido e nível atual em texto, além de ícone.
- Acessibilidade: landmarks/headings semânticos, foco visível, navegação por teclado, tooltips também por foco/clique, texto ≥4.5:1 quando aplicável, informação além de cor, `prefers-reduced-motion`, sem flashes agressivos, controles com rótulo e alvo confortável.
- Som, vibração e efeitos não são necessários para entender o resultado; oferecer mute/redução.

## 7. Plano de teste de usabilidade (a executar)

**Amostra:** 5–8 jogadores convidados que não tenham lido o GDD; sessão moderada de 20–30 minutos usando protótipo e, após existir, vertical slice. Não usar contas reais de produção nem dados pessoais além do consentimento mínimo.

**Tarefas:** (1) entrar e identificar progresso; (2) montar equipe/equipar item e entender x/Nota/Poder; (3) escolher andar e identificar requisito; (4) configurar poção/revive; (5) compreender que a loja não pausa; (6) encerrar hunt/interpretar recompensa; (7) explicar o que ocorre se a conexão cair.

**Métricas e gates de UX:** ≥80% (arredondado para cima; 4/5 ou 7/8) concluem cada tarefa essencial sem ajuda; ninguém confunde preview com compra/loot real; ≥80% interpretam corretamente HP, nível do andar e regra offline; zero falha de severidade alta (por exemplo, perda de item ou acreditar que compra foi confirmada sem confirmação). Registrar tempo por tarefa, erros, perguntas e recomendações anonimizadas.

**Status:** protocolo e wireframes documentados; ainda não houve sessão com participantes. G2 não pode ser marcado completo até revisar protótipo com testers e incorporar achados críticos.

## 8. Artefato navegável

`prototypes/g2-hud/index.html` é um mockup clicável, responsivo em desktop, com dados fictícios e pequenas transições locais entre Lobby, Equipe, Inventário, Torre e Hunt. Pode abrir/fechar a Loja NPC e simular navegação. Não autentica, não salva, não calcula combate/loot, não compra itens, não usa Supabase e não inclui Admin Web. O pack Fantasy Dungeon de Nika Studio, inventariado em [`../sprites/ASSET_MANIFEST.md`](../sprites/ASSET_MANIFEST.md), foi escolhido como a fonte inicial de arte. O click-through agora apresenta sheets de `hero`, `mage` e `slime` como candidatos visuais provisórios, sem aprovação final de mapeamentos nem integração numa aplicação de produção. Avatares/itens restantes continuam placeholders. Assets adicionais poderão ser criados/adicionados depois; não haverá arte procedural.
