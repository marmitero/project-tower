# Sistema de Personagens — Rei e Heróis

**Versão:** 0.1 · **Data:** 2026-09-30 · **Estado:** especificado, implementação não iniciada
**Fonte:** §3–§20, §45–§46, §49 do `Master-Prompt.md`

---

## 1. A distinção central

O projeto tem **duas entidades de identidade** que nunca devem ser confundidas na modelagem:

| | **Rei** | **Herói / Súdito** |
|---|---|---|
| Quantidade por conta | **Exatamente 1** (§8) | **Ilimitados** (§13) |
| Participa de combate | **Não** (§2) | Sim |
| Lado na Torre | Não | 1×1 com o inimigo |
| Tem nível próprio | Sim — **nível da conta** | Sim — nível individual |
| Tem XP próprio | **Sim, pool separado** (§45) | **Sim, pool separado** (§45) |
| Tem equipamento | Não | Sim (10 slots) |
| Tem retrato | Sim (§4) | Sim (§9) |
| Persiste como | Identidade da conta | Entidade colecionável |

**Por que a separação importa.** Se Rei e herói compartilhassem um nível, a decisão "qual herói eu fortaleço" desapareceria — todos subiriam juntos e a escolha de equipe seria cosmética. A separação é o que cria o **custo de oportunidade** que sustenta o trade-off largura-vs-profundidade do §18.

---

## 2. O Rei

### 2.1 Modelo de dados

```ts
interface King {
  id: KingId;
  accountId: AccountId;      // 1:1 (§8)
  nickname: NormalizedName;  // único online (§6)
  displayName: string;       // forma original para exibição
  skinId: SkinId;
  portraitAssetId: AssetId;

  level: number;             // = nível da conta
  xp: bigint;                // pool de XP DO REI (§45)

  // recursosvivem na wallet, não no Rei — ver ECONOMY_SYSTEM.md
  createdAt: Timestamp;
  lastActiveAt: Timestamp;   // base do offline progress (§47)
  vip: VipStatus;            // estrutura desde cedo (§49)
}
```

### 2.2 Identidade visual

O Rei **não precisa de sprite completo**. A representação é composta por retrato/busto/rosto+torso (§4):

- Aparece na HUD (canto superior esquerdo).
- Aparece no perfil.
- Em elementos de identidade de conta quando apropriado.
- **Não** aparece na arena de batalha.

O inventory de assets tem 8 retratos e 8 `hero_skins` — material suficiente. Ver [`ASSET_INVENTORY.md`](ASSET_INVENTORY.md).

**Como ficou (FASE 3):** retrato e skin são papéis diferentes. O **retrato**
(`King.portraitAssetId` → `portraits/hero`) é o busto fixo usado na HUD e no
perfil. A **skin** (`King.skinId` → `hero_skins/<id>`) é a aparência completa
mostrada no perfil e em identidade maior. Trocar skin é cosmético
(`changeKingSkin`, com desbloqueio por nível); nunca altera atributos.

### 2.3 Criação

Primeiro acesso → fluxo de criação com **duas decisões**:

1. **Nome** — vira o nickname online, precisa passar na validação (§6).
2. **Skin** — escolher entre as disponíveis.

Sem customização corporal complexa. O sistema é arquitetado para aceitar, no futuro, skins premium, de evento, desbloqueáveis e exclusivas (§5) — por isso a skin é um `id` referenciado, não um caminho de arquivo embutido.

### 2.4 Nickname

O nome do Rei **é** o nickname do jogador (§6). Regras:

| Regra | Comportamento |
|---|---|
| Unicidade | Global, dentro do ambiente online |
| Disponibilidade | Consulta antes de confirmar, com normalização |
| Normalização | Case-insensitive, sem acentos, espaços colapsados |
| Formato | Alfanumérico + `_` e `-` (⚠️ provisório, `P-007`) |
| Reserva | Lista de nomes bloqueados (⚠️ provisório, `P-007`) |
| Troca | Permitida com cooldown e custo, ou permanente? ⚠️ **P-007** |
| Anti-abuso | Rate limit em tentativas de claim |

