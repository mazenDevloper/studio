
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Match } from "@/lib/football-data";
import { fetchFootballData } from "@/lib/football-api";
import { useMediaStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Activity, Trophy, Clock, Timer, BellRing, Sparkles } from "lucide-react";
import { FluidGlass } from "@/components/ui/fluid-glass";

export function LiveMatchIsland() {
  const { favoriteTeams, favoriteLeagueIds, prayerTimes, belledMatchIds } = useMediaStore();
  const [topMatches, setTopMatches] = useState<Match[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDetailed, setIsDetailed] = useState(false);
  
  const [notification, setNotification] = useState<{ type: 'azan' | 'iqamah', name: string } | null>(null);
  
  const lastScoresRef = useRef<Record<string, { home: number, away: number }>>({});
  const goalTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const now = new Date();
      const currentHour = now.getHours();
      
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
        setTopMatches([]);
        return;
      }

      const getMatchPriorityScore = (m: Match) => {
        let score = 0;
        // 1. الجرس أولاً (أولوية مطلقة)
        if (belledMatchIds.includes(m.id)) score += 10000;
        
        const isFavTeam = favoriteTeams.some(t => t.id === m.homeTeamId || t.id === m.awayTeamId);
        
        // 2. الفرق المفضلة المباشرة
        if (isFavTeam && m.status === 'live') score += 5000;
        
        // 3. الفرق المفضلة القادمة (الأقرب زمنياً)
        if (isFavTeam && m.status === 'upcoming') {
          score += 2000;
          try {
            const timeDiff = new Date(m.date!).getTime() - Date.now();
            if (timeDiff > 0) {
              score += Math.max(0, 1000 - (timeDiff / (1000 * 60 * 60))); 
            }
          } catch(e) {}
        }
        
        if (m.status === 'live') score += 1000;
        if (m.leagueId && favoriteLeagueIds.includes(m.leagueId)) score += 500;
        
        return score;
      };

      const prioritized = [...matches]
        .sort((a, b) => getMatchPriorityScore(b) - getMatchPriorityScore(a))
        .slice(0, 3);
      
      prioritized.forEach((m, idx) => {
        if (m.status === 'live' && m.score) {
          const lastScore = lastScoresRef.current[m.id];
          if (lastScore) {
            const isGoal = m.score.home > lastScore.home || m.score.away > lastScore.away;
            if (isGoal) {
              setActiveIndex(idx);
              setIsDetailed(true);
              if (goalTimerRef.current) clearTimeout(goalTimerRef.current);
              goalTimerRef.current = setTimeout(() => setIsDetailed(false), 15000);
            }
          }
          lastScoresRef.current[m.id] = { home: m.score.home, away: m.score.away };
        }
      });

      setTopMatches(prioritized);
    } catch (error) {
      console.error("Island Sync Error:", error);
    }
  }, [favoriteTeams, favoriteLeagueIds, belledMatchIds]);

  useEffect(() => {
    const checkPrayers = () => {
      if (!prayerTimes || prayerTimes.length === 0) return;
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const day = now.getDate().toString().padStart(2, '0');
      const dateStr = `2026-02-${day}`;
      const pData = prayerTimes.find(p => p.date === dateStr) || prayerTimes[0];
      
      const list = [
        { name: "الفجر", time: pData.fajr, iqamah: 25 },
        { name: "الظهر", time: pData.dhuhr, iqamah: 20 },
        { name: "العصر", time: pData.asr, iqamah: 20 },
        { name: "المغرب", time: pData.maghrib, iqamah: 10 },
        { name: "العشاء", time: pData.isha, iqamah: 20 },
      ];

      const timeToMinutes = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
      };

      for (let p of list) {
        const azanMins = timeToMinutes(p.time);
        const iqamahMins = azanMins + p.iqamah;
        if (currentMinutes === azanMins && now.getSeconds() < 10) {
          setNotification({ type: 'azan', name: p.name });
          setTimeout(() => setNotification(null), 15000);
        } else if (currentMinutes === iqamahMins && now.getSeconds() < 10) {
          setNotification({ type: 'iqamah', name: p.name });
          setTimeout(() => setNotification(null), 15000);
        }
      }
    };
    const interval = setInterval(checkPrayers, 1000);
    return () => clearInterval(interval);
  }, [prayerTimes]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); 
    return () => {
      clearInterval(interval);
      if (goalTimerRef.current) clearTimeout(goalTimerRef.current);
    };
  }, [fetchStatus]);

  if (topMatches.length === 0 && !notification) return null;

  const handleIslandClick = (index: number) => {
    if (index === activeIndex) {
      setIsDetailed(!isDetailed);
    } else {
      setActiveIndex(index);
      setIsDetailed(false);
    }
  };

  if (notification) {
    return (
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[10001] pointer-events-auto">
        <div className={cn(
          "liquid-glass rounded-full shadow-[0_40px_100px_rgba(0,0,0,1)] border-2 border-accent transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] w-[500px] h-24 flex items-center justify-between px-10 relative overflow-hidden ring-8 ring-accent/10",
          "animate-in fade-in zoom-in-95"
        )}>
          <FluidGlass scale={2} />
          <div className="absolute inset-0 bg-gradient-to-t from-accent/20 via-transparent to-transparent animate-pulse" />
          <div className="flex items-center gap-6 relative z-10">
            <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center shadow-[0_0_30px_rgba(65,184,131,0.8)] animate-bounce">
              <BellRing className="w-8 h-8 text-black fill-current" />
            </div>
            <div className="flex flex-col text-right">
              <span className="text-2xl font-black text-white uppercase tracking-tighter drop-shadow-xl">
                {notification.type === 'azan' ? `حان وقت أذان ${notification.name}` : `إقامة صلاة ${notification.name}`}
              </span>
              <span className="text-[10px] text-accent font-black uppercase tracking-[0.4em]">SPIRITUAL FEED</span>
            </div>
          </div>
          <span className="text-2xl animate-spin-slow relative z-10">✨</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[10001] flex items-center gap-3 pointer-events-none">
      {topMatches.map((match, idx) => {
        const isActive = idx === activeIndex;
        const isLive = match.status === 'live';

        if (isActive) {
          return (
            <div key={match.id} className="pointer-events-auto">
              <div 
                onClick={() => handleIslandClick(idx)}
                className={cn(
                  "liquid-glass rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,1)] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] cursor-pointer overflow-hidden focusable outline-none relative",
                  isDetailed ? "w-[600px] h-52 px-12" : "w-80 h-16 px-6"
                )}
              >
                <FluidGlass scale={isDetailed ? 3 : 1.5} />
                
                {isDetailed && isLive && (
                  <div className="absolute inset-0 bg-accent/5 animate-pulse pointer-events-none" />
                )}
                <div className="h-full flex items-center justify-between relative z-10">
                  {!isDetailed ? (
                    <div className="flex items-center justify-between w-full animate-in fade-in slide-in-from-top-4">
                      <div className="flex items-center gap-4">
                        <img src={match.homeLogo} alt="" className="w-9 h-9 object-contain drop-shadow-2xl" />
                        <div className={cn(
                          "px-4 py-1.5 rounded-2xl border transition-all min-w-[100px] flex justify-center items-center backdrop-blur-md",
                          isLive ? "bg-white/10 border-white/10" : "bg-primary/20 border-primary/40"
                        )}>
                          <span className={cn("font-black tabular-nums tracking-tighter drop-shadow-2xl", isLive ? "text-xl text-primary" : "text-3xl text-white")}>
                            {isLive ? `${match.score?.home} - ${match.score?.away}` : match.startTime}
                          </span>
                        </div>
                        <img src={match.awayLogo} alt="" className="w-9 h-9 object-contain drop-shadow-2xl" />
                      </div>
                      <div className="flex items-center gap-3">
                        {isLive ? (
                          <span className="text-base font-black text-accent tabular-nums drop-shadow-xl">{match.minute}'</span>
                        ) : (
                          <Clock className="w-5 h-5 text-primary drop-shadow-xl" />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between w-full animate-in fade-in zoom-in-95 duration-700">
                      <div className="flex flex-col items-center gap-3 w-32">
                        <div className="w-24 h-24 rounded-3xl bg-white/5 p-3 border border-white/10 flex items-center justify-center backdrop-blur-xl shadow-2xl">
                          <img src={match.homeLogo} alt="" className="w-full h-full object-contain" />
                        </div>
                        <span className="text-[12px] font-black text-white truncate w-full text-center uppercase tracking-tighter drop-shadow-lg">{match.homeTeam}</span>
                      </div>
                      <div className="flex flex-col items-center gap-4">
                        <div className={cn("flex items-center gap-2 px-5 py-2 rounded-full border shadow-lg backdrop-blur-3xl", isLive ? "bg-red-600/30 border-red-500 text-white" : "bg-primary/30 border-primary text-white")}>
                          <span className="text-[10px] font-black uppercase tracking-[0.3em]">{isLive ? "LIVE" : "UPCOMING"}</span>
                        </div>
                        <div className="flex items-center gap-8">
                          {isLive ? (
                            <>
                              <span className="text-8xl font-black text-white tabular-nums drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]">{match.score?.home}</span>
                              <span className="text-4xl font-black text-primary animate-pulse tracking-tighter drop-shadow-xl">{match.minute}'</span>
                              <span className="text-8xl font-black text-white tabular-nums drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]">{match.score?.away}</span>
                            </>
                          ) : (
                            <span className="text-9xl font-black text-white tabular-nums tracking-tighter drop-shadow-[0_0_40px_rgba(255,255,255,0.4)]">{match.startTime}</span>
                          )}
                        </div>
                        <div className="text-[10px] font-black text-white/50 uppercase tracking-[0.4em] flex items-center gap-2 drop-shadow-md">
                          <Trophy className="w-5 h-5 text-accent" />
                          <span className="truncate max-w-[200px]">{match.league}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-3 w-32">
                        <div className="w-24 h-24 rounded-3xl bg-white/5 p-3 border border-white/10 flex items-center justify-center backdrop-blur-xl shadow-2xl">
                          <img src={match.awayLogo} alt="" className="w-full h-full object-contain" />
                        </div>
                        <span className="text-[12px] font-black text-white truncate w-full text-center uppercase tracking-tighter drop-shadow-lg">{match.awayTeam}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        } else {
          return (
            <div 
              key={match.id} 
              onClick={() => handleIslandClick(idx)}
              className="pointer-events-auto w-24 h-24 rounded-full liquid-glass border border-white/20 flex flex-col items-center justify-center p-0 shadow-2xl cursor-pointer hover:scale-110 active:scale-90 transition-all focusable outline-none relative overflow-hidden"
            >
               <FluidGlass scale={0.8} />
               <div className="flex flex-col items-center gap-0.5 relative z-10 w-full h-full justify-center">
                  <div className="flex items-center justify-center gap-1 w-full">
                    <img src={match.homeLogo} alt="" className="w-7 h-7 object-contain drop-shadow-lg" />
                    <img src={match.awayLogo} alt="" className="w-7 h-7 object-contain drop-shadow-lg" />
                  </div>
                  <div className="w-full flex items-center justify-center">
                    {isLive && (
                      <span className="text-2xl font-black text-primary tabular-nums tracking-tighter drop-shadow-[0_0_15px_rgba(var(--primary),0.6)]">
                        {match.score?.home}-{match.score?.away}
                      </span>
                    )}
                    {!isLive && (
                      <span className="text-lg font-black text-white/90 tabular-nums leading-none text-center">
                        {match.startTime}
                      </span>
                    )}
                  </div>
               </div>
            </div>
          );
        }
      })}
    </div>
  );
}
