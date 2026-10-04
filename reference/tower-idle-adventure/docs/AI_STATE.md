# AI_State — handoff vivo do Tower Idle Adventure

**Objetivo:** este documento é a passagem de contexto para qualquer pessoa/agente que continue o projeto sem acesso a conversas anteriores. Leia-o primeiro em cada etapa; depois consulte os documentos-fonte indicados abaixo. As afirmações sobre plataformas externas são identificadas como relato do usuário quando não foram verificadas diretamente no Dashboard.

**Última atualização documental:** 2026-09-28. **Marco atual:** G2 (pré-produção técnica, segurança e UX) em andamento; não avançar para gameplay/vertical slice antes do gate G2.

**Checkout da sessão:** `/home/user/tower-idle-adventure` · **remote:** `origin` → `marmitero/tower-idle-adventure` · **branch obrigatória:** `arena/01a0e8b8-tower-idle-adventure`.

## 1. Regras obrigatórias para quem continuar

1. No início: ler este arquivo, conferir `git status`, branch e `git log`; depois abrir os documentos-fonte relevantes. Não presumir que uma anotação antiga prevalece sobre o estado mais recente.
2. Na sessão que originou este handoff, a branch foi `arena/01a0e8b8-tower-idle-adventure`. **Em uma nova conversa, obedecer à branch fixa indicada pelo Agent Mode para aquela sessão; nunca trocar/criar outra branch nem enviar alterações para outra branch.** O repositório canônico é `marmitero/tower-idle-adventure`.
3. Ao final de toda etapa, mesmo parcial/pausada: atualizar este AI_State e os documentos afetados; executar verificações pertinentes; criar commit e fazer push somente para `origin arena/01a0e8b8-tower-idle-adventure`; confirmar sucesso e informar o hash. Não deixar trabalho concluído sem checkpoint.
4. Não afirmar que algo foi testado, implantado, aprovado ou configurado em um serviço externo sem evidência. Separar sempre **estado verificado no repositório**, **relato do usuário** e **proposta/recomendação**.
5. O usuário prefere fluxo browser-first para GitHub, Supabase e Vercel e não quer instalar CLI, Docker ou outras ferramentas no próprio computador. O agente deve fazer primeiro tudo que for possível no repositório e pelas integrações disponíveis; só pedir ajuda ao usuário para login/OAuth/consentimento, ações que exijam Dashboard autenticado, permissões, billing ou algo que o agente não possa acessar. Nunca solicitar senha, token, service-role key, código MFA ou outro segredo; ensinar o clique necessário pelo navegador e pedir apenas confirmação/dados não secretos.
6. **Regra de execução agent-first:** todos os processos, verificações e alterações que o agente tenha acesso e autorização para executar devem ser realizados pelo agente, sem transferir ao usuário tarefas que o agente consegue fazer. Somente etapas bloqueadas por falta de acesso, autorização, decisão necessária do usuário ou interação autenticada indisponível devem ser explicadas ao usuário em instruções claras, detalhadas e passo a passo. Isso não autoriza pedir segredos, pular gates G2, publicar em produção, fazer merge em `main` sem revisão, nem apresentar apps/recursos não construídos como prontos.
7. Documentação/design precedem implementação de produto. O baseline do MVP foi escolhido pelo agente sob delegação explícita do usuário; não atribuir cada valor a uma escolha individual do usuário, e manter valores adaptáveis quando ele pedir.
8. Automatic Preview/Preview Branch do Supabase está deliberadamente desligado no plano atual. Não recomendar upgrade nem fluxos que dependam dele sem nova decisão do usuário. Sem preview DB por PR, migrations devem ser revisadas antes do merge e verificadas no projeto dev compartilhado depois.

## 2. O projeto em uma visão

**Tower Idle Adventure** é um RPG idle automático 2D para navegador, centrado em uma torre, progressão de equipe, equipamentos e batalhas PvE automáticas. O MVP é individual, desktop-first e PT-BR; o jogo não está implementado. A conta escolhe um personagem, monta uma equipe de até três, faz hunts pessoais por andares, ganha XP/Coins/loot e retorna ao lobby. Detalhes de produto, números e critérios de aceite estão em [`MVP_DECISIONS.md`](MVP_DECISIONS.md), [`GDD.md`](GDD.md) e [`SYSTEMS_SPEC.md`](SYSTEMS_SPEC.md).

