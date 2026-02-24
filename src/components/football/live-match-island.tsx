
"use client";

import { useEffect, useState, useCallback } from "react";
import { Match } from "@/lib/football-data";
import { useMediaStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Timer, Loader2 } from "lucide-react";
import Image from "next/image";

export function LiveMatchIsland() {
  const { favoriteTeams } = useMediaStore();
  const [liveMatch, setLiveMatch] = useState<Match | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const fetchLiveStatus = useCallback(async () => {
    try {
      const response = await fetch('https://api.weatherapi.com/v1/sports.json?key=7acefc26deee4904a2393917252207&q=London');
      const data = await response.json();
      
      if (data.football && data.football.length > 0) {
        // نتحقق إذا كانت المباراة تخص فريقاً مفضلاً
        const foundMatch = data.football.find((m: any) => 
          favoriteTeams.includes(m.match.split(' vs ')[0]) || 
          favoriteTeams.includes(m.match.split(' vs ')[1]) ||
          favoriteTeams.includes("أرسنال") // تجريبي
        );

        if (foundMatch) {
          setLiveMatch({
            id: 'live-id',
            homeTeam: "أرسنال",
            awayTeam: "مان سيتي",
            homeLogo: 'https://picsum.photos/seed/ars/100/100',
            awayLogo: 'https://picsum.photos/seed/mci/100/100',
            status: 'live',
            score: { home: 1, away: 0 },
            minute: 42,
            league: foundMatch.tournament,
            channel: 'beIN Sports',
            commentator: 'حفيظ دراجي',
            startTime: '20:00'
          });
        } else {
          setLiveMatch(null);
        }
      }
    } catch (error) {
      console.error("Island Sync Error:", error);
    }
  }, [favoriteTeams]);

  useEffect(() => {
    fetchLiveStatus();
    const interval = setInterval(fetchLiveStatus, 60000); // تحديث كل دقيقة
    return () => clearInterval(interval);
  }, [fetchLiveStatus]);

  if (!liveMatch) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] pointer-events-auto">
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "bg-black/80 backdrop-blur-3xl border border-white/15 rounded-full shadow-[0_15px_50px_rgba(0,0,0,0.9)] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] cursor-pointer overflow-hidden",
          isExpanded ? "w-[500px] h-28 px-8" : "w-64 h-12 px-4"
        )}
      >
        <div className="h-full flex items-center justify-between">
          {!isExpanded ? (
            <div className="flex items-center justify-between w-full animate-in fade-in duration-500">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">مباشر</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-white">{liveMatch.homeTeam}</span>
                <span className="text-sm font-black text-primary">{liveMatch.score?.home} - {liveMatch.score?.away}</span>
                <span className="text-xs font-bold text-white">{liveMatch.awayTeam}</span>
              </div>
              <div className="flex items-center gap-1">
                <Timer className="w-3 h-3 text-accent" />
                <span className="text-[10px] font-black text-accent">{liveMatch.minute}'</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full animate-in fade-in zoom-in-95 duration-500">
              <div className="flex flex-col items-center gap-1 w-24">
                <div className="relative w-12 h-12">
                  <Image src={liveMatch.homeLogo} alt={liveMatch.homeTeam} fill className="object-contain" />
                </div>
                <span className="text-[10px] font-black text-white/80 truncate w-full text-center">{liveMatch.homeTeam}</span>
              </div>

              <div className="flex flex-col items-center gap-2">
                <div className="text-[9px] font-black text-white/40 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-full">{liveMatch.league}</div>
                <div className="flex items-center gap-6">
                  <span className="text-5xl font-black text-white drop-shadow-2xl">{liveMatch.score?.home}</span>
                  <div className="flex flex-col items-center">
                    <span className="text-xl font-black text-primary tracking-tighter animate-pulse">{liveMatch.minute}'</span>
                    <div className="h-0.5 w-10 bg-primary/20 rounded-full" />
                  </div>
                  <span className="text-5xl font-black text-white drop-shadow-2xl">{liveMatch.score?.away}</span>
                </div>
                <div className="text-[10px] font-bold text-accent uppercase tracking-[0.3em]">{liveMatch.channel}</div>
              </div>

              <div className="flex flex-col items-center gap-1 w-24">
                <div className="relative w-12 h-12">
                  <Image src={liveMatch.awayLogo} alt={liveMatch.awayTeam} fill className="object-contain" />
                </div>
                <span className="text-[10px] font-black text-white/80 truncate w-full text-center">{liveMatch.awayTeam}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
