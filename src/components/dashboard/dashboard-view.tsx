"use client";

import { useEffect, useState, useMemo } from "react";
import { MapWidget } from "./widgets/map-widget";
import { LatestVideosWidget } from "./widgets/latest-videos-widget";
import { YouTubeSavedWidget } from "./widgets/youtube-saved-widget";
import { useMediaStore } from "@/lib/store";
import { MoonWidget } from "./widgets/moon-widget";
import { PrayerWidget } from "./widgets/prayer-widget";
import { WEATHER_API_KEY } from "@/lib/constants";
import { Cloud, Sun, Search } from "lucide-react";
import Link from "next/link";

export function DashboardView() {
  const { favoriteChannels, starredChannelIds } = useMediaStore();
  const [weather, setWeather] = useState<any>(null);
  const [dateTime, setDateTime] = useState({ time: "", date: "" });

  // Filter channels for latest videos: Prefer starred
  const starredChannels = useMemo(() => {
    return favoriteChannels.filter(c => starredChannelIds.includes(c.id));
  }, [favoriteChannels, starredChannelIds]);

  useEffect(() => {
    // Fetch Live Weather
    fetch(`https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=Silicon Valley&aqi=no`)
      .then(res => res.json())
      .then(data => setWeather(data))
      .catch(err => console.error("Weather error:", err));

    // Live Clock
    const timer = setInterval(() => {
      const now = new Date();
      setDateTime({
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="p-8 h-full flex flex-col">
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-5xl font-headline font-bold text-white tracking-tighter">DriveCast</h1>
            <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest">{dateTime.date}</p>
          </div>
          {weather && (
            <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-zinc-900/50 border border-white/5 backdrop-blur-xl">
              {weather.current.condition.text.includes('Sun') ? <Sun className="text-yellow-400 w-6 h-6" /> : <Cloud className="text-blue-400 w-6 h-6" />}
              <div className="flex flex-col">
                <span className="text-lg font-bold leading-none">{weather.current.temp_c}°C</span>
                <span className="text-[10px] text-muted-foreground uppercase font-bold">{weather.current.condition.text}</span>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-8">
          <Link href="/media" className="w-14 h-14 rounded-full bg-zinc-900/50 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
            <Search className="w-6 h-6 text-white" />
          </Link>
          <div className="flex flex-col items-end">
             <div className="text-3xl font-bold font-headline mb-1">{dateTime.time}</div>
             <div className="h-1 w-32 rounded-full siri-gradient" />
          </div>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-12 gap-6 pb-8 overflow-y-auto">
        {/* Row 1: Main Viewport */}
        <div className="col-span-8 h-[450px]">
          <MapWidget />
        </div>

        <div className="col-span-4 space-y-6">
          <div className="h-1/2">
            <MoonWidget />
          </div>
          <div className="h-1/2">
            <PrayerWidget />
          </div>
        </div>

        {/* Row 2: Full Width Scrolled Suggested Bar */}
        <div className="col-span-12">
          <LatestVideosWidget channels={starredChannels} />
        </div>

        {/* Row 3: Secondary Context */}
        <div className="col-span-12">
          <YouTubeSavedWidget />
        </div>
      </div>
    </div>
  );
}
