
"use client";

import { useMediaStore } from "@/lib/store";
import { Play, Pause, Radio, Activity, Maximize2 } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PlayingNowWidget() {
  const { activeVideo, isPlaying, setIsPlaying, setIsMinimized } = useMediaStore();

  return (
    <div className="h-full w-full bg-zinc-900/60 backdrop-blur-3xl rounded-[2.5rem] border border-white/5 relative shadow-2xl overflow-hidden group">
      {activeVideo ? (
        <>
          {/* Background Image filling the card (Full Cover) */}
          <div className="absolute inset-0 z-0">
            <Image 
              src={activeVideo.thumbnail} 
              alt={activeVideo.title} 
              fill 
              className="object-cover opacity-60 group-hover:scale-110 transition-transform duration-[10s]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
          </div>

          <div className="relative z-10 h-full p-8 flex flex-col justify-between items-center text-center">
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className={cn("w-4 h-4 text-accent", isPlaying && "animate-pulse")} />
                <span className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em]">Active Transmission</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsMinimized(false)}
                className="w-8 h-8 rounded-full bg-white/5 border border-white/10"
              >
                <Maximize2 className="w-3.5 h-3.5 text-white" />
              </Button>
            </div>

            <div className="flex flex-col items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/10 hover:bg-white/40 shadow-2xl transition-all active:scale-90"
              >
                {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
              </Button>
              <div className="space-y-1 px-4 max-w-full">
                <h3 className="text-sm font-black font-headline text-white line-clamp-2 leading-tight uppercase tracking-tight drop-shadow-lg">
                  {activeVideo.title}
                </h3>
                <p className="text-[9px] text-accent font-black uppercase tracking-[0.3em] drop-shadow-md">Direct Feed</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-1 w-12 bg-accent/20 rounded-full overflow-hidden">
                <div className={cn("h-full bg-accent w-1/3 shadow-[0_0_8px_hsl(var(--accent))]", isPlaying && "animate-[shimmer_2s_infinite]")} />
              </div>
              <span className="text-[9px] text-white/20 font-bold uppercase tracking-widest">Optimized Signal</span>
            </div>
          </div>
        </>
      ) : (
        <div className="h-full w-full flex flex-col items-center justify-center gap-6 p-8">
          <div className="absolute top-6 left-8 flex items-center gap-2">
            <Activity className="w-4 h-4 text-white/10" />
            <span className="text-[10px] text-white/20 font-bold uppercase tracking-[0.2em]">Idle Mode</span>
          </div>
          <div className="w-24 h-24 rounded-full bg-white/5 border border-white/5 flex items-center justify-center">
            <Radio className="w-10 h-10 text-white/20" />
          </div>
          <p className="text-xs font-black text-white/20 uppercase tracking-[0.4em]">No Active Stream</p>
        </div>
      )}
    </div>
  );
}
