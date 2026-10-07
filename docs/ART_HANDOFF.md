# ART_HANDOFF — como continuar a fase de arte sem o histórico da conversa

**Escrito em:** 2026-10-04 (após o Lote 5, ADR-040) · **Atualizado em:** 2026-10-05 (após o Lote 6, ADR-042 — reverificado na branch `arena/01a106b8-project-tower`) · **Para quem:** um agente (ou pessoa) que abre o repositório do zero.
**Leia antes:** [`../AI_STATE.md`](../AI_STATE.md) → este arquivo → [`STYLIZATION_ROADMAP.md`](STYLIZATION_ROADMAP.md) (planejamento) → [`ART_PIPELINE.md`](ART_PIPELINE.md) (especificação técnica).
**Para ver a arte:** `docs/art-review/lote-NN/*.png` (capturas e contact sheets de cada lote) e `assets/generated/` (os atlas finais). **Olhe as imagens antes de gerar qualquer coisa nova** — o estilo é mantido por referência visual, não por descrição.

> Objetivo desta fase ("otimização e estilização"): cada andar com arena própria, 5 inimigos por andar (papéis T/D/V/M/E), 5 heróis por classe (≥ 25), retratos do Rei, botões GBA e tela de login — **tudo com a MESMA arte do jogo**. Depois da arte vêm a Fase 14 (Painel Admin) e a Fase Online.

---

## 1. Regras do usuário (valem sempre — não negocie sem pedir)

1. **Máximo de 10 chamadas de `generate_image` por lote (= sessão).** Conta TUDO: falhas, refações, folhas descartadas. Planeje 8 itens + 2 de reserva.
2. Ao chegar em 10 (ou fechar o lote): **PARE**. Explique o que foi gerado, **aplique no jogo**, liste o próximo passo e **espere o usuário escrever "lote NN aprovado"** antes de gerar qualquer coisa do lote seguinte. Mesmo que ele diga só "prossiga", confira se o lote anterior foi aprovado; se a mensagem já traz "lote NN aprovado, siga para o lote NN+1", pode começar.
3. **Fundo magenta sólido `#FF00FF`** em toda geração que precisa de transparência. **Poses/movimentação idênticas às do jogo**: 5 animações × 4 quadros (idle, walk, attack, hurt, death) — o atlas-guia garante isso.
4. **Mesma arte do jogo**: pixel art de fantasia sombria (veja §3). Nunca mudar de estilo, nunca texto na arte (rótulos são HTML em PT-BR), nunca efeitos inventados (brilho, fogo, aura) nos sprites.
5. **Autosuficiência do repo**: tudo que o jogo usa fica commitado em `marmitero/project-tower` com licença preservada (crédito "Assets by Nika Studio"). Nada depende de outro repositório.
6. **Instrução padrão ao fim de CADA etapa** (palavras do usuário): *"Prossiga com a próxima etapa. se possível, tome as decisões necessárias e relate-as para mim no final, sempre com arquitetura editável caso precisamos fazer alguma alteração posteriormente. ao final, diga qual o próximo passo, faça commit e push e estipule uma quantidade de etapas até o primeiro mvp jogável."* ⇒ o relato final de um lote traz: **o que foi gerado** (acertos, reprovações, refações), **decisões tomadas e por quê**, **verificação no jogo** (capturas), **ressalvas**, **próximo passo**, **estimativa de etapas restantes**, e como testar. Escrito em **PT-BR**, sem jargão desnecessário.
7. **Autoridade delegada**: o usuário disse "você decide" para decisões de design/balanceamento; decida, registre em ADR (`docs/DECISIONS_LOG.md`), deixe tudo em config editável e relate. Só pare para decisão crítica de gameplay/economia sem regra no `Master-Prompt.md` (que prevalece sobre tudo), credencial ou ação externa.
8. **Painel Admin (Fase 14) vem DEPOIS da arte.** Tudo que criar deve ser dado serializável e validável (config), para o painel editar sem código.
9. Branch da sessão fixa (`arena/01a106b8-project-tower`); commit e push só nela. O usuário testa no Windows 10 baixando o zip da branch e abrindo `JOGAR.bat`; skins do Rei de nível ≥ 15 e heróis específicos só aparecem com `npm run play:debug` (Debug Mode).

