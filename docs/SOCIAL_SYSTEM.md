# Sistema Social

**Versão:** 0.1 · **Data:** 2026-09-30 · **Estado:** especificado (arquitetado, não bloqueia o MVP)
**Fonte:** §6, §52, §53, §98, §109, §119, §120 do `Master-Prompt.md`

---

## 1. Escopo e prioridade

> **Guildas fazem parte do produto final. Devem ser arquitetadas para: criação, entrada, saída, cargos, membros, chat, progressão, Boss de guilda, recursos, rankings.** (§52)
>
> *"Não bloquear o MVP."* (§52)

Ou seja: **arquitetar agora, implementar depois**. A distinção é importante — os dados e contratos existem desde o início, mas nenhuma tela de guilda bloqueia a vertical slice.

Prioridade de implementação:

| Sistema | Fase | Bloqueia o MVP? |
|---|---|---|
| Perfil público | Online | Não |
| Rankings | Social | Não |
| Amizades | Social | Não |
| Chat Global | **Online** | Não, mas é requisito do MVP online |
| Guildas | Social | Não |
| Chat de guilda | Social | Não |
| Arena / PvP | PvP | Não |
| Boss de guilda | Social | Não |

---

## 2. Perfil público

O §69 exige que a HUD comunique Rei, nickname, nível e recursos. O §120 exige que o mundo "tenha vida". O perfil é a peça que liga os dois.

```ts
interface PublicKingProfile {
  kingId: string;
  nickname: string;            // único (§6)
  skinAssetId: string;
  level: number;               // nível do Rei
  bestFloor: number;           // maior andar da Torre alcançado
  teamPower: number;
  avatarAssetId: string;

  // Coleção — exibida como contagem, não como lista completa
  heroCount: number;
  teamHeroNames: string[];    // máx. 3

  createdAt: number;
  lastActiveAt: number;       // exibido como "ativo há X"
}
```

**Campos deliberadamente ausentes:** e-mail, VIP tier (fora de sistema VIP), saldo de Coin, itens do inventário.

> O §92 e o §85 exigem minimização. Perfil público mostra **progresso**, não **inventário**.

---

## 3. Rankings

O §6 lista rankings como uso do nickname. O §98 coloca rankings na fase social.

| Ranking | Métrica | Atualização |
|---|---|---|
| **Nível do Rei** | `king.level` | Ao subir de nível |
| **Andar da Torre** | `tower.bestFloor` | Ao avançar |
| **Poder de equipe** | `team.power` | A cada mudança de equipamento |
| **Coleção** | `heroes.count` | Ao obter herói |
| Vitórias em Boss | `boss.clears` | Ao derrotar Boss |

Regras:

- Ranking é **global** e **público**.
- Nunca revela dados privados.
- Tem paginação (não top-1000 em uma request).
- Tiene corte diário/por período no topo para evitar que o topo seja só quem joga 16h.
- Recalculo por job, **não** a cada ação do jogador.

> **P-049** — quais rankings existem, em que período, e como desempatar **não estão definidos**.

---

## 4. Guildas

O §52 lista as capacidades obrigatórias. Estrutura:

```ts
interface Guild {
  id: string;
  name: string;               // único, normalizado
  tag: string;                // 2–4 chars
  description?: string;
  leaderId: string;
  level: number;              // progressão da guilda
  xp: bigint;

  resources: Record<ResourceId, bigint>;
  createdAt: number;
  memberCount: number;
  maxMembers: number;
}

interface GuildMember {
  guildId: string;
  kingId: string;
  role: GuildRole;            // "leader" | "officer" | "member"
  joinedAt: number;
  contribution: bigint;
}

type GuildRole = "leader" | "officer" | "member";
```

### 4.1 Cargos

O §52 exige cargos. Mínimo viável:

| Cargo | Permissões |
|---|---|
| **Leader** | tudo, incluindo kicked e dissolução |
| **Officer** | convidar, kick (não officer/leader), gerenciar anúncios |
| **Member** | chat, contribuir, usar recursos |

> **P-050** — número de cargos, nomes e matriz de permissões **não estão definidos**.

### 4.2 Recursos de guilda

O §52 lista "recursos" como capacidade. Decisão técnica: manter o conjunto **mínimo** até haver definição.

> **P-051** — quais recursos de guilda existem e para que servem não está definido. Sem isso, não se sabe se "recurso de guilda" é moeda, item, ou contador.

### 4.3 Boss de guilda

O §52 e o §54 listam Boss de guilda. Depende de [`BOSS_SYSTEM.md`](BOSS_SYSTEM.md) §3.

> **P-031** — escala, distribuição de recompensa entre membros, e o que acontece se o Boss é derrotado no limite de tempo **não estão definidos**. É um problema difícil: *last-hit* é Quem pega a recompensa, e isso precisa de regra transparente **antes** de existir.

---

## 5. Amizades

Não está no §52 explicitamente, mas é necessário para o chat privado e para a sensação de comunidade do §120.

```ts
interface Friendship {
  requesterId: string;
  addresseeId: string;
  status: "pending" | "accepted" | "blocked";
  createdAt: number;
}
```

