# Configuração Centralizada

**Versão:** 0.1 · **Data:** 2026-09-30 · **Estado:** baseline inicial, sem código
**Regra de origem:** §15, §20, §32, §33, §46, §105 do `Master-Prompt.md`

---

## 1. Por que este documento existe

O `Master-Prompt.md` repete, em oito seções distintas, a mesma proibição:

> *"Não espalhar `0.05` pelo código. Criar configuração central."* (§32)
> *"Os valores de Coin devem ser configuráveis. Não hardcodar custos espalhados pelo código. Criar configuração centralizada."* (§15)
> *"O sistema exato de divisão deve ser centralizado e configurável. Não espalhar fórmulas pelo código."* (§20)
> *"Nunca duplicar fórmulas em componentes de UI."* (§37)
> *"hardcodar probabilidades espalhadas"* e *"hardcodar custos espalhados"* estão na lista de PROIBIDO (§105)

Proibir hardcode não basta. **Dizer onde o número mora** é o que torna a regra aplicável. Este documento é o mapa. O código correspondente será `packages/config/src/*.ts`, com os mesmos IDs.

## 2. Formato

Configuração é **dado tipado e validado**, não constante. Três propriedades obrigatórias:

1. **Tipada** — TypeScript com schema; erro de tipo quebra o build.
2. **Validada na carga** — um arquivo `validateConfig()` roda no boot e falha alto se uma soma der errado.
3. **Versionada** — o estado salvo registra `configVersion`. Rebalancear o jogo não deve corromper saves antigos.

### Validações mínimas

```text
[ ] Toda tabela de probabilidade soma 100% (±0,001)
[ ] Todo ID referenciado existe no catálogo
[ ] Nenhum custo/desbloqueio negativo
[ ] Nível mínimo de slot é monotônico (slot2 < slot3)
[ ] Nenhum intervalo com min > max
[ ] Toda raridade listada tem cor, ícone e multiplicador
[ ] Nenhum ID duplicado
```

---

## 3. Identidade e conta

| ID | Chave | Valor | Fonte |
|---|---|---:|---|
| `account.kingPerAccount` | Reis por conta | **1** | §8 (Tipo A) |
| `account.nicknameMinLength` | — | 3 | ⚠️ provisório |
| `account.nicknameMaxLength` | — | 20 | ⚠️ provisório |
| `account.nicknamePattern` | — | `^[\p{L}\p{N}_-]+$` | ⚠️ provisório |
| `account.nicknameReserved` | lista reservada | `["admin","root","reina","reio","moderator","system"]` | ⚠️ provisório |
| `account.king.skins` | skins iniciais | ver §3.1 | §5 (Tipo A) |
| `account.offline.freeHours` | Offline Free | **2** | §48 (Tipo A) |
| `account.offline.vipHours` | Offline VIP | **8** | §48 (Tipo A) |
| `account.offline.rate` | Conversão tempo→recompensa | ⚠️ **PENDING** | P-011 |

### 3.1 Skins do Rei

> **P-006** — a lista de skins iniciais não foi especificada. O inventory de assets oferece 8 `hero_skins/`, o que é material de arte suficiente, mas **a escolha de quais são as iniciais é decisão de produto**.

Estrutura de dados prevista:

```ts
interface KingSkin {
  id: string;
  name: string;
  assetId: AssetId;        // referência estável, nunca caminho de arquivo
  unlock: { kind: "default" } | { kind: "level"; kingLevel: number } | { kind: "purchase"; ... };
}
```

---

## 4. Equipe e slots

| ID | Chave | Valor | Fonte |
|---|---|---:|---|
| `team.maxSize` | Máximo de heróis na equipe | **3** | §16 (Tipo A) |
| `team.slots[0]` | Nível mínimo | **1** | §15 |
| `team.slots[0].costCoin` | Custo | 0 | — |
| `team.slots[1]` | Nível mínimo | **10** | §15 (Tipo A) |
| `team.slots[1].costCoin` | Custo | ⚠️ **PENDING** | P-003 |
| `team.slots[2]` | Nível mínimo | **25** | §15 (Tipo A) |
| `team.slots[2].costCoin` | Custo | ⚠️ **PENDING** | P-003 |

**Regras estruturais:** desbloqueio exige **nível mínimo E Coin** simultaneamente (§46). O custo é debitado uma única vez e o slot nunca é revendido. Níveis mínimos são monotônicos e validados.

---

## 5. Divisão de XP

