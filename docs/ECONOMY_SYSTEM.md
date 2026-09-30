# Sistema de Economia

**Versão:** 0.1 · **Data:** 2026-09-30 · **Estado:** **ESTRUTURA definida · VALORES bloqueados (P-008)**
**Fonte:** §15, §39, §41, §43, §44, §49, §73, §99, §124 do `Master-Prompt.md`

---

## 1. Status deste documento — leia primeiro

> ⚠️ **A estrutura da economia está definida. Nenhum valor numérico de Coin foi especificado no `Master-Prompt.md`.**

O §43 exige que a economia tenha **fontes** e **sumidouros claramente documentados**, e define que Coin é usado para desbloquear slots, compras, melhorias, sistemas, mercado e progressão. Mas **não diz**:

- quanto Coin um inimigo deixa;
- quanto custa desbloquear o slot 2 e o slot 3;
- quanto vale um equipamento vendido;
- quais são os preços da loja;
- qual é o preço de referência de um anúncio;
- quais são os limites de anúncio.

O §73 é categórico sobre isso:

> **Tipo C — Regra de gameplay/economia crítica: não inventar. Registrar PENDING e, quando necessário, solicitar decisão humana.**

> **P-008 é, portanto, o bloqueio mais abrangente do projeto.** Sem ele, a Fase 10 (Economia) não pode ser implementada, e sem a Fase 10 o balanceamento do jogo não existe.

O que **é** definido e está fechado: **a taxa de mercado de 15%** (§41) e **a existência de venda por Coin** (§39).

---

## 2. Moedas

O §44 define a estrutura obrigatória de cada moeda:

```ts
interface CurrencyDefinition {
  id: CurrencyId;          // "coin" | "diamond" | ...
  name: string;
  kind: "premium" | "soft" | "seasonal" | "resource";
  maxAmount?: bigint;      // limite de acúmulo
  stackable: true;
  tradeable: boolean;       // ⚠️ Diamonds negociáveis exigem controles extra
}
```

| Regra (§44) | Aplicação |
|---|---|
| **Origem** | De onde vem |
| **Uso** | Para que serve |
| **Limite** | Teto de acúmulo |
| **Persistência** | Onde é salva, com integridade |
| **Auditoria** | Log de toda mutação |
| **Segurança** | Quem pode alterar |

### 2.1 Coin

- **Moeda principal** (§43).
- Usada para: desbloquear slots, compras, melhorias, sistemas, mercado, progressão.
- **Não** é transacionável entre jogadores diretamente — o mercado compra Coin, e o servidor cobra a taxa.

### 2.2 Diamonds

O §44 lista Diamonds como moeda possível. O §73 proíbe inventar vantagem de VIP e fórmula de moeda.

> **P-035** — **fonte e uso de Diamonds não estão definidos.** Tipo C. Não aparece no MVP.

### 2.3 Moedas de evento e recursos

Mesma estrutura, com `kind: "seasonal" | "resource"`. Conteúdo futuro.

---

## 3. Fontes de Coin

O §43 exige documentação clara das fontes. A **estrutura** está definida; os **valores** são P-008.

| Fonte | Fonte definida? | Valor |
|---|---|---|
| Inimigo comum da Torre | ✅ estrutural | ⚠️ P-008 |
| Boss | ✅ estrutural | ⚠️ P-008 |
| Recompensa de andar concluído | ✅ estrutural | ⚠️ P-008 |
| Venda de equipamento | ✅ (§39) | ⚠️ P-008 |
| Evento / sistema especial | ✅ estrutural | ⚠️ P-008 |
| Missão / conquista | ⚠️ P-036 | ⚠️ P-008 |
| VIP | ✅ estrutural (§49) | ⚠️ P-013 |
| Compra com dinheiro real | ❌ **fora do MVP** | — |

### 3.1 Dangerous sinks

O inverso também precisa existir, ou a moeda infla e perde significado:

| Sumidouro | Definido? |
|---|---|
| Desbloqueio de slot de equipe (§15) | ✅ estrutural, valor ⚠️ P-003 |
| Mercado da Comunidade — **taxa de 15%** (§41) | ✅ **valor fechado** |
| Compra na loja | ⚠️ P-036 |
| Melhoria de equipamento | ⚠️ P-037 |
| Cura / consumíveis | ⚠️ P-036 |
| Reprocessamento / fusão | ⚠️ P-038 |

