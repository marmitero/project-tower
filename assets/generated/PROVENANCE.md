# Procedência da arte gerada

Gerado por `npm run art:provenance -- render` a partir de `provenance.json` — **não editar à mão**.
Regra: no máximo **10 gerações de imagem por lote** (1 lote = 1 sessão).

## Lote L1 — 9/10 gerações

| # | Asset | Tipo | Veredito | Referências | Prompt |
|---|---|---|---|---|---|
| 1 | `heroes/guardian_borin` | atlas | — | — | Borin Escudeiro da Muralha, guia hero magenta + estilo orc idle |
| 2 | `enemies/spark_imp` | atlas | — | — | Duende de Faíscas (andar 1, M), guia mage magenta + estilo goblin |
| 3 | `arenas/f01_entrada` | arena | — | — | Kit de arena do andar 1 (Entrada da Torre), grade 4x4 |
| 4 | `ui/gba/buttons` | ui | — | — | Kit de botões GBA índigo/prata, 4x4, sem texto |
| 5 | `ui/gba/icons` | ui | — | — | 16 ícones de aba/ação estilo GBA, 4x4 |
| 6 | `login/background` | login | — | — | Fundo da tela de login: a Torre ao entardecer, 16:9 sem texto |
| 7 | `login/logo` | login | — | — | Logotipo IDLE TOWER ADVENTURE, pixel art sobre magenta |
| 8 | `portraits/king/lote-a` | portrait | — | — | Retratos do Rei A: Real, Guerreiro, Rainha, Sábio (2x2) |
| 9 | `heroes/ranger_kaia` | atlas | — | — | Refação da Kaia (arqueira de capa verde, igual ao retrato): guia archer magenta + retrato + estilo Borin; folha veio qua |

## Lote L2 — 9/10 gerações

| # | Asset | Tipo | Veredito | Referências | Prompt |
|---|---|---|---|---|---|
| 1 | `portraits/king/lote-b` | portrait | aprovado | king_ref | Retratos do Rei B: Sombrio, do Gelo, Sol, Caçador (2x2, magenta) |
| 2 | `portraits/king/lote-c` | portrait | aprovado | king_ref | Retratos do Rei C: Arcano, Rubro, Esmeralda, Ancião (2x2, magenta) |
| 3 | `arenas/f02_porao` | arena | aprovado | f01_ref | Kit de arena do andar 2 (Porão Alagado): lanterna verde, correntes, grade de esgoto; 4x4 |
| 4 | `arenas/f03_ossadas` | arena | aprovado (--floor-gain 0.78) | f01_ref | Kit de arena do andar 3 (Salão das Ossadas): candelabro, nicho de crânios; piso claro demais, ingerido com floorGain 0.7 |
| 5 | `arenas/f04_catacumbas` | arena | aprovado | f01_ref | Kit de arena do andar 4 (Catacumbas): sarcófagos, tocha roxa, tapeçaria com olho; piso muito escuro |
| 6 | `enemies/goblin_captain` | atlas | reprovado (raio/halo inventado) | guide_orc, spark_imp | Goblin Capitão (elite, andar 1), guia orc magenta — 1ª versão |
| 7 | `enemies/mud_toad` | atlas | aprovado | guide_slime, spark_imp | Sapo-Lodo Gigante (tank, andar 2), guia slime magenta |
| 8 | `enemies/sewer_rat` | atlas | aprovado | guide_goblin, spark_imp | Rato de Esgoto Bruto (dps, andar 2), guia goblin magenta |
| 9 | `enemies/goblin_captain` | atlas | aprovado | guide_orc, spark_imp | Refação do Goblin Capitão com 'NO special effects' (só o arco fino do guia) |

## Lote L3 — 8/10 gerações

| # | Asset | Tipo | Veredito | Referências | Prompt |
|---|---|---|---|---|---|
| 1 | `enemies/sewer_eel` | atlas | aprovado | guide_slime, mud_toad | Enguia Rastejante (veloz, andar 2), guia slime magenta |
| 2 | `enemies/sewer_troll` | atlas | aprovado | guide_orc, goblin_captain | Troll do Esgoto (elite, andar 2), guia orc magenta, cinza-azulado com musgo e cano enferrujado |
| 3 | `enemies/bone_golem` | atlas | aprovado | guide_orc, goblin_captain | Golem de Ossos (tanque, andar 3), guia orc magenta |
| 4 | `enemies/bone_hound` | atlas | aprovado visual (métrica REFAZER: quadrúpede x guia bípede) | guide_goblin, mud_toad | Cão de Ossos (veloz, andar 3), guia goblin magenta |
| 5 | `enemies/candle_skull` | atlas | aprovado | guide_bat, spark_imp | Crânio Necrovela (mago, andar 3), guia morcego magenta |
| 6 | `enemies/bone_knight` | atlas | aprovado | guide_orc, goblin_captain | Cavaleiro de Ossos (elite, andar 3), guia orc magenta |
| 7 | `enemies/guardian_statue` | atlas | aprovado | guide_orc, goblin_captain | Estátua Guardiã (tanque, andar 4), guia orc magenta |
| 8 | `enemies/tomb_scarab` | atlas | aprovado visual (métrica REFAZER: paleta 1221 e silhueta; o pack final tem 64 cores) | guide_slime, mud_toad | Escaravelho de Tumba (veloz, andar 4), guia slime magenta |