> **P-007** — o §6 define que o nome "deve ser único", "não podem existir dois Reis com o mesmo nickname", "deve existir validação de disponibilidade" e "proteção contra nomes inválidos", mas **não define** comprimento, caracteres permitidos, se o nome pode ser trocado depois, nem com que frequência. Troca de nickname tem impacto direto em mercado, chat e rankings (links external), então é Tipo C.

**Implementado (FASE 3):** `packages/game-core/src/nickname.ts`
(`normalizeNickname` + `validateNickname`, com códigos de erro). Os limites
concretos vivem em `config.account.nickname` (default provisório `P-007`).
Unicidade global será decidida pelo servidor no online.

### 2.5 Progressão do Rei

```
                    XP do Rei
                       ↓
              ┌────────────────┐
              │  LEVEL do REI  │  = nível da conta
              └───────┬────────┘
                      │
      ┌───────────────┼───────────────┬──────────────────┐
      ▼               ▼               ▼                  ▼
  Slot 1          Slot 2          Slot 3          Acesso à Torre
  (nível 1)     (nível 10)      (nível 25)       (requisito de andar)
  grátis        + Coin          + Coin
```

**Regra de desbloqueio:** nível mínimo **E** Coin, ambos simultaneamente (§46). O custo é debitado uma vez; o slot nunca é revendido.

> **P-003** — os custos em Coin dos slots 2 e 3 não foram especificados. O §15 exige que sejam configuráveis, mas não fornece os números.

> **P-009** — a curva de XP do Rei (XP necessário por nível) não foi definida. Ela determina **quando** os slots 2 e 3 ficam disponíveis, ou seja, o ritmo de expansão da equipe ao longo do jogo.

---

## 3. Heróis / Súditos

### 3.1 Modelo de dados

```ts
interface Hero {
  id: HeroId;
  ownerAccountId: AccountId;
  classId: ClassId;              // qual dos 4 (ou outro, pós-MVP)

  level: number;
  xp: bigint;                    // pool de XP DO HERÓI (§45)

  stars: number;                 // escala 2★–5★ é PENDING (P-015)

  // equipamento: referência a itens, nunca string (§71)
  equipped: Record<EquipSlotId, EquipmentId | null>;  // 10 slots

  skillLoadout: [SkillId | null, SkillId | null];      // 2 slots (⚠️ P-015)

  fragments: Record<ClassId, number>;                 // fragmentos acumulados (§12)

  obtainedAt: Timestamp;
  origin: "starter" | "boss" | "event" | "summon" | "market" | "admin";
  //                       ↑ "starter" é a única forma de receber os 4 iniciais
}
```

### 3.2 Inventário de heróis: ilimitado

> **Não criar limite artificial de quantidade de heróis possuídos** (§13).

`heroes.ownedLimit = null`. O jogador pode colecionar indefinidamente.

A consequência de design: o inventário de heróis precisa de **paginação, filtro e ordenação** desde o começo, e a UI nunca deve assumir "poucos heróis". Este é um dos pontos onde um CRUD ingênuo quebraria a identidade do jogo.

### 3.3 Os 4 heróis iniciais

> **P-002 — BLOQUEIO CRÍTICO. Esta é a pendência que impede o início da Fase 4 e, portanto, da vertical slice.**

O `Master-Prompt.md` define com precisão *quantos* e *como* (§10):

- Existem **4 heróis iniciais**.
- O jogador escolhe **1 dos 4**.
- Recebe apenas aquele.
- Os outros **permanecem indisponíveis**, obtíveis depois pelo sistema geral de aquisição.
- A escolha **precisa ter impacto real na experiência inicial**.
- Os quatro precisam de diferenças reais de **função, atributos, skills, estilo de combate e progressão**.

E proíbe explicitamente (§10, §105):

> *"Não criar quatro personagens visualmente diferentes mas mecanicamente iguais."*

O que **não** está definido: nome, classe, atributos-base, curva de crescimento, skills, raridade e estilo de combate de cada um.

**Por que isso não pode ser inventado pelo agente.** As cinco dimensões listadas ("função, atributos, skills, estilo de combate, progressão") são exatamente as decisões que definem a identidade do jogo. Quatro heróis inventados agora seriam reescritos quando o jogador real escolher — e a chance de os quatro acertarem a fantasia é baixa. É Tipo C (§73).

**O que já está disponível para acelerar a decisão:**

