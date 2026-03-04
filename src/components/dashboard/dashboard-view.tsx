
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { MoonWidget } from "./widgets/moon-widget";
import { DateAndClockWidget } from "./widgets/date-and-clock-widget";
import { WeatherWidget } from "./widgets/weather-widget";
import { PlayingNowWidget } from "./widgets/playing-now-widget";
import { PrayerTimelineWidget } from "./widgets/prayer-timeline-widget";
import { MapWidget } from "./widgets/map-widget";
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
    const interval = setInterval(() => { api.scrollNext(); }, 10000);
    return () => clearInterval(interval);
  }, [api]);

  const starredChannels = favoriteChannels.filter(c => c.starred);

  return (
    <div className="h-full w-full p-6 flex flex-col gap-6 relative overflow-y-auto pb-32 no-scrollbar">
      {/* Lexus Logo */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[50] opacity-80 pointer-events-none">
        <Image 
          src="https://dmusera.netlify.app/Lexus-Logo.wine.svg" 
          alt="Lexus" 
          width={140} 
          height={30} 
          className="invert brightness-200"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[380px]">
        {/* Left: Map */}
        <div className="md:col-span-4 glass-panel rounded-[2.5rem] overflow-hidden relative shadow-2xl h-full focusable" tabIndex={0} data-nav-id="widget-map">
          <MapWidget />
        </div>

        {/* Middle: Car Image */}
        <div className="md:col-span-4 glass-panel rounded-[2.5rem] relative group flex flex-col items-center justify-center overflow-hidden h-full shadow-2xl focusable" tabIndex={0} data-nav-id="widget-car">
          <div className="absolute inset-0 w-full h-full p-8 flex items-center justify-center">
            <Image 
              src="https://dmusera.netlify.app/es350gb.png" 
              alt="Lexus ES" 
              width={600}
              height={300}
              className="object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)] transition-transform duration-1000 group-hover:scale-110"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
        </div>

        {/* Right: Hero Carousel */}
        <div className="md:col-span-4 flex flex-col h-full">
          <div className="glass-panel rounded-[2.5rem] relative group overflow-hidden flex flex-col w-full shadow-2xl flex-1 focusable outline-none" tabIndex={0} data-nav-id="widget-carousel-hero">
            <Carousel setApi={setApi} opts={{ loop: true }} className="flex-1 w-full h-full overflow-hidden">
              <CarouselContent className="h-full ml-0">
                <CarouselItem className="h-full pl-0 flex items-center justify-center">
                  <MoonWidget />
                </CarouselItem>
                <CarouselItem className="h-full pl-0 flex items-center justify-center">
                  <DateAndClockWidget />
                </CarouselItem>
                <CarouselItem className="h-full pl-0 flex items-center justify-center">
                  <WeatherWidget />
                </CarouselItem>
                <CarouselItem className="h-full pl-0 flex items-center justify-center">
                  <PlayingNowWidget />
                </CarouselItem>
              </CarouselContent>
            </Carousel>

            {/* Scrolled Dots */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
              {Array.from({ length: count }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1 rounded-full transition-all duration-500",
                    current === i 
                      ? "w-6 bg-primary shadow-[0_0_8px_hsl(var(--primary))]" 
                      : "w-1 bg-white/20"
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Prayer Timeline - Always visible below the main row */}
      <div className="w-full glass-panel rounded-[2.5rem] p-4 shadow-xl focusable outline-none" tabIndex={0} data-nav-id="widget-prayer-timeline">
        <PrayerTimelineWidget />
      </div>

      {/* Bottom Area */}
      <div className="w-full space-y-8">
        <LatestVideosWidget channels={starredChannels} />
        <YouTubeSavedWidget />
      </div>
    </div>
  );
}
