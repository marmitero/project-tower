# Roadmap — Tower Idle Adventure

**Versão:** 0.9 — integração Supabase dev informada; gate G2 aberto
**Status atual:** Etapa 1/G1 concluída documentalmente; Etapa 2/G2 em andamento. Blueprints, click-through, migration-base, pack de sprites inventariado e guia de deploy estão preparados; smoke tests PGlite passaram, mas não são prova Supabase. O usuário informa Supabase dev `tower-idle-adventure-dev` conectado a `marmitero/tower-idle-adventure`, Working Directory `.`, Deploy to production ON, Production branch `main`; Automatic Preview/Branching desligado. O usuário confirmou que a migration consta como “Inserted at UTC” e que as tabelas `equipment_loadouts` e `hunt_session_private_state` estão visíveis em `public`, com nomes correspondentes à migration; evidência de aplicação no projeto dev, sem verificação independente do agente. Vercel não foi integrada e nenhum projeto criado. G2 segue aberta sem validação Supabase real, revisão de segurança/infra ou estudo com 5–8 participantes. Nenhum produto jogável, gameplay, HUD de produção ou Admin Web foi implementado.
**Princípio:** cada etapa começa lendo [AI_State](AI_STATE.md), altera a documentação antes do código quando houver decisão de design e termina atualizando AI_State e evidências.

## Marcos de aprovação

- **G0 — visão documentada:** visão, requisitos e riscos registrados (baseline documental inicial concluído).
- **G1 — design aprovado:** decisões de gameplay/economia, MVP, critérios de aceite e escopo assinados antes de implementar.
- **G2 — pré-produção pronta:** arquitetura, pipeline de arte, privacidade/segurança e protótipo de UX aprovados.
- **G3 — vertical slice validada:** loop curto jogável com qualidade visual/técnica e métricas de diversão/legibilidade validadas.
- **G4 — alpha de conteúdo:** sistemas do MVP e conteúdo suficiente integrados, testes de estabilidade em andamento.
- **G5 — beta/soft launch:** serviço operável, economia e moderação verificadas em escala controlada, suporte preparado.
- **G6 — lançamento:** publicação, monitoramento e plano de resposta ativos.

Não avançar de marco por calendário apenas; cada gate depende de critérios de aceite e riscos resolvidos.

## Etapas de produção

### Etapa 0 — Descoberta e documentação inicial (concluída)

- Consolidar o briefing e registrar visão, pilares, regras fornecidas, fórmulas e ambiguidades.
- Criar AI_State, documentação principal e caminho de produção.
- **Saída:** GDD v0.1, especificação de sistemas v0.1, arquitetura proposta da HUD/UX v0.1, roadmap v0.1, AI_State atualizado.
- **Critério:** requisitos rastreáveis; nenhum código apresentado como jogo pronto.
- **Situação:** baseline de documentação inicial registrado; escopo consolidado no fechamento posterior de G1.

### Etapa 1 — Fechamento de escopo e design (G1, concluída documentalmente)

- Baseline de combate/armas/afinidades em `COMBAT_DESIGN.md` permanece aprovado pelo usuário; parâmetros de Contracorte: 20% / 50% Ataque, sem recursão/DoT.
- Stack Vercel + Supabase, separação Game Web/servidor e painel administrativo no-code isolado foram aprovados pelo usuário e especificados.
- Sob autorização explícita do usuário para resolver pendências, baseline MVP foi fechado pelo agente em `MVP_DECISIONS.md`: roster, progressão, bases, nota/poder, inimigos, loot/economia, bot, UX de escopo, exclusões pós-MVP e aceite. Estas escolhas do agente não são alegadas como decisões individuais escolhidas pelo usuário; podem ser adaptadas posteriormente.
- GDD, SYSTEMS_SPEC, COMBAT_DESIGN, HUD_UX_SPEC, Roadmap e AI_State foram sincronizados para diferenciar MVP de pós-MVP.
- **Entregável:** baseline documental completo para pré-produção. Não houve código, implementação, playtest ou balanceamento em runtime.
- **Gate G1:** fechado quanto a escopo/decisões necessárias para iniciar G2; não equivale a G3 nem a balanceamento final.

