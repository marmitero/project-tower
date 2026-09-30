# Performance

**Versão:** 0.1 · **Data:** 2026-09-30 · **Estado:** especificado
**Fonte:** §67, §68, §94 do `Master-Prompt.md`

---

## 1. O contexto que torna isso crítico

Este é um jogo **idle**. O caso de uso dominante é:

> O jogador abre o jogo numa tela de celular, deixa a aba aberta por **horas** enquanto faz outras coisas, e volta.

Consequências que não existem em um jogo comum:

1. **Tempo de execução é longo** — vazamento de memória que não apareceria em 10 minutos aparece em 4 horas.
2. **CPU ociosa importa** — o celular esquenta e a bateria acaba.
3. **A conexão é variável** — 4G, Wi-Fi instável, economia de dados no plano.
4. **O jogador volta depois** — o load inicial é sempre em condição adversa.

> *"Evitar: loops desnecessários; renderizações excessivas; vazamentos de memória; downloads gigantes; assets duplicados."* (§94)

---

## 2. Orçamento

| Métrica | Alvo | Limite |
|---|---|---|
| FPS em batalha | 60 | 30 |
| JS inicial (gzip) | < 500 KB | 700 KB |
| Assets no load inicial | < 5 MB | 8 MB |
| Time to First Battle | < 3 s | 5 s |
| Memória após 4h | < 300 MB | 500 MB |
| CPU com aba em background | ~0% | < 1% |
| Bundle total com lazy-load | — | < 1,5 MB gzip |

> O budget de 500 KB é apertado para React + Phaser. A mitigação é **carregar o Phaser só quando a batalha começa** (lazy), o que mantém o primeiro paint rápido para quem está no Reino.

---

## 3. Camadas de otimização

### 3.1 Rede

| Técnica | Ganho |
|---|---|
| **Lazy-load do Phaser** | −250 KB no primeiro paint |
| **Code-split por tela** | Só o inventário carrega o módulo de inventário |
| **Subset de assets** | 92 MiB → < 8 MiB ([`ASSET_INVENTORY.md`](ASSET_INVENTORY.md)) |
| **Compressão Brotli** | Vercel serve brotli por padrão |
| **Imagens WebP** | Para tiles e UI; **manter PNG** para sprites pixel art |
| **Cache longo** | `Cache-Control: immutable, max-age=31536000` (assets têm hash) |
| **Prefetch da próxima tela** | Alvo é provável |

> ⚠️ **Não converter sprites pixel art para WebP/AVIF com perda.** A compressão com loss destrói a paleta. PNG com lossless + Brotli é o caminho.

### 3.2 Assets

O §61 e o §62 exigem assets reais, e assets reais são pesados. A solução é **carregar só o que a tela precisa**.

```text
Load inicial (Reino):
  ├── retrato do Rei (256×256)
  ├── 3 retratos de herói (256×256)
  ├── ~20 ícones
  └── fontes

Ao entrar na Torre (lazy):
  ├── 1 sheet do herói ativo (1024×1024, ~200 KB)
  ├── 1 sheet do inimigo
  ├── tileset da área
  └── 3–4 VFX
```

Cada batalha 1×1 precisa de **2 sprites**. Não de 108.

### 3.3 Render

| Técnica | Onde |
|---|---|
| **Renderer orientado a evento** | A arena só redesenha quando há evento |
| **Tick de estado a 1 Hz** | Não a 60 Hz |
| **Piscada de sprite em cache** | Tint e flash são properties, não redesenho |
| **Pool de partículas** | Sem `new` por hit |
| **Números de dano pooled** | Reutilizar, não recriar |
| **Tween group compartilhado** | Phaser gerencia em lote |
| **Culling** | Tiles fora da tela não são desenhados |
| **Render scale adaptativo** | 0,75 em mobile; §67 |
| **Partículas limitadas** | Contagem máxima por tipo |

### 3.4 Estado

| Técnica | Motivo |
|---|---|
| Store com seletor fino | Evita re-render de toda a árvore |
| Componentes memoizados | Loot de 500 itens não pode re-render por frame |
| Lista virtualizada | Inventário com limite desconhecido (`P-016`) |
| Sem `JSON.stringify` por tick | Debounce de 1 s |
| Snapshot delta | Persistir só o que mudou |

### 3.5 O loop

O §94 fala de "loops desnecessários". O loop idle tem três custo escondidos:

| Custo | Mitigação |
|---|---|
| `setInterval` aninhado | **Um** scheduler |
| Simulação contínua | Battle Engine em **lotes**, não por frame |
| Timer de `SEARCHING` | `setTimeout` → comparação de timestamp no loop |
| Event listener vazando | Remover em `destroy()` |
| `requestAnimationFrame` em background | Pausar em `document.hidden` |

---

## 4. O Battle Engine em Web Worker

