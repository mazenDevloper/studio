
"use client";

import { useMediaStore } from "@/lib/store";
import { X, Maximize2, Play, Pause, Music, Youtube as YoutubeIcon, Minimize2, Bookmark, Monitor, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";

export function GlobalVideoPlayer() {
  const { 
    activeVideo, 
    isPlaying, 
    isMinimized, 
    isFullScreen,
    videoProgress,
    setActiveVideo, 
    setIsPlaying, 
    setIsMinimized, 
    setIsFullScreen,
    toggleSaveVideo,
    savedVideos,
  } = useMediaStore();
  
  const [mounted, setMounted] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Focus transition logic
  useEffect(() => {
    if (activeVideo && !isMinimized) {
      setTimeout(() => {
        const firstControl = document.querySelector('[data-nav-id="player-minimize-btn"]') as HTMLElement;
        if (firstControl) firstControl.focus();
      }, 500);
    }
  }, [activeVideo, isMinimized]);

  useEffect(() => {
    if (activeVideo && iframeRef.current?.contentWindow) {
      const command = isPlaying ? 'playVideo' : 'pauseVideo';
      iframeRef.current.contentWindow.postMessage(JSON.stringify({
        event: 'command',
        func: command,
        args: []
      }), '*');
    }
  }, [isPlaying, activeVideo]);

  useEffect(() => {
    if ('mediaSession' in navigator && activeVideo) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: activeVideo.title,
        artist: activeVideo.channelTitle || 'DriveCast Media',
        artwork: [{ src: activeVideo.thumbnail, sizes: '512x512', type: 'image/jpeg' }]
      });
      navigator.mediaSession.setActionHandler('play', () => setIsPlaying(true));
      navigator.mediaSession.setActionHandler('pause', () => setIsPlaying(false));
    }
  }, [activeVideo, setIsPlaying]);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !activeVideo) return null;

  const isSaved = savedVideos.some(v => v.id === activeVideo.id);
  const startSeconds = videoProgress[activeVideo.id] || 0;

  // vq=large sets default quality to 480p to prevent buffering
  const youtubeUrl = `https://www.youtube.com/embed/${activeVideo.id}?autoplay=1&controls=1&modestbranding=1&rel=0&start=${startSeconds}&enablejsapi=1&vq=large`;

  return (
    <div 
      className={cn(
        "fixed z-[2000] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]",
        isMinimized 
          ? "bottom-10 left-1/2 -translate-x-1/2 w-[520px] h-24 capsule-player z-[210] cursor-pointer hover:scale-105 active:scale-95" 
          : isFullScreen
            ? "inset-0 bg-black flex flex-col"
            : "bottom-12 right-12 w-auto h-auto flex items-end gap-12"
      )}
      onClick={() => isMinimized && setIsMinimized(false)}
    >
      <div className={cn(
        "absolute transition-all duration-700 overflow-hidden",
        isMinimized ? "opacity-0 pointer-events-none scale-0" : "inset-0 opacity-100",
        !isFullScreen && !isMinimized && "relative w-[65vw] h-[68vh] glass-panel rounded-[3.5rem] bg-black/98 ring-4 ring-white/10"
      )}>
        <div className="w-full h-full bg-black relative">
          <iframe 
            ref={iframeRef}
            key={activeVideo.id} 
            className="w-full h-full" 
            src={youtubeUrl} 
            frameBorder="0" 
            allow="autoplay; encrypted-media" 
            allowFullScreen
          ></iframe>
        </div>
      </div>

      {isMinimized && (
        <div className="absolute inset-0 flex items-center justify-between px-8 h-full w-full gap-6 animate-in fade-in zoom-in-95 duration-500">
           <div className="flex items-center gap-5 flex-1 min-w-0">
              <div className="relative w-16 h-16 rounded-2xl overflow-hidden shadow-2xl border border-white/15 shrink-0">
                 <Image src={activeVideo.thumbnail} alt={activeVideo.title} fill className="object-cover opacity-70 scale-125" />
                 <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                   <Music className={cn("w-7 h-7 text-white", isPlaying && "animate-pulse")} />
                 </div>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-black text-white truncate uppercase tracking-tight leading-none font-headline">{activeVideo.title}</h4>
                <div className="flex items-center gap-2 mt-2">
                  <span className="w-2 h-2 rounded-full bg-accent animate-pulse shadow-[0_0_10px_hsl(var(--accent))]" />
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Live Background Signal</span>
                </div>
              </div>
           </div>
           
           <div className="flex items-center gap-3 bg-white/5 p-2 rounded-full border border-white/10 backdrop-blur-3xl">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setIsPlaying(!isPlaying); 
                }} 
                className="h-14 w-14 rounded-full text-white hover:bg-white/10 active:scale-90 transition-all shadow-xl focusable"
                data-nav-id="mini-play-btn"
                tabIndex={0}
              >
                {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setActiveVideo(null); 
                }} 
                className="h-14 w-14 rounded-full text-red-500 hover:bg-red-500/10 active:scale-90 transition-all shadow-xl focusable"
                data-nav-id="mini-close-btn"
                tabIndex={0}
              >
                <X className="w-6 h-6" />
              </Button>
           </div>
        </div>
      )}

      {!isMinimized && (
        <div className={cn(
          "fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-6 z-[2200] transition-all duration-700",
          isFullScreen ? "scale-110" : "scale-100"
        )}>
            <div className="flex items-center gap-4 bg-black/80 backdrop-blur-3xl p-3 rounded-full border border-white/20 shadow-[0_20px_60px_rgba(0,0,0,1)]">
               <Button 
                onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} 
                className={cn(
                  "w-16 h-16 rounded-full border-2 transition-all flex flex-col items-center justify-center gap-1 focusable",
                  isMinimized ? "bg-accent/20 border-accent text-accent" : "bg-white/5 border-white/10 text-white"
                )}
                data-nav-id="player-minimize-btn"
                tabIndex={0}
               >
                 {isMinimized ? <Maximize2 className="w-7 h-7" /> : <ChevronDown className="w-7 h-7" />}
                 <span className="text-[8px] font-black uppercase">{isMinimized ? 'Expand' : 'Pin'}</span>
               </Button>
               
               <Button 
                onClick={(e) => { e.stopPropagation(); setIsFullScreen(!isFullScreen); }} 
                className={cn(
                  "w-16 h-16 rounded-full border-2 transition-all flex flex-col items-center justify-center gap-1 focusable",
                  isFullScreen ? "bg-primary/20 border-primary text-primary" : "bg-white/5 border-white/10 text-white"
                )}
                data-nav-id="player-fullscreen-btn"
                tabIndex={0}
               >
                 <Monitor className="w-7 h-7" />
                 <span className="text-[8px] font-black uppercase">Cinema</span>
               </Button>

               <Button 
                onClick={(e) => { e.stopPropagation(); toggleSaveVideo(activeVideo); }}
                className={cn("w-16 h-16 rounded-full border-2 transition-all focusable", isSaved ? "bg-accent/20 border-accent text-accent" : "bg-white/5 border-white/10 text-white")}
                data-nav-id="player-save-btn"
                tabIndex={0}
               >
                 <Bookmark className={cn("w-7 h-7", isSaved && "fill-current")} />
               </Button>

               <div className="w-px h-10 bg-white/10 mx-2" />

               <Button 
                variant="destructive" 
                size="icon" 
                onClick={(e) => { e.stopPropagation(); setActiveVideo(null); }} 
                className="w-16 h-16 rounded-full shadow-2xl focusable"
                data-nav-id="player-close-btn"
                tabIndex={0}
               >
                  <X className="w-8 h-8" />
               </Button>
            </div>
        </div>
      )}
    </div>
  );
}
