
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Match } from "@/lib/football-data";
import { fetchFootballData } from "@/lib/football-api";
import { useMediaStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Bell, Timer, Clock, X } from "lucide-react";
import { FluidGlass } from "@/components/ui/fluid-glass";

interface IslandItem {
  id: string;
  type: 'match' | 'reminder';
  priority: number;
  data: any;
}

export function LiveMatchIsland() {
  const { favoriteTeams, prayerTimes, belledMatchIds, showIslands, skippedMatchIds, skipMatch, reminders } = useMediaStore();
  const [topMatches, setTopMatches] = useState<Match[]>([]);
  const [activeQueueIndex, setActiveQueueIndex] = useState(0);
  const [isDetailedManually, setIsDetailedManually] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchMatches = useCallback(async () => {
    try {
      const matches = await fetchFootballData('today');
      setTopMatches(matches || []);
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchMatches();
    const interval = setInterval(fetchMatches, 30000);
    return () => clearInterval(interval);
  }, [fetchMatches]);

  const tToM = (t: string) => {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const formatCountdown = (diffSeconds: number) => {
    const absSecs = Math.abs(diffSeconds);
    const m = Math.floor((absSecs % 3600) / 60);
    const s = absSecs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getMinuteBadgeColor = (min: number) => {
    if (min <= 30) return "bg-emerald-500 text-white";
    if (min <= 70) return "bg-yellow-500 text-black";
    return "bg-red-600 text-white";
  };

  // Combine reminders and matches into a single ranked queue
  const combinedQueue = useMemo(() => {
    const queue: IslandItem[] = [];
    const totalCurrentSecs = (now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds();

    // 1. Reminders & Prayers
    if (prayerTimes?.length) {
      const day = now.getDate().toString().padStart(2, '0');
      const pData = prayerTimes.find(p => p.date.endsWith(`-${day}`)) || prayerTimes[0];
      const prayers = [
        { id: 'fajr', name: "الفجر", time: pData.fajr, iqamah: 25 },
        { id: 'sunrise', name: "الشروق", time: pData.sunrise, iqamah: 0 },
        { id: 'dhuhr', name: "الظهر", time: pData.dhuhr, iqamah: 20 },
        { id: 'asr', name: "العصر", time: pData.asr, iqamah: 20 },
        { id: 'maghrib', name: "المغرب", time: pData.maghrib, iqamah: 10 },
        { id: 'isha', name: "العشاء", time: pData.isha, iqamah: 20 },
      ];

      for (const p of prayers) {
        if (p.id === 'sunrise') {
          const riseSecs = tToM(p.time) * 60;
          const diff = riseSecs - totalCurrentSecs;
          if (diff > -600) queue.push({ id: `azan-${p.id}`, type: 'reminder', priority: 1000 - Math.abs(diff/60), data: { name: p.name, label: "شروق الشمس", diff, icon: Clock, color: "text-orange-400" } });
          continue;
        }
        const azanSecs = tToM(p.time) * 60;
        const iqamahSecs = azanSecs + (p.iqamah * 60);
        const aDiff = azanSecs - totalCurrentSecs;
        const iDiff = iqamahSecs - totalCurrentSecs;
        
        if (aDiff > -600) queue.push({ id: `azan-${p.id}`, type: 'reminder', priority: 2000 - Math.abs(aDiff/60), data: { name: p.name, label: "الأذان خلال", diff: aDiff, icon: Clock, color: "text-accent" } });
        if (iDiff > -600) queue.push({ id: `iqamah-${p.id}`, type: 'reminder', priority: 3000 - Math.abs(iDiff/60), data: { name: `إقامة ${p.name}`, label: "الإقامة خلال", diff: iDiff, icon: Timer, color: "text-emerald-400" } });
      }
    }

    for (const rem of reminders) {
      let targetSecs = rem.relativePrayer === 'manual' && rem.manualTime ? tToM(rem.manualTime) * 60 : 0;
      if (rem.relativePrayer !== 'manual' && prayerTimes?.length) {
        const day = now.getDate().toString().padStart(2, '0');
        const pData = prayerTimes.find(p => p.date.endsWith(`-${day}`)) || prayerTimes[0];
        const refTime = pData[rem.relativePrayer as keyof typeof pData];
        if (refTime) targetSecs = (tToM(refTime) + rem.offsetMinutes) * 60;
      }
      if (targetSecs > 0) {
        const diff = targetSecs - totalCurrentSecs;
        if (diff > -600) queue.push({ id: rem.id, type: 'reminder', priority: 1500 - Math.abs(diff/60), data: { name: rem.label, label: "تذكير", diff, icon: Bell, color: rem.color || "text-blue-400", config: rem } });
      }
    }

    // 2. Matches
    topMatches.forEach(m => {
      if (skippedMatchIds.includes(m.id)) return;
      const isFav = favoriteTeams.some(t => t.id === m.homeTeamId || t.id === m.awayTeamId);
      const isBelled = belledMatchIds.includes(m.id);
      const isLive = m.status === 'live';
      
      let p = 0;
      if (isFav || isBelled) p = isLive ? 10000 : 9000;
      else if (m.leagueId === 39) p = isLive ? 8000 : 7500;
      else if (m.leagueId === 135) p = isLive ? 7000 : 6500;
      else if (m.leagueId === 140) p = isLive ? 6000 : 5500;
      
      if (p > 0) queue.push({ id: m.id, type: 'match', priority: p, data: m });
    });

    return queue.sort((a, b) => b.priority - a.priority);
  }, [now, prayerTimes, reminders, topMatches, skippedMatchIds, favoriteTeams, belledMatchIds]);

  if (!showIslands || combinedQueue.length === 0) return null;

  const mainItem = combinedQueue[activeQueueIndex] || combinedQueue[0];
  const miniIslands = combinedQueue.filter((_, idx) => idx !== activeQueueIndex).slice(0, 3);

  const GlassNumber = ({ text, size = '3rem', id, subtext, color = 'white' }: { text: string, size?: string, id: string, subtext?: string, color?: string }) => (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      <svg className="w-full h-full overflow-visible" viewBox="0 0 200 60">
        <defs>
          <linearGradient id={`textFill-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.85)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.15)" />
          </linearGradient>
          <linearGradient id={`textStroke-${id}`} x1="100%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,255,255,1)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
          </linearGradient>
        </defs>
        <text 
          x="50%" 
          y="50%" 
          textAnchor="middle" 
          dominantBaseline="central"
          className="font-black tabular-nums tracking-tighter"
          style={{ fontSize: size }}
          fill={`url(#textFill-${id})`}
          stroke={`url(#textStroke-${id})`}
          strokeWidth="0.6"
        >
          {text}
        </text>
      </svg>
      {subtext && (
        <span className="font-black text-white/40 uppercase tracking-widest absolute" style={{ fontSize: '1rem', bottom: '-11px' }}>
          {subtext}
        </span>
      )}
    </div>
  );

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[10001] flex items-center gap-4 pointer-events-none gpu-smooth">
      {/* MAIN ISLAND */}
      <div 
        className="pointer-events-auto group relative cursor-pointer" 
        onClick={() => mainItem.type === 'match' ? setIsDetailedManually(!isDetailedManually) : setActiveQueueIndex((p) => (p + 1) % combinedQueue.length)}
      >
        <div className={cn(
          "liquid-glass backdrop-blur-[120px] rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,1)] transition-all duration-700 overflow-hidden relative border border-white/10",
          mainItem.type === 'match' && isDetailedManually ? "w-[380px] h-[140px]" : "w-[18rem] h-[3.5rem]"
        )}>
          <FluidGlass />
          <div className="relative z-10 h-full">
            {mainItem.type === 'reminder' ? (
              <div className="h-full flex items-center justify-between px-6 gap-4">
                <div className={cn("w-9 h-9 rounded-full flex items-center justify-center bg-white/10", mainItem.data.color)}>
                  <mainItem.data.icon className="w-4.5 h-4.5" />
                </div>
                <div className="flex-1 h-full">
                  <GlassNumber 
                    text={`${mainItem.data.diff >= 0 ? "-" : "+"}${formatCountdown(mainItem.data.diff)}`} 
                    id={`rem-${mainItem.id}`} 
                    subtext={mainItem.data.name} 
                  />
                </div>
              </div>
            ) : !isDetailedManually ? (
              <div className="h-full w-full flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-between px-2" style={{ background: 'linear-gradient(0deg, black 5%, transparent)' }}>
                  <img src={mainItem.data.homeLogo} className="h-full w-auto object-contain scale-[1.5] translate-x-4" alt="" />
                  <img src={mainItem.data.awayLogo} className="h-full w-auto object-contain scale-[1.5] -translate-x-4" alt="" />
                </div>
                <div className="relative w-full h-full z-20 flex flex-col items-center justify-center" style={{ background: 'linear-gradient(-1deg, black, transparent)' }}>
                  <GlassNumber 
                    text={mainItem.data.status === 'upcoming' ? mainItem.data.startTime : `${mainItem.data.score.away}-${mainItem.data.score.home}`} 
                    id={`match-mini-${mainItem.id}`} 
                    subtext={mainItem.data.league}
                  />
                  {mainItem.data.status === 'live' && (
                    <div className={cn("absolute top-1 right-1/2 translate-x-1/2 px-2 py-0.5 rounded-full shadow-xl border border-white/20 z-30", getMinuteBadgeColor(mainItem.data.minute || 0))}>
                      <span className="font-black text-white uppercase tracking-widest text-[0.7rem]">{mainItem.data.minute}'</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col animate-in zoom-in-95 duration-500 text-right overflow-hidden">
                <div className="flex justify-between items-center px-6 py-3 border-b border-white/10">
                  <div className={cn("px-4 py-1 rounded-full font-black shadow-lg", mainItem.data.status === 'live' ? getMinuteBadgeColor(mainItem.data.minute || 0) : "bg-white/10 text-white/60")}>
                    <span className="text-[0.8rem]">{mainItem.data.status === 'live' ? `${mainItem.data.minute}'` : mainItem.data.status === 'finished' ? 'FT' : mainItem.data.startTime}</span>
                  </div>
                  <span className="text-[10px] font-black text-white/40 uppercase truncate max-w-[180px]">{mainItem.data.league}</span>
                </div>
                <div className="flex items-center justify-between flex-1 px-10 gap-6">
                  <img src={mainItem.data.homeLogo} className="h-16 w-16 object-contain drop-shadow-2xl" alt="" />
                  <div className="w-48 h-20">
                    <GlassNumber text={mainItem.data.status === 'upcoming' ? 'VS' : `${mainItem.data.score.home}-${mainItem.data.score.away}`} size="4rem" id={`match-full-${mainItem.id}`} />
                  </div>
                  <img src={mainItem.data.awayLogo} className="h-16 w-16 object-contain drop-shadow-2xl" alt="" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MINI ISLANDS (CLUSTER) */}
      <div className="flex gap-2">
        {miniIslands.map((item, idx) => (
          <div 
            key={item.id} 
            className="pointer-events-auto liquid-glass backdrop-blur-3xl rounded-full w-14 h-14 border border-white/10 flex items-center justify-center shadow-2xl relative cursor-pointer active:scale-90 transition-all overflow-hidden"
            onClick={() => setActiveQueueIndex(combinedQueue.findIndex(q => q.id === item.id))}
          >
            <FluidGlass />
            <div className="relative z-10 w-full h-full flex items-center justify-center p-2">
              {item.type === 'reminder' ? (
                <item.data.icon className={cn("w-6 h-6", item.data.color)} />
              ) : (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img src={item.data.homeLogo} className="absolute left-0 w-8 h-8 object-contain scale-[1.5] translate-x-[-2px]" alt="" />
                  <img src={item.data.awayLogo} className="absolute right-0 w-8 h-8 object-contain scale-[1.5] translate-x-[2px]" alt="" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
