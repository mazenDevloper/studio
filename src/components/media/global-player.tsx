
"use client";

import { useMediaStore } from "@/lib/store";
import { X, Play, Pause, Youtube as YoutubeIcon, Minimize2, Bookmark, Monitor, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
    setMounted(true);
  }, []);

  if (!mounted || !activeVideo) return null;

  const isSaved = savedVideos.some(v => v.id === activeVideo.id);
  const startSeconds = videoProgress[activeVideo.id] || 0;

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
        isMinimized ? "opacity-0 scale-0 pointer-events-none" : "inset-0 opacity-100",
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
                 <ChevronDown className="w-7 h-7" />
                 <span className="text-[8px] font-black uppercase">Pin</span>
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
