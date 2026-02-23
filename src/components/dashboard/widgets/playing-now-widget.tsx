
"use client";

import { useMediaStore } from "@/lib/store";
import { Play, Music, Radio, Activity } from "lucide-react";
import Image from "next/image";

export function PlayingNowWidget() {
  const { savedVideos } = useMediaStore();
  const lastPlayed = savedVideos[0]; // التظاهر بآخر فيديو تم التفاعل معه

  return (
    <div className="h-full bg-zinc-900/60 backdrop-blur-3xl rounded-[2.5rem] border border-white/5 p-8 flex flex-col justify-between relative shadow-2xl overflow-hidden group">
      <div className="absolute top-6 left-8 flex items-center gap-2">
        <Activity className="w-4 h-4 text-accent animate-pulse" />
        <span className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em]">Active Transmission</span>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center gap-4">
        {lastPlayed ? (
          <>
            <div className="relative w-32 h-32 rounded-3xl overflow-hidden ios-shadow group-hover:scale-105 transition-transform duration-500">
              <Image 
                src={lastPlayed.thumbnail} 
                alt={lastPlayed.title} 
                fill 
                className="object-cover opacity-80"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <Play className="w-10 h-10 text-white fill-white" />
              </div>
            </div>
            <div className="text-center space-y-1 px-4">
              <h3 className="text-lg font-bold font-headline text-white truncate max-w-[200px]">
                {lastPlayed.title}
              </h3>
              <p className="text-[10px] text-accent font-bold uppercase tracking-widest">Live Frequency</p>
            </div>
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
          <div className="h-full bg-accent w-1/3 animate-[shimmer_2s_infinite]" />
        </div>
        <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">Buffer Optimized</span>
      </div>
    </div>
  );
}
