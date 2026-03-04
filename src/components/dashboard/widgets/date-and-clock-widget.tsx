
"use client";

import { useEffect, useState } from "react";
import { Calendar } from "lucide-react";

export function DateAndClockWidget() {
  const [now, setNow] = useState<Date | null>(null);
  
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!now) return null;

  const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  const dateString = now.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-4 bg-black/40 rounded-[2.5rem] relative overflow-hidden text-center">
      <div className="flex flex-col items-center gap-2 relative z-10 w-full">
        {/* Shrunken Clock Size */}
        <div className="text-[5.5rem] font-black text-white tracking-tighter drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)] tabular-nums leading-none">
          {timeString}
        </div>

        <div className="flex items-center gap-2 bg-white/10 px-5 py-1 rounded-full border border-white/10 backdrop-blur-md shadow-2xl">
          <Calendar className="w-3.5 h-3.5 text-accent" />
          <span className="text-[9px] text-white/90 font-black uppercase tracking-widest">{dateString}</span>
        </div>
      </div>
    </div>
  );
}