---

## 2. Onde estamos (fim do Lote 6)

| Lote | Entregue | Gerações | ADR | Status |
|---|---|---:|---|---|
| F0 | pipeline (`scripts/art.mjs`, `tools/art/*`), formato `ita-atlas-v1`, docs | 0 | 032/033 | ✅ |
| L1 | Borin, Duende de Faíscas, arena f01, kit de botões GBA, ícones, login (fundo + logo), 4 retratos do Rei, refação da Kaia | 9 | 034/035 | ✅ aprovado |
| L2 | 8 retratos do Rei (12 skins), arenas f02–f04, Goblin Capitão, Sapo-Lodo, Rato | 9 | 036 | ✅ aprovado |
| L3 | 8 inimigos (andares 2–4) | 8 | 037 | ✅ aprovado |
| L4 | Andar 4 completo, **Clérigo** (5ª classe, engine de cura, 5 identidades, 4 retratos) | 8 | 038/039 | ✅ aprovado |
| L5 | 7 heróis novos + Ossian liberado → **18 heróis**; 8 skills assinatura | 10 | 040 | ✅ aprovado (2026-10-04) |
| L6 | **Arcanista 5/5 e Invocador 5/5** + Arqueiro Nômade → **26 heróis**; 8 skills assinatura; 4 retratos próprios | 10 | 042 | ✅ aprovado (2026-10-06) |
| L7 | **16 retratos (26/26 heróis com retrato próprio)** + arena f05_ecos + 3 inimigos andar 5 (Sentinela, Duelista, Espectro) | 8 | 043 | ✅ aprovado |
| L8 | **Andares 5 e 6 completos (6 inimigos novos)** + arenas `f06_fornalha` e `f07_jardim` | 10 | 044 | ✅ aprovado |
| L9 | **Andar 7 completo (4 novos) + arena `f08_sombras` + 3 novos andar 8** | 9 | 045 | ✅ aprovado |
| L10 | **Andares 8 e 9 completos (5 novos) + arena `f09_sangrento` + 1 novo andar 10** | 7 | 047 | ✅ aprovado |
| L11 | **Andar 10 completo (3 novos) + arena `f10_passos` (Câmara dos Mil Passos) — ONDA 1 CONCLUÍDA** | 4 | 048 | ⏳ **aguarda "lote 11 aprovado"** |

**Próximo: Onda 2 (Chefes da Arena e Heróis jogáveis)** — só depois do "lote 11 aprovado".

> **Atualização Lote 11 (2026-10-07):** Lote 10 aprovado; Lote 11 entregue com 4/10 gerações (6 reservas restantes). 3 novos atlas de inimigos (`eternal_warrior`, `living_clock`, `steps_oracle`) + 1 kit de arena 4×4 (`f10_passos`, Câmara dos Mil Passos). Todos os 10 primeiros andares agora possuem 100% de arenas geradas dedicadas e 5/5 inimigos temáticos próprios (50 inimigos no total no roster vivo). Meta da Onda 1 de arte 100% batida! `npm run check` verde — **783 testes + 28 de arquitetura**, preview atualizado com bundle de 834 requisições HTTP 200.

Metas numéricas (Onda 1): 25 heróis (**26 — meta batida no L6, 100% com retrato no L7**) · 12 retratos do Rei (**feito**) · 10 arenas (**10/10 completas: f01 a f10**) · 50 inimigos nos andares 1–10 (**50/50 completos no roster**) · UI GBA + login (**feito**). ONDA 1 100% CONCLUÍDA.

Pendências de retrato: **0** — todos os 26 heróis agora possuem retrato próprio dedicado no jogo.

