
"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { MoonWidget } from "./widgets/moon-widget";
import { DateAndClockWidget } from "./widgets/date-and-clock-widget";
import { PlayingNowWidget } from "./widgets/playing-now-widget";
import { PrayerTimelineWidget } from "./widgets/prayer-timeline-widget";
import { ReminderSummaryWidget } from "./widgets/reminder-summary-widget";
import { ActiveAzkarWidget } from "./widgets/active-azkar-widget";
import { useMediaStore } from "@/lib/store";
import { Carousel, CarouselContent, CarouselItem, CarouselApi } from "@/components/ui/carousel";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

const LatestVideosWidget = dynamic(() => import("./widgets/latest-videos-widget").then(m => m.LatestVideosWidget), { 
  ssr: false,
  loading: () => <div className="h-64 w-full bg-zinc-900/20 animate-pulse rounded-[2.5rem]" />
});

const YouTubeSavedWidget = dynamic(() => import("./widgets/youtube-saved-widget").then(m => m.YouTubeSavedWidget), { 
  ssr: false,
  loading: () => <div className="h-64 w-full bg-zinc-900/20 animate-pulse rounded-[2.5rem]" />
});

export function DashboardView() {
  const { 
    favoriteChannels, activeVideo, wallPlateType, wallPlateData, 
    mapSettings, setWallPlate: updateWallPlate, fetchPriorityData,
    customManuscripts, updateMapSettings, manuscriptScales
  } = useMediaStore();
  
  const [api, setApi] = useState<CarouselApi>();

  useEffect(() => {
    // Sovereign Instant Refresh
    fetchPriorityData('all');
    
    const timer = setTimeout(() => {
      const target = document.querySelector('[data-nav-id="dash-col-1"]') as HTMLElement;
      if (target) {
        target.focus();
        target.classList.add('active-nav-target');
      }
    }, 10); 
    return () => clearTimeout(timer);
  }, []);

  const navigateWallPlate = (direction: 'next' | 'prev') => {
    if (!customManuscripts.length) return;
    
    if (wallPlateType === 'moon') {
      const currentIdx = mapSettings.moonManuIdx || 0;
      let nextIdx = direction === 'next' ? currentIdx + 1 : currentIdx - 1;
      if (nextIdx >= customManuscripts.length) nextIdx = 0;
      if (nextIdx < 0) nextIdx = customManuscripts.length - 1;
      updateMapSettings({ moonManuIdx: nextIdx });
      return;
    }

    if (!wallPlateData?.id) return;
    const currentId = wallPlateData.id || wallPlateData.content;
    const currentIdx = customManuscripts.findIndex(m => m.id === currentId || m.content === currentId);
    if (currentIdx === -1) {
      updateWallPlate('manuscript', customManuscripts[0]);
      return;
    }
    let nextIdx = direction === 'next' ? currentIdx + 1 : currentIdx - 1;
    if (nextIdx >= customManuscripts.length) nextIdx = 0;
    if (nextIdx < 0) nextIdx = customManuscripts.length - 1;
    updateWallPlate('manuscript', customManuscripts[nextIdx]);
  };

  const activeManuscript = useMemo(() => {
    if (!customManuscripts.length) return null;
    if (wallPlateType === 'moon') {
      return customManuscripts[mapSettings.moonManuIdx || 0];
    }
    return wallPlateData || customManuscripts[0];
  }, [customManuscripts, wallPlateType, mapSettings.moonManuIdx, wallPlateData]);

  const manuscriptScale = activeManuscript ? (manuscriptScales[activeManuscript.id] || 1.0) : 1.0;

  return (
    <div className="h-full w-full pt-0 px-6 flex flex-col gap-8 relative overflow-y-auto pb-32 no-scrollbar bg-black">
      {wallPlateType && (
        <div className="fixed inset-0 z-[20000] bg-black flex items-center justify-center animate-in fade-in duration-0 p-0 m-0 overflow-hidden">
          <div className="absolute top-10 right-10 flex gap-4 z-[20001]">
            <button className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white focusable shadow-2xl backdrop-blur-3xl" onClick={() => updateWallPlate(null)}><X className="w-8 h-8" /></button>
          </div>

          {(wallPlateType === 'manuscript' || (wallPlateType === 'moon' && mapSettings.showManuscriptOnMoon)) && customManuscripts.length > 1 && (
            <><button onClick={() => navigateWallPlate('prev')} className="absolute left-10 top-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/20 transition-all z-[20002] focusable"><ChevronLeft className="w-12 h-12" /></button><button onClick={() => navigateWallPlate('next')} className="absolute right-10 top-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/20 transition-all z-[20002] focusable"><ChevronRight className="w-12 h-12" /></button></>
          )}
          
          <div className="w-full h-full flex items-center justify-center overflow-hidden p-0 m-0 relative" style={{ filter: wallPlateType === 'moon' ? `hue-rotate(${mapSettings.hue || 0}deg) saturate(${mapSettings.saturation || 100}%) brightness(${mapSettings.brightness || 100}%)` : 'none' }}>
            {wallPlateType === 'moon' && (
              <div className="relative w-full h-full flex items-center justify-center bg-black p-0 m-0">
                <Image src={wallPlateData.image} alt="Moon" fill className="object-contain" unoptimized />
                {mapSettings.showManuscriptOnMoon && activeManuscript && (
                  <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none p-12">
                    {activeManuscript.type === 'text' ? (
                      <p className="text-6xl lg:text-[10rem] font-calligraphy text-center transition-all duration-700 leading-tight whitespace-pre-wrap" style={{ fontFamily: activeManuscript.fontFamily || 'Aref Ruqaa', color: mapSettings.manuscriptColor, fontSize: `${manuscriptScale * 11.5}rem`, filter: 'drop-shadow(0 0 40px rgba(0,0,0,0.9))' }}>{activeManuscript.content}</p>
                    ) : <img src={activeManuscript.content} className="max-w-[80%] max-h-[60%] object-contain transition-transform" style={{ filter: 'brightness(0) invert(1) drop-shadow(0 0 40px rgba(255,255,255,0.8))', transform: `scale(${manuscriptScale})` }} />}
                  </div>
                )}
              </div>
            )}
            
            {wallPlateType === 'manuscript' && (
              <div className="relative w-full h-full flex items-center justify-center p-0 m-0">
                <div className="absolute inset-0 z-0"><Image src={mapSettings.manuscriptBgUrl || "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?q=80&w=2000"} alt="" fill className="object-cover opacity-90" priority /></div>
                <div className="relative z-10 w-full h-full flex items-center justify-center px-8 m-0 animate-in zoom-in-95 duration-700" style={{ filter: `hue-rotate(${mapSettings.hue || 0}deg) saturate(${mapSettings.saturation || 100}%) brightness(${mapSettings.brightness || 100}%)` }}>
                  {wallPlateData?.type === 'text' ? (
                    <p className="text-6xl lg:text-[12rem] font-calligraphy text-center px-4 leading-[1.2] whitespace-pre-wrap tracking-wide drop-shadow-[0_0_80px_rgba(0,0,0,0.8)]" style={{ fontFamily: wallPlateData.fontFamily || 'Aref Ruqaa', color: mapSettings.manuscriptColor, fontSize: `${manuscriptScale * 13.5}rem` }}>{wallPlateData.content}</p>
                  ) : <img src={wallPlateData.content} className="w-full h-full object-contain transition-transform" style={{ filter: `brightness(0) invert(1) drop-shadow(0 0 40px ${mapSettings.manuscriptColor})`, transform: `scale(${manuscriptScale})` }} />}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-6 min-h-[480px]" data-row-id="dash-row-1">
        <div className="col-span-4 rounded-[2.5rem] overflow-hidden relative shadow-2xl h-[480px] bg-black focusable" tabIndex={0} data-nav-id="dash-col-0"><ActiveAzkarWidget /></div>
        <div className="col-span-4 rounded-[2.5rem] relative flex items-center justify-center overflow-hidden h-[480px] shadow-2xl focusable bg-black outline-none" tabIndex={0} data-nav-id="dash-col-1"><ReminderSummaryWidget /></div>
        <div className="col-span-4 flex flex-col gap-4 h-[480px] relative">
          <div className="flex-1 relative overflow-hidden bg-black rounded-[2.5rem] shadow-2xl focusable" tabIndex={0} data-nav-id="dash-col-2">
            <Carousel setApi={setApi} opts={{ loop: true }} className="w-full h-full"><CarouselContent className="h-full ml-0 overflow-hidden no-scrollbar"><CarouselItem className="pl-0 h-full flex items-center justify-center bg-black"><MoonWidget /></CarouselItem>{activeVideo && <CarouselItem className="pl-0 h-full flex items-center justify-center bg-black"><PlayingNowWidget /></CarouselItem>}</CarouselContent></Carousel>
          </div>
          <div className="flex-[0.35] rounded-[2.5rem] relative overflow-hidden shadow-2xl focusable bg-black" tabIndex={0} data-nav-id="dash-col-clock"><DateAndClockWidget /></div>
        </div>
      </div>
      <div className="w-full shadow-xl focusable bg-black rounded-[2.5rem] overflow-hidden outline-none" tabIndex={0} data-nav-id="dash-row-2-bar" data-row-id="dash-row-2"><PrayerTimelineWidget /></div>
      <div className="w-full" data-row-id="dash-row-latest"><LatestVideosWidget channels={favoriteChannels.filter(c => c.starred)} /></div>
      <div className="w-full pb-12" data-row-id="dash-row-saved"><YouTubeSavedWidget /></div>
    </div>
  );
}
