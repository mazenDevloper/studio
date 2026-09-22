
"use client";

import { useMediaStore } from "@/lib/store";
import { SovereignIframe } from "@/components/ui/sovereign-iframe";
import { convertTo12Hour } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useEffect, useState, useMemo } from "react";
import { SovereignShortcutsWidget } from "@/components/dashboard/widgets/sovereign-shortcuts-widget";

/**
 * CarDashboardView v3.3 - Sovereign Location & Sync Protocol
 * Features: Added hidden ShortcutWidget to support Auto-Click Sync Engine.
 */
export default function CarDashboardPage() {
  const { prayerTimes, prayerSettings, fetchPriorityData } = useMediaStore();
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    // المزامنة السيادية: جلب البيانات فور تحميل الصفحة لضمان ظهور الجزر العائمة والصلوات
    fetchPriorityData('all');
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [fetchPriorityData]);

  const getTodayPrayers = () => {
    if (!prayerTimes || prayerTimes.length === 0) return null;
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    return prayerTimes.find(p => p.date === dateStr) || prayerTimes[0];
  };

  const p = getTodayPrayers();

  const processedReminders = useMemo(() => {
    if (!now || !p) return [];
    const list: any[] = [];
    const totalCurrentSecs = (now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds();
    const isFriday = now.getDay() === 5;

    const tToM = (t: string) => { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const formatTargetTime = (seconds: number) => {
      const h = Math.floor(seconds / 3600) % 24;
      const m = Math.floor((seconds % 3600) / 60);
      return convertTo12Hour(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    };

    if (p) {
      for (const setting of prayerSettings) {
        const refTime = p[setting.id as keyof typeof p];
        if (!refTime) continue;
        const azanMins = tToM(refTime) + setting.offsetMinutes;
        const targetSecs = azanMins * 60;
        let diff = targetSecs - totalCurrentSecs;
        if (diff < -43200) diff += 86400;
        
        if (diff > -60) {
          list.push({ 
            id: `azan-${setting.id}`, 
            name: (setting.id === 'dhuhr' && isFriday) ? "الجمعة" : setting.name, 
            diff, 
            color: "text-accent", 
            targetTimeStr: formatTargetTime(targetSecs), 
            window: setting.countdownWindow * 60
          });
        }

        const iqamahMins = azanMins + (setting.iqamahDuration || 0);
        const iqamahSecs = iqamahMins * 60;
        let iqamahDiff = iqamahSecs - totalCurrentSecs;
        if (iqamahDiff < -43200) iqamahDiff += 86400;

        if (diff <= 0 && iqamahDiff > 0) {
           list.push({
             id: `iqamah-${setting.id}`,
             name: (setting.id === 'dhuhr' && isFriday) ? "إقامة الجمعة" : `إقامة ${setting.name}`,
             diff: iqamahDiff,
             color: "text-emerald-400",
             targetTimeStr: formatTargetTime(iqamahSecs),
             window: (setting.iqamahDuration || 20) * 60
           });
        }
      }
    }
    return list.sort((a, b) => Math.abs(a.diff) - Math.abs(b.diff));
  }, [now, p, prayerSettings]);

  const formatCountdown = (diffSeconds: number) => { 
    const absSecs = Math.abs(diffSeconds); 
    const h = Math.floor(absSecs / 3600);
    const m = Math.floor((absSecs % 3600) / 60);
    const s = absSecs % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`; 
  };

  const getKashidaDay = (day: string) => {
    if (day.includes("الاثنين")) return "الاثنيـــــن";
    if (day.includes("الأحد") || day.includes("الاحد")) return "الاحــــد";
    if (day.includes("السبت")) return "السبــــت";
    if (day.includes("الثلاثاء")) return "الثلاثــــاء";
    if (day.includes("الأربعاء") || day.includes("الاربعاء")) return "الاربعــــاء";
    if (day.includes("الخميس")) return "الخميــــس";
    if (day.includes("الجمعة")) return "الجمعــــة";
    return day;
  };

  if (!mounted || !now) return <div className="bg-black w-full h-screen" />;

  const hijriDate = now.toLocaleDateString('ar-u-ca-islamic-umalqura-nu-latn', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const dayName = now.toLocaleDateString('ar-EG', { weekday: 'long' });
  const nextItem = processedReminders.find(r => r.diff > 0) || processedReminders[0];
  const h12 = now.getHours() % 12 || 12;
  const mins = now.getMinutes().toString().padStart(2, '0');
  const currentTimeStr = `${h12}:${mins}`;

  return (
    <main className="w-full h-screen bg-black flex overflow-hidden">
      {/* Hidden Shortcut Controller for Auto-Sync Engine */}
      <div className="fixed top-[-9999px] left-[-9999px] opacity-0 pointer-events-none">
         <SovereignShortcutsWidget />
      </div>

      {/* LEFT SIDE: 50% CONTENT (Data Stack) */}
      <div className="flex-1 h-full flex flex-col p-6 gap-6 bg-zinc-950 overflow-y-auto no-scrollbar">
        
        {/* TOP: SVG Clock Widget (Dashboard Style) */}
        <div className="h-[20%] min-h-[120px] w-full rounded-[2.5rem] overflow-hidden bg-black/40 border border-white/5 flex items-center justify-center p-2">
           <svg className="w-full h-full max-h-32 drop-shadow-[0_15px_35px_rgba(0,0,0,0.6)] overflow-visible" viewBox="0 0 300 130" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="clockFill" x1="0%" x2="100%" y1="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.85)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.15)" />
              </linearGradient>
              <linearGradient id="clockStroke" x1="100%" x2="0%" y1="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(255,255,255,1)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
              </linearGradient>
            </defs>
            <text 
              x="50%" 
              y="50%" 
              textAnchor="middle" 
              dominantBaseline="central"
              className="text-[121.2px] font-black tracking-tighter tabular-nums"
              fill="url(#clockFill)"
              stroke="url(#clockStroke)"
              strokeWidth="1.2"
            >
              {currentTimeStr}
            </text>
          </svg>
        </div>

        {/* MIDDLE: Mobile-Appearance Summary */}
        <div className="h-[40%] min-h-[250px] w-full bg-zinc-950/90 backdrop-blur-[120px] rounded-[3rem] border border-white/10 relative overflow-hidden flex flex-col p-8 focusable" tabIndex={0}>
          <div className="absolute top-6 left-1/2 -translate-x-1/2 text-white/40 font-bold text-sm tracking-widest">{hijriDate}</div>
          
          <div className="flex-1 flex items-center justify-center relative">
             <div className="w-full text-center">
                <span className="thmanyah-day-name text-[11cqw] font-black text-white leading-none tracking-tight block">
                  {getKashidaDay(dayName)}
                </span>
             </div>
          </div>

          <div className="flex items-center justify-between mt-auto px-6 pb-2">
             <div className="flex items-baseline gap-3">
                <span className="text-white/40 text-xs font-bold uppercase">الآن</span>
                <span className="text-4xl font-black text-white/60 tabular-nums tracking-tighter" style={{ fontFamily: 'thmanyahsans_Medium' }}>{currentTimeStr}</span>
             </div>
             
             {nextItem && (
               <div className="flex items-baseline gap-3">
                  <span className={cn("font-black text-3xl", nextItem.color)} style={{ fontFamily: 'thmanyahsans_Medium' }}>{nextItem.name}</span>
                  <span className={cn("text-4xl font-black tabular-nums tracking-tighter", nextItem.color)} style={{ fontFamily: 'thmanyahsans_Medium' }}>{formatCountdown(nextItem.diff)}</span>
               </div>
             )}
          </div>
        </div>

        {/* BOTTOM: 5 Prayer Grid (Dual Optimized Rows) */}
        <div className="flex-1 grid grid-cols-6 gap-3">
           {[
             { name: "الفجر", time: p?.fajr, span: "col-span-2" },
             { name: "الظهر", time: p?.dhuhr, span: "col-span-2" },
             { name: "العصر", time: p?.asr, span: "col-span-2" },
             { name: "المغرب", time: p?.maghrib, span: "col-span-3" },
             { name: "العشاء", time: p?.isha, span: "col-span-3" }
           ].map((item, idx) => (
             <div key={idx} className={cn(
               "bg-white/5 rounded-[2.2rem] border border-white/10 flex flex-col items-center justify-center p-3 transition-all hover:bg-white/10",
               item.span
             )}>
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">{item.name}</span>
                <span className="text-3xl font-black text-white tabular-nums tracking-tighter" style={{ fontFamily: 'thmanyahsans_Medium' }}>
                   {convertTo12Hour(item.time)}
                </span>
             </div>
           ))}
        </div>
      </div>

      {/* RIGHT SIDE: 50% IFRAME (Sovereign Radar Map) */}
      <div className="flex-1 h-full p-4 relative">
        <div className="w-full h-full rounded-[3rem] overflow-hidden border-2 border-white/10 shadow-2xl relative bg-zinc-900">
          <SovereignIframe 
            src="https://dmusera.netlify.app/amap" 
            title="Sovereign Radar Map" 
            allow="geolocation; autoplay; fullscreen; microphone; camera; display-capture; clipboard-write; encrypted-media; picture-in-picture; web-share; accelerometer; gyroscope"
          />
        </div>
      </div>
    </main>
  );
}