## Lote L4 — 8/10 gerações

| # | Asset | Tipo | Veredito | Referências | Prompt |
|---|---|---|---|---|---|
| 1 | `heroes/cleric_aurora` | atlas | aprovado (reconstruído do commit WIP) | guide_mage | Sacerdotisa da Aurora (Clérigo), guia magenta de mago, capuz branco e dourado, maça |
| 2 | `heroes/cleric_monk` | atlas | aprovado (reconstruído do commit WIP) | guide_goblin | Monge Curandeiro (Clérigo), túnica laranja e contas, punhos enfaixados |
| 3 | `heroes/cleric_bishop` | atlas | aprovado (reconstruído do commit WIP) | guide_orc | Bispo Guerreiro (Clérigo), mitra, armadura e maça pesada |
| 4 | `heroes/cleric_druid` | atlas | aprovado (reconstruído do commit WIP) | guide_mage | Druida da Vida (Clérigo), coroa de galhos, capa verde, cajado com broto |
| 5 | `heroes/cleric_oracle` | atlas | aprovado (reconstruído do commit WIP) | guide_mage | Oráculo (Clérigo), cabelo prateado, venda lunar, manto violeta |
| 6 | `enemies/mummy_priest` | atlas | aprovado (reconstruído do commit WIP) | guide_mage, candle_skull | Sacerdote Mumificado (mago, andar 4), faixas, toucado azul e cajado |
| 7 | `enemies/royal_mummy` | atlas | aprovado (reconstruído do commit WIP) | guide_orc, goblin_captain | Múmia Real (elite, andar 4), faraó com foice e faixa vermelha |
| 8 | `portraits/heroes/clerigos` | portrait | aprovado (reconstruído do commit WIP) | king_ref | Retratos dos 4 clérigos (2x2, magenta): sacerdotisa, monge, bispo, druida |

## Lote L5 — 10/10 gerações

| # | Asset | Tipo | Veredito | Referências | Prompt |
|---|---|---|---|---|---|
| 1 | `heroes/guardian_rubro` | atlas | aprovado | guide_hero, borin | Cavaleiro Rubro (Guardião 3), armadura carmesim, elmo com pluma, guia hero magenta |
| 2 | `heroes/guardian_monk` | atlas | aprovado | guide_hero, borin | Monge de Ferro (Guardião 4), monge careca de punhos de ferro, soco no lugar da espada |
| 3 | `heroes/guardian_lord` | atlas | aprovado | guide_hero, borin | Lorde Cinzento (Guardião 5), cavaleiro negro de elmo com chifres, capa cinza |
| 4 | `heroes/ranger_stalker` | atlas | aprovado visual (IoU idle 0,43: capuz e adagas) | guide_archer, kaia | Caçador Furtivo (Arqueiro 2), capuz e máscara, duas adagas |
| 5 | `heroes/ranger_crossbow` | atlas | reprovado (folha 8x4 em 16:9 — layout errado) | guide_archer, kaia | Besteiro Pesado (Arqueiro 3), 1ª versão |
| 6 | `heroes/ranger_warden` | atlas | aprovado | guide_archer, kaia | Guardiã da Floresta (Arqueiro 4), ruiva com falcão no ombro |
| 7 | `heroes/ranger_nomad` | atlas | reprovado (folha 6x4 em 16:9; refazer no L6) | guide_archer, kaia | Arqueiro Nômade (Arqueiro 5), turbante e arco curvo — 1ª versão |
| 8 | `heroes/arcanist_pyro` | atlas | reprovado (folha 6x4; hurt/dead com outro personagem) | guide_mage, aurora | Piromante (Arcanista 2), 1ª versão |
| 9 | `heroes/ranger_crossbow` | atlas | aprovado com ressalva (fundo rosa-claro 253,142,252 tratado por normalizeKeyColour; hurt segura arco) | guide_archer, kaia | Besteiro Pesado — refação com 'tall portrait 4:5, exactly 4 columns' |
| 10 | `heroes/arcanist_pyro` | atlas | aprovado | guide_mage, aurora | Piromante — refação com 'tall portrait 4:5, exactly 4 columns, same character in every frame' |