---

## 3. O estilo de arte (leia as imagens, depois estes números)

- **Pixel art de fantasia sombria**, contorno escuro de 1 "pixel de arte" (≈ 3 px), sombreado em 3–4 tons, luz do **alto-esquerda**, brilho especular nos metais. Vista **top-down 3/4**, cabeça grande (≈ 1/4–1/3 do corpo), personagem **voltado à DIREITA**. Cada criatura: 1 cor dominante + 1 de acento; sprite sempre mais claro/saturado que o piso.
- **Escala:** quadro de 256 px; altura do idle: humanoide 176–192, baixo/amorfo 105–125, voador 125–140, elite 190–207, chefe 150–200. Pés ancorados em (128, 243). Margem ≥ 4 px.
- **Atlas `ita-atlas-v1`:** 1024×1280, 4 colunas × 5 linhas (idle, walk, attack, hurt, death), 4 quadros por linha; PNG de paleta (≤ 64 cores no arquivo final; o validador mede "cores significativas" antes disso: ≤ 700 ok, ≤ 1050 revisar).
- **Arena:** kit de 16 ladrilhos 128×128 (4 paredes + tocha + estandarte + portão + parede-extra, 4 pisos, 4 adereços baixos). Piso: luminância 0,10–0,55; ladrilhos emendam em X; nada alto sobre a pista de luta.
- **Retratos:** bustos de RPG clássico (rosto, ombros, objeto-assinatura), 2×2 por folha sobre magenta; saem em 512 e 256 (`_s`, HUD).
- **Heróis e inimigos NÃO podem parecer de outro jogo**: compare sempre com `docs/art-review/` e com o pack (`assets/sprites/characters/*`).
- Detalhes medidos: [`ART_PIPELINE.md`](ART_PIPELINE.md) §1–§3 e `tools/art/spec.mjs` (fonte única dos números).

---

## 4. Preparar o ambiente (o sandbox é reciclado entre sessões — isto acontece sempre)

```bash
cd /home/user/project-tower
git status && git log --oneline -3          # se o HEAD estiver em "Master-prompt", o sandbox resetou:
git fetch origin arena/01a106b8-project-tower && git reset --hard origin/arena/01a106b8-project-tower
npm install
node scripts/serve-preview.mjs              # preview na porta 5173 (use start_process); conferir com curl
npm run art:refs                            # recria guias + referências de estilo em assets/_incoming/refs/ (gitignored)
node scripts/art.mjs provenance status      # quantas gerações cada lote já usou
```

`assets/_incoming/` (brutos e referências) e `assets/_review/` (contact sheets) **não são versionados** — por isso o `art:refs`. Nunca grave rascunho em `assets/generated/` (vai ao manifesto).

**Navegador para capturas (fora do repo, descartável):**

```bash
mkdir -p /tmp/br /tmp/al && cd /tmp/br && npm init -y && npm i puppeteer-core @sparticuz/chromium
cd /tmp/al && node -e "const z=require('zlib'),fs=require('fs');fs.writeFileSync('a.tar',z.brotliDecompressSync(fs.readFileSync('/tmp/br/node_modules/@sparticuz/chromium/bin/al2023.tar.br')))" && tar xf a.tar
# rodar: LD_LIBRARY_PATH=/tmp/al/lib node meu-script.mjs   (puppeteer-core com `executablePath` do @sparticuz/chromium e args + "--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader", headless "shell")
```

Fluxo que funciona no jogo de debug (`npm run build:debug -w @tia/game-web` e `PORT=5180 node scripts/play.mjs --debug --no-open`): criar o Rei (`input` + botões "Escolher campeão", "Convocar"), depois "Equipe" → "Slot 1" → "Tornar ativo" → "Torre" → "Fechar" (isso faz o botão `.tia-debug__toggle` aparecer); abrir o painel e usar **Nível do herói**, **Ir ao andar**, **Criar herói** com **Classe + Identidade** (seleciona a arte própria), depois "Heróis" → "Slot 1" do card novo → "Tornar ativo" → "Fechar". Esconda o painel com `addStyleTag(".tia-debug{display:none!important}")` antes das capturas. `window.__tiaBattle.snapshot()` informa lutadores, arena e se há sprite. **Antes de `npm run check`: apague `apps/game-web/preview-debug/`** e nunca use `pkill -f` com padrão que case o próprio shell.

