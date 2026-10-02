# Threat model — MVP (G2)

**Versão:** 0.2 — evidência parcial de schema/RLS
**Estado:** modelo preventivo. Uma migration-base contém grants/RLS e passou smoke tests PostgreSQL limitados em PGlite; não há serviço Supabase nem teste de segurança em stack real. As demais mitigações são propostas, não controles ativos. Complementa [`G2_TECHNICAL_BLUEPRINT.md`](G2_TECHNICAL_BLUEPRINT.md), [`TECH_ARCHITECTURE.md`](TECH_ARCHITECTURE.md) e [`ADMIN_PANEL_SPEC.md`](ADMIN_PANEL_SPEC.md).

## 1. Escopo, ativos e premissas

### Ativos a proteger

1. Identidade e sessão de jogador/admin; convite e confirmação de e-mail.
2. Progresso, roster, inventário, rolls `x`, Coins, consumíveis e estado de hunt.
3. Resultado determinístico de combate/loot, cursor, seed e `content_release_id`.
4. Drafts, releases publicados, assets, papéis e trilha de auditoria Admin.
5. Segredos de Supabase/Vercel, configuração de produção, migrations e backups.
6. Integridade/disponibilidade do serviço, sem coletar dados pessoais além do necessário.

### Atores e confiança

- **Não autenticado:** pode abrir páginas públicas e ler somente o catálogo publicado aprovado.
- **Jogador autenticado:** controla apenas o próprio perfil por comandos permitidos; pode adulterar completamente seu browser, requests, relógio, IDs e JavaScript.
- **Admin:** é uma identidade privilegiada sujeita a phishing/roubo de sessão; Owner tem maior impacto que Editor/Auditor.
- **Atacante externo/bot:** automatiza requests, procura IDOR, replays, upload malicioso e endpoints expostos.
- **Serviços confiáveis:** Auth/DB/Edge Functions e pipeline/deploy Vercel/Supabase; comprometimento de segredo server-side é incidente crítico.

### Fronteiras

```text
Browser não confiável
   ├── Game Web pública ── JWT/intenção ── Game Edge API ── funções transacionais/DB
   ├── Admin Web separada ── sessão + role ── Admin Edge API ── drafts/releases/audit
   └── recebe apenas catálogo publicado e estado próprio aprovado

Pipeline/repositório/CI ── migrations reviewed ── dev → staging → produção isolados
```

O browser, preview de deployment, payload, relógio e qualquer campo de perfil não são autoridade. O limite de segurança não é “não mostrar um botão”: o servidor, DB e deployment devem negar a ação.

## 2. Matriz de riscos prioritários

Severidade inicial qualitativa: **Crítica / Alta / Média**. Risco residual só pode ser rebaixado após evidência dos testes de G2; a coluna de mitigação registra desenho, não controle já ativo.

