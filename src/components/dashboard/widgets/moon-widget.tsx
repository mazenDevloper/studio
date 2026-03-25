
"use client";

import { useEffect, useState } from "react";
import { CardContent } from "@/components/ui/card";
import { Moon as MoonIcon, Loader2, Cloud, Calendar, Maximize2 } from "lucide-react";
import Image from "next/image";
import { useMediaStore } from "@/lib/store";

interface MoonData {
  image: { url: string; };
  phase: string | number;
  illumination: number;
}

export function MoonWidget() {
  const [moonData, setMoonData] = useState<MoonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rotation, setRotation] = useState(0);
  const [cycleIndex, setCycleIndex] = useState(0); // 0: Hijri, 1: Gregorian, 2: Temp
  const [hijriDay, setHijriDay] = useState("");
  const [temperature, setTemperature] = useState<string>("--");
  const [windowWidth, setWindowWidth] = useState(0);
  const setWallPlate = useMediaStore(state => state.setWallPlate);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    
    async function fetchMoonData() {
      const now = new Date();
      const nasaDate = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getDate().toString().padStart(2,'0')}T18:00`;
      try {
        const response = await fetch(`https://svs.gsfc.nasa.gov/api/dialamoon/${nasaDate}`);
        if (response.ok) {
          const data = await response.json();
          setMoonData(data);
        }
      } catch (e) {
        console.error("NASA Moon API Error:", e);
      } finally {
        setLoading(false);
      }
    }

    async function fetchTemperature() {
      try {
        // Precise Salalah Coordinates: 17.0151, 54.0924
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=17.0151&longitude=54.0924&current=temperature_2m&timezone=Asia%2FRiyadh`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.current && typeof data.current.temperature_2m === 'number') {
            setTemperature(`${Math.round(data.current.temperature_2m)}°`);
          }
        }
      } catch (e) {
        console.error("Temp fetch error:", e);
      }
    }

    try {
      const today = new Date();
      // Use UmAlQura calendar for correct Hijri dates with Latin digits for parsing
      const hijriFormatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn', {day: 'numeric'});
      const dayNum = parseInt(hijriFormatter.format(today), 10);
      
      // Removed the "- 1" logic which caused 0 on the first day of the month
      const arabicDigits = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
      const formattedDay = dayNum.toString().split('').map(d => arabicDigits[parseInt(d)]).join('');
      setHijriDay(formattedDay);
    } catch (e) {
      setHijriDay("١"); // Fallback to 1
    }

    fetchMoonData();
    fetchTemperature();
    const rotTimer = setInterval(() => setRotation(p => (p + 0.05) % 360), 100);
    const cycleTimer = setInterval(() => setCycleIndex(p => (p + 1) % 3), 5000);
    
    return () => { 
      clearInterval(rotTimer); 
      clearInterval(cycleTimer); 
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const gregorianDay = new Date().getDate().toString();
  const displayValue = cycleIndex === 0 ? hijriDay : cycleIndex === 1 ? gregorianDay : temperature;
  const label = cycleIndex === 0 ? "اليوم الهجري" : cycleIndex === 1 ? "اليوم الميلادي" : "درجة الحرارة";
  const isWide = windowWidth > 968;

  return (
    <div 
      className="h-full w-full bg-black rounded-[2.5rem] overflow-hidden relative flex flex-col items-center justify-center p-1 shadow-2xl cursor-pointer focusable outline-none"
      onClick={() => moonData && setWallPlate('moon', { image: moonData.image.url, day: displayValue, label })}
      tabIndex={0}
      data-supports-wallplate="true"
      data-nav-id="moon-widget-container"
    >
      <button 
        className="absolute top-6 left-6 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/20 transition-all z-50 focusable opacity-0 group-hover:opacity-100 group-focus:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          if (moonData) setWallPlate('moon', { image: moonData.image.url, day: displayValue, label });
        }}
        data-wallplate-trigger="true"
      >
        <Maximize2 className="w-6 h-6" />
      </button>

      <CardContent className="p-0 h-full flex flex-col items-center justify-center gap-4 relative z-10 w-full text-center">
        <div className={isWide ? "relative w-64 h-64 flex-shrink-0 mx-auto transition-all duration-1000" : "relative w-36 h-36 flex-shrink-0 mx-auto transition-all duration-1000"}>
          {loading ? (
            <div className="w-full h-full rounded-full bg-white/5 flex items-center justify-center border border-white/10">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            </div>
          ) : (
            <div className="relative w-full h-full mx-auto group">
              <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none transition-all duration-1000"
                   style={{ 
                     transform: isWide 
                       ? (cycleIndex === 0 ? 'scale(4)' : 'scale(2.2)') 
                       : 'scale(3.2)' 
                   }}>
                <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100">
                  <defs>
                    <linearGradient id="moonFill" x1="100%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
                      <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                    </linearGradient>
                    <linearGradient id="moonStroke" x1="0%" y1="100%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="rgba(255,255,255,1)" />
                      <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                    </linearGradient>
                  </defs>
                  <text 
                    x="50%" 
                    y="50%" 
                    textAnchor="middle" 
                    dominantBaseline="central"
                    className="font-black"
                    style={{ fontSize: isWide ? (cycleIndex === 2 ? '16px' : '28px') : '30px' }} 
                    fill="url(#moonFill)"
                    stroke="url(#moonStroke)"
                    strokeWidth="0.5"
                  >
                    {displayValue}
                  </text>
                </svg>
              </div>
              <div className="relative w-full h-full rounded-full overflow-hidden ring-[10px] ring-white/5 shadow-[0_0_80px_rgba(59,130,246,0.5)] bg-black transition-transform group-hover:scale-105 duration-700">
                {moonData?.image?.url && (
                  <Image 
                    src={moonData.image.url} 
                    alt="NASA Moon" 
                    fill 
                    className="object-cover scale-[1.15] transition-transform duration-700" 
                    style={{ transform: `rotate(${rotation}deg) scale(1.15)` }} 
                    unoptimized 
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-tr from-black/60 via-transparent to-white/5 pointer-events-none" />
              </div>
            </div>
          )}
        </div>
        
        <div className="flex flex-col items-center gap-1 w-full">
          <div className="flex items-center gap-2 bg-white/5 px-5 py-1 rounded-full border border-white/10 backdrop-blur-md">
            {cycleIndex === 0 ? <MoonIcon className="w-3.5 h-3.5 text-blue-400" /> : cycleIndex === 1 ? <Calendar className="w-3.5 h-3.5 text-emerald-400" /> : <Cloud className="w-3.5 h-3.5 text-orange-400" />}
            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/60">
              {cycleIndex === 0 ? "Hijri Hub" : cycleIndex === 1 ? "Gregorian Hub" : "Weather Hub"}
            </span>
          </div>
          <h3 className="text-base font-black text-white leading-none drop-shadow-2xl">
            {label}
          </h3>
        </div>
      </CardContent>
    </div>
  );
}
