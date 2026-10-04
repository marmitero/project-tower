# G2 — blueprint técnico do MVP

**Versão:** 0.6 — projeto dev reportado; Auto Preview desligado; evidência PGlite parcial
**Status:** baseline técnico proposto pelo agente. A migration-base `supabase/migrations/20260928000000_g2_core_schema.sql` passou 9 smoke tests PostgreSQL via PGlite; o usuário confirmou “Inserted at UTC”, tabelas em `public` e os nomes `equipment_loadouts` e `hunt_session_private_state`, correspondentes à migration (evidência de aplicação no dev; sem acesso independente do agente). O usuário informa `tower-idle-adventure-dev` ligado a `marmitero/tower-idle-adventure`, Working Directory `.`, Deploy to production ON e Production branch `main`; Automatic Preview/Branching está desligado por escolha/plano. Vercel não está integrada e não tem projeto. Onboarding browser-only; não exigir CLI/Docker local. O pack de arte em `sprites/` foi inventariado, mas não está integrado ao app. G2 continua aberta.

Este documento detalha a direção Vercel + Supabase de [`TECH_ARCHITECTURE.md`](TECH_ARCHITECTURE.md) para o MVP de [`MVP_DECISIONS.md`](MVP_DECISIONS.md). Regras de produto do MVP não são reabertas aqui. Decisões técnicas dependentes de plano, custo e uma prova técnica ainda precisam de verificação antes de G2 ser encerrada.

## 1. Decisões de arquitetura para validar

1. **Linguagem compartilhada:** TypeScript para Game Web, Admin Web e Edge Functions; contratos JSON e tipos gerados a partir do schema.
2. **Game Web:** Next.js/React em um projeto Vercel próprio. PixiJS fica isolado no palco de batalha para renderização 2D; menus, HUD, inventário e formulários permanecem HTML acessível. PixiJS é uma escolha inicial para prova de renderização, não implementação de combate.
3. **Admin Web:** Next.js/React em outro projeto Vercel e outro domínio. Não compartilhar páginas, bundle, sessão de cliente ou variáveis privilegiadas com o Game Web.
4. **Backend:** Supabase Auth + PostgreSQL + Edge Functions + Storage. Edge Functions autenticam, validam e orquestram; operações de estado usam funções SQL transacionais/restritas. Não haverá processo de simulação em background no MVP.
5. **Autoridade:** todas as mutações de perfil, equipe, itens, Coins, consumíveis, sessão de hunt e conteúdo passam por endpoints server-side. O cliente envia intenção e `request_id`, nunca resultado ou tempo de simulação.
6. **Sem progresso offline:** um lote só avança por comando ativo aceito; não há cron/catch-up. Após reconectar, a sessão retoma do último cursor persistido, sem simular o intervalo desconectado.

**Prova técnica G2 necessária:** validar chamada TypeScript → Edge Function → transação PostgreSQL, limites/custo de lotes, autenticação/MFA e isolamento real do Admin Web antes de congelar versões/bibliotecas.

## 2. Projetos e ambientes

| Camada | Dev/browser (sem instalação local) | Staging | Produção |
|---|---|---|---|
| Game Web | projeto Supabase dev (usuário relata ligação ao GitHub/main); banco compartilhado, sem Preview Branch automática no plano atual (o app ainda não existe) | projeto Vercel + projeto Supabase isolados | projeto Vercel + projeto Supabase exclusivos |
| Admin Web | não há app local/browser implementado; validar dados sintéticos/roles no Preview quando existir | deployment protegido; sem conteúdo/segredo de produção | projeto Vercel/domínio separados; middleware exige sessão admin válida |
| Conteúdo | migrations/fixtures versionadas e sem dados pessoais | cópia sintética do release aprovado | release imutável publicado pelo Admin autorizado |

