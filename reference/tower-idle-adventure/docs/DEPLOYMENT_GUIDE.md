# Guia de deploy — GitHub + Vercel + Supabase

**Status: onboarding browser-first parcial; estado informado pelo usuário em 28/09/2026.** O usuário confirmou que criou `tower-idle-adventure-dev`, conectou o repo `marmitero/tower-idle-adventure` com Working Directory `.`, ativou **Deploy to production** e selecionou Production branch `main`. Relatou que a migration aparece como “Inserted at UTC” e que as tabelas `equipment_loadouts` e `hunt_session_private_state` aparecem em `public`, correspondendo à migration; o agente não acessou o Dashboard independentemente. O projeto Supabase de produção ainda não existe. Automatic Preview/Branching do Supabase ficará desligado, conforme escolha do usuário/plano atual. Vercel não foi integrada e nenhum projeto Vercel foi criado.
**Restrição confirmada:** evitar instalações. Configurar e operar Supabase, Vercel e GitHub pelo navegador; não exigir Docker, Supabase CLI ou Vercel CLI na máquina do usuário. As orientações anteriores de CLI/Docker e Preview Branch automático foram superadas.
**Requisito confirmado:** merge em `main` deverá iniciar deploy de produção Vercel após build/checks, mas isso não está configurado e os apps `apps/game-web/`/`apps/admin-web/` ainda não existem.
**Requisito confirmado:** depois que um PR for integrado à branch `main` do GitHub, a Vercel deve publicar automaticamente a nova versão em produção, após build e verificações (não instantaneamente no merge).

Este guia separa claramente as ações que podem começar agora das que dependem de aplicações/gates. Não significa que o jogo, painel, serviços ou deploys já estejam prontos.

## 1. A ideia em uma frase

Você envia uma alteração ao GitHub; abre um PR para revisar; a Vercel cria um endereço temporário de Preview; depois que o PR é aprovado e integrado a `main`, a Vercel compila e publica a versão de produção. Se o PR também contém uma migration, o fluxo do Supabase aplica a alteração do banco por uma integração separada.

```text
Fluxo-alvo quando os apps existirem:
branch/PR → Vercel Preview (futuro)
          └── Supabase: sem DB Preview por PR no plano atual; revisar migration no PR

PR aprovado + merge em main
                    ├── Vercel: build → Production Deployment (ainda não configurado)
                    └── Supabase dev: aplicar migrations se Deploy to production estiver ativo
```

O usuário reporta que a integração Supabase está ligada ao repo correto, com deploy habilitado e branch configurada como `Main`; como essa forma difere de `main`, conferir a ref selecionada se houver dúvida. A migration aplicada ainda precisa ser confirmada pelo histórico/status do Dashboard.

**“Em tempo real”** aqui significa “automaticamente, sem alguém apertar um botão de publicar depois do merge”. Primeiro ainda há build e verificações, então normalmente existe um intervalo de minutos. Se o build falhar, a nova versão não deve ser considerada publicada; o deployment anterior continua sendo a referência de produção.

## 2. O que cada serviço faz

- **GitHub:** guarda o código, as migrations e o histórico; PRs permitem revisar antes de integrar.
- **Vercel:** compila e hospeda as aplicações web. Com o repositório Git conectado, commits em branches/PRs podem gerar Previews; commits na branch de produção (`main`) geram Production Deployments. Um Preview não é a versão ao vivo.
- **Supabase:** fornece banco PostgreSQL, autenticação e outros serviços de backend. As mudanças estruturais do banco são arquivos SQL chamados **migrations**. A Vercel não aplica essas migrations por conta própria.

A Vercel e o Supabase observam o mesmo merge, mas são dois deploys independentes. O GitHub pode mostrar o status de cada um. É importante escrever migrations compatíveis com a versão antiga e a nova do app, porque não se deve depender de qual dos dois termina primeiro.

## 3. Situação real deste repositório hoje

Até 28/09/2026, segundo o estado do repositório e o relato do usuário:

