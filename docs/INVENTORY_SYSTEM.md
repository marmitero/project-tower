# Sistema de Inventário

**Versão:** 0.1 · **Data:** 2026-09-30 · **Estado:** especificado, limite numérico bloqueado (P-016)
**Fonte:** §39–§40, §70, §71, §108 do `Master-Prompt.md`

---

## 1. Requisito

> *"Criar inventário real."* (§70)

Não é uma lista de strings. Deve suportar:

| Capacidade | Status |
|---|---|
| equipamentos | ✅ |
| armas | ✅ (slot `weapon`) |
| itens | ⚠️ P-032 — tipos além de equipamento |
| fragmentos | ✅ |
| consumíveis | ⚠️ P-032 |
| materiais | ⚠️ P-032 |
| filtros | ✅ |
| ordenação | ✅ |
| equipar | ✅ |
| vender | ✅ (§39) |
| anunciar | ✅ (§40, fase online) |

> **P-032** — o §70 lista "itens, consumíveis, materiais" como categorias do inventário, mas o `Master-Prompt.md` **não define nenhum** item, consumível ou material específico. O §44 menciona que cada moeda deve ter origem, uso, limite, persistência, auditoria e segurança — mas moedas não são itens. A estrutura de inventário suporta todas as categorias; **o conteúdo delas é Tipo C**.

---

## 2. Modelo de dados

O §71 é explícito sobre estrutura — **nunca** string:

```ts
interface Inventory {
  accountId: AccountId;
  items: ItemStack[];              // consumíveis, materiais, fragmentos
  equipment: Equipment[];          // itens de equipamento, não equipados
}

interface ItemStack {
  id: string;
  ownerId: AccountId;
  kind: "consumable" | "material" | "fragment" | "currency";
  definitionId: string;            // referência ao catálogo
  quantity: number;                // empilhado
  maxPerStack?: number;
  instanceId?: string;             // para itens não-empilháveis
  lockedByListingId?: string;      // travado no mercado
  acquiredAt: Timestamp;
}
```

### 2.1 Equipamento é sempre instância única

Itens de equipamento **nunca** são empilhados, porque cada um tem X individual (§36) — dois "Comum" com o `id` igual são **objetos diferentes**.

```ts
interface Equipment {
  id: EquipmentId;              // único por instância
  slot: EquipSlotId;
  itemTypeId: string;
  level: number;
  rarity: Rarity;
  xValues: Record<StatId, number>;   // ← o que torna cada item único
  quality: number;
  grade: Grade;
  traitId?: string;
  featureId?: FeatureId;
  seed: number;                 // auditoria/reprodução
  origin: LootOrigin;
  createdAt: Timestamp;
  lockedByListingId?: string;
}
```

---

## 3. Limite de capacidade

> **P-016** — o §13 diz que **heróis são ilimitados** e não diz nada sobre **equipamentos**. O `Master-Prompt.md` é explícito sobre o limite de personagens e **silencioso** sobre o de itens.

Um limite é necessário (memória, UI, largura de banda), mas o número é Tipo C.

A referência do repositório vizinho usa 300 itens não equipados. **Essa é uma referência técnica, não uma regra deste projeto.**

Comportamento quando o limite é atingido — decisão técnica provisória:

```text
Inventário cheio
    ↓
Termina o encontro ATUAL (não interrompe)
    ↓
Entrega todas as recompensas pendentes
    ↓
Retorna ao Reino e bloqueia novo encontro
    ↓
Jogador vende / anuncia / descarta
```

A regra de **nunca perder drop já concedido** é a invariante que importa: o jogador **nunca** pode ver um item existir e depois desaparecer.

---

## 4. Filtros

O §70 exige filtros. Conjunto mínimo, thinking de como o jogador realmente procura loot:

| Filtro | Valores |
|---|---|
| **Slot** | Arma, Peitoral, Elmo, Calça, Bota, Luva, Colar, Aura, Asa, Pet |
| **Tipo de arma** | 9 subtipos (só quando `slot = arma`) |
| **Raridade** | 6 valores, multisseleção |
| **Nível do item** | Faixa (slider) |
| **Classe / afinidade** | Herói que se beneficia |
| **Equipado** | Sim / não |
| **Origem** | Torre, Boss, mercado, evento |
| **Anunciado** | Sim / não (com lock) |
| **Texto** | Busca por nome |

### 4.1 Atalhos que importam

Três filtros Button de um toque, porque o jogador precisa deles **durante a hunt**:

1. **"Melhor que o equipado"** — o filtro mais usado de todos. Mostra só o que realmente melhora algo.
2. **"Não anunciado"**
3. **"Para <herói ativo>"** — dado que a Torre está em 1×1, o loot relevante é o do herói que está lutando agora.

O filtro #1 é o que transforma o inventário de lista em **ferramenta de decisão**, e é o que materializa o §108.

---

## 5. Ordenação

| Ordenação | Uso |
|---|---|
| Raridade (maior primeiro) | padrão — acha o melhor primeiro |
| Poder total | compara build |
| Nota (qualidade) | acha os god rolls |
| Nível do item | compara com o esperado |
| Data de aquisição | recentemente obtidos primeiro |
| Diferença vs. equipado | "o que mudou" |

A ordenação por **diferença vs. equipado** merece atenção: é a que responde "devo equipar isto?" em uma leitura.

---

## 6. Comparação de item

O §38 é uma regra de design sobre a UI:

