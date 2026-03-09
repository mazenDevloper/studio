
"use client";

import { useEffect, useState, useMemo } from "react";
import { convertTo12Hour } from "@/lib/constants";
import { Timer, Clock, BellRing, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMediaStore } from "@/lib/store";

export function PrayerCountdownCard() {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const { prayerTimes } = useMediaStore();
  
  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const prayerStatus = useMemo(() => {
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
      { name: "الفجر", time: pTimes.fajr, iqamah: 25 },
      { name: "الظهر", time: pTimes.dhuhr, iqamah: 20 },
      { name: "العصر", time: pTimes.asr, iqamah: 20 },
      { name: "المغرب", time: pTimes.maghrib, iqamah: 10 },
      { name: "العشاء", time: pTimes.isha, iqamah: 20 },
    ];

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

    let next = prayers.find(p => timeToMinutes(p.time) > currentMinutes);
    if (!next) next = prayers[0];

    const targetMins = timeToMinutes(next.time);
    let diffInMinutes = targetMins - currentMinutes - 1;
    if (diffInMinutes < 0) diffInMinutes += 24 * 60;
    
    const hours = Math.floor(diffInMinutes / 60);
    const mins = diffInMinutes % 60;
    const secs = 59 - now.getSeconds();

    const hStr = hours.toString().padStart(2, '0');
    const mStr = mins.toString().padStart(2, '0');
    const sStr = secs.toString().padStart(2, '0');

    return {
      type: "azan",
      name: next.name,
      remaining: hours > 0 ? `${hStr}:${mStr}:${sStr}` : `${mStr}:${sStr}`,
      time: convertTo12Hour(next.time)
    };
  }, [now, prayerTimes]);

  if (!mounted || !now || !prayerStatus) return (
    <div className="h-full w-full glass-panel rounded-[2.5rem] flex items-center justify-center animate-pulse">
      <Clock className="w-8 h-8 text-white/10" />
    </div>
  );

  const isIqamah = prayerStatus.type === "iqamah";
  const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <div className={cn(
      "h-full w-full glass-panel rounded-[2.5rem] p-4 flex flex-col justify-center items-center text-center transition-all duration-1000 relative overflow-hidden shadow-2xl",
      isIqamah 
        ? "bg-accent/25 border-accent/90 shadow-[0_0_100px_rgba(65,184,131,0.7)] ring-8 ring-accent/30" 
        : "bg-white/5 border-white/10"
    )}>
      {isIqamah && (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-accent/40 via-transparent to-transparent animate-pulse" />
          <div className="absolute top-4 right-4 animate-spin-slow opacity-50">
            <Sparkles className="w-8 h-8 text-accent drop-shadow-[0_0_25px_hsl(var(--accent))]" />
          </div>
        </>
      )}

      {/* Prominent Clock Layer */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 opacity-60 pointer-events-none">
        <span className="text-[11rem] font-black text-white tracking-tighter tabular-nums leading-none">{timeString}</span>
      </div>

      <div className="flex items-center gap-2 mb-1 relative z-10 mt-2">
        <div className={cn(
          "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border-2 flex items-center gap-2 transition-all duration-700",
          isIqamah 
            ? "bg-accent text-black border-white/60 shadow-[0_0_40px_rgba(16,185,129,1)]" 
            : "bg-primary/20 text-primary border-primary/40 shadow-glow"
        )}>
          {isIqamah ? <BellRing className="w-3.5 h-3.5 animate-pulse" /> : <Clock className="w-2.5 h-2.5" />}
          {isIqamah ? `صلاة ${prayerStatus.name}` : `الصلاة القادمة: ${prayerStatus.name}`}
        </div>
      </div>

      <div className={cn(
        "relative z-10 w-full h-24 flex items-center justify-center transition-transform duration-1000",
        isIqamah && "scale-110"
      )}>
        <svg className="w-full h-full overflow-visible drop-shadow-[0_10px_40px_rgba(0,0,0,0.9)]" viewBox="0 0 300 80">
          <defs>
            <linearGradient id="timerFill" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.8)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
            </linearGradient>
            <linearGradient id="timerStroke" x1="100%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="rgba(255,255,255,1)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
          </defs>
          <text 
            x="50%" 
            y="50%" 
            textAnchor="middle" 
            dominantBaseline="central"
            className="font-black tabular-nums tracking-tighter"
            style={{ fontSize: '70px' }}
            fill="url(#timerFill)"
            stroke="url(#timerStroke)"
            strokeWidth="0.8"
          >
            {prayerStatus.remaining}
          </text>
        </svg>
      </div>

      <div className="mt-2 flex flex-col items-center gap-2 relative z-10">
        <div className={cn(
          "flex items-center gap-2 font-black text-[9px] uppercase tracking-[0.2em]",
          isIqamah ? "text-black bg-white px-3 py-1 rounded-full shadow-[0_0_40px_white]" : "text-white/40"
        )}>
          <Timer className={cn("w-3 h-3", isIqamah ? "text-accent animate-pulse" : "text-primary")} />
          {isIqamah ? "الإقامة جارية" : `الأذان: ${prayerStatus.time}`}
        </div>
      </div>
    </div>
  );
}
