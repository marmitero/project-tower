# reference/ — material importado de repositórios de referência

Esta pasta guarda material **importado de outros repositórios** para que o
projeto não precise mais deles em nada. Cada subpasta mantém a estrutura
original do repositório de origem, para que a proveniência seja auditável.

## `tower-idle-adventure/`

- **Origem:** <https://github.com/marmitero/tower-idle-adventure>
- **Importado em:** 2026-10-02 (decisão do usuário — autosuficiência do repositório)
- **Conteúdo:** README original, 14 documentos de design (`docs/`),
  protótipos (`prototypes/g2-hud`) e o esquema Supabase de referência
  (`supabase/`: migrations, seed, tests) para a futura fase Online.

> A **arte do pack** (sprites) NÃO fica aqui: ela vive em
> [`assets/sprites/`](../assets/sprites/) porque todo o pipeline
> (`scripts/build-assets.mjs`, `check:assets`) consome esse caminho.
> A licença do pack (MIT © Nika Studio) está em
> `assets/sprites/LICENSE.txt` e os créditos em
> [`assets/ATTRIBUTION.md`](../assets/ATTRIBUTION.md).

### O que NÃO importamos

- `.github/`, `.gitignore` e outros metadados do repositório de origem
  (sem valor para este projeto).
- Os documentos de design foram **absorvidos** pela documentação própria
  (ver [`docs/DECISIONS_LOG.md`](../docs/DECISIONS_LOG.md) ADR-001 para as
  divergências resolvidas); os originais ficam aqui só como fonte histórica.

### Uso esperado

Nenhum. Nada no build, nos testes ou no jogo referencia esta pasta — ela é
material de consulta. Se um dia a fase Online precisar do schema Supabase,
ele está em `tower-idle-adventure/supabase/`.
