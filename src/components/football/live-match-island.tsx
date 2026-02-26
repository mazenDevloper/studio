
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Match } from "@/lib/football-data";
import { fetchFootballData } from "@/lib/football-api";
import { useMediaStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Activity, Trophy, Clock, Timer, BellRing, Sparkles } from "lucide-react";

export function LiveMatchIsland() {
  const { favoriteTeams, favoriteLeagueIds, prayerTimes, belledMatchIds } = useMediaStore();
  const [topMatches, setTopMatches] = useState<Match[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDetailed, setIsDetailed] = useState(false);
  
  // نظام التنبيهات
  const [notification, setNotification] = useState<{ type: 'azan' | 'iqamah', name: string } | null>(null);
  
  // رادار الأهداف
  const lastScoresRef = useRef<Record<string, { home: number, away: number }>>({});
  const goalTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const now = new Date();
      const currentHour = now.getHours();
      
      let matches: Match[] = [];
      // جلب مباريات اليوم، مع دعم مباريات الفجر (yesterday)
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

      const isBelledMatch = (m: Match) => belledMatchIds.includes(m.id);
      const isFavoriteMatch = (m: Match) => 
        (m.homeTeamId && favoriteTeams.some(t => t.id === m.homeTeamId)) || 
        (m.awayTeamId && favoriteTeams.some(t => t.id === m.awayTeamId)) ||
        (m.leagueId && favoriteLeagueIds.includes(m.leagueId));

      // الأولوية القصوى: المفضلات والجرس
      // الترتيب: (جرس مباشر) -> (جرس قادم) -> (مفضل مباشر) -> (مفضل قادم) -> (عام مباشر)
      const belledLive = matches.filter(m => m.status === 'live' && isBelledMatch(m));
      const belledUpcoming = matches.filter(m => m.status === 'upcoming' && isBelledMatch(m));
      
      const favLive = matches.filter(m => m.status === 'live' && isFavoriteMatch(m) && !isBelledMatch(m));
      const favUpcoming = matches.filter(m => m.status === 'upcoming' && isFavoriteMatch(m) && !isBelledMatch(m));
      
      const genLive = matches.filter(m => m.status === 'live' && !isFavoriteMatch(m) && !isBelledMatch(m));
      const genUpcoming = matches.filter(m => m.status === 'upcoming' && !isFavoriteMatch(m) && !isBelledMatch(m));

      const prioritized = [
        ...belledLive, 
        ...favLive, 
        ...belledUpcoming, 
        ...favUpcoming, 
        ...genLive, 
        ...genUpcoming
      ].slice(0, 3);
      
      // منطق رادار الأهداف: التوسع التلقائي عند التغيير في النتيجة
      prioritized.forEach((m, idx) => {
        if (m.status === 'live' && m.score) {
          const lastScore = lastScoresRef.current[m.id];
          if (lastScore) {
            const isGoal = m.score.home > lastScore.home || m.score.away > lastScore.away;
            if (isGoal) {
              setActiveIndex(idx);
              setIsDetailed(true);
              
              if (goalTimerRef.current) clearTimeout(goalTimerRef.current);
              goalTimerRef.current = setTimeout(() => {
                setIsDetailed(false);
              }, 15000);
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

  // مراقبة مواقيت الصلاة
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
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] pointer-events-auto">
        <div className={cn(
          "bg-black rounded-full shadow-[0_40px_100px_rgba(0,0,0,1)] border-2 border-accent transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] w-[500px] h-24 flex items-center justify-between px-10 relative overflow-hidden ring-8 ring-accent/10",
          "animate-in fade-in zoom-in-95"
        )}>
          <div className="absolute inset-0 bg-gradient-to-t from-accent/20 via-transparent to-transparent animate-pulse" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-accent/10 via-transparent to-transparent opacity-50" />
          
          <div className="flex items-center gap-6 relative z-10">
            <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center shadow-[0_0_30px_rgba(65,184,131,0.8)] animate-bounce">
              <BellRing className="w-8 h-8 text-black fill-current" />
            </div>
            <div className="flex flex-col text-right">
              <span className="text-xl font-black text-white uppercase tracking-tighter">
                {notification.type === 'azan' ? `حان وقت أذان ${notification.name}` : `إقامة صلاة ${notification.name}`}
              </span>
              <span className="text-[10px] text-accent font-black uppercase tracking-[0.4em]">
                {notification.type === 'azan' ? "DIRECT SPIRITUAL FEED" : "PRAYER COMMENCING"}
              </span>
            </div>
          </div>
          <div className="relative z-10 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-accent animate-spin-slow" />
          </div>
        </div>
      </div>
    );
  }

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
                  "bg-black/95 backdrop-blur-3xl border border-white/20 rounded-full shadow-[0_40px_100px_rgba(0,0,0,1)] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer overflow-hidden ring-4 ring-white/5 focusable outline-none relative",
                  isDetailed ? "w-[580px] h-48 px-10" : "w-80 h-16 px-6"
                )}
                data-nav-id={`island-active-${match.id}`}
              >
                {isDetailed && isLive && (
                  <div className="absolute inset-0 bg-accent/5 animate-pulse pointer-events-none" />
                )}

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
          return (
            <div 
              key={match.id} 
              onClick={() => handleIslandClick(idx)}
              className="pointer-events-auto w-16 h-16 rounded-full bg-black/95 backdrop-blur-3xl border border-white/20 flex flex-col items-center justify-center p-2 shadow-2xl ring-4 ring-white/5 animate-in fade-in slide-in-from-right-4 duration-1000 cursor-pointer hover:scale-110 active:scale-90 transition-all focusable outline-none relative"
              tabIndex={0}
              data-nav-id={`island-mini-${match.id}`}
            >
               <div className="flex flex-col gap-1 items-center scale-90">
                  <img src={match.homeLogo} alt="" className="w-6 h-6 object-contain drop-shadow-sm" />
                  
                  {isLive ? (
                    <span className="text-[10px] font-black text-primary tabular-nums leading-none -my-0.5 drop-shadow-glow">
                      {match.score?.home}-{match.score?.away}
                    </span>
                  ) : (
                    <div className={cn("h-px w-4", "bg-white/10")} />
                  )}
                  
                  <img src={match.awayLogo} alt="" className="w-6 h-6 object-contain drop-shadow-sm" />
               </div>
               
               {isLive && (
                 <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full border-2 border-black animate-pulse shadow-[0_0_8px_red]" />
               )}
            </div>
          );
        }
      })}
    </div>
  );
}
