"use client";

import { useEffect, useState, useMemo } from "react";
import { convertTo12Hour } from "@/lib/constants";
import { Clock, Timer, Calendar } from "lucide-react";
import Image from "next/image";
import { useMediaStore } from "@/lib/store";

export function DateAndClockWidget() {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const { prayerTimes } = useMediaStore();
  
  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const nextPrayer = useMemo(() => {
    if (!now || !prayerTimes || prayerTimes.length === 0) return null;
    
    const timeToMinutes = (t: string) => {
      if (!t) return 0;
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const day = now.getDate().toString().padStart(2, '0');
    const dateStr = `2026-02-${day}`;
    const pTimes = prayerTimes.find(p => p.date === dateStr) || prayerTimes[0];
    
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
  }, [now, prayerTimes]);

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
    <div className="h-full w-full flex flex-col items-center justify-center p-4 relative overflow-hidden bg-black rounded-[2.5rem]">
      <div className="absolute inset-0 z-0">
        <Image 
          src="https://images.unsplash.com/photo-1534067783941-51c9c23ecefd?auto=format&fit=crop&q=80&w=1000"
          alt="Atmospheric Background"
          fill
          className="object-cover opacity-20 transition-transform duration-[8s]"
          data-ai-hint="mountain night"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-black/60 to-black" />
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-[90%] gap-4">
        {/* Main Hero Element: The Clock - Enhanced for Prominence */}
        <div className="flex flex-col items-center text-center">
          <div className="text-8xl font-black text-white tracking-tighter drop-shadow-[0_20px_60px_rgba(0,0,0,1)] leading-none mb-4 animate-in fade-in zoom-in-95 duration-1000">
            {timeString}
          </div>
          <div className="flex items-center gap-2 bg-white/5 px-6 py-2 rounded-full border border-white/10 backdrop-blur-3xl shadow-2xl">
            <Calendar className="w-4 h-4 text-accent" />
            <span className="text-[13px] text-white/90 font-black uppercase tracking-[0.25em]">{dayName} {dayNum} {monthName}</span>
          </div>
        </div>
        
        {nextPrayer && (
          <div className="w-full flex flex-col items-center gap-2 mt-4 bg-primary/10 p-5 rounded-[2rem] border border-primary/20 backdrop-blur-xl shadow-2xl">
            <div className="flex items-center gap-4 w-full justify-center">
              <div className="bg-primary/20 text-primary px-5 py-1.5 rounded-full border border-primary/30">
                <span className="text-[11px] font-black uppercase tracking-widest">الصلاة القادمة: {nextPrayer.name}</span>
              </div>
              <span className="text-3xl font-black text-accent drop-shadow-[0_0_20px_rgba(65,184,131,0.5)]">
                {convertTo12Hour(nextPrayer.time)}
              </span>
            </div>
            
            <div className="flex items-center gap-4 text-white/60">
              <div className="h-px w-10 bg-white/10" />
              <div className="text-[11px] font-black uppercase tracking-[0.4em] flex items-center gap-3">
                <Timer className="w-5 h-5 text-primary animate-pulse" /> متبقي {nextPrayer.countdown}
              </div>
              <div className="h-px w-10 bg-white/10" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
