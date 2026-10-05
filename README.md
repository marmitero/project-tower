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
FASE 12 · Boss                ✅
FASE 13 · MVP Local           ✅  ← fase atual concluída (2026-10-03) — MVP LOCAL JOGÁVEL
FASE 14 · Painel Admin        ⬜  ← próxima (pós-MVP)
```

**7 de 7 etapas até o primeiro MVP jogável — concluído.** O jogo roda no navegador de ponta a ponta: criar o Rei → escolher 1 dos 4 heróis → montar equipe (slots 2 e 3 por nível + Coin) → subir a Torre 1×1 em loop automático → XP, Coin e equipamento com raridade/X → inventário, venda e Market → Bot e Hub → offline (Free 2 h) → Arena dos Chefes → **salvar, fechar e voltar**.

## Jogar agora

**Windows 10/11 (sem instalar nada além do Node.js):** baixe o zip, **extraia**, dê duplo clique em **`JOGAR.bat`** → o jogo abre em `http://localhost:5173`.
Passo a passo ilustrado de texto, com solução de problemas: **[`docs/PLAY_LOCAL.md`](docs/PLAY_LOCAL.md)**.

```text
https://github.com/marmitero/project-tower/archive/refs/heads/arena/01a106b8-project-tower.zip
```

Linux/macOS: `./jogar.sh` (ou `npm run play`). **Nunca** abra `index.html` direto (`file://`): não funciona.

### Fase atual — arte "otimização e estilização" (Lote 6 de ~11; o mais recente)

- **Em andamento, em lotes de 10 imagens geradas** (o usuário aprova cada lote com "lote NN aprovado"). Feito: Lotes 1–5 aprovados e **Lote 6 entregue aguardando "lote 06 aprovado"** — **Arcanista 5/5 e Invocador 5/5** (a meta de 25 heróis foi batida) — **26 heróis** em 5 classes (a 5ª, Clérigo, cura) — **meta de 25 heróis batida** —, **25 inimigos** (andares 1–4 com 5 papéis cada), **4 arenas** próprias, **12 retratos do Rei**, botões/ícones no estilo GBA e tela de login com o logotipo. Cada herói novo traz **skill assinatura própria** (35 skills no catálogo).
- Faltam ~5 lotes (L7–L11: retratos restantes e arenas/inimigos dos andares 5–10) e depois a **Fase 14 — Painel Admin**. Para continuar a arte sem o histórico: leia [`AI_STATE.md`](AI_STATE.md) → **[`docs/ART_HANDOFF.md`](docs/ART_HANDOFF.md)** e olhe as imagens em `docs/art-review/` e `assets/generated/`. `npm run art:refs` recria os guias e referências de estilo.

### Pós-Fase 13 — Batalha visível

- Corrigida a **tela preta** da batalha (a cena não recebia a batalha) e entregue a **arena**: cenário de ladrilhos com tema por andar e para chefes, o **herói anda** até o próximo inimigo (que entra caminhando), **efeitos** de corte/faísca/fogo/raio/cura, sombra e recuo. Causa, auditoria e decisões: [`ADR-029`](docs/DECISIONS_LOG.md). Prova visual: `scripts/browser-smoke.mjs` (veja [`docs/TESTING.md`](docs/TESTING.md)).

### Fase 13 — MVP Local

- **Debug Mode (§77)** — painel de testes (Coin/XP/nível, heróis, equipamento, andar, Boss, offline, teste de loot) **só em build de desenvolvimento** (`npm run play:debug`); o jogo do jogador não contém o código.
- **Opções** — som, **baixar/carregar/apagar save** (com confirmação e cópia de segurança), “Como jogar”, créditos do pack.
- **“Próximo passo”** guia o iniciante; **tela de erro** com saída; interface sem jargão interno.
- **Estabilidade testada** — jornada do §118 (20 passos), 3 h simuladas × 4 heróis, offline em sequência, interface inteira em jsdom, e o **bundle do zip rastreado por HTTP** (todos os ~494 assets) a cada `npm run check`.
- **Aceite** — [`docs/MVP_ACCEPTANCE.md`](docs/MVP_ACCEPTANCE.md) liga cada item do §78 e do §118 ao teste que o protege · decisão: [`ADR-028`](docs/DECISIONS_LOG.md).
- **Números revisados com jogo real** (`docs/BALANCE_REPORT.md` → “Ritmo das primeiras 4 horas”): Rei nv 10 em ≈ 20 min, Slot 2 em ≈ 1,4 h. Nada foi alterado; os provisórios dependem de playtest humano.

