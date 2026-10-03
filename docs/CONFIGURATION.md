# Configuração Centralizada

**Versão:** 0.2 · **Data:** 2026-10-01 · **Estado:** implementada (`packages/config`)
**Regra de origem:** §15, §20, §32, §33, §46, §105 do `Master-Prompt.md` · dados de classe/status/skills com base [OpenRpg](OPENRPG_REFERENCE.md)

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
| `loot.x.min` | Mínimo do X por atributo | ✅ **0,50** (P-010, ADR-023) |
| `loot.x.max` | Máximo do X por atributo | ✅ **2,50** |
| `loot.x.decimals` | Casas decimais | ✅ **2** |
| `loot.x.shape` | Forma (média de `samples` uniformes, elevada a `power`) | ✅ `{ samples: 3, power: 2 }` ⇒ média ≈ 1,05; ≥ 2,00 ≈ 1% |
| `loot.fragments.fromCommonEnemies` | **false — PROIBIDO** | §12 (Tipo A) |
| `loot.x.independentPerAttribute` | **true** | §36 (Tipo A) |

> **P-010 resolvida** (ADR-023): X fracionário 0,50–2,50, decidido por delegação e editável. O `Master-Prompt.md` não fixa a faixa; o exemplo do §36 (`Attack × 1.72`, `Defense × 0.93`, `Critical × 1.41`, `HP × 2.08`) cabe nela. Ver `PENDING_RULES.md#p-010`.

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
| `economy.coins.sources` | — | ⚠️ provisório (P-008, ADR-025) | §43 |
| `economy.coins.sinks` | — | ⚠️ provisório (P-008, ADR-025) | §43 |
| `economy.market.taxRate` | Taxa do mercado | **0.15** | §41 (Tipo A) |
| `economy.market.taxDestination` | Destino | **consumida pelo servidor** (sink) | §41 (Tipo A) |
| `economy.market.listingLimit` | Anúncios simultâneos | ⚠️ **PENDING** P-014 | §40 |
| `economy.market.minPrice` / `maxPrice` | Faixa de preço | ⚠️ **PENDING** P-014 | §40 |
| `economy.equipment.sellEnabled` | Venda por Coin | **true** | §39 (Tipo A) |
| `economy.equipment.sellPrice` | Preço de venda | ⚠️ provisório (P-008, ADR-025) | §39 |
| `economy.diamonds.enabled` | — | `false` no MVP | §44 |
| `economy.vip.enabled` | Estrutura presente | `true` (dados) | §49 (Tipo A) |
| `economy.vip.benefits` | Benefícios | ⚠️ **PENDING** P-013 | §49, §73 |

> **P-008** é o pendente mais amplo do projeto: **nenhum valor de Coin foi especificado**. A estrutura (fontes/sumidouros) é conhecida, os números não são. Inventar uma economia completa é exatamente o que o §73 proíbe.

---

### 9.1 Market, Bot e Offline (ADR-025/026 — `ContentPack` v3)

| Bloco | Chave | Valor padrão | Observação |
|---|---|---|---|
| `market` | `tabs` | Poções · Revives · Caixas | abas da loja |
| `market` | `maxStack` | 9.999 | por item |
| `market` | `items[]` | 9 poções, 3 revives, 3 caixas | `kind`, `price` (`fixed` Coin ou `perKill` abates com piso), `requiredKingLevel`, `effect`/`outcomes`, `iconId`, `enabled` |
| `market` | caixas | Básica Nv 250 · Rara Nv 1.500 · Lendária Nv 5.000 | pesos de resultado e `fragments {min,max}` por caixa |
| `bot` | `defaults` | auto-poção ligada, 40%, "auto"; auto-revive ligado, "auto"; voltar do Hub ligado | valores iniciais do `SaveData.bot` |
| `bot` | `potionCooldownMs` / `maxPotionsPerBattle` / `maxRevivesPerBattle` | 2.500 / 6 / 2 | salvaguardas |
| `bot` | `hubRecoveryMs` | 60.000 | tempo no Hub |
| `bot` | `hpThresholdMinPct` / `MaxPct` | 5 / 95 | faixa do limite de vida |
| `offline` | `capFreeMs` / `capVipMs` | 2 h / 8 h | **por ausência** |
| `offline` | `minAwayMs` | 30.000 | abaixo disso não simula |
| `offline` | `maxSimulatedSteps` | 2.000.000 | trava de segurança |

