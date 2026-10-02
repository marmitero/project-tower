# Arquitetura técnica — Vercel + Supabase

**Versão:** 0.7 — onboarding browser-first sem instalações locais documentado
**Decisão confirmada pelo usuário:** usar **Vercel + Supabase**, separando o cliente do jogo do servidor.
**Estado:** infraestrutura e aplicações ainda não existem. A migration-base de schema tem smoke tests PostgreSQL/PGlite limitados e evidência reportada de aplicação no Supabase dev; ainda não foram validados Auth/Data API nem comportamentos do provedor. Onboarding escolhido é browser-first via Supabase Dashboard + GitHub Integration, sem exigir CLI/Docker na máquina do usuário. Ver [`G2_TECHNICAL_BLUEPRINT.md`](G2_TECHNICAL_BLUEPRINT.md) para evidências/limites e [`THREAT_MODEL.md`](THREAT_MODEL.md) para riscos. G2 permanece aberta.

## 1. Separação de responsabilidades

- **Vercel — cliente:** hospeda o jogo web (interface, renderização 2D, efeitos visuais em código) e entrega arquivos estáticos/PNGs. O cliente envia intenções e apresenta respostas; não é autoridade de combate, loot, progresso ou moedas.
- **Supabase — servidor/plataforma de backend:** Supabase Auth, PostgreSQL, Edge Functions como API confiável, Storage para assets/conteúdo e Realtime apenas para notificações/sistemas adequados.
- **Admin Panel — aplicação separada:** painel interno publicado em projeto/domínio Vercel distinto do cliente de jogadores, protegido na borda por Deployment Protection/SSO se disponível ou middleware autenticado equivalente, e conectado a endpoints administrativos protegidos no Supabase. Não existe link de entrada no jogo.

```text
Jogador → Game Web (Vercel) → HTTPS/JWT → Edge Functions (Supabase)
                                      ├── PostgreSQL (RLS / estado autoritativo)
                                      ├── Storage (PNGs e arquivos de conteúdo)
                                      └── Realtime (eventos autorizados/notificações)

Admin autorizado → Admin Web (Vercel isolado) → HTTPS/JWT → Admin Edge Functions
                                                      ├── valida role/admin
                                                      ├── grava rascunhos/auditoria
                                                      └── publica versão de conteúdo → PostgreSQL/Storage

Jogador comum ──X── Admin Web / APIs administrativas
```

A separação do cliente e servidor é uma fronteira de segurança, não apenas uma separação de diretórios. O jogo pode ser servido publicamente; decisões com impacto em estado/economia são validadas e gravadas do lado Supabase.

## 2. Aplicações e ambientes

Estrutura planejada para o repositório/entregas:

- `apps/game-web/`: cliente do jogo, projeto Vercel próprio (ainda não criado).
- `apps/admin-web/`: CMS/painel administrativo, outro projeto Vercel protegido (ainda não criado).
- `sprites/`: pack estático inicial de autoria externa com licenças/avisos preservados e manifesto; a seleção final de sprites para cada tela ainda não está integrada.
- `supabase/`: config, uma migration-base e harness PGlite de desenvolvimento. Ainda não há Edge Functions ou catálogo de produção.

Ambientes **dev**, **staging** e **production** devem ter projetos/configurações Supabase e Vercel isolados. O usuário informa que `tower-idle-adventure-dev` está ligado a `marmitero/tower-idle-adventure`, Working Directory `.`, Deploy to production ON e Production branch `main`; Automatic Preview/Branching está desligado. A migration passou no harness PGlite e, segundo o usuário, consta no histórico e suas tabelas estão em `public` no Supabase dev. Ainda faltam testes Supabase reais de Data API/Auth. Production branch `main` foi confirmada pelo usuário. Usar dados sintéticos; não fazer reset destrutivo remoto. O blueprint técnico registra escopos de environment e responsabilidades.

## 3. Contrato cliente-servidor

### Game Web → Supabase

1. O cliente autentica por Supabase Auth e obtém sessão/JWT.
2. Catálogo publicado (itens, personagens, inimigos, andares e dados públicos) pode ser lido por views/endpoints de somente leitura com RLS.
3. Operações que mudam estado passam por Edge Functions com JWT: iniciar/pausar/retomar hunt, avançar lote de combate, consumir poção/revive, equipar item, comprar consumível NPC e receber recompensa. Fusão, venda/compra entre jogadores e demais economia complexa são pós-MVP.
4. A função valida sessão, propriedade, requisitos do andar, saldo, inventário, versão de conteúdo e idempotência; calcula o resultado e persiste a transação no PostgreSQL.
5. A resposta confirmada atualiza a HUD. Retry/desconexão não pode duplicar ação, moeda, loot ou consumível.

