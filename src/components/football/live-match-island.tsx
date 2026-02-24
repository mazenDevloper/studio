"use client";

import { useEffect, useState, useCallback } from "react";
import { Match, MOCK_MATCHES } from "@/lib/football-data";
import { useMediaStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Timer, Trophy, Tv } from "lucide-react";
import Image from "next/image";

export function LiveMatchIsland() {
  const { favoriteTeams } = useMediaStore();
  const [liveMatch, setLiveMatch] = useState<Match | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const fetchLiveStatus = useCallback(async () => {
    try {
      // Logic for dynamic island:
      // Only show if a match status is 'live' AND one of the teams is in favoriteTeams
      
      // Simulation of current real-time data
      const currentMatches: Match[] = MOCK_MATCHES;

      const activeFavMatch = currentMatches.find(m => 
        m.status === 'live' && 
        (favoriteTeams.includes(m.homeTeam) || favoriteTeams.includes(m.awayTeam))
      );

      setLiveMatch(activeFavMatch || null);
    } catch (error) {
      console.error("Island Sync Error:", error);
    }
  }, [favoriteTeams]);

  useEffect(() => {
    fetchLiveStatus();
    const interval = setInterval(fetchLiveStatus, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [fetchLiveStatus]);

  if (!liveMatch) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] pointer-events-auto">
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "bg-black/90 backdrop-blur-3xl border border-white/20 rounded-full shadow-[0_20px_60px_rgba(0,0,0,1)] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] cursor-pointer overflow-hidden ring-1 ring-white/10",
          isExpanded ? "w-[520px] h-36 px-10" : "w-72 h-14 px-6"
        )}
      >
        <div className="h-full flex items-center justify-between">
          {!isExpanded ? (
            <div className="flex items-center justify-between w-full animate-in fade-in slide-in-from-top-2 duration-500">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse shadow-[0_0_10px_red]" />
                <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">LIVE</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-black text-white tracking-tighter">{liveMatch.homeTeam}</span>
                <div className="bg-white/10 px-3 py-1 rounded-lg">
                  <span className="text-lg font-black text-primary">{liveMatch.score?.home} - {liveMatch.score?.away}</span>
                </div>
                <span className="text-sm font-black text-white tracking-tighter">{liveMatch.awayTeam}</span>
              </div>
              <div className="flex items-center gap-2">
                <Timer className="w-3.5 h-3.5 text-accent" />
                <span className="text-[10px] font-black text-accent">{liveMatch.minute}'</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full animate-in fade-in zoom-in-95 duration-700">
              <div className="flex flex-col items-center gap-2 w-28 group">
                <div className="relative w-14 h-14 transition-transform group-hover:scale-110 duration-500">
                  <Image src={liveMatch.homeLogo} alt={liveMatch.homeTeam} fill className="object-contain" />
                </div>
                <span className="text-[11px] font-black text-white/80 truncate w-full text-center uppercase tracking-tighter">{liveMatch.homeTeam}</span>
              </div>

              <div className="flex flex-col items-center gap-3">
                <div className="text-[9px] font-black text-white/40 uppercase tracking-[0.3em] bg-white/5 px-4 py-1 rounded-full border border-white/5">{liveMatch.league}</div>
                <div className="flex items-center gap-8">
                  <span className="text-6xl font-black text-white drop-shadow-[0_10px_30px_rgba(255,255,255,0.2)]">{liveMatch.score?.home}</span>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-2xl font-black text-primary tracking-tighter animate-pulse">{liveMatch.minute}'</span>
                    <div className="h-1 w-12 bg-primary/20 rounded-full" />
                  </div>
                  <span className="text-6xl font-black text-white drop-shadow-[0_10px_30px_rgba(255,255,255,0.2)]">{liveMatch.score?.away}</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="text-[10px] font-bold text-accent uppercase tracking-[0.4em] flex items-center gap-2">
                     <Tv className="w-3 h-3" />
                     {liveMatch.broadcasts && liveMatch.broadcasts.length > 0 ? liveMatch.broadcasts[0].channel : liveMatch.channel}
                  </div>
                  <span className="text-[9px] text-white/30 font-bold uppercase">{liveMatch.commentator}</span>
                </div>
              </div>

              <div className="flex flex-col items-center gap-2 w-28 group">
                <div className="relative w-14 h-14 transition-transform group-hover:scale-110 duration-500">
                  <Image src={liveMatch.awayLogo} alt={liveMatch.awayTeam} fill className="object-contain" />
                </div>
                <span className="text-[11px] font-black text-white/80 truncate w-full text-center uppercase tracking-tighter">{liveMatch.awayTeam}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
