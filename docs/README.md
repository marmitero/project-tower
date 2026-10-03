# Documentação — Tower Idle Adventure

**Repositório:** `marmitero/project-tower`
**Especificação central:** [`../Master-Prompt.md`](../Master-Prompt.md) (125 seções, fonte de autoridade)
**Última atualização:** 2026-09-30
**Estado do projeto:** Fase 1 (Documentação) concluída · Fase 2 (Fundação) ainda não iniciada

---

## Como usar esta documentação

> **Leia [`../AI_STATE.md`](../AI_STATE.md) primeiro, em toda sessão.** Ele é o handoff vivo do projeto: estado atual, decisões tomadas, pendências e próximo passo. Nenhum outro documento substitui essa leitura.

Depois do `AI_STATE`, abra o documento ligado à tarefa. A ordem de leitura para alguém novo no projeto é:

```
AI_STATE.md → GDD.md → GAME_SYSTEMS.md → documento do sistema específico → ROADMAP.md
```

## Mapa de documentos

### Visão e produto

| Documento | Conteúdo |
|---|---|
| [`GDD.md`](GDD.md) | Visão do produto, pilares de design, fantasia central, loop, escopo por fase e definição de sucesso |
| [`GAME_SYSTEMS.md`](GAME_SYSTEMS.md) | Visão geral de todos os sistemas, dependências entre eles e mapa de responsabilidades |
| [`ROADMAP.md`](ROADMAP.md) | Fases 0–14, gates, entregáveis e critérios de saída |
| [`PENDING_RULES.md`](PENDING_RULES.md) | Tudo que **não** pode ser inventado. Decisões de gameplay/economia crítica aguardando definição humana |
| [`DECISIONS_LOG.md`](DECISIONS_LOG.md) | Registro de decisões (ADR) e divergências entre o `Master-Prompt.md` e o repositório de referência `tower-idle-adventure` |

### Sistemas de jogo

| Documento | Conteúdo |
|---|---|
| [`CHARACTER_SYSTEM.md`](CHARACTER_SYSTEM.md) | Rei, heróis/súditos, 4 heróis iniciais, classes, atributos, XP de herói, estrelas |
| [`SKILL_SYSTEM.md`](SKILL_SYSTEM.md) | Skills por herói, cooldowns, efeitos, status e IA de uso automático |
| [`COMBAT_SYSTEM.md`](COMBAT_SYSTEM.md) | Battle Engine, fórmulas, eventos, 1×1 da Torre vs equipe×Boss, determinismo |
| [`WEAPON_SYSTEM.md`](WEAPON_SYSTEM.md) | 9 tipos de arma, traços, afinidades e balanceamento |
| [`EQUIPMENT_SYSTEM.md`](EQUIPMENT_SYSTEM.md) | 10 slots, raridades, X individual, qualidade, god rolls, características |
| [`TOWER_SYSTEM.md`](TOWER_SYSTEM.md) | Andares, dificuldade, inimigos, curvas, progressão e recompensas |
| [`BALANCE_REPORT.md`](BALANCE_REPORT.md) | Relatório de balanceamento da Torre **gerado** (`npm run report:balance -- --md`): pacing por andar, custo de vida por papel, sustentabilidade idle |
| [`ADMIN_PANEL.md`](ADMIN_PANEL.md) | Painel Administrativo futuro (FASE 14): contrato `ContentPack`, escopo, regra Admin-Ready por fase |
| [`BOSS_SYSTEM.md`](BOSS_SYSTEM.md) | Atividades de Boss separadas da Torre, combate de equipe, fragmentos |
| [`INVENTORY_SYSTEM.md`](INVENTORY_SYSTEM.md) | Inventário, filtros, ordenação, equipar, vender, descartar, anunciar |
| [`AUTOMATION_SYSTEM.md`](AUTOMATION_SYSTEM.md) | Loop idle, estado Procurando, offline progress, automação de decisões |
| [`ECONOMY_SYSTEM.md`](ECONOMY_SYSTEM.md) | Coin e demais moedas, fontes, sumidouros, balanceamento e auditoria |

### Sistemas online e sociais

| Documento | Conteúdo |
|---|---|
| [`AUTH_SYSTEM.md`](AUTH_SYSTEM.md) | Guest local, Google Auth, regra de uma conta, nickname único, migração de identidade |
| [`CHAT_SYSTEM.md`](CHAT_SYSTEM.md) | Chat Global Realtime, validação server-side, rate limit, anti-spam, moderação |
| [`SOCIAL_SYSTEM.md`](SOCIAL_SYSTEM.md) | Guildas, perfis, rankings, amizades, reputação |
| [`MARKET_SYSTEM.md`](MARKET_SYSTEM.md) | Mercado da Comunidade, anúncios, compra, taxa de 15%, atomicidade, antifraude |
| [`MMO_SYSTEMS.md`](MMO_SYSTEMS.md) | Visão agregada dos sistemas MMORPG assíncronos e suas dependências |

### Plataforma, produção e operação

| Documento | Conteúdo |
|---|---|
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Stack, camadas, separação de responsabilidades, monorepo, contratos cliente/servidor |
| [`CONFIGURATION.md`](CONFIGURATION.md) | **Configuração centralizada** — todo número que não pode ser hardcoded |
| [`UI_UX.md`](UI_UX.md) | HUD, telas, fluxos, responsividade, desktop-first e Android browser |
| [`ART_GUIDELINES.md`](ART_GUIDELINES.md) | Direção de arte, pipeline, política de assets, placeholders e QA |
| [`ASSET_INVENTORY.md`](ASSET_INVENTORY.md) | Inventário do pack de sprites disponível, mapeamento de classes/inimigos e licenças |
| [`AUDIO_GUIDELINES.md`](AUDIO_GUIDELINES.md) | Trilha, SFX, mixagem, acessibilidade e performance de áudio |
| [`SECURITY.md`](SECURITY.md) | Threat model, RLS, server authority, anti-cheat, segredos e variáveis de ambiente |
| [`PERFORMANCE.md`](PERFORMANCE.md) | Orçamento de performance, bundle, memória, render, idle e metas por plataforma |
| [`TESTING.md`](TESTING.md) | Estratégia de testes, matriz obrigatória do Master-Prompt, fixtures e critérios de gate |

## Convenções

- **Documentos normativos** descrevem o que **deve** existir. Nenhum número aqui foi validado em runtime — o jogo ainda não foi implementado.
- **Regra `PENDING`** significa que o valor é uma decisão de gameplay/economia crítica ainda **não definida** pelo `Master-Prompt.md`. Ver [`PENDING_RULES.md`](PENDING_RULES.md). Valores provisórios existem apenas para destravar protótipos internos e estão sempre marcados.
- **NúmerosConfigure** são centralizados em [`CONFIGURATION.md`](CONFIGURATION.md) e em `src/config/`. Proibido espalhar constantes de balanceamento pelo código.
- **Precedência de fontes**, da maior para a menor autoridade:
  1. `Master-Prompt.md`
  2. Decisão humana registrada no `DECISIONS_LOG.md` / `AI_STATE.md`
  3. `docs/*.md`
  4. Referência externa (`marmitero/tower-idle-adventure`), que é **fonte de assets e de decisões técnicas reaproveitáveis**, nunca de regras de gameplay conflitantes.
