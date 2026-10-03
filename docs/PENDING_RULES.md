# Pendências — Decisões que NÃO podem ser inventadas

**Versão:** 0.4 · **Data:** 2026-10-03 · **Estado:** 67 pendências catalogadas (P-002, P-003, P-004, P-005, P-006, P-010, P-012, P-016, P-019, P-020, P-020b, P-023, P-024, P-025, P-033 resolvidas)
**Fonte:** §73 do `Master-Prompt.md`

---

## 1. Por que este documento existe

> **Tipo C — Regra de gameplay/economia crítica: não inventar.**
>
> *"Registrar: `PENDING`. E, quando necessário, solicitar decisão humana."* (§73)

O §73 classifica decisões em três tipos:

| Tipo | Exemplo | O que fazer |
|---|---|---|
| **A — Regra definida** | XP dividido, Torre 1×1, 5% de drop | Implementar **exatamente** |
| **B — Decisão técnica** | Biblioteca, estrutura, padrão de código, cache | **Decidir e seguir** |
| **C — Regra de gameplay/economia crítica** | Preço, drop econômico, fórmula de moeda, taxa de pagamento, vantagem de VIP, regra competitiva | **NÃO INVENTAR.** Registrar `PENDING` e pedir decisão humana |

O que separa o Tipo B do Tipo C é **custo de reversão e impacto no jogador**. Escolher Zustand é Tipo B. Escolher quanto um inimigo paga é Tipo C — porque o jogador toma a decisão após sentir um número.

> **Este documento existe para que ninguém preencha um espaço em branco com um número razoável.** Um valor inventado em silêncio é pior que um valor ausente, porque parece decisão.

---

## 2. Classificação

| Criticidade | Significado | Ação |
|---|---|---|
| 🔴 **CRÍTICA** | Bloqueia uma fase inteira | Decidir **antes** da fase |
| 🟡 **ALTA** | Bloqueia um sistema | Decidir antes de implementar o sistema |
| 🟢 **MÉDIA** | Bloqueia um detalhe | Decidir durante a implementação |
| ⚪ **BAIXA** | Pode ter default provisório | Default provisório, revisar depois |

---

## 3. As 6 pendências críticas

Estas seis separam a documentação da implementação.

### P-002 — Definição dos 4 heróis iniciais ✅ RESOLVIDA (2026-10-01)

**Criticidade:** 🔴 CRÍTICA · **Bloqueia:** FASE 4, e portanto a vertical slice