- Os projetos/aplicações `apps/game-web/` e `apps/admin-web/` continuam futuras. `supabase/` contém `config.toml`, a migration-base de schema e um harness PGlite somente de desenvolvimento; não há app, endpoint ou Edge Function. O pack `sprites/` é a fonte de arte inicial já presente; servir o subset aprovado como assets estáticos da aplicação/Vercel é a proposta inicial, não uma integração concluída.
- `supabase/migrations/` contém SQL versionado. O seed está intencionalmente desabilitado e não há catálogo/contas de produção. O usuário relata GitHub Integration em `main`, mas Auto Preview está desligado; revisar SQL/PR antes do merge e confirmar a aplicação no projeto-base dev pelo Dashboard. Não presumir que uma migration foi aplicada até conferir o histórico.
- Vercel Preview nunca recebe segredo de produção. Por padrão, preview do Game Web usa ambiente dev/sintético; Preview do Admin Web deve ter Vercel Deployment Protection e não consegue publicar no banco de produção.
- Produção usa variáveis separadas por projeto/environment. Segredos do Supabase ficam apenas em funções/servidor; nenhuma chave secreta ou `service_role`/`sb_secret` pode aparecer em bundle `NEXT_PUBLIC_*`, source map ou log.
- Habilitar verificação de migration status e backup antes de qualquer release de schema; não executar reset destrutivo contra staging/production.

### Deploy contínuo planejado

