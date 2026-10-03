# Sistema de Combate — Battle Engine

**Versão:** 0.1 · **Data:** 2026-09-30 · **Estado:** especificado, não implementado
**Fonte:** §17, §24, §25, §60, §64–§66, §79, §80 do `Master-Prompt.md`

---

## 1. Princípio arquitetural

> **O Battle Engine é independente da apresentação.** (§64)

Ele processa:

```text
Battle State
  + Combat Rules
  + Character Stats
  + Enemy Stats
  + Skills
  + Equipment
       ↓
  Battle Result / Events
```

O renderer **apenas apresenta os eventos**. Ele não decide nada.

Consequência prática: o engine é um pacote TypeScript puro, sem React, sem DOM, sem Phaser, sem `setTimeout`, sem acesso a rede. Roda em Node para teste e no browser para jogar — **o mesmo código** (ADR-005, ADR-008).

```ts
// packages/engine — contrato
export function simulate(
  state: BattleState,
  config: GameConfig,
  seed: number,
  maxTicks: number,
): BattleEvent[];   // determinístico: mesmo estado + seed ⇒ mesma saída
```

---

## 2. Os dois modos de batalha

O §65 exige que o sistema suporte pelo menos dois modos, **sem duplicar a lógica**. Isso é feito com composição inicial, não com duas implementações.

### 2.1 `TowerBattle` — 1×1

```text
Herói A          VS          Inimigo X
(nível 20)                   (andar 40)
```

- **Exatamente 1** heróiVS **exatamente 1** inimigo.
- É o único modo usado na progressão da Torre.
- **Nunca** 3×1, 2×1 ou 3×3.

### 2.2 `BossBattle` — equipe × 1

```text
Herói A  ┐
Herói B  ├──────  VS  ──────  BOSS
Herói C  ┘
```

- **Toda a equipe** participa, atacando simultaneamente (§24).
- O Boss pode ter ataques de área, fases, mecânicas próprias e resistências.

### 2.3 A distinção é normativa

> *"Esta distinção deve estar presente: na lógica, na documentação, no Battle Engine, na UI, nos testes e no balanceamento."* (§25)

| Aspecto | Torre | Boss |
|---|---|---|
| Heróis | 1 | 1–3 |
| Inimigos | 1 | 1 |
| Composição | `1 × 1` | `N × 1` |
| Fases de origem | FASE 6 | FASE 12 |
| Fragmentos | ❌ **proibido** (§12) | ✅ fonte principal |
| Balanceamento | calibrado para 1×1 | escala com o tamanho da equipe |

---

## 3. Invariantes que o engine DEVE garantir

Estas são as invariantes testáveis. Se qualquer uma falhar, o build falha.

| ID | Invariante | Teste |
|---|---|---|
| `INV-01` | `TowerBattle` sempre resolve com exatamente 1 herói e 1 inimigo | `tower-battle-size.test.ts` |
| `INV-02` | Nenhum inimigo comum da Torre gera fragmentos de personagem | `fragment-source.test.ts` |
| `INV-03` | Combate com a mesma seed e o mesmo estado produz a mesma sequência de eventos | `combat-determinism.test.ts` |
| `INV-04` | O engine não importa `react`, `phaser` nem módulos de DOM | `engine-purity.test.ts` |
| `INV-05` | Todo combate termina com exatamente um desfecho (`won` ou `lost`) | `combat-termination.test.ts` |
| `INV-06` | Nenhum estado intermediário fica mutado após o fim do combate | `combat-purity.test.ts` |
| `INV-07` | Um herói nunca ataca a si mesmo | `combat-invariants.test.ts` |
| `INV-08` | Recompensas são emitidas **uma única vez** por combate | `reward-idempotency.test.ts` |

> `INV-01` é o teste que o §79 exige nominalmente e é o **gate de release** mais importante do projeto.

---

## 4. Fórmulas de combate

As fórmulas abaixo são **herdadas do repositório de referência** (`COMBAT_DESIGN.md` v0.2), aproveitadas como **decisão técnica Tipo B** (ADR-001). Elas são coerentes com o `Master-Prompt.md` e não conflitam com nenhuma regra dele.

### 4.1 Dano

```text
DanoBase = PoderOfensivo × CoeficienteDaAção × 100 / (100 + DefesaAlvo)
DanoFinal = max(1, floor(DanoBase × ModificadoresDeDano))
```

