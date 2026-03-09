
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Match } from "@/lib/football-data";
import { fetchFootballData } from "@/lib/football-api";
import { useMediaStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Moon, Sun, Bell, Timer, Clock, X } from "lucide-react";
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
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeReminderIndex, setActiveReminderIndex] = useState(0);
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

  const prayerIslandQueue = useMemo(() => {
    if (!prayerTimes?.length) return [];
    const day = now.getDate().toString().padStart(2, '0');
    const pData = prayerTimes.find(p => p.date.endsWith(`-${day}`)) || prayerTimes[0];
    const totalCurrentSecs = (now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    const allEvents: any[] = [];
    const prayers = [
      { id: 'fajr', name: "الفجر", time: pData.fajr, iqamah: 25 },
      { id: 'sunrise', name: "الشروق", time: pData.sunrise, iqamah: 0 },
      { id: 'dhuhr', name: "الظهر", time: pData.dhuhr, iqamah: 20 },
      { id: 'asr', name: "العصر", time: pData.asr, iqamah: 20 },
      { id: 'maghrib', name: "المغرب", time: pData.maghrib, iqamah: 10 },
      { id: 'isha', name: "العشاء", time: pData.isha, iqamah: 20 },
    ];

    for (const p of prayers) {
      if (p.id === 'sunrise') continue; 
      
      const azanSecs = tToM(p.time) * 60;
      const iqamahSecs = azanSecs + (p.iqamah * 60);

      const azanDiff = azanSecs - totalCurrentSecs;
      const showAzanTimer = azanDiff <= 10 * 60 && azanDiff >= -10 * 60;
      allEvents.push({
        id: `azan-${p.id}`,
        name: p.name,
        label: azanDiff >= 0 ? "الأذان خلال" : "مضى على الأذان",
        value: showAzanTimer ? `${azanDiff >= 0 ? "-" : "+"}${formatCountdown(Math.abs(azanDiff))}` : "",
        diff: azanDiff,
        icon: Clock,
        color: "text-accent",
        priority: azanDiff < 0 ? azanDiff + 100000 : azanDiff
      });

      const iqamahDiff = iqamahSecs - totalCurrentSecs;
      const showIqamahTimer = iqamahDiff <= 10 * 60 && iqamahDiff >= -10 * 60;
      allEvents.push({
        id: `iqamah-${p.id}`,
        name: `إقامة ${p.name}`,
        label: iqamahDiff >= 0 ? "الإقامة خلال" : "مضى من الإقامة",
        value: showIqamahTimer ? `${iqamahDiff >= 0 ? "-" : "+"}${formatCountdown(Math.abs(iqamahDiff))}` : "",
        diff: iqamahDiff,
        icon: Timer,
        color: "text-emerald-400",
        priority: iqamahDiff < 0 ? iqamahDiff + 100000 : iqamahDiff
      });
    }

    for (const rem of reminders) {
      let targetSecs = 0;
      if (rem.relativePrayer === 'manual' && rem.manualTime) {
        targetSecs = tToM(rem.manualTime) * 60;
      } else {
        const refPrayer = prayers.find(p => p.id === rem.relativePrayer);
        if (refPrayer) {
          targetSecs = (tToM(refPrayer.time) + rem.offsetMinutes) * 60;
        }
      }

      if (targetSecs > 0) {
        const diff = targetSecs - totalCurrentSecs;
        const winBefore = rem.showCountdown ? (rem.countdownWindow * 60) : 0;
        const winAfter = rem.showCountup ? (rem.countupWindow * 60) : 0;
        const isInWindow = diff <= winBefore && diff >= -winAfter;
        
        allEvents.push({
          id: rem.id,
          name: rem.label,
          label: diff >= 0 ? "التذكير خلال" : "مضى على التذكير",
          value: isInWindow ? `${diff >= 0 ? "-" : "+"}${formatCountdown(Math.abs(diff))}` : "",
          diff: diff,
          icon: Bell,
          color: rem.color || "text-blue-400",
          priority: diff < 0 ? diff + 100000 : diff
        });
      }
    }

    const activeOrUpcoming = allEvents
      .filter(ev => ev.diff > -600) 
      .sort((a, b) => a.diff - b.diff)
      .slice(0, 3);

    const sunriseMins = tToM(pData.sunrise);
    const fajrMins = tToM(pData.fajr);
    const asrMins = tToM(pData.asr);
    const maghribMins = tToM(pData.maghrib);
    
    if (currentMins >= fajrMins && currentMins < sunriseMins + 30) {
      activeOrUpcoming.unshift({ id: 'morning-dhikr', name: "أذكار الصباح", label: "تذكير نشط", value: "", icon: Sun, color: "text-orange-400" });
    }
    if (currentMins >= asrMins + 30 && currentMins < maghribMins) {
      activeOrUpcoming.unshift({ id: 'evening-dhikr', name: "أذكار المساء", label: "تذكير نشط", value: "", icon: Moon, color: "text-blue-400" });
    }

    return activeOrUpcoming;
  }, [now, prayerTimes, reminders]);

  const islandQueue = useMemo(() => {
    const items: IslandItem[] = [];
    topMatches.forEach(m => {
      if (skippedMatchIds.includes(m.id)) return;
      
      const isFav = favoriteTeams.some(t => t.id === m.homeTeamId || t.id === m.awayTeamId);
      const isBelled = belledMatchIds.includes(m.id);
      const isLive = m.status === 'live';
      
      const isEnglish = m.leagueId === 39;
      const isItalian = m.leagueId === 135;
      const isSpanish = m.leagueId === 140;

      let priority = 0;
      if (isFav || isBelled) priority = isLive ? 100000 : 90000;
      else if (isEnglish) priority = isLive ? 80000 : 75000;
      else if (isItalian) priority = isLive ? 70000 : 65000;
      else if (isSpanish) priority = isLive ? 60000 : 55000;

      if (priority > 0) items.push({ id: m.id, type: 'match', priority, data: m });
    });

    return items.sort((a, b) => b.priority - a.priority).slice(0, 4);
  }, [topMatches, skippedMatchIds, favoriteTeams, belledMatchIds]);

  const handleSkip = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    skipMatch(id);
    setActiveIndex(0);
  };

  const handleReminderClick = () => {
    if (prayerIslandQueue.length > 1) {
      setActiveReminderIndex((prev) => (prev + 1) % prayerIslandQueue.length);
    }
  };

  if (!showIslands) return null;

  const activeReminder = prayerIslandQueue[activeReminderIndex] || prayerIslandQueue[0];
  const activeItem = islandQueue[activeIndex];
  const isMatchExpanded = activeItem?.type === 'match' && isDetailedManually;

  const GradientText = ({ text, size = '3rem', id, subtext }: { text: string, size?: string, id: string, subtext?: string }) => (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      <svg className="w-full h-full overflow-visible" viewBox="0 0 200 60">
        <defs>
          <linearGradient id={`fill-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.8)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
          </linearGradient>
          <linearGradient id={`stroke-${id}`} x1="100%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,255,255,1)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>
        <text 
          x="50%" 
          y="50%" 
          textAnchor="middle" 
          dominantBaseline="central"
          className="font-black tabular-nums tracking-tighter"
          style={{ fontSize: size }}
          fill={`url(#fill-${id})`}
          stroke={`url(#stroke-${id})`}
          strokeWidth="0.5"
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
      {activeReminder && (
        <div className="pointer-events-auto group relative cursor-pointer" onClick={handleReminderClick}>
          <div className={cn(
            "liquid-glass backdrop-blur-[120px] rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,1)] transition-all duration-700 overflow-hidden relative border border-white/10 w-64 h-14 px-6",
            activeReminder.value ? "ring-2 ring-accent/40 bg-accent/5" : ""
          )}>
            <FluidGlass />
            <div className="h-full flex items-center justify-between relative z-10 gap-4">
              <div className={cn("w-9 h-9 rounded-full flex items-center justify-center bg-white/10", activeReminder.color)}>
                <activeReminder.icon className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 h-full">
                {activeReminder.value ? (
                  <GradientText text={activeReminder.value} size="3rem" id={`rem-${activeReminder.id}`} subtext={activeReminder.name} />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <span className="font-black text-white tracking-tight truncate leading-tight text-lg">{activeReminder.name}</span>
                    <span className="font-black text-white/40 uppercase tracking-widest leading-none text-[10px]">{activeReminder.label}</span>
                  </div>
                )}
              </div>
            </div>
            {prayerIslandQueue.length > 1 && (
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
                {prayerIslandQueue.map((_, idx) => (
                  <div key={idx} className={cn("w-1 h-1 rounded-full transition-all", idx === activeReminderIndex ? "bg-accent w-2" : "bg-white/20")} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeItem ? (
        <div className="pointer-events-auto group relative" onClick={() => setIsDetailedManually(!isDetailedManually)}>
          <div className={cn(
            "liquid-glass backdrop-blur-[120px] rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,1)] transition-all duration-700 cursor-pointer overflow-hidden relative border border-white/10 p-0",
            isMatchExpanded ? "w-[380px] h-[140px]" : "w-[18rem] h-[3.5rem]"
          )}>
            <FluidGlass />
            <button onClick={(e) => handleSkip(e, activeItem.id)} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/40 text-white/40 flex items-center justify-center z-50 hover:bg-red-600 hover:text-white transition-all opacity-0 group-hover:opacity-100"><X className="w-3 h-3" /></button>
            <div className="relative z-10 h-full">
              {!isMatchExpanded ? (
                <div className="h-full w-full flex items-center justify-center relative overflow-hidden p-0">
                  <div className="absolute inset-0 flex items-center justify-between opacity-100 px-2" style={{ background: 'linear-gradient(0deg, black 5%, transparent)' }}>
                    <img src={activeItem.data.homeLogo} className="h-full w-auto object-contain scale-[1.5] translate-x-4" alt="" />
                    <img src={activeItem.data.awayLogo} className="h-full w-auto object-contain scale-[1.5] -translate-x-4" alt="" />
                  </div>
                  <div className="relative w-full h-full flex flex-col items-center justify-center z-20" style={{ background: 'linear-gradient(-1deg, black, transparent)' }}>
                    <GradientText 
                      text={activeItem.data.status === 'upcoming' ? activeItem.data.startTime : `${activeItem.data.score.away}-${activeItem.data.score.home}`} 
                      size="3rem" 
                      id={`match-mini-${activeItem.id}`} 
                      subtext={activeItem.data.league}
                    />
                    {activeItem.data.status === 'live' && (
                      <div className={cn("absolute top-1 right-1/2 translate-x-1/2 px-2 py-0.5 rounded-full shadow-xl border border-white/20 z-[10002]", getMinuteBadgeColor(activeItem.data.minute || 0))}>
                        <span className="font-black text-white uppercase tracking-widest text-[0.7rem]">{activeItem.data.minute}'</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col animate-in zoom-in-95 duration-500 text-right overflow-hidden">
                  <div className="flex justify-between items-center px-6 py-3 border-b border-white/10">
                    <div className={cn("px-4 py-1 rounded-full font-black shadow-lg flex items-center gap-2", activeItem.data.status === 'live' ? getMinuteBadgeColor(activeItem.data.minute || 0) : "bg-white/10 text-white/60")}>
                      <span className="text-[0.8rem]">{activeItem.data.status === 'live' ? `${activeItem.data.minute}'` : activeItem.data.status === 'finished' ? 'FT' : activeItem.data.startTime}</span>
                    </div>
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-tighter truncate max-w-[180px] dir-rtl">{activeItem.data.league}</span>
                  </div>
                  <div className="flex items-center justify-between flex-1 px-10 gap-6">
                    {/* NO SCALE IN LARGE VIEW PER PROMPT */}
                    <img src={activeItem.data.homeLogo} className="h-16 w-16 object-contain drop-shadow-2xl" alt="" />
                    <div className="w-48 h-20">
                      <GradientText 
                        text={activeItem.data.status === 'upcoming' ? 'VS' : `${activeItem.data.score.home}-${activeItem.data.score.away}`} 
                        size="4rem" 
                        id={`match-full-${activeItem.id}`} 
                      />
                    </div>
                    <img src={activeItem.data.awayLogo} className="h-16 w-16 object-contain drop-shadow-2xl" alt="" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {islandQueue.length > 1 && (
        <div className="flex items-center gap-2">
          {islandQueue.map((item, idx) => {
            if (idx === activeIndex) return null;
            return (
              <div key={item.id} onClick={() => setActiveIndex(idx)} className="pointer-events-auto w-14 h-14 rounded-full liquid-glass backdrop-blur-[80px] border border-white/20 flex items-center justify-center shadow-2xl cursor-pointer overflow-hidden transition-all hover:scale-110 active:scale-90 p-0" style={{ background: 'linear-gradient(45deg, black, transparent)' }}>
                <div className="relative w-full h-full flex flex-col items-center justify-center">
                  <div className="absolute inset-0 flex items-center justify-center opacity-60 gap-0.5" style={{ transform: 'scale(0.5)' }}>
                    <img src={item.data.homeLogo} className="w-10 h-10 object-contain scale-[1.5]" alt="" />
                    <img src={item.data.awayLogo} className="w-10 h-10 object-contain scale-[1.5]" alt="" />
                  </div>
                  <div className="w-full h-8 absolute bottom-[-11px]">
                    <GradientText 
                      text={item.data.status === 'upcoming' ? item.data.startTime : `${item.data.score.away}-${item.data.score.home}`} 
                      size="1rem" 
                      id={`match-dot-${item.id}`} 
                    />
                  </div>
                  {item.data.status === 'live' && (
                    <div className={cn("absolute bottom-1 right-1/2 translate-x-1/2 px-1 py-0 rounded-full shadow-xl z-[10002] animate-pulse", getMinuteBadgeColor(item.data.minute || 0))}>
                      <span className="font-black text-white text-[0.5rem]">{item.data.minute}'</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
