# Roadmap

**Tower Idle Adventure**
**Versão:** 0.1 · **Data:** 2026-10-01 · **Estado:** FASE 3 (Rei) concluída
**Fonte:** §96–§104 do `Master-Prompt.md`

---

## 1. Onde estamos

```text
FASE 0  ✅ Inspeção
FASE 1  ✅ Documentação
FASE 2  ✅ Fundação
FASE 3  ✅ Rei                      ← CONCLUÍDA (gate batido)
FASE 4  ⬜ Personagens      ⛔ P-002  ← PRÓXIMO PASSO
FASE 5  ⬜ Equipe
FASE 6  ⬜ Combate
FASE 7  ⬜ Torre            ⛔ P-005, P-006
FASE 8  ⬜ Searching loop
FASE 9  ⬜ Equipamentos     ⛔ P-010
FASE 10 ⬜ Economia          ⛔ P-008, P-036
FASE 11 ⬜ Offline           ⛔ P-011
FASE 12 ⬜ Boss              ⛔ P-018
FASE 13 ⬜ MVP LOCAL
Online ⬜ → Social ⬜ → Market ⬜ → PvP ⬜ → Monetização ⬜ → Polish ⬜ → Beta ⬜ → Lançamento
```

Implementado até aqui: especificação, documentação, fundação tipada (contratos,
config, engine, game-core, persistência, HUD base) e a FASE 3 (criação do Rei).
Gameplay de Torre/combat/economia ainda **não** está implementado.

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

> ⛔ **BLOQUEADA por `P-002`.** A definição dos 4 heróis é decisão de produto.

**O que pode ser construído sem `P-002`:**

- O modelo de dados de `Hero`.
- O XP de herói e a curva.
- A seleção de 1 entre N.
- A integração com inventário e equipamento.

**O que precisa de `P-002`:** os 4 heróis — nome, classe, atributos-base, skills, estilo, raridade.

> O material de apoio existe ([`ASSET_INVENTORY.md` §5.3](ASSET_INVENTORY.md#53-candidatos-para-os-4-heróis-iniciais)): sprites candidatos (`hero`, `mage`, `archer`, `necromancer`) que cobrem físico × mágico e têm traços de arma complementares. Falta a **decisão**.

**Gate:** o jogador escolhe 1 dos 4, e a escolha tem impacto real (§10).

---

## 6. FASE 5 — Equipe

Slots 1/2/3, desbloqueio por nível + Coin, seleção de herói ativo.

| # | Entregável | PEND |
|---|---|---|
| 1 | 1 slot, ativo desde o início | — |
| 2 | Slot 2: nível 10 + Coin | `P-003` (custo) |
| 3 | Slot 3: nível 25 + Coin | `P-003` (custo) |
| 4 | Seleção e troca do herói ativo | — |
| 5 | Divisão de XP por tamanho da equipe | `P-004` |

**Gate:** `team-slot-unlock.test.ts` e `team-xp-split.test.ts` passando.

---

## 7. FASE 6 — Combate

1×1 na Torre, Battle Engine, ataques, skills, dano, morte, vitória, derrota, feedback visual.

| # | Entregável |
|---|---|
| 1 | `TowerBattle` 1×1 com a arena Phaser |
| 2 | Fórmulas de dano, crítico, IAS, alvo |
| 3 | Feedback visual de cada evento (§60) |
| 4 | Animação de ataque, dano, crítico, morte |
| 5 | Inimigo com IA de alvo |
| 6 | **Escala e legibilidade em tela pequena** (§68) |

**Gate:** `INV-01` passando; a batalha é **visualmente percebida** (§60).

---

## 8. FASE 7 — Torre

> ⛔ **BLOQUEADA por `P-005` e `P-006`.**

| # | Entregável | PEND |
|---|---|---|
| 1 | Estrutura de andar com requisito | `P-005` |
| 2 | Curva de dificuldade | `P-005` |
| 3 | Templates de inimigo com perfis distintos | `P-006` |
| 4 | Pool por andar | `P-005` |
| 5 | Recompensas por andar | `P-008` |
| 6 | Identidade visual por andar | `P-028` |
| 7 | **Nenhum boss na Torre** | ✅ regra fechada (§55) |

> **P-006 é o mais crítico dos dois.** O §107 exige que a Torre gere a pergunta *"qual dos meus heróis é melhor?"*. Sem inimigos com perfis distintos (físico, mágico, etc.), essa pergunta não tem resposta posible e a escolha de herói vira cosmética.

**Gate:** `INV-02` (nenhum boss na Torre) e `fragment-source.test.ts` passando.

---

## 9. FASE 8 — Searching loop

```text
Vitória → Recompensa → Procurando → ~3s → Novo inimigo
```

| # | Entregável | PEND |
|---|---|---|
| 1 | `SEARCHING` como estado persistido (ADR-007) | — |
| 2 | Animação real de procura (§28) | `P-028` |
| 3 | ~3s configurável (2,7–3,2s) | — |
| 4 | Navegar **não** pausa (§29) | — |
| 5 | Sobrevive a recarregar a página | `P-012` |
| 6 | Política de defeat | `P-019`, `P-020b` |

**Gate:** `searching-state.test.ts` passando.

---

## 10. FASE 9 — Equipamentos

> ⛔ **BLOQUEADA por `P-010`** (faixa do X) e `P-016` (limite).

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

> ⛔ **BLOQUEADA por `P-008` e `P-036`.** É o maior bloqueio do projeto.

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

> ⛔ **BLOQUEADA por `P-011`** (taxa de conversão).

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

## 13. FASE 12 — Boss

> ⛔ **BLOQUEADA por `P-018`.**

| # | Entregável | PEND |
|---|---|---|
| 1 | Boss Arena como atividade separada | `P-018` |
| 2 | `BossBattle` equipe × 1 | `P-018` |
| 3 | Conteúdo de Boss | `P-018` |
| 4 | **Fragmentos de Boss** (§54) | `P-017` |
| 5 | Fragmentos → craft de herói (§12) | `P-017` |
| 6 | UI de atividade especial (§110) | — |

**Gate:** `boss-battle-size.test.ts` **e** `fragment-source.test.ts` passando.

> O teste de fragmento é o que garante a §12: um herói **nunca** pode ser obtido de um slime.

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

**Gate de release:** a matriz de 22 testes do §78 + os E2E do §118.

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
P-005/P-006 (Torre)   ─┘                    (bloqueada por P-005)

P-010 (X)            ──→ FASE 9
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