- `PoderOfensivo` = **Ataque** contra **Defesa**, ou **Ataque Especial** contra **Defesa Especial**.
- `CoeficienteDaAção` = 1,0 para ataque básico; skills e traços declaram o seu.
- Defesa nunca fica negativa. Com Defesa 100 o alvo leva metade; com 300, um quarto. A mitigação **retorna com saturação** — reduz retornos sem tornar defesa infinita.
- Cálculo em precisão decimal, arredondamento **para baixo** ao aplicar HP.
- Golpe que acertou causa **no mínimo 1** de dano.

> **ADR-021 — a constante 100 cresce com o nível do alvo:** `K = 100 + 5 × (nível − 1)` (`combat.defenseConstantPerLevel`). Defesa e ataque crescem juntos com o nível; com K fixo, no Nv 5.000 a Defesa saturaria (mitigação ≈ 100%) e o combate deixaria de escalar. O tipo de dano do atacante escolhe o par Ataque×Defesa ou Ataque Esp.×Def. Esp.

### 4.2 Crítico

- `ChanceCríticaEfetiva = min(0,75, críticoDoPersonaço + modificadores)`
- Crítico multiplica o dano **já mitigado** por **1,5**.

O teto de 75% é uma decisão técnica herdada que mantém o build de crítico controlável.

### 4.3 Velocidade vs. Velocidade de Ataque

Dois atributos separados, com funções distintas:

| Atributo | Função | Fórmula |
|---|---|---|
| **Velocidade** | Ordem **inicial** de ação no início do combate | maior age primeiro |
| **Velocidade de Ataque (IAS)** | Recorrência **após** a primeira ação | `intervalo = T₀ / (1 + IAS)`, `T₀ = 2000 ms` |

Limite de IAS: **−50% a +100%** → intervalo de 4000 ms a 1000 ms. Isso impede loops extremos de ataque sem remover builds de velocidade.

**Desempate determinístico:** maior Velocidade → menor posição de equipe → menor ID. Nunca sorteado.

### 4.4 Alvos

- **Ataque básico de alvo único:** inimigo com **menor % de HP restante**.
- Empate: menor HP absoluto → menor ID.
- **Skill de área:** aplica à lista de alvos declarada pela skill.
- **Cura:** aliado vivo com menor % de HP.

### 4.5 Automação de skills

Quando chega a vez de um personagem:

```text
para cada slot de skill, em ordem crescente:
   se skill está habilitada E em cooldown → usa
se nenhuma estiver pronta → ataque básico
```

O ataque básico não consome energia. Cooldowns são medidos em **tempo de simulação** e **não** são reduzidos por IAS.

---

## 5. Eventos de combate

O §66 define a lista de eventos. O engine **emite**; o renderer **constrói** o feedback visual.

```ts
type BattleEvent =
  | { type: "battle_started"; combatantIds: string[] }
  | { type: "attack_started"; actorId: string; skillId?: string }
  | { type: "skill_used"; actorId: string; skillId: string }
  | { type: "damage_dealt"; sourceId: string; targetId: string; amount: number; kind: "physical" | "magic" | "dot" }
  | { type: "critical_hit"; sourceId: string; targetId: string; amount: number }
  | { type: "status_applied"; targetId: string; statusId: string; stacks: number; durationMs: number }
  | { type: "status_removed"; targetId: string; statusId: string; reason: "expired" | "dispel" | "death" }
  | { type: "heal_dealt"; sourceId: string; targetId: string; amount: number }
  | { type: "character_damaged"; targetId: string; currentHp: number; maxHp: number }
  | { type: "character_defeated"; targetId: string }
  | { type: "enemy_damaged"; targetId: string; currentHp: number; maxHp: number }
  | { type: "enemy_defeated"; targetId: string }
  | { type: "battle_won"; rewardBundleId: string }
  | { type: "battle_lost"; }
  | { type: "battle_finished"; durationMs: number; ticks: number };
```

Todos carregam `tick` e `elapsedMs`, o que permite ao renderer **interpolar** entre eventos em vez de reagir a eles — a base de uma animação de combate responsiva e não-linear.

### 5.1 Eventos estendidos (decisão técnica)

Três eventos adicionais, que o §66 não lista mas a apresentação exige:

| Evento | Por quê |
|---|---|
| `effect_triggered` | Traços de arma e características precisam de feedback visual próprio (Contracorte, Veneno, Atordoamento) |
| `damage_mitigated` | Mostra quanto a defesa absorveu — ensina o sistema ao jogador |
| `turn_started` | Marca início de ação; usado para sincronizar áudio e animação |

O §66 lista eventos **mínimos**, não exclusivos.

---

## 6. O combate como apresentação

O §60 é severo sobre isto: a batalha **precisa ser visualmente percebida**. Não pode ser:

