# 🌐 Universal Media Downloader — Web & Desktop Autónomo (Windows EXE)

Gestor profesional de descargas multimedia para video, audio y listas de reproducción de alta calidad. Construido con arquitectura híbrida lista para funcionar tanto en la **Web** como aplicación de escritorio nativa **Windows (.EXE portable e instalador)** sin requerir dependencias externas por parte del usuario final.

---

## 🚀 Características Principales

- **🎨 UI/UX Premium Oscura:** Diseñada con la paleta `#0A0E17` (fondo profundo), `#111827` (tarjetas), `#0F172A` (campos) y acentos en azul eléctrico `#3B82F6`.
- **⚡ Análisis Real de URLs:** Extrae miniaturas, autor, canal, duración, formatos reales y detección automática de playlists usando el motor de **yt-dlp**.
- **🎬 Modos de Descarga:**
  - **Video:** Calidades desde 360p hasta 4K (2160p), con conversión y multiplexado a MP4, MKV y WEBM.
  - **Audio:** Extracción automática a MP3, M4A, FLAC y WAV con selección de bitrate (128 kbps hasta 320 kbps de alta fidelidad).
- **📋 Gestión Inteligente de Playlists:** Detección de listas de reproducción con selector interactivo de pistas individuales o descarga por lotes.
- **📊 Cola de Descargas con Métricas en Tiempo Real:** Barra de progreso real, porcentaje exacto, velocidad de transferencia (MB/s), tiempo estimado (ETA), tamaño descargado y tamaño total vía **Server-Sent Events (SSE)**.
- **⏯️ Control Total de Tareas:** Pausar, reanudar, cancelar, reintentar y eliminar tareas de la cola.
- **📁 Exploración Nativa de Archivos:** Acceso directo para abrir la carpeta de destino o el archivo descargado en el explorador del sistema operativo.
- **💾 Persistencia con SQLite:** Historial de descargas con filtros por estado y configuración del usuario almacenada de forma local con soporte WAL.
- **🩺 Panel de Diagnóstico en Vivo:** Verificación de salud del sistema, base de datos SQLite, binarios de yt-dlp, FFmpeg, FFprobe y permisos de escritura en la carpeta de descargas.
- **🔄 Actualizador Integrado de yt-dlp:** Permite actualizar el motor de descarga directamente desde la interfaz con un solo clic.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnologías |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, Motion |
| **Backend** | Node.js, Express, better-sqlite3, Server-Sent Events (SSE) |
| **Multimedia** | yt-dlp, FFmpeg, FFprobe |
| **Desktop** | Electron, electron-builder (Portable + NSIS Installer) |

---

## 💻 Requisitos y Modos de Ejecución

### 1. Modo Desarrollo Web
```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo en puerto 3000
npm run dev
# O en Windows:
dev.bat
```

### 2. Modo Producción Web
```bash
# Compilar frontend
npm run build

# Iniciar servidor Node.js full-stack
npm start
```

### 3. Compilación a Windows .EXE Autónomo
El script automatizado realiza las 13 etapas de validación, descarga de binarios oficiales y empaquetado:
```bash
# En Windows:
build-electron.bat

# O manualmente:
npm run package:binaries
npm run build
npm run dist
```
El ejecutable resultante se genera en la carpeta `dist-electron/` y está listo para ser ejecutado en cualquier PC con Windows 10/11 sin necesidad de tener instalado Node.js, Python, Git ni FFmpeg.

---

## 📂 Estructura del Proyecto

```text
universal-media-downloader/
├── src/
│   ├── components/       # Componentes visuales modulares
│   │   ├── Header.tsx
│   │   ├── UrlInputBar.tsx
│   │   ├── MediaPreviewCard.tsx
│   │   ├── DownloadQueueView.tsx
│   │   ├── HistoryView.tsx
│   │   ├── SettingsModal.tsx
│   │   ├── DiagnosticsModal.tsx
│   │   └── PlaylistSelectorModal.tsx
│   ├── types/            # Definiciones de TypeScript
│   ├── App.tsx           # Dashboard principal
│   └── index.css         # Estilos globales y tokens
├── server/
│   ├── database/         # Motor de base de datos SQLite
│   ├── routes/           # Endpoints REST y streaming SSE
│   ├── services/         # BinaryResolver, YtDlpService, FfmpegService, QueueManager
│   └── app.ts            # Configuración de Express
├── electron/
│   ├── main.cjs          # Proceso principal de Electron con IPC seguro
│   └── preload.cjs       # Context bridge aislado
├── binaries/             # Binarios autónomos (yt-dlp, ffmpeg, ffprobe)
├── scripts/              # Descarga de binarios oficiales
├── build-electron.bat    # Script de empaquetado a .EXE
├── dev.bat               # Script de inicio rápido
├── electron-builder.yml  # Configuración de instalador y versión portable
└── package.json
```

---

## ⚖️ Licencia y Responsabilidad

Este software integra herramientas de código abierto como `yt-dlp` (licencia Unlicense) y `FFmpeg` (licencia LGPL/GPL). La herramienta debe utilizarse de conformidad con las leyes de derechos de autor y los términos de servicio aplicables al contenido descargado. No evade mecanismos de protección digital (DRM).
