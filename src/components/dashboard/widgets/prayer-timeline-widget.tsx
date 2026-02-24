"use client";

import { useMemo, useEffect, useState } from "react";
import { prayerTimesData, convertTo12Hour } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Play } from "lucide-react";

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
    <div className="w-full glass-panel rounded-3xl p-4 flex items-center gap-4 overflow-x-auto">
      <div className="flex-shrink-0 px-4 border-r border-white/10">
        <button className="bg-primary/20 text-primary border border-primary/40 px-6 py-2 rounded-2xl font-bold text-sm hover:bg-primary transition-all flex items-center gap-2 group">
          <Play className="w-4 h-4 fill-current group-hover:fill-white" />
          تشغيل الكل
        </button>
      </div>
      
      <div className="flex-1 flex items-center justify-around gap-6">
        {pTimes.map((prayer) => {
          const prayerMins = timeToMinutes(prayer.time);
          const isActive = currentMinutes >= prayerMins && currentMinutes < prayerMins + 90;
          
          return (
            <div key={prayer.name} className={cn(
              "flex items-center gap-4 transition-all duration-500",
              isActive ? "scale-110 opacity-100" : "opacity-40"
            )}>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{prayer.name}</span>
                <span className="text-xl font-black text-white">{convertTo12Hour(prayer.time)}</span>
              </div>
              {isActive && (
                <div className="flex flex-col border-l border-white/20 pl-4">
                  <span className="text-[10px] font-bold text-accent uppercase">الإقامة</span>
                  <span className="text-lg font-bold text-accent">{prayer.iqamah}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}