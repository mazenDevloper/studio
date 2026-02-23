"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { WEATHER_API_KEY } from "@/lib/constants";
import { Cloud, Sun, Search, Mic, Maximize2 } from "lucide-react";
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
import { cn } from "@/lib/utils";

interface WidgetLayout {
  id: string;
  colSpan: number;
  height: number;
}

export function DashboardView() {
  const [weather, setWeather] = useState<any>(null);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const { favoriteChannels, starredChannelIds } = useMediaStore();
  
  // Layout State for Resizable Widgets
  const [mapLayout, setMapLayout] = useState<WidgetLayout>({ id: 'map', colSpan: 8, height: 520 });
  const [stackLayout, setStackLayout] = useState<WidgetLayout>({ id: 'stack', colSpan: 4, height: 520 });
  const [resizingId, setResizingId] = useState<string | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

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

  // Handle Resize Logic
  const handleMouseDown = useCallback((id: string) => {
    longPressTimer.current = setTimeout(() => {
      setResizingId(id);
      document.body.style.cursor = 'nwse-resize';
    }, 500);
  }, []);

  const handleMouseUp = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    setResizingId(null);
    document.body.style.cursor = 'default';
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizingId) return;

    if (resizingId === 'map') {
      const newColSpan = Math.max(4, Math.min(10, Math.floor((e.clientX / window.innerWidth) * 12)));
      const newHeight = Math.max(300, Math.min(800, e.clientY - 100));
      setMapLayout(prev => ({ ...prev, colSpan: newColSpan, height: newHeight }));
      setStackLayout(prev => ({ ...prev, colSpan: 12 - newColSpan }));
    }
  }, [resizingId]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div className="p-6 h-full flex flex-col gap-8 bg-black overflow-y-auto custom-scrollbar">
      {/* Header HUD */}
      <header className="flex items-center justify-between px-4 h-16 shrink-0">
        <div className="flex items-center gap-4">
          {weather && (
            <div className="flex items-center gap-3 px-6 py-2 rounded-full bg-zinc-900/50 border border-white/5 backdrop-blur-xl shadow-lg">
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

      {/* Main Command Center Layout - 12 Column Grid */}
      <div className="grid grid-cols-12 gap-6 items-start shrink-0">
        {/* Left: Interactive Map - Resizable */}
        <div 
          className={cn(
            "relative group rounded-[2.5rem] overflow-hidden transition-all duration-300 col-span-12",
            `lg:col-span-${mapLayout.colSpan}`
          )}
          style={{ 
            height: mapLayout.height,
            gridColumn: `span ${mapLayout.colSpan} / span ${mapLayout.colSpan}` 
          }}
        >
          <MapWidget />
          
          {/* Resize Handle: Bottom Left */}
          <div 
            onMouseDown={() => handleMouseDown('map')}
            className="absolute bottom-6 left-6 w-12 h-12 bg-white/10 backdrop-blur-3xl rounded-2xl border border-white/20 flex items-center justify-center cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity z-30 active:bg-primary active:scale-90"
          >
            <Maximize2 className="w-6 h-6 text-white rotate-90" />
          </div>
        </div>

        {/* Right: Smart Stack & Reminders */}
        <div 
          className={cn(
            "flex flex-col gap-6 transition-all duration-300 col-span-12",
            `lg:col-span-${stackLayout.colSpan}`
          )} 
          style={{ 
            height: mapLayout.height,
            gridColumn: `span ${stackLayout.colSpan} / span ${stackLayout.colSpan}`
          }}
        >
          {/* Smart Stack Carousel */}
          <div className="flex-1 relative group overflow-hidden">
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
            
            {/* Dots Fixed Position at Bottom Over Cards */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
              {[0, 1, 2, 3].map((i) => (
                <div 
                  key={i} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${current === i ? "w-6 bg-primary shadow-glow" : "w-1.5 bg-white/20"}`}
                />
              ))}
            </div>
          </div>
          
          {/* Reminders - Intelligent Display */}
          <div className="h-[40%] min-h-[220px]">
            <RemindersWidget />
          </div>
        </div>
      </div>

      {/* Prayer Timeline Row - Centered and Distinct */}
      <div className="shrink-0 w-full z-10">
        <PrayerTimelineWidget />
      </div>

      {/* Video Bars Section - 12 Column Grid Base */}
      <div className="grid grid-cols-12 gap-6 shrink-0 pb-12">
        <div className="col-span-12 lg:col-span-6">
          <LatestVideosWidget channels={starredChannels} />
        </div>
        <div className="col-span-12 lg:col-span-6">
          <YouTubeSavedWidget />
        </div>
      </div>
    </div>
  );
}
