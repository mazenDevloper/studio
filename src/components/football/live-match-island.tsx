
"use client";

import { useEffect, useState, useCallback } from "react";
import { Match } from "@/lib/football-data";
import { fetchFootballData } from "@/lib/football-api";
import { useMediaStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Activity, Trophy, Clock, Timer } from "lucide-react";

export function LiveMatchIsland() {
  const { favoriteTeams, favoriteLeagueIds } = useMediaStore();
  const [topMatches, setTopMatches] = useState<Match[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDetailed, setIsDetailed] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const now = new Date();
      const currentHour = now.getHours();
      
      let matches: Match[] = [];
      // جلب مباريات اليوم (وأمس إذا كنا في وقت مبكر جداً)
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
        setTopMatches([]);
        return;
      }

      const isFavoriteMatch = (m: Match) => 
        (m.homeTeamId && favoriteTeams.some(t => t.id === m.homeTeamId)) || 
        (m.awayTeamId && favoriteTeams.some(t => t.id === m.awayTeamId)) ||
        (m.leagueId && favoriteLeagueIds.includes(m.leagueId));

      // منطق الأولويات الصارم:
      // 1. مباشر مفضل
      // 2. قادم مفضل (الأقرب وقتاً)
      // 3. مباشر عام
      // 4. قادم عام
      const favLive = matches.filter(m => m.status === 'live' && isFavoriteMatch(m))
        .sort((a,b) => (b.minute || 0) - (a.minute || 0));
      
      const favUpcoming = matches.filter(m => m.status === 'upcoming' && isFavoriteMatch(m))
        .sort((a,b) => new Date(a.date || "").getTime() - new Date(b.date || "").getTime());
      
      const genLive = matches.filter(m => m.status === 'live' && !isFavoriteMatch(m))
        .sort((a,b) => (b.minute || 0) - (a.minute || 0));
      
      const genUpcoming = matches.filter(m => m.status === 'upcoming' && !isFavoriteMatch(m))
        .sort((a,b) => new Date(a.date || "").getTime() - new Date(b.date || "").getTime());

      const prioritized = [...favLive, ...favUpcoming, ...genLive, ...genUpcoming].slice(0, 3);
      setTopMatches(prioritized);
    } catch (error) {
      console.error("Island Sync Error:", error);
    }
  }, [favoriteTeams, favoriteLeagueIds]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 45000); 
    return () => clearInterval(interval);
  }, [fetchStatus]);

  if (topMatches.length === 0) return null;

  const handleIslandClick = (index: number) => {
    if (index === activeIndex) {
      setIsDetailed(!isDetailed);
    } else {
      setActiveIndex(index);
      setIsDetailed(false);
    }
  };

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 pointer-events-none">
      {topMatches.map((match, idx) => {
        const isActive = idx === activeIndex;
        const isLive = match.status === 'live';

        if (isActive) {
          return (
            <div key={match.id} className="pointer-events-auto">
              <div 
                onClick={() => handleIslandClick(idx)}
                tabIndex={0}
                className={cn(
                  "bg-black/95 backdrop-blur-3xl border border-white/20 rounded-full shadow-[0_40px_100px_rgba(0,0,0,1)] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer overflow-hidden ring-4 ring-white/5 focusable outline-none",
                  isDetailed ? "w-[580px] h-48 px-10" : "w-80 h-16 px-6"
                )}
                data-nav-id={`island-active-${match.id}`}
              >
                <div className="h-full flex items-center justify-between">
                  {!isDetailed ? (
                    <div className="flex items-center justify-between w-full animate-in fade-in slide-in-from-top-4 duration-500">
                      <div className="flex items-center gap-4">
                        <img src={match.homeLogo} alt="" className="w-9 h-9 object-contain drop-shadow-md" />
                        <div className={cn(
                          "px-4 py-1.5 rounded-2xl border shadow-inner transition-all min-w-[100px] flex justify-center items-center",
                          isLive ? "bg-white/10 border-white/10" : "bg-primary/20 border-primary/40"
                        )}>
                          <span className={cn(
                            "font-black tabular-nums tracking-tighter",
                            isLive ? "text-xl text-primary" : "text-3xl text-white"
                          )}>
                            {isLive ? `${match.score?.home} - ${match.score?.away}` : match.startTime}
                          </span>
                        </div>
                        <img src={match.awayLogo} alt="" className="w-9 h-9 object-contain drop-shadow-md" />
                      </div>
                      
                      <div className="flex items-center gap-3 pr-2">
                        {isLive ? (
                          <>
                            <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse shadow-[0_0_12px_red]" />
                            <span className="text-sm font-black text-accent tabular-nums">{match.minute}'</span>
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
                        <img src={match.homeLogo} alt="" className="w-20 h-20 object-contain transition-transform group-hover:scale-110" />
                        <span className="text-[10px] font-black text-white/90 truncate w-full text-center uppercase tracking-tighter">{match.homeTeam}</span>
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
                              <span className="text-7xl font-black text-white drop-shadow-[0_0_40px_rgba(255,255,255,0.1)] tabular-nums">{match.score?.home}</span>
                              <div className="flex flex-col items-center gap-2">
                                <span className="text-3xl font-black text-primary tracking-tighter animate-pulse">{match.minute}'</span>
                              </div>
                              <span className="text-7xl font-black text-white drop-shadow-[0_0_40px_rgba(255,255,255,0.1)] tabular-nums">{match.score?.away}</span>
                            </>
                          ) : (
                            <div className="flex flex-col items-center">
                              <span className="text-8xl font-black text-white drop-shadow-[0_0_60px_rgba(255,255,255,0.2)] tabular-nums tracking-tighter">
                                {match.startTime}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col items-center gap-1">
                           <div className="text-[9px] font-bold text-white/40 uppercase tracking-[0.3em] flex items-center gap-2 text-center">
                            <Trophy className="w-4 h-4 text-accent" />
                            <span className="truncate max-w-[220px]">{match.league}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-center gap-3 w-32 group">
                        <img src={match.awayLogo} alt="" className="w-20 h-20 object-contain transition-transform group-hover:scale-110" />
                        <span className="text-[10px] font-black text-white/90 truncate w-full text-center uppercase tracking-tighter">{match.awayTeam}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        } else {
          // جزر مصغرة (Minimized)
          return (
            <div 
              key={match.id} 
              onClick={() => handleIslandClick(idx)}
              className="pointer-events-auto w-16 h-16 rounded-full bg-black/95 backdrop-blur-3xl border border-white/20 flex flex-col items-center justify-center p-2 shadow-2xl ring-4 ring-white/5 animate-in fade-in slide-in-from-right-4 duration-1000 cursor-pointer hover:scale-110 active:scale-90 transition-all focusable outline-none"
              tabIndex={0}
              data-nav-id={`island-mini-${match.id}`}
            >
               <div className="flex flex-col gap-1 items-center scale-90">
                  <img src={match.homeLogo} alt="" className="w-6 h-6 object-contain drop-shadow-sm" />
                  <div className={cn("h-px w-4", isLive ? "bg-primary/50" : "bg-white/10")} />
                  <img src={match.awayLogo} alt="" className="w-6 h-6 object-contain drop-shadow-sm" />
               </div>
               {isLive && (
                 <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full border-2 border-black animate-pulse" />
               )}
            </div>
          );
        }
      })}
    </div>
  );
}
