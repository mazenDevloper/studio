
"use client";

import { useMemo, useState, useEffect } from "react";
import { useMediaStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Bell, Timer, Clock } from "lucide-react";
import { FluidGlass } from "@/components/ui/fluid-glass";
import { convertTo12Hour } from "@/lib/constants";

interface ReminderItem {
  id: string;
  name: string;
  label: string;
  diff: number;
  expDiff?: number;
  icon: any;
  color: string;
  targetTimeStr: string;
  endTimeStr?: string;
  window: number;
  isNearingEnd?: boolean;
  type?: string;
}

/**
 * ReminderSummaryWidget v3200.0 - Sovereign Temporal Engine
 * Features: 12h Clock | Mobile Plate Live Countdown | Iqamah Priority Protocol.
 */
export function ReminderSummaryWidget() {
  const { prayerTimes, reminders, prayerSettings } = useMediaStore();
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => {
      clearInterval(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const processedReminders = useMemo(() => {
    if (!now || !prayerTimes?.length) return [];
    const list: ReminderItem[] = [];
    const totalCurrentSecs = (now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds();
    const isFriday = now.getDay() === 5;

    const tToM = (t: string) => { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const formatTargetTime = (seconds: number) => {
      const h = Math.floor(seconds / 3600) % 24;
      const m = Math.floor((seconds % 3600) / 60);
      return convertTo12Hour(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    };

    const dateStr = now.toISOString().split('T')[0];
    const pData = prayerTimes.find(p => p.date === dateStr) || prayerTimes[0];

    if (pData) {
      for (const setting of prayerSettings) {
        const refTime = pData[setting.id as keyof typeof pData];
        if (!refTime) continue;
        const azanMins = tToM(refTime) + setting.offsetMinutes;
        const targetSecs = azanMins * 60;
        let diff = targetSecs - totalCurrentSecs;
        if (diff < -43200) diff += 86400;
        
        // Include Azan
        if (diff > -60) {
          list.push({ 
            id: `azan-${setting.id}`, 
            name: (setting.id === 'dhuhr' && isFriday) ? "الجمعة" : setting.name, 
            label: "الأذان", 
            diff, 
            icon: Clock, 
            color: "text-accent", 
            targetTimeStr: formatTargetTime(targetSecs), 
            window: setting.countdownWindow * 60,
            type: 'azan'
          });
        }

        // Include Iqamah logic
        const iqamahMins = azanMins + (setting.iqamahDuration || 0);
        const iqamahSecs = iqamahMins * 60;
        let iqamahDiff = iqamahSecs - totalCurrentSecs;
        if (iqamahDiff < -43200) iqamahDiff += 86400;

        if (diff <= 0 && iqamahDiff > 0) {
           list.push({
             id: `iqamah-${setting.id}`,
             name: (setting.id === 'dhuhr' && isFriday) ? "إقامة الجمعة" : `إقامة ${setting.name}`,
             label: "الإقامة",
             diff: iqamahDiff,
             icon: Timer,
             color: "text-emerald-400",
             targetTimeStr: formatTargetTime(iqamahSecs),
             window: (setting.iqamahDuration || 20) * 60,
             type: 'iqamah'
           });
        }
      }
    }

    // Add general reminders if on desktop
    // FILTER: Exclude Matches and Sports
    if (!isMobile) {
      for (const rem of reminders) {
        if (rem.completed || rem.iconType === 'match') continue;
        let startSecs = 0;
        if (rem.startType === 'manual' && rem.manualStartTime) startSecs = tToM(rem.manualStartTime) * 60;
        else if (rem.startReference && pData[rem.startReference]) {
          startSecs = (tToM(pData[rem.startReference]) + rem.startOffset) * 60;
        }
        
        if (startSecs > 0) {
          let diff = startSecs - totalCurrentSecs;
          if (diff < -43200) diff += 86400;
          if (diff > -300 && diff < 7200) {
             list.push({
               id: rem.id,
               name: rem.label,
               label: "تذكير",
               diff,
               icon: Bell,
               color: rem.color,
               targetTimeStr: formatTargetTime(startSecs),
               window: (rem.countdownWindow || 15) * 60
             });
          }
        }
      }
    }

    const baseList = list.sort((a, b) => Math.abs(a.diff) - Math.abs(b.diff));
    return baseList;
  }, [now, prayerTimes, prayerSettings, reminders, isMobile]);

  const formatCountdown = (diffSeconds: number) => { 
    const absSecs = Math.abs(diffSeconds); 
    const h = Math.floor(absSecs / 3600);
    const m = Math.floor((absSecs % 3600) / 60);
    const s = absSecs % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`; 
  };

  if (!mounted || !now) return <div className="h-full w-full bg-zinc-950/80 rounded-[2.5rem] animate-pulse" />;

  const hijriDate = now.toLocaleDateString('ar-u-ca-islamic-umalqura-nu-latn', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const dayName = now.toLocaleDateString('ar-EG', { weekday: 'long' });
  
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

  if (isMobile) {
    const nextItem = processedReminders.find(r => r.diff > 0) || processedReminders[0];
    const h12 = now.getHours() % 12 || 12;
    const m = now.getMinutes().toString().padStart(2, '0');
    const currentTimeStr = `${h12}:${m}`;

    return (
      <div className="h-full w-full bg-zinc-950/90 backdrop-blur-[120px] rounded-[2.5rem] border border-white/10 relative overflow-hidden flex flex-col p-6 focusable" tabIndex={0}>
        <div className="absolute top-6 left-1/2 -translate-x-1/2 text-white/40 font-bold text-xs tracking-widest">{hijriDate}</div>
        
        <div className="flex-1 flex items-center justify-center relative">
           <div className="w-full text-center">
              <span className="thmanyah-day-name text-[18cqw] font-black text-white leading-none tracking-tight block">
                {getKashidaDay(dayName)}
              </span>
           </div>
        </div>

        <div className="flex items-center justify-between mt-auto px-4 pb-2">
           <div className="flex items-baseline gap-2">
              <span className="text-white/40 text-xs font-bold uppercase">الآن</span>
              <span className="text-3xl font-black text-white/60 tabular-nums tracking-tighter" style={{ fontFamily: 'thmanyahsans_Medium' }}>{currentTimeStr}</span>
           </div>
           
           {nextItem && (
             <div className="flex items-baseline gap-2">
                <span className={cn("font-black text-2xl", nextItem.color)} style={{ fontFamily: 'thmanyahsans_Medium' }}>{nextItem.name}</span>
                <span className={cn("text-3xl font-black tabular-nums tracking-tighter", nextItem.color)} style={{ fontFamily: 'thmanyahsans_Medium' }}>{formatCountdown(nextItem.diff)}</span>
             </div>
           )}
        </div>
      </div>
    );
  }

  // Large Desktop View - 3 Item List with Countdown
  const topReminders = processedReminders.slice(0, 3);
  return (
    <div className="h-full w-full bg-zinc-950/80 backdrop-blur-[120px] rounded-[2.5rem] border border-white/10 relative overflow-hidden flex flex-col justify-around p-8 focusable" tabIndex={0}>
      <FluidGlass />
      {topReminders.map((rem, idx) => (
        <div key={rem.id} className={cn(
          "flex items-center justify-between relative py-2 w-full transition-all border-b border-white/5 last:border-none",
          rem.diff < rem.window ? "opacity-100" : "opacity-60"
        )}>
          <div className="flex items-center gap-4">
             <div className={cn("w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center", rem.color)}>
                <rem.icon className="w-6 h-6" />
             </div>
             <div className="flex flex-col">
                <span className="text-xl font-black text-white tracking-tighter">{rem.name}</span>
                <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{rem.label}</span>
             </div>
          </div>
          <div className="text-right">
             <div className={cn(
               "text-4xl font-black tabular-nums tracking-tighter",
               rem.diff < rem.window ? rem.color : "text-white/80"
             )} style={{ fontFamily: 'thmanyahsans_Medium' }}>
               {rem.diff > 0 && rem.diff < rem.window ? formatCountdown(rem.diff) : rem.targetTimeStr}
             </div>
          </div>
        </div>
      ))}
      {topReminders.length === 0 && (
        <div className="flex flex-col items-center justify-center opacity-20 gap-4">
           <Timer className="w-12 h-12" />
           <span className="text-xs font-black uppercase tracking-[0.4em]">No Pending Alerts</span>
        </div>
      )}
    </div>
  );
}