---

## 5. Receitas de geração (o que funcionou — copie)

Sempre `generate_image` com **imagens de referência** (guia magenta da pose + 1 imagem de estilo já aprovada). Salve em `assets/_incoming/<lote>/`. **Peça uma folha por personagem, em paralelo.** **Não pré-redimensione** o que o gerador devolver: o `ingest` faz *reflow* de folhas quadradas.

### 5.1 Herói ou inimigo (atlas 4×5)

1. Guia: `assets/_incoming/refs/guide_<arquétipo>.magenta.png` (humanoide guerreiro → `hero`; à distância → `archer`; conjurador → `mage`; invocador → `necromancer`; elite grande → `orc`; baixo/amorfo → `slime`; voador → `bat`; esquelético → `skeleton`). O guia define a pose de CADA quadro.
2. Estilo: um atlas aprovado parecido (`style_guardian_borin`, `style_ranger_kaia`, `style_cleric_aurora`, `style_goblin_captain`, `style_mud_toad`, `style_spark_imp`…).
3. Prompt (inglês). **Ordem das imagens: 1ª = guia, 2ª = estilo.** Modelo validado:

```text
IMPORTANT: output a TALL PORTRAIT image (4:5 aspect ratio, taller than wide, like 1024x1280).
Pixel art character sprite sheet with EXACTLY 4 columns and EXACTLY 5 rows (20 frames, 4 frames per row,
NOT 6 or 8 columns) on a SOLID flat magenta (#FF00FF) background. Copy the FIRST reference image's grid exactly:
row 1 = idle (4 frames), row 2 = walk, row 3 = attack (keep the guide's thin white arc), row 4 = hurt,
row 5 = dead lying on the ground. Same silhouette size, placement and facing direction as the guide.
The SAME character (same face, same hat/helmet) in EVERY frame including hurt and dead.
Match the pixel-art style, outline weight, shading and pixel scale of the SECOND reference image.
NEW CHARACTER: "<nome>", <descrição: papel, cores dominantes, arma, 1–2 detalhes marcantes>.
ABSOLUTELY NO special effects, glow, fire, flames, aura or particles anywhere — only the guide's thin white
slash arc in the attack row. No text, no grid lines, no floor shadows.
Do NOT use magenta or pink anywhere inside the character.
```

- Troque a arma do guia conforme o herói ("punhos no lugar da espada", "besta no lugar do arco").
- Inimigo: acrescente a função ("elite", "tank"…) e `Do NOT use magenta or pink inside the creature`.
- **Falhas conhecidas e remédio:** (a) folha **16:9 com 8×4 ou 6×4 quadros** → reprovar e refazer com a frase "TALL PORTRAIT 4:5, EXACTLY 4 columns and 5 rows"; (b) **efeitos inventados** (raios, halos) → reforçar o "ABSOLUTELY NO special effects"; (c) quadros hurt/dead com **outro personagem** → "same character in EVERY frame"; (d) fundo **rosa-claro** (ex. 253,142,252) → o `ingest` já normaliza (`normalizeKeyColour`) e avisa; (e) quadrúpede/inseto contra guia bípede reprova em movimento/IoU mesmo estando certo → decidir por inspeção visual.

### 5.2 Kit de arena (grade 4×4, 1 geração por andar)

