
"use client";

import { useEffect, useState } from "react";
import { MOCK_MATCHES, Match } from "@/lib/football-data";
import { useMediaStore } from "@/lib/store";
import { Trophy, Tv, Mic2, Star, Calendar, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";
import { cn } from "@/lib/utils";

export function FootballView() {
  const { favoriteTeams, toggleFavoriteTeam } = useMediaStore();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  // محاكاة جلب بيانات حقيقية من API
  const fetchMatches = async () => {
    setLoading(true);
    try {
      // هنا يمكن استدعاء fetch من API خارجي
      // const res = await fetch('https://api.football-data.org/v4/matches');
      // const data = await res.json();
      
      // للمحاكاة حالياً نستخدم الـ Mock مع تأخير بسيط
      await new Promise(resolve => setTimeout(resolve, 800));
      setMatches(MOCK_MATCHES);
    } catch (error) {
      console.error("Football API Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  const liveMatches = matches.filter(m => m.status === 'live');
  const upcomingMatches = matches.filter(m => m.status === 'upcoming');
  const finishedMatches = matches.filter(m => m.status === 'finished');

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto pb-32">
      <header className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-4xl font-headline font-bold text-white tracking-tighter">مركز المباريات العالمي</h1>
          <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest opacity-60">تغطية حية لأهم البطولات والقنوات العربية</p>
        </div>
        <Button 
          variant="outline" 
          onClick={fetchMatches} 
          disabled={loading}
          className="rounded-full bg-white/5 border-white/10 text-white h-12 px-6"
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
          تحديث النتائج
        </Button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Live and Favorites */}
        <div className="lg:col-span-8 space-y-8">
          {liveMatches.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold font-headline text-red-500 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                مباشر الآن
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {liveMatches.map(match => (
                  <MatchCard key={match.id} match={match} isFavorite={favoriteTeams.includes(match.homeTeam) || favoriteTeams.includes(match.awayTeam)} />
                ))}
              </div>
            </section>
          )}

          <section className="space-y-4">
            <h2 className="text-xl font-bold font-headline text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              مباريات اليوم
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingMatches.map(match => (
                <MatchCard key={match.id} match={match} isFavorite={favoriteTeams.includes(match.homeTeam) || favoriteTeams.includes(match.awayTeam)} />
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold font-headline text-white/40 flex items-center gap-2">
              انتهت مؤخراً
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-60">
              {finishedMatches.map(match => (
                <MatchCard key={match.id} match={match} isFavorite={favoriteTeams.includes(match.homeTeam) || favoriteTeams.includes(match.awayTeam)} />
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Favorites Management */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-panel rounded-[2.5rem] p-8 border-white/10">
            <h3 className="text-lg font-bold font-headline text-white mb-6">إدارة الفرق المفضلة</h3>
            <div className="flex flex-wrap gap-2">
              {['الهلال', 'النصر', 'الاتحاد', 'الأهلي', 'ريال مدريد', 'برشلونة', 'مانشستر سيتي', 'ليفربول'].map(team => {
                const isFav = favoriteTeams.includes(team);
                return (
                  <Button
                    key={team}
                    onClick={() => toggleFavoriteTeam(team)}
                    variant={isFav ? "default" : "outline"}
                    className={cn(
                      "rounded-xl text-[10px] font-bold h-10 px-4 transition-all",
                      isFav ? "bg-primary border-primary" : "border-white/10 bg-white/5"
                    )}
                  >
                    {isFav && <Star className="w-3 h-3 mr-1 fill-current" />}
                    {team}
                  </Button>
                );
              })}
            </div>
          </div>
          
          <div className="glass-panel rounded-[2.5rem] p-8 bg-primary/5 border-primary/20">
             <Trophy className="w-10 h-10 text-primary mb-4" />
             <h4 className="font-bold text-white">تنبيهات مباشرة</h4>
             <p className="text-xs text-white/60 mt-2 leading-relaxed">
               سيتم إظهار الجزيرة العائمة تلقائياً عند تسجيل أهداف في مباريات فرقك المفضلة.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MatchCard({ match, isFavorite }: { match: Match; isFavorite: boolean }) {
  return (
    <div className={cn(
      "p-6 rounded-[2rem] border transition-all hover:scale-[1.02] flex flex-col gap-4 relative",
      isFavorite ? "bg-primary/10 border-primary/20" : "bg-white/5 border-white/10"
    )}>
      {isFavorite && <Star className="absolute top-4 right-4 w-4 h-4 text-primary fill-current shadow-glow" />}
      
      <div className="flex items-center justify-between text-[10px] font-black text-white/40 uppercase tracking-widest">
        <span>{match.league}</span>
        <span className={cn(
          "px-2 py-1 rounded-full",
          match.status === 'live' ? "bg-red-500/20 text-red-500 animate-pulse" : "bg-white/10 text-white/60"
        )}>
          {match.status === 'live' ? 'مباشر' : match.status === 'upcoming' ? match.startTime : 'انتهت'}
        </span>
      </div>

      <div className="flex items-center justify-around gap-2 py-2">
        <div className="flex flex-col items-center gap-2 w-20">
          <div className="relative w-12 h-12">
            <Image src={match.homeLogo} alt={match.homeTeam} fill className="object-contain" />
          </div>
          <span className="text-[10px] font-bold text-white text-center truncate w-full">{match.homeTeam}</span>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-3xl font-black text-white">
            {match.status === 'upcoming' ? 'VS' : `${match.score?.home} - ${match.score?.away}`}
          </span>
          {match.status === 'live' && (
            <span className="text-[10px] font-black text-primary animate-pulse">{match.minute}'</span>
          )}
        </div>

        <div className="flex flex-col items-center gap-2 w-20">
          <div className="relative w-12 h-12">
            <Image src={match.awayLogo} alt={match.awayTeam} fill className="object-contain" />
          </div>
          <span className="text-[10px] font-bold text-white text-center truncate w-full">{match.awayTeam}</span>
        </div>
      </div>

      <div className="pt-4 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tv className="w-3.5 h-3.5 text-accent" />
          <span className="text-[9px] font-bold text-white/60">{match.channel}</span>
        </div>
        <div className="flex items-center gap-2">
          <Mic2 className="w-3.5 h-3.5 text-white/40" />
          <span className="text-[9px] font-bold text-white/40">{match.commentator}</span>
        </div>
      </div>
    </div>
  );
}