O projeto encontra-se em **pré-produção**: especificações, threat model, protótipo UX estático, fundação SQL e inventário de arte existem; não há gameplay, backend funcional, app Game Web, Admin Web ou deployment Vercel. Há evidência relatada pelo usuário de aplicação da migration-base ao Supabase dev; Auth/Data API/RLS e controles operacionais ainda não foram validados diretamente no Supabase hospedado. O projeto dev e sua configuração GitHub são relatados pelo usuário, conforme §4.

## 3. Produto, decisões e limites de escopo

### Decisões confirmadas diretamente pelo usuário

- Stack escolhida: **Supabase + Vercel**. Game Web é separado do servidor/backend; Admin Web/CMS será app separado, acessível apenas a administradores autorizados.
- O usuário aprovou o baseline completo de combate/armas em [`COMBAT_DESIGN.md`](COMBAT_DESIGN.md). **Contracorte:** 20% de chance após ataque direto de alvo único; causa 50% do Ataque atual; sem recursão e sem ativação por DoT.
- Equipamento: multiplicador `x` independente por atributo, inteiro de 1–50; fator `x/10`, em incrementos de 0,1. `x=4,72` foi rejeitado. Slot Arma existe e qualquer personagem pode equipar qualquer tipo de arma.
- Usar o pack de sprites já existente como base e adicionar/criar arte depois; não usar arte procedural. Preservar créditos/licenças e seguir a leitura conservadora dos avisos do pack até qualquer conflito de licença ser esclarecido.
- HUD modular, desktop-first; hunts pessoais não são compartilhadas. Recursos sociais compartilhados/instanciados são pós-MVP.
- Evitar instalações locais e usar navegador para configuração das plataformas. Agent-first para o trabalho: agente implementa o que for acessível; usuário só é acionado para autorização/ações de Dashboard inacessíveis.
- Merge em GitHub `main` deve, futuramente, disparar deploy de produção Vercel após build/checks. Vercel ainda não foi conectada e não existe app para deploy.
- Automatic Preview/Preview Branch no Supabase fica **desligado**: o usuário informou que requer plano Pro e prefere não habilitar/pagar por isso.

### Baseline MVP delegado ao agente (adaptável; ver fonte canônica)

O usuário autorizou o agente a resolver decisões abertas necessárias para fechar o MVP. O agente registrou o baseline em [`MVP_DECISIONS.md`](MVP_DECISIONS.md); não trate todos os números como se o usuário os tivesse escolhido individualmente. Resumo: classes Guerreiro/Arcanista/Ladino; nível compartilhado 1–20; equipe até três; 10 andares e boss solo no andar 10; slots Arma, Peitoral, Elmo, Calça, Bota, Luva, Colar, Aura, Asa e Pet; 8 stats por item; seis raridades; loot/economia, consumíveis e bot descritos no documento. O baseline não foi validado em playtest e pode ser ajustado por pedido/evidência.

**Fora do MVP:** VIP/monetização, Diamonds, caixas/gacha, market/transações entre jogadores, PvP, chat/guildas, bosses compartilhados, eventos live, sistemas avançados de skills/upgrades e rewards/progresso offline. Hunts pessoais são privadas.

## 4. Estado de plataformas e deploy

### Supabase — estado reportado pelo usuário em 2026-09-28

O usuário forneceu os seguintes dados da configuração no Dashboard. **O agente não teve acesso autenticado ao Dashboard e não verificou visualmente esses valores; registre-os como informados pelo usuário, não como teste independente.**

