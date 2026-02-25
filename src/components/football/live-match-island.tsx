
"use client";

import { useEffect, useState, useCallback } from "react";
import { Match } from "@/lib/football-data";
import { fetchFootballData } from "@/lib/football-api";
import { cn } from "@/lib/utils";
import { Timer, Trophy, Activity, Loader2 } from "lucide-react";

export function LiveMatchIsland() {
  const [liveMatch, setLiveMatch] = useState<Match | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchLiveStatus = useCallback(async () => {
    try {
      // جلب كافة المباريات المباشرة العالمية
      const currentMatches = await fetchFootballData('live');

      if (currentMatches && currentMatches.length > 0) {
        // عرض أول مباراة مباشرة متاحة (لا يشترط المفضلة)
        setLiveMatch(currentMatches[0]);
      } else {
        setLiveMatch(null);
      }
    } catch (error) {
      console.error("Island Sync Error:", error);
      setLiveMatch(null);
    }
  }, []);

  useEffect(() => {
    fetchLiveStatus();
    // تحديث كل 60 ثانية لضمان الدقة وتوفير الكوتا
    const interval = setInterval(fetchLiveStatus, 60000);
    return () => clearInterval(interval);
  }, [fetchLiveStatus]);

  if (!liveMatch) return null;

  return (
    <div 
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[2500] pointer-events-auto"
      data-nav-id="live-match-island"
    >
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setIsExpanded(!isExpanded)}
        className={cn(
          "bg-black/90 backdrop-blur-3xl border border-white/20 rounded-full shadow-[0_20px_80px_rgba(0,0,0,1)] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] cursor-pointer overflow-hidden ring-1 ring-white/10 focusable outline-none",
          isExpanded ? "w-[500px] h-40 px-10" : "w-72 h-14 px-4"
        )}
      >
        <div className="h-full flex items-center justify-between">
          {!isExpanded ? (
            <div className="flex items-center justify-between w-full animate-in fade-in slide-in-from-top-2 duration-500">
              <div className="flex items-center gap-3">
                <div className="relative w-8 h-8 flex items-center justify-center">
                  <img src={liveMatch.homeLogo} alt="" className="w-full h-full object-contain" />
                </div>
                <div className="bg-white/10 px-3 py-1 rounded-lg border border-white/5">
                  <span className="text-sm font-black text-primary tabular-nums tracking-tighter">
                    {liveMatch.score?.home} - {liveMatch.score?.away}
                  </span>
                </div>
                <div className="relative w-8 h-8 flex items-center justify-center">
                  <img src={liveMatch.awayLogo} alt="" className="w-full h-full object-contain" />
                </div>
              </div>
              
              <div className="flex items-center gap-2 pr-2">
                <Timer className="w-4 h-4 text-accent animate-pulse" />
                <span className="text-[11px] font-black text-accent tabular-nums tracking-tighter">{liveMatch.minute}'</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full animate-in fade-in zoom-in-95 duration-700">
              <div className="flex flex-col items-center gap-2 w-24 group">
                <div className="relative w-16 h-16 transition-transform group-hover:scale-110 duration-500">
                  <img src={liveMatch.homeLogo} alt="" className="w-full h-full object-contain" />
                </div>
                <span className="text-[9px] font-black text-white/80 truncate w-full text-center uppercase tracking-tighter">{liveMatch.homeTeam}</span>
              </div>

              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 bg-red-600/20 px-3 py-1 rounded-full border border-red-600/30">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                  <span className="text-[8px] font-black text-red-500 uppercase tracking-widest">LIVE SCOREBOARD</span>
                </div>
                
                <div className="flex items-center gap-8">
                  <span className="text-6xl font-black text-white drop-shadow-[0_10px_30px_rgba(255,255,255,0.2)] tabular-nums">{liveMatch.score?.home}</span>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-2xl font-black text-primary tracking-tighter animate-pulse">{liveMatch.minute}'</span>
                    <div className="h-1 w-12 bg-primary/20 rounded-full" />
                  </div>
                  <span className="text-6xl font-black text-white drop-shadow-[0_10px_30px_rgba(255,255,255,0.2)] tabular-nums">{liveMatch.score?.away}</span>
                </div>
                
                <div className="text-[9px] font-bold text-white/30 uppercase tracking-[0.4em] flex items-center gap-2">
                  <Trophy className="w-3 h-3 text-accent" />
                  {liveMatch.league}
                </div>
              </div>

              <div className="flex flex-col items-center gap-2 w-24 group">
                <div className="relative w-16 h-16 transition-transform group-hover:scale-110 duration-500">
                  <img src={liveMatch.awayLogo} alt="" className="w-full h-full object-contain" />
                </div>
                <span className="text-[9px] font-black text-white/80 truncate w-full text-center uppercase tracking-tighter">{liveMatch.awayTeam}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