- O requisito confirmado é: PRs recebem Vercel Preview; merge em `main` inicia Production Deployment da Vercel após build/checks. O Admin permanece separado e protegido no próprio app/servidor.
- Supabase migrations têm fluxo separado da Vercel. O usuário relata GitHub Integration no Supabase dev ligada a `marmitero/tower-idle-adventure`, Working Directory `.`, Deploy to production ON e Production branch `main`, confirmada pelo usuário. Automatic Branching/Preview Branch está desligado. Vercel não aplica migrations. Se app e migrations forem disparados pelo mesmo merge, a ordem não é atômica; preferir migrations compatíveis com app antigo/novo (expandir → migrar app → limpar).
- Ainda não há apps `game-web`/`admin-web`, integração/projeto Vercel, secrets, domínio ou CI configurado. A GitHub Integration Supabase e suas opções foram reportadas pelo usuário, não verificadas pelo agente; nenhuma migration foi confirmada aplicada. O roteiro está em [`DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md). A ausência de deploy não fecha nem reabre sozinha o gate G2.

## 3. Domínios de dados MVP

Nomes abaixo são conceituais até revisão de schema; `auth.users.id` é a identidade canônica. Toda tabela mutável recebe timestamps de servidor e `revision` quando há concorrência.

| Entidade | Conteúdo e invariantes principais |
|---|---|
| `player_profiles` | `user_id` PK/FK de Auth, nível 1–20, XP/Coins não negativos/revision, sem e-mail público. Migration inicia saldo em 0; os 300 Coins iniciais do MVP dependem de futura transação atômica de provisionamento com ledger, ainda inexistente. |
| `player_roster` | Personagens desbloqueados (IDs estáveis `warrior`, `arcanist`, `rogue`, posição opcional 1–3); `UNIQUE(user_id, class_id)` e posições únicas. Escolha inicial/kit/equipamento ainda não é provisionado. Nível é compartilhado, não duplicado por personagem. |
| `player_items` | Instância não negociável: dono, template/release, nível, raridade, oito colunas `x_* SMALLINT CHECK (x_* BETWEEN 1 AND 50)`, característica elegível, origem e timestamps. Cap de 300 não equipados é regra transacional do servidor e ainda não está implementado na migration; descarte é tombstone, sem transferência. |
| `equipment_loadouts` | `user_id`, personagem, slot, `item_id`; PK por `(user_id, character_id, slot)` e `UNIQUE(item_id)`. Migration prova FKs de dono/personagem e unicidade; validação de compatibilidade slot/template ainda cabe à função transacional futura. |
| `consumable_stacks` | Uma linha por conta/tipo: poção ou revive, quantidade entre 0 e 99. Estoque inicial (3 Poções Comuns + 1 Revive) não é seed; provisionamento, compra e consumo ainda precisam atualizar estoque/ledger na mesma transação. |
| `coin_ledger` | Lançamentos append-only com valor assinado, motivo, referência/idempotency key não nula e saldo resultante; migration não garante atomicidade nem igualdade com o saldo do perfil. |
| `bot_settings` | Limiar, lista de raridades, toggles de poção/revive/skills e retorno pós-derrota; schema fechado e limites conferidos server-side. |
| `hunt_sessions` | Metadados seguros da sessão, andar/status, `content_release_id`, `engine_version`, cursor/revision e índice único parcial para uma ativa por conta; leitura própria limitada. |
| `hunt_session_private_state` | Seed, snapshot versionado, sim_time e controle `batch_incomplete`; tabela separada sem grants para navegador. Migration não implementa simulação nem segredo rotativo. |
| `hunt_events` | Eventos de combate/recompensa ordenados por sequência; API futura devolve apenas os últimos 100 da hunt mais recente. Não é log de analytics livre. |
| `idempotency_records` | `(user_id, request_id)` único, rota, hash do corpo, status e resposta mínima. Migration garante unicidade do ID; replay da resposta e conflito para body hash diferente ainda dependem de lógica transacional futura. TTL operacional proposto: 30 dias, sujeito a revisão de retenção. |
| `content_drafts` | Entradas tipadas editáveis (JSON validado por `kind`), autor e revisão; invisíveis a jogadores. |
| `content_releases` / `release_entries` | Release imutável, checksum e entradas congeladas. `active_content_release` mantém um único ponteiro ativo; a view `published_content` expõe somente esse release. Fluxo publish/rollback transacional ainda não implementado. |
| `admin_memberships` | `user_id`, role, estado, concedido/revogado por; tabela não editável por jogador nem exposta em leitura pública. |
| `admin_audit_log` | Ação, ator, entidade, diff antes/depois, release, motivo, data e resultado; append-only para administradores. Nunca registrar token, senha ou segredo. |

### Restrições e índices

- FKs com `ON DELETE` deliberado; preferir arquivar/tombstone para conteúdo e itens descartados a apagar histórico referenciado.
- `CHECK` para nível, XP, saldo, raridade, quantidade, faixas de bot e oito rolagens. Trait extra é não nulo somente para Lendário/Celestial (exatamente um ID elegível); template/personagem usam IDs estáveis, não rótulos traduzidos.
- Índices por `(user_id, created_at)`, sessão ativa por conta, sequência de eventos, `release_id`, estado de publicação e `request_id`.
- Invariante econômico: débito, ledger, estoque e resultado de compra/loot são uma transação. Invariante de equipe: cada membro ocupa no máximo um slot e cada item está equipado no máximo uma vez.
- JSON fica restrito a snapshots versionados, payloads de evento e drafts; campos usados em integridade/consulta permanecem colunas tipadas.

## 4. RLS, privilégios e chamadas server-side

### Matriz de acesso inicial

| Dados | Anônimo | Jogador autenticado | Edge Function/Game API | Admin API |
|---|---|---|---|---|
| Conteúdo publicado ativo | leitura apenas do catálogo público | leitura apenas do catálogo publicado | leitura | leitura |
| Perfil, elenco, inventário, hunt | nenhum | leitura das próprias linhas somente se necessária à HUD; sem INSERT/UPDATE/DELETE direto | leitura e mutação autorizadas | nenhuma mutação por conveniência |
| Drafts/releases não ativos | nenhum | nenhum | nenhum, salvo API pública específica | acesso por role e workflow |
| Roles/auditoria administrativa | nenhum | nenhum | nenhum | Owner/Editor/Auditor conforme matriz; mutação via função protegida |
| Ledger/estado de compra | nenhum | leitura limitada do próprio histórico/saldo | escrita transacional autorizada | leitura auditada; ajuste excepcional fora do painel de conteúdo |

### Regras obrigatórias

1. Habilitar RLS nas tabelas expostas e configurar **grants e policies em conjunto**. Revogar privilégios default de `anon`/`authenticated` e conceder somente leitura pública de catálogo publicado e leitura própria indispensável.
2. Bloquear escrita direta por `anon`/`authenticated` em perfil, inventário, ledger, consumíveis, equipe, sessão e conteúdo. UI jamais recebe `service_role`/`sb_secret`.
3. Edge Function valida assinatura/expiração do JWT e extrai `user_id` do token. Ignorar qualquer `user_id` de body/query para autorização.
4. Funções SQL transacionais ficam em schema de aplicação controlado, com `EXECUTE` revogado de `PUBLIC`, `anon` e `authenticated`; somente identidade server-side autorizada pode chamá-las. Funções `SECURITY DEFINER` fixam `search_path`, validam argumentos e não montam SQL dinâmico.
5. Para endpoints de jogador, derivar dono do JWT verificado e passar esse ID à transação. Para Admin API, consultar `admin_memberships` em cada request; não confiar em `user_metadata`, role cacheável do browser nem rota escondida.
6. `published_content` é a única superfície de leitura pública, como view security-barrier fixa no release ativo e sem tabelas draft/audit. Tabelas-base de release não têm grants browser; revisar a propriedade `security_invoker=false`/owner privilegiado na prova Supabase real, pois a view é um acesso deliberado e estreito a conteúdo já publicado.
7. Game API e Admin API usam allowlist CORS por origem exata (prod + local dev apenas; Preview é explicitamente configurado), `Vary: Origin` e métodos/headers mínimos. CORS não é autorização: JWT/role e validação server-side valem para curl e qualquer cliente.
8. Testar cada tabela/função com usuário A, usuário B, `anon`, editor, auditor e owner. RLS não substitui validação de domínio nem idempotência.

### Baseline inicial de rate limit (a provar/ajustar em G2)

Limites são contabilizados por conta **e** IP, por rota, respondem `429` com `retry_after` e não substituem autenticação/idempotência. IP vem apenas do header canônico fornecido pelo proxy confiável, nunca de um header encaminhado livremente pelo browser. Valores são baseline do agente para teste de carga/custo, não escolhas individuais do usuário nem controles ativos:

- Leituras autenticadas: 120/min por conta e 300/min por IP; leitura pública de catálogo: 60/min por IP.
- Mutação de jogo: 30/min por conta e 120/min por IP; compra: no máximo 10/min por conta.
- `hunts/advance`: no máximo 1 lote novo a cada 5 s por sessão (12/min); retries idempotentes do mesmo `request_id` não consomem outro lote.
- Convite/reenviar link de Auth: até 5/h por e-mail e por IP; convite de Admin: 5/h por Owner; publicação/rollback: 20/h por Admin. Aplicar também proteção contra brute force e quotas nativas disponíveis.
- Ajustar após medir tráfego legítimo, latência e preço; limites nunca podem ser afrouxados para contornar economia ou segredo exposto. Não usar memória local de uma Edge Function como contador distribuído.
- Candidato inicial: bucket atômico compartilhado no PostgreSQL com chaves de IP pseudonimizadas (HMAC) e TTL máximo de 24 h, sem IP bruto em logs; provar latência/custo. Se não escalar, justificar e aprovar um rate limiter externo antes de adicioná-lo à stack.

## 5. Contratos de API do jogo

Todas as mutações usam HTTPS, JWT Supabase, JSON schema versionado e `request_id` UUID. Envelope recomendado:

```json
{
  "request_id": "uuid",
  "expected_revision": 12,
  "payload": {}
}
```

Resposta de comando confirmada inclui `request_id`, `state_revision`, `server_time`, snapshot mínimo atualizado e eventos novos. Erro inclui `code`, mensagem segura e `retryable`; nunca retorna stack trace ou SQL.

| Comando | Intenção do cliente | Validação/efeito server-side |
|---|---|---|
| `GET /game/bootstrap` | abrir app | autenticar; devolver perfil, roster, saldos, estado atual e `content_release_id` publicado. |
| `GET /game/catalog` | carregar conteúdo | ler apenas release publicado e imagens autorizadas, com `ETag`/cache versionado. |
| `POST /game/team` | ordem/membros desejados | roster desbloqueado, até 3 IDs distintos, posições 1–3; concorrência por revision. |
| `POST /game/items/equip` | `item_id`, personagem e slot | dono, nível mínimo, slot/subtipo, unicidade e afinidade; atualiza loadout em transação. |
| `POST /game/items/discard` | item a descartar | item do próprio perfil e não equipado; soft-delete e audit event. |
| `POST /game/bot-settings` | configuração desejada | ranges, raridades/itens elegíveis e estado; salva versão validada. |
| `POST /game/shop/purchase` | tipo e quantidade | preço do catálogo server-side, estoque ≤99, Coins, idempotência; debita e credita atomicamente. |
| `POST /game/hunts/start` | andar escolhido | nível mínimo, sessão inexistente, equipe/configuração, release ativo; cria seed e cursor no servidor. |
| `POST /game/hunts/advance` | só `session_id`, `request_id`, `expected_revision` | aplica lote fixo elegível no servidor; não aceita `elapsed_ms`, dano, alvo, resultado ou loot do cliente. |
| `POST /game/hunts/end` | encerrar sessão | encerra no cursor persistido; concede apenas recompensas já confirmadas e mantém log definido. |
| `GET /game/hunts/current` | recuperar snapshot/log | apenas estado próprio; não avança combate nem concede progresso. |

### Códigos de erro estáveis

`AUTH_REQUIRED`, `EMAIL_NOT_VERIFIED`, `INVITE_REQUIRED`, `FLOOR_LOCKED`, `HUNT_ALREADY_ACTIVE`, `HUNT_NOT_ACTIVE`, `REVISION_CONFLICT`, `IDEMPOTENCY_CONFLICT`, `ITEM_NOT_OWNED`, `ITEM_LEVEL_TOO_HIGH`, `INVENTORY_FULL`, `INSUFFICIENT_COINS`, `STACK_LIMIT`, `RATE_LIMITED`, `CONTENT_RELEASE_UNAVAILABLE` e `VALIDATION_ERROR`.

Semântica de retry: `REVISION_CONFLICT` exige refresh e decisão da UI; `RATE_LIMITED` traz `retry_after`; erro de rede repete o mesmo `request_id`; não criar novo ID até resolver o resultado da tentativa anterior.

## 6. Sessão e lote de combate sem progresso offline

- Ao iniciar hunt, servidor persiste `status=active`, andar, versão de conteúdo/engine, cursor, estado inicial e seed não exposto. Uma conta não pode ter duas hunts ativas.
- Enquanto a página autenticada está conectada, o cliente solicita um lote de **5 segundos de simulação** a cada 5 segundos reais. É quantum fixo definido pelo servidor; o body não envia tempo transcorrido.
- Um lote tenta aplicar ações até `sim_time + 5 s`, com limite defensivo de 256 eventos ordenados por request. Se atingir o limite antes do horizonte, persistir somente o prefixo ordenado já resolvido, marcar `batch_incomplete`, emitir alerta e continuar do cursor exato/horizonte pendente no próximo request online antes de iniciar outro quantum; nunca pular evento nem conceder recompensa duas vezes.
- Server rate limit aceita no máximo um novo lote por sessão a cada 5 s. Chamadas antecipadas não avançam relógio. Um retry com o mesmo `request_id` retorna exatamente a resposta já persistida, sem novo lote.
- Não existe worker/cron para hunt. Sem request conectado, o cursor não avança. Uma chamada posterior processa apenas o lote atual, nunca o intervalo perdido; `GET current` é somente leitura. Ao reconectar, a UI carrega o último snapshot e retoma enviando novo comando ativo.
- Transação grava cursor, HP/status, ledger, consumíveis, loot, evento e revision de forma atômica. Falha/timeout não pode duplicar reward. Estado usa seed derivada no servidor e versão de engine para replays de suporte.
- A sessão fixa release de conteúdo ao começar; publicar novo conteúdo não muda uma hunt existente. Últimos 100 eventos confirmados são mantidos para UI; não são analytics de longo prazo.

Este modelo é uma decisão de arquitetura para validar na prova técnica G2. Se os limites de Edge Functions/PostgreSQL impedirem o lote, não se reabre progresso offline: revisa-se o mecanismo server-side e registra-se a alternativa antes de implementar.

## 7. Admin: workflow e autorização

Roles finais recomendadas para MVP:

| Ação | Owner | Editor | Auditor |
|---|---:|---:|---:|
| Ler conteúdo publicado, drafts e histórico | sim | sim | sim |
| Criar/editar/validar drafts | sim | sim | não |
| Publicar release/rollback | sim | não (submete para Owner) | não |
| Convidar/revogar admins | sim | não | não |
| Ver relatório de auditoria | sim | limitado ao próprio trabalho | sim, leitura |

- Primeiro Owner é provisionado fora do cliente por um procedimento operacional documentado; não existe rota de autoelevação/auto-cadastro admin.
- Supabase Auth envia convite de player somente por fluxo confiável server-side; signup público fica desabilitado, email precisa ser confirmado. Link de convite expira em 24 h e é de uso único; administradores também são provisionados por Owner.
- MFA TOTP obrigatório para qualquer conta admin em produção. Baseline: sessão Admin expira após 30 min de inatividade ou 8 h absolutas; publish, rollback, role change e ação destrutiva exigem MFA/reautenticação nos 10 min anteriores. Provar suporte/configuração e UX do provedor antes de G2; não são controles já ativos.
- App Admin verifica autenticação e role antes de renderizar shell/dados; páginas privadas são dinâmicas, sem prerender/cache público. Cada endpoint revalida role e schema.
- Vercel Deployment Protection protege todos os previews. Produção combina gate do app/server-side com Vercel access control conforme plano disponível; nenhuma camada isolada é tomada como autorização de dados.
- Draft → validate → preview → aprovação Owner → release imutável → ponteiro ativo. Rollback aponta para release anterior e gera nova entrada auditável; não sobrescreve release.

## 8. Storage, privacidade e operações

- Buckets separados: `content-drafts` privado para Owner/Editor; `content-published` somente leitura de assets referenciados por release. Caminhos incluem `release_id/asset_id/hash`; substituição cria novo objeto.
- MVP aceita PNG raster estático; baseline por arquivo: até 5 MiB e 4096×4096 px (máx. 16 MP), validar MIME real/decode/checksum e normalizar/retirar metadados antes de publicar. Rejeitar SVG, HTML, script, fonte executável e arquivo compactado. Confirmar limites do Storage/CDN e latência no teste G2.
- Perfil do jogo guarda só `user_id`, estado e eventual nome de exibição escolhido; e-mail permanece em Supabase Auth, não público. Não coletar data de nascimento, localização precisa ou chat (fora do MVP).
- Log da hunt: últimos 100 eventos até a próxima hunt. Retenção de logs operacionais proposta: 30 dias; trilha administrativa proposta: 12 meses. Confirmar com revisão LGPD/contrato do provedor antes do beta, sem reter payload desnecessário.
- Planejar exclusão de conta pelo suporte, com remoção/cascata de dados de gameplay e política documentada para registros operacionais/anônimos. Sem pagamento/market no MVP, portanto sem ledger comercial de longo prazo.
- Backup: alvo mínimo de snapshot diário e retenção de 7 dias, mais exercício de restauração em staging antes do beta. Validar plano/preço Supabase, export e PITR disponíveis; não declarar backup ativo antes de testar restore.
- Observabilidade: métricas agregadas de erro/latência/duplicação/uso, sem conteúdo de request com e-mail/token. Alertar falhas de release, taxa anormal de compra/recompensa, revision conflicts e abuso de API.

## 9. Critérios de saída G2 (abertos; evidência parcial abaixo)

- Prova hospedada da migration e seed sintética no Supabase dev compartilhado após um merge revisado em `main`; confirmar histórico/status e schema no Dashboard. **Parcial:** o usuário relata migration registrada e tabelas em `public`; validar RLS, grants, Data API/Auth e demais comportamentos diretamente no Supabase. Automatic Branching/Preview Branch está desligado no plano atual. CLI/Docker locais não serão exigidos.
- Testes de RLS/grants contra o Supabase dev e Data API para anon, jogador A/B e roles Admin. **Parcial:** smoke tests PGlite exercitam PostgreSQL, grants, RLS e constraints sob roles simulados; não validam stack Supabase real. Sem Preview Branch por PR no plano atual.
- Rate limits compartilham contador entre instâncias, retornam `429/retry_after`, resistem a `X-Forwarded-For` forjado e têm custo/latência medidos. **Pendente.**
- Compra/lote concorrente e repetido com mesmo `request_id` não duplica saldo/itens/XP/consumível/cursor; body diferente gera conflito. **Parcial:** unicidade de request key está modelada; não há transações de comando nem teste de concorrência.
- Reconexão não gera catch-up; função não confia em tempo/client state. **Pendente:** nenhuma Edge Function/simulação criada.
- Release inválido não publica; publish/rollback é auditável e sessões mantêm release fixado. **Parcial:** tabelas de release e append-only são exercitadas, mas fluxo publish/rollback não foi implementado.
- Jogador comum não recebe Admin shell/dados/API; Owner MFA completa workflow. **Pendente:** nenhum Admin Web/endpoint/MFA implementado ou testado.
- Protótipo revisado com 5–8 convidados segundo o plano UX, com achados críticos tratados. **Parcial:** usuário confirmou que abriu e validou visualmente o click-through; isso não substitui a amostra de usabilidade definida.
- Revisão de segurança, custo e backup aprovada antes do Gate G2. **Pendente.**

### Evidência da fatia de schema (2026-09-28)

- `supabase/migrations/20260928000000_g2_core_schema.sql` cria 17 tabelas com RLS + `FORCE ROW LEVEL SECURITY`, grants explícitos, view pública apenas do release ativo, separação do seed/snapshot privado, invariantes para oito `x` inteiros 1–50, propriedade de equipamento e sessão única ativa. Ledger/histórico recusam update/delete avulso; cascata controlada de remoção da conta apaga dados de gameplay, enquanto auditoria Admin permanece sujeita à retenção definida.
- `npm test --prefix supabase`: 9/9 testes passaram usando PGlite 0.5.8 (PostgreSQL 18.3); exercitam aplicação da migration, isolamento próprio A/B via role, escrita direta negada, publicação ativa, estado privado, constraints/uniqueness, append-only, cascata de exclusão da conta e papel trusted backend. `npm audit --prefix supabase` reportou 0 vulnerabilidades conhecidas nas dependências do harness.
- **Limite de evidência:** PGlite é um harness PostgreSQL/WASM com `auth.users`, `auth.uid()` e roles simulados; a config Supabase local proposta mira PostgreSQL 15, portanto há diferença de major version. Não é Supabase CLI nem valida Auth real, Data API/PostgREST, Storage, Edge Functions, grants/versão do provedor, latência, concorrência de produção, backup ou custo. Não declarar RLS/Supabase prontos com base apenas neste smoke test.
- Migration é fundação de schema, não implementa endpoints, transações econômicas, gameplay, Admin Web, migração de produção ou cadastro/provisionamento. Não avançar G3 com estes resultados isolados.

## Referências técnicas oficiais

- [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase — Securing your API (grants + RLS)](https://supabase.com/docs/guides/api/securing-your-api)
- [Supabase — Local development workflow (not required by browser-only onboarding)](https://supabase.com/docs/guides/local-development/cli-workflows)
- [Supabase — GitHub integration and Preview Branches](https://supabase.com/docs/guides/deployment/branching/github-integration)
- [Supabase — Inviting users](https://supabase.com/docs/guides/auth/users)
- [Supabase — Edge Function secrets](https://supabase.com/docs/guides/functions/secrets)
- [Vercel — Deployment Protection](https://vercel.com/docs/deployment-protection)
