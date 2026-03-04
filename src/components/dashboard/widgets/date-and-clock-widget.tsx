
"use client";

import { useEffect, useState, useMemo } from "react";
import { convertTo12Hour } from "@/lib/constants";
import { Timer, Calendar } from "lucide-react";
import { useMediaStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function DateAndClockWidget() {
  const [now, setNow] = useState<Date | null>(null);
  const { prayerTimes } = useMediaStore();
  
  useEffect(() => {
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
        const diff = currentMinutes - azanMins;
        return { type: "iqamah", name: p.name, text: `مضى ${diff} دقيقة من الأذان`, time: p.time };
      }
    }

    let next = prayers.find(p => timeToMinutes(p.time) > currentMinutes);
    if (!next) next = prayers[0];
    const targetMins = timeToMinutes(next.time);
    let diff = targetMins - currentMinutes;
    if (diff < 0) diff += 24 * 60;
    
    return { 
      type: "azan", 
      name: next.name, 
      text: `متبقي ${Math.floor(diff/60)}:${(diff%60).toString().padStart(2,'0')} لصلاة ${next.name}`,
      time: next.time
    };
  }, [now, prayerTimes]);

  if (!now) return null;

  const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateString = now.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-6 bg-black/40 rounded-[2.5rem] relative overflow-hidden text-center">
      {/* Clock on Top */}
      <div className="flex flex-col items-center gap-2 mb-4">
        <div className="text-7xl font-black text-white tracking-tighter drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)] tabular-nums">
          {timeString}
        </div>
        <div className="flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
          <Calendar className="w-3 h-3 text-accent" />
          <span className="text-[10px] text-white/90 font-black uppercase tracking-widest">{dateString}</span>
        </div>
      </div>

      {/* Prayer Info Bottom */}
      {prayerStatus && (
        <div className={cn(
          "w-full flex flex-col items-center gap-1 p-4 rounded-[2rem] border transition-all duration-500",
          prayerStatus.type === "iqamah" ? "bg-accent/20 border-accent/40" : "bg-primary/10 border-primary/20"
        )}>
          <div className="flex items-center gap-2">
            <Timer className={cn("w-4 h-4", prayerStatus.type === "iqamah" ? "text-accent animate-pulse" : "text-primary")} />
            <span className="text-[11px] font-black text-white uppercase tracking-wide">{prayerStatus.text}</span>
          </div>
          <span className="text-2xl font-black text-accent drop-shadow-lg">
            {convertTo12Hour(prayerStatus.time)}
          </span>
        </div>
      )}
    </div>
  );
}
