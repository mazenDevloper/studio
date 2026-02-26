
"use client";

import { useMemo, useEffect, useState } from "react";
import { convertTo12Hour } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Timer, Sparkles } from "lucide-react";
import { useMediaStore } from "@/lib/store";

export function PrayerTimelineWidget() {
  const [now, setNow] = useState<Date | null>(null);
  const { prayerTimes } = useMediaStore();

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { prayers, activeIndex } = useMemo(() => {
    if (!now || !prayerTimes || prayerTimes.length === 0) return { prayers: [], activeIndex: -1 };
    
    const day = now.getDate().toString().padStart(2, '0');
    const dateStr = `2026-02-${day}`;
    const data = prayerTimes.find(p => p.date === dateStr) || prayerTimes[0];
    
    const list = [
      { name: "الفجر", time: data.fajr, iqamah: 25 },
      { name: "الظهر", time: data.dhuhr, iqamah: 20 },
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

    let nextIdx = list.findIndex(p => timeToMinutes(p.time) > currentMinutes);
    if (nextIdx === -1) nextIdx = 0;

    const processed = list.map((p, idx) => {
      const azanMins = timeToMinutes(p.time);
      const iqamahH = Math.floor((azanMins + p.iqamah) / 60);
      const iqamahM = (azanMins + p.iqamah) % 60;
      return {
        ...p,
        iqamahTime: `${iqamahH}:${iqamahM.toString().padStart(2, '0')}`
      };
    });

    return { prayers: processed, activeIndex: nextIdx };
  }, [now, prayerTimes]);

  if (!now || prayers.length === 0) return null;

  return (
    <div className="w-full flex items-center justify-between px-6 py-2 overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-10 flex-1 justify-around">
        {prayers.map((prayer, idx) => {
          const isNext = idx === activeIndex;
          
          return (
            <div key={prayer.name} className={cn(
              "flex items-center gap-5 transition-all duration-1000 relative",
              isNext ? "scale-110 opacity-100" : "opacity-30 grayscale"
            )}>
              {isNext && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 animate-bounce z-20">
                  <span className="text-[20px]">✨</span>
                </div>
              )}
              
              <div className={cn(
                "flex flex-col items-center p-4 rounded-3xl transition-all duration-700 border-2 border-transparent relative overflow-hidden",
                isNext && "bg-accent/20 border-accent/60 ring-4 ring-accent/30 shadow-[0_0_60px_rgba(65,184,131,0.8)]"
              )}>
                {isNext && (
                  <div className="absolute inset-0 bg-gradient-to-t from-accent/20 via-transparent to-transparent animate-pulse" />
                )}
                <span className={cn(
                  "text-[11px] font-black uppercase tracking-[0.3em] mb-1 relative z-10",
                  isNext ? "text-accent animate-pulse" : "text-white/40"
                )}>
                  {prayer.name}
                </span>
                <span className={cn(
                  "text-3xl font-black tracking-tighter relative z-10",
                  isNext ? "text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.9)]" : "text-white/60"
                )}>
                  {convertTo12Hour(prayer.time)}
                </span>
              </div>

              {isNext && (
                <div className="flex flex-col border-l-4 border-accent/80 pl-8 py-3 animate-in fade-in slide-in-from-left-6 duration-1000 bg-accent/25 rounded-r-[2.5rem] px-8 shadow-[0_0_50px_rgba(65,184,131,0.5)] ring-2 ring-accent/20">
                  <div className="flex items-center gap-3">
                    <Timer className="w-6 h-6 text-accent" />
                    <span className="text-[12px] font-black text-accent uppercase tracking-[0.4em] drop-shadow-[0_0_15px_rgba(65,184,131,0.7)]">الإقامة المشعة</span>
                  </div>
                  <span className="text-4xl font-black text-accent drop-shadow-[0_0_30px_rgba(16,185,129,1)] mt-1">
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
