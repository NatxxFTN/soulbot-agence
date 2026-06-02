@echo off
chcp 65001 >nul
title Soulbot - Déploiement Windows

echo ╔══════════════════════════════════════╗
echo ║     SOULBOT – AUTO DEPLOY v1.0       ║
echo ║           (Windows)                   ║
echo ╚══════════════════════════════════════╝
echo.

:: 1. Vérifier Node.js
echo [1/4] Vérification de Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo    ❌ Node.js introuvable. Télécharge-le ici :
    echo    https://nodejs.org/  (v20 LTS recommandé)
    pause
    exit /b
)
echo    ✓ Node.js %node -v% trouvé

:: 2. Installer les dépendances
echo [2/4] Installation des dépendances npm...
call npm install
echo    ✓ Dépendances installées

:: 3. Vérifier .env
if not exist .env (
    echo [3/4] Création du fichier .env.example...
    echo    ⚠️  Ouvre .env et mets ton token Discord
    copy .env.example .env >nul
    echo    Appuie sur une touche pour ouvrir le fichier...
    pause
    start notepad .env
    exit /b
) else (
    echo [3/4] .env déjà présent ✓
)

:: 4. Lancer le bot
echo [4/4] Démarrage du bot...
echo.
echo ╔══════════════════════════════════════╗
echo ║  ✅ Prêt ! Le bot est lancé          ║
echo ║  Ferme cette fenêtre pour arrêter    ║
echo ╚══════════════════════════════════════╝
echo.
node bot/index.js
pause
