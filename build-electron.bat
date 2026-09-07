@echo off
setlocal enabledelayedexpansion
title Universal Media Downloader - Generador de EXE Windows Autonomo
echo ========================================================
echo   UNIVERSAL MEDIA DOWNLOADER - COMPILADOR A WINDOWS EXE
echo ========================================================
echo.

:: 1. Verificar Node.js
echo [1/10] Verificando Node.js...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR CRITICO] Node.js no encontrado en el sistema.
    echo Instala Node.js v18+ desde https://nodejs.org
    pause
    exit /b 1
)

:: 2. Verificar npm
echo [2/10] Verificando npm...
call npm -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR CRITICO] npm no encontrado.
    pause
    exit /b 1
)

:: 3. Instalar / Verificar dependencias
echo [3/10] Verificando dependencias npm...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR CRITICO] Fallo al resolver dependencias de npm.
    pause
    exit /b 1
)

:: 4. GATEKEEPER ESTRICTO DE BINARIOS
echo [4/10] Verificando binarios autonomos de Windows (Gatekeeper)...
call node scripts/verify-binaries.js
if %errorlevel% neq 0 (
    echo.
    echo ========================================================
    echo   [BUILD FAILED] FALTA UNO O MAS BINARIOS CRITICOS
    echo   No se puede compilar el EXE porque no seria autonomo.
    echo ========================================================
    pause
    exit /b 1
)

:: 5. Limpiar compilaciones anteriores
echo [5/10] Limpiando carpetas de compilacion previas...
call node scripts/clean.js

:: 6. Compilar Frontend y Backend (Vite + esbuild CJS)
echo [6/10] Compilando Frontend (React) y Backend (Express CJS)...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR CRITICO] La compilacion del proyecto fallo.
    pause
    exit /b 1
)

:: 7. Validar archivos compilados
echo [7/10] Validando artefactos generados...
if not exist "dist\index.html" (
    echo [ERROR CRITICO] No se genero dist\index.html
    pause
    exit /b 1
)
if not exist "dist\server\app.cjs" (
    echo [ERROR CRITICO] No se genero dist\server\app.cjs
    pause
    exit /b 1
)

:: 8. Empaquetar con electron-builder
echo [8/10] Ejecutando electron-builder para generar instalador y portable...
call npx electron-builder --win
if %errorlevel% neq 0 (
    echo [ERROR CRITICO] electron-builder fallo durante el empaquetado del EXE.
    pause
    exit /b 1
)

:: 9. Verificar salida
echo [9/10] Verificando instaladores generados en dist-electron...
if not exist "dist-electron" (
    echo [ERROR CRITICO] No se encontro la carpeta dist-electron.
    pause
    exit /b 1
)

:: 10. Resumen de exito
echo.
echo ========================================================
echo [10/10] COMPILACION EXITOSA Y AUTONOMA!
echo ========================================================
echo Los ejecutables generados se encuentran en dist-electron:
dir /b "dist-electron\*.exe" 2>nul
echo.
echo La aplicacion incluye yt-dlp.exe, ffmpeg.exe y ffprobe.exe
echo y funciona sin requerir Python ni FFmpeg en la PC del usuario.
echo ========================================================
pause
