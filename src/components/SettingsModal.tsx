import React, { useState, useEffect } from 'react';
import {
  X,
  Folder,
  Sliders,
  Film,
  Music,
  Download,
  RefreshCw,
  Check,
  RotateCcw,
  Cpu,
  Layers,
  Sparkles,
} from 'lucide-react';
import { AppSettings } from '../types/index.ts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
  ytdlpVersion?: string;
  ffmpegVersion?: string;
  onUpdateYtDlp: () => Promise<{ ok: boolean; message: string; version?: string }>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  ytdlpVersion,
  ffmpegVersion,
  onUpdateYtDlp,
}) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [isUpdatingYtDlp, setIsUpdatingYtDlp] = useState(false);
  const [updateMsg, setUpdateMsg] = useState<string | null>(null);
  const [saveFeedback, setSaveFeedback] = useState(false);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  if (!isOpen) return null;

  const handleSelectFolder = async () => {
    // Check if running in Electron with electronAPI
    if ((window as any).electronAPI?.selectDirectory) {
      try {
        const selected = await (window as any).electronAPI.selectDirectory();
        if (selected) {
          setFormData((prev) => ({ ...prev, downloadDir: selected }));
        }
      } catch (err) {
        console.error('Electron folder dialog error:', err);
      }
    }
  };

  const handleSave = () => {
    onSaveSettings(formData);
    setSaveFeedback(true);
    setTimeout(() => {
      setSaveFeedback(false);
      onClose();
    }, 500);
  };

  const handleTriggerUpdate = async () => {
    setIsUpdatingYtDlp(true);
    setUpdateMsg(null);
    try {
      const res = await onUpdateYtDlp();
      setUpdateMsg(res.message);
    } catch (err: any) {
      setUpdateMsg(`Error: ${err.message}`);
    } finally {
      setIsUpdatingYtDlp(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div
        id="settings-modal"
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#111827] border border-[#1E293B] shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E293B] sticky top-0 bg-[#111827] z-10">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-bold text-[#F8FAFC]">
              Configuración de la Aplicación
            </h2>
          </div>
          <button
            id="close-settings-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 text-sm text-[#F8FAFC]">
          {/* Section: General */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400">
              General y Descargas
            </h3>

            {/* Folder Selection */}
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                Carpeta de Descargas Predeterminada
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={formData.downloadDir}
                  onChange={(e) =>
                    setFormData({ ...formData, downloadDir: e.target.value })
                  }
                  className="flex-1 py-2 px-3 rounded-lg bg-[#0F172A] border border-[#1E293B] text-xs font-mono text-[#F8FAFC] focus:border-blue-500 outline-none"
                />
                {(window as any).electronAPI?.selectDirectory && (
                  <button
                    onClick={handleSelectFolder}
                    className="px-3 py-2 rounded-lg bg-[#0F172A] border border-[#1E293B] hover:border-blue-500/50 text-xs font-medium text-blue-400 hover:text-white transition flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Folder className="w-4 h-4" />
                    Examinar
                  </button>
                )}
              </div>
            </div>

            {/* Max Concurrency */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[#94A3B8]">
                  Descargas Simultáneas Máximas
                </label>
                <span className="font-mono text-xs font-bold text-blue-400">
                  {formData.maxConcurrency} trabajadores
                </span>
              </div>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    onClick={() =>
                      setFormData({ ...formData, maxConcurrency: num })
                    }
                    className={`flex-1 py-2 rounded-lg border text-xs font-mono font-bold transition ${
                      formData.maxConcurrency === num
                        ? 'bg-blue-600 border-blue-500 text-white shadow'
                        : 'bg-[#0F172A] border-[#1E293B] text-[#94A3B8] hover:text-[#F8FAFC]'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Playlist folder grouping toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#0F172A] border border-[#1E293B]">
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 text-blue-400" />
                <div>
                  <p className="text-xs font-semibold text-[#F8FAFC]">
                    Crear subcarpeta automática para Playlists
                  </p>
                  <p className="text-[11px] text-[#94A3B8]">
                    Organiza las pistas de una lista en una carpeta con el nombre de la playlist
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={formData.createPlaylistFolder}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    createPlaylistFolder: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded text-blue-600 bg-[#111827] border-[#1E293B] focus:ring-blue-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Section: Multimedia Defaults */}
          <div className="space-y-4 pt-4 border-t border-[#1E293B]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400">
              Preferencias de Medios
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Default Video Format */}
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1.5 flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-blue-400" />
                  Formato de Video
                </label>
                <select
                  value={formData.defaultVideoFormat}
                  onChange={(e) =>
                    setFormData({ ...formData, defaultVideoFormat: e.target.value })
                  }
                  className="w-full py-2 px-3 rounded-lg bg-[#0F172A] border border-[#1E293B] text-xs text-[#F8FAFC] focus:border-blue-500 outline-none"
                >
                  <option value="mp4">MP4 (Estándar universal)</option>
                  <option value="mkv">MKV (Matroska alta fidelidad)</option>
                  <option value="webm">WEBM (Optimizado para web)</option>
                </select>
              </div>

              {/* Default Audio Format */}
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1.5 flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5 text-blue-400" />
                  Formato de Audio
                </label>
                <select
                  value={formData.defaultAudioFormat}
                  onChange={(e) =>
                    setFormData({ ...formData, defaultAudioFormat: e.target.value })
                  }
                  className="w-full py-2 px-3 rounded-lg bg-[#0F172A] border border-[#1E293B] text-xs text-[#F8FAFC] focus:border-blue-500 outline-none"
                >
                  <option value="mp3">MP3 (Máxima compatibilidad)</option>
                  <option value="m4a">M4A / AAC</option>
                  <option value="flac">FLAC (Sin pérdida / Lossless)</option>
                  <option value="wav">WAV (PCM Audio)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section: Engine status & updates */}
          <div className="space-y-4 pt-4 border-t border-[#1E293B]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5" />
              Motores de Procesamiento (yt-dlp & FFmpeg)
            </h3>

            <div className="p-3.5 rounded-xl bg-[#0F172A] border border-[#1E293B] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-[#F8FAFC]">
                    yt-dlp Core
                  </span>
                  <span className="font-mono text-xs text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                    v{ytdlpVersion || 'Detectando'}
                  </span>
                </div>
                <p className="text-[11px] text-[#94A3B8] mt-0.5">
                  Extractor de medios y analizador de flujo multimedia
                </p>
              </div>

              <button
                id="update-ytdlp-engine-btn"
                onClick={handleTriggerUpdate}
                disabled={isUpdatingYtDlp}
                className="px-3.5 py-1.5 rounded-lg bg-[#111827] border border-[#1E293B] hover:border-blue-500 text-xs font-semibold text-blue-400 hover:text-white transition flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isUpdatingYtDlp ? 'animate-spin' : ''}`}
                />
                <span>{isUpdatingYtDlp ? 'Actualizando...' : 'Actualizar yt-dlp'}</span>
              </button>
            </div>

            {updateMsg && (
              <div className="p-2.5 rounded-lg bg-blue-950/40 border border-blue-800 text-xs text-blue-300">
                {updateMsg}
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-[#0F172A] border border-[#1E293B] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-[#F8FAFC]">
                    FFmpeg & FFprobe
                  </span>
                  <span className="font-mono text-xs text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                    {ffmpegVersion || 'Instalado y Operativo'}
                  </span>
                </div>
                <p className="text-[11px] text-[#94A3B8] mt-0.5">
                  Multiplexor de video, transcodificador de audio y motor de merge
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#1E293B] sticky bottom-0 bg-[#111827]">
          <button
            id="cancel-settings-btn"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC] transition"
          >
            Cancelar
          </button>
          <button
            id="save-settings-btn"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-1.5 transition"
          >
            {saveFeedback ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Guardado</span>
              </>
            ) : (
              <span>Guardar Cambios</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
