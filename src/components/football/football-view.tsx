
"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Trophy, RefreshCw, Bell, BellRing, Globe, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMediaStore } from "@/lib/store";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchFootballData } from "@/lib/football-api";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const MAJOR_CLUBS_IDS = [541, 529, 40, 50, 33, 42, 157, 505, 489, 496, 85, 2931, 2939, 2932, 2930, 1029, 1038];
const MAJOR_LEAGUES_IDS = [
  1, 2, 3, 4, 5, 7, 9, 10, 11, 17, 39, 140, 135, 165, 61, 307, 233, 301, 305, 312, 292, 13, 14, 16, 19, 20, 21
];

export function FootballView() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("today");
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  
  const { favoriteTeams, belledMatchIds, toggleBelledMatch, setActiveIptv } = useMediaStore();
  const { toast } = useToast();

  const isFavTeam = (id: number) => favoriteTeams.some(t => t.id === id);
  const isBelled = (id: string) => belledMatchIds.includes(id);

  const loadMatches = async (view: string, isAutoRefresh = false) => {
    // Optimization: Don't auto-poll if no matches are live
    const hasLiveNow = matches.some(m => m.status === 'live');
    if (isAutoRefresh && !hasLiveNow && lastUpdate !== 0) return;

    if (!isAutoRefresh) setLoading(true);
    setError(null);
    
    try {
      let result = [];
      if (view === 'beinlive') {
        const APIFY_TOKEN = process.env.NEXT_PUBLIC_APIFY_TOKEN || "";
        const API_URL = `https://api.apify.com/v2/acts/plum_wobble~my-actor-6/runs/last/dataset/items?token=${APIFY_TOKEN}&status=SUCCEEDED&clean=true&format=json`;
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`Apify Error: ${response.status}`);
        const rawData = await response.json();
        if (Array.isArray(rawData)) {
          result = rawData.map((m: any, idx: number) => {
            const scoreParts = m.result?.split('-') || ["0", "0"];
            return {
              id: `bein-${idx}`,
              homeTeam: m.teams?.home || "فريق",
              homeLogo: m.teams?.home_logo || "", 
              awayTeam: m.teams?.away || "فريق",
              awayLogo: m.teams?.away_logo || "",
              league: m.competition || "بطولة",
              startTime: m.time || "00:00", 
              status: m.status === 'live' || m.info?.status?.includes('جارية') ? 'live' : (m.status === 'finished' || m.info?.status?.includes('انتهت') ? 'finished' : 'upcoming'),
              score: { home: scoreParts[0]?.trim() || "0", away: scoreParts[1]?.trim() || "0" },
              channel: m.channel || "غير معروفة",
              commentator: m.commentator || "يحدد لاحقاً",
              dayCategory: m.day || m.day_category,
              matchLink: m.channel_url || m.match_link || ""
            };
          });
        }
      } else {
        const typeParam = view === 'live' ? 'live' : view === 'yesterday' ? 'yesterday' : view === 'tomorrow' ? 'tomorrow' : 'today';
        result = await fetchFootballData(typeParam);
      }
      setMatches(result);
      setLastUpdate(Date.now());
    } catch (err: any) {
      console.error("Match Loading Error:", err);
      setError("فشل الاتصال بمزود البيانات.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches(activeTab);
    const interval = setInterval(() => loadMatches(activeTab, true), 60000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const filteredAndSortedMatches = useMemo(() => {
    if (!matches || !Array.isArray(matches)) return [];
    let result = [...matches];

    // center shows all matches for the selected date range
    if (activeTab === "beinlive") {
      const koraDay = "اليوم";
      return result.filter(m => m.dayCategory === koraDay);
    }

    if (activeTab === "live") {
      result = result.filter(m => m.status === 'live');
    }

    // Custom sorting: Bell > Fav > Major leagues/clubs > Status > Time
    return result.sort((a, b) => {
      // 1. Belled matches first
      const aBelled = isBelled(a.id);
      const bBelled = isBelled(b.id);
      if (aBelled !== bBelled) return aBelled ? -1 : 1;

      // 2. Favorite teams second
      const aIsFav = isFavTeam(a.homeTeamId) || isFavTeam(a.awayTeamId);
      const bIsFav = isFavTeam(b.homeTeamId) || isFavTeam(b.awayTeamId);
      if (aIsFav !== bIsFav) return aIsFav ? -1 : 1;

      // 3. Major leagues or Top clubs third
      const aIsMajor = MAJOR_LEAGUES_IDS.includes(a.leagueId) || MAJOR_CLUBS_IDS.includes(a.homeTeamId) || MAJOR_CLUBS_IDS.includes(a.awayTeamId);
      const bIsMajor = MAJOR_LEAGUES_IDS.includes(b.leagueId) || MAJOR_CLUBS_IDS.includes(b.homeTeamId) || MAJOR_CLUBS_IDS.includes(b.awayTeamId);
      if (aIsMajor !== bIsMajor) return aIsMajor ? -1 : 1;

      // 4. Match status (live > upcoming > finished)
      const statusWeight: Record<string, number> = { live: 0, upcoming: 1, finished: 2 };
      const statusDiff = (statusWeight[a.status] || 0) - (statusWeight[b.status] || 0);
      if (statusDiff !== 0) return statusDiff;

      // 5. Start time
      return (a.startTime || "").localeCompare(b.startTime || "");
    });
  }, [matches, activeTab, favoriteTeams, belledMatchIds]);

  const renderMatchCard = (match: any, idx: number) => {
    const isFavMatch = isFavTeam(match.homeTeamId) || isFavTeam(match.awayTeamId);
    const isBelledMatch = isBelled(match.id);
    const isLive = match.status === 'live';

    return (
      <Card 
        key={match.id} 
        data-nav-id={`match-${idx}`}
        onClick={() => match.matchLink && setActiveIptv({ stream_id: match.id, name: `${match.homeTeam} vs ${match.awayTeam}`, stream_icon: match.homeLogo, url: match.matchLink, type: 'web', category_id: "direct" })}
        className={cn(
          "relative overflow-hidden transition-all duration-500 border-white/5 group focusable premium-glass h-56 cursor-pointer",
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
            {isBelledMatch ? <BellRing className="w-4.5 h-4.5" /> : <Bell className="w-4.5 h-4.5" />}
          </button>
        </div>

        <CardContent className="p-4 h-full flex flex-col justify-between">
          <div className="flex items-center justify-between gap-4 flex-1">
            <div className="flex flex-col items-center flex-1 gap-2 relative group/team">
              <div className={cn("h-18 w-18 rounded-2xl p-2 flex items-center justify-center border transition-all shadow-2xl", isFavTeam(match.homeTeamId) ? "bg-primary/20 border-primary" : "bg-white/5 border-white/5")}>
                <img src={match.homeLogo} alt="" className="h-full w-full object-contain" onError={(e) => (e.target as any).src = 'https://picsum.photos/seed/h/100'} />
              </div>
              <span className={cn("text-[11px] font-black text-center line-clamp-1 uppercase tracking-tighter", isFavTeam(match.homeTeamId) ? "text-primary" : "text-white/80")}>
                {match.homeTeam}
              </span>
            </div>

            <div className="flex flex-col items-center justify-center min-w-[120px] gap-1">
              <div className="text-4xl font-black text-white tabular-nums tracking-tighter drop-shadow-lg">
                {isLive ? (
                  <div className="flex flex-col items-center">
                    <span className="text-primary text-[12px] mb-[-6px]">{match.minute}'</span>
                    <span>{match.score.away}-{match.score.home}</span>
                  </div>
                ) : match.status === "finished" ? (
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-white/40 uppercase mb-[-6px]">FT</span>
                    <span>{match.score.away}-{match.score.home}</span>
                  </div>
                ) : (
                  match.startTime
                )}
              </div>
              <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest text-center line-clamp-1">
                {match.league}
              </span>
            </div>

            <div className="flex flex-col items-center flex-1 gap-2 relative group/team">
              <div className={cn("h-18 w-18 rounded-2xl p-2 flex items-center justify-center border transition-all shadow-2xl", isFavTeam(match.awayTeamId) ? "bg-primary/20 border-primary" : "bg-white/5 border-white/5")}>
                <img src={match.awayLogo} alt="" className="h-full w-full object-contain" onError={(e) => (e.target as any).src = 'https://picsum.photos/seed/a/100'} />
              </div>
              <span className={cn("text-[11px] font-black text-center line-clamp-1 uppercase tracking-tighter", isFavTeam(match.awayTeamId) ? "text-primary" : "text-white/80")}>
                {match.awayTeam}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full">
              <Globe className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] font-black text-white/60 truncate max-w-[100px]">{match.channel || "SSC HD"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-accent" />
              <span className="text-[10px] font-black text-white/40 truncate max-w-[100px]">{match.commentator || "يحدد لاحقاً"}</span>
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
            مركز كووورة <Trophy className="w-8 h-8 text-accent" />
          </h1>
          <p className="text-white/40 text-xs font-bold uppercase tracking-widest mr-1">Global Football Hub (Full Coverage)</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => loadMatches(activeTab)} disabled={loading} className="rounded-full bg-white/5 border-white/10 text-white hover:bg-white/10 transition-all focusable">
            <RefreshCw className={cn("w-4 h-4 ml-2", loading && "animate-spin")} /> تحديث يدوي
          </Button>
        </div>
      </header>

      <div className="flex flex-col gap-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 dir-rtl">
            <TabsList className="bg-white/5 border border-white/10 p-1.5 rounded-[2rem] h-16 w-full max-w-3xl shadow-2xl backdrop-blur-3xl">
              <TabsTrigger value="yesterday" className="flex-1 rounded-[1.5rem] font-black text-xs focusable">أمس</TabsTrigger>
              <TabsTrigger value="today" className="flex-1 rounded-[1.5rem] font-black text-xs focusable">اليوم (الكل)</TabsTrigger>
              <TabsTrigger value="tomorrow" className="flex-1 rounded-[1.5rem] font-black text-xs focusable">غداً</TabsTrigger>
              <TabsTrigger value="beinlive" className="flex-1 rounded-[1.5rem] font-black text-xs data-[state=active]:bg-primary focusable">KORA LIVE</TabsTrigger>
              <TabsTrigger value="live" className="flex-1 rounded-[1.5rem] font-black text-xs data-[state=active]:bg-red-600 focusable">المباشرة</TabsTrigger>
              <TabsTrigger value="favorites" className="flex-1 rounded-[1.5rem] font-black text-xs data-[state=active]:bg-yellow-500 focusable">المفضلة</TabsTrigger>
            </TabsList>
          </div>
        </Tabs>

        <div className="mt-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-6">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
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
