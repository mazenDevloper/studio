
"use client";

import { useMediaStore } from "@/lib/store";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Maximize2, Plus, Minus } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import Image from "next/image";

/**
 * ActiveAzkarWidget v110.0 - Individual Scaling Module
 * Features: + and - controls for per-manuscript size customization saved per device.
 */
export function ActiveAzkarWidget() {
  const customManuscripts = useMediaStore(state => state.customManuscripts);
  const manuscriptScales = useMediaStore(state => state.manuscriptScales);
  const updateManuscriptScale = useMediaStore(state => state.updateManuscriptScale);
  const setWallPlate = useMediaStore(state => state.setWallPlate);
  const mapSettings = useMediaStore(state => state.mapSettings);
  const [isPaused, setIsPaused] = useState(false);

  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: true, 
    direction: 'rtl' 
  }, [
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

  useEffect(() => {
    if (emblaApi) emblaApi.reInit();
  }, [emblaApi, customManuscripts]);

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
              customManuscripts.map((item, i) => {
                const itemScale = manuscriptScales[item.id] || 1.0;
                return (
                  <div key={item.id + i} className="flex-[0_0_100%] min-w-0 h-full flex items-center justify-center cursor-pointer relative p-0 m-0" onClick={() => togglePause()}>
                    <div className="absolute top-6 left-6 flex items-center gap-3 z-50 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-all">
                      <button 
                        className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/20 transition-all focusable"
                        onClick={(e) => { e.stopPropagation(); setWallPlate('manuscript', item); }}
                        title="Full Screen"
                      >
                        <Maximize2 className="w-6 h-6" />
                      </button>
                      <button 
                        className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all focusable"
                        onClick={(e) => { e.stopPropagation(); updateManuscriptScale(item.id, 0.1); }}
                        title="Increase Size"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                      <button 
                        className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all focusable"
                        onClick={(e) => { e.stopPropagation(); updateManuscriptScale(item.id, -0.1); }}
                        title="Decrease Size"
                      >
                        <Minus className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="animate-in fade-in zoom-in-95 duration-700 w-full h-full flex justify-center items-center p-0 m-0 px-12 overflow-hidden">
                      {item.type === 'text' ? (
                        <p 
                          className="w-full font-calligraphy text-white leading-tight drop-shadow-[0_0_30px_rgba(255,255,255,0.8)] text-center tracking-normal whitespace-pre-wrap break-words"
                          style={{ 
                            fontFamily: item.fontFamily || 'Aref Ruqaa',
                            fontSize: `${itemScale * 4.2}rem`
                          }}
                        >
                          {item.content}
                        </p>
                      ) : (
                        <img 
                          src={item.content} 
                          alt="Manuscript"
                          className="h-full w-full object-contain p-0 m-0 transition-transform duration-500"
                          style={{ 
                            filter: 'brightness(0) invert(1) drop-shadow(0 0 30px rgba(255,255,255,0.8))',
                            transform: `scale(${itemScale})`
                          }}
                        />
                      )}
                    </div>
                    
                    {isPaused && (
                      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/10 px-4 py-1.5 rounded-full backdrop-blur-md border border-white/5 animate-pulse">
                        <span className="text-[10px] text-white/60 font-black uppercase tracking-widest">Paused</span>
                      </div>
                    )}
                  </div>
                );
              })
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
