"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Match } from "@/lib/football-data";
import { fetchFootballData } from "@/lib/football-api";
import { useMediaStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ChevronUp, BookOpen, Sparkles, Moon, Sun, Coffee, Stars, BellRing } from "lucide-react";
import { FluidGlass } from "@/components/ui/fluid-glass";
import { convertTo12Hour } from "@/lib/constants";

interface IslandItem {
  id: string;
  type: 'match' | 'reminder';
  priority: number;
  data: any;
}

export function LiveMatchIsland() {
  const { favoriteTeams, prayerTimes, belledMatchIds, reminders, isFullScreen } = useMediaStore();
  const [topMatches, setTopMatches] = useState<Match[]>([]);
  const [dhikr] = useState("سبحان الله وبحمده");
  const [skippedIds, setSkippedIds] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDetailedManually, setIsDetailedManually] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchMatches = useCallback(async () => {
    if (isFullScreen) return;
    try {
      const matches = await fetchFootballData('today');
      setTopMatches(matches || []);
    } catch (e) {}
  }, [isFullScreen]);

  useEffect(() => {
    fetchMatches();
    const interval = setInterval(fetchMatches, 30000);
    return () => clearInterval(interval);
  }, [fetchMatches]);

  const tToM = (t: string) => {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const cleanTime = (t: string) => convertTo12Hour(t).replace(/\s?[AP]M/i, '');

  const getMinuteBadgeColor = (min: number) => {
    if (min <= 30) return "bg-emerald-500 text-white";
    if (min <= 70) return "bg-yellow-500 text-black";
    return "bg-red-600 text-white";
  };

  const prayerIslandData = useMemo(() => {
    if (!prayerTimes?.length) return null;
    const day = now.getDate().toString().padStart(2, '0');
    const pData = prayerTimes.find(p => p.date.endsWith(`-${day}`)) || prayerTimes[0];
    const currentMins = now.getHours() * 60 + now.getMinutes();

    if (pData) {
      const fajrMins = tToM(pData.fajr);
      const sunriseMins = tToM(pData.sunrise);
      const asrMins = tToM(pData.asr);
      const maghribMins = tToM(pData.maghrib);
      const duhaStart = sunriseMins + 15;
      const dhuhrMins = tToM(pData.dhuhr);

      if (currentMins >= fajrMins && currentMins < sunriseMins + 30) {
        return { name: "أذكار الصباح", label: "تذكير نشط", value: "", icon: Sun, color: "text-orange-400" };
      }
      if (currentMins >= duhaStart && currentMins < dhuhrMins - 15) {
        return { name: "صلاة الضحى", label: "تذكير نشط", value: "", icon: Coffee, color: "text-emerald-400" };
      }
      const eveningStart = asrMins + 20; 
      if (currentMins >= eveningStart && currentMins < maghribMins) {
        return { name: "أذكار المساء", label: "تذكير نشط", value: "", icon: Moon, color: "text-blue-400" };
      }
      if (currentMins >= 0 && currentMins < fajrMins - 30) {
        return { name: "قيام الليل", label: "تذكير نشط", value: "", icon: Stars, color: "text-purple-400" };
      }
    }

    const list = [
      { name: "الفجر", time: pData.fajr, iqamah: 25 },
      { name: "الظهر", time: pData.dhuhr, iqamah: 20 },
      { name: "العصر", time: pData.asr, iqamah: 20 },
      { name: "المغرب", time: pData.maghrib, iqamah: 10 },
      { name: "العشاء", time: pData.isha, iqamah: 20 },
    ];

    let prayer = list.find(p => tToM(p.time) + p.iqamah + 10 > currentMins);
    if (!prayer) prayer = list[0];

    return { 
      name: prayer.name, 
      label: "الصلاة القادمة", 
      value: cleanTime(prayer.time),
      icon: BellRing,
      color: "text-white"
    };
  }, [now, prayerTimes]);

  const islandQueue = useMemo(() => {
    const items: IslandItem[] = [];
    topMatches.forEach(m => {
      if (skippedIds.includes(m.id)) return;
      const isFav = favoriteTeams.some(t => t.id === m.homeTeamId || t.id === m.awayTeamId);
      const isBelled = belledMatchIds.includes(m.id);
      const isLive = m.status === 'live';
      const isFinished = m.status === 'finished';
      
      let priority = 0;
      if (isLive) {
        if (isFav && isBelled) priority = 10000;
        else if (isFav) priority = 9000;
        else if (isBelled) priority = 8000;
        else priority = 2000;
      } else if (m.status === 'upcoming') {
        if (isFav && isBelled) priority = 7000;
        else if (isFav) priority = 6000;
        else priority = 1500;
      } else if (isFinished && (isFav || isBelled)) {
        priority = 500;
      }

      if (priority > 0) items.push({ id: m.id, type: 'match', priority, data: m });
    });

    return items.sort((a, b) => b.priority - a.priority).slice(0, 4);
  }, [topMatches, skippedIds, favoriteTeams, belledMatchIds]);

  const handleSkip = (id: string) => { setSkippedIds(p => [...p, id]); setActiveIndex(0); };

  if (isFullScreen) return null;

  const activeItem = islandQueue[activeIndex];
  const isMatchExpanded = activeItem?.type === 'match' && isDetailedManually;

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[10001] flex items-center gap-4 pointer-events-none">
      {prayerIslandData && (
        <div className="pointer-events-auto group relative">
          <div className="liquid-glass backdrop-blur-[120px] rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,1)] transition-all duration-700 overflow-hidden relative border border-white/10 w-64 h-14 px-6">
            <FluidGlass />
            <div className="h-full flex items-center justify-between relative z-10 gap-4">
              <div className={cn("w-9 h-9 rounded-full flex items-center justify-center bg-white/10", prayerIslandData.color)}>
                <prayerIslandData.icon className="w-4.5 h-4.5" />
              </div>
              <div className="flex flex-col text-right flex-1">
                <span className="font-black text-white uppercase tracking-widest leading-none mb-1" style={{ fontSize: '0.7rem' }}>{prayerIslandData.label}</span>
                <div className="flex items-baseline justify-end gap-2">
                  <span className="text-lg font-black text-white tracking-tight">{prayerIslandData.name}</span>
                  <span className="text-lg font-black text-white/60 tabular-nums">{prayerIslandData.value}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeItem ? (
        <div className="pointer-events-auto group relative" onClick={() => activeItem.type === 'match' ? setIsDetailedManually(!isDetailedManually) : handleSkip(activeItem.id)}>
          <div className={cn(
            "liquid-glass backdrop-blur-[120px] rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,1)] transition-all duration-700 cursor-pointer overflow-hidden relative border border-white/10 p-0",
            isMatchExpanded ? "w-[340px] h-[120px]" : "w-[18rem] h-[3.5rem]"
          )}
          style={!isMatchExpanded ? { background: 'linear-gradient(45deg, black, transparent)' } : {}}
          >
            <FluidGlass />
            <div className="relative z-10 h-full">
              {activeItem.type === 'match' ? (
                !isMatchExpanded ? (
                  <div className="h-full w-full flex items-center justify-center relative overflow-hidden p-0">
                    <div className="absolute inset-0 flex items-center justify-between opacity-100 px-2" style={{ background: 'linear-gradient(0deg, black 5%, transparent)' }}>
                      <img src={activeItem.data.homeLogo} className="h-[120%] w-auto object-contain scale-[1.9] translate-x-4" alt="" />
                      <img src={activeItem.data.awayLogo} className="h-[120%] w-auto object-contain scale-[1.9] -translate-x-4" alt="" />
                    </div>
                    
                    <div className="relative w-full h-full flex flex-col items-center justify-center z-20" style={{ background: 'linear-gradient(-1deg, black, transparent)' }}>
                      <span className="relative z-20 font-black text-white leading-none drop-shadow-lg tabular-nums" dir="ltr" style={{ fontSize: '3rem', bottom: '0px' }}>
                        {activeItem.data.status === 'upcoming' 
                          ? cleanTime(activeItem.data.startTime)
                          : `${activeItem.data.score.away}-${activeItem.data.score.home}`}
                      </span>
                      {activeItem.data.status === 'live' && (
                        <div className={cn(
                          "absolute top-1 right-1/2 translate-x-1/2 px-2 py-0.5 rounded-full shadow-xl border border-white/20 z-[1000]",
                          getMinuteBadgeColor(activeItem.data.minute || 0)
                        )}>
                          <span className="font-black text-white uppercase tracking-widest" style={{ fontSize: '0.7rem' }}>{activeItem.data.minute}'</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col animate-in zoom-in-95 duration-500 text-right overflow-hidden">
                    <div className="flex justify-between items-center px-6 py-2 border-b border-white/10">
                      <div className={cn(
                        "px-3 py-1 rounded-full font-black shadow-lg flex items-center gap-2",
                        activeItem.data.status === 'live' ? getMinuteBadgeColor(activeItem.data.minute || 0) : "bg-white/10 text-white/60"
                      )}>
                        <span style={{ fontSize: '0.7rem' }}>{activeItem.data.status === 'live' ? `${activeItem.data.minute}'` : activeItem.data.status === 'finished' ? 'FT' : cleanTime(activeItem.data.startTime)}</span>
                      </div>
                      <span className="text-[9px] font-black text-white/40 uppercase tracking-tighter truncate max-w-[150px] dir-rtl">{activeItem.data.league}</span>
                    </div>

                    <div className="flex items-center justify-between flex-1 px-8 gap-4">
                      <img src={activeItem.data.homeLogo} className="h-14 w-14 object-contain drop-shadow-xl" alt="" />
                      <div className="text-4xl font-black text-white tabular-nums tracking-tighter drop-shadow-2xl" dir="ltr">
                        {activeItem.data.status === 'upcoming' ? 'VS' : `${activeItem.data.score.home}-${activeItem.data.score.away}`}
                      </div>
                      <img src={activeItem.data.awayLogo} className="h-14 w-14 object-contain drop-shadow-xl" alt="" />
                    </div>
                  </div>
                )
              ) : (
                <div className="h-full flex items-center justify-between gap-6 whitespace-nowrap px-6">
                  <div className={cn("w-8 h-8 rounded-full bg-white/10 flex items-center justify-center", activeItem.data.color)}>
                    {activeItem.data.icon ? <activeItem.data.icon className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                  </div>
                  <div className="flex flex-col text-right flex-1">
                    <span className="text-lg font-black text-white tracking-tight leading-tight">{activeItem.data.label}</span>
                    <span className="font-black text-accent uppercase tracking-widest" style={{ fontSize: '0.7rem' }}>تذكير نشط</span>
                  </div>
                  <ChevronUp className="w-4 h-4 text-white/20 animate-bounce" />
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="liquid-glass backdrop-blur-[100px] rounded-full h-12 px-10 flex items-center gap-4 border border-white/10 min-w-[300px] justify-center pointer-events-auto">
          <span className="text-sm font-black text-white/80 tracking-widest">{dhikr}</span>
          <Sparkles className="w-4 h-4 text-accent animate-pulse" />
        </div>
      )}

      {islandQueue.length > 1 && (
        <div className="flex items-center gap-2">
          {islandQueue.map((item, idx) => {
            if (idx === activeIndex) return null;
            return (
              <div key={item.id} onClick={() => setActiveIndex(idx)} className="pointer-events-auto w-14 h-14 rounded-full liquid-glass backdrop-blur-[80px] border border-white/20 flex items-center justify-center shadow-2xl cursor-pointer overflow-hidden transition-all hover:scale-110 active:scale-90 p-0" style={{ background: 'linear-gradient(45deg, black, transparent)' }}>
                <div className="relative w-full h-full flex flex-col items-center justify-center">
                  {item.type === 'match' ? (
                    <>
                      <div className="absolute inset-0 flex items-center justify-center opacity-100 gap-0.5" style={{ background: 'linear-gradient(0deg, black 5%, transparent)', transform: 'scale(0.5)' }}>
                        <img src={item.data.homeLogo} className="w-10 h-10 object-contain scale-[1.9] translate-x-2" alt="" />
                        <img src={item.data.awayLogo} className="w-10 h-10 object-contain scale-[1.9] -translate-x-2" alt="" />
                      </div>
                      <div className="absolute inset-0 z-10" style={{ background: 'linear-gradient(-1deg, black, transparent)' }} />
                      <span className="relative z-20 font-black text-white leading-none drop-shadow-lg tabular-nums" dir="ltr" style={{ fontSize: '1rem', bottom: '-11px' }}>
                        {item.data.status === 'upcoming' 
                          ? cleanTime(item.data.startTime)
                          : `${item.data.score.away}-${item.data.score.home}`}
                      </span>
                      {item.data.status === 'live' && (
                        <div className={cn(
                          "absolute bottom-1 right-1/2 translate-x-1/2 px-1 py-0 rounded-full shadow-xl z-[1000] animate-pulse",
                          getMinuteBadgeColor(item.data.minute || 0)
                        )}>
                          <span className="font-black text-white" style={{ fontSize: '0.5rem' }}>{item.data.minute}'</span>
                        </div>
                      )}
                    </>
                  ) : (
                    item.data.icon ? <item.data.icon className={cn("w-6 h-6", item.data.color)} /> : <BookOpen className="w-6 h-6 text-accent" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
