@echo off
REM ============================================================
REM SCRIPT DE DÉMARRAGE RAPIDE - CENTRE DE SANTÉ JULIANNA
REM ============================================================

echo.
echo ========================================
echo   CENTRE DE SANTÉ JULIANNA
echo   Démarrage du serveur de développement
echo ========================================
echo.

REM Obtenir le chemin du script
set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

REM Vérifier que le venv existe
if not exist "venv\Scripts\activate.bat" (
    echo ERREUR: Environnement virtuel non trouvé!
    echo Veuillez d'abord créer le venv:
    echo   python -m venv venv
    echo   venv\Scripts\activate
    echo   pip install -r requirements.txt
    echo.
    pause
    exit /b 1
)

REM Activer le venv
echo [1/3] Activation de l'environnement virtuel...
call venv\Scripts\activate

REM Vérifier les migrations
echo [2/3] Vérification des migrations...
python manage.py migrate --check >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo AVERTISSEMENT: Des migrations sont en attente!
    echo Exécution des migrations...
    python manage.py migrate
)

REM Démarrer le serveur
echo [3/3] Démarrage du serveur Django...
echo.
echo ========================================
echo   Serveur démarré sur:
echo   http://localhost:8000
echo   http://127.0.0.1:8000
echo.
echo   Admin: http://localhost:8000/admin
echo.
echo   Comptes disponibles:
echo   - admin@csj.cm / julianna2025
echo   - reception@csj.cm / julianna2025
echo   - docteur@csj.cm / julianna2025
echo   - labo@csj.cm / julianna2025
echo   - pharma@csj.cm / julianna2025
echo.
echo   Appuyez sur Ctrl+C pour arrêter
echo ========================================
echo.

python manage.py runserver 0.0.0.0:8000

REM Si le serveur s'arrête
echo.
echo Serveur arrêté.
pause
