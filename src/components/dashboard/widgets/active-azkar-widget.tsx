
"use client";

import { useMediaStore, Manuscript } from "@/lib/store";
import { useState, useEffect, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Sun, Moon, Stars, BookOpen, Sparkles, Maximize2 } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import Image from "next/image";

export function ActiveAzkarWidget() {
  const [now, setNow] = useState(new Date());
  const prayerTimes = useMediaStore(state => state.prayerTimes);
  const customManuscripts = useMediaStore(state => state.customManuscripts);
  const setWallPlate = useMediaStore(state => state.setWallPlate);
  const mapSettings = useMediaStore(state => state.mapSettings);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, direction: 'rtl' }, [
    Autoplay({ delay: 10000, stopOnInteraction: false, playOnInit: true })
  ]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setPhraseIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
  }, [emblaApi, onSelect]);

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

  const activeAzkar = useMemo(() => {
    if (!prayerTimes || prayerTimes.length === 0) return [];
    
    const day = now.getDate().toString().padStart(2, '0');
    const p = prayerTimes.find(pt => pt.date.endsWith(`-${day}`)) || prayerTimes[0];
    
    const tToM = (t: string) => {
      if (!t) return 0;
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    const currentMins = now.getHours() * 60 + now.getMinutes();
    const list = [];

    if (currentMins >= tToM(p.fajr) && currentMins < (tToM(p.dhuhr) - 10)) {
      list.push({ id: 'morning', name: 'أذكار الصباح', icon: Sun, color: 'text-orange-400' });
    }
    if (currentMins >= tToM(p.asr) && currentMins < tToM(p.maghrib)) {
      list.push({ id: 'evening', name: 'أذكار المساء', icon: Moon, color: 'text-blue-400' });
    }
    if (currentMins >= tToM(p.isha) || currentMins < tToM(p.fajr)) {
      list.push({ id: 'qiyam', name: 'قيام الليل', icon: Stars, color: 'text-purple-400' });
    }
    list.push({ id: 'wird', name: 'الورد اليومي', icon: BookOpen, color: 'text-emerald-400' });

    return list;
  }, [now, prayerTimes]);

  return (
    <div 
      className="h-full w-full rounded-[2.5rem] border border-white/10 p-1 flex flex-col justify-between relative overflow-hidden group focusable outline-none"
      tabIndex={0}
      data-supports-wallplate="true"
      data-nav-id="active-azkar-container"
    >
      {mapSettings.showManuscriptBg && (
        <div className="absolute inset-0 z-0">
          <Image src={mapSettings.manuscriptBgUrl} alt="Card Background" fill className="object-cover" priority />
        </div>
      )}
      
      <div className="relative z-20 flex-1 flex flex-col items-center justify-center overflow-hidden no-scrollbar">
        <div className="w-full h-full overflow-hidden no-scrollbar" ref={emblaRef}>
          <div className="flex h-full">
            {customManuscripts?.length > 0 ? (
              customManuscripts.map((item, i) => (
                <div key={i} className="flex-[0_0_100%] min-w-0 h-full flex items-center justify-center cursor-pointer relative" onClick={() => togglePause()}>
                  <button 
                    className="absolute top-6 left-6 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/20 transition-all z-50 focusable opacity-0 group-hover:opacity-100 group-focus:opacity-100"
                    onClick={(e) => { e.stopPropagation(); setWallPlate('manuscript', item); }}
                    data-wallplate-trigger="true"
                  >
                    <Maximize2 className="w-6 h-6" />
                  </button>

                  <div className="animate-in fade-in zoom-in-95 duration-1000 w-full flex justify-center px-4">
                    {item.type === 'text' ? (
                      <p className="w-full text-4xl md:text-6xl lg:text-[7rem] font-calligraphy text-white leading-relaxed drop-shadow-[0_0_20px_rgba(255,255,255,0.8)] text-center tracking-wide">
                        {item.content}
                      </p>
                    ) : (
                      <img 
                        src={item.content} 
                        alt="Manuscript"
                        className="h-80 md:h-[28rem] w-full object-contain brightness-0 invert drop-shadow-[0_0_70px_rgba(255,255,255,1)]"
                      />
                    )}
                  </div>
                  {isPaused && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/10 px-3 py-1 rounded-full backdrop-blur-md border border-white/5 animate-pulse">
                      <span className="text-[10px] text-white/40 font-black uppercase tracking-widest">Paused</span>
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

      <div className="mt-auto relative z-20 space-y-4 border-t border-white/5 p-6 bg-white/5">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h2 className="text-sm font-black text-white/60 uppercase tracking-widest">الأذكار والورد</h2>
            <div className="flex gap-1.5 mt-1.5">
              {customManuscripts?.map((_, i) => (
                <div key={i} className={cn("h-1 rounded-full transition-all duration-500", i === phraseIndex ? "bg-primary w-6 shadow-glow" : "bg-white/10 w-1")} />
              ))}
            </div>
          </div>
          <Sparkles className="w-5 h-5 text-primary animate-pulse" />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {activeAzkar.map(item => (
            <div key={item.id} className="flex items-center gap-3 bg-white/5 border border-white/5 py-2 px-4 rounded-xl shrink-0">
              <item.icon className={cn("w-4 h-4", item.color)} />
              <span className="text-xs font-black text-white/80">{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
