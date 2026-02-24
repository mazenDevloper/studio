
"use client";

import { useMemo, useEffect, useState } from "react";
import { prayerTimesData, convertTo12Hour } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Clock, Star, Sparkles, Timer } from "lucide-react";

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
      { name: "المغرب", time: data.maghrib, iqamah: 10 },
      { name: "العشاء", time: data.isha, iqamah: 20 },
    ];

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const timeToMinutes = (t: string) => {
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
  }, [now]);

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
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 animate-bounce">
                  <Sparkles className="w-6 h-6 text-accent fill-current drop-shadow-[0_0_20px_hsl(var(--accent))]" />
                </div>
              )}
              
              <div className={cn(
                "flex flex-col items-center p-3 rounded-2xl transition-all duration-500 border border-transparent",
                isNext && "bg-accent/10 border-accent/40 ring-2 ring-accent/60 shadow-[0_0_50px_rgba(65,184,131,0.6)]"
              )}>
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-[0.2em] mb-1",
                  isNext ? "text-accent animate-pulse" : "text-white/40"
                )}>
                  {prayer.name}
                </span>
                <span className={cn(
                  "text-2xl font-black tracking-tighter",
                  isNext ? "text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]" : "text-white/60"
                )}>
                  {convertTo12Hour(prayer.time)}
                </span>
              </div>

              {isNext && (
                <div className="flex flex-col border-l-2 border-accent/60 pl-6 py-2 animate-in fade-in slide-in-from-left-4 duration-700 bg-accent/15 rounded-r-2xl px-5 shadow-[0_0_30px_rgba(65,184,131,0.3)]">
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-accent animate-spin-slow" />
                    <span className="text-[10px] font-black text-accent uppercase tracking-[0.3em] drop-shadow-[0_0_10px_rgba(65,184,131,0.5)]">الإقامة المشعة</span>
                  </div>
                  <span className="text-2xl font-black text-accent drop-shadow-[0_0_20px_rgba(16,185,129,0.9)]">
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
