import React, { useState } from 'react';
import {
  History,
  RotateCcw,
  Trash2,
  FolderOpen,
  FileCheck,
  CheckCircle,
  AlertCircle,
  XCircle,
  Film,
  Music,
  Search,
} from 'lucide-react';
import { DownloadHistoryItem } from '../types/index.ts';

interface HistoryViewProps {
  history: DownloadHistoryItem[];
  onRedownload: (item: DownloadHistoryItem) => void;
  onDeleteItem: (id: string) => void;
  onClearAll: () => void;
  onOpenFile: (filePath?: string) => void;
  onOpenFolder: (filePath?: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  history,
  onRedownload,
  onDeleteItem,
  onClearAll,
  onOpenFile,
  onOpenFolder,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'COMPLETED' | 'FAILED' | 'CANCELLED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredHistory = history.filter((item) => {
    if (filter !== 'ALL' && item.status !== filter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        (item.uploader && item.uploader.toLowerCase().includes(q)) ||
        item.format.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div id="history-view-container" className="w-full space-y-4">
      {/* Top Filter & Actions Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#111827] border border-[#1E293B]">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-blue-400" />
          <h3 className="text-base font-bold text-[#F8FAFC]">
            Historial de Descargas (SQLite)
          </h3>
          <span className="px-2 py-0.5 rounded-full bg-blue-950 border border-blue-800 text-blue-400 font-mono text-xs font-semibold">
            {history.length}
          </span>
        </div>

        {/* Filter Pills & Clear Action */}
        <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center bg-[#0F172A] border border-[#1E293B] rounded-lg p-0.5 text-xs font-medium">
            <button
              id="filter-all-btn"
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1 rounded-md transition ${
                filter === 'ALL'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              Todos
            </button>
            <button
              id="filter-completed-btn"
              onClick={() => setFilter('COMPLETED')}
              className={`px-3 py-1 rounded-md transition ${
                filter === 'COMPLETED'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              Completados
            </button>
            <button
              id="filter-failed-btn"
              onClick={() => setFilter('FAILED')}
              className={`px-3 py-1 rounded-md transition ${
                filter === 'FAILED'
                  ? 'bg-red-600 text-white shadow'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              Fallidos
            </button>
          </div>

          {history.length > 0 && (
            <button
              id="clear-entire-history-btn"
              onClick={onClearAll}
              className="text-xs text-red-400 hover:text-red-300 hover:underline transition flex items-center gap-1 ml-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Borrar todo
            </button>
          )}
        </div>
      </div>

      {/* Search in history */}
      {history.length > 5 && (
        <div className="relative">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-3" />
          <input
            id="history-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filtrar por título, autor o formato..."
            className="w-full py-2 pl-9 pr-3 rounded-lg bg-[#111827] border border-[#1E293B] text-xs text-[#F8FAFC] placeholder-[#94A3B8]/60 focus:border-blue-500 outline-none"
          />
        </div>
      )}

      {/* History Items List */}
      {filteredHistory.length === 0 ? (
        <div className="p-8 rounded-xl bg-[#111827] border border-[#1E293B] text-center text-[#94A3B8] text-sm">
          No se encontraron registros en el historial con los filtros aplicados.
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredHistory.map((item) => {
            const isCompleted = item.status === 'COMPLETED';
            const isFailed = item.status === 'FAILED';

            return (
              <div
                key={item.id}
                id={`history-item-${item.id}`}
                className="p-3.5 rounded-xl bg-[#111827] border border-[#1E293B] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-blue-500/30 transition"
              >
                {/* Media icon or thumbnail */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-lg bg-[#0F172A] border border-[#1E293B] overflow-hidden shrink-0 flex items-center justify-center">
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : item.mode === 'audio' ? (
                      <Music className="w-5 h-5 text-blue-400" />
                    ) : (
                      <Film className="w-5 h-5 text-blue-400" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-[#F8FAFC] truncate" title={item.title}>
                      {item.title}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-[#94A3B8]">
                      <span className="font-mono text-[10px] text-blue-300 uppercase px-1.5 py-0.5 rounded bg-[#0F172A]">
                        {item.format} · {item.quality}
                      </span>
                      {item.fileSize && (
                        <span className="font-mono text-[11px] text-[#94A3B8]">
                          {item.fileSize}
                        </span>
                      )}
                      <span className="text-[11px]">
                        {formatDate(item.completedAt || item.createdAt)}
                      </span>
                      <span
                        className={`text-[11px] font-semibold flex items-center gap-1 ${
                          isCompleted
                            ? 'text-emerald-400'
                            : isFailed
                            ? 'text-red-400'
                            : 'text-gray-400'
                        }`}
                      >
                        {isCompleted && <CheckCircle className="w-3 h-3" />}
                        {isFailed && <AlertCircle className="w-3 h-3" />}
                        {item.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                  <button
                    id={`redownload-history-${item.id}`}
                    onClick={() => onRedownload(item)}
                    title="Descargar nuevamente"
                    className="p-2 rounded-lg bg-[#0F172A] border border-[#1E293B] text-blue-400 hover:text-white hover:bg-blue-600 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>

                  {isCompleted && item.filePath && (
                    <>
                      <button
                        id={`open-file-history-${item.id}`}
                        onClick={() => onOpenFile(item.filePath)}
                        title="Abrir archivo"
                        className="p-2 rounded-lg bg-[#0F172A] border border-[#1E293B] text-emerald-400 hover:text-white hover:bg-emerald-600 transition"
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                      </button>
                      <button
                        id={`open-folder-history-${item.id}`}
                        onClick={() => onOpenFolder(item.filePath)}
                        title="Abrir carpeta"
                        className="p-2 rounded-lg bg-[#0F172A] border border-[#1E293B] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-blue-500/50 transition"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}

                  <button
                    id={`delete-history-item-${item.id}`}
                    onClick={() => onDeleteItem(item.id)}
                    title="Eliminar registro"
                    className="p-2 rounded-lg bg-[#0F172A] border border-[#1E293B] text-[#94A3B8] hover:text-red-400 hover:border-red-500/40 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
