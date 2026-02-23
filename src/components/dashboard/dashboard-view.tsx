
"use client";

import { useEffect, useState } from "react";
import { WEATHER_API_KEY } from "@/lib/constants";
import { Cloud, Sun, Search, Mic } from "lucide-react";
import Link from "next/link";
import { RemindersWidget } from "./widgets/reminders-widget";
import { DateAndClockWidget } from "./widgets/date-and-clock-widget";
import { InspirationWidget } from "./widgets/inspiration-widget";
import { PrayerTimelineWidget } from "./widgets/prayer-timeline-widget";

export function DashboardView() {
  const [weather, setWeather] = useState<any>(null);

  useEffect(() => {
    fetch(`https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=Silicon Valley&aqi=no`)
      .then(res => res.json())
      .then(data => setWeather(data))
      .catch(err => console.error("Weather error:", err));
  }, []);

  return (
    <div className="p-8 h-full flex flex-col gap-8 bg-black">
      {/* Header HUD */}
      <header className="flex items-center justify-between px-4">
        <div className="flex items-center gap-6">
          {weather && (
            <div className="flex items-center gap-4 px-6 py-3 rounded-full bg-zinc-900/50 border border-white/5 backdrop-blur-xl ios-shadow">
              {weather.current.condition.text.includes('Sun') ? <Sun className="text-yellow-400 w-6 h-6" /> : <Cloud className="text-blue-400 w-6 h-6" />}
              <div className="flex flex-col">
                <span className="text-lg font-bold leading-none">{weather.current.temp_c}°C</span>
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{weather.current.condition.text}</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-6">
          <Link href="/media" className="w-14 h-14 rounded-full bg-zinc-900/80 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all hover:scale-110 active:scale-95 ios-shadow">
            <Search className="w-6 h-6 text-white" />
          </Link>
          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center ios-shadow active-glow transition-all active:scale-90">
            <Mic className="w-7 h-7 text-white" />
          </div>
          <div className="h-1.5 w-32 rounded-full siri-gradient" />
        </div>
      </header>

      {/* Main Command Center */}
      <div className="flex-1 grid grid-cols-12 gap-8 items-stretch max-h-[70vh]">
        {/* Left: Reminders */}
        <div className="col-span-4 h-full">
          <RemindersWidget />
        </div>

        {/* Center: Clock & Date */}
        <div className="col-span-4 h-full">
          <DateAndClockWidget />
        </div>

        {/* Right: Inspiration */}
        <div className="col-span-4 h-full">
          <InspirationWidget />
        </div>
      </div>

      {/* Footer: Prayer Timeline */}
      <div className="mt-auto">
        <PrayerTimelineWidget />
      </div>
    </div>
  );
}
