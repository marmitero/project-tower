# Sistema de Armas

**Versão:** 0.1 · **Data:** 2026-09-30 · **Estado:** especificado
**Fonte:** §37, §71, §72, §105 do `Master-Prompt.md`

---

## 1. Categorias

O §72 mantém nove categorias e proíbe inventar regras para as que não estiverem definidas:

| # | Arma | Traço mecânico | Perfil |
|---|---|---|---|
| 1 | **Espada** | Reação defensiva | Confiável, reativo |
| 2 | **Adaga** | Dano periódico (DoT) | Sustenta, acumula |
| 3 | **Machado** | Dano bruto físico | Burstpositivo |
| 4 | **Maça** | Crítico | Build de crítico |
| 5 | **Besta** | Velocidade de Ataque | Manyshots, uptime |
| 6 | **Cajado** | Ataque em área | Anti-grupo / Boss |
| 7 | **Livro Arcano** | Sifão (cura) | Sustain solo |
| 8 | **Luvas** | Controle (atordoamento) | Negar ação do inimigo |
| 9 | **Garras** | Multi-hit | Combina com crítico e DoT |

> **P-023** — a lista de nove armas está definida, mas os **traços numéricos** (chance, coeficiente, duração) **não** são pelo `Master-Prompt.md`. Os valores da tabela abaixo são **herdados do repositório de referência** como baseline técnico (ADR-001) e estão marcados como **baseline de playtest**, não como regra fechada. Precisam de validação em playtest e aprovação humana antes de virarem regra.

---

## 2. Estrutura do item de arma

O §71 exige que o equipamento seja **dado estruturado**, nunca string:

```ts
interface WeaponItem extends Equipment {
  slot: "weapon";
  weaponType: WeaponType;     // uma das 9
  traitId: string;            // traço intrínseco do tipo
  affinityOf?: ClassId;       // apenas informativo; afinidade é do herói
}
```

### 2.1 Dois efeitos que nunca se misturam

| Efeito | Origem | Escala com X? | Escala com raridade? |
|---|---|---|---|
| **Traço da arma** | Tipo de arma (Espada, Adaga…) | ❌ não | ❌ não |
| **Característica do item** | Sorteio em Lendário/Celestial | ❌ não | ❌ não |

O §72 define as armas; o §34 define que a qualidade vem de raridade + atributos + X + combinações. Os dois sistemas são **independentes e podem coexistir** no mesmo item. Uma Espada Celestial pode ter Contracorte **e** uma característica de raridade ao mesmo tempo.

Isso é uma distinção que a UI precisa comunicar com clareza — são dois campos diferentes no tooltip, nunca uma frase ambígua.

---

## 3. Traços (baseline de playtest)

> ⚠️ Baseline herdado do repositório de referência. **Não é regra fechada deste projeto.** Ver `P-023`.

| Arma | Traço | Efeito | Salvaguardas |
|---|---|---|---|
| **Espada — Contracorte** | Ao receber ataque direto de alvo único, 20% de chance de contra-atacar com 50% do Ataque | Reação física | Não recursa; não dispara por DoT; consome cooldown? não |
| **Adaga — Veneno** | 20% por ação: 3 pulsos de 10% do Ataque, 1/s | DoT físico | Não acumula, renova; pulsos não critam nem disparam procs |
| **Machado — Dano** | +15% dano físico em ataque básico e skills físicas | Multiplicativo | Não afeta mágico, cura ou DoT |
| **Maça — Crítico** | +10 p.p. de chance crítica | Aditivo | Respeita teto de 75%; multiplicador continua 1,5× |
| **Besta — Velocidade** | +20% IAS | Aditivo | Sujeito a cap; não muda initiative nem cooldown |
| **Cajado — Área** | Ataque Especial atinge todos: coef. 1,0 em alvo único, 0,70 por alvo em grupo | AoE | Mitigação e crítico por alvo; sem multiplicar procs |
| **Livro Arcano — Sifão** | Ataque básico mágico cura 10% do Ataque Especial | Cura | Uma vez por ação; limitado ao HP faltante |
| **Luvas — Atordoamento** | 15% por ação de atordoar o alvo | Controle | Não acumula; imunidade é dado de conteúdo |
| **Garras — Golpe duplo** | 2 golpes de 60% cada, cada um pode critar | Multi-hit | Conta como 1 ação; procs rolam 1 vez por ação |

### 3.1 O raciocínio por trás da Espada

Contracorte cria uma **identidade reativa** no auto-battle: recompensa continuar lutando, não é confundível com nenhuma outra arma, e brilha especialmente no **Boss** — onde a equipe inteira sofre e a Espada transforma dano recebido em retorno. O número (20% de chance, 50% do Ataque) é um ponto de partida, não um compromisso de equilíbrio.

---

## 4. Afinidade

