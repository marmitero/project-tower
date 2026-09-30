# Fontes de assets

## `assets/sprites/` — não versionado, por escolha

**O que é:** o pack *Fantasy Dungeon — PNG Sprites* (Nika Studio, v1.4),
422 PNGs, 92 MiB.

**De onde veio:** <https://github.com/marmitero/tower-idle-adventure> →
`sprites/`. Esse repositório é do mesmo autor e é a origem canônica
dentro da organização.

**Por que está no `.gitignore`:** os arquivos são binários de terceiros,
de um pack que não muda dentro deste repositório. Versioná-los aqui
significaria 422 blobs imutáveis no histórico, mais lentos de clonar e
de compactar, sem nenhum ganho de revisão. A licença e a atribuição ficam
versionadas ([`ATTRIBUTION.md`](ATTRIBUTION.md)); os arquivos não.

**Como recuperar se o diretório sumir:**

```bash
git clone --depth 1 https://github.com/marmitero/tower-idle-adventure /tmp/ref
mkdir -p assets
cp -r /tmp/ref/sprites assets/
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
| `assets/sprites/` | ❌ | Pack de terceiro, 92 MiB |
| `assets/ATTRIBUTION.md` | ✅ | Crédito obrigatório da licença |
| `assets/SOURCES.md` | ✅ | Este arquivo |
| `apps/*/public/assets/` | ❌ (só o manifesto) | Build derivado, seleção de release |
| `apps/*/public/assets/manifest.json` | ✅ | Mapa `id -> caminho` |
| `sprites/` | ❌ | Alias legado, aceito pelo pipeline |

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
