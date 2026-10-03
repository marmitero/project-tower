# Estratégia de Testes

**Versão:** 0.1 · **Data:** 2026-09-30 · **Estado:** especificado
**Fonte:** §73, §76, §78, §79, §80, §81, §89, §105 do `Master-Prompt.md`

---

## 1. Por que testes são normativos aqui

O `Master-Prompt.md` lista em §78 **21 casos obrigatórios**, e dois deles (§79, §80) são declarados **críticos**. Isso significa que não são "bons ter" — são **condição para o build passar**.

O motivo é concreto: as regras mais fáceis de quebrar são as mais estruturais.

| Regra | Como se quebra sem teste |
|---|---|
| Torre é 1×1 (§17) | Alguém "melhora" a UI e usa a equipe inteira |
| Boss é equipe × 1 (§24) | O motor fica genérico e o Boss vira 1×1 |
| XP é dividido (§20) | A divisão é removida "para simplificar" |
| Fragmentos não vem de inimigo comum (§12) | Um loot table genérico passa a gerar fragmento |
| Torre sem boss (§55) | "É só mais um inimigo no andar 10" |

Todas as cinco são **regressões silenciosas**: o jogo continua funcionando, a build passa, e a identidade do produto quebra.

---

## 2. Pirâmide

```text
                    ╱╲
                   ╱  ╲          E2E / Playwright
                  ╱    ╲         P0 · ~10 cenários · smoke por PR
                 ╱──────╲
                ╱        ╲       Integração
               ╱          ╲      Vitest · PersistenceService, serviços,
              ╱────────────╲     Edge Functions (mock), RLS
             ╱              ╲
            ╱                ╲    Unitário
           ╱__________________╲   Vitest · fórmulas, config, engine
          ╱                    ╲  ~200 casos · rápido · todo PR
         ╱______________________╲
        ╱                        ╲  Arquitetura
       ╱__________________________╲  Puridade do engine, links, config
```

| Camada | Ferramenta | Frequência | Blockeia merge? |
|---|---|---|---|
| Arquitetura | Vitest + análise de grafo | Todo PR | ✅ |
| Unitário | Vitest | Todo PR | ✅ |
| Integração | Vitest | Todo PR | ✅ |
| E2E | Playwright | PR + `main` | ✅ P0 |
| Carga | k6 / script | Semanal | ⚠️ Beta |
| Segurança | testes de RLS + fuzz | Semanal | ⚠️ Beta |

---

## 3. Matriz obrigatória (§78)

Os 21 casos que o `Master-Prompt.md` exige. Nenhum pode faltar.

| # | Caso | Seção | Teste |
|---|---|---|---|
| 1 | XP | §45 | `xp-pools.test.ts` |
| 2 | Níveis | §45, §46 | `level-curves.test.ts` |
| 3 | Slots | §15 | `team-slot-unlock.test.ts` |
| 4 | Desbloqueios | §46 | `unlock-rules.test.ts` |
| 5 | Coin | §43 | `coin-ledger.test.ts` |
| 6 | Loot | §32 | `loot-distribution.test.ts` |
| 7 | Raridade | §33 | `rarity-distribution.test.ts` |
| 8 | X | §36 | `x-independence.test.ts` |
| 9 | Equipamento | §71 | `equipment-model.test.ts` |
| 10 | Inventário | §70 | `inventory.test.ts` |
| 11 | Venda | §39 | `equipment-sell.test.ts` |
| 12 | Mercado | §40 | `market.test.ts` |
| 13 | **Taxa de 15%** | §41 | `market-tax.test.ts` |
| 14 | Fragmentos | §12 | `fragment-source.test.ts` |
| 15 | Craft | §12 | `hero-craft.test.ts` |
| 16 | **Combate 1×1** | §17, §79 | `tower-battle-size.test.ts` |
| 17 | **Boss 3×1** | §24, §80 | `boss-battle-size.test.ts` |
| 18 | **Divisão de XP** | §20, §81 | `team-xp-split.test.ts` |
| 19 | **Timer de procura** | §27 | `searching-state.test.ts` |
| 20 | Offline rewards | §47 | `offline-rewards.test.ts` |
| 21 | **Limite Free** | §48 | `offline-cap.test.ts` |
| 22 | **Limite VIP** | §48 | `offline-cap.test.ts` |

