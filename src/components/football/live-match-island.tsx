"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Match } from "@/lib/football-data";
import { fetchFootballData } from "@/lib/football-api";
import { useMediaStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { X, Eye, EyeOff } from "lucide-react";

interface ReminderItem {
  id: string;
  name: string;
  diff: number;
  isWithinWindow: boolean;
}

interface GoalEvent {
  matchId: string;
  teamName: string;
  teamLogo: string;
}

export function LiveMatchIsland() {
  const { 
    favoriteTeams, prayerTimes, prayerSettings, belledMatchIds, 
    showIslands, toggleShowIslands, skippedMatchIds, skipMatch, activeVideo 
  } = useMediaStore();

  const [topMatches, setTopMatches] = useState<Match[]>([]);
  const [now, setNow] = useState(new Date());
  const [activeGoal, setActiveGoal] = useState<GoalEvent | null>(null);
  const prevScoresRef = useRef<Record<string, { home: number, away: number }>>({});
  const [overrideMatchId, setOverrideMatchId] = useState<string | null>(null);
  const lastFetchRef = useRef<number>(0);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchMatches = useCallback(async (force = false) => {
    // ترشيد Football API: لا يتم التحديث المتكرر إلا إذا كان هناك مباريات مباشرة
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
            if (match.score.home > prev.home) {
              setActiveGoal({ matchId: match.id, teamName: match.homeTeam, teamLogo: match.homeLogo });
              setTimeout(() => setActiveGoal(null), 8000);
            } else if (match.score.away > prev.away) {
              setActiveGoal({ matchId: match.id, teamName: match.awayTeam, teamLogo: match.awayLogo });
              setTimeout(() => setActiveGoal(null), 8000);
            }
          }
          if (match.score) {
            prevScoresRef.current[match.id] = { home: match.score.home, away: match.score.away };
          }
        }
      }
      setTopMatches(matches || []);
    } catch (e) {
      console.error("Island Fetch Error:", e);
    }
  }, [favoriteTeams, belledMatchIds, topMatches]);

  useEffect(() => { fetchMatches(true); }, []);
  useEffect(() => {
    const interval = setInterval(() => fetchMatches(), 60000);
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

    if (prayerTimes?.length) {
      const pData = prayerTimes.find(p => p.date.endsWith(`-${now.getDate().toString().padStart(2, '0')}`)) || prayerTimes[0];
      for (const setting of prayerSettings) {
        let refTime = pData[setting.id as keyof typeof pData];
        if (!refTime) continue;
        const baseMinutes = tToM(refTime) + setting.offsetMinutes;
        const azanSecs = baseMinutes * 60;
        let aDiff = azanSecs - totalCurrentSecs;
        if (aDiff < -43200) aDiff += 86400;
        const isWithin = aDiff > 0 && aDiff < (setting.countdownWindow * 60);
        if (isWithin) list.push({ id: `azan-${setting.id}`, name: setting.name, diff: aDiff, isWithinWindow: true });
      }
    }
    return list.sort((a, b) => Math.abs(a.diff) - Math.abs(b.diff));
  }, [now, prayerTimes, prayerSettings]);

  const closestRem = processedReminders.length > 0 ? processedReminders[0] : null;
  const isCountdownActive = closestRem?.isWithinWindow;

  useEffect(() => {
    if (isCountdownActive && !showIslands) toggleShowIslands();
  }, [isCountdownActive, showIslands, toggleShowIslands]);

  const sortedMatches = useMemo(() => {
    // الجزيرة تقتصر فقط على المفضلات والمجرسة
    return topMatches
      .filter(m => !skippedMatchIds.includes(m.id))
      .filter(m => belledMatchIds.includes(m.id) || favoriteTeams.some(t => t.id === m.homeTeamId || t.id === m.awayTeamId))
      .sort((a, b) => {
        const aBelled = belledMatchIds.includes(a.id);
        const bBelled = belledMatchIds.includes(b.id);
        if (aBelled !== bBelled) return aBelled ? -1 : 1;
        const statusWeight: Record<string, number> = { live: 0, upcoming: 1, finished: 2 };
        return (statusWeight[a.status] || 0) - (statusWeight[b.status] || 0);
      });
  }, [topMatches, skippedMatchIds, favoriteTeams, belledMatchIds]);

  const mainMatch = useMemo(() => {
    if (overrideMatchId) return sortedMatches.find(m => m.id === overrideMatchId) || sortedMatches[0];
    return sortedMatches[0];
  }, [sortedMatches, overrideMatchId]);

  if (activeVideo) return null;

  const GlassNumber = ({ text, size = '3rem', id, subtext, colorClass }: { text: string, size?: string, id: string, subtext?: string, colorClass?: string }) => (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      <svg className="w-full h-full overflow-visible" viewBox="0 0 200 60">
        <defs>
          <linearGradient id={`textFill-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.15)" />
          </linearGradient>
        </defs>
        <text 
          x="50%" y="50%" textAnchor="middle" dominantBaseline="central" 
          className={cn("font-black tabular-nums tracking-tighter", colorClass)} 
          style={{ fontSize: size }} 
          fill={colorClass ? "currentColor" : `url(#textFill-${id})`}
        >
          {text}
        </text>
      </svg>
      {subtext && <span className="font-black text-white/40 uppercase tracking-widest absolute" style={{ fontSize: '1rem', bottom: '-11px' }}>{subtext}</span>}
    </div>
  );

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[10001] flex flex-col items-center gap-4 pointer-events-none scale-110 dir-rtl">
      <div className="flex items-start gap-4">
        <div onClick={toggleShowIslands} className="pointer-events-auto shadow-2xl w-[3.5rem] h-[3.5rem] rounded-full flex items-center justify-center premium-glass cursor-pointer active:scale-90 transition-all border border-white/10">
          {(showIslands || isCountdownActive) ? <Eye className="w-5 h-5 text-accent" /> : <EyeOff className="w-5 h-5 text-white/20" />}
        </div>

        {(showIslands || isCountdownActive) && (
          <>
            {closestRem && !activeGoal && (
              <div className="pointer-events-auto shadow-2xl relative overflow-hidden premium-glass w-[18rem] h-[3.5rem] rounded-[2.5rem] animate-in slide-in-from-top-4">
                <div className="relative z-10 h-full w-full flex flex-col items-center justify-center">
                  <span className="text-[0.8rem] font-black text-accent uppercase">{closestRem.name}</span>
                  <div className="h-10 w-full">
                    <GlassNumber text={`-${formatCountdown(closestRem.diff)}`} id="rem-full" size="2.8rem" />
                  </div>
                </div>
              </div>
            )}

            {activeGoal && (
              <div className="pointer-events-auto bg-zinc-950/90 rounded-[2.5rem] shadow-glow w-[38rem] h-[3.5rem] overflow-hidden relative border border-primary/40 flex items-center px-6 gap-6 animate-in fade-in zoom-in-95 duration-500 premium-glass">
                <img src={activeGoal.teamLogo} className="w-10 h-10 object-contain" alt="" />
                <span className="text-xl font-black text-white uppercase">{activeGoal.teamName}</span>
                <div className="flex-1 h-full flex items-center justify-center"><span className="text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-primary via-white to-primary uppercase">GOAAAL!</span></div>
              </div>
            )}

            {!activeGoal && mainMatch && (
              <div className="flex items-center gap-2">
                <div className="pointer-events-auto rounded-[2.5rem] shadow-2xl w-[18rem] h-[3.5rem] overflow-hidden relative group premium-glass">
                  <button onClick={(e) => { e.stopPropagation(); skipMatch(mainMatch.id); }} className="absolute top-1 left-1 z-[100] w-6 h-6 rounded-full bg-black/40 text-white/40 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
                  <div className="relative z-10 h-full w-full flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-between px-2" style={{ background: 'linear-gradient(0deg, black 5%, transparent)' }}>
                      <img src={mainMatch.homeLogo} className="h-full w-auto object-contain scale-[1.5] translate-x-4" alt="" />
                      <img src={mainMatch.awayLogo} className="h-full w-auto object-contain scale-[1.5] -translate-x-4" alt="" />
                    </div>
                    <div className="relative w-full h-full z-20 flex flex-col items-center justify-center" style={{ background: 'linear-gradient(-1deg, black, transparent)' }}>
                      {mainMatch.status === 'live' && (
                        <div className="absolute top-1 left-1/2 -translate-x-1/2 z-30">
                          <span className="text-[12px] font-black text-primary bg-black/80 px-3 py-0.5 rounded-full border border-primary/20">
                            {mainMatch.minute}'
                          </span>
                        </div>
                      )}
                      <GlassNumber text={mainMatch.status === 'upcoming' ? mainMatch.startTime : `${mainMatch.score?.away}-${mainMatch.score?.home}`} id={`match-main`} subtext={mainMatch.league} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showIslands && sortedMatches.length > 1 && !activeGoal && (
        <div className="flex items-center gap-2 animate-in slide-in-from-top-2 duration-700">
          {sortedMatches.slice(1, 6).map((match) => {
            const isFavoriteMatch = favoriteTeams.some(t => t.id === match.homeTeamId || t.id === match.awayTeamId);
            return (
              <div 
                key={match.id} onClick={() => setOverrideMatchId(match.id)}
                className={cn(
                  "pointer-events-auto w-14 h-14 rounded-full flex items-center justify-center premium-glass cursor-pointer border-2 transition-all relative overflow-hidden",
                  belledMatchIds.includes(match.id) ? "border-accent" : "border-white/10"
                )}
              >
                <img src={match.homeLogo} className="w-full h-full object-contain opacity-40 absolute inset-0" alt="" />
                {match.status === 'live' && (
                  <div className="absolute top-0 right-0 left-0 flex justify-center z-30">
                    <span className="text-[14px] font-black text-primary bg-black/80 px-2 py-0.5 rounded-full border border-primary/20 shadow-xl">{match.minute}'</span>
                  </div>
                )}
                {match.status !== 'upcoming' ? (
                  <div className="relative z-10 flex items-center justify-center scale-110">
                    <GlassNumber text={`${match.score?.away}-${match.score?.home}`} id={`mini-score-${match.id}`} size="4.5rem" colorClass={isFavoriteMatch ? "text-emerald-400" : "text-white"} />
                  </div>
                ) : (
                  <img src={match.homeLogo} className="w-8 h-8 object-contain relative z-10" alt="" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}