- **11 archetypes visuais** no inventory de assets: `hero`, `mage`, `archer`, `necromancer`, `fireorc`, `orc`, `slimeking`, `shadowgoblin`, `bloodskeleton`, `elitearcher`, `villager`/`merchant`.
- **9 tipos de arma** já especificados em [`WEAPON_SYSTEM.md`](WEAPON_SYSTEM.md), cada um com um traço mecânico distinto.
- **Traços de arma** que sugerem arquétipos naturally: Espada (reativo/guarda), Adaga (DoT), Machado (dano bruto), Maça (crítico), Besta (velocidade), Cajado (AoE), Livro Arcano (sifão), Luvas (stun), Garras (multi-hit).

O material para uma proposta existe. A **proposta** é o que falta, e ela precisa de aprovação humana.

### 3.4 Atributos do herói

O `Master-Prompt.md` lista que o herói possui "atributos" (§9) mas não define a lista. A referência técnica reaproveitada do repositório de referência (§9 do `SYSTEMS_SPEC.md` da referência) define 8 atributos, e essa lista é **tecnicamente sólida e coerente com o §36 do Master-Prompt** (que fala de `Attack`, `Defense`, `Critical`, `HP` como exemplos de atributos com X individual):

```text
HP · Attack · SpecialAttack · Defense · SpecialDefense · CritChance · AttackSpeed · Speed
```

Fórmula de valor final e PaperDoll em [`EQUIPMENT_SYSTEM.md`](EQUIPMENT_SYSTEM.md).

> **P-001** — a lista canônica de atributos não é declarada no `Master-Prompt.md`. A lista de 8 é **herdada do repositório de referência como decisão técnica (Tipo B)**, e o Master-Prompt é compatível com ela, mas não a impõe. Confirmar antes de congelar o schema.

### 3.5 Estrelas

`stars` existe como campo (§9), mas **nada é definido** sobre a escala, o que cada estrela dá, ou como se obtém.

> **P-015** — quantas estrelas, o que cada uma concede, e se há limite. A referência do repositório vizinho sugere 1★–5★ com slots extras de skill por estrela, mas isso **não** é regra deste projeto.

---

## 4. Sistema de fragmentos

### 4.1 Regra principal

```text
Fragmentos  →  CRAFT/SUMMON  →  Personagem
```

Fragmentos **acumulam**. Ao atingir a quantidade necessária, o jogador executa o craft e obtém o herói (§12).

### 4.2 A regra proibitiva

> **Fragmentos de personagem NÃO DEVEM DROPAR DE INIMIGOS COMUNS DA TORRE.** (§12)

Fontes **válidas**:

| Fonte | Prioridade |
|---|---|
| **Boss** | Principal (§54) |
| Eventos | ✓ |
| Caixas | ✓ |
| Summons | ✓ |
| Recompensas especiais | ✓ |
| Sistemas específicos | ✓ |
| Mercado | ✓ |

