# Sistema de Mercado

**Versão:** 0.1 · **Data:** 2026-09-30 · **Estado:** especificado, regras de anúncio bloqueadas (P-014)
**Fonte:** §39, §40, §41, §42, §87, §93, §99, §124 do `Master-Prompt.md`

---

## 1. Escopo

> **Equipamentos também podem ser anunciados para negociação entre jogadores.** (§40)

O mercado da comunidade deve permitir:

| Capacidade | Status |
|---|---|
| Anúncio | ✅ |
| Preço | ✅ |
| Compra | ✅ |
| Cancelamento | ✅ |
| Histórico | ✅ |
| Status | ✅ |
| **Taxa** | ✅ **15% — valor fechado** |
| Proteção contra duplicação | ✅ |
| Validação server-side | ✅ |

> **O mercado é sistema de lançamento/produção. Não precisa bloquear o MVP local** (§42). No MVP local pode existir: *mock, desativado ou estrutura técnica.*

> **Não simular uma economia online falsa como se fosse real.** (§42)

---

## 2. A taxa de 15%

Este é o **único número fechado** da economia (fora os valores do §32/§33 de loot).

> **Toda transação entre jogadores terá 15% de taxa.** (§41)

```text
Venda: 100.000 Coin

Comprador paga:  100.000
Vendedor recebe:  85.000
Servidor consome: 15.000
```

Propriedades explícitas do §41:

- A taxa **não vai para outro jogador**.
- **Não gera Coin para o vendedor**.
- É **consumida pelo servidor**.
- Funciona como **sink econômico**.

### 2.1 Consequências de design

1. **Anti-inflação.** Cada transação destrói 15% da moeda em circulação. Em uma economia de jogo idle (que gera moeda continuamente), isso é essencial.
2. **Vender ao mercado é pior que vender ao sistema.** Se existirem as duas opções, o mercado é unattractive a menos que o preço de venda ao sistema seja deliberadamente ruim.
3. **A taxa precisa ser visível.** O preço anunciado é o que o comprador paga. Se o vendedor recebe menos, isso é informação pública, não surpresa na venda.

> **P-014** — a **taxa de listagem** (cobrada ao anunciar, além da taxa de venda) **não está definida**. Se existir, deve ser proporcional e reduzida para anúncios longos, senão ninguém anuncia.

---

## 3. Modelo de dados

```ts
interface MarketListing {
  id: string;
  sellerKingId: string;
  equipmentId: string;         // referência ao item TRAVADO

  price: bigint;               // preço pedido, em Coin
  status: "active" | "sold" | "cancelled" | "expired";

  createdAt: number;
  expiresAt: number;           // ⚠️ P-014
  soldAt?: number;
  buyerKingId?: string;
}

interface MarketHistoryEntry {
  id: string;
  listingId: string;
  sellerKingId: string;
  buyerKingId: string;
  price: bigint;
  sellerNet: bigint;           // preço × 0.85
  tax: bigint;                 // preço × 0.15
  completedAt: number;
}
```

O histórico é **append-only** e serve tanto para auditoria quanto para o Ledger (§44).

---

## 4. Anunciar

```text
Jogador seleciona item do inventário
    ↓
Define preço
    ↓
Servidor valida:
  ├── O item existe?
  ├── O item pertence ao jogador?
  ├── O item NÃO está travado por outro anúncio?
  ├── O preço é positivo?
  ├── O preço está dentro da faixa permitida?  (P-014)
  ├── O jogador não excedeu o limite de anúncios? (P-014)
  └── O jogador não está com conta suspensa
    ↓
Transação:
  ├── Marca item com lockedByListingId
  └── Cria listing com status "active"
    ↓
Aparece no catálogo
```

O item fica **travado** — não pode equipar, vender nem descartar enquanto o anúncio estiver ativo (§71: `lockedByListingId`).

---

## 5. Comprar — a transação atômica

O §87 é específico sobre o que **não pode** acontecer:

> **Nunca permitir duplicação de item ou duplicação de moeda.**

Validações obrigatórias antes de qualquer escrita:

```text
☑ O anúncio existe e está "active"?
☑ O preço é válido?
☑ O comprador tem Coin suficiente?
☑ O item ainda pertence ao vendedor?
☑ O item não está travado por outro motivo?
☑ A transação ainda está disponível?
```

Depois, **tudo em uma transação atômica**:

