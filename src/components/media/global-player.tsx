
"use client";

import { useMediaStore } from "@/lib/store";
import { X, Maximize2, Play, Pause, SkipForward, SkipBack, Music, LayoutGrid, Youtube as YoutubeIcon, ArrowLeft, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export function GlobalVideoPlayer() {
  const { activeVideo, isPlaying, isMinimized, setActiveVideo, setIsPlaying, setIsMinimized, toggleMinimize } = useMediaStore();
  const [mounted, setMounted] = useState(false);
  const [rate, setRate] = useState(1.0);
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

  const rates = [1.0, 1.25, 1.5, 1.65];

  return (
    <div 
      className={cn(
        "fixed z-[100] transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden",
        isMinimized 
          ? "bottom-8 right-8 w-[420px] h-20 capsule-player animate-in fade-in slide-in-from-bottom-4" 
          : "inset-0 bg-black flex flex-col"
      )}
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
                  {rates.map(r => (
                    <button 
                      key={r}
                      onClick={(e) => { e.stopPropagation(); setRate(r); }}
                      className={cn(
                        "text-[8px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-widest transition-all",
                        rate === r ? "bg-primary text-white shadow-[0_0_15px_hsl(var(--primary)/0.5)]" : "bg-white/5 text-white/40 hover:bg-white/10"
                      )}
                    >
                      {r}x
                    </button>
                  ))}
                </div>
              </div>
           </div>
           
           <div className="flex items-center gap-1.5 bg-black/40 p-1.5 rounded-full border border-white/5">
              <Button variant="ghost" size="icon" onClick={() => setIsPlaying(!isPlaying)} className="h-10 w-10 rounded-full hover:bg-white/10 text-white transition-transform active:scale-90">
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsMinimized(false)} className="h-10 w-10 rounded-full bg-primary/20 text-primary hover:bg-primary hover:text-white transition-all">
                <Maximize2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setActiveVideo(null)} className="h-10 w-10 rounded-full hover:bg-red-500/20 text-red-500 transition-colors">
                <X className="w-4 h-4" />
              </Button>
           </div>
        </div>
      ) : (
        <>
          <div className="h-20 flex items-center justify-between px-8 bg-black/60 backdrop-blur-2xl border-b border-white/5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center border border-red-600/30">
                <YoutubeIcon className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex flex-col">
                <h3 className="font-bold text-lg text-white font-headline truncate max-w-xl leading-none">{activeVideo.title}</h3>
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1 opacity-60">تعديل جودة البث: 1080p HQ</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setActiveVideo(null)} className="w-12 h-12 rounded-full hover:bg-red-500/20 text-white/40 hover:text-red-500 transition-colors">
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
            
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/80 to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
          </div>
          
          <div className="h-40 bg-zinc-900/95 backdrop-blur-3xl border-t border-white/10 flex items-center justify-between px-12 pb-4">
            {/* Left Controls */}
            <div className="flex items-center gap-4 w-1/3">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => router.back()}
                  className="h-14 w-14 rounded-full bg-white/5 hover:bg-white/10 text-white border border-white/5 transition-all active:scale-95 shadow-xl"
                  title="رجوع"
                >
                  <ArrowLeft className="w-7 h-7" />
                </Button>

                <div className="h-10 w-[1px] bg-white/10 mx-2" />

                <div className="flex gap-1.5">
                  {rates.map(r => (
                    <Button 
                      key={r} 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setRate(r)}
                      className={cn(
                        "rounded-xl px-3 font-black text-[10px] uppercase tracking-tighter h-10 transition-all",
                        rate === r ? "bg-primary text-white" : "bg-white/5 text-white/40"
                      )}
                    >
                      {r}x
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Middle Controls - Focus Center */}
            <div className="flex flex-col items-center justify-center gap-3 w-1/3">
              <div className="flex items-center gap-8">
                <Button variant="ghost" size="icon" className="h-14 w-14 rounded-full text-white/20 hover:text-white transition-all active:scale-90">
                  <SkipBack className="w-8 h-8 fill-current" />
                </Button>
                <Button 
                  variant="default" 
                  size="icon" 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="h-20 w-20 rounded-full bg-white text-black hover:scale-110 transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)] active:scale-95 group"
                >
                  {isPlaying ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current ml-1" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-14 w-14 rounded-full text-white/20 hover:text-white transition-all active:scale-90">
                  <SkipForward className="w-8 h-8 fill-current" />
                </Button>
              </div>
              
              {/* Standard Minimize Button - Centralized Below Playback */}
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => toggleMinimize()}
                className="h-16 w-16 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-all active:scale-95 shadow-lg flex flex-col items-center justify-center"
                title="تصغير للكبسولة"
              >
                <Minimize2 className="w-8 h-8" />
                <span className="text-[8px] font-black uppercase mt-1">Capsule</span>
              </Button>
            </div>

            {/* Right Controls */}
            <div className="w-1/3 flex justify-end gap-4">
               <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Audio Focus</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[9px] text-white/40 font-bold uppercase">Background Mode Enabled</span>
                  </div>
               </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