> **RESOLVIDA em 2026-10-01 por delegação do usuário** ("você decide — algo
> completo e complexo, editável depois; pode adaptar do OpenRpg ou criar").
> As identidades definitivas vivem em [`packages/config/src/heroes.ts`](../packages/config/src/heroes.ts)
> (ADR-015):
>
> | id | Herói | Classe | Raridade | Assinatura | Estilo |
> |---|---|---|---|---|---|
> | `hero_aldric` | **Aldric, o Inabalável** | Guardião (tank reativo) | Common | `skill_counter` | Contra-ataque e mitigação |
> | `hero_kaia` | **Kaia, a Pássaro-Livre** | Arqueira (velocidade) | Uncommon | `skill_volley` | Rajada e velocidade |
> | `hero_maelis` | **Maelis, a Estelar** | Arcanista (área) | Rare | `skill_nova` | Explosão em área |
> | `hero_vorath` | **Vorath, o Silente** | Invocador (DoT) | Epic | `skill_hex` | Veneno e drenagem |
>
> Cada herói tem lore, 3 traços de personalidade, notas de voz (⛔ P-061),
> `statPriority` para loot futuro e dica de aquisição (§12 respeitado). A
> raridade forma a escala de aquisição (§109 "preciso conseguir esse
> personagem"). Mecânica (atributos→stats, skills) continua em `catalog.ts`/
> `attributes.ts` — identidade e mecânica se referenciam por id; remodelar é
> editar dados.

O §10 define **quantos** (4) e **como** (escolhe 1), e exige diferenças reais de função, atributos, skills, estilo de combate e progressão. Proíbe explicitamente quatro personagens "visualmente diferentes mas mecanicamente iguais".

**Não define:** nome, classe, atributos-base, curva de crescimento, skills, raridade e estilo de cada um.

**Por que não é TYPE B:** a identidade dos 4 heróis **é** o conteúdo central do jogo. O §109: *"preciso conseguir esse personagem"*. Quatro heróis errados significa reescrever a coleta, o balanceamento e aTower inteira.

**Material disponível:**
- Sprites candidatos: `hero`, `mage`, `archer`, `necromancer` ([`ASSET_INVENTORY.md` §5.3](ASSET_INVENTORY.md#53-candidatos-para-os-4-heróis-iniciais))
- 9 tipos de arma com traços distintos ([`WEAPON_SYSTEM.md`](WEAPON_SYSTEM.md))
- Contexto de design: eles devem cobrir **físico × mágico** para que a escolha de herói na Torre seja uma decisão (§18, §107)

**Decisão precisa de:** nome, classe, papel, atributos-base, skills, raridade, curva de progressão.

**Status (2026-10-01 — decisão do usuário):** **inserção genérica aprovada.**
Os 4 heróis entram com o material do pack (hero/mage/archer/necromancer) via
`packages/config/src/catalog.ts`, modelado como DADO: papéis e perfis de
atributo já distintos (§10), físico × mágico coberto (§18), assets por ID do
manifesto com folhas de animação completas, e validação cruzada
config × manifesto (`tests/integration/assets-config.test.ts`) que reprova
qualquer remapeamento errado. **Base OpenRpg (ADR-014):** atributos
STR/DEX/CON/INT/WIS/CHA como identidade (Fighter→Guardião, Mage→Arcanista) e
roster de skills baseado nas 10 abilities do OpenRpg
(`docs/OPENRPG_REFERENCE.md` §3–§4). **Continua PENDENTE** para a identidade
definitiva: nomes próprios, raridades e curvas de balanceamento — tudo
remodelação de dados, não de código.

---

### P-005 — Estrutura e curva da Torre ✅ RESOLVIDA (2026-10-03)

**Criticidade:** 🔴 CRÍTICA · **Bloqueava:** FASE 7

> **RESOLVIDA em 2026-10-03** (ADR-021) — decisões do usuário + delegação:
> **40 andares**, cada um uma **faixa de nível do Rei** (1–10, 10–25, 25–50,
> 50–100, 100–250, 250–500, 500–1000, 1000–1500, 1500–2500, 2500–5000 e depois
> **1 andar por 500 níveis até 20.000**); **nível dos inimigos = nível-base da
> faixa** (andar 10 → nv 2.500; andar 12 → nv 5.500); **teto 20.000**; XP
> moderado e que **desacelera**; pools com **variedade de papéis** (tanque,
> dano, veloz, mago, equilibrado, elite). Tudo é `config.tower` (dado editável,
> ADR-022). Ver `TOWER_SYSTEM.md` §3 e §7.

O §22 exige que a Torre tenha andares, dificuldade crescente, inimigos, grupos, progressão e recompensas. Não dizia quantos andares, nem com que curva.

---

### P-006 — Inimigos: stats, papéis e resistências ✅ RESOLVIDA (2026-10-03)

**Criticidade:** 🔴 CRÍTICA · **Bloqueava:** FASE 7

> **RESOLVIDA em 2026-10-03** (ADR-021): **11 inimigos** (todos com sprite do
> pack) definidos por **6 atributos** — a mesma base OpenRpg dos heróis — + papel
> (`tank | dps | swift | caster | balanced | elite`) + tipo de dano
> (físico/mágico, que o engine agora respeita: Def. × Def. Esp.) + multiplicador.
> Calibrados por simulação: cada papel custa uma fração previsível de vida a um
> herói on-curve (veloz ≈ 8% … elite ≈ 19%). Resistência a status fica para a
> FASE 9+ (efeitos de traço/arma). `boss`/`slimeking` reservados à FASE 12.
> Ver `TOWER_SYSTEM.md` §6.2.

O §18 e o §107 exigem que a Torre gere a pergunta *"qual dos meus heróis é melhor para continuar avançando?"*. Isso **implica** inimigos com perfis distintos (físico, mágico, etc.).

---

### P-008 — Valores de Coin ⚠️ DECIDIDA PROVISORIAMENTE (2026-10-03)

**Criticidade:** 🔴 CRÍTICA · **Bloqueia:** FASE 10

> **Decidida provisoriamente** (ADR-025, delegação "você decide"): Coin por abate (curva da Torre), venda de equipamento (ADR-023), slots (ADR-017) e **preços do Market** (poções, revives, caixas) estão em `config` e são editáveis; ratificação humana e playtest recomendados. O texto abaixo é o histórico.

O §43 exige **fontes** e **sumidouros** claramente documentados, mas **nenhum valor** foi especificado.

**Não definido:** Coin por inimigo, Coin por Boss, Coin por andar, custo dos slots 2 e 3, preço de venda de equipamento, preços de loja, valor de fragmento.

**Definido:** apenas a **taxa de 15%** do mercado (§41).

**Decisão precisa de:** todos os valores de entrada e saída de Coin.

---

### P-010 — Faixa e granularidade do X ✅ RESOLVIDA (2026-10-03)

**Criticidade:** 🔴 CRÍTICA · **Bloqueia:** FASE 9

> **RESOLVIDA em 2026-10-03** (ADR-023, delegação "você decide"): X **fracionário, 0,50–2,50**, 2 casas, em sino (média ≈ 1,05; ≥ 2,00 ≈ 1%), um X independente por linha. Tudo em `config.equipment.x` (ContentPack v2). O texto abaixo é o histórico.

O §36 diz que o X é **gerado individualmente por atributo** e dá um exemplo com decimais (`Attack × 1.72`, `Defense × 0.93`, `Critical × 1.41`, `HP × 2.08`). **Não diz a faixa, nem se o X armazenado é inteiro ou fracionário.**

O repositório de referência usa **inteiro 1–50** com fator `x/10` (0,1× a 5,0×). Isso é compatível com o exemplo do §36, mas **não é uma regra deste projeto**.

**Por que é crítico:** o X determina o valor de **todo** item do jogo. A faixa define a distância entre um item terrível e um god roll — que é exatamente a tensão que o §35 e o §108 prometem.

**Decisão precisa de:** faixa mínima e máxima do X, e se o valor armazenado é inteiro ou fracionário.

---

### P-011 — Taxa de conversão offline ✅ RESOLVIDA (2026-10-03)

**Criticidade:** 🔴 CRÍTICA · **Bloqueia:** FASE 11

> **RESOLVIDA em 2026-10-03** (ADR-026, decisão do usuário): **não há taxa de conversão** — o offline é a **simulação do online** pelo tempo creditado (2 h Free / 8 h VIP, teto por ausência). O texto abaixo é o histórico.

O §47 e o §48 definem o **sistema** (registrar, calcular, limitar, simular, entregar) e o **limite** (2h Free / 8h VIP). **Não definem a conversão de tempo em recompensa.**

**Por que é a decisão mais sensível da economia:**

- Se o offline for **melhor** que o online, o jogador é incentivado a **não jogar**.
- Se for **pior**, o passo 20 do §118 ("retornar e recuperar progresso offline") é irrelevante.

O limite de 2h/8h existe justamente para controlar isso, e o valor de conversão determina onde está o ponto de equilíbrio.

**Decisão precisa de:** quanto de XP, Coin e loot por hora offline, comparado com a taxa online.

---

## 4. Pendências de design

### P-001 — Lista canônica de atributos e slots de equipamento

**Criticidade:** 🟡 ALTA · **Bloqueia:** FASE 9

O §9 diz que o herói tem "atributos" e o §71 que o equipamento tem `stats` e `slot`, sem listar nenhum. A referência técnica do repositório vizinho define 8 atributos e 10 slots, reaproveitados aqui (ADR-001, ADR-004) — **compatíveis**, não **impostos**.

**Decisão precisa de:** lista final de atributos e lista final de slots.

---

### P-003 — Custo em Coin dos slots 2 e 3 ✅ RESOLVIDA PROVISORIAMENTE (2026-10-01)

**Criticidade:** 🟡 ALTA · **Bloqueia:** FASE 5

> **RESOLVIDA em 2026-10-01 por delegação do usuário** (ADR-017): **slot 2 =
> 50.000 Coin, slot 3 = 250.000 Coin** (`config.team.slots` — editável).
> Provísório até a economia (P-008/P-036, Fase 10); ratificação humana recomendada.

O §15 e o §46 exigem "nível mínimo + Coin" e que os valores sejam configuráveis, mas **não dão o número**. Os níveis (10 e 25) estão definidos.

**Decisão precisa de:** custo em Coin do slot 2 e do slot 3.

---

### P-004 — Curva de divisão de XP ✅ RESOLVIDA (2026-10-01)

**Criticidade:** 🟡 ALTA · **Bloqueia:** FASE 5

> **RESOLVIDA em 2026-10-01 por delegação do usuário** (ADR-017): divisão
> **linear 1/n** — `config.xp.teamSplit = {1: 1.0, 2: 0.5, 3: 1/3}` com
> `rounding: "floor"` (a soma nunca excede o pacote, §81). Editável.

O §20 e o §81 exigem que o XP seja dividido, com "parcela menor" e "parcela ainda menor". **Não define a curva.**

Default provisório: linear (100% / 50% / 33,3%). Alternativa válida: não-linear (ex.: 100% / 65% / 43%), que muda a estratégia de equipe de forma substancial.

**Decisão precisa de:** a curva de divisão.

---

### P-006b — Progressão de nível do herói

**Criticidade:** 🟡 ALTA · **Bloqueia:** FASE 4

O §9 diz que o herói tem "nível" e "XP". **Não define** a curva, nem o teto de nível.

**Decisão precisa de:** XP necessário por nível, teto de nível do herói, teto de nível do Rei.

> **RESOLVIDA em 2026-10-03** (ADR-021, via P-009): herói usa a mesma curva do Rei, teto 20.000; stats por nível seguem a base OpenRpg (`growthFromAttributes`).

---

### P-015 — Escala de estrelas

**Criticidade:** 🟡 ALTA · **Bloqueia:** FASE 4

O §9 lista "estrelas" como atributo do herói e o §10 fala de progressão, mas **não define quantas, o que cada uma dá, ou como se obtém**.

O repositório de referência sugere 1★–5★ com slots extras de skill por estrela, mas isso **não** é regra deste projeto.

**Decisão precisa de:** quantas estrelas, o que cada uma concede, e a relação com slots de skill.

---

### P-017 — Fragmentos: quantidade por Boss e por herói

**Criticidade:** 🟡 ALTA · **Bloqueia:** FASE 12

O §12 e o §54 definem que Boss é a fonte principal de fragmentos, mas **não dizem quanto**.

**Decisão precisa de:** fragmentos por Boss, fragmentos necessários por herói, e a taxa de drop.

---

### P-018 — Conteúdo de Boss

**Criticidade:** 🟡 ALTA · **Bloqueia:** FASE 12

O §23 lista as estruturas possíveis e o §24 define o combate de equipe. **Nenhum Boss concreto** é definido.

**Decisão precisa de:** quais Bosses, stats, fases, mecânicas, resistências, recompensas e taxa de drop.

---

### P-019 — Política de derrota e HP entre batalhas ✅ RESOLVIDA (2026-10-03)

**Criticidade:** 🟡 ALTA · **Bloqueia:** — (fechada)

> **RESOLVIDA em 2026-10-01** (ADR-017): derrota encerra a caçada
> (`hunt = "defeated"`), sem recompensa, **sem auto-restart** — recomeçar é ato
> explícito do jogador.
>
> **RESOLVIDA EM PLENITUDE em 2026-10-03** (ADR-020): **HP persiste entre
> batalhas** (`Hero.currentHp`). Vitória mantém o HP restante; derrota zera; a
> chain automática **não cura**. Recuperação é ato do jogador: `restartHunt()`
> (após derrota) e `restActiveHero()` (descanso, pausa a caçada), ambas sob
> `config.combat.healOnHuntRestart`. Cooldowns reiniciam e status expiram por
> batalha. Ver `COMBAT_SYSTEM.md` §7.2.

---

### P-020 — Prioridade de skills ✅ DEFAULT RATIFICADO (2026-10-03)

**Criticidade:** 🟢 MÉDIA · **Bloqueia:** — (ratificada)

O §56 diz que o combate é automático, mas **não diz** se o jogador pode
reordenar a prioridade das skills ou se ela é fixa por slot.

> **RATIFICADA em 2026-10-03** (ADR-020): **ordem fixa pelo catálogo** — a
> primeira skill ativa pronta dispara (cooldown manda). Reordenar o catálogo
> (`config/skills.ts`) altera a prioridade; uma config explícita de fila é
> ajuste de dados, sem mudar o engine.

---

### P-020b — Herói caído recebe XP? ✅ RESOLVIDA (2026-10-01)

**Criticidade:** 🟢 MÉDIA · **Bloqueia:** FASE 8

> **RESOLVIDA em 2026-10-01 por delegação do usuário** (ADR-017): **não**.
> Herói caído não consome parcela; a divisão é sobre os membros vivos.
> (No modelo atual, sem HP persistente, todo membro recebe.)

O §20 diz que o XP é dividido entre os **membros da equipe**. Não diz se um herói caído (mas ainda na equipe) continua consumindo a parte dele.

Leitura mais óbvia: não. Mas isso é Tipo C.

---

### P-021 — Resistência a status por inimigo e Boss

**Criticidade:** 🟢 MÉDIA · **Bloqueia:** FASE 7

Nada definido. A referência define a Sentinela como imune a Atordoamento, mas isso **não** é regra deste projeto.

**Decisão precisa de:** resistências por inimigo, imunidades de Boss.

---

### P-023 — Valores dos traços de arma ✅ RESOLVIDA (2026-10-03)

**Criticidade:** 🟡 ALTA · **Bloqueia:** FASE 9

> **RESOLVIDA em 2026-10-03** (ADR-023 §8): valores da referência adotados como ponto de partida (Contracorte 20%/50% Atq, Veneno 20%/3×10%, Machado +15%, Maça +10 pp, Besta +20% vel., Área 70%, Sifão 10%, Atordoamento 15%, Golpe duplo 2×60%) como `GearEffect` de dados; tetos em `equipment.effectCaps`. Validar em playtest.

O §72 define as 9 categorias de arma, mas **não define** os traços mecânicos nem seus valores.

Os valores da tabela em [`WEAPON_SYSTEM.md`](WEAPON_SYSTEM.md) §3 são **herdados do repositório de referência** como baseline de playtest e marcados como tal.

**Decisão precisa de:** chance, coeficiente e duração de cada traço.

---

### P-024 — Afinidades dos 4 heróis ✅ RESOLVIDA (2026-10-03)

**Criticidade:** 🟢 MÉDIA · **Bloqueia:** FASE 9

> **RESOLVIDA em 2026-10-03** (ADR-023 §7): afinidade é **por tipo de arma da classe** (+5% no ataque principal, `equipment.affinityBonus`), nunca bloqueia equipar.

Depende diretamente de `P-002`. A regra de +5% é reaproveitada da referência.

**Decisão precisa de:** qual herói tem afinidade com qual arma.

---

### P-025 — Templates do catálogo de equipamento ✅ RESOLVIDA (2026-10-03)

**Criticidade:** 🟢 MÉDIA · **Bloqueia:** FASE 9

> **RESOLVIDA em 2026-10-03** (ADR-023 §3): 10 slots, 18 templates (9 armas + 9 peças), linhas por raridade 2/2/3/3/4/4. Novos templates entram pelo ContentPack.

O §70 exige um catálogo real, mas não define quantos itens base existem.

A referência tem 18 templates (9 armas + 9 armaduras/acessórios).

**Decisão precisa de:** lista de templates e seus vetores-base.

---

### P-026 — Progressão de arma (upgrade, fusão)

**Criticidade:** ⚪ BAIXA · **Bloqueia:** pós-MVP

Nada definido. O §72 diz explicitamente para registrar como PENDING se não estiver definido.

---

### P-027 — Pool de características de raridade

**Criticidade:** 🟡 ALTA · **Bloqueia:** FASE 9

O §34 menciona "características" como um dos fatores de qualidade, mas **não lista nenhuma**.

O pool de 4 (Roubo Vital, Ruptura de Guarda, Foco Crítico, Concentração) é **herdado da referência**.

**Decisão precisa de:** lista de características e seus efeitos.

---

### P-028 — Identidade visual dos andares e animação de procura

**Criticidade:** ⚪ BAIXA · **Bloqueia:** FASE 7/8

O §28 exige animação de procura real e o §22 exige progressão visual da Torre, mas o conteúdo visual específico não é definido. Depende de `P-005`.

---

### P-029 — Limites de tentativa de Boss

**Criticidade:** ⚪ BAIXA · **Bloqueia:** FASE 12

Nada definido. Pode ser ilimitado, diário ou com cooldown.

---

### P-031 — Boss de guilda e last hit

**Criticidade:** ⚪ BAIXA · **Bloqueia:** FASE Social

O §52 lista boss de guilda, mas escala, distribuição de recompensa e a regra de **last hit** não são definidas. A lição do repositório de referência: last hit sem regra transparente gera disputa e abuso.

---

### P-032 — Itens, consumíveis e materiais

**Criticidade:** 🟡 ALTA · **Bloqueia:** FASE 9

O §70 lista "itens, consumíveis, materiais" no inventário, mas **nenhum é definido**.

**Decisão precisa de:** lista de itens, consumíveis e materiais, com efeito e origem.

---

### P-033 — Requisito de nível para equipar ✅ RESOLVIDA (2026-10-03)

**Criticidade:** 🟢 MÉDIA · **Bloqueia:** FASE 9

> **RESOLVIDA em 2026-10-03** (ADR-023 §6): herói ≥ `ceil(0,9 × nível do item)` (`equipment.requirement.levelRatio`).

O §70 diz que o jogador pode equipar. **Não diz** se há requisito de nível.

Default provisório herdado da referência: nível da conta ≥ nível do item.

---

### P-034 — Abas do inventário por tipo

**Criticidade:** ⚪ BAIXA · **Bloqueia:** FASE 9

Estrutural, não de regra.

---

### P-035 — Fonte e uso de Diamonds

**Criticidade:** ⚪ BAIXA · **Bloqueia:** FASE Monetização

O §44 lista Diamonds como moeda possível, sem definir origem nem uso. O §73 proíbe inventar vantagem.

---

### P-036 — Sumidouros principais de Coin ⚠️ DECIDIDA PROVISORIAMENTE (2026-10-03)

**Criticidade:** 🔴 CRÍTICA · **Bloqueia:** FASE 10

> **Decidida provisoriamente** (ADR-025): consumíveis do Bot (poções/revives) e caixas do Market são o principal sumidouro, ao lado dos slots 2/3. Tudo em `config.market`. O texto abaixo é o histórico.

> Este é o **par de `P-008`** e, junto com ele, forma o maior bloqueio do projeto.

O §43 exige sumidouros **claramente documentados**. A taxa de 15% do mercado é o único sumidouro com número fechado. Sem um sumidouro grande além dele, a moeda **infla** com o tempo — e em um jogo idle isso significa que os custos deixam de ter sentido depois de algumas semanas.

**Decisão precisa de:** qual é o principal sumidouro de Coin (melhoria de equipamento? consumíveis na Torre? upgrade do Reino?).

---

### P-037 — Sistema de melhoria de equipamento

**Criticidade:** ⚪ BAIXA · **Bloqueia:** pós-MVP

Possivelmente o sumidouro principal de Coin (`P-036`).

---

### P-038 — Reprocessamento e fusão

**Criticidade:** ⚪ BAIXA · **Bloqueia:** pós-MVP

Nada definido.

---

## 5. Pendências de plataforma

### P-007 — Formato, troca e reserva de nickname

**Criticidade:** 🟡 ALTA · **Bloqueia:** FASE Online

O §6 exige unicidade, validação e proteção, mas **não define** comprimento, caracteres permitidos, lista de reservados, nem **se o nickname pode ser alterado**.

Alterar nickname tem impacto em mercado, chat e rankings (links externos).

**Decisão precisa de:** comprimento, regex, lista reservada, e política de troca.

**Status (FASE 3):** ⛔ default provisório implementado em
`config.account.nickname` (3–20 chars, `^[\p{L}\p{N}_-]+$`, lista reservada)
com validação em `game-core/nickname.ts`. Unicidade real é server-authoritative
no online; política de troca de nickname **ainda não existe** (não há UI de
rename). Revisar quando o online entrar.

---

### P-006c — Skins iniciais do Rei

**Criticidade:** 🟢 MÉDIA · **Bloqueia:** FASE 3

O §5 diz "nome + skin", sem dizer quais. Há 8 `hero_skins` disponíveis.

**Decisão precisa de:** quais das 8 são iniciais.

**Status (FASE 3):** ⛔ default provisório implementado: `royal` + `paladin`
(`config.account.king.skins`, todas `unlock: default`). As outras 6 continuam
na banca do pack, fora do catálogo.

---

### P-009 — Curvas de XP ✅ RESOLVIDA (2026-10-03)

**Criticidade:** 🟡 ALTA · **Bloqueava:** FASE 3/4

> **RESOLVIDA em 2026-10-03** (ADR-021): **teto 20.000** (Rei e heróis);
> XP necessário `floor(20·(N+30)^1,35)` (Rei e herói; pools separados);
> XP por abate `floor(50·(E+3)^0,95)`, E = nível do inimigo. Curvas são **dado**
> (`CurveDef`), editáveis sem código. Ritmo medido: **≈ 1.360 h** de jogo ativo
> até o Nv 20.000 (andar 1 ≈ 30 min; andar 10 ≈ 168 h; andares 11–40 ≈ 27–44 h
> cada). Slots 2 (Rei Nv 10) e 3 (Rei Nv 25) abrem em ≈ 54 min e ≈ 1,4 h
> (sem contar a Coin: ver P-003). Ver `TOWER_SYSTEM.md` §7 e `BALANCE_REPORT.md`.

O §45 separa XP do Rei e do herói, mas não definia as curvas.

---

### P-012 — Política de multi-aba e aba em background ✅ RESOLVIDA (2026-10-01)

**Criticidade:** 🟡 ALTA · **Bloqueia:** FASE 8

> **RESOLVIDA em 2026-10-01 por delegação do usuário** (ADR-017): timestamps
> absolutos persistidos — o relógio é a única verdade (§29: navegar/recarregar
> não pausa nem reinicia). Blur não pausa. No MVP local, duas abas = última
> gravação vence; detecção de conflito/sessão única fica para a Fase Online
> (Supabase com versioning).

O §29 diz que o timer deve continuar ou ser tratado de maneira consistente, e o §47 manda registrar `lastActiveAt`. **Não define** o comportamento com **duas abas do mesmo jogador**.

Sem política explícita, dois timers paralelos geram inconsistência entre o que está rodando e o que é salvo.

**Decisão precisa de:** uma sessão ativa por conta? Segunda aba lê? Perder foco pausa?

---

### P-011a — Modelo de derrota durante offline ✅ RESOLVIDA (2026-10-03)

**Criticidade:** 🟡 ALTA · **Bloqueia:** FASE 11

> **RESOLVIDA em 2026-10-03** (ADR-026, decisão do usuário): se morrer, recupera no **Hub** e volta ao **mesmo andar**; poções e revives seguem o **Bot**. O texto abaixo é o histórico.

Se a equipe cai 20 minutos antes de o jogador sair, o que acontece nas 2 horas offline? Três modelos possíveis (revivê-la, parar no primeiro defeat, congelar após N defeats), com impactos distintos em `P-011`.

---

### P-013 — Benefícios de VIP

**Criticidade:** ⚪ BAIXA · **Bloqueia:** FASE Monetização

O §49 exige a arquitetura desde cedo, mas **nenhum benefício** é definido. O §73 proíbe explicitamente inventar vantagem de VIP.

**Decisão precisa de:** níveis de VIP, benefícios, duração, preço.

---

### P-039 — Regras de conflito na migração Guest → Google

**Criticidade:** 🟢 MÉDIA · **Bloqueia:** FASE Online

O que acontece se o jogador Guest tem progresso e a conta Google **já tem** um Rei com nível alto?

**Decisão precisa de:** política de conflito.

---

### P-040 — Duração e renovação de sessão

**Criticidade:** 🟢 MÉDIA · **Bloqueia:** FASE Online

**Decisão precisa de:** duração da sessão, renovação, dispositivo compartilhado.

---

### P-041 — Provedores de auth além de Google

**Criticidade:** ⚪ BAIXA · **Bloqueia:** pós-lançamento

O §7 exige arquitetura para provedores futuros, mas não diz quais.

---

### P-042 — Recuperação de conta e mudança de e-mail

**Criticidade:** ⚪ BAIXA · **Bloqueia:** FASE Online

---

### P-043 — Limite de caracteres e rate limit do chat

**Criticidade:** 🟢 MÉDIA · **Bloqueia:** FASE Online

O §50 exige "limite de caracteres" e "rate limit", mas **não dá os números**.

**Decisão precisa de:** caracteres máximos, mensagens por janela, burst.

---

### P-044 — Política de URLs em mensagens

**Criticidade:** ⚪ BAIXA · **Bloqueia:** FASE Online

Permitir, filtrar ou banir URLs?

---

### P-045 — Retenção e limpeza de histórico de chat

**Criticidade:** ⚪ BAIXA · **Bloqueia:** FASE Online

Relevante para privacidade e custo de armazenamento.

---

### P-046 — Chat privado / DM

**Criticidade:** ⚪ BAIXA · **Bloqueia:** FASE Social

O §52 lista "chat de guilda" e o §50 lista chat global. O privado é inferência.

---

### P-047 — Mecanismo de filtro de palavras

**Criticidade:** 🟡 ALTA · **Bloqueia:** FASE Online

Lista curada, filtro automático ou ambos? Tem implicações de legal e de falsos positivos.

---

### P-048 — Canais de chat além do global

**Criticidade:** ⚪ BAIXA · **Bloqueia:** FASE Social

Sistema, evento, local?

---

### P-049 — Rankings: quais, período, desempate

**Criticidade:** ⚪ BAIXA · **Bloqueia:** FASE Social

**Decisão precisa de:** lista de rankings, período (por dia? semanal?), critério de desempate.

---

### P-050 — Cargos e permissões de guilda

**Criticidade:** ⚪ BAIXA · **Bloqueia:** FASE Social

O §52 exige cargos. Quantos, quais nomes, quais permissões?

---

### P-051 — Recursos de guilda

**Criticidade:** ⚪ BAIXA · **Bloqueia:** FASE Social

O §52 lista "recursos" como capacidade, sem definir o que são.

---

### P-052 — Matchmaking, rating e temporadas de arena

**Criticidade:** ⚪ BAIXA · **Bloqueia:** FASE PvP

O §53 exige server authority, mas **não define** as regras competitivas.

---

### P-053 — Regras anti-smurf e anti-abuso competitivo

**Criticidade:** 🟡 ALTA · **Bloqueia:** FASE PvP

O §124 alerta para não sacrificar integridade econômica. Smurf e boosting são o vetor principal.

---

### P-054 — Detecção de wash trading no mercado

**Criticidade:** ⚪ BAIXA · **Bloqueia:** FASE Market

A taxa de 15% já desincentiva economicamente; a detecção é complementar.

---

### P-055 — Bots de revenda

**Criticidade:** ⚪ BAIXA · **Bloqueia:** pós-lançamento

---

### P-057 — Retenção e exclusão de dados (LGPD)

**Criticidade:** 🟡 ALTA · **Bloqueia:** Beta

Relevante para qualquer coleta de dados além do essencial.

---

### P-058 — Privacidade e termos

**Criticidade:** 🟡 ALTA · **Bloqueia:** Beta

Revisão legal antes de qualquer público.

---

### P-014 — Regras de anúncio do mercado

**Criticidade:** 🟡 ALTA · **Bloqueia:** FASE Market

O §40 e o §41 definem a mecânica e a taxa, mas **não definem** limite de anúncios simultâneos, faixa de preço, duração do anúncio, nem taxa de listagem.

**Decisão precisa de:** todos esses limites.

---

## 6. Pendências de conteúdo

### P-016 — Limite de capacidade do inventário ✅ RESOLVIDA (2026-10-03)

**Criticidade:** 🟢 MÉDIA · **Bloqueia:** FASE 9

> **RESOLVIDA em 2026-10-03** (ADR-023 §12): 300 itens **não equipados**; cheia ⇒ `inventory.onFull` (padrão `autoSell`, alternativa `discard`). Coin/XP creditados antes. Editável.

O §13 diz que **heróis são ilimitados** e é **silencioso** sobre equipamentos. Um limite é necessário (UI, memória), mas o número é Tipo C.

Default provisório: 300 itens não equipados, herdado da referência.

### P-022 — Progressão de skills

**Criticidade:** ⚪ BAIXA · **Bloqueia:** pós-MVP

Upgrade, níveis, árvore de talentos?

**Status (2026-10-01):** o ROSTER de skills virou dado —
`packages/config/src/skills.ts` (12 skills, 3 por herói, baseado no OpenRpg,
`docs/OPENRPG_REFERENCE.md` §4). O que continua PENDENTE é a PROGRESSÃO
(upgrade/níveis/árvore), que só entra pós-MVP.

### P-030 — World Boss: regra de last hit

**Criticidade:** ⚪ BAIXA · **Bloqueia:** FASE Social

Precisa de regra **transparente** contra last-hit farming e desconexão.

### P-056 — Ondas de conteúdo sazonal

**Criticidade:** ⚪ BAIXA · **Bloqueia:** pós-lançamento

### P-059 — Fontes licenciadas de áudio

**Criticidade:** ⚪ BAIXA · **Bloqueia:** FASE Polish

### P-060 — Composição da trilha principal

**Criticidade:** ⚪ BAIXA · **Bloqueia:** FASE Polish

### P-061 — Identidade sonora dos 4 heróis

**Criticidade:** ⚪ BAIXA · **Bloqueia:** FASE Polish · depende de `P-002`

### P-062 — Trilha de Boss

**Criticidade:** ⚪ BAIXA · **Bloqueia:** FASE 12 · depende de `P-018`

Uma por Boss ou uma compartilhada?

### P-063 — Política de ducking de áudio

**Criticidade:** ⚪ BAIXA · **Bloqueia:** FASE Polish

---

## 6b. Riscos da Torre (abertos — registrados em 2026-10-03, ADR-021)

Não são pendências do Master-Prompt: são consequências **medidas** das decisões desta fase, a revisitar com dados de jogo.

| ID | Risco | Quando vira problema | Alavancas (sem código) |
|---|---|---|---|
| **R-01** | **Catch-up de heróis tardios.** O XP é dividido por n e o andar exige o nível do Rei; um herói novo (nv 1) num time/reino de nível 5.000 não consegue treinar no andar do Rei e o andar 1 rende XP irrisório. O mesmo vale para o 2º/3º herói que sempre fica atrás do ativo. | FASE 9–10 (aquisição de heróis) e uso real de equipe | bônus de XP para herói abaixo do nível do Rei; "treino" com XP relativo ao nível do herói; teto de diferença; ou herói herdar fração do nível médio da equipe |
| **R-02** | **Equipamento flat vira irrelevante.** `EQUIP_TEMPLATES` tem valores base fixos (valores base fixos por slot) — num herói nv 5.000 (ataque ≈ 19.000) o item não muda nada. | FASE 9 | valores base **por tier/nível do item** (curva por `CurveDef`) e/ou bônus percentual; entra no `ContentPack` |
| **R-03** | **Andar 10 (168 h) é o gargalo.** Faixa de 2.500 níveis com inimigos nv 2.500. | jogador chegando ao nível 2.500 | estreitar a faixa, subir `enemyLevel` do andar, subir a recompensa |
| **R-04** | **Idle "knife-edge":** herói ≥ 0,9× do nível do andar aguenta, 0,8× cai. Isso é um limite duro; equipamento (R-02) vai alargar a janela. | FASE 9 | `regenOnSearchingPctPerSec`, `enemyAttackMultiplier` |
| **R-05** | **Tempo de luta por classe:** o Guardião luta mais devagar (10–24 s por luta; as demais classes 7–15 s), então rende menos XP/hora. O custo de vida está equilibrado (11–14% por luta), o tempo não. | revisão de classes | equilibrar skills/atributos de dano do Guardião |

---

## 7. Resumo por criticidade

| Criticidade | Quantidade | IDs |
|---|---:|---|
| 🔴 **CRÍTICA** | **3** | `P-008`, `P-011`, `P-036` (P-002 resolvida 2026-10-01; P-005/P-006 resolvidas 2026-10-03; P-010 resolvida 2026-10-03) |
| 🟡 **ALTA** | **14** | `P-001`, `P-006b`, `P-015`, `P-017`, `P-018`, `P-027`, `P-032`, `P-007`, `P-011a`, `P-047`, `P-053`, `P-057`, `P-058`, `P-014` |
| 🟢 **MÉDIA** | **6** | `P-020`, `P-021`, `P-006c`, `P-039`, `P-040`, `P-043` (P-016/P-024/P-025/P-033 resolvidas 2026-10-03) |
| ⚪ **BAIXA** | **29** | `P-026`, `P-028`, `P-029`, `P-031`, `P-034`, `P-035`, `P-037`, `P-038`, `P-013`, `P-041`, `P-042`, `P-044`, `P-045`, `P-046`, `P-048`, `P-049`, `P-050`, `P-051`, `P-052`, `P-054`, `P-055`, `P-022`, `P-030`, `P-056`, `P-059`, `P-060`, `P-061`, `P-062`, `P-063` |
| **TOTAL** | **64** (6 resolvidas na FASE 9 permanecem catalogadas acima) | |

---

## 8. O que fazer enquanto isso não é decidido

A FASE 2 **não depende de nenhuma pendência**. Ela constrói a estrutura que torna cada uma delas substituível em minutos.

```ts
// O padrão para todo valor pendente:
export const x: XConfig = {
  // ✅ definido no Master-Prompt
  definedValue: 0.05,              // §32

  // ⛔ pendente — tipo, placeholder, referência
  pendingValue: 50,                // ⛔ P-010 (provisório)
};
```

Três regras:

1. **O valor pendente tem um ID rastreável** em comentário.
2. **Trocar é editar um arquivo de dados**, não caçar constantes.
3. **`validateConfig()` falha alto** se o valor deixar de fazer sentido.

> Um placeholder marcado é honesto. Um número inventado em silêncio é uma mentira que o jogador vai sentir quando o balanceamento estiver errado.

---

## 9. Como resolver

| Passo | Ação |
|---|---|
| 1 | Ler a pendência e o documento do sistema correspondente |
| 2 | Decidir como **produto** (não como técnica) |
| 3 | Atualizar a seção da pendência com a decisão e a data |
| 4 | Atualizar o documento do sistema com o valor |
| 5 | Atualizar `CONFIGURATION.md` |
| 6 | Remover o marcador ⛔ do código |
| 7 | Atualizar `AI_STATE.md` |
| 8 | Rodar `check-docs` e a suíte de testes |

> Uma pendência resolvida **sem** atualizar `CONFIGURATION.md` não está resolvida — foi apenas anotada em outro lugar.

---

## 10. Referências

- [`../Master-Prompt.md`](../Master-Prompt.md) §73 — regra contra invenção
- [`CONFIGURATION.md`](CONFIGURATION.md) — onde os valores vivem
- [`ROADMAP.md`](ROADMAP.md) §16 — dependências
- [`AI_STATE.md`](../AI_STATE.md) — handoff
