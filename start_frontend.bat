@echo off
echo Démarrage du frontend React...
echo.

echo Installation des dépendances (si nécessaire)...
npm install

echo.
echo Démarrage du serveur de développement...
echo.
echo Le frontend sera accessible sur http://localhost:3000
echo Le backend doit tourner sur http://localhost:8000
echo.
echo Appuyez sur Ctrl+C pour arrêter le serveur
echo.

npm run dev
