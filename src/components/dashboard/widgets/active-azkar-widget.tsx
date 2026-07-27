
"use client";

import { useMediaStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Maximize2, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

/**
 * ActiveAzkarWidget v130.0 - Sovereign Cycling Engine
 * Features: Cycles through manuscripts one by one to prevent overlap.
 * Added: Next/Prev buttons for manual navigation.
 */
export function ActiveAzkarWidget() {
  const customManuscripts = useMediaStore(state => state.customManuscripts);
  const manuscriptScales = useMediaStore(state => state.manuscriptScales);
  const setWallPlate = useMediaStore(state => state.setWallPlate);
  const mapSettings = useMediaStore(state => state.mapSettings);
  
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!customManuscripts?.length) return;
    const interval = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % customManuscripts.length);
    }, 15000); // Cycle every 15 seconds
    return () => clearInterval(interval);
  }, [customManuscripts]);

  const activeItem = customManuscripts?.[activeIndex];

  const getDynamicFontSize = (text: string, baseScale: number) => {
    const length = text.length;
    let base = 4.2;
    if (length > 15) base = 3.5;
    if (length > 25) base = 2.8;
    if (length > 40) base = 2.0;
    return `${baseScale * base}rem`;
  };

  const nextManu = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveIndex(prev => (prev + 1) % customManuscripts.length);
  };

  const prevManu = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveIndex(prev => (prev - 1 + customManuscripts.length) % customManuscripts.length);
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
          <Image src={mapSettings.manuscriptBgUrl} alt="Card Background" fill className="object-cover opacity-40" priority unoptimized />
        </div>
      )}
      
      <div className="relative z-20 flex-1 w-full h-full p-0 m-0 overflow-hidden">
        {activeItem ? (
          <div className="contents">
            {activeItem.type === 'text' && activeItem.words ? (
              activeItem.words.map((word) => {
                const itemScale = (word.scale || 1.0) * (manuscriptScales[activeItem.id] || 1.0);
                return (
                  <div 
                    key={word.id} 
                    style={{ 
                      position: 'absolute', 
                      left: `${word.x}%`, 
                      top: `${word.y}%`, 
                      transform: 'translate(-50%, -50%)',
                      width: 'max-content',
                    }}
                    className="animate-in fade-in zoom-in-95 duration-700 flex items-center justify-center p-0 m-0"
                  >
                    <p 
                      className="font-calligraphy text-white leading-none drop-shadow-[0_0_30px_rgba(255,255,255,0.6)] text-center tracking-normal whitespace-nowrap"
                      style={{ 
                        fontFamily: activeItem.fontFamily || 'Aref Ruqaa',
                        fontSize: getDynamicFontSize(word.text, itemScale)
                      }}
                    >
                      {word.text}
                    </p>
                  </div>
                );
              })
            ) : (
              <div 
                style={{ 
                  position: 'absolute', 
                  left: `${activeItem.x ?? 50}%`, 
                  top: `${activeItem.y ?? 50}%`, 
                  transform: 'translate(-50%, -50%)',
                }}
                className="animate-in fade-in zoom-in-95 duration-700"
              >
                {activeItem.type === 'image' && (
                  <img 
                    src={activeItem.content} 
                    alt="Manuscript"
                    className="object-contain p-0 m-0"
                    style={{ 
                      filter: 'brightness(0) invert(1) drop-shadow(0 0 30px rgba(255,255,255,0.6))',
                      maxHeight: '400px',
                      transform: `scale(${(activeItem.scale || 1.0) * (manuscriptScales[activeItem.id] || 1.0)})`
                    }}
                  />
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center opacity-20">
            <p className="text-white font-black uppercase tracking-widest text-xs">أضف محتوى من الإعدادات</p>
          </div>
        )}
      </div>

      {/* Sovereign Navigation Buttons */}
      <div className="absolute bottom-6 left-6 flex items-center gap-3 z-50 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-all">
        <button 
          className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all focusable shadow-glow"
          onClick={prevManu}
          title="المخطوطة السابقة"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
        <button 
          className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all focusable shadow-glow"
          onClick={nextManu}
          title="المخطوطة التالية"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="w-px h-6 bg-white/10 mx-1" />
        <button 
          className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all focusable shadow-glow"
          onClick={() => activeItem && setWallPlate('manuscript', activeItem)}
        >
          <Maximize2 className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
