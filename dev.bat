@echo off
title Universal Media Downloader - Entorno de Desarrollo
echo ========================================================
echo  Iniciando Universal Media Downloader en Modo Desarrollo
echo ========================================================

node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado en el sistema.
    pause
    exit /b 1
)

echo [1/2] Verificando dependencias...
call npm install

echo [2/2] Lanzando servidor de desarrollo...
call npm run dev
pause
