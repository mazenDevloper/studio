
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
 * DashboardView v280.0 - Thmanyah Optimized
 */
export function DashboardView() {
  const { 
    activeVideo, wallPlateType, wallPlateData, mapSettings, setWallPlate: updateWallPlate, 
    customManuscripts, manuscriptScales, fetchPriorityData, updateMapSettings
  } = useMediaStore();
  
  const [internalManuIdx, setInternalManuIdx] = useState(mapSettings.moonManuIdx || 0);

  useEffect(() => {
    fetchPriorityData('all');
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
          {/* Wall Plate UI */}
          <div className="absolute top-10 right-10 z-[20001] flex items-center gap-4">
            <button className={cn("w-14 h-14 rounded-full border flex items-center justify-center transition-all focusable shadow-2xl backdrop-blur-3xl", wallPlateType === 'moon' ? "bg-primary text-white border-primary" : "bg-white/10 text-white/40 border-white/20")} onClick={() => updateWallPlate('moon', wallPlateData)}><MoonIcon className="w-6 h-6" /></button>
            <button className={cn("w-14 h-14 rounded-full border flex items-center justify-center transition-all focusable shadow-2xl backdrop-blur-3xl", wallPlateType === 'manuscript' ? "bg-primary text-white border-primary" : "bg-white/10 text-white/40 border-white/20")} onClick={() => updateWallPlate('manuscript', activeManuscript)}><Type className="w-6 h-6" /></button>
            <div className="w-px h-10 bg-white/10 mx-2" />
            <button className="w-16 h-16 rounded-full bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500 focusable shadow-2xl backdrop-blur-3xl" onClick={() => updateWallPlate(null)}><X className="w-8 h-8" /></button>
          </div>
        </div>
      )}

      {/* Grid: Optimized for mobile */}
      <div className="grid grid-cols-12 gap-6 min-h-[480px] mobile-grid-optimized" data-row-id="main-widgets-row">
        <div className="col-span-12 md:col-span-4 rounded-[3rem] overflow-hidden relative shadow-2xl h-[240px] md:h-[480px] bg-black"><ActiveAzkarWidget /></div>
        <div className="col-span-12 md:col-span-4 rounded-[3rem] relative flex items-center justify-center h-[240px] md:h-[480px] shadow-2xl bg-black"><ReminderSummaryWidget /></div>
        <div className="hidden md:flex col-span-12 md:col-span-4 flex-col gap-4 h-auto md:h-[480px] relative">
          <div className="flex-1 relative overflow-hidden bg-black rounded-[3rem] shadow-2xl min-h-[140px] md:min-h-0">
            <Carousel opts={{ loop: true }} className="w-full h-full">
              <CarouselContent className="h-full ml-0 overflow-hidden no-scrollbar transition-none">
                <CarouselItem className="pl-0 h-full flex items-center justify-center bg-black transition-none md:flex hidden"><MoonWidget /></CarouselItem>
                {activeVideo && <CarouselItem className="pl-0 h-full flex items-center justify-center bg-black transition-none"><PlayingNowWidget /></CarouselItem>}
              </CarouselContent>
            </Carousel>
          </div>
          <div className="flex-[0.35] md:flex-[0.35] min-h-[100px] md:min-h-[120px] rounded-[3rem] relative overflow-hidden shadow-2xl bg-black scale-90 md:scale-100"><DateAndClockWidget /></div>
        </div>
      </div>

      <div className="hidden md:block w-full shadow-2xl bg-black rounded-[3.5rem] overflow-hidden outline-none mt-4 border-2 border-white/5 min-h-[220px]" data-row-id="row-shortcuts">
        <SovereignShortcutsWidget />
      </div>

      <div className="w-full mt-4 h-auto" data-row-id="row-prayer-bar">
        <PrayerTimelineWidget />
      </div>

      <div className="w-full mt-8 h-auto" data-row-id="row-saved-videos">
        <YouTubeSavedWidget />
      </div>
    </div>
  );
}
