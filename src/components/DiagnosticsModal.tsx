import React, { useState, useEffect } from 'react';
import {
  X,
  Activity,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Server,
  Database,
  Terminal,
  FolderCheck,
  ShieldCheck,
  Cpu,
} from 'lucide-react';
import { DiagnosticResult } from '../types/index.ts';

interface DiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunDiagnostics: () => Promise<DiagnosticResult>;
}

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({
  isOpen,
  onClose,
  onRunDiagnostics,
}) => {
  const [data, setData] = useState<DiagnosticResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchDiagnostics = async () => {
    setIsLoading(true);
    try {
      const res = await onRunDiagnostics();
      setData(res);
    } catch (err) {
      console.error('Failed to run diagnostics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDiagnostics();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div
        id="diagnostics-modal"
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#111827] border border-[#1E293B] shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E293B] sticky top-0 bg-[#111827] z-10">
          <div className="flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-[#F8FAFC]">
              Diagnóstico de Salud del Sistema
            </h2>
          </div>
          <button
            id="close-diagnostics-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs md:text-sm">
          {isLoading && !data ? (
            <div className="p-12 text-center text-[#94A3B8] flex flex-col items-center justify-center">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-3" />
              <span>Ejecutando pruebas de integridad y detección de binarios...</span>
            </div>
          ) : data ? (
            <div className="space-y-3">
              {/* Item: Core Server */}
              <div className="p-3.5 rounded-xl bg-[#0F172A] border border-[#1E293B] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Server className="w-5 h-5 text-blue-400" />
                  <div>
                    <h4 className="font-semibold text-[#F8FAFC]">
                      Servidor & Motor Central
                    </h4>
                    <p className="text-xs text-[#94A3B8] font-mono">
                      {data.app.version}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>En Línea</span>
                </div>
              </div>

              {/* Item: SQLite */}
              <div className="p-3.5 rounded-xl bg-[#0F172A] border border-[#1E293B] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-blue-400" />
                  <div>
                    <h4 className="font-semibold text-[#F8FAFC]">
                      Base de Datos Local SQLite
                    </h4>
                    <p className="text-xs text-[#94A3B8] font-mono truncate max-w-xs md:max-w-md">
                      {data.database.path}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Activa (WAL)</span>
                </div>
              </div>

              {/* Item: yt-dlp */}
              <div className="p-3.5 rounded-xl bg-[#0F172A] border border-[#1E293B] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Terminal className="w-5 h-5 text-blue-400" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-[#F8FAFC]">
                        Motor yt-dlp
                      </h4>
                      <span className="font-mono text-[11px] text-blue-300">
                        {data.ytdlp.version}
                      </span>
                    </div>
                    <p className="text-xs text-[#94A3B8] font-mono truncate max-w-xs md:max-w-md">
                      Ruta: {data.ytdlp.path}
                    </p>
                  </div>
                </div>
                <div
                  className={`flex items-center gap-1.5 font-semibold text-xs ${
                    data.ytdlp.ok ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {data.ytdlp.ok ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Listo</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" />
                      <span>Error</span>
                    </>
                  )}
                </div>
              </div>

              {/* Item: FFmpeg */}
              <div className="p-3.5 rounded-xl bg-[#0F172A] border border-[#1E293B] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Cpu className="w-5 h-5 text-blue-400" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-[#F8FAFC]">
                        FFmpeg Multiplexor
                      </h4>
                      <span className="font-mono text-[11px] text-blue-300">
                        {data.ffmpeg.version}
                      </span>
                    </div>
                    <p className="text-xs text-[#94A3B8] font-mono truncate max-w-xs md:max-w-md">
                      Ruta: {data.ffmpeg.path}
                    </p>
                  </div>
                </div>
                <div
                  className={`flex items-center gap-1.5 font-semibold text-xs ${
                    data.ffmpeg.ok ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {data.ffmpeg.ok ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Detectado</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" />
                      <span>Falta</span>
                    </>
                  )}
                </div>
              </div>

              {/* Item: FFprobe */}
              <div className="p-3.5 rounded-xl bg-[#0F172A] border border-[#1E293B] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-blue-400" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-[#F8FAFC]">
                        FFprobe Analizador
                      </h4>
                      <span className="font-mono text-[11px] text-blue-300">
                        {data.ffprobe.version}
                      </span>
                    </div>
                    <p className="text-xs text-[#94A3B8] font-mono truncate max-w-xs md:max-w-md">
                      Ruta: {data.ffprobe.path}
                    </p>
                  </div>
                </div>
                <div
                  className={`flex items-center gap-1.5 font-semibold text-xs ${
                    data.ffprobe.ok ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {data.ffprobe.ok ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Detectado</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" />
                      <span>Falta</span>
                    </>
                  )}
                </div>
              </div>

              {/* Item: Download Directory Writable */}
              <div className="p-3.5 rounded-xl bg-[#0F172A] border border-[#1E293B] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FolderCheck className="w-5 h-5 text-blue-400" />
                  <div>
                    <h4 className="font-semibold text-[#F8FAFC]">
                      Permisos de Descarga en Disco
                    </h4>
                    <p className="text-xs text-[#94A3B8] font-mono truncate max-w-xs md:max-w-md">
                      {data.downloadDir.path}
                    </p>
                  </div>
                </div>
                <div
                  className={`flex items-center gap-1.5 font-semibold text-xs ${
                    data.downloadDir.ok ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {data.downloadDir.ok ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Escritura OK</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" />
                      <span>Sin permisos</span>
                    </>
                  )}
                </div>
              </div>

              {/* Environment Info */}
              <div className="p-3.5 rounded-xl bg-[#111827] border border-[#1E293B] text-[11px] font-mono text-[#94A3B8] flex flex-wrap gap-4">
                <span>Plataforma: {data.environment.platform}</span>
                <span>Arquitectura: {data.environment.arch}</span>
                <span>Node: {data.environment.nodeVersion}</span>
                <span>
                  Modo: {data.environment.isElectron ? 'Electron Desktop' : 'Web Browser'}
                </span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#1E293B] sticky bottom-0 bg-[#111827]">
          <button
            id="re-run-diagnostics-btn"
            onClick={fetchDiagnostics}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl bg-[#0F172A] border border-[#1E293B] hover:border-blue-500 text-xs font-semibold text-blue-400 hover:text-white flex items-center gap-2 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Repetir Diagnóstico</span>
          </button>

          <button
            id="close-diagnostics-footer-btn"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
