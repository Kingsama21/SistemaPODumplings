@echo off
:: Ejecutar como Administrador para permitir acceso desde telefonos en la red WiFi
title ISistema Comanda - Firewall
color 0E

echo.
echo ========================================
echo   Abrir puertos para meseros (WiFi)
echo   5173 = App    3001 = API
echo ========================================
echo.

net session >nul 2>&1
if errorlevel 1 (
  echo ERROR: Ejecuta este archivo como Administrador.
  echo Clic derecho -^> Ejecutar como administrador
  pause
  exit /b 1
)

netsh advfirewall firewall add rule name="ISistema Comanda App" dir=in action=allow protocol=TCP localport=5173
netsh advfirewall firewall add rule name="ISistema Comanda API" dir=in action=allow protocol=TCP localport=3001

echo.
echo Puertos 5173 y 3001 abiertos en el firewall de Windows.
echo Ahora inicia el sistema con start-all.bat
echo.
pause
