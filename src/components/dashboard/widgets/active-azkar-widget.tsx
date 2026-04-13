
"use client";

import { useMediaStore } from "@/lib/store";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Maximize2 } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import Image from "next/image";

/**
 * ActiveAzkarWidget v59.0 - Optimized Clarity View
 * Removed black overlay completely for zero-crop pure background.
 */
export function ActiveAzkarWidget() {
  const customManuscripts = useMediaStore(state => state.customManuscripts);
  const setWallPlate = useMediaStore(state => state.setWallPlate);
  const mapSettings = useMediaStore(state => state.mapSettings);
  const [isPaused, setIsPaused] = useState(false);

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, direction: 'rtl' }, [
    Autoplay({ delay: 10000, stopOnInteraction: false, playOnInit: true })
  ]);

  const togglePause = () => {
    if (!emblaApi) return;
    const autoplay = emblaApi.plugins().autoplay;
    if (isPaused) {
      autoplay.play();
    } else {
      autoplay.stop();
    }
    setIsPaused(!isPaused);
  };

  return (
    <div 
      className="h-full w-full rounded-[2.5rem] border border-white/10 flex flex-col relative overflow-hidden group focusable outline-none bg-black"
      tabIndex={0}
      data-supports-wallplate="true"
      data-nav-id="active-azkar-container"
    >
      {mapSettings.showManuscriptBg && mapSettings.manuscriptBgUrl && (
        <div className="absolute inset-0 z-0">
          <Image src={mapSettings.manuscriptBgUrl} alt="Card Background" fill className="object-cover opacity-60" priority />
        </div>
      )}
      
      <div className="relative z-20 flex-1 flex flex-col items-center justify-center overflow-hidden no-scrollbar">
        <div className="w-full h-full overflow-hidden no-scrollbar" ref={emblaRef}>
          <div className="flex h-full">
            {customManuscripts?.length > 0 ? (
              customManuscripts.map((item, i) => (
                <div key={item.id || i} className="flex-[0_0_100%] min-w-0 h-full flex items-center justify-center cursor-pointer relative" onClick={() => togglePause()}>
                  <button 
                    className="absolute top-6 left-6 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/20 transition-all z-50 focusable opacity-0 group-hover:opacity-100 group-focus:opacity-100"
                    onClick={(e) => { e.stopPropagation(); setWallPlate('manuscript', item); }}
                    data-wallplate-trigger="true"
                  >
                    <Maximize2 className="w-6 h-6" />
                  </button>

                  <div className="animate-in fade-in zoom-in-95 duration-1000 w-full flex justify-center px-8 md:px-12">
                    {item.type === 'text' ? (
                      <p className="w-full text-5xl md:text-7xl lg:text-8xl font-calligraphy text-white leading-tight drop-shadow-[0_0_30px_rgba(255,255,255,0.9)] text-center tracking-wide whitespace-pre-wrap break-words">
                        {item.content}
                      </p>
                    ) : (
                      <img 
                        src={item.content} 
                        alt="Manuscript"
                        className="max-h-[90%] max-w-[95%] object-contain brightness-0 invert drop-shadow-[0_0_80px_rgba(255,255,255,1)]"
                      />
                    )}
                  </div>
                  
                  {isPaused && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/10 px-4 py-1.5 rounded-full backdrop-blur-md border border-white/5 animate-pulse">
                      <span className="text-[10px] text-white/60 font-black uppercase tracking-widest">Paused</span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="flex-[0_0_100%] flex items-center justify-center opacity-20">
                <p className="text-white font-black uppercase tracking-widest text-xs">أضف مخطوطات من الإعدادات</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
