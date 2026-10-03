
"use client";

import { useEffect, useRef, useState } from "react";
import { CardContent } from "@/components/ui/card";
import { Moon as MoonIcon, Loader2, Cloud, Calendar, Maximize2, Type } from "lucide-react";
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
      <div className="absolute inset-0 z-0 flex items-center justify-center bg-black [perspective:900px]">
        <Moon3D src={moonImageUrl} />
      </div>

      <div className="absolute top-6 left-6 flex items-center gap-3 z-50 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-none">
        <button className={cn("w-12 h-12 rounded-full backdrop-blur-md border flex items-center justify-center transition-none focusable", mapSettings.showManuscriptOnMoon ? "bg-primary text-white border-primary shadow-glow" : "bg-white/10 text-white/40 border-white/10")} onClick={(e) => { e.stopPropagation(); updateMapSettings({ showManuscriptOnMoon: !mapSettings.showManuscriptOnMoon }); }}><Type className="w-6 h-6" /></button>
        <button className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/40 focusable" onClick={(e) => { e.stopPropagation(); setWallPlate('moon', { image: moonImageUrl, day: displayValue, label }); }}><Maximize2 className="w-6 h-6" /></button>
      </div>

      <CardContent className="p-0 h-full flex flex-col items-center justify-center relative z-10 w-full text-center">
        {(loading || isInitialLoading) ? <Loader2 className="w-12 h-12 animate-spin text-primary" /> : (
          <div className="flex flex-col items-center justify-center w-full">
            <svg className="w-full h-32 overflow-visible drop-shadow-[0_0_60px_rgba(0,0,0,1)]" viewBox="0 0 200 100">
               <defs><linearGradient id="moonTextFill" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="rgba(255,255,255,1)" /><stop offset="100%" stopColor="rgba(255,255,255,0.3)" /></linearGradient></defs>
               <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="font-black" style={{ fontSize: '112px' }} fill="url(#moonTextFill)">{displayValue}</text>
            </svg>
            <div className="h-[2px] w-32 bg-primary/60 rounded-full my-2 shadow-glow" />
            <span className="text-white font-black leading-none opacity-90" style={{ fontSize: '1.5rem', filter: 'drop-shadow(0 0 40px rgba(0,0,0,1))' }}>{subLabel}</span>
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

/**
 * The moon as a sphere: the phase photo clipped to a circle, lit from the upper left (inner shadow on the night
 * side, a soft rim light, an outer glow), slowly tilting and floating in 3D. Web Animations: the app's global CSS
 * turns CSS animations off.
 */
export function Moon3D({ src, className, fill = 0.86 }: { src: string; className?: string; fill?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(0);
  // a true circle: the smaller side of the space it gets
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setSize(Math.floor(Math.min(el.clientWidth, el.clientHeight) * fill));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fill]);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof el.animate !== "function") return;
    const a = el.animate(
      [
        { transform: "rotateX(8deg) rotateY(-14deg) translateY(0px)" },
        { transform: "rotateX(-6deg) rotateY(12deg) translateY(-8px)" },
        { transform: "rotateX(8deg) rotateY(-14deg) translateY(0px)" },
      ],
      { duration: 24000, iterations: Infinity, easing: "ease-in-out" },
    );
    return () => a.cancel();
  }, []);
  return (
    <div ref={box} className={cn("w-full h-full flex items-center justify-center", className)}>
    <div ref={ref} className="relative rounded-full [transform-style:preserve-3d] shrink-0" style={{ width: size, height: size }}>
      {/* glow behind the sphere */}
      <div className="absolute -inset-[8%] rounded-full bg-[radial-gradient(circle,rgba(190,205,255,0.18)_0%,rgba(190,205,255,0.06)_45%,transparent_70%)]" />
      <div className="absolute inset-0 rounded-full overflow-hidden bg-black">
        <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover scale-[1.04] opacity-80 pointer-events-none" draggable={false} />
        {/* shading: the far side falls into darkness, the near side catches light */}
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_32%_28%,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0.04)_32%,rgba(0,0,0,0)_50%,rgba(0,0,0,0.55)_78%,rgba(0,0,0,0.85)_100%)]" />
        <div className="absolute inset-0 rounded-full shadow-[inset_-28px_-30px_60px_rgba(0,0,0,0.9),inset_14px_12px_30px_rgba(255,255,255,0.12)]" />
      </div>
      {/* thin rim light */}
      <div className="absolute inset-0 rounded-full ring-1 ring-white/10 shadow-[0_0_60px_rgba(170,190,255,0.12)]" />
    </div>
    </div>
  );
}
