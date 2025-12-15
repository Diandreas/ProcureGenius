@echo off
echo ========================================
echo Application des migrations Django
echo ========================================
echo.

cd /d "%~dp0"

echo Verification des migrations en attente...
python manage.py showmigrations ai_assistant

echo.
echo Application des migrations...
python manage.py migrate

echo.
echo ========================================
echo Migrations appliquees avec succes!
echo ========================================
echo.
echo Vous pouvez maintenant redemarrer le serveur Django.
pause