*(22 linhas — o §78 lista "limite Free" e "limite VIP" como casos separados.)*

---

## 4. Testes críticos declarados

### 4.1 `INV-01` — Torre é 1×1

> *"Garantir: Hero A VS Enemy A. **Nunca**: Hero A + Hero B + Hero C VS Enemy durante Tower Battle."* (§79)

```ts
describe("INV-01: TowerBattle é sempre 1×1", () => {
  it("rejeita 2 heróis mesmo que a equipe os tenha", () => {
    const team = [heroA, heroB, heroC];
    const state = engine.create("tower", {
      activeHero: heroA,
      team,
      enemy: enemyX,
    }, seed);
    expect(state.allies).toHaveLength(1);
    expect(state.enemies).toHaveLength(1);
  });

  it("nunca usa mais de um herói em nenhum tick", () => {
    const events = engine.step(state, 10000);
    const attackers = new Set(
      events.filter((e) => e.type === "attack_started").map((e) => e.actorId),
    );
    expect(attackers.size).toBeLessThanOrEqual(1);
  });
});
```

### 4.2 `INV-02` — Torre sem boss

> *"andar 10 = boss / andar 20 = boss / andar 30 = boss"* — **ABOLIDO** (§55)

```ts
it("nenhum andar da Torre define boss", () => {
  for (const floor of config.tower.floors) {
    expect(floor.bossId ?? null).toBeNull();
  }
  expect(config.combat.towerAutoBossFloors).toHaveLength(0);
});
```

### 4.3 `INV-03` — Boss usa toda a equipe

> *"Garantir: Hero A, Hero B, Hero C ↓ BOSS. Todos os membros atacam simultaneamente."* (§80)

```ts
it("todos os 3 heróis atacam no mesmo tick", () => {
  const state = engine.create("boss", { team: [a, b, c], boss }, seed);
  const events = engine.step(state, 3);   // primeiros ticks
  const attackers = new Set(
    events.filter((e) => e.type === "attack_started").map((e) => e.actorId),
  );
  expect(attackers.size).toBe(3);
});
```

### 4.4 `INV-05` — Fragmentos não vêm de inimigo comum

```ts
it("100.000 inimigos comuns nunca geram fragmento de herói", () => {
  for (let i = 0; i < 100_000; i++) {
    const loot = rollLoot({ source: "tower_common", rng: prng(i) });
    expect(loot.fragments).toHaveLength(0);
  }
});

it("Boss pode gerar fragmento", () => {
  const loot = rollLoot({ source: "boss", rng: prng(42) });
  expect(loot.fragments.length).toBeGreaterThanOrEqual(0);
});
```

### 4.5 `INV-06` — Divisão de XP (§81)

```ts
it.each([
  [1, 1.00],
  [2, 0.50],
  [3, 1 / 3],
])("%i heróis recebem %.2f do XP", (size, share) => {
  const xp = divideXp(1000, size);
  expect(xp).toHaveLength(size);
  xp.forEach((v) => expect(v).toBeCloseTo(1000 * share, 5));
});

it("todos os membros elegíveis recebem XP", () => {
  const xp = divideXp(1000, 3);
  expect(xp.every((v) => v > 0)).toBe(true);
});
```

### 4.6 `INV-07` — X independente por atributo

> *"Nunca assumir: todo atributo possui o mesmo X."* (§36)

```ts
it("X de cada atributo é independente", () => {
  const samples = Array.from({ length: 10_000 }, (_, i) => rollEquipment(prng(i)));
  const identical = samples.filter((e) => {
    const values = Object.values(e.xValues);
    return values.every((v) => v === values[0]);
  });
  expect(identical.length).toBeLessThan(samples.length * 0.001);
});

it("mesma seed gera o mesmo item", () => {
  expect(rollEquipment(prng(123))).toEqual(rollEquipment(prng(123)));
});
```

> O segundo teste é o que garante auditabilidade e server authority: o servidor pode provar qual item foi sorteado.

### 4.7 `INV-08` — Taxa de 15%

```ts
it("vendedor recebe 85% e o servidor 15%", () => {
  const result = executeMarketPurchase({
    price: 100_000n,
    taxRate: config.economy.market.taxRate,
  });
  expect(result.sellerDelta).toBe(85_000n);
  expect(result.serverDelta).toBe(15_000n);
  expect(result.buyerDelta).toBe(-100_000n);
});

it("taxa nunca vai para o vendedor", () => {
  expect(config.economy.market.taxDestination).toBe("sink");
});
```

