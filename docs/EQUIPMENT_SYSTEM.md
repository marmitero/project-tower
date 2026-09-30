# Sistema de Equipamentos

**Versão:** 0.1 · **Data:** 2026-09-30 · **Estado:** especificado, números bloqueados (P-010)
**Fonte:** §30–§41, §71, §105 do `Master-Prompt.md`

---

## 1. Princípio

> **Equipamentos são recursos de valor.** (§30)

O §30 é explícito: *"O jogo NÃO deve despejar equipamentos constantemente. Equipamentos precisam ser relativamente raros. A existência de loot não significa que todo inimigo deve entregar equipamento."*

Complementando, o §108:

> O jogador deve pensar *"será que finalmente veio um item bom?"* — e não *"tenho 300 equipamentos inúteis"*.

**Consequência de design:** o volume de itens não é o conteúdo. O **valor percebido** é. Isso muda tudo — da taxa de drop à granularidade dos filtros, do sistema de comparação ao feedback de drop.

---

## 2. Estrutura do item

O §71 exige dado estruturado, nunca string:

```ts
interface Equipment {
  id: EquipmentId;
  ownerId: AccountId;

  slot: EquipSlotId;          // "weapon" | "chest" | "head" | ...
  itemTypeId: string;          // referência ao template do catálogo
  weaponType?: WeaponType;     // só se slot === "weapon"

  level: number;               // nível do item
  rarity: Rarity;              // 6 valores

  // X INDIVIDUAL por atributo (§36)
  xValues: Record<StatId, number>;

  quality: number;             // 0..100, derivado dos X
  grade: "S" | "A" | "B" | "C" | "D" | "E" | "F";

  traitId?: string;            // traço de arma, se houver
  featureId?: FeatureId;       // característica de Lendário/Celestial

  createdAt: Timestamp;
  origin: "drop" | "market" | "reward" | "admin" | "starter";
  seed: number;                // para auditoria e reprodução
  lockedByListingId?: string;  // trava quando anunciado no mercado
}
```

Regras estruturais:

- **Nunca** armazenar equipamento como string (§71).
- Todo item tem **os 8 atributos**, mesmo os que não têm afinidade natural com a classe.
- `lockedByListingId` impede vender/equipar um item anunciado.

---

## 3. Slots

**10 slots**, reaproveitados do repositório de referência (ADR-004):

| Slot | Tipo | Slot | Tipo |
|---|---|---|---|
| **Arma** | 9 subtipos | **Colar** | acessório |
| Peitoral | armadura | Aura | acessório |
| Elmo | armadura | Asa | acessório |
| Calça | armadura | Pet | companheiro |
| Bota | armadura | | |
| Luva | armadura | | |

> **Nota:** "Luvas" (arma, tipo Garras-adjacente) e "Luva" (armadura) são **IDs distintos** — mesma palavra, slots diferentes.

> **P-001** — a lista de 10 slots é uma decisão técnica reaproveitada (ADR-001), não uma imposição do `Master-Prompt.md`, que só menciona "arma" explicitamente e fala em "slots de equipamento devem ser reais" sem listá-los. Compatível, mas confirmar antes de congelar o schema.

---

## 4. Fórmula de valor

O §37 define a arquitetura conceitual:

```text
BASE × RARIDADE × X = VALOR FINAL
```

A implementação matemática fica **centralizada** — nunca duplicada em componente de UI.

```text
Base_i(N)      = Base_i(1) × [1 + k × (N − 1)]
ValorFinal_i   = Base_i(N) × MultRaridade × (x_i / 10)
```

Onde `i` percorre os 8 atributos e **cada `x_i` é sorteado independentemente** (§36).

### 4.1 X individual — a regra central

> **O X é gerado individualmente. Nunca assumir que "todo atributo possui o mesmo X".** (§36)

Exemplo do próprio §36:

```text
Attack × 1.72
Defense × 0.93
Critical × 1.41
HP × 2.08
```

Quatro atributos, quatro rolagens, quatro resultados **independentes**. Um item pode ter `Attack × 2.4` e `Defense × 0.8` — e isso é **desejado** (§35).

