# Sistema de Automação e Idle

**Versão:** 0.1 · **Data:** 2026-09-30 · **Estado:** especificado, taxa offline bloqueada (P-011)
**Fonte:** §26–§29, §47, §48, §56–§58, §111 do `Master-Prompt.md`

---

## 1. O que "idle" significa aqui

> **Idle não é tela parada.** (§111)
>
> Idle significa: **sistemas funcionando continuamente enquanto o jogador administra e observa.**

Por isso, estes precisam transmitir atividade contínua:

- batalha visual
- procura
- animações
- loot
- progressão
- recompensas
- offline progress

O teste: se o jogador deixa a aba aberta e não olha, ele **ainda deve sentir que algo está acontecendo**. Se a tela parece morta, o idle falhou — mesmo que o sistema esteja tecnicamente rodando.

---

## 2. O jogador não opera

> *"O jogador NÃO deve clicar em cada ataque."* (§56)
> *"Não exigir: clicar para atacar; clicar em inimigos; clicar para causar dano; clicar em cada habilidade."* (§58)

O jogador é um **administrador/estrategista**, não um operador manual de combate.

O que o jogador faz:

| Faz | Não faz |
|---|---|
| Configura | Ataca |
| Escolhe | Clica no inimigo |
| Equipa | Clica para causar dano |
| Decide | Clica em cada habilidade |
| Inicia | Opera a batalha |
| Observa | |
| Melhora | |

**Consequência de UI:** não existe botão "Atacar" em lugar nenhum do jogo. A ausência dele é uma **declaração de design**, não uma limitação.

---

## 3. O loop de automação

```text
CONFIGURAR
    ↓
INICIAR
    ↓
BATALHA          ← 1×1, automático
    ↓
RECOMPENSA       ← XP, Coin, 5%? equipamento
    ↓
PROCURANDO       ← ~3s, animação
    ↓
NOVO INIMIGO
    ↓
REPETIR
```

> *"O jogador pode sair e retornar."* (§57)

O estado de hunt é **persistente**. Fechar o navegador não destrói a sessão de caça.

---

## 4. Máquina de estados do loop

```ts
type HuntState =
  | { kind: "idle" }                                    // fora da Torre
  | { kind: "in_battle"; battleId: string; startedAt: number }
  | { kind: "rewarding"; battleId: string; rewards: RewardBundle }
  | { kind: "searching"; startedAt: number; durationMs: number }
  | { kind: "defeated"; at: number }                    // P-019
  | { kind: "paused"; at: number; reason: PauseReason };
```

Transições:

```text
        ┌──────┐
        │ idle │◄─────────────────────────────┐
        └───┬──┘                               │
            │ entrar na Torre                  │
            ▼                                   │
      ┌───────────┐    herói cai               │
      │ in_battle │──────────────┐              │
      └─────┬─────┘              ▼              │
            │ vitória      ┌──────────┐          │
            ▼              │ defeated │──────────┤
      ┌───────────┐        └──────────┘          │
      │ rewarding │                               │
      └─────┬─────┘                               │
            ▼                                     │
      ┌───────────┐                               │
      │ searching │  ~3s, animação                │
      │  ~3s      │  NÃO pausa ao navegar        │
      └─────┬─────┘                               │
            │                                     │
            └────────────► in_battle ◄────────────┘
```

### 4.1 Por que isto é estado, não componente

> **Decisão técnica (ADR-007)**

`SEARCHING` guarda `startedAt` e `durationMs` **persistidos**, não um `setTimeout`. Isso resolve, de uma vez, quatro requisitos que de outra forma entrariam em conflito:

| Requisito | Resolvido por |
|---|---|
| Navegar durante a procura não pausa (§29) | Timer vive no state, não no componente |
| Fechar/reabrir a aba mantém a caça (§57) | Estado persistido |
| Offline continua (§47) | Máquina de estados é a mesma |
| "`SEARCHING` não pausa" é testável | Teste de estado, não de UI |

---

## 5. O estado "Procurando"

