import React from 'react';
import {
  Pause,
  Play,
  X,
  RotateCcw,
  Trash2,
  FolderOpen,
  FileCheck,
  Film,
  Music,
  AlertCircle,
  Clock,
  Zap,
  CheckCircle,
  Inbox,
} from 'lucide-react';
import { DownloadTask } from '../types/index.ts';

interface DownloadQueueViewProps {
  tasks: DownloadTask[];
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
  onClearCompleted: () => void;
  onOpenFile: (filePath?: string) => void;
  onOpenFolder: (folderPath?: string) => void;
}

export const DownloadQueueView: React.FC<DownloadQueueViewProps> = ({
  tasks,
  onPause,
  onResume,
  onCancel,
  onRetry,
  onRemove,
  onClearCompleted,
  onOpenFile,
  onOpenFolder,
}) => {
  if (tasks.length === 0) {
    return (
      <div
        id="empty-queue-container"
        className="w-full rounded-2xl bg-[#111827] border border-[#1E293B] p-12 text-center flex flex-col items-center justify-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-[#0F172A] border border-[#1E293B] flex items-center justify-center mb-4 text-[#94A3B8]">
          <Inbox className="w-8 h-8 stroke-1 text-blue-400/80" />
        </div>
        <h3 className="text-base font-semibold text-[#F8FAFC]">
          No hay descargas activas en la cola
        </h3>
        <p className="text-xs md:text-sm text-[#94A3B8] max-w-sm mt-1.5">
          Pega un enlace en el cuadro superior y presiona &quot;Analizar&quot; para comenzar a descargar tus videos o canciones favoritas.
        </p>
      </div>
    );
  }

  const completedCount = tasks.filter((t) =>
    ['COMPLETED', 'FAILED', 'CANCELLED'].includes(t.status)
  ).length;

  return (
    <div id="download-queue-section" className="w-full space-y-4">
      {/* Header bar of Queue */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5">
          <h3 className="text-base font-bold text-[#F8FAFC]">
            Cola de Descargas
          </h3>
          <span className="px-2 py-0.5 rounded-full bg-blue-950 border border-blue-800 text-blue-400 font-mono text-xs font-semibold">
            {tasks.length} {tasks.length === 1 ? 'tarea' : 'tareas'}
          </span>
        </div>

        {completedCount > 0 && (
          <button
            id="clear-completed-tasks-btn"
            onClick={onClearCompleted}
            className="text-xs text-[#94A3B8] hover:text-[#F8FAFC] hover:underline transition flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Limpiar finalizadas
          </button>
        )}
      </div>

      {/* Task Cards List */}
      <div className="space-y-3">
        {tasks.map((task) => {
          const isDownloading = task.status === 'DOWNLOADING';
          const isProcessing = task.status === 'PROCESSING';
          const isCompleted = task.status === 'COMPLETED';
          const isPaused = task.status === 'PAUSED';
          const isFailed = task.status === 'FAILED';
          const isQueued = task.status === 'QUEUED';
          const isCancelled = task.status === 'CANCELLED';

          return (
            <div
              key={task.id}
              id={`task-card-${task.id}`}
              className="p-4 rounded-xl bg-[#111827] border border-[#1E293B] hover:border-[#1E293B]/80 shadow-md transition-all relative overflow-hidden"
            >
              {/* Progress Background bar for subtle atmosphere */}
              <div
                className="absolute top-0 left-0 bottom-0 opacity-5 pointer-events-none transition-all duration-300"
                style={{
                  width: `${task.progress}%`,
                  backgroundColor: isCompleted ? '#10B981' : isFailed ? '#EF4444' : '#3B82F6',
                }}
              />

              <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                {/* Media icon or thumbnail */}
                <div className="flex items-center gap-3.5 w-full md:w-auto flex-1 min-w-0">
                  <div className="w-14 h-14 rounded-lg bg-[#0F172A] border border-[#1E293B] overflow-hidden shrink-0 flex items-center justify-center">
                    {task.thumbnail ? (
                      <img
                        src={task.thumbnail}
                        alt={task.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : task.mode === 'audio' ? (
                      <Music className="w-6 h-6 text-blue-400" />
                    ) : (
                      <Film className="w-6 h-6 text-blue-400" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-[#F8FAFC] truncate" title={task.title}>
                        {task.title}
                      </h4>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-[#94A3B8]">
                      {/* Format Badge */}
                      <span className="px-1.5 py-0.5 rounded bg-[#0F172A] border border-[#1E293B] font-mono text-[10px] text-blue-300 uppercase">
                        {task.mode} · {task.format} · {task.quality}
                      </span>

                      {/* Status label */}
                      <span
                        className={`text-[11px] font-semibold flex items-center gap-1 ${
                          isCompleted
                            ? 'text-[#10B981]'
                            : isFailed
                            ? 'text-[#EF4444]'
                            : isDownloading
                            ? 'text-[#3B82F6]'
                            : isProcessing
                            ? 'text-amber-400'
                            : 'text-[#94A3B8]'
                        }`}
                      >
                        {isCompleted && <CheckCircle className="w-3.5 h-3.5" />}
                        {isFailed && <AlertCircle className="w-3.5 h-3.5" />}
                        {isDownloading && <Zap className="w-3.5 h-3.5 animate-pulse" />}
                        {task.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Metrics: Progress %, Speed, ETA, Size (Mono font) */}
                <div className="w-full md:w-72 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-[#F8FAFC]">
                      {task.progress.toFixed(1)}%
                    </span>
                    <span className="text-[#94A3B8] text-[11px]">
                      {task.speed}
                    </span>
                    {task.eta && task.eta !== '--:--' && (
                      <span className="text-[#94A3B8] text-[11px] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-blue-400" />
                        ETA {task.eta}
                      </span>
                    )}
                  </div>

                  {/* Real Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-[#0F172A] border border-[#1E293B] overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        isCompleted
                          ? 'bg-[#10B981]'
                          : isFailed
                          ? 'bg-[#EF4444]'
                          : isPaused
                          ? 'bg-amber-500'
                          : 'bg-gradient-to-r from-[#3B82F6] to-[#2563EB]'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, task.progress))}%` }}
                    />
                  </div>

                  {/* Total Size indicator */}
                  {task.totalFormatted && (
                    <div className="text-[10px] font-mono text-[#94A3B8] text-right">
                      {task.totalFormatted}
                    </div>
                  )}

                  {/* Error display */}
                  {task.error && (
                    <div className="text-[11px] text-[#EF4444] line-clamp-1 mt-0.5" title={task.error}>
                      {task.error}
                    </div>
                  )}
                </div>

                {/* Action Controls */}
                <div className="flex items-center gap-1.5 self-end md:self-center shrink-0">
                  {/* Downloading -> Pause */}
                  {isDownloading && (
                    <button
                      id={`pause-btn-${task.id}`}
                      onClick={() => onPause(task.id)}
                      title="Pausar descarga"
                      className="p-2 rounded-lg bg-[#0F172A] border border-[#1E293B] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-blue-500/50 transition"
                    >
                      <Pause className="w-4 h-4" />
                    </button>
                  )}

                  {/* Paused -> Resume */}
                  {isPaused && (
                    <button
                      id={`resume-btn-${task.id}`}
                      onClick={() => onResume(task.id)}
                      title="Reanudar descarga"
                      className="p-2 rounded-lg bg-[#0F172A] border border-[#1E293B] text-[#3B82F6] hover:text-white hover:bg-[#3B82F6] transition"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                  )}

                  {/* Active -> Cancel */}
                  {(isDownloading || isProcessing || isQueued || isPaused) && (
                    <button
                      id={`cancel-btn-${task.id}`}
                      onClick={() => onCancel(task.id)}
                      title="Cancelar descarga"
                      className="p-2 rounded-lg bg-[#0F172A] border border-[#1E293B] text-[#94A3B8] hover:text-[#EF4444] hover:border-red-500/50 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}

                  {/* Failed -> Retry */}
                  {isFailed && (
                    <button
                      id={`retry-btn-${task.id}`}
                      onClick={() => onRetry(task.id)}
                      title="Reintentar descarga"
                      className="p-2 rounded-lg bg-[#0F172A] border border-[#1E293B] text-blue-400 hover:text-white hover:bg-blue-600 transition"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}

                  {/* Completed Actions: Open file & folder */}
                  {isCompleted && (
                    <>
                      <button
                        id={`open-file-btn-${task.id}`}
                        onClick={() => onOpenFile(task.filePath)}
                        title="Abrir archivo"
                        className="p-2 rounded-lg bg-[#0F172A] border border-[#1E293B] text-emerald-400 hover:text-white hover:bg-emerald-600 transition"
                      >
                        <FileCheck className="w-4 h-4" />
                      </button>
                      <button
                        id={`open-folder-btn-${task.id}`}
                        onClick={() => onOpenFolder(task.downloadDir)}
                        title="Abrir carpeta de destino"
                        className="p-2 rounded-lg bg-[#0F172A] border border-[#1E293B] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-blue-500/50 transition"
                      >
                        <FolderOpen className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {/* Remove completed/failed/cancelled */}
                  {(isCompleted || isFailed || isCancelled) && (
                    <button
                      id={`remove-task-btn-${task.id}`}
                      onClick={() => onRemove(task.id)}
                      title="Eliminar de la lista"
                      className="p-2 rounded-lg bg-[#0F172A] border border-[#1E293B] text-[#94A3B8] hover:text-red-400 hover:border-red-500/40 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