### Etapa 2 — Pré-produção técnica, segurança e UX (G2, em andamento; parcial)

- Detalhar a arquitetura já escolhida: Game Web e Admin Web em projetos separados da Vercel; servidor Supabase (Auth, PostgreSQL, Edge Functions, Storage e Realtime conforme uso), com ambientes dev/staging/production.
- Documentar CI/CD: PR → Preview Vercel (futuro); merge em `main` → Production Deployment Vercel após build/checks (quando configurada); migrations Supabase pela integração GitHub, com compatibilidade expandir→migrar→limpar. **Direção atual:** browser-only, sem instalações. O usuário confirmou Supabase dev `tower-idle-adventure-dev` ligado ao repo `marmitero/tower-idle-adventure`, Working Directory `.`, Deploy to production ON e Production branch `main`. Automatic Preview/Branching está desligado; não há DB Preview isolado por PR. A migration inicial consta como “Inserted at UTC” e as tabelas aparecem em `public`, segundo o usuário; revisar SQL antes de novos merges. Vercel não está integrada e não há projeto; importação aguarda apps seguros em `apps/game-web/` e `apps/admin-web/`. Produção permanece isolada. CLI/Docker local está superado. Ver `DEPLOYMENT_GUIDE.md`.
- Definir domínio autoritativo do servidor, schema/migrações, contratos API/eventos, autenticação, roles, RLS, rate limits, logs, backup, restauração e proteção da economia.
- Desenhar o CMS no-code, isolamento do painel, provisioning de administradores, fluxo draft/validate/publish/rollback, versionamento do catálogo e threat model, conforme `ADMIN_PANEL_SPEC.md` e `TECH_ARCHITECTURE.md`.
- Revisar e aprovar a arquitetura, os componentes, os estados e as dependências da HUD documentados em `HUD_UX_SPEC.md` antes de implementar a interface; definir UX responsiva, acessibilidade, protótipos navegáveis e teste de usabilidade.
- Definir plano de privacidade, retenção, suporte e revisão legal antes de qualquer beta público; monetização/moderação de recursos sociais só se aplicam a fases futuras.
- **Entregues nesta fatia documental:** `G2_TECHNICAL_BLUEPRINT.md` (modelo conceitual, contratos, grants/RLS, idempotência e operação de sessão), `THREAT_MODEL.md` e `G2_UX_BLUEPRINT.md`, além do protótipo local `prototypes/g2-hud/index.html`. Baselines/frameworks são propostas do agente para validação, não sistemas prontos.
- **Entregues nesta fatia técnica:** migration-base `supabase/migrations/20260928000000_g2_core_schema.sql` (17 tabelas, RLS/grants e constraints) e 9 smoke tests com PGlite, mais configuração/harness de desenvolvimento e workflow GitHub Actions para executar testes/audit em runner hospedado. A execução remota ainda aguarda acionamento após push/PR. Não inclui Edge Functions, endpoints ou gameplay.
- **Assets disponíveis:** o pack Fantasy Dungeon em `sprites/` foi inventariado em `sprites/ASSET_MANIFEST.md` (422 PNGs válidos; licenças/atribuição preservadas). É a base de arte inicial escolhida pelo usuário. Sheets de hero/mage/slime aparecem agora no click-through estático como candidatos; nenhum sprite foi integrado a uma aplicação de produção e os mapeamentos visuais permanecem provisórios.
- **Entregáveis ainda pendentes:** validar Auth/Data API/RLS; revisar SQL antes de novos merges (sem Preview Branch isolada no plano atual); validar Auth/Data API/RLS; transações de gameplay/idempotência/concorrência/reconexão; rate limits/custos; isolamento real do Admin/MFA; backup/restore/revisão de segurança; usabilidade com 5–8 convidados e decisão visual final. Não instalar CLI/Docker na máquina do usuário; GitHub Actions hospedado pode executar smoke tests PGlite sem instalação local.
- **Situação:** usuário confirmou projeto Supabase dev, integração com repo, branch `main`, Deploy to production e evidência da migration/tabelas; agente não acessou o Dashboard independentemente. Migration-base tem evidência reportada de aplicação; Data API, Storage e Auth ainda não foram validados em Supabase hospedado. Preview Branch está desligada; Vercel não está integrada e nenhum projeto foi criado. Protótipo segue estático. PGlite passou os testes modelados, mas não representa Supabase; instalação local não é requisito. Nenhuma segurança/backup de produção foi implementada/testada.
- **Gate G2:** manter aberto até critérios de `G2_TECHNICAL_BLUEPRINT.md` executados/revistos, ameaça crítica sem lacuna, UX validada e limitações/custos aprovados. Somente então iniciar G3.

