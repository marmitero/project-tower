# Roadmap

**Tower Idle Adventure**
**Versão:** 0.2 · **Data:** 2026-10-03 · **Estado:** FASE 7 (Torre) concluída — 3 de 7 etapas até o MVP
**Fonte:** §96–§104 do `Master-Prompt.md`

---

## 1. Onde estamos

```text
FASE 0  ✅ Inspeção
FASE 1  ✅ Documentação
FASE 2  ✅ Fundação
FASE 3  ✅ Rei                      ← CONCLUÍDA (gate batido)
FASE 4  ✅ Personagens              ← CONCLUÍDA (gate batido, ADR-016)
FASE 5  ✅ Equipe                   ← CONCLUÍDA (gate batido, ADR-017)
FASE 6  ✅ Combate                  ← CONCLUÍDA (gate batido, ADR-020)
FASE 7  ✅ Torre                    ← CONCLUÍDA (gate batido, ADR-021/022)
FASE 8  ✅ Searching loop           ← CONCLUÍDA (gate batido, ADR-017)
FASE 9  ✅ Equipamentos        ← CONCLUÍDA (gate batido, ADR-023/024)
FASE 10 ✅ Economia (Market)  ← CONCLUÍDA (ADR-025; preços provisórios P-008/P-036)
FASE 11 ✅ Offline           ← CONCLUÍDA (ADR-026; simulação do online)
FASE 12 ✅ Boss              ← CONCLUÍDA (ADR-027; chefes 100% dado, números provisórios)
FASE 13 ✅ MVP LOCAL        ← CONCLUÍDA (ADR-028; MVP local jogável — `docs/MVP_ACCEPTANCE.md`)
  ↳ pós-13 ✅ Batalha visível: arena, caminhada, VFX, correção da tela preta (ADR-029)
  ↳ pós-13 ✅ Rebalanceamento: ataque ≈ 2 s, desgaste/poções, IAS por nível de item (ADR-030)
FASE 14 ⬜ Painel Admin      (pós-MVP — docs/ADMIN_PANEL.md, ADR-022)
Online ⬜ → Social ⬜ → Market ⬜ → PvP ⬜ → Monetização ⬜ → Polish ⬜ → Beta ⬜ → Lançamento
```

Implementado até aqui (inclui a FASE 9 — equipamento/loot/inventário, ADR-023/024): especificação, documentação, fundação tipada (contratos,
config, engine, game-core, persistência, HUD base), FASE 3 (criação do Rei),
FASE 4 (escolha de herói §10 + códice + XP/níveis) e FASES 5+8 (equipe/slots,
XP dividido, loop de searching ~3s com UI), FASE 6 (combate visual, HP
persistente) e FASE 7 (Torre de 40 andares, 11 inimigos por papel, teto de nível
20.000). O loop idle já roda de ponta a ponta (batalha → procura → batalha) com
XP desacelerando por andar; loot/equipamento/inventário/venda **sim** (Fase 9); Market, Bot, Hub e offline (Fases 10/11) e a **Arena dos Chefes** (Fase 12) também; a **Fase 13** fechou o MVP local (Debug Mode, Opções/save seguro, guia, estabilidade, `JOGAR.bat`). **Próximo: Fase 14 (Painel Admin) e a Fase Online.**

### Estimativa até o 1º MVP jogável (FASE 13) — 7 etapas

Estimativa de trabalho (2026-10-01), ajustável; cada etapa = um ciclo completo
(documentação → implementação → testes → commit/push):

| Etapa | Fases | O que entra | Gate de decisão |
|---|---|---|---|
| 1 ✅ | FASE 5 + 8 | Equipe/slots (2=nv10+50k, 3=nv25+250k), XP dividido 1/n, searching ~3s, loop idle | decidido em ADR-017 (P-003/P-004/P-012/P-019/P-020b) |
| 2 ✅ | FASE 6 | Combate visual de verdade: BattleScene animada, skills, números/feedback, SFX | decidido em ADR-020 (P-019/P-020) |
| 3 ✅ | FASE 7 | Torre: 40 andares por faixa de nível, inimigos por papel, curvas de XP, `ContentPack` admin-ready | decidido em ADR-021/022 (P-005/P-006/P-009) |
| 4 ✅ | FASE 9 | Loot → equipamento → raridade → X → inventário/venda; heróis adquiridos balanceados | decidido em ADR-023/024 (P-010/P-016/P-023/P-024/P-025/P-033) |
| 5 ✅ | FASE 10 + 11 | Market (poções/revives/caixas), Bot, Hub e offline como simulação do online (Free 2 h) | decidido em ADR-025/026 (P-008/P-036 provisórias; P-011/P-011a resolvidas) |
| 6 ✅ | FASE 12 | Boss como atividade separada: 8 chefes data-driven (fases, resistências, tentativas, fragmentos), Arena na UI | decidido em ADR-027 (P-017/P-018/P-021/P-029/P-062 provisórias) |
| 7 ✅ | FASE 13 | MVP Local: Debug Mode, save local seguro (exportar/importar/apagar com backup), Opções, guia “Próximo passo”, ErrorBoundary, jornada §118 e soak em teste, caminho Windows sem instalação (`JOGAR.bat`) | decidido em ADR-028 |

