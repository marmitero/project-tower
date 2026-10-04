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

