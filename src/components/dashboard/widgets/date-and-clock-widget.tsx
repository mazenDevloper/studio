"use client";

import { useEffect, useState, useMemo } from "react";
import { prayerTimesData, convertTo12Hour } from "@/lib/constants";
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
      time: next.time,
      countdown: `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
    };
  }, [now]);

  if (!mounted || !now) return null;

  const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-indigo-900/40 to-transparent">
      <div className="text-7xl font-black text-white tracking-tighter mb-2 drop-shadow-2xl">
        {timeString}
      </div>
      
      {nextPrayer && (
        <div className="mt-4 flex flex-col items-center gap-1">
          <div className="flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full border border-white/10">
            <span className="text-xs font-bold text-blue-300 uppercase tracking-widest">الأذان القادم: {nextPrayer.name}</span>
          </div>
          <span className="text-4xl font-black text-accent drop-shadow-lg mt-2">
            {convertTo12Hour(nextPrayer.time)}
          </span>
        </div>
      )}
    </div>
  );
}