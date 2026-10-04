# Sistemas MMO

**Versão:** 0.1 · **Data:** 2026-09-30 · **Estado:** visão agregada
**Fonte:** §1, §40, §50, §52, §53, §54, §98–§100, §119, §120 do `Master-Prompt.md`

---

## 1. O que "MMORPG assíncrono" significa aqui

O jogo se define como **MMORPG assíncrono** (§1). Isso tem uma consequência de arquitetura que vale mais que qualquer feature:

> **O mundo é compartilhado. A hunt não é.**

O jogador vê outros Reis em em rankings, chat, guilda, arena, mercado. Mas **nenhum jogador aparece andando na hunt de outro**. O §120 descreve o resultado: *"O chat cria vida no mundo"* — vida vem da presença social, não da co-presença física.

Essa decisão tem consequências favoráveis:

| Consequência | Benefício |
|---|---|
| Hunt individual | Pode rodar no cliente (MVP local) |
| Sem servidor de tempo real contínuo | Custo operacional baixo |
| Sem colisão, sem sincronização de mundo | Escala muito mais |
| Batch em vez de tick por jogador | Arquitetura de Event Functions viável |
| Sistemas sociais por serviço | Cada um escala independente |

---

## 2. Mapa dos sistemas

```text
┌───────────────────────── IDENTIDADE ─────────────────────────┐
│  AUTH (§7)  ·  NICKNAME ÚNICO (§6)  ·  1 CONTA = 1 REI (§8)   │
└────────────────────────────┬───────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌──────────────┐   ┌──────────────────┐   ┌──────────────────┐
│ SOCIAL       │   │  COMERCIAL       │   │  COMPETITIVO     │
│              │   │                  │   │                  │
│ · Chat Global│   │ · Mercado da     │   │ · Arena / PvP    │
│   (§50)      │   │   Comunidade     │   │   (§53)         │
│ · Chat Guilda│   │   (§40)          │   │ · World Boss     │
│   (§52)      │   │ · Taxa 15%       │   │   (§54)         │
│ · Guildas    │   │   (§41)          │   │ · Boss Guilda    │
│   (§52)      │   │ · Transação      │   │   (§52)         │
│ · Amizades   │   │   atômica        │   │ · Server-auth    │
│ · Perfis     │   │   (§87)          │   │   (§53)         │
│ · Rankings   │   │                  │   │                  │
└──────────────┘   └──────────────────┘   └──────────────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                    ┌────────▼─────────┐
                    │  IDENTIDADE      │
                    │  (todas leem do    │
                    │   mesmo auth)    │
                    └──────────────────┘
```

---

## 3. A distinção que governa tudo

O §25 exige que Torre e Boss sejamRadicalmente diferentes. Essa distinção **atravessa** os sistemas MMO:

| | **PvE individual** | **PvE social** | **PvP** |
|---|---|---|---|
| Torre | ✅ (1×1, §17) | — | — |
| Boss Arena | ✅ (equipe × 1, §24) | — | — |
| Boss de guilda | — | ✅ (cooperativo) | — |
| World Boss | — | ✅ (coletivo) | — |
| Event Boss | — | ✅ (temporário) | — |
| Arena | — | — | ✅ (server-auth, §53) |
| Mercado | — | ✅ | — |
| Chat | — | ✅ | — |

**Consequências práticas:**

- **PvE individual** pode rodar no cliente (MVP local).
- **PvE social** precisa de coordenação, mas não de tick por jogador.
- **PvP é 100% server-authoritative** (§53) — sem exceção, sem atalho.

---

## 4. Chat Global

> **Funcional no MVP online.** (§50)

O único sistema MMO que é requisito do MVP online. Ver [`CHAT_SYSTEM.md`](CHAT_SYSTEM.md).

Pontos que importam no contexto MMO:

- O chat é a **primeira prova** de que a autoridade é do servidor: o autor vem do JWT.
- É o que cria a sensação de mundo vivo do §120.
- Precisa de moderação desde o dia 1, não depois (§98).

PEND: `P-043`, `P-044`, `P-045`, `P-047`, `P-048`.

---

## 5. Guildas

> *"Guildas fazem parte do produto final. Devem ser arquitetadas para: criação, entrada, saída, cargos, membros, chat, progressão, Boss de guilda, recursos, rankings. **Não bloquear o MVP.**"* (§52)

Ver [`SOCIAL_SYSTEM.md`](SOCIAL_SYSTEM.md).

O que guilda traz que nenhum outro sistema traz: **progressão coletiva**. Um recurso de guilda que ninguém pode conquistar sozinho cria obrigação social — que é o que mantém um MMO vivo.

PEND: `P-050`, `P-051`, `P-031`.

---

## 6. Mercado da Comunidade

> **Taxa de 15%, consumida pelo servidor.** (§41)

Ver [`MARKET_SYSTEM.md`](MARKET_SYSTEM.md).

O mercado é o sistema MMO com maior risco de:

- **Infração** (a taxa de 15% é a defesa primária)
- **Duplicação** (§87 — transação atômica obrigatória)
- **Golpe** (preço falso, item roubado)

PEND: `P-014`, `P-053`, `P-054`.

---

## 7. Arena / PvP

> *"Deve utilizar SERVER AUTHORITATIVE. Nunca confiar no resultado calculado exclusivamente pelo navegador."* (§53)

