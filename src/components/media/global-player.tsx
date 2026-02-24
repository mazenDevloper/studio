
"use client";

import { useMediaStore } from "@/lib/store";
import { X, Maximize2, Play, Pause, SkipForward, SkipBack, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useState, useEffect } from "react";

export function GlobalVideoPlayer() {
  const { activeVideo, isPlaying, isMinimized, setActiveVideo, setIsPlaying, setIsMinimized, toggleMinimize } = useMediaStore();
  const [mounted, setMounted] = useState(false);
  const [rate, setRate] = useState(1.0);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !activeVideo) return null;

  const rates = [1.0, 1.25, 1.5, 1.65];

  return (
    <div 
      className={cn(
        "fixed z-[100] transition-all duration-500 ease-in-out shadow-2xl overflow-hidden",
        isMinimized 
          ? "bottom-8 right-8 w-[400px] h-20 capsule-player" 
          : "inset-0 bg-black flex flex-col"
      )}
    >
      {isMinimized ? (
        <div className="flex items-center justify-between px-4 h-full w-full gap-4">
           <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative w-12 h-12 rounded-xl overflow-hidden shadow-lg border border-white/10 shrink-0">
                 <Image src={activeVideo.thumbnail} alt={activeVideo.title} fill className="object-cover opacity-60" />
                 <div className="absolute inset-0 flex items-center justify-center">
                   <Music className="w-5 h-5 text-white animate-pulse" />
                 </div>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-black text-white truncate">{activeVideo.title}</h4>
                <div className="flex gap-1 mt-1">
                  {rates.map(r => (
                    <button 
                      key={r}
                      onClick={(e) => { e.stopPropagation(); setRate(r); }}
                      className={cn(
                        "text-[8px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest transition-all",
                        rate === r ? "bg-yellow-400 text-black shadow-[0_0_10px_rgba(250,204,21,0.5)]" : "bg-white/5 text-white/40"
                      )}
                    >
                      {r}x
                    </button>
                  ))}
                </div>
              </div>
           </div>
           
           <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setIsPlaying(!isPlaying)} className="h-10 w-10 rounded-full hover:bg-white/10 text-white">
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsMinimized(false)} className="h-10 w-10 rounded-full bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white">
                <Maximize2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setActiveVideo(null)} className="h-10 w-10 rounded-full hover:bg-red-500/20 text-red-500">
                <X className="w-4 h-4" />
              </Button>
           </div>
        </div>
      ) : (
        <>
          <div className="h-20 flex items-center justify-between px-8 bg-black/40 backdrop-blur-xl border-b border-white/5">
            <div className="flex items-center gap-4">
              <Play className="w-5 h-5 text-red-600 fill-red-600" />
              <h3 className="font-bold text-lg text-white font-headline truncate max-w-xl">{activeVideo.title}</h3>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={toggleMinimize} className="w-12 h-12 rounded-full hover:bg-white/10 text-white">
                <Maximize2 className="w-6 h-6 rotate-180" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setActiveVideo(null)} className="w-12 h-12 rounded-full hover:bg-white/10 text-white">
                <X className="w-6 h-6" />
              </Button>
            </div>
          </div>

          <div className="flex-1 relative bg-black">
            <iframe
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${activeVideo.id}?autoplay=1&controls=1&modestbranding=1&rel=0&playbackRate=${rate}`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
          
          <div className="h-24 bg-zinc-900/80 backdrop-blur-2xl border-t border-white/5 flex items-center justify-center px-10 gap-12">
            <Button variant="ghost" size="icon" className="h-14 w-14 rounded-full text-white/40 hover:text-white"><SkipBack className="w-8 h-8 fill-current" /></Button>
            <Button 
              variant="default" 
              size="icon" 
              onClick={() => setIsPlaying(!isPlaying)}
              className="h-20 w-20 rounded-full bg-white text-black hover:scale-105 transition-all shadow-xl"
            >
              {isPlaying ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current ml-1" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-14 w-14 rounded-full text-white/40 hover:text-white"><SkipForward className="w-8 h-8 fill-current" /></Button>
          </div>
        </>
      )}
    </div>
  );
}
