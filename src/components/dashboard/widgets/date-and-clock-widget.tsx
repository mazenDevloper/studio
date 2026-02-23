
"use client";

import { useEffect, useState, useMemo } from "react";
import { prayerTimesData } from "@/lib/constants";
import { Sun, Clock } from "lucide-react";

export function DateAndClockWidget() {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  
  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hijriDate = "٥ رمضان ١٤٤٧ هـ"; 
  
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
    return <div className="h-full bg-zinc-900/40 animate-pulse rounded-[2rem]" />;
  }

  const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dayName = now.toLocaleDateString('ar-EG', { weekday: 'long' });

  return (
    <div className="h-full bg-zinc-900/60 backdrop-blur-3xl rounded-[2.5rem] border border-white/5 p-6 flex flex-col justify-between relative shadow-2xl overflow-hidden group">
      <div className="absolute top-4 right-6">
        <Sun className="w-6 h-6 text-yellow-500/50 animate-pulse" />
      </div>

      <div>
        <h3 className="text-xl font-bold font-headline text-white/80">{dayName}</h3>
        <p className="text-[10px] text-primary font-bold uppercase tracking-widest">{hijriDate}</p>
      </div>

      <div className="flex flex-col items-center">
        <div className="text-6xl font-bold font-headline text-white tracking-tighter">
          {timeString}
        </div>
      </div>

      {nextPrayer && (
        <div className="flex items-center justify-between bg-primary/10 border border-primary/20 p-3 rounded-2xl">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-white/80">{nextPrayer.name}</span>
          </div>
          <span className="text-lg font-bold font-headline text-primary tracking-widest">
            {nextPrayer.countdown}
          </span>
        </div>
      )}
    </div>
  );
}
