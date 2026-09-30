# Sistema de Autenticação

**Versão:** 0.1 · **Data:** 2026-09-30 · **Estado:** especificado
**Fonte:** §6, §7, §8, §85, §86, §88, §91, §92 do `Master-Prompt.md`

---

## 1. Fases de autenticação

| Fase | Método | Persistência | Observação |
|---|---|---|---|
| **MVP local** | **Modo Guest** | Local (`localStorage` / IndexedDB) | Sem servidor, sem economia real |
| **MVP online** | **Google Auth** | Nuvem (Supabase) | Conta persistente |
| **Lançamento** | **Google Auth (oficial)** | Nuvem, server-authoritative | Método único inicial |

O §7 é explícito: *"Google Authentication deve ser o método oficial inicialmente."*

> **A migração Guest → Google** é o ponto mais delicado desta fase. O Guest tem progresso local que pode ser perdido se não for tratado. Ver §6.

---

## 2. Regra de uma conta

> **Cada conta possui 1 REI.** (§8)

> *"Não criar múltiplos personagens/Reis por conta inicialmente. A arquitetura pode ser extensível para isso no futuro, mas não implementar múltiplos Reis sem necessidade."*

```ts
// Restrição no schema, não na aplicação
CREATE UNIQUE INDEX king_account_unique ON king (account_id);
```

Uma constraint de banco, não uma checagem no cliente. Teste: `one-king.test.ts`.

---

## 3. Abstração de provedor

O §7 exige: *"Arquitetar o sistema para permitir futuros provedores sem reescrever a arquitetura."*

```ts
interface AuthProvider {
  id: "guest" | "google" | "discord" | "email";
  signIn(): Promise<Session>;
  signOut(): Promise<void>;
  getSession(): Promise<Session | null>;
  /** Migrar progresso local para a conta autenticada. */
  linkLocalSave?(localSave: SaveData): Promise<MigrationResult>;
}

interface AuthProviderRegistry {
  get(id: string): AuthProvider;
  current(): AuthProvider;
  register(provider: AuthProvider): void;
}
```

Nenhum sistema do jogo importa `supabase/auth` diretamente. Todos usam `AuthService`:

```ts
class AuthService {
  async currentAccount(): Promise<Account>
  async signInWithGoogle(): Promise<Account>
  async signInAsGuest(): Promise<Account>
  onChange(cb: (session: Session | null) => void): () => void
}
```

> **Decisão técnica (ADR-005):** o `AuthService` é a **única** fronteira do jogo com autenticação. Trocar o provedor é trocar a implementação do `AuthService`, não tocar em nenhuma tela.

---

## 4. Google Auth

O §88 define o fluxo:

```text
Google Account
      ↓
Player Account
      ↓
King Profile
      ↓
Game Data
```

E é explícito sobre a separação:

> *"Nunca misturar identidade de autenticação com estado de gameplay de maneira desorganizada."*

### 4.1 Três camadas, trêsематик

| Camada | Quem define | Onde vive | Nunca contém |
|---|---|---|---|
| **Identidade** | Provedor (Google) | `auth.users` / `auth.identities` | Coin, heróis, itens |
| **Conta** | Jogo | `accounts` | senha, token do provedor |
| **Rei** | Jogo | `kings` | credenciais |

> **O nickname do Rei é um identificador de jogo, não o e-mail do Google.** O e-mail nunca é exibido publicamente, nunca entra em ranking e nunca é usado como identificador de chat.

### 4.2 Dados públicos vs. privados

O §92 exige validação server-side e o §85 proíbe segredos no frontend.

```ts
// EXPOSTO (livre)
KingPublicProfile {
  kingId; nickname; skinAssetId; level;
  bestFloor; teamPower; avatarAssetId; createdAt;
}

// NUNCA EXPOSTO
king.email        // ✗
auth.identities   // ✗
account.vipTier   // ✗ fora de sistema VIP
```

---

## 5. Nickname único

O §6 define este sistema com detalle:

| Requisito | Implementação |
|---|---|
| Único no ambiente online | `UNIQUE` em `kings (normalized_name)` |
| Validação de disponibilidade | Endpoint `GET /nickname/available?name=` |
| Proteção contra nomes inválidos | Validação de formato no servidor |
| Normalização | minúsculas, sem acentos, espaços colapsados |
| Proteção contra abuso | Rate limit em claim + em consulta |

