# Aceite do MVP local (Fase 13)

Matriz de aceite: cada exigência do Master-Prompt que define o **MVP local** apontada para o **teste
automatizado** que a protege. O arquivo `tests/integration/acceptance-doc.test.ts` confere que (a) todos os
itens do §78 e todos os 20 passos do §118 estão aqui e (b) **todo arquivo citado existe** — a matriz não envelhece em silêncio.

Legenda: ✅ coberto por teste · 🔶 parcial / depende da Fase Online (explicado) · 🎮 só dá para validar jogando (visual).

## 1. §78 — testes exigidos pelo Master-Prompt

| # | Item | Status | Evidência |
|---|---|---|---|
| 1 | XP | ✅ | `packages/game-core/src/__tests__/progression.test.ts`, `packages/game-core/src/__tests__/tower-balance.test.ts` |
| 2 | níveis | ✅ | `packages/game-core/src/__tests__/progression.test.ts`, `packages/engine/src/__tests__/level-scaling.test.ts`, `packages/game-core/src/__tests__/king.test.ts` |
| 3 | slots | ✅ | `packages/game-core/src/__tests__/team.test.ts`, `packages/game-core/src/__tests__/team-slot-unlock.test.ts` |
| 4 | desbloqueios | ✅ | `packages/game-core/src/__tests__/team-slot-unlock.test.ts`, `packages/game-core/src/__tests__/tower-floors.test.ts`, `packages/game-core/src/__tests__/boss.test.ts` |
| 5 | Coin | ✅ | `packages/game-core/src/__tests__/market-bot-offline.test.ts`, `tests/integration/tower-loop.test.ts` |
| 6 | loot | ✅ | `packages/game-core/src/__tests__/loot.test.ts` |
| 7 | raridade | ✅ | `packages/game-core/src/__tests__/loot.test.ts`, `packages/config/src/__tests__/equipment.test.ts` |
| 8 | X | ✅ | `packages/game-core/src/__tests__/loot.test.ts`, `packages/config/src/__tests__/equipment.test.ts` |
| 9 | equipamento | ✅ | `packages/game-core/src/__tests__/gear.test.ts`, `tests/integration/equipment-flow.test.ts`, `packages/engine/src/__tests__/gear-effects.test.ts` |
| 10 | inventário | ✅ | `packages/game-core/src/__tests__/inventory.test.ts` |
| 11 | venda | ✅ | `packages/game-core/src/__tests__/inventory.test.ts`, `tests/integration/equipment-flow.test.ts` |
| 12 | mercado | 🔶 | Market do Reino (loja de Coin, poções, caixas): ✅ `packages/game-core/src/__tests__/market-bot-offline.test.ts`. Mercado da **comunidade** (jogador↔jogador) é da Fase Online (servidor autoritativo). |
| 13 | taxa de 15% | 🔶 | A taxa está travada na config e a validação rejeita outro valor (`packages/config/src/__tests__/config.test.ts`). A cobrança real é do servidor (Fase Online) — não existe mercado entre jogadores no MVP local. |
| 14 | fragmentos | ✅ | `packages/game-core/src/__tests__/hero-acquisition.test.ts`, `packages/game-core/src/__tests__/boss.test.ts` |
| 15 | craft | ✅ | “Fragmentos → Craft/Summon → Personagem” (§12): `packages/game-core/src/__tests__/hero-acquisition.test.ts` |
| 16 | combate 1×1 | ✅ | `packages/engine/src/__tests__/simulate.test.ts`, `tests/integration/tower-loop.test.ts`, `packages/game-core/src/__tests__/combat-hp.test.ts` |
| 17 | Boss 3×1 | ✅ | `packages/engine/src/__tests__/boss-battle.test.ts`, `packages/game-core/src/__tests__/boss.test.ts` |
| 18 | divisão de XP | ✅ | `packages/game-core/src/__tests__/team-xp-split.test.ts` |
| 19 | timer de procura | ✅ | `packages/game-core/src/__tests__/searching-state.test.ts`, `tests/integration/mvp-journey.test.ts` |
| 20 | offline rewards | ✅ | `packages/game-core/src/__tests__/market-bot-offline.test.ts`, `packages/game-core/src/__tests__/hunt.test.ts`, `tests/integration/mvp-journey.test.ts` |
| 21 | limite Free | ✅ | `packages/game-core/src/__tests__/hunt.test.ts`, `tests/integration/mvp-journey.test.ts`, `tests/integration/soak.test.ts` |
| 22 | limite VIP | ✅ | `packages/game-core/src/__tests__/hunt.test.ts` (8 h na config; a assinatura VIP em si é pós-MVP) |

Testes críticos do §79–§81 (Torre 1×1, Boss com a equipe inteira, XP 1/2/3 heróis): `tests/integration/tower-loop.test.ts`,
`packages/engine/src/__tests__/boss-battle.test.ts`, `packages/game-core/src/__tests__/team-xp-split.test.ts`.

## 2. §118 — definição de sucesso do MVP (a jornada do jogador)

O teste `tests/integration/mvp-journey.test.ts` percorre os passos 1–20 com as mesmas peças do jogo real
(`createGame`/`boot`, persistência local, `advanceIdle`, offline). A interface é percorrida por
`apps/game-web/src/__tests__/ui-smoke.test.tsx` (React real em jsdom).

