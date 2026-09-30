# Arquitetura Técnica

**Versão:** 0.1 · **Data:** 2026-09-30 · **Estado:** especificado
**Fonte:** §63, §64, §65, §67, §83, §85, §86, §89, §90, §91 do `Master-Prompt.md`

---

## 1. Stack

> **Preferência do `Master-Prompt.md`:** TypeScript · Vite · React · Phaser (§63)

| Camada | Tecnologia | Papel |
|---|---|---|
| Linguagem | **TypeScript** (strict) | Tipagem de todo o domínio |
| Build | **Vite** | Dev server, build, HMR |
| UI/HUD | **React 18+** | Menus, HUD, inventário, formulários |
| Battlefield | **Phaser 3** | Render, sprites, tweens, VFX, partículas |
| Estado | Zustand ou store próprio | Estado de UI, **não** de regra |
| Backend | **Supabase** (Postgres, Auth, Realtime, Edge Functions, RLS) | Autoridade |
| Deploy | **Vercel** | Hosting do cliente |
| Testes | Vitest + Playwright | Unit, integração, E2E |

---

## 2. A regra de fluxo

> **GAME LOGIC → GAME STATE → GAME RENDERING → UI / HUD → PERSISTENCE / API** (§63)

E o inverso é proibido:

> **A lógica do jogo não deve depender de componentes React.** (§63, §105)

Fluxo de dados real:

```text
┌─────────────────────────────────────────────────┐
│  packages/engine        Battle Engine PURO       │
│  (sem React, sem DOM, sem Phaser, sem rede)      │
└────────────────────┬────────────────────────────┘
                     │ BattleEvent[]
                     ▼
┌─────────────────────────────────────────────────┐
│  packages/game-core   Regras, serviços, estado   │
│  (config, loot, xp, economia, progressão)        │
└────────────────────┬────────────────────────────┘
                     │ estado de domínio
        ┌────────────┴────────────┐
        ▼                         ▼
┌────────────────┐    ┌──────────────────────┐
│  Phaser         │    │  React (HUD)         │
│  battlefield    │    │  menus, inventário   │
└────────────────┘    └──────────────────────┘
        │                         │
        └────────┬────────────────┘
                 ▼
      ┌─────────────────────┐
      │  PersistenceService │
      │  LOCAL → SUPABASE   │
      └─────────────────────┘
```

### 2.1 A regra verificável

> *"A lógica do jogo não deve depender de componentes React."* (§63)

Isto é **testável**, não uma intenção:

```ts
// tests/architecture/engine-purity.test.ts
test("engine não depende de React ou DOM", () => {
  const graph = await analyzePackage("packages/engine");
  expect(graph.imports).not.toContain("react");
  expect(graph.imports).not.toContain("react-dom");
  expect(graph.imports).not.toContain("phaser");
  expect(graph.globals).not.toContain("document");
  expect(graph.globals).not.toContain("window");
  expect(graph.globals).not.toContain("setTimeout");
});
```

Violar essa regra quebra o build. É a única forma de a proibição ser respeitada.

---

## 3. Estrutura do monorepo