### Fase 12 — Arena dos Chefes

Chefe é uma **atividade separada da Torre**: a **equipe inteira** (até 3 heróis) enfrenta **um** chefe, todos atacando ao mesmo tempo. A Torre continua 1×1 e sem chefe em nenhum andar; fragmentos de herói só saem daqui.

- **8 chefes** (Rei Gosma → Colosso da Torre), com **fases** (por vida restante ou por tempo/*enrage*), **imunidade/resistência** a Atordoamento e Veneno, skills de área, **tempo limite** e **tentativas** por recarga ou por janela.
- **Recompensas:** Coin e XP em "abates equivalentes", equipamento garantido, **fragmentos de herói** e bônus na 1ª vitória.
- **Calibrado por tamanho de equipe:** o chefe 1 cai com 1 herói; do 3º em diante só uma equipe de 3 vence — por isso vale desbloquear os slots.
- **100% editável:** tudo está em `config.boss` (`ContentPack` v4, com validação) — adicionar ou rebalancear um chefe é mudar dados, sem tocar em código. O futuro Painel Admin edita este mesmo bloco.
- Regras completas: [`docs/BOSS_SYSTEM.md`](docs/BOSS_SYSTEM.md) §14 · decisão: [`ADR-027`](docs/DECISIONS_LOG.md) · números medidos: [`docs/BALANCE_REPORT.md`](docs/BALANCE_REPORT.md).

> Os números de Coin e de Boss continuam **provisórios** (P-008, P-017, P-018, P-029): foram revisados na Fase 13 e **mantidos**; ratifique-os depois de jogar.

| | |
|---|---|
| Especificação | [`Master-Prompt.md`](Master-Prompt.md) — 125 seções, fonte de autoridade |
| Documentação | [`docs/`](docs/README.md) — 39 documentos (+ este README e o `AI_STATE.md`) |
| Handoff | [`AI_STATE.md`](AI_STATE.md) — **leia primeiro** |
| Testes | 783 de lógica, interface (jsdom), jornada §118 e soak + 28 de arquitetura (`npm run check`) |
| Assets | **422 sprites** do pack Nika Studio + **arte gerada** (36 atlas de personagem, 4 kits de arena, retratos, UI GBA, login), tudo versionado |
| Pendências | Nenhuma crítica aberta; decisões provisórias em [`docs/PENDING_RULES.md`](docs/PENDING_RULES.md) |

### Como rodar

```bash
npm install
npm run assets:build   # gera a cópia de trabalho dos assets (uma vez)
npm run dev            # http://localhost:5173 (desenvolvimento, com recarga)
npm run play           # como o JOGAR.bat: bundle versionado, sem Vite
npm run play:debug     # idem, COM o painel de Debug Mode (só desenvolvimento)
npm run build:preview  # recompila o bundle versionado (obrigatório ao mudar o código)
npm run check          # docs + tipos + testes (lógica, UI, jornada, soak) + arquitetura + assets + segredos + debug + bundle/zip do Windows
npm run -s report:balance -- --md > docs/BALANCE_REPORT.md   # relatório de balanceamento
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
| **[`docs/ART_HANDOFF.md`](docs/ART_HANDOFF.md)** | **Continuar a fase de arte sem histórico**: regras, estilo, prompts, fluxo, onde editar, fila de lotes |
| **[`docs/PLAY_LOCAL.md`](docs/PLAY_LOCAL.md)** | **Como jogar no Windows** (passo a passo) e solução de problemas |
| [`docs/MVP_ACCEPTANCE.md`](docs/MVP_ACCEPTANCE.md) | Matriz de aceite do MVP: §78 e §118 → testes |
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