Referência: `assets/_incoming/refs/kit_f0X_*.png` do andar mais parecido (a ordem dos 16 ladrilhos é `KIT_LAYOUT` em `tools/art/kit.mjs`: linha 1 = 4 paredes; linha 2 = tocha, estandarte, portão, parede extra; linha 3 = 4 pisos; linha 4 = 4 adereços baixos sobre magenta). Descreva o bioma do andar (roadmap §3.1), a paleta e os adereços; peça "tileable horizontally", "floor tiles dark and low-contrast so sprites stand out", "props small and low, on solid magenta". Depois: `node scripts/art.mjs kit <folha> --id f05_xxx --seamless [--floor-gain 0.78]` (use `--floor-gain` se o piso vier claro demais).

### 5.3 Retratos (folha 2×2)

Referência: `assets/_incoming/refs/king_ref.png` (ou um retrato de herói). 4 bustos descritos um a um, fundo magenta, enquadramento de busto igual ao do Rei. `node scripts/art.mjs portraits <folha> --ids a,b,c,d --dir portraits/heroes` (heróis) ou `--dir portraits/king` (Rei). Depois ligue `assets.portrait` na identidade (`heroes.ts`) — hoje **9 dos 26** heróis têm retrato próprio e 17 ainda usam o da classe (a fila está no §9, Lote 7).

---

## 6. Fluxo de um lote, passo a passo

```text
1  ler o roadmap §9 e a seção "Próximo lote" deste arquivo; conferir o roster atual (§7)
2  npm run art:refs  → gerar (≤ 10) em paralelo, salvando em assets/_incoming/L<N>/
3  node scripts/art.mjs ingest <bruto> --id heroes/<id>|enemies/<id> --kind humanoid|low|flyer|elite|boss [--guide <arquétipo>]
        → lê o veredito (ok / revisar / REFAZER) e abre assets/_review/<id>.contact.png; olhe as imagens!
4  node scripts/art.mjs provenance add --batch L<N> --asset <id> --kind atlas --verdict "..." --refs "..." --prompt "..."
        (registre TAMBÉM as reprovadas; commite cedo — o sandbox pode resetar)
5  ligar no config (§8), `node scripts/build-assets.mjs` (manifesto) e testes
6  balancear com `npm run report:balance` (inimigos) e os testes de balanço/elenco
7  capturas no navegador (§4) → docs/art-review/lote-0N/; `npm run build:preview`; `node scripts/art.mjs provenance render`
8  docs: ADR novo em DECISIONS_LOG, roadmap §9 (as-built), AI_STATE, este arquivo (§2 e §9)
9  rm -rf apps/game-web/preview-debug && npm run check   (tudo verde)
10 commit + push na branch; relato final ao usuário; PARAR e esperar "lote NN aprovado"
```

---

## 7. O que existe hoje (conferir sempre no config — a verdade está em `packages/config/src/*`)

### 7.1 Heróis — 26 (`HERO_ROSTER` em `heroes.ts`)

