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
      if (p.id === 'sunrise') {
        const riseSecs = tToM(p.time) * 60;
        const riseDiff = riseSecs - totalCurrentSecs;
        allEvents.push({ id: `azan-${p.id}`, name: p.name, label: "شروق الشمس", diff: riseDiff, icon: Clock, color: "text-orange-400" });
        continue;
      }
      const azanSecs = tToM(p.time) * 60;
      const iqamahSecs = azanSecs + (p.iqamah * 60);
      
      const azanDiff = azanSecs - totalCurrentSecs;
      allEvents.push({ id: `azan-${p.id}`, name: p.name, label: "الأذان خلال", diff: azanDiff, icon: Clock, color: "text-accent" });
      
      const iqamahDiff = iqamahSecs - totalCurrentSecs;
      allEvents.push({ id: `iqamah-${p.id}`, name: `إقامة ${p.name}`, label: "الإقامة خلال", diff: iqamahDiff, icon: Timer, color: "text-emerald-400" });
    }

    for (const rem of reminders) {
      let targetSecs = 0;
      if (rem.relativePrayer === 'manual' && rem.manualTime) {
        targetSecs = tToM(rem.manualTime) * 60;
      } else {
        const refPrayer = prayers.find(p => p.id === rem.relativePrayer);
        if (refPrayer) targetSecs = (tToM(refPrayer.time) + rem.offsetMinutes) * 60;
      }
      if (targetSecs > 0) {
        allEvents.push({
          id: rem.id,
          name: rem.label,
          label: "التذكير القادم",
          diff: targetSecs - totalCurrentSecs,
          icon: Bell,
          color: rem.color || "text-blue-400",
          config: rem
        });
      }
    }

    return allEvents
      .filter(ev => ev.diff > -600) 
      .sort((a, b) => Math.abs(a.diff) - Math.abs(b.diff))
      .slice(0, 3);
  }, [now, prayerTimes, reminders]);

  const islandQueue = useMemo(() => {
    const items: IslandItem[] = [];
    topMatches.forEach(m => {
      if (skippedMatchIds.includes(m.id)) return;
      const isFav = favoriteTeams.some(t => t.id === m.homeTeamId || t.id === m.awayTeamId);
      const isBelled = belledMatchIds.includes(m.id);
      const isLive = m.status === 'live';
      const isEng = m.leagueId === 39;
      const isIta = m.leagueId === 135;
      const isSpa = m.leagueId === 140;
      
      let priority = 0;
      if (isFav || isBelled) priority = isLive ? 100000 : 90000;
      else if (isEng) priority = isLive ? 80000 : 75000;
      else if (isIta) priority = isLive ? 70000 : 65000;
      else if (isSpa) priority = isLive ? 60000 : 55000;
      
      if (priority > 0) items.push({ id: m.id, type: 'match', priority, data: m });
    });
    return items.sort((a, b) => b.priority - a.priority).slice(0, 4);
  }, [topMatches, skippedMatchIds, favoriteTeams, belledMatchIds]);

  const handleSkip = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    skipMatch(id);
    setActiveIndex(0);
  };

  if (!showIslands) return null;

  const activeReminder = prayerIslandQueue[activeReminderIndex] || prayerIslandQueue[0];
  const activeItem = islandQueue[activeIndex];
  const isMatchExpanded = activeItem?.type === 'match' && isDetailedManually;

  let showReminderValue = false;
  if (activeReminder) {
    const winBefore = activeReminder.config?.showCountdown ? (activeReminder.config.countdownWindow * 60) : 600;
    const winAfter = activeReminder.config?.showCountup ? (activeReminder.config.countupWindow * 60) : 600;
    showReminderValue = activeReminder.diff <= winBefore && activeReminder.diff >= -winAfter;
  }

  // GLASS NUMBERS: White gradient Fill (135deg) vs Reverse White gradient Stroke (315deg)
  const GlassNumber = ({ text, size = '3rem', id, subtext }: { text: string, size?: string, id: string, subtext?: string }) => (
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
      {/* Reminders/Prayer Island */}
      {activeReminder && (
        <div className="pointer-events-auto group relative cursor-pointer" onClick={() => setActiveReminderIndex((p) => (p + 1) % prayerIslandQueue.length)}>
          <div className={cn(
            "liquid-glass backdrop-blur-[120px] rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,1)] transition-all duration-700 overflow-hidden relative border border-white/10 w-64 h-14 px-6",
            showReminderValue ? "ring-2 ring-accent/40 bg-accent/5" : ""
          )}>
            <FluidGlass />
            <div className="h-full flex items-center justify-between relative z-10 gap-4">
              <div className={cn("w-9 h-9 rounded-full flex items-center justify-center bg-white/10", activeReminder.color)}>
                <activeReminder.icon className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 h-full">
                {showReminderValue ? (
                  <GlassNumber 
                    text={`${activeReminder.diff >= 0 ? "-" : "+"}${formatCountdown(activeReminder.diff)}`} 
                    size="3rem" 
                    id={`rem-${activeReminder.id}`} 
                    subtext={activeReminder.name} 
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <span className="font-black text-white tracking-tight truncate leading-tight text-lg">{activeReminder.name}</span>
                    <span className="font-black text-white/40 uppercase tracking-widest leading-none" style={{ fontSize: '1rem', bottom: '-11px', position: 'relative' }}>{activeReminder.label}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Football/Match Island */}
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
                    {/* SCALED LOGOS AT 1.5 ONLY IN ISLAND VIEW */}
                    <img src={activeItem.data.homeLogo} className="h-full w-auto object-contain scale-[1.5] translate-x-4" alt="" />
                    <img src={activeItem.data.awayLogo} className="h-full w-auto object-contain scale-[1.5] -translate-x-4" alt="" />
                  </div>
                  <div className="relative w-full h-full flex flex-col items-center justify-center z-20" style={{ background: 'linear-gradient(-1deg, black, transparent)' }}>
                    <GlassNumber 
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
                    {/* NORMAL SCALE LOGOS IN LARGE VIEW (h-16) */}
                    <img src={activeItem.data.homeLogo} className="h-16 w-16 object-contain drop-shadow-2xl" alt="" />
                    <div className="w-48 h-20">
                      <GlassNumber text={activeItem.data.status === 'upcoming' ? 'VS' : `${activeItem.data.score.home}-${activeItem.data.score.away}`} size="4rem" id={`match-full-${activeItem.id}`} />
                    </div>
                    <img src={activeItem.data.awayLogo} className="h-16 w-16 object-contain drop-shadow-2xl" alt="" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