```text
Hero: 120 HP
Enemy: 300 HP
-15
-20
-25
```

como experiência principal. Os números podem existir como *suplemento*, mas precisam existir:

sprites · animações · ataques · impactos · efeitos · dano · morte · skills · movimento · feedback

### 6.1 Pipeline de apresentação

```text
  BattleEvent[]           (do engine, determinístico)
        ↓
  EventQueue              (ordena, agrupa, escalona no tempo)
        ↓
  Timeline                (evento → timestamp em ms, com curva de easing)
        ↓
  Phaser Renderer          (sprite, tween, VFX, número, shake, flash)
        ↓
  HUD (React)             (HP bars, status, log — atualizada por state, não por evento)
```

A **decoupling** importa: se o renderer calculasse dano, o balanceamento quebraria toda vez que alguém mexesse num efeito visual.

### 6.2 Mapeamento evento → feedback

| Evento | Feedback |
|---|---|
| `attack_started` | Avatar avança (lunge) na direção do alvo |
| `damage_dealt` | Hit sprite + número + tremor proporcional ao dano |
| `critical_hit` | Flash branco, número maior, partícula extra, tremor reduzido + shake de tela |
| `damage_mitigated` | Número menor + ícone de escudo (mostra a defesa funcionando) |
| `status_applied` | Ícone de status sobre o sprite |
| `heal_dealt` | Número verde + brilho |
| `enemy_defeated` | Sprite pisca duas vezes, depois desaparece com dissolução |
| `effect_triggered` | VFX do traço (veneno = bolhas, stun = estrelas, contracorte = brilho de escudo) |
| `battle_won` / `battle_lost` | Banner + transição para o estado seguinte |

### 6.2.1 Execução na cena (ADR-029)

A cena **puxa** o estado a cada frame (`render/battleSource.ts`) em vez de receber empurrões; os eventos continuam chegando pela fila (`battleFeedbackQueue`). Eventos de ação (`attack_started`, `skill_used`) identificam quem age em **`actorId`**; os de dano, em `sourceId` — a cena lê os dois. Efeitos por tipo de dano: físico → corte + faísca; mágico → fogo; contínuo → faísca; skill mágica → raio no adversário; crítico → faísca 1,5×; morte → estouro; cura/reviver → cura. Tudo é tabela em `BattleRenderer.ts`/`vfxAtlas.ts`: o renderer não calcula dano.

### 6.3 Escala e legibilidade

O combate precisa ser legível em **tela de celular**. Isso significa:

- Números com tamanho escalado por importância, não fixo.
- Feedback de crítico **distinguível sem cor** (tamanho + som + forma) — requisito de acessibilidade.
- Opção de **reduzir efeitos** (§68, acessibilidade) que remove partículas e tremor mas **mantém** todos os feedbacks essenciais.
- O sprite nunca pode ser a única conveyora de informação.

---

## 7. Inimigos e o alvo da IA

### 7.1 Alvo do inimigo

O inimigo de `TowerBattle` enfrenta **um único herói** — não há escolha de alvo a fazer. Em `BossBattle`, o Boss pode:

- Focar o herói com menor % de HP (padrão de ameaça)
- Ter fase que muda a prioridade
- Ter ataque de área

> **P-018** — comportamento de IA de Boss (fases, prioridades, mecânicas) é conteúdo de design, não regra. O §23 lista as estruturas possíveis (Arena, Dungeon, World, Guilda, Evento) sem definir comportamento. Ver [`BOSS_SYSTEM.md`](BOSS_SYSTEM.md).

### 7.2 Sobreviventes entre batalhas ✅ (⛔ P-019 fechada — ADR-020)

Política vigente (ADR-020, 2026-10-03):

- **HP persiste** entre as batalhas 1×1 da mesma caçada (`Hero.currentHp`, ADR-020):
  a batalha nasce com o HP atual do herói (`startHp`), nunca com o máximo.
- **Vitória mantém** o HP restante; **derrota zera** (`currentHp = 0`, herói caído)
  e encerra a caçada (`hunt = "defeated"` — ADR-017).
- **A chain automática NÃO cura**: a próxima batalha continua do HP do fim da
  anterior. É a tensão do andar: o jogador decide se continua ou recua.
