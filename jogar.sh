#!/bin/sh
# Linux/macOS: abre o jogo (só precisa do Node.js 18+). No Windows use JOGAR.bat.
cd "$(dirname "$0")" || exit 1
exec node scripts/play.mjs "$@"
