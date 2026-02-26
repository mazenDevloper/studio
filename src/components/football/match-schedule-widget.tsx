
"use client";

import { useEffect, useState, useCallback } from "react";
import { Match } from "@/lib/football-data";
import { useMediaStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Tv, Mic2, Star, RefreshCw, Loader2, AlertCircle, Bell, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { fetchFootballData } from "@/lib/football-api";

export function MatchScheduleWidget() {
  const { favoriteTeams, toggleFavoriteTeam, belledMatchIds, toggleBelledMatch } = useMediaStore();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const isFavTeam = (id: number) => favoriteTeams.some(t => t.id === id);
  const isBelled = (id: string) => belledMatchIds.includes(id);

  const loadMatches = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await fetchFootballData('today');
      const sorted = [...data].sort((a, b) => {
        const aBelled = isBelled(a.id);
        const bBelled = isBelled(b.id);
        if (aBelled && !bBelled) return -1;
        if (!aBelled && bBelled) return 1;

        const aFav = isFavTeam(a.homeTeamId!) || isFavTeam(a.awayTeamId!);
        const bFav = isFavTeam(b.homeTeamId!) || isFavTeam(b.awayTeamId!);
        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;
        return 0;
      });
      setMatches(sorted);
      if (data.length === 0) setError(true);
    } catch (error) {
      console.error("Failed to load dashboard matches", error);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [favoriteTeams, belledMatchIds]);

  useEffect(() => {
    loadMatches();
    const interval = setInterval(loadMatches, 300000); 
    return () => clearInterval(interval);
  }, [loadMatches]);

  return (
    <Card className="border-none bg-zinc-900/50 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col">
      <CardHeader className="p-8 flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl font-bold font-headline text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
            <Trophy className="h-6 w-6 text-white" />
          </div>
          جدول مباريات اليوم
          <span className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-bold ml-2">Live Center</span>
        </CardTitle>
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={loadMatches} 
          disabled={loading}
          className="rounded-full hover:bg-white/10 w-12 h-12 focusable"
        >
          <RefreshCw className={cn("w-5 h-5 text-white/60", loading && "animate-spin")} />
        </Button>
      </CardHeader>

      <CardContent className="p-8 pt-0 min-h-[180px] flex items-center">
        {loading ? (
          <div className="flex w-full justify-center py-12">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        ) : error && matches.length === 0 ? (
          <div className="w-full py-12 flex flex-col items-center justify-center gap-4 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10">
            <AlertCircle className="w-10 h-10 text-red-500/50" />
            <p className="text-white/40 italic text-sm font-bold uppercase tracking-widest text-center px-6">فشل الاتصال بنظام البيانات</p>
            <Button variant="outline" size="sm" onClick={loadMatches} className="rounded-full border-white/10 focusable">
              إعادة المحاولة
            </Button>
          </div>
        ) : (
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex w-max gap-6 pb-6">
              {matches.length === 0 ? (
                <div className="w-[300px] py-12 text-center text-white/20 italic text-xs font-bold uppercase tracking-widest">لا توجد مباريات مجدولة حالياً</div>
              ) : (
                matches.map((match) => {
                  const hasFav = isFavTeam(match.homeTeamId!) || isFavTeam(match.awayTeamId!);
                  const isBelledMatch = isBelled(match.id);
                  
                  return (
                    <div 
                      key={match.id} 
                      className={cn(
                        "w-80 p-6 rounded-[2.2rem] flex flex-col gap-4 relative transition-all duration-500 hover:scale-[1.02] border backdrop-blur-md focusable",
                        isBelledMatch ? "bg-accent/10 border-accent/40 shadow-[0_0_20px_rgba(var(--accent),0.2)]" : hasFav ? "bg-primary/15 border-primary/30 shadow-glow" : "bg-white/5 border-white/10"
                      )}
                    >
                      <div className="absolute top-4 left-4 z-20">
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleBelledMatch(match.id); }}
                          className={cn(
                            "w-8 h-8 rounded-full border border-white/10 backdrop-blur-3xl flex items-center justify-center transition-all active:scale-90",
                            isBelledMatch ? "bg-accent text-black" : "bg-black/40 text-white/20 hover:text-white"
                          )}
                        >
                          {isBelledMatch ? <BellRing className="w-4 h-4 animate-pulse" /> : <Bell className="w-4 h-4" />}
                        </button>
                      </div>

                      {hasFav && !isBelledMatch && (
                        <div className="absolute top-4 right-4 bg-yellow-500/20 p-1.5 rounded-full shadow-lg border border-yellow-500/30">
                          <Star className="w-3.5 h-3.5 text-yellow-500 fill-current" />
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-white/40 uppercase tracking-widest truncate max-w-[150px]">{match.league}</span>
                        <div className={cn(
                          "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter shadow-md",
                          match.status === 'live' ? "bg-red-600 text-white animate-pulse" : "bg-white/10 text-white/60 border border-white/5"
                        )}>
                          {match.status === 'live' ? 'مباشر' : match.status === 'upcoming' ? match.startTime : 'FT'}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 py-2 relative">
                        <div className="flex flex-col items-center gap-2 flex-1 min-w-0 group/team relative">
                          <div className="relative w-14 h-14 drop-shadow-2xl">
                            <Image src={match.homeLogo} alt={match.homeTeam} fill className="object-contain" />
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                toggleFavoriteTeam({ id: match.homeTeamId!, name: match.homeTeam, logo: match.homeLogo }); 
                              }}
                              className={cn(
                                "absolute -top-1 -right-1 w-7 h-7 rounded-full border border-white/10 backdrop-blur-3xl flex items-center justify-center transition-all active:scale-90",
                                isFavTeam(match.homeTeamId!) ? "bg-yellow-500 text-black shadow-glow" : "bg-black/60 text-white/20 hover:text-white"
                              )}
                            >
                              <Star className={cn("w-3.5 h-3.5", isFavTeam(match.homeTeamId!) && "fill-current")} />
                            </button>
                          </div>
                          <span className={cn("text-[10px] font-black truncate w-full text-center uppercase tracking-tighter", isFavTeam(match.homeTeamId!) ? "text-primary" : "text-white")}>{match.homeTeam}</span>
                        </div>

                        <div className="flex flex-col items-center justify-center min-w-[60px]">
                          <div className="text-2xl font-black text-white tracking-tighter drop-shadow-lg">
                            {match.status === 'upcoming' ? 'VS' : `${match.score?.home}-${match.score?.away}`}
                          </div>
                          {match.status === 'live' && (
                            <span className="text-[10px] font-black text-primary animate-pulse">{match.minute}'</span>
                          )}
                        </div>

                        <div className="flex flex-col items-center gap-2 flex-1 min-w-0 group/team relative">
                          <div className="relative w-14 h-14 drop-shadow-2xl">
                            <Image src={match.awayLogo} alt={match.awayTeam} fill className="object-contain" />
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                toggleFavoriteTeam({ id: match.awayTeamId!, name: match.awayTeam, logo: match.awayLogo }); 
                              }}
                              className={cn(
                                "absolute -top-1 -left-1 w-7 h-7 rounded-full border border-white/10 backdrop-blur-3xl flex items-center justify-center transition-all active:scale-90",
                                isFavTeam(match.awayTeamId!) ? "bg-yellow-500 text-black shadow-glow" : "bg-black/60 text-white/20 hover:text-white"
                              )}
                            >
                              <Star className={cn("w-3.5 h-3.5", isFavTeam(match.awayTeamId!) && "fill-current")} />
                            </button>
                          </div>
                          <span className={cn("text-[10px] font-black truncate w-full text-center uppercase tracking-tighter", isFavTeam(match.awayTeamId!) ? "text-primary" : "text-white")}>{match.awayTeam}</span>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-white/5 flex items-center justify-between dir-rtl">
                        <div className="flex items-center gap-2 bg-black/20 px-3 py-1 rounded-full border border-white/5">
                          <Tv className="w-3.5 h-3.5 text-primary" />
                          <span className="text-[9px] font-bold text-white/60 uppercase tracking-tighter">{match.channel || "SSC HD"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mic2 className="w-3.5 h-3.5 text-accent" />
                          <span className="text-[9px] font-bold text-white/40 truncate max-w-[80px]">{match.commentator || "فهد العتيبي"}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <ScrollBar orientation="horizontal" className="bg-white/5 h-2" />
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
