
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

      {/* Main Grid: Smart Stack + Main Content */}
      <div className="grid grid-cols-12 gap-6 min-h-[500px]">
        
        {/* Column 1: Smart Stack (4 units wide) */}
        <div className="col-span-4 glass-panel rounded-[2.5rem] relative group overflow-hidden flex flex-col aspect-[3/4]">
          <Carousel setApi={setApi} opts={{ loop: true }} className="flex-1 w-full h-full">
            <CarouselContent className="h-full">
              <CarouselItem className="h-full">
                <DateAndClockWidget />
              </CarouselItem>
              <CarouselItem className="h-full">
                <MoonWidget />
              </CarouselItem>
              <CarouselItem className="h-full">
                <div className="h-full w-full p-8 flex flex-col items-center justify-center text-center">
                  {weather ? (
                    <>
                      <div className="relative w-full mb-6">
                        <span className="text-8xl font-black text-white/90 tracking-tighter drop-shadow-2xl">
                          {Math.round(weather.current.temp_c)}°
                        </span>
                        <div className="absolute -top-6 -right-2">
                          <img src={weather.current.condition.icon} alt="Weather" className="w-20 h-20 animate-pulse" />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 w-full">
                        <div className="metric-box py-4">
                          <div className="text-blue-400 font-bold text-lg">{weather.current.humidity}%</div>
                          <div className="text-[10px] text-white/40 font-bold uppercase">Hum</div>
                        </div>
                        <div className="metric-box py-4">
                          <div className="text-yellow-400 font-bold text-lg">{weather.current.uv}</div>
                          <div className="text-[10px] text-white/40 font-bold uppercase">UV</div>
                        </div>
                        <div className="metric-box py-4">
                          <div className="text-accent font-bold text-lg">{Math.round(weather.current.temp_c)}°</div>
                          <div className="text-[10px] text-white/40 font-bold uppercase">Temp</div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="animate-pulse text-white/20 font-bold text-xl uppercase tracking-widest">Loading Satellite...</div>
                  )}
                </div>
              </CarouselItem>
              <CarouselItem className="h-full">
                <PlayingNowWidget />
              </CarouselItem>
            </CarouselContent>
          </Carousel>

          {/* Dots Indicator: Centered over cards */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-20">
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

        {/* Column 2: Map & Car (8 units wide) */}
        <div className="col-span-8 flex flex-col gap-6">
          <div className="flex-1 glass-panel rounded-[2.5rem] overflow-hidden relative group min-h-[350px]">
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
          
          <div className="h-[150px] glass-panel rounded-[2.5rem] relative group flex items-center justify-center overflow-hidden">
            <Image 
              src="https://dmusera.netlify.app/es350gb.png" 
              alt="Lexus ES350" 
              width={400} 
              height={200}
              className="object-contain drop-shadow-[0_15px_40px_rgba(0,0,0,0.8)] group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute bottom-4 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              <button className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/10 rounded-full hover:bg-white/20 transition-all font-bold text-xs">
                <RotateCcw className="w-3 h-3" /> إعادة تعيين
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/10 rounded-full hover:bg-white/20 transition-all font-bold text-xs">
                <Upload className="w-3 h-3" /> تحميل
              </button>
            </div>
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
