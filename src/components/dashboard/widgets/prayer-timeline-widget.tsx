
"use client";

import { useMemo, useEffect, useState } from "react";
import { convertTo12Hour } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Timer } from "lucide-react";
import { useMediaStore } from "@/lib/store";

export function PrayerTimelineWidget() {
  const [now, setNow] = useState<Date | null>(null);
  const prayerTimes = useMediaStore(state => state.prayerTimes);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { prayers, activeIndex } = useMemo(() => {
    if (!now || !prayerTimes || prayerTimes.length === 0) return { prayers: [], activeIndex: -1 };
    
    const dateStr = now.toISOString().split('T')[0];
    const data = prayerTimes.find(p => p.date === dateStr) || 
                 prayerTimes.find(p => p.date.endsWith(`-${now.getDate().toString().padStart(2, '0')}`)) || 
                 prayerTimes[0];
    
    const isFriday = now.getDay() === 5;
    const list = [
      { name: "الفجر", time: data.fajr, iqamah: 25 },
      { name: isFriday ? "صلاة الجمعة" : "الظهر", time: data.dhuhr, iqamah: 20 },
      { name: "العصر", time: data.asr, iqamah: 20 },
      { name: "المغرب", time: data.maghrib, iqamah: 10 },
      { name: "العشاء", time: data.isha, iqamah: 20 },
    ];

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const timeToMinutes = (t: string) => {
      if (!t) return 0;
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    let idx = list.findIndex(p => timeToMinutes(p.time) > currentMinutes);
    if (idx === -1) idx = 0;

    const prevIdx = idx === 0 ? list.length - 1 : idx - 1;
    const prevPrayer = list[prevIdx];
    const prevAzanMins = timeToMinutes(prevPrayer.time);
    const graceTime = prevAzanMins + prevPrayer.iqamah + 20;

    let finalIndex = idx;
    if (currentMinutes < graceTime && currentMinutes >= prevAzanMins) {
      finalIndex = prevIdx;
    }

    const processed = list.map((p) => {
      const azanMins = timeToMinutes(p.time);
      const iqamahH = Math.floor((azanMins + p.iqamah) / 60);
      const iqamahM = (azanMins + p.iqamah) % 60;
      return {
        ...p,
        iqamahTime: `${iqamahH % 24}:${iqamahM.toString().padStart(2, '0')}`
      };
    });

    return { prayers: processed, activeIndex: finalIndex };
  }, [now, prayerTimes]);

  if (!now || prayers.length === 0) return null;

  return (
    <div className="w-full flex items-center justify-between px-6 py-4 overflow-x-auto no-scrollbar rounded-[2.5rem] transition-all duration-0 premium-glass">
      <div className="flex items-center gap-10 flex-1 justify-around">
        {prayers.map((prayer, idx) => {
          const isActive = idx === activeIndex;
          
          return (
            <div key={prayer.name} className={cn(
              "flex items-center gap-5 transition-all duration-0 relative",
              isActive ? "scale-110 opacity-100" : "opacity-30 grayscale"
            )}>
              <div className={cn(
                "flex flex-col items-center p-4 rounded-3xl transition-all duration-0 border-2 border-transparent relative overflow-hidden min-w-[100px]",
                isActive && "bg-accent/20 border-accent/60 ring-4 ring-accent/30 shadow-[0_0_60px_rgba(65,184,131,0.8)]"
              )}>
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-t from-accent/20 via-transparent to-transparent animate-pulse" />
                )}
                <span className={cn(
                  "text-sm font-black uppercase tracking-[0.2em] mb-1 relative z-10",
                  isActive ? "text-accent" : "text-white/60"
                )}>
                  {prayer.name}
                </span>
                <span className={cn(
                  "text-xl font-black tracking-tighter relative z-10 tabular-nums",
                  isActive ? "text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.9)]" : "text-white/40"
                )}>
                  {convertTo12Hour(prayer.time)}
                </span>
              </div>

              {isActive && (
                <div className="flex flex-col border-l-4 border-accent/80 pl-8 py-3 animate-in fade-in slide-in-from-left-6 duration-300 bg-accent/25 rounded-r-[2.5rem] px-8 shadow-[0_0_50px_rgba(65,184,131,0.5)] ring-2 ring-accent/20">
                  <div className="flex items-center gap-3">
                    <Timer className="w-5 h-5 text-accent" />
                    <span className="text-[11px] font-black text-accent uppercase tracking-[0.3em] drop-shadow-[0_0_15px_rgba(65,184,131,0.7)]">الإقامة</span>
                  </div>
                  <span className="text-3xl font-black text-accent drop-shadow-[0_0_30px_rgba(16,185,129,1)] mt-1 tabular-nums">
                    {convertTo12Hour(prayer.iqamahTime)}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