| ID | Ameaça / ativo | Impacto | Mitigação de desenho | Evidência exigida em G2 |
|---|---|---|---|---|
| T1 | Jogador altera dano, `x`, raridade, moedas, alvo ou clock no browser. | Crítica: progressão/economia fraudadas. | API aceita intenção; Edge Function gera RNG, aplica fórmula e lê hora/seed no servidor; bloquear campos de resultado e tempo do cliente. | Requests adulterados não mudam resultado; teste de contrato e fuzz. |
| T2 | IDOR: ler/modificar perfil, item, hunt ou saldo de outra conta. | Crítica: perda/roubo de dados/itens. | Dono vem do JWT verificado; cada consulta/ação filtra e valida `user_id`; RLS/grants em defesa em profundidade. | Matriz com usuários A/B, anon e chamadas diretas ao Data API. |
| T3 | Retry, timeout ou corrida duplica loot, Coins, compra, revive ou avanço de hunt. | Crítica: corrupção de economia. | `request_id` único, hash do corpo, `expected_revision`, operação atômica e ledger; resposta repetida para retry idêntico. | Repetir e concorrer requests; saldo/cursor/estoque final idênticos a uma execução. |
| T4 | Elevação de role via `user_metadata`, ID no body ou autoedição de membership. | Crítica: invasão administrativa. | Roles em tabela protegida; grants negados a jogadores; revalidar membership em todo endpoint; MFA admin; Owner provisionado fora do app. | Player tenta mudar role por Auth/Data API/Admin APIs e recebe negação. |
| T5 | Admin shell/dados aparecem em HTML estático, source map ou URL pública. | Alta: exposição de conteúdo e ferramentas internas. | Projeto/domain Admin separado; renderização dinâmica após verificação de sessão+role; Deployment Protection em previews; APIs verificam role. | Browser sem sessão e player comum testados em produção-like, preview e endpoints. |
| T6 | Vazamento de `service_role`/`sb_secret`, senha, token MFA ou bypass de preview. | Crítica: bypass de RLS e controle do projeto. | Segredo apenas em ambiente server-side; separar secrets por ambiente; scan de bundle/source maps/repo/log; rotação e revogação documentadas. | Secret scanning + busca em artefatos de build + simulação de rotação. |
| T7 | Publicação de draft inválido ou rollback indevido altera regra ativa. | Alta: quebra de economia/sessões. | Schema por tipo, validações server-side, aprovação Owner/MFA, diff/motivo, release imutável e ponteiro ativo transacional. | Odds inválidas bloqueadas; rollback rastreado; hunt existente permanece no release fixado. |
| T8 | XSS armazenado/refletido em nomes, descrições, localização ou logs Admin. | Alta: sessão admin roubada. | Renderizar texto como texto, sanitização/escape, CSP estrita, proibir HTML/JS em campos e uploads SVG; revisão de preview. | Payloads XSS em todos os campos/renderizações e teste CSP. |
| T9 | Upload polyglot, imagem enorme, SVG/script ou arquivo que ataca preview/storage. | Alta: XSS, custo e distribuição de arquivo malicioso. | Aceitar PNG raster validado por MIME real/decode; limite de bytes/dimensão; checksum; bucket draft privado; nome/chave gerados no servidor. | Testes de extensão falsa, MIME falsa, imagem truncada, tamanho/dimensões excedidos e URL draft. |
| T10 | Exposição de seeds, estado interno, logs de sessão ou conteúdo draft. | Alta: previsão de drops e vazamento administrativo. | Seed em servidor; resposta pública redigida; buckets privados; release publicado separado; eventos de jogador filtrados. | Inspecionar bootstrap, API, browser storage/network e URLs. |
| T11 | Abuso de endpoints de lote/loja/convite para DoS ou farming automatizado. | Alta: custo, indisponibilidade e abuso econômico. | Rate limit por user/IP/rota, lote de tamanho fixo, uma sessão ativa, limite de cadência, quotas/alertas e invite-only. | Load test e teste de cadência/rate limit sem impacto em outras contas. |
| T12 | Desconexão/reconexão usada para catch-up ou duplicação de resultados. | Alta: farming indevido. | Sem job offline; lote avançado só por comando novo, fixo e idempotente; GET nunca avança; reconexão não processa elapsed time. | Desconectar por vários intervalos e provar cursor/rewards inalterados até novo comando. |
| T13 | Conta de jogador/admin tomada por phishing, reutilização de senha ou convite encaminhado. | Alta: takeover. | Confirmação de e-mail, convite de curta validade, MFA TOTP para Admin, sessão curta/reauth para publish, revogação acessível e rate limit Auth. | Expiração/replay de invite, MFA bypass e revogação de sessão testados. |
| T14 | Cross-site request/roubo de sessão em Admin Web. | Alta: ação privilegiada sem consentimento. | Cookies Secure/HttpOnly/SameSite conforme SSR escolhido; CSRF protection em mutações cookie-authenticated; Origin/Host validation; CSP. | Teste CSRF em publish/role/discard e sessão cross-origin. |
| T15 | Preview Vercel ou ambiente de PR conecta a DB/projeto de produção. | Crítica: escrita/deploy acidental. | Environment variables por deployment scope; preview em dev sintético; deployment protection; bloqueio de migration production por CI/manual approval. | Inspecionar variáveis e executar deploy de preview; provar sem segredo/prod write. |
| T16 | Migration destrutiva, erro operacional ou região/provedor indisponível. | Alta: perda/indisponibilidade. | Migrations revisadas e forward-only; staging first; backups e restore testado; rollback do app separado do rollback de dados. | Restore em ambiente isolado e checklist de rollback aprovado antes do beta. |
| T17 | PII/token em logs, analytics, IDs de asset ou resposta de erro. | Média/Alta: privacidade/LGPD. | Minimização; não logar body completo/email/token; erro público genérico; retenção definida; exclusão de conta documentada. | Varredura de logs e revisão de payloads/export de conta. |
| T18 | Dependência NPM/CI comprometida ou migration maliciosa. | Alta: supply-chain e backend. | Lockfile, revisão de dependência, atualização controlada, checks CI, branch protection, duas pessoas para mudanças críticas se equipe permitir. | Auditoria de dependências e teste de secret scanning antes de beta. |
| T19 | Permissão excessiva de Editor ou abuso interno. | Alta: conteúdo/retorno alterado sem controle. | RBAC mínimo; Editor não publica nem altera roles; Owner aprova com diff/motivo; Auditor read-only; audit append-only. | Matriz de autorização exercitada para cada endpoint/role. |
| T20 | Banco leak por grant default, função RPC pública ou view insegura. | Crítica: bypass das regras de app. | Revogar privilégios default; grant mínimo; RLS em toda tabela exposta; `SECURITY DEFINER` com search_path fixo; schemas privados não expostos. | Catalog de grants/policies e testes REST/RPC sob anon/authenticated/service role. |

