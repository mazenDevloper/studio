
"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Match } from "@/lib/football-data";
import { fetchFootballData } from "@/lib/football-api";
import { useMediaStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Bell, Timer, Clock, X, Eye, EyeOff } from "lucide-react";
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

interface GoalEvent {
  matchId: string;
  teamName: string;
  teamLogo: string;
  isHome: boolean;
}

export function LiveMatchIsland() {
  const favoriteTeams = useMediaStore(state => state.favoriteTeams);
  const prayerTimes = useMediaStore(state => state.prayerTimes);
  const prayerSettings = useMediaStore(state => state.prayerSettings);
  const belledMatchIds = useMediaStore(state => state.belledMatchIds);
  const showIslands = useMediaStore(state => state.showIslands);
  const toggleShowIslands = useMediaStore(state => state.toggleShowIslands);
  const skippedMatchIds = useMediaStore(state => state.skippedMatchIds);
  const reminders = useMediaStore(state => state.reminders);
  const skipMatch = useMediaStore(state => state.skipMatch);
  const activeVideo = useMediaStore(state => state.activeVideo);

  const [topMatches, setTopMatches] = useState<Match[]>([]);
  const [now, setNow] = useState(new Date());
  const [manualReminderExpand, setManualReminderExpand] = useState(false);
  const [overrideMatchId, setOverrideMatchId] = useState<string | null>(null);
  const [windowWidth, setWindowWidth] = useState(0);
  const [lastAutoTriggeredId, setLastAutoTriggeredId] = useState<string | null>(null);
  
  const [activeGoal, setActiveGoal] = useState<GoalEvent | null>(null);
  const prevScoresRef = useRef<Record<string, { home: number, away: number }>>({});

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
      
      if (matches && matches.length > 0) {
        for (const match of matches) {
          const prev = prevScoresRef.current[match.id];
          const isFavoriteMatch = favoriteTeams.some(t => t.id === match.homeTeamId || t.id === match.awayTeamId) || belledMatchIds.includes(match.id);
          
          if (prev && match.score && isFavoriteMatch) {
            if (match.score.home > prev.home) {
              triggerGoal({ matchId: match.id, teamName: match.homeTeam, teamLogo: match.homeLogo, isHome: true });
            } else if (match.score.away > prev.away) {
              triggerGoal({ matchId: match.id, teamName: match.awayTeam, teamLogo: match.awayLogo, isHome: false });
            }
          }
          if (match.score) {
            prevScoresRef.current[match.id] = { home: match.score.home, away: match.score.away };
          }
        }
      }
      
      setTopMatches(matches || []);
    } catch (e) {}
  }, [favoriteTeams, belledMatchIds]);

  const triggerGoal = (event: GoalEvent) => {
    setActiveGoal(event);
    setTimeout(() => setActiveGoal(null), 8000); 
  };

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
      return convertTo12Hour(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    };

    if (prayerTimes?.length) {
      const day = now.getDate().toString().padStart(2, '0');
      const pData = prayerTimes.find(p => p.date.endsWith(`-${day}`)) || prayerTimes[0];
      
      for (const setting of prayerSettings) {
        let refTime = pData[setting.id as keyof typeof pData];
        let baseMinutesOffset = setting.offsetMinutes;

        if (setting.id === 'duha') {
          refTime = pData['sunrise'];
          baseMinutesOffset += 15;
        }

        if (!refTime) continue;

        const baseMinutes = tToM(refTime) + baseMinutesOffset;
        const azanSecs = baseMinutes * 60;
        let aDiff = azanSecs - totalCurrentSecs;
        if (aDiff < -43200) aDiff += 86400;

        if (aDiff > -600) {
          const isWithin = Math.abs(aDiff) < (setting.countdownWindow * 60);
          list.push({ 
            id: `azan-${setting.id}`, 
            name: setting.name, 
            label: setting.id === 'sunrise' ? "شروق الشمس" : setting.id === 'duha' ? "صلاة الضحى" : "الأذان", 
            diff: aDiff, 
            icon: Clock, 
            color: setting.id === 'sunrise' || setting.id === 'duha' ? "text-orange-400" : "text-accent", 
            isWithinWindow: isWithin, 
            targetTimeStr: formatTargetTime(azanSecs) 
          });
        }

        if (setting.iqamahDuration > 0) {
          const iqamahSecs = azanSecs + (setting.iqamahDuration * 60);
          let iDiff = iqamahSecs - totalCurrentSecs;
          if (iDiff < -43200) iDiff += 86400;

          if (iDiff > -600) {
            const isWithin = Math.abs(iDiff) < (setting.countupWindow * 60);
            list.push({ 
              id: `iqamah-${setting.id}`, 
              name: `إقامة ${setting.name}`, 
              label: "الإقامة", 
              diff: iDiff, 
              icon: Timer, 
              color: "text-emerald-400", 
              isWithinWindow: isWithin, 
              targetTimeStr: formatTargetTime(iqamahSecs) 
            });
          }
        }
      }
    }

    for (const rem of reminders) {
      let targetSecs = 0;
      if (rem.relativePrayer === 'manual' && rem.manualTime) {
        targetSecs = tToM(rem.manualTime) * 60;
      } else if (prayerTimes?.length) {
        const day = now.getDate().toString().padStart(2, '0');
        const pData = prayerTimes.find(p => p.date.endsWith(`-${day}`)) || prayerTimes[0];
        
        let refTime = pData[rem.relativePrayer as keyof typeof pData];
        let extraOffset = rem.offsetMinutes;

        if (rem.relativePrayer === 'duha') {
          refTime = pData['sunrise'];
          extraOffset += 15;
        }

        if (refTime) targetSecs = (tToM(refTime) + extraOffset) * 60;
      }

      if (targetSecs > 0) {
        let diff = targetSecs - totalCurrentSecs;
        if (diff < -43200) diff += 86400; 
        
        const window = diff >= 0 ? rem.countdownWindow * 60 : rem.countupWindow * 60;
        if (diff > -600) {
          list.push({ 
            id: rem.id, 
            name: rem.label, 
            label: "تذكير", 
            diff, 
            icon: Bell, 
            color: rem.color || "text-blue-400", 
            isWithinWindow: Math.abs(diff) < window, 
            targetTimeStr: formatTargetTime(targetSecs) 
          });
        }
      }
    }

    return list.sort((a, b) => Math.abs(a.diff) - Math.abs(b.diff));
  }, [now, prayerTimes, reminders, prayerSettings]);

  useEffect(() => {
    const activeAlert = processedReminders.find(r => r.isWithinWindow);
    if (activeAlert && activeAlert.id !== lastAutoTriggeredId) {
      setManualReminderExpand(true);
      setLastAutoTriggeredId(activeAlert.id);
    } else if (!activeAlert) {
      setLastAutoTriggeredId(null);
    }
  }, [processedReminders, lastAutoTriggeredId]);

  const processedMatches = useMemo(() => {
    const getMatchPriority = (m: Match) => {
      const isFav = favoriteTeams.some(t => t.id === m.homeTeamId || t.id === m.awayTeamId);
      const isBelled = belledMatchIds.includes(m.id);
      const status = m.status;

      if (status === 'live') {
        if (isBelled && isFav) return 1;
        if (isFav) return 2;
        if (isBelled) return 3;
      }
      if (status === 'upcoming') {
        if (isBelled && isFav) return 4;
        if (isFav) return 5;
        if (isBelled) return 6;
      }
      if (status === 'finished') {
        if (isBelled && isFav) return 7;
        if (isFav) return 8;
        if (isBelled) return 9;
      }
      return 100;
    };

    let sorted = topMatches
      .filter(m => !skippedMatchIds.includes(m.id))
      .sort((a, b) => getMatchPriority(a) - getMatchPriority(b));

    if (overrideMatchId) {
      const idx = sorted.findIndex(m => m.id === overrideMatchId);
      if (idx > -1) {
        const item = sorted.splice(idx, 1)[0];
        sorted.unshift(item);
      }
    }
    return sorted;
  }, [topMatches, skippedMatchIds, favoriteTeams, belledMatchIds, overrideMatchId]);

  const mainMatch = processedMatches[0];
  const miniMatches = processedMatches.slice(1, 4);
  const closestRem = processedReminders[0];

  // Auto-hide island if YouTube video is playing from Media
  if (activeVideo) return null;

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
      {/* Island Toggle Hub */}
      <div 
        onClick={toggleShowIslands}
        className="pointer-events-auto shadow-[0_40px_100px_rgba(0,0,0,1)] w-[3.5rem] h-[3.5rem] rounded-full flex items-center justify-center premium-glass cursor-pointer active:scale-90 transition-all border border-white/10"
      >
        {showIslands ? <Eye className="w-5 h-5 text-accent animate-pulse" /> : <EyeOff className="w-5 h-5 text-white/20" />}
      </div>

      {showIslands && (
        <>
          {closestRem && !activeGoal && (
            <div 
              onClick={() => setManualReminderExpand(!manualReminderExpand)}
              className={cn(
                "pointer-events-auto shadow-[0_40px_100px_rgba(0,0,0,1)] relative overflow-hidden cursor-pointer premium-glass transition-all duration-500 ease-in-out",
                manualReminderExpand 
                  ? "w-[18rem] h-[3.5rem] rounded-[2.5rem]" 
                  : "w-[3.5rem] h-[3.5rem] flex items-center justify-center rounded-full"
              )}
              style={{ transform: 'translate3d(0,0,0)' }}
            >
              <div className="relative z-10 h-full w-full flex flex-col items-center py-2 px-2">
                {!manualReminderExpand ? (
                  <div className={cn("w-9 h-9 rounded-full flex items-center justify-center bg-white/10 my-auto relative", closestRem.color)}>
                    {closestRem.isWithinWindow ? (
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
                        text={closestRem.isWithinWindow ? `${closestRem.diff >= 0 ? "-" : "+"}${formatCountdown(closestRem.diff)}` : closestRem.targetTimeStr} 
                        id={`rem-single-${closestRem.id}`} 
                        size="2.8rem" 
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeGoal && (
            <div className="pointer-events-auto bg-zinc-950/90 rounded-[2.5rem] shadow-[0_0_100px_rgba(0,136,255,0.5)] w-[38rem] h-[3.5rem] overflow-hidden relative border border-primary/40 flex items-center px-6 gap-6 animate-in fade-in zoom-in-95 duration-500 premium-glass">
              <div className="flex items-center gap-4 flex-shrink-0">
                <img src={activeGoal.teamLogo} className="w-10 h-10 object-contain animate-goal-logo" alt="" />
                <span className="text-xl font-black text-white uppercase tracking-tighter">{activeGoal.teamName}</span>
              </div>
              <div className="flex-1 h-full flex items-center justify-center overflow-hidden">
                <span className="text-4xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-primary via-white to-primary animate-goal-text uppercase">
                  GOAAALLLLLLLL!
                </span>
              </div>
              <div className="bg-primary/20 px-4 py-1 rounded-full border border-primary/40">
                <span className="text-xs font-black text-primary uppercase tracking-[0.2em]">Goal Alert</span>
              </div>
            </div>
          )}

          {!activeGoal && mainMatch && (
            <div className="flex items-center gap-2" style={{ transform: 'translate3d(0,0,0)' }}>
              <div className="pointer-events-auto rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,1)] w-[18rem] h-[3.5rem] overflow-hidden relative group premium-glass" style={{ transform: 'translate3d(0,0,0)' }}>
                <button onClick={(e) => { e.stopPropagation(); skipMatch(mainMatch.id); }} className="absolute top-1 left-1 z-[100] w-6 h-6 rounded-full bg-black/40 text-white/40 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
                <div className="relative z-10 h-full w-full flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-between px-2" style={{ background: 'linear-gradient(0deg, black 5%, transparent)' }}>
                    <img src={mainMatch.homeLogo} className="h-full w-auto object-contain scale-[1.5] translate-x-4" alt="" />
                    <img src={mainMatch.awayLogo} className="h-full w-auto object-contain scale-[1.5] -translate-x-4" alt="" />
                  </div>
                  <div className="relative w-full h-full z-20 flex flex-col items-center justify-center" style={{ background: 'linear-gradient(-1deg, black, transparent)' }}>
                    <GlassNumber 
                      text={mainMatch.status === 'upcoming' ? convertTo12Hour(mainMatch.startTime) : `${mainMatch.score?.away}-${mainMatch.score?.home}`} 
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
                  <div key={m.id} onClick={() => setOverrideMatchId(m.id)} className="pointer-events-auto group rounded-full w-14 h-14 flex flex-col items-center justify-center shadow-2xl relative overflow-hidden cursor-pointer active:scale-95 premium-glass" style={{ transform: 'translate3d(0,0,0)' }}>
                    <button onClick={(e) => { e.stopPropagation(); skipMatch(m.id); }} className="absolute -top-1 -left-1 z-[100] w-5 h-5 rounded-full bg-red-600/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-lg"><X className="w-3.5 h-3.5" /></button>
                    <span className="absolute top-1 z-20 text-[0.5rem] font-black text-white/90 tabular-nums drop-shadow-md">
                      {m.status === 'upcoming' ? convertTo12Hour(m.startTime) : `${m.score?.away}-${m.score?.home}`}
                    </span>
                    <div className="relative z-10 w-full h-full flex items-center justify-center scale-[0.35]">
                      <img src={m.homeLogo} className="absolute right-0 w-10 h-10 object-contain scale-[1.2] translate-x[2px]" alt="" />
                      <img src={m.awayLogo} className="absolute left-0 w-10 h-10 object-contain scale-[1.2] translate-x-[-2px]" alt="" />
                    </div>
                    {m.status === 'live' && (
                      <span className="absolute bottom-1 z-20 text-[0.55rem] font-black text-red-500 drop-shadow-md">{m.minute}'</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