Ver [`SOCIAL_SYSTEM.md` §6](SOCIAL_SYSTEM.md#6-arena--pvp).

O PvP é onde a server authority é **não negociável**: o resultado de uma partida decide ranking, e ranking é valor competitivo. O Battle Engine roda no servidor; o cliente só apresenta.

PEND: `P-052`, `P-053`.

---

## 8. Boss compartilhados

O §23 lista World Boss, Guild Boss e Event Boss como estruturas que a arquitetura deve suportar.

| Estrutura | Coordenação | Last hit |
|---|---|---|
| **World Boss** | Todos atacam | ⚠️ Precisa de regra |
| **Guild Boss** | Só a guilda | ⚠️ Precisa de regra |
| **Event Boss** | Todos, por tempo limitado | ⚠️ Precisa de regra |

> **O last hit é o problema difícil.** Se a recompensa vai para quem dá o golpe final, o comportamento emergente é: chegar tarde, e ninguém ajuda. A regra precisa ser **transparente** e decideída **antes** de o sistema existir.

> **P-030** — regra de last hit do World Boss.

PEND: `P-030`, `P-031`, `P-062`.

---

## 9. Server Authority em escala

> *"No lançamento: O CLIENTE NÃO É CONFIÁVEL."* (§86)

Ver [`SECURITY.md`](SECURITY.md).

O modelo que torna isso viável em um MMO idle:

```text
Cliente envia INTENÇÃO
      ↓
Edge Function valida sessão, posse, saldo, versão, idempotência
      ↓
Battle Engine roda no SERVIDOR (mesmo código, ADR-008)
      ↓
Transação persiste resultado + ledger
      ↓
Resposta com estado completo
      ↓
Cliente renderiza
```

O Battle Engine é **determinístico e compartilhado**: o mesmo código roda no cliente (para apresentar) e no servidor (para decidir). Se divergirem, o servidor vence.

Isso é o que torna o modelo de **batch** viável: um endpoint curto que simula ~5s e devolve, em vez de um game server sempre ligado.

### 9.1 O que cada sistema MMO exige do servidor

| Sistema | Latência aceitável | Consistência |
|---|---|---|
| Chat | ~200 ms | Eventual (broadcast após commit) |
| Ranking | Minutos (job) | eventual |
| Mercado | Imediata | **Forte** (transação) |
| Arena | Imediata | **Forte** (transação) |
| Hunt | Batch de ~5 s | **Forte** (transação) |
| Perfil | ~200 ms | Leitura |

---

## 10. Dependências

```text
AUTH (§7, Google)
  ↓
NICKNAME ÚNICO (§6)
  ↓
PERFIL PÚBLICO
  ↓
  ├── CHAT GLOBAL (§50)        → requisito do MVP online
  ├── RANKINGS
  ├── GUILDAS (§52)            → chat de guilda, boss de guilda
  ├── MERCADO (§40, §41)       → economia entre jogadores
  └── ARENA (§53)              → PvP server-authoritative
```

Nenhum sistema MMO funciona sem `AUTH`. A ordem é rígida porque **todos os identificadores vêm de lá**.

---

## 11. O que nunca fazer

| Proibido | Fonte |
|---|---|
| Confiar no cliente para PvP | §53 |
| Simular economia online falsa no MVP local | §42 |
| Chat só no frontend | §51 |
| Mercado sem transação atômica | §87 |
| Loot de fragmento em inimigo comum | §12 |
| Guild/mercado bloqueando o MVP | §52, §40 |
| Deixar moderação para depois | §98 |
| World Boss sem regra de last hit | §110 |
| Cliente enviando Coin, XP, dano, resultado | §86 |

---

## 12. Checklist de pronto

- [ ] Hunt individual **não** mostra outros jogadores
- [ ] Chat Global funcional, com autor vindo do JWT
- [ ] Guildas com criação, entrada, saída, cargos, membros, chat
- [ ] Progressão e recursos de guilda
- [ ] Mercado com anúncio, compra, cancelamento, histórico, status
- [ ] **Taxa de 15%** consumida pelo servidor
- [ ] Transação de mercado **atômica**
- [ ] Arena **100% server-authoritative**
- [ ] Ranking global, paginado, atualizado por job
- [ ] World Boss com regra de last hit **transparente**
- [ ] Moderação, denúncia e bloqueio em todos os sistemas
- [ ] Ledger append-only em toda mutação econômica
- [ ] Nenhum sistema MMO bloqueia o MVP

---

## 13. Pendências

| ID | Pendência | Sistema |
|---|---|---|
| `P-043` | Limite de caracteres e rate limit | Chat |
| `P-044` | Política de URLs | Chat |
| `P-045` | Retenção de histórico | Chat |
| `P-046` | Chat privado | Social |
| `P-047` | Filtro de palavras | Chat |
| `P-048` | Canais além do global | Chat |
| `P-049` | Rankings: quais, período, desempate | Social |
| `P-050` | Cargos de guilda | Social |
| `P-051` | Recursos de guilda | Social |
| `P-031` | Boss de guilda e last hit | Social |
| `P-014` | Regras de anúncio | Market |
| `P-053` | Anti-smurf e abuso competitivo | PvP |
| `P-054` | Detecção de wash trading | Market |
| `P-030` | World Boss: last hit | Social |
| `P-052` | Matchmaking e rating | PvP |

---

## 14. Referências

- [`AUTH_SYSTEM.md`](AUTH_SYSTEM.md) — fundação da identidade
- [`CHAT_SYSTEM.md`](CHAT_SYSTEM.md) — chat
- [`SOCIAL_SYSTEM.md`](SOCIAL_SYSTEM.md) — guilda, ranking, arena
- [`MARKET_SYSTEM.md`](MARKET_SYSTEM.md) — economia entre jogadores
- [`BOSS_SYSTEM.md`](BOSS_SYSTEM.md) — World, Guild e Event Boss
- [`SECURITY.md`](SECURITY.md) — server authority
- [`ROADMAP.md`](ROADMAP.md) — fases Social, Market e PvP
