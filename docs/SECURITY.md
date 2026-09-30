# Segurança

**Versão:** 0.1 · **Data:** 2026-09-30 · **Estado:** especificado
**Fonte:** §7, §8, §40, §41, §50, §51, §53, §85, §86, §87, §91, §92, §93 do `Master-Prompt.md`

---

## 1. O princípio

> **O cliente não é confiável.** (§86)

> *"Nunca confiar simplesmente em `localStorage` ou `client state` para valores econômicos."* (§86)

O que o servidor deve validar: Coin, Diamonds, XP, níveis, loot, equipamentos, personagens, fragmentos, mercado, transações, progressão, recompensas, PvP, Boss e sistemas econômicos.

**O limite de segurança não é "esconder o botão".** O servidor, o banco e o deploy precisam **negar a ação** — não a interface.

---

## 2. A fronteira

```text
┌─────────────────────────────┐
│  BROWSER — NÃO CONFIÁVEL    │
│  pode adulterar:             │
│    · localStorage           │
│    · requisições HTTP       │
│    · relógio do sistema     │
│    · JavaScript             │
│    · IDs enviados           │
│    · WebSocket payloads     │
└──────────┬──────────────────┘
           │ HTTPS + JWT
           │ apenas INTENÇÕES
           ▼
┌─────────────────────────────┐
│  SERVIDOR — AUTORITATIVO    │
│  valida: sessão · schema ·  │
│  posse · saldo · versão ·   │
│  idempotência · rate limit  │
└──────────┬──────────────────┘
           ▼
┌─────────────────────────────┐
│  POSTGRES + RLS             │
│  constraints · ledger ·    │
│  locks transacionais        │
└─────────────────────────────┘
```

---

## 3. O que o cliente **nunca** envia

A assinatura do sistema é a **ausência** destes campos em qualquer comando:

```ts
// ❌ NENHUM comando pode conter:
damage, hp, coins, diamonds, xp, level, rarity, x,
result, winner, isAdmin, role, userId (do outro jogador),
timestamp, elapsedMs
```

**O cliente envia o que QUER. O servidor decide o que ACONTECE.**

```ts
// ✅ O cliente diz o que quer, não o que aconteceu
{ type: "buy_listing", requestId, listingId }
{ type: "equip_item", requestId, equipmentId, heroId }
{ type: "unlock_slot", requestId, slotIndex }
```

---

## 4. Idempotência

O risco mais caro de um sistema idle + online é **duplicar recompensa ou moeda** por retry, duplo clique, reconexão ou segundo dispositivo.

| Cenário | Proteção |
|---|---|
| Retry com mesmo `requestId` | Retorna o **mesmo resultado**; não re-executa |
| Duplo clique | 2º `requestId` é rejeitado ou deduplicado |
| Timeout de rede | Cliente consulta o status pelo `refId` |
| Reconexão | Estado é **consultado**, nunca reconstruído localmente |
| Duas abas | ⚠️ `P-012` — política multi-aba |
| Duas compras simultâneas | Lock transacional; uma falha |

```sql
CREATE TABLE command_log (
  request_id    uuid PRIMARY KEY,
  account_id    uuid NOT NULL,
  command_type  text NOT NULL,
  response      jsonb NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
```

> Retry e duplicação são **a mesma** requisição do ponto de vista do servidor, e por isso produzem **a mesma** resposta. Isso é o que define a diferença entre os dois.

---

## 5. Row Level Security

Todas as tabelas com dados de jogador têm RLS habilitado **e forçado**:

```sql
ALTER TABLE kings ENABLE ROW LEVEL SECURITY;
ALTER TABLE kings FORCE  ROW LEVEL SECURITY;   -- cobre também o dono da tabela
```

```sql
CREATE POLICY "jogador lê o próprio rei" ON kings
  FOR SELECT USING (account_id = auth.uid());

CREATE POLICY "jogador não escreve rei diretamente" ON kings
  FOR INSERT WITH CHECK (false);   -- criação passa por Edge Function
```

| Política | Regra |
|---|---|
| Leitura do próprio estado | `account_id = auth.uid()` |
| Escrita direta | **Negada** — tudo passa por Edge Function |
| Perfis públicos | View separada, com RLS própria |
| Admin | Verificado por `app_metadata`, **nunca** `user_metadata` |
| Catálogo | Leitura pública de versão **publicada** |

> **`user_metadata` é editável pelo jogador.** Papel de admin **nunca** vem de lá. Reaproveitando a lição do repositório de referência: role vem de `app_metadata` gerenciada no servidor ou tabela protegida.

---