O navegador nunca informa como verdade HP/dano final, raridade/x de drop, saldo, propriedade, resultado PvP ou autorização. Toda geração de equipamento segue o gerador/tabelas aprovados no servidor. O cliente não recebe chave `service_role`, credenciais de banco nem segredo de assinatura.

### Combate idle e trabalhos longos

Edge Functions são endpoints de execução curta, não um processo de game server sempre ligado. Baseline técnico G2: um comando autenticado `advance_hunt` aplica lote fixo de 5 s de simulação; o cliente não envia tempo transcorrido nem estado/resultado. Lotes requerem calls ativos, são idempotentes e têm cursor/release/seed persistidos no servidor. Não há cron/catch-up; ao reconectar, retoma-se sem simular o intervalo desconectado. Limites/custo deste modelo ainda precisam de prova técnica. Detalhes em [`G2_TECHNICAL_BLUEPRINT.md`](G2_TECHNICAL_BLUEPRINT.md); a política de produto sem offline não pode mudar por implementação silenciosa.

Supabase Realtime pode avisar sobre estado de sessão no MVP; chat, presença, grupos, boss global, arena e market são pós-MVP. Mensagem Realtime nunca prova que uma transação/combate aconteceu; futuras operações competitivas/comerciais exigem comando validado e persistência transacional antes do broadcast.

## 4. Supabase: componentes e limites de segurança

- **Auth:** conta e sessão; papel de admin é concedido somente por procedimento confiável (allowlist/tabela protegida ou `app_metadata` gerenciada no servidor). Não confiar em `user_metadata` editável pelo próprio jogador.
- **PostgreSQL:** estado persistente MVP de conta/jogador, inventário, hunts, Coins, equipe e versões de conteúdo. Guildas, market e chat são extensões pós-MVP, não tabelas/requisitos iniciais.
- **RLS:** a migration-base habilita e força RLS nas 17 tabelas; grants de browser são limitados a leituras próprias de estado sem escrita direta e à view de catálogo publicado. Smoke tests PGlite cobrem um subconjunto de isolamento/constraints; Supabase real ainda não foi validado. Escritas sensíveis exigirão endpoint validado, ainda não implementado.
- **Edge Functions:** API server-side para ações de jogo e operações de administrador. Validar JWT/role, schema, autorização, limite de taxa, idempotência e transação em cada comando.
- **Assets estáticos:** o subset aprovado do pack inicial poderá ser copiado, com créditos/manifesto, para um diretório público incluído no build do Game Web (por exemplo, `apps/game-web/public/assets/`). O `sprites/` na raiz permanece como fonte; paths relativos a ele no protótipo local não devem ser tratados como paths de produção dos projetos Vercel com Root Directory próprio. Não é necessário enviar o pack inteiro a um bucket Supabase. **Storage** fica para uploads/conteúdo gerenciado pelo Admin ou assets publicados com versionamento; leitura pública só quando aprovada, escrita/substituição administrativas com autorização, validação e auditoria.
- **Realtime:** somente canais apropriados, com regras de acesso; não substituir transação de banco nem validação server-side.
- **Segredos:** chaves privilegiadas Supabase (legacy `service_role`/`sb_secret`) existem apenas em ambientes server-side/Edge Functions; ignoram RLS e são tratadas como credencial crítica. Nunca no bundle Vercel do navegador nem em variável `NEXT_PUBLIC_*`. Grants, RLS e prova de não exposição estão em [`G2_TECHNICAL_BLUEPRINT.md`](G2_TECHNICAL_BLUEPRINT.md).

## 5. Conteúdo e versionamento

O painel edita dados de conteúdo tipados (atributos, raridades, skills, encontros, odds, referências de asset), não código executável. Publicação cria um **release/versionamento imutável** de dados. A API do jogo serve apenas a versão publicada; uma hunt em andamento mantém a versão com que começou para não mudar HP/loot no meio do encontro. Rollback troca a versão ativa para um release anterior sem apagar histórico.

