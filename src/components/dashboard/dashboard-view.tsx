
"use client";

import { useEffect, useState } from "react";
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
import { WeatherWidget } from "./widgets/weather-widget";
import { useMediaStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";

export function DashboardView() {
  const { favoriteChannels } = useMediaStore();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });

    const interval = setInterval(() => {
      api.scrollNext();
    }, 5000);

    return () => clearInterval(interval);
  }, [api]);

  useEffect(() => {
    setTimeout(() => {
      const firstDot = document.querySelector('.carousel-indicator-dots') as HTMLElement;
      if (firstDot) firstDot.focus();
    }, 600);
  }, []);

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
          {/* Main Hero Widget */}
          <div 
            className="glass-panel rounded-[2.5rem] relative group overflow-hidden flex flex-col w-full shadow-2xl h-1/2 focusable outline-none"
            tabIndex={0}
            data-nav-id="widget-carousel-hero"
          >
            <Carousel setApi={setApi} opts={{ loop: true }} className="flex-1 w-full h-full overflow-hidden">
              <CarouselContent className="h-full">
                <CarouselItem className="h-full flex items-center justify-center">
                  <DateAndClockWidget />
                </CarouselItem>
                <CarouselItem className="h-full flex items-center justify-center">
                  <MoonWidget />
                </CarouselItem>
                <CarouselItem className="h-full">
                  <WeatherWidget />
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

        {/* Middle Column - Car Image */}
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
