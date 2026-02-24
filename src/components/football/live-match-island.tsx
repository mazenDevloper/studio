
"use client";

import { useEffect, useState } from "react";
import { MOCK_MATCHES, Match } from "@/lib/football-data";
import { useMediaStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Trophy, Timer } from "lucide-react";
import Image from "next/image";

export function LiveMatchIsland() {
  const { favoriteTeams } = useMediaStore();
  const [liveMatch, setLiveMatch] = useState<Match | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Show island only if a LIVE match involves one of the user's favorite teams
    const match = MOCK_MATCHES.find(m => 
      m.status === 'live' && 
      (favoriteTeams.includes(m.homeTeam) || favoriteTeams.includes(m.awayTeam))
    );
    setLiveMatch(match || null);
  }, [favoriteTeams]);

  if (!liveMatch) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] pointer-events-auto">
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "bg-black/80 backdrop-blur-3xl border border-white/15 rounded-full shadow-[0_15px_30px_rgba(0,0,0,0.8)] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] cursor-pointer overflow-hidden",
          isExpanded ? "w-[500px] h-24 px-8" : "w-64 h-12 px-4"
        )}
      >
        <div className="h-full flex items-center justify-between">
          {!isExpanded ? (
            // Collapsed View
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">مباشر</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-white">{liveMatch.homeTeam}</span>
                <span className="text-sm font-black text-primary">{liveMatch.score?.home} - {liveMatch.score?.away}</span>
                <span className="text-xs font-bold text-white">{liveMatch.awayTeam}</span>
              </div>
              <div className="flex items-center gap-1">
                <Timer className="w-3 h-3 text-accent" />
                <span className="text-[10px] font-black text-accent">{liveMatch.minute}'</span>
              </div>
            </div>
          ) : (
            // Expanded View
            <div className="flex items-center justify-between w-full animate-in fade-in zoom-in-95 duration-500">
              <div className="flex flex-col items-center gap-1 w-24">
                <div className="relative w-10 h-10">
                  <Image src={liveMatch.homeLogo} alt={liveMatch.homeTeam} fill className="object-contain" />
                </div>
                <span className="text-[10px] font-black text-white/80 truncate w-full text-center">{liveMatch.homeTeam}</span>
              </div>

              <div className="flex flex-col items-center gap-2">
                <div className="text-xs font-black text-white/40 uppercase tracking-widest">{liveMatch.league}</div>
                <div className="flex items-center gap-6">
                  <span className="text-4xl font-black text-white">{liveMatch.score?.home}</span>
                  <div className="flex flex-col items-center">
                    <span className="text-lg font-black text-primary tracking-tighter animate-pulse">{liveMatch.minute}'</span>
                    <div className="h-0.5 w-8 bg-primary/20 rounded-full" />
                  </div>
                  <span className="text-4xl font-black text-white">{liveMatch.score?.away}</span>
                </div>
                <div className="text-[9px] font-bold text-accent uppercase tracking-[0.2em]">{liveMatch.channel}</div>
              </div>

              <div className="flex flex-col items-center gap-1 w-24">
                <div className="relative w-10 h-10">
                  <Image src={liveMatch.awayLogo} alt={liveMatch.awayTeam} fill className="object-contain" />
                </div>
                <span className="text-[10px] font-black text-white/80 truncate w-full text-center">{liveMatch.awayTeam}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