Riscos de prazo: P-008/P-036 são decisões SUAS (bloqueiam a etapa 5). A etapa 4
resolveu o R-02 (equipamento escala pelo stat de referência do nível) e o mediu
em [`BALANCE_REPORT.md`](BALANCE_REPORT.md).

### Regra de arquitetura para as etapas 4–7: conteúdo "Admin-Ready" (AR)

Por decisão do usuário (2026-10-03), um **painel administrativo** (FASE 14,
pós-MVP, [`ADMIN_PANEL.md`](ADMIN_PANEL.md)) permitirá editar/adicionar/remover
inimigos, bosses, heróis e itens **sem código e sem IA**. Para que isso se
aplique diretamente no jogo, **todo conteúdo novo das fases 9–12** (equipamentos,
loot, bosses, preços, offline) deve ser: (1) **dado puro serializável**
(JSON), (2) **validável** por função pura (`validate*`), (3) **entrar no
`ContentPack`** (`exportContentPack`/`applyContentPack`), (4) lido do `config`
em tempo de execução — nunca constante no código da lógica — e (5) coberto por
um teste de round-trip export → validate → apply. A FASE 7 já entrega o
mecanismo (ADR-022).

---

## 2. O que foi entregue até aqui

### FASE 0 — Inspeção ✅

| Item | Resultado |
|---|---|
| Repositório analisado | Apenas `Master-Prompt.md` — projeto greenfield |
| Assets inspecionados | **450 arquivos** no repositório de referência |
| Recursos aproveitáveis | **422 PNGs** de qualidade profissional (Nika Studio, MIT) |
| Documentação de referência analisada | 14 documentos, ~2.000 linhas |
| Gaps identificados | 18 divergências + 67 pendências |

**Achado mais importante:** o repositório de referência implementa um jogo com **regras diferentes**. Resolvido em [`DECISIONS_LOG.md`](DECISIONS_LOG.md) ADR-002.

**Segundo achado:** existem **422 sprites** prontos. Nenhum asset novo é necessário para a vertical slice. Ver [`ASSET_INVENTORY.md`](ASSET_INVENTORY.md).

### FASE 1 — Documentação ✅

| Entregável | Documento |
|---|---|
| GDD | [`GDD.md`](GDD.md) |
| Arquitetura | [`ARCHITECTURE.md`](ARCHITECTURE.md) |
| Sistemas de jogo | [`GAME_SYSTEMS.md`](GAME_SYSTEMS.md) |
| Combate | [`COMBAT_SYSTEM.md`](COMBAT_SYSTEM.md) |
| Personagens | [`CHARACTER_SYSTEM.md`](CHARACTER_SYSTEM.md) |
| Skills | [`SKILL_SYSTEM.md`](SKILL_SYSTEM.md) |
| Armas | [`WEAPON_SYSTEM.md`](WEAPON_SYSTEM.md) |
| Equipamentos | [`EQUIPMENT_SYSTEM.md`](EQUIPMENT_SYSTEM.md) |
| Torre | [`TOWER_SYSTEM.md`](TOWER_SYSTEM.md) |
| Boss | [`BOSS_SYSTEM.md`](BOSS_SYSTEM.md) |
| Inventário | [`INVENTORY_SYSTEM.md`](INVENTORY_SYSTEM.md) |
| Automação | [`AUTOMATION_SYSTEM.md`](AUTOMATION_SYSTEM.md) |
| Economia | [`ECONOMY_SYSTEM.md`](ECONOMY_SYSTEM.md) |
| Chat | [`CHAT_SYSTEM.md`](CHAT_SYSTEM.md) |
| Social | [`SOCIAL_SYSTEM.md`](SOCIAL_SYSTEM.md) |
| Mercado | [`MARKET_SYSTEM.md`](MARKET_SYSTEM.md) |
| Auth | [`AUTH_SYSTEM.md`](AUTH_SYSTEM.md) |
| MMO | [`MMO_SYSTEMS.md`](MMO_SYSTEMS.md) |
| UI/UX | [`UI_UX.md`](UI_UX.md) |
| Arte | [`ART_GUIDELINES.md`](ART_GUIDELINES.md) |
| Inventário de assets | [`ASSET_INVENTORY.md`](ASSET_INVENTORY.md) |
| Áudio | [`AUDIO_GUIDELINES.md`](AUDIO_GUIDELINES.md) |
| Segurança | [`SECURITY.md`](SECURITY.md) |
| Performance | [`PERFORMANCE.md`](PERFORMANCE.md) |
| Testes | [`TESTING.md`](TESTING.md) |
| Roadmap | este documento |
| Pendências | [`PENDING_RULES.md`](PENDING_RULES.md) |
| Decisões | [`DECISIONS_LOG.md`](DECISIONS_LOG.md) |
| Configuração | [`CONFIGURATION.md`](CONFIGURATION.md) |
| Handoff | [`../AI_STATE.md`](../AI_STATE.md) |
| Validador | `scripts/check-docs.mjs` |

