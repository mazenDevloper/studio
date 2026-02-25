"use client";

import { useEffect, useState, useCallback } from "react";
import { Match } from "@/lib/football-data";
import { fetchFootballData } from "@/lib/football-api";
import { useMediaStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Timer, Trophy, Activity, Loader2, Sparkles } from "lucide-react";

// مباراة افتراضية للتجربة في حال عدم وجود بث مباشر حقيقي أو فشل الـ API
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
  league: "دوري روشن السعودي - مباراة تجريبية",
  channel: "SSC 1 HD",
  commentator: "فهد العتيبي",
  broadcasts: []
};

export function LiveMatchIsland() {
  const { favoriteTeamIds, favoriteTeams } = useMediaStore();
  const [liveMatch, setLiveMatch] = useState<Match | null>(MOCK_LIVE_MATCH);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchLiveStatus = useCallback(async () => {
    try {
      setLoading(true);
      const currentMatches = await fetchFootballData('live');
      
      if (currentMatches && currentMatches.length > 0) {
        // الخطوة 1: البحث عن مباراة لفريق مفضل أولاً (حسب المعرف أو الاسم)
        const favMatch = currentMatches.find(m => 
          (m.homeTeamId && favoriteTeamIds.includes(m.homeTeamId)) ||
          (m.awayTeamId && favoriteTeamIds.includes(m.awayTeamId)) ||
          favoriteTeams.includes(m.homeTeam) ||
          favoriteTeams.includes(m.awayTeam)
        );

        if (favMatch) {
          setLiveMatch(favMatch);
        } else {
          // الخطوة 2: إذا لم يوجد فريق مفضل، خذ أول مباراة مباشرة متاحة في القائمة
          setLiveMatch(currentMatches[0]);
        }
      } else {
        // إذا لم توجد أي مباريات مباشرة حالياً، نبقي على المباراة التجريبية لضمان عمل الواجهة
        setLiveMatch(MOCK_LIVE_MATCH);
      }
    } catch (error) {
      console.error("Island Sync Error:", error);
      // في حالة حدوث خطأ في الشبكة، نعرض المباراة التجريبية كخيار أمان
      setLiveMatch(MOCK_LIVE_MATCH);
    } finally {
      setLoading(false);
    }
  }, [favoriteTeams, favoriteTeamIds]);

  useEffect(() => {
    fetchLiveStatus();
    // تحديث البيانات كل 60 ثانية
    const interval = setInterval(fetchLiveStatus, 60000);
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
          "bg-black/90 backdrop-blur-3xl border border-white/20 rounded-full shadow-[0_20px_80px_rgba(0,0,0,1)] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] cursor-pointer overflow-hidden ring-4 ring-white/5 focusable outline-none",
          isExpanded ? "w-[520px] h-48 px-10" : "w-80 h-16 px-6"
        )}
      >
        <div className="h-full flex items-center justify-between">
          {!isExpanded ? (
            <div className="flex items-center justify-between w-full animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex items-center gap-4">
                <div className="relative w-10 h-10 flex items-center justify-center">
                  <img src={liveMatch.homeLogo} alt="" className="w-full h-full object-contain drop-shadow-lg" />
                </div>
                <div className="bg-white/10 px-4 py-1.5 rounded-2xl border border-white/10 shadow-inner">
                  <span className="text-lg font-black text-primary tabular-nums tracking-tighter">
                    {liveMatch.score?.home} - {liveMatch.score?.away}
                  </span>
                </div>
                <div className="relative w-10 h-10 flex items-center justify-center">
                  <img src={liveMatch.awayLogo} alt="" className="w-full h-full object-contain drop-shadow-lg" />
                </div>
              </div>
              
              <div className="flex items-center gap-3 pr-2">
                <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse shadow-[0_0_10px_red]" />
                <span className="text-sm font-black text-accent tabular-nums tracking-tighter">{liveMatch.minute}'</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full animate-in fade-in zoom-in-95 duration-700">
              <div className="flex flex-col items-center gap-3 w-28 group">
                <div className="relative w-20 h-20 transition-transform group-hover:scale-110 duration-500">
                  <img src={liveMatch.homeLogo} alt="" className="w-full h-full object-contain" />
                </div>
                <span className="text-[10px] font-black text-white/90 truncate w-full text-center uppercase tracking-tighter">{liveMatch.homeTeam}</span>
              </div>

              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-2 bg-red-600/20 px-4 py-1.5 rounded-full border border-red-600/30">
                  <Activity className="w-3 h-3 text-red-600 animate-pulse" />
                  <span className="text-[9px] font-black text-red-500 uppercase tracking-[0.2em]">LIVE SIGNAL</span>
                </div>
                
                <div className="flex items-center gap-10">
                  <span className="text-7xl font-black text-white drop-shadow-[0_10px_40px_rgba(255,255,255,0.2)] tabular-nums">{liveMatch.score?.home}</span>
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-3xl font-black text-primary tracking-tighter animate-pulse">{liveMatch.minute}'</span>
                    <div className="h-1.5 w-16 bg-primary/20 rounded-full overflow-hidden">
                       <div className="h-full bg-primary w-2/3 animate-[shimmer_2s_infinite]" />
                    </div>
                  </div>
                  <span className="text-7xl font-black text-white drop-shadow-[0_10px_40px_rgba(255,255,255,0.2)] tabular-nums">{liveMatch.score?.away}</span>
                </div>
                
                <div className="flex flex-col items-center gap-1">
                   <div className="text-[9px] font-bold text-white/40 uppercase tracking-[0.4em] flex items-center gap-2 text-center">
                    <Trophy className="w-4 h-4 text-accent" />
                    <span className="truncate max-w-[200px]">{liveMatch.league}</span>
                  </div>
                  {liveMatch.id === "mock-1" && (
                    <span className="text-[8px] text-primary/60 font-black uppercase tracking-widest animate-pulse">محاكاة النظام التجريبية</span>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-center gap-3 w-28 group">
                <div className="relative w-20 h-20 transition-transform group-hover:scale-110 duration-500">
                  <img src={liveMatch.awayLogo} alt="" className="w-full h-full object-contain" />
                </div>
                <span className="text-[10px] font-black text-white/90 truncate w-full text-center uppercase tracking-tighter">{liveMatch.awayTeam}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