Consequência direta de o engine ser puro e determinístico (§64):

```ts
// main thread
const worker = new Worker(new URL("./engine.worker.ts", import.meta.url), {
  type: "module",
});

worker.postMessage({ setup, seed, untilTick });
worker.onmessage = (e) => render(e.data.events);
```

Benefícios:

- A simulação de combate **não** trava a thread principal.
- O idle roda sem queda de FPS mesmo com a UI ocupada.
- É o mesmo código que roda no servidor — **um único engine**.

> Custo: serialização de mensagens. Mitigação: enviar **lotes** de eventos (um por batalha), não evento a evento.

---

## 5. Aba em background

O §68 exige funcionar em Android browser. Um jogador deixa o jogo aberto em background **o tempo todo**.

| Estado | Ação |
|---|---|
| `document.hidden` | Tick de estado → **0,25 Hz** |
| `document.hidden` | Render → **pausado** |
| `document.hidden` | Persistência → mantida (1/s é barato) |
| `document.visible` | Resync do estado; **sem** salto de tempo |

> ⚠️ **P-012** — a política de background e multi-aba precisa de decisão explícita. Sem ela, dois timers paralelos ou um salto de tempo ao voltar produzem inconsistência entre o que o jogador vê e o que foi salvo.

A lição do repositório de referência: **um job offline não é executado em background**, e a retomada é por **lote explícito**, nunca por "compensar o tempo decorrido".

---

## 6. Memória em sessão longa

O risco nº 1 de um jogo idle de 4 horas.

| Fonte de vazamento | Mitigação |
|---|---|
| **Eventos de combate** acumulados | Ring buffer com tamanho fixo |
| Listeners de Phaser | `destroy()` em troca de tela |
| Timers órfãos | Scheduler único; tudo passa por ele |
| Tweens não finalizados | `tweenGroup.clear()` ao sair da arena |
| Texturas adicionadas em runtime | Pool com limite |
| Cache de ícones | Evitar sprite sheets dinâmicos |
| React sem cleanup | `useEffect` com return |
| Object URLs | `URL.revokeObjectURL()` |

Teste obrigatório: rodar o loop por **4 horas** simuladas e verificar que a memória não cresce além do platô inicial.

---

## 7. Carregamento no Android

O §68 é explícito sobre não criar dependências de desktop.

| Cenário | Estratégia |
|---|---|
| 4G | Subset mínimo; arena em qualidade reduzida |
| 2G/edição | ⚠️ Aviso de uso de dados; modo leve |
| Offline | Service Worker para o shell; estado local |
| Tela pequena | `renderScale` 0,75; menos partículas |
| CPU fraca | Detectar FPS baixo → reduzir efeitos automaticamente |

> **Service Worker** é permitido e útil: cache do shell + do subset de assets. Ele **não** deve, em nenhuma hipótese, fabricar recompensa offline — a política de §48 é do servidor.

---

## 8. Métricas

O que medir em produção (sem coletar dados pessoais desnecessários):

| Métrica | Por que |
|---|---|
| FPS médio e **p1** | p1 revela picos de travamento |
| Tempo até primeira batalha | §94 — primeira impressão |
| Bundle carregado por sessão | Regressão de assets |
| Memória após 30min | Vazamento |
| Erros de asset (404) | Pipeline de assets |
| Requisições de rede por minuto | Loop excessivo |
| Crash rate | Qualidade geral |

**Nunca coletar**: seed de combate, inventário, saldo, mensagens de chat. Telemetría de **desempenho**, não de **jogador**.

---

## 9. Checklist de pronto

- [ ] Phaser com lazy-load (fora do primeiro paint)
- [ ] Subset de assets < 8 MB
- [ ] Sprites em PNG lossless; UI em WebP
- [ ] Renderer orientado a evento
- [ ] Tick de estado ≤ 1 Hz
- [ ] Battle Engine em Web Worker
- [ ] `document.hidden` reduz tick e pausa render
- [ ] Ring buffer de eventos (sem crescimento)
- [ ] Listeners e tweens liberados na troca de tela
- [ ] Teste de 4 h sem crescimento de memória
- [ ] Lista de inventário virtualizada
- [ ] Autosave com debounce, não por tick
- [ ] `renderScale` adaptativo para mobile
- [ ] Opção "reduzir efeitos" real
- [ ] Sem coleta de dados de jogador na telemetria

---

## 10. Referências

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — onde cada camada roda
- [`COMBAT_SYSTEM.md`](COMBAT_SYSTEM.md) — o engine que vai para o worker
- [`AUTOMATION_SYSTEM.md`](AUTOMATION_SYSTEM.md) §9 — performance do idle
- [`UI_UX.md`](UI_UX.md) §5 — responsividade
- [`ASSET_INVENTORY.md`](ASSET_INVENTORY.md) — tamanho dos assets
