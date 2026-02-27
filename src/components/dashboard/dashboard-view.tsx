"use client";

import { useEffect, useState } from "react";
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
  const { favoriteChannels } = useMediaStore();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

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

  // Smart Focus: focus carousel dots on mount
  useEffect(() => {
    setTimeout(() => {
      const firstDot = document.querySelector('.carousel-indicator-dots') as HTMLElement;
      if (firstDot) firstDot.focus();
    }, 600);
  }, []);

  // تصفية القنوات المميزة بنجمة بناءً على حقل starred السحابي
  const starredChannels = favoriteChannels.filter(c => c.starred);

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
        {/* Left Column - 50/50 Split */}
        <div className="md:col-span-4 flex flex-col gap-6 h-full">
          {/* Main Hero Widget - Focusable as a whole */}
          <div 
            className="glass-panel rounded-[2.5rem] relative group overflow-hidden flex flex-col w-full shadow-2xl h-1/2 focusable outline-none"
            tabIndex={0}
            data-nav-id="widget-carousel-hero"
          >
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
                        <div className="relative w-full mb-4 flex flex-col items-center">
                          <span className="text-7xl font-black text-white/95 tracking-tighter drop-shadow-2xl">
                            {Math.round(weather.current.temp_c)}°
                          </span>
                          <div className="mt-2 flex items-center gap-2 bg-white/5 px-4 py-1 rounded-full border border-white/10 backdrop-blur-md">
                             <img src={weather.current.condition.icon} alt="Weather" className="w-10 h-10" />
                             <span className="text-[11px] font-black text-white/60 uppercase tracking-widest">{weather.current.condition.text}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 w-full max-w-[260px] mt-4">
                          <div className="metric-box py-3 bg-white/5 rounded-2xl border border-white/5">
                            <div className="text-blue-400 font-black text-sm">{weather.current.humidity}%</div>
                            <div className="text-[8px] text-white/20 font-bold uppercase mt-1">Hum</div>
                          </div>
                          <div className="metric-box py-3 bg-white/5 rounded-2xl border border-white/5">
                            <div className="text-yellow-400 font-black text-sm">{weather.current.uv}</div>
                            <div className="text-[8px] text-white/20 font-bold uppercase mt-1">UV</div>
                          </div>
                          <div className="metric-box py-3 bg-white/5 rounded-2xl border border-white/5">
                            <div className="text-accent font-black text-sm">{Math.round(weather.current.wind_kph)}</div>
                            <div className="text-[8px] text-white/20 font-bold uppercase mt-1">Wind</div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="animate-pulse text-white/20 font-black text-[12px] uppercase tracking-[0.5em]">Satellite Sync...</div>
                    )}
                  </div>
                </CarouselItem>
                <CarouselItem className="h-full flex items-center justify-center">
                  <PlayingNowWidget />
                </CarouselItem>
              </CarouselContent>
            </Carousel>

            <div 
              className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-20 p-2 rounded-full outline-none carousel-indicator-dots" 
            >
              {Array.from({ length: count }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1 rounded-full transition-all duration-500",
                    current === i ? "w-6 bg-primary shadow-[0_0_12px_hsl(var(--primary))]" : "w-1 bg-white/10"
                  )}
                />
              ))}
            </div>
          </div>

          {/* Prayer Countdown Widget */}
          <div className="h-1/2 w-full focusable outline-none rounded-[2.5rem]" tabIndex={0} data-nav-id="widget-prayer-countdown">
            <PrayerCountdownCard />
          </div>
        </div>

        {/* Middle Column - Car Image (Full Cover) */}
        <div 
          className="md:col-span-4 glass-panel rounded-[2.5rem] relative group flex flex-col items-center justify-center overflow-hidden h-full shadow-2xl focusable outline-none"
          tabIndex={0}
          data-nav-id="widget-car"
        >
          <div className="absolute inset-0 w-full h-full">
            <Image 
              src="https://dmusera.netlify.app/es350gb.png" 
              alt="Lexus ES350" 
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-1000 brightness-75 group-hover:brightness-100"
            />
          </div>
          <div className="absolute bottom-10 flex gap-4 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-500 bg-black/80 backdrop-blur-3xl p-3 rounded-full border border-white/20 shadow-2xl z-20">
            <button className="flex items-center gap-2 px-6 py-2.5 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all font-black text-[9px] text-white uppercase tracking-[0.2em] outline-none">
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
            <button className="flex items-center gap-2 px-6 py-2.5 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all font-black text-[9px] text-white uppercase tracking-[0.2em] outline-none">
              <Upload className="w-4 h-4" /> Sync
            </button>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
        </div>

        {/* Right Column - Map */}
        <div 
          className="md:col-span-4 glass-panel rounded-[2.5rem] overflow-hidden relative group shadow-2xl h-full focusable outline-none"
          tabIndex={0}
          data-nav-id="widget-map"
        >
          <MapWidget />
        </div>
      </div>

      {/* Prayer Timeline - Raised Higher */}
      <div 
        className="w-full glass-panel rounded-full p-4 shadow-xl transform scale-[0.8] mt-4 mb-[-2rem] origin-center focusable outline-none"
        tabIndex={0}
        data-nav-id="widget-prayer-timeline"
      >
        <PrayerTimelineWidget />
      </div>

      <div className="w-full space-y-6">
        <LatestVideosWidget channels={starredChannels} />
        <YouTubeSavedWidget />
      </div>
    </div>
  );
}