- Projeto de desenvolvimento criado: **`tower-idle-adventure-dev`**.
- Repositório GitHub conectado: **`marmitero/tower-idle-adventure`** (confere com o remote deste checkout; a divergência de nome mencionada antes foi resolvida pelo usuário).
- **Working directory:** `.` (raiz do repositório; `supabase/` está na raiz).
- **Deploy to production:** ativado para essa integração/projeto Supabase dev.
- **Production branch name:** o usuário confirmou **`main`**, que corresponde à branch do GitHub. “Deploy to production” está ligado para o projeto Supabase **dev**; isso não significa que exista banco de produção do jogo. O usuário esclareceu que o Supabase de produção ainda não existe.
- **Automatic Preview/Automatic Branching/Preview Branch:** desligado, pois o usuário informou que a função exige plano Pro e deseja deixá-la desligada. Não há banco isolado automático para cada PR.
- **Migration (atualização 2026-09-28, relato do usuário):** `20260928000000_g2_core_schema.sql` aparece no histórico como “Inserted at UTC” em 28 Sep 2026, 00:00:00; o usuário também vê tabelas no schema `public`. Isso é forte evidência de que a migration foi aplicada ao projeto dev, embora o agente não tenha acesso independente ao Dashboard. O usuário confirmou que os nomes exibidos são `equipment_loadouts` e `hunt_session_private_state`, correspondendo exatamente às tabelas definidas na migration.
- Usar apenas dados sintéticos. Não conectar um eventual Supabase de produção a este fluxo; nenhum setup de produção foi reportado/verificado.

**Consequência operacional:** a branch `main` conectada e o Deploy to production ativado aplicam migrations ao projeto Supabase dev, não a um ambiente real de produção. A migration inicial tem evidência relatada de aplicação. Como Preview Branch está desligada, não há validação SQL em DB efêmero antes do merge; revisar migrations em PR e acompanhar o projeto dev após merge.

### Vercel — estado reportado pelo usuário

- **Ainda não integrada ao GitHub; nenhum projeto Vercel foi criado.** O usuário confirmou que ainda não fez configuração na Vercel.
- `apps/game-web/` e `apps/admin-web/` não existem; não há app para importar ou deployment de produção. Não inventar URLs, domínios, project IDs, build settings ou sucesso de deploy.
- Futuro previsto: dois projetos Vercel independentes, Root Directory `apps/game-web/` e `apps/admin-web/`; Production Branch `main`; Preview por PR e Production após merge/checks. Configurar ambientes/secrets com Supabase dev em Preview e produção separada só depois dos gates.

### GitHub e limites de acesso

- Remote do repositório nesta sessão: `https://github.com/marmitero/tower-idle-adventure.git`.
- O agente pode editar arquivos, executar verificações disponíveis no ambiente, fazer commit/push na branch fixa e usar integrações GitHub autorizadas (por exemplo, abrir PR/consultar checks quando as permissões permitirem). Repositório/configurações protegidas podem exigir permissão externa.
- Não existe acesso confirmado do agente às sessões autenticadas dos Dashboards Supabase/Vercel. O usuário pode fornecer estado/status/screenshot sem segredos; não pedir credenciais.
- A orientação antiga que exigia instalar Supabase CLI/Docker/Vercel CLI para começar foi superada. Comandos podem ser usados no ambiente do agente quando forem úteis/disponíveis, sem exigir instalação no computador do usuário.

## 5. Estado real do código e evidências

### Artefatos presentes

- [`prototypes/g2-hud/index.html`](../prototypes/g2-hud/index.html): click-through estático, sem backend/gameplay e com dados fictícios; sheets `hero`, `mage`, `slime` são candidatos provisórios, não arte/mapeamento aprovados nem HUD de produção. O usuário já confirmou uma revisão visual individual; isso não substitui estudo com participantes.
- [`supabase/migrations/20260928000000_g2_core_schema.sql`](../supabase/migrations/20260928000000_g2_core_schema.sql): migration-base/fundação de schema, não implementação do jogo.
- [`supabase/tests/schema-smoke.test.mjs`](../supabase/tests/schema-smoke.test.mjs): 9 smoke tests PGlite. Histórico: `npm test --prefix supabase` passou 9/9 usando PGlite 0.5.8/PostgreSQL 18.3; `npm audit --prefix supabase` reportou 0 vulnerabilidades conhecidas no harness. `supabase/config.toml` propõe PostgreSQL 15; há diferença de major version em relação ao PGlite usado.
- Schema atual documentado com 17 tabelas, RLS/`FORCE ROW LEVEL SECURITY`, grants e constraints. Seed `supabase/seed.sql` está vazio/desabilitado. Não há Edge Functions, endpoints de jogo/Admin, fluxo Auth implementado, transações econômicas, loop de batalha ou catálogo publicado.
- [`sprites/`](../sprites/) contém o pack inicial Fantasy Dungeon de Nika Studio; manifesto [`sprites/ASSET_MANIFEST.md`](../sprites/ASSET_MANIFEST.md) registra 422 PNGs válidos, créditos e limitações. Usar subset aprovado; não empacotar o pack inteiro por padrão. Créditos/licença em `sprites/LICENSE.txt` e `sprites/README_IMPORT.txt` devem ser preservados.

