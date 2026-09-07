import React, { useState } from 'react';
import {
  Film,
  Music,
  Download,
  Clock,
  User,
  ListMusic,
  Folder,
  CheckCircle2,
  Sliders,
  ExternalLink,
} from 'lucide-react';
import { MediaInfo, MediaType } from '../types/index.ts';

interface MediaPreviewCardProps {
  mediaInfo: MediaInfo;
  onStartDownload: (config: {
    mode: MediaType;
    format: string;
    quality: string;
    downloadDir?: string;
  }) => void;
  downloadDir: string;
  onOpenPlaylistModal?: () => void;
}

export const MediaPreviewCard: React.FC<MediaPreviewCardProps> = ({
  mediaInfo,
  onStartDownload,
  downloadDir,
  onOpenPlaylistModal,
}) => {
  const [mode, setMode] = useState<MediaType>('video');
  const [videoQuality, setVideoQuality] = useState<string>(
    mediaInfo.availableVideoQualities[0] || '1080p'
  );
  const [videoFormat, setVideoFormat] = useState<string>('MP4');
  const [audioBitrate, setAudioBitrate] = useState<string>('320 kbps (Máxima)');
  const [audioFormat, setAudioFormat] = useState<string>('MP3');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDownload = () => {
    setIsSubmitting(true);
    onStartDownload({
      mode,
      format: mode === 'video' ? videoFormat.toLowerCase() : audioFormat.toLowerCase(),
      quality: mode === 'video' ? videoQuality : audioBitrate,
      downloadDir,
    });
    setTimeout(() => setIsSubmitting(false), 800);
  };

  return (
    <div
      id="media-preview-card"
      className="w-full rounded-2xl bg-[#111827] border border-[#1E293B] shadow-2xl p-5 md:p-6 transition-all animate-in fade-in slide-in-from-top-4"
    >
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Thumbnail Preview with Duration & Platform Badge */}
        <div className="relative w-full lg:w-80 aspect-video rounded-xl overflow-hidden bg-[#0A0E17] border border-[#1E293B] shrink-0 group">
          {mediaInfo.thumbnail ? (
            <img
              src={mediaInfo.thumbnail}
              alt={mediaInfo.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                // Fallback placeholder on broken image
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-[#94A3B8] p-4">
              <Film className="w-12 h-12 mb-2 stroke-1 text-[#94A3B8]/60" />
              <span className="text-xs">Sin miniatura disponible</span>
            </div>
          )}

          {/* Duration Badge */}
          {mediaInfo.durationFormatted && (
            <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-black/85 backdrop-blur-md text-white font-mono text-xs font-semibold flex items-center gap-1 border border-white/10">
              <Clock className="w-3 h-3 text-blue-400" />
              {mediaInfo.durationFormatted}
            </div>
          )}

          {/* Platform Badge */}
          {mediaInfo.platform && (
            <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-md bg-blue-600/90 backdrop-blur-md text-white font-bold text-[11px] shadow">
              {mediaInfo.platform}
            </div>
          )}

          {/* Playlist Badge */}
          {mediaInfo.isPlaylist && (
            <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-emerald-600/90 text-white font-bold text-[11px] flex items-center gap-1 shadow">
              <ListMusic className="w-3 h-3" />
              Playlist ({mediaInfo.playlistCount || mediaInfo.entries?.length || 'Varias'})
            </div>
          )}
        </div>

        {/* Media Details & Download Controls */}
        <div className="flex-1 flex flex-col justify-between w-full">
          <div>
            {/* Title & External Link */}
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg md:text-xl font-bold text-[#F8FAFC] leading-snug line-clamp-2">
                {mediaInfo.title}
              </h2>
              {mediaInfo.webpageUrl && (
                <a
                  href={mediaInfo.webpageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-[#94A3B8] hover:text-blue-400 transition shrink-0"
                  title="Abrir enlace original"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>

            {/* Author / Channel */}
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs md:text-sm text-[#94A3B8]">
              <span className="flex items-center gap-1.5 font-medium text-[#F8FAFC]/90">
                <User className="w-3.5 h-3.5 text-blue-400" />
                {mediaInfo.uploader || mediaInfo.channel || 'Autor desconocido'}
              </span>

              {mediaInfo.isPlaylist && onOpenPlaylistModal && (
                <button
                  id="open-playlist-manager-btn"
                  onClick={onOpenPlaylistModal}
                  className="px-2.5 py-1 rounded bg-blue-950 border border-blue-800/80 text-blue-300 text-xs font-medium hover:bg-blue-900 transition flex items-center gap-1"
                >
                  <ListMusic className="w-3.5 h-3.5" />
                  Gestionar pistas individuales
                </button>
              )}
            </div>
          </div>

          {/* Format & Quality Configuration Box */}
          <div className="mt-5 p-4 rounded-xl bg-[#0F172A] border border-[#1E293B]">
            {/* Mode Switch: Video vs Audio */}
            <div className="flex items-center gap-2 mb-4">
              <button
                id="mode-video-btn"
                onClick={() => setMode('video')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs md:text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                  mode === 'video'
                    ? 'bg-[#3B82F6] text-white shadow-md shadow-blue-500/20'
                    : 'bg-[#111827] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#1E293B]'
                }`}
              >
                <Film className="w-4 h-4" />
                <span>Modo Video</span>
              </button>

              <button
                id="mode-audio-btn"
                onClick={() => setMode('audio')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs md:text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                  mode === 'audio'
                    ? 'bg-[#3B82F6] text-white shadow-md shadow-blue-500/20'
                    : 'bg-[#111827] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#1E293B]'
                }`}
              >
                <Music className="w-4 h-4" />
                <span>Modo Audio</span>
              </button>
            </div>

            {/* Quality & Format Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {mode === 'video' ? (
                <>
                  <div>
                    <label className="block text-[11px] font-medium uppercase tracking-wider text-[#94A3B8] mb-1.5">
                      Calidad de Video
                    </label>
                    <select
                      id="video-quality-select"
                      value={videoQuality}
                      onChange={(e) => setVideoQuality(e.target.value)}
                      className="w-full py-2 px-3 rounded-lg bg-[#111827] border border-[#1E293B] text-[#F8FAFC] text-xs md:text-sm focus:border-blue-500 outline-none"
                    >
                      {mediaInfo.availableVideoQualities.map((q) => (
                        <option key={q} value={q} className="bg-[#111827]">
                          {q}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium uppercase tracking-wider text-[#94A3B8] mb-1.5">
                      Formato Contenedor
                    </label>
                    <select
                      id="video-format-select"
                      value={videoFormat}
                      onChange={(e) => setVideoFormat(e.target.value)}
                      className="w-full py-2 px-3 rounded-lg bg-[#111827] border border-[#1E293B] text-[#F8FAFC] text-xs md:text-sm focus:border-blue-500 outline-none"
                    >
                      {mediaInfo.availableVideoFormats.map((f) => (
                        <option key={f} value={f} className="bg-[#111827]">
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-[11px] font-medium uppercase tracking-wider text-[#94A3B8] mb-1.5">
                      Tasa de Bits (Calidad)
                    </label>
                    <select
                      id="audio-bitrate-select"
                      value={audioBitrate}
                      onChange={(e) => setAudioBitrate(e.target.value)}
                      className="w-full py-2 px-3 rounded-lg bg-[#111827] border border-[#1E293B] text-[#F8FAFC] text-xs md:text-sm focus:border-blue-500 outline-none"
                    >
                      {mediaInfo.availableAudioBitrates.map((b) => (
                        <option key={b} value={b} className="bg-[#111827]">
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium uppercase tracking-wider text-[#94A3B8] mb-1.5">
                      Formato de Audio
                    </label>
                    <select
                      id="audio-format-select"
                      value={audioFormat}
                      onChange={(e) => setAudioFormat(e.target.value)}
                      className="w-full py-2 px-3 rounded-lg bg-[#111827] border border-[#1E293B] text-[#F8FAFC] text-xs md:text-sm focus:border-blue-500 outline-none"
                    >
                      {mediaInfo.availableAudioFormats.map((f) => (
                        <option key={f} value={f} className="bg-[#111827]">
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>

            {/* Destination folder preview */}
            <div className="mt-3.5 flex items-center justify-between text-xs text-[#94A3B8] pt-2 border-t border-[#1E293B]">
              <span className="flex items-center gap-1.5 truncate">
                <Folder className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="truncate">Destino: {downloadDir}</span>
              </span>
            </div>
          </div>

          {/* Action Button: Download */}
          <div className="mt-5 flex items-center gap-3">
            <button
              id="start-download-btn"
              onClick={handleDownload}
              disabled={isSubmitting}
              className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#2563EB] hover:from-[#2563EB] hover:to-blue-700 text-white font-bold text-sm md:text-base flex items-center justify-center gap-2.5 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 active:scale-[0.99] transition-all"
            >
              <Download className="w-5 h-5 animate-bounce" />
              <span>
                {mediaInfo.isPlaylist
                  ? `Descargar Playlist Completa (${mediaInfo.entries?.length || ''} pistas)`
                  : 'Descargar Ahora'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