```ts
function normalize(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")     // remove diacríticos
    .toLowerCase()
    .replace(/\s+/g, "")      // colapsa espaços
    .trim();
}
```

`"Rei Igor"` e `"rei  igor"` colidem. Isso é **desejado** — a unicidade precisa ser real, não aparente.

> **P-007** — comprimento, caracteres permitidos, lista de reservados, e **se o nickname pode ser alterado depois** não estão definidos. Alterar nickname tem impacto em mercado, chat e rankings, então é Tipo C.

---

## 6. Migração Guest → Google

O ponto mais delicado. O Guest tem progresso local (nível, heróis, Coin, loot) que o jogador não pode perder.

```text
Guest local                          Google Auth
───────────                          ───────────
Save em localStorage/IndexedDB
        │
        │  signInWithGoogle()
        ▼
Conta Google criada
        │
        ▼
┌──────────────────────────────────────────────┐
│  Account nova?                                │
│   ├── SIM → cria Rei a partir do Guest local  │
│   │         (Rei mantém nome/skin/herois)     │
│   │         mostra toast: "Progresso migrado"  │
│   └── NÃO → NÃO vincula. Guest local intacto. │
│             Pergunta: "Importar progresso?"    │
│             → Importa se o save estiver vazio  │
└──────────────────────────────────────────────┘
```

Regras:

1. **O save local nunca é apagado** sem confirmação explícita.
2. A migração acontece **uma vez** e é **idempotente** (marker no save).
3. Se a conta já tem um Rei, **não** cria um segundo (regra de 1 conta = 1 Rei, §8).
4. O jogador escolhe o nickname **nove** — se o do Guest estiver tomado, a UI pede outro.
5. A migração é uma **transação** no servidor: ou tudo entra, ou nada entra.

> **P-039** — as regras de conflito de migração (conta já existente com Rei de nível alto) **não estão definidas**. É decisão de produto.

---

## 7. Sessão

| Fase | Duração de sessão | Persistência |
|---|---|---|
| Guest | Sessão do navegador | Local |
| Online | ⚠️ P-040 | Supabase Auth |

Regras:

- O cliente **nunca** guarda token de longa duração fora do mecanismo do provedor.
- A sessão expirada **não** significa perder progresso — só significa reconectar.
- O save local é sempre um **espelho**; o servidor é a autoridade (§86).

> **P-040** — duração de sessão, renovação e comportamento em dispositivo compartilhado não estão definidos.

---

## 8. Segurança

Ver [`SECURITY.md`](SECURITY.md) para o modelo completo. Pontos específicos de auth:

| Ameaça | Mitigação |
|---|---|
| Roubo de sessão | Tokens de curta duração + refresh rotativo |
| Criação de contas em massa | Rate limit + CAPTCHA no signup |
| Claim de nickname malicioso | Rate limit + reserva de nomes |
| Escalada de privilégio | `user_metadata` **editável pelo jogador** — nunca usar para role |
| Service role exposta | ⚠️ **Proibido no bundle** (§91) |

> A lição do repositório de referência: **papel de admin vem de `app_metadata` gerenciada no servidor** ou tabela protegida, nunca de `user_metadata` que o jogador pode editar.

---

## 9. Checklist de pronto

- [ ] Guest funciona completamente no MVP local
- [ ] Persistência local via `PersistenceService` (§83)
- [ ] `AuthService` é a **única** fronteira com auth
- [ ] Google Auth funciona no online
- [ ] **1 conta = 1 Rei**, garantido por constraint
- [ ] Nickname único com normalização
- [ ] Endpoint de disponibilidade de nickname com rate limit
- [ ] Identidade do provedor **separada** do estado de gameplay (§88)
- [ ] E-mail nunca aparece publicamente
- [ ] Nenhum segredo no frontend (§91)
- [ ] `service_role` fora do bundle
- [ ] Migração Guest → Google é idempotente e transacional
- [ ] Save local nunca é apagado sem confirmação

---

## 10. Pendências

| ID | Pendência | Bloqueia |
|---|---|---|
| `P-007` | Formato, troca e reserva de nickname | Fase Online |
| `P-039` | Regras de conflito na migração Guest → Google | Fase Online |
| `P-040` | Duração e renovação de sessão | Fase Online |
| `P-041` | Provedores futuros além de Google | Pós-lançamento |
| `P-042` | Recuperação de conta / mudança de e-mail | Fase Online |
