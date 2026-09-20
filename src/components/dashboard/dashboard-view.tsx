"use client";

import { useEffect, useMemo, useState } from "react";
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
import { X, ChevronLeft, ChevronRight, Moon as MoonIcon, Type } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * DashboardView v270.0 - Mobile Compact Grid
 * Features: Reduced card heights for mobile optimization.
 */
export function DashboardView() {
  const { 
    activeVideo, wallPlateType, wallPlateData, mapSettings, setWallPlate: updateWallPlate, 
    customManuscripts, manuscriptScales, fetchPriorityData, updateMapSettings
  } = useMediaStore();
  
  const [internalManuIdx, setInternalManuIdx] = useState(mapSettings.moonManuIdx || 0);

  useEffect(() => {
    fetchPriorityData('all');
    const timer = setTimeout(() => {
      const targetShortcut = document.querySelector('[data-nav-id="shortcut-item-1"]') as HTMLElement;
      if (targetShortcut) targetShortcut.focus();
      else (document.querySelector('[data-nav-id="shortcut-item-0"]') as HTMLElement)?.focus();
    }, 1000);
    return () => clearTimeout(timer);
  }, [fetchPriorityData]);

  const activeManuscript = useMemo(() => {
    if (!customManuscripts.length) return null;
    return customManuscripts[internalManuIdx % customManuscripts.length];
  }, [customManuscripts, internalManuIdx]);

  const manuscriptScale = activeManuscript ? (manuscriptScales[activeManuscript.id] || 1.0) : 1.0;

  const handleNextManu = () => {
    setInternalManuIdx(p => (p + 1) % customManuscripts.length);
  };

  const handlePrevManu = () => {
    setInternalManuIdx(p => (p - 1 + customManuscripts.length) % customManuscripts.length);
  };

  return (
    <div data-nav-zone="content" className="h-full w-full pt-0 px-6 flex flex-col gap-8 relative overflow-y-auto pb-64 no-scrollbar bg-black transition-none">
      {wallPlateType && (
        <div className="fixed inset-0 z-[20000] bg-black flex items-center justify-center overflow-hidden animate-in fade-in duration-300">
          <div className="absolute top-10 right-10 z-[20001] flex items-center gap-4">
            <button 
              className={cn("w-14 h-14 rounded-full border flex items-center justify-center transition-all focusable shadow-2xl backdrop-blur-3xl", wallPlateType === 'moon' ? "bg-primary text-white border-primary" : "bg-white/10 text-white/40 border-white/20")} 
              onClick={() => updateWallPlate('moon', wallPlateData)}
            >
              <MoonIcon className="w-6 h-6" />
            </button>
            <button 
              className={cn("w-14 h-14 rounded-full border flex items-center justify-center transition-all focusable shadow-2xl backdrop-blur-3xl", wallPlateType === 'manuscript' ? "bg-primary text-white border-primary" : "bg-white/10 text-white/40 border-white/20")} 
              onClick={() => updateWallPlate('manuscript', activeManuscript)}
            >
              <Type className="w-6 h-6" />
            </button>
            <div className="w-px h-10 bg-white/10 mx-2" />
            <button className="w-16 h-16 rounded-full bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500 focusable shadow-2xl backdrop-blur-3xl" onClick={() => updateWallPlate(null)}><X className="w-8 h-8" /></button>
          </div>

          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[20001] flex items-center gap-10">
             <button onClick={handlePrevManu} className="w-20 h-20 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center text-white/40 focusable hover:bg-white/10"><ChevronRight className="w-10 h-10" /></button>
             <div className="flex flex-col items-center">
                <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em] mb-2">Sovereign Plate</span>
                <div className="h-1 w-24 bg-primary/40 rounded-full" />
             </div>
             <button onClick={handleNextManu} className="w-20 h-20 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center text-white/40 focusable hover:bg-white/10"><ChevronLeft className="w-10 h-10" /></button>
          </div>

          <div className="w-full h-full flex items-center justify-center relative bg-black">
            {mapSettings.manuscriptBgUrl && (
              <div className="absolute inset-0 z-0">
                 <Image src={mapSettings.manuscriptBgUrl} alt="Bg" fill className="object-cover opacity-40" unoptimized />
              </div>
            )}
            <div className="relative w-full h-full flex items-center justify-center p-0">
               {wallPlateType === 'manuscript' && activeManuscript ? (
                 <div className="w-full h-full flex items-center justify-center animate-in zoom-in-95 duration-500">
                   {activeManuscript.pngDataUrl ? (
                     <img src={activeManuscript.pngDataUrl} className="w-full h-full object-contain drop-shadow-[0_0_120px_rgba(255,255,255,0.4)]" style={{ transform: `scale(${(activeManuscript.scale || 1.0) * manuscriptScale})` }} alt="" />
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
               ) : (
                  <div className="relative w-full h-full flex items-center justify-center scale-110 min-[968px]:scale-125 animate-in zoom-in-95 duration-700">
                    <Image src={wallPlateData?.image || `https://phasesmoon.com/moonpng/220/moon-phase-15.webp`} alt="Moon" fill className="object-contain opacity-80 drop-shadow-[0_0_150px_rgba(255,255,255,0.2)]" unoptimized />
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center mt-20 min-[968px]:mt-0">
                       <span className="text-[25cqw] font-black text-white drop-shadow-[0_0_60px_rgba(0,0,0,1)] leading-none">{wallPlateData?.day || "١"}</span>
                       <span className="text-[6cqw] font-black text-white/40 uppercase tracking-[0.4em] mt-4">{wallPlateData?.label || "الهجري"}</span>
                    </div>
                  </div>
               )}
            </div>
          </div>
        </div>
      )}

      {/* Zero-Barrier Grid: Optimized for all screens */}
      <div className="grid grid-cols-12 gap-6 min-h-[480px] mobile-grid-optimized" data-row-id="main-widgets-row">
        <div className="col-span-12 md:col-span-4 rounded-[3rem] overflow-hidden relative shadow-2xl h-[240px] md:h-[480px] bg-black"><ActiveAzkarWidget /></div>
        <div className="col-span-12 md:col-span-4 rounded-[3rem] relative flex items-center justify-center h-[240px] md:h-[480px] shadow-2xl bg-black"><ReminderSummaryWidget /></div>
        <div className="col-span-12 md:col-span-4 flex flex-col gap-4 h-[480px] md:h-[480px] relative">
          <div className="flex-1 relative overflow-hidden bg-black rounded-[3rem] shadow-2xl">
            <Carousel opts={{ loop: true }} className="w-full h-full">
              <CarouselContent className="h-full ml-0 overflow-hidden no-scrollbar transition-none">
                <CarouselItem className="pl-0 h-full flex items-center justify-center bg-black transition-none"><MoonWidget /></CarouselItem>
                {activeVideo && <CarouselItem className="pl-0 h-full flex items-center justify-center bg-black transition-none"><PlayingNowWidget /></CarouselItem>}
              </CarouselContent>
            </Carousel>
          </div>
          <div className="flex-[0.35] md:flex-[0.35] min-h-[120px] rounded-[3rem] relative overflow-hidden shadow-2xl bg-black"><DateAndClockWidget /></div>
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