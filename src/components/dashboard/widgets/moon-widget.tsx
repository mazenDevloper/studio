
"use client";

import { useEffect, useState } from "react";
import { CardContent } from "@/components/ui/card";
import { Moon as MoonIcon, Loader2, Cloud, Calendar, Maximize2, Type } from "lucide-react";
import Image from "next/image";
import { useMediaStore } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * MoonWidget v41.0 - Mammoth Day Display & Live Weather Status
 */
export function MoonWidget() {
  const [loading, setLoading] = useState(true);
  const [cycleIndex, setCycleIndex] = useState(0);
  const [hijriDay, setHijriDay] = useState(1);
  const [hijriDisplay, setHijriDisplay] = useState("١");
  const [hijriMonth, setHijriMonth] = useState("");
  const [gregMonth, setGregMonth] = useState("");
  const [temperature, setTemperature] = useState<string>("--");
  const [weatherStatus, setWeatherDesc] = useState<string>("جاري الرصد...");
  
  const { setWallPlate, mapSettings, updateMapSettings, isInitialLoading } = useMediaStore();

  const getWeatherText = (code: number) => {
    if (code === 0) return "سماء صافية";
    if (code <= 3) return "غائم جزئياً";
    if (code <= 48) return "ضباب كثيف";
    if (code <= 55) return "رذاذ خفيف";
    if (code <= 65) return "أجواء ممطرة";
    if (code <= 75) return "ثلوج خفيفة";
    if (code <= 82) return "زخات مطر";
    if (code <= 99) return "عواصف رعدية";
    return "طقس مستقر";
  };

  useEffect(() => {
    async function fetchTemperature() {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=17.0151&longitude=54.0924&current=temperature_2m,weather_code&timezone=Asia%2FRiyadh`);
        if (res.ok) {
          const data = await res.json();
          if (data?.current?.temperature_2m !== undefined) {
            setTemperature(`${Math.round(data.current.temperature_2m)}°`);
            setWeatherDesc(getWeatherText(data.current.weather_code));
          }
        }
      } catch (e) {}
    }

    try {
      const today = new Date();
      const hijriFormatter = new Intl.DateTimeFormat('ar-u-ca-islamic-umalqura-nu-latn', {day: 'numeric', month: 'long'});
      const hijriParts = hijriFormatter.formatToParts(today);
      const dayNum = parseInt(hijriParts.find(p => p.type === 'day')?.value || "1", 10);
      setHijriMonth(hijriParts.find(p => p.type === 'month')?.value || "");
      setGregMonth(today.toLocaleDateString('ar-EG', { month: 'long' }));
      const arabicDigits = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
      setHijriDisplay(dayNum.toString().split('').map(d => arabicDigits[parseInt(d)]).join(''));
      setHijriDay(dayNum > 30 ? 30 : (dayNum < 1 ? 1 : dayNum));
    } catch (e) { setHijriDisplay("١"); }

    fetchTemperature();
    setLoading(false);
    const cycleTimer = setInterval(() => setCycleIndex(p => (p + 1) % 3), 8000);
    return () => clearInterval(cycleTimer);
  }, []);

  const gregorianDay = new Date().getDate().toString();
  const displayValue = cycleIndex === 0 ? hijriDisplay : cycleIndex === 1 ? gregorianDay : temperature;
  const subLabel = cycleIndex === 0 ? hijriMonth : cycleIndex === 1 ? gregMonth : weatherStatus;
  const label = cycleIndex === 0 ? "الهجري" : cycleIndex === 1 ? "الميلادي" : "الرصد الجوي";
  const moonImageUrl = `https://phasesmoon.com/moonpng/220/moon-phase-${hijriDay}.webp`;

  return (
    <div className="h-full w-full bg-black rounded-[2.5rem] overflow-hidden relative flex flex-col items-center justify-center p-1 outline-none group focusable" tabIndex={0} onClick={() => setWallPlate('moon', { image: moonImageUrl, day: displayValue, label })}>
      <div className="absolute inset-0 z-0 flex items-center justify-center bg-black">
        <Image src={moonImageUrl} alt="Moon" width={800} height={800} className="w-[100%] h-auto object-contain pointer-events-none group-hover:scale-110 transition-transform duration-[20s] opacity-60 unoptimized" priority unoptimized />
      </div>

      <div className="absolute top-6 left-6 flex items-center gap-3 z-50 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-none">
        <button className={cn("w-12 h-12 rounded-full backdrop-blur-md border flex items-center justify-center transition-none focusable", mapSettings.showManuscriptOnMoon ? "bg-primary text-white border-primary shadow-glow" : "bg-white/10 text-white/40 border-white/10")} onClick={(e) => { e.stopPropagation(); updateMapSettings({ showManuscriptOnMoon: !mapSettings.showManuscriptOnMoon }); }}><Type className="w-6 h-6" /></button>
        <button className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/40 focusable" onClick={(e) => { e.stopPropagation(); setWallPlate('moon', { image: moonImageUrl, day: displayValue, label }); }}><Maximize2 className="w-6 h-6" /></button>
      </div>

      <CardContent className="p-0 h-full flex flex-col items-center justify-center relative z-10 w-full text-center">
        {(loading || isInitialLoading) ? <Loader2 className="w-12 h-12 animate-spin text-primary" /> : (
          <div className="flex flex-col items-center justify-center w-full scale-110">
            <svg className="w-full h-56 overflow-visible drop-shadow-[0_0_80px_rgba(0,0,0,1)]" viewBox="0 0 200 100">
               <defs><linearGradient id="moonTextFill" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="rgba(255,255,255,1)" /><stop offset="100%" stopColor="rgba(255,255,255,0.3)" /></linearGradient></defs>
               <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="font-black" style={{ fontSize: '180px' }} fill="url(#moonTextFill)">{displayValue}</text>
            </svg>
            <div className="h-[2px] w-32 bg-primary/60 rounded-full my-2 shadow-glow" />
            <span className="text-white font-black leading-none opacity-90" style={{ fontSize: '2rem', filter: 'drop-shadow(0 0 40px rgba(0,0,0,1))' }}>{subLabel}</span>
            <div className="mt-6 flex items-center gap-3 bg-black/60 px-6 py-2 rounded-full border border-white/10 backdrop-blur-md">
               {cycleIndex === 0 ? <MoonIcon className="w-4 h-4 text-blue-400" /> : cycleIndex === 1 ? <Calendar className="w-4 h-4 text-emerald-400" /> : <Cloud className="w-4 h-4 text-orange-400" />}
               <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60">{label}</span>
            </div>
          </div>
        )}
      </CardContent>
    </div>
  );
}
