
"use client";

import { useMediaStore } from "@/lib/store";
import { X, Maximize2, Play, Pause, Music, Youtube as YoutubeIcon, ArrowLeft, Minimize2, Bookmark, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

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
  const [rate, setRate] = useState(1.0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const router = useRouter();

  useEffect(() => {
    if ('mediaSession' in navigator && activeVideo) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: activeVideo.title,
        artist: activeVideo.channelTitle || 'DriveCast Media',
        artwork: [
          { src: activeVideo.thumbnail, sizes: '512x512', type: 'image/jpeg' }
        ]
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
  const rates = [1.0, 1.25, 1.5, 1.65];

  return (
    <div 
      className={cn(
        "fixed z-[100] transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden",
        isMinimized 
          ? "bottom-8 right-8 w-[420px] h-20 capsule-player animate-in fade-in slide-in-from-bottom-4 cursor-pointer hover:scale-105 active:scale-95 z-[110]" 
          : isFullScreen
            ? "inset-0 bg-black flex flex-col"
            : "bottom-12 right-12 w-auto h-auto flex items-end gap-10"
      )}
      onClick={() => {
        if (isMinimized) setIsMinimized(false);
      }}
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
                <h4 className="text-[11px] font-black text-white truncate leading-tight uppercase tracking-tight">{activeVideo.title}</h4>
                <div className="flex gap-1.5 mt-1.5">
                  <span className="text-[8px] px-2.5 py-0.5 rounded-full font-black bg-primary/20 text-primary border border-primary/20 uppercase tracking-widest">Active Signal</span>
                </div>
              </div>
           </div>
           
           <div className="flex items-center gap-1.5 bg-black/40 p-1.5 rounded-full border border-white/5">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }} 
                className="h-10 w-10 rounded-full hover:bg-white/10 text-white"
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={(e) => { e.stopPropagation(); setActiveVideo(null); }} 
                className="h-10 w-10 rounded-full hover:bg-red-500/20 text-red-500"
              >
                <X className="w-4 h-4" />
              </Button>
           </div>
        </div>
      ) : isFullScreen ? (
        <>
          <div className="h-16 flex items-center justify-between px-8 bg-black/60 backdrop-blur-2xl border-b border-white/5">
            <div className="flex items-center gap-4">
              <YoutubeIcon className="w-5 h-5 text-red-600" />
              <h3 className="font-bold text-sm text-white font-headline truncate max-w-md leading-none">{activeVideo.title}</h3>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => toggleSaveVideo(activeVideo)} className={cn("w-10 h-10 rounded-full", isSaved ? "bg-accent text-black" : "text-white/40")}>
                <Bookmark className={cn("w-5 h-5", isSaved && "fill-current")} />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setActiveVideo(null)} className="w-10 h-10 rounded-full hover:bg-red-500/20 text-white/40">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
          <div className="flex-1 bg-black">
             <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${activeVideo.id}?autoplay=1&controls=1&modestbranding=1&rel=0&start=${startSeconds}&playbackRate=${rate}`} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
          </div>
          <div className="h-24 bg-zinc-900/95 backdrop-blur-3xl border-t border-white/10 flex items-center justify-between px-10">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-14 w-14 rounded-full bg-white/5 text-white border border-white/10 shadow-xl">
              <ArrowLeft className="w-8 h-8" />
            </Button>
            <div className="flex items-center gap-6">
              <Button variant="ghost" size="icon" onClick={() => setIsFullScreen(false)} className="h-14 w-14 rounded-full bg-white/10 text-white border border-white/10"><Minimize2 className="w-7 h-7" /></Button>
              <Button variant="default" size="icon" onClick={() => setIsPlaying(!isPlaying)} className="h-16 w-16 rounded-full bg-white text-black shadow-2xl">
                {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
              </Button>
            </div>
            <div className="flex gap-1">
              {rates.map(r => (
                <Button key={r} variant="ghost" size="sm" onClick={() => setRate(r)} className={cn("rounded-xl px-2 font-black text-[9px] h-8", rate === r ? "bg-primary text-white" : "bg-white/5 text-white/40")}>{r}x</Button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="flex items-end gap-8 animate-in zoom-in-95 duration-500">
          {/* PIP POPUP BUTTONS (As per provided image) */}
          <div className="flex flex-col gap-5 mb-10">
              <Button 
                onClick={(e) => { e.stopPropagation(); setIsMinimized(true); }}
                className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-3xl border-2 border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center text-center gap-1 hover:scale-110 hover:bg-white/20 transition-all group"
              >
                <Minimize2 className="w-7 h-7 text-white group-hover:text-primary transition-colors" />
                <span className="text-[8px] font-black uppercase text-white/60 leading-tight">Minimize<br/>Capsule</span>
              </Button>
              
              <Button 
                onClick={(e) => { e.stopPropagation(); setIsFullScreen(true); }}
                className="w-24 h-24 rounded-full bg-primary/20 backdrop-blur-3xl border-2 border-primary/40 shadow-[0_0_30px_rgba(59,130,246,0.4)] flex flex-col items-center justify-center text-center gap-1 hover:scale-110 hover:bg-primary/30 transition-all group"
              >
                <Monitor className="w-7 h-7 text-primary" />
                <span className="text-[8px] font-black uppercase text-white leading-tight">Full<br/>Screen</span>
              </Button>
          </div>

          {/* MAIN POPUP (Video Area) */}
          <div className="w-[48vw] h-[52vh] glass-panel rounded-[3rem] border-white/20 flex flex-col shadow-[0_40px_120px_rgba(0,0,0,0.9)] overflow-hidden">
            <div className="h-14 flex items-center justify-between px-8 bg-black/50 backdrop-blur-2xl border-b border-white/10">
              <div className="flex items-center gap-3">
                <YoutubeIcon className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-[11px] text-white/90 font-headline truncate max-w-[280px] uppercase tracking-[0.2em]">{activeVideo.title}</h3>
              </div>
              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setActiveVideo(null); }} className="w-10 h-10 rounded-full hover:bg-red-500/20 text-white/40">
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex-1 bg-black relative">
              <iframe
                ref={iframeRef}
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${activeVideo.id}?autoplay=1&controls=1&modestbranding=1&rel=0&start=${startSeconds}&playbackRate=${rate}`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>

            <div className="h-20 bg-black/80 backdrop-blur-3xl border-t border-white/10 flex items-center justify-between px-8">
              <div className="flex items-center gap-4">
                <Button variant="default" size="icon" onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }} className="h-14 w-14 rounded-full bg-white text-black shadow-xl hover:scale-105 transition-transform">
                  {isPlaying ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current ml-1" />}
                </Button>
                <div className="h-1 w-20 bg-white/10 rounded-full overflow-hidden">
                   <div className="h-full bg-primary w-1/3 animate-pulse" />
                </div>
              </div>

              <Button 
                variant="ghost" 
                size="icon" 
                onClick={(e) => { e.stopPropagation(); toggleSaveVideo(activeVideo); }}
                className={cn("w-12 h-12 rounded-full", isSaved ? "bg-accent/20 text-accent" : "text-white/40")}
              >
                <Bookmark className={cn("w-6 h-6", isSaved && "fill-current")} />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
