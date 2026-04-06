
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Trophy, RefreshCw, Bell, BellRing, Globe, Shield, CloudUpload, Star, Layout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMediaStore } from "@/lib/store";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchFootballData } from "@/lib/football-api";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export function FootballView() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("today");
  
  const { favoriteTeams, belledMatchIds, toggleBelledMatch, setActiveIptv, toggleFavoriteTeam, dockSide } = useMediaStore();
  const { toast } = useToast();
  const isDockLeft = dockSide === 'left';

  const loadMatches = async () => {
    setLoading(true);
    try {
      const typeParam = activeTab === 'live' ? 'live' : activeTab === 'yesterday' ? 'yesterday' : activeTab === 'tomorrow' ? 'tomorrow' : 'today';
      const result = await fetchFootballData(typeParam);
      setMatches(result || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMatches(); }, [activeTab]);

  return (
    <div className={cn("p-8 space-y-8 pb-32", isDockLeft ? "text-right dir-rtl" : "text-left dir-ltr")}>
      <header className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-4xl font-headline font-bold text-white tracking-tighter flex items-center gap-3">
            مركز كووورة <Trophy className="w-8 h-8 text-accent animate-bounce" />
          </h1>
          <p className="text-white/40 text-xs font-bold uppercase tracking-widest mr-1">Global Football Live Hub</p>
        </div>
        <Button variant="outline" onClick={loadMatches} disabled={loading} className="rounded-full bg-white/5 border-white/10 text-white hover:bg-white/10 focusable h-12 px-8" data-nav-id="football-refresh-btn">
          <RefreshCw className={cn("w-4 h-4 ml-2", loading && "animate-spin")} /> تحديث يدوي
        </Button>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white/5 border border-white/10 p-1 rounded-full h-16 w-full max-w-2xl backdrop-blur-3xl shadow-2xl">
          <TabsTrigger value="yesterday" className="flex-1 rounded-full font-black text-xs focusable" data-nav-id="football-tab-yesterday">أمس</TabsTrigger>
          <TabsTrigger value="today" className="flex-1 rounded-full font-black text-xs focusable" data-nav-id="football-tab-today">اليوم</TabsTrigger>
          <TabsTrigger value="tomorrow" className="flex-1 rounded-full font-black text-xs focusable" data-nav-id="football-tab-tomorrow">غداً</TabsTrigger>
          <TabsTrigger value="live" className="flex-1 rounded-full font-black text-xs data-[state=active]:bg-red-600 focusable" data-nav-id="football-tab-live">مباشر</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-8">
        {loading ? (
          <div className="flex justify-center py-40"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matches.map((match, idx) => (
              <Card 
                key={match.id} 
                onClick={() => match.matchLink && setActiveIptv({ stream_id: match.id, name: `${match.homeTeam} vs ${match.awayTeam}`, stream_icon: match.homeLogo, url: match.matchLink, type: 'web', category_id: "direct" })}
                className="relative bg-white/5 border-white/5 rounded-[2.5rem] overflow-hidden focusable group transition-all hover:bg-white/10 h-56"
                tabIndex={0}
                data-nav-id={`match-item-${idx}`}
              >
                <CardContent className="p-6 h-full flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col items-center flex-1 gap-2">
                      <div className="w-16 h-16 rounded-2xl bg-black/20 p-2 flex items-center justify-center border border-white/5 shadow-xl">
                        <img src={match.homeLogo} className="w-full h-full object-contain" alt="" />
                      </div>
                      <span className="text-[11px] font-black text-white/80 text-center uppercase tracking-tighter truncate w-full">{match.homeTeam}</span>
                    </div>
                    
                    <div className="flex flex-col items-center justify-center min-w-[80px]">
                      <div className="text-3xl font-black text-white tabular-nums tracking-tighter">
                        {match.status === 'live' ? `${match.score.away}-${match.score.home}` : match.startTime}
                      </div>
                      {match.status === 'live' && <span className="text-primary text-[10px] font-black animate-pulse">{match.minute}'</span>}
                    </div>

                    <div className="flex flex-col items-center flex-1 gap-2">
                      <div className="w-16 h-16 rounded-2xl bg-black/20 p-2 flex items-center justify-center border border-white/5 shadow-xl">
                        <img src={match.awayLogo} className="w-full h-full object-contain" alt="" />
                      </div>
                      <span className="text-[11px] font-black text-white/80 text-center uppercase tracking-tighter truncate w-full">{match.awayTeam}</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{match.league}</span>
                    <div className="flex gap-2">
                      <button onClick={(e) => { e.stopPropagation(); toggleBelledMatch(match.id); }} className={cn("w-10 h-10 rounded-full flex items-center justify-center", belledMatchIds.includes(match.id) ? "bg-accent text-black shadow-glow" : "bg-white/5 text-white/40")}>
                        <Bell className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