- `apps/game-web/` e `apps/admin-web/` ainda não existem; não há app web para importar na Vercel. O pack de sprites estático fica em `sprites/`; um subset final poderá ser servido pelo app/Vercel, sem exigir upload imediato para Supabase Storage.
- O usuário confirmou projeto Supabase `tower-idle-adventure-dev` ligado a `marmitero/tower-idle-adventure`, Working Directory `.`, **Deploy to production ON** e Production branch `main`. Relatou a migration-base no histórico e tabelas em `public`. Os 9 testes PGlite não substituem validação Supabase.
- O usuário prefere Automatic Branching/Preview Branch desligado, pois exige Pro; não há banco isolado por PR. O merge correto para o projeto dev deve mirar a branch GitHub `main`; verificar que o valor reportado `Main` representa essa ref.
- Vercel não foi integrada nem teve projeto criado; não há domínio ou deployment. `apps/game-web/` e `apps/admin-web/` ainda não existem.
- A G2 continua aberta. O projeto dev informado não fecha o gate nem inicia implementação de gameplay/Admin.

O onboarding Supabase já foi iniciado segundo o usuário; os dados informados são repo `marmitero/tower-idle-adventure`, Working Directory `.`, Deploy to production ativado e Production branch `main`. O usuário confirmou que a migration-base consta como “Inserted at UTC” e que há tabelas no schema `public`. A Vercel continua sem integração/projeto; deploy de app aguarda aplicações buildáveis e os gates de segurança.

### Sequência atual confirmada — tudo pelo navegador, sem instalações

O usuário definiu que não quer instalar ferramentas para usar Vercel, Supabase ou GitHub. O caminho é operar nos Dashboards e na integração GitHub do Supabase; não instalar Docker/Supabase CLI/Vercel CLI.

1. **Vínculo reportado:** usuário confirmou projeto `tower-idle-adventure-dev`, repo `marmitero/tower-idle-adventure`, Working Directory `.`, Deploy to production ligado e Production branch `main`. Relatou migration registrada e tabelas em `public`; agente não acessou o Dashboard autenticado.
2. **Preview branches:** manter Automatic Branching/Auto Preview desabilitado, conforme a restrição do plano atual. Não haverá uma base de banco isolada para cada PR; os valores/revisões do PR devem ser verificados no GitHub antes do merge.
3. **Aplicação ao projeto dev:** o usuário relata **Deploy to production** já ativado na integração desse projeto. Nesse contexto, o destino é o projeto-base conectado `tower-idle-adventure-dev`, não um banco público de produção do jogo. Confirmar que o branch selecionado corresponde ao GitHub `main`; não alterar toggle/projeto sem motivo. Nunca ligar esse fluxo em eventual banco de produção nesta etapa.
4. **Após merge em `main`:** verificar no Dashboard Supabase o histórico/status das migrations e o schema esperado. Isso valida a aplicação no banco dev, mas não oferece teste pré-merge isolado nem substitui a revisão de RLS/Auth/Data API. O seed atual está desabilitado; usar somente dados sintéticos.
5. **Sem instalação local:** `.github/workflows/supabase-schema-checks.yml` executa os smoke tests PGlite e `npm audit` em runner hospedado para PRs/pushes relevantes. Nenhuma dependência é instalada no computador do usuário. A execução remota só poderá ser verificada depois que o workflow for enviado ao GitHub e disparado; ele não substitui prova do banco Supabase.
6. **Vercel:** ainda não foi configurada. Pode-se autorizar a integração GitHub pelo navegador, mas não importar como Game Web/Admin enquanto `apps/game-web/` e `apps/admin-web/` não existirem. Quando houver apps seguros/buildáveis, importar cada raiz e configurar Previews/Production no Dashboard.
7. **Produção:** manter o projeto/banco Supabase de produção, secrets e domínio separados até testes de Auth, RLS, Admin, backups, migrations e rollback. O merge em `main` só deve aplicar automaticamente à produção depois dos gates de segurança e de um projeto Vercel válido.

**Resumo atual:** segundo o usuário, Supabase dev está ligado ao repo `marmitero/tower-idle-adventure`, Working Directory `.`, Deploy to production ativado e Production branch `main`; Automatic Preview fica desligado. Branch `main` confirmada; a migration-base consta como inserida no histórico e suas tabelas aparecem em `public`, conforme relato do usuário. Vercel não foi integrada, não tem projeto e ainda não há apps para importar.

## 4. Configuração browser-first, passo a passo

### Etapa A — preparar o GitHub

