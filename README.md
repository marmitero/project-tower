# Tower Idle Adventure

> **2D Idle RPG · Auto-Battle · Loot RPG · Tower Progression · Collection RPG · MMORPG assíncrono**

Um RPG idle de navegador onde **você é o Rei**. Escolhe seus campeões, decide quem entra na Torre, gerencia o inventário e deixa o reino continuar progredindo enquanto você administra.

---

## Estado do projeto

```text
FASE 0  · Inspeção            ✅
FASE 1  · Documentação        ✅
FASE 2  · Fundação            ✅
FASE 3  · Rei                 ✅
FASE 4  · Personagens         ✅
FASE 5  · Equipe              ✅
FASE 6  · Combate             ✅
FASE 7  · Torre               ✅
FASE 8  · Searching loop      ✅
FASE 9  · Equipamentos        ✅
FASE 10 · Economia (Market)   ✅
FASE 11 · Offline             ✅
FASE 12 · Boss                ✅  ← fase atual concluída (2026-10-03)
FASE 13 · MVP Local           ⬜  ← próxima (última etapa até o 1º MVP jogável)
FASE 14 · Painel Admin        ⬜  (pós-MVP)
```

**6 de 7 etapas até o primeiro MVP jogável.** O jogo já roda no navegador de ponta a ponta: criar o Rei → escolher 1 dos 4 heróis → montar equipe (slots 2 e 3 por nível + Coin) → subir a Torre 1×1 em loop automático → XP, Coin e equipamento com raridade/X → inventário, venda e Market → Bot e Hub → offline (Free 2 h) → **Arena dos Chefes**.

### Fase 12 — Arena dos Chefes (a mais recente)

Chefe é uma **atividade separada da Torre**: a **equipe inteira** (até 3 heróis) enfrenta **um** chefe, todos atacando ao mesmo tempo. A Torre continua 1×1 e sem chefe em nenhum andar; fragmentos de herói só saem daqui.

- **8 chefes** (Rei Gosma → Colosso da Torre), com **fases** (por vida restante ou por tempo/*enrage*), **imunidade/resistência** a Atordoamento e Veneno, skills de área, **tempo limite** e **tentativas** por recarga ou por janela.
- **Recompensas:** Coin e XP em "abates equivalentes", equipamento garantido, **fragmentos de herói** e bônus na 1ª vitória.
- **Calibrado por tamanho de equipe:** o chefe 1 cai com 1 herói; do 3º em diante só uma equipe de 3 vence — por isso vale desbloquear os slots.
- **100% editável:** tudo está em `config.boss` (`ContentPack` v4, com validação) — adicionar ou rebalancear um chefe é mudar dados, sem tocar em código. O futuro Painel Admin edita este mesmo bloco.
- Regras completas: [`docs/BOSS_SYSTEM.md`](docs/BOSS_SYSTEM.md) §14 · decisão: [`ADR-027`](docs/DECISIONS_LOG.md) · números medidos: [`docs/BALANCE_REPORT.md`](docs/BALANCE_REPORT.md).

> Os números de Coin e de Boss são **provisórios** (P-008, P-017, P-018, P-029) e serão revisados com jogo real na Fase 13.

| | |
|---|---|
| Especificação | [`Master-Prompt.md`](Master-Prompt.md) — 125 seções, fonte de autoridade |
| Documentação | [`docs/`](docs/README.md) — 36 documentos (+ este README e o `AI_STATE.md`) |
| Handoff | [`AI_STATE.md`](AI_STATE.md) — **leia primeiro** |
| Testes | 616 unitários/integração + 28 de arquitetura (`npm run check`) |
| Assets | **422 sprites** do pack Nika Studio, versionados no repositório |
| Pendências | Nenhuma crítica aberta; decisões provisórias em [`docs/PENDING_RULES.md`](docs/PENDING_RULES.md) |

### Como rodar

```bash
npm install
npm run assets:build   # gera a cópia de trabalho dos assets (uma vez)
npm run dev            # http://localhost:5173
npm run check          # docs + tipos + testes + arquitetura + assets + segredos
npm run report:balance # relatório de balanceamento (Torre, equipamento, Market, Chefes)
```

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
| [`docs/PENDING_RULES.md`](docs/PENDING_RULES.md) | As 67 decisões catalogadas (24 já decididas/provisórias) |
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
Supabase (Auth · Postgres · RLS · Realtime · Edge Functions) — fase online, ainda não implementada
Vercel
```

**Monorepo:** `packages/engine` (Battle Engine puro, sem React), `packages/config` (todo número de balanceamento, empacotável como `ContentPack`), `packages/game-core` (estado e regras), `packages/contracts`, `packages/ui`, `apps/game-web`, `apps/admin-web` (futuro).

> A regra que estrutura tudo: **a lógica do jogo não depende de componentes React** — e isso é verificado por teste, não por intenção.

---

## Assets

O pack cobre a vertical slice; ícones de revive/caixas e SFX foram gerados no estilo do pack (ver `assets/SOURCES.md`).

| | |
|---|---|
| Pack | Fantasy Dungeon — Nika Studio, v1.4 |
| Conteúdo | **422 PNG** — 108 sheets de personagem, 224 ícones, 65 tiles, 7 VFX, 8 retratos, 8 skins |
| Licença | MIT, **com crédito obrigatório** |
| Origem | [nikastudio.itch.io](https://nikastudio.itch.io/fantasy-dungeon-top-down-pixel-rpg-asset-pack-unity-6-urp) |

Inventário completo e licenças em [`docs/ASSET_INVENTORY.md`](docs/ASSET_INVENTORY.md).

O pack está em `assets/sprites/` e **é versionado neste repositório** desde
2026-10-02 (o projeto não depende mais do repositório de origem). Se os
arquivos sumirem do working tree, `git restore assets/sprites` resolve.
Para regerar a cópia de trabalho do jogo (`apps/game-web/public/assets/`):

```bash
npm run assets:build
```

Crédito e licença: [`assets/ATTRIBUTION.md`](assets/ATTRIBUTION.md).
Origem e convenções: [`assets/SOURCES.md`](assets/SOURCES.md).
O que ainda falta para o MVP: [`docs/ASSET_GAP.md`](docs/ASSET_GAP.md).

---

## Decisões provisórias

As pendências de produto foram decididas por delegação (cada uma registrada em ADR, **toda em config editável**) e aguardam ratificação com playtest: Coin e preços do Market (P-008/P-036, ADR-025), fragmentos, conteúdo e tentativas de Boss (P-017/P-018/P-029, ADR-027). Nenhuma é bloqueio de implementação. Detalhes em [`docs/PENDING_RULES.md`](docs/PENDING_RULES.md).

---

## Verificação da documentação

```bash
node scripts/check-docs.mjs
```

Valida ausência de corrupção de encoding, índice completo, links relativos válidos e rastreabilidade de todas as pendências.

---

## Licença

Código do projeto sob licença a definir. Assets de terceiros sob os termos de Nika Studio — ver [`docs/ASSET_INVENTORY.md` §2](docs/ASSET_INVENTORY.md#2-origem-e-licença).