Tudo é validado (`marketErrors`, `botErrors`, `offlineErrors`) com o caminho do erro, e aplicado atomicamente por `applyContentPack`. Pack v1/v2 é migrado completando estes blocos com o padrão.

---

## 10. Conteúdo da Torre

| ID | Chave | Valor | Fonte |
|---|---|---|---|
| `tower.floors[]` | Andares (`FloorDef`: faixa, `enemyLevel`, `requiredKingLevel`, `pool`, `visual`) | ✅ 40 andares — ADR-021 (P-005) | §22 |
| `enemies[]` (`EnemyDef`) | Inimigos: 6 atributos, papel, tipo de dano, `statMultiplier` | ✅ 11 inimigos — ADR-021 (P-006) | §22, §54 |
| `tower.enemyStatMultiplier` / `enemyHpMultiplier` / `enemyAttackMultiplier` | Calibração global da Torre | ✅ 1 / 2,5 / 0,05 (calibrados por simulação) | ADR-021 |
| `tower.rewards.{kingXp,heroXp,coin}` | `CurveDef` de recompensa por abate | ✅ XP; Coin ⛔ P-008 | ADR-021 |
| `combat.defenseConstantPerLevel` · `combat.regenOnSearchingPctPerSec` | K de defesa por nível · regen em PROCURANDO | ✅ 5 · 0,05 | ADR-021 |
| `tower.selectMode` | Seleção de andar | **manual** | §19, §107 |
| `tower.autoAdvance` | Avanço automático de andar | **false** | §19 (Tipo A) |
| `tower.bossInTower` | Boss em andar fixo | **false — PROIBIDO** | §21, §55 (Tipo A) |

---

## 10b. Chefes (Arena) — `config.boss`

> FASE 12, ADR-027. Tudo é dado e entra no `ContentPack` v4; detalhes e roster em [`BOSS_SYSTEM.md`](BOSS_SYSTEM.md) §14.

| ID | Chave | Valor | Fonte |
|---|---|---:|---|
| `boss.minTeamSize` | Equipe mínima | 1 | ADR-027 (provisório) |
| `boss.startAtFullHp` | Equipe entra com HP cheio | true | ADR-027 |
| `boss.persistHpAfter` | HP da Arena volta à Torre | false | ADR-027 |
| `boss.resumeTowerAfter` | Torre retoma ao fechar o resultado | true | ADR-027 |
| `boss.bot.*` | Bot na Arena (poções 8 / revives 3 por luta, cooldown 2,5 s) | — | ADR-027 |
| `boss.bosses[]` | 8 chefes: nível, stats, resistência, skills, fases, tempo, tentativas, recompensas, sprites | ver roster | ADR-027 (P-017/P-018/P-021/P-029) |
| `boss.bosses[].attempts` | `none` · `cooldown` · `window` | por chefe | P-029 (provisório) |
| `boss.bosses[].timeLimitMs` | Tempo máximo (120–180 s) | por chefe | ADR-027 |
| `combat.bossBattleSize` / `towerAutoBossFloors` | equipe × 1 / `[]` | — | §24/§80, §21/§55 (Tipo A) |

## 11. XP e níveis