## 3. Requisitos mínimos de segurança por camada

### Game Web / browser

- Nenhum segredo server-side; não confiar em HP, moeda, item, raridade, x, cooldown, tempo ou autorização local.
- Sanitizar conteúdo externo como texto; CSP, headers seguros e dependências revisadas.
- Guardar o mínimo no browser; snapshot autoritativo pode ser descartado/recarregado. Não gravar e-mail, token em log local ou seed.

### Edge Functions / PostgreSQL

- Validar JWT, schema, dono, faixa e versão em toda chamada; rejeitar campos desconhecidos em comandos econômicos.
- Mutação de perfil/inventário/Coins ocorre em transação; ledger append-only e chave idempotente.
- Deny-by-default, grants explícitos, RLS e testes automatizados em migration. `service_role`/`sb_secret` é uma credencial crítica que ignora RLS.
- Limitar payload/tamanho/tempo, rate limit, timeout, concorrência, custo e resposta de erro; remover dados sensíveis dos logs.

### Admin Web / conteúdo

- Deployment separado, páginas dinâmicas protegidas antes de servir shell/dados; nenhuma rota pública administrativa.
- MFA em conta admin; role confiável consultada a cada ação; reauth em publicar/rollback/roles.
- Preview drafts não publica assets/JSON; edição de texto não permite HTML/script; ações destrutivas pedem confirmação.
- Audit log não pode ser editado/apagado pelo Editor; Owner rollback cria nova ação e motivo.

### Operação

- Separar projetos/segredos dev, staging, produção; princípio de menor privilégio; revogar credenciais em incidente.
- Backup e restore medidos antes do beta; monitoração de falhas Auth, abuso, dupe de rewards, publishing e crescimento de DB.
- Processo de incidente inclui congelar novas publicações/comandos econômicos, preservar logs não sensíveis, revogar tokens/admin e comunicar conforme política aprovada.

## 4. Critérios de risco aceito antes de G3/beta

Nenhuma ameaça Crítica fica sem teste reproduzível. Ameaças Altas devem ter controle implementado/testado ou risco aceito formalmente pelo responsável, com limitação/mitigação temporária. Os itens acima são plano; houve apenas smoke test de schema/RLS em PGlite. Não houve teste de RLS na stack Supabase, pentest, load test, restore nem teste MFA.

## Referências oficiais

- [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase — Securing your API](https://supabase.com/docs/guides/api/securing-your-api)
- [Supabase — Edge Function secrets](https://supabase.com/docs/guides/functions/secrets)
- [Vercel — Deployment Protection](https://vercel.com/docs/deployment-protection)
