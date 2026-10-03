@echo off
rem ============================================================
rem  Tower Idle Adventure - abrir o jogo no Windows
rem  Duplo clique neste arquivo. Precisa so do Node.js (nodejs.org).
rem  Nao precisa de npm install nem de internet.
rem ============================================================
setlocal
cd /d "%~dp0"
title Tower Idle Adventure
chcp 65001 >nul 2>nul

if not exist "scripts\play.mjs" (
  echo.
  echo  [!] Nao achei os arquivos do jogo ao lado deste JOGAR.bat.
  echo      Se voce abriu de dentro do arquivo .zip, EXTRAIA primeiro:
  echo      botao direito no zip - "Extrair tudo..." - e rode o JOGAR.bat da pasta extraida.
  echo.
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  [!] O Node.js nao esta instalado neste computador - ele e o motor que roda o jogo.
  echo.
  echo      1. Vou abrir a pagina de download: escolha o botao "LTS" e instale
  echo         ^(Next, Next, Next... pode deixar tudo como esta^).
  echo      2. Depois FECHE esta janela e de duplo clique em JOGAR.bat de novo.
  echo.
  start "" "https://nodejs.org/pt-br/download"
  pause
  exit /b 1
)

node scripts\play.mjs %*
echo.
echo  O jogo foi encerrado. Se apareceu alguma mensagem de erro acima, tire uma foto/print dela.
pause
endlocal
