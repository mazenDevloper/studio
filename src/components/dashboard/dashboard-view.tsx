
"use client";

import { useEffect, useState } from "react";
import { WEATHER_API_KEY } from "@/lib/constants";
import { Cloud, Sun, Search, Mic } from "lucide-react";
import Link from "next/link";
import { RemindersWidget } from "./widgets/reminders-widget";
import { MapWidget } from "./widgets/map-widget";
import { PrayerTimelineWidget } from "./widgets/prayer-timeline-widget";
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  type CarouselApi 
} from "@/components/ui/carousel";
import { DateAndClockWidget } from "./widgets/date-and-clock-widget";
import { MoonWidget } from "./widgets/moon-widget";
import { CalendarWidget } from "./widgets/calendar-widget";
import { PlayingNowWidget } from "./widgets/playing-now-widget";
import { LatestVideosWidget } from "./widgets/latest-videos-widget";
import { YouTubeSavedWidget } from "./widgets/youtube-saved-widget";
import { useMediaStore } from "@/lib/store";

export function DashboardView() {
  const [weather, setWeather] = useState<any>(null);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const { favoriteChannels, starredChannelIds } = useMediaStore();

  const starredChannels = favoriteChannels.filter(c => starredChannelIds.includes(c.id));

  useEffect(() => {
    if (!api) return;
    
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });

    const interval = setInterval(() => {
      api.scrollNext();
    }, 4000);

    return () => clearInterval(interval);
  }, [api]);

  useEffect(() => {
    fetch(`https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=Silicon Valley&aqi=no`)
      .then(res => res.json())
      .then(data => setWeather(data))
      .catch(err => console.error("Weather error:", err));
  }, []);

  return (
    <div className="p-6 h-full flex flex-col gap-6 bg-black overflow-y-auto custom-scrollbar">
      {/* Header HUD */}
      <header className="flex items-center justify-between px-4 h-16 shrink-0">
        <div className="flex items-center gap-4">
          {weather && (
            <div className="flex items-center gap-3 px-5 py-2 rounded-full bg-zinc-900/50 border border-white/5 backdrop-blur-xl shadow-lg">
              {weather.current.condition.text.includes('Sun') ? <Sun className="text-yellow-400 w-5 h-5" /> : <Cloud className="text-blue-400 w-5 h-5" />}
              <div className="flex flex-col">
                <span className="text-sm font-bold leading-none text-white">{weather.current.temp_c}°C</span>
                <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-widest">{weather.current.condition.text}</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <Link href="/media" className="w-12 h-12 rounded-full bg-zinc-900/80 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all active:scale-95">
            <Search className="w-5 h-5 text-white" />
          </Link>
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg active-glow transition-all active:scale-90">
            <Mic className="w-6 h-6 text-white" />
          </div>
          <div className="h-1 w-24 rounded-full siri-gradient" />
        </div>
      </header>

      {/* Main Command Center Layout */}
      <div className="grid grid-cols-12 gap-6 items-stretch shrink-0">
        {/* Left: Interactive Map */}
        <div className="col-span-12 lg:col-span-8 h-[500px] lg:h-auto min-h-[400px] rounded-[2.5rem] overflow-hidden">
          <MapWidget />
        </div>

        {/* Right: Smart Stack & Reminders */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6 min-h-[500px]">
          <div className="h-1/2 relative group">
            <Carousel setApi={setApi} opts={{ loop: true }} className="w-full h-full">
              <CarouselContent className="h-full ml-0">
                <CarouselItem className="h-full pl-0">
                  <DateAndClockWidget />
                </CarouselItem>
                <CarouselItem className="h-full pl-0">
                  <MoonWidget />
                </CarouselItem>
                <CarouselItem className="h-full pl-0">
                  <CalendarWidget />
                </CarouselItem>
                <CarouselItem className="h-full pl-0">
                  <PlayingNowWidget />
                </CarouselItem>
              </CarouselContent>
            </Carousel>
            
            {/* Scrolled Dots - Fixed position at the bottom center of the card area */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
              {[0, 1, 2, 3].map((i) => (
                <div 
                  key={i} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${current === i ? "w-6 bg-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]" : "w-1.5 bg-white/20"}`}
                />
              ))}
            </div>
          </div>
          
          <div className="h-1/2">
            <RemindersWidget />
          </div>
        </div>
      </div>

      {/* Video Bars Section */}
      <div className="grid grid-cols-12 gap-6 shrink-0">
        <div className="col-span-12 lg:col-span-6">
          <LatestVideosWidget channels={starredChannels} />
        </div>
        <div className="col-span-12 lg:col-span-6">
          <YouTubeSavedWidget />
        </div>
      </div>

      {/* Footer: Floating Prayer Timeline */}
      <div className="h-24 shrink-0 mt-auto">
        <PrayerTimelineWidget />
      </div>
    </div>
  );
}
