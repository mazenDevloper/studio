
"use client";

import { useMediaStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Maximize2, ChevronLeft, ChevronRight, CloudDownload, Type } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { JSONBIN_MANUSCRIPTS_BIN_ID, JSONBIN_FONTS_BIN_ID } from "@/lib/constants";

/**
 * ActiveAzkarWidget v202.0 - Absolute White Protocol
 * Features: brightness(0) invert(1) forces ANY content to pure white.
 */
export function ActiveAzkarWidget() {
  const customManuscripts = useMediaStore(state => state.customManuscripts);
  const manuscriptScales = useMediaStore(state => state.manuscriptScales);
  const setWallPlate = useMediaStore(state => state.setWallPlate);
  const mapSettings = useMediaStore(state => state.mapSettings);
  const fetchSpecificBin = useMediaStore(state => state.fetchSpecificBin);
  
  const [activeIndex, setActiveIndex] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!customManuscripts?.length) return;
    const interval = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % customManuscripts.length);
    }, 15000); 
    return () => clearInterval(interval);
  }, [customManuscripts]);

  const activeItem = customManuscripts?.[activeIndex];

  const handleManualSync = async () => {
    setIsRefreshing(true);
    await Promise.allSettled([
      fetchSpecificBin(JSONBIN_MANUSCRIPTS_BIN_ID),
      fetchSpecificBin(JSONBIN_FONTS_BIN_ID)
    ]);
    setIsRefreshing(false);
  };

  return (
    <div className="h-full w-full rounded-[2.5rem] border border-white/10 flex flex-col relative overflow-hidden group focusable outline-none bg-black p-0 m-0" tabIndex={0}>
      {mapSettings.showManuscriptBg && mapSettings.manuscriptBgUrl && (
        <div className="absolute inset-0 z-0">
          <Image src={mapSettings.manuscriptBgUrl} alt="Bg" fill className="object-cover opacity-40" unoptimized />
        </div>
      )}
      
      <div className="relative z-20 w-full h-full overflow-hidden flex items-center justify-center p-4">
        {activeItem ? (
          <div className="w-full h-full flex items-center justify-center">
            {activeItem.pngDataUrl ? (
              <img 
                src={activeItem.pngDataUrl} 
                className="w-full h-full object-contain drop-shadow-[0_0_60px_rgba(255,255,255,0.4)]" 
                style={{ 
                  transform: `scale(${(activeItem.scale || 1.0) * (manuscriptScales[activeItem.id] || 1.0)})`,
                  // brightness(0) makes it black, invert(1) makes it pure white regardless of source
                  filter: 'brightness(0) invert(1)'
                }}
                alt="Manuscript" 
              />
            ) : (
              <p className="text-3xl font-black text-white text-center leading-relaxed drop-shadow-2xl" style={{ fontFamily: activeItem.fontFamily }}>
                {activeItem.content}
              </p>
            )}
          </div>
        ) : (
          <p className="text-white/20 font-black uppercase tracking-widest text-[10px]">نظام المخطوطات السيادي</p>
        )}
      </div>

      <div className="absolute top-4 right-4 flex flex-col gap-3 opacity-0 group-hover:opacity-100 transition-opacity z-50">
         <button onClick={handleManualSync} title="تزامن سحابي" className={cn("w-10 h-10 rounded-full bg-black/60 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white/40 focusable", isRefreshing && "animate-spin")}>
            <CloudDownload className="w-5 h-5" />
         </button>
      </div>

      <div className="absolute bottom-4 left-4 flex items-center gap-2 z-50 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-none">
        <button className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/40 focusable" onClick={() => setActiveIndex(p => (p - 1 + customManuscripts.length) % customManuscripts.length)}><ChevronRight className="w-5 h-5" /></button>
        <button className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/40 focusable" onClick={() => setActiveIndex(p => (p + 1) % customManuscripts.length)}><ChevronLeft className="w-5 h-5" /></button>
        <div className="w-px h-5 bg-white/10 mx-1" />
        <button className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/40 focusable" onClick={() => activeItem && setWallPlate('manuscript', activeItem)}><Maximize2 className="w-5 h-5" /></button>
      </div>
    </div>
  );
}
