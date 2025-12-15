@echo off
echo Démarrage du backend Django...
echo.

echo Application des migrations...
python manage.py migrate

if %ERRORLEVEL% NEQ 0 (
    echo Erreur lors de l'application des migrations!
    pause
    exit /b 1
)

echo.
echo Démarrage du serveur Django sur le port 8000...
echo.
echo Le frontend doit tourner sur http://localhost:3000
echo Le backend sera accessible sur http://localhost:8000
echo.
echo Appuyez sur Ctrl+C pour arrêter le serveur
echo.

python manage.py runserver 8000