Ver [`TOWER_SYSTEM.md` §5](TOWER_SYSTEM.md#5-o-estado-procurando) para o detalhe completo. Resumo:

- **~3 segundos** (2.7s–3.2s), configurável (§27).
- **Animação real**, não texto "Aguardando..." (§28).
- **Navegação livre** durante ele, sem pausar (§29).

### 5.1 Decisões técnicas

| ID | Decisão | Racional |
|---|---|---|
| `D-01` | A duração é **sorteada** por batalha, não fixa | Evita metrônomo mecânico; §27 permite "pequena variação controlada" |
| `D-02` | O timer é **absoluto** (`expiresAt`), não contagem regressiva de estado | Sobrevive a recarregamento e a perda de foco |
| `D-03` | Navegação **não** pausa | §29 + §111 (o reino continua enquanto administra) |
| `D-04` | Uma **sessão de hunt ativa por conta** | ⚠️ P-012 — evita dois timers paralelos |
| `D-05` | O estado é serializado com `configVersion` | Rebalancear não corrompe hunt em andamento |

---

## 6. Offline Progress

### 6.1 Requisitos

O §47 e o §48 definem o sistema completo:

```text
1. registrar última atividade (lastActiveAt)
2. calcular duração (offlineDuration)
3. LIMITAR duração
4. simular/projetar recompensas
5. entregar ao jogador no retorno
```

E o limite:

| Plano | Offline máximo acumulado |
|---|---:|
| **Free** | **2 horas** |
| **VIP** | **8 horas** |

> *"O tempo offline não pode gerar recompensa infinita."* (§48)

### 6.2 Modelo

```ts
interface OfflineProgress {
  lastActiveAt: number;
  accumulatedMs: number;       // já acumulado, ainda não entregue
  lastClaimedAt: number;
}

interface OfflineSummary {
  rawDurationMs: number;        // tempo real ausente
  creditedDurationMs: number;   // após aplicar o limite do plano
  wasCapped: boolean;
  rewards: RewardBundle;        // XP Rei, XP herói (÷ time), Coin, 5%? equipamento
  simulatedBattles: number;
  heroFellAt?: number;          // se a equipe caiu durante o offline
}
```

### 6.3 O problema de "herói caiu durante o offline"

Se a equipe cai 20 minutos antes de o jogador sair, o que acontece durante as 2 horas offline?

Três modelos possíveis:

| Modelo | Comportamento | Risco |
|---|---|---|
| **A — Simular com revives** | Herói revive ao cair (com limite) | Precisa definir quantos revives |
| **B — Parar no primeiro defeat** | Offline termina quando a equipe cai | Simples, mas o jogador perde tempo |
| **C — Congelar após X defeats** | Simula até X quedas, depois congela | Mais complexo |

> **P-011a** — o modelo de derrota em offline **não está definido** e é Tipo C. Ele tem impacto direto na taxa de conversão (P-011).

> **P-011** — a **taxa de conversão de tempo offline em recompensa** **não está definida**. ⚠️ **Este é o pendente mais sensível de toda a economia do jogo.**

### 6.4 Por que P-011 é crítico

A taxa de conversão define a relação entre:

- **Online** — 1 vitória = 1 recompensa, ritmo de ~15s
- **Offline** — 1 hora = Xascade de recompensas

Se o offline for **melhor** que o online, o jogador é incentivado a **não jogar** — o oposto do design idle. Se for **pior**, o progresso offline é irrelevante e o §118 (passo 20: "retornar e recuperar progresso offline") falha.

A taxa precisa ser explicitamente ** menor ** que a conversão online, e o limite de 2h/8h existe justamente para impedir o acúmulo massivo.

**Não há valor proposta aqui.** Escolher este número sem aprovação seria inventar regra econômica crítica (§73).

### 6.5 UX do retorno

O §47 diz "entregar ao jogador no retorno". A entrega deve ser um **resumo visual**, não um número solto:

```text
┌──────────────────────────────────────────────┐
│  BEM-VINDO DE VOLTA                          │
│                                              │
│  Você esteve fora por 2h14min                 │
│  (limitado a 2h no plano Free)               │
│                                              │
│  Seu reino continuou:                        │
│    ✦  1.284 de XP do Rei   →  Nível 12       │
│    ✦  2.140 de XP dos campeões               │
│    ⊙  1.860 Coin                             │
│    ⚔  2 equipamentos encontrados             │
│                                              │
│  340 batalhas na Torre das Sombras           │
│                                              │
│  [ VER LOOT ]   [ CONTINUAR ]                │
└──────────────────────────────────────────────┘
```

O §118 exige que o jogador sinta *"meu reino continuou progredindo enquanto eu estava fora"* — essa tela é o lugar onde essa sensação acontece.

---

## 7. VIP

> *"VIP deve ser mantido no projeto. Não precisa estar completamente funcional no primeiro MVP. A arquitetura deve ser criada desde cedo."* (§49)

```ts
interface VipStatus {
  tier: 0 | 1 | 2 | 3;        // 0 = Free
  activeUntil: number | null;
  autoRenew: boolean;
  benefits: Record<string, number>;   // populated from config
}
```

**Desde a Fase 2**, o sistema tem:

- Tabela de níveis de VIP
- Estrutura de benefícios
- Duração e status
- Campo de compra futura
- **Efeito já aplicado**: `account.offline.vipHours` (8h vs 2h, §48)

> **P-013** — os **benefícios** de cada nível de VIP (XP extra? Coin extra? autoavanço?Cosmético?) **não estão definidos**. São Tipo C (§73) e afetam equilíbrio competitivo (§124: nunca sacrificar integridade econômica por conteúdo).

---

## 8. Idempotência e continuidade

O risco mais caro do idle online é **duplicar recompensa** por reconexão, retry ou segundo dispositivo.

Regras:

| Regra | Implementação |
|---|---|
| Recompensa de batalha tem **ID único** | `rewardBundleId = battleId` |
| Aplicar recompensa é **idempotente** | `appliedRewards: Set<RewardBundleId>` no save |
| Batch de simulação usa **`requestId`** | Rejeitar reenvio |
| **GET nunca avança estado** | Só comandos autenticados avançam |
| `expectedRevision` no cliente | Rejeitar estado obsoleto |
| `SEARCHING` tem **timestamp absoluto** | Não reinicia ao reconectar |
| Uma **sessão de hunt ativa por conta** | ⚠️ P-012 |

Detalhe em [`SECURITY.md`](SECURITY.md) §4.

---

## 9. Performance do idle

O §94 exige evitar "loops desnecessários" e "renderizações excessivas". Um jogo idle fica **horas** rodando — o custo se multiplica.

| Item | Regra |
|---|---|
| Tick de estado | 1 Hz (`perf.idleTicksPerSecond = 1`) |
| Render | Só quando o estado muda (o renderer é orientado a evento) |
| Batalha | Simulação em **lotes**, não por frame |
| Sem `setInterval` aninhado | Um único scheduler |
| `document.hidden` | Reduz tick para 0.25 Hz — ⚠️ `P-012` |
| Memória | Ring buffer de eventos, não array crescente |
| Serialização | Debounce de 1s, não a cada tick |
| Long tasks | Battle Engine roda em **Web Worker** para simulação offline |

O Battle Engine em Web Worker é uma consequência direta do §64: como o engine é puro e determinístico, ele roda **fora da thread principal** sem mudar uma linha de lógica.

---

## 10. Checklist de pronto

- [ ] Nenhum botão de ataque manual em lugar nenhum (§56, §58)
- [ ] Loop completo: configurar → iniciar → battling → rewarding → searching → repetir
- [ ] `SEARCHING` com animação, ~3s, e **sem** pausar ao navegar
- [ ] Fechar/reabrir mantém a hunt (§57)
- [ ] `lastActiveAt` registrado corretamente
- [ ] Offline Free limitado a **2h**
- [ ] Offline VIP limitado a **8h**
- [ ] Offline **nunca** gera recompensa infinita
- [ ] Resumo visual ao retornar
- [ ] Recompensa **idempotente** sob reconexão/retry
- [ ] `GET` não avança estado
- [ ] Estrutura de VIP presente desde a Fase 2
- [ ] Tick ocioso ≤ 1 Hz, render só em mudança
- [ ] Battle Engine em Web Worker

---

## 11. Pendências

| ID | Pendência | Bloqueia |
|---|---|---|
| `P-011` | **Taxa de conversão offline → recompensa** | **FASE 11** |
| `P-011a` | Modelo de derrota durante offline | FASE 11 |
| `P-012` | Política multi-aba / blur / tab visibility | FASE 8 |
| `P-019` | Política de derrota (compartilhada com a Torre) | FASE 8 |
| `P-013` | Benefícios de VIP | Fase Monetização |

---

## 12. Referências

- [`TOWER_SYSTEM.md`](TOWER_SYSTEM.md) — o conteúdo do loop
- [`COMBAT_SYSTEM.md`](COMBAT_SYSTEM.md) — o motor que roda o loop
- [`ECONOMY_SYSTEM.md`](ECONOMY_SYSTEM.md) — o que o offline produz
- [`PERFORMANCE.md`](PERFORMANCE.md) — orçamento do idle
- [`SECURITY.md`](SECURITY.md) — idempotência e autoridade
