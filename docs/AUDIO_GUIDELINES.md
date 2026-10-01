# Diretrizes de Áudio

**Versão:** 0.1 · **Data:** 2026-09-30 · **Estado:** esboço — a ser detalhado na FASE de Polish
**Fonte:** §15, §25, §60, §102, §104 do `Master-Prompt.md`

---

## 1. Status

> ⚠️ Este é o documento de áudio **menos maduro** do conjunto, por um motivo objetivo: **o `Master-Prompt.md` define áudio uma única vez**, na FASE de Polish ("áudio"), e o §61 não encontrou nenhum asset de áudio na inspeção.

Nenhuma trilha, nenhum SFX e nenhum design sonoro existe no repositório de referência. Este documento define a **estrutura e as regras** para que a produção de áudio não vire decisão ad-hoc na FASE de Polish.

---

## 2. Função do áudio

O áudio não é decoração. Ele é um dos **três canais de feedback** do combate (junto com visual e número), e o §60 exige feedback inequívoco.

| Momento | Áudio faz |
|---|---|
| Golpe conecta | **Confirmar** que houve impacto |
| **Crítico** | **Distinguir** de um golpe normal — sem depender de cor ou tamanho |
| Dano mágico | **Distinguir** de físico (identidade de build, §25) |
| Skill | Som único e reconhecível por skill |
| Morte | Encerramento claro |
| Level up | **Recompensa** — o momento mais positivo |
| Loot raro | **Anticipação** — o §108 depende disso |
| Procurando | **Preencher os ~3s** (§28) |
| Menu | Navegação, confirmação, erro |

> **O caso crítico é o crítico.** Um jogador daltônico, em tela pequena, com efeitos reduzidos, ainda precisa distinguir um crítico. O **som** é o canal que sobrevive.

---

## 3. Inventário de sounds

```text
assets/audio/
├── sfx/
│   ├── combat/
│   │   ├── hit_physical_01..03.wav
│   │   ├── hit_magic_01..03.wav
│   │   ├── critical_01..02.wav
│   │   ├── miss.wav
│   │   ├── death_hero.wav
│   │   ├── death_enemy.wav
│   │   ├── skill_<id>.wav
│   │   ├── status_apply.wav
│   │   ├── buff.wav
│   │   ├── debuff.wav
│   │   ├── heal.wav
│   │   ├── shield.wav
│   │   ├── levelup.wav
│   │   ├── victory.wav
│   │   ├── defeat.wav
│   │   └── searching.wav
│   ├── loot/
│   │   ├── drop_common.wav
│   │   ├── drop_rare.wav
│   │   ├── drop_epic.wav
│   │   ├── drop_legendary.wav
│   │   └── drop_celestial.wav
│   ├── ui/
│   │   ├── click.wav  hover.wav  back.wav
│   │   ├── equip.wav  unequip.wav
│   │   ├── sell.wav   confirm.wav  error.wav
│   │   └── coin.wav
│   └── boss/
│       ├── boss_roar.wav
│       ├── boss_phase.wav
│       └── boss_defeat.wav
├── music/
│   ├── kingdom_theme.wav
│   ├── tower_theme.wav
│   ├── tower_low_intensity.wav
│   ├── boss_theme.wav
│   ├── market_theme.wav
│   └── victory_fanfare.wav
└── ambience/
    ├── dungeon_ambience.wav
    ├── torch_crackle.wav
    └── rain_cave.wav
```

> ⚠️ A rarity ladder de som (`drop_rare` → `drop_celestial`) é **essencial** e precisa de sons progressivamente mais distintos. É o canal que faz o §108 funcionar sem olhar.

> ✅ **Status 2026-10-01 — MVP coberto por SFX gerados.** `scripts/gen-audio.mjs` produz 22 SFX procedurais (WAV mono 44,1 kHz, < 2 s, pico −1 dBTP) em `assets/generated/audio/sfx/`, com IDs `audio/sfx/*` no manifesto: `hit_01..03`, `critical`, `skill`, `miss`, `death_enemy`, `death_hero`, `victory`, `defeat`, `levelup`, `drop_common..celestial` (escada progressiva), `coin`, `click`, `back`, `error`, `searching`, `heal`. São arte final do projeto — substituíveis por pack profissional **sem mudar IDs** (a fronteira é o manifesto). Música, ambiência e SFX de boss continuam para a FASE de Polish; a estrutura de pastas acima continua sendo o alvo quando existirem.

---

## 4. Especificação técnica

| Propriedade | Valor | Motivo |
|---|---|---|
| Formato | **Ogg Vorbis** | Melhor compressão para música |
| | **Opus** | Melhor para SFX e navegador moderno |
| Fallback | **MP3** | Navegador antigo |
| Sample rate | 44.1 kHz | Padrão |
| Bitrate (SFX) | 96–128 kbps | |
| Bitrate (música) | 128–160 kbps | |
| Canais | Mono (SFX), Estéreo (música) | Posicionamento vem do pan, não do canal |
| Normalização | −16 LUFS | Loudness consistente |
| True peak | ≤ −1 dBTP | Evita clipping |
| Comprimento (SFX) | < 2 s | |

> **SFX em mono com pan 3D.** O §60 exige que o jogador entenda *quem* atacou *quem*; isso vem do pan, não do número de canais.

---

## 5. Mixagem

