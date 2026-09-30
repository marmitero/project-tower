# Mapa dos Sistemas de Jogo

**Versão:** 0.1 · **Data:** 2026-09-30 · **Estado:** pré-produção

Este documento é o **mapa**. Cada sistema tem um documento próprio com o detalhe; aqui estão as dependências, o estado e a ordem de construção.

---

## 1. Inventário de sistemas

| Sistema | Documento | Fase | Estado |
|---|---|---|---|
| Rei / Conta | [`CHARACTER_SYSTEM.md`](CHARACTER_SYSTEM.md) | 3 | especificado |
| Heróis / Súditos | [`CHARACTER_SYSTEM.md`](CHARACTER_SYSTEM.md) | 4 | **bloqueado** (P-002) |
| Equipe e Slots | [`CHARACTER_SYSTEM.md`](CHARACTER_SYSTEM.md) | 5 | especificado |
| Skills | [`SKILL_SYSTEM.md`](SKILL_SYSTEM.md) | 4 | **bloqueado** (P-002) |
| Combate / Battle Engine | [`COMBAT_SYSTEM.md`](COMBAT_SYSTEM.md) | 6 | especificado |
| Armas | [`WEAPON_SYSTEM.md`](WEAPON_SYSTEM.md) | 9 | especificado (traits) |
| Equipamentos | [`EQUIPMENT_SYSTEM.md`](EQUIPMENT_SYSTEM.md) | 9 | **bloqueado** (P-010) |
| Torre | [`TOWER_SYSTEM.md`](TOWER_SYSTEM.md) | 7 | **bloqueado** (P-005) |
| Loot | [`EQUIPMENT_SYSTEM.md`](EQUIPMENT_SYSTEM.md) | 9 | parcialmente (P-010) |
| Boss | [`BOSS_SYSTEM.md`](BOSS_SYSTEM.md) | 12 | especificado (conteúdo P-005) |
| Inventário | [`INVENTORY_SYSTEM.md`](INVENTORY_SYSTEM.md) | 9 | parcialmente (P-016) |
| Economia | [`ECONOMY_SYSTEM.md`](ECONOMY_SYSTEM.md) | 10 | **bloqueado** (P-008) |
| Automação / Idle | [`AUTOMATION_SYSTEM.md`](AUTOMATION_SYSTEM.md) | 8 | especificado |
| Offline Progress | [`AUTOMATION_SYSTEM.md`](AUTOMATION_SYSTEM.md) | 11 | **bloqueado** (P-011) |
| Auth | [`AUTH_SYSTEM.md`](AUTH_SYSTEM.md) | Online | especificado |
| Chat | [`CHAT_SYSTEM.md`](CHAT_SYSTEM.md) | Online | especificado |
| Social / Guildas | [`SOCIAL_SYSTEM.md`](SOCIAL_SYSTEM.md) | Social | especificado |
| Mercado | [`MARKET_SYSTEM.md`](MARKET_SYSTEM.md) | Market | parcialmente (P-014) |
| MMO (visão agregada) | [`MMO_SYSTEMS.md`](MMO_SYSTEMS.md) | Social | especificado |
| Configuração | [`CONFIGURATION.md`](CONFIGURATION.md) | 2 | baseline criado |
| Arquitetura | [`ARCHITECTURE.md`](ARCHITECTURE.md) | 2 | especificado |
| UI / UX | [`UI_UX.md`](UI_UX.md) | 2 | especificado |
| Arte | [`ART_GUIDELINES.md`](ART_GUIDELINES.md) | 2 | especificado |
| Assets | [`ASSET_INVENTORY.md`](ASSET_INVENTORY.md) | 2 | inventariado |
| Áudio | [`AUDIO_GUIDELINES.md`](AUDIO_GUIDELINES.md) | Polish | esboço |
| Segurança | [`SECURITY.md`](SECURITY.md) | Online | especificado |
| Performance | [`PERFORMANCE.md`](PERFORMANCE.md) | 2 | especificado |
| Testes | [`TESTING.md`](TESTING.md) | 2 | especificado |
| Debug Mode | [`TESTING.md`](TESTING.md#7-debug-mode) | 2 | especificado |

---

## 2. Mapa de dependências

```text
                        ┌──────────────┐
                        │  CONFIGURAÇÃO│  ← todo número vive aqui
                        └──────┬───────┘
                               │ (todos leem)
   ┌───────────┬───────────┬───┴────┬──────────┬──────────┬─────────┐
   ▼           ▼           ▼        ▼          ▼          ▼         ▼
┌────────┐ ┌────────┐ ┌─────────┐ ┌──────┐ ┌─────────┐ ┌──────┐ ┌──────┐
│  REI   │ │ HERÓI  │ │ EQUIPE  │ │ARMA/ │ │ EQUIP.  │ │ LOOT │ │ECON. │
│conta   │ │súdito  │ │ slots   │ │ ITEM │ │ 10 slots│ │ 5%   │ │coin  │
└───┬────┘ └───┬────┘ └────┬────┘ └──┬───┘ └────┬────┘ └──┬───┘ └──┬───┘
    │          │           │         │           │         │        │
    │          └───────────┴─────────┴───────────┘         │        │
    │                          │                           │        │
    │                          ▼                           │        │
    │                  ┌───────────────┐                   │        │
    │                  │ COMBAT ENGINE │◄──────────────────┘        │
    │                  │  (puro, sem   │◄───────────────────────────┘
    │                  │   React/DOM)  │
    │                  └───────┬───────┘
    │                          │ eventos
    │        ┌─────────────────┼─────────────────┐
    │        ▼                 ▼                 ▼
    │  ┌──────────┐     ┌───────────┐     ┌───────────┐
    │  │ RENDERER │     │  XP / LVL │     │  LOG/UI   │
    │  │ (Phaser) │     │ Rei+Herói │     │  HUD      │
    │  └──────────┘     └───────────┘     └───────────┘
    │
    ├──► ┌──────────┐   ┌────────────┐   ┌──────────┐
    │    │  TORRE   │   │   BOSS     │   │AUTOMAÇÃO │
    │    │ 1×1      │   │ equipe × 1 │   │ idle/off │
    │    └──────────┘   └────────────┘   └──────────┘
    │
    └──► ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌─────────┐
         │ INVENT.  │   │  MERCADO │   │  CHAT    │   │ SOCIAL  │
         └──────────┘   └──────────┘   └──────────┘   └─────────┘
```

**Três invariantes de arquitetura** que valem para o grafo inteiro:

1. **Sentido de fluxo é sempre para cima.** A UI envia *intenção*; a regra decide; o renderer apresenta. Nenhum sistema lê o estado de outro sistema "por cima" — todos passam pelo estado central.
2. **`packages/engine` não importa nada de UI.** Testável em Node puro. Verificável por teste (§64, ADR-005).
3. **A Configuração é folha.** Nenhum sistema escreve nela. Todo balanceamento é um commit de dados, não de código.

---

## 3. O fluxo de runtime

```text
 ┌─ BOOT ────────────────────────────────────────────────┐
 │  carregar config → validar config → carregar save     │
 │  → reidratar derives → retomar estado de hunt          │
 └───────────────────────────────────────────────────────┘
                           │
                           ▼
 ┌─ GAME LOOP (coração do jogo) ──────────────────────────┐
 │                                                        │
 │   ┌──────────────┐                                     │
 │   │ IDLE         │  jogador navega menus, configura,   │
 │   │ (menus)      │  compara loot. Loop continua.      │
 │   └──────┬───────┘                                     │
 │          │ jogador entra na Torre                       │
 │          ▼                                             │
 │   ┌──────────────┐   simula até um dos lados cair      │
 │   │ IN_BATTLE    │   (TowerBattle: 1×1)                │
 │   │ (1×1)        │                                     │
 │   └──────┬───────┘                                     │
 │          │ vitória                                     │
 │          ▼                                             │
 │   ┌──────────────┐                                     │
 │   │ REWARDING    │  XP Rei, XP herói (÷ equipe),      │
 │   │              │  Coin, 5%? equipamento              │
 │   └──────┬───────┘                                     │
 │          ▼                                             │
 │   ┌──────────────┐   ~3s, animação, NÃO pausa          │
 │   │ SEARCHING    │   ao navegar menus                  │
 │   └──────┬───────┘                                     │
 │          │ próximo inimigo                              │
 │          └──────────────► volta a IN_BATTLE            │
 │                                                        │
 └────────────────────────────────────────────────────────┘
          │                    │                   │
          ▼                    ▼                   ▼
   ┌────────────┐      ┌────────────┐      ┌────────────┐
   │ PERSISTÊNCIA│      │  RENDERER  │      │  HUD/UI    │
   │ save local  │      │  (Phaser)  │      │  (React)   │
   └────────────┘      └────────────┘      └────────────┘
```

> **Nota de arquitetura:** o estado `SEARCHING` é do **game loop**, não de um componente (§27, ADR-007). É por isso que abrir o inventário não o interrompe, e é por isso que o offline progress reaproveita a mesma máquina de estados.

---

## 4. Modos de batalha

O Battle Engine suporta dois modos com o **mesmo código**, distinguished por composição inicial — não por implementação separada (§65).

| | `TowerBattle` | `BossBattle` |
|---|---|---|
| Time do jogador | **1 herói** (o ativo) | **Equipe completa** (até 3) |
| Time inimigo | **1 inimigo** | **1 Boss** |
| Ações simultâneas | 1×1 | N×1 |
| Fase | 6 | 12 |
| Fonte de fragmentos | ❌ **nunca** (§12) | ✅ fonte principal (§54) |
| Local | Andar da Torre | Boss Arena / Dungeon / World / Guilda / Evento |

O erro mais caro que este projeto pode cometer é deixar um `TowerBattle` degenerar em equipe completa. Por isso o §79 do `Master-Prompt.md` exige um teste dedicado, e [`TESTING.md`](TESTING.md) define-o como gate de release.

---

## 5. Ordem de construção

Derivada do §96 e §122, com as correções de dependência que a inspeção revelou:

```text
FASE 0  ✅ Inspeção (repo, assets, docs, gaps)
FASE 1  ✅ Documentação (este conjunto + AI_STATE)          ← ESTAMOS AQUI
FASE 2  ⬜ Fundação
            ├── packages/config         (nenhum hardcode)
            ├── packages/engine         (Battle Engine puro)
            ├── packages/contracts      (tipos compartilhados)
            ├── apps/game-web           (shell Vite+React+Phaser)
            ├── PersistenceService      (LOCAL → SUPABASE)
            ├── Asset pipeline          (subset de sprites/)
            └── Debug Mode
FASE 3  ⬜ Rei
FASE 4  ⬜ Personagens        ⛔ bloqueado por P-002
FASE 5  ⬜ Equipe
FASE 6  ⬜ Combate 1×1
FASE 7  ⬜ Torre              ⛔ bloqueado por P-005
FASE 8  ⬜ Searching loop
FASE 9  ⬜ Equipamentos       ⛔ bloqueado por P-010
FASE 10 ⬜ Economia            ⛔ bloqueado por P-008
FASE 11 ⬜ Offline             ⛔ bloqueado por P-011
FASE 12 ⬜ Boss
FASE 13 ⬜ MVP LOCAL (vertical slice)
```

**Sobre os bloqueios.** Cinco pendências Tipo C separam a documentação da implementação. Elas não são "detalhes a resolver no meio do código" — o §73 é explícito: *"Não inventar. Registrar PENDING e, quando necessário, solicitar decisão humana."*

A boa notícia é que **nenhuma delas bloqueia a Fase 2**. A fundação — config, engine, persistência, pipeline, shell — pode e deve ser construída agora com placeholders tipados, porque a estrutura é a mesma qualquer que seja o número final.

---

## 6. Regras que atravessam todos os sistemas

Estas são as invariantes do projeto. Violar qualquer uma quebra a identidade do jogo.

| # | Regra | Seção MP | Teste |
|---|---|---|---|
| 1 | Torre é **sempre** 1×1 | §17 | `tower-battle-size.test.ts` |
| 2 | Torre **nunca** tem boss em andar fixo | §21, §55 | `no-tower-boss.test.ts` |
| 3 | XP do Rei ≠ XP do herói | §45 | `xp-pools.test.ts` |
| 4 | XP é **dividido** entre a equipe | §20, §81 | `team-xp-split.test.ts` |
| 5 | Fragmentos **nunca** dropam de inimigo comum | §12 | `fragment-source.test.ts` |
| 6 | X é **independente por atributo** | §36 | `x-independence.test.ts` |
| 7 | Drop de equipamento é **5%** | §32 | `loot-distribution.test.ts` |
| 8 | `SEARCHING` dura ~3s e **não pausa** ao navegar | §27, §29 | `searching-state.test.ts` |
| 9 | Offline Free **2h**, VIP **8h** | §48 | `offline-cap.test.ts` |
| 10 | Mercado cobra **15%**, consumido pelo servidor | §41 | `market-tax.test.ts` |
| 11 | Heróis são **ilimitados** | §13 | `hero-limit.test.ts` |
| 12 | 1 conta = **1 Rei** | §8 | `one-king.test.ts` |
| 13 | Engine **não importa React** | §63, §64 | `engine-purity.test.ts` |
| 14 | Probabilidades somam **100%** | §32, §33 | `config-validation.test.ts` |
| 15 | Lógica **não vive** em componentes React | §63, §105 | `engine-purity.test.ts` |
