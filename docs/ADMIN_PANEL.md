# Painel Administrativo (FASE 14 — pós-MVP)

**Status:** 📐 PLANEJADO — **nada de UI do painel foi implementado.** O que existe hoje é o **alicerce** (ADR-022): conteúdo data-driven, serializável e validável (`ContentPack`).
**Pedido do usuário (2026-10-03):** um painel que permita **editar, adicionar e remover inimigos, bosses e heróis manualmente, sem IA e sem código**, e que o que for editado ali se aplique **diretamente no jogo**. As etapas de implementação (FASES 9–12) foram organizadas para isso.

---

## 1. Objetivo e princípios

1. **Zero código para mexer em conteúdo.** Quem opera o jogo cria um inimigo novo, muda o nível de um andar ou ajusta o XP preenchendo formulários.
2. **O painel não conhece regras do jogo.** Ele edita dados (`ContentPack`) e chama `validateContentPack`. Quem aplica é o jogo (`applyContentPack`).
3. **Nunca aplica conteúdo inválido.** A validação lista **todos** os problemas, em português, apontando o campo (ex.: `floors[4] (andar 5): inimigo desconhecido "fantasma"`).
4. **Sempre existe volta.** O pack padrão (`defaultContentPack()`) é o fallback; "restaurar padrão" é um botão.
5. **Pré-visualização antes de salvar.** A mesma simulação do `balance.ts` mostra "com estes números a luta dura N s e custa X% de vida" e "este andar leva H horas".
6. **Saves não quebram.** O save guarda ids e números; andares removidos são normalizados no load (`clampFloor`).

---

## 2. Contrato (já implementado — `packages/config/src/content.ts`)

```text
painel ──edita──▶ ContentPack (JSON) ──validateContentPack──▶ erros[] (vazio = ok)
                                      └─applyContentPack──▶ jogo (mutação em lugar, atômica)
jogo ──exportContentPack──▶ ContentPack (estado vivo)       defaultContentPack() = fábrica
```

| Função | O que faz |
|---|---|
| `defaultContentPack()` | Pack de fábrica (independe do estado vivo). |
| `exportContentPack(nome)` | Foto do conteúdo vivo. |
| `validateContentPack(unknown)` | Todos os erros do pack (aceita JSON cru; nunca lança). |
| `applyContentPack(pack)` | Valida → lança `ContentPackError` se inválido → senão aplica **atomicamente**. |
| `resetContentToDefaults()` | Volta à fábrica. |

Escopo do pack **hoje** (v1): `enemies[]`, `tower { enemyStatMultiplier, enemyHpMultiplier, enemyAttackMultiplier, rewards{kingXp,heroXp,coins}, floors[] }`, `progression { king, hero }` (teto + curva de XP).

### O que o formulário de cada entidade edita

| Entidade | Campos editáveis | Derivado (nunca editado) |
|---|---|---|
| **Inimigo** (`EnemySeed`) | id, nome, papel, tipo de dano, 6 atributos, multiplicador de força, sprites (6 folhas + retrato) | `growth` (hp/atk/def por nível) |
| **Andar** (`FloorDef`) | nome, faixa de nível, nível dos inimigos, nível de Rei exigido, **pool** (inimigo + peso), tema, tintura | chances (%) |
| **Curva** (`CurveDef`) | base, expoente, offset (XP do Rei/herói, XP e Coin por abate) | tabela de XP por nível |
| **Dificuldade** | multiplicadores globais (geral, vida, ataque) | — |

---

## 3. Roteiro por fase (regra AR — "Admin-Ready")

Cada fase que cria **conteúdo** entrega: (a) tipo `*Seed` serializável, (b) estado vivo mutável em lugar, (c) `validate*`, (d) campo no `ContentPack`, (e) teste de round-trip export → JSON → apply.

