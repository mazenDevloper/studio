
"use client";

import { useEffect, useState, useCallback } from "react";
import { Match } from "@/lib/football-data";
import { fetchFootballData } from "@/lib/football-api";
import { useMediaStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Clock, BellRing, Sparkles, Timer, Moon, Sun } from "lucide-react";
import { FluidGlass } from "@/components/ui/fluid-glass";

const ATHKAR = [
  "سبحان الله وبحمده",
  "لا إله إلا الله وحده لا شريك له",
  "اللهم صل وسلم على نبينا محمد",
  "أستغفر الله العظيم وأتوب إليه",
  "سبحان الله العظيم",
  "الحمد لله رب العالمين",
  "الله أكبر كبيراً",
  "لا حول ولا قوة إلا بالله"
];

export function LiveMatchIsland() {
  const { favoriteTeams, prayerTimes, belledMatchIds } = useMediaStore();
  const [topMatches, setTopMatches] = useState<Match[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDetailed, setIsDetailed] = useState(false);
  const [dhikr, setDhikr] = useState(ATHKAR[0]);
  
  const [activeAlert, setActiveAlert] = useState<{ 
    type: 'azan' | 'iqamah' | 'countdown' | 'countup' | 'dhikr' | 'duha', 
    name: string,
    timeLabel: string,
    isCountingDown: boolean,
    icon?: any
  } | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const matches = await fetchFootballData('today');
      if (!matches?.length) { setTopMatches([]); return; }

      // Core Priority Logic: Bell-Live > Fav-Live > Bell-Upcoming > Fav-Upcoming > Others-Live
      const prioritized = [...matches]
        .sort((a, b) => {
          const aIsLive = a.status === 'live', bIsLive = b.status === 'live';
          const aIsBelled = belledMatchIds.includes(a.id), bIsBelled = belledMatchIds.includes(b.id);
          const aIsFav = favoriteTeams.some(t => t.id === a.homeTeamId || t.id === a.awayTeamId);
          const bIsFav = favoriteTeams.some(t => t.id === b.homeTeamId || t.id === b.awayTeamId);

          const getScore = (isLive: boolean, isBelled: boolean, isFav: boolean) => {
            if (isLive && isBelled) return 1000;
            if (isLive && isFav) return 900;
            if (!isLive && isBelled) return 800;
            if (!isLive && isFav) return 700;
            if (isLive) return 600;
            return 0;
          };

          const scoreA = getScore(aIsLive, aIsBelled, aIsFav);
          const scoreB = getScore(bIsLive, bIsBelled, bIsFav);

          return scoreB - scoreA; // Descending order
        })
        .slice(0, 3);
      setTopMatches(prioritized);
    } catch (e) {}
  }, [belledMatchIds, favoriteTeams]);

  useEffect(() => {
    const checkSpiritualTiming = () => {
      if (!prayerTimes?.length) return;
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const currentSeconds = now.getSeconds();
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

      const timeToMinutes = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
      let alert = null;

      // 1. Critical Priority: Prayer Time Alerts
      for (let p of list) {
        const azanMins = timeToMinutes(p.time);
        const iqamahMins = azanMins + p.iqamah;

        if (currentMinutes >= azanMins - 3 && currentMinutes < azanMins) {
          const diff = (azanMins * 60) - (currentMinutes * 60 + currentSeconds);
          alert = { type: 'countdown' as const, name: p.name, timeLabel: `باقي للأذان ${Math.floor(diff/60)}:${(diff%60).toString().padStart(2,'0')}`, isCountingDown: true };
          break;
        }
        if (currentMinutes >= azanMins && currentMinutes < azanMins + 3) {
          const diff = (currentMinutes * 60 + currentSeconds) - (azanMins * 60);
          alert = { type: 'azan' as const, name: p.name, timeLabel: `حان الآن وقت الأذان (+${Math.floor(diff/60)}:${(diff%60).toString().padStart(2,'0')})`, isCountingDown: false };
          break;
        }
        if (currentMinutes >= iqamahMins - 5 && currentMinutes < iqamahMins) {
          const diff = (iqamahMins * 60) - (currentMinutes * 60 + currentSeconds);
          alert = { type: 'countdown' as const, name: p.name, timeLabel: `باقي للإقامة ${Math.floor(diff/60)}:${(diff%60).toString().padStart(2,'0')}`, isCountingDown: true };
          break;
        }
        if (currentMinutes >= iqamahMins && currentMinutes < iqamahMins + 10) {
          const diff = (currentMinutes * 60 + currentSeconds) - (iqamahMins * 60);
          alert = { type: 'iqamah' as const, name: p.name, timeLabel: `الصلاة قائمة منذ ${Math.floor(diff/60)}:${(diff%60).toString().padStart(2,'0')}`, isCountingDown: false };
          break;
        }

        // Evening Athkar after Asr Iqama
        if (p.name === "العصر") {
          const eveningAthkarTriggerMins = iqamahMins + 10;
          if (currentMinutes === eveningAthkarTriggerMins && currentSeconds < 10) {
            alert = { type: 'dhikr' as const, name: 'أذكار المساء', timeLabel: 'وقت أذكار المساء - حفظك الله', isCountingDown: false, icon: Moon };
            break;
          }
        }
      }

      if (alert) { setActiveAlert(alert); return; }

      // 2. High Priority: Timed Spiritual Events
      if (currentHour >= 7 && currentHour < 9) {
        setActiveAlert({ type: 'duha', name: 'صلاة الضحى', timeLabel: 'وقت صلاة الضحى - صلاة الأوابين', isCountingDown: false, icon: Sun });
        return;
      }
      if (currentHour >= 10 && currentHour < 12) {
        setActiveAlert({ type: 'dhikr', name: 'أذكار الصباح', timeLabel: 'وقت أذكار الصباح - نور لقلبك', isCountingDown: false, icon: Sun });
        return;
      }

      setActiveAlert(null);
    };
    
    const interval = setInterval(checkSpiritualTiming, 1000);
    const dhikrTimer = setInterval(() => setDhikr(ATHKAR[Math.floor(Math.random()*ATHKAR.length)]), 10000);
    return () => { clearInterval(interval); clearInterval(dhikrTimer); };
  }, [prayerTimes]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); 
    return () => clearInterval(interval);
  }, [fetchStatus]);

  if (activeAlert) {
    const Icon = activeAlert.icon || BellRing;
    return (
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[10001] pointer-events-auto">
        <div className={cn("liquid-glass rounded-full shadow-[0_40px_100px_rgba(0,0,0,1)] border-2 transition-all duration-700 w-[550px] h-24 flex items-center justify-between px-10 relative overflow-hidden",
          activeAlert.isCountingDown ? "border-primary ring-8 ring-primary/10" : "border-accent ring-8 ring-accent/10"
        )}>
          <FluidGlass scale={2} />
          <div className="flex items-center gap-6 relative z-10">
            <div className={cn("w-14 h-14 rounded-full flex items-center justify-center shadow-2xl animate-bounce", activeAlert.isCountingDown ? "bg-primary" : "bg-accent")}>
              <Icon className="w-8 h-8 text-black fill-current" />
            </div>
            <div className="flex flex-col text-right">
              <span className="text-2xl font-black text-white uppercase tracking-tighter drop-shadow-xl">{activeAlert.name}</span>
              <span className={cn("text-sm font-black uppercase tracking-widest", activeAlert.isCountingDown ? "text-primary" : "text-accent")}>{activeAlert.timeLabel}</span>
            </div>
          </div>
          <span className="text-2xl animate-spin-slow relative z-10">✨</span>
        </div>
      </div>
    );
  }

  if (topMatches.length === 0) {
    return (
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[10001] pointer-events-auto">
        <div className="liquid-glass rounded-full h-12 px-10 flex items-center gap-4 border border-white/10 shadow-2xl min-w-[300px] justify-center">
          <span className="text-sm font-black text-white/80 tracking-widest text-center animate-in fade-in duration-1000" key={dhikr}>
            {dhikr}
          </span>
          <Sparkles className="w-4 h-4 text-accent animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[10001] flex items-center gap-3 pointer-events-none">
      {topMatches.map((match, idx) => {
        const isActive = idx === activeIndex, isLive = match.status === 'live';
        if (isActive) {
          return (
            <div key={match.id} className="pointer-events-auto">
              <div onClick={() => isDetailed ? setIsDetailed(false) : setIsDetailed(true)}
                className={cn("liquid-glass rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,1)] transition-all duration-700 cursor-pointer overflow-hidden focusable relative",
                  isDetailed ? "w-[600px] h-52 px-12" : "w-80 h-16 px-6")}>
                <FluidGlass scale={isDetailed ? 3 : 1.5} />
                <div className="h-full flex items-center justify-between relative z-10">
                  {!isDetailed ? (
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-4">
                        <img src={match.homeLogo} alt="" className="w-9 h-9 object-contain" />
                        <div className={cn("px-4 py-1.5 rounded-2xl border backdrop-blur-md min-w-[100px] flex justify-center items-center", isLive ? "bg-red-600/20 border-red-500/40" : "bg-primary/20 border-primary/40")}>
                          {/* Corrected Arabic Score Flow: Home (Right) - Away (Left) */}
                          <div className="flex flex-row-reverse items-center gap-2 font-black text-xl text-white" dir="ltr">
                            <span>{isLive ? match.score?.home : match.startTime.split(':')[0]}</span>
                            <span className="opacity-40">-</span>
                            <span>{isLive ? match.score?.away : match.startTime.split(':')[1]}</span>
                          </div>
                        </div>
                        <img src={match.awayLogo} alt="" className="w-9 h-9 object-contain" />
                      </div>
                      {isLive ? <span className="text-base font-black text-accent animate-pulse">{match.minute}'</span> : <Clock className="w-5 h-5 text-primary" />}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between w-full animate-in zoom-in-95 dir-rtl">
                      <div className="flex flex-col items-center gap-3 w-32">
                        <div className="w-24 h-24 rounded-3xl bg-white/5 p-3 border border-white/10 flex items-center justify-center backdrop-blur-xl">
                          <img src={match.homeLogo} alt="" className="w-full h-full object-contain" />
                        </div>
                        <span className="text-[12px] font-black text-white truncate w-full text-center">{match.homeTeam}</span>
                      </div>
                      <div className="flex flex-col items-center gap-4">
                        <div className={cn("flex items-center gap-2 px-5 py-2 rounded-full border shadow-lg backdrop-blur-3xl", isLive ? "bg-red-600/30 border-red-500" : "bg-primary/30 border-primary")}>
                          <span className="text-[10px] font-black uppercase tracking-[0.3em]">{isLive ? "LIVE" : "UPCOMING"}</span>
                        </div>
                        <div className="flex items-center gap-8" dir="ltr">
                          <span className="text-8xl font-black text-white tabular-nums drop-shadow-2xl">{isLive ? match.score?.home : match.startTime.split(':')[0]}</span>
                          <span className="text-4xl font-black text-primary animate-pulse tracking-tighter">:</span>
                          <span className="text-8xl font-black text-white tabular-nums drop-shadow-2xl">{isLive ? match.score?.away : match.startTime.split(':')[1]}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-3 w-32">
                        <div className="w-24 h-24 rounded-3xl bg-white/5 p-3 border border-white/10 flex items-center justify-center backdrop-blur-xl">
                          <img src={match.awayLogo} alt="" className="w-full h-full object-contain" />
                        </div>
                        <span className="text-[12px] font-black text-white truncate w-full text-center">{match.awayTeam}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        } else {
          return (
            <div key={match.id} onClick={() => setActiveIndex(idx)} className="pointer-events-auto w-16 h-16 rounded-full liquid-glass border border-white/20 flex flex-col items-center justify-center p-0 shadow-2xl cursor-pointer relative overflow-hidden">
               <FluidGlass scale={0.5} />
               <div className="flex flex-col items-center gap-0 relative z-10 w-full h-full justify-center scale-90">
                  <div className="flex items-center justify-center gap-0.5">
                    <img src={match.homeLogo} alt="" className="w-5 h-5 object-contain" />
                    <img src={match.awayLogo} alt="" className="w-5 h-5 object-contain" />
                  </div>
                  <div className="flex items-center gap-0.5 text-[9px] font-black text-white mt-0.5" dir="ltr">
                    <span>{isLive ? match.score?.home : match.startTime.split(':')[0]}</span>
                    <span>-</span>
                    <span>{isLive ? match.score?.away : match.startTime.split(':')[1]}</span>
                  </div>
               </div>
            </div>
          );
        }
      })}
    </div>
  );
}
