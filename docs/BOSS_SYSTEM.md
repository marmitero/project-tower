# Sistema de Boss

**Versão:** 0.1 · **Data:** 2026-09-30 · **Estado:** especificado, conteúdo bloqueado (P-018)
**Fonte:** §21, §23–§25, §54, §55, §80, §110 do `Master-Prompt.md`

---

## 1. O que Boss é (e o que não é)

> **Boss é uma exceção deliberada. Boss NÃO pertence ao fluxo normal da Torre.** (§21)

| | Torre | Boss |
|---|---|---|
| **Heróis** | 1 | **Toda a equipe** (até 3) |
| **Inimigos** | 1 | 1 Boss |
| **Combate** | `1 × 1` | `Equipe × 1` |
| **Onde** | Andar da Torre | Atividade separada |
| **Quando** | Contínua, enquanto o jogador fica | Programada / desafiadora |
| **Fragmentos** | ❌ **nunca** | ✅ **fonte principal** |

> *"Essa distinção deve estar presente: na lógica, na documentação, no Battle Engine, na UI, nos testes e no balanceamento."* (§25)

---

## 2. A regra abolida,Applied ao design

> *"andar 10 = boss / andar 20 = boss / andar 30 = boss"*
>
> **Essa regra está ABOLIDA.** (§21, §55)

Não existe "andar de boss". Existe uma **local separado** — a Boss Arena — que o jogador acessa por um botão, não subindo andares.

**Por que isso é uma melhoria, não só uma regra:**

| Aspecto | Boss na Torre | Boss como atividade |
|---|---|---|
| Frequência | A cada N andares, previsível | Programada, com janela de tentativa |
| Tensão | "Já sei que o boss vem no 10" | "Estou pronto para o boss?" |
| Risco | Derrota = perde 10 andares de progresso | Derrota = tenta de novo |
| Recompensa | Amarrada ao andar | Amarrada à atividade |
| Fail de coleção | Fragmentos viram "a cada 10 andares" | Fragmentos viram "derrotei o boss X" |

O MP é explícito sobre a intenção: *"Boss deve parecer uma atividade especial. Não simplesmente 'mais um inimigo da Torre'."* (§110)

---

## 3. Estruturas possíveis

O §23 lista as estruturas que a arquitetura deve suportar, e a escolha entre elas é **conteúdo futuro**, não decisão agora:

| Estrutura | Descrição | Fase alvo |
|---|---|---|
| **Boss Arena** | Lista de Bosses individuais/equipe, jogador escolhe | FASE 12 (primeira) |
| Boss Dungeon | Série de encontros encadeados culminating em Boss | FASE 12+ |
| Boss Challenge | Condição específica (tempo, sem dano, só X herói) | FASE 12+ |
| World Boss | Boss global, todos atacam, regra de last hit | FASE Social |
| Guild Boss | Boss cooperativo de guilda | FASE Social |
| Event Boss | Boss temporário de evento | FASE Social |

> **P-018** — a arquitetura suporta todas. **Qual** é a primeira, e qual é o conteúdo de cada Boss, não é decidido.

---

## 4. Combate de equipe

No Boss, **toda a equipe participa** (§24):

```text
Herói A  ┐
Herói B  ├──────  VS  ──────  BOSS
Herói C  ┘
```

Todos atacam **simultaneamente**. Regras:

- Cada herói tem seu próprio intervalo de ataque (Velocidade de Ataque).
- Todos shares de cooldown de skill individual.
- A ordem inicial de ação é definida por Velocidade.
- O Boss pode ter ataque de área, fases e mecânicas próprias.
- O herói que **cair** sai do combate.

### 4.1 O teste obrigatório

O §80 é explícito:

```text
Hero A
Hero B
Hero C
        ↓
      BOSS
```

> **Todos os membros atacam simultaneamente.** Este é um teste de release, complementar ao `INV-01` (que garante 1×1 na Torre).

### 4.2 Onde a equipe ganha ou perde

O `BossBattle` é o **único** lugar onde levar 3 heróis é objetivamente melhor que levar 1 — e é por isso que ele é o **alvo natural do XP dividido**:

| Time na Torre | Ganho | Ganho no Boss |
|---|---|---|
| 1 herói | XP máximo, 1 build | Fraco contra Boss forte |
| 2 heróis | XP médio, 2 builds | Bom |
| 3 heróis | XP mínimo, 3 builds | **Necessário** |

Essa assimetria é o que dá sentido à escolha de tamanho de equipe. Se o Boss também fosse 1×1, a equipe seria só overhead de gerenciamento.

---

## 5. Fragmentos — a conexão crítica

> **Boss é uma fonte importante de fragmentos.** (§12, §54)
>
> **Fragmentos NÃO DEVEM DROPAR DE INIMIGOS COMUNS DA TORRE.** (§12)

```text
Derrote Boss  →  fragmento  →  acumula  →  CRAFT  →  Personagem
```

Esta é a **principal** forma de expandir a coleção de heróis, e a justificativa por trás da regra do §12. Se fragmentos viessem de inimigos comuns, a fantasia do §109 — *"preciso conseguir aquele personagem"* — seria destruída, porque o personagem viria um pedaço de cada slime.

### 5.1 Fontes de herói

| Fonte | Herói |
|---|---|
| **Boss → fragmentos → craft** | ✅ principal |
| Eventos | ✅ |
| Caixas / summons | ✅ |
| Recompensas especiais | ✅ |
| Mercado entre jogadores | ✅ |
| Torre (inimigo comum) | ❌ **proibido** |

> **P-017** — quanto fragmento cada Boss dá, e quantos fragmentos são necessários para cada herói, não estão definidos. Isso é o ritmo de coleção do jogo e é Tipo C.

---

## 6. Estrutura de um Boss

