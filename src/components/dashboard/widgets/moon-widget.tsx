
"use client";

import { useEffect, useState } from "react";
import { CardContent } from "@/components/ui/card";
import { Moon as MoonIcon, Loader2, Cloud, Calendar } from "lucide-react";
import Image from "next/image";

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

  useEffect(() => {
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
    fetchMoonData();
    const rotTimer = setInterval(() => setRotation(p => (p + 0.05) % 360), 100);
    const cycleTimer = setInterval(() => setCycleIndex(p => (p + 1) % 3), 5000);
    return () => { clearInterval(rotTimer); clearInterval(cycleTimer); };
  }, []);

  const hijriDay = "١٤";
  const gregorianDay = new Date().getDate().toString();
  const temp = "28°";

  return (
    <div className="h-full w-full bg-black/40 rounded-[2.5rem] overflow-hidden relative flex flex-col items-center justify-center p-4 shadow-2xl">
      <CardContent className="p-0 h-full flex flex-col items-center justify-center gap-4 relative z-10 w-full text-center">
        <div className="relative w-32 h-32 flex-shrink-0 mx-auto">
          {loading ? (
            <div className="w-full h-full rounded-full bg-white/5 flex items-center justify-center border border-white/10">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            </div>
          ) : (
            <div className="relative w-32 h-32 mx-auto">
              {/* Dynamic Scaling for Gregorian/Temp */}
              <div className="absolute inset-0 flex items-center justify-center z-20 font-black text-6xl pointer-events-none transition-all duration-1000"
                style={{ 
                  WebkitTextStroke: '0.7px rgba(255,255,255,0.6)', 
                  background: 'linear-gradient(to bottom, rgba(255,255,255,0.8), rgba(255,255,255,0.1))',
                  WebkitBackgroundClip: 'text', color: 'transparent', 
                  transform: cycleIndex === 0 ? 'scale(3.5)' : 'scale(2.2)' 
                }}>
                {cycleIndex === 0 ? hijriDay : cycleIndex === 1 ? gregorianDay : temp}
              </div>
              <div className="relative w-full h-full rounded-full overflow-hidden ring-[8px] ring-white/5 shadow-[0_0_60px_rgba(59,130,246,0.3)] bg-black">
                {moonData?.image?.url && <Image src={moonData.image.url} alt="NASA" fill className="object-cover scale-[1.15]" style={{ transform: `rotate(${rotation}deg)` }} unoptimized />}
                <div className="absolute inset-0 bg-gradient-to-tr from-black/60 via-transparent to-white/5 pointer-events-none" />
              </div>
            </div>
          )}
        </div>
        
        <div className="flex flex-col items-center gap-1.5 w-full">
          <div className="flex items-center gap-2 bg-white/5 px-4 py-1 rounded-full border border-white/10 backdrop-blur-md">
            {cycleIndex === 0 ? <MoonIcon className="w-3 h-3 text-blue-400" /> : cycleIndex === 1 ? <Calendar className="w-3 h-3 text-emerald-400" /> : <Cloud className="w-3 h-3 text-orange-400" />}
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/60">
              {cycleIndex === 0 ? "Hijri Hub" : cycleIndex === 1 ? "Gregorian Hub" : "Weather Hub"}
            </span>
          </div>
          <h3 className="text-lg font-black text-white leading-none drop-shadow-2xl">
            {cycleIndex === 0 ? "اليوم الهجري" : cycleIndex === 1 ? "اليوم الميلادي" : "درجة الحرارة"}
          </h3>
        </div>
      </CardContent>
    </div>
  );
}