| # | Passo | Status | Onde |
|---|---|---|---|
| 1 | criar seu Rei | ✅ | `tests/integration/mvp-journey.test.ts`, `tests/integration/creation-flow.test.ts`, `apps/game-web/src/__tests__/ui-smoke.test.tsx` |
| 2 | escolher sua identidade | ✅ | `tests/integration/mvp-journey.test.ts` (skin) |
| 3 | escolher 1 dos 4 heróis | ✅ | `tests/integration/mvp-journey.test.ts` (recebe apenas o escolhido) |
| 4 | montar sua equipe | ✅ | `tests/integration/mvp-journey.test.ts`, `packages/game-core/src/__tests__/team.test.ts` |
| 5 | desbloquear slots | ✅ | `tests/integration/mvp-journey.test.ts` (nível 10 + Coin; o Coin é atalho de teste) |
| 6 | escolher um herói para a Torre | ✅ | `tests/integration/mvp-journey.test.ts` |
| 7 | entrar em batalha | ✅ | `tests/integration/mvp-journey.test.ts` |
| 8 | lutar 1×1 | ✅ | `tests/integration/mvp-journey.test.ts`, `tests/integration/tower-loop.test.ts` |
| 9 | ganhar | ✅ | `tests/integration/mvp-journey.test.ts` |
| 10 | receber XP | ✅ | `tests/integration/mvp-journey.test.ts` |
| 11 | receber Coin | ✅ | `tests/integration/mvp-journey.test.ts` |
| 12 | eventualmente encontrar equipamento | ✅ | `tests/integration/mvp-journey.test.ts` (drop real em ≤ 4 h simuladas) |
| 13 | equipá-lo | ✅ | `tests/integration/mvp-journey.test.ts`, `tests/integration/equipment-flow.test.ts` |
| 14 | continuar | ✅ | `tests/integration/mvp-journey.test.ts`, `tests/integration/soak.test.ts` |
| 15 | observar a animação Procurando | ✅ | estado e duração (2,7–3,2 s): `tests/integration/mvp-journey.test.ts`; animação em tela: 🎮 `apps/game-web/src/render/BattleScene.ts` |
| 16 | enfrentar o próximo inimigo | ✅ | `tests/integration/mvp-journey.test.ts` |
| 17 | melhorar seu personagem | ✅ | `tests/integration/mvp-journey.test.ts` |
| 18 | avançar na Torre | ✅ | `tests/integration/mvp-journey.test.ts` (andar 2 abre no nível 10) |
| 19 | fechar o navegador | ✅ | `tests/integration/mvp-journey.test.ts` (grava e “fecha”), `apps/game-web/src/__tests__/ui-smoke.test.tsx` (recarregar) |
| 20 | retornar e recuperar progresso offline | ✅ | `tests/integration/mvp-journey.test.ts` (5 h fora → teto Free de 2 h) |

## 3. §82 — conteúdo do MVP local (checklist)

Criação do Rei, nickname, skin, 4 heróis iniciais, escolha de 1, equipe, slot 1, slots 2 e 3, Coin, XP do Rei e do herói, Torre
com vários andares, inimigos, combate 1×1, seleção do herói, animação “Procurando” (~3 s), batalha automática, skills, equipamento,
raridade, X, loot raro, inventário, venda por Coin, automação (Bot), offline com limite de 2 h, HUD, Debug Mode e save local — **todos entregues**:
ver `docs/ROADMAP.md` (fases 1–13) e `README.md`. Extras da Fase 13: Opções (som, exportar/importar/apagar save com backup),
“Próximo passo”, tela de erro com saída, “Como jogar”, créditos do pack, `JOGAR.bat`.

## 4. Estabilidade e entrega

| Garantia | Teste/verificação |
|---|---|
| 3 h simuladas × 4 heróis sem NaN, Coin negativa, mochila acima do limite ou save que não faz ida-e-volta | `tests/integration/soak.test.ts` |
| 5 aberturas offline seguidas sem criar Coin do nada | `tests/integration/soak.test.ts` |
| Toda a interface sem exceção e sem jargão interno (`§N`, `P-xxx`) | `apps/game-web/src/__tests__/ui-smoke.test.tsx` |
| Save: exportar/importar/apagar/restaurar; não é regravado ao sair | `apps/game-web/src/__tests__/ui-smoke.test.tsx` |
| Save corrompido não derruba o jogo | `apps/game-web/src/__tests__/ui-smoke.test.tsx`, `packages/game-core/src/__tests__/persistence.test.ts` |
| Debug Mode nunca vai ao jogador | `scripts/check-debug-mode.mjs`, `scripts/check-preview.mjs`, `packages/game-core/src/__tests__/debug.test.ts` |
| O zip do GitHub abre completo (jogo, CSS, imagens, sons) | `scripts/check-preview.mjs`, `docs/PLAY_LOCAL.md` |

## 5. O que o MVP local **não** tem (de propósito)

Conta/login, cloud save, chat, Mercado entre jogadores com taxa de 15%, VIP pago, World/Guild/Event Boss, craft de equipamento,
Painel ADM (Fase 14). Ver `docs/ROADMAP.md` e `docs/PENDING_RULES.md`.
