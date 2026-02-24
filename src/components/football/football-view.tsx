
"use client";

import { useEffect, useState, useCallback } from "react";
import { Match } from "@/lib/football-data";
import { fetchFootballData } from "@/lib/football-api";
import { useMediaStore } from "@/lib/store";
import { Trophy, Tv, Mic2, Star, Calendar, RefreshCw, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { cn } from "@/lib/utils";

export function FootballView() {
  const { favoriteTeams, toggleFavoriteTeam } = useMediaStore();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchFootballData('today');
      // فرز المباريات: المفضلة أولاً
      const sortedData = data.sort((a, b) => {
        const aFav = favoriteTeams.includes(a.homeTeam) || favoriteTeams.includes(a.awayTeam);
        const bFav = favoriteTeams.includes(b.homeTeam) || favoriteTeams.includes(b.awayTeam);
        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;
        return 0;
      });
      setMatches(sortedData);
    } catch (error) {
      console.error("Football API Integration Error:", error);
    } finally {
      setLoading(false);
    }
  }, [favoriteTeams]);

  useEffect(() => {
    fetchMatches();
    const interval = setInterval(fetchMatches, 120000); // تحديث كل دقيقتين
    return () => clearInterval(interval);
  }, [fetchMatches]);

  const liveMatches = matches.filter(m => m.status === 'live');
  const upcomingMatches = matches.filter(m => m.status === 'upcoming');
  const finishedMatches = matches.filter(m => m.status === 'finished');

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto pb-32">
      <header className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-4xl font-headline font-bold text-white tracking-tighter">مركز المباريات المباشر</h1>
          <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest opacity-60 flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
             بيانات حية من API-Sports (Real-time)
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={fetchMatches} 
          disabled={loading}
          className="rounded-full bg-white/5 border-white/10 text-white h-12 px-6 hover:bg-white/10"
        >
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          تحديث النتائج
        </Button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {liveMatches.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold font-headline text-red-500 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                مباريات مباشرة الآن
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {liveMatches.map(match => (
                  <MatchCard 
                    key={match.id} 
                    match={match} 
                    isFavorite={favoriteTeams.includes(match.homeTeam) || favoriteTeams.includes(match.awayTeam)} 
                  />
                ))}
              </div>
            </section>
          )}

          <section className="space-y-4">
            <h2 className="text-xl font-bold font-headline text-white flex items-center gap-3">
              <Calendar className="w-5 h-5 text-primary" />
              جدول مباريات اليوم
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingMatches.length > 0 ? upcomingMatches.map(match => (
                <MatchCard 
                  key={match.id} 
                  match={match} 
                  isFavorite={favoriteTeams.includes(match.homeTeam) || favoriteTeams.includes(match.awayTeam)} 
                />
              )) : (
                <div className="col-span-2 py-12 text-center bg-white/5 rounded-[2.5rem] border border-dashed border-white/10">
                  <p className="text-white/20 font-bold uppercase tracking-widest text-xs">لا توجد مباريات قادمة اليوم</p>
                </div>
              )}
            </div>
          </section>

          {finishedMatches.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-bold font-headline text-white/40 flex items-center gap-3">
                <Trophy className="w-5 h-5" />
                انتهت اليوم
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-60">
                {finishedMatches.map(match => (
                  <MatchCard 
                    key={match.id} 
                    match={match} 
                    isFavorite={favoriteTeams.includes(match.homeTeam) || favoriteTeams.includes(match.awayTeam)} 
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="glass-panel rounded-[2.5rem] p-8 border-white/10 bg-black/40">
            <h3 className="text-lg font-bold font-headline text-white mb-6 flex items-center justify-between">
              تخصيص الفرق المفضلة
              <Star className="w-4 h-4 text-accent fill-current" />
            </h3>
            <div className="flex flex-wrap gap-2">
              {['الهلال', 'النصر', 'الاتحاد', 'الأهلي', 'ريال مدريد', 'برشلونة', 'مانشستر سيتي', 'ليفربول', 'بايرن ميونخ', 'أرسنال'].map(team => {
                const isFav = favoriteTeams.includes(team);
                return (
                  <Button
                    key={team}
                    onClick={() => toggleFavoriteTeam(team)}
                    variant={isFav ? "default" : "outline"}
                    className={cn(
                      "rounded-xl text-[10px] font-bold h-10 px-4 transition-all duration-300",
                      isFav ? "bg-primary border-primary shadow-glow scale-105" : "border-white/10 bg-white/5 hover:border-white/30"
                    )}
                  >
                    {isFav && <Check className="w-3 h-3 mr-1" />}
                    {team}
                  </Button>
                );
              })}
            </div>
            <div className="mt-8 p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3">
              <h4 className="text-[10px] font-black text-accent uppercase tracking-widest">تنبيهات الجزيرة العائمة</h4>
              <p className="text-[11px] text-white/40 leading-relaxed">
                ستظهر نتائج مباريات فرقك المفضلة تلقائياً في أعلى الشاشة بمجرد انطلاق الصافرة.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MatchCard({ match, isFavorite }: { match: Match; isFavorite: boolean }) {
  const activeBroadcast = match.broadcasts.find(b => b.country === 'Saudi Arabia' || b.country === 'MENA') || match.broadcasts[0];

  return (
    <div className={cn(
      "p-6 rounded-[2.5rem] border transition-all duration-500 hover:scale-[1.02] flex flex-col gap-4 relative overflow-hidden group",
      isFavorite ? "bg-primary/10 border-primary/30 ring-1 ring-primary/20 shadow-2xl" : "bg-white/5 border-white/10 hover:border-white/20"
    )}>
      <div className="flex items-center justify-between text-[9px] font-black text-white/40 uppercase tracking-widest relative z-10">
        <span className="truncate max-w-[150px] bg-white/5 px-2 py-0.5 rounded-full border border-white/5">{match.league}</span>
        <span className={cn(
          "px-3 py-1 rounded-full border font-black",
          match.status === 'live' ? "bg-red-500/10 text-red-500 border-red-500/20 animate-pulse" : "bg-white/5 text-white/40 border-white/10"
        )}>
          {match.status === 'live' ? 'مباشر' : match.status === 'upcoming' ? match.startTime : 'انتهت'}
        </span>
      </div>

      <div className="flex items-center justify-around gap-2 py-4 relative z-10">
        <div className="flex flex-col items-center gap-3 w-24">
          <div className="relative w-14 h-14 drop-shadow-2xl transition-transform group-hover:scale-110">
            <Image src={match.homeLogo} alt={match.homeTeam} fill className="object-contain" />
          </div>
          <span className="text-[11px] font-black text-white text-center truncate w-full">{match.homeTeam}</span>
        </div>

        <div className="flex flex-col items-center min-w-[100px]">
          <span className="text-4xl font-black text-white tracking-tighter drop-shadow-2xl">
            {match.status === 'upcoming' ? 'VS' : `${match.score?.home} - ${match.score?.away}`}
          </span>
          {match.status === 'live' && (
            <div className="flex items-center gap-1.5 mt-1 bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
              <span className="text-[10px] font-black text-primary animate-pulse">{match.minute}'</span>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-3 w-24">
          <div className="relative w-14 h-14 drop-shadow-2xl transition-transform group-hover:scale-110">
            <Image src={match.awayLogo} alt={match.awayTeam} fill className="object-contain" />
          </div>
          <span className="text-[11px] font-black text-white text-center truncate w-full">{match.awayTeam}</span>
        </div>
      </div>

      <div className="pt-4 border-t border-white/5 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2 bg-black/20 px-3 py-1 rounded-full border border-white/5">
          <Tv className="w-3.5 h-3.5 text-accent" />
          <span className="text-[10px] font-black text-white/70 uppercase tracking-tighter">
            {activeBroadcast?.channel || match.channel}
          </span>
        </div>
        <div className="flex items-center gap-2 opacity-40">
          <Mic2 className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold">{match.commentator}</span>
        </div>
      </div>
    </div>
  );
}
