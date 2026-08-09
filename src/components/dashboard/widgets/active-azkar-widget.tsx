
"use client";

import { useMediaStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Maximize2, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

/**
 * ActiveAzkarWidget v18000.0 - Sovereign Precision Display
 * Features: Full-width 100% display with 2px edge padding for royal visibility.
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
  const getDynamicFontSize = (baseScale: number) => `${baseScale * 8.5}cqw`;

  return (
    <div className="h-full w-full rounded-[2.5rem] border border-white/10 flex flex-col relative overflow-hidden group focusable outline-none bg-black p-0.5 m-0" tabIndex={0}>
      {mapSettings.showManuscriptBg && mapSettings.manuscriptBgUrl && (
        <div className="absolute inset-0 z-0">
          <Image src={mapSettings.manuscriptBgUrl} alt="Bg" fill className="object-cover opacity-40" unoptimized />
        </div>
      )}
      
      <div className="relative z-20 w-full h-full overflow-hidden flex items-center justify-center">
        {activeItem ? (
          <div className="relative w-full aspect-[4/3] flex items-center justify-center max-h-full [container-type:inline-size]">
            {activeItem.type === 'text' && activeItem.words ? (
              activeItem.words.map((word) => {
                const itemScale = (word.scale || 1.0) * (manuscriptScales[activeItem.id] || 1.0);
                return (
                  <div key={word.id} style={{ position: 'absolute', left: `${word.x}%`, top: `${word.y}%`, transform: 'translate(-50%, -50%)', width: 'max-content' }}>
                    <p className="font-calligraphy text-white leading-none drop-shadow-[0_0_40px_rgba(255,255,255,0.7)] text-center tracking-normal whitespace-nowrap" style={{ fontFamily: activeItem.fontFamily || 'Aref Ruqaa', fontSize: getDynamicFontSize(itemScale), transition: 'none', color: mapSettings.manuscriptColor }}>{word.text}</p>
                  </div>
                );
              })
            ) : (
              <div style={{ position: 'absolute', left: `${activeItem.x ?? 50}%`, top: `${activeItem.y ?? 50}%`, transform: 'translate(-50%, -50%)' }}>
                {activeItem.type === 'image' && <img src={activeItem.content} className="object-contain" style={{ filter: 'brightness(0) invert(1) drop-shadow(0 0 40px rgba(255,255,255,0.6))', maxHeight: '80%', transform: `scale(${(activeItem.scale || 1.0) * (manuscriptScales[activeItem.id] || 1.0)})` }} />}
              </div>
            )}
          </div>
        ) : (
          <p className="text-white/20 font-black uppercase tracking-widest text-xs">أضف محتوى من الإعدادات</p>
        )}
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
