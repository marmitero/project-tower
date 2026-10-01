# Sistema de Skills

**Versão:** 0.2 · **Data:** 2026-10-01 · **Estado:** modelo + roster de dados implementados (base OpenRpg)
**Fonte:** §9, §25, §66, §81 do `Master-Prompt.md` · dados em `packages/config/src/skills.ts` · base [OpenRpg](OPENRPG_REFERENCE.md) §4

---

## 1. Conceito

Skill é uma **ação declarada** que um herói executa automaticamente quando está pronta, habilitada e o Slots de skill assigned. O jogador **não** usa skills manualmente (§56, §58) — ele as **configura**.

O jogador controla:

- **Quais** skills o herói tem.
- **Quais** estão **habilitadas** (liga/desliga por slot).
- **Em que ordem de prioridade** elas são consideradas.

O motor controla **quando** elas disparam.

> O roster inicial (12 skills, 3 por herói) está implementado em
> [`packages/config/src/skills.ts`](../packages/config/src/skills.ts) — baseado
> nas 10 abilities do OpenRpg ([referência](OPENRPG_REFERENCE.md) §4). A
> PROGRESSÃO de skills (upgrade/árvore) continua pendente (⛔ `P-022`, pós-MVP).
> O `SkillDef` do catálogo é o subconjunto MVP do modelo abaixo (sem
> `effects[]` composto ainda).

---

## 2. Slots de skill

| Regra | Valor | Fonte |
|---|---|---|
| Slots por herói no MVP | **2** | ⚠️ provisório (reaproveitado da referência) |
| Slots adicionais por estrela | — | ⚠️ **P-015** |

O `Master-Prompt.md` confirma que skills existem por herói (§9) e que os slots se relacionam com estrelas, mas **não define** a escala de estrelas nem quantos slots existem.

> **P-015** — quantos slots de skill por herói, por estrela, e se skills podem ser obtidas separadamente. Tipo C.

---

## 3. Modelo de dados

```ts
interface Skill {
  id: SkillId;
  name: string;
  iconAssetId: AssetId;

  targeting: "single" | "all_enemies" | "self" | "ally_lowest_hp";
  damageType: "physical" | "magic" | "none";

  /** Multiplicador do poder ofensivo. null para skills de buff/cura. */
  coefficient: number | null;
  /** Número de golpes. 2 = "dois golpes de 0,60". */
  hitCount?: number;

  cooldownMs: number;
  durationMs?: number;      // duração do buff/debuff, se houver

  effects: SkillEffect[];
  statusId?: StatusId;
  canCrit: boolean;
  tags: SkillTag[];         // "dano", "buff", "controle", "cura", "sustain"
}

type SkillEffect =
  | { kind: "damage"; coefficient: number; type: "physical" | "magic" }
  | { kind: "heal"; coefficient: number; from: "attack" | "specialAttack" }
  | { kind: "buff"; stat: StatId; multiplier: number; durationMs: number }
  | { kind: "debuff"; stat: StatId; multiplier: number; durationMs: number }
  | { kind: "status"; statusId: StatusId; chance: number; durationMs: number; stacks: number };
```

---

## 4. Rotação automática

O herói age sozinho. A cada vez que chega a sua vez:

```text
para slot = 1 até maxSlots:
    se skill[slot] existe
       E está habilitada
       E está fora de cooldown:
          → USA a skill
          → consome o slot, avança para a próxima ação
se nenhuma skill aplicável:
    → ATAQUE BÁSICO (coeficiente 1.0)
```

Regras:

- O ataque básico **não consome energia** e está sempre disponível como fallback.
- Cooldown é medido em **tempo de simulação**, não afetado por Velocidade de Ataque.
- Ao entrar em nova batalha, cooldowns **reiniciam prontos** (decisão técnica, ADR-001).
- Habilitar/desabilitar uma skill é **imediato** e **gratuito** — é configuração, não economia.

> **P-020** — a prioridade é fixa por ordem de slot, ou o jogador pode reordenar? A referência usa ordem fixa por slot, que é simples e determinística. Se reordenação for permitida, vira mais uma decisão de build (interessante), mas adiciona UI e validação. Não definido no `Master-Prompt.md`.

---

## 5. Categorias de skill

O tipo de skill que um herói tem **é** sua identidade. Esta taxonomia é o vocabulário para projetar os 4 heróis (P-002):

| Categoria | O que faz | Identidade de build |
|---|---|---|
| **Dano bruto** | Coeficiente alto, alvo único | Foca em um inimigo por vez |
| **Dano em área** | Coeficiente médio, todos os inimigos | Anti-grupo (relevante só no Boss) |
| **Multi-hit** | 2–3 golpes de coeficiente médio | Combina com crítico e com Garras |
| **Buff de ataque** | +% de dano por N segundos | Janela de burst |
| **Buff de defesa** | +% de mitigação por N segundos | Janela de sobrevivência |
| **Buff de velocidade** | +IAS ou +Velocidade | Mais ações = mais uptime de skill |
| **Controle** | Atordoar, retardar, silenciar | Impede o Boss de agir |
| **Cura / sustain** | Cura direta ou dreno | Sustenta a equipe no Boss |
| **Execução** | Dano extra abaixo de X% de HP | Fecha alvo enfraquecido |
| **DoT** | Dano periódico por N ticks | Ignora parte da mitigação |

### 5.1 A interação com o 1×1

