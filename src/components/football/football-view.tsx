"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, Timer, Clock, Calendar, Star, Trophy, Activity, Tv, Mic2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AiMatchSummary } from "./ai-match-summary";
import { useMediaStore } from "@/lib/store";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format, addDays, subDays } from "date-fns";
import { FOOTBALL_API_KEY, FOOTBALL_API_BASE_URL } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface Team {
  id: number;
  name: string;
  logo: string;
}

interface Match {
  id: number;
  home: Team;
  away: Team;
  score: {
    home: number | null;
    away: number | null;
  };
  time: string; // HH:mm
  elapsed: number | null;
  status: string; // NS, 1H, 2H, HT, FT, etc.
  statusLong: string;
  competition: {
    id: number;
    name: string;
    logo: string;
  };
  date: string; // ISO string
  broadcaster?: string;
  commentator?: string;
}

export function FootballView() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("today");
  const { favoriteTeamIds, toggleFavoriteTeamId, favoriteLeagueIds, toggleFavoriteLeagueId } = useMediaStore();

  const isFavTeam = (id: number) => favoriteTeamIds.includes(id);
  const isFavLeague = (id: number) => favoriteLeagueIds.includes(id);

  // دالة لتحديد القناة والمعلق التقريبي بناءً على الدوري (للوطن العربي)
  const getBroadcastInfo = (leagueName: string) => {
    const name = leagueName.toLowerCase();
    if (name.includes("premier league") || name.includes("la liga") || name.includes("bundesliga") || name.includes("serie a") || name.includes("ligue 1") || name.includes("champions league")) {
      return { channel: "beIN SPORTS HD", commentator: "سيحدد لاحقاً" };
    }
    if (name.includes("pro league") || name.includes("saudi") || name.includes("السعودي")) {
      return { channel: "SSC SPORTS HD", commentator: "يحدد عند البث" };
    }
    return { channel: "قنوات رياضية", commentator: "قيد التعيين" };
  };

  const fetchMatches = async (view: string) => {
    setLoading(true);
    try {
      let dateParam = format(new Date(), "yyyy-MM-dd");
      if (view === "yesterday") dateParam = format(subDays(new Date(), 1), "yyyy-MM-dd");
      if (view === "tomorrow") dateParam = format(addDays(new Date(), 1), "yyyy-MM-dd");
      
      const url = view === 'live' 
        ? `${FOOTBALL_API_BASE_URL}/fixtures?live=all&timezone=Asia/Riyadh`
        : `${FOOTBALL_API_BASE_URL}/fixtures?date=${dateParam}&timezone=Asia/Riyadh`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "x-apisports-key": FOOTBALL_API_KEY || "",
          "x-rapidapi-host": "v3.football.api-sports.io"
        }
      });

      const result = await response.json();
      
      if (result.errors && Object.keys(result.errors).length > 0) {
        throw new Error(Object.values(result.errors)[0] as string);
      }

      if (result.response) {
        const mappedMatches: Match[] = result.response.map((item: any) => {
          const info = getBroadcastInfo(item.league.name);
          return {
            id: item.fixture.id,
            home: {
              id: item.teams.home.id,
              name: item.teams.home.name,
              logo: item.teams.home.logo
            },
            away: {
              id: item.teams.away.id,
              name: item.teams.away.name,
              logo: item.teams.away.logo
            },
            score: {
              home: item.goals.home,
              away: item.goals.away
            },
            time: format(new Date(item.fixture.date), "HH:mm"),
            elapsed: item.fixture.status.elapsed,
            status: item.fixture.status.short,
            statusLong: item.fixture.status.long,
            competition: {
              id: item.league.id,
              name: item.league.name,
              logo: item.league.logo
            },
            date: item.fixture.date,
            broadcaster: info.channel,
            commentator: info.commentator
          };
        });
        setMatches(mappedMatches);
      }
      setError(null);
    } catch (err: any) {
      console.error("API Error:", err);
      setError("فشل الاتصال بمزود البيانات. يرجى المحاولة لاحقاً.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches(activeTab);
    const interval = setInterval(() => {
      if (activeTab === "today" || activeTab === "live" || activeTab === "favorites") {
        fetchMatches(activeTab);
      }
    }, 60000); 
    return () => clearInterval(interval);
  }, [activeTab]);

  const filteredAndSortedMatches = useMemo(() => {
    if (!matches.length) return [];
    
    let result = [...matches];
    const liveStatuses = ["1H", "2H", "HT", "ET", "P", "BT"];

    if (activeTab === "live") {
      result = result.filter(m => liveStatuses.includes(m.status));
    } else if (activeTab === "favorites") {
      result = result.filter(m => isFavTeam(m.home.id) || isFavTeam(m.away.id) || isFavLeague(m.competition.id));
    }

    return result.sort((a, b) => {
      const aIsFav = isFavTeam(a.home.id) || isFavTeam(a.away.id) || isFavLeague(a.competition.id);
      const bIsFav = isFavTeam(b.home.id) || isFavTeam(b.away.id) || isFavLeague(b.competition.id);

      if (aIsFav && !bIsFav) return -1;
      if (!aIsFav && bIsFav) return 1;

      const aIsLive = liveStatuses.includes(a.status);
      const bIsLive = liveStatuses.includes(b.status);
      
      if (aIsLive && !bIsLive) return -1;
      if (!aIsLive && bIsLive) return 1;

      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  }, [matches, activeTab, favoriteTeamIds, favoriteLeagueIds]);

  const getStatusDisplay = (match: Match) => {
    switch (match.status) {
      case "NS": return { label: match.time, isLive: false, isFinished: false };
      case "1H": 
      case "2H": return { label: `${match.elapsed}'`, isLive: true, isFinished: false };
      case "HT": return { label: "بين الشوطين", isLive: true, isFinished: false };
      case "FT": return { label: "انتهت", isLive: false, isFinished: true };
      case "AET": return { label: "انتهت (إضافي)", isLive: false, isFinished: true };
      case "PEN": return { label: "ركلات ترجيح", isLive: true, isFinished: true };
      case "PST": return { label: "مؤجلة", isLive: false, isFinished: false };
      case "CANC": return { label: "ملغاة", isLive: false, isFinished: false };
      default: return { label: match.statusLong, isLive: false, isFinished: false };
    }
  };

  const renderMatchCard = (match: Match, idx: number) => {
    const isFav = isFavTeam(match.home.id) || isFavTeam(match.away.id) || isFavLeague(match.competition.id);
    const statusInfo = getStatusDisplay(match);

    return (
      <Card 
        key={match.id} 
        data-nav-id={`match-card-${idx}`}
        tabIndex={0}
        className={cn(
          "relative overflow-hidden transition-all duration-500 border-white/5 group focusable",
          isFav 
            ? "ring-2 ring-primary bg-primary/10 shadow-[0_0_30px_rgba(var(--primary),0.2)]" 
            : "hover:bg-card/60 bg-card/40"
        )}
      >
        {isFav && (
          <div className="absolute top-0 right-0 p-2 z-20">
            <Badge className="bg-yellow-500 text-black border-none font-black text-[10px] py-1 px-3 flex items-center gap-1 shadow-lg">
              <Star className="h-3 w-3 fill-current" />
              مباراة كبرى
            </Badge>
          </div>
        )}
        
        <CardContent className="p-5">
          <div className="flex flex-col gap-5">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <button 
                onClick={(e) => { e.stopPropagation(); toggleFavoriteLeagueId(match.competition.id); }}
                className="flex items-center gap-2 max-w-[70%] group/league focusable outline-none"
              >
                <img src={match.competition.logo} alt="" className="h-4 w-4 object-contain" />
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-tight truncate",
                  isFavLeague(match.competition.id) ? "text-accent" : "text-white/70"
                )}>
                  {match.competition.name}
                </span>
                {isFavLeague(match.competition.id) && <Star className="w-2.5 h-2.5 text-accent fill-current" />}
              </button>
              
              <div className="flex items-center gap-2">
                {statusInfo.isLive ? (
                  <div className="flex items-center gap-1.5 bg-red-600 text-white px-3 py-1 rounded-full text-[10px] font-black animate-pulse shadow-lg shadow-red-600/20">
                    <Timer className="h-3 w-3" />
                    <span>{statusInfo.label}</span>
                  </div>
                ) : statusInfo.isFinished ? (
                  <Badge variant="secondary" className="bg-white/10 text-white/50 text-[10px] font-black px-3 rounded-full border-none">
                    انتهت
                  </Badge>
                ) : (
                  <div className="flex items-center gap-1.5 bg-white/5 text-white/60 px-3 py-1 rounded-full text-[10px] font-black border border-white/5">
                    <Clock className="h-3 w-3" />
                    <span>{statusInfo.label}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col items-center flex-1 gap-2 relative">
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleFavoriteTeamId(match.home.id, match.home.name); }}
                  className={cn(
                    "absolute -top-2 -left-2 z-30 p-1.5 rounded-full transition-all focusable",
                    isFavTeam(match.home.id) ? "bg-primary text-white shadow-glow scale-110" : "bg-black/60 text-white/40 hover:text-white"
                  )}
                >
                  <Star className={cn("w-3.5 h-3.5", isFavTeam(match.home.id) && "fill-current")} />
                </button>
                <div className={cn(
                  "h-14 w-14 rounded-2xl p-2.5 flex items-center justify-center border transition-all duration-300",
                  isFavTeam(match.home.id) ? "bg-primary/20 border-primary" : "bg-white/5 border-white/5"
                )}>
                  <img 
                    src={match.home.logo} 
                    alt={match.home.name} 
                    className="h-full w-full object-contain"
                  />
                </div>
                <span className={cn(
                  "text-xs font-black text-center line-clamp-2 min-h-[32px]",
                  isFavTeam(match.home.id) ? "text-primary" : "text-white"
                )}>
                  {match.home.name}
                </span>
              </div>

              <div className="flex flex-col items-center justify-center min-w-[80px] gap-1">
                {match.status === "NS" ? (
                  <div className="text-[10px] font-black text-muted-foreground tracking-widest bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 uppercase">VS</div>
                ) : (
                  <div className={cn(
                    "text-3xl font-black tabular-nums tracking-tighter",
                    statusInfo.isLive ? "text-white" : "text-white/60"
                  )}>
                    {match.score.home ?? 0} - {match.score.away ?? 0}
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center flex-1 gap-2 relative">
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleFavoriteTeamId(match.away.id, match.away.name); }}
                  className={cn(
                    "absolute -top-2 -right-2 z-30 p-1.5 rounded-full transition-all focusable",
                    isFavTeam(match.away.id) ? "bg-primary text-white shadow-glow scale-110" : "bg-black/60 text-white/40 hover:text-white"
                  )}
                >
                  <Star className={cn("w-3.5 h-3.5", isFavTeam(match.away.id) && "fill-current")} />
                </button>
                <div className={cn(
                  "h-14 w-14 rounded-2xl p-2.5 flex items-center justify-center border transition-all duration-300",
                  isFavTeam(match.away.id) ? "bg-primary/20 border-primary" : "bg-white/5 border-white/5"
                )}>
                  <img 
                    src={match.away.logo} 
                    alt={match.away.name} 
                    className="h-full w-full object-contain"
                  />
                </div>
                <span className={cn(
                  "text-xs font-black text-center line-clamp-2 min-h-[32px]",
                  isFavTeam(match.away.id) ? "text-primary" : "text-white"
                )}>
                  {match.away.name}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 py-3 border-t border-white/5 mt-2">
              <div className="flex items-center gap-1.5">
                <div className="bg-primary/10 p-1.5 rounded-lg">
                  <Tv className="h-3 w-3 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] text-muted-foreground font-bold uppercase">القناة الناقلة</span>
                  <span className="text-[10px] font-black text-white/90 truncate max-w-[100px]">{match.broadcaster}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 border-r border-white/5 pr-2">
                <div className="bg-accent/10 p-1.5 rounded-lg">
                  <Mic2 className="h-3 w-3 text-accent" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] text-muted-foreground font-bold uppercase">المعلق</span>
                  <span className="text-[10px] font-black text-white/90 truncate max-w-[100px]">{match.commentator}</span>
                </div>
              </div>
            </div>

            {(statusInfo.isLive || statusInfo.isFinished) && (
              <div className="mt-1">
                <AiMatchSummary 
                  matchData={{
                    team1: match.home.name,
                    team2: match.away.name,
                    score: `${match.score.home ?? 0} - ${match.score.away ?? 0}`,
                    competition: match.competition.name,
                    status: statusInfo.label
                  }} 
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto pb-32">
      <header className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-4xl font-headline font-bold text-white tracking-tighter flex items-center gap-3">
            Kooora AI Center
            <Trophy className="w-8 h-8 text-accent animate-bounce" />
          </h1>
          <div className="text-muted-foreground text-sm font-bold uppercase tracking-widest opacity-60 flex items-center gap-2">
             <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
             Elite AI Football Analysis & Broadcasts
          </div>
        </div>
        <Button 
          variant="outline" 
          onClick={() => fetchMatches(activeTab)} 
          disabled={loading}
          className="rounded-full bg-white/5 border-white/10 text-white h-12 px-6 hover:bg-white/10 focusable"
        >
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Refresh
        </Button>
      </header>

      <Tabs defaultValue="today" onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-center mb-8 overflow-x-auto pb-2">
          <TabsList className="bg-white/5 border border-white/10 p-1.5 rounded-[2rem] h-16 w-full max-w-xl shadow-2xl flex-nowrap backdrop-blur-3xl">
            <TabsTrigger value="yesterday" className="flex-1 rounded-[1.5rem] font-black text-xs data-[state=active]:bg-primary data-[state=active]:text-white focusable">Yesterday</TabsTrigger>
            <TabsTrigger value="today" className="flex-1 rounded-[1.5rem] font-black text-xs data-[state=active]:bg-primary data-[state=active]:text-white focusable">Today</TabsTrigger>
            <TabsTrigger value="tomorrow" className="flex-1 rounded-[1.5rem] font-black text-xs data-[state=active]:bg-primary data-[state=active]:text-white focusable">Tomorrow</TabsTrigger>
            <TabsTrigger value="live" className="flex-1 rounded-[1.5rem] font-black text-xs data-[state=active]:bg-red-600 data-[state=active]:text-white flex items-center gap-2 focusable">
              <Activity className="h-4 w-4" />
              Live
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex-1 rounded-[1.5rem] font-black text-xs data-[state=active]:bg-yellow-500 data-[state=active]:text-black flex items-center gap-2 focusable">
              <Star className="h-4 w-4" />
              Favorites
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={activeTab} className="mt-0 outline-none">
          {loading && matches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 gap-6">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground font-black animate-pulse">Syncing Elite Transmissions...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-24 gap-6 text-destructive text-center">
              <AlertCircle className="h-16 w-16" />
              <p className="font-black text-xl">{error}</p>
              <Button onClick={() => fetchMatches(activeTab)} className="rounded-xl bg-destructive text-white focusable">Retry Sync</Button>
            </div>
          ) : filteredAndSortedMatches.length === 0 ? (
            <div className="text-center py-24 flex flex-col items-center gap-6 bg-white/5 rounded-[3rem] border border-dashed border-white/10">
              <Calendar className="h-20 w-20 text-white/5" />
              <h3 className="text-2xl font-black text-white">No Matches Scheduled</h3>
              <p className="text-muted-foreground text-sm font-bold">Try another tab or check later.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
              {filteredAndSortedMatches.map((match, idx) => renderMatchCard(match, idx))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
