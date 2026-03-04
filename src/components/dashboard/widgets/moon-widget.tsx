
"use client";

import { useEffect, useState, useMemo } from "react";
import { CardContent } from "@/components/ui/card";
import { Moon as MoonIcon, Loader2 } from "lucide-react";
import Image from "next/image";

interface MoonData {
  image: { url: string; };
  phase: string | number;
  illumination: number;
  distance: number;
}

export function MoonWidget() {
  const [moonData, setMoonData] = useState<MoonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rotation, setRotation] = useState(0);
  const [infoIndex, setInfoIndex] = useState(0);
  const [hijriDay, setHijriDay] = useState("");

  useEffect(() => {
    async function fetchMoonData() {
      const now = new Date();
      const hours = now.getHours();
      let targetDate = new Date(now);
      if (hours < 18) targetDate.setDate(targetDate.getDate() - 1);

      const year = targetDate.getFullYear();
      const month = (targetDate.getMonth() + 1).toString().padStart(2, '0');
      const day = targetDate.getDate().toString().padStart(2, '0');
      const nasaDateString = `${year}-${month}-${day}T18:00`;

      try {
        const response = await fetch(`https://svs.gsfc.nasa.gov/api/dialamoon/${nasaDateString}`);
        if (!response.ok) throw new Error("NASA API failed");
        const data = await response.json();
        setMoonData(data);
      } catch (error) {
        console.error("Moon Fetch Error:", error);
      } finally {
        setLoading(false);
      }
    }

    // Dynamic Hijri Day Calculation
    const hDay = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {day: 'numeric'}).format(new Date());
    setHijriDay(hDay);

    fetchMoonData();
    const rotTimer = setInterval(() => { setRotation(prev => (prev + 0.05) % 360); }, 100);
    const infoTimer = setInterval(() => { setInfoIndex((prev) => (prev + 1) % 3); }, 4000);
    return () => { clearInterval(rotTimer); clearInterval(infoTimer); };
  }, []);

  const currentInfo = useMemo(() => {
    if (!moonData) return { label: "جاري المزامنة", value: "NASA SVS" };
    const formattedPhase = typeof moonData.phase === 'string' ? moonData.phase.replace(/-/g, ' ') : String(moonData.phase);
    const infos = [
      { label: "نسبة الإضاءة", value: `${Math.round(moonData.illumination || 0)}%` },
      { label: "المسافة", value: `${Math.round(moonData.distance || 0).toLocaleString()} KM` },
      { label: "مرحلة القمر", value: formattedPhase },
    ];
    return infos[infoIndex];
  }, [moonData, infoIndex]);

  return (
    <div className="h-full w-full bg-black/40 rounded-[2.5rem] overflow-hidden relative group shadow-2xl flex flex-col items-center justify-center p-4">
      <CardContent className="p-0 h-full flex flex-col items-center justify-center gap-4 relative z-10 w-full text-center">
        <div className="relative w-32 h-32 flex-shrink-0 mx-auto">
          {loading ? (
            <div className="w-full h-full rounded-full bg-white/5 flex items-center justify-center border border-white/10">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            </div>
          ) : (
            <div className="relative w-32 h-32 mx-auto">
              <div id="hijri-moon-overlay" 
                className="absolute inset-0 flex items-center justify-center z-20 font-black text-6xl opacity-30 pointer-events-none"
                style={{ WebkitTextStroke: '1.5px rgba(255,255,255,0.7)', textShadow: '0 4px 10px rgba(0,0,0,0.5)', transform: 'scale(3.5)' }}
              >
                {hijriDay}
              </div>
              <div className="relative w-full h-full rounded-full overflow-hidden ring-[8px] ring-white/5 shadow-[0_0_60px_rgba(59,130,246,0.3)] bg-black">
                {moonData?.image?.url && (
                  <Image src={moonData.image.url} alt="NASA Moon" fill className="object-cover transition-transform duration-100 scale-[1.15]" style={{ transform: `rotate(${rotation}deg)` }} unoptimized />
                )}
                <div className="absolute inset-0 bg-gradient-to-tr from-black/60 via-transparent to-white/5 pointer-events-none" />
              </div>
            </div>
          )}
        </div>
        
        <div className="flex flex-col items-center gap-1.5 w-full">
          <div className="flex items-center gap-2 bg-white/5 px-4 py-1 rounded-full border border-white/10 backdrop-blur-md">
            <MoonIcon className="w-3 h-3 text-blue-400" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-400/80">NASA LIVE</span>
          </div>
          <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest">{currentInfo.label}</p>
          <h3 className="text-xl font-black text-white leading-none drop-shadow-2xl capitalize">{currentInfo.value}</h3>
        </div>
      </CardContent>
    </div>
  );
}