| ID | Chave | Valor | Fonte |
|---|---|---:|---|
| `xp.teamSplit.1` | 1 herói | **1.00** | §20 (Tipo A) |
| `xp.teamSplit.2` | 2 heróis | **0.50** ⚠️ provisório | P-004 |
| `xp.teamSplit.3` | 3 heróis | **0.3333** ⚠️ provisório | P-004 |
| `xp.roundingMode` | Arredondamento | `floor` | ⚠️ provisório |
| `xp.eligibleMembers` | Quem recebe XP | todos os slots **desbloqueados e ocupados** | §20 |
| `xp.kingShare.enabled` | Rei também ganha XP? | — | ⚠️ **PENDING** P-009 |

> **P-004** — divisão linear é o default provisório. A regra do §20 ("parcela menor", "parcela ainda menor") admite uma curva não-linear, que muda a estratégia de forma substancial. O total distribuído deve ser ≤ 100% para que a curva seja ajustável sem rebalançar todo o resto.

---

## 6. Loot

| ID | Chave | Valor | Fonte |
|---|---|---:|---|
| `loot.equipmentChance` | Chance de dropar equipamento | **0.05** | §32 (Tipo A) |
| `loot.equipmentChance.note` | — | 5% equipment / 95% nenhum | §32 |
| `loot.rarity.common` | Common | **0.50** | §33 (Tipo A) |
| `loot.rarity.uncommon` | Uncommon | **0.30** | §33 |
| `loot.rarity.rare` | Rare | **0.15** | §33 |
| `loot.rarity.epic` | Epic | **0.04** | §33 |
| `loot.rarity.legendary` | Legendary | **0.009** | §33 |
| `loot.rarity.celestial` | Celestial | **0.001** | §33 |

> Soma: 0.50 + 0.30 + 0.15 + 0.04 + 0.009 + 0.001 = **1.000** ✅ (validação automática)

**Composição efetiva de um drop:**

```text
1 em 20 inimigos  →  dropa equipamento
dentro dos drops  →  5% Common, 3% Uncommon, 1,5% Rare, ...
```

Ou seja, um Celestial cai em aproximadamente **1 a cada 20.000 inimigos**. Isso é intencional (§34, §35, §108): god rolls são raros por definição.

### 6.1 Regras estruturais do loot

| ID | Regra | Fonte |
|---|---|---|
| `loot.rollsPerDrop` | 1 rolagem de equipamento por inimigo derrotado | ⚠️ provisório |
| `loot.xRange.min` | Mínimo do X por atributo | ⚠️ **PENDING** P-010 |
| `loot.xRange.max` | Máximo do X por atributo | ⚠️ **PENDING** P-010 |
| `loot.fragments.fromCommonEnemies` | **false — PROIBIDO** | §12 (Tipo A) |
| `loot.x.independentPerAttribute` | **true** | §36 (Tipo A) |

> **P-010** — o `Master-Prompt.md` **não define a faixa do X**. A referência `tower-idle-adventure` usa inteiro 1–50 com fator `x/10`, e o exemplo do §36 (`Attack × 1.72`, `Defense × 0.93`, `Critical × 1.41`, `HP × 2.08`) é consistente com X fracionário — mas §36 não diz se o X **armazenado** é inteiro ou fracionário, só que o exemplo é decimal. Como X define diretamente o valor de todo item do jogo, é Tipo C. Ver `PENDING_RULES.md#p-010`.

---

## 7. Estado Procurando

| ID | Chave | Valor | Fonte |
|---|---|---:|---|
| `searching.enabled` | Estado existe | **true** | §27 (Tipo A) |
| `searching.minMs` | Mínimo | **2700** | §27 (aprox. 3s) |
| `searching.maxMs` | Máximo | **3200** | §27 |
| `searching.distribution` | Sorteio | uniforme em `[minMs, maxMs]` | ⚠️ provisório |
| `searching.pausesOnNavigation` | Pausa ao navegar | **false** | §29 (Tipo A) |
| `searching.pausesOnTabBlur` | Pausa ao perder foco | — | ⚠️ **PENDING** P-012 |
| `searching.multiTabPolicy` | Duas abas abertas | ⚠️ **PENDING** P-012 |

> **P-012** — o `Master-Prompt.md` diz que o timer "deve continuar ou ser tratado de maneira consistente" ao navegar (§29) e manda registrar `lastActiveAt` (§47), mas não define o comportamento com **duas abas do mesmo jogador**. Sem política explícita, dois timers correm em paralelo e o offline/online fica inconsistente. Reaproveitar a lição da referência: uma sessão ativa por conta, com cursor de lote no servidor.

---

## 8. Combatente