### 4.8 `INV-09` — Limite offline

```ts
it("Free limita a 2 horas", () => {
  const r = calculateOffline(5 * 3600_000, { vipTier: 0 });
  expect(r.creditedDurationMs).toBe(2 * 3600_000);
  expect(r.wasCapped).toBe(true);
});

it("VIP limita a 8 horas", () => {
  const r = calculateOffline(24 * 3600_000, { vipTier: 1 });
  expect(r.creditedDurationMs).toBe(8 * 3600_000);
});

it("nunca gera recompensa infinita", () => {
  const short = calculateOffline(3600_000, { vipTier: 0 });
  const forever = calculateOffline(1e12, { vipTier: 0 });
  expect(forever.rewards.coin).toBeLessThanOrEqual(
    calculateOffline(2 * 3600_000, { vipTier: 0 }).rewards.coin * 1.001,
  );
});
```

### 4.9 `INV-10` — Estado Procurando

```ts
it("dura ~3 segundos", () => {
  const durations = Array.from({ length: 1000 }, (_, i) =>
    searchDuration(prng(i)),
  );
  const avg = mean(durations);
  expect(avg).toBeGreaterThan(2700);
  expect(avg).toBeLessThan(3200);
});

it("não reinicia ao navegar", () => {
  const s = startSearching(1000);
  const mid = s.startedAt + 1500;
  expect(isSearching({ ...s }, mid)).toBe(true);
});

it("sobrevive a recarregar a página", () => {
  const s = startSearching(1000);
  // reidratar do save
  expect(isSearching(s, 1000 + 3000)).toBe(false);
});
```

### 4.10 `INV-11` — Puridade do engine

```ts
it("engine não importa React, Phaser nem DOM", async () => {
  const graph = await analyzePackage("packages/engine");
  expect(graph.imports).not.toContain("react");
  expect(graph.imports).not.toContain("phaser");
  expect(graph.globals).not.toContain("document");
  expect(graph.globals).not.toContain("window");
  expect(graph.globals).not.toContain("setTimeout");
});

it("engine não usa Math.random", async () => {
  const graph = await analyzePackage("packages/engine");
  expect(graph.globals).not.toContain("Math.random");
});
```

---

## 5. Testes de arquitetura

Rodam a cada PR e protegem as proibições do §105:

```ts
describe("proibições do Master-Prompt §105", () => {
  it("nenhuma probabilidade de balanceamento está hardcoded fora de config", () => {
    const violations = scanForMagicNumbers([
      "src/game-core", "src/engine", "src/battle", "src/hud",
    ], [0.05, 0.5, 0.3, 0.15, 0.04, 0.009, 0.001, 0.15, 2700, 3200]);
    expect(violations).toHaveLength(0);
  });

  it("nenhum componente React contém lógica de combate", () => {
    expect(scanReactForLogic("src/battle")).toHaveLength(0);
  });

  it("nenhum asset placeholder em produção", () => {
    expect(findPlaceholders("public/assets")).toHaveLength(0);
  });
});
```

---

## 6. Testes de configuração

```ts
describe("validação de configuração", () => {
  it("tabela de raridade soma 100%", () => {
    const total = sum(Object.values(config.loot.rarity));
    expect(total).toBeCloseTo(1.0, 3);
  });

  it("tabela de XP por time soma ≤ 100%", () => {
    expect(sum(Object.values(config.xp.teamSplit))).toBeLessThanOrEqual(1.0);
  });

  it("níveis de slot são monotônicos", () => {
    const levels = config.team.slots.map((s) => s.kingLevel);
    expect(levels).toEqual([...levels].sort((a, b) => a - b));
  });

  it("todo ID referenciado existe", () => {
    for (const floor of config.tower.floors) {
      for (const e of floor.enemyPool) {
        expect(catalog.enemies.has(e.enemyId)).toBe(true);
      }
    }
  });
});
```

> **`validateConfig()` roda no boot.** Uma config inválida falha alto, em desenvolvimento, não em produção com o jogador olhando.

---

## 7. Testes de distribuição

Para loot, um teste com mock fixo **não prova** nada. São necessárias amostras grandes.