## 6.conomy — integridade

### 6.1 Ledger append-only

Toda mutação de moeda é registrada:

```sql
CREATE TABLE ledger (
  id             bigserial PRIMARY KEY,
  account_id     uuid NOT NULL,
  currency       text NOT NULL,
  delta          bigint NOT NULL,
  balance_after  bigint NOT NULL,
  reason         text NOT NULL,
  ref_id         text,             -- battleId, listingId, slotId
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ledger_no_duplicate_reward
  ON ledger (account_id, reason, ref_id)
  WHERE ref_id IS NOT NULL;
```

O índice único é a **barreira de banco** contra recompensa duplicada. Nenhuma camada de aplicação pode contorná-la.

### 6.2 Restrição de saldo

```sql
CHECK (balance >= 0)
```

Um saldo negativo é sempre bug. A constraint **transforma um exploit em erro de transação**.

---

## 7. Mercado

Ver [`MARKET_SYSTEM.md`](MARKET_SYSTEM.md). Regras de transação atômica (§87):

```text
Validações (todas):
  · anúncio existe e está "active"?
  · preço válido?
  · comprador tem saldo?
  · item pertence ao vendedor?
  · item não está travado?
  · transação ainda disponível?

Depois, em UMA transação:
  Buyer  − Preço
  Seller + Preço − 15%
  Server  consome 15%     ← sink, §41
  Item   → Buyer
  Listing status = "sold"
  3 entradas no ledger
```

Se **qualquer** validação falha, **nada** é escrito.

### 7.1 Concorrência

```sql
UPDATE market_listings
   SET status = 'sold', buyer_king_id = $1, sold_at = now()
 WHERE id = $2 AND status = 'active'
RETURNING *;
```

Se `RETURNING` vier vazio, alguém já comprou. **Zero chance de venda dupla**, porque a condição `status = 'active'` é avaliada dentro do lock da linha.

---

## 8. Chat

Ver [`CHAT_SYSTEM.md`](CHAT_SYSTEM.md). Riscos específicos:

| Risco | Mitigação |
|---|---|
| Forjar autor | `authorId` do **JWT** |
| Forjar timestamp | `createdAt` do servidor |
| XSS armazenado | Renderizar como **texto**, CSP estrita |
| Flood | Rate limit **no servidor** |
| Payload gigante | Limite de tamanho antes do parse |

---

## 9. Segredos e ambiente

> **Nunca colocar secrets, service role keys ou tokens privados no código público.** (§91)

```bash
# .env.example — commitado, SEM valores reais
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# .env.local — NUNCA commitado
SUPABASE_SERVICE_ROLE_KEY=     # 🔒 servidor apenas
```

> 🔴 **A regra que não pode quebrar:** qualquer variável com prefixo `VITE_` é **embutida no bundle do navegador**. `SUPABASE_SERVICE_ROLE_KEY` **ignora RLS** — usá-la com `VITE_` é uma brecha total de segurança.

Checklist:

- [ ] `.env.local` no `.gitignore`
- [ ] `.env.example` commitado **sem** valores reais
- [ ] Scan de secrets no CI
- [ ] Scan do **bundle de build** por `service_role`
- [ ] Rotação documentada
- [ ] Sem token de MFA, senha ou segredo em chat

---

## 10. Anti-cheat

> *"O objetivo não é criar um sistema anti-cheat perfeito no MVP. Mas a arquitetura final deve dificultar: alteração de Coin, alteração de XP, criação de item, criação de personagem, duplicação, manipulação de loot, falsificação de mercado, manipulação de PvP."* (§93)

| Ataque | Barreira |
|---|---|
| Alterar Coin no `localStorage` | RLS: escrita direta negada; saldo vive no servidor |
| Alterar XP | Idem |
| Criar item | Sem endpoint de criação; item só nasce por comando de loot validado |
| Criar personagem | Idem |
| Duplicar item | `lockedByListingId` + lock transacional |
| **Manipular loot** | Sorteio no **servidor** com seed persistido; o cliente nunca escolhe raridade nem X |
| Falsificar mercado | Preço e propriedade validados server-side |
| Manipular PvP | Resultado **simulado no servidor**; cliente não envia vencedor |
| Forjar tempo | Tempo do servidor; offline limitado a 2h/8h |

### 10.1 O Battle Engine roda nos dois lados — e isso é uma decisão

O engine é **determinístico** e roda no cliente (para apresentar) e no servidor (para decidir). Isso significa que o cliente *pode* tentar prever o resultado.

A defesa não é torná-lo secreto — é tornar a **persistência** autoritativa:

