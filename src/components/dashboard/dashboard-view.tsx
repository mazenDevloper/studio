
"use client";

import { useEffect, useState, useCallback } from "react";
import { WEATHER_API_KEY } from "@/lib/constants";
import { RotateCcw, Upload } from "lucide-react";
import Image from "next/image";
import { MapWidget } from "./widgets/map-widget";
import { PrayerTimelineWidget } from "./widgets/prayer-timeline-widget";
import { DateAndClockWidget } from "./widgets/date-and-clock-widget";
import { MoonWidget } from "./widgets/moon-widget";
import { PlayingNowWidget } from "./widgets/playing-now-widget";
import { LatestVideosWidget } from "./widgets/latest-videos-widget";
import { YouTubeSavedWidget } from "./widgets/youtube-saved-widget";
import { PrayerCountdownCard } from "./widgets/prayer-countdown-card";
import { useMediaStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";

export function DashboardView() {
  const [weather, setWeather] = useState<any>(null);
  const { favoriteChannels, starredChannelIds } = useMediaStore();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  const starredChannels = favoriteChannels.filter(c => starredChannelIds.includes(c.id));

  useEffect(() => {
    fetch(`https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=Salalah&aqi=no`)
      .then(res => res.json())
      .then(data => setWeather(data))
      .catch(err => console.error("Weather error:", err));
  }, []);

  useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });

    const interval = setInterval(() => {
      api.scrollNext();
    }, 4000);

    return () => clearInterval(interval);
  }, [api]);

  return (
    <div className="h-full w-full p-6 flex flex-col gap-6 relative overflow-y-auto pb-32 no-scrollbar">
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[50] opacity-80 pointer-events-none">
        <Image 
          src="https://dmusera.netlify.app/Lexus-Logo.wine.svg" 
          alt="Lexus" 
          width={160} 
          height={35} 
          className="invert brightness-200"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[460px]">
        {/* Left Column */}
        <div className="md:col-span-4 flex flex-col gap-6 h-full">
          <div className="glass-panel rounded-[2.5rem] relative group overflow-hidden flex flex-col w-full shadow-2xl h-1/2">
            <Carousel setApi={setApi} opts={{ loop: true }} className="flex-1 w-full h-full">
              <CarouselContent className="h-full">
                <CarouselItem className="h-full flex items-center justify-center">
                  <DateAndClockWidget />
                </CarouselItem>
                <CarouselItem className="h-full flex items-center justify-center">
                  <MoonWidget />
                </CarouselItem>
                <CarouselItem className="h-full">
                  <div className="h-full w-full p-6 flex flex-col items-center justify-center text-center">
                    {weather ? (
                      <>
                        <div className="relative w-full mb-6 flex flex-col items-center">
                          <span className="text-7xl font-black text-white/90 tracking-tighter drop-shadow-2xl">
                            {Math.round(weather.current.temp_c)}°
                          </span>
                          <div className="mt-2 flex items-center gap-2">
                             <img src={weather.current.condition.icon} alt="Weather" className="w-12 h-12" />
                             <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{weather.current.condition.text}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 w-full max-w-[280px]">
                          <div className="metric-box py-3">
                            <div className="text-blue-400 font-bold text-sm">{weather.current.humidity}%</div>
                            <div className="text-[8px] text-white/40 font-bold uppercase tracking-widest">Hum</div>
                          </div>
                          <div className="metric-box py-3">
                            <div className="text-yellow-400 font-bold text-sm">{weather.current.uv}</div>
                            <div className="text-[8px] text-white/40 font-bold uppercase tracking-widest">UV</div>
                          </div>
                          <div className="metric-box py-3">
                            <div className="text-accent font-bold text-sm">{Math.round(weather.current.wind_kph)}</div>
                            <div className="text-[8px] text-white/40 font-bold uppercase tracking-widest">Wind</div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="animate-pulse text-white/20 font-bold text-[10px] uppercase tracking-[0.4em]">Satellite Sync...</div>
                    )}
                  </div>
                </CarouselItem>
                <CarouselItem className="h-full flex items-center justify-center">
                  <PlayingNowWidget />
                </CarouselItem>
              </CarouselContent>
            </Carousel>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
              {Array.from({ length: count }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1 rounded-full transition-all duration-500",
                    current === i ? "w-6 bg-primary shadow-[0_0_8px_hsl(var(--primary))]" : "w-1 bg-white/10"
                  )}
                />
              ))}
            </div>
          </div>

          <div className="h-1/2 w-full">
            <PrayerCountdownCard />
          </div>
        </div>

        {/* Middle Column - Car ES350 covering all widget */}
        <div className="md:col-span-4 glass-panel rounded-[2.5rem] relative group flex flex-col items-center justify-center overflow-hidden h-full shadow-2xl">
          <div className="absolute inset-0 flex items-center justify-center w-full">
            <Image 
              src="https://dmusera.netlify.app/es350gb.png" 
              alt="Lexus ES350" 
              fill
              className="object-contain drop-shadow-[0_40px_80px_rgba(0,0,0,0.9)] scale-[1.2] group-hover:scale-[1.3] transition-transform duration-1000"
            />
          </div>
          <div className="absolute bottom-10 flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-black/80 backdrop-blur-3xl p-3 rounded-full border border-white/20 shadow-2xl z-20">
            <button className="flex items-center gap-2 px-6 py-2.5 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all font-black text-[9px] text-white uppercase tracking-[0.2em]">
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
            <button className="flex items-center gap-2 px-6 py-2.5 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all font-black text-[9px] text-white uppercase tracking-[0.2em]">
              <Upload className="w-4 h-4" /> Sync
            </button>
          </div>
          {/* Ambient Lighting */}
          <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-transparent pointer-events-none" />
        </div>

        {/* Right Column */}
        <div className="md:col-span-4 glass-panel rounded-[2.5rem] overflow-hidden relative group shadow-2xl h-full">
          <MapWidget />
        </div>
      </div>

      <div className="w-full glass-panel rounded-full p-4 shadow-xl transform scale-[0.8] mt-8 mb-[-2rem] origin-center">
        <PrayerTimelineWidget />
      </div>

      <div className="w-full space-y-2">
        <YouTubeSavedWidget />
      </div>
    </div>
  );
}
