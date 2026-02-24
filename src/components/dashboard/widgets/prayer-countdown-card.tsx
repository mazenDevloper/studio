
"use client";

import { useEffect, useState, useMemo } from "react";
import { prayerTimesData, convertTo12Hour } from "@/lib/constants";
import { Timer, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export function PrayerCountdownCard() {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  
  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const prayerStatus = useMemo(() => {
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
      { name: "الفجر", time: pTimes.fajr, iqamah: 25 },
      { name: "الظهر", time: pTimes.dhuhr, iqamah: 20 },
      { name: "العصر", time: pTimes.asr, iqamah: 20 },
      { name: "المغرب", time: pTimes.maghrib, iqamah: 5 },
      { name: "العشاء", time: pTimes.isha, iqamah: 20 },
    ];

    for (let p of prayers) {
      const azanMins = timeToMinutes(p.time);
      const iqamahMins = azanMins + p.iqamah;
      if (currentMinutes >= azanMins && currentMinutes < iqamahMins) {
        const remaining = iqamahMins - currentMinutes;
        return {
          type: "iqamah",
          name: p.name,
          remaining: `${remaining.toString().padStart(2, '0')}:${(59 - now.getSeconds()).toString().padStart(2, '0')}`,
          time: convertTo12Hour(p.time)
        };
      }
    }

    let next = prayers.find(p => timeToMinutes(p.time) > currentMinutes);
    if (!next) next = prayers[0];

    const targetMins = timeToMinutes(next.time);
    let diff = targetMins - currentMinutes;
    if (diff < 0) diff += 24 * 60;
    
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;

    return {
      type: "azan",
      name: next.name,
      remaining: `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${(59 - now.getSeconds()).toString().padStart(2, '0')}`,
      time: convertTo12Hour(next.time)
    };
  }, [now]);

  if (!mounted || !now || !prayerStatus) return (
    <div className="h-full w-full glass-panel rounded-[2.5rem] flex items-center justify-center animate-pulse">
      <Clock className="w-8 h-8 text-white/10" />
    </div>
  );

  const isActive = prayerStatus.type === "iqamah";

  return (
    <div className={cn(
      "h-full w-full glass-panel rounded-[2.5rem] p-6 flex flex-col justify-center items-center text-center transition-all duration-500",
      isActive ? "bg-accent/10 border-accent/20" : "bg-white/5"
    )}>
      <div className="flex items-center gap-2 mb-2">
        <div className={cn(
          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
          isActive ? "bg-accent/20 text-accent border-accent/20 animate-pulse" : "bg-primary/20 text-primary border-primary/20"
        )}>
          {isActive ? `انتظار الإقامة: ${prayerStatus.name}` : `الصلاة القادمة: ${prayerStatus.name}`}
        </div>
      </div>

      <div className="text-5xl font-black text-white tracking-tighter drop-shadow-2xl font-mono">
        {prayerStatus.remaining}
      </div>

      <div className="mt-2 flex items-center gap-2 text-white/40 font-bold text-xs uppercase tracking-widest">
        <Timer className={cn("w-3 h-3", isActive ? "text-accent" : "text-primary")} />
        {isActive ? "تقام قريباً" : `الأذان عند ${prayerStatus.time}`}
      </div>
    </div>
  );
}
