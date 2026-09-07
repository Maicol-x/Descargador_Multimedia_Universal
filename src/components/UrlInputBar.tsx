import React, { useState } from 'react';
import { Search, Clipboard, X, Loader2, Sparkles } from 'lucide-react';

interface UrlInputBarProps {
  url: string;
  setUrl: (url: string) => void;
  onAnalyze: (customUrl?: string) => void;
  isLoading: boolean;
  error?: string | null;
}

export const UrlInputBar: React.FC<UrlInputBarProps> = ({
  url,
  setUrl,
  onAnalyze,
  isLoading,
  error,
}) => {
  const [copiedNotification, setCopiedNotification] = useState(false);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        setCopiedNotification(true);
        setTimeout(() => setCopiedNotification(false), 2000);
      }
    } catch {
      // Clipboard access denied or not supported in iframe
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading && url.trim()) {
      onAnalyze();
    }
  };

  const sampleLinks = [
    {
      name: 'Big Buck Bunny (Video Prueba)',
      url: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/1080/Big_Buck_Bunny_1080_10s_1MB.mp4',
    },
    {
      name: 'YouTube Blender Foundation',
      url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    },
    {
      name: 'SoundCloud Audio',
      url: 'https://soundcloud.com/nocopyrightsounds/cartoon-on-on-ft-daniel-levi',
    },
  ];

  return (
    <div className="w-full">
      <div className="relative flex flex-col md:flex-row items-center gap-2 p-2 rounded-2xl bg-[#111827] border border-[#1E293B] shadow-xl shadow-black/40 focus-within:border-[#3B82F6] focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
        {/* Search Icon */}
        <div className="hidden sm:flex items-center justify-center pl-3 text-[#94A3B8]">
          <Search className="w-5 h-5" />
        </div>

        {/* Input */}
        <input
          id="url-input-field"
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pega aquí el enlace de YouTube, TikTok, X, Instagram, SoundCloud, etc..."
          disabled={isLoading}
          className="w-full py-2.5 px-3 bg-transparent text-[#F8FAFC] placeholder-[#94A3B8]/60 text-sm md:text-base outline-none disabled:opacity-60"
        />

        {/* Action icons inside input */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto w-full md:w-auto justify-end">
          {url && (
            <button
              id="clear-url-btn"
              onClick={() => setUrl('')}
              title="Borrar URL"
              className="p-2 text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B] rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            id="paste-clipboard-btn"
            onClick={handlePaste}
            title="Pegar del portapapeles"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0F172A] border border-[#1E293B] text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC] hover:border-blue-500/40 transition whitespace-nowrap"
          >
            <Clipboard className="w-3.5 h-3.5 text-blue-400" />
            <span>{copiedNotification ? '¡Pegado!' : 'Pegar'}</span>
          </button>

          {/* Primary Analyze Button */}
          <button
            id="analyze-url-btn"
            onClick={() => onAnalyze()}
            disabled={isLoading || !url.trim()}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#2563EB] hover:from-[#2563EB] hover:to-blue-700 text-white text-sm font-semibold shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analizando...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Analizar</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Human error banner */}
      {error && (
        <div
          id="url-error-banner"
          className="mt-3 p-3.5 rounded-xl bg-red-950/40 border border-[#EF4444]/40 text-[#EF4444] text-xs md:text-sm flex items-start gap-2.5 animate-in fade-in"
        >
          <span className="w-2 h-2 rounded-full bg-[#EF4444] mt-1.5 shrink-0"></span>
          <div>
            <p className="font-semibold">No se pudo procesar el contenido:</p>
            <p className="text-red-300/90 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Quick Test Samples */}
      <div className="mt-3 flex items-center flex-wrap gap-2 text-xs text-[#94A3B8]">
        <span className="flex items-center gap-1 font-medium text-[#94A3B8]/80">
          <Sparkles className="w-3 h-3 text-blue-400" />
          Probar con enlaces de ejemplo:
        </span>
        {sampleLinks.map((sample, idx) => (
          <button
            key={idx}
            onClick={() => {
              setUrl(sample.url);
              onAnalyze(sample.url);
            }}
            className="px-2.5 py-1 rounded-md bg-[#111827] border border-[#1E293B] hover:border-blue-500/50 hover:text-[#F8FAFC] transition"
          >
            {sample.name}
          </button>
        ))}
      </div>
    </div>
  );
};
