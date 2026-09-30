# Tower Idle Adventure

> **2D Idle RPG · Auto-Battle · Loot RPG · Tower Progression · Collection RPG · MMORPG assíncrono**

Um RPG idle de navegador onde **você é o Rei**. Escolhe seus campeões, decide quem entra na Torre, gerencia o inventário e deixa o reino continuar progredindo enquanto você administra.

---

## Estado do projeto

```text
FASE 0 · Inspeção     ✅ concluída
FASE 1 · Documentação ✅ concluída   ← estamos aqui
FASE 2 · Fundação    ⬜ próximo passo
```

**Nenhum gameplay foi implementado.** O repositório contém a especificação e o conjunto completo de documentação de design e arquitetura.

| | |
|---|---|
| Documentos de especificação | [`Master-Prompt.md`](Master-Prompt.md) — 125 seções, fonte de autoridade |
| Documentação | [`docs/`](docs/README.md) — 30 documentos (+ este README e o `AI_STATE.md`) |
| Handoff | [`AI_STATE.md`](AI_STATE.md) — **leia primeiro** |
| Assets disponíveis | **422 sprites** de um pack profissional, prontos para uso |
| Pendências | 7 críticas, 67 no total — ver [`docs/PENDING_RULES.md`](docs/PENDING_RULES.md) |

---

## A fantasia

> "Eu sou o Rei. Eu escolho meus campeões, fortaleço meu reino, equipei meus súditos, decido quem enviará para a Torre e construo uma equipe cada vez mais poderosa."

O Rei **não combate**. Ele administra. Toda a agência dele é indireta: tudo o que faz, faz escolhendo *quem*, *com o quê* e *contra quem*.

---

## As cinco regras que definem este jogo

Cinco decisões estruturam todo o resto. Elas não são preferências — são invariantes com teste automatizado obrigatório.

### 1. A Torre é sempre 1×1

```text
1 herói  ×  1 inimigo
```

**Nunca** 3×1, 2×1 ou 3×3. A equipe é uma ferramenta de **portfólio**, não um multiplicador de poder.

### 2. A Torre não tem Boss

A regra *"andar 10 = boss, andar 20 = boss"* está **explicitamente abolida**. Boss é uma atividade separada, onde **toda a equipe luta**.

```text
Torre:   1 herói  ×  1 inimigo
Boss:    Equipe   ×  1 Boss
```

### 3. O XP é dividido

Levar mais heróis à equipe dá **flexibilidade** e tira **profundidade**:

| Time | XP por herói |
|---|---|
| 1 herói | 100% |
| 2 heróis | 50% cada |
| 3 heróis | 33,3% cada |

É esse o trade-off central: **largura vs. profundidade**.

### 4. Equipamento é raro e pode ser ruim

**5%** dos inimigos dropam equipamento. Dentro dos drops, a raridade mais comum é 50% e a mais rara é 0,1%. E um Legendary pode ter rolls ruins — o que cria os **god rolls**, os itens realmente valiosos.

Cada atributo tem seu **próprio X**, gerado independentemente.

### 5. Fragmentos nunca vêm de inimigo comum

Se um herói pode ser montado com fragmentos de slime, a coleção vira ruído. **Boss é a fonte principal** — e essa é a razão de a atividade ser especial.

---

## O loop

```text
CRIAR REI (nome + skin)
      ↓
ESCOLHER 1 DOS 4 HERÓIS
      ↓
MONTAR EQUIPE   (1 slot → 2 no nível 10 → 3 no nível 25)
      ↓
ESCOLHER ANDAR · ESCOLHER HERÓI
      ↓
┌────────────────────────────────────┐
│  BATALHA 1×1 — automática          │
└────────────────────────────────────┘
      ↓
XP DO REI + XP DOS HERÓIS + COIN + (5%? equipamento)
      ↓
PROCURANDO...  ~3s  com animação
      ↓
NOVO INIMIGO → REPETE
```

Você configura, decide, observa. **Nunca** clica para atacar.

---

## Documentação

### Comece por aqui

| Documento | O que é |
|---|---|
| **[`AI_STATE.md`](AI_STATE.md)** | **Handoff vivo.** Estado atual, decisões, pendências, próximo passo |
| [`docs/GDD.md`](docs/GDD.md) | Visão, pilares, fantasia central, escopo |
| [`docs/GAME_SYSTEMS.md`](docs/GAME_SYSTEMS.md) | Mapa de todos os sistemas e suas dependências |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Fases, gates e entregáveis |
| [`docs/PENDING_RULES.md`](docs/PENDING_RULES.md) | As 67 decisões que **não podem ser inventadas** |
| [`docs/DECISIONS_LOG.md`](docs/DECISIONS_LOG.md) | ADR e as 18 divergências resolvidas |

### Índice completo