> *"Um item de nível maior pode ser pior. O jogador deve comparar: atributos, X, raridade, sinergia, build, função. Isso valoriza o loot."*

### 6.1 Painel de comparação

```text
┌─────────────────────────────────────────────────────┐
│  NOVA: Celestial · Machado · Nv.14                   │
├──────────────────────┬──────────┬───────────────────┤
│ Atributo             │  ATUAL   │       NOVA        │
├──────────────────────┼──────────┼───────────────────┤
│ Attack        ×2.4   │   48     │   71    ▲ +23    │
│ Crit Chance   ×0.9   │   12%    │    4%   ▼ −8     │
│ HP            ×3.1   │  210     │  180    ▼ −30    │
│ Attack Speed  ×1.2   │   18%    │   31%   ▲ +13    │
├──────────────────────┴──────────┴───────────────────┤
│  Nota:  F (34)     Poder: 1.842  vs  1.690  ▲       │
│  ⚠ Você perde 8 p.p. de crítico                     │
│  ✓ Encaixa na build de crítico do seu Aventureiro    │
├─────────────────────────────────────────────────────┤
│  [ Equipar ]  [ Vender ]  [ Anunciar ]  [ Descartar ]│
└─────────────────────────────────────────────────────┘
```

Regras da UI:

- Delta com **cor + seta + número** (acessibilidade: cor sozinha não basta).
- Raridade com **cor + forma + texto**.
- Nota e Poder em **linhas separadas**, com rótulo explicando a diferença.
- Característica e traço em **campos separados**.
- Ação irreversível (descartar) exige confirmação explícita.
- Nada de "melhor" / "pior" automático — o §38 proíbe tratar nível como superioridade.

---

## 7. Ações

### 7.1 Equipar

- Substitui o item do slot correspondente.
- O item anterior volta para o inventário.
- Requer nível de conta suficiente para o nível do item — ⚠️ `P-033` (essa regra vem do repositório de referência, não do MP).

### 7.2 Vender

> **Equipamentos podem ser vendidos por Coin.** (§39)

```
Vender → Coin
```

> **P-008** — o preço de venda **não está definido**. Proposta (não regra): `preço = Poder × coeficiente × multiplicadorDeRaridade`, o que faz revenda ter significado seminflar a economia. **Precisa de aprovação humana.**

A venda deve:
- Ser irreversível após confirmação.
- Ser registrada em log de auditoria (§44).
- Respeitar o lock de mercado (`lockedByListingId`).

### 7.3 Anunciar

> **Equipamentos também podem ser anunciados para negociação entre jogadores.** (§40)

Ver [`MARKET_SYSTEM.md`](MARKET_SYSTEM.md).

Anunciar **trava** o item — não pode equipar, vender nem descartar enquanto announcement ativo.

### 7.4 Descartar

⚠️ Provisório — o §70 não menciona descarte. Permitido porque sem ele o inventário não tem válvula de escape (§16, limite). **Irreversível**, com confirmação.

---

## 8. Inventário de heróis

Separado do inventário de itens, e com uma regra diferente:

> **Personagens ilimitados.** (§13)

Sem limite, mas com exigência de UX:

- **Paginação** desde o começo.
- **Filtro** por classe, origem, fragmento acumulado, equipamento completo.
- **Ordenação** por nível, poder, raridade, data.
- **Comparação lado a lado** entre dois heróis.
- Indicador de **progresso de fragmentos** (quantos faltam para craftar).

O erro a evitar é o CRUD de "listar todos os personagens numa tabela". O inventário de herói precisa ser uma **coleção**, com a sensação de progresso que a §109 promete.

---

## 9. Performance

> **P-016** — o §94 exige evitar "renderizações excessivas" e "vazamentos de memória", e o §13 cria uma coleção sem limite.

Requisitos:

| Requisito | Solução |
|---|---|
| Milhares de itens | Paginação + virtualização de lista |
| Filtros sem lag | Índices em memória, recálculo memoizado |
| Re-render por item | Lista memoizada, item como componente puro |
| Sort estável | Ordenar por id como tiebreaker |
| Save grande | Serialização incremental, não JSON.stringify completo a cada tick |

Detalhe em [`PERFORMANCE.md`](PERFORMANCE.md).

---

## 10. Checklist de pronto

- [ ] Equipamento é dado estruturado, **nunca** string (§71)
- [ ] Itens de equipamento não são empilhados
- [ ] Filtros por slot, raridade, nível, classe, equipado
- [ ] Ordenação múltipla
- [ ] Comparação lado a lado com delta por atributo
- [ ] Delta com cor **e** seta **e** número
- [ ] Filtro "melhor que o equipado" funcionando
- [ ] Venda por Coin com valor aprovado (P-008)
- [ ] Anunciar trava o item
- [ ] Descarte exige confirmação
- [ ] Drop pendente **nunca** é perdido ao atingir o limite
- [ ] Heróis ilimitados com paginação
- [ ] Indicador de fragmentos no inventário de heróis
- [ ] Lista virtualizada (performance com muitos itens)

---

## 11. Pendências

| ID | Pendência | Bloqueia |
|---|---|---|
| `P-016` | Limite de capacidade do inventário | Fase 9 |
| `P-032` | Itens, consumíveis e materiais | Fase 9 |
| `P-008` | Preço de venda | Fase 10 |
| `P-033` | Requisito de nível para equipar | Fase 9 |
| `P-034` | Abas do inventário por tipo | Fase 9 |