> **A taxa de 15% do mercado é, no momento, o único sumidouro com número fechado.** Ela é suficiente para dar utilidade à moeda, mas o resto da economia precisa de decisão humana.

---

## 4. A taxa de 15% — o único número fechado

> **Toda transação entre jogadores terá 15% de taxa.** (§41)

```text
Venda: 100.000 Coin

Comprador paga:  100.000
Vendedor recebe:  85.000
Servidor consome: 15.000
```

Regras explícitas do §41:

- A taxa **não vai** para outro jogador.
- **Não gera Coin** para o vendedor.
- É **consumida pelo servidor**.
- Funciona como **sink econômico**.

E a regra de atomicidade (§87):

```text
Buyer  − Preço
Seller + Preço − 15%
Server  consome 15%
Item   → Buyer
```

Tudo em **uma transação atômica**, processada no servidor.

> **Aplications diretas:**
> - A taxa é um **sink** — reduz a moeda total do sistema, o que é anti-inflação.
> - Vender no mercado é **pior** que vender ao sistema (se existir) — caso contrário, ninguém usa a venda direta.
> - A taxa precisa estar **fora do preço de exibição** ou claramente visível, para não parecer que o vendedor recebeu menos do que o anunciado.

> **P-014** — regras de anúncio (limite simultâneo, preço mínimo/máximo, duração do anúncio, taxa de listagem separada) **não estão definidas**.

---

## 5. XP — dois eixos, nunca misturados

> **"Nunca misturar."** (§45)

| | **XP do Rei** | **XP do Herói** |
|---|---|---|
| Controla | nível da conta, desbloqueios, slots, acesso à Torre | nível do personagem |
| Pool | `king.xp` | `hero.xp` (por herói) |
| Fonte |.andar concluído, marcos, eventos | vitórias, Boss |
| Curva | ⚠️ P-009 | ⚠️ P-009 |

Ver [`CHARACTER_SYSTEM.md`](CHARACTER_SYSTEM.md) e [`COMBAT_SYSTEM.md`](COMBAT_SYSTEM.md).

---

## 6. Inventário econômico

O §44 exige que a economia seja **auditável**. Estrutura mínima:

```ts
interface LedgerEntry {
  id: string;
  accountId: AccountId;
  currency: CurrencyId;
  delta: bigint;           // positivo ou negativo
  reason: LedgerReason;    // "tower_kill" | "market_sale" | "slot_unlock" | ...
  refId?: string;          // battleId, listingId, slotId...
  balanceAfter: bigint;
  at: number;
}
```

O ledger é **append-only** (§87, referência técnica). Ele permite:

- Auditar a origem de qualquer moeda.
- Detectar duplicação (recompensa com o mesmo `refId`).
- Explicar ao jogador de onde veio cada Coin.
- Investigar abuso.

---

## 7. Segurança econômica

O §86 e o §93 são explícitos: no lançamento, **o cliente não é confiável**.

O servidor deve validar:

- Coin
- Diamonds
- XP
- níveis
- loot
- equipamentos
- personagens
- fragmentos
- mercado
- transações
- progressão
- recompensas
- PvP
- Boss
- sistemas econômicos

> *"Nunca confiar simplesmente em `localStorage` ou `client state` para valores econômicos."* (§86)

Detalhe em [`SECURITY.md`](SECURITY.md).

---

## 8. Fluxo de uma transação de mercado

```text
Jogador anuncia
    ↓
Servidor valida: item existe? pertence ao vendedor? não está bloqueado?
                 preço válido? dentro dos limites? (P-014)
    ↓
Item fica TRAVADO (lockedByListingId)
    ↓
Comprador clica "Comprar"
    ↓
Servidor (transação atômica):
    ├── Comprador tem Coin suficiente?
    ├── Anúncio ainda disponível?
    ├── debita  Comprador − Preço
    ├── credita  Vendedor + Preço × 0.85
    ├── registra Server + Preço × 0.15  (sink)
    ├── transfere Item → Comprador
    ├── marca   Anúncio como vendido
    └── grava   Ledger (3 entradas) + histórico
    ↓
Resposta ao cliente
```

