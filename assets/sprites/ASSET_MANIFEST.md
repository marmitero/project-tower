# Manifesto — Fantasy Dungeon PNG Sprites

## Proveniência e licença

- **Fonte declarada no pacote:** *Fantasy Dungeon — PNG Sprites*, Nika Studio, versão indicada no `README_IMPORT.txt` como v1.4.
- **Página indicada pelo pacote:** <https://nikastudio.itch.io/fantasy-dungeon-top-down-pixel-rpg-asset-pack-unity-6-urp>
- **Crédito solicitado pelo `README_IMPORT.txt`:** `Assets by Nika Studio` + link para a página acima.
- **Arquivos originais mantidos:** [`README_IMPORT.txt`](README_IMPORT.txt) e [`LICENSE.txt`](LICENSE.txt). Preservá-los em redistribuições do projeto.
- O README do pacote declara uso pessoal/comercial permitido, crédito obrigatório e proíbe revender os assets como produto isolado. Há também uma licença MIT incluída. Até uma revisão jurídica confirmar a interpretação combinada, seguir a condição mais conservadora: creditar Nika Studio, preservar os avisos e não vender o pack isoladamente.
- O README declara que a arte 2D foi feita com ferramentas de IA (Higgsfield), selecionada, recortada e montada. Estes são arquivos raster estáticos preexistentes; isso **não** autoriza criação procedural em runtime.

## Inventário verificado na branch

- **422 arquivos PNG**, mais `README_IMPORT.txt` e `LICENSE.txt`.
- **92,11 MiB** somados nos PNGs. Maior arquivo verificado: `sprites/ui/ui_dialog.png` (4.689.811 bytes, abaixo de 5 MiB).
- Todos os PNGs passaram uma verificação de assinatura/estrutura IHDR. As dimensões observadas vão até **2048×2048**, abaixo do limite técnico proposto de 4096×4096 e 16 MP.
- Categorias e contagem:

| Caminho | Arquivos | Uso provável |
|---|---:|---|
| `characters/` | 108 | Sheets de personagens, inimigos e NPCs |
| `hero_skins/` | 8 | Aparências estáticas alternativas |
| `icons1/`, `icons2/`, `icons3/` | 224 | Ícones de itens, armas, poções e magias |
| `portraits/` | 8 | Retratos/avatares |
| `tileset/` e `tileset/environment/` | 65 | Pisos, paredes, portas, armadilhas e decoração |
| `ui/` | 2 | Sheets de componentes de interface |
| `vfx/` | 7 | Sheets de efeitos visuais |

O pacote informa sheets de animação 1024×1024 com grade 4×4 de quadros 256×256 (cada linha representa uma direção), tiles de 128×128 e ícones de 64×64. Importar pixel art com filtro nearest/point, sem mipmaps e sem compressão com perda, conforme o README incluído.

## Cobertura e limitações observadas

- Há 19 diretórios em `characters/`: 17 têm seis sheets de ação (`idle`, `walk`, `run`, `attack`, `hurt`, `death`); `merchant` e `villager` têm três imagens cada e não são conjuntos completos de personagem jogável.
- O README descreve a pasta como `icons/`, mas no conteúdo versionado ela está dividida em `icons1/`, `icons2/` e `icons3/`. Usar os caminhos reais e manter este apontamento para não quebrar imports.
- Os nomes das skins incluem a extensão duplicada, por exemplo `hero_skins/assassin.png.png`. Preservar os originais e mapear para IDs estáveis via manifesto; não renomear em lote sem testar referências.
- A sheet `ui/ui_kit.png` contém palavras em inglês desenhadas dentro da imagem (por exemplo, “INVENTORY”, “ITEMS”, “EQUIP”). O jogo é PT-BR: preferir peças sem texto incorporado e renderizar os rótulos em HTML/CSS. Não exibir esses rótulos em inglês como UI final.
- O pack é amplo e soma ~92 MiB. Não copiar tudo para o bundle/deployment do jogo. Preservar `sprites/` como fonte e selecionar somente arquivos usados por uma release; otimização/subsetting e manifesto de uso serão feitos no primeiro app local.

## Seleção inicial — proposta para protótipos, não identidade final aprovada

1. **Personagens:** `characters/hero/` como candidato a Guerreiro; `characters/mage/` a Arcanista; `characters/archer/` ou a skin Assassin como estudo para Ladino. Validar paleta, silhueta, legibilidade em escala de HUD e consistência antes de fixar o mapeamento.
2. **Inimigos:** começar avaliação visual por `goblin/`, `skeleton/`, `slime/`, `orc/`, `bat/` e `boss/`, confrontando com os templates de encontro do MVP.
3. **Cenário:** avaliar `tileset/floor_plain.png`, `cave_floor.png`, `cave_wall.png`, portas/archway e decoração de `tileset/environment/` para compor uma tela de combate sem embutir UI textual em inglês.
4. **Efeitos:** testar `vfx/` em escala e velocidade adequadas; manter opção de reduzir efeitos e não sacrificar legibilidade.
5. **Ícones/UI:** revisar ícones individualmente; usar apenas elementos de UI sem texto rasterizado, quando aplicável.

Os candidatos acima não são decisões de classe/arte individuais do usuário. A intenção confirmada é iniciar usando este pack e complementar/criar mais assets depois. Assets adicionais feitos para o jogo continuam estáticos, versionados, revisados em lotes de dez; nenhuma arte é gerada proceduralmente durante a partida.
