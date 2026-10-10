
"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Moon3D } from "./widgets/moon-widget";
import { ManuscriptArt } from "@/components/manuscript/manuscript-art";
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
 * DashboardView v281.0 - Thmanyah Optimized & Horizontal Scroll Fix
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
    <div data-nav-zone="content" className="h-full w-full max-w-full overflow-x-hidden pt-0 px-6 flex flex-col gap-8 relative overflow-y-auto pb-64 no-scrollbar bg-black transition-none">
      {wallPlateType && <WallPlate manuscript={activeManuscript} manuscriptScale={manuscriptScale} />}

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

/**
 * Full screen "wall plate": the 3D moon with the date, or the board with its manuscript (pinned one first) and
 * background. Rendered on <body> so no scaled / scrolling parent can shrink or hide it.
 */
function WallPlate({ manuscript, manuscriptScale }: { manuscript: any; manuscriptScale: number }) {
  const { wallPlateType, wallPlateData, setWallPlate, mapSettings, customManuscripts } = useMediaStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // the pinned manuscript wins; otherwise the one shown when the plate was opened
  const item = customManuscripts.find(m => m.id === mapSettings.pinnedManuscriptId)
    ?? (wallPlateType === "manuscript" && wallPlateData?.id ? wallPlateData : manuscript);
  const hijri = useMemo(() => {
    try { return new Intl.DateTimeFormat("ar-u-ca-islamic-umalqura", { day: "numeric", month: "long" }).format(new Date()); } catch { return ""; }
  }, []);
  if (!mounted || !wallPlateType) return null;
  const moonImage = wallPlateData?.image || `https://phasesmoon.com/moonpng/220/moon-phase-15.webp`;

  return createPortal(
    <div className="fixed inset-0 z-[20000] bg-black flex items-center justify-center overflow-hidden" dir="rtl">
      {wallPlateType === "moon" ? (
        <div className="relative w-full h-full flex items-center justify-center [perspective:1200px]">
          <div className="absolute inset-0"><Moon3D src={moonImage} fill={0.82} /></div>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {mapSettings.showManuscriptOnMoon && item ? (
              <div className="w-[min(60vh,70vw)] h-[min(40vh,50vw)]"><ManuscriptArt item={item} scale={manuscriptScale} textClassName="text-5xl" /></div>
            ) : (
              <>
                <span className="font-black text-white leading-none drop-shadow-[0_0_50px_rgba(0,0,0,1)]" style={{ fontSize: "min(22vh, 24vw)" }}>{wallPlateData?.day ?? ""}</span>
                <span className="mt-4 text-2xl md:text-3xl font-black text-white/80 drop-shadow-[0_0_30px_rgba(0,0,0,1)]">{wallPlateData?.label === "الهجري" ? hijri : wallPlateData?.label ?? hijri}</span>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="relative w-full h-full flex items-center justify-center">
          {mapSettings.manuscriptBgUrl && mapSettings.showManuscriptBg !== false && (
            <img src={mapSettings.manuscriptBgUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80" />
          )}
          <div className="relative w-[86vw] h-[76vh] flex items-center justify-center">
            {item ? <ManuscriptArt item={item} scale={manuscriptScale} textClassName="text-5xl md:text-7xl" /> : <p className="text-white/30 font-black">لا توجد مخطوطات</p>}
          </div>
        </div>
      )}
      <div className="absolute top-6 right-6 md:top-10 md:right-10 z-[20001] flex items-center gap-4">
        <button className={cn("w-14 h-14 rounded-full border flex items-center justify-center focusable shadow-2xl backdrop-blur-3xl", wallPlateType === "moon" ? "bg-primary text-white border-primary" : "bg-white/10 text-white/40 border-white/20")} onClick={() => setWallPlate("moon", wallPlateType === "moon" ? wallPlateData : { image: moonImage })}><MoonIcon className="w-6 h-6" /></button>
        <button className={cn("w-14 h-14 rounded-full border flex items-center justify-center focusable shadow-2xl backdrop-blur-3xl", wallPlateType === "manuscript" ? "bg-primary text-white border-primary" : "bg-white/10 text-white/40 border-white/20")} onClick={() => setWallPlate("manuscript", item)}><Type className="w-6 h-6" /></button>
        <div className="w-px h-10 bg-white/10 mx-2" />
        <button className="w-16 h-16 rounded-full bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500 focusable shadow-2xl backdrop-blur-3xl" onClick={() => setWallPlate(null)}><X className="w-8 h-8" /></button>
      </div>
    </div>,
    document.body,
  );
}
