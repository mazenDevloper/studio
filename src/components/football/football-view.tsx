
"use client";

import { useEffect, useState, useCallback } from "react";
import { Match, MAJOR_LEAGUES } from "@/lib/football-data";
import { getFootballIntelligence } from "@/ai/flows/football-intelligence-flow";
import { fetchStandings, fetchTopScorers } from "@/lib/football-api";
import { useMediaStore } from "@/lib/store";
import { Trophy, Tv, Mic2, Star, Calendar, RefreshCw, Loader2, Check, Sparkles, AlertCircle, ListOrdered, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

export function FootballView() {
  const { favoriteTeams, toggleFavoriteTeam } = useMediaStore();
  const [matches, setMatches] = useState<Match[]>([]);
  const [summary, setSummary] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [standings, setStandings] = useState<any[]>([]);
  const [scorers, setScorers] = useState<any[]>([]);
  const [selectedLeague, setSelectedLeague] = useState(MAJOR_LEAGUES[0].id);
  const [statsLoading, setStatsLoading] = useState(false);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getFootballIntelligence({ type: 'today' });
      if (response.error) {
        setError(response.error);
      } else if (response.matches) {
        const sortedData = [...response.matches].sort((a, b) => {
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
      setError("FAILED_TO_LOAD");
    } finally {
      setLoading(false);
    }
  }, [favoriteTeams]);

  const loadLeagueStats = useCallback(async (leagueId: number) => {
    setStatsLoading(true);
    try {
      const [sData, tData] = await Promise.all([
        fetchStandings(leagueId),
        fetchTopScorers(leagueId)
      ]);
      setStandings(sData);
      setScorers(tData);
    } catch (err) {
      console.error(err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatches();
    loadLeagueStats(selectedLeague);
    const interval = setInterval(fetchMatches, 300000);
    return () => clearInterval(interval);
  }, [fetchMatches, selectedLeague, loadLeagueStats]);

  const liveMatches = matches.filter(m => m.status === 'live');
  const upcomingMatches = matches.filter(m => m.status === 'upcoming');

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto pb-32">
      <header className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-4xl font-headline font-bold text-white tracking-tighter flex items-center gap-3">
            Kooora AI Center
            <Sparkles className="w-6 h-6 text-accent animate-pulse" />
          </h1>
          <div className="text-muted-foreground text-sm font-medium uppercase tracking-widest opacity-60 flex items-center gap-2">
             <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
             تغطية حية وشاملة مدعومة بالذكاء الاصطناعي
          </div>
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

      <Tabs defaultValue="matches" className="w-full">
        <TabsList className="bg-white/5 p-1 rounded-full border border-white/10 h-14 mb-8">
          <TabsTrigger value="matches" className="rounded-full px-8 data-[state=active]:bg-primary">
            <Calendar className="w-4 h-4 mr-2" /> مباريات اليوم
          </TabsTrigger>
          <TabsTrigger value="standings" className="rounded-full px-8 data-[state=active]:bg-primary">
            <ListOrdered className="w-4 h-4 mr-2" /> الترتيب
          </TabsTrigger>
          <TabsTrigger value="scorers" className="rounded-full px-8 data-[state=active]:bg-primary">
            <Users className="w-4 h-4 mr-2" /> الهدافون
          </TabsTrigger>
        </TabsList>

        <TabsContent value="matches" className="space-y-8">
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
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
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
                <h2 className="text-xl font-bold font-headline text-white flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-primary" />
                  جدول مباريات اليوم
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {loading ? (
                    [1,2,3,4].map(i => <Skeleton key={i} className="h-44 rounded-[2.5rem] bg-white/5" />)
                  ) : upcomingMatches.length > 0 ? (
                    upcomingMatches.map(match => (
                      <MatchCard key={match.id} match={match} isFavorite={favoriteTeams.includes(match.homeTeam) || favoriteTeams.includes(match.awayTeam)} />
                    ))
                  ) : (
                    <div className="col-span-2 py-20 text-center bg-white/5 rounded-[2.5rem] border border-dashed border-white/10">
                      <p className="text-white/40 italic">لا توجد مباريات هامة قريباً - تأكد من الاتصال</p>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <div className="glass-panel rounded-[2.5rem] p-8 border-white/10 bg-black/40">
                <h3 className="text-lg font-bold font-headline text-white mb-6 flex items-center justify-between">
                  فرقك المفضلة
                  <Star className="w-4 h-4 text-accent fill-current" />
                </h3>
                <div className="flex flex-wrap gap-2">
                  {['الهلال', 'النصر', 'الاتحاد', 'الأهلي', 'ريال مدريد', 'برشلونة', 'مانشستر سيتي', 'ليفربول'].map(team => {
                    const isFav = favoriteTeams.includes(team);
                    return (
                      <Button
                        key={team}
                        onClick={() => toggleFavoriteTeam(team)}
                        variant={isFav ? "default" : "outline"}
                        className={cn("rounded-xl text-[10px] font-bold h-10 px-4", isFav && "bg-primary shadow-glow")}
                      >
                        {team}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="standings" className="space-y-6">
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {MAJOR_LEAGUES.map(league => (
              <Button
                key={league.id}
                variant={selectedLeague === league.id ? "default" : "outline"}
                onClick={() => setSelectedLeague(league.id)}
                className="rounded-full"
              >
                {league.name}
              </Button>
            ))}
          </div>
          <div className="glass-panel rounded-[2rem] overflow-hidden border-white/10">
            {statsLoading ? (
              <div className="p-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
            ) : (
              <ScrollArea className="h-[500px]">
                <table className="w-full text-right dir-rtl">
                  <thead className="bg-white/5 text-white/40 text-xs font-bold uppercase tracking-widest">
                    <tr><th className="p-4">الترتيب</th><th className="p-4 text-right">الفريق</th><th className="p-4">لعب</th><th className="p-4">فارق</th><th className="p-4">نقاط</th></tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {standings.map((team: any) => (
                      <tr key={team.team.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 font-bold text-white/60">{team.rank}</td>
                        <td className="p-4 flex items-center gap-3">
                          <Image src={team.team.logo} alt={team.team.name} width={24} height={24} className="object-contain" />
                          <span className="font-bold text-white">{team.team.name}</span>
                        </td>
                        <td className="p-4 text-white/80">{team.all.played}</td>
                        <td className="p-4 text-accent">{team.goalsDiff}</td>
                        <td className="p-4 font-black text-primary">{team.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            )}
          </div>
        </TabsContent>

        <TabsContent value="scorers" className="space-y-6">
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {MAJOR_LEAGUES.map(league => (
              <Button key={league.id} variant={selectedLeague === league.id ? "default" : "outline"} onClick={() => setSelectedLeague(league.id)} className="rounded-full">{league.name}</Button>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {statsLoading ? (
              [1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-24 rounded-2xl bg-white/5" />)
            ) : (
              scorers.map((item: any, idx) => (
                <div key={item.player.id} className="glass-panel p-4 rounded-2xl flex items-center gap-4">
                  <div className="text-2xl font-black text-white/20 w-8">{idx + 1}</div>
                  <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-primary/20">
                    <Image src={item.player.photo} alt={item.player.name} fill className="object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-white truncate">{item.player.name}</h4>
                    <p className="text-xs text-white/40">{item.statistics[0].team.name}</p>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-black text-primary">{item.statistics[0].goals.total}</div>
                    <div className="text-[8px] font-bold text-white/20 uppercase">أهداف</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
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
        <div className="flex items-center gap-2 bg-white/5 px-2 py-1 rounded-full border border-white/5">
          {match.leagueLogo && <Image src={match.leagueLogo} alt="" width={12} height={12} className="object-contain opacity-60" />}
          <span className="truncate max-w-[150px]">{match.league}</span>
        </div>
        <span className={cn(
          "px-3 py-1 rounded-full border font-black",
          match.status === 'live' ? "bg-red-500/10 text-red-500 border-red-500/20 animate-pulse" : "bg-white/5 text-white/40 border-white/10"
        )}>
          {match.status === 'live' ? 'مباشر' : match.status === 'upcoming' ? match.startTime : 'انتهت'}
        </span>
      </div>
      <div className="flex items-center justify-around gap-2 py-4 relative z-10">
        <div className="flex flex-col items-center gap-3 w-24">
          <div className="relative w-14 h-14 drop-shadow-2xl transition-transform group-hover:scale-110"><Image src={match.homeLogo} alt={match.homeTeam} fill className="object-contain" /></div>
          <span className="text-[11px] font-black text-white text-center truncate w-full">{match.homeTeam}</span>
        </div>
        <div className="flex flex-col items-center min-w-[100px]">
          <span className="text-4xl font-black text-white tracking-tighter drop-shadow-2xl">{match.status === 'upcoming' ? 'VS' : `${match.score?.home} - ${match.score?.away}`}</span>
          {match.status === 'live' && <div className="flex items-center gap-1.5 mt-1 bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20"><span className="text-[10px] font-black text-primary animate-pulse">{match.minute}'</span></div>}
        </div>
        <div className="flex flex-col items-center gap-3 w-24">
          <div className="relative w-14 h-14 drop-shadow-2xl transition-transform group-hover:scale-110"><Image src={match.awayLogo} alt={match.awayTeam} fill className="object-contain" /></div>
          <span className="text-[11px] font-black text-white text-center truncate w-full">{match.awayTeam}</span>
        </div>
      </div>
      <div className="pt-4 border-t border-white/5 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2 bg-black/20 px-3 py-1 rounded-full border border-white/5">
          <Tv className="w-3.5 h-3.5 text-accent" />
          <span className="text-[10px] font-black text-white/70 uppercase tracking-tighter">{match.channel || "SSC / beIN"}</span>
        </div>
        <div className="flex items-center gap-2 opacity-40">
          <Mic2 className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold">{match.commentator || "يحدد لاحقاً"}</span>
        </div>
      </div>
    </div>
  );
}
