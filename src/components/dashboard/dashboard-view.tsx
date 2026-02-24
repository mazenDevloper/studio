
"use client";

import { useEffect, useState } from "react";
import { WEATHER_API_KEY } from "@/lib/constants";
import { Mic, Navigation, Maximize2, RotateCcw, Upload, MapPin } from "lucide-react";
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

  return (
    <div className="h-full w-full p-6 flex flex-col gap-8 relative overflow-y-auto pb-32">
      {/* Top Floating Logo */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[50] opacity-80 pointer-events-none">
        <Image 
          src="https://dmusera.netlify.app/Lexus-Logo.wine.svg" 
          alt="Lexus" 
          width={160} 
          height={35} 
          className="invert brightness-200"
        />
      </div>

      {/* Main Grid: 3 Main Columns */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[650px]">
        
        {/* Column 1: Left (Carousel + Countdown) - Span 3 */}
        <div className="md:col-span-3 flex flex-col gap-6">
          {/* Smart Stack (Carousel) - 4x3 H:W ratio */}
          <div className="glass-panel rounded-[2.5rem] relative group overflow-hidden flex flex-col aspect-[3/4] w-full shadow-2xl">
            <Carousel setApi={setApi} opts={{ loop: true }} className="flex-1 w-full h-full">
              <CarouselContent className="h-full">
                <CarouselItem className="h-full">
                  <DateAndClockWidget />
                </CarouselItem>
                <CarouselItem className="h-full">
                  <MoonWidget />
                </CarouselItem>
                <CarouselItem className="h-full">
                  <div className="h-full w-full p-6 flex flex-col items-center justify-center text-center">
                    {weather ? (
                      <>
                        <div className="relative w-full mb-6">
                          <span className="text-7xl font-black text-white/90 tracking-tighter drop-shadow-2xl">
                            {Math.round(weather.current.temp_c)}°
                          </span>
                          <div className="absolute -top-6 -right-2">
                            <img src={weather.current.condition.icon} alt="Weather" className="w-20 h-20 animate-pulse" />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 w-full">
                          <div className="metric-box py-4">
                            <div className="text-blue-400 font-bold text-base">{weather.current.humidity}%</div>
                            <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Hum</div>
                          </div>
                          <div className="metric-box py-4">
                            <div className="text-yellow-400 font-bold text-base">{weather.current.uv}</div>
                            <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest">UV</div>
                          </div>
                          <div className="metric-box py-4">
                            <div className="text-accent font-bold text-base">{Math.round(weather.current.temp_c)}°</div>
                            <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Temp</div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="animate-pulse text-white/20 font-bold text-sm uppercase tracking-widest">Loading Satellite...</div>
                    )}
                  </div>
                </CarouselItem>
                <CarouselItem className="h-full">
                  <PlayingNowWidget />
                </CarouselItem>
              </CarouselContent>
            </Carousel>

            {/* Dots Indicator: Fixed bottom center */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
              {Array.from({ length: count }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-500",
                    current === i ? "w-8 bg-primary shadow-[0_0_10px_hsl(var(--primary))]" : "w-1.5 bg-white/20"
                  )}
                />
              ))}
            </div>
          </div>

          {/* Prayer Countdown Widget (Below Carousel) */}
          <div className="flex-1 min-h-[200px]">
            <PrayerCountdownCard />
          </div>
        </div>

        {/* Column 2: Middle (Car Display) - Span 5 */}
        <div className="md:col-span-5 glass-panel rounded-[2.5rem] relative group flex flex-col items-center justify-center overflow-hidden">
          <div className="flex-1 flex items-center justify-center w-full p-8">
            <Image 
              src="https://dmusera.netlify.app/es350gb.png" 
              alt="Lexus ES350" 
              width={600} 
              height={300}
              className="object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.9)] group-hover:scale-105 transition-transform duration-700"
            />
          </div>
          <div className="absolute bottom-10 flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-black/60 backdrop-blur-2xl p-3 rounded-full border border-white/10 shadow-2xl">
            <button className="flex items-center gap-2 px-6 py-3 bg-white/10 border border-white/10 rounded-full hover:bg-white/20 transition-all font-bold text-xs text-white">
              <RotateCcw className="w-4 h-4" /> إعادة تعيين
            </button>
            <button className="flex items-center gap-2 px-6 py-3 bg-white/10 border border-white/10 rounded-full hover:bg-white/20 transition-all font-bold text-xs text-white">
              <Upload className="w-4 h-4" /> تحميل
            </button>
          </div>
        </div>

        {/* Column 3: Right (Map Display) - Span 4 */}
        <div className="md:col-span-4 glass-panel rounded-[2.5rem] overflow-hidden relative group shadow-2xl">
          <MapWidget />
        </div>
      </div>

      {/* Standalone Prayer Timeline Bar - Above Video Bars */}
      <div className="w-full glass-panel rounded-full p-4 shadow-xl mb-2">
        <PrayerTimelineWidget />
      </div>

      {/* Suggested Bar Section */}
      <div className="w-full space-y-2">
        <LatestVideosWidget channels={favoriteChannels} />
      </div>

      {/* Saved Video Bar Section */}
      <div className="w-full space-y-2">
        <YouTubeSavedWidget />
      </div>

      {/* Floating Mic Button */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100]">
        <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.6)] active-glow cursor-pointer hover:scale-110 transition-all border-4 border-white/10 backdrop-blur-xl">
          <Mic className="w-10 h-10 text-white" />
        </div>
      </div>
    </div>
  );
}
