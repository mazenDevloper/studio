"use client";

import { useMediaStore } from "@/lib/store";
import { X, Maximize2, Play, Pause, Music, Youtube as YoutubeIcon, Minimize2, Bookmark, Monitor, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useState, useEffect } from "react";

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
        "fixed z-[100] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden",
        isMinimized 
          ? "bottom-10 right-10 w-[450px] h-24 capsule-player animate-in fade-in slide-in-from-bottom-8 cursor-pointer hover:scale-105 active:scale-95 z-[110]" 
          : isFullScreen
            ? "inset-0 bg-black flex flex-col"
            : "bottom-12 right-12 w-auto h-auto flex items-end gap-12"
      )}
      onClick={() => isMinimized && setIsMinimized(false)}
    >
      {isMinimized ? (
        <div className="flex items-center justify-between px-6 h-full w-full gap-5">
           <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="relative w-14 h-14 rounded-2xl overflow-hidden shadow-2xl border border-white/10 shrink-0">
                 <Image src={activeVideo.thumbnail} alt={activeVideo.title} fill className="object-cover opacity-60 scale-125" />
                 <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                   <Music className="w-6 h-6 text-white animate-pulse" />
                 </div>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-black text-white truncate uppercase tracking-tight leading-none">{activeVideo.title}</h4>
                <span className="text-[9px] px-3 py-1 mt-1 inline-block rounded-full font-black bg-primary/20 text-primary border border-primary/20 uppercase tracking-widest">Active Transmission</span>
              </div>
           </div>
           
           <div className="flex items-center gap-2 bg-black/40 p-2 rounded-full border border-white/5">
              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }} className="h-12 w-12 rounded-full text-white">
                {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setActiveVideo(null); }} className="h-12 w-12 rounded-full text-red-500">
                <X className="w-5 h-5" />
              </Button>
           </div>
        </div>
      ) : isFullScreen ? (
        <>
          <div className="h-24 flex items-center justify-between px-12 bg-black/90 backdrop-blur-3xl border-b border-white/10">
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center shadow-xl">
                <YoutubeIcon className="w-7 h-7 text-white" />
              </div>
              <div className="flex flex-col">
                <h3 className="font-black text-xl text-white font-headline truncate max-w-3xl tracking-tight uppercase">{activeVideo.title}</h3>
                <span className="text-xs text-muted-foreground uppercase tracking-[0.4em] font-bold">Cinema Experience Active</span>
              </div>
            </div>
            <div className="flex items-center gap-5">
              <Button variant="ghost" size="icon" onClick={() => toggleSaveVideo(activeVideo)} className={cn("w-16 h-16 rounded-full bg-white/5 border border-white/10", isSaved ? "text-accent" : "text-white/40")}>
                <Bookmark className={cn("w-8 h-8", isSaved && "fill-current")} />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsFullScreen(false)} className="w-16 h-16 rounded-full bg-white/5 border border-white/10 text-white shadow-2xl">
                <Minimize2 className="w-8 h-8" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setActiveVideo(null)} className="w-16 h-16 rounded-full bg-red-600/20 border border-red-600/30 text-red-500 shadow-2xl">
                <X className="w-8 h-8" />
              </Button>
            </div>
          </div>
          <div className="flex-1 bg-black">
             <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${activeVideo.id}?autoplay=1&controls=1&modestbranding=1&rel=0&start=${startSeconds}`} frameBorder="0" allowFullScreen></iframe>
          </div>
        </>
      ) : (
        <div className="flex items-end gap-10 animate-in zoom-in-95 duration-700">
          <div className="flex flex-col gap-8 mb-16">
              <Button 
                onClick={(e) => { e.stopPropagation(); setIsMinimized(true); }} 
                className="w-28 h-28 rounded-full bg-black/90 backdrop-blur-3xl border-4 border-white/20 shadow-[0_30px_70px_rgba(0,0,0,1)] flex flex-col items-center justify-center text-center gap-1.5 hover:scale-110 active:scale-95 transition-all group ring-2 ring-white/5"
              >
                <ChevronDown className="w-10 h-10 text-white group-hover:translate-y-1.5 transition-transform" />
                <span className="text-[10px] font-black uppercase text-white/60 tracking-tighter">Pin Popup</span>
              </Button>
              <Button 
                onClick={(e) => { e.stopPropagation(); setIsFullScreen(true); }} 
                className="w-28 h-28 rounded-full bg-primary/20 backdrop-blur-3xl border-4 border-primary/50 shadow-[0_30px_70px_rgba(59,130,246,0.4)] flex flex-col items-center justify-center text-center gap-1.5 hover:scale-110 active:scale-95 transition-all group ring-2 ring-primary/20"
              >
                <Monitor className="w-10 h-10 text-primary group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-black uppercase text-white tracking-tighter">Cinema View</span>
              </Button>
          </div>

          <div className="w-[58vw] h-[60vh] glass-panel rounded-[4.5rem] border-white/25 flex flex-col shadow-[0_60px_150px_rgba(0,0,0,1)] overflow-hidden bg-black/95 relative ring-4 ring-white/10">
            <div className="h-20 flex items-center justify-between px-10 bg-black/50 border-b border-white/15 backdrop-blur-3xl">
              <div className="flex items-center gap-4">
                <YoutubeIcon className="w-6 h-6 text-red-600" />
                <h3 className="font-black text-xs text-white/95 font-headline truncate max-w-[420px] uppercase tracking-[0.3em]">{activeVideo.title}</h3>
              </div>
              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setActiveVideo(null); }} className="h-12 w-12 rounded-full text-white/30 hover:text-red-500 hover:bg-red-600/10 transition-all active:scale-90">
                <X className="w-6 h-6" />
              </Button>
            </div>
            <div className="flex-1">
              <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${activeVideo.id}?autoplay=1&controls=1&modestbranding=1&rel=0&start=${startSeconds}`} frameBorder="0" allowFullScreen></iframe>
            </div>
            <div className="h-24 bg-black/90 flex items-center justify-between px-12">
              <div className="flex items-center gap-6">
                <Button variant="default" size="icon" onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }} className="h-16 w-16 rounded-full bg-white text-black shadow-2xl hover:scale-115 transition-all active:scale-90">
                  {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1.5" />}
                </Button>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em]">Signal Status</span>
                  <span className="text-sm font-black text-primary uppercase animate-pulse">{isPlaying ? 'Streaming Live' : 'Paused Signal'}</span>
                </div>
              </div>
              <Button onClick={(e) => { e.stopPropagation(); toggleSaveVideo(activeVideo); }} className={cn("w-14 h-14 rounded-full border-2 transition-all shadow-xl active:scale-90", isSaved ? "bg-accent/25 border-accent/60 text-accent shadow-[0_0_30px_rgba(65,184,131,0.5)]" : "bg-white/5 border-white/15 text-white/40 hover:text-white")}>
                <Bookmark className={cn("w-7 h-7", isSaved && "fill-current")} />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}