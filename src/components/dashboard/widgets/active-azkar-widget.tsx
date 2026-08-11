
"use client";

import { useMediaStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Maximize2, ChevronLeft, ChevronRight, RefreshCw, Type, CloudDownload } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { JSONBIN_MANUSCRIPTS_BIN_ID, JSONBIN_FONTS_BIN_ID } from "@/lib/constants";

/**
 * ActiveAzkarWidget v200.0 - Full-Scale PNG Mode & Quick Sync
 * Features: 100% W/H display and quick fetch buttons for fonts/manuscripts.
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
      
      <div className="relative z-20 w-full h-full overflow-hidden flex items-center justify-center">
        {activeItem ? (
          <div className="w-full h-full flex items-center justify-center">
            {activeItem.pngDataUrl ? (
              <img 
                src={activeItem.pngDataUrl} 
                className="w-full h-full object-contain drop-shadow-[0_0_60px_rgba(255,255,255,0.3)]" 
                style={{ transform: `scale(${(activeItem.scale || 1.0) * (manuscriptScales[activeItem.id] || 1.0)})` }}
                alt="Manuscript" 
              />
            ) : (
              <p className="text-xl font-black text-white/40">{activeItem.content}</p>
            )}
          </div>
        ) : (
          <p className="text-white/20 font-black uppercase tracking-widest text-xs">أضف محتوى من الإعدادات</p>
        )}
      </div>

      <div className="absolute top-6 right-6 flex flex-col gap-3 opacity-0 group-hover:opacity-100 transition-opacity z-50">
         <button onClick={handleManualSync} title="تزامن سحابي" className={cn("w-12 h-12 rounded-full bg-black/60 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white/40 focusable shadow-glow", isRefreshing && "animate-spin")}>
            <CloudDownload className="w-6 h-6" />
         </button>
      </div>

      <div className="absolute bottom-6 left-6 flex items-center gap-3 z-50 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-none">
        <button className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/40 focusable" onClick={() => setActiveIndex(p => (p - 1 + customManuscripts.length) % customManuscripts.length)}><ChevronRight className="w-6 h-6" /></button>
        <button className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/40 focusable" onClick={() => setActiveIndex(p => (p + 1) % customManuscripts.length)}><ChevronLeft className="w-6 h-6" /></button>
        <div className="w-px h-6 bg-white/10 mx-1" />
        <button className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/40 focusable" onClick={() => activeItem && setWallPlate('manuscript', activeItem)}><Maximize2 className="w-6 h-6" /></button>
      </div>
    </div>
  );
}
