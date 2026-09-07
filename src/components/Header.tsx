import React from 'react';
import { Download, History, Settings, Activity, HardDrive, RefreshCw } from 'lucide-react';

interface HeaderProps {
  activeCount: number;
  ytdlpVersion?: string;
  ffmpegStatus?: boolean;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  onOpenDiagnostics: () => void;
  activeTab: 'main' | 'history' | 'queue';
  setActiveTab: (tab: 'main' | 'history' | 'queue') => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeCount,
  ytdlpVersion,
  ffmpegStatus,
  onOpenSettings,
  onOpenHistory,
  onOpenDiagnostics,
  activeTab,
  setActiveTab,
}) => {
  return (
    <header
      id="app-header"
      className="sticky top-0 z-30 w-full border-b border-[#1E293B] bg-[#0A0E17]/90 backdrop-blur-md px-4 sm:px-8 py-3.5"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('main')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-sky-500 flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-blue-400/30">
            <Download className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-[#F8FAFC]">
                Universal Media Downloader
              </h1>
              <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-950/80 text-blue-400 border border-blue-800/60">
                PRO
              </span>
            </div>
            <p className="text-xs text-[#94A3B8]">
              Descargador multimedia autónomo con yt-dlp & FFmpeg
            </p>
          </div>
        </div>

        {/* Status Indicators & Navigation */}
        <div className="flex items-center flex-wrap justify-center gap-2">
          {/* Quick Engine Badges */}
          <div className="hidden lg:flex items-center gap-2 mr-2 text-xs font-mono">
            {ytdlpVersion && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#111827] border border-[#1E293B] text-[#94A3B8]">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                yt-dlp {ytdlpVersion}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#111827] border border-[#1E293B] text-[#94A3B8]">
              <span
                className={`w-2 h-2 rounded-full ${
                  ffmpegStatus !== false ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              ></span>
              FFmpeg {ffmpegStatus !== false ? 'Activo' : 'Detectando'}
            </span>
          </div>

          {/* Navigation Pills */}
          <div className="flex items-center bg-[#111827] border border-[#1E293B] rounded-lg p-0.5">
            <button
              id="tab-downloader-btn"
              onClick={() => setActiveTab('main')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'main'
                  ? 'bg-[#3B82F6] text-white shadow'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              Descargas
            </button>
            <button
              id="tab-queue-btn"
              onClick={() => setActiveTab('queue')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'queue'
                  ? 'bg-[#3B82F6] text-white shadow'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              Cola
              {activeCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-white text-blue-700">
                  {activeCount}
                </span>
              )}
            </button>
            <button
              id="tab-history-btn"
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-[#3B82F6] text-white shadow'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Historial
            </button>
          </div>

          {/* Actions: Diagnostics & Settings */}
          <button
            id="open-diagnostics-btn"
            onClick={onOpenDiagnostics}
            title="Diagnóstico del Sistema"
            className="p-2 rounded-lg bg-[#111827] border border-[#1E293B] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-blue-500/50 hover:bg-[#1E293B]/60 transition"
          >
            <Activity className="w-4 h-4" />
          </button>

          <button
            id="open-settings-btn"
            onClick={onOpenSettings}
            title="Configuración"
            className="p-2 rounded-lg bg-[#111827] border border-[#1E293B] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-blue-500/50 hover:bg-[#1E293B]/60 transition"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
