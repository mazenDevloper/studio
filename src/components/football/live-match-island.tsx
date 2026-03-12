
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Match } from "@/lib/football-data";
import { fetchFootballData } from "@/lib/football-api";
import { useMediaStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Bell, Timer, Clock, X } from "lucide-react";
import { FluidGlass } from "@/components/ui/fluid-glass";

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

/**
 * LiveMatchIsland - Optimized version with zero animations and fixed mini-island scores.
 */
export function LiveMatchIsland() {
  const { favoriteTeams, prayerTimes, belledMatchIds, showIslands, skippedMatchIds, reminders, skipMatch } = useMediaStore();
  const [topMatches, setTopMatches] = useState<Match[]>([]);
  const [now, setNow] = useState(new Date());
  const [manualReminderExpand, setManualReminderExpand] = useState(false);
  const [overrideMatchId, setOverrideMatchId] = useState<string | null>(null);
  const [windowWidth, setWindowWidth] = useState(0);
  const [lastAutoTriggeredId, setLastAutoTriggeredId] = useState<string | null>(null);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearInterval(timer);
    };
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
          if (diff > -600) list.push({ id: `azan-${p.id}`, name: p.name, label: "شروق الشمس", diff, icon: Clock, color: "text-orange-400", isWithinWindow: Math.abs(diff) < 1200, targetTimeStr: p.time });
          continue;
        }
        const azanSecs = tToM(p.time) * 60;
        const iqamahSecs = azanSecs + (p.iqamah * 60);
        const aDiff = azanSecs - totalCurrentSecs;
        const iDiff = iqamahSecs - totalCurrentSecs;
        
        if (aDiff > -600) list.push({ id: `azan-${p.id}`, name: p.name, label: "الأذان", diff: aDiff, icon: Clock, color: "text-accent", isWithinWindow: Math.abs(aDiff) < 1200, targetTimeStr: p.time });
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

    return list.sort((a, b) => Math.abs(a.diff) - Math.abs(b.diff));
  }, [now, prayerTimes, reminders]);

  useEffect(() => {
    const activeAlert = processedReminders.find(r => r.isWithinWindow);
    if (activeAlert && activeAlert.id !== lastAutoTriggeredId && windowWidth <= 1080) {
      setManualReminderExpand(true);
      setLastAutoTriggeredId(activeAlert.id);
    } else if (!activeAlert) {
      setLastAutoTriggeredId(null);
    }
  }, [processedReminders, windowWidth, lastAutoTriggeredId]);

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
  const closestRem = processedReminders[0];

  const GlassNumber = ({ text, size = '3rem', id, subtext, colorClass }: { text: string, size?: string, id: string, subtext?: string, colorClass?: string }) => (
    <div className={cn("relative w-full h-full flex flex-col items-center justify-center", colorClass)} style={{ transform: 'translate3d(0,0,0)' }}>
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
    <div 
      className="fixed top-6 left-1/2 -translate-x-1/2 z-[10001] flex items-start gap-4 pointer-events-none scale-110 dir-rtl"
      style={{ 
        transform: 'translate3d(-50%, 0, 0)', 
        backfaceVisibility: 'hidden',
        contain: 'layout paint'
      }}
    >
      {/* Reminder Island (Right) */}
      {closestRem && (
        <div 
          onClick={() => setManualReminderExpand(!manualReminderExpand)}
          className={cn(
            "pointer-events-auto liquid-glass shadow-[0_40px_100px_rgba(0,0,0,1)] border border-white/10 relative overflow-hidden cursor-pointer",
            (manualReminderExpand && windowWidth <= 1080) 
              ? "w-[18rem] h-[3.5rem] rounded-[2.5rem] bg-zinc-950/80 backdrop-blur-[120px]" 
              : "w-[3.5rem] h-[3.5rem] flex items-center justify-center rounded-full bg-black/40 backdrop-blur-3xl"
          )}
          style={{ transform: 'translate3d(0,0,0)' }}
        >
          <FluidGlass />
          <div className="relative z-10 h-full w-full flex flex-col items-center py-2 px-2">
            {!manualReminderExpand || windowWidth > 1080 ? (
              <div className={cn("w-9 h-9 rounded-full flex items-center justify-center bg-white/10 my-auto relative", closestRem.color)}>
                {Math.abs(closestRem.diff) <= 1200 ? (
                  <div className="scale-[0.45]">
                    <GlassNumber text={`${closestRem.diff >= 0 ? "-" : "+"}${formatCountdown(closestRem.diff)}`} id="rem-mini-closest" size="3rem" />
                  </div>
                ) : (
                  (() => {
                    const RemIcon = closestRem.icon;
                    return <RemIcon className="w-5 h-5" />;
                  })()
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center w-full h-full">
                <div className="flex items-center gap-2 mb-[-2px]">
                  <closestRem.icon className={cn("w-3.5 h-3.5 shadow-glow", closestRem.color)} />
                  <span className={cn("text-[0.8rem] font-black uppercase truncate max-w-[150px]", closestRem.color)}>{closestRem.name}</span>
                </div>
                <div className="h-10 w-full">
                  <GlassNumber 
                    text={Math.abs(closestRem.diff) <= 1200 ? `${closestRem.diff >= 0 ? "-" : "+"}${formatCountdown(closestRem.diff)}` : closestRem.targetTimeStr} 
                    id={`rem-single-${closestRem.id}`} 
                    size="2.8rem" 
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Match Cluster (Left) */}
      {mainMatch && (
        <div className="flex items-center gap-2" style={{ transform: 'translate3d(0,0,0)' }}>
          <div className="pointer-events-auto liquid-glass backdrop-blur-[120px] rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,1)] w-[18rem] h-[3.5rem] overflow-hidden relative border border-white/10 group">
            <FluidGlass />
            <button onClick={(e) => { e.stopPropagation(); skipMatch(mainMatch.id); }} className="absolute top-1 left-1 z-[100] w-6 h-6 rounded-full bg-black/40 text-white/40 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
            <div className="relative z-10 h-full w-full flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-between px-2" style={{ background: 'linear-gradient(0deg, black 5%, transparent)' }}>
                <img src={mainMatch.homeLogo} className="h-full w-auto object-contain scale-[1.5] translate-x-4" alt="" />
                <img src={mainMatch.awayLogo} className="h-full w-auto object-contain scale-[1.5] -translate-x-4" alt="" />
              </div>
              <div className="relative w-full h-full z-20 flex flex-col items-center justify-center" style={{ background: 'linear-gradient(-1deg, black, transparent)' }}>
                <GlassNumber 
                  text={mainMatch.status === 'upcoming' ? mainMatch.startTime : `${mainMatch.score?.away}-${mainMatch.score?.home}`} 
                  id={`match-main-${mainMatch.id}`} 
                  subtext={mainMatch.league} 
                />
                {mainMatch.status === 'live' && (
                  <div className="absolute top-1 right-1/2 translate-x-1/2 px-2 py-0.5 rounded-full shadow-xl border border-white/20 z-30 bg-red-600 text-white">
                    <span className="font-black uppercase tracking-widest text-[0.7rem]">{mainMatch.minute}'</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2 mr-2">
            {miniMatches.map((m) => (
              <div key={m.id} onClick={() => setOverrideMatchId(m.id)} className="pointer-events-auto group liquid-glass backdrop-blur-3xl rounded-full w-14 h-14 border border-white/10 flex flex-col items-center justify-center shadow-2xl relative overflow-hidden cursor-pointer active:scale-95" style={{ transform: 'translate3d(0,0,0)' }}>
                <FluidGlass />
                <button onClick={(e) => { e.stopPropagation(); skipMatch(m.id); }} className="absolute -top-1 -left-1 z-[100] w-5 h-5 rounded-full bg-red-600/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-lg"><X className="w-3.5 h-3.5" /></button>
                <span className="absolute top-1 z-20 text-[0.5rem] font-black text-white/90 tabular-nums drop-shadow-md">
                  {/* FIXED SCORE ORDER IN MINI-ISLAND: HOME-AWAY to fix inversion reported by user */}
                  {m.status === 'upcoming' ? m.startTime : `${m.score?.home}-${m.score?.away}`}
                </span>
                <div className="relative z-10 w-full h-full flex items-center justify-center scale-[0.35]">
                  <img src={m.homeLogo} className="absolute left-0 w-10 h-10 object-contain scale-[1.2] translate-x-[-2px]" alt="" />
                  <img src={m.awayLogo} className="absolute right-0 w-10 h-10 object-contain scale-[1.2] translate-x(2px)" alt="" />
                </div>
                {m.status === 'live' && (
                  <span className="absolute bottom-1 z-20 text-[0.55rem] font-black text-red-500 drop-shadow-md">{m.minute}'</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
