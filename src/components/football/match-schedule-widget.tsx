
"use client";

import { MOCK_MATCHES, AVAILABLE_TEAMS } from "@/lib/football-data";
import { useMediaStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Tv, Mic2, Star, Plus, X, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Image from "next/image";
import { cn } from "@/lib/utils";

export function MatchScheduleWidget() {
  const { favoriteTeams, toggleFavoriteTeam } = useMediaStore();

  return (
    <Card className="border-none bg-zinc-900/50 rounded-[2.5rem] ios-shadow overflow-hidden flex flex-col">
      <CardHeader className="p-8 flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl font-bold font-headline text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center ios-shadow">
            <Trophy className="h-6 w-6 text-white" />
          </div>
          جدول المباريات العالمي
        </CardTitle>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" className="rounded-full bg-white/5 border border-white/5 text-[10px] font-bold uppercase tracking-widest px-4">
              إدارة الفرق المفضلة
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-white/10 rounded-[2.5rem]">
            <DialogHeader>
              <DialogTitle className="text-white font-headline">اختر فرقك المفضلة</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-3 gap-3 p-4">
              {AVAILABLE_TEAMS.map(team => (
                <Button
                  key={team}
                  onClick={() => toggleFavoriteTeam(team)}
                  variant={favoriteTeams.includes(team) ? "default" : "outline"}
                  className={cn(
                    "rounded-xl font-bold text-xs h-12 transition-all",
                    favoriteTeams.includes(team) ? "bg-primary" : "border-white/10"
                  )}
                >
                  {team}
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent className="p-8 pt-0">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex w-max gap-6 pb-4">
            {MOCK_MATCHES.map((match) => {
              const isFavorite = favoriteTeams.includes(match.homeTeam) || favoriteTeams.includes(match.awayTeam);
              
              return (
                <div 
                  key={match.id} 
                  className={cn(
                    "w-80 p-6 rounded-[2rem] flex flex-col gap-4 relative transition-all hover:scale-[1.02] border",
                    isFavorite ? "bg-primary/10 border-primary/20" : "bg-white/5 border-white/5"
                  )}
                >
                  {isFavorite && (
                    <div className="absolute top-4 right-4">
                      <Star className="w-4 h-4 text-primary fill-current" />
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{match.league}</span>
                    <div className={cn(
                      "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter",
                      match.status === 'live' ? "bg-red-500/20 text-red-500 animate-pulse" : "bg-white/10 text-white/60"
                    )}>
                      {match.status === 'live' ? 'مباشر' : match.status === 'upcoming' ? match.startTime : 'انتهت'}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 py-2">
                    <div className="flex flex-col items-center gap-2 flex-1">
                      <div className="relative w-12 h-12">
                        <Image src={match.homeLogo} alt={match.homeTeam} fill className="object-contain" />
                      </div>
                      <span className="text-xs font-bold text-white truncate w-full text-center">{match.homeTeam}</span>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className="text-2xl font-black text-white">
                        {match.status === 'upcoming' ? 'VS' : `${match.score?.home} - ${match.score?.away}`}
                      </div>
                      {match.status === 'live' && (
                        <span className="text-[10px] font-black text-primary">{match.minute}'</span>
                      )}
                    </div>

                    <div className="flex flex-col items-center gap-2 flex-1">
                      <div className="relative w-12 h-12">
                        <Image src={match.awayLogo} alt={match.awayTeam} fill className="object-contain" />
                      </div>
                      <span className="text-xs font-bold text-white truncate w-full text-center">{match.awayTeam}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tv className="w-3.5 h-3.5 text-accent" />
                      <span className="text-[10px] font-bold text-white/60">{match.channel}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mic2 className="w-3.5 h-3.5 text-white/40" />
                      <span className="text-[10px] font-bold text-white/40">{match.commentator}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" className="bg-white/5 h-2" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