| Fase | Conteúdo que entra no pack | Observação |
|---|---|---|
| ✅ **7 — Torre** | inimigos, andares, curvas de XP/recompensa, dificuldade | ADR-021/022 |
| ✅ **9 — Equipamento** | **`ContentPack` v2**: `equipment` (slots, templates com linhas/pesos/raridade, traços de arma como `GearEffect`, características, notas S–F, unidades por stat, tetos de efeito, requisito, afinidade, venda), `loot` (chance, tabela de raridade, forma do X), `inventory`, `heroAcquisition` (raridade/atributos de herói) | ADR-023/024; pack v1 migra sozinho (`migrateContentPack`); ver `CONFIGURATION.md` §10.1 |
| **10 — Economia** | preço de slot, preço de venda, recompensas de Coin, custos | P-008/P-036 |
| **12 — Boss** | `BossSeed`: id, nome, atributos, skills, fases, recompensas, **fragmentos** (§12 — só aqui), requisitos, sprites (`boss`, `slimeking`) | boss vive em lista **própria** (`bosses[]`); `floors[].pool` só aceita ids de `enemies[]` — a validação referencial já impede boss na Torre (§21/§55) |
| **4 / 9–12 — Heróis** | `HeroIdentityDef` (identidade P-002), `HeroClassDef` (atributos, skills ativas/passivas, arma afim), `SkillDef` (coeficiente, recarga, alvo, tipo de dano) | hoje em `heroes.ts`/`catalog.ts`/`skills.ts`; migram para o pack ao serem tocados por cada fase |
| **13 — MVP Local** | `ContentStore` local (ver §4) | só persistência; sem UI |

> Regra de ouro: **nenhum literal de balanceamento em código**. Se um número muda o jogo, ele mora num `*Seed`/`CurveDef`/`config`, validado e exportável.

---

## 4. Persistência dos overrides (`ContentStore`)

```text
boot: pack = store.load() ?? defaultContentPack()
      errors = validateContentPack(pack)   → se houver erros: ignora o pack, usa o padrão, avisa o operador
      applyContentPack(pack) → validateConfig() → jogo inicia
```

- **MVP local:** `localStorage`/arquivo JSON importável ("Importar/Exportar conteúdo").
- **Fase Online:** tabela Supabase `content_packs(version, name, payload jsonb, active, created_by, created_at)` + RLS (só `role = admin` escreve; jogadores só leem o pack ativo). Packs **versionados** e imutáveis; "ativar" = apontar para uma versão; rollback = reativar a anterior (padrão de `reference/tower-idle-adventure/supabase`).
- Server authority (§53): na fase Online, quem **valida e aplica** é o servidor; o cliente só recebe o pack ativo.

---

## 5. Escopo do painel (FASE 14)

1. **Acesso:** rota protegida (`role = admin`) na fase Online. **Não é o Debug Mode** (§93: Debug é exclusivo de desenvolvimento); em build local/dev o painel fica atrás de uma flag de build própria (`VITE_ADMIN_PANEL`), com um verificador análogo ao `check:debug-mode` que falha se a flag estiver ligada em produção.
2. **Telas:** Inimigos (lista + formulário + duplicar), Andares (lista, faixa, pool com pesos e %, arrastar para reordenar), Curvas (gráfico da curva + horas por andar), Bosses (FASE 12), Heróis/Classes/Skills, Equipamento (FASE 9), Importar/Exportar, Histórico de versões.
3. **Pré-visualização:** `simulateDuel/averageDuel/simulateHunt/towerPacing` (já em `@tia/game-core`, `balance.ts`) — a UI só desenha.
4. **Erros:** exibe `validateContentPack()` campo a campo; botão "Aplicar" desabilitado enquanto houver erro.
5. **Segurança:** nunca executar texto do pack (é só dado); limite de tamanho; sprites só por id do manifesto de assets (`check:assets`).
6. **Fora do escopo:** editor de sprites/animação, edição de regras de código, scripts customizados.

## 6. Critérios de aceite da FASE 14

- Adicionar um inimigo novo (atributos + sprite do manifesto) e vê-lo aparecer no pool de um andar **sem reiniciar o build**.
- Mudar a faixa do andar 10 e ver o impacto em horas (pré-visualização) antes de aplicar.
- Remover um inimigo usado em andares é **bloqueado** com mensagem apontando os andares afetados.
- Pack inválido nunca altera o jogo (teste de atomicidade já existe).
- Export → import devolve conteúdo idêntico (teste de round-trip já existe).
