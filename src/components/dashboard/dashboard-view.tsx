
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { MoonWidget } from "./widgets/moon-widget";
import { DateAndClockWidget } from "./widgets/date-and-clock-widget";
import { WeatherWidget } from "./widgets/weather-widget";
import { PlayingNowWidget } from "./widgets/playing-now-widget";
import { PrayerTimelineWidget } from "./widgets/prayer-timeline-widget";
import { MapWidget } from "./widgets/map-widget";
import { ReminderSummaryWidget } from "./widgets/reminder-summary-widget";
import { ActiveAzkarWidget } from "./widgets/active-azkar-widget";
import { useMediaStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Carousel, CarouselContent, CarouselItem, CarouselApi } from "@/components/ui/carousel";
import { X } from "lucide-react";

const LatestVideosWidget = dynamic(() => import("./widgets/latest-videos-widget").then(m => m.LatestVideosWidget), { 
  ssr: false,
  loading: () => <div className="h-64 w-full bg-zinc-900/20 animate-pulse rounded-[2.5rem]" />
});

const YouTubeSavedWidget = dynamic(() => import("./widgets/youtube-saved-widget").then(m => m.YouTubeSavedWidget), { 
  ssr: false,
  loading: () => <div className="h-64 w-full bg-zinc-900/20 animate-pulse rounded-[2.5rem]" />
});

