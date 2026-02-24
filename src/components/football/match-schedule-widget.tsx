"use client";

import { useEffect, useState, useCallback } from "react";
import { AVAILABLE_TEAMS, Match } from "@/lib/football-data";
import { useMediaStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Tv, Mic2, Star, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { fetchFootballData } from "@/lib/football-api";

export function MatchScheduleWidget() {
  const { favoriteTeams, toggleFavoriteTeam } = useMediaStore();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadMatches = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await fetchFootballData('today');
      if (data.length === 0 && !loading) {
        // Might be a fetch failure or actually no matches
      }
      // ترتيب المباريات بحيث تظهر فرق المستخدم المفضلة أولاً
      const sorted = [...data].sort((a, b) => {
        const aFav = favoriteTeams.includes(a.homeTeam) || favoriteTeams.includes(a.awayTeam);
        const bFav = favoriteTeams.includes(b.homeTeam) || favoriteTeams.includes(b.awayTeam);
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
  }, [favoriteTeams, loading]);

  useEffect(() => {
    loadMatches();
    const interval = setInterval(loadMatches, 300000); // تحديث كل 5 دقائق
    return () => clearInterval(interval);
  }, [loadMatches]);

  return (
    <Card className="border-none bg-zinc-900/50 rounded-[2.5rem] ios-shadow overflow-hidden flex flex-col">
      <CardHeader className="p-8 flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl font-bold font-headline text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center ios-shadow">
            <Trophy className="h-6 w-6 text-white" />
          </div>
          جدول مباريات اليوم
        </CardTitle>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={loadMatches} 
            disabled={loading}
            className="rounded-full hover:bg-white/10 w-10 h-10"
          >
            <RefreshCw className={cn("w-4 h-4 text-white/60", loading && "animate-spin")} />
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" className="rounded-full bg-white/5 border border-white/5 text-[10px] font-bold uppercase tracking-widest px-4">
                إدارة الفرق المفضلة
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-white/10 rounded-[2.5rem] max-w-md">
              <DialogHeader>
                <DialogTitle className="text-white font-headline">اختر فرقك المفضلة</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 p-4">
                {AVAILABLE_TEAMS.map(team => (
                  <Button
                    key={team}
                    onClick={() => toggleFavoriteTeam(team)}
                    variant={favoriteTeams.includes(team) ? "default" : "outline"}
                    className={cn(
                      "rounded-xl font-bold text-xs h-12 transition-all",
                      favoriteTeams.includes(team) ? "bg-primary" : "border-white/10 text-white/60"
                    )}
                  >
                    {team}
                  </Button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="p-8 pt-0 min-h-[150px] flex items-center">
        {loading ? (
          <div className="flex w-full justify-center py-12">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        ) : error && matches.length === 0 ? (
          <div className="w-full py-12 flex flex-col items-center justify-center gap-4 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10">
            <AlertCircle className="w-10 h-10 text-red-500/50" />
            <p className="text-white/40 italic text-sm">يفشل في جلب البيانات حالياً. يرجى التحقق من الاتصال.</p>
            <Button variant="outline" size="sm" onClick={loadMatches} className="rounded-full border-white/10">
              إعادة المحاولة
            </Button>
          </div>
        ) : (
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex w-max gap-6 pb-4">
              {matches.length === 0 ? (
                <div className="w-[300px] py-12 text-center text-white/20 italic text-sm">لا توجد مباريات كبرى مجدولة حالياً</div>
              ) : (
                matches.map((match) => {
                  const isFavorite = favoriteTeams.includes(match.homeTeam) || favoriteTeams.includes(match.awayTeam);
                  
                  return (
                    <div 
                      key={match.id} 
                      className={cn(
                        "w-80 p-6 rounded-[2.2rem] flex flex-col gap-4 relative transition-all hover:scale-[1.02] border backdrop-blur-md",
                        isFavorite ? "bg-primary/15 border-primary/30" : "bg-white/5 border-white/10"
                      )}
                    >
                      {isFavorite && (
                        <div className="absolute top-4 right-4 bg-primary/20 p-1 rounded-full">
                          <Star className="w-3.5 h-3.5 text-primary fill-current" />
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-white/40 uppercase tracking-widest truncate max-w-[150px]">{match.league}</span>
                        <div className={cn(
                          "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter",
                          match.status === 'live' ? "bg-red-500/20 text-red-500 animate-pulse border border-red-500/20" : "bg-white/10 text-white/60 border border-white/5"
                        )}>
                          {match.status === 'live' ? 'مباشر' : match.status === 'upcoming' ? match.startTime : 'انتهت'}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 py-2">
                        <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                          <div className="relative w-12 h-12 drop-shadow-lg">
                            <Image src={match.homeLogo} alt={match.homeTeam} fill className="object-contain" />
                          </div>
                          <span className="text-[11px] font-bold text-white truncate w-full text-center">{match.homeTeam}</span>
                        </div>

                        <div className="flex flex-col items-center">
                          <div className="text-2xl font-black text-white tracking-tighter">
                            {match.status === 'upcoming' ? 'VS' : `${match.score?.home} - ${match.score?.away}`}
                          </div>
                          {match.status === 'live' && (
                            <span className="text-[10px] font-black text-primary animate-pulse">{match.minute}'</span>
                          )}
                        </div>

                        <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                          <div className="relative w-12 h-12 drop-shadow-lg">
                            <Image src={match.awayLogo} alt={match.awayTeam} fill className="object-contain" />
                          </div>
                          <span className="text-[11px] font-bold text-white truncate w-full text-center">{match.awayTeam}</span>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2 bg-black/20 px-3 py-1 rounded-full border border-white/5">
                          <Tv className="w-3.5 h-3.5 text-accent" />
                          <span className="text-[9px] font-bold text-white/60 uppercase tracking-tighter">{match.channel || "SSC / beIN"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mic2 className="w-3.5 h-3.5 text-white/40" />
                          <span className="text-[9px] font-bold text-white/40 truncate max-w-[80px]">{match.commentator || "يحدد لاحقاً"}</span>
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