| ID | Chave | Valor | Fonte |
|---|---|---|---|
| `xp.king.levelCap` | Teto nível do Rei | ✅ **20.000** (P-009, ADR-021) | §46 |
| `xp.king.requiredPerLevel` | Curva | ✅ `floor(20·(N+30)^1,35)` | §46 |
| `xp.hero.levelCap` | Teto nível do herói | ✅ **20.000** | §9 |
| `xp.hero.requiredPerLevel` | Curva | ✅ idêntica à do Rei (pools separados) | §9 |
| `xp.separatePools` | Rei e herói independentes | **true** | §45 (Tipo A) |

> **P-009 resolvida** (ADR-021): as curvas são `CurveDef` (dado). Ritmo medido em [`BALANCE_REPORT.md`](BALANCE_REPORT.md).

### 10.1 Fluxo do `ContentPack` (ADR-022)

Todo o conteúdo editável da Torre (andares, inimigos, curvas, multiplicadores) é exportado/validado/aplicado como **um pacote**, a base do futuro painel ([`ADMIN_PANEL.md`](ADMIN_PANEL.md)):

```text
exportContentPack(config) → JSON  ──edição──→  validateContentPack(json)  → erros legíveis
                                              applyContentPack(config, json) → config novo
defaultContentPack() · resetContentToDefaults()   // volta ao padrão
```

Regra: valor de conteúdo **nunca** é constante na lógica; muda-se o JSON e o jogo muda. `configVersion` (4) invalida/migra saves incompatíveis. O `ContentPack` está em `schemaVersion` 2 (blocos `equipment`, `loot`, `inventory`, `heroAcquisition`; pack v1 é migrado).

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
| `inventory.equipmentMaxItems` | Itens de equipamento **não equipados** | ✅ **300** (P-016) |
| `inventory.onFull` | Mochila cheia | ✅ `autoSell` (alternativa `discard`) |
| `inventory.pageSize` | Itens por página | 50 | ⚠️ provisório |

> **P-016 resolvida** (ADR-023 §12). Filtros e ordenação ficam na UI (`InventoryScreen.tsx`); consumíveis seguem pendentes (P-032).

### 13.1 Equipamento (`config.equipment`, ADR-023)

| Chave | Valor padrão |
|---|---|
| `equipment.slots[]` | 10 slots (`weapon, chest, head, legs, boots, glove, amulet, aura, wings, pet`) com `dropWeight` |
| `equipment.templates[]` | 18 templates (9 armas + 9 peças): slot, nível/peso das linhas, `dropWeight`, `weaponType` |
| `equipment.rarity` | linhas 2/2/3/3/4/4; multiplicador 1 / 1,2 / 1,5 / 2 / 2,5 / 3; `hasFeature` só Lendário/Celestial |
| `equipment.grades[]` | S 59 · A 49 · B 38 · C 28 · D 21 · E 15 · F 0 (nota mínima) |
| `equipment.unit` | 6% do stat de referência/linha (HP, ataques, defesas); `flat`: crítico +1,2 pp, IAS +0,02, velocidade +1 |
| `equipment.requirement.levelRatio` | **0,9** |
| `equipment.affinityBonus` | **0,05** |
| `equipment.sell` | abates equivalentes 3/5/12/40/150/600; fator de nota 0,5–2,0 |
| `equipment.weaponTraits[]` / `features[]` | 9 traços / 4 características, como `GearEffect` |
| `equipment.effectCaps` | crítico 0,4 · vel. 0,6 · dano 0,6 · perfuração 0,4 · roubo vital 0,2 · recarga 0,4 |
| `combat.baseActionIntervalMs` | **1000** (T₀; `intervalo = T₀/(1+IAS)`) |
| `heroAcquisition.*` | `starterRarity` incomum · `rarityChance` 50/30/15/4/0,9/0,1 · `rarityStatMultiplier` 0,94…1,30 · `attributeRoll` 0,85–1,15 |

Tudo isso é exportado/validado/aplicado no `ContentPack` v2 e `configVersion` é **4**.

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
