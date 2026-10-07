# Planejamento de Expansão de Chefes (Boss 50 a 20.000) — Etapa 13.1

**Data:** 2026-10-07 · **Status:** Proposto e Arquitetado (ADR-055) · **Referência:** OpenRpg Framework (Demos.Battler, CombatTargetTypes, Vitals)

---

## 1. Visão Geral e Escalação de Níveis

A Arena de Chefes é a atividade cooperativa de equipe (até 3 heróis atacando em conjunto contra 1 chefe colossal).
Seguindo a diretriz do usuário, a lista de chefes foi estruturada em **28 desafios únicos**, cobrindo a escada de progressão inicial (Nv 50 a 2000) e a escada estendida do endgame (Nv 3000 a 20.000):

| # | Chefe | Nível | Tipo Dano | Rei Min | Papel / Tema | Arquétipo Base |
|---|---|---|---|---|---|---|
| **1** | Rei Gosma | **50** | Físico | Nv 10 | Soberano do Porão Úmido (Ácido e Impacto) | `guide_slime` |
| **2** | Sentinela da Torre | **100** | Físico | Nv 25 | Vigia das Catacumbas (Pedra e Runas) | `guide_orc` |
| **3** | Matriarca Gélida | **150** | Mágico | Nv 40 | Mãe do Jardim Gélido (Gelo e Teia) | `guide_boss` |
| **4** | Carrasco Abissal | **200** | Físico | Nv 55 | Carrasco das Profundezas (Machado Duplo) | `guide_hero` |
| **5** | Senhor da Forja | **250** | Físico | Nv 70 | Mestre da Fornalha Esquecida (Fogo e Bigorna) | `guide_orc` |
| **6** | Rainha dos Morcegos | **500** | Mágico | Nv 100 | Senhora do Ninho das Sombras (Vampirismo e Sônico) | `guide_mage` |
| **7** | Guardião Ancestral | **750** | Físico | Nv 130 | Raiz Primordial da Torre (Tronco e Espinhos) | `guide_orc` |
| **8** | Carrasco Sangrento | **1000** | Físico | Nv 160 | Algoz do Corredor Sangrento (Corte Vampírico) | `guide_hero` |
| **9** | Lorde das Sombras | **1500** | Mágico | Nv 200 | Regente do Pináculo (Trevas e Ilusão) | `guide_mage` |
| **10** | Colosso da Torre | **2000** | Físico | Nv 250 | Guardião do Topo (Meteorito Puro) | `guide_boss` |
| **11** | Leviatã da Fenda | **3000** | Mágico | Nv 300 | Dragão Abissal do Éter (Sopro Dimensional) | `guide_boss` |
| **12** | Imperador Solar | **4000** | Mágico | Nv 350 | Soberano da Radiação Celeste (Plasma Divino) | `guide_hero` |
| **13** | Ceifador do Vazio | **5000** | Físico | Nv 400 | Espectro da Extinção (Foice Gravitacional) | `guide_mage` |
| **14** | Monólito de Cristal | **6000** | Mágico | Nv 450 | Núcleo Geométrico Vivo (Disparos Prismáticos) | `guide_orc` |
| **15** | Behemoth Infernal | **7000** | Físico | Nv 500 | Titã Vulcânico Quádruplo (Terremoto de Magma) | `guide_boss` |
| **16** | Couraceiro Astral | **8000** | Físico | Nv 550 | Fortaleza Móvel de Matéria Estelar | `guide_orc` |
| **17** | Arauto do Pesadelo | **9000** | Mágico | Nv 600 | Aberração Onírica (Drenagem de Sanidade) | `guide_mage` |
| **18** | Tecedor do Tempo | **10000** | Mágico | Nv 650 | Entidade Cronológica (Distorção Temporal) | `guide_mage` |
| **19** | Soberano Abissal | **11000** | Físico | Nv 700 | Pesadelo das Fendas Subterrâneas | `guide_boss` |
| **20** | Julgamento Celeste | **12000** | Mágico | Nv 750 | Serafim Bélico de Seis Asas de Luz | `guide_hero` |
| **21** | Hidra de Plasma | **13000** | Mágico | Nv 800 | Réptil Estelar Multicéfalo | `guide_boss` |
| **22** | Núcleo da Singularidade | **14000** | Físico | Nv 850 | Buraco Negro Blindado | `guide_orc` |
| **23** | Cavaleiro do Esquecimento | **15000** | Físico | Nv 900 | Paladino Renegado da Anti-Matéria | `guide_hero` |
| **24** | Serpente Cósmica | **16000** | Mágico | Nv 950 | Devoradora de Constelações | `guide_boss` |
| **25** | Arconte da Infinidade | **17000** | Mágico | Nv 1000 | Feiticeiro Supremo do Tecido Espacial | `guide_mage` |
| **26** | Caos Primordial | **18000** | Físico | Nv 1050 | Massa Amorfa Mutável Adaptativa | `guide_slime` |
| **27** | Demiurgo do Vazio | **19000** | Mágico | Nv 1100 | Criador das Rupturas Dimensionais | `guide_mage` |
| **28** | Apoteose da Torre | **20000** | Físico | Nv 1200 | A Própria Alma e Vontade da Torre Ancestral | `guide_boss` |

---

## 2. Padrões de Design de Combate (Base OpenRpg)

Cada chefe implementa o modelo de dados data-driven estabelecido pelo projeto:
1. **Atributos Derivados:** Fórmulas vitais `CON×5` para HP massivo de chefe, `multipliers.hp` de 12× a 30× o HP de um mob comum do mesmo nível.
2. **Habilidades AoE e Single (CombatTargetTypes):**
   - Habilidade primária de alvo único focada no tanque da equipe.
   - Habilidade secundária em área (`all_enemies`) que castiga curandeiros e DPS de retaguarda a cada 8–15 segundos.
3. **Fases e Enrage (Fúria):**
   - Fase 2 disparada com HP < 40%: ganho de 25% de Velocidade de Ataque (IAS) e disparo de skill especial.
   - Enrage temporal (após 90s a 120s): multiplicação do ataque físico/mágico por 2× se a equipe não derrotar o chefe a tempo.
4. **Resistências e Imunidades:**
   - 100% imune a Atordoamento (`stun`) em todos os chefes para evitar perma-lock da equipe.
   - Resistência variável a Veneno (`poison`: 50% a 90%), exigindo que dano veneno seja complemento, não vitória automática.

---

## 3. Planejamento de Arte e Lotes de Geração

Seguindo estritamente a **Regra do Teto de 10 Chamadas por Lote**:
- Os 28 chefes serão gerados em lotes dedicados de Chefes.
- Cada chefe consome 1 chamada de geração de atlas (1024×1280 em fundo `#FF00FF`) e seu retrato correspondente é extraído deterministicamente pelo pipeline (`art.mjs portraits`).
- Planejamento de lotes:
  * **Lote Boss 1 (Chefes 1 a 6):** 6 chefes de progressão inicial (6 chamadas + 4 reservas).
  * **Lote Boss 2 (Chefes 7 a 12):** 6 chefes intermediários (6 chamadas + 4 reservas).
  * **Lote Boss 3 (Chefes 13 a 18):** 6 chefes avançados (6 chamadas + 4 reservas).
  * **Lote Boss 4 (Chefes 19 a 24):** 6 chefes endgame (6 chamadas + 4 reservas).
  * **Lote Boss 5 (Chefes 25 a 28):** 4 chefes supremos épicos (4 chamadas + 6 reservas).