1. Manter `main` como branch de produção do produto. Trabalhar em branches curtas e abrir Pull Requests; evitar enviar alterações diretamente para `main`.
2. Configurar proteção para `main`: exigir PR aprovado; tornar obrigatórios os checks de build/testes Vercel e migration Supabase quando eles existirem e estiverem passando. Não selecionar um check ainda inexistente, pois isso pode bloquear todos os merges até o primeiro pipeline funcionar.
3. O agente desta sessão trabalha na branch `arena/01a0e8b8-tower-idle-adventure`, não em `main`. A publicação descrita aqui só começa quando alguém com permissão revisar e integrar um PR em `main`.

### Etapa B — revisar o projeto Supabase dev já criado

**O usuário informa que `tower-idle-adventure-dev` já existe e que a GitHub Integration está configurada; não criar outro projeto agora. Repo `marmitero/tower-idle-adventure`, Working Directory `.`, Deploy to production ON e Production branch `main` e histórico/schema da migration foram conferidos pelo usuário; o Dashboard não foi acessado independentemente pelo agente.

1. No Dashboard, conferir o nome e `project-ref` do projeto, região, plano e limites; confirmar que este é o projeto de desenvolvimento, não produção.
2. Confirmar que os dados são sintéticos e que a senha do banco está guardada em um gerenciador de senhas. Não pedir nem colar a senha em chat, issue, commit ou variável pública.
3. O usuário informa que o repo conectado é `marmitero/tower-idle-adventure` e Working Directory `.`, que corresponde à localização de `supabase/` nesta raiz. Production branch `main` confirmada pelo usuário; manter o deploy apontado exclusivamente para `tower-idle-adventure-dev`.
4. Automatic Branching/Preview Branch está indisponível no plano atual e permanece desligado, conforme usuário. Não pagar upgrade nem habilitar uma Preview Branch automática nesta etapa.
5. O usuário informa o toggle **Deploy to production** ativado no projeto dev. Não é necessário reativá-lo; conferir sua aplicação no próximo merge revisado e garantir que ele continue apontando só a `tower-idle-adventure-dev`, não a um futuro projeto de produção.
6. Staging e production continuam separados e podem ser criados posteriormente, depois de definir custos, backups/PITR, Auth/RLS, integração e gates de segurança.

### Etapa C — validar e publicar migrations pelo navegador

O repositório contém `supabase/config.toml` e a migration-base `supabase/migrations/20260928000000_g2_core_schema.sql`. Não é necessário instalar Supabase CLI, Docker ou Node.js na máquina do usuário. Automatic Branching está desligado por indisponibilidade no plano atual, conforme relato do usuário.

1. Configuração reportada: projeto `tower-idle-adventure-dev` conectado ao repo `marmitero/tower-idle-adventure`, Working Directory `.`. Agente não acessou o Dashboard autenticado; não pedir/compartilhar credenciais. Confirmar apenas os estados pendentes descritos abaixo.
2. Confirmar Working directory `.` e branch conectada `main`. O objetivo relatado pelo usuário é que o banco dev receba mudanças apenas após merge em `main`.
3. O usuário confirmou **Deploy to production** ativado e Production branch `main`; o usuário confirmou no histórico “Inserted at UTC” e observou tabelas no schema `public`, evidência forte de aplicação. Nesse setup, `production` da integração refere-se à branch/projeto-base Supabase dev, não à Vercel nem ao ambiente público do jogo.
4. Como não há Preview Branch isolada, revisar o arquivo SQL pelo diff/PR no GitHub antes do merge. Não existe prova hospedada pré-merge neste plano; os smoke tests PGlite (9/9 em execução anterior do agente) são evidência auxiliar, não substituto para o Supabase.
5. Depois de um merge em `main`, abrir o Supabase Dashboard e confirmar a migração no histórico/status e o schema esperado em **Database**. Essa é uma mudança no ambiente compartilhado dev, não uma aprovação de produção. Usar somente dados sintéticos; a migration-base consta como inserida e o schema está visível segundo o usuário.
6. O fluxo Git pode executar migrations e itens suportados declarados. Configurações de Auth/API (URLs, providers, redirects, flags) precisam ser ajustadas/verificadas pelo Dashboard; não presumir que `config.toml` atualiza tudo automaticamente.
7. Se mais tarde for necessário validar antes de `main` sem Pro, opções browser-first são criar um segundo projeto dev de teste conectado a uma branch específica pelo Dashboard (se o plano permitir) ou configurar GitHub Actions em runner hospedado. Não habilitar Preview Branch automático nem fazer upgrade sem nova decisão.
8. Não inserir senha, token ou chave privada em arquivos do repo, logs públicos, PR ou conversa. Nenhuma credencial deve ser enviada aqui.

