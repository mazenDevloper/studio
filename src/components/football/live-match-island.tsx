"use client";

import { useEffect, useState, useCallback } from "react";
import { Match } from "@/lib/football-data";
import { fetchFootballData } from "@/lib/football-api";
import { useMediaStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Activity, Trophy, Timer } from "lucide-react";

const MOCK_LIVE_MATCH: Match = {
  id: "mock-1",
  homeTeam: "الهلال",
  awayTeam: "النصر",
  homeLogo: "https://media.api-sports.io/football/teams/2931.png",
  awayLogo: "https://media.api-sports.io/football/teams/2939.png",
  startTime: "20:00",
  status: "live",
  score: { home: 2, away: 1 },
  minute: 74,
  league: "دوري روشن السعودي - عرض تجريبي",
  channel: "SSC 1 HD",
  commentator: "فهد العتيبي",
  broadcasts: []
};

export function LiveMatchIsland() {
  const { favoriteTeamIds } = useMediaStore();
  const [liveMatch, setLiveMatch] = useState<Match | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchLiveStatus = useCallback(async () => {
    try {
      // جلب كافة المباريات المباشرة حول العالم حالياً
      const currentMatches = await fetchFootballData('live');
      
      if (currentMatches && currentMatches.length > 0) {
        // الأولوية 1: مباراة لفريق مفضل
        const favMatch = currentMatches.find(m => 
          (m.homeTeamId && favoriteTeamIds.includes(m.homeTeamId)) ||
          (m.awayTeamId && favoriteTeamIds.includes(m.awayTeamId))
        );

        if (favMatch) {
          setLiveMatch(favMatch);
        } else {
          // الأولوية 2: أول مباراة مباشرة في القائمة (الأهم عالمياً حسب ترتيب API)
          setLiveMatch(currentMatches[0]);
        }
      } else {
        // في حال عدم وجود أي مباراة مباشرة حقيقية، نظهر المباراة التجريبية لضمان عمل الواجهة
        setLiveMatch(MOCK_LIVE_MATCH);
      }
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Island Update Failed:", error);
      setLiveMatch(MOCK_LIVE_MATCH);
    }
  }, [favoriteTeamIds]);

  useEffect(() => {
    fetchLiveStatus();
    // تحديث البيانات كل 45 ثانية لمواكبة الأحداث الحية بدقة
    const interval = setInterval(fetchLiveStatus, 45000);
    return () => clearInterval(interval);
  }, [fetchLiveStatus]);

  if (!liveMatch) return null;

  return (
    <div 
      className="fixed top-8 left-1/2 -translate-x-1/2 z-[9999] pointer-events-auto"
      data-nav-id="live-match-island"
    >
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        tabIndex={0}
        className={cn(
          "bg-black/95 backdrop-blur-3xl border border-white/20 rounded-full shadow-[0_30px_100px_rgba(0,0,0,1)] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] cursor-pointer overflow-hidden ring-4 ring-white/5 focusable outline-none",
          isExpanded ? "w-[540px] h-48 px-10" : "w-80 h-16 px-6"
        )}
      >
        <div className="h-full flex items-center justify-between">
          {!isExpanded ? (
            <div className="flex items-center justify-between w-full animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex items-center gap-4">
                <img src={liveMatch.homeLogo} alt="" className="w-9 h-9 object-contain drop-shadow-md" />
                <div className="bg-white/10 px-4 py-1.5 rounded-2xl border border-white/10 shadow-inner">
                  <span className="text-xl font-black text-primary tabular-nums">
                    {liveMatch.score?.home} - {liveMatch.score?.away}
                  </span>
                </div>
                <img src={liveMatch.awayLogo} alt="" className="w-9 h-9 object-contain drop-shadow-md" />
              </div>
              
              <div className="flex items-center gap-3 pr-2">
                <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse shadow-[0_0_12px_red]" />
                <span className="text-sm font-black text-accent tabular-nums">{liveMatch.minute}'</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full animate-in fade-in zoom-in-95 duration-700">
              <div className="flex flex-col items-center gap-3 w-32 group">
                <img src={liveMatch.homeLogo} alt="" className="w-20 h-20 object-contain transition-transform group-hover:scale-110" />
                <span className="text-[10px] font-black text-white/90 truncate w-full text-center uppercase tracking-tighter">{liveMatch.homeTeam}</span>
              </div>

              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-2 bg-red-600/20 px-4 py-1.5 rounded-full border border-red-600/30">
                  <Activity className="w-3 h-3 text-red-600 animate-pulse" />
                  <span className="text-[9px] font-black text-red-500 uppercase tracking-[0.2em]">SIGNAL LIVE</span>
                </div>
                
                <div className="flex items-center gap-8">
                  <span className="text-7xl font-black text-white drop-shadow-[0_0_40px_rgba(255,255,255,0.1)] tabular-nums">{liveMatch.score?.home}</span>
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-3xl font-black text-primary tracking-tighter animate-pulse">{liveMatch.minute}'</span>
                    <div className="h-1.5 w-20 bg-primary/20 rounded-full overflow-hidden">
                       <div className="h-full bg-primary w-2/3 animate-[shimmer_2s_infinite]" />
                    </div>
                  </div>
                  <span className="text-7xl font-black text-white drop-shadow-[0_0_40px_rgba(255,255,255,0.1)] tabular-nums">{liveMatch.score?.away}</span>
                </div>
                
                <div className="flex flex-col items-center gap-1">
                   <div className="text-[9px] font-bold text-white/40 uppercase tracking-[0.3em] flex items-center gap-2 text-center">
                    <Trophy className="w-4 h-4 text-accent" />
                    <span className="truncate max-w-[220px]">{liveMatch.league}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-3 w-32 group">
                <img src={liveMatch.awayLogo} alt="" className="w-20 h-20 object-contain transition-transform group-hover:scale-110" />
                <span className="text-[10px] font-black text-white/90 truncate w-full text-center uppercase tracking-tighter">{liveMatch.awayTeam}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
