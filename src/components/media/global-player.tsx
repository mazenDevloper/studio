
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

  // We keep the iframe ALWAYS in the DOM to prevent sound from stopping.
  // We use CSS to hide/show it based on the state.
  return (
    <div 
      className={cn(
        "fixed z-[200] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden",
        isMinimized 
          ? "bottom-10 right-10 w-[480px] h-24 capsule-player shadow-[0_25px_60px_rgba(0,0,0,0.8)] z-[210] cursor-pointer hover:scale-105 active:scale-95" 
          : isFullScreen
            ? "inset-0 bg-black flex flex-col"
            : "bottom-12 right-12 w-auto h-auto flex items-end gap-12"
      )}
      onClick={() => isMinimized && setIsMinimized(false)}
    >
      {/* UI: CAPSULE MODE */}
      {isMinimized && (
        <div className="flex items-center justify-between px-8 h-full w-full gap-6 animate-in fade-in zoom-in-95 duration-500">
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
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Signal Background Active</span>
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

      {/* IFRAME CONTAINER: Shared for FullScreen and Normal */}
      {!isMinimized && (
        <div className={cn(
          "flex flex-col h-full w-full transition-all duration-700",
          !isFullScreen && "w-auto h-auto flex-row items-end gap-12"
        )}>
          {isFullScreen ? (
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
                 <iframe 
                   key={activeVideo.id}
                   className="w-full h-full" 
                   src={`https://www.youtube.com/embed/${activeVideo.id}?autoplay=1&controls=1&modestbranding=1&rel=0&start=${startSeconds}&enablejsapi=1`} 
                   frameBorder="0" 
                   allow="autoplay; encrypted-media" 
                   allowFullScreen
                 ></iframe>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-8 mb-16 animate-in slide-in-from-left-8 duration-700">
                  <Button 
                    onClick={(e) => { e.stopPropagation(); setIsMinimized(true); }} 
                    className="w-28 h-28 rounded-full bg-black/95 backdrop-blur-3xl border-4 border-white/20 shadow-[0_30px_70px_rgba(0,0,0,1)] flex flex-col items-center justify-center text-center gap-1.5 hover:scale-110 active:scale-95 transition-all group ring-2 ring-white/5"
                  >
                    <ChevronDown className="w-10 h-10 text-white group-hover:translate-y-1.5 transition-transform" />
                    <span className="text-[10px] font-black uppercase text-white/60 tracking-tighter">Pin Popup</span>
                  </Button>
                  <Button 
                    onClick={(e) => { e.stopPropagation(); setIsFullScreen(true); }} 
                    className="w-28 h-28 rounded-full bg-primary/30 backdrop-blur-3xl border-4 border-primary/50 shadow-[0_30px_70px_rgba(59,130,246,0.5)] flex flex-col items-center justify-center text-center gap-1.5 hover:scale-110 active:scale-95 transition-all group ring-2 ring-primary/20"
                  >
                    <Monitor className="w-10 h-10 text-primary group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase text-white tracking-tighter">Cinema View</span>
                  </Button>
              </div>

              <div className="w-[62vw] h-[65vh] glass-panel rounded-[4.5rem] border-white/25 flex flex-col shadow-[0_60px_150px_rgba(0,0,0,1)] overflow-hidden bg-black/98 relative ring-4 ring-white/10 animate-in zoom-in-95 duration-700">
                <div className="h-24 flex items-center justify-between px-12 bg-black/50 border-b border-white/15 backdrop-blur-3xl">
                  <div className="flex items-center gap-5">
                    <YoutubeIcon className="w-8 h-8 text-red-600" />
                    <h3 className="font-black text-sm text-white/95 font-headline truncate max-w-[480px] uppercase tracking-[0.2em]">{activeVideo.title}</h3>
                  </div>
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setActiveVideo(null); }} className="h-14 w-14 rounded-full text-white/30 hover:text-red-500 hover:bg-red-600/10 transition-all active:scale-90">
                    <X className="w-7 h-7" />
                  </Button>
                </div>
                <div className="flex-1 bg-black">
                  <iframe 
                    key={activeVideo.id}
                    className="w-full h-full" 
                    src={`https://www.youtube.com/embed/${activeVideo.id}?autoplay=1&controls=1&modestbranding=1&rel=0&start=${startSeconds}&enablejsapi=1`} 
                    frameBorder="0" 
                    allow="autoplay; encrypted-media" 
                    allowFullScreen
                  ></iframe>
                </div>
                <div className="h-28 bg-black/95 flex items-center justify-between px-14">
                  <div className="flex items-center gap-8">
                    <Button variant="default" size="icon" onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }} className="h-20 w-20 rounded-full bg-white text-black shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:scale-110 transition-all active:scale-90">
                      {isPlaying ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current ml-2" />}
                    </Button>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black text-white/30 uppercase tracking-[0.5em]">System Status</span>
                      <span className="text-base font-black text-primary uppercase animate-pulse">{isPlaying ? 'Broadcasting Live' : 'Signal Paused'}</span>
                    </div>
                  </div>
                  <Button onClick={(e) => { e.stopPropagation(); toggleSaveVideo(activeVideo); }} className={cn("w-16 h-16 rounded-full border-2 transition-all shadow-xl active:scale-90", isSaved ? "bg-accent/25 border-accent/60 text-accent shadow-[0_0_40px_rgba(65,184,131,0.5)]" : "bg-white/5 border-white/15 text-white/40 hover:text-white")}>
                    <Bookmark className={cn("w-8 h-8", isSaved && "fill-current")} />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* INVISIBLE PERSISTENT IFRAME FOR BACKGROUND SOUND (Only when Minimized) */}
      {/* React will unmount the visible ones above when switching, so we keep this if needed, 
          but actually the single shared iframe approach is better if we could move it. 
          For now, we use a hidden iframe to maintain playback state if the UI changes. */}
      {isMinimized && (
        <div className="opacity-0 pointer-events-none absolute inset-0 -z-10 w-1 h-1">
          <iframe 
            key={`${activeVideo.id}-bg`}
            src={`https://www.youtube.com/embed/${activeVideo.id}?autoplay=1&enablejsapi=1&start=${startSeconds}`} 
            allow="autoplay"
          />
        </div>
      )}
    </div>
  );
}