### Etapa 3 — Vertical slice e prova de diversão (G3)

- Produzir pequena fatia: lobby, 1 classe/personagem, equipe mínima definida, 1 andar, poucos inimigos e itens, combate automático, loot e inventário.
- Testar animações por código sobre PNG estático: balanço, hit/crit, morte, corte/impacto e opção de reduzir efeitos.
- Medir legibilidade, duração de encontros, compreensão de atributos e valor das decisões de equipamento; ajustar documentação após testes.
- **Entregáveis:** vertical slice jogável, resultado de playtests, plano técnico atualizado.
- **Gate:** jogadores entendem o loop e a equipe aprova performance/UX; falhas de arquitetura resolvidas antes de escalar conteúdo.

### Etapa 4 — MVP funcional (parte do G4)

- Construir núcleo de conta/progresso previsto no escopo, lobby e cura, seleção de andar, combate auto de encontros 1–3, derrota/retorno, equipe, equipamento/raridade/x, nota/poder, inventário e comparação.
- Implementar bot de poção/revive com consumíveis, lojas NPC necessárias, progressão inicial e saves seguros.
- Entregar o Admin Web isolado na Vercel para CRUD no-code do conteúdo do MVP (equipamentos, personagens, inimigos, skills, andares, encontros e drops), com role admin, validação, rascunho/publicação versionada, auditoria e rollback; confirmar inacessibilidade por contas comuns.
- Usar servidor autoritativo para dados persistentes e recompensas caso já haja contas online; não confiar em cliente para economia.
- Testes unitários de fórmulas e integrações do loop; telemetria de erros sem coletar dados pessoais desnecessários.
- **Gate:** fluxo completo reproduzível e sem perda/duplicação crítica de estado.

### Etapa 5 — Conteúdo, balanceamento e produção de arte (G4)

- Usar o pack Fantasy Dungeon já inventariado como base inicial. Selecionar e validar em contexto os sprites necessários, preservando autoria/licença/crédito e evitando assumir correspondências provisórias como decisão visual final.
- Criar/adicionar assets autorais futuros em lotes de 10, com guia visual, naming/manifesto e revisão de consistência, transparência, dimensões, tamanho, atribuição/origem e QA.
- Criar/preencher conteúdo usando o painel administrativo, sem editar código, para os tipos de dados já suportados; novos comportamentos continuam dependendo de implementação.
- Criar e publicar pelo Admin Panel os registros de personagens/classes, skills, inimigos, andares, equipamentos, características, drops, economia e tutorial conforme baseline `MVP_DECISIONS.md`.
- Balancear curvas de XP/nível/loot via playtests e validar que equipamento inferior pode ser útil sem tornar raridade irrelevante; qualquer alteração numérica é registrada.
- **Gate:** cobertura de conteúdo do MVP, localização e testes de assets aprovados; odds documentadas.

### Etapa 6 — Social, atividades compartilhadas e economia (G4 → G5)

- Implementar por prioridade: amigos/chat, guildas/chat, market da comunidade e Diamonds, arena, batalhas de guilda e expansões de boss em equipe/guilda/global (o boss solo do MVP é Etapa 4/5).
- Desenvolver moderação, denúncias/bloqueio, filtros, rate limits, matchmaking, logs, operação atômica do market e ferramentas administrativas auditáveis.
- Testar transações concorrentes, retries, desconexões, abuso, fraude, inflação, bots e last-hit de boss.
- **Gate:** segurança e moderação revisadas; comércio e competição não duplicam recursos nem premiam exploits críticos.

### Etapa 7 — VIP, passe, monetização e hardening (G5)