```
master
  ├── music        −18 dB
  ├── ambience     −24 dB
  ├── sfx          −12 dB  (pico)
  └── ui           −16 dB
```

Regras:

- **SFX tem prioridade sobre música.** Um impacto **cobre** a trilha; não compete.
- **Duck automático**: música cai 6 dB durante SFX de combate intenso.
- **Ambiência** é contínua e sutil; nunca mascara um evento.
- **Menos é mais**: 1 som por evento, não 3.

> Um idle joga o mesmo som de `hit` a cada 2 segundos por **horas**. Saturar é pior que silenciar.

---

## 6. Feedback de raridade

O §108 é o momento mais valioso do loop. A escada de som:

| Raridade | Som | Duração | Sensação |
|---|---|---|---|
| Common | clique curto | < 0,3 s | trivial |
| Uncommon | + uma nota acima | ~0,5 s | levemente melhor |
| Rare | arpejo de 3 notas | ~0,8 s | interessante |
| Epic | arpejo + brilho | ~1,2 s | notável |
| **Legendary** |fanfarra curta + reverb | ~1,8 s | **evento** |
| **Celestial** | fanfarra + coro + shimmer | ~2,5 s | **ritual** |

> Um Celestial cai a cada ~20.000 inimigos. Ele **deve** soar como um ritual — porque é.

---

## 7. Acessibilidade

| Recurso | Regra |
|---|---|
| Volume geral | 0–100% |
| Volumes separados | Música / SFX / Ambiência |
| Mudo rápido | Um toque, persistido |
| **Legendas de som** | Exibir texto para eventos críticos (§69) |
| Áudio não é informação única | Toda informação sonora tem equivalente visual |
| `prefers-reduced-motion` | Não afeta áudio, mas reduz **[SFX repetitivos]** |
| Mono | Compatível com surdez unilateral |

> **Regra dura:** nenhum som carrega informação que não tenha também um canal visual. Um jogador **surdo** precisa conseguir jogar o jogo inteiro.

---

## 8. Performance de áudio

> *"Evitar downloads gigantes"* (§94)

| Item | Regra |
|---|---|
| Áudio inicial | **Só**ambiência e 1–2 SFX de UI |
| SFX de combate | Lazy no primeiro `attack_started` |
| Música de Boss | Lazy ao abrir a Boss Arena |
| Formato | Opus (~50% menor que MP3) |
| Cache | `immutable`, mesmo política dos assets |
| Descarte | Liberar `AudioBuffer` ao sair da tela |
| Vozes simultâneas | Limite a 8 por tipo |

> Em Android, o navegador pode **suspender** o contexto de áudio em background. O jogo precisa **retomar** no primeiro gesto do usuário.

---

## 9. Licença

> **Toda fonte de áudio precisa de:** origem, licença, atribuição e registro de versão — o mesmo regime dos assets visuais ([`ART_GUIDELINES.md`](ART_GUIDELINES.md) §9).

Fontes prováveis:

| Tipo | Licença |
|---|---|
| Trilha sintetizada / gerada | Verificar termos de uso do modelo |
| Banco de SFX (Freesound, etc.) | Verificar: CC0, CC-BY, ou restritiva |
| Trilha licenciada | Contrato + atribuição |

> ⚠️ **Nenhum asset de áudio é inventado ou gerado agora.** A produção de áudio é da FASE de Polish (§102), e a escolha de fonte é uma decisão de produção que precisa de aprovação.

---

## 10. Checklist de pronto

- [ ] SFX de impacto físico e mágico **distintos**
- [ ] Crítico tem som **próprio e reconhecível**
- [ ] Som por skill, reconhecível
- [ ] Escada de som para raridade (6 níveis)
- [ ] Level up tem som **satisfatório**
- [ ] Procurando tem ambiência (preenche os ~3s, §28)
- [ ] Música de Boss distinta da Torre
- [ ] Mixagem: SFX acima de música
- [ ] Ducking automático
- [ ] Volumes separados e mudo rápido
- [ ] Toda informação sonora tem equivalente visual
- [ ] Legendas para eventos críticos
- [ ] Lazy-load de áudio pesado
- [ ] Contexto de áudio retomado no primeiro gesto
- [ ] Licença e atribuição registradas

---

## 11. Pendências

| ID | Pendência | Bloqueia |
|---|---|---|
| `P-059` | Fontes licenciadas de áudio (trilha + SFX) | FASE Polish |
| `P-060` | Composição da trilha principal | FASE Polish |
| `P-061` | Identidade sonora dos 4 heróis | FASE Polish |
| `P-062` | Trilha de Boss (uma por Boss ou uma compartilhada?) | FASE 12 |
| `P-063` | Política de ducking final | FASE Polish |

> **P-061** e **P-062** dependem de `P-002` (os 4 heróis) e `P-018` (conteúdo de Boss).

---

## 12. Referências

- [`ART_GUIDELINES.md`](ART_GUIDELINES.md) — pipeline e política de assets
- [`COMBAT_SYSTEM.md`](COMBAT_SYSTEM.md) — eventos que viram som
- [`UI_UX.md`](UI_UX.md) §6 — acessibilidade
- [`PERFORMANCE.md`](PERFORMANCE.md) §8 — orçamento de áudio
- [`ROADMAP.md`](ROADMAP.md) — FASE de Polish
