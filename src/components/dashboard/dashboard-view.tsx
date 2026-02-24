
"use client";

import { useEffect, useState } from "react";
import { WEATHER_API_KEY } from "@/lib/constants";
import { Mic, Navigation, Maximize2, RotateCcw, Upload } from "lucide-react";
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
    <div className="h-full w-full p-6 flex flex-col gap-6 relative overflow-y-auto pb-32">
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
      <div className="grid grid-cols-12 gap-6 min-h-[600px]">
        
        {/* Column 1: Left (Carousel + Countdown) - Span 3 */}
        <div className="col-span-3 flex flex-col gap-6">
          {/* Smart Stack (Carousel) */}
          <div className="glass-panel rounded-[2.5rem] relative group overflow-hidden flex flex-col aspect-[4/3] w-full">
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
                        <div className="relative w-full mb-4">
                          <span className="text-6xl font-black text-white/90 tracking-tighter drop-shadow-2xl">
                            {Math.round(weather.current.temp_c)}°
                          </span>
                          <div className="absolute -top-4 -right-2">
                            <img src={weather.current.condition.icon} alt="Weather" className="w-16 h-16 animate-pulse" />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 w-full">
                          <div className="metric-box py-3">
                            <div className="text-blue-400 font-bold text-sm">{weather.current.humidity}%</div>
                            <div className="text-[8px] text-white/40 font-bold uppercase">Hum</div>
                          </div>
                          <div className="metric-box py-3">
                            <div className="text-yellow-400 font-bold text-sm">{weather.current.uv}</div>
                            <div className="text-[8px] text-white/40 font-bold uppercase">UV</div>
                          </div>
                          <div className="metric-box py-3">
                            <div className="text-accent font-bold text-sm">{Math.round(weather.current.temp_c)}°</div>
                            <div className="text-[8px] text-white/40 font-bold uppercase">Temp</div>
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

            {/* Dots Indicator: Fixed center bottom */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
              {Array.from({ length: count }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1 rounded-full transition-all duration-500",
                    current === i ? "w-6 bg-primary shadow-[0_0_8px_hsl(var(--primary))]" : "w-1 bg-white/20"
                  )}
                />
              ))}
            </div>
          </div>

          {/* Prayer Countdown Widget (Below Carousel) */}
          <div className="flex-1 min-h-[180px]">
            <PrayerCountdownCard />
          </div>
        </div>

        {/* Column 2: Middle (Car Display) - Span 5 */}
        <div className="col-span-5 glass-panel rounded-[2.5rem] relative group flex flex-col items-center justify-center overflow-hidden">
          <div className="flex-1 flex items-center justify-center w-full">
            <Image 
              src="https://dmusera.netlify.app/es350gb.png" 
              alt="Lexus ES350" 
              width={500} 
              height={250}
              className="object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.9)] group-hover:scale-105 transition-transform duration-700"
            />
          </div>
          <div className="absolute bottom-8 flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-black/40 backdrop-blur-xl p-2 rounded-full border border-white/5">
            <button className="flex items-center gap-2 px-5 py-2.5 bg-white/10 border border-white/10 rounded-full hover:bg-white/20 transition-all font-bold text-xs text-white">
              <RotateCcw className="w-4 h-4" /> إعادة تعيين
            </button>
            <button className="flex items-center gap-2 px-5 py-2.5 bg-white/10 border border-white/10 rounded-full hover:bg-white/20 transition-all font-bold text-xs text-white">
              <Upload className="w-4 h-4" /> تحميل
            </button>
          </div>
        </div>

        {/* Column 3: Right (Map Display) - Span 4 */}
        <div className="col-span-4 glass-panel rounded-[2.5rem] overflow-hidden relative group">
          <MapWidget />
          <div className="absolute top-6 right-6 z-20">
            <button className="w-12 h-12 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 flex items-center justify-center hover:bg-primary transition-all">
              <Maximize2 className="w-6 h-6 text-white" />
            </button>
          </div>
          <div className="absolute bottom-6 left-6 z-20 bg-black/60 backdrop-blur-xl p-3 rounded-2xl border border-white/10 flex items-center gap-3">
            <Navigation className="w-5 h-5 text-blue-400" />
            <span className="text-xs font-bold text-white/80">صلالة، سلطنة عمان</span>
          </div>
        </div>
      </div>

      {/* Suggested Bar Section */}
      <div className="w-full">
        <LatestVideosWidget channels={favoriteChannels} />
      </div>

      {/* Saved Video Bar Section */}
      <div className="w-full">
        <YouTubeSavedWidget />
      </div>

      {/* Floating Footer: Prayer Timeline */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-6xl z-[100] animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="bg-black/60 backdrop-blur-3xl border border-white/10 rounded-full p-2 shadow-2xl flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg active-glow cursor-pointer hover:scale-110 transition-all">
            <Mic className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <PrayerTimelineWidget />
          </div>
        </div>
      </div>
    </div>
  );
}
