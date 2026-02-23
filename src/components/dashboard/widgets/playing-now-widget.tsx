"use client";

import { useMediaStore } from "@/lib/store";
import { Play, Pause, Music, Radio, Activity, Maximize2 } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PlayingNowWidget() {
  const { activeVideo, isPlaying, setIsPlaying, setIsMinimized } = useMediaStore();

  return (
    <div className="h-full bg-zinc-900/60 backdrop-blur-3xl rounded-[2.5rem] border border-white/5 p-8 flex flex-col justify-between relative shadow-2xl overflow-hidden group">
      <div className="absolute top-6 left-8 flex items-center gap-2">
        <Activity className={cn("w-4 h-4 text-accent", isPlaying && "animate-pulse")} />
        <span className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em]">Active Transmission</span>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center gap-4">
        {activeVideo ? (
          <>
            <div className="relative w-32 h-32 rounded-3xl overflow-hidden ios-shadow group-hover:scale-105 transition-transform duration-500">
              <Image 
                src={activeVideo.thumbnail} 
                alt={activeVideo.title} 
                fill 
                className="object-cover opacity-80"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 group">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/10 hover:bg-white/40"
                >
                  {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                </Button>
              </div>
            </div>
            <div className="text-center space-y-1 px-4 max-w-full">
              <h3 className="text-sm font-bold font-headline text-white truncate w-48 mx-auto">
                {activeVideo.title}
              </h3>
              <p className="text-[9px] text-accent font-bold uppercase tracking-widest">Active Signal</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsMinimized(false)}
              className="rounded-xl border-white/10 bg-white/5 text-[10px] font-bold h-8 px-4"
            >
              <Maximize2 className="w-3 h-3 mr-2" /> Expand Viewer
            </Button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 opacity-40">
            <div className="w-24 h-24 rounded-full bg-white/5 border border-white/5 flex items-center justify-center">
              <Radio className="w-10 h-10 text-white" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest">No Active Stream</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-3">
        <div className="h-1 w-12 bg-accent/40 rounded-full overflow-hidden">
          <div className={cn("h-full bg-accent w-1/3", isPlaying && "animate-[shimmer_2s_infinite]")} />
        </div>
        <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">Buffer Optimized</span>
      </div>
    </div>
  );
}
