@echo off
echo ========================================
echo Correction et application des migrations
echo ========================================
echo.

cd /d "%~dp0"

echo Etape 1: Verification de l'etat des migrations...
python manage.py showmigrations ai_assistant

echo.
echo Etape 2: Application des migrations...
python manage.py migrate ai_assistant

echo.
echo Etape 3: Application de toutes les migrations restantes...
python manage.py migrate

echo.
echo ========================================
if %ERRORLEVEL% EQU 0 (
    echo Migrations appliquees avec succes!
) else (
    echo ERREUR lors de l'application des migrations!
    echo Verifiez les erreurs ci-dessus.
)
echo ========================================
echo.
pause

