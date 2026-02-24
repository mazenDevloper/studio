
"use client";

import { useEffect, useState, useMemo } from "react";
import { prayerTimesData, convertTo12Hour } from "@/lib/constants";
import { Timer, Clock, BellRing } from "lucide-react";
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

    // Check if we are currently in an iqamah waiting period
    for (let p of prayers) {
      const azanMins = timeToMinutes(p.time);
      const iqamahMins = azanMins + p.iqamah;
      if (currentMinutes >= azanMins && currentMinutes < iqamahMins) {
        const remainingMinutes = iqamahMins - currentMinutes - 1;
        const remainingSeconds = 59 - now.getSeconds();
        return {
          type: "iqamah",
          name: p.name,
          remaining: `${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`,
          time: convertTo12Hour(p.time)
        };
      }
    }

    // Otherwise, find the next azan
    let next = prayers.find(p => timeToMinutes(p.time) > currentMinutes);
    if (!next) next = prayers[0];

    const targetMins = timeToMinutes(next.time);
    let diffInMinutes = targetMins - currentMinutes - 1;
    if (diffInMinutes < 0) diffInMinutes += 24 * 60;
    
    const hours = Math.floor(diffInMinutes / 60);
    const mins = diffInMinutes % 60;
    const secs = 59 - now.getSeconds();

    return {
      type: "azan",
      name: next.name,
      remaining: `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`,
      time: convertTo12Hour(next.time)
    };
  }, [now]);

  if (!mounted || !now || !prayerStatus) return (
    <div className="h-full w-full glass-panel rounded-[2.5rem] flex items-center justify-center animate-pulse">
      <Clock className="w-8 h-8 text-white/10" />
    </div>
  );

  const isIqamah = prayerStatus.type === "iqamah";

  return (
    <div className={cn(
      "h-full w-full glass-panel rounded-[2.5rem] p-6 flex flex-col justify-center items-center text-center transition-all duration-700 relative overflow-hidden",
      isIqamah ? "bg-accent/15 border-accent/40 shadow-[0_0_40px_rgba(16,185,129,0.2)]" : "bg-white/5"
    )}>
      {isIqamah && (
        <div className="absolute inset-0 bg-gradient-to-t from-accent/5 to-transparent animate-pulse" />
      )}

      <div className="flex items-center gap-2 mb-4 relative z-10">
        <div className={cn(
          "px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest border flex items-center gap-2",
          isIqamah 
            ? "bg-accent/20 text-accent border-accent/30 animate-bounce" 
            : "bg-primary/20 text-primary border-primary/20"
        )}>
          {isIqamah && <BellRing className="w-3 h-3" />}
          {isIqamah ? `انتظار الإقامة: صلاة ${prayerStatus.name}` : `الصلاة القادمة: ${prayerStatus.name}`}
        </div>
      </div>

      <div className={cn(
        "text-6xl font-black tracking-tighter drop-shadow-2xl font-mono relative z-10",
        isIqamah ? "text-accent" : "text-white"
      )}>
        {prayerStatus.remaining}
      </div>

      <div className="mt-4 flex flex-col items-center gap-1 relative z-10">
        <div className="flex items-center gap-2 text-white/40 font-bold text-xs uppercase tracking-[0.2em]">
          <Timer className={cn("w-4 h-4", isIqamah ? "text-accent animate-spin-slow" : "text-primary")} />
          {isIqamah ? "تقام الصلاة الآن" : `موعد الأذان: ${prayerStatus.time}`}
        </div>
        {isIqamah && (
          <span className="text-[10px] text-accent font-black uppercase tracking-widest mt-1">
            يرجى الاستعداد للصلاة
          </span>
        )}
      </div>
    </div>
  );
}
