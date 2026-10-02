@echo off
title ISistema Comanda - Electron
cd /d "%~dp0"

echo.
echo Compilando frontend...
call pnpm build
if errorlevel 1 (
  echo Error al compilar.
  pause
  exit /b 1
)

echo.
echo Abriendo aplicacion Electron...
call pnpm electron
pause