```text
Buyer  − Preço
Seller + Preço − 15%
Server  consome 15%
Item   → Buyer
Listing  status = "sold"
History entry criada
Ledger: 3 entradas
```

Se **qualquer** passo falhar, **nada** é aplicado. Não existe estado parcial.

> **Decisão técnica (ADR-008):** o servidor executa isso em uma **transação de banco** com `SERIALIZABLE` ou lock otimista via `expected_version` no listing. Duas compras simultâneas do mesmo anúncio não podem ser ambas bem-sucedidas.

---

## 6. Idempotência

O risco mais caro do mercado é **duplicação por retry ou duplo clique**.

| Cenário | Proteção |
|---|---|
| Usuário clica duas vezes | `requestId` único; o segundo é rejeitado |
| Timeout de rede, retry | Retorna o **mesmo resultado** da primeira execução |
| Duas abas compram o mesmo anúncio | Lock transacional; uma falha |
| Servidor executa, cliente não recebe | Cliente consulta status pelo `listingId` |
| Reconexão | Estado é sempre **consultado**, nunca reconstruído localmente |

> **A regra:** uma compra responde com o **mesmo corpo** se executada com o **mesmo** `requestId`. Isso é o que diferencia retry de duplicação.

---

## 7. Cancelamento

O §40 exige cancelamento. O cancelamento de um Listing ativo:

- Libera o item (remove `lockedByListingId`).
- Não cobra nada.
- É idempotente (cancelar duas vezes não faz mal).
- Registra no histórico como `cancelled`.

> **P-014** — a **duração** do anúncio e se há renovação automática **não estão definidas**.

---

## 8. Histórico

O §40 exige histórico. Serve para:

- O vendedor ver o que happened aos seus itens.
- Auditoria de transações.
- Detecção de fraude (mesmo item vendido duas vezes, lavagem de dinheiro).
- Transparência: o comprador vê a reputação do vendedor.

```ts
interface MarketReputation {
  kingId: string;
  completedSales: number;
  cancelledBeforeSale: number;
  disputesLost: number;
  averagePrice: bigint;
}
```

> **P-053** — o que constitui uma **disputa** e como ela é resolvida **não está definido**. Uma disputa mal resolvida é um exploit clássico (comprar, reclamar, reaver).

---

## 9. Segurança e antifraude

O §93 lista os riscos que a arquitetura deve dificultar. Para o mercado especificamente:

| Ameaça | Mitigação |
|---|---|
| **Item duplicado** | Lock transacional + constraint de FK |
| **Moeda duplicada** | Transação atômica + ledger |
| **Preço manipulado** | Servidor valida faixa; ledger detecta wash trading |
| **Conta de mentira** | Google Auth obrigatório; contas antigas required para vender |
| **Wash trading** (si mesmo) | Ledger detecta ciclo; não altera saldo líquido, mas polui o histórico |
| **Venda de item roubado** | A conta legítima denuncia; item volta ao dono via disputa |
| **Rush de anúncios** | Rate limit + limite diário de anúncios |
| **Phishing de preço** | UI mostra preço final e taxa claramente |
| **Bot de revenda** | Limite de anúncios, cooldown entre anunciar o mesmo item |

### 9.1 A taxa de 15% como defesa

Um efeito colateral útil: com 15% de taxa, **wash trading é economicamente caro**. Fazer o mesmo par de compra/venda 100 vezes para inflar histórico custa 15% do valor a cada vez. Isso desincentiva o ataque sem precisar de detecção complexa.

---

## 10. UX

O §40 exige a capacidade completa; o §67/§68 exigem que funcione em Android.

- **Listagem** com item, preço, vendedor, reputação, tempo restante.
- **Comparar** com o que está equipado, antes de comprar.
- **Aviso de taxa** no momento da compra: *"Vendedor recebe 85.000 · Taxa 15%"*.
- **Confirmar** com resumo do valor final.
- **Meus anúncios** com cancelamento.
- **Histórico** de compras e vendas.
- Filtros: por slot, raridade, nível, preço, seller.

### 10.1 O mercado não deve ser um CRUD

O §105 proíbe transformar tudo em cards. O mercado é uma **decisão econômica** — precisa mostrar o suficiente para decidir e nada que só sirva para navegar.

---

## 10a. O Market do Reino (loja por Coin — implementado, ADR-025)

> Não confundir com o **Mercado da Comunidade** deste documento (entre jogadores, taxa de 15%, futuro). O **Market** é a loja do Reino: compra **só com Coin**, sem taxa, sem outros jogadores, **100% data-driven** (`config.market`).

