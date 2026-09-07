import React, { useState } from 'react';
import { X, CheckSquare, Square, Download, ListMusic, Clock } from 'lucide-react';
import { PlaylistEntry } from '../types/index.ts';

interface PlaylistSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlistTitle: string;
  entries: PlaylistEntry[];
  onConfirmSelection: (selectedEntries: PlaylistEntry[]) => void;
}

export const PlaylistSelectorModal: React.FC<PlaylistSelectorModalProps> = ({
  isOpen,
  onClose,
  playlistTitle,
  entries,
  onConfirmSelection,
}) => {
  const [selectedMap, setSelectedMap] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    entries.forEach((e) => {
      initial[e.id] = true;
    });
    return initial;
  });

  if (!isOpen) return null;

  const toggleItem = (id: string) => {
    setSelectedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const selectAll = () => {
    const updated: Record<string, boolean> = {};
    entries.forEach((e) => {
      updated[e.id] = true;
    });
    setSelectedMap(updated);
  };

  const deselectAll = () => {
    const updated: Record<string, boolean> = {};
    entries.forEach((e) => {
      updated[e.id] = false;
    });
    setSelectedMap(updated);
  };

  const selectedCount = Object.values(selectedMap).filter(Boolean).length;

  const handleDownload = () => {
    const selected = entries.filter((e) => selectedMap[e.id]);
    onConfirmSelection(selected);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div
        id="playlist-selector-modal"
        className="w-full max-w-3xl max-h-[85vh] rounded-2xl bg-[#111827] border border-[#1E293B] shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E293B] bg-[#111827]">
          <div className="flex items-center gap-2.5">
            <ListMusic className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-base font-bold text-[#F8FAFC] truncate max-w-md">
                Pistas de la Playlist
              </h3>
              <p className="text-xs text-[#94A3B8] truncate max-w-md">
                {playlistTitle} ({entries.length} elementos detectados)
              </p>
            </div>
          </div>
          <button
            id="close-playlist-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Select All / Deselect All */}
        <div className="flex items-center justify-between px-6 py-3 bg-[#0F172A] border-b border-[#1E293B] text-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={selectAll}
              className="text-blue-400 hover:text-blue-300 transition flex items-center gap-1 font-semibold"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              Seleccionar todas
            </button>
            <span className="text-[#1E293B]">|</span>
            <button
              onClick={deselectAll}
              className="text-[#94A3B8] hover:text-[#F8FAFC] transition flex items-center gap-1"
            >
              <Square className="w-3.5 h-3.5" />
              Deseleccionar todas
            </button>
          </div>

          <div className="font-mono text-xs text-[#94A3B8]">
            <span className="text-blue-400 font-bold">{selectedCount}</span> de{' '}
            {entries.length} seleccionadas
          </div>
        </div>

        {/* List of Entries */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1">
          {entries.map((entry) => {
            const isChecked = Boolean(selectedMap[entry.id]);
            return (
              <div
                key={entry.id}
                onClick={() => toggleItem(entry.id)}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition ${
                  isChecked
                    ? 'bg-[#0F172A] border-blue-500/50 text-[#F8FAFC]'
                    : 'bg-[#111827] border-[#1E293B] text-[#94A3B8] opacity-60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="font-mono text-xs w-6 text-center text-[#94A3B8]">
                    #{entry.index}
                  </span>

                  {entry.thumbnail && (
                    <img
                      src={entry.thumbnail}
                      alt={entry.title}
                      className="w-12 h-9 rounded object-cover shrink-0 bg-black/40"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  )}

                  <span className="text-xs md:text-sm font-medium truncate" title={entry.title}>
                    {entry.title}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {entry.durationFormatted && (
                    <span className="font-mono text-[11px] text-[#94A3B8] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-blue-400" />
                      {entry.durationFormatted}
                    </span>
                  )}
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    className="w-4 h-4 rounded text-blue-600 bg-[#111827] border-[#1E293B] pointer-events-none"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#1E293B] bg-[#111827]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC] transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleDownload}
            disabled={selectedCount === 0}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm font-bold shadow-lg shadow-blue-600/30 flex items-center gap-2 transition disabled:opacity-40"
          >
            <Download className="w-4 h-4" />
            <span>Descargar {selectedCount} Pistas Seleccionadas</span>
          </button>
        </div>
      </div>
    </div>
  );
};