```text
project-tower/
├── Master-Prompt.md              ← especificação central
├── AI_STATE.md                   ← handoff vivo (§75)
├── README.md
│
├── docs/                         ← esta documentação
│
├── packages/
│   ├── config/                   ← TODO número de balanceamento (§15, §32, §33)
│   │   └── src/
│   │       ├── index.ts
│   │       ├── validate.ts       ← falha alto se config inválida
│   │       ├── account.ts team.ts xp.ts loot.ts
│   │       ├── searching.ts combat.ts economy.ts
│   │       ├── tower.ts heroes.ts inventory.ts performance.ts
│   │       └── __fixtures__/
│   │
│   ├── contracts/                ← tipos compartilhados client/server
│   │   └── src/
│   │       ├── commands.ts       ← intenções do cliente
│   │       ├── events.ts
│   │       ├── entities.ts
│   │       └── errors.ts
│   │
│   ├── engine/                   ← BATTLE ENGINE PURO (§64)
│   │   └── src/
│   │       ├── battle/
│   │       │   ├── simulate.ts   ← TowerBattle | BossBattle
│   │       │   ├── tower.ts
│   │       │   ├── boss.ts
│   │       │   ├── formula.ts    ← dano, crítico, mitigação, IAS
│   │       │   ├── targeting.ts
│   │       │   ├── status.ts
│   │       │   └── types.ts
│   │       ├── rng.ts            ← PRNG com seed (§64 determinismo)
│   │       └── index.ts
│   │
│   ├── game-core/                ← regras de jogo, serviços
│   │   └── src/
│   │       ├── state/            ← store de domínio
│   │       ├── services/
│   │       │   ├── loot.ts xp.ts equipment.ts
│   │       │   ├── inventory.ts market.ts offline.ts
│   │       │   └── persistence/  ← LOCAL | SUPABASE (§83)
│   │       └── loop/             ← game loop, SEARCHING state (ADR-007)
│   │
│   └── ui/                       ← componentes React compartilhados
│
├── apps/
│   ├── game-web/                 ← o jogo (Vercel)
│   │   ├── src/
│   │   │   ├── battle/           ← cenas Phaser
│   │   │   ├── hud/              ← HUD React
│   │   │   ├── screens/          ← telas
│   │   │   ├── i18n/             ← PT-BR
│   │   │   └── main.tsx
│   │   └── public/assets/        ← subset dos sprites
│   │
│   └── admin-web/                ← painel (fase posterior, isolado)
│
├── sprites/                      ← pack de origem (~92 MiB, não vai para o bundle)
├── supabase/                     ← migrations, functions, RLS
├── scripts/                      ← check-docs, validações
└── docs/
```

### 3.1 Regras de dependência

```text
config      → (nada)
contracts   → config
engine      → config, contracts
game-core   → config, contracts, engine
ui          → config, contracts
game-web    → tudo
admin-web   → config, contracts
```

Proibido: `engine → game-core`, `engine → ui`, `config → *`, qualquer `* → admin-web`.

---

## 4. O Battle Engine

Ver [`COMBAT_SYSTEM.md`](COMBAT_SYSTEM.md). Pontos de arquitetura:

### 4.1 Por que puro

```ts
export interface BattleEngine {
  create(mode: "tower" | "boss", setup: BattleSetup, seed: number): BattleState;
  step(state: BattleState, untilTick: number): BattleEvent[];
}
```

Sem `async`, sem `setTimeout`, sem I/O. Consequências:

- Roda em **Node** → teste unitário sem browser.
- Roda em **Web Worker** → sem travar a thread principal no idle.
- Roda no **servidor** → §86 (server authority) sem reescrever a lógica.
- **Determinístico** → mesma seed + mesmo estado = mesmo resultado.

### 4.2 Os dois modos, uma implementação

O §65 exige suportar `TowerBattle` e `BossBattle` **sem duplicar a lógica**. A diferença é a composição inicial:

```ts
function buildSides(mode: "tower" | "boss", setup: BattleSetup) {
  if (mode === "tower") {
    return {
      allies: [setup.activeHero],      // ← exatamente 1 (§17)
      enemies: [setup.enemy],         // ← exatamente 1
    };
  }
  return {
    allies: setup.team,               // ← até 3 (§24)
    enemies: [setup.boss],
  };
}
```

A invariante `allies.length === 1 && enemies.length === 1` para `tower` é **testada**, não apenas documentada.

---

## 5. Persistência

> *"Criar `PersistenceService`. A camada deve permitir trocar LOCAL → SUPABASE sem reescrever todos os sistemas."* (§83)

```ts
interface PersistenceService {
  load(accountId: string): Promise<SaveData | null>;
  save(accountId: string, data: SaveData): Promise<void>;

  /** Save parcial, para não serializar tudo a cada tick. */
  patch(accountId: string, patch: Partial<SaveData>): Promise<void>;

  readonly backend: "local" | "supabase";
  readonly configVersion: number;
}

class LocalPersistenceService implements PersistenceService { /* localStorage + IndexedDB */ }
class SupabasePersistenceService implements PersistenceService { /* Postgres + RLS */ }
```

