@echo off
setlocal

echo.
echo  SOULBOT -- Demarrage bot
echo.

echo  Kill instances bot...
call node scripts/kill-bot.js

if exist .bot.lock (
  echo  Suppression .bot.lock...
  del /F /Q .bot.lock 2>nul
)

if not exist .env (
  echo  ERREUR : .env manquant ^!
  exit /b 1
)

if not exist node_modules (
  echo  Installation dependances...
  call npm install
)

echo.
echo  Environnement pret - Node:
node -v
echo.
echo  Lancement du bot...
echo.

call npm run dev:bot