---

## 3. FASE 2 — Fundação ✅

**Objetivo:** a estrutura sobre a qual tudo o mais será construído, sem depender de nenhum número de gameplay ainda indefinido.

### 3.1 Entregáveis

| # | Entregável | Bloqueado por PEND? |
|---|---|---|
| 1 | Monorepo (`apps/`, `packages/`) | ❌ não |
| 2 | `packages/config` + `validateConfig()` | ❌ não |
| 3 | `packages/contracts` (tipos de comando/evento) | ❌ não |
| 4 | `packages/engine` — Battle Engine puro | ❌ não |
| 5 | `apps/game-web` — shell Vite + React + Phaser | ❌ não |
| 6 | `PersistenceService` (Local + stub Supabase) | ❌ não |
| 7 | Asset pipeline + subset de sprites | ❌ não |
| 8 | Debug Mode (§77) | ❌ não |
| 9 | Testes de arquitetura e de config | ❌ não |
| 10 | CI (build, test, check-docs, check-config) | ❌ não |

### 3.2 Como a FASE 2 lida com as pendências

Este é o ponto crucial do roadmap. As pendências Tipo C **não bloqueiam a fundação**, e a estratégia é explícita:

```ts
// packages/config/src/loot.ts
export const loot: LootConfig = {
  equipmentChance: 0.05,           // ✅ §32 — definido
  rarity: {
    common: 0.50,                 // ✅ §33 — definido
    uncommon: 0.30,               // ✅
    rare: 0.15,                   // ✅
    epic: 0.04,                   // ✅
    legendary: 0.009,             // ✅
    celestial: 0.001,             // ✅
  },
  xRange: { min: 1, max: 50 },    // ⛔ P-010 — provisório, marked
  fragmentsFromCommonEnemies: false, // ✅ §12 — proibido
};
```

Cada valor pendente:

1. **Tem tipo e placeholder explícito.**
2. **Está marcado com o ID da pendência** num comentário.
3. **É substituível em um único arquivo** quando aprovado.
4. **Tem teste de validação** que falha se ficar inconsistente.

> Rebalancear o jogo é editar **dados**, não código. A FASE 2 é o que torna isso verdade.

### 3.3 Gate de saída

- [ ] `packages/engine` sem React, Phaser, DOM, `setTimeout`, `Math.random` (teste)
- [ ] `TowerBattle` resolve 1×1 e `BossBattle` resolve N×1 (teste)
- [ ] `validateConfig()` roda no boot e falha alto
- [ ] `PersistenceService` com duas implementações
- [ ] Build Vite passa
- [ ] Subset de sprites no `public/assets/` (< 8 MB)
- [ ] Debug Mode presente em dev, **ausente** do bundle de produção
- [ ] `check-docs` e `check-config` no CI, passando

---

## 4. FASE 3 — Rei ✅

Criação do Rei, nickname, skin, perfil, nível da conta.

**Depende:** estrutura da FASE 2.
**Bloqueia:** nada.

| # | Entregável | PEND | Estado |
|---|---|---|---|
| 1 | Fluxo de criação (nome + skin) | `P-006` (skins iniciais) | ✅ `CreationScreen` + `createGame` |
| 2 | Normalização e validação de nickname | `P-007` | ✅ `game-core/nickname.ts` |
| 3 | Retrato do Rei na HUD e no perfil | — | ✅ `portraits/hero` |
| 4 | XP do Rei e curva de nível | `P-009` | ✅ `xp.king.requiredPerLevel` |
| 5 | Regra de 1 conta = 1 Rei (§8) | — | ✅ `SaveData.king` único |
| 6 | `lastActiveAt` (§47) | — | ✅ `markActive()` |

