# Sistema da Torre

**Versão:** 0.2 · **Data:** 2026-10-03 · **Estado:** ✅ implementado (FASE 7, ADR-021/022) — P-005/P-006/P-009 resolvidas
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

## 3. Estrutura de um andar ✅ (ADR-021)

Um andar é **dado puro** (`FloorDef`, `packages/config/src/tower.ts`) — serializável e editável pelo futuro painel (ADR-022). A lista viva é `config.tower.floors`.

```ts
interface FloorDef {
  index: number;               // 1..N, contíguo
  name: string;                // "Entrada da Torre", "Pináculo 3"...
  minLevel: number;            // início da faixa de nível do REI
  maxLevel: number;            // fim da faixa
  enemyLevel: number;          // nível dos inimigos (padrão = minLevel)
  requiredKingLevel: number;   // §46 — nível do REI (padrão = minLevel)
  pool: { enemyId: string; weight: number }[];
  visual: { theme: string; enemyTint: number | null };   // 0xRRGGBB
}
```

### 3.1 Faixas (decisão do usuário, 2026-10-03)

| Andar | Faixa do Rei | Inimigos (nível) | | Andar | Faixa do Rei | Inimigos (nível) |
|---:|---|---:|---|---:|---|---:|
| 1 | 1–10 | 1 | | 8 | 1000–1500 | 1000 |
| 2 | 10–25 | 10 | | 9 | 1500–2500 | 1500 |
| 3 | 25–50 | 25 | | **10** | **2500–5000** | **2500** |
| 4 | 50–100 | 50 | | 11 | 5000–5500 | 5000 |
| 5 | 100–250 | 100 | | 12 | 5500–6000 | 5500 |
| 6 | 250–500 | 250 | | 13 | 6000–6500 | 6000 |
| 7 | 500–1000 | 500 | | … | **1 andar por 500 níveis** | … |
| | | | | 40 | 19500–20000 | 19500 |

Teto de nível: **20.000** (Rei e heróis). **O nível do inimigo é o nível-base da faixa** — o jogador que quer subir de 2.500 a 5.000 enfrenta **só** inimigos nível 2.500 (andar 10); o andar seguinte (5.000) só abre aos 5.000.

### 3.2 Nomes e visual

Andares 1–10: Entrada da Torre, Porão Úmido, Galeria das Ossadas, Catacumbas Antigas, Salão dos Ecos, Fornalha Esquecida, Jardim Gélido, Ninho das Sombras, Corredor Sangrento, Câmara dos Mil Passos. 11+: "Pináculo N" (N = andar − 10). `visual.enemyTint` multiplica a cor do sprite do inimigo (andares 1–4 sem tintura; 5–8 frio; 9–12 quente; 13–20 violeta; 21–30 carmesim; 31–40 jade) — a identidade por andar sem arte nova (P-028 segue aberta para tilesets).

### 3.3 Pool e sorteio

Todo andar tem **tanque + dano + veloz** desde o 1; **mago** a partir do 3; **elite** (raro, ≈ 4–8% do sorteio) a partir do 9. O inimigo de cada luta é sorteado por peso, **deterministicamente** pela seed da batalha (`pickEnemyForFloor`). Plano padrão em `DEFAULT_POOL_PLAN`; depois de gerado, a verdade é `FloorDef.pool`.

| Inimigo | Papel | Dano | Janela padrão |
|---|---|---|---|
| Gosma (`slime`) | Tanque | físico | andar 1+ |
| Goblin (`goblin`) | Dano | físico | andar 1+ |
| Morcego (`bat`) | Veloz | físico | andar 1+ |
| Esqueleto (`skeleton`) | Equilibrado | físico | andar 2+ |
| Morcego Tóxico (`toxicbat`) | Mago | mágico | andar 3+ |
| Gosma Gélida (`frostslime`) | Tanque (Def. Esp. alta) | mágico | andar 4+ |
| Orc (`orc`) | Dano | físico | andar 5+ |
| Orc Flamejante (`fireorc`) | Mago | mágico | andar 6+ |
| Esqueleto Sangrento (`bloodskeleton`) | Dano | físico | andar 7+ |
| Goblin Sombrio (`shadowgoblin`) | Elite | mágico | andar 9+ |
| Arqueiro de Elite (`elitearcher`) | Elite | físico | andar 11+ |

`boss` e `slimeking` estão **reservados à FASE 12**: boss é atividade separada, nunca da Torre (§21/§55).

> **P-005 / P-006 — RESOLVIDAS** (ADR-021). Todos os números acima são **config editável**, não regra de código.

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
| Andar selecionado persiste | Sim (`tower.currentFloor`, normalizado no load) | O jogador não reconfigura a cada sessão |
| Gate | `king.level ≥ requiredKingLevel` (`TowerLockedError`) | §46 |
| Quando vale | Na **próxima** luta (a em curso termina no andar em que começou) | Consistência da recompensa |
| Herói ativo | **Escolhido**, nunca presumido | §19 |

