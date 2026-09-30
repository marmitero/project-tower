# Sistema da Torre

**Versão:** 0.1 · **Data:** 2026-09-30 · **Estado:** especificado, conteúdo bloqueado (P-005)
**Fonte:** §17–§22, §26–§29, §55, §62, §79, §107 do `Master-Prompt.md`

---

## 1. O que a Torre é

A Torre é o **coração do jogo**. Seus andares representam **dificuldade e progressão dos inimigos** (§22).

Ela contém: andares, dificuldade crescente, inimigos, grupos, progressão e recompensas.

> **O que a Torre NÃO tem: Boss obrigatório.** (§21, §55)

---

## 2. A regra mais importante do projeto

> **BATALHAS NORMAIS DA TORRE SÃO SEMPRE 1×1.** (§17, §79)

```text
1 herói selecionado pelo jogador  ×  1 inimigo
```

**Nunca** 3×1, 2×1, 3×3 ou múltiplos heróis atacando simultaneamente. Isso é uma **regra de arquitetura**, não preferência de conteúdo — e é garantida por teste automatizado dedicado ([`TESTING.md`](TESTING.md), `INV-01`).

### 2.1 A regra abolida

> *"andar 10 = boss / andar 20 = boss / andar 30 = boss"*
>
> **Essa regra está ABOLIDA.** (§21, §55)

A Torre **não** possui boss em andar fixo. A lista `tower.bossInTower` na configuração é, por isso, uma **lista vazia** — e existe no código justamente para tornar a abolição explícita e testável.

Os andares definem **apenas** dificuldade, inimigos, progressão e recompensas.

---

## 3. Estrutura de um andar

```ts
interface TowerFloor {
  index: number;                 // 1, 2, 3...
  name: string;                  // "Andar 7 — Galeria das Sombras"

  /** Requisito para acessar. Nível do REI, não do herói (§46). */
  requirement: {
    kingLevel: number;
    previousFloorCleared?: boolean;   // se presente, exige vitória mínima
  };

  /** Nível dos inimigos deste andar. */
  enemyLevel: number;

  /** Pool de inimigos possíveis neste andar. */
  enemyPool: { enemyId: string; weight: number }[];

  /** Recompensas — valores vindos da configuração, nunca hardcoded. */
  rewards: {
    kingXp: number;
    heroXpBase: number;
    coin: number;
  };

  /** Aparência: tileset + Variant. */
  visual: { tilesetId: AssetId; variantId: string };
}
```

> **P-005** — o número de andares, a curva de `kingLevel`, a curva de `enemyLevel`, a composição dos pools e os valores de recompensa **não estão definidos** no `Master-Prompt.md`. O §22 exige que existam, mas não diz quantos nem com que curva. Tipo C.

> **P-006** — os inimigos (nome, stats, papel, tipo físico/mágico) também não estão definidos. O §18 e o §107 implicam que **existem tipos de inimigo com perfil distinto** (físico vs. mágico vs. outro), porque é isso que faz a escolha de herói ser uma decisão — mas nenhum inimigo específico é nomeado.

---

## 4. O loop da Torre

Fluxo canônico do §26:

```text
ENTRAR NA TORRE
      ↓
SELECIONAR ANDAR
      ↓
SELECIONAR HERÓI
      ↓
ENTRAR EM COMBATE
      ↓
1×1
      ↓
INIMIGO DERROTADO
      ↓
XP + COIN + (5%? Equipamento)
      ↓
ANIMAÇÃO "PROCURANDO..."
      ↓
~3 SEGUNDOS
      ↓
NOVO INIMIGO
      ↓
NOVA BATALHA
      ↓
REPETIR
```

Cada iteração é uma **unidade independente**: 1 herói × 1 inimigo. O que muda entre iterações é a **progressão** (XP, loot, níveis) e o **herói escolhido**.

---

## 5. O estado "Procurando"

### 5.1 Requisitos

| Requisito | Fonte |
|---|---|
| Existe entre uma batalha e outra | §27 |
| Dura **aproximadamente 3 segundos** | §27 |
| Tem **animação**, não só texto "Aguardando..." | §28 |
| O jogador **pode navegar** durante ele | §29 |
| A navegação **não quebra** o estado | §29 |

### 5.2 Implementação

O §27 é explícito: *"Não precisa ser exatamente 3.000ms. Pode existir pequena variação controlada."* O exemplo dado pelo próprio MP:

```text
2.7s  /  3.0s  /  3.2s
```

```ts
searching: {
  startedAt: number;        // timestamp persistido
  durationMs: number;       // sorteado em [2700, 3200]
}
```

> **Decisão técnica (ADR-007):** `SEARCHING` é estado do **game loop**, com timestamp **persistido**, não um `setTimeout` de componente. Três consequências diretas:
> 1. Trocar de tela não reinicia o timer.
> 2. Fechar e reabrir a aba retoma o estado corretamente.
> 3. O offline progress reaproveita exatamente a mesma máquina de estados.

### 5.3 A animação

O §28 é categórico: *"Não simplesmente mostrar 'Aguardando...'".* O tempo de espera tem que virar **parte da experiência**.

O que o MP lista como possibilidade:

- herói aguardando
- olhar para os lados
- animação de espera
- efeito visual
- ícone de procura
- movimento ambiental
- partículas
- indicação de busca
- pequena animação de descoberta

**Assets disponíveis:** o pack de sprites tem 6 folhas de animação por personagem (`idle`, `walk`, `run`, `attack`, `hurt`, `death`), o que permite uma animação de espera real — inclusive com o herói olhando para os lados se houver frames Idle distintos.

> **P-028** — a animação de procura exata (o que ela mostra, duração, easing) não é especificada. É decisão de **direção de arte/feel**, não de regra.

### 5.4 Navegar durante a procura

O §29 é direto: *"O jogador pode navegar pela interface durante o estado de procura. A busca não deve quebrar o fluxo."*

O jogador pode abrir, durante `SEARCHING`:

- inventário
- personagem
- perfil
- equipamentos
- configurações

E o timer **deve continuar ou ser tratado de maneira consistente** — o projeto escolheu **continuar** (`searching.pausesOnNavigation = false`), porque parar transformaria cada menu em um botão de pausa e destruiria a sensação de *"o reino continua funcionando enquanto eu administro"* (§111).

> **P-012** — comportamento com **duas abas do mesmo jogador** e com perda de foco não é definido. Sem política explícita, dois timers paralelos geram inconsistência entre o que está rodando e o que é salvo. Reaproveitar a lição do repositório de referência: uma sessão ativa por conta, com cursor de lote no servidor.

---

## 6. Escolha de andar

O §19 exige que o jogador **selecione** qual herói da equipe é o combatente atual. O §107 reforça que a pergunta central é:

> *"Qual dos meus heróis é melhor para continuar avançando?"*

Decisões técnicas:

| Decisão | Valor | Razão |
|---|---|---|
| Seleção de andar | **Manual** | Deixa a escolha com o jogador; §19 |
| Avanço automático de andar | **Desativado** | §19: "não assumir" |
| Andar selection persists | Sim | O jogador não deveria reconfigurar a cada sessão |
| Herói ativo | **Escolhido**, nunca presumido | §19 |

### 6.1 Nunca presumir o herói

> *"Não assumir automaticamente que o primeiro personagem sempre luta."* (§19)

Consequências de UI:

- O herói ativo é **sempre visível** na HUD, com destaque.
- Trocar de herói ativo é **uma ação de um toque** durante a hunt.
- Trocar **não reinicia** a hunt — o novo herói entra na próxima batalha 1×1.

### 6.2 A decisão que o andar cria

Para que a escolha de herói seja uma decisão **real** (§18, §107), os inimigos precisam diferir. A estrutura de inimigo precisa de:

```ts
interface EnemyTemplate {
  id: string;
  name: string;
  role: "balanced" | "tank" | "agile" | "caster" | ...;
  damageType: "physical" | "magic";
  resistances?: Partial<Record<StatusId, number>>;
  /** Multiplicadores de perfil aplicados aos stats-base. */
  roleMultipliers?: Partial<Record<StatId, number>>;
}
```

> **P-006** — sem a lista de inimigos com perfis, a Torre não gera a decisão que o §107 exige. É uma dependência direta de P-005.

A estrutura de `role` e os multiplicadores são reaproveitados do repositório de referência (ADR-001) como decisão técnica Tipo B.

---

## 7. Progressão na Torre

Três eixos independentes:

```
Nível do Rei    ──→  desbloqueia slots (§15, §46)
                 ──→  acesso a andares mais altos

Nível do herói  ──→  poder de combate contra o andar atual

Equipamento     ──→  poder de combate, com Nota e Poder independentes (§34)
```

O andarRecommended é calculado comparando o **poder efetivo do herói ativo** com o **poder efetivo do inimigo daquele andar**. A UI mostra esse cálculo:

```text
Andar 12 — Slime de Cinza (Nv. 11)
Seu herói: Aventureiro, Nv. 18, Poder 1.240
Inimigo:   Poder 980
→ Você vence com folga. O Andar 13 é recomendado.
```

> **P-005** — a fórmula de "poder efetivo do inimigo" depende dos stats de inimigo, que não estão definidos.

---

## 8. Derrota

O §26 e o §56 não especificam em detalhe o que acontece em derrota, e a referência do repositório vizinho tem uma **decisão incompatível** (ela retorna ao lobby e **não** gera recompensa offline, enquanto este projeto **tem** offline progress).

Decisões técnicas coerentes com este projeto:

| Situação | Comportamento |
|---|---|
| Herói cai | Fim da batalha 1×1. Sem revive no MVP |
| O loop continua? | ⚠️ **P-019** — ver abaixo |
| XP/coin já conquistados | **Permanecem** (recompensa é do inimigo derrotado) |
| Herói revive com HP cheio | Na próxima batalha |
| Herói fica indisponível | Se não há outro na equipe, o jogador precisa trocar |

> **P-019** — a política de derrota (o loop continua com outro herói? o herói caído fica fora até curar? quanto tempo?) é **decisão de gameplay** e não está no MP. O MP diz apenas que o jogador "observa" e que o combate é automático.

> **P-020b** — o §20 diz que o XP é dividido entre os membros da equipe, mas **não diz** se um herói caído continua consumindo a parte dele do XP. A leitura mais óbvia é que não, mas isso é Tipo C.

---

## 9. Visual da Torre

Cada andar tem uma identidade visual. O pack de sprites oferece 65 tiles de dungeon:

- `tileset/` — pisos, paredes, portas
- `tileset/environment/` — props, decoração, tiles animados (água, braseiros), sombras

A diferenciação visual entre andares é o que dá a sensação de "subir". Sem ela, a Torre vira uma lista repetitiva.

> **P-028** — mapeamento de andares para variantes de tileset. Decisão de direção de arte.

---

## 10. Checklist de pronto

- [ ] 1×1 garantido por teste automatizado (§79) — **gate de release**
- [ ] Nenhum boss em andar fixo da Torre (§55) — teste
- [ ] Fluxo completo: entrar → andar → herói → 1×1 → vitória → procura → próximo
- [ ] `SEARCHING` com animação real, ~3s, configurável
- [ ] Navegar durante `SEARCHING` não reinicia nem pausa
- [ ] Fechar/reabrir a aba durante `SEARCHING` retoma corretamente
- [ ] Herói ativo é escolhido, nunca presumido
- [ ] Trocar herói ativo não reinicia a hunt
- [ ] Recompensa: XP Rei + XP herói (÷ time) + Coin + 5% equipamento
- [ ] Nenhum fragmento de herói vem de inimigo comum — **teste** (§12)
- [ ] Andar mostra poder do herói vs. poder do inimigo
- [ ] Cada andar tem identidade visual distinta

---

## 11. Pendências

| ID | Pendência | Bloqueia |
|---|---|---|
| `P-005` | Número de andares, curvas, pools, recompensas | **Fase 7** |
| `P-006` | Inimigos: stats, papéis, resistências | **Fase 7** |
| `P-012` | Política multi-aba / blur | Fase 8 |
| `P-019` | Política de derrota e HP entre batalhas | Fase 8 |
| `P-020b` | Herói caído recebe XP? | Fase 8 |
| `P-028` | Identidade visual e animação de procura | Fase 8 |

---

## 12. Referências

- [`COMBAT_SYSTEM.md`](COMBAT_SYSTEM.md) — o motor que executa o 1×1
- [`AUTOMATION_SYSTEM.md`](AUTOMATION_SYSTEM.md) — o loop idle que envolve a Torre
- [`BOSS_SYSTEM.md`](BOSS_SYSTEM.md) — o que a Torre explicitamente **não** contém
- [`PENDING_RULES.md`](PENDING_RULES.md) — P-005, P-006, P-019