| id | classe | nome | skill assinatura | atlas | retrato |
|---|---|---|---|---|---|
| `hero_aldric` | guardian | Aldric (inicial) | `skill_counter` | corpo da classe (pack) | classe |
| `hero_borin` | guardian | Borin, Escudeiro da Muralha | `skill_counter` | `heroes/guardian_borin` | classe |
| `hero_cavaleiro_rubro` | guardian | Cavaleiro Rubro | `skill_crimson_charge` | `heroes/guardian_rubro` | classe |
| `hero_monge_ferro` | guardian | Mestre Hakon, Monge de Ferro | `skill_iron_fist` | `heroes/guardian_monk` | classe |
| `hero_lorde_cinzento` | guardian | Lorde Valdemar, o Cinzento | `skill_grey_cleave` | `heroes/guardian_lord` | classe |
| `hero_kaia` | ranger | Kaia (inicial) | `skill_volley` | `heroes/ranger_kaia` | classe |
| `hero_cacador_furtivo` | ranger | Rik, Caçador Furtivo | `skill_backstab` | `heroes/ranger_stalker` | classe |
| `hero_besteiro_pesado` | ranger | Brutus, Besteiro Pesado | `skill_focus_strike` | `heroes/ranger_crossbow` | classe |
| `hero_guardia_floresta` | ranger | Elora, Guardiã da Floresta | `skill_hawk_strike` | `heroes/ranger_warden` | classe |
| `hero_ossian` | ranger | Ossian, Arqueiro Sem Sono | `skill_sleepless_string` | corpo da classe (arqueiro esquelético do pack) | `portraits/skeleton` |
| `hero_maelis` | arcanist | Maelis (inicial) | `skill_nova` | corpo da classe | classe |
| `hero_piromante_cinder` | arcanist | Cinder, Piromante | `skill_fire_bolt` | `heroes/arcanist_pyro` | classe |
| `hero_criomante` | arcanist | Sylas, o Criomante | `skill_ice_storm` | `heroes/arcanist_cryomancer` | `…/hero_criomante` |
| `hero_tempestuario` | arcanist | Zephyr, o Tempestuário | `skill_chain_lightning` | `heroes/arcanist_stormcaller` | `…/hero_tempestuario` |
| `hero_mago_anciao` | arcanist | Ordanis, o Mago Ancião | `skill_arcane_lance` | `heroes/arcanist_elder` | `…/hero_mago_anciao` |
| `hero_vorath` | shadowcaller | Vorath (inicial) | `skill_hex` | corpo da classe | `portraits/heroes/hero_vorath` |
| `hero_necromante_ossos` | shadowcaller | Vasko, o Necromante dos Ossos | `skill_bone_volley` | `heroes/shadowcaller_bones` | classe (retrato no L7) |
| `hero_bruxa_pantano` | shadowcaller | Morcha, a Bruxa do Pântano | `skill_poison_blade` | `heroes/shadowcaller_witch` | classe (retrato no L7) |
| `hero_ceifeira` | shadowcaller | Sylvara, a Ceifeira | `skill_soul_reap` | `heroes/shadowcaller_reaper` | classe (retrato no L7) |
| `hero_demonologo` | shadowcaller | Baalor, o Demonólogo | `skill_demon_pact` | `heroes/shadowcaller_demon` | classe (retrato no L7) |
| `hero_aurora` | cleric | Aurora, Sacerdotisa | `skill_cure` | `heroes/cleric_aurora` | `portraits/heroes/hero_sacerdotisa` |
| `hero_tobias` | cleric | Irmão Tobias, Monge Curandeiro | `skill_restoring_palm` | `heroes/cleric_monk` | `…/hero_monge_curandeiro` |
| `hero_bispo_gaspar` | cleric | Gaspar, Bispo Guerreiro | `skill_smite` | `heroes/cleric_bishop` | `…/hero_bispo` |
| `hero_druida_yara` | cleric | Yara, Druida da Vida | `skill_bloom` | `heroes/cleric_druid` | `…/hero_druida` |
| `hero_oraculo_nyra` | cleric | Nyra, Oráculo | `skill_prophecy` | `heroes/cleric_oracle` | classe (retrato no L7) |
| `hero_arqueiro_nomade` | ranger | Amir, o Arqueiro Nômade (6º arqueiro) | `skill_nomad_shot` | `heroes/ranger_nomad` | classe (retrato no L7) |

**Meta da Onda 1 cumprida no L6 (26 ≥ 25)** — não falta nenhum herói. Cada classe fechou: Guardião 5 · Arqueiro **6** (o Nômade é o extra) · Arcanista 5 · Invocador 5 · Clérigo 5.

**Fila de retratos (L7):** faltam retrato próprio para **14 heróis** — Borin, Cavaleiro Rubro, Mestre Hakon, Lorde Valdemar (Guardião) · Rik, Brutus, Elora, Amir (Arqueiro) · Cinder (Arcanista) · Vasko, Morcha, Sylvara, Baalor (Invocador) · Nyra, o Oráculo (Clérigo) — cabem em **4 folhas de 2×2 = 16 bustos** (os 2 lugares livres ficam de reserva para refação dentro do lote).