### 6.1 Nunca presumir o herói

> *"Não assumir automaticamente que o primeiro personagem sempre luta."* (§19)

Consequências de UI:

- O herói ativo é **sempre visível** na HUD, com destaque.
- Trocar de herói ativo é **uma ação de um toque** durante a hunt.
- Trocar **não reinicia** a hunt — o novo herói entra na próxima batalha 1×1.

### 6.2 A decisão que o andar cria ✅

Para que a escolha de herói seja uma decisão **real** (§18, §107), os inimigos diferem em **papel** e **tipo de dano** (`EnemySeed`, `packages/config/src/enemies.ts`):

| Papel | Perfil | Custo médio de vida a um herói on-curve* | Luta |
|---|---|---:|---:|
| Veloz (`swift`) | vida baixa, muitos golpes pequenos | ≈ 8% | ≈ 8 s |
| Tanque (`tank`) | vida e defesa altas, golpe fraco | ≈ 9–10% | 14–19 s |
| Equilibrado (`balanced`) | sem ponto fraco | ≈ 10% | ≈ 13 s |
| Mago (`caster`) | dano **mágico** (Atq. Esp. × Def. Esp.) | ≈ 12–13% | 8–10 s |
| Dano (`dps`) | golpe forte | ≈ 13–14% | 10–12 s |
| Elite (`elite`) | multiplicador de força, raro | ≈ 19% | ≈ 13 s |

\* nível do herói = nível do inimigo; média das 4 classes; ver [`BALANCE_REPORT.md`](BALANCE_REPORT.md).

- **Físico × mágico:** heróis e inimigos têm `basicAttackType`. Físico enfrenta Defesa; mágico enfrenta Defesa Especial. A Gosma Gélida (Def. Esp. alta) segura o herói mágico; o Orc Flamejante (Def. Esp. alta, Def. baixa-média) é mais vulnerável ao físico.
- **Mesma base dos heróis:** os stats do inimigo saem da mesma função de 6 atributos (`growthFromAttributes`, base OpenRpg), então herói e inimigo escalam juntos do Nv 1 ao 20.000.
- **Ajuste fino:** `statMultiplier` por inimigo + `tower.enemyHpMultiplier/enemyAttackMultiplier/enemyStatMultiplier` globais. Calibração feita por simulação (`balance.ts`), não "no olho".

---

## 7. Progressão na Torre ✅ (P-009 — ADR-021)

Três eixos independentes:

```text
Nível do Rei    ──→  desbloqueia slots (§15, §46)
                 ──→  acesso a andares (faixa de nível)

Nível do herói  ──→  poder de combate contra o andar atual

Equipamento     ──→  poder de combate, com Nota e Poder independentes (§34) — FASE 9
```

### 7.1 Curvas (dados editáveis — `CurveDef`)

| Curva | Fórmula | Parâmetros padrão |
|---|---|---|
| XP necessário (Rei e herói) para sair do nível N | `floor(base × (N + offset)^expoente)` | base 20 · offset 30 · expoente **1,35** |
| XP por abate (Rei e herói-total, em função do nível do inimigo E) | `floor(base × (E + offset)^expoente)` | base 50 · offset 3 · expoente 0,95 |
| Coin por abate (⛔ P-008 provisória) | idem | base 12 · offset 3 · expoente 1,0 |

O expoente da necessidade (1,35) é maior que o da recompensa (0,95): **cada nível custa mais abates que o anterior** — a "curva que desacelera". Dentro de um andar a recompensa por abate é constante (inimigos de nível fixo), então o ritmo piora a cada nível até o jogador mudar de andar.

### 7.2 Ritmo esperado (ciclo luta + procura ≈ 15 s)

| Andar | Faixa | Abates | Tempo | Acumulado |
|---:|---|---:|---:|---:|
| 1 | 1–10 | 118 | 30 min | 30 min |
| 2 | 10–25 | 96 | 24 min | 54 min |
| 3 | 25–50 | 124 | 31 min | 1,4 h |
| 4 | 50–100 | 246 | 1,0 h | 2,4 h |
| 5 | 100–250 | 978 | 4,1 h | 6,5 h |
| 6 | 250–500 | 1.737 | 7,2 h | 14 h |
| 7 | 500–1000 | 4.386 | 18 h | 32 h |
| 8 | 1000–1500 | 4.422 | 18 h | 50 h |
| 9 | 1500–2500 | 11.247 | 47 h | 97 h |
| **10** | **2500–5000** | **40.249** | **168 h** | 265 h |
| 11 | 5000–5500 | 6.492 | 27 h | 292 h |
| 20 | 9500–10000 | 8.110 | 34 h | 571 h |
| 30 | 14500–15000 | 9.478 | 40 h | 941 h |
| 40 | 19500–20000 | 10.601 | 44 h | **1.362 h** |