Regras mínimas:

- Solicitar, aceitar, recusar, remover, bloquear.
- Bloquear **impede** Amizade e silenciar o chat.
- Sem notificação deamigo online forçada.

> **P-046** — chat privado **não está definido** no `Master-Prompt.md`. O §52 lista "chat de guilda" e o §50 lista chat global; o privado é inferência.

---

## 6. Arena / PvP

O §53 define o requisito:

> **Deve utilizar SERVER AUTHORITATIVE. Nunca confiar no resultado calculado exclusivamente pelo navegador.** (§53)
>
> *"Não bloquear o MVP PvE."* (§53)

```ts
interface MatchmakingTicket {
  kingId: string;
  rating: number;
  teamSnapshot: HeroSnapshot[];   // referência, não dados livres
  enqueuedAt: number;
}

interface MatchResult {
  matchId: string;
  winnerKingId: string;
  loserKingId: string;
  simulationSeed: number;
  serverSimulatedAt: number;
  // O cliente NUNCA envia o resultado
}
```

Regras estruturais:

- O cliente envia **intenção** ("quero entrar na fila").
- O servidor monta a partida e **simula**.
- O cliente **nunca** envia resultado, dano ou vencedor.
- Snapshot da equipe é **referenciado por ID**, não enviado livremente — impede build inventada.
- Mesma seed ⇒ mesmo resultado, auditável.

> **P-052** — matchmaking, rating, temporadas, recompensas e regras anti-smurf **não estão definidos**. Nenhum está na frente do MVP.

---

## 7. Moderação

Todos os sistemas sociais precisam de moderação desde o dia 1, não depois:

| Ferramenta | Aplicação |
|---|---|
| Denunciar jogador | Perfil, chat, guilda |
| Bloquear | Perfil, chat, marketplace |
| Silenciar | Chat |
| Log de auditoria | Toda ação social |
| Denúncia de nome | Nickname impróprio (P-007) |
| Denúncia de guilda | Nome/descrição impróprios |
| Rate limit por ação | Solicitações, convites, anúncios |

> *"Chat e mercado exigem denúncia, bloqueio, filtros, limites contra spam, moderação e trilhas de auditoria."* (§98)

---

## 8. Dependências

```text
AUTH (§7)          ──→ tudo (identidade)
  ↓
PERFIL + NICKNAME  ──→ rankings, guilda, arena, mercado
  ↓
CHAT GLOBAL        ──→ vida no mundo
  ↓
GUILDAS            ──→ chat de guilda, boss de guilda
  ↓
ARENA (server)     ──→ competitiva
```

Nenhum sistema social funciona sem `AUTH`. A ordem é rígida porque todos os identificadores vêm de lá.

---

## 9. O que nunca fazer

- ❌ **Confiar no cliente** para resultado de PvP (§53)
- ❌ Expor e-mail, Coin ou inventário em perfil público (§85, §92)
- ❌ Largar moderação como "fase posterior" (§98 — ela é requisito, não extra)
- ❌ Deixar guilda quebrar por `last-hit` sem regra (§110)
- ❌ Ranking que só faz sentido para quem joga 16h/dia
- ❌ Sistema social que **bloqueie** a vertical slice (§52: "não bloquear o MVP")

---

## 10. Checklist de pronto

- [ ] Perfil público com os campos do §2
- [ ] Nenhum campo privado exposto
- [ ] Rankings globais, paginados, com recalculo por job
- [ ] Estrutura de guilda completa (dados), sem bloquear o MVP
- [ ] Matriz de permissões por cargo
- [ ] Chat de guilda integrado ao chat (§50)
- [ ] Amizade: solicitar/aceitar/recusar/remover/bloquear
- [ ] Arena **100% server-authoritative** (§53)
- [ ] Denúncia e bloqueio em todas as superfícies
- [ ] Log de auditoria em toda ação social
- [ ] Rate limit em todas as ações

---

## 11. Pendências

| ID | Pendência | Bloqueia |
|---|---|---|
| `P-046` | Chat privado / DM | Fase Social |
| `P-049` | Quais rankings, período, desempate | Fase Social |
| `P-050` | Cargos e permissões de guilda | Fase Social |
| `P-051` | Recursos de guilda | Fase Social |
| `P-031` | Boss de guilda e last-hit | Fase Social |
| `P-052` | Matchmaking, rating, temporadas de arena | Fase PvP |
| `P-053` | Regras anti-smurf e anti-abuso competitivo | Fase PvP |
| `P-048` | Canais de chat além do global | Fase Social |

---

## 12. Referências

- [`AUTH_SYSTEM.md`](AUTH_SYSTEM.md) — identidade e nickname
- [`CHAT_SYSTEM.md`](CHAT_SYSTEM.md) — infraestrutura de chat
- [`MARKET_SYSTEM.md`](MARKET_SYSTEM.md) — altro sistema social com economia
- [`MMO_SYSTEMS.md`](MMO_SYSTEMS.md) — visão agregada
- [`SECURITY.md`](SECURITY.md) — moderação e auditoria
