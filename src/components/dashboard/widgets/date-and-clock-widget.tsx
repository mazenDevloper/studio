
"use client";

import { useEffect, useState, useMemo } from "react";
import { prayerTimesData, convertTo12Hour } from "@/lib/constants";
import { Clock, Timer, Calendar } from "lucide-react";
import Image from "next/image";

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
    const day = now.getDate().toString().padStart(2, '0');
    const dateStr = `2026-02-${day}`;
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

  if (!mounted || !now) return (
    <div className="h-full w-full flex items-center justify-center bg-black/20 animate-pulse">
      <Clock className="w-12 h-12 text-white/10" />
    </div>
  );

  const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dayName = now.toLocaleDateString('ar-EG', { weekday: 'long' });
  const dayNum = now.getDate();
  const monthName = now.toLocaleDateString('ar-EG', { month: 'long' });

  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-8 relative overflow-hidden bg-black rounded-[2.5rem]">
      {/* Background Image Fill */}
      <div className="absolute inset-0 z-0">
        <Image 
          src="https://images.unsplash.com/photo-1534067783941-51c9c23ecefd?auto=format&fit=crop&q=80&w=1000"
          alt="Atmospheric Background"
          fill
          className="object-cover opacity-30 group-hover:scale-105 transition-transform duration-[8s]"
          data-ai-hint="mountain night"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/60 via-black/40 to-black" />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <div className="flex items-center gap-3 mb-4 bg-white/10 px-5 py-2 rounded-full border border-white/10 backdrop-blur-md">
          <Calendar className="w-4 h-4 text-accent" />
          <span className="text-[12px] text-white/90 font-bold uppercase tracking-[0.2em]">{dayName} {dayNum} {monthName}</span>
        </div>
        
        <div className="text-8xl font-black text-white tracking-tighter mb-4 drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
          {timeString}
        </div>
        
        {nextPrayer && (
          <div className="mt-4 flex flex-col items-center gap-2">
            <div className="bg-primary/20 text-primary px-6 py-2 rounded-full border border-primary/30 backdrop-blur-md">
              <span className="text-xs font-black uppercase tracking-widest">الصلاة القادمة: {nextPrayer.name}</span>
            </div>
            <span className="text-5xl font-black text-accent drop-shadow-2xl mt-2">
              {convertTo12Hour(nextPrayer.time)}
            </span>
            <div className="text-xs font-bold text-white/40 uppercase mt-1 tracking-[0.3em] flex items-center gap-2">
              <Timer className="w-4 h-4" /> متبقي {nextPrayer.countdown}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
