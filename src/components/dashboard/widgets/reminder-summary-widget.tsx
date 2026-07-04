
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
  window: number;
  isNearingEnd?: boolean;
}

export function ReminderSummaryWidget() {
  const { prayerTimes, reminders, prayerSettings } = useMediaStore();
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const processedReminders = useMemo(() => {
    if (!now) return [];
    const list: ReminderItem[] = [];
    const totalCurrentSecs = (now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds();
    const isFriday = now.getDay() === 5;

    const tToM = (t: string) => {
      if (!t) return 0;
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    const formatTargetTime = (seconds: number) => {
      const h = Math.floor(seconds / 3600) % 24;
      const m = Math.floor((seconds % 3600) / 60);
      return convertTo12Hour(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    };

    const dateStr = now.toISOString().split('T')[0];
    const pData = prayerTimes.find(p => p.date === dateStr) || 
                  prayerTimes.find(p => p.date.endsWith(`-${now.getDate().toString().padStart(2, '0')}`)) || 
                  prayerTimes[0];

    if (pData) {
      // Add standard prayer times as reminders
      for (const setting of prayerSettings) {
        const refTime = pData[setting.id as keyof typeof pData];
        if (!refTime) continue;
        const baseMins = tToM(refTime) + setting.offsetMinutes;
        const targetSecs = baseMins * 60;
        let diff = targetSecs - totalCurrentSecs;
        if (diff < -43200) diff += 86400;

        if (diff > -600) {
          list.push({ 
            id: `azan-${setting.id}`, name: (setting.id === 'dhuhr' && isFriday) ? "صلاة الجمعة" : setting.name, label: "الأذان", 
            diff, icon: Clock, color: "text-accent", targetTimeStr: formatTargetTime(targetSecs), window: setting.countdownWindow * 60
          });
        }
      }

      // Add custom precise reminders
      for (const rem of reminders) {
        if (rem.completed) continue;
        let startSecs = 0, endSecs = 0;

        // Calculate Start
        if (rem.startType === 'manual' && rem.manualStartTime) {
          startSecs = tToM(rem.manualStartTime) * 60;
        } else if (rem.startReference && pData[rem.startReference]) {
          let baseMins = tToM(pData[rem.startReference]);
          if (rem.startType === 'iqamah') {
            const pSet = prayerSettings.find(s => s.id === rem.startReference);
            baseMins += (pSet?.iqamahDuration || 0);
          }
          startSecs = (baseMins + rem.startOffset) * 60;
        }

        // Calculate End
        if (rem.endType === 'manual' && rem.manualEndTime) {
          endSecs = tToM(rem.manualEndTime) * 60;
        } else if (rem.endType === 'duration') {
          endSecs = startSecs + (rem.durationMinutes || 30) * 60;
        } else if ((rem.endType === 'azan' || rem.endType === 'iqamah') && rem.endReference && pData[rem.endReference]) {
          let baseMins = tToM(pData[rem.endReference]);
          if (rem.endType === 'iqamah') {
            const pSet = prayerSettings.find(s => s.id === rem.endReference);
            baseMins += (pSet?.iqamahDuration || 0);
          }
          endSecs = (baseMins + rem.endOffset) * 60;
        }

        let startDiff = startSecs - totalCurrentSecs;
        if (startDiff < -43200) startDiff += 86400;
        let endDiff = endSecs - totalCurrentSecs;
        if (endDiff < -43200) endDiff += 86400;

        if (endDiff > -60) {
          list.push({ 
            id: rem.id, name: rem.label, label: "تذكير", diff: startDiff, expDiff: endDiff,
            icon: rem.iconType === 'play' ? Timer : Bell, color: rem.color, 
            targetTimeStr: formatTargetTime(startSecs), window: (rem.countdownWindow || 15) * 60,
            isNearingEnd: endDiff > 0 && endDiff <= 600
          });
        }
      }
    }

    return list.sort((a, b) => Math.abs(a.diff) - Math.abs(b.diff)).slice(0, 3);
  }, [now, prayerTimes, reminders, prayerSettings]);

  const GlassNumber = ({ text, size = '4.5rem', id }: { text: string, size?: string, id: string }) => (
    <div className="relative w-[95%] h-full flex flex-col items-center justify-center mx-auto">
      <svg className="w-full h-full overflow-visible" viewBox="0 0 280 80">
        <defs>
          <linearGradient id={`textFill-sum-${id}`} x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="rgba(255,255,255,0.95)" /><stop offset="100%" stopColor="rgba(255,255,255,0.2)" /></linearGradient>
        </defs>
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="font-black tabular-nums tracking-tighter" style={{ fontSize: size }} fill={`url(#textFill-sum-${id})`}>{text}</text>
      </svg>
    </div>
  );

  const formatCountdown = (diffSeconds: number) => { 
    const absSecs = Math.abs(diffSeconds); 
    return `${Math.floor((absSecs % 3600) / 60).toString().padStart(2, '0')}:${(absSecs % 60).toString().padStart(2, '0')}`; 
  };

  if (!mounted || !now) return <div className="h-full w-full bg-zinc-950/80 rounded-[2.5rem] animate-pulse" />;

  return (
    <div className="h-full w-full bg-zinc-950/80 backdrop-blur-[120px] rounded-[2.5rem] border border-white/10 relative overflow-hidden flex flex-col justify-center gap-2 p-6 focusable" tabIndex={0}>
      <FluidGlass />
      {processedReminders.map((rem, idx) => {
        const RemIcon = rem.icon;
        const showCountdown = Math.abs(rem.diff) <= rem.window;
        const showEndCountdown = rem.isNearingEnd && rem.diff <= 0;
        let displayVal = rem.targetTimeStr;
        if (showEndCountdown) displayVal = `END ${formatCountdown(rem.expDiff || 0)}`;
        else if (showCountdown) displayVal = `${rem.diff >= 0 ? "-" : "+"}${formatCountdown(rem.diff)}`;

        return (
          <div key={rem.id} className={cn("flex flex-col items-center justify-center relative py-1 w-full", idx < processedReminders.length - 1 ? "border-b border-white/5" : "", idx === 0 ? "opacity-100" : "opacity-50")}>
            <div className="flex items-center gap-3 mb-[-4px]"><RemIcon className={cn("w-6 h-6", rem.isNearingEnd ? "text-red-500 animate-pulse" : rem.color)} /><span className={cn("text-2xl font-black uppercase", rem.isNearingEnd ? "text-red-500" : rem.color)}>{rem.name}</span></div>
            <div className={cn("w-[95%] px-2", (idx === 0 && (showCountdown || showEndCountdown)) ? "h-24" : "h-16")}><GlassNumber text={displayVal} id={`sum-${rem.id}`} size={(idx === 0 && (showCountdown || showEndCountdown)) ? "5.5rem" : "4.5rem"} /></div>
          </div>
        );
      })}
    </div>
  );
}