### O que NÃO está implementado/confirmado

- Nenhum Game Web ou Admin Web em `apps/`; nenhum deployment Vercel.
- Nenhum fluxo de gameplay, cliente autoritativo, Edge Function, Auth, Storage, API, CMS ou transação de economia.
- O usuário relata migration registrada e tabelas no Supabase dev, forte evidência de aplicação do schema. PGlite não testa Supabase Auth, PostgREST/Data API, Edge Functions, Storage, concorrência real, custos, backup ou configuração do provedor.
- Nenhum preview Supabase por PR. A migration-base e as tabelas correspondentes foram confirmadas pelo usuário no projeto dev; os smoke tests PGlite também passaram no GitHub Actions. Ainda não há testes hospedados de Auth/Data API/RLS ou outras integrações Supabase. O agente não tem sessão autenticada do Dashboard.
- Não há teste de segurança/backup/restore em ambiente real, nem estudo UX com os 5–8 participantes planejados.
- Nenhum app foi implantado, nenhum domínio final foi escolhido, e nenhuma produção Supabase/Vercel foi liberada.

## 6. Gate G2: o que falta para encerrar

Ver critérios completos em [`ROADMAP.md`](ROADMAP.md), [`G2_TECHNICAL_BLUEPRINT.md`](G2_TECHNICAL_BLUEPRINT.md), [`THREAT_MODEL.md`](THREAT_MODEL.md) e [`G2_UX_BLUEPRINT.md`](G2_UX_BLUEPRINT.md). Mínimos pendentes:

1. Branch Supabase dev `main` confirmada pelo usuário; migration-base consta como “Inserted at UTC” e tabelas aparecem em `public` (evidência reportada, não verificada independentemente). Não interpretar `Deploy to production` como Vercel ou banco real de produção.
2. Validar Auth, Data API/PostgREST, grants/RLS com usuários/roles representativos; registrar resultados reais.
3. Projetar/testar transações, idempotência/replay, concorrência, reconexão e regras de segurança do servidor para ações de jogo. O cliente nunca decide combate, moeda, drops ou autorização.
4. Definir/validar limites de Edge Functions, rate limiting, latência/custos, observabilidade, backups e restore. Não afirmar backup ativo antes de testar restauração.
5. Fechar threat model e isolamento real de Admin/MFA antes de qualquer Admin acessível.
6. Executar plano de usabilidade com 5–8 convidados; revisão visual individual do protótipo não basta.
7. Confirmar planos/custos e manter produção isolada até os checks e aprovações apropriados.

Não usar a ausência de Preview Branch como motivo para instalar ferramentas ou pagar plano Pro. A validação browser-only neste estágio é no projeto dev compartilhado depois de merge revisado. Se for necessária uma prova antes de `main`, avaliar um segundo Supabase dev persistente ou GitHub Actions hospedado, sem assumir disponibilidade/custo nem habilitar sem decisão.

## 7. Próximo fluxo recomendado para a IA sucessora

