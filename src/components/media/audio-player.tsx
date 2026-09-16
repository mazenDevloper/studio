
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useMediaStore } from '@/lib/store';
import { useAudioPlayer } from '@/hooks/use-audio-player';
import { Play, Pause, X, Music, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SovereignIframe } from '@/components/ui/sovereign-iframe';

/**
 * Sovereign Audio Player v1.3 - WebM Decoder Protocol
 * Features: Absolute Positioning for persistent decoding & Error Resiliency.
 */
export function AudioPlayer() {
  const { activeAudio, setActiveAudio, isPlaying, setIsPlaying } = useMediaStore();
  const { audioRef, isFallback, loading, setLoading, switchToFallback } = useAudioPlayer();
  const [metadata, setMetadata] = useState<any>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (activeAudio) {
      fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${activeAudio.id}&format=json`)
        .then(res => res.json())
        .then(setMetadata)
        .catch(() => setMetadata(null));
    }
  }, [activeAudio?.id]);

  useEffect(() => {
    if (isFallback || !audioRef.current) return;

    if (isPlaying) {
      playPromiseRef.current = audioRef.current.play();
      playPromiseRef.current?.catch((err) => {
        if (err.name !== 'AbortError') {
          console.warn("[Sovereign Audio] Decoding failed, switching to Fallback:", err);
          switchToFallback();
        }
      });
    } else {
      if (playPromiseRef.current) {
        playPromiseRef.current.then(() => {
          audioRef.current?.pause();
        }).catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, isFallback, switchToFallback, audioRef]);

  if (!activeAudio) return null;

  const streamUrl = `/api/audio-stream?id=${activeAudio.id}`;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[150] w-[90%] max-w-2xl animate-in slide-in-from-bottom-10 duration-500">
      <div className="premium-glass bg-black/90 border-2 border-primary/20 rounded-[3rem] p-6 shadow-[0_0_100px_rgba(0,0,0,0.8)] flex items-center gap-6 relative overflow-hidden">
        
        {isPlaying && <div className="absolute inset-0 bg-primary/5 animate-pulse pointer-events-none" />}

        <div className="relative w-24 h-24 rounded-[2rem] overflow-hidden border-2 border-white/10 shrink-0 shadow-2xl">
          <img src={activeAudio.thumbnail} className={cn("w-full h-full object-cover transition-transform duration-[10000ms]", isPlaying && "scale-125")} alt="" />
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            {loading && !isFallback ? <Loader2 className="w-8 h-8 animate-spin text-white" /> : <Music className="w-8 h-8 text-white/40" />}
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-col">
             <h3 className="text-xl font-black text-white truncate leading-tight drop-shadow-md">{activeAudio.title}</h3>
             <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mt-1">{metadata?.author_name || "Sovereign Stream"}</p>
          </div>

          <div className="flex items-center gap-4">
             <button 
               onClick={() => setIsPlaying(!isPlaying)}
               className="w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center shadow-glow active:scale-90 transition-all focusable"
             >
                {isPlaying ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current ml-1" />}
             </button>

             <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden relative">
                <div className={cn("h-full bg-primary transition-all duration-300", isPlaying ? "w-1/3" : "w-0")} />
             </div>

             {isFallback && (
               <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/20 rounded-full border border-yellow-500/30 animate-in fade-in">
                  <AlertTriangle className="w-3 h-3 text-yellow-500" />
                  <span className="text-[8px] font-black text-yellow-500 uppercase tracking-widest">Fallback Active</span>
               </div>
             )}
          </div>
        </div>

        <button 
          onClick={() => { setIsPlaying(false); setActiveAudio(null); }}
          className="w-12 h-12 rounded-full bg-white/5 hover:bg-red-600/20 text-white/40 hover:text-red-500 flex items-center justify-center border border-white/10 transition-all focusable shrink-0"
        >
          <X className="w-6 h-6" />
        </button>

        {/* HIDDEN BACKEND ENGINE - Using absolute positioning to stay decoded but invisible */}
        {!isFallback ? (
          <audio 
            key={activeAudio.id}
            ref={audioRef}
            src={streamUrl}
            preload="auto"
            playsInline
            onPlay={() => { setLoading(false); setIsPlaying(true); }}
            onWaiting={() => setLoading(true)}
            onPlaying={() => setLoading(false)}
            onError={(e) => {
              const error = (e.target as HTMLAudioElement).error;
              console.error(`[Sovereign Audio] Tag Error Code: ${error?.code} | Message: ${error?.message}`);
              switchToFallback();
            }}
            onEnded={() => setIsPlaying(false)}
            className="fixed top-[-9999px] left-[-9999px] w-1 h-1 opacity-0 pointer-events-none"
          />
        ) : (
          <div className="fixed top-[-9999px] left-[-9999px] w-1 h-1 opacity-0 pointer-events-none">
            <SovereignIframe 
              src={`https://www.youtube.com/embed/${activeAudio.id}?autoplay=1&mute=0&enablejsapi=1`}
              title="Hidden Fallback Engine"
            />
          </div>
        )}
      </div>
    </div>
  );
}
