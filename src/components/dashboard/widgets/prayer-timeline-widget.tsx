
"use client";

import { useMemo, useEffect, useState } from "react";
import { convertTo12Hour, JSONBIN_MASTER_KEY } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Timer, BellRing, Sun, Sunrise, Sunset, Moon, Sparkles, CloudSun } from "lucide-react";
import { useMediaStore } from "@/lib/store";

/**
 * PrayerTimelineWidget v210.0 - Sovereign High-Visibility Daily Bar
 * Features: Increased opacity and clarity for inactive prayers so all times are clear.
 */
export function PrayerTimelineWidget() {
  const [now, setNow] = useState<Date | null>(null);
  const [cloudPrayers, setCloudPrayers] = useState<any[]>([]);
  const prayerSettings = useMediaStore(state => state.prayerSettings);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    
    async function fetchPrayers() {
      try {
        const res = await fetch(`https://api.jsonbin.io/v3/b/69a00f6eae596e708f4b7291/latest`, {
          headers: { 'X-Master-Key': JSONBIN_MASTER_KEY },
          cache: 'no-store'
        });
        if (res.ok) {
          const record = (await res.json()).record;
          setCloudPrayers(Array.isArray(record) ? record : record.prayers || []);
        }
      } catch (e) {}
    }
    fetchPrayers();
    return () => clearInterval(timer);
  }, []);

  const { prayers, activeIndex, currentStatus } = useMemo(() => {
    if (!now || cloudPrayers.length === 0) return { prayers: [], activeIndex: -1, currentStatus: null };
    
    const dateStr = now.toISOString().split('T')[0];
    const data = cloudPrayers.find(p => p.date === dateStr) || cloudPrayers[0];
    
    if (!data) return { prayers: [], activeIndex: -1, currentStatus: null };

    const isFriday = now.getDay() === 5;
    const list = [
      { name: "الفجر", id: "fajr", time: data.fajr, iqamah: 25, icon: Sunrise, color: "text-blue-400" },
      { name: isFriday ? "الجمعة" : "الظهر", id: "dhuhr", time: data.dhuhr, iqamah: 20, icon: Sun, color: "text-yellow-500" },
      { name: "العصر", id: "asr", time: data.asr, iqamah: 20, icon: CloudSun, color: "text-orange-400" },
      { name: "المغرب", id: "maghrib", time: data.maghrib, iqamah: 10, icon: Sunset, color: "text-red-400" },
      { name: "العشاء", id: "isha", time: data.isha, iqamah: 20, icon: Moon, color: "text-indigo-400" },
    ];

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const tToM = (t: string) => { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + m; };

    let idx = list.findIndex(p => tToM(p.time) > currentMinutes);
    if (idx === -1) idx = 0;

    const prevIdx = idx === 0 ? list.length - 1 : idx - 1;
    const prevPrayer = list[prevIdx];
    const prevAzanMins = tToM(prevPrayer.time);
    const iqamahTimeMins = prevAzanMins + prevPrayer.iqamah;
    
    let status = null;
    let finalIndex = idx;

    if (currentMinutes >= prevAzanMins && currentMinutes < iqamahTimeMins) {
      finalIndex = prevIdx;
      const remaining = iqamahTimeMins - currentMinutes - 1;
      const secs = 59 - now.getSeconds();
      status = { type: 'iqamah', remaining: `${remaining.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}` };
    }

    const processed = list.map((p) => {
      const azanMins = tToM(p.time);
      const iqamahH = Math.floor((azanMins + p.iqamah) / 60);
      const iqamahM = (azanMins + p.iqamah) % 60;
      return { ...p, iqamahTime: `${iqamahH % 24}:${iqamahM.toString().padStart(2, '0')}` };
    });

    return { prayers: processed, activeIndex: finalIndex, currentStatus: status };
  }, [now, cloudPrayers]);

  if (!now || prayers.length === 0) return (
    <div className="w-full h-32 flex items-center justify-center bg-black/40 rounded-[2.5rem] border border-white/5 animate-pulse">
      <Sparkles className="w-8 h-8 text-primary/20" />
    </div>
  );

  return (
    <div className="w-full bg-black/40 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 p-2 overflow-hidden shadow-2xl relative transition-none min-h-[160px]">
      <div className="flex flex-nowrap items-center justify-between gap-4 p-2 h-full overflow-x-auto no-scrollbar">
        {prayers.map((prayer, idx) => {
          const isActive = idx === activeIndex;
          const isCurrentIqamah = isActive && currentStatus?.type === 'iqamah';
          const Icon = prayer.icon;
          
          return (
            <div key={prayer.id} className={cn(
              "flex-1 min-w-[190px] flex items-center gap-4 transition-all duration-300 relative rounded-[2.2rem] p-4 border-2",
              isActive 
                ? "bg-white/15 border-white/30 scale-105 z-10 shadow-[0_0_60px_rgba(0,136,255,0.3)]" 
                : "bg-white/5 border-white/5 opacity-80 hover:opacity-100"
            )}>
              {isActive && <div className={cn("absolute inset-0 blur-3xl opacity-20 rounded-full", isCurrentIqamah ? "bg-emerald-500" : "bg-primary")} />}
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center relative overflow-hidden shrink-0", isActive ? "bg-black/60 border border-white/20 shadow-glow" : "bg-white/5")}>
                <Icon className={cn("w-7 h-7", isActive ? prayer.color : "text-white/40")} />
              </div>
              <div className="flex flex-col flex-1 min-w-0 text-right">
                <span className={cn("text-[11px] font-black uppercase tracking-[0.25em] truncate mb-0.5", isActive ? "text-white" : "text-white/60")}>{prayer.name}</span>
                <div className="flex items-baseline gap-2">
                  <span className={cn("text-3xl font-black tabular-nums tracking-tighter drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]", isActive ? "text-white" : "text-white/80")}>{convertTo12Hour(prayer.time)}</span>
                </div>
                {isActive && (
                  <div className={cn("mt-1.5 flex items-center gap-2 px-3 py-1 rounded-full border text-[8px] font-black uppercase tracking-widest w-fit", isCurrentIqamah ? "bg-emerald-500/30 border-emerald-400/50 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]" : "bg-white/10 border-white/10 text-white/50")}>
                    {isCurrentIqamah ? <><BellRing className="w-3.5 h-3.5 animate-pulse" />الإقامة {currentStatus.remaining}</> : <><Timer className="w-3.5 h-3.5" />الإقامة {convertTo12Hour(prayer.iqamahTime)}</>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="absolute bottom-1 right-8 opacity-5 pointer-events-none">
        <span className="text-[8px] font-black text-white uppercase tracking-[1.2em]">69A00F6E FULL TIMELINE SYNC</span>
      </div>
    </div>
  );
}
