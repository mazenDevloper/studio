
"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Match } from "@/lib/football-data";
import { fetchFootballData } from "@/lib/football-api";
import { useMediaStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { X, Eye, EyeOff, Bell, Clock, Timer, Check, Trophy, Play, ChevronDown, ChevronUp } from "lucide-react";
import { convertTo12Hour } from "@/lib/constants";

interface AlertItem {
  id: string;
  name: string;
  diff: number;
  expDiff?: number;
  type: 'azan' | 'iqamah' | 'reminder' | 'match';
  iconType?: 'play' | 'bell' | 'circle' | 'match';
  color: string;
  isExpired?: boolean;
  isEnding?: boolean;
  completed?: boolean;
  homeLogo?: string;
  awayLogo?: string;
  homeName?: string;
  awayName?: string;
  matchTimeStr?: string;
}

/**
 * LiveMatchIsland v1590.0 - Ultra-Small Desktop Scale Protocol
 * Features: Reduced scale (0.80) on large screens for minimal visual footprint.
 */
export function LiveMatchIsland() {
  const { 
    favoriteTeams, prayerTimes, prayerSettings, reminders, belledMatchIds, 
    showIslands, toggleShowIslands, skippedMatchIds, skipMatch, autoHideIsland,
    skippedReminderIds, skipReminder, toggleReminder, syncMasterBin
  } = useMediaStore();

  const [mounted, setMounted] = useState(false);
  const [topMatches, setTopMatches] = useState<Match[]>([]);
  const [now, setNow] = useState<Date | null>(null);
  const [isMatchCollapsed, setIsMatchCollapsed] = useState(true);
  const lastFetchRef = useRef<number>(0);

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchMatches = useCallback(async (force = false) => {
    const timeSinceLast = Date.now() - lastFetchRef.current;
    if (!force && timeSinceLast < 60000) return;
    try {
      const matches = await fetchFootballData('today');
      lastFetchRef.current = Date.now();
      setTopMatches(matches || []);
    } catch (e) {}
  }, []);

  useEffect(() => { fetchMatches(true); }, []);
  useEffect(() => { const interval = setInterval(() => fetchMatches(), 60000); return () => clearInterval(interval); }, [fetchMatches]);

  const tToM = (t: string) => { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + m; };

  const activeAlerts = useMemo(() => {
    if (!now || !prayerTimes?.length) return [];
    const list: AlertItem[] = [];
    const totalCurrentSecs = (now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds();
    const dateStr = now.toISOString().split('T')[0];
    const pData = prayerTimes.find(p => p.date === dateStr) || prayerTimes[0];
    
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
        if (rem.iconType === 'match' && rem.matchDate && rem.matchDate !== dateStr) continue;

        let startSecs = 0;
        if (rem.startType === 'manual' && rem.manualStartTime) startSecs = tToM(rem.manualStartTime) * 60;
        else if (rem.startReference && pData[rem.startReference]) {
          const pSetting = prayerSettings.find(s => s.id === rem.startReference);
          let baseMins = tToM(pData[rem.startReference]);
          if (rem.startType === 'iqamah') baseMins += (pSetting?.iqamahDuration || 0);
          startSecs = (baseMins + rem.startOffset) * 60;
        }

        if (startSecs > 0) {
          let sDiff = startSecs - totalCurrentSecs;
          if (sDiff < -43200) sDiff += 86400;
          if (sDiff > 43200) sDiff -= 86400;

          let endSecs = 0;
          if (rem.endType === 'manual' && rem.manualEndTime) endSecs = tToM(rem.manualEndTime) * 60;
          else if (rem.endType === 'duration') endSecs = startSecs + (rem.durationMinutes || 30) * 60;
          else if ((rem.endType === 'azan' || rem.endType === 'iqamah' || rem.endType === 'prayer') && rem.endReference && pData[rem.endReference]) {
            const expSetting = prayerSettings.find(s => s.id === rem.endReference);
            let expMins = tToM(pData[rem.endReference]);
            if (rem.endType === 'iqamah') expMins += (expSetting?.iqamahDuration || 0);
            endSecs = (expMins + (rem.endOffset || 0)) * 60;
          }

          let eDiff = endSecs - totalCurrentSecs;
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
              completed: rem.completed,
              homeLogo: rem.homeLogo,
              awayLogo: rem.awayLogo,
              homeName: rem.homeName,
              awayName: rem.awayName,
              matchTimeStr: convertTo12Hour(rem.manualStartTime)
            });
          }
        }
      }
    }
    return list.sort((a, b) => Math.abs(a.diff) - Math.abs(b.diff));
  }, [now, prayerTimes, prayerSettings, reminders, skippedReminderIds, skippedMatchIds]);

  const handleAction = async (id: string, type: 'match' | 'reminder') => {
    if (type === 'match') {
      skipMatch(id);
    } else {
      toggleReminder(id);
    }
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
  
  const GlassNumber = ({ text, size = '3rem', id, colorClass }: { text: string, size?: string, id: string, colorClass?: string }) => (
    <div className="relative w-full h-full flex items-center justify-center p-0 m-0 overflow-visible">
      <svg className="w-full h-full overflow-visible" viewBox="0 0 160 80">
        <defs><linearGradient id={`textFill-${id}`} x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="rgba(255,255,255,0.95)" /><stop offset="100%" stopColor="rgba(255,255,255,0.15)" /></linearGradient></defs>
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className={cn("font-black tabular-nums tracking-tighter", colorClass)} style={{ fontSize: size }} fill={colorClass ? "currentColor" : `url(#textFill-${id})`}>{text}</text>
      </svg>
    </div>
  );

  if (!mounted || !now) return null;
  if (autoHideIsland && !activeAlerts.length) return null;

  return (
    <div className={cn("fixed top-6 left-1/2 -translate-x-1/2 z-[10001] flex flex-col items-center gap-3 pointer-events-none scale-90 min-[968px]:scale-[0.80] dir-rtl transition-all duration-700", (showIslands || activeAlerts.length) ? "translate-y-0 opacity-100" : "-translate-y-20 opacity-0")}>
      <div className="flex items-start gap-3">
        <div onClick={toggleShowIslands} className="pointer-events-auto shadow-2xl w-12 h-12 rounded-full flex items-center justify-center premium-glass cursor-pointer border border-white/10 active:scale-90 transition-all">{showIslands ? <Eye className="w-5 h-5 text-accent" /> : <EyeOff className="w-5 h-5 text-white/20" />}</div>
        {showIslands && (
          <div className="flex items-center gap-2">
            {activeAlerts.map((alert) => {
               if (alert.type === 'match') {
                 return (
                   <div 
                     key={alert.id} 
                     onClick={() => setIsMatchCollapsed(!isMatchCollapsed)}
                     className={cn(
                       "pointer-events-auto premium-glass rounded-full flex items-center animate-in slide-in-from-top-2 border transition-all relative group shadow-2xl cursor-pointer",
                       alert.completed ? "bg-emerald-600/60 border-emerald-400" : "border-white/10",
                       isMatchCollapsed ? "min-w-[8.5rem] h-[3.8rem] gap-0 px-1" : "min-w-[16rem] h-[6.5rem] gap-0 px-2"
                     )}
                   >
                     <button onClick={(e) => { e.stopPropagation(); handleAction(alert.id, 'match'); }} className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center pointer-events-auto transition-opacity z-50 border border-white/10 shadow-glow"><X className="w-3.5 h-3.5" /></button>
                     
                     <div className={cn(
                       "rounded-full bg-white/5 flex items-center justify-center border border-white/10 overflow-hidden shrink-0 shadow-lg relative",
                       isMatchCollapsed ? "w-10 h-10" : "w-16 h-16"
                     )}>
                        {alert.homeLogo ? <img src={alert.homeLogo} className={cn("object-contain drop-shadow-md", isMatchCollapsed ? "w-8 h-8" : "w-13 h-13")} alt="" /> : <Trophy className={cn("text-white/10", isMatchCollapsed ? "w-4 h-4" : "w-6 h-6")} />}
                        {!isMatchCollapsed && <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-[6px] font-black text-white text-center truncate px-1">{alert.homeName || "HOME"}</span>}
                     </div>

                     <div className={cn(
                       "flex-1 flex flex-col items-center justify-center p-0 m-0",
                       isMatchCollapsed ? "min-w-[5rem]" : "min-w-[10rem]"
                     )}>
                        <div className={cn("w-full p-0 m-0 flex items-center justify-center", isMatchCollapsed ? "h-12" : "h-20")}>
                           <GlassNumber 
                             text={alert.matchTimeStr || "--:--"} 
                             id={`match-${alert.id}`} 
                             size={isMatchCollapsed ? "3.2rem" : "5.5rem"} 
                             colorClass={alert.isExpired ? "text-emerald-400 animate-pulse" : "text-white"} 
                           />
                        </div>
                     </div>

                     <div className={cn(
                       "rounded-full bg-white/5 flex items-center justify-center border border-white/10 overflow-hidden shrink-0 shadow-lg relative",
                       isMatchCollapsed ? "w-10 h-10" : "w-16 h-16"
                     )}>
                        {alert.awayLogo ? <img src={alert.awayLogo} className={cn("object-contain drop-shadow-md", isMatchCollapsed ? "w-8 h-8" : "w-13 h-13")} alt="" /> : <Trophy className={cn("text-white/10", isMatchCollapsed ? "w-4 h-4" : "w-6 h-6")} />}
                        {!isMatchCollapsed && <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-[6px] font-black text-white text-center truncate px-1">{alert.awayName || "AWAY"}</span>}
                     </div>
                   </div>
                 );
               }
               return (
                  <div key={alert.id} className={cn(
                    "pointer-events-auto premium-glass min-w-[10.5rem] h-[4rem] rounded-[2rem] flex items-center px-4 gap-3 animate-in slide-in-from-top-2 border transition-all relative group shadow-xl",
                    alert.completed ? "bg-emerald-600/60 border-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.4)]" : "border-white/10"
                  )}>
                    <button onClick={() => handleAction(alert.id, 'reminder')} className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-black/60 text-emerald-400 opacity-0 group-hover:opacity-100 flex items-center justify-center pointer-events-auto transition-opacity z-50 border border-white/10 shadow-glow"><Check className="w-4 h-4" /></button>
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors shadow-inner", 
                      alert.completed ? "bg-white/20" : alert.type === 'azan' ? "bg-accent/20" : alert.type === 'iqamah' ? "bg-emerald-400/20" : "bg-primary/20"
                    )}>
                      {alert.completed ? <Check className="w-4 h-4 text-white" /> : 
                       alert.type === 'azan' ? <Clock className="w-4 h-4 text-accent" /> : 
                       alert.type === 'iqamah' ? <Timer className="w-4 h-4 text-emerald-400" /> : 
                       alert.iconType === 'play' ? <Play className="w-4 h-4 fill-current text-primary" /> :
                       <Bell className="w-4 h-4 text-primary" />}
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center">
                      <span className={cn("text-[0.75rem] font-black uppercase truncate max-w-[80px] leading-none mb-1", alert.completed ? "text-white" : "text-white/80")}>
                        {alert.name}
                      </span>
                      <div className="h-8 w-full">
                        <GlassNumber text={alert.completed ? "منجز" : alert.isExpired ? "الآن" : `${alert.diff >= 0 ? "-" : "+"}${formatCountdown(alert.diff)}`} id={`alert-${alert.id}`} size="2.2rem" colorClass={alert.completed ? "text-white" : alert.color} />
                      </div>
                    </div>
                  </div>
               );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
