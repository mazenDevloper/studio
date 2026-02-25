
"use client";

import { useEffect, useState, useCallback } from "react";
import { Match } from "@/lib/football-data";
import { fetchFootballData } from "@/lib/football-api";
import { useMediaStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Activity, Trophy, Clock } from "lucide-react";

export function LiveMatchIsland() {
  const { favoriteTeamIds, favoriteLeagueIds } = useMediaStore();
  const [displayMatch, setDisplayMatch] = useState<Match | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const now = new Date();
      const currentHour = now.getHours();
      
      // Sports Day Logic: Dawn hours (00:00 - 06:00) belong to the previous night
      let matches: Match[] = [];
      if (currentHour < 6) {
        const [yesterday, today] = await Promise.all([
          fetchFootballData('yesterday'),
          fetchFootballData('today')
        ]);
        matches = [...yesterday, ...today];
      } else {
        matches = await fetchFootballData('today');
      }
      
      if (!matches || matches.length === 0) {
        setDisplayMatch(null);
        return;
      }

      // STRICT FAVORITE CONDITION: Only show if it's a favorite
      const isFavoriteMatch = (m: Match) => 
        (m.homeTeamId && favoriteTeamIds.includes(m.homeTeamId)) || 
        (m.awayTeamId && favoriteTeamIds.includes(m.awayTeamId)) ||
        (m.leagueId && favoriteLeagueIds.includes(m.leagueId));

      const favoriteMatches = matches.filter(isFavoriteMatch);

      if (favoriteMatches.length === 0) {
        setDisplayMatch(null);
        return;
      }

      // Priority: 1. Live Favorites, 2. Upcoming Favorites
      const liveMatches = favoriteMatches.filter(m => m.status === 'live');
      const upcomingMatches = favoriteMatches.filter(m => m.status === 'upcoming');

      let priorityMatch: Match | null = null;

      if (liveMatches.length > 0) {
        // Sort by minute descending (closest to end)
        priorityMatch = [...liveMatches].sort((a, b) => (b.minute || 0) - (a.minute || 0))[0];
      } else if (upcomingMatches.length > 0) {
        // Sort by start time ascending (closest to start)
        priorityMatch = [...upcomingMatches].sort((a, b) => {
          const dateA = new Date(a.date || "").getTime();
          const dateB = new Date(b.date || "").getTime();
          return dateA - dateB;
        })[0];
      }

      setDisplayMatch(priorityMatch);
    } catch (error) {
      console.error("Island Sync Error:", error);
    }
  }, [favoriteTeamIds, favoriteLeagueIds]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 45000); 
    return () => clearInterval(interval);
  }, [fetchStatus]);

  if (!displayMatch) return null;

  const isLive = displayMatch.status === 'live';

  return (
    <div 
      className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] pointer-events-auto"
      data-nav-id="live-match-island"
    >
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        tabIndex={0}
        className={cn(
          "bg-black/95 backdrop-blur-3xl border border-white/20 rounded-full shadow-[0_40px_100px_rgba(0,0,0,1)] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer overflow-hidden ring-4 ring-white/5 focusable outline-none",
          isExpanded ? "w-[580px] h-48 px-10" : "w-80 h-16 px-6"
        )}
      >
        <div className="h-full flex items-center justify-between">
          {!isExpanded ? (
            <div className="flex items-center justify-between w-full animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex items-center gap-4">
                <img src={displayMatch.homeLogo} alt="" className="w-9 h-9 object-contain drop-shadow-md" />
                <div className={cn(
                  "px-4 py-1.5 rounded-2xl border shadow-inner transition-all min-w-[100px] flex justify-center items-center",
                  isLive ? "bg-white/10 border-white/10" : "bg-primary/20 border-primary/40"
                )}>
                  <span className={cn(
                    "font-black tabular-nums tracking-tighter",
                    isLive ? "text-xl text-primary" : "text-3xl text-white"
                  )}>
                    {isLive ? `${displayMatch.score?.home} - ${displayMatch.score?.away}` : displayMatch.startTime}
                  </span>
                </div>
                <img src={displayMatch.awayLogo} alt="" className="w-9 h-9 object-contain drop-shadow-md" />
              </div>
              
              <div className="flex items-center gap-3 pr-2">
                {isLive ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse shadow-[0_0_12px_red]" />
                    <span className="text-sm font-black text-accent tabular-nums">{displayMatch.minute}'</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-tighter">قريباً</span>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full animate-in fade-in zoom-in-95 duration-700">
              <div className="flex flex-col items-center gap-3 w-32 group">
                <img src={displayMatch.homeLogo} alt="" className="w-20 h-20 object-contain transition-transform group-hover:scale-110" />
                <span className="text-[10px] font-black text-white/90 truncate w-full text-center uppercase tracking-tighter">{displayMatch.homeTeam}</span>
              </div>

              <div className="flex flex-col items-center gap-4">
                <div className={cn(
                  "flex items-center gap-2 px-4 py-1.5 rounded-full border transition-all",
                  isLive ? "bg-red-600/20 border-red-600/30" : "bg-primary/20 border-primary/30"
                )}>
                  {isLive ? (
                    <>
                      <Activity className="w-3 h-3 text-red-600 animate-pulse" />
                      <span className="text-[9px] font-black text-red-500 uppercase tracking-[0.2em]">LIVE FEED</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-3 h-3 text-primary" />
                      <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">UPCOMING</span>
                    </>
                  )}
                </div>
                
                <div className="flex items-center gap-8">
                  {isLive ? (
                    <>
                      <span className="text-7xl font-black text-white drop-shadow-[0_0_40px_rgba(255,255,255,0.1)] tabular-nums">{displayMatch.score?.home}</span>
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-3xl font-black text-primary tracking-tighter animate-pulse">{displayMatch.minute}'</span>
                      </div>
                      <span className="text-7xl font-black text-white drop-shadow-[0_0_40px_rgba(255,255,255,0.1)] tabular-nums">{displayMatch.score?.away}</span>
                    </>
                  ) : (
                    <div className="flex flex-col items-center">
                      <span className="text-8xl font-black text-white drop-shadow-[0_0_60px_rgba(255,255,255,0.2)] tabular-nums tracking-tighter">
                        {displayMatch.startTime}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col items-center gap-1">
                   <div className="text-[9px] font-bold text-white/40 uppercase tracking-[0.3em] flex items-center gap-2 text-center">
                    <Trophy className="w-4 h-4 text-accent" />
                    <span className="truncate max-w-[220px]">{displayMatch.league}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-3 w-32 group">
                <img src={displayMatch.awayLogo} alt="" className="w-20 h-20 object-contain transition-transform group-hover:scale-110" />
                <span className="text-[10px] font-black text-white/90 truncate w-full text-center uppercase tracking-tighter">{displayMatch.awayTeam}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
