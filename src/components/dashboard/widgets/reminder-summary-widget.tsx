
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
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const processedReminders = useMemo(() => {
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

    if (prayerTimes?.length) {
      const dateStr = now.toISOString().split('T')[0];
      const pData = prayerTimes.find(p => p.date === dateStr) || 
                    prayerTimes.find(p => p.date.endsWith(`-${now.getDate().toString().padStart(2, '0')}`)) || 
                    prayerTimes[0];
      
      for (const setting of prayerSettings) {
        let refTime = pData[setting.id as keyof typeof pData];
        let baseMinutesOffset = setting.offsetMinutes;

        if (setting.id === 'duha') {
          refTime = pData['sunrise'];
          baseMinutesOffset += 15;
        }

        if (!refTime) continue;

        const baseMinutes = tToM(refTime) + baseMinutesOffset;
        const azanSecs = baseMinutes * 60;
        let aDiff = azanSecs - totalCurrentSecs;
        if (aDiff < -43200) aDiff += 86400;

        const displayName = (setting.id === 'dhuhr' && isFriday) ? "صلاة الجمعة" : setting.name;

        if (aDiff > -600) {
          list.push({ 
            id: `azan-${setting.id}`, 
            name: displayName, 
            label: setting.id === 'sunrise' ? "شروق الشمس" : setting.id === 'duha' ? "صلاة الضحى" : "الأذان", 
            diff: aDiff, 
            icon: Clock, 
            color: setting.id === 'sunrise' || setting.id === 'duha' ? "text-orange-400" : "text-accent", 
            targetTimeStr: formatTargetTime(azanSecs),
            window: setting.countdownWindow * 60
          });
        }

        if (setting.iqamahDuration > 0) {
          const iqamahSecs = azanSecs + (setting.iqamahDuration * 60);
          let iDiff = iqamahSecs - totalCurrentSecs;
          if (iDiff < -43200) iDiff += 86400;

          if (iDiff > -600) {
            list.push({ 
              id: `iqamah-${setting.id}`, 
              name: `إقامة ${displayName}`, 
              label: "الإقامة", 
              diff: iDiff, 
              icon: Timer, 
              color: "text-emerald-400", 
              targetTimeStr: formatTargetTime(iqamahSecs),
              window: setting.countupWindow * 60 
            });
          }
        }
      }
    }

    for (const rem of reminders) {
      if (rem.completed) continue;
      let targetSecs = 0;
      let expirySecs = 0;

      const dateStr = now.toISOString().split('T')[0];
      const pData = prayerTimes.find(p => p.date === dateStr) || 
                    prayerTimes.find(p => p.date.endsWith(`-${now.getDate().toString().padStart(2, '0')}`)) || 
                    prayerTimes[0];

      if (rem.relativePrayer === 'manual' && rem.manualTime) {
        targetSecs = tToM(rem.manualTime) * 60;
      } else if (prayerTimes?.length) {
        let refTime = pData[rem.relativePrayer as keyof typeof pData];
        let extraOffset = rem.offsetMinutes;
        if (rem.relativePrayer === 'duha') { refTime = pData['sunrise']; extraOffset += 15; }
        if (refTime) targetSecs = (tToM(refTime) + extraOffset) * 60;
      }

      if (targetSecs > 0) {
        // Calculate Expiry
        if (rem.expiryType === 'prayer') {
          let expRef = rem.expiryValue === 'next' ? '' : rem.expiryValue;
          if (rem.expiryValue === 'next') {
            const prayers = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
            const curMins = totalCurrentSecs / 60;
            const found = prayers.find(p => tToM(pData[p]) > curMins) || 'fajr';
            expRef = found;
          }
          if (expRef && pData[expRef]) expirySecs = tToM(pData[expRef]) * 60;
        } else if (rem.expiryType === 'manual' && rem.expiryValue) {
          expirySecs = tToM(rem.expiryValue) * 60;
        } else {
          expirySecs = targetSecs + (parseInt(rem.expiryValue || '30') * 60);
        }

        let diff = targetSecs - totalCurrentSecs;
        if (diff < -43200) diff += 86400;

        let expDiff = expirySecs - totalCurrentSecs;
        if (expDiff < -43200) expDiff += 86400;

        const isNearingEnd = expDiff > 0 && expDiff <= 600; // 10 minutes before end

        if (expDiff > -60) { // Keep showing until 1 min after expiry
          list.push({ 
            id: rem.id, 
            name: rem.label || "تذكير مخصص", 
            label: "تذكير", 
            diff, 
            expDiff,
            isNearingEnd,
            icon: Bell, 
            color: rem.color || "text-blue-400", 
            targetTimeStr: formatTargetTime(targetSecs),
            window: rem.countdownWindow * 60
          });
        }
      }
    }

    return list.sort((a, b) => {
      // Prioritize nearing end countdowns
      if (a.isNearingEnd && !b.isNearingEnd) return -1;
      if (!a.isNearingEnd && b.isNearingEnd) return 1;
      return Math.abs(a.diff) - Math.abs(b.diff);
    }).slice(0, 3);
  }, [now, prayerTimes, reminders, prayerSettings]);

  const formatCountdown = (diffSeconds: number) => {
    const absSecs = Math.abs(diffSeconds);
    const m = Math.floor((absSecs % 3600) / 60);
    const s = absSecs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const GlassNumber = ({ text, size = '4.5rem', id }: { text: string, size?: string, id: string }) => (
    <div className="relative w-[95%] h-full flex flex-col items-center justify-center mx-auto">
      <svg className="w-full h-full overflow-visible" viewBox="0 0 280 80">
        <defs>
          <linearGradient id={`textFill-sum-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.2)" />
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
          strokeWidth="1"
        >
          {text}
        </text>
      </svg>
    </div>
  );

  return (
    <div className="h-full w-full bg-zinc-950/80 backdrop-blur-[120px] rounded-[2.5rem] border border-white/10 relative overflow-hidden flex flex-col justify-center gap-2 p-6 outline-none focusable" tabIndex={0}>
      <FluidGlass />
      {processedReminders.map((rem, idx) => {
        const RemIcon = rem.icon;
        const showCountdown = Math.abs(rem.diff) <= rem.window;
        const showEndCountdown = rem.isNearingEnd && rem.diff <= 0;

        let displayVal = rem.targetTimeStr;
        if (showEndCountdown) displayVal = `END ${formatCountdown(rem.expDiff || 0)}`;
        else if (showCountdown) displayVal = `${rem.diff >= 0 ? "-" : "+"}${formatCountdown(rem.diff)}`;

        return (
          <div key={rem.id} className={cn(
            "flex flex-col items-center justify-center relative py-1 transition-all duration-0 w-full",
            processedReminders.length > 1 && idx < processedReminders.length - 1 ? "border-b border-white/5" : "",
            idx === 0 ? "opacity-100" : idx === 1 ? "opacity-70" : "opacity-40"
          )}>
            <div className="flex items-center gap-3 mb-[-4px]">
              <RemIcon className={cn("w-6 h-6 shadow-glow", rem.isNearingEnd ? "text-red-500 animate-pulse" : rem.color)} />
              <span className={cn("text-2xl font-black uppercase truncate max-w-[320px]", rem.isNearingEnd ? "text-red-500" : rem.color)}>
                {rem.name}
              </span>
            </div>
            
            <div className={cn(
              "w-[95%] px-2",
              (idx === 0 && (showCountdown || showEndCountdown)) ? "h-24" : "h-16"
            )}>
              <GlassNumber 
                text={displayVal} 
                id={`sum-vert-${rem.id}`} 
                size={(idx === 0 && (showCountdown || showEndCountdown)) ? "5.5rem" : "4.5rem"}
              />
            </div>
            
            {idx === 0 && (showCountdown || showEndCountdown) && (
              <span className="text-white/30 font-black uppercase tracking-[0.4em] text-[10px] mt-1 animate-pulse">
                {showEndCountdown ? "Expiring Soon" : "Active Countdown"}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
