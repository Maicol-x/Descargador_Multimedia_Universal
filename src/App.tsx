import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header.tsx';
import { UrlInputBar } from './components/UrlInputBar.tsx';
import { MediaPreviewCard } from './components/MediaPreviewCard.tsx';
import { DownloadQueueView } from './components/DownloadQueueView.tsx';
import { HistoryView } from './components/HistoryView.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { DiagnosticsModal } from './components/DiagnosticsModal.tsx';
import { PlaylistSelectorModal } from './components/PlaylistSelectorModal.tsx';
import {
  MediaInfo,
  DownloadTask,
  DownloadHistoryItem,
  AppSettings,
  DiagnosticResult,
  MediaType,
  PlaylistEntry,
} from './types/index.ts';

export default function App() {
  // State
  const [url, setUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null);
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const [history, setHistory] = useState<DownloadHistoryItem[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    downloadDir: '',
    maxConcurrency: 3,
    defaultVideoQuality: '1080p',
    defaultVideoFormat: 'mp4',
    defaultAudioFormat: 'mp3',
    defaultAudioBitrate: '320k',
    createPlaylistFolder: true,
    filenameTemplate: '%(title)s.%(ext)s',
    autoStart: true,
  });

  const [activeTab, setActiveTab] = useState<'main' | 'queue' | 'history'>('main');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [ytdlpVersion, setYtdlpVersion] = useState<string>('Detectando...');
  const [ffmpegStatus, setFfmpegStatus] = useState<boolean>(true);

  // SSE event source ref and notified task tracker
  const eventSourceRef = useRef<EventSource | null>(null);
  const notifiedTaskIds = useRef<Set<string>>(new Set());

  // Initial Load: Settings, History, Engine Diagnostics
  useEffect(() => {
    // 1. Fetch settings
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => setSettings(data))
      .catch((err) => console.error('Error fetching settings:', err));

    // 2. Fetch history
    fetch('/api/history')
      .then((res) => res.json())
      .then((data) => setHistory(data))
      .catch((err) => console.error('Error fetching history:', err));

    // 3. Initial Diagnostics for Engine badges
    fetch('/api/diagnostics')
      .then((res) => res.json())
      .then((data: DiagnosticResult) => {
        if (data.ytdlp?.ok) {
          setYtdlpVersion(data.ytdlp.version);
        }
        setFfmpegStatus(Boolean(data.ffmpeg?.ok));
      })
      .catch((err) => console.error('Error loading initial engine status:', err));
  }, []);

  // SSE Real-time connection
  useEffect(() => {
    const connectSSE = () => {
      const es = new EventSource('/api/downloads/events');
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'INIT') {
            setTasks(data.tasks || []);
          } else if (data.type === 'TASK_UPDATED') {
            setTasks((prev) => {
              const idx = prev.findIndex((t) => t.id === data.task.id);
              if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = data.task;
                return updated;
              }
              return [data.task, ...prev];
            });

            // Trigger desktop notification if completed (deduplicated)
            if (data.task.status === 'COMPLETED' && !notifiedTaskIds.current.has(data.task.id)) {
              notifiedTaskIds.current.add(data.task.id);
              if ((window as any).electronAPI?.notify) {
                (window as any).electronAPI.notify({
                  title: 'Descarga Completada',
                  body: `${data.task.title} ha finalizado con éxito.`,
                });
              }
            }

            // Refresh history if task finalized
            if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(data.task.status)) {
              fetch('/api/history')
                .then((res) => res.json())
                .then((h) => setHistory(h))
                .catch(() => {});
            }
          } else if (data.type === 'TASK_REMOVED') {
            setTasks((prev) => prev.filter((t) => t.id !== data.taskId));
          }
        } catch (err) {
          console.error('Error parsing SSE event:', err);
        }
      };

      es.onerror = () => {
        es.close();
        // Reconnect after 3 seconds
        setTimeout(connectSSE, 3000);
      };
    };

    connectSSE();

    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  // 1. Analyze URL Handler
  const handleAnalyze = async (customUrl?: string) => {
    const targetUrl = (customUrl || url).trim();
    if (!targetUrl) return;

    setIsAnalyzing(true);
    setAnalyzeError(null);
    setMediaInfo(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Error al analizar el enlace.');
      }

      setMediaInfo(result);
    } catch (err: any) {
      setAnalyzeError(err.message || 'Error inesperado al conectar con el servidor.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 2. Start Download Handler
  const handleStartDownload = async (config: {
    mode: MediaType;
    format: string;
    quality: string;
    downloadDir?: string;
  }) => {
    if (!mediaInfo) return;

    // Check if playlist
    if (mediaInfo.isPlaylist && mediaInfo.entries && mediaInfo.entries.length > 0) {
      // Download all entries in playlist
      const baseDir = config.downloadDir || settings.downloadDir;
      const safeFolder = (mediaInfo.title || 'Playlist')
        .replace(/[\\/:*?"<>|]/g, '_')
        .trim()
        .substring(0, 80);
      const playlistDir = settings.createPlaylistFolder ? `${baseDir}/${safeFolder}` : baseDir;

      const items = mediaInfo.entries.map((entry) => ({
        url: entry.url,
        title: entry.title,
        uploader: mediaInfo.uploader,
        thumbnail: entry.thumbnail || mediaInfo.thumbnail,
        mode: config.mode,
        format: config.format,
        quality: config.quality,
        downloadDir: playlistDir,
      }));

      try {
        await fetch('/api/download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items }),
        });
        setActiveTab('queue');
      } catch (err) {
        console.error('Error dispatching playlist download:', err);
      }
      return;
    }


    // Single item download
    const item = {
      url: mediaInfo.webpageUrl,
      title: mediaInfo.title,
      uploader: mediaInfo.uploader,
      thumbnail: mediaInfo.thumbnail,
      mode: config.mode,
      format: config.format,
      quality: config.quality,
      downloadDir: config.downloadDir || settings.downloadDir,
    };

    try {
      await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [item] }),
      });
      setActiveTab('queue');
    } catch (err) {
      console.error('Error dispatching download:', err);
    }
  };

  // 3. Playlist Specific Selection Download
  const handlePlaylistSelectionDownload = async (
    selectedEntries: PlaylistEntry[],
    config: { mode: MediaType; format: string; quality: string }
  ) => {
    if (!mediaInfo || selectedEntries.length === 0) return;

    const items = selectedEntries.map((entry) => ({
      url: entry.url,
      title: entry.title,
      uploader: mediaInfo.uploader,
      thumbnail: entry.thumbnail || mediaInfo.thumbnail,
      mode: config.mode,
      format: config.format,
      quality: config.quality,
      downloadDir: settings.downloadDir,
    }));

    try {
      await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      setActiveTab('queue');
    } catch (err) {
      console.error('Error starting playlist items:', err);
    }
  };

  // 4. Queue Control Handlers
  const handlePauseTask = (id: string) => {
    fetch(`/api/downloads/${id}/pause`, { method: 'POST' });
  };

  const handleResumeTask = (id: string) => {
    fetch(`/api/downloads/${id}/resume`, { method: 'POST' });
  };

  const handleCancelTask = (id: string) => {
    fetch(`/api/downloads/${id}/cancel`, { method: 'POST' });
  };

  const handleRetryTask = (id: string) => {
    fetch(`/api/downloads/${id}/retry`, { method: 'POST' });
  };

  const handleRemoveTask = (id: string) => {
    fetch(`/api/downloads/${id}`, { method: 'DELETE' });
  };

  const handleClearCompleted = () => {
    fetch('/api/downloads/clear-completed', { method: 'POST' });
  };

  // 5. Open File / Folder Handlers
  const handleOpenFile = (filePath?: string) => {
    if (!filePath) return;
    if ((window as any).electronAPI?.openFile) {
      (window as any).electronAPI.openFile(filePath);
    } else {
      // In web browser environment, trigger browser direct download of the completed media file
      const link = document.createElement('a');
      link.href = `/api/files/download?path=${encodeURIComponent(filePath)}`;
      link.setAttribute('download', '');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };


  const handleOpenFolder = (folderPath?: string) => {
    const target = folderPath || settings.downloadDir;
    if ((window as any).electronAPI?.showItem) {
      (window as any).electronAPI.showItem(target);
    } else {
      fetch('/api/open-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath: target }),
      });
    }
  };

  // 6. History Handlers
  const handleDeleteHistory = async (id: string) => {
    await fetch(`/api/history/${id}`, { method: 'DELETE' });
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearAllHistory = async () => {
    await fetch('/api/history', { method: 'DELETE' });
    setHistory([]);
  };

  const handleRedownloadHistory = (item: DownloadHistoryItem) => {
    setUrl(item.url);
    handleAnalyze(item.url);
    setActiveTab('main');
  };

  // 7. Settings & Engine Handlers
  const handleSaveSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings),
    });
  };

  const handleUpdateYtDlp = async () => {
    const res = await fetch('/api/ytdlp/update', { method: 'POST' });
    const data = await res.json();
    if (data.version) {
      setYtdlpVersion(data.version);
    }
    return data;
  };

  const handleRunDiagnostics = async (): Promise<DiagnosticResult> => {
    const res = await fetch('/api/diagnostics');
    const data = await res.json();
    if (data.ytdlp?.ok) {
      setYtdlpVersion(data.ytdlp.version);
    }
    setFfmpegStatus(Boolean(data.ffmpeg?.ok));
    return data;
  };

  const activeDownloadsCount = tasks.filter((t) =>
    ['DOWNLOADING', 'PROCESSING', 'QUEUED'].includes(t.status)
  ).length;

  return (
    <div className="min-h-screen bg-[#0A0E17] text-[#F8FAFC] flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Application Header */}
      <Header
        activeCount={activeDownloadsCount}
        ytdlpVersion={ytdlpVersion}
        ffmpegStatus={ffmpegStatus}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHistory={() => setActiveTab('history')}
        onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Tab 1: Main Downloader & Queue Preview */}
        {activeTab === 'main' && (
          <div className="space-y-6 animate-in fade-in">
            {/* Prominent URL Bar */}
            <UrlInputBar
              url={url}
              setUrl={setUrl}
              onAnalyze={handleAnalyze}
              isLoading={isAnalyzing}
              error={analyzeError}
            />

            {/* Media Preview Card */}
            {mediaInfo && (
              <MediaPreviewCard
                mediaInfo={mediaInfo}
                onStartDownload={handleStartDownload}
                downloadDir={settings.downloadDir}
                onOpenPlaylistModal={() => setIsPlaylistModalOpen(true)}
              />
            )}

            {/* Active Queue summary */}
            <DownloadQueueView
              tasks={tasks}
              onPause={handlePauseTask}
              onResume={handleResumeTask}
              onCancel={handleCancelTask}
              onRetry={handleRetryTask}
              onRemove={handleRemoveTask}
              onClearCompleted={handleClearCompleted}
              onOpenFile={handleOpenFile}
              onOpenFolder={handleOpenFolder}
            />
          </div>
        )}

        {/* Tab 2: Full Queue Tab */}
        {activeTab === 'queue' && (
          <div className="animate-in fade-in">
            <DownloadQueueView
              tasks={tasks}
              onPause={handlePauseTask}
              onResume={handleResumeTask}
              onCancel={handleCancelTask}
              onRetry={handleRetryTask}
              onRemove={handleRemoveTask}
              onClearCompleted={handleClearCompleted}
              onOpenFile={handleOpenFile}
              onOpenFolder={handleOpenFolder}
            />
          </div>
        )}

        {/* Tab 3: History View */}
        {activeTab === 'history' && (
          <div className="animate-in fade-in">
            <HistoryView
              history={history}
              onRedownload={handleRedownloadHistory}
              onDeleteItem={handleDeleteHistory}
              onClearAll={handleClearAllHistory}
              onOpenFile={handleOpenFile}
              onOpenFolder={handleOpenFolder}
            />
          </div>
        )}
      </main>

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        ytdlpVersion={ytdlpVersion}
        ffmpegVersion={ffmpegStatus ? '4.4+ Operativo' : 'No detectado'}
        onUpdateYtDlp={handleUpdateYtDlp}
      />

      <DiagnosticsModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
        onRunDiagnostics={handleRunDiagnostics}
      />

      {mediaInfo && mediaInfo.entries && (
        <PlaylistSelectorModal
          isOpen={isPlaylistModalOpen}
          onClose={() => setIsPlaylistModalOpen(false)}
          playlistTitle={mediaInfo.title}
          entries={mediaInfo.entries}
          availableVideoQualities={mediaInfo.availableVideoQualities}
          availableAudioBitrates={mediaInfo.availableAudioBitrates}
          onConfirmSelection={handlePlaylistSelectionDownload}
        />
      )}

      {/* Subtle Footer */}
      <footer className="w-full border-t border-[#1E293B] bg-[#0A0E17] py-4 text-center text-xs text-[#94A3B8]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Universal Media Downloader &copy; {new Date().getFullYear()}</span>
          <span className="text-[11px] text-[#94A3B8]/70">
            Arquitectura Híbrida Web + Electron Autónomo para Windows (.EXE)
          </span>
        </div>
      </footer>
    </div>
  );
}
