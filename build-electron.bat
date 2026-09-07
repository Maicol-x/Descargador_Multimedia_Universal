@echo off
setlocal enabledelayedexpansion
title Universal Media Downloader - Generador de EXE Windows Autonomo
echo ========================================================
echo   UNIVERSAL MEDIA DOWNLOADER - COMPILADOR A WINDOWS EXE
echo ========================================================
echo.

:: 1. Verificar Node.js
echo [1/13] Verificando Node.js...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo ETAPA: 1
    echo ERROR: Node.js no encontrado.
    echo CAUSA: No se encuentra en el PATH del sistema.
    echo SOLUCION: Instala Node.js v18+ desde https://nodejs.org
    pause
    exit /b 1
)

:: 2. Verificar npm
echo [2/13] Verificando npm...
call npm -v >nul 2>&1
if %errorlevel% neq 0 (
    echo ETAPA: 2
    echo ERROR: npm no encontrado.
    pause
    exit /b 1
)

:: 3. Verificar dependencias
echo [3/13] Verificando dependencias npm...
call npm install
if %errorlevel% neq 0 (
    echo ETAPA: 3
    echo ERROR: Fallo al instalar dependencias de npm.
    pause
    exit /b 1
)

:: 4. Construir frontend
echo [4/13] Compilando frontend React con Vite...
call npm run build
if %errorlevel% neq 0 (
    echo ETAPA: 4
    echo ERROR: La compilacion del frontend fallo.
    pause
    exit /b 1
)

:: 5. Preparar backend
echo [5/13] Validando servicios backend...
if not exist "server\app.ts" (
    echo ETAPA: 5
    echo ERROR: No se encuentra server\app.ts
    pause
    exit /b 1
)

:: 6. Preparar Electron
echo [6/13] Verificando archivos de Electron...
if not exist "electron\main.cjs" (
    echo ETAPA: 6
    echo ERROR: Archivo electron\main.cjs no encontrado.
    pause
    exit /b 1
)
if not exist "electron\preload.cjs" (
    echo ETAPA: 6
    echo ERROR: Archivo electron\preload.cjs no encontrado.
    pause
    exit /b 1
)

:: 7. Verificar yt-dlp
echo [7/13] Verificando y empaquetando yt-dlp.exe...
call node scripts/download-binaries.js

:: 8. Verificar FFmpeg
echo [8/13] Verificando FFmpeg...
if not exist "binaries\ffmpeg.exe" (
    where ffmpeg >nul 2>&1
    if %errorlevel% equ 0 (
        for /f "tokens=*" %%i in ('where ffmpeg') do (
            echo Copiando ffmpeg del sistema: %%i
            copy "%%i" "binaries\ffmpeg.exe" >nul
            goto :ffmpeg_done
        )
    )
    echo [INFO] Se recomienda colocar ffmpeg.exe en la carpeta binaries\ para autonomia total.
)
:ffmpeg_done

:: 9. Verificar FFprobe
echo [9/13] Verificando FFprobe...
if not exist "binaries\ffprobe.exe" (
    where ffprobe >nul 2>&1
    if %errorlevel% equ 0 (
        for /f "tokens=*" %%i in ('where ffprobe') do (
            copy "%%i" "binaries\ffprobe.exe" >nul
        )
    )
)

:: 10. Preparar recursos
echo [10/13] Preparando carpeta de recursos...
if not exist "binaries" mkdir "binaries"

:: 11. Ejecutar electron-builder
echo [11/13] Ejecutando electron-builder para generar EXE...
call npx electron-builder --win
if %errorlevel% neq 0 (
    echo ETAPA: 11
    echo ERROR: electron-builder fallo durante el empaquetado.
    pause
    exit /b 1
)

:: 12. Verificar salida
echo [12/13] Verificando archivos generados en dist-electron...
if not exist "dist-electron" (
    echo ETAPA: 12
    echo ERROR: No se genero la carpeta dist-electron.
    pause
    exit /b 1
)

:: 13. Mostrar ubicación del EXE
echo.
echo ========================================================
echo [13/13] COMPILACION EXITOSA!
echo ========================================================
echo El instalador y version portable se encuentran en:
dir /b "dist-electron\*.exe"
echo.
echo La aplicacion esta lista para ejecutarse en cualquier PC con Windows limpio.
echo ========================================================
pause
