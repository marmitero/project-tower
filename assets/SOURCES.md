# Fontes de assets

## `assets/sprites/` — versionado neste repositório

**O que é:** o pack *Fantasy Dungeon — PNG Sprites* (Nika Studio, v1.4),
422 PNGs + os arquivos de licença/manifesto do próprio pack, 94 MiB.

**Status (2026-10-02):** **VERSIONADO AQUI**, por decisão do usuário — o
projeto não depende mais do repositório de origem para nada. Clone deste
repo = assets completos.

**Proveniência:** o pack entrou via
<https://github.com/marmitero/tower-idle-adventure> (repositório do mesmo
autor, origem canônica na organização). Esse repositório **não é mais
necessário**; o material de referência não-arte que ele continha (docs de
design, protótipos, schema Supabase) foi importado para
[`../reference/tower-idle-adventure/`](../reference/README.md).

**Licença:** MIT © 2026 Nika Studio — o aviso de copyright é obrigatório e
está preservado em `assets/sprites/LICENSE.txt` (raiz do pack). Créditos em
[`ATTRIBUTION.md`](ATTRIBUTION.md). Não revender o pack como produto
separado.

**Como recuperar se os arquivos sumirem do working tree:**

```bash
git checkout -- assets/sprites   # ou: git restore assets/sprites
```

Verificar a integridade:

```bash
cd assets/sprites && find . -name "*.png" | wc -l          # 422
cd assets/sprites && find . -name "*.png" -exec md5sum {} \; | sort -k2 | md5sum
# f1109e287f9aaa552ebde56d3d9d3403
```

**O que o pipeline faz sem os arquivos:** `scripts/build-assets.mjs` falha
com `exit 1` e lista o que falta. `npm run check:assets:strict` bloqueia
release. Isso é intencional — um build que serve placeholder como se fosse
produto é pior do que um build que não acontece (§62).

## Convenções de pasta

| Caminho | Versionado | Conteúdo |
|---|---|---|
| `assets/sprites/` | ✅ | Pack Nika Studio (422 PNG + LICENSE/manifesto do pack) |
| `assets/generated/` | ✅ | Arte própria deste projeto (retratos, UI PT-BR, áudio procedural e `items/*` — 8 ícones de equipamento **gerados por IA** em 64×64 no estilo do pack; `scripts/gen-item-icons.mjs` recorta/normaliza a partir das imagens-fonte). Sobrescreve a entrada do pack de mesmo id |
| `assets/ATTRIBUTION.md` | ✅ | Crédito obrigatório da licença |
| `assets/SOURCES.md` | ✅ | Este arquivo |
| `reference/tower-idle-adventure/` | ✅ | Material importado do repo de origem (docs/protótipos/supabase) |
| `apps/*/public/assets/` | ❌ (só o manifesto) | Build derivado (`node scripts/build-assets.mjs`), seleção de release |
| `apps/*/public/assets/manifest.json` | ✅ | Mapa `id -> caminho` |

## Regras para arte nova

1. **Estática e versionada.** Assets próprios entram no Git, em lotes
   revisados, e nunca são gerados em runtime.
2. **Nomes com ID estável.** O código pede um ID ao manifesto; ninguém
   monta caminho de arquivo em runtime. Renomear é edição de dados.
3. **Sem texto rasterizado.** A `ui_kit.png` do pack tem "INVENTORY"
   desenhado na imagem. Rótulos são HTML/CSS, em PT-BR (§62).
4. **Licença anotada.** Qualquer arte de terceiro ganha uma entrada aqui
   e em `ATTRIBUTION.md`, com crédito conforme a licença dela.
5. **Import com filtro desligado.** Pixel art sem nearest-neighbor fica
   borrada. Mipmaps e compressão com perda, desligados.