**Ainda sem atlas próprio (corpo da classe):** Aldric, Maelis, Vorath (iniciais, arte do pack) e Ossian (arqueiro esquelético do pack) — decisão de arte pendente; hoje são 4 de 26.

### 7.2 Inimigos — 25 no roster (`enemies.ts`), pools por andar em `DEFAULT_POOL_PLAN` (`tower.ts`)

Atlas próprios (andares 1–4): andar 1 Gosma, Goblin, Morcego (pack) + Duende de Faíscas, Goblin Capitão · andar 2 Sapo-Lodo, Rato, Enguia, Morcego Tóxico (pack), Troll do Esgoto · andar 3 Golem de Ossos, Esqueleto (pack), Cão de Ossos, Crânio Necrovela, Cavaleiro de Ossos · andar 4 Estátua Guardiã, Orc (pack), Escaravelho, Sacerdote Mumificado, Múmia Real. **Os andares 1–4 têm os 5 papéis (T, D, V, M, E).** Do 5 em diante os inimigos ainda são os do pack (legado).
Alvos de balanceamento (% da vida do Rei por luta, `npm run report:balance`): tanque ≈ 38 · dano ≈ 35 · veloz ≈ 22 · mago ≈ 20–27 · **elite ≈ 58–62** (Capitão 62, Troll 58, Cavaleiro 57, Múmia 60). Elites com CON alta e multiplicador ≥ 1,2 estouram (75–85 %) — comece em ≈ 1,1.

### 7.3 Arenas — 4 (`arenas.ts`; andar → kit em `themeForFloor`, `tower.ts`): `f01_entrada`, `f02_porao`, `f03_ossadas`, `f04_catacumbas`. Andares 5+ ainda usam os temas antigos ("gelo e sombra" etc.).

### 7.4 Rei: 12 retratos (`game.ts`, liberados por nível do Rei). UI GBA e login: prontos (ver ADR-034).

---

## 8. Onde mexer para cada tipo de conteúdo (e o que a CI exige)

**Herói novo** — `packages/config/src/heroes.ts` (entrada em `EXTRA_HEROES`: id, classe, nome, epíteto, lore, 3 traços, voz, `signatureSkillId`, estilo, `statPriority`, `acquisition`, `assets.atlas`, `attributeDelta`) + skill em `skills.ts`.
- `attributeDelta`: **soma zero** (convenção dos 18 atuais) e **poder (hp × (def+defesa esp) × (atq+atq esp)) dentro de ±8 %** do modelo da classe (teste `hero-acquisition.test.ts`, vale para todo o `HERO_ROSTER`). Calcule antes de gravar: o poder é multiplicativo e sensível a CON; **Carisma não entra em nenhuma fórmula** e serve de contrapeso. Use um script `vite-node --config vitest.config.ts` com `growthForHero`/`heroStatsAtLevel` (de `packages/game-core/src/creation.ts`).
- Skill: dano com `coefficient × hitCount / cooldown` dentro de **±15 %** do DPS da skill da classe para Guardião e Arqueiro; **Arcanista ≤ 1,35×** a Nova em 1×1 (teste `roster-l5.test.ts`, que hoje não cobre Clérigo/Invocador — mantenha a mesma régua por bom senso); `damageType: magic` só em classe mágica; cura usa `heal` (ADR-038). **Uma skill assinatura por herói, única.** Nenhum par da mesma classe repete (atributos, skill).
- Atualize os testes de contagem: `roster-l5.test.ts` (progresso por classe e total), `skills.test.ts` (nº de skills/ativas), `assets-config.test.ts` se mexer em Ossian/reservados.
- Aquisição: `pickAcquiredIdentity` é uniforme entre as identidades da classe (corrigido no L5); heróis só chegam por Market/caixas/summons/Chefes/eventos (§10/§12 do Master-Prompt).

