
"use client";

import { useEffect, useState, useMemo } from "react";
import { prayerTimesData } from "@/lib/constants";
import { Sun, Moon, Clock, Calendar } from "lucide-react";

export function DateAndClockWidget() {
  const [now, setNow] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hijriDate = "٥ رمضان ١٤٤٧ هـ"; // Simplified mock for demo
  const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dayName = now.toLocaleDateString('ar-EG', { weekday: 'long' });
  const dateString = now.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });

  const nextPrayer = useMemo(() => {
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

    // Calculate countdown
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

  return (
    <div className="h-full flex flex-col gap-6">
      {/* Date Card */}
      <div className="flex-1 bg-zinc-900/60 backdrop-blur-3xl rounded-[2.5rem] border border-white/5 p-10 flex flex-col items-center justify-center relative overflow-hidden group shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
        <div className="flex flex-col items-center gap-2 mb-8 text-center">
           <h3 className="text-4xl font-bold font-headline text-white">{dayName}</h3>
           <p className="text-lg text-primary font-bold uppercase tracking-widest">{dateString} | {hijriDate}</p>
        </div>
        <div className="relative">
           <div className="text-[120px] font-bold font-headline text-white/10 select-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 leading-none">
             {now.getDate()}
           </div>
           <div className="text-6xl font-bold font-headline text-white z-10 relative flex flex-col items-center">
             {now.getDate()}
             <span className="text-xl uppercase tracking-tighter opacity-40 mt-[-10px]">February</span>
           </div>
        </div>
      </div>

      {/* Clock Card */}
      <div className="flex-1 bg-zinc-900/60 backdrop-blur-3xl rounded-[2.5rem] border border-white/5 p-10 flex flex-col items-center justify-center relative shadow-2xl">
        <div className="absolute top-6 right-8">
          <Sun className="w-8 h-8 text-yellow-500 animate-pulse" />
        </div>
        <div className="text-8xl font-bold font-headline text-white tracking-tighter mb-4">
          {timeString}
        </div>
        <div className="flex flex-col items-center gap-1">
           <p className="text-xl font-bold text-orange-400 font-headline">إقامة صلاة {nextPrayer.name} في:</p>
           <div className="text-4xl font-bold font-headline text-white tracking-widest bg-orange-400/20 px-6 py-2 rounded-2xl border border-orange-400/30">
             {nextPrayer.countdown}
           </div>
        </div>
      </div>
    </div>
  );
}
