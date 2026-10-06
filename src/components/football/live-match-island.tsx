
"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useLiveMatches } from "@/lib/live-matches";
import { sameTeam, matchHideKey } from "@/lib/match-core";
import { favSpecString, favoriteOf } from "@/lib/match-core";
import { isDoneToday } from "@/lib/store";
import { useMediaStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { X, Eye, EyeOff, Bell, Clock, Timer, Check, Trophy, Play, ChevronDown, ChevronUp, Zap, Cloud, Bookmark } from "lucide-react";
import { convertTo12Hour } from "@/lib/constants";
import { prayerDayFor } from "@/lib/prayer-day";

interface AlertItem {
  id: string;
  name: string;
  diff: number;
  expDiff?: number;
  type: 'azan' | 'iqamah' | 'reminder' | 'match' | 'sync' | 'azkar';
  iconType?: 'play' | 'bell' | 'circle' | 'match' | 'sync';
  color: string;
  isExpired?: boolean;
  isEnding?: boolean;
  completed?: boolean;
  homeLogo?: string;
  awayLogo?: string;
  homeName?: string;
  awayName?: string;
  matchTimeStr?: string;
  /** live minute (or "انتهت") shown under the score */
  minuteStr?: string;
  /** a favourite team is playing and the match is live: shown above everything, even the player */
  favLive?: boolean;
}

/**
 * LiveMatchIsland v1702.0 - Sovereign Precision Engine
 * Features: Fixed Local Date Sync | General Azkar Support | Robust Manual Visibility.
 */
/** A reminder marked done stays on the island (as done) for this long, then hides until the next day. */
const DONE_SHOWN_MS = 60 * 60_000;

export function LiveMatchIsland() {
  const { 
    favoriteTeams, prayerTimes, prayerSettings, reminders, generalAzkar, belledMatchIds, 
    showIslands, toggleShowIslands, skippedMatchIds, skipMatch, autoHideIsland,
    skippedReminderIds, skipReminder, toggleReminder, syncMasterBin, isInitialLoading
  } = useMediaStore();
  const playerCovers = useMediaStore(s => !!(s.activeVideo || s.activeIptv) && s.isFullScreen && !s.isMinimized);

  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [isMatchCollapsed, setIsMatchCollapsed] = useState(true);
  const [showSyncIsland, setShowSyncIsland] = useState(true);
  // Live scores for today's matches; favourite teams' matches are always included in the feed.
  const favoriteNames = useMemo(() => (favoriteTeams || []).filter(t => t?.name).map(favSpecString), [favoriteTeams]);
  const { data: liveFeed, celebrating } = useLiveMatches(favoriteNames);
  const pinned = useMediaStore(s => s.pinnedMatches) || [];
  const togglePin = useMediaStore(s => s.togglePinnedMatch);
  // the islands' real height becomes --island-space, so every screen starts its content below them (0 when hidden)
  const islandRootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = document.documentElement;
    let last = -1;
    const measure = () => {
      const el = islandRootRef.current;
      const shown = !!el && getComputedStyle(el).opacity !== "0" && !!el.querySelector("[class*='premium-glass']:not(.w-12)");
      const space = shown ? Math.ceil(el!.getBoundingClientRect().bottom) + 8 : 0;
      if (space !== last) { last = space; root.style.setProperty("--island-space", `${space}px`); }
    };
    measure();
    const t = setInterval(measure, 700); // islands come and go with the data and the clock
    window.addEventListener("resize", measure);
    return () => { clearInterval(t); window.removeEventListener("resize", measure); root.style.setProperty("--island-space", "0px"); };
  }, []);

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    // Hide sync island after 10 seconds to confirm everything is loaded
    const syncTimer = setTimeout(() => setShowSyncIsland(false), 10000);
    return () => { clearInterval(timer); clearTimeout(syncTimer); };
  }, []);

  const tToM = (t: string) => { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + m; };

  const activeAlerts = useMemo(() => {
    if (!now || !prayerTimes?.length) return [];
    const list: AlertItem[] = [];
    const totalCurrentSecs = (now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds();
    
    // SOVEREIGN FIX: Use Precise Local Date for JSON synchronization
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    const pData = prayerDayFor(prayerTimes, dateStr);
    
    // Add Sync Island if in first 10 seconds
    if (showSyncIsland || isInitialLoading) {
      list.push({ id: 'sync-pulse', name: 'جاري المزامنة', diff: 0, type: 'sync', iconType: 'sync', color: 'text-primary' });
    }

    if (pData) {
      for (const setting of prayerSettings) {
        let refTime = pData[setting.id as keyof typeof pData];
        if (setting.id === 'duha') refTime = pData['sunrise'];
        if (!refTime) continue;
        const azanSecs = (tToM(refTime) + (setting.id === 'duha' ? 15 : 0) + setting.offsetMinutes) * 60;
        let aDiff = azanSecs - totalCurrentSecs;
        if (aDiff < -43200) aDiff += 86400;
        if (aDiff > 43200) aDiff -= 86400;
        
        if (aDiff > 0 && aDiff < (setting.countdownWindow * 60)) {
          list.push({ id: `azan-${setting.id}`, name: setting.name, diff: aDiff, type: 'azan', color: 'text-accent' });
        } else if (aDiff <= 0 && setting.iqamahDuration > 0) {
          const iqamahRemaining = (setting.iqamahDuration * 60) + aDiff;
          if (iqamahRemaining > 0) {
            list.push({ id: `iqamah-${setting.id}`, name: `إقامة ${setting.name}`, diff: iqamahRemaining, type: 'iqamah', color: 'text-emerald-400' });
          }
        }
      }

      for (const rem of reminders) {
        if (skippedReminderIds.includes(rem.id) || skippedMatchIds.includes(rem.id)) continue;
        // done today: shown as done for an hour, then hidden until tomorrow (the state resets each day)
        const doneToday = isDoneToday(rem);
        if (doneToday && now.getTime() - (rem.completedAt ?? 0) > DONE_SHOWN_MS) continue;
        if (rem.iconType === 'match' && rem.matchDate && rem.matchDate !== dateStr) continue;

        let startSecs = -1;
        if (rem.startType === 'manual' && rem.manualStartTime) {
          startSecs = tToM(rem.manualStartTime) * 60;
        } else if (rem.startReference && pData[rem.startReference]) {
          const pSetting = prayerSettings.find(s => s.id === rem.startReference);
          let baseMins = tToM(pData[rem.startReference]);
          if (rem.startType === 'iqamah') baseMins += (pSetting?.iqamahDuration || 0);
          startSecs = (baseMins + rem.startOffset) * 60;
        }

        if (startSecs >= 0) {
          let sDiff = startSecs - totalCurrentSecs;
          if (sDiff < -43200) sDiff += 86400;
          if (sDiff > 43200) sDiff -= 86400;

          let endSecs = -1;
          if (rem.endType === 'manual' && rem.manualEndTime) endSecs = tToM(rem.manualEndTime) * 60;
          else if (rem.endType === 'duration') endSecs = startSecs + (rem.durationMinutes || 30) * 60;
          else if ((rem.endType === 'azan' || rem.endType === 'iqamah' || rem.endType === 'prayer') && rem.endReference && pData[rem.endReference]) {
            const expSetting = prayerSettings.find(s => s.id === rem.endReference);
            let expMins = tToM(pData[rem.endReference]);
            if (rem.endType === 'iqamah') expMins += (expSetting?.iqamahDuration || 0);
            endSecs = (expMins + (rem.endOffset || 0)) * 60;
          }

          let eDiff = endSecs >= 0 ? endSecs - totalCurrentSecs : 3600;
          if (eDiff < -43200) eDiff += 86400;
          if (eDiff > 43200) eDiff -= 86400;

          const windowSecs = (rem.countdownWindow || 15) * 60;
          const isVisible = rem.iconType === 'match' 
            ? true 
            : ((sDiff <= 0 && eDiff > 0) || (sDiff > 0 && sDiff < windowSecs) || (sDiff <= 0 && sDiff > -3600));
          
          if (isVisible) {
            list.push({ 
              id: rem.id, 
              name: rem.label, 
              diff: sDiff, 
              expDiff: eDiff,
              type: rem.iconType === 'match' ? 'match' : 'reminder', 
              iconType: rem.iconType,
              color: rem.color, 
              isExpired: sDiff <= 0, 
              isEnding: eDiff > 0 && eDiff <= 600,
              completed: doneToday,
              homeLogo: rem.homeLogo,
              awayLogo: rem.awayLogo,
              homeName: rem.homeName,
              awayName: rem.awayName,
              matchTimeStr: convertTo12Hour(rem.manualStartTime)
            });
          }
        }
      }

      // Add General Azkar to Island
      if (generalAzkar && generalAzkar.length > 0) {
        generalAzkar.forEach(az => {
          const done = isDoneToday(az);
          if (done && now.getTime() - (az.completedAt ?? 0) > DONE_SHOWN_MS) return;
          list.push({
            id: az.id,
            name: az.label,
            diff: 0,
            type: 'azkar',
            iconType: 'circle',
            color: 'text-emerald-400',
            completed: done,
          });
        });
      }
    }
    // a favourite whose island switch is off shows on the matches page only
    const islandTeams = (favoriteTeams || []).filter(t => t?.name && t.island !== false).map(t => ({ name: t.name, country: t.country }));
    const onIsland = (m: NonNullable<typeof liveFeed>["matches"][number]) => islandTeams.some(f => favoriteOf(f, m));
    // Today's matches of my favourite teams and the matches I pinned, with live scores
    const nowSecs = Math.floor(now.getTime() / 1000);
    const seenLive = new Set<string>();
    for (const m of liveFeed?.matches ?? []) {
      const id = `live-${m.id}`;
      if (seenLive.has(m.id)) continue;
      seenLive.add(m.id);
      // a pin made from another source has a different id: match it by the two team names as well
      const isPinned = pinned.some(p => p.id === m.id || (sameTeam(p.home, m.home.name) && sameTeam(p.away, m.away.name)));
      // hiding works by a key built from the football day + both teams, so it survives a change of data source
      // and (being in skippedMatchIds, synced with the master bin) applies on every device
      // the eye on the match card hides it from the island even when pinned
      if ((!(m.favorite && onIsland(m)) && !isPinned) || skippedMatchIds.includes(matchHideKey(m)) || skippedMatchIds.includes(`del:${matchHideKey(m)}`) || skippedMatchIds.includes(id)) continue;
      if (m.status === "finished" && nowSecs - m.timestamp > 3.5 * 3600) continue; // drop long-finished games
      const started = m.status !== "upcoming";
      // never show the same fixture twice: a live island replaces an older reminder-based match island
      const dup = list.findIndex(a => a.type === 'match' && a.homeName && a.awayName && sameTeam(a.homeName, m.home.name) && sameTeam(a.awayName, m.away.name));
      if (dup !== -1) { if (list[dup].id.startsWith('live-')) continue; list.splice(dup, 1); }
      list.push({
        id,
        name: m.league.name,
        diff: m.timestamp - nowSecs,
        type: 'match',
        iconType: 'match',
        color: 'text-white',
        isExpired: m.status === "live",
        homeLogo: m.home.logo,
        awayLogo: m.away.logo,
        homeName: m.home.name,
        awayName: m.away.name,
        matchTimeStr: started ? `${m.score.home ?? 0}-${m.score.away ?? 0}` : convertTo12Hour(m.omanTime),
        minuteStr: m.status === "live" ? (m.elapsed ? `${m.elapsed}'` : "مباشر") : m.status === "finished" ? "انتهت" : undefined,
        favLive: !!m.favorite && m.status === "live",
      });
    }

    // favourite teams' live matches first, then by time
    return list.sort((a, b) => Number(!!b.favLive) - Number(!!a.favLive) || Math.abs(a.diff) - Math.abs(b.diff));
  }, [now, prayerTimes, prayerSettings, reminders, generalAzkar, skippedReminderIds, skippedMatchIds, showSyncIsland, isInitialLoading, liveFeed, pinned, favoriteTeams]);

  const handleAction = async (id: string, type: 'match' | 'reminder' | 'sync' | 'azkar') => {
    if (type === 'match') {
      // closing a pinned live match unpins it; anything else is skipped for today as before
      const live = id.startsWith('live-') ? liveFeed?.matches.find(m => `live-${m.id}` === id) : undefined;
      const pin = live ? pinned.find(p => p.id === live.id || (sameTeam(p.home, live.home.name) && sameTeam(p.away, live.away.name))) : undefined;
      if (pin) { togglePin(pin); return; }
      skipMatch(live ? matchHideKey(live) : id);
    }
    else if (type === 'sync') setShowSyncIsland(false);
    else if (type === 'azkar') toggleReminder(id);
    else toggleReminder(id);
    await syncMasterBin();
  };

  const formatCountdown = (diffSeconds: number) => { 
    const absSecs = Math.abs(diffSeconds); 
    const h = Math.floor(absSecs / 3600);
    const m = Math.floor((absSecs % 3600) / 60);
    const s = absSecs % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`; 
  };
  
  // Arabic words ("الآن", "منجز") as HTML: iPhone draws Arabic inside SVG letter by letter, reversed
  const GlassNumber = ({ text, size = '5.6rem', id, colorClass }: { text: string, size?: string, id: string, colorClass?: string }) => /[\u0600-\u06ff]/.test(text) ? (
    <div className="relative w-full h-full flex items-center justify-center p-0 m-0 overflow-visible" dir="rtl">
      <span className={cn("font-black leading-none whitespace-nowrap", colorClass ?? "bg-gradient-to-br from-white/95 to-white/20 bg-clip-text text-transparent")}
        style={{ fontSize: `calc(${size} * 0.32)` }}>{text}</span>
    </div>
  ) : (
    <div className="relative w-full h-full flex items-center justify-center p-0 m-0 overflow-visible">
      <svg className="w-full h-full overflow-visible" viewBox="0 0 160 80">
        <defs><linearGradient id={`textFill-${id}`} x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="rgba(255,255,255,0.95)" /><stop offset="100%" stopColor="rgba(255,255,255,0.15)" /></linearGradient></defs>
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className={cn("font-black tabular-nums tracking-tighter", colorClass)} style={{ fontSize: size }} fill={colorClass ? "currentColor" : `url(#textFill-${id})`}>{text}</text>
      </svg>
    </div>
  );

  if (!mounted || !now) return null;
  if (autoHideIsland && !activeAlerts.length) return null;
  if (celebrating) return null; // the goal island takes the stage, then everything comes back as it was

  // a favourite team's live match goes above everything, the player included; over a full-screen player only those show
  // a countdown about to end also goes above the player: the iqamah under 10 minutes, the others under 5
  const urgent = (a: (typeof activeAlerts)[number]) => a.type !== 'match' && !a.completed && a.diff > 0
    && a.diff <= (a.type === 'iqamah' ? 600 : 300);
  const onTop = (a: (typeof activeAlerts)[number]) => !!a.favLive || urgent(a);
  const hasOnTop = activeAlerts.some(onTop);
  const visibleAlerts = playerCovers && hasOnTop ? activeAlerts.filter(onTop) : activeAlerts;

  return (
    <div ref={islandRootRef} className={cn("fixed top-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 pointer-events-none scale-[0.7] min-[968px]:scale-[0.80] dir-rtl transition-all duration-700", hasOnTop ? "z-[100002]" : "z-[10001]", (showIslands || activeAlerts.length) ? "translate-y-0 opacity-100" : "-translate-y-20 opacity-0")}>
      <div className="flex items-start gap-3">
        <div onClick={toggleShowIslands} className="pointer-events-auto shadow-2xl w-12 h-12 rounded-full flex items-center justify-center premium-glass cursor-pointer border border-white/10 active:scale-90 transition-all">{showIslands ? <Eye className="w-5 h-5 text-accent" /> : <EyeOff className="w-5 h-5 text-white/20" />}</div>
        {showIslands && (
          <div className="flex flex-wrap justify-center items-center gap-2 max-[967px]:max-w-[calc(100vw/0.7-32px)]">
            {visibleAlerts.map((alert) => {
               if (alert.type === 'match') {
                 return (
                   <div key={alert.id} dir="ltr" onClick={() => setIsMatchCollapsed(!isMatchCollapsed)} className={cn("pointer-events-auto premium-glass rounded-full flex items-center animate-in slide-in-from-top-2 border transition-all relative group shadow-2xl cursor-pointer", alert.completed ? "bg-emerald-600/60 border-emerald-400" : alert.favLive ? "border-yellow-400/70 shadow-[0_0_24px_rgba(250,204,21,0.35)]" : "border-white/10", isMatchCollapsed ? "min-w-[10rem] h-[4.5rem] gap-0 px-1" : "min-w-[18rem] h-[7.5rem] gap-0 px-2")}>
                     <button onClick={(e) => { e.stopPropagation(); handleAction(alert.id, 'match'); }} className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center pointer-events-auto transition-opacity z-50 border border-white/10 shadow-glow"><X className="w-3.5 h-3.5" /></button>
                     {/* live: the minute sits clearly next to the home team - "د86 [home] 1-0 [away]" */}
                     {alert.isExpired && alert.minuteStr && (
                       <span dir="rtl" className={cn("shrink-0 rounded-full bg-red-600 text-white font-black tabular-nums leading-none flex items-center justify-center shadow-[0_0_14px_rgba(220,38,38,0.6)]", isMatchCollapsed ? "text-[1.15rem] h-10 px-3 mr-1.5" : "text-[1.6rem] h-14 px-4 mr-2")}>
                         {/^\d/.test(alert.minuteStr) ? `د${alert.minuteStr.replace(/'/g, "")}` : alert.minuteStr}
                       </span>
                     )}
                     <div className={cn("rounded-full bg-white/5 flex items-center justify-center border border-white/10 overflow-hidden shrink-0 shadow-lg relative", isMatchCollapsed ? "w-12 h-12" : "w-20 h-20")}>{alert.homeLogo ? <img src={alert.homeLogo} className={cn("object-contain drop-shadow-md", isMatchCollapsed ? "w-10 h-10" : "w-16 h-16")} alt="" /> : <Trophy className={cn("text-white/10", isMatchCollapsed ? "w-5 h-5" : "w-8 h-8")} />}{!isMatchCollapsed && <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-[6px] font-black text-white text-center truncate px-1">{alert.homeName || "HOME"}</span>}</div>
                     <div className={cn("flex-1 flex flex-col items-center justify-center p-0 m-0", isMatchCollapsed ? "min-w-[6rem]" : "min-w-[12rem]")}><div className={cn("w-full p-0 m-0 flex items-center justify-center", isMatchCollapsed ? "h-14" : "h-24")}><GlassNumber text={alert.matchTimeStr || "--:--"} id={`match-${alert.id}`} size={isMatchCollapsed ? "4.5rem" : "5.6rem"} colorClass={alert.isExpired ? "text-emerald-400 animate-pulse" : "text-white"} /></div>{alert.minuteStr && !alert.isExpired && <span className={cn("font-black leading-none tabular-nums -mt-1", isMatchCollapsed ? "text-[0.65rem]" : "text-[0.9rem]", alert.isExpired ? "text-red-400" : "text-white/50")}>{alert.minuteStr}</span>}</div>
                     <div className={cn("rounded-full bg-white/5 flex items-center justify-center border border-white/10 overflow-hidden shrink-0 shadow-lg relative", isMatchCollapsed ? "w-12 h-12" : "w-20 h-20")}>{alert.awayLogo ? <img src={alert.awayLogo} className={cn("object-contain drop-shadow-md", isMatchCollapsed ? "w-10 h-10" : "w-16 h-16")} alt="" /> : <Trophy className={cn("text-white/10", isMatchCollapsed ? "w-5 h-5" : "w-8 h-8")} />}{!isMatchCollapsed && <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-[6px] font-black text-white text-center truncate px-1">{alert.awayName || "AWAY"}</span>}</div>
                   </div>
                 );
               }

               if (alert.type === 'sync') {
                 return (
                   <div key={alert.id} className="pointer-events-auto premium-glass min-w-[10rem] h-[4.5rem] rounded-full flex items-center px-6 gap-3 animate-in slide-in-from-top-2 border border-primary/20 shadow-xl bg-primary/5">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 shadow-inner">
                         <Zap className="w-4 h-4 text-primary animate-pulse" />
                      </div>
                      <div className="flex flex-col items-center">
                         <span className="text-[0.7rem] font-black uppercase text-white/60 tracking-widest leading-none mb-1">{alert.name}</span>
                         <span className="text-[0.8rem] font-black text-primary animate-pulse uppercase tracking-[0.3em]">Online</span>
                      </div>
                   </div>
                 );
               }

               return (
                  <div key={alert.id} className={cn("pointer-events-auto premium-glass min-w-[12rem] h-[5rem] rounded-[2.5rem] flex items-center px-6 gap-3 animate-in slide-in-from-top-2 border transition-all relative group shadow-xl", alert.completed ? "bg-emerald-600/60 border-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.4)]" : "border-white/10")}>
                    <button onClick={() => handleAction(alert.id, alert.type as any)} className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-black/60 text-emerald-400 opacity-0 group-hover:opacity-100 flex items-center justify-center pointer-events-auto transition-opacity focusable z-50 border border-white/10 shadow-glow"><Check className="w-4 h-4" /></button>
                    <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-colors shadow-inner", alert.completed ? "bg-white/20" : alert.type === 'azan' ? "bg-accent/20" : (alert.type === 'iqamah' || alert.type === 'azkar') ? "bg-emerald-400/20" : "bg-primary/20")}>{alert.completed ? <Check className="w-5 h-5 text-white" /> : alert.type === 'azan' ? <Clock className="w-5 h-5 text-accent" /> : alert.type === 'iqamah' ? <Timer className="w-5 h-5 text-emerald-400" /> : alert.type === 'azkar' ? <Bookmark className="w-5 h-5 text-emerald-400" /> : alert.iconType === 'play' ? <Play className="w-5 h-5 fill-current text-primary" /> : <Bell className="w-5 h-5 text-primary" />}</div>
                    <div className="flex-1 flex flex-col items-center justify-center"><span className={cn("text-[0.85rem] font-black uppercase truncate max-w-[100px] leading-none mb-1", alert.completed ? "text-white" : "text-white/80")}>{alert.name}</span><div className="h-10 w-full"><GlassNumber text={alert.completed ? "منجز" : (alert.isExpired || alert.type === 'azkar') ? "الآن" : `${alert.diff >= 0 ? "-" : "+"}${formatCountdown(alert.diff)}`} id={`alert-${alert.id}`} size="5.6rem" colorClass={alert.completed ? "text-white" : alert.color} /></div></div>
                  </div>
               );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
