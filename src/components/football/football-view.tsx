
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Calendar, Star, Trophy, Activity, RefreshCw, Bell, BellRing, Globe, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMediaStore } from "@/lib/store";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchFootballData } from "@/lib/football-api";
import { cn } from "@/lib/utils";
import { convertTo12Hour } from "@/lib/constants";

const MAJOR_CLUBS_IDS = [541, 529, 40, 50, 33, 42, 157, 505, 489, 496, 85, 2931, 2939, 2932, 2930, 1029, 1038];
const MAJOR_LEAGUES_IDS = [2, 3, 39, 140, 135, 165, 61, 307, 233];

export function FootballView() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("today");
  const [filterType, setFilterType] = useState<"all" | "major" | "arab" | "euro">("major");
  
  const { favoriteTeams, belledMatchIds, toggleBelledMatch, toggleFavoriteTeam } = useMediaStore();

  const isFavTeam = (id: number) => favoriteTeams.some(t => t.id === id);
  const isBelled = (id: string) => belledMatchIds.includes(id);

  const loadMatches = async (view: string) => {
    setLoading(true);
    try {
      const typeParam = view === 'live' ? 'live' : view === 'yesterday' ? 'yesterday' : view === 'tomorrow' ? 'tomorrow' : 'today';
      const result = await fetchFootballData(typeParam);
      setMatches(result);
      setError(null);
    } catch (err: any) {
      setError("فشل الاتصال بمزود البيانات.");
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

  useEffect(() => {
    if (matches.length > 0 && !loading) {
      setTimeout(() => {
        const firstMatch = document.querySelector('[data-nav-id^="match-"]') as HTMLElement;
        if (firstMatch) firstMatch.focus();
      }, 500);
    }
  }, [matches, loading]);

  const filteredAndSortedMatches = useMemo(() => {
    if (!matches || !Array.isArray(matches)) return [];
    
    let result = [...matches];

    if (activeTab === "live") {
      result = result.filter(m => m.status === 'live');
    } else if (activeTab === "favorites") {
      result = result.filter(m => isFavTeam(m.homeTeamId) || isFavTeam(m.awayTeamId));
    }

    if (activeTab !== "favorites") {
      if (filterType === "major") {
        result = result.filter(m => MAJOR_LEAGUES_IDS.includes(m.leagueId) || MAJOR_CLUBS_IDS.includes(m.homeTeamId) || MAJOR_CLUBS_IDS.includes(m.awayTeamId));
      } else if (filterType === "arab") {
        result = result.filter(m => [307, 233, 301, 305, 312, 292].includes(m.leagueId));
      } else if (filterType === "euro") {
        result = result.filter(m => [2, 3, 39, 140, 135, 165, 61].includes(m.leagueId));
      }
    }

    return result.sort((a, b) => {
      const aBelled = isBelled(a.id);
      const bBelled = isBelled(b.id);
      if (aBelled && !bBelled) return -1;
      if (!aBelled && bBelled) return 1;

      const aIsFav = isFavTeam(a.homeTeamId) || isFavTeam(a.awayTeamId);
      const bIsFav = isFavTeam(b.homeTeamId) || isFavTeam(b.awayTeamId);
      if (aIsFav && !bIsFav) return -1;
      if (!aIsFav && bIsFav) return 1;

      return (a.leagueId || 0) - (b.leagueId || 0);
    });
  }, [matches, activeTab, filterType, favoriteTeams, belledMatchIds]);

  const renderMatchCard = (match: any, idx: number) => {
    const isFavMatch = isFavTeam(match.homeTeamId) || isFavTeam(match.awayTeamId);
    const isBelledMatch = isBelled(match.id);
    const isLive = match.status === 'live';

    const handleToggleFav = (e: React.MouseEvent, teamId: number, teamName: string, teamLogo: string) => {
      e.stopPropagation();
      toggleFavoriteTeam({ id: teamId, name: teamName, logo: teamLogo });
    };

    return (
      <Card 
        key={match.id} 
        data-nav-id={`match-${idx}`}
        className={cn(
          "relative overflow-hidden transition-all duration-500 border-white/5 group focusable premium-glass h-48",
          isBelledMatch ? "ring-2 ring-accent bg-accent/5" : isFavMatch ? "ring-2 ring-primary bg-primary/10" : "bg-card/40"
        )}
        tabIndex={0}
      >
        <div className="absolute top-3 left-3 z-20">
          <button 
            onClick={(e) => { e.stopPropagation(); toggleBelledMatch(match.id); }}
            className={cn(
              "w-9 h-9 rounded-full border border-white/10 backdrop-blur-3xl flex items-center justify-center transition-all active:scale-90",
              isBelledMatch ? "bg-accent text-black" : "bg-black/60 text-white/20 hover:text-white"
            )}
          >
            {isBelledMatch ? <BellRing className="w-4.5 h-4.5 animate-pulse" /> : <Bell className="w-4.5 h-4.5" />}
          </button>
        </div>

        <CardContent className="p-4 h-full flex flex-col justify-center">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col items-center flex-1 gap-2 relative group/team">
              <div className={cn("h-18 w-18 rounded-2xl p-2 flex items-center justify-center border transition-all relative overflow-visible shadow-2xl", isFavTeam(match.homeTeamId) ? "bg-primary/20 border-primary" : "bg-white/5 border-white/5")}>
                <img src={match.homeLogo} alt="" className="h-full w-full object-contain" />
                
                {/* Rank Badge - Top Left */}
                <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-white text-black text-[10px] font-black flex items-center justify-center shadow-lg border border-black/10 z-40">
                  {match.homeRank || "1"}
                </div>

                <button 
                  onClick={(e) => handleToggleFav(e, match.homeTeamId, match.homeTeam, match.homeLogo)}
                  className={cn(
                    "absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-75 z-30",
                    isFavTeam(match.homeTeamId) ? "bg-yellow-500 text-black opacity-100" : "bg-black/80 text-white/40 opacity-0 group-hover/team:opacity-100"
                  )}
                >
                  <Star className={cn("w-4 h-4", isFavTeam(match.homeTeamId) && "fill-current")} />
                </button>
              </div>
              <span className={cn("text-[11px] font-black text-center line-clamp-1 uppercase tracking-tighter", isFavTeam(match.homeTeamId) ? "text-primary" : "text-white/80")}>
                {match.homeTeam}
              </span>
            </div>

            <div className="flex flex-col items-center justify-center min-w-[120px] gap-1">
              <div className="text-4xl font-black text-white tabular-nums tracking-tighter drop-shadow-lg">
                {isLive ? (
                  <div className="flex flex-col items-center">
                    <span className="text-red-500 animate-pulse text-[12px] mb-[-6px]">{match.minute}'</span>
                    <span>{match.score.away}-{match.score.home}</span>
                  </div>
                ) : match.status === "finished" ? (
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-white/40 uppercase mb-[-6px]">FT</span>
                    <span>{match.score.away}-{match.score.home}</span>
                  </div>
                ) : (
                  convertTo12Hour(match.startTime)
                )}
              </div>
              <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest text-center line-clamp-1 max-w-[110px]">
                {match.league}
              </span>
            </div>

            <div className="flex flex-col items-center flex-1 gap-2 relative group/team">
              <div className={cn("h-18 w-18 rounded-2xl p-2 flex items-center justify-center border transition-all relative overflow-visible shadow-2xl", isFavTeam(match.awayTeamId) ? "bg-primary/20 border-primary" : "bg-white/5 border-white/5")}>
                <img src={match.awayLogo} alt="" className="h-full w-full object-contain" />
                
                {/* Rank Badge - Top Left */}
                <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-white text-black text-[10px] font-black flex items-center justify-center shadow-lg border border-black/10 z-40">
                  {match.awayRank || "2"}
                </div>

                <button 
                  onClick={(e) => handleToggleFav(e, match.awayTeamId, match.awayTeam, match.awayLogo)}
                  className={cn(
                    "absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-75 z-30",
                    isFavTeam(match.awayTeamId) ? "bg-yellow-500 text-black opacity-100" : "bg-black/80 text-white/40 opacity-0 group-hover/team:opacity-100"
                  )}
                >
                  <Star className={cn("w-4 h-4", isFavTeam(match.awayTeamId) && "fill-current")} />
                </button>
              </div>
              <span className={cn("text-[11px] font-black text-center line-clamp-1 uppercase tracking-tighter", isFavTeam(match.awayTeamId) ? "text-primary" : "text-white/80")}>
                {match.awayTeam}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-8 space-y-8 pb-32">
      <header className="flex items-center justify-between">
        <div className="flex flex-col gap-1 text-right">
          <h1 className="text-4xl font-headline font-bold text-white tracking-tighter flex items-center gap-3">
            مركز كووورة <Trophy className="w-8 h-8 text-accent animate-bounce" />
          </h1>
          <p className="text-white/40 text-xs font-bold uppercase tracking-widest mr-1">Global Football Hub (Starred Mode)</p>
        </div>
        <Button variant="outline" onClick={() => loadMatches(activeTab)} disabled={loading} className="rounded-full bg-white/5 border-white/10 text-white hover:bg-white/10 transition-all focusable">
          <RefreshCw className={cn("w-4 h-4 ml-2", loading && "animate-spin")} /> تحديث
        </Button>
      </header>

      <div className="flex flex-col gap-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 dir-rtl">
            <TabsList className="bg-white/5 border border-white/10 p-1.5 rounded-[2rem] h-16 w-full max-w-xl shadow-2xl backdrop-blur-3xl">
              <TabsTrigger value="yesterday" className="flex-1 rounded-[1.5rem] font-black text-xs">أمس</TabsTrigger>
              <TabsTrigger value="today" className="flex-1 rounded-[1.5rem] font-black text-xs">اليوم</TabsTrigger>
              <TabsTrigger value="tomorrow" className="flex-1 rounded-[1.5rem] font-black text-xs">غداً</TabsTrigger>
              <TabsTrigger value="live" className="flex-1 rounded-[1.5rem] font-black text-xs data-[state=active]:bg-red-600 flex items-center justify-center gap-2">
                <Activity className="h-4 w-4" /> المباشرة
              </TabsTrigger>
              <TabsTrigger value="favorites" className="flex-1 rounded-[1.5rem] font-black text-xs data-[state=active]:bg-yellow-500 data-[state=active]:text-black flex items-center justify-center gap-2">
                <Star className="h-4 w-4" /> المفضلة
              </TabsTrigger>
            </TabsList>

            {activeTab !== "favorites" && (
              <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-full border border-white/10 h-16 shadow-2xl">
                <Button variant="ghost" onClick={() => setFilterType("major")} className={cn("rounded-full px-6 h-full font-black text-xs flex items-center gap-2", filterType === "major" ? "bg-primary text-white" : "text-white/40")}><Shield className="w-4 h-4" /> القمة</Button>
                <Button variant="ghost" onClick={() => setFilterType("arab")} className={cn("rounded-full px-6 h-full font-black text-xs flex items-center gap-2", filterType === "arab" ? "bg-emerald-600 text-white" : "text-white/40")}><Globe className="w-4 h-4" /> العرب</Button>
                <Button variant="ghost" onClick={() => setFilterType("euro")} className={cn("rounded-full px-6 h-full font-black text-xs flex items-center gap-2", filterType === "euro" ? "bg-blue-600 text-white" : "text-white/40")}><Globe className="w-4 h-4" /> أوروبا</Button>
                <Button variant="ghost" onClick={() => setFilterType("all")} className={cn("rounded-full px-6 h-full font-black text-xs", filterType === "all" ? "bg-white/10 text-white" : "text-white/40")}>الكل</Button>
              </div>
            )}
          </div>
        </Tabs>

        <div className="mt-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-6">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground font-black animate-pulse uppercase tracking-[0.3em]">جاري التحميل...</p>
            </div>
          ) : filteredAndSortedMatches.length === 0 ? (
            <div className="text-center py-24 flex flex-col items-center gap-6 bg-white/5 rounded-[3rem] border border-dashed border-white/10">
              <Calendar className="h-20 w-20 text-white/5" />
              <h3 className="text-2xl font-black text-white/40 uppercase tracking-widest">لا توجد مباريات</h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAndSortedMatches.map((m, idx) => renderMatchCard(m, idx))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
