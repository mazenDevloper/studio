
"use client";

import { useEffect, useState } from "react";
import { Calendar as CalendarIcon, MapPin } from "lucide-react";

export function CalendarWidget() {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
  }, []);

  if (!mounted || !now) return <div className="h-full bg-zinc-900/40 animate-pulse rounded-[2.5rem]" />;

  const hijriDate = "٥ رمضان ١٤٤٧ هـ";
  const dayName = now.toLocaleDateString('ar-EG', { weekday: 'long' });
  const dayNum = now.getDate();
  const monthName = now.toLocaleDateString('ar-EG', { month: 'long' });

  return (
    <div className="h-full bg-zinc-900/60 backdrop-blur-3xl rounded-[2.5rem] border border-white/5 p-8 flex flex-col justify-between relative shadow-2xl overflow-hidden group">
      <div className="absolute top-6 left-8 flex items-center gap-2">
        <CalendarIcon className="w-4 h-4 text-accent" />
        <span className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em]">Hub Synchronization</span>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center gap-2">
        <h3 className="text-2xl font-bold font-headline text-white/80">{dayName}</h3>
        <div className="flex items-baseline gap-4">
          <span className="text-8xl font-bold font-headline text-white tracking-tighter">{dayNum}</span>
          <span className="text-3xl font-bold font-headline text-accent/80">{monthName}</span>
        </div>
        <p className="text-xl text-primary font-bold uppercase tracking-[0.3em] mt-2">{hijriDate}</p>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        <div className="flex items-center gap-2">
          <MapPin className="w-3 h-3 text-muted-foreground" />
          <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">Makkah Region</span>
        </div>
        <div className="flex gap-1">
          <div className="w-1 h-1 rounded-full bg-primary" />
          <div className="w-1 h-1 rounded-full bg-white/10" />
          <div className="w-1 h-1 rounded-full bg-white/10" />
        </div>
      </div>
    </div>
  );
}
