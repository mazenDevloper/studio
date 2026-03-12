
"use client";

import { useMemo, useState, useEffect } from "react";
import { useMediaStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Bell, Timer, Clock } from "lucide-react";
import { FluidGlass } from "@/components/ui/fluid-glass";

interface ReminderItem {
  id: string;
  name: string;
  label: string;
  diff: number;
  icon: any;
  color: string;
  targetTimeStr: string;
}

/**
 * ReminderSummaryWidget - Displays the top 3 closest events in a vertical stack.
 * Used in Dashboard when screen width > 1080px.
 * Features: Dark Glass, Vivid labels, and Glass Numbers.
 */
export function ReminderSummaryWidget() {
  const { prayerTimes, reminders } = useMediaStore();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const processedReminders = useMemo(() => {
    const list: ReminderItem[] = [];
    const totalCurrentSecs = (now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds();

    const tToM = (t: string) => {
      if (!t) return 0;
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    const formatTargetTime = (seconds: number) => {
      const h = Math.floor(seconds / 3600) % 24;
      const m = Math.floor((seconds % 3600) / 60);
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    if (prayerTimes?.length) {
      const day = now.getDate().toString().padStart(2, '0');
      const pData = prayerTimes.find(p => p.date.endsWith(`-${day}`)) || prayerTimes[0];
      const prayers = [
        { id: 'fajr', name: "الفجر", time: pData.fajr, iqamah: 25 },
        { id: 'sunrise', name: "الشروق", time: pData.sunrise, iqamah: 0 },
        { id: 'dhuhr', name: "الظهر", time: pData.dhuhr, iqamah: 20 },
        { id: 'asr', name: "العصر", time: pData.asr, iqamah: 20 },
        { id: 'maghrib', name: "المغرب", time: pData.maghrib, iqamah: 10 },
        { id: 'isha', name: "العشاء", time: pData.isha, iqamah: 20 },
      ];

      for (const p of prayers) {
        if (p.id === 'sunrise') {
          const riseSecs = tToM(p.time) * 60;
          const diff = riseSecs - totalCurrentSecs;
          if (diff > -600) list.push({ id: `azan-${p.id}`, name: p.name, label: "شروق الشمس", diff, icon: Clock, color: "text-orange-400", targetTimeStr: p.time });
          continue;
        }
        const azanSecs = tToM(p.time) * 60;
        const iqamahSecs = azanSecs + (p.iqamah * 60);
        const aDiff = azanSecs - totalCurrentSecs;
        const iDiff = iqamahSecs - totalCurrentSecs;
        
        if (aDiff > -600) list.push({ id: `azan-${p.id}`, name: p.name, label: "الأذان", diff: aDiff, icon: Clock, color: "text-accent", targetTimeStr: p.time });
        if (iDiff > -600) list.push({ id: `iqamah-${p.id}`, name: `إقامة ${p.name}`, label: "الإقامة", diff: iDiff, icon: Timer, color: "text-emerald-400", targetTimeStr: formatTargetTime(iqamahSecs) });
      }
    }

    for (const rem of reminders) {
      let targetSecs = rem.relativePrayer === 'manual' && rem.manualTime ? tToM(rem.manualTime) * 60 : 0;
      if (rem.relativePrayer !== 'manual' && prayerTimes?.length) {
        const day = now.getDate().toString().padStart(2, '0');
        const pData = prayerTimes.find(p => p.date.endsWith(`-${day}`)) || prayerTimes[0];
        const refTime = pData[rem.relativePrayer as keyof typeof pData];
        if (refTime) targetSecs = (tToM(refTime) + rem.offsetMinutes) * 60;
      }
      if (targetSecs > 0) {
        const diff = targetSecs - totalCurrentSecs;
        if (diff > -600) list.push({ id: rem.id, name: rem.label, label: "تذكير", diff, icon: Bell, color: rem.color || "text-blue-400", targetTimeStr: formatTargetTime(targetSecs) });
      }
    }

    return list.sort((a, b) => Math.abs(a.diff) - Math.abs(b.diff)).slice(0, 3);
  }, [now, prayerTimes, reminders]);

  const formatCountdown = (diffSeconds: number) => {
    const absSecs = Math.abs(diffSeconds);
    const m = Math.floor((absSecs % 3600) / 60);
    const s = absSecs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const GlassNumber = ({ text, size = '3.5rem', id }: { text: string, size?: string, id: string }) => (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      <svg className="w-full h-full overflow-visible" viewBox="0 0 200 60">
        <defs>
          <linearGradient id={`textFill-sum-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.85)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.15)" />
          </linearGradient>
          <linearGradient id={`textStroke-sum-${id}`} x1="100%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,255,255,1)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
          </linearGradient>
        </defs>
        <text 
          x="50%" 
          y="50%" 
          textAnchor="middle" 
          dominantBaseline="central"
          className="font-black tabular-nums tracking-tighter"
          style={{ fontSize: size }}
          fill={`url(#textFill-sum-${id})`}
          stroke={`url(#textStroke-sum-${id})`}
          strokeWidth="0.6"
        >
          {text}
        </text>
      </svg>
    </div>
  );

  return (
    <div className="h-full w-full bg-zinc-950/80 backdrop-blur-[120px] rounded-[2.5rem] border border-white/10 relative overflow-hidden flex flex-col justify-around p-6">
      <FluidGlass />
      {processedReminders.map((rem) => {
        const RemIcon = rem.icon;
        const showCountdown = Math.abs(rem.diff) <= 1200; // 20 mins rule
        const displayVal = showCountdown 
          ? `${rem.diff >= 0 ? "-" : "+"}${formatCountdown(rem.diff)}` 
          : rem.targetTimeStr;

        return (
          <div key={rem.id} className="flex flex-col items-center justify-center flex-1 relative border-b border-white/5 last:border-0 py-4">
            <div className="flex items-center gap-3 mb-[-4px]">
              <RemIcon className={cn("w-5 h-5 shadow-glow", rem.color)} />
              <span className={cn("text-lg font-black uppercase truncate max-w-[250px]", rem.color)}>
                {rem.name}
              </span>
            </div>
            <div className="h-24 w-full max-w-[350px]">
              <GlassNumber 
                text={displayVal} 
                id={`sum-vert-${rem.id}`} 
                size="4.5rem"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
