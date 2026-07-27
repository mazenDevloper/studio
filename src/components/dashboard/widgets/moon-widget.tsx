
"use client";

import { useEffect, useState } from "react";
import { CardContent } from "@/components/ui/card";
import { Moon as MoonIcon, Loader2, Cloud, Calendar, Maximize2, Type } from "lucide-react";
import Image from "next/image";
import { useMediaStore } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * MoonWidget v12000.0 - Ultra-Clear Sovereign Date Hub
 * Features: Direct clear moon image background (No Overlay) -> Today -> 3px Line -> Month.
 */
export function MoonWidget() {
  const [loading, setLoading] = useState(true);
  const [cycleIndex, setCycleIndex] = useState(0);
  const [hijriDay, setHijriDay] = useState(1);
  const [hijriDisplay, setHijriDisplay] = useState("١");
  const [hijriMonth, setHijriMonth] = useState("");
  const [gregMonth, setGregMonth] = useState("");
  const [temperature, setTemperature] = useState<string>("--");
  const [windowWidth, setWindowWidth] = useState(0);
  
  const { setWallPlate, mapSettings, updateMapSettings, isInitialLoading } = useMediaStore();

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    
    async function fetchTemperature() {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=17.0151&longitude=54.0924&current=temperature_2m&timezone=Asia%2FRiyadh`);
        if (res.ok) {
          const data = await res.json();
          if (data?.current?.temperature_2m !== undefined) {
            setTemperature(`${Math.round(data.current.temperature_2m)}°`);
          }
        }
      } catch (e) {}
    }

    try {
      const today = new Date();
      const hijriFormatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {day: 'numeric', month: 'long'});
      const hijriParts = hijriFormatter.formatToParts(today);
      const dayNum = parseInt(hijriParts.find(p => p.type === 'day')?.value || "1", 10);
      const monthName = hijriParts.find(p => p.type === 'month')?.value || "";
      
      const validDay = dayNum > 30 ? 30 : (dayNum < 1 ? 1 : dayNum);
      setHijriDay(validDay);
      setHijriMonth(monthName);
      setGregMonth(today.toLocaleDateString('ar-EG', { month: 'long' }));

      const arabicDigits = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
      const formattedDay = dayNum.toString().split('').map(d => arabicDigits[parseInt(d)]).join('');
      setHijriDisplay(formattedDay);
    } catch (e) {
      setHijriDay(1);
      setHijriDisplay("١");
    }

    fetchTemperature();
    setLoading(false);

    const cycleTimer = setInterval(() => setCycleIndex(p => (p + 1) % 3), 6000);
    
    return () => { 
      clearInterval(cycleTimer); 
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const gregorianDay = new Date().getDate().toString();
  const displayValue = cycleIndex === 0 ? hijriDisplay : cycleIndex === 1 ? gregorianDay : temperature;
  const subLabel = cycleIndex === 0 ? hijriMonth : cycleIndex === 1 ? gregMonth : "الطقس الآن";
  const label = cycleIndex === 0 ? "اليوم الهجري" : cycleIndex === 1 ? "اليوم الميلادي" : "درجة الحرارة";
  const isWide = windowWidth > 968;

  const moonImageUrl = `https://phasesmoon.com/moonpng/220/moon-phase-${hijriDay}.webp`;

  return (
    <div 
      className="h-full w-full bg-black rounded-[2.5rem] overflow-hidden relative flex flex-col items-center justify-center p-1 outline-none group focusable"
      tabIndex={0}
      onClick={() => setWallPlate('moon', { image: moonImageUrl, day: displayValue, label })}
    >
      {/* Ultra-Clear Moon Background - 100% Clarity as Requested */}
      <div className="absolute inset-0 z-0 flex items-center justify-center bg-black">
        <Image 
          src={moonImageUrl} 
          alt="Moon Background" 
          width={600}
          height={600}
          className="w-[90%] h-auto object-contain pointer-events-none group-hover:scale-105 transition-transform duration-[10s] unoptimized"
          priority
          unoptimized 
        />
      </div>

      <div className="absolute top-6 left-6 flex items-center gap-3 z-50 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-all">
        <button 
          className={cn(
            "w-12 h-12 rounded-full backdrop-blur-md border flex items-center justify-center transition-all focusable",
            mapSettings.showManuscriptOnMoon ? "bg-primary text-white border-primary shadow-glow" : "bg-white/10 text-white/40 border-white/10"
          )}
          onClick={(e) => { e.stopPropagation(); updateMapSettings({ showManuscriptOnMoon: !mapSettings.showManuscriptOnMoon }); }}
        >
          <Type className="w-6 h-6" />
        </button>
        <button 
          className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all focusable"
          onClick={(e) => { e.stopPropagation(); setWallPlate('moon', { image: moonImageUrl, day: displayValue, label }); }}
        >
          <Maximize2 className="w-6 h-6" />
        </button>
      </div>

      <CardContent className="p-0 h-full flex flex-col items-center justify-center gap-0 relative z-10 w-full text-center">
        {(loading || isInitialLoading) ? (
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        ) : (
          <div className="flex flex-col items-center justify-center w-full">
            {/* Today Number */}
            <div className="relative">
               <svg className="w-64 h-32 overflow-visible drop-shadow-[0_0_50px_rgba(0,0,0,1)]" viewBox="0 0 200 100">
                 <defs>
                   <linearGradient id="moonTextFill" x1="0%" y1="0%" x2="100%" y2="100%">
                     <stop offset="0%" stopColor="rgba(255,255,255,1)" />
                     <stop offset="100%" stopColor="rgba(255,255,255,0.4)" />
                   </linearGradient>
                 </defs>
                 <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="font-black" style={{ fontSize: '80px' }} fill="url(#moonTextFill)">
                   {displayValue}
                 </text>
               </svg>
            </div>

            {/* 3px Sovereign Line */}
            <div className="h-[3px] w-32 bg-primary rounded-full my-4 shadow-glow" />

            {/* Month Name - بخط dima-story ملكي ضخم */}
            <span className="text-white font-black tracking-widest uppercase animate-in fade-in slide-in-from-bottom-4 duration-1000 leading-none" style={{ fontFamily: 'dima-story, Amiri', fontSize: isWide ? '5.5rem' : '4rem', filter: 'drop-shadow(0 0 40px rgba(0,0,0,1))' }}>
              {subLabel}
            </span>

            {/* Label Badge */}
            <div className="mt-8 flex items-center gap-2 bg-black/60 px-6 py-2 rounded-full border border-white/10 backdrop-blur-md">
               {cycleIndex === 0 ? <MoonIcon className="w-4 h-4 text-blue-400" /> : cycleIndex === 1 ? <Calendar className="w-4 h-4 text-emerald-400" /> : <Cloud className="w-4 h-4 text-orange-400" />}
               <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60">{label}</span>
            </div>
          </div>
        )}
      </CardContent>
    </div>
  );
}