```ts
interface BossTemplate {
  id: string;
  name: string;
  title?: string;                 // "Sentinela da Torre"

  level: number;
  stats: CombatStats;             // base + multiplicadores de papel

  /** Fases: a troca de comportamento em frações de HP. */
  phases: BossPhase[];

  /** Mecânicas únicas — resistências, imunidades, summons. */
  traits: BossTrait[];
  immunities: Partial<Record<StatusId, true>>;
  resistances: Partial<Record<StatusId, number>>;

  assetId: AssetId;
  vfxAssetId?: AssetId;
  bgmAssetId?: AssetId;

  /** Recompensas — vindas da configuração. */
  rewards: {
    coin: number;
    kingXp: number;
    heroXp: number;
    guaranteedEquipment: number;   // rolagens garantidas
    fragments: { classId: string; amount: number; chance: number }[];
  };

  /** Limites de tentativa — se houver. */
  attempts?: { type: "none" | "daily" | "cooldown"; value: number };
}
```

> **P-018** — nenhum conteúdo de Boss foi definido. Isso é proposital: o MP define a **estrutura** (§23) e as **regras** (§24, §54), não o conteúdo.

---

## 7. Chefes como fonte de equipamento

O §54 lista Boss como fonte importante de:

- fragmentos
- equipamentos
- recursos
- moedas
- recompensas especiais

O §12 reforça: fragmentos e recompensas especiais são a base da atividade.

A assimetria de drop entre Torre e Boss é o que torna a atividade relevante mesmo para quem já tem equipamento suficiente na progressão normal.

> **P-018** — a taxa de drop de Boss **não** está definida. O §33 define a distribuição de raridade **dentro** dos drops (§32 cobre o "ter ou não ter"), mas a chance de Boss dropar equipamento é Tipo C.

---

## 8. UI

O §110 exige: *"Boss deve parecer uma atividade especial. Não simplesmente 'mais um inimigo da Torre'."*

Elementos que comunicam "atividade especial":

1. **Tela dedicada** de entrada, com preview do Boss, atributos, resistências e recompensa.
2. **Countdown ou janela** de disponibilidade quando houver.
3. **Sua equipe completa** exibida, com aviso de quem está fraco para o Boss.
4. **Arena visual distinta** — não o tileset de um andar.
5. **Música e VFX próprios.**
6. **Tela de resultado** com o loot detalhado, destacando fragmentos.
7. **Fim da atividade** que **não** volta para a Torre: devolve ao Reino.

> O §29 (navegar durante o jogo) se aplica aqui também: o jogador pode consultar equipamento durante a preparação, mas **não** durante o combate ativo.

---

## 9. Balanceamento

O §25 inclui balanceamento na lista de lugares onde a distinção Torre/Boss deve estar presente. Checklist:

- [ ] Boss é calibrado para **n** heróis, não para 1
- [ ] O Boss tem HP suficiente para durar ~30–60s com equipe completa
- [ ] O dano de área dele importa com 3 heróis de forma diferente do que importa com 1
- [ ] A recommendation de nível é calculada sobre o **poder agregado da equipe**, não do herói individual
- [ ] Fragmentos de Boss são obtidos em tempo limitado, para que "farmar fragmentos" não substitua a Torre

> ⚠️ **Nenhum valor de balanceamento de Boss é inventado aqui.** Todos vêm de `P-018`.

---

## 10. O que nunca fazer

- ❌ **Boss automático nos andares 10/20/30** (§21, §55) — a regra mais explicitamente abolida do MP
- ❌ **Time 1×1 no Boss** — todo o sentido da atividade desaparece (§24)
- ❌ **3×1 na Torre** (§17) — o oposto do Boss, e igualmente proibido
- ❌ Fragmentos de inimigo comum (§12)
- ❌ Boss como "inimigo com mais HP" sem mecânica própria (§110)
- ❌ Recompensa de Boss idêntica à da Torre

---

## 11. Checklist de pronto

- [ ] `BossBattle` resolve `equipe × 1` com ataque simultâneo (§80) — **teste**
- [ ] `TowerBattle` continua sendo 1×1 mesmo com 3 heróis na equipe (§79) — **teste**
- [ ] Boss Arena acessível como atividade separada
- [ ] Nenhum andar da Torre tem Boss (§55) — **teste**
- [ ] Fragmentos dropam de Boss (§54)
- [ ] Fragmentos **não** dropam de inimigo comum (§12) — **teste**
- [ ] Heróis caídos saem do combate
- [ ] Toda a equipe visível e selecionável antes de iniciar
- [ ] Tela de resultado destaca fragmentos e loot
- [ ] Victory ≠ volta para a Torre
- [ ] Conteúdo de Boss de `P-018` aprovado

---

## 12. Pendências

| ID | Pendência | Bloqueia |
|---|---|---|
| `P-018` | Conteúdo de Boss: stats, fases, mecânicas, recompensas | FASE 12 |
| `P-017` | Fragmentos por Boss e por herói | FASE 12 |
| `P-029` | Limites de tentativa / janela de disponibilidade | FASE 12 |
| `P-030` | World Boss: regra de last hit | FASE Social |
| `P-031` | Boss de guilda: escala e distribuição de recompensa | FASE Social |

---

## 13. Referências

- [`COMBAT_SYSTEM.md`](COMBAT_SYSTEM.md) §2 — os dois modos de batalha
- [`TOWER_SYSTEM.md`](TOWER_SYSTEM.md) §2 — a regra abolida
- [`CHARACTER_SYSTEM.md`](CHARACTER_SYSTEM.md) §4 — sistema de fragmentos
- [`MMO_SYSTEMS.md`](MMO_SYSTEMS.md) — World Boss, Guild Boss no contexto dos sistemas MMO
