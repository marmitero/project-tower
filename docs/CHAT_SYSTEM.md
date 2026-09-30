# Sistema de Chat

**Versão:** 0.1 · **Data:** 2026-09-30 · **Estado:** especificado
**Fonte:** §50, §51, §92, §98, §119 do `Master-Prompt.md`

---

## 1. Requisito

> **O Chat Global deve ser FUNCIONAL NO MVP ONLINE.** (§50)
>
> No MVP local: **desativado**.

Este não é um item de backlog. É requisito do MVP online e uma das coisas que dão "vida ao mundo" (§120).

---

## 2. A regra que separa um chat de uma lista de mensagens

> **Não criar um chat falso que apenas adiciona mensagens no frontend.** (§51)

O fluxo obrigatório:

```text
Cliente
  ↓
Backend / Realtime
  ↓
Validação
  ↓
Persistência
  ↓
Broadcast
  ↓
Outros clientes
```

E o que o cliente **não pode** forjar:

- ❌ **autor** — a mensagem não pode dizer quem é o autor
- ❌ **timestamp** — o tempo é do servidor
- ❌ **permissões** — o papel vem do servidor
- ❌ **identidade** — o `userId` vem do token, **nunca** do payload

### 2.1 O teste que revela um chat falso

Se um jogador abrir o console do navegador e executar:

```js
sendMessage({ userId: "outro-jogador", displayName: "Rei Falso", text: "..." })
```

e a mensagem aparecer com esses dados, **o chat é falso** e a seção 51 foi violada.

---

## 3. Arquitetura

```
┌──────────────┐   HTTPS/JWT   ┌─────────────────────┐
│   Cliente    │──────────────►│  Edge Function       │
│  (React)     │               │  "send_message"      │
└──────────────┘               │                      │
       ▲                       │  1. valida JWT       │
       │                       │  2. deriva userId    │← NUNCA do payload
       │                       │  3. valida input     │
       │                       │  4. rate limit       │
       │                       │  5. filtra spam      │
       │                       │  6. persiste         │
       │                       │  7. retorna id+ts    │
       │                       └──────────┬───────────┘
       │                                  │
       │        ┌─────────────────────────▼───────────┐
       │        │        PostgreSQL                    │
       │        │  INSERT INTO messages (...)          │
       │        │  (author_id vem do JWT)              │
       │        └─────────────────────────┬───────────┘
       │                                  │
       │        ┌─────────────────────────▼───────────┐
       └────────│        Realtime broadcast            │
   assíncrono  │  INSERT em canal "global_chat"        │
               │  RLS: leitura pública, escrita negada │
               └─────────────────────────────────────┘
```

**Ponto crítico:** o broadcast do Realtime acontece **após** o commit no banco. Se o Realtime notificar sem persistir, uma mensagem pode chegar a outros clientes e desaparecer num refresh — inconsistência clássica.

---

## 4. Modelo de dados

```ts
interface ChatMessage {
  id: string;              // UUID gerado pelo servidor
  channelId: string;        // "global" | "guild:{id}" | "party:{id}"
  authorId: string;         // SEMPRE do JWT
  authorNickname: string;   // resolvido no servidor a partir do authorId
  authorKingLevel: number;
  body: string;
  createdAt: number;        // SEMPRE do servidor
  deletedAt?: number;
}
```

O cliente **envia apenas** `channelId` e `body`. Todo o resto é derivado no servidor.

---

## 5. Validação server-side

O §92 exige "validação server-side" e "proteção do chat".

| Validação | Regra |
|---|---|
| Autenticado | Sem sessão, sem mensagem |
| **Limite de caracteres** | ⚠️ P-043 — valor não definido |
| **Rate limit** | ⚠️ P-043 — mensagens por janela |
| Tamanho de payload | Limite duro, antes de parse |
| Caracteres de controle | Removidos |
| HTML | **Nunca interpretado** — renderizado como texto |
| URLs | ⚠️ P-044 — filtradas ou permitidas? |
| Spoofing de formatação | Markdown desabilitado ou sanitizado |
| Conta recém-criada | Cooldown antes de falar |

### 5.1 XSS é o risco principal

Como as mensagens são renderizadas no HUD de todos os jogadores, XSS armazenado aqui é **crítico**.

Mitigações:

- Renderizar com `textContent`, **nunca** `innerHTML`.
- Sanitização no servidor **e** no cliente.
- CSP estrita (sem `unsafe-inline`).
- Escapar todo texto de usuário em qualquer superfície.

---

## 6. Rate limit e anti-spam

O §50 exige "rate limit" e "anti-spam básico".