Como a Torre é **sempre 1×1** (§17), skills de **área não têm valor na Torre**. Isso é uma consequência de design deliberada e precisa ser respeitada:

- Habilidades de área só valem no **Boss** (equipe × 1, §24) e no PvP (§53).
- Um herói cujo kit é 100% área é **inútil na Torre** e forte no Boss — uma escolha de build real, não um defeito.
- A UI de seleção de herói para a Torre deve **avisar** isso, ou o jogador aprende na força (§19 pede que a UI mostre o herói ativo, nível, HP, poder, equipamento, progresso e inimigo).

> Esse é um bom exemplo de por que a separação Torre/Boss (§25) precisa estar presente **no balanceamento**, não só no código.

---

## 6. Efeitos e status

Todo efeito (de skill, arma, característica ou consumível) é uma entidade com ciclo de vida explícito:

```ts
interface ActiveEffect {
  effectId: string;
  sourceId: string;        // herói, arma, item
  targetId: string;
  stat: StatId;
  mode: "multiply" | "add";
  value: number;
  expiresAtTick: number;
  maxStacks: number;
  stacks: number;
  dispellable: boolean;
}
```

### 6.1 Regras de acúmulo

Este é um ponto que a referência da lição de que — multiplicadores que **empilham** sem limite quebram o balanceamento silenciosamente.

| Efeito | Regra |
|---|---|
| Buff de stat no mesmo alvo | **renova**, não acumula |
| DoT no mesmo alvo | **renova**, não acumula |
| Atordoamento | **não acumula**; cada aplicação perde 1 ação e expira |
| Dano direto de crítico | 1,5× uma vez |
| skill proc em multi-hit | rola **uma vez por ação**, não por golpe |

> **P-021** — resistência a status por inimigo/Boss. A referência define a Sentinela como imune a Atordoamento, mas o `Master-Prompt.md` não define nada. Resistência é dado de conteúdo, nunca `if` codificado. Para o MVP, **inimigos comuns sem resistência** é o default provisório.

---

## 7. Dimensionamento

> **Nenhum valor numérico de skill é inventado aqui.** Coeficientes e cooldowns são Tipo C e dependem de P-002 e P-005.

A **estrutura** de dimensionamento que o balanceamento vai precisar:

```text
Escolher coeficiente:
    dano que o herói deve causar em N ticks
    ÷ (poder ofensivo no nível alvo)
    ÷ (mitigação média do inimigo nesse nível)

Escolher cooldown:
    tempo que leva para o efeito "doer"
    ÷ IAS típico do herói

Escolher duração de buff:
    quantas ações o buff cobre
    × intervalo de ação do herói
```

Ver [`COMBAT_SYSTEM.md` §4](COMBAT_SYSTEM.md#4-fórmulas-de-combate) para as fórmulas de base.

---

## 8. Skill e equipamento

Skills **não escalam** com o X do equipamento diretamente — elas usam o poder ofensivo do herói, que já inclui o equipamento (§37). Mas:

- **Característica de raridade** pode alterar skill (`Concentração`: −5% cooldown).
- **Traço de arma** pode disparar **quando a skill acerta** (ex.: Adaga aplica Veneno em ataque **e** em skill física).
- A UI precisa deixar isso explícito: *"esta skill também pode ativar Veneno"*.

> O §72 é explícito: *"Se alguma característica ainda não estiver definida: NÃO INVENTAR COMO REGRA OFICIAL. Registrar como PENDING."*

---

## 9. Feedback

Toda skill precisa de feedback visual e sonoro próprios. Sem isso, o jogador não sabe o que está acontecendo e o combate vira ruído.

| Momento | Feedback mínimo |
|---|---|
| Skill engatilhada | Ícone pisca, brilho na borda do slot |
| Skill disparada | Nome + VFX dedicado no alvo + som único |
| Buff aplicado | Ícone de status + número de duração |
| Buff expirado | Ícone some com fade |
| Skill em cooldown | Barra radial no slot, no HUD e no sprite |

O **ícone no sprite** é essencial: o jogador está olhando para a batalha, não para o HUD. O status precisa ser legível **no personagem**, com uma linha de política: se o jogador não conseguir ver o status de olho, o status não existe.

---

## 10. Pendências

| ID | Pendência | Bloqueia |
|---|---|---|
| `P-002` | Skills dos 4 heróis | Fase 4 |
| `P-015` | Slots de skill / relação com estrelas | Fase 4 |
| `P-020` | Prioridade fixa ou reordenável | Fase 6 |
| `P-021` | Resistência a status por inimigo | Fase 7 |
| `P-022` | Progressão de skill (upgrade, níveis, árvore) | Pós-MVP |

---

## 11. Testes relacionados

| Caso | Regra |
|---|---|
| Skill em cooldown não é usada | Determinismo de rotação |
| Habilitar/desabilitar tem efeito imediato | §56 (automação) |
| Cooldown não é afetado por IAS | [`COMBAT_SYSTEM.md` §4.3](COMBAT_SYSTEM.md#43-velocidade-vs-velocidade-de-ataque) |
| Buff renova, não acumula | §6.1 |
| Proc de arma rola uma vez por ação em multi-hit | §6.1 |
| Skill de área não altera resultado em 1×1 | §17 |
| Skill de área **é** usada no Boss com 3 heróis | §24 |
| Mesmo estado + seed ⇒ mesma sequência de skills | §64, determinismo |