- **Abas:** Poções (cura fixa e em %), Revives (30/50/100%), Caixas (fragmentos e heróis).
- **Preço:** fixo em Coin ou em **abates** (acompanha a economia); caixas exigem nível do Rei (250/1.500/5.000) e são deliberadamente caras e de chance baixa — **segundo meio** de obter heróis, não o foco.
- **Fragmentos** são da conta (classe + raridade); a invocação usa `heroAcquisition.fragmentsRequired`.
- **Bot:** poções e revives são consumidos automaticamente (online e offline) conforme as opções do jogador.
- Detalhes, valores e alternativas rejeitadas: ADR-025 em [`DECISIONS_LOG.md`](DECISIONS_LOG.md); metas de tempo por caixa em [`BALANCE_REPORT.md`](BALANCE_REPORT.md).

---

## 10b. Futuro: anúncio de personagens evoluídos (registro, 2026-10-03)

Decisão do usuário: **no futuro o Rei poderá anunciar no Mercado da Comunidade personagens (heróis) evoluídos** — com nível, estrelas, XP e equipamento acumulados. **Não implementar agora.** Preparação já feita ou exigida:

- o teto de nível (20.000) e o XP por herói (`Hero.level/xp`) já são dado persistido e serializável;
- o anúncio de herói deve seguir a mesma transação atômica do §5 (taxa de 15%, idempotência, server-authoritative) — um herói à venda sai da equipe/slot e é **bloqueado** (não luta, não recebe XP);
- precisa de decisões novas (⛔ a abrir quando for desenhado): o que acontece com o equipamento do herói vendido, se o herói inicial (§10) pode ser vendido, o preço mínimo e o impacto na economia (risco R-01 em [`PENDING_RULES.md`](PENDING_RULES.md): heróis tardios com XP dividido).

---

## 11. No MVP local

> **No modo local pode existir: mock, desativado, estrutura técnica.** (§42)
>
> **Não simular uma economia online falsa como se fosse real.**

Decisão técnica: **desativado com estrutura técnica presente**.

- O serviço `MarketService` existe com a interface completa.
- A implementação `MockMarketService` existe para desenvolvimento, **mas a UI exibe um aviso claro** de que é local.
- A flag `features.market.enabled` é `false` por padrão.
- Nenhum Coin virtual de mercado é mintado.

> *"Não simular uma economia online falsa como se fosse real"* (§42) — um mercado mock que permite "vender item por 1.000.000 Coin" teaches o jogador a economia errada.

---

## 12. Checklist de pronto

- [ ] Anunciar valida posse, lock, preço, limite
- [ ] Item fica **travado** enquanto anunciado
- [ ] Compra é **atômica** (§87)
- [ ] Taxa de **15%** consumida pelo servidor (§41)
- [ ] Vendedor recebe 85% (§41)
- [ ] Nunca duplica item (§87)
- [ ] Nunca duplica moeda (§87)
- [ ] Retry com mesmo `requestId` retorna o mesmo resultado
- [ ] Cancelamento idempotente
- [ ] Histórico append-only
- [ ] Reputação do vendedor
- [ ] Rate limit em anunciar/comprar
- [ ] Aviso de taxa visível antes da confirmação
- [ ] Desativado no MVP local, com aviso explícito (§42)
- [ ] Funciona por touch (§68)

---

## 13. Pendências

| ID | Pendência | Bloqueia |
|---|---|---|
| `P-014` | Limite de anúncios, faixa de preço, duração, taxa de listagem | FASE Market |
| `P-008` | Valor de referência dos itens (para o jogador saber preço justo) | FASE Market |
| `P-053` | Sistema de disputa e resolução | FASE Market |
| `P-054` | Regras anti-wash-trading e detecção de anomalias | FASE Market |
| `P-055` | Worm de bots de revenda | Pós-lançamento |

---

## 14. Referências

- [`ECONOMY_SYSTEM.md`](ECONOMY_SYSTEM.md) §4 — a taxa de 15% no contexto da economia
- [`INVENTORY_SYSTEM.md`](INVENTORY_SYSTEM.md) §7.3 — o lock do item
- [`SECURITY.md`](SECURITY.md) — autoridade e transações
- [`CHARACTER_SYSTEM.md`](CHARACTER_SYSTEM.md) — o que pode ser negociado (heróis, fragmentos, itens)
