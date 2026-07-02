
"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Match } from "@/lib/football-data";
import { fetchFootballData } from "@/lib/football-api";
import { useMediaStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { X, Eye, EyeOff, Bell, Clock, Timer } from "lucide-react";

interface AlertItem {
  id: string;
  name: string;
  diff: number;
  expDiff?: number;
  type: 'azan' | 'iqamah' | 'reminder';
  color: string;
  isExpired?: boolean;
  isEnding?: boolean;
}

interface GoalEvent {
  matchId: string;
  teamName: string;
  teamLogo: string;
}

export function LiveMatchIsland() {
  const { 
    favoriteTeams, prayerTimes, prayerSettings, reminders, belledMatchIds, 
    showIslands, toggleShowIslands, skippedMatchIds, skipMatch, autoHideIsland
  } = useMediaStore();

  const [mounted, setMounted] = useState(false);
  const [topMatches, setTopMatches] = useState<Match[]>([]);
  const [now, setNow] = useState<Date | null>(null);
  const [activeGoal, setActiveGoal] = useState<GoalEvent | null>(null);
  const prevScoresRef = useRef<Record<string, { home: number, away: number }>>({});
  const lastFetchRef = useRef<number>(0);

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchMatches = useCallback(async (force = false) => {
    const hasLiveMatch = topMatches.some(m => m.status === 'live');
    const timeSinceLast = Date.now() - lastFetchRef.current;
    if (!force && !hasLiveMatch && timeSinceLast < 3600000 && lastFetchRef.current !== 0) return;
    if (!force && hasLiveMatch && timeSinceLast < 60000) return;
    try {
      const matches = await fetchFootballData('today');
      lastFetchRef.current = Date.now();
      if (matches && matches.length > 0) {
        for (const match of matches) {
          const prev = prevScoresRef.current[match.id];
          const isFavoriteMatch = favoriteTeams.some(t => t.id === match.homeTeamId || t.id === match.awayTeamId) || belledMatchIds.includes(match.id);
          if (prev && match.score && isFavoriteMatch) {
            if (match.score.home > prev.home) { setActiveGoal({ matchId: match.id, teamName: match.homeTeam, teamLogo: match.homeLogo }); setTimeout(() => setActiveGoal(null), 8000); }
            else if (match.score.away > prev.away) { setActiveGoal({ matchId: match.id, teamName: match.awayTeam, teamLogo: match.awayLogo }); setTimeout(() => setActiveGoal(null), 8000); }
          }
          if (match.score) prevScoresRef.current[match.id] = { home: match.score.home, away: match.score.away };
        }
      }
      setTopMatches(matches || []);
    } catch (e) {}
  }, [favoriteTeams, belledMatchIds, topMatches]);

  useEffect(() => { fetchMatches(true); }, []);
  useEffect(() => { const interval = setInterval(() => fetchMatches(), 60000); return () => clearInterval(interval); }, [fetchMatches]);

  const tToM = (t: string) => { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + m; };

  const activeAlerts = useMemo(() => {
    if (!now || !prayerTimes?.length) return [];
    const list: AlertItem[] = [];
    const totalCurrentSecs = (now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds();
    const dateStr = now.toISOString().split('T')[0];
    const pData = prayerTimes.find(p => p.date === dateStr) || prayerTimes.find(p => p.date.endsWith(`-${now.getDate().toString().padStart(2, '0')}`)) || prayerTimes[0];
    
    if (pData) {
      for (const setting of prayerSettings) {
        let refTime = pData[setting.id as keyof typeof pData];
        if (setting.id === 'duha') refTime = pData['sunrise'];
        if (!refTime) continue;
        const azanSecs = (tToM(refTime) + (setting.id === 'duha' ? 15 : 0) + setting.offsetMinutes) * 60;
        let aDiff = azanSecs - totalCurrentSecs;
        if (aDiff < -43200) aDiff += 86400;
        if (aDiff > 0 && aDiff < (setting.countdownWindow * 60)) list.push({ id: `azan-${setting.id}`, name: setting.name, diff: aDiff, type: 'azan', color: 'text-accent' });
        else if (aDiff <= 0 && setting.iqamahDuration > 0 && Math.abs(aDiff) < (setting.iqamahDuration * 60)) list.push({ id: `iqamah-${setting.id}`, name: `إقامة ${setting.name}`, diff: aDiff, type: 'iqamah', color: 'text-emerald-400' });
      }

      for (const rem of reminders) {
        if (rem.completed) continue;
        let targetSecs = 0, expirySecs = 0;
        if (rem.relativePrayer === 'manual' && rem.manualTime) targetSecs = tToM(rem.manualTime) * 60;
        else {
          let refTime = pData[rem.relativePrayer as keyof typeof pData];
          if (rem.relativePrayer === 'duha') refTime = pData['sunrise'];
          if (refTime) {
            const pSetting = prayerSettings.find(s => s.id === rem.relativePrayer);
            let baseMins = tToM(refTime) + (rem.relativePrayer === 'duha' ? 15 : 0);
            if (rem.referencePoint === 'iqamah') baseMins += (pSetting?.iqamahDuration || 0);
            targetSecs = (baseMins + rem.offsetMinutes) * 60;
          }
        }
        if (targetSecs > 0) {
          if (rem.expiryType === 'prayer' || rem.expiryType === 'iqamah') {
            let expRef = rem.expiryValue === 'next' ? '' : rem.expiryValue;
            if (rem.expiryValue === 'next') {
              const prayers = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
              expRef = prayers.find(p => tToM(pData[p]) > (totalCurrentSecs / 60)) || 'fajr';
            }
            if (expRef && pData[expRef]) {
              const expSetting = prayerSettings.find(s => s.id === expRef);
              let expMins = tToM(pData[expRef]);
              if (rem.expiryType === 'iqamah') expMins += (expSetting?.iqamahDuration || 0);
              expirySecs = expMins * 60;
            }
          } else if (rem.expiryType === 'manual' && rem.expiryValue) expirySecs = tToM(rem.expiryValue) * 60;
          else expirySecs = targetSecs + (parseInt(rem.expiryValue || '30') * 60);

          let startDiff = targetSecs - totalCurrentSecs;
          if (startDiff < -43200) startDiff += 86400;
          let expDiff = expirySecs - totalCurrentSecs;
          if (expDiff < -43200) expDiff += 86400;
          if (expDiff > 0) {
            if (startDiff < (rem.countdownWindow * 60) || startDiff <= 0) {
              const isEnding = expDiff <= 600;
              list.push({ id: rem.id, name: rem.label, diff: isEnding ? expDiff : startDiff, type: 'reminder', color: isEnding ? 'text-red-500' : rem.color, isExpired: startDiff <= 0 && !isEnding, isEnding });
            }
          }
        }
      }
    }
    return list.sort((a, b) => Math.abs(a.diff) - Math.abs(b.diff));
  }, [now, prayerTimes, prayerSettings, reminders]);

  const sortedMatches = useMemo(() => {
    return topMatches.filter(m => !skippedMatchIds.includes(m.id)).sort((a, b) => {
      const aB = belledMatchIds.includes(a.id), bB = belledMatchIds.includes(b.id);
      if (aB !== bB) return aB ? -1 : 1;
      const aF = favoriteTeams.some(t => t.id === a.homeTeamId || t.id === a.awayTeamId), bF = favoriteTeams.some(t => t.id === b.homeTeamId || t.id === b.awayTeamId);
      if (aF !== bF) return aF ? -1 : 1;
      return (a.status === 'live' ? 0 : 1) - (b.status === 'live' ? 0 : 1);
    });
  }, [topMatches, skippedMatchIds, favoriteTeams, belledMatchIds]);

  const formatCountdown = (diffSeconds: number) => { const absSecs = Math.abs(diffSeconds); return `${Math.floor((absSecs % 3600) / 60).toString().padStart(2, '0')}:${(absSecs % 60).toString().padStart(2, '0')}`; };
  const GlassNumber = ({ text, size = '3rem', id, colorClass }: { text: string, size?: string, id: string, colorClass?: string }) => (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg className="w-full h-full overflow-visible" viewBox="0 0 200 60">
        <defs><linearGradient id={`textFill-${id}`} x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="rgba(255,255,255,0.95)" /><stop offset="100%" stopColor="rgba(255,255,255,0.15)" /></linearGradient></defs>
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className={cn("font-black tabular-nums tracking-tighter", colorClass)} style={{ fontSize: size }} fill={colorClass ? "currentColor" : `url(#textFill-${id})`}>{text}</text>
      </svg>
    </div>
  );

  if (!mounted || !now) return null;
  if (autoHideIsland && !activeAlerts.length && !activeGoal) return null;

  return (
    <div className={cn("fixed top-6 left-1/2 -translate-x-1/2 z-[10001] flex flex-col items-center gap-4 pointer-events-none scale-110 dir-rtl transition-all duration-700", (showIslands || activeAlerts.length) ? "translate-y-0 opacity-100" : "-translate-y-20 opacity-0")}>
      <div className="flex items-start gap-4">
        <div onClick={toggleShowIslands} className="pointer-events-auto shadow-2xl w-[3.5rem] h-[3.5rem] rounded-full flex items-center justify-center premium-glass cursor-pointer border border-white/10 active:scale-90 transition-all">{showIslands ? <Eye className="w-5 h-5 text-accent" /> : <EyeOff className="w-5 h-5 text-white/20" />}</div>
        {showIslands && (
          <div className="flex items-center gap-3">
            {activeAlerts.map((alert) => (
              <div key={alert.id} className="pointer-events-auto premium-glass min-w-[12rem] h-[3.5rem] rounded-[2.5rem] flex items-center px-4 gap-3 animate-in slide-in-from-top-4 border border-white/10">
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", alert.type === 'azan' ? "bg-accent/20" : alert.type === 'iqamah' ? "bg-emerald-400/20" : "bg-primary/20")}>{alert.type === 'azan' ? <Clock className="w-4 h-4 text-accent" /> : alert.type === 'iqamah' ? <Timer className="w-4 h-4 text-emerald-400" /> : <Bell className="w-4 h-4 text-primary" />}</div>
                <div className="flex-1 flex flex-col items-center justify-center"><span className={cn("text-[0.8rem] font-black uppercase truncate max-w-[100px] leading-none mb-1", alert.isEnding ? "text-red-500" : "text-white/80")}>{alert.isEnding ? `END ${alert.name}` : alert.name}</span><div className="h-8 w-full"><GlassNumber text={alert.isExpired ? "الآن" : `${alert.diff >= 0 ? "-" : "+"}${formatCountdown(alert.diff)}`} id={`alert-${alert.id}`} size="2.2rem" colorClass={alert.color} /></div></div>
              </div>
            ))}
            {!activeGoal && sortedMatches[0] && (
              <div className="pointer-events-auto premium-glass w-[18rem] h-[3.5rem] rounded-[2.5rem] overflow-hidden relative group border border-white/10 shadow-2xl">
                <button onClick={(e) => { e.stopPropagation(); skipMatch(sortedMatches[0].id); }} className="absolute top-1 left-1 z-50 w-6 h-6 rounded-full bg-black/40 text-white/40 opacity-0 group-hover:opacity-100 flex items-center justify-center"><X className="w-3 h-3" /></button>
                <div className="absolute inset-0 flex items-center justify-between px-2 overflow-hidden opacity-40"><img src={sortedMatches[0].homeLogo} className="h-full scale-150 translate-x-4" alt="" /><img src={sortedMatches[0].awayLogo} className="h-full scale-150 -translate-x-4" alt="" /></div>
                <div className="relative z-10 h-full flex flex-col items-center justify-center">{sortedMatches[0].status === 'live' && <span className="absolute top-1 text-[10px] font-black text-primary bg-black/60 px-2 rounded-full border border-primary/20">{sortedMatches[0].minute}'</span>}<GlassNumber text={sortedMatches[0].status === 'upcoming' ? sortedMatches[0].startTime : `${sortedMatches[0].score?.away}-${sortedMatches[0].score?.home}`} id="main-match" /></div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