```
┌─────────────────────────────────────────────┐
│  Rate limit                                 │
│                                             │
│  playerId ──► janela deslizante             │
│              ├─ X mensagens em N segundos   │
│              └─ burst: Y no mesmo segundo   │
│                                             │
│  + limite global por conta (IP + userId)    │
│  + bloqueio progressivo: 3 avisos → mute    │
└─────────────────────────────────────────────┘
```

> **P-043** — os **números** (limite de caracteres, mensagens por janela, burst) **não estão definidos** no `Master-Prompt.md`. São Tipo C para o balanceamento do chat, mas com impacto de moderação.

O rate limit é aplicado **no servidor**. Aplicar no cliente seria exatamente o "chat falso" da §51.

---

## 7. Histórico

| Canal | Persistência | Limpeza |
|---|---|---|
| Global | ✅ Servidor | ⚠️ P-045 (retenção) |
| Guilda | ✅ Servidor | Com a guilda |
| Privado | ⚠️ P-046 | — |

Ao abrir o jogo, o cliente carrega as últimas N mensagens do canal e **depois** assina o canal Realtime. A assinatura vem **primeiro** para não perder mensagens entre o fetch e o subscribe.

> **P-045** — política de retenção e moderação de mensagens antigas não está definida. Relevante para privacidade e para o custo de armazenamento.

---

## 8. UX

O §67 e o §68 exigem que funcione no **Android via navegador**, sem hover ou teclado.

- Chat **recolhível** em mobile; badge com contador de não-lidas.
- Indicador de quem está falando.
- Scroll automático só se o jogador já estava no fim (não sequestrar a leitura).
- Sender em destaque quando a mensagem é do próprio Rei.
- Limite de caracteres **visível** no campo.
- Botão de "Reportar" em toda mensagem.

### 8.1 Chat não pode poluir o gameplay

O §69 exige que em ~2 segundos o jogador entenda o estado da partida. O chat:

- Fica em **painel lateral recolhível** em desktop.
- Fica em **sheet inferior** em mobile.
- **Nunca** sobrepõe a arena de batalha.
- Tem um modo "silenciar" de um toque.

---

## 9. Moderação

O §98 coloca chat na fase social; o §92 pede proteção. Mínimo antes do beta:

| Ferramenta | Função |
|---|---|
| **Denunciar mensagem** | Abre ticket para moderação |
| **Bloquear jogador** | Oculta mensagens, bloqueia menções |
| **Silenciar jogador** | Filtro local opcional |
| **Rate limit** | Anti-flood (§50) |
| **Filtro de palavras** | ⚠️ P-047 — lista definida ou automática? |
| **Log de moderação** | Auditoria de ações |
| **Mute punitivo** | Em casos de abuso |

> **P-047** — o mecanismo de filtro de palavras (lista curada, filtro automático, ou ambos) não está definido. Decisão de produto com implicações legais e de>false-positivos.

---

## 10. Checklist de pronto

- [ ] Chat **desativado** no MVP local
- [ ] Chat Global funcional no MVP online
- [ ] `authorId` vem do **JWT**, nunca do payload
- [ ] `createdAt` é do **servidor**
- [ ] Mensagem **persistida** antes do broadcast
- [ ] Nenhum campo de permissão vem do cliente
- [ ] XSS: renderizado como texto, CSP estrita
- [ ] Rate limit **no servidor**
- [ ] Limite de caracteres visível
- [ ] Histórico carregado + assinatura Realtime sem perda
- [ ] Botão de reportar em toda mensagem
- [ ] Bloquear / silenciar jogador
- [ ] Funciona por touch em tela pequena (§68)
- [ ] Não polui a leitura da arena

---

## 11. Pendências

| ID | Pendência | Bloqueia |
|---|---|---|
| `P-043` | Limite de caracteres e rate limit | Fase Online |
| `P-044` | Política de URLs em mensagens | Fase Online |
| `P-045` | Retenção e limpeza de histórico | Fase Online |
| `P-046` | Chat privado / DMs | Fase Social |
| `P-047` | Mecanismo de filtro de palavras | Fase Online |
| `P-048` | Canaisbeyond global (sistema, evento, local) | Fase Social |

---

## 12. Referências

- [`SOCIAL_SYSTEM.md`](SOCIAL_SYSTEM.md) — chat de guilda
- [`SECURITY.md`](SECURITY.md) §3 — superfície de ataque
- [`UI_UX.md`](UI_UX.md) — posicionamento do painel
- [`MMO_SYSTEMS.md`](MMO_SYSTEMS.md) — chat no contexto dos sistemas MMO
