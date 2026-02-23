
"use client";

import { useMemo, useEffect, useState } from "react";
import { prayerTimesData, convertTo12Hour } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function PrayerTimelineWidget() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const pTimes = useMemo(() => {
    const dateStr = `2026-02-${now.getDate().toString().padStart(2, '0')}`;
    const data = prayerTimesData.find(p => p.date === dateStr) || prayerTimesData[0];
    
    return [
      { name: "الفجر", time: data.fajr, iqamah: "5:58" },
      { name: "الضحى", time: "07:15", iqamah: "" },
      { name: "الظهر", time: data.dhuhr, iqamah: "1:02" },
      { name: "العصر", time: data.asr, iqamah: "4:23" },
      { name: "المغرب", time: data.maghrib, iqamah: "6:38" },
      { name: "العشاء", time: data.isha, iqamah: "8:01" },
    ];
  }, [now]);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const timeToMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  return (
    <div className="w-full bg-zinc-950/80 backdrop-blur-3xl border border-white/5 rounded-[2rem] p-6 flex items-center gap-4 overflow-x-auto shadow-2xl">
      <div className="flex-shrink-0 px-6 border-r border-white/10 flex flex-col items-center">
        <button className="bg-primary/20 text-primary border border-primary/40 px-6 py-3 rounded-2xl font-bold text-lg active-glow transition-all active:scale-95">
          تشغيل الكل
        </button>
      </div>
      
      <div className="flex-1 flex items-center justify-around gap-8">
        {pTimes.map((prayer) => {
          const prayerMins = timeToMinutes(prayer.time);
          const isActive = currentMinutes >= prayerMins && currentMinutes < prayerMins + 90;
          
          return (
            <div key={prayer.name} className={cn(
              "flex flex-col items-center gap-1 transition-all",
              isActive ? "scale-110 opacity-100" : "opacity-40"
            )}>
              <span className="text-xs font-bold text-white/40 uppercase tracking-widest">{prayer.name}</span>
              <div className={cn(
                "px-6 py-2 rounded-xl flex flex-col items-center",
                isActive ? "bg-primary/20 border border-primary/40 active-glow" : "bg-white/5 border border-white/5"
              )}>
                <span className="text-xl font-bold font-headline text-white">{convertTo12Hour(prayer.time)}</span>
                {prayer.iqamah && (
                  <span className="text-[10px] font-bold text-orange-400">الإقامة: {prayer.iqamah}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="flex-shrink-0 flex items-center gap-4 border-l border-white/10 pl-6">
        <div className="bg-teal-500/20 text-teal-400 border border-teal-500/40 px-6 py-3 rounded-2xl font-bold text-sm">
          الرقية الشرعية
        </div>
        <div className="bg-blue-500/20 text-blue-400 border border-blue-500/40 px-6 py-3 rounded-2xl font-bold text-sm">
          الأذكار
        </div>
      </div>
    </div>
  );
}
