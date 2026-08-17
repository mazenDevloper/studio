
"use client";

import { useMemo, useEffect, useState } from "react";
import { convertTo12Hour } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Timer, BellRing, Sun, Sunrise, Sunset, Moon, Sparkles, CloudSun, Edit3, Plus, Minus, Check } from "lucide-react";
import { useMediaStore } from "@/lib/store";

/**
 * PrayerTimelineWidget v250.0 - Interactive Iqamah Hub
 * Features: Inline Iqamah Editing with Pencil Icon + Sovereign Centering focus.
 */
export function PrayerTimelineWidget() {
  const [now, setNow] = useState<Date | null>(null);
  const { prayerTimes, prayerSettings, updatePrayerSetting } = useMediaStore();
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { prayers, activeIndex, currentStatus } = useMemo(() => {
    if (!now || !prayerTimes || prayerTimes.length === 0) return { prayers: [], activeIndex: -1, currentStatus: null };
    
    const dateStr = now.toISOString().split('T')[0];
    const data = prayerTimes.find(p => p.date === dateStr) || prayerTimes[0];
    
    if (!data) return { prayers: [], activeIndex: -1, currentStatus: null };

    const isFriday = now.getDay() === 5;
    const list = [
      { name: "الفجر", id: "fajr", time: data.fajr, icon: Sunrise, color: "text-blue-400" },
      { name: isFriday ? "الجمعة" : "الظهر", id: "dhuhr", time: data.dhuhr, icon: Sun, color: "text-yellow-500" },
      { name: "العصر", id: "asr", time: data.asr, icon: CloudSun, color: "text-orange-400" },
      { name: "المغرب", id: "maghrib", time: data.maghrib, icon: Sunset, color: "text-red-400" },
      { name: "العشاء", id: "isha", time: data.isha, icon: Moon, color: "text-indigo-400" },
    ];

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const tToM = (t: string) => { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + m; };

    let idx = list.findIndex(p => tToM(p.time) > currentMinutes);
    if (idx === -1) idx = 0;

    const prevIdx = idx === 0 ? list.length - 1 : idx - 1;
    const prevPrayer = list[prevIdx];
    const pSet = prayerSettings.find(s => s.id === prevPrayer.id);
    const prevAzanMins = tToM(prevPrayer.time);
    const iqamahTimeMins = prevAzanMins + (pSet?.iqamahDuration || 20);
    
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
      const pSetting = prayerSettings.find(s => s.id === p.id);
      const dur = pSetting?.iqamahDuration || 0;
      const iqamahH = Math.floor((azanMins + dur) / 60);
      const iqamahM = (azanMins + dur) % 60;
      return { ...p, iqamahDuration: dur, iqamahTime: `${iqamahH % 24}:${iqamahM.toString().padStart(2, '0')}` };
    });

    return { prayers: processed, activeIndex: finalIndex, currentStatus: status };
  }, [now, prayerTimes, prayerSettings]);

  const handleAdjustIqamah = (id: string, delta: number) => {
    const current = prayerSettings.find(s => s.id === id)?.iqamahDuration || 0;
    updatePrayerSetting(id, { iqamahDuration: Math.max(0, current + delta) });
  };

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
          const isEditing = editingId === prayer.id;
          const Icon = prayer.icon;
          
          return (
            <div 
              key={prayer.id} 
              className={cn(
                "flex-1 min-w-[210px] flex items-center gap-4 transition-all duration-300 relative rounded-[2.2rem] p-4 border-2 focusable group outline-none",
                isActive 
                  ? "bg-white/15 border-white/30 scale-105 z-10 shadow-[0_0_60px_rgba(0,136,255,0.3)]" 
                  : "bg-white/5 border-white/5"
              )}
              tabIndex={0}
              data-nav-id={`prayer-card-${prayer.id}`}
            >
              {isActive && <div className={cn("absolute inset-0 blur-3xl opacity-20 rounded-full", isCurrentIqamah ? "bg-emerald-500" : "bg-primary")} />}
              
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center relative overflow-hidden shrink-0", isActive ? "bg-black/60 border border-white/20 shadow-glow" : "bg-white/5")}>
                <Icon className={cn("w-7 h-7", isActive ? prayer.color : "text-white/40")} />
              </div>

              <div className="flex flex-col flex-1 min-w-0 text-right">
                <div className="flex items-center justify-between mb-0.5">
                   <span className="text-[13px] font-black uppercase tracking-[0.15em] truncate text-white">{prayer.name}</span>
                   <button 
                     onClick={(e) => { e.stopPropagation(); setEditingId(isEditing ? null : prayer.id); }}
                     className="opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity p-1 text-white/40 hover:text-emerald-400"
                   >
                     {isEditing ? <Check className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                   </button>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black tabular-nums tracking-tighter drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] text-white">{convertTo12Hour(prayer.time)}</span>
                </div>

                {isEditing ? (
                  <div className="mt-1.5 flex items-center gap-2 bg-black/40 rounded-full p-1 border border-white/10 animate-in zoom-in-95 duration-200">
                    <button onClick={() => handleAdjustIqamah(prayer.id, 1)} className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white"><Plus className="w-3 h-3" /></button>
                    <span className="text-[10px] font-black text-emerald-400 w-8 text-center">{prayer.iqamahDuration}د</span>
                    <button onClick={() => handleAdjustIqamah(prayer.id, -1)} className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white"><Minus className="w-3 h-3" /></button>
                  </div>
                ) : (
                  <div className={cn("mt-1.5 flex items-center gap-2 px-3 py-1 rounded-full border text-[8px] font-black uppercase tracking-widest w-fit", isCurrentIqamah ? "bg-emerald-500/30 border-emerald-400/50 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]" : "bg-white/10 border-white/10 text-white/50")}>
                    {isCurrentIqamah ? <><BellRing className="w-3.5 h-3.5 animate-pulse" />الإقامة {currentStatus.remaining}</> : <><Timer className="w-3.5 h-3.5" />الإقامة {convertTo12Hour(prayer.iqamahTime)}</>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
