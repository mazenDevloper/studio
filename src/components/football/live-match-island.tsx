
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Match } from "@/lib/football-data";
import { fetchFootballData } from "@/lib/football-api";
import { useMediaStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Bell, Timer, Clock, X } from "lucide-react";
import { FluidGlass } from "@/components/ui/fluid-glass";
import { convertTo12Hour } from "@/lib/constants";

interface ReminderItem {
  id: string;
  name: string;
  label: string;
  diff: number;
  icon: any;
  color: string;
  isWithinWindow: boolean;
  targetTimeStr: string;
}

export function LiveMatchIsland() {
  const { favoriteTeams, prayerTimes, belledMatchIds, showIslands, skippedMatchIds, reminders } = useMediaStore();
  const [topMatches, setTopMatches] = useState<Match[]>([]);
  const [now, setNow] = useState(new Date());
  const [manualReminderExpand, setManualReminderExpand] = useState(false);
  const [overrideMatchId, setOverrideMatchId] = useState<string | null>(null);

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

  const processedReminders = useMemo(() => {
    const list: ReminderItem[] = [];
    const totalCurrentSecs = (now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds();

    const formatTargetTime = (seconds: number) => {
      const h = Math.floor(seconds / 3600) % 24;
      const m = Math.floor((seconds % 3600) / 60);
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

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
          if (diff > -600) list.push({ id: `azan-${p.id}`, name: p.name, label: "شروق الشمس", diff, icon: Clock, color: "text-orange-400", isWithinWindow: Math.abs(diff) < 600, targetTimeStr: p.time });
          continue;
        }
        const azanSecs = tToM(p.time) * 60;
        const iqamahSecs = azanSecs + (p.iqamah * 60);
        const aDiff = azanSecs - totalCurrentSecs;
        const iDiff = iqamahSecs - totalCurrentSecs;
        
        if (aDiff > -600) list.push({ id: `azan-${p.id}`, name: p.name, label: "الأذان", diff: aDiff, icon: Clock, color: "text-accent", isWithinWindow: Math.abs(aDiff) < 600, targetTimeStr: p.time });
        if (iDiff > -600) list.push({ id: `iqamah-${p.id}`, name: `إقامة ${p.name}`, label: "الإقامة", diff: iDiff, icon: Timer, color: "text-emerald-400", isWithinWindow: Math.abs(iDiff) < 1200, targetTimeStr: formatTargetTime(iqamahSecs) });
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
        const window = diff >= 0 ? rem.countdownWindow * 60 : rem.countupWindow * 60;
        if (diff > -600) list.push({ id: rem.id, name: rem.label, label: "تذكير", diff, icon: Bell, color: rem.color || "text-blue-400", isWithinWindow: Math.abs(diff) < window, targetTimeStr: formatTargetTime(targetSecs) });
      }
    }

    return list.sort((a, b) => Math.abs(a.diff) - Math.abs(b.diff)).slice(0, 3);
  }, [now, prayerTimes, reminders]);

  const processedMatches = useMemo(() => {
    let sorted = topMatches.filter(m => !skippedMatchIds.includes(m.id)).sort((a, b) => {
      const isFavA = favoriteTeams.some(t => t.id === a.homeTeamId || t.id === a.awayTeamId) || belledMatchIds.includes(a.id);
      const isFavB = favoriteTeams.some(t => t.id === b.homeTeamId || t.id === b.awayTeamId) || belledMatchIds.includes(b.id);
      if (isFavA && !isFavB) return -1;
      if (!isFavA && isFavB) return 1;
      return 0;
    });

    if (overrideMatchId) {
      const idx = sorted.findIndex(m => m.id === overrideMatchId);
      if (idx > -1) {
        const item = sorted.splice(idx, 1)[0];
        sorted.unshift(item);
      }
    }
    return sorted;
  }, [topMatches, skippedMatchIds, favoriteTeams, belledMatchIds, overrideMatchId]);

  if (!showIslands || (processedMatches.length === 0 && processedReminders.length === 0)) return null;

  const mainMatch = processedMatches[0];
  const miniMatches = processedMatches.slice(1, 4);
  const isReminderAutoExpanded = processedReminders.some(r => r.isWithinWindow);
  const isReminderExpanded = isReminderAutoExpanded || manualReminderExpand;
  
  const FirstRem = processedReminders[0];
  const FirstReminderIcon = FirstRem?.icon;

  const GlassNumber = ({ text, size = '3rem', id, subtext, colorClass }: { text: string, size?: string, id: string, subtext?: string, colorClass?: string }) => (
    <div className={cn("relative w-full h-full flex flex-col items-center justify-center", colorClass)}>
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
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[10001] flex items-start gap-4 pointer-events-none gpu-smooth dir-rtl">
      {/* 1. REMINDERS ISLAND (VERTICAL STACK - DARK GLASS) */}
      {processedReminders.length > 0 && (
        <div 
          onClick={() => setManualReminderExpand(!manualReminderExpand)}
          className={cn(
            "pointer-events-auto transition-all duration-700 liquid-glass shadow-[0_40px_100px_rgba(0,0,0,1)] border border-white/10 relative overflow-hidden cursor-pointer",
            isReminderExpanded 
              ? "w-[12rem] h-[12rem] rounded-[2.5rem] bg-zinc-950/80 backdrop-blur-[120px]" 
              : "w-[3.5rem] h-[3.5rem] flex items-center justify-center rounded-full bg-black/40 backdrop-blur-3xl"
          )}
        >
          <FluidGlass />
          <div className="relative z-10 h-full w-full flex flex-col items-center py-2 px-2">
            {!isReminderExpanded ? (
              <div className={cn("w-9 h-9 rounded-full flex items-center justify-center bg-white/10 my-auto", FirstRem.color)}>
                {FirstReminderIcon && <FirstReminderIcon className="w-5 h-5" />}
              </div>
            ) : (
              <div className="flex flex-col w-full h-full justify-around">
                {processedReminders.map((rem) => {
                  const RemIcon = rem.icon;
                  // Logique: SI diff < 20 min -> Countdown, SINON -> Target Time
                  const showCountdown = Math.abs(rem.diff) <= 1200;
                  const displayVal = showCountdown 
                    ? `${rem.diff >= 0 ? "-" : "+"}${formatCountdown(rem.diff)}` 
                    : rem.targetTimeStr;

                  return (
                    <div key={rem.id} className="flex flex-col items-center justify-center h-1/3 relative border-b border-white/5 last:border-0 py-1">
                      <div className="flex items-center gap-1.5 mb-[-4px]">
                        <RemIcon className={cn("w-3 h-3 shadow-glow", rem.color)} />
                        <span className={cn("text-[0.7rem] font-bold uppercase truncate max-w-[100px]", rem.color)}>
                          {rem.name}
                        </span>
                      </div>
                      <div className="h-10 w-full">
                        <GlassNumber 
                          text={displayVal} 
                          id={`rem-vert-${rem.id}`} 
                          size="2.2rem"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. FOOTBALL MATCHES ISLAND */}
      {mainMatch && (
        <div className="flex items-center gap-2">
          {/* Main Match Capsule */}
          <div className="pointer-events-auto liquid-glass backdrop-blur-[120px] rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,1)] w-[18rem] h-[3.5rem] overflow-hidden relative border border-white/10">
            <FluidGlass />
            <div className="relative z-10 h-full w-full flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-between px-2" style={{ background: 'linear-gradient(0deg, black 5%, transparent)' }}>
                <img src={mainMatch.homeLogo} className="h-full w-auto object-contain scale-[1.5] translate-x-4" alt="" />
                <img src={mainMatch.awayLogo} className="h-full w-auto object-contain scale-[1.5] -translate-x-4" alt="" />
              </div>
              <div className="relative w-full h-full z-20 flex flex-col items-center justify-center" style={{ background: 'linear-gradient(-1deg, black, transparent)' }}>
                <GlassNumber 
                  text={mainMatch.status === 'upcoming' ? mainMatch.startTime : `${mainMatch.score?.home}-${mainMatch.score?.away}`} 
                  id={`match-main-${mainMatch.id}`} 
                  subtext={mainMatch.league}
                />
                {mainMatch.status === 'live' && (
                  <div className={cn("absolute top-1 right-1/2 translate-x-1/2 px-2 py-0.5 rounded-full shadow-xl border border-white/20 z-30", getMinuteBadgeColor(mainMatch.minute || 0))}>
                    <span className="font-black text-white uppercase tracking-widest text-[0.7rem]">{mainMatch.minute}'</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mini Matches Cluster - Swap enabled */}
          <div className="flex gap-2 mr-2">
            {miniMatches.map((m) => (
              <div 
                key={m.id} 
                onClick={() => setOverrideMatchId(m.id)}
                className="pointer-events-auto liquid-glass backdrop-blur-3xl rounded-full w-14 h-14 border border-white/10 flex flex-col items-center justify-center shadow-2xl relative overflow-hidden cursor-pointer active:scale-90 transition-transform"
              >
                <FluidGlass />
                
                {/* Data TOP: Score or Time */}
                <span className="absolute top-1 z-20 text-[0.55rem] font-black text-white/90 tabular-nums drop-shadow-md">
                  {m.status === 'upcoming' ? m.startTime : `${m.score?.home}-${m.score?.away}`}
                </span>

                <div className="relative z-10 w-full h-full flex items-center justify-center scale-[0.45]">
                  <img src={m.homeLogo} className="absolute left-0 w-10 h-10 object-contain scale-[1.2] translate-x-[-4px]" alt="" />
                  <img src={m.awayLogo} className="absolute right-0 w-10 h-10 object-contain scale-[1.2] translate-x-[4px]" alt="" />
                </div>

                {/* Data BOTTOM: Minute if Live */}
                {m.status === 'live' && (
                  <span className="absolute bottom-1 z-20 text-[0.55rem] font-black text-red-500 animate-pulse drop-shadow-md">
                    {m.minute}'
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