| ID | Chave | Valor | Fonte |
|---|---|---:|---|
| `combat.towerBattleSize` | Times na Torre | **1 × 1** | §17, §79 (Tipo A) |
| `combat.bossBattleSize` | Times no Boss | **equipe × 1** | §24, §80 (Tipo A) |
| `combat.towerAutoBossFloors` | Andares com boss na Torre | **[]** — lista vazia | §21, §55 (Tipo A) |
| `combat.critCap` | Teto de crítico | 0.75 | referência (ADR-001) |
| `combat.critMultiplier` | Dano do crítico | 1.5 | referência |
| `combat.baseActionIntervalMs` | T₀ | 2000 | referência |
| `combat.iasCapMin` / `Max` | Limite de IAS | −0.5 / +1.0 | referência |
| `combat.defenseConstant` | Constante da mitigação | 100 | referência |
| `combat.seedStrategy` | Determinismo | `battleSeed` persistido por batalha | ADR-008 |

Detalhe em [`COMBAT_SYSTEM.md`](COMBAT_SYSTEM.md).

---

## 9. Economia

| ID | Chave | Valor | Fonte |
|---|---|---|---|
| `economy.coins.name` | — | `Coin` | §43 (Tipo A) |
| `economy.coins.sources` | — | ⚠️ **PENDING** P-008 | §43 |
| `economy.coins.sinks` | — | ⚠️ **PENDING** P-008 | §43 |
| `economy.market.taxRate` | Taxa do mercado | **0.15** | §41 (Tipo A) |
| `economy.market.taxDestination` | Destino | **consumida pelo servidor** (sink) | §41 (Tipo A) |
| `economy.market.listingLimit` | Anúncios simultâneos | ⚠️ **PENDING** P-014 | §40 |
| `economy.market.minPrice` / `maxPrice` | Faixa de preço | ⚠️ **PENDING** P-014 | §40 |
| `economy.equipment.sellEnabled` | Venda por Coin | **true** | §39 (Tipo A) |
| `economy.equipment.sellPrice` | Preço de venda | ⚠️ **PENDING** P-008 | §39 |
| `economy.diamonds.enabled` | — | `false` no MVP | §44 |
| `economy.vip.enabled` | Estrutura presente | `true` (dados) | §49 (Tipo A) |
| `economy.vip.benefits` | Benefícios | ⚠️ **PENDING** P-013 | §49, §73 |

> **P-008** é o pendente mais amplo do projeto: **nenhum valor de Coin foi especificado**. A estrutura (fontes/sumidouros) é conhecida, os números não são. Inventar uma economia completa é exatamente o que o §73 proíbe.

---

## 10. Conteúdo da Torre

| ID | Chave | Valor | Fonte |
|---|---|---|---|
| `tower.floorCount` | Número de andares | ⚠️ **PENDING** P-005 | §22 |
| `tower.floors[]` | Definição de cada andar | ⚠️ **PENDING** P-005 | §22 |
| `tower.enemyPool[]` | Templates de inimigo | ⚠️ **PENDING** P-006 | §22, §54 |
| `tower.selectMode` | Seleção de andar | **manual** | §19, §107 |
| `tower.autoAdvance` | Avanço automático de andar | **false** | §19 (Tipo A) |
| `tower.bossInTower` | Boss em andar fixo | **false — PROIBIDO** | §21, §55 (Tipo A) |

---

## 11. XP e níveis

| ID | Chave | Valor | Fonte |
|---|---|---|---|
| `xp.king.levelCap` | Teto nível do Rei | ⚠️ **PENDING** P-009 | §46 |
| `xp.king.requiredPerLevel` | Curva | ⚠️ **PENDING** P-009 | §46 |
| `xp.hero.levelCap` | Teto nível do herói | ⚠️ **PENDING** P-009 | §9 |
| `xp.hero.requiredPerLevel` | Curva | ⚠️ **PENDING** P-009 | §9 |
| `xp.separatePools` | Rei e herói independentes | **true** | §45 (Tipo A) |

> **P-009** — as curvas de XP não foram especificadas. Elas determinam quão rápido o jogador chega aos níveis 10 e 25 (desbloqueio de slots), e portanto **o ritmo de todo o jogo**.

---

## 12. Heróis

| ID | Chave | Valor | Fonte |
|---|---|---|---|
| `heroes.starterCount` | Heróis iniciais | **4** | §10 (Tipo A) |
| `heroes.starterChoice` | Quantos o jogador recebe | **1** | §10 (Tipo A) |
| `heroes.ownedLimit` | Limite de heróis | **`null`** (ilimitado) | §13 (Tipo A) |
| `heroes.fragments.enabled` | Sistema de fragmentos | **true** | §12 (Tipo A) |
| `heroes.fragments.dropFromCommonTower` | Drop de fragmentos de inimigo comum | **false — PROIBIDO** | §12 (Tipo A) |
| `heroes.stars.max` | Estrelas | ⚠️ **PENDING** P-015 | §9 |
| `heroes.classes[]` | Definição dos 4 heróis | ⚠️ **PENDING** P-002 | §10 |

