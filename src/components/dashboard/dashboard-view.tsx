
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

export function DashboardView() {
  const [weather, setWeather] = useState<any>(null);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });

    // Auto-scroll logic: changes card every 3 seconds
    const interval = setInterval(() => {
      api.scrollNext();
    }, 3000);

    return () => clearInterval(interval);
  }, [api]);

  useEffect(() => {
    fetch(`https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=Silicon Valley&aqi=no`)
      .then(res => res.json())
      .then(data => setWeather(data))
      .catch(err => console.error("Weather error:", err));
  }, []);

  return (
    <div className="p-6 h-full flex flex-col gap-6 bg-black overflow-hidden">
      {/* Header HUD */}
      <header className="flex items-center justify-between px-4 h-16">
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
      <div className="flex-1 grid grid-cols-12 gap-6 items-stretch overflow-hidden">
        {/* Left: Interactive Map (Main Focus) */}
        <div className="col-span-8 h-full rounded-[2.5rem] overflow-hidden">
          <MapWidget />
        </div>

        {/* Right: Smart Stack (Time, Moon, Calendar) */}
        <div className="col-span-4 flex flex-col gap-6 h-full overflow-hidden">
          <div className="h-[45%] relative group">
            <Carousel setApi={setApi} opts={{ loop: true }} className="w-full h-full">
              <CarouselContent className="h-full">
                <CarouselItem className="h-full">
                  <DateAndClockWidget />
                </CarouselItem>
                <CarouselItem className="h-full">
                  <MoonWidget />
                </CarouselItem>
                <CarouselItem className="h-full">
                  <CalendarWidget />
                </CarouselItem>
              </CarouselContent>
            </Carousel>
            
            {/* Scrolled Dots (Page Indicator) */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
              {[0, 1, 2].map((i) => (
                <div 
                  key={i} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${current === i ? "w-6 bg-primary" : "w-1.5 bg-white/20"}`}
                />
              ))}
            </div>
          </div>
          
          <div className="h-[55%]">
            <RemindersWidget />
          </div>
        </div>
      </div>

      {/* Footer: Floating Prayer Timeline */}
      <div className="h-24">
        <PrayerTimelineWidget />
      </div>
    </div>
  );
}