Esta regra é **absoluta** e precisa de teste automatizado dedicado ([`TESTING.md`](TESTING.md#5-casos-de-teste-obrigatórios-do-master-prompt)). Um fragmento caindo de um slime destrói a fantasia de *"preciso conseguir esse personagem"* (§109) e transforma a coleção em ruído.

### 4.3 Dados

```ts
interface FragmentSource {
  kind: "boss" | "event" | "box" | "summon" | "special" | "market";
  classId: ClassId;
  amount: number;
  chance: number;          // 0..1
}
```

> **P-017** — quanto fragmento cada Boss dá, e quantos fragmentos faltam para cada herói, não foram definidos. Isso é o ritmo de coleção do jogo e é Tipo C.

---

## 5. Equipe

### 5.1 Modelo

```ts
interface Team {
  accountId: AccountId;
  unlockedSlots: number;       // 1 | 2 | 3
  members: (HeroId | null)[];  // tamanho = unlockedSlots
  activeHeroId: HeroId | null; // quem luta na Torre (§19)
}
```

Regras estruturais:

- Máximo **3** heróis (§16).
- Sem duplicatas — o mesmo herói não ocupa dois slots.
- Remover um herói esvazia o slot, **não** reduz `unlockedSlots`.
- `activeHeroId` deve apontar para um membro ocupado. Se o herói ativo sair da equipe, a UI exige nova seleção (§19: *"Não assumir automaticamente que o primeiro personagem sempre luta"*).

### 5.2 Desbloqueio de slots

| Slot | Nível do Rei | Custo Coin |
|---|---|---|
| 1 | 1 | — |
| 2 | **10** | ⚠️ P-003 |
| 3 | **25** | ⚠️ P-003 |

Ver [`CONFIGURATION.md` §4](CONFIGURATION.md#4-equipe-e-slots).

---

## 6. Por que a equipe existe se a Torre é 1×1

Esta é a pergunta de design mais importante do projeto (§18), e a resposta define o valor de todo o sistema de progressão.

**A equipe não é um bônus de poder. É um portfólio.**

Na Torre, apenas **um** herói luta. Os outros dois ficam em espera. Levar mais heróis à equipe therefore:

1. **Ganha flexibilidade** — sempre há alguém adequado ao próximo inimigo.
2. **Perde profundidade** — o XP é dividido.

```text
Herói A  Nível 20  — muito forte contra inimigos físicos
Herói B  Nível 15  — muito forte contra inimigos mágicos
Herói C  Nível 10  — especialista contra outro tipo de inimigo
```

A pergunta que a Torre deve gerar é *"qual dos meus heróis é melhor para continuar avançando?"* (§107) — nunca *"coloquei os três e esmagaram tudo"*.

### 6.1 A divisão de XP, e por que ela é o coração do sistema

O XP de uma vitória é dividido entre todos os membros elegíveis (§20, §81):

| Time | XP por herói | Consequência |
|---|---:|---|
| 1 | 100% | Um herói nível 20, dois na reserva fraca |
| 2 | 50% cada | Dois heróis nível 15, um na reserva parada |
| 3 | 33,3% cada | Três heróis nível 11 — velocidade menor, mas nunca travado |

O objetivo declarado pelo §20:

> *"Quanto mais personagens o jogador leva na equipe, maior é a flexibilidade de progressão, porém menor é a velocidade individual de evolução."*

> **P-004** — a tabela acima é a leitura **linear** mais simples, e é o default provisório. O §20 fala em "parcela menor" e "parcela ainda menor", o que admite uma curva não-linear. A escolha altera a estratégia de forma substancial e é Tipo C.

**Recomendação técnica:** manter o total distribuído ≤ 100% na configuração, para que a curva possa ser ajustada depois sem rebalançar todo o resto do jogo.

### 6.2 Custo de oportunidade do slot

Um segundo efeito do §20 que raramente é explicitado: **o XP que o segundo herói deixa de receber é XP que o herói ativo não recebeu**. O jogo está sempre cobrando do jogador o preço da largura, mesmo sem cobrar Coin.

---

## 7. A seleção do herói ativo

O §19 exige que a UI torne claro:

- herói ativo
- nível
- vida
- poder
- equipamento
- progresso
- inimigo atual

E que **não** presuma que o primeiro personagem sempre luta.

**Interação com a Torre.** Trocar o herói ativo **não reinicia** a hunt. Ele entra na próxima batalha, com HP cheio (§22 da arquitetura: cada batalha é uma unidade independente de 1×1). Isso torna a troca uma **decisão de baixo custo e alto valor** — o jogador troca conforme o inimigo que aparece, e a automação absorve o resto.

---

## 8. Testes relacionados

| Caso | Regra | Seção |
|---|---|---|
| 4 heróis, jogador recebe **1** | §10 | [`TESTING.md`](TESTING.md) |
| Heróis ilimitados | §13 | `hero-limit.test.ts` |
| Rei e herói têm **pools de XP separados** | §45 | `xp-pools.test.ts` |
| Divisão de XP por tamanho da equipe | §20, §81 | `team-xp-split.test.ts` |
| Slot 2 exige nível 10 **e** Coin | §15, §46 | `team-slot-unlock.test.ts` |
| Slot 3 exige nível 25 **e** Coin | §15, §46 | `team-slot-unlock.test.ts` |
| Fragmentos **nunca** de inimigo comum | §12 | `fragment-source.test.ts` |
| Herói ativo não é presumido | §19 | `active-hero-selection.test.ts` |
| Trocar herói ativo não reinicia a hunt | §19 | `hunt-continuity.test.ts` |
| 1 conta = 1 Rei | §8 | `one-king.test.ts` |
