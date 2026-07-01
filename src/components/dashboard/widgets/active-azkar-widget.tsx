
"use client";

import { useMediaStore } from "@/lib/store";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Maximize2 } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import Image from "next/image";

/**
 * ActiveAzkarWidget v80.0 - High-Contrast Isolation
 * Features: White-Only images via brightness/invert, High-precision font application.
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
      className="h-full w-full rounded-[2.5rem] border border-white/10 flex flex-col relative overflow-hidden group focusable outline-none bg-black p-0 m-0"
      tabIndex={0}
      data-supports-wallplate="true"
      data-nav-id="active-azkar-container"
    >
      {mapSettings.showManuscriptBg && mapSettings.manuscriptBgUrl && (
        <div className="absolute inset-0 z-0">
          <Image src={mapSettings.manuscriptBgUrl} alt="Card Background" fill className="object-cover opacity-60" priority unoptimized />
        </div>
      )}
      
      <div className="relative z-20 flex-1 flex flex-col items-center justify-center overflow-hidden no-scrollbar p-0 m-0">
        <div className="w-full h-full overflow-hidden no-scrollbar" ref={emblaRef}>
          <div className="flex h-full p-0 m-0">
            {customManuscripts?.length > 0 ? (
              customManuscripts.map((item, i) => (
                <div key={item.id || i} className="flex-[0_0_100%] min-w-0 h-full flex items-center justify-center cursor-pointer relative p-0 m-0" onClick={() => togglePause()}>
                  <button 
                    className="absolute top-6 left-6 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/20 transition-all z-50 focusable opacity-0 group-hover:opacity-100 group-focus:opacity-100"
                    onClick={(e) => { e.stopPropagation(); setWallPlate('manuscript', item); }}
                    data-wallplate-trigger="true"
                  >
                    <Maximize2 className="w-6 h-6" />
                  </button>

                  <div className="animate-in fade-in zoom-in-95 duration-1000 w-full h-full flex justify-center items-center p-0 m-0 px-12">
                    {item.type === 'text' ? (
                      <p 
                        className="w-full text-4xl md:text-5xl lg:text-7xl font-calligraphy text-white leading-[1.3] drop-shadow-[0_0_30px_rgba(255,255,255,1)] text-center tracking-normal whitespace-pre-wrap break-words"
                        style={{ 
                          fontFamily: item.fontFamily || 'Aref Ruqaa',
                          WebkitTextStroke: '1px rgba(255,255,255,0.1)',
                          paintOrder: 'stroke fill'
                        }}
                      >
                        {item.content}
                      </p>
                    ) : (
                      <img 
                        src={item.content} 
                        alt="Manuscript"
                        className="h-full w-full object-contain brightness-100 drop-shadow-[0_0_100px_rgba(255,255,255,0.8)] p-0 m-0"
                        style={{ filter: 'brightness(0) invert(1) drop-shadow(0 0 30px rgba(255,255,255,0.8))' }}
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
                <p className="text-white font-black uppercase tracking-widest text-xs">أضف محتوى من الإعدادات</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
