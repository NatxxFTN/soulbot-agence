@echo off
setlocal

echo.
echo  SOULBOT -- Bot + Dashboard
echo.

call node scripts/kill-bot.js

if exist .bot.lock (
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
echo  Lancement bot + dashboard...
echo.

call npm run dev:all