## Lote L6 — 10/10 gerações

| # | Asset | Tipo | Veredito | Referências | Prompt |
|---|---|---|---|---|---|
| 1 | `heroes/arcanist_cryomancer` | atlas | ok | guide_mage.magenta, style_arcanist_pyro | Criomante (Arcanista 3): mago de manto azul-gelo, capuz branco, cristal de gelo no cajado. Guia mage magenta + estilo do |
| 2 | `heroes/arcanist_stormcaller` | atlas | ok | guide_mage.magenta, style_arcanist_pyro | Tempestuário (Arcanista 4): mago jovem de cabelo escuro, túnica violeta com friso dourado, cajado com orbe. Guia mage ma |
| 3 | `heroes/arcanist_elder` | atlas | ok | guide_mage.magenta, style_arcanist_pyro | Mago Ancião (Arcanista 5): mago idoso de barba longa, chapéu pontudo roxo, manto magenta e dourado. Guia mage magenta +  |
| 4 | `heroes/shadowcaller_bones` | atlas | refeito | guide_necromancer.magenta, style_candle_skull | Necromante dos Ossos (Invocador 2): necromante encapuzado com bastão de caveira. 2ª versão depois da reprovação (a 1ª ti |
| 5 | `heroes/shadowcaller_witch` | atlas | ok | guide_necromancer.magenta, style_candle_skull | Bruxa do Pântano (Invocador 3): bruxa de chapéu verde-musgo, cabelo ruivo, frascos no cinto. Guia necromancer magenta +  |
| 6 | `heroes/shadowcaller_reaper` | atlas | ok | guide_necromancer.magenta, style_royal_mummy | Ceifeira (Invocador 4): ceifadora encapuzada de negro com foice grande. Guia necromancer magenta + estilo da Múmia Real. |
| 7 | `heroes/shadowcaller_demon` | atlas | ok | guide_necromancer.magenta, style_royal_mummy | Demonólogo (Invocador 5): mago de manto carmesim com chifres, cajado de crânio. Guia necromancer magenta + estilo da Múm |
| 8 | `heroes/ranger_nomad` | atlas | ok | guide_archer.magenta, style_ranger_kaia | Arqueiro Nômade (refação do Lote 5): arqueiro de turbante e colete, arco curvo. Guia archer magenta + estilo da Kaia; fo |
| 9 | `portraits/heroes (Criomante, Tempestuário, Mago Ancião, Vorath)` | portrait | ok | king_ref | Folha 2x2 de retratos de busto sobre magenta: Criomante (capuz azul-gelo), Tempestuário (jovem de violeta), Mago Ancião  |
| 10 | `heroes/shadowcaller_bones#refacao` | atlas | reprovada (hurt/death fora do guia) -> refeita | guide_necromancer.magenta | 1ª tentativa do Necromante dos Ossos: quadros hurt/death não seguiam o guia (personagem diferente) — descartada e refeit |

## Lote L7 — 8/10 gerações

| # | Asset | Tipo | Veredito | Referências | Prompt |
|---|---|---|---|---|---|
| 1 | `portraits/heroes (Borin, Cavaleiro Rubro, Mestre Hakon, Lorde Valdemar)` | portrait | aprovado | king_ref | Folha 2x2 de retratos de busto sobre magenta: Borin (escudeiro leal), Cavaleiro Rubro (elmo e plumas rubras), Mestre Hak |
| 2 | `portraits/heroes (Rik, Brutus, Elora, Amir)` | portrait | aprovado | king_ref | Folha 2x2 de retratos de busto sobre magenta: Rik (caçador furtivo mascarado), Brutus (besteiro veterano de couro tachad |
| 3 | `portraits/heroes (Cinder, Vasko, Morcha, Sylvara)` | portrait | aprovado | king_ref | Folha 2x2 de retratos de busto sobre magenta: Cinder (piromante com capuz vermelho e brasas nos olhos), Vasko (necromant |
| 4 | `portraits/heroes (Baalor, Nyra, Aldric, Maelis)` | portrait | aprovado | king_ref | Folha 2x2 de retratos de busto sobre magenta: Baalor (demonólogo com chifres e runas), Nyra (oráculo de venda estrelada  |
| 5 | `arenas/f05_ecos` | arena | aprovado (floorGain 2.4) | kit_f04_catacumbas | Kit de arena 4x4 do andar 5 (Salão dos Ecos): paredes azul-marinho com cristais ciano, tocha de cristal, estandarte azul |
| 6 | `enemies/crystal_sentry` | atlas | aprovado (IoU e cinemática 100% ok) | guide_orc.magenta, style_mud_toad | Sentinela de Cristal (tanque do andar 5): golem ancestral de quartzo azul e placas de pedra com núcleo de energia ciano  |
| 7 | `enemies/ghost_duelist` | atlas | aprovado (paleta 346 cores, âncora 0px) | guide_skeleton.magenta, style_royal_mummy | Duelista Fantasma (dano do andar 5): espectro nobre esguio de gibão azul e chapéu de pluma, empunhando florete espectral |
| 8 | `enemies/whispering_wraith` | atlas | aprovado (voador 133px na faixa 125-140px) | guide_bat.magenta, style_spark_imp | Espectro Sussurrante (veloz/voador do andar 5): aparição flutuante em farrapos etéreos azul-frio com olhos brilhantes e  |

## Lote L8 — 10/10 gerações

| # | Asset | Tipo | Veredito | Referências | Prompt |
|---|---|---|---|---|---|
| 1 | `enemies/echo_singer` | atlas | aprovado (paleta 300 cores, âncora 0px) | guide_mage.magenta, style_spark_imp | Cantor de Ecos (mago do andar 5): mago arcano em vestes azul-índigo com bordados prateados e cajado ressonante de crista |
| 2 | `enemies/void_maestro` | atlas | aprovado (elite 184px, âncora 0px) | guide_orc.magenta, style_royal_mummy | Maestro do Vazio (elite do andar 5): maestro de casaca azul-veludo e máscara com monóculo de cristal, empunhando batuta  |
| 3 | `arenas/f06_fornalha#falha` | arena | reprovado (gerador devolveu 16:9 em 1376x768 em vez de quadrado 4x4) -> refeito | kit_f01_entrada | Kit de arena do andar 6 (Fornalha Esquecida): tentativa 1 em formato retangular, descartada. |
| 4 | `arenas/f06_fornalha` | arena | aprovado (quadrado 1024x1024, floorGain 1.2) | kit_f01_entrada | Kit de arena 4x4 do andar 6 (Fornalha Esquecida): paredes de basalto e placas de ferro com fendas de lava, braseiro de f |
| 5 | `enemies/slag_golem` | atlas | aprovado (paleta 521 cores, âncora 0px) | guide_orc.magenta, style_mud_toad | Golem de Escória (tanque do andar 6): golem de rocha vulcânica negra resfriada com fendas de magma laranja brilhante e p |
| 6 | `enemies/possessed_smith` | atlas | aprovado (100% verde, IoU 0.82) | guide_hero.magenta, style_guardian_borin | Ferreiro Possuído (dano do andar 6): ferreiro demoníaco com pele de fuligem e avental de couro, empunhando martelo de fo |
| 7 | `enemies/swift_salamander#falha` | atlas | reprovado (falha de API gemini: sem imagem gerada) -> refeito | guide_goblin.magenta, style_spark_imp | Salamandra Veloz (veloz do andar 6): tentativa 1 interrompida por erro temporário na API. |
| 8 | `enemies/swift_salamander` | atlas | aprovado (100% verde cinemática e IoU) | guide_goblin.magenta, style_spark_imp | Salamandra Veloz (veloz do andar 6): lagarto bípede das chamas com escamas rubro-alaranjadas empunhando adagas de obsidi |
| 9 | `enemies/forge_master` | atlas | aprovado (paleta 337 cores, âncora 0px) | guide_orc.magenta, style_goblin_captain | Mestre da Forja (elite do andar 6): guerreiro colossal em armadura de placas de ferro negro com elmo de fornalha e marre |
| 10 | `arenas/f07_jardim` | arena | aprovado (quadrado 1024x1024, floorGain 1.8) | kit_f01_entrada | Kit de arena 4x4 do andar 7 (Jardim Gélido): santuário congelado com geada azul e estalactites, tocha gélida, estandarte |

## Lote L9 — 9/10 gerações

| # | Asset | Tipo | Veredito | Referências | Prompt |
|---|---|---|---|---|---|
| 1 | `enemies/frost_bear` | atlas | aprovado (100% verde, âncora 0px, idle 199px) | guide_orc.magenta, style_goblin_captain | Urso Glacial (dano do andar 7): urso polar bípede guerreiro em armadura nórdica com runas gélidas empunhando machado pes |
| 2 | `enemies/boreal_fox` | atlas | aprovado (100% verde, âncora 0px, idle 184px) | guide_goblin.magenta, style_spark_imp | Raposa Boreal (veloz do andar 7): ladina raposa ártica com pelagem branca espessa empunhando adagas curvas de gelo. Guia |
| 3 | `enemies/frost_witch` | atlas | aprovado (revisão visual paleta 770 cores, âncora 0px, idle 184px) | guide_mage.magenta, style_spark_imp | Feiticeira da Geada (mago do andar 7): feiticeira com vestes gélidas azul-celeste e capuz com bordas de pelo branco segu |
| 4 | `enemies/winter_knight` | atlas | aprovado (100% verde, âncora 0px, idle 199px) | guide_orc.magenta, style_royal_mummy | Cavaleiro do Inverno (elite do andar 7): colossal cavaleiro da morte congelado em armadura de placas com elmo de chifres |
| 5 | `arenas/f08_sombras` | arena | aprovado (quadrado 1024x1024, 16 ladrilhos, luminância 0.12-0.16 ok) | kit_f01_entrada | Kit de arena 4x4 do andar 8 (Ninho das Sombras): paredes de caverna negra cobertas de teias com olhos violetas nas fenda |
| 6 | `enemies/giant_cocoon` | atlas | aprovado (revisão visual silhueta casulo, 172 cores, âncora 0px) | guide_orc.magenta, style_mud_toad | Casulo Gigante (tanque do andar 8): casulo aracnídeo quitinoso defensivo com carapaça negra de obsidiana e patas espinho |
| 7 | `enemies/blackfang_spider` | atlas | aprovado (revisão visual ataque 13%, 662 cores, âncora 0px) | guide_orc.magenta, style_mud_toad | Aranha Presas-Negras (dano do andar 8): guerreiro aracnídeo ereto monstruoso com múltiplos olhos vermelhos, presas venen |
| 8 | `enemies/shadow_crawler#falha` | atlas | reprovado (resíduo de chroma 0.915% por névoa violeta próxima de magenta) -> refeito | guide_goblin.magenta, style_spark_imp | Sombra Rastejante (veloz do andar 8): tentativa 1 com névoa violeta que causou resíduo de chroma key. |
| 9 | `enemies/shadow_crawler` | atlas | aprovado (100% verde, 0.000% rosa, 342 cores, âncora 0px) | guide_goblin.magenta, style_spark_imp | Sombra Rastejante (veloz do andar 8): espectro ágil em fumaça negra de carvão e olhos ciano-gélidos, empunhando adagas d |

## Lote L10 — 7/10 gerações

| # | Asset | Tipo | Veredito | Referências | Prompt |
|---|---|---|---|---|---|
| 1 | `enemies/nightmare_weaver` | atlas | aprovado (paleta 446 cores, âncora 0px, idle 184px) | guide_mage.magenta,  style_spark_imp | Tecelã de Pesadelos (mago do andar 8): bruxa aracnídea ancestral tecendo fios de escuridão e runas violetas, empunhando  |
| 2 | `arenas/f09_sangrento` | arena | aprovado (quadrado 1024x1024, 16 ladrilhos, 0 magenta, luminância 0.21-0.22 ok) | kit_f01_entrada | Kit de arena 4x4 do andar 9 (Corredor Sangrento): paredes de fortaleza de pedra cinza-escura com tapeçarias rubras e cor |
| 3 | `enemies/armored_executioner` | atlas | aprovado (100% verde cinemática e IoU, 421 cores, âncora 0px, idle 199px) | guide_orc.magenta,  style_mud_toad | Carrasco Encouraçado (tanque do andar 9): executor colossal em armadura de placas de ferro pesado enferrujado, capuz neg |
| 4 | `enemies/winged_leech` | atlas | aprovado (voador 133px na faixa 125-140px, 362 cores, âncora 0px) | guide_bat.magenta,  style_spark_imp | Sanguessuga Alada (veloz/voador do andar 9): criatura vampiresca alada aberrante com carapaça segmentada carmesim, bico  |
| 5 | `enemies/blood_witch` | atlas | aprovado (100% verde cinemática e IoU, 480 cores, âncora 0px, idle 184px) | guide_mage.magenta,  style_spark_imp | Bruxa de Sangue (mago do andar 9): feiticeira sombria em vestes rasgadas de seda carmesim e capuz pontiagudo, levitando  |
| 6 | `enemies/crimson_count` | atlas | aprovado (100% verde cinemática e IoU, 573 cores, âncora 0px, idle 199px) | guide_orc.magenta,  style_royal_mummy | Conde Carmesim (elite do andar 9): nobre vampiro em casaca carmesim de gola alta, capa negra com forro rubro, empunhando |
| 7 | `enemies/obsidian_colossus` | atlas | aprovado (revisão visual silhueta monolito, 419 cores, âncora 0px, idle 199px) | guide_orc.magenta,  style_candle_skull | Colosso de Obsidiana (tanque do andar 10): monólito ancestral de pedra vulcânica negra polida com runas douradas cravada |

## Lote L11 — 4/10 gerações

| # | Asset | Tipo | Veredito | Referências | Prompt |
|---|---|---|---|---|---|
| 1 | `arenas/f10_passos` | arena-kit | aprovado (16 ladrilhos fatiados, emenda parede 0.8/1.0, piso 0.6/0.8, luminância 0.11-0.13, 108 KB) | ref_style_obsidian_colossus, ref_arena_f09_sangrento | Câmara dos Mil Passos (arena kit do andar 10): arena cerimonial de mármore obsidiana e bronze celestial, relógios de sol |
| 2 | `enemies/eternal_warrior` | atlas | aprovado (100% verde cinemática e IoU, 0.000% chroma, âncora 0px, idle 184px, 51 cores) | guide_hero.magenta, style_obsidian_colossus | Guerreiro Eterno (dps do andar 10): guardião com armadura de placas de bronze cósmico e manto dourado esfarrapado, empun |
| 3 | `enemies/living_clock` | atlas | aprovado (revisão visual silhueta pêndulos/engrenagens, 0.000% chroma, âncora 0px, idle 184px, 52 cores) | guide_hero.magenta, style_obsidian_colossus | Relógio Vivo (swift do andar 10): autômato esguio feito de pêndulos dourados e engrenagens giratórias de bronze polido,  |
| 4 | `enemies/steps_oracle` | atlas | aprovado (revisão visual silhueta ampulheta/manto, 0.000% chroma, âncora 0px, idle 184px, 51 cores) | guide_hero.magenta, style_obsidian_colossus | Oráculo dos Passos (caster do andar 10): sábio ancestral envolto em túnica de seda branca com bordados dourados de ampul |

## Lote L12 — 6/10 gerações

| # | Asset | Tipo | Veredito | Referências | Prompt |
|---|---|---|---|---|---|
| 1 | `arenas/p01_arcano` | arena-kit | aprovado (16 ladrilhos fatiados, 0 magenta, emenda parede 0.9/1.1 ok, emenda piso 0.8/1.0 ok, luminância 0.11-0.19, 72 KB) | ref_arena_f01_entrada, ref_arena_f10_passos | Pináculo Arcano (arena kit dos andares 11-15, revisado para perfeita emenda contínua): alvenaria de pedra índigo com cri |
| 2 | `enemies/crystal_golem` | atlas | aprovado (199px, âncora 0px, 0.000% chroma, 516 cores, margem 4px livre, revisão visual aprovada) | guide_orc.magenta, style_mud_toad | Golem de Cristal Arcano (tanque dos andares 11-15, revisado sem efeitos de ataque): construto de pedra índigo e cristais |
| 3 | `enemies/rune_blade` | atlas | aprovado (184px, âncora 0px, 0.001% chroma, 604 cores, margem 4px livre, IoU idle 0.61, walk 0.59, death 0.56) | guide_hero.magenta, style_guardian_borin | Espadachim Rúnico (dano dos andares 11-15, revisado sem arcos de corte ou partes duplicadas): guerreiro em armadura de a |
| 4 | `enemies/arcane_wisp` | atlas | aprovado (115px, âncora 0px, 0.000% chroma, 550 cores, margem 4px livre, IoU idle 0.55, walk 0.57, attack 0.54) | guide_slime.magenta, style_spark_imp | Fogo-Fátuo Arcano (veloz dos andares 11-15, revisado como monstro puro): esfera de mana índigo com olho ciano e tentácul |
| 5 | `enemies/astral_sorcerer` | atlas | aprovado (184px, âncora 0px, 0.000% chroma, margem 4px livre, IoU idle 0.63, walk 0.62, attack 0.48) | guide_mage.magenta, style_spark_imp | Feiticeiro Astral (mago dos andares 11-15, revisado sem raios mágicos ou cortes de cajado): mago em mantos índigo com ca |
| 6 | `enemies/rift_stalker` | atlas | aprovado (115px, âncora 0px, 0.000% chroma, 513 cores, margem 4px livre, IoU idle 0.61, walk 0.57, attack 0.53, death 0.54) | guide_slime.magenta, style_royal_mummy | Rastreador da Fenda (elite dos andares 11-15, revisado quadrúpede compacto sem cortes): fera arcana de quitina índigo co |

## Lote L13 — 6/10 gerações

| # | Asset | Tipo | Veredito | Referências | Prompt |
|---|---|---|---|---|---|
| 1 | `arenas/p02_carmesim` | arena | aprovado (emenda parede 0.0, emenda piso 0.0, luma 0.18-0.19 ok, 83 KB) | kit_f09_sangrento, kit_f01_entrada | Kit de arena do Pináculo Carmesim (andares 16-20, Bioma 2 da Onda 2): alvenaria de pedra escura manchada de carmesim, co |
| 2 | `enemies/blood_gargoyle` | atlas | aprovado (199px, âncora 0px, 0.000% chroma, 126 cores, margem 4px livre, revisão visual aprovada) | guide_boss.magenta, style_guardian_borin | Gárgula de Sangue (tanque dos andares 16-20): gárgula colossal esculpida em obsidiana carmesim com chifres grossos e asa |
| 3 | `enemies/crimson_slayer` | atlas | aprovado (184px, âncora 0px, 0.001% chroma, 314 cores, margem 4px livre, silhueta idle 0.58, walk 0.62, hurt 0.47) | guide_hero.magenta, style_guardian_borin | Retalhador Carmesim (dano dos andares 16-20): guerreiro de execução gótica em cota de malha negra e carmesim com lâmina  |
| 4 | `enemies/flesh_hound` | atlas | aprovado (115px, âncora 0px, 0.000% chroma, 419 cores, margem 4px livre, silhueta idle 0.55, attack 0.49, death 0.55) | guide_slime.magenta, style_mud_toad | Cão de Carne (veloz dos andares 16-20): fera quadrúpede carmesim com espigões ósseos nas costas e mandíbulas caninas afi |
| 5 | `enemies/blood_cultist` | atlas | aprovado (184px, âncora 0px, 0.001% chroma, 321 cores, margem 4px livre, silhueta idle 0.57, walk 0.57, hurt 0.51, death 0.50) | guide_mage.magenta, style_candle_skull | Cultista do Sangue (mago dos andares 16-20): taumaturgo em mantos cerimoniais bordô e negro com cajado encimado por crân |
| 6 | `enemies/sanguine_abomination` | atlas | aprovado (199px, âncora 0px, 0.001% chroma, 494 cores, margem 4px livre, revisão visual aprovada) | guide_boss.magenta, style_goblin_captain | Abominação Sanguínea (elite dos andares 16-20): monstro gigante bípede de carne crua e placas ósseas com correntes de fe |

## Lote L14 — 6/10 gerações

| # | Asset | Tipo | Veredito | Referências | Prompt |
|---|---|---|---|---|---|
| 1 | `arenas/p03_jade` | arena | aprovado (emenda parede 0.0, emenda piso 0.0, luma 0.22-0.29 ok, 86 KB) | kit_f07_jardim, kit_f01_entrada | Kit de arena do Pináculo de Jade (andares 21-25, Bioma 3 da Onda 2): alvenaria de pedra antiga com musgo, relevos de jad |
| 2 | `enemies/jade_colossus` | atlas | aprovado (199px, âncora 0px, 0.000% chroma, 359 cores, margem 4px livre, erro de idle 0.6%) | guide_boss.magenta, style_guardian_borin | Colosso de Jade (tanque dos andares 21-25): construto esculpido em blocos de jade verde escuro e pedra antiga com musgo, |
| 3 | `enemies/jade_bladesman` | atlas | aprovado (184px, âncora 0px, 0.000% chroma, 538 cores, margem 4px livre) | guide_hero.magenta, style_guardian_borin | Espadachim de Jade (dano dos andares 21-25): guerreiro oriental em armadura laqueada verde-musgo com placas de jade, emp |
| 4 | `enemies/jade_serpent` | atlas | aprovado (115px, âncora 0px, 0.000% chroma, 537 cores, margem 4px livre, silhueta idle 0.68, hurt 0.65, death 0.62) | guide_slime.magenta, style_mud_toad | Serpente de Jade (veloz dos andares 21-25): réptil colossal de escamas de jade esmeralda com presas afiadas e corpo sinu |
| 5 | `enemies/jade_geomancer` | atlas | aprovado (184px, âncora 0px, 0.001% chroma, 709 cores, margem 4px livre, silhueta idle 0.56, walk 0.61, attack 0.58, hurt 0.60, death 0.55) | guide_mage.magenta, style_cleric_aurora | Geomante de Jade (mago dos andares 21-25): eremita em mantos verde-musgo e chapéu cônico de bambu, com cajado de madeira |
| 6 | `enemies/jade_dragonkin` | atlas | aprovado (199px, âncora 0px, 0.000% chroma, 435 cores, margem 4px livre, revisão visual aprovada) | guide_boss.magenta, style_goblin_captain | Draconiano de Jade (elite dos andares 21-25): guerreiro draconiano bípede de escamas de jade esmeralda com cristas ponti |

## Lote L15 — 8/10 gerações

| # | Asset | Tipo | Veredito | Referências | Prompt |
|---|---|---|---|---|---|
| 1 | `arenas/p04_obsidiana#refacao` | arena | reprovada (proporção 16:9 em vez de 1:1 quadrado) -> refeita | kit_f06_fornalha, kit_f10_passos | 1ª tentativa do kit de arena p04_obsidiana: gerada em proporção 16:9 em vez de 1:1 quadrado |
| 2 | `arenas/p04_obsidiana` | arena | aprovado (emenda parede 0.0, emenda piso 0.0, luma 0.12-0.14 ok, 72.5 KB) | kit_p02_carmesim, kit_f01_entrada | Kit de arena do Pináculo de Obsidiana (andares 26-30, Bioma 4 da Onda 2): alvenaria de pedra de obsidiana negra com veio |
| 3 | `enemies/obsidian_dreadnought` | atlas | aprovado (199px, âncora 0px, 0.000% chroma, 421 cores, margem 4px livre, erro de idle 1.0%) | guide_boss.magenta, style_guardian_borin | Encouraçado de Obsidiana (tanque dos andares 26-30): colossal juggernaut de vidro vulcânico negro e placas de ferro cham |
| 4 | `enemies/lava_reaver` | atlas | aprovado (184px, âncora 0px, 0.001% chroma, 393 cores, margem 4px livre, IoU idle 0.58, walk 0.56, death 0.50) | guide_hero.magenta, style_guardian_borin | Retalhador de Lava (dano dos andares 26-30): berserker em armadura de ferro chamuscado com espigões de obsidiana e espad |
| 5 | `enemies/ash_stalker#refacao` | atlas | reprovada (nuvens de partículas de cinzas soltas) -> refeita | guide_slime.magenta, style_mud_toad | 1ª tentativa do Predador das Cinzas: nuvens de fumaça e cinzas desenhadas ao redor do sprite causaram 46k pixels soltos |
| 6 | `enemies/ash_stalker` | atlas | aprovado (115px, âncora 0px, 0.001% chroma, 284 cores, margem 4px livre, silhueta idle 0.55, death 0.49) | guide_slime.magenta, style_mud_toad | Predador das Cinzas (veloz dos andares 26-30): cão quadrúpede de obsidiana e cinzas vulcânicas com 4 patas ágeis, silhue |
| 7 | `enemies/magma_channeler` | atlas | aprovado (184px, âncora 0px, 0.000% chroma, 292 cores, margem 4px livre, 100% verde nos 5 movimentos e silhuetas) | guide_mage.magenta, style_arcanist_pyro | Canalizador de Magma (mago dos andares 26-30): ocultista piromante em mantos negros chamuscados e máscara de ferro com f |
| 8 | `enemies/obsidian_warlord` | atlas | aprovado (199px, âncora 0px, 0.001% chroma, 150 cores, margem 4px livre, IoU attack 0.53, death 0.50) | guide_orc.magenta, style_goblin_captain | Senhor da Obsidiana (elite dos andares 26-30): titânico senhor da guerra em armadura completa de placas de obsidiana ang |

## Lote L16 — 6/10 gerações

| # | Asset | Tipo | Veredito | Referências | Prompt |
|---|---|---|---|---|---|
| 1 | `kit_p05_celeste` | arena | — | — | A 4x4 grid of 16 pixel art arena tiles for Pináculo Celeste (white marble, gold filigree, solar motifs, 1024x1024 square |
| 2 | `celestial_sentinel` | enemy | — | — | Sprite sheet in 16-bit dark fantasy pixel art of Celestial Sentinel (white marble, gold armor, solar tower shield) |
| 3 | `radiant_bladesman` | enemy | — | — | Sprite sheet in 16-bit dark fantasy pixel art of Radiant Bladesman (agile holy warrior, gold plate, solar longsword) |
| 4 | `dawn_stalker` | enemy | — | — | Sprite sheet in 16-bit dark fantasy pixel art of Dawn Stalker (swift quadruped celestial beast, white and gold fur) |
| 5 | `solar_hierophant` | enemy | — | — | Sprite sheet in 16-bit dark fantasy pixel art of Solar Hierophant (sun priest, white liturgical robes, golden sun staff) |
| 6 | `celestial_archon` | enemy | — | — | Sprite sheet in 16-bit dark fantasy pixel art of Celestial Archon (winged holy champion, heavy gold armor, greatsword) |

