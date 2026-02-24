
"use client";

import { useMemo, useEffect, useState } from "react";
import { prayerTimesData, convertTo12Hour } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Play, Clock } from "lucide-react";

export function PrayerTimelineWidget() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const pTimes = useMemo(() => {
    if (!now) return [];
    const dateStr = `2026-02-${now.getDate().toString().padStart(2, '0')}`;
    const data = prayerTimesData.find(p => p.date === dateStr) || prayerTimesData[0];
    
    return [
      { name: "الفجر", time: data.fajr, iqamah: "5:58" },
      { name: "الظهر", time: data.dhuhr, iqamah: "1:02" },
      { name: "العصر", time: data.asr, iqamah: "4:23" },
      { name: "المغرب", time: data.maghrib, iqamah: "6:38" },
      { name: "العشاء", time: data.isha, iqamah: "8:01" },
    ];
  }, [now]);

  if (!now) return null;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const timeToMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  return (
    <div className="w-full flex items-center justify-between px-6 py-1 overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-8 flex-1 justify-around">
        {pTimes.map((prayer) => {
          const prayerMins = timeToMinutes(prayer.time);
          const isActive = currentMinutes >= prayerMins && currentMinutes < prayerMins + 90;
          
          return (
            <div key={prayer.name} className={cn(
              "flex items-center gap-4 transition-all duration-700",
              isActive ? "scale-110 opacity-100" : "opacity-30 grayscale"
            )}>
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">{prayer.name}</span>
                <span className={cn(
                  "text-lg font-black tracking-tighter",
                  isActive ? "text-primary drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" : "text-white"
                )}>
                  {convertTo12Hour(prayer.time)}
                </span>
              </div>
              {isActive && (
                <div className="flex flex-col border-l border-white/20 pl-4 animate-in fade-in slide-in-from-left-2">
                  <div className="flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5 text-accent" />
                    <span className="text-[9px] font-black text-accent uppercase tracking-widest">الإقامة</span>
                  </div>
                  <span className="text-base font-black text-accent">{prayer.iqamah}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
