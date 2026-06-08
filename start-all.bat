@echo off
title ISistema Comanda - Inicio completo
color 0B

cd /d "%~dp0"

echo.
echo ========================================
echo   ISistema Comanda
echo   Frontend: http://localhost:5173
echo   API:      http://localhost:3001
echo.
echo   Meseros: misma WiFi, usa la IP que aparece al iniciar
echo   (ej. http://192.168.x.x:5173)
echo.
echo   Si el telefono no conecta, ejecuta como Admin:
echo   abrir-puertos-firewall.bat
echo ========================================
echo.

pnpm start

pause
