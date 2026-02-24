
"use client";

import { useMemo, useEffect, useState } from "react";
import { prayerTimesData, convertTo12Hour } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Clock, Star } from "lucide-react";

export function PrayerTimelineWidget() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { prayers, activeIndex } = useMemo(() => {
    if (!now) return { prayers: [], activeIndex: -1 };
    
    const day = now.getDate().toString().padStart(2, '0');
    const dateStr = `2026-02-${day}`;
    const data = prayerTimesData.find(p => p.date === dateStr) || prayerTimesData[0];
    
    const list = [
      { name: "الفجر", time: data.fajr, iqamah: 25 },
      { name: "الظهر", time: data.dhuhr, iqamah: 20 },
      { name: "العصر", time: data.asr, iqamah: 20 },
      { name: "المغرب", time: data.maghrib, iqamah: 5 },
      { name: "العشاء", time: data.isha, iqamah: 20 },
    ];

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const timeToMinutes = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    // Find the index of the next or current prayer
    let nextIdx = list.findIndex(p => timeToMinutes(p.time) > currentMinutes);
    if (nextIdx === -1) nextIdx = 0;

    // Check if we are currently in an "active" window (after azan but before iqamah)
    const prevIdx = nextIdx === 0 ? list.length - 1 : nextIdx - 1;
    const prevPrayer = list[prevIdx];
    const prevAzanMins = timeToMinutes(prevPrayer.time);
    const prevIqamahMins = prevAzanMins + prevPrayer.iqamah;
    
    let finalActiveIdx = nextIdx;
    if (currentMinutes >= prevAzanMins && currentMinutes < prevIqamahMins) {
      finalActiveIdx = prevIdx;
    }

    const processed = list.map((p, idx) => {
      const azanMins = timeToMinutes(p.time);
      const iqamahH = Math.floor((azanMins + p.iqamah) / 60);
      const iqamahM = (azanMins + p.iqamah) % 60;
      return {
        ...p,
        iqamahTime: `${iqamahH}:${iqamahM.toString().padStart(2, '0')}`
      };
    });

    return { prayers: processed, activeIndex: finalActiveIdx };
  }, [now]);

  if (!now || prayers.length === 0) return null;

  return (
    <div className="w-full flex items-center justify-between px-6 py-2 overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-10 flex-1 justify-around">
        {prayers.map((prayer, idx) => {
          const isActive = idx === activeIndex;
          
          return (
            <div key={prayer.name} className={cn(
              "flex items-center gap-5 transition-all duration-1000 relative",
              isActive ? "scale-110 opacity-100" : "opacity-30 grayscale"
            )}>
              {isActive && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 animate-pulse">
                  <Star className="w-3 h-3 text-accent fill-current shadow-glow" />
                </div>
              )}
              
              <div className="flex flex-col items-center">
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-[0.2em] mb-1",
                  isActive ? "text-accent" : "text-white/40"
                )}>
                  {prayer.name}
                </span>
                <span className={cn(
                  "text-xl font-black tracking-tighter",
                  isActive ? "text-primary drop-shadow-[0_0_15px_rgba(59,130,246,0.8)]" : "text-white"
                )}>
                  {convertTo12Hour(prayer.time)}
                </span>
              </div>

              {isActive && (
                <div className="flex flex-col border-l-2 border-accent/30 pl-5 py-1 animate-in fade-in slide-in-from-left-4 duration-700">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
                    <span className="text-[10px] font-black text-accent uppercase tracking-widest">وقت الإقامة</span>
                  </div>
                  <span className="text-lg font-black text-accent drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">
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