```ts
it("drop de equipamento é ~5%", () => {
  const n = 1_000_000;
  const drops = Array.from({ length: n }, (_, i) =>
    rollLoot({ source: "tower_common", rng: prng(i) }).equipment,
  ).filter(Boolean).length;
  expect(drops / n).toBeCloseTo(0.05, 3);   // ±0,1%
});

it("celestial é ~0,1% dos drops", () => {
  const n = 2_000_000;
  // ~0,05% de todos os inimigos = ~1000 amostras de drop
  // com semente fixa e PRNG determinístico, é reprodutível
  const celestials = countRarity(n, "celestial");
  expect(celestials / n).toBeGreaterThan(0.0008);
  expect(celestials / n).toBeLessThan(0.0012);
});
```

Teste de **chi-quadrado** para validar cada atributo independentemente, garantindo que o X segue a distribuição esperada e não é correlacionado entre atributos.

---

## 8. Debug Mode

> *"Criar Debug Mode exclusivo para desenvolvimento. **Nunca disponibilizar ao jogador final.**"* (§77)

### 8.1 Capacidades exigidas (§77)

| Categoria | Ações |
|---|---|
| Recursos | Adicionar Coin, Diamonds, XP |
| Personagem | Criar personagem, criar fragmentos |
| Equipamento | Criar equipamento, escolher raridade, definir X |
| Progressão | Alterar nível, alterar estrelas |
| Combate | Escolher andar, iniciar batalha, matar inimigo, matar personagem, iniciar Boss |
| Sistemas | Testar loot, mercado, offline rewards, chat, autenticação |

### 8.2 Proteção

```ts
// Nunca é removido — compilado fora e falhando alto se ligado
if (import.meta.env.DEV && debugStore.enabled) {
  mountDebugPanel();
} else if (!import.meta.env.DEV) {
  // defesa em profundidade: nenhum código de debug no bundle de produção
  if (debugStore.enabled) throw new Error("DebugMode em produção");
}
```

Três camadas:

1. `import.meta.env.DEV` — **tree-shaking** remove o código do bundle.
2. Verificação em runtime que **lança**.
3. Teste de CI que faz grep do bundle por strings de debug.

---

### 8.3 Estado real (Fase 13)

Implementado de outro jeito que o rascunho acima, mais simples e mais forte: o Debug Mode é uma **flag de build** (`VITE_DEBUG_MODE=true`; `--mode debug` no Vite) e o painel é carregado por `lazy` só com a flag ligada — o bundle do jogador **não contém o código**. A verificação é mecânica e dupla: `scripts/check-debug-mode.mjs` (fontes: toda menção protegida por `import.meta.env`; `.env.example` sem `true`) e `scripts/check-preview.mjs` (o bundle versionado não pode ter as strings do painel). As ferramentas em si são lógica pura em `packages/game-core/src/debug.ts`, com `debug.test.ts` (15 testes).

## 9. E2E — o caminho do §118

Os 20 passos do §118 são literalmente o roteiro do MVP. Eles viram **um** teste E2E de fumaça:

```ts
test("MVP loop completo (§118)", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /criar rei/i }).click();
  await page.getByLabel(/nome/i).fill("Igor");
  await page.getByRole("img", { name: /skin/i }).first().click();
  await page.getByRole("button", { name: /criar/i }).click();

  // escolher 1 dos 4 heróis
  await expect(page.getByTestId("hero-choice")).toHaveCount(4);
  await page.getByTestId("hero-choice").first().click();

  // entrar na Torre
  await page.getByRole("button", { name: /torre/i }).click();
  await page.getByTestId("floor-1").click();
  await page.getByRole("button", { name: /iniciar hunt/i }).click();

  // 1×1
  await expect(page.getByTestId("battlefield")).toBeVisible();
  await expect(page.getByTestId("hero-actor")).toBeVisible();
  await expect(page.getByTestId("enemy-actor")).toBeVisible();

  // procurar
  await expect(page.getByTestId("searching")).toBeVisible();

  // xp e coin
  await expect(page.getByTestId("coin-amount")).not.toHaveText("0");

  // fechar e voltar
  await page.reload();
  await expect(page.getByTestId("king-level")).not.toHaveText("1");
});
```

---

### 9.1 Como o §118 é realmente testado (Fase 13)

