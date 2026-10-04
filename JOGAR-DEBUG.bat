@echo off
rem Somente para DESENVOLVIMENTO: abre o jogo com o painel de Debug Mode (nao e a versao do jogador).
rem Precisa de Node.js e de internet na primeira vez (npm install).
setlocal
cd /d "%~dp0"
title Tower Idle Adventure - DEBUG
chcp 65001 >nul 2>nul
where node >nul 2>nul
if errorlevel 1 (
  echo  [!] Instale o Node.js LTS em https://nodejs.org e tente de novo.
  pause
  exit /b 1
)
if not exist "node_modules" (
  echo  Instalando dependencias ^(so na primeira vez, pode demorar alguns minutos^)...
  call npm install
  if errorlevel 1 (
    echo  [!] npm install falhou.
    pause
    exit /b 1
  )
)
call npm run play:debug
echo.
pause
endlocal