Nenhum sistema do jogo sabe qual está em uso. Todos recebem a interface.

### 5.1 Migração

```ts
// Detectado no boot
if (localSave && !account.cloudSave) {
  await promptImport(localSave);
}
```

A migração é **transacional** e **idempotente** ([`AUTH_SYSTEM.md` §6](AUTH_SYSTEM.md#6-migração-guest--google)).

### 5.2 O save contém

```ts
interface SaveData {
  schemaVersion: number;
  configVersion: number;

  king: King;
  wallet: Wallet;
  heroes: Hero[];
  team: Team;
  inventory: Inventory;

  tower: { currentFloor: number; bestFloor: number; };

  hunt: HuntState | null;          // inclui SEARCHING (ADR-007)
  offline: OfflineProgress;

  settings: Settings;
  lastSavedAt: number;
}
```

> `configVersion` é o que impede que um rebalanceamento corrompa saves antigos: ao detectar versão diferente, o save é **migrado**, não reinterpretado.

---

## 6. O loop de jogo

O loop é um **scheduler único**, não uma coleção de `setInterval`:

```text
GameLoop
  ├── tick(dtMs)                 ← 1 Hz quando ocioso
  ├── processPendingIntents()    ← fila de ações do jogador
  ├── advanceHuntState()         ← in_battle | rewarding | searching
  ├── accumulateOffline()        ← se lastActiveAt está no passado
  └── scheduleAutosave()         ← debounce 1s
```

O `SEARCHING` é gerenciado aqui, com **timestamp absoluto** (ADR-007), não com `setTimeout` de componente.

---

## 7. Contrato cliente ↔ servidor

> **O cliente envia intenções, nunca resultados.** (§86)

```ts
type GameCommand =
  | { type: "advance_hunt"; requestId: string; expectedRevision: number }
  | { type: "equip_item"; requestId: string; equipmentId: string; heroId: string }
  | { type: "sell_item"; requestId: string; equipmentId: string }
  | { type: "unlock_slot"; requestId: string; slotIndex: number }
  | { type: "create_listing"; requestId: string; equipmentId: string; price: bigint }
  | { type: "buy_listing"; requestId: string; listingId: string }
  | { type: "send_message"; requestId: string; channelId: string; body: string }
  | { type: "claim_nickname"; requestId: string; nickname: string };
```

Note o que **não existe** em nenhum comando: `damage`, `coins`, `rarity`, `x`, `result`, `winner`, `isAdmin`. O cliente **nunca** os envia.

Regras de todo comando:

1. Validar JWT.
2. Validar schema (rejeitar campos desconhecidos).
3. Validar posse e autorização.
4. Validar `expectedRevision`.
5. Executar em transação.
6. Gravar no ledger, se houver valor econômico.
7. Retornar estado **completo** (o cliente não calcula).

Detalhe em [`SECURITY.md`](SECURITY.md).

---

## 8. Online: Supabase + Vercel

### 8.1 Componentes

| Componente | Uso |
|---|---|
| **Supabase Auth** | Google Auth (§7) |
| **PostgreSQL** | Estado autoritativo, RLS |
| **Edge Functions** | API confiável (comandos de jogo, admin) |
| **Realtime** | Chat (§50), notificações |
| **Storage** | Assets e conteúdo publicados |
| **Vercel** | Hospeda `apps/game-web` |

### 8.2 O modelo de batch

Reaproveitando o desenho validado do repositório de referência (ADR-008):

Edge Functions são **endpoints curtos**, não um game server sempre ligado.

```text
Cliente ──► advance_hunt(requestId, expectedRevision)
              ↓
            Servidor executa lote fixo (~5s de simulação)
              ↓
            Persiste cursor + estado + seed
              ↓
            Retorna eventos + novo estado
```

- `GET` **nunca** avança estado.
- Retry com o mesmo `requestId` retorna o **mesmo** resultado.
- Reconexão retoma do cursor — não simula o tempo desconectado no modelo de batch.

> A **política de produto** de offline progress (2h/8h, §48) é resolvida na Fase 11, separada da viabilidade técnica deste modelo.

---

## 9. Deploy

> *"O frontend de produção deve ser preparado para deploy na Vercel."* (§90)

| Item | Configuração |
|---|---|
| Build | `vite build` |
| Output | `dist/` |
| Root Directory | `apps/game-web` |
| Node | 20 LTS |
| Variáveis | `VITE_*` para públicas, secrets no servidor |
| Preview | Por PR |
| Production | Merge em `main` após checks |

### 9.1 Variáveis de ambiente

> **Nunca colocar secrets, service role keys ou tokens privados no código público.** (§91)

```bash
# .env.local — NUNCA commitado
VITE_SUPABASE_URL=            # pública, ok no bundle
VITE_SUPABASE_ANON_KEY=       # pública, ok no bundle (RLS protege)
SUPABASE_SERVICE_ROLE_KEY=    # 🔒 SOMENTE servidor. NUNCA no VITE_.
```

> 🔴 A regra que não pode quebrar: **qualquer variável com prefixo `VITE_` vai para o bundle do navegador.** `SUPABASE_SERVICE_ROLE_KEY` ignora RLS. Usar `VITE_` nela é uma brecha total.

---

## 10. Git

> *"A IA deve: criar branches quando apropriado; fazer commits coerentes; revisar alterações; evitar commits gigantes; manter documentação; manter histórico. Nunca apagar trabalho funcional sem necessidade."* (§89)

- Uma unidade de trabalho por branch.
- Commits pequenos e focados.
- Documentação no **mesmo** commit da decisão que documenta.
- Nada de `force push` em branch com trabalho.

---

## 11. Decisões técnicas (ADR)

Ver [`DECISIONS_LOG.md`](DECISIONS_LOG.md) para o registro completo. Resumo:

| ADR | Decisão |
|---|---|
| 001 | Precedência documental: `Master-Prompt.md` vence a referência |
| 002 | 18 divergências mapeadas e resolvidas |
| 003 | Reis e heróis com XP **separado** (ADR-003) |
| 004 | Reaproveitar o pack de sprites da referência |
| 005 | Monorepo + engine puro + `PersistenceService` |
| 006 | Configuração centralizada como dado validado |
| 007 | `SEARCHING` é estado persistido, não `setTimeout` |
| 008 | Servidor autoritativo desde a fundação |

---

## 12. Checklist de pronto

- [ ] Monorepo com as fronteiras do §3
- [ ] `packages/engine` sem React, Phaser, DOM, `setTimeout` (teste)
- [ ] `packages/config` com `validateConfig()` no boot
- [ ] `PersistenceService` com `Local` e `Supabase`
- [ ] `SaveData` com `schemaVersion` e `configVersion`
- [ ] Game loop único, sem `setInterval` aninhado
- [ ] `SEARCHING` com timestamp absoluto
- [ ] Nenhum `Math.random()` no engine (teste)
- [ ] Tipos de comando **sem** campos de resultado
- [ ] `.env.example` documentado, `.env.local` no `.gitignore`
- [ ] Nenhum `VITE_` em segredo
- [ ] Build Vite funcionando
- [ ] Testes de arquitetura passando

---

## 13. Referências

- [`COMBAT_SYSTEM.md`](COMBAT_SYSTEM.md) — o engine em detalhe
- [`CONFIGURATION.md`](CONFIGURATION.md) — o pacote `config`
- [`SECURITY.md`](SECURITY.md) — o contrato com o servidor
- [`PERFORMANCE.md`](PERFORMANCE.md) — orçamento de render e bundle
- [`TESTING.md`](TESTING.md) — testes de arquitetura
- [`DECISIONS_LOG.md`](DECISIONS_LOG.md) — ADR