Regra herdada da referência (ADR-001), coerente com o `Master-Prompt.md`, que não a proíbe:

- Um herói tem **uma afinidade de arma ou nenhuma**.
- Com a arma correspondente equipada: **+5% multiplicativo** no atributo ofensivo principal final.
  - Ataque → Espada, Adaga, Machado, Maça, Besta, Luvas, Garras
  - Ataque Especial → Cajado, Livro Arcano
- **Afinidade nunca bloqueia equipar.** Qualquer herói pode usar qualquer arma (§72 não define restrição, e o §105 proíbe criar complexidade sem propósito).

> **P-024** — quais heróis têm afinidade com quais armas **não pode ser definido antes de P-002**. Depende da identidade dos 4 heróis.

---

## 5. Fórmulas

O valor de uma arma segue a fórmula canônica de equipamento (§37):

```text
BASE × RARIDADE × X = VALOR FINAL
```

Detalhe em [`EQUIPMENT_SYSTEM.md` §4](EQUIPMENT_SYSTEM.md#4-fórmula-de-valor).

O **traço** entra **depois**, como modificador de dano plano e independente:

```text
DanoFinal = floor(
    PoderOfensivo
  × CoeficienteDaAção
  × 100 / (100 + DefesaAlvo)
  × ModificadoresDaArma          ← Machado +15%, Maça (crítico), etc.
)
```

O `Master-Prompt.md` é explícito (§37): *"A implementação matemática exata deve ficar centralizada. Nunca duplicar fórmulas em componentes de UI."* → Tudo em `packages/config` e `packages/engine`.

---

## 6. Armas e o 1×1

Uma consequência crítica do §17 que a referência do repositório vizinho **não tinha** (lá os encontros eram de 1–3 inimigos):

| Arma | Torre (1×1) | Boss (equipe × 1) |
|---|---|---|
| Espada | ⭐ reativa | ⭐⭐⭐ excelelente (equipe sofre junto) |
| Adaga | ⭐⭐ | ⭐⭐ |
| Machado | ⭐⭐ | ⭐⭐ |
| Maça | ⭐⭐⭐ | ⭐⭐ |
| Besta | ⭐⭐⭐ | ⭐⭐ |
| Cajado | ⭐ (1 alvo = 1.0, igual a ataque simples) | ⭐⭐⭐ área real |
| Livro Arcano | ⭐⭐⭐ | ⭐⭐ |
| Luvas | ⭐⭐ | ⭐⭐⭐ negação |
| Garras | ⭐⭐ | ⭐⭐ |

O **Cajado** é o caso mais instructive: em 1×1 o seu coeficiente é 1,0, exatamente igual ao ataque básico — ou seja, **na Torre ele não tem vantagem nenhuma** e só se justifica no Boss. Isso é uma decisão de design legítima, e significa que a UI precisa **avisar** o jogador: *"Cajado não tem vantagem na Torre; é arma de Boss."*

Sem esse aviso, o jogador equipa uma arma que parece poderosa e se pergunta por que não funciona.

---

## 7. UI de arma

Para cada arma, o tooltip mostra:

1. **Tipo** e ícone.
2. **Ataque / Ataque Especial** (valor final, já com X e raridade).
3. **Traço intrínseco** — texto, com o aviso de contexto (Torre/Boss) quando aplicável.
4. **Característica de raridade** — se Lendário/Celestial, em campo separado.
5. **Afinidade do herói** — ganho ou não, e o quanto.
6. **Comparação** com a arma atualmente equipada (mesma função, delta por atributo).

> O §38 exige que a comparação seja por **atributos, X, raridade, sinergia, build e função** — não só por nível. Uma arma de nível maior pode ser pior, e a UI precisa deixar isso visível.

---

## 8. Checklist de pronto

- [ ] 9 tipos de arma implementados
- [ ] Traço de cada uma testado isoladamente
- [ ] Traço **não** escala com X nem raridade (teste)
- [ ] Traço e característica **coexistem** sem interferir (teste)
- [ ] Afinidade +5% aplicado no atributo correto por tipo (teste)
- [ ] Nenhuma arma é **bloqueada** por falta de afinidade (teste)
- [ ] UI diferencia traço de característica
- [ ] UI avisa quando uma arma é situational (Cajado na Torre)
- [ ] Feedback visual de cada proc (veneno, stun, contracorte)
- [ ] Wrench: valores de `P-023` aprovados por humano

---

## 9. Pendências

| ID | Pendência | Bloqueia |
|---|---|---|
| `P-023` | Valores dos traços (chance, coeficiente, duração) | Fase 9 |
| `P-024` | Afinidades dos 4 heróis | Fase 9 (depende de P-002) |
| `P-025` | Quantos templates de arma por tipo no catálogo | Fase 9 |
| `P-026` | Nível de item e progressão de arma (upgrade/fusion) | Pós-MVP |
