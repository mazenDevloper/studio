
"use client";

import { useEffect, useState, useMemo } from "react";
import { prayerTimesData } from "@/lib/constants";
import { Clock, Timer } from "lucide-react";

export function DateAndClockWidget() {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  
  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const nextPrayer = useMemo(() => {
    if (!now) return null;
    
    const timeToMinutes = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const dateStr = `2026-02-${now.getDate().toString().padStart(2, '0')}`;
    const pTimes = prayerTimesData.find(p => p.date === dateStr) || prayerTimesData[0];
    
    const prayers = [
      { name: "الفجر", time: pTimes.fajr },
      { name: "الظهر", time: pTimes.dhuhr },
      { name: "العصر", time: pTimes.asr },
      { name: "المغرب", time: pTimes.maghrib },
      { name: "العشاء", time: pTimes.isha },
    ];

    let next = prayers.find(p => timeToMinutes(p.time) > currentMinutes);
    if (!next) next = prayers[0];

    const targetMins = timeToMinutes(next.time);
    let diff = targetMins - currentMinutes;
    if (diff < 0) diff += 24 * 60;
    
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;

    return {
      name: next.name,
      countdown: `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
    };
  }, [now]);

  if (!mounted || !now) {
    return <div className="h-full bg-zinc-900/40 animate-pulse rounded-[2.5rem]" />;
  }

  const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="h-full bg-zinc-900/60 backdrop-blur-3xl rounded-[2.5rem] border border-white/5 p-8 flex flex-col justify-center items-center relative shadow-2xl overflow-hidden group">
      <div className="absolute top-6 left-8 flex items-center gap-2">
        <Clock className="w-4 h-4 text-primary" />
        <span className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em]">Live Precision</span>
      </div>

      <div className="flex flex-col items-center">
        <div className="text-7xl font-bold font-headline text-white tracking-tighter drop-shadow-2xl">
          {timeString}
        </div>
      </div>

      {nextPrayer && (
        <div className="mt-8 flex items-center gap-6 bg-primary/10 border border-primary/20 px-8 py-4 rounded-3xl">
          <div className="flex flex-col">
            <span className="text-[8px] text-primary font-bold uppercase tracking-widest">Next Prayer</span>
            <span className="text-sm font-bold text-white">{nextPrayer.name}</span>
          </div>
          <div className="h-8 w-px bg-primary/20" />
          <div className="flex items-center gap-3">
            <Timer className="w-5 h-5 text-primary animate-pulse" />
            <span className="text-3xl font-bold font-headline text-primary tracking-widest">
              {nextPrayer.countdown}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
