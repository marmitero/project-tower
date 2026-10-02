# Estrutura proposta do projeto

**Status:** proposta de organização; nenhum app de produção foi criado. Este documento descreve como separar responsabilidades antes de iniciar a implementação.

**Direção atual confirmada pelo usuário:** operar Supabase + Vercel pelo navegador, sem instalar ferramentas. Usuário relata projeto `tower-idle-adventure-dev` conectado a `marmitero/tower-idle-adventure`, Working Directory `.`, Deploy to production ON e Production branch `main`; Automatic Preview/Branching fica desligado por plano. Agente não verificou Dashboard nem aplicação de migration. Vercel não está integrada e não tem projeto; importar Game Web/Admin aguarda os diretórios de aplicação. Produção continua separada e protegida. Orientações de CLI/Docker local estão superadas.

## 1. Estrutura alvo (proposta)

```text
tower-idle-adventure/
├── apps/
│   ├── game-web/             # aplicação do jogador, build/deploy separado
│   └── admin-web/            # CMS interno, build/deploy separado e protegido
├── packages/
│   └── contracts/            # tipos/schemas de payload e IDs compartilhados, sem segredos
├── sprites/                 # pack estático inicial com avisos/licença e manifesto
├── supabase/
│   ├── migrations/           # SQL versionado; já existe uma migration-base
│   ├── functions/            # Edge Functions, quando forem autorizadas/implementadas
│   ├── tests/                # smoke tests; execução hospedada em CI quando configurada
│   └── config.toml
├── prototypes/
│   └── g2-hud/               # protótipo de UX estático; não é o app do jogo
├── docs/                     # decisões, arquitetura, critérios e estado
└── README.md
```

A árvore de apps é uma **proposta**, não uma decisão final de framework/gerenciador de pacotes. `apps/game-web/` e `apps/admin-web/` ainda não existem. `sprites/` contém o pack inicial auditado; sheets de hero/mage/slime foram ligados ao protótipo estático como candidatos, não a um app de produção. O G2 continua definindo/provando detalhes técnicos; não criar pastas vazias ou arquivos de build como se fossem aplicações prontas.

## 2. Limites entre as partes

- **Game Web:** interface pública do jogador. Nunca calcula ou decide recompensas, saldo, combate ou autorização final.
- **Admin Web:** app e projeto de deploy independentes. Login, role e autorização são conferidos no servidor e em cada API; esconder um link ou proteger somente um Preview não basta.
- **`packages/contracts`:** compartilhar apenas tipos, IDs estáveis e schemas de validação de requests/responses. Não compartilhar sessões, chaves privilegiadas, lógica de autorização Admin nem componentes que façam os dois apps dependerem do mesmo bundle.
- **`supabase/`:** migrations e código confiável de backend. O cliente não recebe secret key. Funções de jogo/admin são propostas futuras, ainda não implementadas.
- **`prototypes/`:** explorações rápidas de UX. São isoladas da aplicação de produção; dados fictícios e interações demonstrativas não significam que gameplay/APIs estejam prontas.

## 3. Sequência browser-first de onboarding

1. **Prévia atual:** abrir o preview estático disponível no Arena; não instalar servidor local, Vercel CLI ou dependências para consultar esse mockup. Ele não é uma aplicação de produção.
2. **Supabase dev:** usuário relata projeto isolado `tower-idle-adventure-dev` já criado, com dados sintéticos; conferir no Dashboard que esse é o ambiente dev e manter a senha no gerenciador de senhas.
3. **GitHub ↔ Supabase:** usuário informa integração já conectada ao repo `marmitero/tower-idle-adventure`, Working Directory `.`, Deploy to production ON, Production branch `main`. Automatic Branching/Preview Branch está desabilitado. Agente não acessou Dashboard independentemente; o usuário confirmou a branch `main`.
4. **Prova de migration:** sem Preview Branch por PR, revisar SQL no GitHub antes do merge em `main`; depois, conferir migration status/schema no Dashboard Supabase dev. É um banco compartilhado, não teste isolado. Use apenas dados sintéticos; o usuário relata a migration registrada e tabelas visíveis em `public`, evidência forte de aplicação no projeto dev.
5. **Vercel ↔ GitHub:** autorizar o repositório pela Vercel agora. Não importar o repositório na raiz: `apps/game-web/` e `apps/admin-web/` ainda não existem. Depois de implementar shells seguros/buildáveis, importar cada diretório raiz como projeto Vercel independente e revisar Previews de PR pelo browser.
6. **GitHub Actions:** `.github/workflows/supabase-schema-checks.yml` executa smoke tests PGlite e audit em runner hospedado para PRs/pushes relevantes; qualquer dependência é instalada no runner efêmero, não na máquina do usuário. O workflow remoto ainda precisa ser acionado no GitHub para validar sua execução.
7. **Produção:** manter projeto Supabase de produção, segredos de produção e domínio fora do onboarding inicial. Antes do alpha fechado, provar migrations, RLS, autorização/Admin, backups, checks e rollback; só então habilitar produção e o fluxo `main` → checks → Vercel Production Deployment.

Os cliques e opções de interface estão detalhados em [`DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md).

## 4. O que este documento não faz

Não cria Game Web/Admin Web, APIs, gameplay, migration adicional, projeto Vercel, serviço Supabase, deploy ou credenciais. As provas locais já existentes e seus limites estão registrados em [`G2_TECHNICAL_BLUEPRINT.md`](G2_TECHNICAL_BLUEPRINT.md) e no [`Guia de deploy`](DEPLOYMENT_GUIDE.md). G2 permanece aberta até os critérios do [`Roadmap`](ROADMAP.md) serem atendidos.