**Inimigo novo** — `enemies.ts` (seed com `role`, `damageType`, `statMultiplier`, `attributes`, `assets.atlas: "enemies/<id>"`, e `sheets` legado como *fallback*) + `DEFAULT_POOL_PLAN` em `tower.ts` (pesos; elite raro: ≤ 12 % do peso por andar) + `tower-content.test.ts` (contagens) + balanceamento (§7.2).

**Arena nova** — `node scripts/art.mjs kit …` grava `assets/generated/arenas/<id>/`; registre a `ArenaKitDef` em `arenas.ts` (listas `wall/floor/props` repetem ids para dar peso) e o andar em `themeForFloor` (`tower.ts`).

**Retrato** — `art.mjs portraits` + `assets.portrait` na identidade.

Depois de qualquer asset: `node scripts/build-assets.mjs` (regenera `apps/game-web/public/assets/manifest.json` — **commitar**), `npm run build:preview` (commitar `apps/game-web/preview/`; o `check` reprova bundle velho), `node scripts/art.mjs provenance render`.

---

## 9. Próximo lote e o restante da fila (ajuste pelo roadmap §9, que é a fonte do plano)

**Lote 11 (entregue, aguarda "lote 11 aprovado"):** arena 10 (`f10_passos`, Câmara dos Mil Passos) + 3 inimigos do andar 10 (`eternal_warrior`, `living_clock`, `steps_oracle`) = **4 gerações usadas, 6 reservas restantes** ⇒ **Onda 1 100% COMPLETA**.
**Próximo lote (Onda 2, após "lote 11 aprovado"):** Chefes da Arena (8 chefes com sprites próprios gigantes/imponentes) e Heróis jogáveis com evolução visual (5 classes).
**Depois da arte:** Fase 14 — Painel Admin (`docs/ADMIN_PANEL.md`) e Fase Online (Google Auth, Supabase, Mercado da comunidade).
**Estimativa atual:** ~4 lotes de arte (L8–L11) + Fase 14 ⇒ ~5 etapas até a Onda 1 completa (o MVP *local* já é jogável desde a Fase 13).

## 10. Armadilhas (cada uma já custou tempo)

- **Estado do repo diverge da memória**: sempre `git log`/`git status`; o sandbox reseta e pode voltar ao commit "Master-prompt". Recupere com o `reset --hard origin/<branch>` (§4) e **commite/pushe cedo** durante o lote.
- `read_file` de imagem **cacheia por caminho** — salve com nome novo para reinspecionar; e não rode `read_file` na imagem em paralelo com o `bash` que a cria.
- `generate_image` devolve tamanho próprio (às vezes 1024×1024 ou 16:9): **não** pré-redimensione; o `ingest` faz reflow quando há exatamente 5 linhas e recusa quando não há.
- Registre a geração no `provenance.json` **mesmo se reprovada** (o contador recusa a 11ª; a contagem real do lote é o que importa).
- Testes de config comparam `h.assets?.atlas`; a soma bruta de atributos engana (use o poder multiplicativo); adicionar uma classe quebra suposições de "4 classes" (use `STARTER_HERO_CLASSES` para "iniciais").
- Cura: a perda de HP medida é **líquida**; sustain forte esconde o custo de vida e quebra os testes de balanço (ADR-038: o Clérigo precisa ser modesto).
- Variáveis CSS com `url()` relativo resolvem contra a folha de estilo (use URL absoluta); `serve-preview.mjs` com EADDRINUSE na 5173 não é erro (confirme com `curl`); `import "sharp"` só resolve de scripts dentro do repo (`scripts/_x.mjs`, apague depois).
- `JOGAR.bat` só ASCII + CRLF; não usar `file://`. Mexeu em `apps/game-web/src` ou `packages/*/src` ⇒ `npm run build:preview` + commitar o bundle.
- UI sem jargão interno (`§N`, `P-xxx`, ADR) — o smoke de UI reprova.