- Implementar Free/VIP, passe e buffs somente com regras de duração, renovação, cancelamento, transparência e testes aprovados.
- Validar pagamentos, odds e requisitos legais/plataforma/região antes de ativar vendas reais.
- Testes de carga, segurança, acessibilidade, navegadores/dispositivos definidos, restauração de backup e resposta a incidentes.
- **Gate:** operações, suporte, finanças e conformidade prontos; revisão independente dos riscos críticos.

### Etapa 8 — Beta fechado / soft launch (G5)

- Liberar a grupo/região limitada, testar onboarding, retenção, estabilidade, economia e custos de serviço; coletar feedback com consentimento.
- Ajustar dificuldade, recompensas, tutorial, conteúdo e moderação; publicar notas de atualização e canal de suporte.
- **Gate:** metas de estabilidade, saúde da economia, segurança e satisfação definidas e atingidas; incidentes graves resolvidos.

### Etapa 9 — Preparação de lançamento e divulgação (G6)

- Fechar conteúdo inicial, localização, classificação etária, privacidade/termos, suporte, status page e plano de incidentes.
- Preparar site, capturas e trailer, press kit, imagens sociais, calendário editorial, comunidade oficial, FAQ, changelog e campanhas de aquisição.
- Validar funil de instalação/entrada e analytics minimizados; planejar moderação, horários de suporte e comunicação de downtime.
- **Gate:** build de release candidate aprovada, rollback e suporte ensaiados, campanha fiel ao conteúdo real.

### Etapa 10 — Lançamento e operação contínua

- Lançar com monitoramento de disponibilidade, crashes, latência, erros de transação, inflação, abuso e chamados.
- Fazer hotfix com revisão, comunicar incidentes e proteger jogadores; evitar alterações econômicas silenciosas.
- Atualizar roadmap com conteúdo sazonal, novas caixas/personagens/bosses, balanceamento e expansão; revisar documentação e AI_State em toda etapa.
- **Sucesso:** serviço estável e sustentável, comunidade segura, retenção saudável e ciclos de conteúdo com QA.

## Escopo fechado para o MVP

O escopo final já foi decidido e está detalhado em [`MVP_DECISIONS.md`](MVP_DECISIONS.md): RPG individual PvE, 3 classes, progressão compartilhada até nível 20, 10 andares e boss solo, combate automático, equipamento/loot, loja NPC/bot, sessão sem offline, cliente desktop-first em PT-BR e CMS isolado. Não presumir funcionalidades não listadas como parte do MVP. Social, mercado, monetização, caixas e conteúdo multiplayer são pós-MVP. O baseline foi escolhido pelo agente sob a autorização do usuário, sem afirmar validação por playtest.

## Riscos e mitigação

| Risco | Mitigação e gate |
|---|---|
| Escopo excessivo para equipe/orçamento desconhecidos | Priorizar vertical slice/MVP, estimar antes de prometer prazo; liberar sistemas por gates. |
| Economia de muitos atributos e rolls difícil de entender | Tooltip comparativo, normalização de unidades, simulação e testes com jogadores. |
| Mercado de diamantes/itens vulnerável a fraude | Servidor autoritativo, transações atômicas, rate limit, audit log, ferramentas operacionais e revisão externa. |
| VIP e caixas aleatórias podem ser pay-to-win/reguladas | Odds explícitas, revisão legal/plataforma, controles por região e balanceamento competitivo. |
| Conteúdo social traz abuso/moderação e custo operacional | Denúncia/bloqueio/filtros, equipe e política de operação antes de ativar. |
| Desconexões e automação duplicam recompensas | Persistência idempotente, testes de retry/reconexão e regra de pausa sem recompensa offline. |
| IA/arte inconsistente ou direitos incertos | Guia, lotes de dez, QA humano, registro de origem e política de uso. |
| Buffs/VIP distorcem arena e economia | Buffs definidos com precisão, filas/regras apropriadas e testes de impacto. |

## Como atualizar

Ao concluir qualquer etapa, atualizar status, evidências, decisões, riscos e próximos passos neste arquivo e em `docs/AI_STATE.md`. Prazos só devem ser adicionados após conhecer equipe, capacidade e orçamento.
