# Especificação do Painel Administrativo de Conteúdo

**Versão:** 0.2 — recorte MVP e baseline de autorização G2
**Estado:** escopo aprovado; regras técnicas detalhadas ligadas a [TECH_ARCHITECTURE.md](TECH_ARCHITECTURE.md). Não implementado.

## 1. Objetivo

Criar um CMS administrativo para manter o conteúdo do **Tower Idle Adventure** por formulários, sem precisar alterar código ou fazer deploy para cada novo registro. O painel deve suportar adicionar, editar, arquivar/remover, validar, visualizar e publicar conteúdo do jogo.

O painel é exclusivamente interno: jogadores comuns não devem ver entrada/link, interface ou dados administrativos e não podem acessar a aplicação nem seus endpoints, mesmo que conheçam a URL. A ausência de link não é controle de segurança: acesso precisa ser negado no login, servidor, Edge Functions e banco/RLS.

> “Sem código” vale para criar/editar dados em tipos e comportamentos já suportados pelo jogo. Uma mecânica nova, campo novo ou comportamento que não existe na lógica do jogo ainda exige mudança de software; o CMS não executa scripts arbitrários.

## 2. Aplicações e visibilidade

- Painel hospedado em um projeto Vercel separado do Game Web, com domínio próprio e sem navegação, botão ou menção no cliente de jogadores.
- Proteger a entrega da interface na borda (Vercel Deployment Protection/SSO se disponível no plano, ou middleware server-side equivalente que verifique a allowlist) para que jogador comum não receba o shell do painel. A role também é validada no Supabase; são duas camadas, não alternativas.
- Login via Supabase Auth, sem cadastro público de administradores. Contas autorizadas entram por allowlist/convite feito por owner.
- Usuário sem role administrativa recebe negação genérica (401/403/404 ou página indisponível), sem shell do painel, catálogo privado ou capacidade de mutar dados. Nenhum dado administrativo é carregado antes da verificação de autorização.
- Endpoints administrativos no Supabase revalidam a role em cada requisição; remover acesso revoga sessões/claims conforme política. Não confiar em rota escondida, segredo no JavaScript ou role enviada pelo navegador.
- MFA TOTP obrigatório para todas as contas admin em production; reautenticação para publicar, rollback, conceder/revogar role e ação destrutiva. Baseline proposto (30 min inativo/8 h absoluto, MFA nos 10 min anteriores à ação) consta no blueprint G2 e depende de validação de configuração/UX antes do gate.

## 3. Papéis iniciais

Modelo mínimo recomendado:

- **Owner:** concede/revoga admins, gerencia todo conteúdo, publica e faz rollback.
- **Editor:** cria, edita, valida e submete rascunhos; não publica, faz rollback ou gerencia usuários/roles. Owner revisa diff e publica.
- **Leitor/Auditor:** visualiza conteúdo e histórico sem editar.

Para o primeiro lançamento pode existir somente Owner (dono do projeto); os papéis não devem ser controlados por campos editáveis pelo próprio usuário. Toda alteração de permissão é auditada.

## 4. Catálogo e áreas CRUD

Navegação do painel por módulos com busca, filtro, paginação, estado (rascunho/publicado/arquivado), data e versão:

1. **Equipamentos:** identidade, slot/subtipo, nível, raridade elegível, oito atributos-base, características possíveis, ícone/PNG, regras de vínculo e observações.
2. **Armas e traços:** tipo de arma, atributo físico/mágico, coeficientes, chances, duração, caps e flags do comportamento suportado. Contracorte e outros valores vêm dos dados aprovados; não há campo para executar código arbitrário.
3. **Personagens:** nome/ID, classes/papéis, estrelas disponíveis, stats-base por nível, skills compatíveis, afinidade(s), sprite e evolução.
4. **Skills:** tipo, alvo, coeficientes, cooldown, custo, duração, efeitos, slots exigidos e texto/localização.
5. **Inimigos:** stats/nível, lista de ações, resistências, drops, comportamento e assets.
6. **Bosses:** dados de inimigo, fases e parâmetros de evento/instância cobertos por schemas suportados, recompensas e status/imunidades.
7. **Andares e encontros:** nível mínimo, nome/tema, pools de inimigos de 1–3, progressão, tabelas de drop, XP/Coin e assets.
8. **Eventos:** janela de início/fim e fuso, estado, condições, tabelas/recompensas, banners/PNG e regras de ativação suportadas.
9. **Loot, caixas e economia:** pools, chances, preços, consumíveis, moedas, raridades, limites e parâmetros; odds completas e visíveis ao jogador.
10. **Outros catálogos:** guild/boss templates, mensagens/localização, loja NPC, drops e parâmetros de conteúdo já declarados no schema.

Estrutura de módulos deve permitir adicionar novas categorias de dados sem reconstruir a navegação inteira. Adicionar suporte a um novo tipo de mecânica requer código/schema, mas instanciar um novo personagem/boss/andar dentro dos campos suportados é feito pela UI.

