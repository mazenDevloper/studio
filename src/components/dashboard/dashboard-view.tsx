
"use client";

import { useEffect, useMemo } from "react";
import { MoonWidget } from "./widgets/moon-widget";
import { DateAndClockWidget } from "./widgets/date-and-clock-widget";
import { PlayingNowWidget } from "./widgets/playing-now-widget";
import { SovereignShortcutsWidget } from "./widgets/sovereign-shortcuts-widget";
import { ReminderSummaryWidget } from "./widgets/reminder-summary-widget";
import { ActiveAzkarWidget } from "./widgets/active-azkar-widget";
import { PrayerTimelineWidget } from "./widgets/prayer-timeline-widget";
import { YouTubeSavedWidget } from "./widgets/youtube-saved-widget";
import { useMediaStore } from "@/lib/store";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { X } from "lucide-react";
import Image from "next/image";

/**
 * DashboardView v230.0 - Sovereign Precision Layout
 * Features: Auto-sync all cloud resources on load + WallPlate scaled PNG.
 */
export function DashboardView() {
  const { 
    activeVideo, wallPlateType, wallPlateData, mapSettings, setWallPlate: updateWallPlate, 
    customManuscripts, manuscriptScales, fetchPriorityData
  } = useMediaStore();
  
  useEffect(() => {
    // Sovereign Auto-Click Trigger: Fetch all priority data immediately on first mount
    fetchPriorityData('all');
    
    const timer = setTimeout(() => {
      const firstShortcut = document.querySelector('[data-nav-id="shortcut-item-0"]') as HTMLElement;
      firstShortcut?.focus();
    }, 1000);
    return () => clearTimeout(timer);
  }, [fetchPriorityData]);

  const activeManuscript = useMemo(() => {
    if (wallPlateType === 'manuscript' && wallPlateData) return wallPlateData;
    if (!customManuscripts.length) return null;
    return customManuscripts[mapSettings.moonManuIdx || 0];
  }, [customManuscripts, wallPlateType, mapSettings.moonManuIdx, wallPlateData]);

  const manuscriptScale = activeManuscript ? (manuscriptScales[activeManuscript.id] || 1.0) : 1.0;

  return (
    <div data-nav-zone="content" className="h-full w-full pt-0 px-6 flex flex-col gap-8 relative overflow-y-auto pb-64 no-scrollbar bg-black transition-none">
      {wallPlateType && (
        <div className="fixed inset-0 z-[20000] bg-black flex items-center justify-center overflow-hidden animate-in fade-in duration-300">
          <div className="absolute top-10 right-10 z-[20001]">
            <button className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white focusable shadow-2xl backdrop-blur-3xl" onClick={() => updateWallPlate(null)}><X className="w-8 h-8" /></button>
          </div>
          <div className="w-full h-full flex items-center justify-center relative bg-black">
            {mapSettings.manuscriptBgUrl && (
              <div className="absolute inset-0 z-0">
                 <Image src={mapSettings.manuscriptBgUrl} alt="Bg" fill className="object-cover opacity-40" unoptimized />
              </div>
            )}
            <div className="relative w-full h-full flex items-center justify-center p-0">
               {activeManuscript ? (
                 <div className="w-full h-full flex items-center justify-center">
                   {activeManuscript.pngDataUrl ? (
                     <img src={activeManuscript.pngDataUrl} className="w-full h-full object-contain drop-shadow-[0_0_100px_rgba(255,255,255,0.4)]" style={{ transform: `scale(${(activeManuscript.scale || 1.0) * manuscriptScale})` }} alt="" />
                   ) : (
                     <div className="relative w-full h-full [container-type:inline-size]">
                        {activeManuscript.words?.map((word: any) => (
                          <div key={word.id} style={{ position: 'absolute', left: `${word.x}%`, top: `${word.y}%`, transform: `translate(-50%, -50%) scale(${(word.scale || 1.0) * manuscriptScale})`, width: 'max-content' }}>
                             <p className="font-calligraphy text-white leading-none drop-shadow-[0_0_80px_rgba(255,255,255,0.7)] text-center tracking-normal whitespace-nowrap" style={{ fontFamily: activeManuscript.fontFamily || 'Aref Ruqaa', fontSize: `8.5cqw`, color: mapSettings.manuscriptColor }}>{word.text}</p>
                          </div>
                        ))}
                     </div>
                   )}
                 </div>
               ) : wallPlateType === 'moon' && (
                  <div className="relative w-full h-full flex items-center justify-center scale-125">
                    <Image src={wallPlateData.image} alt="Moon" fill className="object-contain opacity-80" unoptimized />
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                       <span className="text-[20cqw] font-black text-white drop-shadow-[0_0_40px_rgba(0,0,0,1)]">{wallPlateData.day}</span>
                       <span className="text-[5cqw] font-black text-white/60 uppercase tracking-widest">{wallPlateData.label}</span>
                    </div>
                  </div>
               )}
            </div>
          </div>
        </div>
      )}

      {/* Primary Widget Array */}
      <div className="grid grid-cols-12 gap-6 min-h-[480px]" data-row-id="main-widgets-row">
        <div className="col-span-4 rounded-[3rem] overflow-hidden relative shadow-2xl h-[480px] bg-black focusable" tabIndex={0}><ActiveAzkarWidget /></div>
        <div className="col-span-4 rounded-[3rem] relative flex items-center justify-center h-[480px] shadow-2xl focusable bg-black outline-none" tabIndex={0}><ReminderSummaryWidget /></div>
        <div className="col-span-4 flex flex-col gap-4 h-[480px] relative">
          <div className="flex-1 relative overflow-hidden bg-black rounded-[3rem] shadow-2xl focusable" tabIndex={0}>
            <Carousel opts={{ loop: true }} className="w-full h-full"><CarouselContent className="h-full ml-0 overflow-hidden no-scrollbar transition-none"><CarouselItem className="pl-0 h-full flex items-center justify-center bg-black transition-none"><MoonWidget /></CarouselItem>{activeVideo && <CarouselItem className="pl-0 h-full flex items-center justify-center bg-black transition-none"><PlayingNowWidget /></CarouselItem>}</CarouselContent></Carousel>
          </div>
          <div className="flex-[0.35] rounded-[3rem] relative overflow-hidden shadow-2xl focusable bg-black" tabIndex={0}><DateAndClockWidget /></div>
        </div>
      </div>

      <div className="w-full shadow-2xl bg-black rounded-[3.5rem] overflow-hidden outline-none mt-4 border-2 border-white/5 min-h-[220px]" data-row-id="row-shortcuts">
        <SovereignShortcutsWidget />
      </div>

      <div className="w-full mt-4 min-h-[160px]" data-row-id="row-prayer-bar">
        <PrayerTimelineWidget />
      </div>

      <div className="w-full mt-8" data-row-id="row-saved-videos">
        <YouTubeSavedWidget />
      </div>
    </div>
  );
}