Regras de validação incluem, entre outras: IDs únicos; referências válidas; níveis/requisitos não negativos; todos os oito atributos presentes em equipamento; x de runtime inteiro 1–50 por atributo; chance de tabela de loot totalizando 100%; duração/data de evento válida; skills dentro do limite por estrelas; imagens em formato/tamanho permitidos; nenhum item quebrado pode ser publicado.

## 6. Observabilidade e recuperação

Eventos de servidor devem gerar logs sem expor segredos ou dados pessoais excessivos. Projetar backups, recuperação point-in-time conforme plano escolhido, auditoria para ações administrativas/transações e alertas para falhas de publicação, duplicação de recompensas, inconsistências de moeda e erros de autenticação. Retenção, custo e política de privacidade serão definidas em G2.

## 7. Pontos a validar em G2

- Limites atuais de duração, memória e chamadas de Edge Functions para simulação por lotes.
- Modelo de chamadas/lotes/heartbeat e comportamento ao voltar de desconexão, implementando a regra já decidida de não conceder progresso/rewards offline (G2 valida viabilidade, não reabre política de produto).
- RLS, isolamento de ambientes, quotas, custos Supabase/Vercel, backup e plano de incidentes.
- Estratégia de versão/cache de conteúdo e assets, migração, rollback e compatibilidade com sessões ativas.
- Uso de Realtime para sessão/avisos, necessidades futuras de chat/bosses/arena/market (estes módulos não bloqueiam MVP).
- Domínios finais, identidade visual, fluxo MFA/admin e política de preview deployment.

A escolha Vercel + Supabase e a separação client/server estão aprovadas. O baseline de schemas/contratos foi detalhado em [`G2_TECHNICAL_BLUEPRINT.md`](G2_TECHNICAL_BLUEPRINT.md), as ameaças em [`THREAT_MODEL.md`](THREAT_MODEL.md) e o click-through de UX em [`G2_UX_BLUEPRINT.md`](G2_UX_BLUEPRINT.md). Detalhes de implantação/limites, testes reais, protótipo com usuários e revisão de segurança ainda são critérios do G2. Supabase dev existe segundo o usuário, mas não foi verificado pelo agente; a Vercel e os apps não existem/configuraram.

## 8. Deploy contínuo planejado (ainda não configurado)

O requisito confirmado é que PRs recebam Preview e que merge/commit em `main` inicie deploy de produção da Vercel automaticamente, após build e checks. Game Web e Admin Web serão projetos Vercel separados apontando para seus diretórios raiz; nenhum dos dois apps existe ainda. A publicação também exige configuração de variáveis por ambiente, proteção server-side do Admin, integração do repositório e eventual domínio. O roteiro passo a passo, rollback e checklist estão em [`DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md).

O deploy Git da Vercel não executa migrations Supabase. O usuário relata que a GitHub Integration do projeto Supabase dev usa repo `marmitero/tower-idle-adventure`, Working Directory `.`, Deploy to production ON e Production branch `main`; Automatic Branching/Preview Branch está desligado. Conferir se Production branch `main` foi confirmada pelo usuário; verificar migration/status/schema no Dashboard após execução. Sem DB Preview por PR, revisar SQL no GitHub antes do merge. Alternativas futuras de pré-validação incluem um projeto dev separado ou GitHub Actions hospedado, se aprovadas. Se migrations e Vercel forem disparados pelo mesmo merge, não há garantia de ordem; preferir migrations aditivas e compatíveis (`expandir → migrar aplicação → limpar em alteração posterior`). Auth/API e outras configurações não são automaticamente atualizadas por padrão; verificar cada projeto antes de produção.

**Sequência atual confirmada pelo usuário:** evitar instalações e operar pelo navegador. Supabase dev existe e sua integração foi reportada com as opções acima. Vercel ainda não foi integrada e nenhum projeto foi criado; importação aguarda apps seguros/buildáveis em `apps/game-web/` e `apps/admin-web/`. Produção, domínio e credenciais de produção continuam adiados até os gates. A direção anterior de CLI/Docker local foi superada. Ver [`PROJECT_STRUCTURE.md`](PROJECT_STRUCTURE.md) e [`DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md).

**Estado em 2026-09-28:** apps `game-web`/`admin-web`, integração/projeto Vercel, domínio, secrets e CI não existem. Supabase dev/GitHub Integration, branch `main`, status “Inserted at UTC” da migration e tabelas em `public` foram confirmados pelo usuário, sem verificação independente do agente. O projeto Supabase de produção ainda não existe. Vercel auto-deploy continua planejado, não ativo; G2 permanece aberta.