Se **qualquer** validação falhar, **nada** é alterado (§87).

---

## 9. Saldo da Economia — a pergunta que ainda não foi respondida

A economia precisa responder a uma pergunta básica que **não está no `Master-Prompt.md`**:

> **Qual é o principal sumidouro de Coin depois do mercado?**

Sem um sumidouro grande além da taxa de 15%, a moeda **infla** com o tempo — cada hora de idle gera Coin, e nada consome na mesma proporção. Num jogo idle, inflação não é um problema estético: é o motivo pelo qual os números de custo deixam de ter sentido depois de algumas semanas.

Três candidatos, **nenhum escolhido aqui**:

| Candidato | Prós | Contras |
|---|---|---|
| Melhoria/upgrade de equipamento | Sumidouro escala com a progressão | Precisa de sistema de upgrade (P-037) |
| Reparo/consumível na Torre | Consome no ritmo do gameplay | Pode punir o idle |
| Buildings/upgrade do Reino | Consome, escala com o Rei | Escopo adicional |

> **P-036** — sumidouros principais da economia. **Decisão de design de produto.** Precisa de aprovação humana e deveria ser decidida **antes** de qualquer implementação, porque todos os outros valores dependem dela.

---

## 10. Valores que NÃO são inventados

Lista explícita do que este documento **não** define, para evitar que um leitor interprete ausência como "use um valor razoável":

| Valor | Por quê não |
|---|---|
| Coin por inimigo | Tipo C |
| Coin por Boss | Tipo C |
| Custo dos slots 2 e 3 | §15 diz que é configurável, mas não dá o número |
| Preço de venda de equipamento | Tipo C |
| Preços de loja | Tipo C |
| Preço de anúncio mínimo/máximo | Tipo C |
| Valor de fragmento em Coin | Não definido |
| Benefícios de VIP em Coin/XP | §49, §73 |
| Taxa de Diamonds | §73 |

---

## 11. Checklist de pronto

- [ ] `coin` e demais moedas com origem, uso, limite, persistência, auditoria (§44)
- [ ] **Fontes** de Coin documentadas e implementadas (§43)
- [ ] **Sumidouros** de Coin documentados e implementados (§43)
- [ ] Ledger append-only com `balanceAfter` em toda mutação
- [ ] Venda de equipamento por Coin funciona (§39)
- [ ] Taxa de mercado = **15%**, consumida pelo servidor (§41)
- [ ] Transação de mercado **atômica** (§87)
- [ ] Retry/desconexão **não duplica** moeda nem item
- [ ] Servidor valida toda mutação de moeda (§86)
- [ ] Nenhum valor econômico hardcoded fora de `packages/config` (§105)
- [ ] Telas de confirmação antes de gasto irreversível
- [ ] Resumo de saldo visível na HUD

---

## 12. Pendências

| ID | Pendência | Bloqueia |
|---|---|---|
| `P-008` | **Todos os valores de Coin** (fontes, vendas, custos) | **FASE 10** |
| `P-036` | **Sumidouros principais da economia** | **FASE 10** |
| `P-014` | Regras de anúncio do mercado (limites, faixa de preço) | FASE Market |
| `P-013` | Benefícios de VIP | FASE Monetização |
| `P-035` | Fonte e uso de Diamonds | FASE Monetização |
| `P-037` | Sistema de melhoria de equipamento | Pós-MVP |
| `P-038` | Reprocessamento / fusão | Pós-MVP |
| `P-003` | Custo dos slots 2 e 3 | FASE 5 |

---

## 13. Referências

- [`MARKET_SYSTEM.md`](MARKET_SYSTEM.md) — a taxa de 15% em detalhe
- [`CHARACTER_SYSTEM.md`](CHARACTER_SYSTEM.md) §5 — slots de equipe
- [`AUTOMATION_SYSTEM.md`](AUTOMATION_SYSTEM.md) §6 — produção de recurso offline
- [`SECURITY.md`](SECURITY.md) — autoridade do servidor
- [`PENDING_RULES.md`](PENDING_RULES.md) — P-008, P-036
