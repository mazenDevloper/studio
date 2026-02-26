
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Timer, Clock, Calendar, Star, Trophy, Activity, Tv, Mic2, RefreshCw, Bell, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AiMatchSummary } from "./ai-match-summary";
import { useMediaStore } from "@/lib/store";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { fetchFootballData } from "@/lib/football-api";
import { cn } from "@/lib/utils";

export function FootballView() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("today");
  const { favoriteTeams, toggleFavoriteTeam, favoriteLeagueIds, belledMatchIds, toggleBelledMatch } = useMediaStore();

  const isFavTeam = (id: number) => favoriteTeams.some(t => t.id === id);
  const isBelled = (id: string) => belledMatchIds.includes(id);

  const loadMatches = async (view: string) => {
    setLoading(true);
    try {
      const result = await fetchFootballData(view === 'live' ? 'live' : view === 'yesterday' ? 'yesterday' : view === 'tomorrow' ? 'tomorrow' : 'today');
      setMatches(result);
      setError(null);
    } catch (err: any) {
      setError("فشل الاتصال بمزود البيانات. يرجى المحاولة لاحقاً.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches(activeTab);
    const interval = setInterval(() => {
      if (activeTab !== "favorites") {
        loadMatches(activeTab);
      }
    }, 60000); 
    return () => clearInterval(interval);
  }, [activeTab]);

  const filteredAndSortedMatches = useMemo(() => {
    if (!matches.length) return [];
    
    let result = [...matches];

    if (activeTab === "live") {
      result = result.filter(m => m.status === 'live');
    } else if (activeTab === "favorites") {
      result = result.filter(m => isFavTeam(m.homeTeamId) || isFavTeam(m.awayTeamId) || favoriteLeagueIds.includes(m.leagueId));
    }

    return result.sort((a, b) => {
      const aIsBelled = isBelled(a.id);
      const bIsBelled = isBelled(b.id);
      if (aIsBelled && !bIsBelled) return -1;
      if (!aIsBelled && bIsBelled) return 1;

      const aIsFav = isFavTeam(a.homeTeamId) || isFavTeam(a.awayTeamId);
      const bIsFav = isFavTeam(b.homeTeamId) || isFavTeam(b.awayTeamId);
      if (aIsFav && !bIsFav) return -1;
      if (!aIsFav && bIsFav) return 1;
      
      return 0;
    });
  }, [matches, activeTab, favoriteTeams, favoriteLeagueIds, belledMatchIds]);

  const renderMatchCard = (match: any, idx: number) => {
    const isFavMatch = isFavTeam(match.homeTeamId) || isFavTeam(match.awayTeamId);
    const isBelledMatch = isBelled(match.id);
    const isLive = match.status === 'live';

    return (
      <Card 
        key={match.id} 
        className={cn(
          "relative overflow-hidden transition-all duration-500 border-white/5 group focusable",
          isBelledMatch 
            ? "ring-2 ring-accent bg-accent/5 shadow-[0_0_30px_rgba(var(--accent),0.1)]" 
            : isFavMatch 
              ? "ring-2 ring-primary bg-primary/10 shadow-[0_0_30px_rgba(var(--primary),0.2)]" 
              : "hover:bg-card/60 bg-card/40"
        )}
        tabIndex={0}
      >
        <div className="absolute top-0 left-0 p-2 z-20 flex gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); toggleBelledMatch(match.id); }}
            className={cn(
              "w-10 h-10 rounded-full border border-white/10 backdrop-blur-3xl flex items-center justify-center transition-all active:scale-90",
              isBelledMatch ? "bg-accent text-black shadow-[0_0_20px_rgba(var(--accent),0.5)]" : "bg-black/60 text-white/20 hover:text-white"
            )}
          >
            {isBelledMatch ? <BellRing className="w-5 h-5 animate-pulse" /> : <Bell className="w-5 h-5" />}
          </button>
        </div>

        {isFavMatch && (
          <div className="absolute top-0 right-0 p-2 z-20">
            <Badge className="bg-yellow-500 text-black border-none font-black text-[10px] py-1 px-3 flex items-center gap-1 shadow-lg">
              <Star className="h-3 w-3 fill-current" />
              مباراة كبرى
            </Badge>
          </div>
        )}
        
        <CardContent className="p-5 mt-4">
          <div className="flex flex-col gap-5">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <span className="text-[10px] font-black uppercase tracking-tight text-white/70 truncate max-w-[70%] text-right dir-rtl">
                {match.league}
              </span>
              
              <div className="flex items-center gap-2">
                {isLive ? (
                  <div className="flex items-center gap-1.5 bg-red-600 text-white px-3 py-1 rounded-full text-[10px] font-black animate-pulse shadow-lg">
                    <Timer className="h-3 w-3" />
                    <span>{match.minute}'</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 bg-white/5 text-white/60 px-3 py-1 rounded-full text-[10px] font-black border border-white/5">
                    <Clock className="h-3 w-3" />
                    <span>{match.startTime}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col items-center flex-1 gap-2 group/team relative">
                <div className={cn("h-16 w-16 rounded-2xl p-2.5 flex items-center justify-center border transition-all duration-500", isFavTeam(match.homeTeamId) ? "bg-primary/20 border-primary" : "bg-white/5 border-white/5")}>
                  <img src={match.homeLogo} alt="" className="h-full w-full object-contain" />
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      toggleFavoriteTeam({ id: match.homeTeamId, name: match.homeTeam, logo: match.homeLogo }); 
                    }}
                    className={cn(
                      "absolute -top-2 -right-2 w-8 h-8 rounded-full border border-white/10 backdrop-blur-3xl flex items-center justify-center transition-all active:scale-90 z-30",
                      isFavTeam(match.homeTeamId) ? "bg-yellow-500 text-black shadow-glow" : "bg-black/60 text-white/20 hover:text-white"
                    )}
                  >
                    <Star className={cn("w-4 h-4", isFavTeam(match.homeTeamId) && "fill-current")} />
                  </button>
                </div>
                <span className={cn("text-xs font-black text-center line-clamp-2 min-h-[32px] uppercase tracking-tighter", isFavTeam(match.homeTeamId) ? "text-primary" : "text-white")}>
                  {match.homeTeam}
                </span>
              </div>

              <div className="flex flex-col items-center justify-center min-w-[120px] gap-1">
                {match.status === "upcoming" ? (
                  <div className="text-4xl font-black text-white tabular-nums tracking-tighter drop-shadow-lg scale-110">
                    {match.startTime}
                  </div>
                ) : (
                  <div className="text-5xl font-black tabular-nums tracking-tighter drop-shadow-xl text-white scale-125">
                    {match.score.home}-{match.score.away}
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center flex-1 gap-2 group/team relative">
                <div className={cn("h-16 w-16 rounded-2xl p-2.5 flex items-center justify-center border transition-all duration-500", isFavTeam(match.awayTeamId) ? "bg-primary/20 border-primary" : "bg-white/5 border-white/5")}>
                  <img src={match.awayLogo} alt="" className="h-full w-full object-contain" />
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      toggleFavoriteTeam({ id: match.awayTeamId, name: match.awayTeam, logo: match.awayLogo }); 
                    }}
                    className={cn(
                      "absolute -top-2 -left-2 w-8 h-8 rounded-full border border-white/10 backdrop-blur-3xl flex items-center justify-center transition-all active:scale-90 z-30",
                      isFavTeam(match.awayTeamId) ? "bg-yellow-500 text-black shadow-glow" : "bg-black/60 text-white/20 hover:text-white"
                    )}
                  >
                    <Star className={cn("w-4 h-4", isFavTeam(match.awayTeamId) && "fill-current")} />
                  </button>
                </div>
                <span className={cn("text-xs font-black text-center line-clamp-2 min-h-[32px] uppercase tracking-tighter", isFavTeam(match.awayTeamId) ? "text-primary" : "text-white")}>
                  {match.awayTeam}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 py-3 border-t border-white/5 mt-2 dir-rtl">
              <div className="flex items-center gap-1.5">
                <Tv className="h-3 w-3 text-primary" />
                <div className="flex flex-col">
                  <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest">القناة</span>
                  <span className="text-[10px] font-black text-white/90">{match.channel}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 border-r border-white/5 pr-2">
                <Mic2 className="h-3 w-3 text-accent" />
                <div className="flex flex-col">
                  <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest">المعلق</span>
                  <span className="text-[10px] font-black text-white/90">{match.commentator}</span>
                </div>
              </div>
            </div>

            {isLive && (
              <AiMatchSummary matchData={{ team1: match.homeTeam, team2: match.awayTeam, score: `${match.score.home}-${match.score.away}`, competition: match.league, status: `${match.minute}'` }} />
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-8 space-y-8 pb-32">
      <header className="flex items-center justify-between">
        <h1 className="text-4xl font-headline font-bold text-white tracking-tighter flex items-center gap-3">
          مركز كووورة
          <Trophy className="w-8 h-8 text-accent animate-bounce" />
        </h1>
        <Button variant="outline" onClick={() => loadMatches(activeTab)} disabled={loading} className="rounded-full bg-white/5 border-white/10 text-white hover:bg-white/10 transition-all focusable">
          <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} /> تحديث
        </Button>
      </header>

      <Tabs defaultValue="today" onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-center mb-8">
          <TabsList className="bg-white/5 border border-white/10 p-1.5 rounded-[2rem] h-16 w-full max-w-xl shadow-2xl backdrop-blur-3xl">
            <TabsTrigger value="yesterday" className="flex-1 rounded-[1.5rem] font-black text-xs transition-all data-[state=active]:bg-white/10 focusable">أمس</TabsTrigger>
            <TabsTrigger value="today" className="flex-1 rounded-[1.5rem] font-black text-xs transition-all data-[state=active]:bg-white/10 focusable">اليوم</TabsTrigger>
            <TabsTrigger value="tomorrow" className="flex-1 rounded-[1.5rem] font-black text-xs transition-all data-[state=active]:bg-white/10 focusable">غداً</TabsTrigger>
            <TabsTrigger value="live" className="flex-1 rounded-[1.5rem] font-black text-xs data-[state=active]:bg-red-600 flex items-center justify-center gap-2 transition-all focusable">
              <Activity className="h-4 w-4" /> المباشرة
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex-1 rounded-[1.5rem] font-black text-xs data-[state=active]:bg-yellow-500 data-[state=active]:text-black flex items-center justify-center gap-2 transition-all focusable">
              <Star className="h-4 w-4" /> المفضلة
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={activeTab}>
          {loading && matches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 gap-6">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground font-black animate-pulse uppercase tracking-[0.3em]">جاري جلب البيانات...</p>
            </div>
          ) : filteredAndSortedMatches.length === 0 ? (
            <div className="text-center py-24 flex flex-col items-center gap-6 bg-white/5 rounded-[3rem] border border-dashed border-white/10 animate-in fade-in zoom-in-95">
              <Calendar className="h-20 w-20 text-white/5" />
              <h3 className="text-2xl font-black text-white/40 uppercase tracking-widest">لا توجد مباريات مجدولة</h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
              {filteredAndSortedMatches.map((m, idx) => renderMatchCard(m, idx))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