**Gate:** um jogador cria seu Rei, tem nome único e vê nível, skin e retrato. ✅
(coberto por `tests/integration/creation-flow.test.ts`)

**Como ficou:**

- Sem save não existe Rei: `boot()` devolve `state: null` e a UI abre a
  criação. Sem placeholder de "Rei" — §62.
- Nome: normalização (trim/NFC) + validação em game-core, com códigos de
  erro (`empty|too_short|too_long|invalid_chars|reserved`) e mensagens PT-BR.
  Regra configurável em `config.account.nickname` (⛔ `P-007` provisório).
  Unicidade de nome é decidida pelo servidor quando houver online.
- Skin: catálogo em `config.account.king.skins` (⛔ `P-006c` provisório),
  `changeSkin` cosmético com regra de desbloqueio por nível; `SkinLockedError`
  para skin desconhecida/bloqueada.
- Retrato (`portraits/hero`) é o busto do Rei na HUD/perfil; a skin muda o
  corpo (`hero_skins/<id>`). Asset IDs vêm do manifesto — o jogo não monta
  caminhos (§62).
- Correções estruturais: o relógio do estado ficou vivo (`createNew` recebe o
  clock do app — sem isso o `tickSearch` nunca completava) e `boot` ganhou
  `createGame` + `saveNow()` (um F5 nunca perde o Rei).

---

## 5. FASE 4 — Personagens

4 heróis iniciais, escolha de 1, atributos, XP de herói, níveis, skills.