**Limite atual:** projeto e integração foram reportados pelo usuário, mas não foram verificados pelo agente; migration-base consta como inserida segundo o usuário. Automatic Branching/Preview Branch por PR está desabilitado.

### Etapa D — Vercel: integração e projetos ainda pendentes

**O usuário informa que ainda não integrou o GitHub à Vercel e não criou projeto Vercel.** Como `apps/game-web/` e `apps/admin-web/` não existem, não importar a raiz nem criar deploys vazios agora. O agente pode preparar os apps/configs após os gates; qualquer login/OAuth e criação do projeto exige ação browser do usuário.

1. Quando houver um app seguro e buildável e o usuário autorizar a etapa, autenticar no Dashboard Vercel, ativar MFA e autorizar o GitHub para `marmitero/tower-idle-adventure`, limitado ao repo necessário.
2. **Não importe a raiz do repo como se fosse o jogo.** Aguarde a criação e validação dos shells pelos gates de arquitetura/segurança; atualmente o repo tem docs, `sprites/`, protótipo estático e `supabase/`, não apps web.
3. Quando os diretórios estiverem implementados, no Dashboard selecione **Add New → Project**, importe o mesmo repositório duas vezes e configure:
   - projeto **Game Web** → Root Directory `apps/game-web/`;
   - projeto **Admin Web** → Root Directory `apps/admin-web/`.
4. Em cada app, confira framework preset, install/build/output commands, dependências do monorepo e defina `main` como **Production Branch**. A árvore/apps e framework final ainda precisam ser criados/testados.
5. Com integração Git ativa, branches/PRs podem gerar Vercel Previews; merge/commit em `main` inicia Production Deployment depois de build/checks. Verifique cada app via um PR de teste antes de declarar pronto; deploys são independentes.
6. Comece os Previews usando apenas variáveis e dados Supabase dev/staging. Não publique o Admin sem autenticação e autorização server-side testadas; Vercel Deployment Protection/SSO é uma camada adicional, nunca substitui a checagem de role/API.
7. Associar domínios definitivos somente após validar segurança e release. Nenhum nome/domínio final foi escolhido.

### Etapa E — preencher variáveis por ambiente

Na área de configurações de cada projeto Vercel, cadastrar variáveis de forma separada para **Development**, **Preview** e **Production**. Uma mudança de variável vale para deployments novos; se a variável mudar, será necessário gerar um novo deployment.

Exemplo futuro para app Next.js/Supabase:

```text
NEXT_PUBLIC_SUPABASE_URL=https://<projeto-do-ambiente>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

- `NEXT_PUBLIC_*` é incluído no código enviado ao navegador. A **publishable key** é própria para o cliente, mas só é segura com RLS/grants corretos; não é uma senha.
- Uma chave privilegiada (`SUPABASE_SECRET_KEY`, ou a antiga `service_role`) só pode existir em código executado no servidor e nunca pode ter prefixo `NEXT_PUBLIC_`, ir para o browser, logs ou repositório. Essa chave pode ignorar RLS.
- Valores de Preview apontam para dev/staging; valores de Production apontam para o Supabase exclusivo de produção. Nunca reutilizar a chave privilegiada de produção em PRs/Previews.
- Arquivos locais `.env.local` não devem ser commitados. Segredos de produção são adicionados diretamente no painel do provedor/secret store adequado.

### Etapa F — provar o fluxo antes de chamar de pronto

1. Quando houver apps e pipeline, abrir um PR pequeno em uma branch que não seja `main`.
2. Vercel Previews para Game Web/Admin só serão verificáveis depois da configuração Vercel e da criação dos apps; esse serviço ainda não foi configurado.
3. Para migrations, revisar SQL e checks do PR. O plano Supabase atual não fornece Preview Branch isolada; antes do merge não haverá banco remoto efêmero para testar o SQL.
4. Validar login, autorização do Admin e principais rotas quando os apps existirem; confirmar que um jogador comum não vê dados administrativos nem chama suas APIs.
5. Após revisão/aprovação e confirmação do repo/branch conectados, integrar o PR em `main`.
6. Depois do merge, verificar no Dashboard Supabase se migration-base consta como inserida e o schema está visível no projeto dev, conforme confirmação do usuário. Quando a Vercel estiver configurada, verificar também o Production Deployment e logs; são fluxos independentes.
7. Anotar o resultado/data e não declarar o pipeline ativo antes deste teste completo.

## 5. Como trabalhar depois da configuração

Para cada alteração, o fluxo-alvo depois de implementar/configurar os apps fica assim:

1. Criar uma branch a partir da `main` atualizada.
2. Fazer uma mudança pequena; incluir testes e, se houver mudança de banco, a migration correspondente.
3. Abrir PR para `main`. Vercel Preview só surgirá após configuração futura; Supabase Preview Branch não está habilitado no plano atual.
4. Revisar diff/SQL e checks disponíveis no PR; corrigir falhas antes do merge. Não supor teste de migration em banco isolado.
5. Aprovar e fazer merge.
6. A integração Supabase deve aplicar migrations ao projeto dev somente se `Deploy to production` estiver habilitado no projeto correto; confirmar no Dashboard. Vercel só publicará apps em produção após ser configurada e quando os diretórios existirem.
7. Conferir resultados separadamente e monitorar erros após publicação.

Um PR não precisa ser publicado manualmente pela Vercel. Se o build/teste falhar, corrigir o PR antes de fazer merge. Uma mudança nas variáveis ou configurações de projeto pode exigir um novo deployment.

## 6. Ordem segura para mudanças de banco

Deploy de aplicação e deploy de schema não são uma operação atômica. Ambos podem iniciar após o merge e terminar em ordem diferente. Para evitar quebrar a versão ao vivo, usar a estratégia **expandir → migrar app → limpar**:

1. **Expandir:** adicionar coluna/tabela nova sem remover a antiga, com defaults compatíveis e permissões revisadas.
2. **Migrar o app:** fazer a nova versão funcionar com o schema antigo e o novo, ou separar em PRs para garantir que o schema aditivo já esteja pronto antes da feature.
3. **Observar:** conferir métricas, dados e versão implantada.
4. **Limpar depois:** remover coluna/estrutura antiga em outro PR, somente quando nenhum deployment ativo precisar dela.

Não combinar uma remoção destrutiva de coluna com o primeiro deploy do app que deixa de usá-la. Não rodar uma migration de rollback às cegas; correções de banco normalmente exigem uma migration nova, backup e um plano próprio.

## 7. Como desfazer uma publicação

- **Aplicação web:** em caso de problema, usar o deployment anterior da Vercel ou reverter o commit/PR e deixar a Vercel publicar a correção. Confirmar o domínio e observar logs.
- **Banco:** rollback de código não desfaz automaticamente uma migration. Preservar dados; avaliar migration corretiva para frente ou restauração de backup com responsável técnico. Testar o procedimento em staging antes de depender dele.
- Vercel rollback e recuperação de banco são ações distintas; ter um deployment anterior não significa que o banco voltou no tempo.

## 8. Checklist antes de ativar em produção

- [ ] Aplicações Game Web e Admin Web implementadas, builds e testes passando.
- [ ] Projeto Vercel separado para cada app, com diretórios raiz corretos e production branch `main`.
- [ ] Autorização server-side do Admin testada; previews protegidos e produção não expõe APIs/dados administrativos a jogadores.
- [ ] Projetos Supabase separados; migrations testadas por CLI em local/staging; RLS/grants revisados.
- [ ] Variáveis Preview usam apenas banco de teste; secrets de produção não chegam ao browser nem a Preview.
- [ ] Checks requeridos no GitHub; Preview validado; merge teste em `main` produziu deployment `Ready`.
- [ ] Migrations de produção verificadas separadamente; ordem/compatibilidade entre schema e aplicação documentadas.
- [ ] Domínio, monitoramento, backup e plano de recuperação verificados.

## Referências oficiais

- [Vercel — Git deployments](https://vercel.com/docs/git)
- [Vercel — Monorepos](https://vercel.com/docs/monorepos)
- [Vercel — Ambientes de deployment](https://vercel.com/docs/deployments/environments)
- [Vercel — Variáveis de ambiente](https://vercel.com/docs/environment-variables)
- [Supabase — GitHub integration/branching](https://supabase.com/docs/guides/deployment/branching/github-integration)
- [Supabase — Database migrations](https://supabase.com/docs/guides/deployment/database-migrations)
- [Supabase — API keys (publishable vs. secret)](https://supabase.com/docs/guides/getting-started/api-keys)
