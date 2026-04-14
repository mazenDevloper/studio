
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { MoonWidget } from "./widgets/moon-widget";
import { DateAndClockWidget } from "./widgets/date-and-clock-widget";
import { PlayingNowWidget } from "./widgets/playing-now-widget";
import { PrayerTimelineWidget } from "./widgets/prayer-timeline-widget";
import { MapWidget } from "./widgets/map-widget";
import { ReminderSummaryWidget } from "./widgets/reminder-summary-widget";
import { ActiveAzkarWidget } from "./widgets/active-azkar-widget";
import { useMediaStore } from "@/lib/store";
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

/**
 * DashboardView v72.0 - Wall Mode No-Blur & Saved Content Fix
 */
export function DashboardView() {
  const { 
    favoriteChannels, activeVideo, wallPlateType, wallPlateData, 
    mapSettings, setWallPlate: updateWallPlate
  } = useMediaStore();
  
  const [api, setApi] = useState<CarouselApi>();
  const [windowWidth, setWindowWidth] = useState(0);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isWideScreen = windowWidth > 968;

  return (
    <div className="h-full w-full p-6 flex flex-col gap-8 relative overflow-y-auto pb-32 no-scrollbar bg-black">
      <div className="h-20 shrink-0 w-full" />

      {wallPlateType && (
        <div className="fixed inset-0 z-[20000] bg-black flex items-center justify-center animate-in fade-in duration-700 p-0 m-0 overflow-hidden">
          <button 
            className="absolute top-10 right-10 w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white focusable z-[20001]"
            onClick={() => updateWallPlate(null)}
          >
            <X className="w-8 h-8" />
          </button>
          <div className="w-full h-full flex items-center justify-center overflow-hidden p-0 m-0 relative">
            {wallPlateType === 'moon' && (
              <div className="relative w-full h-full flex items-center justify-center bg-black p-0 m-0">
                <Image src={wallPlateData.image} alt="Moon" fill className="object-contain" unoptimized />
              </div>
            )}
            {wallPlateType === 'manuscript' && (
              <div className="relative w-full h-full flex items-center justify-center p-0 m-0">
                <div className="absolute inset-0 z-0">
                  <Image 
                    src={mapSettings.manuscriptBgUrl || "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?q=80&w=2000"} 
                    alt="Wall Background" 
                    fill 
                    className="object-cover opacity-90" 
                    priority 
                  />
                  {/* Blur removed for Zero-Blur well mode */}
                </div>
                <div className="relative z-10 w-full h-full flex items-center justify-center px-0 m-0">
                  {wallPlateData?.type === 'text' ? (
                    <div className="flex flex-col items-center justify-center w-full h-full max-w-full p-0 m-0">
                      <p className="text-6xl md:text-8xl lg:text-[14rem] font-calligraphy text-center text-white leading-[1.1] drop-shadow-[0_0_60px_rgba(255,255,255,0.8)] animate-in zoom-in-95 duration-1000 whitespace-pre-wrap break-words px-4 w-full">
                        {wallPlateData.content}
                      </p>
                    </div>
                  ) : (
                    <div className="relative w-full h-full flex items-center justify-center p-0 m-0">
                      <img 
                        src={wallPlateData.content} 
                        className="w-full h-full object-contain drop-shadow-[0_0_80px_rgba(255,255,255,0.6)] animate-in zoom-in-95 duration-1000" 
                        alt="Manuscript" 
                      />
                    </div>
                  ) }
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Row 1: Top Widgets */}
      <div className="grid grid-cols-1 min-[968px]:grid-cols-12 gap-6 min-h-[480px]" data-row-id="dash-row-1">
        <div className="min-[968px]:col-span-4 rounded-[2.5rem] overflow-hidden relative shadow-2xl h-[480px] bg-black focusable p-0" tabIndex={0} data-nav-id="dash-col-0">
          {isWideScreen ? <ActiveAzkarWidget /> : <MapWidget />}
        </div>

        <div className="min-[968px]:col-span-4 rounded-[2.5rem] relative flex items-center justify-center overflow-hidden h-[480px] shadow-2xl focusable bg-black outline-none active-nav-target" tabIndex={0} data-nav-id="dash-col-1">
          <ReminderSummaryWidget />
        </div>

        <div className="min-[968px]:col-span-4 flex flex-col gap-4 h-[480px] relative">
          <div className="flex-1 relative overflow-hidden group bg-black rounded-[2.5rem] shadow-2xl focusable" tabIndex={0} data-nav-id="dash-col-2">
            <Carousel setApi={setApi} opts={{ loop: true }} className="w-full h-full">
              <CarouselContent className="h-full ml-0 overflow-hidden no-scrollbar">
                <CarouselItem className="pl-0 h-full flex items-center justify-center bg-black"><MoonWidget /></CarouselItem>
                {activeVideo && <CarouselItem className="pl-0 h-full flex items-center justify-center bg-black"><PlayingNowWidget /></CarouselItem>}
              </CarouselContent>
            </Carousel>
          </div>
          <div className="flex-[0.35] rounded-[2.5rem] relative overflow-hidden shadow-2xl focusable bg-black" tabIndex={0} data-nav-id="dash-col-clock">
            <DateAndClockWidget />
          </div>
        </div>
      </div>

      {/* Row 2: Prayer Bar */}
      <div className="w-full shadow-xl focusable bg-black rounded-[2.5rem] overflow-hidden outline-none" tabIndex={0} data-nav-id="dash-row-2-bar" data-row-id="dash-row-2">
        <PrayerTimelineWidget />
      </div>

      {/* Row 3: Latest Videos */}
      <div className="w-full" data-row-id="dash-row-latest">
        <LatestVideosWidget channels={favoriteChannels.filter(c => c.starred)} />
      </div>

      {/* Row 4: Saved Videos */}
      <div className="w-full pb-12" data-row-id="dash-row-saved">
        <YouTubeSavedWidget />
      </div>
    </div>
  );
}