1. Ler novamente este AI_State; conferir branch, `git status`, `git log` e estado do remote. Continuar exclusivamente em `arena/01a0e8b8-tower-idle-adventure`.
2. Não pedir novamente os dados informados: projeto Supabase dev `tower-idle-adventure-dev`, repo `marmitero/tower-idle-adventure`, Working Directory `.`, Deploy to production ON, Production branch `main`, Automatic Preview OFF; migration consta como inserida e tabelas aparecem em `public`, conforme relato do usuário. Ainda sem projeto Supabase de produção ou Vercel.
3. O workflow `.github/workflows/supabase-schema-checks.yml` executa `npm ci --prefix supabase`, `npm test --prefix supabase` e `npm audit --prefix supabase --audit-level=low` em PRs com mudanças Supabase, pushes em `main` com mudanças Supabase e execução manual. Foi validado no GitHub Actions pelo PR #2: os 9 testes e o audit passaram; o check Supabase Preview foi skipped porque Preview Branch está desligado. O workflow não testa Auth/Data API do Supabase.
4. **Próximo passo após o PR #2:** continuar G2 com prova de Auth/Data API/RLS no projeto dev. Primeiro, o agente deve revisar os grants/policies da migration e criar no repositório uma matriz/runbook reproduzível de testes para `anon`, dois usuários sintéticos isolados e acesso direto via Data API; executar localmente tudo que não dependa de credenciais. Não pedir segredo nem token ao usuário. Só depois, se o Dashboard/sessões de usuário forem indispensáveis, explicar em passos claros como criar contas sintéticas/rodar os testes no projeto `tower-idle-adventure-dev` e pedir somente resultados não sensíveis. Não criar/alterar usuários reais nem rodar scripts destrutivos.
5. O PR #2 contém documentação e workflow, sem mudança de migration SQL; sua integração não deve ser tratada como deploy de schema novo. O usuário autorizou o merge nesta etapa; após integrar, verificar o resultado do PR e dos checks via `gh`, sem fazer merge de outros PRs sem autorização/revisão.
6. Nunca apontar o deploy para produção: Supabase de produção ainda não existe e Vercel não foi configurada. O deploy automático Supabase ativo está ligado ao projeto dev e a Preview Branch continua desligada.
7. Após as provas Auth/Data API/RLS, seguir os demais critérios pendentes de G2 em `G2_TECHNICAL_BLUEPRINT.md`, `THREAT_MODEL.md` e `G2_UX_BLUEPRINT.md`. Não iniciar G3 até fechar/aprovar o gate G2.
8. Ao final de cada etapa, atualizar AI_State e docs afetados, executar verificações, commitar e fazer push somente para a branch Arena autorizada da sessão corrente; em conversas futuras, obedecer à branch fixa informada pelo Agent Mode em vez de assumir que esta branch permanece obrigatória.

## 8. Mapa de documentos-fonte

- [`README.md`](../README.md): resumo do estado e navegação.
- [`GDD.md`](GDD.md), [`SYSTEMS_SPEC.md`](SYSTEMS_SPEC.md), [`MVP_DECISIONS.md`](MVP_DECISIONS.md): visão, regras de produto e baseline MVP (decisões do agente sob delegação destacadas).
- [`COMBAT_DESIGN.md`](COMBAT_DESIGN.md): fórmulas/armas/afinidades e decisões aprovadas.
- [`HUD_UX_SPEC.md`](HUD_UX_SPEC.md), [`G2_UX_BLUEPRINT.md`](G2_UX_BLUEPRINT.md), `../prototypes/g2-hud/index.html`: UX e protótipo não funcional.
- [`TECH_ARCHITECTURE.md`](TECH_ARCHITECTURE.md), [`G2_TECHNICAL_BLUEPRINT.md`](G2_TECHNICAL_BLUEPRINT.md), [`THREAT_MODEL.md`](THREAT_MODEL.md), [`ADMIN_PANEL_SPEC.md`](ADMIN_PANEL_SPEC.md): arquitetura, segurança, G2 e Admin.
- [`DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md), [`PROJECT_STRUCTURE.md`](PROJECT_STRUCTURE.md), [`ROADMAP.md`](ROADMAP.md): deploy browser-first, estrutura futura e gates.
- [`../supabase/README.md`](../supabase/README.md), migration e tests: escopo SQL, limites do harness e validações.
- [`../sprites/ASSET_MANIFEST.md`](../sprites/ASSET_MANIFEST.md): inventário e créditos do pack.

## 9. Histórico resumido e instruções superadas

- G0/G1 foram fechados documentalmente; G2 foi aberta para arquitetura, segurança, pipeline de arte e UX, sem gameplay de produção.
- G2 produziu blueprints, threat model, click-through estático, migration-base e harness PGlite. É trabalho parcial; nenhum desses artefatos por si fecha G2 ou representa jogo/back-end pronto.
- O usuário abriu/revisou visualmente o protótipo e autorizou o início do onboarding Supabase/Vercel. Depois especificou o fluxo browser-only e que Automatic Preview exige Pro e deve continuar desligado.
- A recomendação antiga de instalar CLI/Docker para validação local está **superada**. A recomendação anterior de habilitar Preview Branch também está **superada**.
- Snapshot anterior sincronizado antes desta revisão: commit `5705d14` na branch desta sessão; consulte `git log` para o hash atual após este checkpoint.
