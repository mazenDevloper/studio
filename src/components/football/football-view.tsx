
"use client";

import { useEffect, useState, useCallback } from "react";
import { Match } from "@/lib/football-data";
import { getFootballIntelligence } from "@/ai/flows/football-intelligence-flow";
import { useMediaStore } from "@/lib/store";
import { Trophy, Tv, Mic2, Star, Calendar, RefreshCw, Loader2, Check, Sparkles, AlertCircle, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export function FootballView() {
  const { favoriteTeams, toggleFavoriteTeam } = useMediaStore();
  const [matches, setMatches] = useState<Match[]>([]);
  const [summary, setSummary] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getFootballIntelligence({ type: 'today' });
      
      if (response.error) {
        setError(response.error);
      } else if (response.matches) {
        const sortedData = response.matches.sort((a, b) => {
          const aFav = favoriteTeams.includes(a.homeTeam) || favoriteTeams.includes(a.awayTeam);
          const bFav = favoriteTeams.includes(b.homeTeam) || favoriteTeams.includes(b.awayTeam);
          if (aFav && !bFav) return -1;
          if (!aFav && bFav) return 1;
          return 0;
        });
        setMatches(sortedData as any);
        if (response.summary) setSummary(response.summary);
      }
    } catch (err) {
      console.error("UI Fetch Error:", err);
      setError("FAILED_TO_LOAD");
    } finally {
      setLoading(false);
    }
  }, [favoriteTeams]);

  useEffect(() => {
    fetchMatches();
    const interval = setInterval(fetchMatches, 300000);
    return () => clearInterval(interval);
  }, [fetchMatches]);

  const liveMatches = matches.filter(m => m.status === 'live');
  const upcomingMatches = matches.filter(m => m.status === 'upcoming');
  const finishedMatches = matches.filter(m => m.status === 'finished');

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto pb-32">
      <header className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-4xl font-headline font-bold text-white tracking-tighter flex items-center gap-3">
            مركز المباريات الذكي
            <Sparkles className="w-6 h-6 text-accent animate-pulse" />
          </h1>
          <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest opacity-60 flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
             تغطية حية مدعومة بالذكاء الاصطناعي
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={fetchMatches} 
          disabled={loading}
          className="rounded-full bg-white/5 border-white/10 text-white h-12 px-6 hover:bg-white/10"
        >
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          تحديث البيانات
        </Button>
      </header>

      {error ? (
        <div className="p-12 text-center bg-zinc-900/50 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] flex flex-col items-center gap-6 animate-in fade-in zoom-in-95">
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
            {error === "NETWORK_ERROR_OR_TIMEOUT" ? <WifiOff className="w-10 h-10 text-red-500" /> : <AlertCircle className="w-10 h-10 text-red-500" />}
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-white">عذراً، تعذر جلب البيانات</h3>
            <p className="text-white/40 max-w-md mx-auto">
              يبدو أن هناك ضغطاً على الخوادم أو مشكلة في الاتصال. يرجى المحاولة مرة أخرى لاحقاً.
            </p>
          </div>
          <Button onClick={fetchMatches} className="bg-primary hover:bg-primary/90 text-white rounded-full px-8 h-12">
            إعادة المحاولة الآن
          </Button>
        </div>
      ) : (
        <>
          {summary && !loading && (
            <div className="glass-panel p-6 rounded-[2rem] border-accent/20 bg-accent/5 animate-in fade-in slide-in-from-top-4">
              <p className="text-white/90 font-bold text-lg leading-relaxed text-right dir-rtl">
                 {summary}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-8">
              {liveMatches.length > 0 && (
                <section className="space-y-4">
                  <h2 className="text-xl font-bold font-headline text-red-500 flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                    مباشر الآن
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
                  {loading ? (
                     [1,2,3,4].map(i => (
                       <div key={i} className="h-44 rounded-[2.5rem] bg-white/5 p-6 flex flex-col gap-4">
                         <div className="flex justify-between"><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-12" /></div>
                         <div className="flex justify-around py-4"><Skeleton className="h-14 w-14 rounded-full" /><Skeleton className="h-10 w-20" /><Skeleton className="h-14 w-14 rounded-full" /></div>
                       </div>
                     ))
                  ) : upcomingMatches.length > 0 ? (
                    upcomingMatches.map(match => (
                      <MatchCard 
                        key={match.id} 
                        match={match} 
                        isFavorite={favoriteTeams.includes(match.homeTeam) || favoriteTeams.includes(match.awayTeam)} 
                      />
                    ))
                  ) : (
                    <div className="col-span-2 py-20 text-center bg-white/5 rounded-[2.5rem] border border-dashed border-white/10 flex flex-col items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                        <Trophy className="w-8 h-8 text-white/20" />
                      </div>
                      <div>
                        <h3 className="text-white/60 font-bold text-lg">لا توجد مباريات كبرى اليوم</h3>
                        <p className="text-white/30 text-sm mt-1">جرب تحديث البيانات أو التحقق لاحقاً</p>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {finishedMatches.length > 0 && (
                <section className="space-y-4">
                  <h2 className="text-lg font-bold font-headline text-white/40 flex items-center gap-3">
                    <Trophy className="w-5 h-5" />
                    نتائج مباريات اكتملت
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
                  تخصيص المفضلة
                  <Star className="w-4 h-4 text-accent fill-current" />
                </h3>
                <p className="text-xs text-white/40 mb-6 leading-relaxed">
                  اختر فرقك المفضلة لتظهر دائماً في أعلى الجدول وتفعل "الجزيرة العائمة" عند انطلاق المباراة.
                </p>
                <div className="flex flex-wrap gap-2">
                  {['الهلال', 'النصر', 'الاتحاد', 'الأهلي', 'ريال مدريد', 'برشلونة', 'مانشستر سيتي', 'ليفربول', 'بايرن ميونخ', 'أرسنال', 'باريس سان جيرمان'].map(team => {
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
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MatchCard({ match, isFavorite }: { match: Match; isFavorite: boolean }) {
  return (
    <div className={cn(
      "p-6 rounded-[2.5rem] border transition-all duration-500 hover:scale-[1.02] flex flex-col gap-4 relative overflow-hidden group",
      isFavorite ? "bg-primary/10 border-primary/30 ring-1 ring-primary/20 shadow-2xl" : "bg-white/5 border-white/10 hover:border-white/20"
    )}>
      {isFavorite && (
        <div className="absolute top-0 right-10 w-8 h-4 bg-primary/20 rounded-b-xl flex items-center justify-center">
          <Star className="w-2.5 h-2.5 text-primary fill-current" />
        </div>
      )}

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
            {match.channel}
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
