
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

  // Sync isPlaying state with YouTube IFrame using postMessage
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

  return (
    <div 
      className={cn(
        "fixed z-[200] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]",
        isMinimized 
          ? "bottom-10 right-10 w-[480px] h-24 capsule-player z-[210] cursor-pointer hover:scale-105 active:scale-95" 
          : isFullScreen
            ? "inset-0 bg-black flex flex-col"
            : "bottom-12 right-12 w-auto h-auto flex items-end gap-12"
      )}
      onClick={() => isMinimized && setIsMinimized(false)}
    >
      {/* PERSISTENT VIDEO CONTAINER: Always mounted to keep audio playing */}
      <div className={cn(
        "absolute transition-all duration-700 overflow-hidden",
        isMinimized ? "opacity-0 pointer-events-none scale-0" : "inset-0 opacity-100",
        !isFullScreen && !isMinimized && "relative w-[62vw] h-[65vh] glass-panel rounded-[3.5rem] bg-black/98 ring-4 ring-white/10"
      )}>
        {/* Full Screen Header Only */}
        {isFullScreen && (
          <div className="h-20 flex items-center justify-between px-12 bg-black/90 backdrop-blur-3xl border-b border-white/10">
            <div className="flex items-center gap-6">
              <YoutubeIcon className="w-7 h-7 text-red-600" />
              <h3 className="font-black text-lg text-white font-headline truncate max-w-3xl">{activeVideo.title}</h3>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setIsFullScreen(false)} className="w-12 h-12 rounded-full text-white">
                <Minimize2 className="w-6 h-6" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setActiveVideo(null)} className="w-12 h-12 rounded-full text-red-500">
                <X className="w-6 h-6" />
              </Button>
            </div>
          </div>
        )}

        {/* The persistent IFrame */}
        <div className="w-full h-full bg-black relative">
          <iframe 
            ref={iframeRef}
            key={activeVideo.id} 
            className="w-full h-full" 
            src={`https://www.youtube.com/embed/${activeVideo.id}?autoplay=1&controls=1&modestbranding=1&rel=0&start=${startSeconds}&enablejsapi=1`} 
            frameBorder="0" 
            allow="autoplay; encrypted-media" 
            allowFullScreen
          ></iframe>

          {/* Floating Action Overlay for Popup mode (Clean Minimal UI) */}
          {!isFullScreen && !isMinimized && (
            <div className="absolute top-8 right-8 flex gap-4 opacity-0 hover:opacity-100 transition-opacity duration-300 z-30">
               <Button 
                onClick={(e) => { e.stopPropagation(); toggleSaveVideo(activeVideo); }}
                className={cn("w-14 h-14 rounded-full border-2 backdrop-blur-xl transition-all shadow-2xl", isSaved ? "bg-accent/20 border-accent text-accent" : "bg-black/40 border-white/20 text-white")}
               >
                 <Bookmark className={cn("w-7 h-7", isSaved && "fill-current")} />
               </Button>
               <Button 
                variant="destructive" 
                size="icon" 
                onClick={(e) => { e.stopPropagation(); setActiveVideo(null); }} 
                className="w-14 h-14 rounded-full shadow-2xl"
               >
                  <X className="w-7 h-7" />
               </Button>
            </div>
          )}
        </div>
      </div>

      {/* CAPSULE UI OVERLAY: Only visible when minimized */}
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
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Background Audio Signal</span>
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
                className="h-14 w-14 rounded-full text-white hover:bg-white/10 active:scale-90 transition-all shadow-xl"
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
                className="h-14 w-14 rounded-full text-red-500 hover:bg-red-500/10 active:scale-90 transition-all shadow-xl"
              >
                <X className="w-6 h-6" />
              </Button>
           </div>
        </div>
      )}

      {/* Side Mode Selector Buttons (Minimized & Popup modes) */}
      {!isFullScreen && (
        <div className="flex flex-col gap-8 mb-16 animate-in slide-in-from-left-8 duration-700">
            <Button 
              onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} 
              className={cn(
                "w-28 h-28 rounded-full backdrop-blur-3xl border-4 shadow-[0_30px_70px_rgba(0,0,0,1)] flex flex-col items-center justify-center text-center gap-1.5 hover:scale-110 active:scale-95 transition-all group ring-2 ring-white/5",
                isMinimized ? "bg-accent/30 border-accent/50 text-accent" : "bg-black/95 border-white/20 text-white"
              )}
            >
              {isMinimized ? <Maximize2 className="w-10 h-10" /> : <ChevronDown className="w-10 h-10 group-hover:translate-y-1.5 transition-transform" />}
              <span className="text-[10px] font-black uppercase tracking-tighter">{isMinimized ? 'Expand' : 'Pin Popup'}</span>
            </Button>
            <Button 
              onClick={(e) => { e.stopPropagation(); setIsFullScreen(true); }} 
              className="w-28 h-28 rounded-full bg-primary/30 backdrop-blur-3xl border-4 border-primary/50 shadow-[0_30px_70px_rgba(59,130,246,0.5)] flex flex-col items-center justify-center text-center gap-1.5 hover:scale-110 active:scale-95 transition-all group ring-2 ring-primary/20"
            >
              <Monitor className="w-10 h-10 text-primary group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-black uppercase text-white tracking-tighter">Cinema View</span>
            </Button>
        </div>
      )}
    </div>
  );
}
