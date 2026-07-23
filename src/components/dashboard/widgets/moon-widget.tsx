
"use client";

import { useEffect, useState } from "react";
import { CardContent } from "@/components/ui/card";
import { Moon as MoonIcon, Loader2, Cloud, Calendar, Maximize2, Type } from "lucide-react";
import Image from "next/image";
import { useMediaStore } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * MoonWidget v218.0 - Sovereign Date Hub
 * Features: Hijri/Gregorian month names in dima-story font.
 */
export function MoonWidget() {
  const [loading, setLoading] = useState(true);
  const [cycleIndex, setCycleIndex] = useState(0); // 0: Hijri, 1: Gregorian, 2: Temp
  const [hijriDay, setHijriDay] = useState(1);
  const [hijriDisplay, setHijriDisplay] = useState("١");
  const [hijriMonth, setHijriMonth] = useState("");
  const [gregMonth, setGregMonth] = useState("");
  const [temperature, setTemperature] = useState<string>("--");
  const [windowWidth, setWindowWidth] = useState(0);
  
  const { setWallPlate, mapSettings, updateMapSettings } = useMediaStore();

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
      } catch (e) {
        console.error("Temp fetch error:", e);
      }
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

    const cycleTimer = setInterval(() => setCycleIndex(p => (p + 1) % 3), 5000);
    
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

  const toggleManuscriptOnMoon = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateMapSettings({ showManuscriptOnMoon: !mapSettings.showManuscriptOnMoon });
  };

  return (
    <div 
      className="h-full w-full bg-black rounded-[2.5rem] overflow-hidden relative flex flex-col items-center justify-center p-1 outline-none border-2 border-transparent group focusable"
      tabIndex={0}
      onClick={() => setWallPlate('moon', { image: moonImageUrl, day: displayValue, label })}
    >
      <div className="absolute top-6 left-6 flex items-center gap-3 z-50 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-all">
        <button 
          className={cn(
            "w-12 h-12 rounded-full backdrop-blur-md border flex items-center justify-center transition-all focusable",
            mapSettings.showManuscriptOnMoon ? "bg-primary text-white border-primary shadow-glow" : "bg-white/10 text-white/40 border-white/10 hover:bg-white/20"
          )}
          onClick={toggleManuscriptOnMoon}
          title="عرض المخطوطة على القمر"
        >
          <Type className="w-6 h-6" />
        </button>

        <button 
          className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/20 transition-all focusable"
          onClick={(e) => {
            e.stopPropagation();
            setWallPlate('moon', { image: moonImageUrl, day: displayValue, label });
          }}
        >
          <Maximize2 className="w-6 h-6" />
        </button>
      </div>

      <CardContent className="p-0 h-full flex flex-col items-center justify-center gap-4 relative z-10 w-full text-center">
        <div className={cn("relative flex-shrink-0 mx-auto transition-all duration-1000", isWide ? "w-80" : "w-56")}>
          {loading ? (
            <div className="w-full h-56 rounded-[2rem] bg-white/5 flex items-center justify-center border border-white/10">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            </div>
          ) : (
            <div className="relative w-full mx-auto">
              <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none transition-all duration-1000">
                <div style={{ transform: isWide ? (cycleIndex === 0 ? 'scale(4.8)' : 'scale(2.8)') : 'scale(3.8)' }}>
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100">
                    <defs>
                      <linearGradient id="moonFill" x1="100%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                      </linearGradient>
                    </defs>
                    <text 
                      x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="font-black"
                      style={{ fontSize: isWide ? (cycleIndex === 2 ? '16px' : '28px') : '30px' }} 
                      fill="url(#moonFill)"
                    >
                      {displayValue}
                    </text>
                  </svg>
                </div>
                {/* Month Name Injection with dima-story */}
                <span className="text-white/60 font-black tracking-widest mt-4 uppercase animate-in fade-in slide-in-from-bottom-2 duration-700" style={{ fontFamily: 'dima-story, Aref Ruqaa', fontSize: isWide ? '1.8rem' : '1.4rem' }}>
                  {subLabel}
                </span>
              </div>

              <div className="relative w-full overflow-hidden bg-black transition-transform group-hover:scale-105 duration-700">
                <Image 
                  src={moonImageUrl} 
                  alt={`Moon Phase ${hijriDay}`} 
                  width={400}
                  height={400}
                  className="w-full h-auto transition-transform duration-1000 object-contain" 
                  unoptimized 
                  priority
                />
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
          <h3 className="text-base font-black text-white leading-none drop-shadow-2xl">{label}</h3>
        </div>
      </CardContent>
    </div>
  );
}
