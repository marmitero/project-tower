# Jogar no seu computador (Windows 10 Home — passo a passo)

> **Resumo de 20 segundos:** instale o **Node.js** (uma vez), baixe o **zip** do GitHub, **extraia**,
> dê **duplo clique em `JOGAR.bat`**. O jogo abre no navegador em `http://localhost:5173`.
> Não precisa de `npm install`, de conta, nem de internet para jogar.

Este caminho usa o jogo **já compilado** que está no repositório (`apps/game-web/preview/`) mais as
imagens e sons (`assets/`). Um mini-servidor local (`scripts/play.mjs`, só Node.js, zero
dependências) entrega tudo ao navegador — é isso que faz **o jogo, o CSS, as imagens, os sons e o
manifesto de assets** carregarem por completo.

---

## 1. O que você precisa

| Item | Detalhe |
|---|---|
| Windows | 10 (Home serve) ou 11 |
| Navegador | Chrome, Edge ou Firefox atualizados (Edge já vem no Windows 10) |
| Node.js | versão **18 ou mais nova** (a **LTS** do site oficial serve) — instalada uma vez |
| Espaço | ~250 MB (o zip tem ~100 MB; extraído ocupa mais) |
| Internet | só para baixar o Node.js e o zip. Para jogar, não |

## 2. Instale o Node.js (uma vez só)

1. Abra **https://nodejs.org** no navegador.
2. Clique no botão grande verde escrito **LTS** (por exemplo “Baixar Node.js (LTS)”). Baixa um arquivo `.msi`.
3. Abra o arquivo baixado (duplo clique). Vá clicando **Next** / **Avançar** — **pode deixar tudo como está** — e no fim **Install** e **Finish**.
   - Se o Windows perguntar “Deseja permitir que este aplicativo faça alterações?”, clique **Sim**.
   - Se aparecer uma tela falando de “Tools for Native Modules”, **não precisa marcar**.
4. *(Opcional, para conferir)* aperte as teclas **Windows + R**, digite `cmd`, Enter, e na janela preta digite `node -v` e Enter. Deve aparecer algo como `v24.x.x` (qualquer número 18 ou maior serve). Feche a janela.

## 3. Baixe o jogo (zip do GitHub)

1. Abra este endereço (ele já começa a baixar o zip):
   **https://github.com/marmitero/project-tower/archive/refs/heads/arena/01a0f1f1-project-tower.zip**
   - Se preferir pelo site: abra https://github.com/marmitero/project-tower , troque a branch (menu “main”) para
     `arena/01a0f1f1-project-tower`, clique no botão verde **Code** → **Download ZIP**.
2. O arquivo `project-tower-arena-01a0f1f1-project-tower.zip` fica na pasta **Downloads** (~100 MB; pode demorar um pouco).

## 4. EXTRAIA o zip (passo que mais dá problema)

> ⚠️ **Não dê duplo clique em `JOGAR.bat` de dentro do zip.** O Windows mostra o zip como se fosse uma
> pasta, mas os arquivos ainda não existem de verdade. É preciso **extrair**.