> **P-002** é o bloqueio mais duro do roadmap: **sem os 4 heróis não há Fase 4**, e sem a Fase 4 não há vertical slice.

---

## 13. Inventário

| ID | Chave | Valor | Fonte |
|---|---|---|---|
| `inventory.equipment.maxItems` | Itens de equipamento | ⚠️ **PENDING** P-016 | §70 |
| `inventory.consumable.maxPerType` | Consumíveis | ⚠️ **PENDING** P-016 | §44 |
| `inventory.pageSize` | Itens por página | 50 | ⚠️ provisório |
| `inventory.defaultSort` | Ordenação padrão | `rarity_desc` | ⚠️ provisório |
| `inventory.filters[]` | Filtros | `["tipo","raridade","slot","nivel","equipado"]` | §70 |

> **P-016** — o §13 diz "personagens ilimitados", mas **não diz nada sobre o limite de equipamentos**. A referência usa 300 itens não equipados. Um limite é necessário (UI e armazenamento), mas o número é Tipo C.

---

## 14. Performance

| ID | Chave | Valor | Fonte |
|---|---|---|---|
| `perf.targetFps` | Alvo | 60 | §94 |
| `perf.minFps` | Mínimo aceitável | 30 | ⚠️ provisório |
| `perf.maxBundleJs` | JS inicial (gzip) | 700 KB | ⚠️ provisório |
| `perf.maxAssetsInitial` | Assets no load inicial | 8 MB | ⚠️ provisório |
| `perf.renderScale.mobile` | Escala do canvas | 0.75 | §67 |
| `perf.idleTicksPerSecond` | Atualizações de estado ociosas | 1 | ⚠️ provisório |

Detalhe em [`PERFORMANCE.md`](PERFORMANCE.md).

---

## 15. Matriz de rastreabilidade

Confirma que todo número do `Master-Prompt.md` tem um destino único neste documento.

| Seção MP | O que define | ID de config |
|---|---|---|
| §5 | Skins do Rei | `account.king.skins` |
| §8 | Um Rei por conta | `account.kingPerAccount` |
| §13 | Heróis ilimitados | `heroes.ownedLimit = null` |
| §15 / §46 | Slots 1/2/3 | `team.slots[]` |
| §16 | Limite de equipe | `team.maxSize` |
| §17 / §79 | Torre 1×1 | `combat.towerBattleSize` |
| §20 / §81 | Divisão de XP | `xp.teamSplit` |
| §21 / §55 | Torre sem boss | `combat.towerAutoBossFloors = []` |
| §24 / §80 | Boss = equipe | `combat.bossBattleSize` |
| §27 | ~3 segundos | `searching.minMs/maxMs` |
| §29 | Navegar não quebra | `searching.pausesOnNavigation` |
| §32 | 5% de drop | `loot.equipmentChance` |
| §33 | Raridades | `loot.rarity.*` |
| §36 | X individual | `loot.x.independentPerAttribute` |
| §39 | Venda por Coin | `economy.equipment.sellEnabled` |
| §41 | Taxa 15% | `economy.market.taxRate` |
| §43 | Fontes e sumidouros | `economy.coins.sources/sinks` |
| §45 | XP separado | `xp.separatePools` |
| §48 | 2h / 8h offline | `account.offline.*` |
| §49 | VIP desde cedo | `economy.vip` |
| §63 | Stack | [`ARCHITECTURE.md`](ARCHITECTURE.md) |
| §67 | Responsividade | `perf.renderScale` |
| §94 | Performance | [`PERFORMANCE.md`](PERFORMANCE.md) |
| §66 | Eventos | [`COMBAT_SYSTEM.md`](COMBAT_SYSTEM.md) |
| §71 | Estrutura de Equipment | [`EQUIPMENT_SYSTEM.md`](EQUIPMENT_SYSTEM.md) |
| §72 | Armas | [`WEAPON_SYSTEM.md`](WEAPON_SYSTEM.md) |

---

## 16. Onde o código vai

```text
packages/config/src/
├── index.ts              # reexporta tudo
├── validate.ts           # validateConfig(): roda no boot, falha alto
├── account.ts            # §3
├── team.ts               # §4
├── xp.ts                 # §5, §11
├── loot.ts               # §6
├── searching.ts          # §7
├── combat.ts             # §8
├── economy.ts            # §9
├── tower.ts              # §10
├── heroes.ts             # §12
├── inventory.ts          # §13
├── performance.ts        # §14
└── __fixtures__/         # configuração de teste
```

Toda constante de balanceamento no resto do código **precisa** vir daqui. Um lint rule deve rejeitar literais mágicos nos diretórios de gameplay.
