"use client";

import { useMediaStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Maximize2, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

/**
 * ActiveAzkarWidget v17000.0 - Atomic Freeze System
 * Features: Fixed aspect ratio container (4/3) with relative font scaling.
 * This prevents horizontal gaps from expanding on wide screens.
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
    }, 15000); 
    return () => clearInterval(interval);
  }, [customManuscripts]);

  const activeItem = customManuscripts?.[activeIndex];

  // Using container-relative units (vw) within a fixed-ratio parent ensures stable gaps
  const getDynamicFontSize = (baseScale: number) => {
    return `${baseScale * 3.2}vw`; 
  };

  const nextManu = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!customManuscripts.length) return;
    setActiveIndex(prev => (prev + 1) % customManuscripts.length);
  };

  const prevManu = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!customManuscripts.length) return;
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
      
      <div className="relative z-20 w-full flex-1 p-8 m-0 overflow-hidden flex items-center justify-center">
        {activeItem ? (
          /* Fixed Aspect Ratio Container to 'Freeze' the layout */
          <div className="relative w-full aspect-[4/3] flex items-center justify-center max-h-full">
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
                      transition: 'none', 
                    }}
                    className="flex items-center justify-center p-0 m-0"
                  >
                    <p 
                      className="font-calligraphy text-white leading-none drop-shadow-[0_0_40px_rgba(255,255,255,0.7)] text-center tracking-normal whitespace-nowrap"
                      style={{ 
                        fontFamily: activeItem.fontFamily || 'Aref Ruqaa',
                        fontSize: getDynamicFontSize(itemScale),
                        transition: 'none'
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
              >
                {activeItem.type === 'image' && (
                  <img 
                    src={activeItem.content} 
                    alt="Manuscript"
                    className="object-contain p-0 m-0"
                    style={{ 
                      filter: 'brightness(0) invert(1) drop-shadow(0 0 40px rgba(255,255,255,0.6))',
                      maxHeight: '80%',
                      transform: `scale(${(activeItem.scale || 1.0) * (manuscriptScales[activeItem.id] || 1.0)})`,
                      transition: 'none'
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

      <div className="absolute bottom-6 left-6 flex items-center gap-3 z-50 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-none">
        <button 
          className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-none focusable shadow-glow"
          onClick={prevManu}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
        <button 
          className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-none focusable shadow-glow"
          onClick={nextManu}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="w-px h-6 bg-white/10 mx-1" />
        <button 
          className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-none focusable shadow-glow"
          onClick={() => activeItem && setWallPlate('manuscript', activeItem)}
        >
          <Maximize2 className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}