const STATIC_WALL_BACKGROUNDS = [
  { id: 'art-1', name: 'زيتي تجريدي', url: 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?q=80&w=2000' },
  { id: 'art-2', name: 'ألوان مائية', url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=2000' },
  { id: 'art-3', name: 'نسيج قماشي', url: 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?q=80&w=2000' },
  { id: 'art-4', name: 'ظلال الرخام', url: 'https://images.unsplash.com/photo-1533154683836-84ea7a0bc310?q=80&w=2000' }
];

export function DashboardView() {
  const { 
    favoriteChannels, 
    activeVideo, 
    wallPlateType, 
    wallPlateData, 
    setWallPlate, 
    mapSettings, 
    updateMapSettings,
    customManuscripts,
    customWallBackgrounds,
  } = useMediaStore();
  
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const [windowWidth, setWindowWidth] = useState(0);

  // Wall Plate Runtime State
  const [mIdx, setMIdx] = useState(0);
  const [bgIdx, setBgIdx] = useState(0);
  const [hue, setHue] = useState(340); 
  const [brightness, setBrightness] = useState(0.6);

  const allBackgrounds = useMemo(() => {
    return [...STATIC_WALL_BACKGROUNDS.map(b => b.url), ...customWallBackgrounds];
  }, [customWallBackgrounds]);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!api) return;
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api, activeVideo]);

  // PRIORITY FOCUS: Target reminders summary on entry
  useEffect(() => {
    const timer = setTimeout(() => {
      const reminders = document.querySelector('[data-nav-id="reminder-summary-0"]') as HTMLElement;
      if (reminders) {
        reminders.focus();
        reminders.classList.add('active-nav-target');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (wallPlateType === 'manuscript' && wallPlateData) {
      const idx = customManuscripts.findIndex(m => m.id === wallPlateData.id);
      if (idx > -1) setMIdx(idx);
      
      const bIdx = allBackgrounds.findIndex(url => url === mapSettings.manuscriptBgUrl);
      if (bIdx > -1) setBgIdx(bIdx);
    }
  }, [wallPlateType, wallPlateData, customManuscripts, allBackgrounds, mapSettings.manuscriptBgUrl]);

  useEffect(() => {
    if (!wallPlateType) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement;
      if (activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA') return;

      if (e.key === "1") {
        e.preventDefault();
        setMIdx(prev => (prev - 1 + customManuscripts.length) % Math.max(1, customManuscripts.length));
      } else if (e.key === "3") {
        e.preventDefault();
        setMIdx(prev => (prev + 1) % Math.max(1, customManuscripts.length));
      }
      else if (e.key === "2") {
        e.preventDefault();
        setBrightness(prev => Math.min(prev + 0.2, 2.5));
      } else if (e.key === "8") {
        e.preventDefault();
        setBrightness(prev => Math.max(prev - 0.2, 0.1));
      }
      else if (e.key === "4") {
        e.preventDefault();
        setHue(prev => (prev - 40 + 360) % 360);
      } else if (e.key === "6") {
        e.preventDefault();
        setHue(prev => (prev + 40) % 360);
      }
      else if (e.key === "7") {
        e.preventDefault();
        const nextBgIdx = (bgIdx - 1 + allBackgrounds.length) % Math.max(1, allBackgrounds.length);
        setBgIdx(nextBgIdx);
        updateMapSettings({ manuscriptBgUrl: allBackgrounds[nextBgIdx] });
      } else if (e.key === "9") {
        e.preventDefault();
        const nextBgIdx = (bgIdx + 1) % Math.max(1, allBackgrounds.length);
        setBgIdx(nextBgIdx);
        updateMapSettings({ manuscriptBgUrl: allBackgrounds[nextBgIdx] });
      }
      else if (e.key === "0") {
        e.preventDefault();
        setWallPlate(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [wallPlateType, customManuscripts, allBackgrounds, bgIdx, updateMapSettings, setWallPlate]);

  const isWideScreen = windowWidth > 968;
  const activeM = wallPlateType === 'manuscript' ? (customManuscripts[mIdx] || wallPlateData) : null;

  return (
    <div className="h-full w-full p-6 flex flex-col gap-6 relative overflow-y-auto pb-32 no-scrollbar bg-black">
      <div className="h-24 shrink-0 w-full" />

      {wallPlateType && (
        <div className="fixed inset-0 z-[20000] bg-black flex items-center justify-center animate-in fade-in duration-700">
          <button 
            className="absolute top-10 right-10 w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white focusable z-[20001]"
            onClick={() => setWallPlate(null)}
          >
            <X className="w-8 h-8" />
          </button>
          
          <div className="w-full h-full flex items-center justify-center overflow-hidden">
            {wallPlateType === 'moon' && (
              <div className="relative w-full h-full animate-in zoom-in-95 duration-1000 flex items-center justify-center bg-black">
                <div className="relative h-screen w-screen flex items-center justify-center">
                  <Image src={wallPlateData.image} alt="Moon" fill className="object-contain" unoptimized />
                </div>
              </div>
            )}
            {wallPlateType === 'manuscript' && (
              <div className="relative w-full h-full animate-in zoom-in-95 duration-1000 flex items-center justify-center">
                {mapSettings.showManuscriptBg && (
                  <div className="absolute inset-0 z-0">
                    <Image src={mapSettings.manuscriptBgUrl} alt="Wall Background" fill className="object-cover" priority />
                  </div>
                )}
                
                <div className="relative z-10 w-full h-full flex items-center justify-center px-10">
                  {activeM?.type === 'text' ? (
                    <p 
                      className="w-full text-7xl md:text-9xl lg:text-[11rem] font-calligraphy leading-relaxed text-center px-10 transition-all duration-500 text-white"
                      style={{ textShadow: '0 0 50px rgba(0,0,0,0.5)' }}
                    >
                      {activeM.content}
                    </p>
                  ) : activeM ? (
                    <div className="relative z-10 w-full flex items-center justify-center">
                      <img 
                        alt="Manuscript" 
                        src={activeM.content}
                        className="max-h-[95vh] w-auto object-contain transition-all duration-300"
                        style={{
                          filter: `sepia(1) saturate(2) hue-rotate(${hue}deg) brightness(${brightness})`,
                        }}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[50] opacity-80 pointer-events-none">
        <Image src="https://dmusera.netlify.app/Lexus-Logo.wine.svg" alt="Lexus" width={140} height={30} className="invert brightness-200" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[480px]">
        {/* Level 1: Left Widget (Azkar or Map) */}
        <div className="md:col-span-4 rounded-[2.5rem] overflow-hidden relative shadow-2xl h-[480px] bg-black self-start focusable" tabIndex={0} data-nav-id="dashboard-col-0">
          {isWideScreen ? <ActiveAzkarWidget /> : <MapWidget />}
        </div>

        {/* Level 1: Center Widget (The prioritized Reminders) */}
        <div className="md:col-span-4 rounded-[2.5rem] relative flex items-center justify-center overflow-hidden h-[480px] shadow-2xl focusable bg-black outline-none" tabIndex={0} data-nav-id="reminder-summary-0">
          <ReminderSummaryWidget />
        </div>

        {/* Level 1: Right Column (Carousel + Clock) */}
        <div className="md:col-span-4 flex flex-col gap-4 h-[480px] relative">
          <div 
            className="flex-1 relative overflow-hidden group bg-black rounded-[2.5rem] shadow-2xl focusable outline-none" 
            tabIndex={0} 
            data-nav-id="dashboard-carousel-0"
          >
            <Carousel setApi={setApi} opts={{ loop: true }} className="w-full h-full">
              <CarouselContent className="h-full ml-0 overflow-hidden no-scrollbar">
                <CarouselItem className="pl-0 h-full flex items-center justify-center bg-black">
                  <MoonWidget />
                </CarouselItem>
                {activeVideo && (
                  <CarouselItem className="pl-0 h-full flex items-center justify-center bg-black">
                    <PlayingNowWidget />
                  </CarouselItem>
                )}
              </CarouselContent>
            </Carousel>
            {count > 1 && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
                {Array.from({ length: count }).map((_, i) => (
                  <div key={i} className={cn("h-1.5 rounded-full transition-all duration-500", current === i ? "bg-primary w-6 shadow-[0_0_10px_#0088ff]" : "bg-white/20 w-1.5")} />
                ))}
              </div>
            )}
          </div>
          <div className="flex-[0.35] rounded-[2.5rem] relative overflow-hidden shadow-2xl focusable bg-black" tabIndex={0} data-nav-id="clock-widget-0">
            <DateAndClockWidget />
          </div>
        </div>
      </div>

      {/* Level 2: Prayer Timeline */}
      <div className="w-full p-0 shadow-xl focusable bg-black rounded-[2.5rem] overflow-hidden outline-none" tabIndex={0} data-nav-id="prayer-timeline-0">
        <PrayerTimelineWidget />
      </div>

      {/* Level 3+: Dynamic Feeds */}
      <div className="w-full space-y-8 pb-12 bg-black">
        <LatestVideosWidget channels={Array.isArray(favoriteChannels) ? favoriteChannels.filter(c => c?.starred) : []} />
        <YouTubeSavedWidget />
      </div>
    </div>
  );
}
