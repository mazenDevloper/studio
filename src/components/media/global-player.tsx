
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
          ? "bottom-8 right-8 w-[420px] h-20 capsule-player animate-in fade-in slide-in-from-bottom-4 cursor-pointer hover:scale-105 active:scale-95 z-[110]" 
          : isFullScreen
            ? "inset-0 bg-black flex flex-col"
            : "bottom-12 right-12 w-auto h-auto flex items-end gap-10"
      )}
      onClick={() => isMinimized && setIsMinimized(false)}
    >
      {isMinimized ? (
        <div className="flex items-center justify-between px-5 h-full w-full gap-4">
           <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative w-12 h-12 rounded-2xl overflow-hidden shadow-2xl border border-white/10 shrink-0">
                 <Image src={activeVideo.thumbnail} alt={activeVideo.title} fill className="object-cover opacity-60 scale-125" />
                 <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                   <Music className="w-5 h-5 text-white animate-pulse" />
                 </div>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-[11px] font-black text-white truncate uppercase tracking-tight">{activeVideo.title}</h4>
                <span className="text-[8px] px-2.5 py-0.5 rounded-full font-black bg-primary/20 text-primary border border-primary/20 uppercase tracking-widest">Active Signal</span>
              </div>
           </div>
           
           <div className="flex items-center gap-1.5 bg-black/40 p-1.5 rounded-full border border-white/5">
              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }} className="h-10 w-10 rounded-full text-white">
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setActiveVideo(null); }} className="h-10 w-10 rounded-full text-red-500">
                <X className="w-4 h-4" />
              </Button>
           </div>
        </div>
      ) : isFullScreen ? (
        <>
          <div className="h-20 flex items-center justify-between px-10 bg-black/80 backdrop-blur-3xl border-b border-white/10">
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center">
                <YoutubeIcon className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <h3 className="font-bold text-lg text-white font-headline truncate max-w-2xl">{activeVideo.title}</h3>
                <span className="text-xs text-muted-foreground uppercase tracking-widest">Cinema View Active</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => toggleSaveVideo(activeVideo)} className={cn("w-14 h-14 rounded-full bg-white/5 border border-white/10", isSaved ? "text-accent" : "text-white/40")}>
                <Bookmark className={cn("w-6 h-6", isSaved && "fill-current")} />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsFullScreen(false)} className="w-14 h-14 rounded-full bg-white/5 border border-white/10 text-white">
                <Minimize2 className="w-6 h-6" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setActiveVideo(null)} className="w-14 h-14 rounded-full bg-red-500/20 border border-red-500/30 text-red-500">
                <X className="w-6 h-6" />
              </Button>
            </div>
          </div>
          <div className="flex-1 bg-black">
             <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${activeVideo.id}?autoplay=1&controls=1&modestbranding=1&rel=0&start=${startSeconds}`} frameBorder="0" allowFullScreen></iframe>
          </div>
        </>
      ) : (
        <div className="flex items-end gap-8 animate-in zoom-in-95 duration-700">
          {/* Side Circle Buttons */}
          <div className="flex flex-col gap-6 mb-12">
              <Button 
                onClick={(e) => { e.stopPropagation(); setIsMinimized(true); }} 
                className="w-24 h-24 rounded-full bg-black/80 backdrop-blur-3xl border-2 border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center text-center gap-1 hover:scale-110 active:scale-95 transition-all group"
              >
                <ChevronDown className="w-8 h-8 text-white group-hover:translate-y-1 transition-transform" />
                <span className="text-[9px] font-black uppercase text-white/60 tracking-tighter">Pin</span>
              </Button>
              <Button 
                onClick={(e) => { e.stopPropagation(); setIsFullScreen(true); }} 
                className="w-24 h-24 rounded-full bg-primary/20 backdrop-blur-3xl border-2 border-primary/40 shadow-[0_20px_50px_rgba(59,130,246,0.3)] flex flex-col items-center justify-center text-center gap-1 hover:scale-110 active:scale-95 transition-all group"
              >
                <Monitor className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" />
                <span className="text-[9px] font-black uppercase text-white tracking-tighter">Full</span>
              </Button>
          </div>

          {/* Main POPUP Frame */}
          <div className="w-[52vw] h-[55vh] glass-panel rounded-[3.5rem] border-white/20 flex flex-col shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden bg-black/90 relative">
            <div className="h-16 flex items-center justify-between px-8 bg-black/40 border-b border-white/10 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <YoutubeIcon className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-[11px] text-white/90 font-headline truncate max-w-[320px] uppercase tracking-[0.2em]">{activeVideo.title}</h3>
              </div>
              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setActiveVideo(null); }} className="w-10 h-10 rounded-full text-white/40 hover:text-red-500 hover:bg-red-500/10 transition-all">
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex-1">
              <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${activeVideo.id}?autoplay=1&controls=1&modestbranding=1&rel=0&start=${startSeconds}`} frameBorder="0" allowFullScreen></iframe>
            </div>
            <div className="h-20 bg-black/80 flex items-center justify-between px-10">
              <div className="flex items-center gap-4">
                <Button variant="default" size="icon" onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }} className="h-14 w-14 rounded-full bg-white text-black shadow-xl hover:scale-110 transition-all">
                  {isPlaying ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current ml-1" />}
                </Button>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Status</span>
                  <span className="text-xs font-bold text-primary uppercase">{isPlaying ? 'Streaming' : 'Paused'}</span>
                </div>
              </div>
              <Button onClick={(e) => { e.stopPropagation(); toggleSaveVideo(activeVideo); }} className={cn("w-12 h-12 rounded-full border transition-all", isSaved ? "bg-accent/20 border-accent/40 text-accent shadow-glow" : "bg-white/5 border-white/10 text-white/40 hover:text-white")}>
                <Bookmark className={cn("w-6 h-6", isSaved && "fill-current")} />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
