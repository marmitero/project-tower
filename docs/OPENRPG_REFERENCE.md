# Referência OpenRpg — o que extraímos e como mapeia

**Versão:** 0.1 · **Data:** 2026-10-01 · **Estado:** adotado como base de dados
**Fonte:** [github.com/openrpg/OpenRpg](https://github.com/openrpg/OpenRpg) (MIT, autoria grofit) — commit de referência `b498764` (2026-07-08)
**Decisão:** `docs/DECISIONS_LOG.md` ADR-014

> **Precedência (ADR-001):** `Master-Prompt.md` > decisão humana > `docs/` >
> referência externa. O OpenRpg é **base de dados e convenções**, não regra de
> gameplay. Toda divergência listada em §8 tem vencedor declarado.

---

## 1. O que é o OpenRpg

Framework C# de blocos de RPG (MIT): modelos de Raça, Classe, Stats, Effects,
Items, Inventory, Combat, Quests, com extensões de gênero (Fantasy, Scifi). Ele
não é um jogo — é um **conjunto de convenções com exemplos concretos**
(`OpenRpg.Demos.Infrastructure`) que servem de base de dados para os nossos
sistemas.

Pacotes que importamos como referência:

| Pacote | O que tiramos |
|---|---|
| `OpenRpg.Genres.Fantasy` | Atributos, fórmulas de derivação de vitais/melee, tipos de dano, slots de equipamento, qualidade de item |
| `OpenRpg.Demos.Infrastructure/Data` | Roster de classes (Fighter/Mage), 10 abilities, templates de item, modificadores |
| `OpenRpg.CurveFunctions` | Curvas de balance (polinomial, logística, logit, normal, seno, step) + `ScalingFunction` (normaliza → curva → desnormaliza) |
| `OpenRpg.Items` | Template×instância, loot table com `DropRate` por entrada, `IsUnique` |
| `OpenRpg.Combat` | Variação de dano, crítico, defesa por tipo |

---

## 2. Status (atributos) — o que adotamos

**Adotado: atributos-base STR/DEX/CON/INT/WIS/CHA como IDENTIDADE da classe.**
Os stats de combate são **projeção derivada** (nunca números escritos à mão).

| OpenRpg (`FantasyEntityStatsVariableTypes`) | Nosso `CharacterAttributes` | Papel |
|---|---|---|
| Strength | `strength` | Dano físico bruto |
| Dexterity | `dexterity` | Velocidade, crítico, perfurante |
| Constitution | `constitution` | Vida e defesa física |
| Intelligence | `intelligence` | Poder mágico |
| Wisdom | `wisdom` | Defesa mágica e sustain |
| Charisma | `charisma` | Identidade social/economia futura (sem efeito em combate hoje) |

Nosso `CombatStats` (hp, attack, specialAttack, defense, specialDefense,
critChance, attackSpeed, speed) continua sendo o que o engine consome — a
camada de atributos fica **acima**, em `packages/config/src/attributes.ts`.

## 3. Classes — o que adotamos

**Adotado: classe = pacote de efeitos sobre atributos.** No OpenRpg, um
`ClassTemplate` é uma lista de `StaticEffect{EffectType, Potency}` (ex. Fighter
= STR+2, CON+2, Dano+5, Def+5, HP+30). Aqui, a classe declara os 6 atributos e
o `growth` é derivado — trocar a fantasia de uma classe é editar 6 números.

| Nossa classe | Corpo | Base OpenRpg | Perfil |
|---|---|---|---|
| Guardião | `characters/hero` | Fighter ("Super tough, hits things") | FOR 26 / CON 28 — tanque físico |
| Arqueiro | `characters/archer` | — (velocidade/DEX) | FOR 24 / DES 24 — canhão de vidro físico, crítico e IAS (ADR-021) |
| Arcanista | `characters/mage` | Mage ("Powerful magic users") | INT 28 / SAB 20 — vidro mágico |
| Invocador Sombrio | `characters/necromancer` | — (DoT/sustain) | INT 24 / SAB 18 — sustain |

**Fórmulas de derivação** (`growthFromAttributes`, citadas do Fantasy):

| Stat | Fórmula | Fonte no OpenRpg |
|---|---|---|
| `hp` | `40 + CON×5` | `FantasyVitalsStatPopulator` (MaxHealth = base + CON×5) |
| `attack` | `FOR×1,0 + DES×0,3` (ADR-021; era 0,8/0,2) | `FantasyMeleeStatPopulator` (STR/100 ≈ maçada, DEX/100 ≈ perfurante) |
| `specialAttack` | `INT×1,2 + SAB×0,3` | vitals (MaxMana = base + INT×5) invertido para dano |
| `defense` | `2 + CON×0,8` | melee defense com modificador de CON |
| `specialDefense` | `2 + SAB×0,9` | atributo mágico defensivo |
| `critChance` | `0,02 + DES×0,004` | `CriticalDamageChance` do attack generator |
| `attackSpeed` | `max(0, (DES−10)×0,02)` | identidade de velocidade (DEX) |
| `speed` | `6 + DES×0,5` | `MovementSpeed` |
| linhas `perLevel` | 11–14% do base | ritmo compatível com a curva de XP (⛔ P-009) |

## 4. Skills — o que adotamos

**Adotado: o MODELO do `AbilityTemplate`** — dano com tipo+potência, tipo de
alvo (single/multi+contagem), custo (mana), cooldown e gating por classe
(`Requirement{ClassRequirement}`). Conteúdo adaptado do roster de 10 abilities
(Slash, Power Strike, Chi Blast, Focus Strike, Backstab, Poison Blade, Fire
Bolt, Ice Storm, Cure, Cura).

O nosso modelo (`docs/SKILL_SYSTEM.md`) já tinha o formato; o que o OpenRpg
traz são **dados de base** (potências, custos, formatos). Mapeamento:

| Nossa skill | Classe | Base OpenRpg | Formato |
|---|---|---|---|
| `skill_counter` (Contra-ataque) | Guardião | Power Strike | single, coef 1,35, cd 6s, custo 8 |
| `passive_bulwark` | Guardião | StaticEffect (Def+5) | +15% defesa |
| `passive_riposte` | Guardião | — | 20% de revidar (0,6×) |
| `skill_volley` (Volta de Flechas) | Arqueiro | Slash | all_enemies, 2 golpes, cd 8s, custo 4 |
| `passive_ricochet` | Arqueiro | — | 25% de segundo golpe (0,4×) |
| `passive_momentum` | Arqueiro | — | IAS empilhável |
| `skill_nova` (Nova Arcana) | Arcanista | Ice Storm | all_enemies, coef 1,0, cd 10s, custo 15 |
| `passive_arcane_surge` | Arcanista | — | amplificação empilhável |
| `passive_manaskin` | Arcanista | — | absorção mágica |
| `skill_hex` (Malefício) | Invocador | Poison Blade | single, coef 1,15 + veneno, cd 7s, custo 6 |
| `passive_venom` | Invocador | — | DoT em golpes |
| `passive_drain` | Invocador | — | lifesteal 30% |

⚠️ **Mana:** o OpenRpg tem `ManaCost` e `MaxMana`; nossos contratos **ainda não
têm MP**. O campo `manaCost` existe no catálogo como dado pronto (§7 daqui a
pouco) — implementar MP é decisão futura, não envenena a Fase 6.

## 5. Itens — o que adotamos

| Conceito OpenRpg | Nosso sistema | Status |
|---|---|---|
| `IItemTemplate` × `IItem` (blueprint × instância) | `EQUIP_TEMPLATES` × `Equipment` gerado com stats | ✅ já alinhado |
| `QualityType` (Junk→Common→Uncommon→Rare→Epic→Legendary→Mythical) | `Rarity` (Common→Uncommon→Rare→Epic→Legendary→Celestial) | ✅ mapeado (abaixo) |
| `Value` (valor de venda do template) | valor derivado do statTotal (§78) | divergência — §8 |
| `ModificationAllowance` + `ItemModificationTemplate` (gemas, encantos, runas) | **X por atributo** (§36) + afixos futuros | ✅ conceito adotado; ver `EQUIPMENT_SYSTEM.md` |
| Tags (`WeaponTag`, `HeavyTag`, `FireTag`…) | `WeaponType` (9 tipos, §35) | parcial — tags livres são futuras |
| `FantasyEquipmentSlotTypes` (11 slots) | nossos 10 slots | mapeado — §8 |

**Escada de qualidade ↔ raridade:**

| OpenRpg | Nós | Chance (⛔ fixada pelo usuário) | Multiplicador |
|---|---|---|---|
| Junk | — (não existe) | — | — |
| Common | Common | 50% | 1,0 |
| Uncommon | Uncommon | 30% | 1,2 |
| Rare | Rare | 15% | 1,5 |
| Epic | Epic | 4% | 2,0 |
| Legendary | Legendary | 0,9% | 2,5 |
| Mythical | Celestial | 0,1% | 3,0 |

As chances são **regra do Master-Prompt/usuário** (§33) — o OpenRpg não define
probabilidade nenhuma; só a escala de qualidade.

**Slots:**

| OpenRpg | Nós |
|---|---|
| MainHand / OffHand | `weapon` |
| UpperBody | `chest` |
| Head | `head` |
| LowerBody | `legs` |
| Foot | `boots` |
| Wrist | `glove` |
| Neck | `amulet` |
| Ring1 / Ring2 | (futuro) |
| Back | `wings` / `aura` (identidade idle) |
| — | `pet` (identidade idle) |

## 6. Balanceamento — o que adotamos

| Princípio OpenRpg | Nosso uso |
|---|---|
| Variação de dano ±5% (`FantasyAttackGenerator.DamageVariance = 0.05`) | **Referência para a Fase 6** — o engine hoje não tem variância; adotar na implementação do combate |
| Crítico = chance × multiplicador (`CriticalDamageChance/Multiplier`) | ✅ já temos (critCap 0,75 e multiplicador 1,5 no engine) |
| Defesa flat por tipo (`DefaultAttackProcessor` subtrai) | **Não adotado** — mantemos a fórmula atual do engine; defesa flat impede power creep de %, mas muda o meta inteiro (§8) |
| Loot: rolagem independente por entrada (`DropRate` ≥ roll) + `IsUnique` | ✅ adotado como modelo de loot table (Fase 9) |
| Curvas (`PresetCurves`: linear, quadrática, logística, logit, normal, seno, step) | ✅ referência para ⛔ P-009/P-005 — nossa curva `floor(100·n^1,5)` é polinomial da mesma família |
| `ScalingFunction` (entrada normalizada → curva → saída desnormalizada) | ✅ padrão para o que gerarmos de curva (slots, Torre, offline) |

## 7. Outras coisas que casam (e ficam prontas)

- **Requirements** (`Requirement` acoplado a qualquer coisa): nossas skills já
  são gated por `classId`; o modelo de requisito genérico (nível, item, quest)
  fica documentado para Fase 6+.
- **Effects como `StaticEffect{type, potency}`**: nossos buffs/passivas do
  catálogo usam a mesma semântica (efeito nomeado + potência).
- **Locale por id** (`NameLocaleId`): nossos nomes estão inline por enquanto
  (PT-BR único); se i18n entrar, o modelo é esse.

## 8. O que NÃO adotamos (e por quê)

| Item OpenRpg | Decisão | Motivo |
|---|---|---|
| Raças (`RaceTemplate`) | ❌ | Master-Prompt não tem raça; inventar seria §62 |
| MP/Mana funcional | ⏳ | Contratos sem MP; campo `manaCost` fica pronto, sistema é decisão futura |
| Defesa flat por tipo | ❌ | Muda o meta do engine testado; manter fórmula atual (engine/`formula.ts`) |
| Dano por 10 tipos (Slashing/Fire/Dark…) | ❌ | Nosso engine é `physical × magic` (§18); tipos detalhados são futuros |
| Qualidade "Junk" | ❌ | Nossa baseline é 95% sem equipamento (§32); junk não tem lugar |
| Quests, Cards, AdviceEngine, TradeSkills, Ships/Scifi | ❌ | Fora do MVP e do gênero |
| Odds de raridade do demo | ❌ | Chance fixada pelo usuário (50/30/15/4/0,9/0,1) |
| Valor de venda fixo do template | ❌ | Nosso valor deriva do statTotal (§78) — regra do Master-Prompt |

## 9. Impacto nas pendências

| Pendência | Efeito |
|---|---|
| `P-002` (identidade dos 4 heróis) | Atributos-base e skills ganharam **base citável** (Fighter/Mage + roster de abilities). Continua PENDENTE para nome definitivo, raridades e curvas finais |
| `P-022` (progressão de skills) | Roster de skills agora é dado (`skills.ts`); a PROGRESSÃO (upgrade/árvore) continua PENDENTE |
| `P-009` (curvas de XP) | Família de curva referenciada (polinomial do `PresetCurves`) |
| `P-001/P-025` (slots e templates) | Mapeamento de slots e estrutura template×instância documentados |
| `P-010` (equipamento) | Modelo de modificação (gemas/encantos ↔ X) documentado para a Fase 9 |

## 10. Atribuição

OpenRpg é MIT © grofit e contribuidores — [github.com/openrpg/OpenRpg](https://github.com/openrpg/OpenRpg).
Usamos ideias, fórmulas e dados de exemplo como **base de referência**; não
distribuímos código deles. Fórmulas adaptadas à escala do nosso jogo e
registradas em `packages/config/src/attributes.ts` e `docs/OPENRPG_REFERENCE.md`.