- **Regeneração em PROCURANDO** (ADR-021): `combat.regenOnSearchingPctPerSec` (5%/s ≈ 15% do HP por procura de ≈ 3 s) recupera o herói **vivo** entre as lutas. Não reanima herói caído. Isso refina "a chain não cura": a chain não cura *instantaneamente*, mas o idle on-curve se sustenta.
- **Subir de nível conserva o HP perdido** (o HP máximo ganho entra no HP atual; herói caído continua caído).
- **Cooldowns ficam prontos** ao iniciar a próxima batalha.
- **Buffs/debuffs/DoT expiram** no fim da batalha.

Recuperação é **ato do jogador**, nunca automática:

| Ato | API | Efeito |
|---|---|---|
| Recomeçar a caçada (após derrota) | `GameState.restartHunt()` | cura o herói ativo e entra na Torre |
| Descansar | `GameState.restActiveHero()` | cura e pausa (`hunt = {kind:"paused", reason:"rest"}`) — o loop não reativa sozinho |
| Retomar | `GameState.beginSearch()` | volta ao searching normal |

A cura é governada por **`config.combat.healOnHuntRestart`** (default `true`;
`false` = modo duro, sem cura — arquitetura editável). Saves v1 são migrados
para v2 com `currentHp = stats.hp` (o save antigo não tinha o campo).

> **P-019** — RESOLVIDA (ADR-020). Herdado da referência e ratificado: o MP é
> silencioso sobre HP entre batalhas; a tensão do loop depende desta política.

---

## 8. Determinismo e RNG

O engine usa **PRNG com seed explícita**:

```ts
// xorshift128 — determinístico, rápido, sem dependências
class Prng {
  constructor(seed: number)
  next(): number            // [0, 1)
  int(minInclusive: number, maxInclusive: number): number
  pick<T>(items: readonly T[]): T
  weightedIndex(weights: readonly number[]): number
}
```

Regras:

1. **Toda batalha recebe uma `seed` persistida.** Recarregar a página e reexecutar a mesma batalha com a mesma seed dá o mesmo resultado.
2. **RNG é derivado, não global.** `rngFor("loot", battleId)` e `rngFor("combat", battleId)` são fluxos independentes — mudar a quantidade de rolagens de loot não altera o combate.
3. **Nada de `Math.random()` dentro do engine.** Proibido por lint.

O determinismo é o que permite: testar fórmulas sem mocks, reproduzir bugs de loot, auditar transações no servidor e — no futuro — validar que o cliente não fabricou resultados.

---

## 9. Simulação de combate no servidor

Reaproveitando o desenho do repositório de referência (ADR-008):

- Edge Functions são **endpoints curtos**, não um game server sempre ligado.
- Um comando autenticado `advance_battle` aplica um **lote fixo** de simulação (ex.: 5 s).
- O cliente **não envia** tempo decorrido, estado ou resultado.
- O lote é **idempotente**: `requestId` único + `expected_revision`.
- `GET` **nunca** avança estado.

A política de produto (offline com limite de 2h/8h) e a viabilidade técnica dessa abordagem são resolvidas na Fase 11. Ver [`AUTOMATION_SYSTEM.md`](AUTOMATION_SYSTEM.md).

---

## 10. O que NÃO fazer

Lista de erros de combate explicitamente proibidos (§105):

- ❌ Fazer batalha **só por números** (§60)
- ❌ **3×1 na Torre** (§17, §79)
- ❌ **Boss automático nos andares 10/20/30** (§21, §55)
- ❌ Colocar **toda a lógica dentro do React** (§63)
- ❌ Confiar no cliente para o resultado do combate (§86)
- ❌ Hardcodar probabilidades espalhadas (§32, §33)

E o teste de sanidade de cada batalha, antes de considerar pronta (§60, §106):

> *"Isso parece um jogo?"* — Se a resposta é não, melhorar.

---

## 11. Checklist de pronto

O módulo de combate está pronto quando:

- [ ] `packages/engine` roda em Node sem nenhuma dependência de UI
- [ ] `TowerBattle` resolve 1×1, garantido por teste
- [ ] `BossBattle` resolve N×1 com ataque simultâneo
- [ ] Mesma seed + mesmo estado ⇒ mesma saída
- [ ] Todos os eventos do §66 são emitidos
- [ ] Renderer produz feedback visual para cada evento
- [ ] Fórmulas de dano, crítico, IAS e alvo estão unit-testadas
- [ ] O tempo de um combate 1×1 é mensurável e está na faixa alvo
- [ ] A animação de morte, crítico e impacto é distinguível em tela pequena
- [ ] Opção "reduzir efeitos" mantém legibilidade
- [ ] Nenhuma recompensa é emitida duas vezes para o mesmo combate

Ver [`TESTING.md`](TESTING.md) e [`PERFORMANCE.md`](PERFORMANCE.md).