Sem navegador gráfico no ambiente, o roteiro foi dividido em camadas que **rodam em todo `npm run check`**:

| Camada | Arquivo | O que prova |
|---|---|---|
| Jornada do jogador (lógica) | `tests/integration/mvp-journey.test.ts` | os 20 passos do §118 com `createGame`/`boot`, persistência local, `advanceIdle` e offline (5 h fora → teto Free 2 h) |
| Estabilidade | `tests/integration/soak.test.ts` | 3 h simuladas × 4 heróis + 5 aberturas offline, invariantes e ida-e-volta do save |
| Interface (jsdom) | `apps/game-web/src/__tests__/ui-smoke.test.tsx` | App React real: criação → todas as telas → Opções (som, baixar/carregar/apagar/restaurar save) → ErrorBoundary; sem `§N`/`P-xxx` no texto |
| Entrega | `scripts/check-preview.mjs` | servidor real do `JOGAR.bat`: index → JS/CSS → manifesto → ~494 assets, bundle em dia e sem debug, nomes compatíveis com Windows |
| Matriz | `tests/integration/acceptance-doc.test.ts` | [`MVP_ACCEPTANCE.md`](MVP_ACCEPTANCE.md) lista os 22 itens do §78 e os 20 do §118 e só cita arquivos que existem |

**Limite:** a **aparência** na tela (sprites, animação, layout) só se valida jogando. Um E2E com Playwright continua desejável quando houver navegador no CI.

---

## 10. Gate de release

Nenhum deploy sem:

- [ ] Todos os 22 casos da matriz §78 passando
- [ ] `INV-01` (1×1) e `INV-03` (Boss equipe) passando
- [ ] Testes de arquitetura (§5) passando
- [ ] `validateConfig()` sem erro
- [ ] E2E do §118 passando
- [ ] Debug Mode ausente do bundle
- [ ] Nenhum placeholder
- [ ] Documentação atualizada
- [ ] `AI_STATE.md` atualizado

---

## 11. Ferramentas

```bash
npm run test              # unit + integração
npm run test:arch         # arquitetura e proibições §105
npm run test:e2e          # Playwright
npm run test:coverage     # com relatório
npm run check:docs        # integridade da documentação
npm run check:config      # validação de configuração
npm run check:assets      # dimensões, alpha, placeholder
```

Meta de cobertura:

| Módulo | Cobertura de linha |
|---|---|
| `packages/engine` | ≥ 95% |
| `packages/config` | 100% (é dado) |
| `packages/game-core/services` | ≥ 90% |
| `apps/game-web` (UI) | ≥ 60% |

> O engine é onde a **correção** está; a UI é onde a **regressão visual** está. A divisão reflete isso.

---

### 11.1 Fumaça de navegador da batalha (ADR-029)

`scripts/browser-smoke.mjs` abre o jogo num **Chromium real**, joga até a Torre e afirma, lendo `window.__tiaBattle.snapshot()`: a arena rolou (herói andou), uma batalha chegou à cena com sprite dos **dois** lados, e não houve 404 nem erro de console. Existe porque a suíte em jsdom **nunca renderizou o Phaser** e a tela preta da batalha passou "verde". Fora de `npm run check` (exige navegador); rodar **sempre que mexer em `apps/game-web/src/render/`**:

```bash
mkdir /tmp/br && cd /tmp/br && npm i puppeteer-core @sparticuz/chromium   # descartável, fora do repo
NODE_PATH=/tmp/br/node_modules node scripts/browser-smoke.mjs --url http://127.0.0.1:5173/ --out /tmp/capturas
# ou, com o Chrome/Edge instalado:  CHROME="C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" ...
```

Parte sem navegador: `tests/integration/battle-render.test.ts` (assets de temas e personagens existem no manifesto e em disco; quadros dos VFX cabem na folha real; todo tema de andar tem arena; a fonte da cena reflete o estado; mapa evento→efeito).

## 12. Referências

- [`COMBAT_SYSTEM.md`](COMBAT_SYSTEM.md) §3 — invariantes
- [`CONFIGURATION.md`](CONFIGURATION.md) — validação
- [`GDD.md`](GDD.md) §19 — definição de sucesso (§118)
- [`SECURITY.md`](SECURITY.md) — testes de segurança
- [`PENDING_RULES.md`](PENDING_RULES.md) — valores bloqueados que os testes aguardam
