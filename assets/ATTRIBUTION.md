# Atribuição de assets

Este projeto usa arte de terceiros. A licença exige atribuição visível.
Esta pasta é o local canônico dessa atribuição, e `apps/game-web` deve
exibi-la no menu de créditos antes de qualquer release.

## Fantasy Dungeon — Top-Down Pixel-Style RPG

**Assets by Nika Studio**

- **Página:** <https://nikastudio.itch.io/fantasy-dungeon-top-down-pixel-rpg-asset-pack-unity-6-urp>
- **Versão usada:** v1.4 (PNG Sprites — engine-agnostic, 91 MB)
- **Autoria:** <https://nikastudio.itch.io/>
- **Licença:** uso comercial e pessoal permitido, **com crédito obrigatório**,
  sem revenda dos assets isoladamente. Uma cópia da MIT incluída vem em
  [`sprites/LICENSE.txt`](sprites/LICENSE.txt).
- **Divulgação do autor:** a arte 2D foi produzida com ferramentas de IA
  (Higgsfield), selecionada, recortada e montada à mão.

### O que o jogo usa deste pack

- **Personagens** — `characters/`: 17 conjuntos completos (idle, walk, run,
  attack, hurt, death) em 4 direções; `merchant` e `villager` têm só
  idle/walk e servem como NPC.
- **Heróis** — `characters/hero`, `characters/mage`, `characters/archer`,
  `characters/necromancer`: os quatro candidatos de P-002.
- **Inimigos** — `characters/`: goblin, skeleton, slime, orc, bat, fireorc,
  shadowgoblin, elitearcher, frostslime, toxicbat, bloodskeleton,
  slimeking, boss.
- **Skins do Rei** — `hero_skins/`: 8 (royal, paladin, darkknight, crimson,
  frost, assassin, mage, ranger).
- **Retratos** — `portraits/`: 8.
- **Cenário** — `tileset/` e `tileset/environment/`: pisos, paredes, portas,
  armadilhas, decoração.
- **Ícones** — `icons1/`, `icons2/`, `icons3/`: 224.
- **Efeitos** — `vfx/`: 7.
- **UI** — `ui/`: 2 sheets (ver a ressalva abaixo).

### Ressalva sobre `ui/ui_kit.png`

A sheet contém palavras em inglês **desenhadas dentro da imagem**
("INVENTORY", "ITEMS", "EQUIP"). O jogo é PT-BR e a §62 proíbe UI de
protótipo. Portanto: **não usar os rótulos rasterizados como UI final.**
Os rótulos do jogo são HTML/CSS; do kit, usar apenas elementos sem texto
embutido. Ver `docs/ART_GUIDELINES.md`.

### Condição que este projeto assumiu

A página do autor e o `README_IMPORT.txt` dizem "uso comercial e pessoal
permitido, crédito obrigatório, sem revender os assets". O
`LICENSE.txt` do pacote é MIT, que é mais permissiva. **Segue-se a
condição mais conservadora:** creditar, preservar os avisos originais e
não distribuir o pack como produto. O `LICENSE.txt` e o
`README_IMPORT.txt` originais são mantidos junto dos arquivos.

### Limite do pack

Não há áudio. O jogo precisa de som (§63, §60) e esse pack não resolve.
Ver a seção de lacunas em `docs/ASSET_GAP.md`.