> ⛔ A identidade **definitiva** dos heróis depende de `P-002` (decisão de
> produto). **2026-10-01:** o usuário aprovou a **inserção genérica** — o
> catálogo entrou como dado remodelável (`packages/config/src/catalog.ts`,
> ADR-013): 4 heróis com papéis e perfis de atributo distintos (§10),
> físico × mágico coberto (§18), assets por ID do manifesto (retrato + 6
> folhas de animação) e validação cruzada config × manifesto no CI.
>
> **2026-10-01 (2ª rodada):** o usuário indicou o **OpenRpg** como base de
> classes/status/itens/skills (ADR-014,
> [`OPENRPG_REFERENCE.md`](OPENRPG_REFERENCE.md)): atributos STR/DEX/CON/INT/
> WIS/CHA como identidade (growth derivado por fórmulas citáveis) e roster de
> 12 skills baseado nas abilities do OpenRpg.
>
> **2026-10-01 (3ª rodada):** **P-002 RESOLVIDA** por delegação do usuário
> (ADR-015): identidades definitivas — **Aldric** (Guardião/Common), **Kaia**
> (Arqueira/Uncommon), **Maelis** (Arcanista/Rare), **Vorath**
> (Invocador/Epic) — com lore, personalidade, voz, estilo, `statPriority` e
> aquisição futura, em `packages/config/src/heroes.ts`.
>
> **2026-10-01 (4ª rodada) — FASE 4 CONCLUÍDA** (ADR-016): §10 literal —
> `createNew` recebe `starterIdentityId` e o save nasce com **1 herói**
> (os outros 3 ficam no códice derivado, bloqueados, com dica de aquisição
> §12-safe). A escolha virou o **passo 2 da criação** ("Convocação do
> Campeão"), com retrato/raridade/classe/skill assinada por herói. §19
> preservado: escolha = posse; equipe continua ato explícito. XP/níveis já
> eram funcionais (ADR-014) — Fase 4 fechou o fluxo de escolha + códice.

**O que já está construído (inserção genérica):**

- O modelo de dados de `Hero` e o catálogo tipado — remodelar é editar dados.
- Os 4 heróis entram no save novo com retrato, folhas e stats por classe.
- Garantias mecânicas no CI: nada de clones disfarçados (§10) e nada de
  herói sem arte (§62).

**O que pode ser construído sem a identidade definitiva:**

- O XP de herói e a curva.
- A seleção de 1 entre N.
- A integração com inventário e equipamento.

**P-002 RESOLVIDA (2026-10-01, ADR-015):** nomes definitivos, raridades,
skills assinadas e estilo entraram em `packages/config/src/heroes.ts`. O que
fica de fora da identidade: progressão de skills (⛔ `P-022`, pós-MVP) e curvas
finais de balance (⛔ `P-009`, com dados de playtest).

**Gate:** o jogador escolhe 1 dos 4, e a escolha tem impacto real (§10).
*Quase pronto:* escolha, impacto mecânico e identidade final existem; falta a
seleção 1-entre-N na UI (Fase 4 em curso).

---

## 6. FASE 5 — Equipe ✅

Slots 1/2/3, desbloqueio por nível + Coin, seleção de herói ativo.

> **2026-10-01 — FASE 5 CONCLUÍDA** (ADR-017): `unlockSlot`/`unlockTeamSlot`
> (nível do Rei E Coin, atômico, em ordem), custos em `config.team.slots`
> (⛔ P-003 provisório: 50.000 / 250.000), divisão de XP linear 1/n
> (⛔ P-004: `config.xp.teamSplit`) e UI de Equipe completa — escolha de
> slot, remoção, herói ativo, motivo de bloqueio. Gate:
> `team-slot-unlock.test.ts` + `team-xp-split.test.ts` (14 testes).

| # | Entregável | PEND |
|---|---|---|
| 1 | 1 slot, ativo desde o início | — |
| 2 | Slot 2: nível 10 + Coin | `P-003` ✅ |
| 3 | Slot 3: nível 25 + Coin | `P-003` ✅ |
| 4 | Seleção e troca do herói ativo | — |
| 5 | Divisão de XP por tamanho da equipe | `P-004` ✅ |

**Gate:** `team-slot-unlock.test.ts` e `team-xp-split.test.ts` passando. ✅

---

## 7. FASE 6 — Combate ✅ CONCLUÍDA (2026-10-03, ADR-020)

1×1 na Torre, Battle Engine, ataques, skills, dano, morte, vitória, derrota, feedback visual.

| # | Entregável | Estado |
|---|---|---|
| 1 | `TowerBattle` 1×1 com a arena Phaser | ✅ `BattleScene` reescrita (spritesheets Nika, animações) |
| 2 | Fórmulas de dano, crítico, IAS, alvo | ✅ engine (SIMULATE_TURNS.md), skills da classe com cooldown |
| 3 | Feedback visual de cada evento (§60) | ✅ fila + `planBatch` (`BattleRenderer`), números/lunge/flash/banner |
| 4 | Animação de ataque, dano, crítico, morte | ✅ attack/hurt/death + crítico (flash+shake+tamanho) |
| 5 | Inimigo com IA de alvo | ✅ 1×1 = alvo único (§7.1); BossBattle é a Fase 12 |
| 6 | **Escala e legibilidade em tela pequena** (§68) | ✅ números escalados por importância, `prefers-reduced-motion` |

**Gate:** `INV-01` passando; a batalha é **visualmente percebida** (§60). Bônus:
HP persistente entre batalhas (⛔ P-019 fechada — ADR-020), SFX por evento
(22 WAVs), botões Descansar/Recomeçar/Retomar.

---

## 8. FASE 7 — Torre ✅ CONCLUÍDA (2026-10-03, ADR-021/022)

| # | Entregável | Estado |
|---|---|---|
| 1 | Estrutura de andar com requisito (faixa de nível, gate do Rei) | ✅ `FloorDef`, `TowerLockedError`, `highestUnlockedFloor` |
| 2 | Curva de dificuldade (nível do inimigo = nível-base do andar) | ✅ 40 andares até Nv 20.000 |
| 3 | Templates de inimigo com perfis distintos | ✅ 11 inimigos, 6 papéis, físico/mágico |
| 4 | Pool por andar (variedade tanque/dano/veloz/mago/elite) | ✅ sorteio determinístico por seed |
| 5 | Recompensas por andar (curvas de XP desacelerando) | ✅ `CurveDef`; Coin ⛔ P-008 provisória |
| 6 | Identidade visual por andar | ✅ nome + tema + tintura (tilesets ⛔ P-028) |
| 7 | **Nenhum boss na Torre** | ✅ regra fechada (§55) |
| 8 | UI de seleção de andar, faixa, papéis e aviso de nível | ✅ `TowerScreen` |
| 9 | Relatório de balanceamento gerado | ✅ `npm run report:balance` → `BALANCE_REPORT.md` |
| 10 | `ContentPack` (export/validate/apply) para o painel futuro | ✅ ADR-022 |

**Gate:** testes `tower-content`, `tower-balance`, `tower-floors`, `level-scaling` passando
(inclui: nenhum boss no pool, 1×1, sustentabilidade idle, round-trip do `ContentPack`).
Bônus: teto 20.000, regen em PROCURANDO, defesa por nível, save com `configVersion` 3.

---

## 9. FASE 8 — Searching loop ✅

```text
Vitória → Recompensa → Procurando → ~3s → Novo inimigo
```

> **2026-10-01 — FASE 8 CONCLUÍDA** (ADR-017): `SEARCHING` persistido com
> timestamp absoluto (ADR-007), ~3s configurável (2,7–3,2s em
> `config.searching`), navegar/recarregar não pausa (⛔ P-012: última
> gravação vence no MVP local), derrota encerra a caçada sem auto-restart
> (⛔ P-019: "Recomeçar a caçada" é ato do jogador) e a UI mostra
> "PROCURANDO… X.Xs" com animação. Animação de identidade visual do §28
> fica para `P-028` (com `P-005`, Fase 7). Gate: `searching-state.test.ts`.

| # | Entregável | PEND |
|---|---|---|
| 1 | `SEARCHING` como estado persistido (ADR-007) | — |
| 2 | Animação real de procura (§28) | `P-028` (parcial: dots + barra) |
| 3 | ~3s configurável (2,7–3,2s) | — |
| 4 | Navegar **não** pausa (§29) | — |
| 5 | Sobrevive a recarregar a página | `P-012` ✅ |
| 6 | Política de defeat | `P-019` ✅, `P-020b` ✅ |

**Gate:** `searching-state.test.ts` passando. ✅

---

## 10. FASE 9 — Equipamentos

> ✅ **CONCLUÍDA em 2026-10-03** (ADR-023/024) — P-010/P-016/P-023/P-024/P-025/P-033 decididas por delegação. O gate original (`x-independence.test.ts`/`loot-distribution.test.ts`) foi coberto por `loot.test.ts`, `gear.test.ts`, `equipment-flow.test.ts` e `tower-balance.test.ts`. Venda por Coin existe com preço provisório (P-008, fechado na Fase 10).

| # | Entregável | PEND |
|---|---|---|
| 1 | 10 slots de equipamento | `P-001` |
| 2 | 9 tipos de arma com traços | `P-023`, `P-024` |
| 3 | 6 raridades com multiplicadores | `P-027` |
| 4 | **X independente por atributo** (§36) | `P-010` |
| 5 | Nota e Poder | — |
| 6 | Pipeline de loot com 5% (§32) | ✅ |
| 7 | Inventário com filtros e comparação | `P-016` |
| 8 | Equipar | — |
| 9 | **Vender por Coin** (§39) | `P-008` |

**Gate:** `x-independence.test.ts` e `loot-distribution.test.ts` passando.

---

## 11. FASE 10 — Economia

> ✅ **CONCLUÍDA em 2026-10-03** (ADR-025) — Market por Coin com Poções/Revives/Caixas, Bot (auto-poção/revive/Hub) e fragmentos da conta. P-008/P-036 decididas **provisoriamente** (tudo em `config.market`, editável). Ledger append-only e auditoria (§44) ficam para a fase online.

> _Escopo original (histórico):_

| # | Entregável | PEND |
|---|---|---|
| 1 | Coin com origem, uso, limite, auditoria (§44) | `P-008` |
| 2 | **Fontes** de Coin (§43) | `P-008` |
| 3 | **Sumidouros** de Coin (§43) | `P-036` |
| 4 | Ledger append-only | — |
| 5 | Venda de equipamento | `P-008` |
| 6 | Custos de slot | `P-003` |

**Gate:** `coin-ledger.test.ts` e `equipment-sell.test.ts` passando.

---

## 12. FASE 11 — Offline

> ✅ **CONCLUÍDA em 2026-10-03** (ADR-026) — o offline é a **simulação do online** (teto por ausência 2 h Free / 8 h VIP; Hub e Bot incluídos). Não há taxa de conversão (P-011/P-011a resolvidas).

> _Escopo original (histórico):_

| # | Entregável | PEND |
|---|---|---|
| 1 | `lastActiveAt` (§47) | — |
| 2 | Cálculo de duração | — |
| 3 | Limite **2h Free** (§48) | ✅ valor fechado |
| 4 | Limite **8h VIP** (§48) | ✅ valor fechado |
| 5 | Simulação de recompensa | `P-011` |
| 6 | Modelo de derrota offline | `P-011a` |
| 7 | Resumo visual ao retornar | — |

**Gate:** `offline-cap.test.ts` e `offline-rewards.test.ts` passando.

---

## 13. FASE 12 — Boss ✅

> **CONCLUÍDA em 2026-10-03** (ADR-027; regras em [`BOSS_SYSTEM.md`](BOSS_SYSTEM.md) §14).

| # | Entregável | Estado |
|---|---|---|
| 1 | Boss Arena como atividade separada (aba **Arena**) | ✅ |
| 2 | `BossBattle` equipe × 1 (mesmo engine, `mode: "boss"`) | ✅ |
| 3 | Conteúdo de Boss: 8 chefes, fases, resistências, tempo limite, tentativas (`config.boss`, ContentPack v4) | ✅ |
| 4 | **Fragmentos de Boss** (§54) na conta, 1ª vitória com bônus | ✅ |
| 5 | Fragmentos → invocação de herói (§12, ADR-025) | ✅ |
| 6 | UI de atividade especial (§110): cena própria, fase, cronômetro, resultado | ✅ |

**Gate batido:** testes de tamanho de equipe e de fonte de fragmentos (`boss.test.ts`, `boss-battle.test.ts`).

> Fica para depois: World/Guild/Event Boss (só arquitetura), trilha de Boss (P-062) e a revisão dos números com jogo real (Fase 13).

---

## 14. FASE 13 — MVP Local

> **"Testar o loop completo. Não avançar até o jogo ser realmente jogável."** (§96)

O vertical slice deve provar, de ponta a ponta:

```text
Rei → Escolha de personagem → Equipe → Escolha de herói
  → Torre → 1×1 → Vitória → XP/Coin → Possível loot
  → Procurando → ~3s → Novo inimigo → Nova batalha → Progressão
```

> **Se esse loop não estiver divertido e funcional, NÃO avançar para sistemas MMO complexos.** (§117)

Os 20 passos do §118 são o critério de aceite:

1. criar Rei · 2. escolher identidade · 3. escolher 1 dos 4 · 4. montar equipe
5. desbloquear slots · 6. escolher herói · 7. entrar em batalha · 8. lutar 1×1
9. ganhar · 10. receber XP · 11. receber Coin · 12. encontrar equipamento
13. equipá-lo · 14. continuar · 15. observar Procurando · 16. enfrentar próximo
17. melhorar personagem · 18. avançar na Torre · 19. fechar navegador
20. retornar e recuperar progresso offline

**Gate de release:** a matriz de 22 testes do §78 + os E2E do §118 — **batido**, ver [`MVP_ACCEPTANCE.md`](MVP_ACCEPTANCE.md).

### Entregue na Fase 13 (ADR-028)

| # | Entrega | Onde |
|---|---|---|
| 1 | **Debug Mode (§77)** — painel só em build de dev (`VITE_DEBUG_MODE`); economia, XP/nível, heróis, equipamento, Torre/andar, Boss, offline, teste de loot | `packages/game-core/src/debug.ts`, `apps/game-web/src/DebugPanel.tsx` |
| 2 | **Opções**: som (liga/volume), salvar agora, **baixar/carregar save**, **apagar progresso** (confirmação + backup + restaurar), “Como jogar”, créditos do pack | `SettingsScreen.tsx`, `saveTools.ts`, `settings.ts` |
| 3 | **Guia “Próximo passo”** para quem começa (não age pelo jogador) | `guide.ts` |
| 4 | **ErrorBoundary** (recarregar / baixar cópia do save) e save gravado também em `pagehide` | `ErrorBoundary.tsx`, `boot.ts` |
| 5 | **Texto de jogo limpo**: sem `§N`/`P-xxx`/ADR na interface; correções de texto (poção % sem herói, plural de equipamento) | telas |
| 6 | **Jornada §118** (20 passos) e **soak** (3 h × 4 heróis, offline em sequência) como testes | `tests/integration/mvp-journey.test.ts`, `soak.test.ts` |
| 7 | **Fumaça de UI** (React real em jsdom): criação → todas as telas → Opções/save/erro | `apps/game-web/src/__tests__/ui-smoke.test.tsx` |
| 8 | **Windows sem instalação**: `JOGAR.bat` + `scripts/play.mjs` (só Node.js), `check-preview` (rastreio HTTP do bundle e de todos os assets, carimbo de fontes, arquivos compatíveis com o Windows) | [`PLAY_LOCAL.md`](PLAY_LOCAL.md) |
| 9 | **Revisão dos números** com jogo real (ritmo das primeiras 4 h) em `BALANCE_REPORT.md`; nenhum número alterado | `scripts/balance-report.ts` |
| 10 | Matriz de aceite verificável (§78 + §118) | [`MVP_ACCEPTANCE.md`](MVP_ACCEPTANCE.md), `tests/integration/acceptance-doc.test.ts` |

---

## 14b. FASE 14 — Painel Admin (pós-MVP)

> Especificado em [`ADMIN_PANEL.md`](ADMIN_PANEL.md). **Não implementar antes do MVP (FASE 13).**

Editar/adicionar/remover inimigos, bosses, heróis, andares, curvas e itens por
formulário, **sem código e sem IA**, com validação e prévia de balanceamento, e
aplicação direta no jogo via `ContentPack`. Pré-requisitos já entregues: contrato
`ContentPack` + validação + `applyContentPack` (FASE 7). Ordem prevista: AR nas
fases 9–12 → `ContentStore` (persistência do pack) → UI do painel → (Online)
papel `admin` + versionamento no servidor. O futuro anúncio de **personagens
evoluídos** no Mercado da Comunidade (o Rei poderá anunciar heróis) é registrado
em [`MARKET_SYSTEM.md`](MARKET_SYSTEM.md), sem implementação.

---

## 15. Fases Online, Social, Market, PvP, Monetização, Polish

### Online
Google Auth → Supabase → Database → Cloud Save → Realtime → Chat → Server Authority.

Gate: `AUTH_SYSTEM.md`, `CHAT_SYSTEM.md`, `SECURITY.md` implementados; RLS testado com usuários A/B/anon.

### Social
Chat de guilda, guildas, perfis, rankings, amizades.
PEND: `P-046`, `P-048`, `P-049`, `P-050`, `P-051`, `P-031`.

### Market
Anúncios, compra, venda, **taxa 15%** (§41), histórico, proteção contra duplicação.
PEND: `P-014`, `P-053`, `P-054`.

### PvP
Arena, matchmaking, combate, ranking — **tudo server-authoritative** (§53).
PEND: `P-052`, `P-053`.

### Monetização
VIP, Battle Pass, Diamonds, compras.
PEND: `P-013`, `P-035`.
> *"Sempre respeitar: segurança; server authority; economia; transparência; prevenção de duplicação."* (§101)

### Polish
Animações, efeitos, áudio, UI, feedback, transições, performance, mobile, acessibilidade, UX.
PEND: `P-059` a `P-063`.

### Beta
Múltiplos usuários, chat, mercado, economia, auth, persistência, offline, mobile, Vercel, Supabase, recuperação de erros.

### Lançamento
Critérios do §104: build estável, auth, save, economia, chat, mercado, segurança básica, RLS, produção, mobile, assets finais, documentação atualizada, `AI_STATE` atualizado, testes críticos passando.

---

## 16. Dependências críticas

```text
P-002 (4 heróis)     ─┐
                       ├─→ FASE 4 ─→ FASE 5 ─→ FASE 6 ─→ FASE 7
P-005/P-006 (Torre)   ─┘                    (✅ resolvidas — ADR-021)

P-010 (X)            ──→ FASE 9 ✅ (ADR-023)
P-008/P-036 (economia)──→ FASE 10
P-011 (offline)       ──→ FASE 11
P-018 (Boss)          ──→ FASE 12
```

**A FASE 2 não depende de nenhuma delas.** É por isso que é o próximo passo.

---

## 17. Critério de prioridade

> *"GAMEPLAY > FUNCIONALIDADE > ESTABILIDADE > PERFORMANCE > VISUAL > UX > SISTEMAS SECUNDÁRIOS > CONTEÚDO > POLISH"* (§124)

> *"Mas nunca sacrificar segurança e integridade econômica para acelerar conteúdo online."* (§124)

---

## 18. O ciclo obrigatório

> **DOCUMENTAR → ARQUITETAR → IMPLEMENTAR → TESTAR → CORRIGIR → DOCUMENTAR → ATUALIZAR AI_STATE → AVANÇAR** (§76)

E **nunca**:

```text
IMPLEMENTAR → IMPLEMENTAR → IMPLEMENTAR → DOCUMENTAR NO FINAL
```

> *"O projeto deve permanecer executável durante todo o desenvolvimento."* (§123)

---

## 19. Referências

- [`GAME_SYSTEMS.md`](GAME_SYSTEMS.md) §5 — ordem de construção
- [`PENDING_RULES.md`](PENDING_RULES.md) — o que bloqueia o quê
- [`AI_STATE.md`](../AI_STATE.md) — handoff e próximo passo
- [`TESTING.md`](TESTING.md) — gates de release
- [`../Master-Prompt.md`](../Master-Prompt.md) §96–§104 — roadmap original