> **P-010** — a faixa do X **não está definida** no `Master-Prompt.md`. A referência usa **inteiro 1–50** com fator `x/10` (0,1× a 5,0×, em passos de 0,1). O exemplo do §36 mostra decimais no *fator aplicado*, o que é compatível com essa regra — mas o MP não declara a faixa nem se o X armazenado é inteiro. Como X determina o valor de **todo** item do jogo, é Tipo C. Ver [`PENDING_RULES.md`](PENDING_RULES.md#p-010).

### 4.2 Tabela de raridades

| Raridade | Chance dentro dos drops | Multiplicador | Cor |
|---|---:|---:|---|
| Common | **50%** | 1,0 | Cinza |
| Uncommon | **30%** | 1,2 | Verde |
| Rare | **15%** | 1,5 | Azul |
| Epic | **4%** | 2,0 | Roxo |
| Legendary | **0,9%** | 2,5 | Laranja |
| Celestial | **0,1%** | 3,0 | Dourado/branco |

Soma: **100%** ✅ — validada automaticamente ([`CONFIGURATION.md` §6](CONFIGURATION.md#6-loot)).

Multiplicadores herdados do repositório de referência (ADR-001) como **decisão técnica Tipo B**. As **chances** são do `Master-Prompt.md` §33 (Tipo A).

> §33: *"Esses valores são configuração inicial. Não são regras imutáveis."*

### 4.3 Chance de drop

```text
Nenhum equipamento:  95%
Equipamento:           5%
```

§32. Configurável, centralizado, **não espalhado** (§32, §105).

**Composição efetiva:**

```text
1 em 20 inimigos  →  dropa equipamento
  ├── 50%   Common
  ├── 30%   Uncommon
  ├── 15%   Rare
  ├── 4%    Epic
  ├── 0,9%  Legendary
  └── 0,1%  Celestial

⇒ 1 Celestial a cada ~20.000 inimigos
```

Isso é o correto pela §34: *"Equipamentos excelentes devem ser difíceis de obter."*

---

## 5. Qualidade e god rolls

### 5.1 A distinção que faz o loot funcionar

> **Não basta possuir Legendary para garantir um equipamento excelente.** (§34)

A qualidade final depende de: raridade, atributos, X, combinações, características, compatibilidade com o personagem e função do item.

E o §35, mais ainda:

> **Equipamentos ruins são permitidos e desejados.** Isso é permitido e desejado. O objetivo é criar **god rolls** como itens realmente valiosos. Um equipamento raro não deve automaticamente ser perfeito.

É por isso que um **Celestial com X 8/10 em todos os atributos** é possivelmente pior para a build do que um **Rare com HP 5.0 e Attack 2.8**, se a build é de tank.

### 5.2 Métricas

**Nota (qualidade da rolagem)** — herdada da referência:

```text
Nota% = média(x_i / maxX) × 100
```

| Nota | Faixa |
|---|---|
| S | ≥ 90 |
| A | ≥ 80 |
| B | ≥ 70 |
| C | ≥ 60 |
| D | ≥ 50 |
| E | ≥ 40 |
| F | < 40 |

A nota mede **só** a qualidade das rolagens. Raridade não altera a nota (§34: são eixos independentes).

**Poder (comparação de build)** — mesma fórmula, mas sobre os 8 valores finais:

```text
CritPP = CritChance × 100
IASPP  = AttackSpeed × 100

Poder = Attack + SpecialAttack
      + 0,75 × Defense + 0,75 × SpecialDefense
      + 0,02 × HP
      + 1,5 × CritPP
      + IASPP
      + 0,5 × Speed
```

⚠️ **Limitação importante:** Poder **não inclui** HP atual, buff temporário, característica aleatória nem traço de arma. Esses efeitos aparecem **separados** no tooltip, para não sugerir uma previsão de combate que a métrica não oferece.

> O §38 reforça: um item de nível maior pode ser pior. A UI **precisa** comparar por atributo, X, raridade, sinergia, build e função.

---

## 6. Características de raridade

Itens **Legendary e Celestial** recebem exatamente **1** característica, sorteada de um pool.

Pool herdado do repositório de referência (decisão técnica Tipo B, valores **não** definidos pelo MP):

| Característica | Efeito |
|---|---|
| **Roubo Vital** | Cura 5% do dano direto causado (1× por ação, limitado ao HP faltante) |
| **Ruptura de Guarda** | Ataques diretos ignoram 10% da Defesa / Defesa Especial |
| **Foco Crítico** | +5 p.p. de chance crítica (teto 75%) |
| **Concentração** | −5% no cooldown de skills (não afeta IAS) |

> **P-027** — o conjunto de características **não está definido** pelo `Master-Prompt.md`. O §34 diz que a qualidade depende de "características" mas não lista nenhuma. Este pool é reaproveitado do repositório de referência e precisa de aprovação.

Característica e traço de arma **coexistem** sem interferir ([`WEAPON_SYSTEM.md` §2.1](WEAPON_SYSTEM.md#21-dois-efeitos-que-nunca-se-misturam)).

---

## 7. Pipeline de geração

Todo item novo percorre, **no servidor**:

```text
1. Verificar chance de drop (5%)
2.   └─ não → fim
3. Rolar raridade (50/30/15/4/0,9/0,1)
4. Escolher template elegível
5. Definir nível do item
6. Sortear x_i para CADA atributo, independentemente        ← §36
7. Se Lendário/Celestial → sortear 1 característica
8. Calcular Nota e Poder
9. Persistir seed + origem
10. Emitir evento de drop
```

**Determinismo:** mesma seed + mesma versão de config ⇒ mesmo item. Isso permite auditar, reproduzir bug e — no futuro — validar no servidor que o cliente não fabricou loot.

**Reprodutibilidade é requisito, não conveniência.** Sem ela, o §86 (server authority) fica semLast line.

---

## 8. Inventário e ações

Ver [`INVENTORY_SYSTEM.md`](INVENTORY_SYSTEM.md) para o sistema completo.

Ações disponíveis sobre um item:

| Ação | Regra | Fonte |
|---|---|---|
| **Equipar** | Substitui o item do slot | §71 |
| **Comparar** | Sempre disponível, lado a lado | §38 |
| **Vender por Coin** | **Sim** — gera Coin | §39 |
| **Anunciar no mercado** | Sim, fase online | §40 |
| Descartar | Permitido, com confirmação | ⚠️ provisório |

> **P-008** — o **preço de venda** não está definido. Quanto um item rende ao ser vendido é Tipo C. Uma proposta razoável (não uma regra) seria algo como `Poder × coeficienteDeRaridade`, o que faz o mercado de revenda ter algum significado, mas isso **precisa de aprovação**.

---

## 9. UI — a tela mais importante do jogo

A tela de inventário é onde o §34 e o §108 são-материализованы. Ela precisa:

1. **Mostrar o X de cada atributo individualmente** — nunca "x3.2" genérico.
2. **Diferenciar raridade com cor + forma + texto** (acessibilidade: cor sozinha não basta).
3. **Comparar lado a lado** com delta por atributo (verde/vermelho **e** seta **e** número).
4. **Mostrar o Nota** (qualidade da rolagem) **e** o Poder (força para a build) como **eixos separados**, com rótulo explicando a diferença.
5. **Mostrar característica e traço em campos separados**, nunca na mesma frase.
6. **Avisar quando o item de nível maior é pior** — o §38 existe para ser respeitado.
7. **Destacar o que mudou** quando um item novo chega, em vez de exigir que o jogador procure.

### 9.1 Feedback de drop

Quando um item cai, o jogo deve **parar por 1 segundo** e mostrar:

- Raridade do item (animação e cor).
- 2–3 atributos mais relevantes.
- Se for uma build diferente da atual, um aviso: *"Este item favorece Agilidade. Seu herói atual é uma build de Tank."*

Esse é o momento que o §108 promete. Uma notificação genérica de "+1 equipamento no inventário" desperdiça o momento mais valioso do loop.

---

## 10. O que nunca fazer

Lista explícita do §105, aplicada a equipamento:

- ❌ Fazer **todo inimigo** dropar equipamento (§30, §32)
- ❌ Fazer **todo equipamento** ser bom (§34, §35)
- ❌ Assumir o **mesmo X** para todos os atributos (§36)
- ❌ Assumir que **nível maior = melhor** (§38)
- ❌ Hardcodar probabilidades espalhadas (§32, §33)
- ❌ Calcular valor de item em componente de UI (§37)
- ❌ Deixar placeholder no produto final (§62)

---

## 11. Checklist de pronto

- [ ] Chance de drop = 5%, vindo da configuração
- [ ] Tabela de raridades soma 100% (teste automático)
- [ ] X **independente por atributo** (teste de distribuição — histograma, não mock)
- [ ] Nota e Poder calculados em módulo central, **não** na UI (teste de puridade)
- [ ] Característica só em Lendário/Celestial (teste)
- [ ] Traço e característica coexistem (teste)
- [ ] Determinismo: mesma seed ⇒ mesmo item (teste)
- [ ] Comparação item-a-item com delta por atributo
- [ ] Feedback de drop com contexto de build
- [ ] Venda por Coin com valor de `P-008` aprovado
- [ ] Item anunciado fica travado (`lockedByListingId`)

---

## 12. Pendências

| ID | Pendência | Bloqueia |
|---|---|---|
| `P-001` | Lista canônica de atributos e slots | Fase 9 |
| `P-010` | Faixa e granularidade do X | Fase 9 |
| `P-016` | Limite do inventário de equipamento | Fase 9 |
| `P-025` | Templates do catálogo | Fase 9 |
| `P-027` | Pool de características de raridade | Fase 9 |
| `P-008` | Preço de venda, valor de Coin | Fase 10 |