≈ **1.360 h de jogo ativo** (≈ 340 dias a 4 h/dia); o offline (Free 2 h / VIP 8 h) acelera. Tabela completa e gerada: [`BALANCE_REPORT.md`](BALANCE_REPORT.md) (`npm run report:balance`).

> **O andar 10 é o gargalo** (168 h): 2.500 níveis a percorrer com inimigos que rendem o XP de nível 2.500. É consequência direta da regra "inimigo = nível-base" aplicada a uma faixa larga. Alavancas sem código: estreitar a faixa, subir `enemyLevel` do andar 10, ou subir a recompensa. Anotado para revisão com dados reais de jogo.

### 7.3 Um herói só vale se acompanhar o andar

O combate escala igualmente em todos os níveis (constante de defesa por nível — `combat.defenseConstantPerLevel`). Medido (`simulateHunt`, 150 lutas seguidas com a regen de PROCURANDO):

| Nível do herói / nível do inimigo | Resultado (4 classes) |
|---|---|
| ≥ 1,0× | aguenta idle |
| 0,9× | aguenta, exceto o Arqueiro nos andares 10, 11 e 40 (cai na luta 59–64) |
| 0,8× | cai entre as lutas 18 e 65 (andares 5, 10, 11 e 40) |
| < 0,8× | não medido pelo relatório (esperado: cai ainda mais cedo) |

Por isso o jogador **escolhe o andar** (§6): um herói atrasado treina num andar mais baixo. Em equipes de 2–3 heróis o XP é dividido (P-004) e o herói ativo pode ficar abaixo do andar do Rei — risco R-01 em [`PENDING_RULES.md`](PENDING_RULES.md).

### 7.4 Regeneração em PROCURANDO

`combat.regenOnSearchingPctPerSec` (ADR-021 calibrou 0,05 → ≈ 15% do HP por procura; **ADR-030 reduziu para 0,01 → ≈ 3%**, para o desgaste pedir poção/equipamento). Na época, sem a regen, um herói on-curve perderia ≈ 12% por luta e todo idle terminaria em derrota (teste prova). A regen **não** reanima herói caído; `Descansar`/`Recomeçar` seguem curando 100% (ADR-020).

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

- [x] 1×1 garantido por teste automatizado (§79) — **gate de release**
- [x] Nenhum boss em andar fixo da Torre (§55) — teste
- [ ] Fluxo completo: entrar → andar → herói → 1×1 → vitória → procura → próximo
- [ ] `SEARCHING` com animação real, ~3s, configurável
- [ ] Navegar durante `SEARCHING` não reinicia nem pausa
- [ ] Fechar/reabrir a aba durante `SEARCHING` retoma corretamente
- [ ] Herói ativo é escolhido, nunca presumido
- [ ] Trocar herói ativo não reinicia a hunt
- [ ] Recompensa: XP Rei + XP herói (÷ time) + Coin + 5% equipamento
- [ ] Nenhum fragmento de herói vem de inimigo comum — **teste** (§12)
- [x] Andar mostra faixa de nível, inimigos por papel e aviso quando o herói está abaixo do nível
- [x] Seleção manual de andar com gate por nível do Rei
- [x] Cada andar tem identidade visual distinta (nome + tintura; tilesets = P-028)

---

## 11. Pendências

| ID | Pendência | Bloqueia |
|---|---|---|
| `P-005` | Número de andares, curvas, pools, recompensas | ✅ resolvida (ADR-021) |
| `P-006` | Inimigos: stats, papéis, resistências | ✅ resolvida (ADR-021) |
| `P-009` | Curvas de XP e teto de nível | ✅ resolvida (ADR-021) |
| `P-008` | Coin por abate (provisória `12×(E+3)`) | FASE 10 |
| `P-012` | Política multi-aba / blur | Fase 8 |
| `P-019` | Política de derrota e HP entre batalhas | Fase 8 |
| `P-020b` | Herói caído recebe XP? | Fase 8 |
| `P-028` | Identidade visual e animação de procura | Fase 8 |

---

## 12. Referências

- [`COMBAT_SYSTEM.md`](COMBAT_SYSTEM.md) — o motor que executa o 1×1
- [`AUTOMATION_SYSTEM.md`](AUTOMATION_SYSTEM.md) — o loop idle que envolve a Torre
- [`BOSS_SYSTEM.md`](BOSS_SYSTEM.md) — o que a Torre explicitamente **não** contém
- [`PENDING_RULES.md`](PENDING_RULES.md) — P-005, P-006, P-009, P-019
- [`ADMIN_PANEL.md`](ADMIN_PANEL.md) — como andares e inimigos serão editados sem código
- [`BALANCE_REPORT.md`](BALANCE_REPORT.md) — pacing e balanceamento medidos