| | Sistemas | | Plataforma |
|---|---|---|---|
| | [`CHARACTER_SYSTEM`](docs/CHARACTER_SYSTEM.md) — Rei e heróis | | [`ARCHITECTURE`](docs/ARCHITECTURE.md) |
| | [`SKILL_SYSTEM`](docs/SKILL_SYSTEM.md) | | [`CONFIGURATION`](docs/CONFIGURATION.md) |
| | [`COMBAT_SYSTEM`](docs/COMBAT_SYSTEM.md) | | [`UI_UX`](docs/UI_UX.md) |
| | [`WEAPON_SYSTEM`](docs/WEAPON_SYSTEM.md) | | [`ART_GUIDELINES`](docs/ART_GUIDELINES.md) |
| | [`EQUIPMENT_SYSTEM`](docs/EQUIPMENT_SYSTEM.md) | | [`ASSET_INVENTORY`](docs/ASSET_INVENTORY.md) |
| | [`TOWER_SYSTEM`](docs/TOWER_SYSTEM.md) | | [`AUDIO_GUIDELINES`](docs/AUDIO_GUIDELINES.md) |
| | [`BOSS_SYSTEM`](docs/BOSS_SYSTEM.md) | | [`SECURITY`](docs/SECURITY.md) |
| | [`INVENTORY_SYSTEM`](docs/INVENTORY_SYSTEM.md) | | [`PERFORMANCE`](docs/PERFORMANCE.md) |
| | [`AUTOMATION_SYSTEM`](docs/AUTOMATION_SYSTEM.md) | | [`TESTING`](docs/TESTING.md) |
| | [`ECONOMY_SYSTEM`](docs/ECONOMY_SYSTEM.md) | | |
| | [`AUTH_SYSTEM`](docs/AUTH_SYSTEM.md) | | **Online** |
| | [`CHAT_SYSTEM`](docs/CHAT_SYSTEM.md) | | [`MARKET_SYSTEM`](docs/MARKET_SYSTEM.md) |
| | [`SOCIAL_SYSTEM`](docs/SOCIAL_SYSTEM.md) | | [`MMO_SYSTEMS`](docs/MMO_SYSTEMS.md) |

---

## Stack

```text
TypeScript · Vite · React · Phaser
Supabase (Auth · Postgres · RLS · Realtime · Edge Functions)
Vercel
```

**Monorepo:** `packages/engine` (Battle Engine puro, sem React), `packages/config` (todo número de balanceamento), `packages/contracts`, `apps/game-web`, `apps/admin-web`.

> A regra que estrutura tudo: **a lógica do jogo não depende de componentes React** — e isso é verificado por teste, não por intenção.

---

## Assets

O projeto **não precisa criar nenhum asset novo** para a vertical slice.

| | |
|---|---|
| Pack | Fantasy Dungeon — Nika Studio, v1.4 |
| Conteúdo | **422 PNG** — 108 sheets de personagem, 224 ícones, 65 tiles, 7 VFX, 8 retratos, 8 skins |
| Licença | MIT, **com crédito obrigatório** |
| Origem | [nikastudio.itch.io](https://nikastudio.itch.io/fantasy-dungeon-top-down-pixel-rpg-asset-pack-unity-6-urp) |

Inventário completo, mapeamento e licenças em [`docs/ASSET_INVENTORY.md`](docs/ASSET_INVENTORY.md).

---

## O que está bloqueado

Sete decisões de produto impedem a implementação de partes do jogo. Elas **não** foram inventadas — o `Master-Prompt.md` §73 proíbe explicitamente, e inventar um valor de economia é pior que deixar ausente.

| ID | Pendência | Bloqueia |
|---|---|---|
| 🔴 **P-002** | Definição dos 4 heróis | Fase 4 → vertical slice |
| 🔴 **P-005** | Estrutura e curva da Torre | Fase 7 |
| 🔴 **P-006** | Inimigos: stats e papéis | Fase 7 |
| 🔴 **P-008** | Valores de Coin | Fase 10 |
| 🔴 **P-010** | Faixa do X por atributo | Fase 9 |
| 🔴 **P-011** | Taxa de conversão offline | Fase 11 |
| 🔴 **P-036** | Sumidouros de Coin | Fase 10 |

> **A Fase 2 (fundação) não depende de nenhuma delas** e pode começar agora.

Detalhes, material de apoio e processo de resolução em [`docs/PENDING_RULES.md`](docs/PENDING_RULES.md).

---

## Verificação da documentação

```bash
node scripts/check-docs.mjs
```

Valida ausência de corrupção de encoding, índice completo, links relativos válidos e rastreabilidade de todas as pendências.

---

## Licença

Código do projeto sob licença a definir. Assets de terceiros sob os termos de Nika Studio — ver [`docs/ASSET_INVENTORY.md` §2](docs/ASSET_INVENTORY.md#2-origem-e-licença).
