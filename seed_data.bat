@echo off
echo ========================================
echo  SEED PROCUREGENIUS - Donnees de Demo
echo ========================================
echo.
echo Creation d'un compte avec donnees completes...
echo.

py seed_all_modules.py

echo.
echo ========================================
echo  Seed termine !
echo ========================================
echo.
echo Compte cree :
echo   Username: sophie.martin
echo   Password: password123
echo   URL: http://localhost:3000/
echo.
echo Pour plus d'infos, voir SEED_DATA_GUIDE.md
echo.
pause
