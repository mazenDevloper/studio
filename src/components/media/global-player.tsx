
"use client";

import { useMediaStore } from "@/lib/store";
import { X, Minus, Maximize2, Play, Pause, SkipForward, SkipBack, Volume2, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useState, useEffect } from "react";

export function GlobalVideoPlayer() {
  const { activeVideo, isPlaying, isMinimized, setActiveVideo, setIsPlaying, setIsMinimized, toggleMinimize } = useMediaStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !activeVideo) return null;

  return (
    <div 
      className={cn(
        "fixed z-[100] transition-all duration-500 ease-in-out shadow-2xl overflow-hidden",
        isMinimized 
          ? "bottom-8 left-32 w-[400px] h-24 bg-zinc-900/90 backdrop-blur-3xl rounded-3xl border border-white/10" 
          : "inset-0 bg-black flex flex-col"
      )}
    >
      {/* Header Controls */}
      <div className={cn(
        "flex items-center justify-between px-6 bg-black/40 backdrop-blur-xl border-b border-white/5",
        isMinimized ? "h-full w-full" : "h-20"
      )}>
        {isMinimized ? (
          <div className="flex items-center gap-4 flex-1 min-w-0">
             <div className="relative w-16 h-16 rounded-2xl overflow-hidden shadow-lg group">
                <Image src={activeVideo.thumbnail} alt={activeVideo.title} fill className="object-cover opacity-60" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Music className="w-6 h-6 text-white animate-pulse" />
                </div>
             </div>
             <div className="flex-1 min-w-0">
               <h4 className="text-sm font-bold text-white truncate font-headline">{activeVideo.title}</h4>
               <p className="text-[10px] text-accent font-bold uppercase tracking-widest mt-1">Listening Only Mode</p>
             </div>
             <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setIsPlaying(!isPlaying)} className="h-12 w-12 rounded-full hover:bg-white/10">
                  {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setIsMinimized(false)} className="h-12 w-12 rounded-full hover:bg-white/10">
                  <Maximize2 className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setActiveVideo(null)} className="h-12 w-12 rounded-full hover:bg-red-500/20 text-red-500">
                  <X className="w-5 h-5" />
                </Button>
             </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center">
                <Play className="w-5 h-5 text-white fill-white" />
              </div>
              <h3 className="font-bold text-lg text-white font-headline truncate max-w-xl">{activeVideo.title}</h3>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleMinimize}
                className="w-12 h-12 rounded-full hover:bg-white/10"
                title="Minimize for listening only"
              >
                <Minus className="w-6 h-6" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setActiveVideo(null)}
                className="w-12 h-12 rounded-full hover:bg-white/10"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Video Content */}
      <div className={cn(
        "flex-1 relative bg-black",
        isMinimized ? "hidden" : "block"
      )}>
        <iframe
          className="w-full h-full"
          src={`https://www.youtube.com/embed/${activeVideo.id}?autoplay=1&controls=1&modestbranding=1&rel=0`}
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
      
      {!isMinimized && (
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
      )}
    </div>
  );
}