1. Em **Downloads**, clique com o **botão direito** no zip → **Extrair tudo…**
2. Na janela, deixe o caminho como está (ou escolha, por exemplo, `C:\Jogos`) e clique **Extrair**.
   - Dica: caminhos **curtos** são melhores (`C:\Jogos\` é ótimo). Evite colocar dentro de pastas muito fundas.
3. Abra a pasta criada: **`project-tower-arena-01a0f1f1-project-tower`**. Você deve ver, entre outros, os arquivos
   `JOGAR.bat`, `README.md` e as pastas `apps`, `assets`, `scripts`.
   - Se dentro dela houver só **outra** pasta com o mesmo nome, abra também — o `JOGAR.bat` fica na pasta que tem `apps` e `assets`.

## 5. Abra o jogo

1. Dê **duplo clique em `JOGAR.bat`**.
2. Pode aparecer um aviso azul **“O Windows protegeu o computador”** (SmartScreen) — normal para arquivos baixados da internet:
   clique em **Mais informações** → **Executar assim mesmo**. (Em outras versões vem uma caixa
   “Abrir arquivo – Aviso de segurança”: clique **Executar**.) O arquivo é só um texto de poucas linhas que você pode abrir no Bloco de Notas para ver.
3. Abre uma **janela preta** com o título **TOWER IDLE ADVENTURE** e o endereço `http://localhost:5173`.
4. **O navegador abre sozinho** no jogo. Se não abrir, copie `http://localhost:5173` e cole na barra de endereços.
5. **Deixe a janela preta aberta** enquanto joga (é ela que “serve” o jogo).

Você deve ver a tela **“Coroe o seu Rei”**. Se viu, está tudo certo: o CSS, as imagens e os sons já estão carregando.

### Primeiros 5 minutos
1. Digite um nome (3–20 letras/números, sem espaço — pode usar `_`), escolha a aparência e clique **Escolher campeão**.
2. Escolha **1 dos 4 campeões** e clique **Convocar**. (Você só recebe esse; os outros vêm do mundo depois.)
3. Aba **Equipe** → coloque o herói no **Slot 1**.
4. Aba **Torre** → **Entrar na Torre**. O herói luta sozinho; aparece “Procurando…” entre as lutas.
5. Aba **Inventário** → equipe o que cair. Aba **Market** → poções. No nível 10 do Rei abre a **Arena** de chefes.
6. O quadro **“Próximo passo”** no topo diz o que fazer em cada momento. A aba **Opções** tem o “Como jogar”.

## 6. Parar, voltar e não perder o progresso

- **Parar:** feche a janela preta (ou aperte `Ctrl + C` nela).
- **Voltar depois:** duplo clique em `JOGAR.bat` de novo e use **o mesmo navegador**. O progresso é salvo **no navegador**, ligado ao endereço
  `http://localhost:5173`. Por isso:
  - outro navegador (ou o modo anônimo) = **outro save**;
  - limpar “dados de navegação / cookies e dados de sites” **apaga o save**;
  - se `JOGAR.bat` avisar que usou outra porta (5174, 5175…), o save daquela porta é **separado**.
- **Proteja o progresso:** aba **Opções → Baixar cópia do save** guarda um arquivo `.json`. Para recuperar: **Opções → Carregar save de um arquivo**
  (ou, na tela de criação do Rei, “Já tenho um save…”).
- **Fechou o jogo de verdade?** Ao voltar, o jogo simula o tempo fora (até **2 horas**) e mostra um relatório “Bem-vindo de volta”.
  Para isso o tempo conta mesmo com o jogo fechado — mas só se o save existir naquele navegador.
- **Nova versão do jogo:** baixe um zip novo e extraia em **outra** pasta. O save continua (está no navegador, não na pasta).
  Antes, por segurança, baixe a cópia do save.

### Recomeçar do zero (resetar o save)

1. **Pelo jogo (recomendado):** aba **Opções → Seu progresso → Apagar progresso e recomeçar → “Sim, apagar tudo”**. O jogo guarda uma cópia de segurança (dá para voltar com **Restaurar a cópia anterior**), recarrega e abre a criação do Rei. O som e a visibilidade dos painéis (preferências) são mantidos.
2. **Manual (sem backup):** com o jogo aberto aperte **F12 → Console** e rode `localStorage.removeItem("tia:save:local")`, depois **F5**. Para limpar TUDO do jogo (save, cópia e preferências): `localStorage.clear()`.
3. **Por navegador:** o save é por endereço (`http://localhost:5173`; outra porta = outro save). Limpar “dados de sites” desse endereço também zera.

## 7. Se algo der errado

| O que aconteceu | O que fazer |
|---|---|
| A janela preta piscou e sumiu | Abra o **Prompt de Comando** (Windows + R → `cmd`), arraste o `JOGAR.bat` para a janela e Enter: a mensagem de erro fica na tela. |
| “O Node.js não está instalado” | Faça o passo 2. **Depois feche tudo e abra o `JOGAR.bat` de novo** (o Windows só enxerga o Node em janelas novas). |
| “Seu Node.js é antigo” | Reinstale a versão LTS do nodejs.org por cima. |
| “Não achei os arquivos do jogo” / “Não encontrei a pasta do jogo” | Você não extraiu o zip (ou abriu o `.bat` de dentro dele). Refaça o passo 4. |
| Tela preta/branca no navegador | Aperte **Ctrl + F5**. Confira que o endereço é `http://localhost:5173` (não um arquivo `file:///…`). |
| Abri o `index.html` direto (endereço começa com `file:///`) e ficou em branco | **Não funciona assim** (limite dos navegadores). Sempre use o `JOGAR.bat`. |
| Aviso do Firewall do Windows | Não deveria aparecer (o servidor só escuta no seu próprio PC). Se aparecer, pode clicar em **Cancelar**: o jogo funciona igual. |
| O antivírus bloqueou/colocou em quarentena | O jogo só roda `node` + um servidor local. Libere a pasta do jogo nas exceções do antivírus. |
| “A porta 5173 está ocupada” | Outro programa usa essa porta. O jogo escolhe a próxima livre e **avisa o novo endereço** — mas o save daquela porta é separado. |
| Perdi meu save | Aba **Opções → Restaurar a cópia anterior** (existe depois de importar um save ou apagar o progresso), ou carregue seu arquivo `.json`. |
| Sem som | Clique em algum lugar da página (navegadores só liberam áudio após um clique). Veja **Opções → Som**. |
| Quero ver tudo de novo desde o início | **Opções → Apagar progresso e recomeçar** (pede confirmação e guarda uma cópia). |

## 8. Para quem desenvolve (opcional)

```bash
npm install                 # uma vez
npm run dev                 # servidor de desenvolvimento com recarga (http://localhost:5173)
npm run play                # o mesmo que JOGAR.bat (usa o bundle versionado)
npm run play:debug          # compila e abre COM o painel de Debug Mode (§77) — nunca vai para o repositório
npm run build:preview       # recompila o bundle versionado (obrigatório depois de mudar o código)
npm run check               # docs + tipos + testes + assets + segredos + debug + bundle/zip do Windows
```

- `JOGAR-DEBUG.bat` é o equivalente do `play:debug` no Windows (instala as dependências na 1ª vez).
- O bundle em `apps/game-web/preview/` **nunca** inclui o Debug Mode; `npm run check` reprova se incluir.

## 9. Como garantimos que o zip funciona

`npm run check:preview` (parte do `npm run check`) faz o que o navegador faria, contra o **mesmo servidor do `JOGAR.bat`**:

1. confere que `apps/game-web/preview/BUILD_INFO.json` bate com o código-fonte atual (o bundle não está velho);
2. confere que o bundle **não** contém o painel de debug;
3. abre `index.html`, baixa cada `.js` e `.css` (com o tipo MIME certo) e o `manifest.json`, e baixa **todas as ~494 imagens e sons** listados nele — qualquer 404 reprova;
4. confere que `URL malformada` não derruba o servidor e que rotas desconhecidas caem no jogo;
5. confere que `JOGAR.bat` é ASCII + CRLF (e que `.gitattributes` impede o GitHub de converter) e que nenhum arquivo do repositório tem nome inválido/reservado do Windows, colisão de maiúsculas ou caminho longo demais para o limite de 260 caracteres.

Testes de interface (`npm run test`) abrem o jogo inteiro em um navegador simulado (jsdom): criação do Rei → todas as telas → Opções,
exportar/importar/apagar save, proteção contra erro de tela. A jornada do MVP (`tests/integration/mvp-journey.test.ts`) e o teste de estabilidade
(`tests/integration/soak.test.ts`, 3 h simuladas × 4 heróis) cobrem a lógica.

> Limite honesto: o ambiente de desenvolvimento não tem navegador gráfico, então **a aparência final no seu monitor** é a única parte
> que não pôde ser vista por quem escreveu o código. Se algo parecer fora do lugar, envie um print.
