@echo off
title ISistema Comanda - API Server
color 0A

:start
cls
echo.
echo ========================================
echo   ISistema Comanda - API Server
echo ========================================
echo.
echo Iniciando servidor en puerto 3001...
echo Presiona Ctrl+C para detener
echo.

node server.js

echo.
echo Servidor terminado. Reiniciando en 5 segundos...
timeout /t 5 /nobreak
goto start