- O cliente executa o engine para **animar**.
- O servidor executa o engine para **decidir**.
- Se divergirem, **o servidor vence** e o cliente corrige.

Como ambos usam o mesmo código e a mesma seed, divergência só ocorre por adulteração — e a correção é detectável, o que na verdade **é útil**.

---

## 11. Modelagem de ameaças

| ID | Ameaça | Impacto | Mitigação | Evidência necessária |
|---|---|---|---|---|
| T1 | Cliente altera dano, X, raridade, Coin, relógio | **Crítico** | API aceita só intenção; RNG e relógio no servidor | Requisição adulterada não muda resultado |
| T2 | IDOR — acessar dados de outro jogador | **Crítico** | Dono vem do JWT; RLS filtra tudo | Matriz A/B + anon + Data API direta |
| T3 | Retry/corrida duplica loot ou Coin | **Crítico** | `requestId` + índice único no ledger | Repetir e concorrer; estado idêntico |
| T4 | Elevação de privilégio | **Crítico** | Role em `app_metadata`/tabela protegida | Jogador tenta e recebe negação |
| T5 | Vazamento de `service_role` | **Crítico** | Segredo só no servidor; scan do bundle | Bundle não contém o segredo |
| T6 | Publicação de conteúdo inválido | Alto | Validação + release imutável + rollback | Odd inválida bloqueada |
| T7 | XSS em chat/perfil | Alto | Render como texto; CSP | Payloads em todo campo |
| T8 | Upload malicioso | Alto | Validar MIME real; limite de bytes/dimensão | Extensão/MIME falsa, imagem truncada |
| T9 | Exposição de seed/estado interno | Alto | Seed no servidor; resposta redigida | Inspecionar API e storage |
| T10 | DoS por flood de comandos | Alto | Rate limit por user/rota; lote fixo | Load test sem afetar outras contas |
| T11 | Catch-up por desconexão | Alto | Sem job offline; `GET` não avança | Desconectar N lotes, cursor intacto |
| T12 | Conta tomada por phishing | Alto | Rate limit Auth; MFA em admin | Expiração/replay de convite |
| T13 | CSRF no admin | Alto | SameSite + Origin check + CSRF token | Teste CSRF em ação privilegiada |
| T14 | Migration destrutiva | Alto | Forward-only; backup testado | Restore em ambiente isolado |
| T15 | Dependência comprometida | Alto | Lockfile + audit em CI | `npm audit` limpo no CI |
| T16 | Permissão excessiva de editor | Alto | RBAC mínimo; auditoria append-only | Matriz por role |

---

## 12. Checklist de pronto

- [ ] RLS habilitado **e forçado** em toda tabela de jogador
- [ ] Escrita direta **negada**; tudo via Edge Function
- [ ] `authorId` de mensagens vem do JWT
- [ ] `created_at` de tudo é do servidor
- [ ] `requestId` idempotente em todo comando
- [ ] Índice único no ledger por `(account, reason, ref_id)`
- [ ] `CHECK (balance >= 0)`
- [ ] Compra de mercado atômica com lock de linha
- [ ] Nenhum campo de resultado em comando do cliente
- [ ] Role fora de `user_metadata`
- [ ] `.env.local` no `.gitignore`
- [ ] Scan de secrets em repo e bundle
- [ ] Rate limit em chat, mercado e comandos
- [ ] XSS: render como texto + CSP
- [ ] Backups testados **antes** do beta
- [ ] Documento de incidente

---

## 13. Pendências

| ID | Pendência | Bloqueia |
|---|---|---|
| `P-012` | Política multi-aba (duplo `advance_hunt`) | Fase 8 |
| `P-047` | Filtro de palavras do chat | Fase Online |
| `P-053` | Sistema de disputa do mercado | FASE Market |
| `P-054` | Detecção de wash trading | FASE Market |
| `P-042` | Recuperação de conta | Fase Online |
| `P-057` | Política de retenção e exclusão de dados (LGPD) | Beta |
| `P-058` | Política de privacidade e termos | Beta |

---

## 14. Referências

- [`ARCHITECTURE.md`](ARCHITECTURE.md) §7 — contrato cliente/servidor
- [`MARKET_SYSTEM.md`](MARKET_SYSTEM.md) — transações
- [`CHAT_SYSTEM.md`](CHAT_SYSTEM.md) — superfície de ataque
- [`ECONOMY_SYSTEM.md`](ECONOMY_SYSTEM.md) §7 — autoridade econômica
- [`AUTH_SYSTEM.md`](AUTH_SYSTEM.md) — identidade e sessão