### Recorte funcional do MVP

Na primeira entrega, expor CRUD/publicação para os tipos que alimentam o escopo em `MVP_DECISIONS.md`: templates de equipamento/armas, personagens, skills, inimigos/boss individual, andares/encontros, loot, consumíveis/loja e assets. Eventos podem ser criados/editados como rascunho, mas não há runtime de evento no Game Web. Caixas, Diamonds, mercado, guildas, PvP e progressão de estrelas permanecem desligados/pós-MVP; módulos não usados não precisam aparecer no Admin Web inicial.

## 5. Fluxo editorial sem código

1. **Listar/criar:** formulários tipados com defaults seguros, ajuda contextual e preview de asset.
2. **Editar rascunho:** autosave opcional com confirmação de alterações; jogador nunca lê conteúdo de rascunho.
3. **Validar:** schema, IDs duplicados, referências quebradas, ranges, peso/raridade, requisito de nível, slots/estrelas, chance total de loot, conteúdo faltante e imagens. Erros bloqueiam publicação e indicam caminho/campo.
4. **Preview:** visualizar a ficha/tooltip/tela no layout do jogo e simular referência do catálogo sem conceder loot real.
5. **Publicar:** somente Owner aprova após resumo/diff, motivo, confirmação e MFA recente; Editor submete draft, sem publicação direta. Publicação cria release imutável e atômico; cliente só lê release completo.
6. **Monitorar/rollback:** Owner reativa release anterior com MFA recente e motivo; consultar audit log sem apagar histórico. Auditor tem leitura; Editor não faz rollback.

Alterações de conteúdo já publicado não sobrescrevem uma sessão de combate ativa: a run fixa a versão da configuração usada na entrada, salvo regra futura explícita.

## 6. Upload e assets

- Upload de PNG estático aprovado para Supabase Storage (ou storage/CDN compatível definido em G2), com caminho de conteúdo versionado e preview.
- Validar formato real, MIME, tamanho, dimensões e nome; impedir SVG/script executável no fluxo de imagens até revisão de segurança.
- Assets referenciados por ID/URL no catálogo; substituição cria versão, não quebra release ativo.
- O fluxo preserva a regra artística de produzir/revisar assets em lotes de dez; o painel administra arquivos e referências, não gera arte procedural.

## 7. Segurança e persistência

- Dados administrativos separados dos dados de perfil do jogador; tabelas/views de conteúdo publicado têm leitura pública somente do subconjunto aprovado.
- RLS nega por padrão escrita de jogador em tabelas de conteúdo/admin. Endpoints Edge Function validam Supabase Auth + role confiável em cada ação.
- `service_role` jamais está no cliente Game Web ou Admin Web; segredo só em ambiente seguro de servidor/Edge Function.
- Campos de role são concedidos por owner/processo de provisionamento confiável; nunca confiar em `user_metadata` ou parâmetro enviado pelo client.
- Auditoria append-only: usuário admin, ação, entidade/ID, antes/depois ou diff, versão, horário, motivo e resultado. Segredos/tokens não são gravados no log.
- Confirmar ações destrutivas; preferir arquivar/soft delete a excluir registros que já aparecem em release histórico.
- Publicações e compras/uso de conteúdo em jogo usam transações e versionamento; nenhuma função admin pode alterar saldo/inventário de jogador por fora de fluxo auditado.

## 8. Requisitos de aceitação

- Usuário Free/VIP sem role admin não consegue entrar, obter dados de painel ou chamar diretamente qualquer endpoint de escrita/admin.
- Link/atalho do painel não aparece no cliente do jogo; aplicação administrativa é deployment separado.
- Admin autorizado consegue criar/editar/publicar os dados de conteúdo do MVP listados no recorte acima só pela UI, sem editar código nem redeploy; registro de evento pode ficar como draft sem runtime no Game Web. O suporte às demais áreas da lista geral pode ser entregue em fases posteriores.
- Conteúdo inválido (por exemplo, tabela de drop que não soma 100% ou item sem atributo exigido) não pode ser publicado.
- Alteração publicada fica versionada; rollback restaura versão anterior e sessão ativa preserva sua referência de conteúdo.
- Assets e dados de rascunho não vazam para clientes comuns.
- Todas as mudanças têm trilha de auditoria atribuída a um admin.

## 9. Dependências e decisões para G2

O baseline de roles, grants, release, sessão e isolamento está detalhado em [`G2_TECHNICAL_BLUEPRINT.md`](G2_TECHNICAL_BLUEPRINT.md) e [`THREAT_MODEL.md`](THREAT_MODEL.md), como proposta do agente para validar. Antes de implementar, G2 ainda exige verificar plano/SSO disponível, provisionamento do primeiro Owner, suporte real a expiração/reautenticação, storage/CDN e limites de upload, backups/retenção, threat-model review e testes automatizados de acesso. Esta especificação não significa que o painel foi construído ou que o isolamento já foi testado.
