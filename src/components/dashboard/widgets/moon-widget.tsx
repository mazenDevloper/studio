
"use client";

import { useEffect, useState } from "react";
import { CardContent } from "@/components/ui/card";
import { Loader2, Moon as MoonIcon } from "lucide-react";
import Image from "next/image";

interface MoonData {
  image: {
    url: string;
  };
  phase: string;
  illumination: number;
}

export function MoonWidget() {
  const [moonData, setMoonData] = useState<MoonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    async function fetchMoonData() {
      const now = new Date();
      const hours = now.getHours();
      let targetDate = new Date(now);
      if (hours < 18) {
        targetDate.setDate(targetDate.getDate() - 1);
      }
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
        console.error("Failed to fetch NASA moon data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchMoonData();

    const rotTimer = setInterval(() => {
      setRotation(prev => (prev + 0.05) % 360);
    }, 100);

    return () => clearInterval(rotTimer);
  }, []);

  const formatPhase = (phase: any) => {
    if (typeof phase !== 'string') return "Loading...";
    return phase.replace(/-/g, ' ');
  };

  return (
    <div className="h-full bg-zinc-900/60 backdrop-blur-3xl rounded-[2.5rem] border border-white/5 overflow-hidden relative group shadow-2xl">
      <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-48 h-48 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />
      
      <CardContent className="p-8 h-full flex items-center justify-around gap-6 relative z-10">
        {/* Main Element: The Moon */}
        <div className="relative w-44 h-44 flex-shrink-0">
          {loading ? (
            <div className="w-full h-full rounded-full bg-white/5 flex items-center justify-center border border-white/10">
              <Loader2 className="w-10 h-10 animate-spin text-blue-400" />
            </div>
          ) : (
            <div className="relative w-full h-full rounded-full overflow-hidden ring-[12px] ring-white/5 shadow-[0_0_50px_rgba(255,255,255,0.05)] bg-black">
              {moonData?.image?.url && (
                <Image
                  src={moonData.image.url}
                  alt="NASA Live Moon"
                  fill
                  className="object-cover transition-transform duration-100 scale-[1.15]"
                  style={{ transform: `rotate(${rotation}deg)` }}
                  unoptimized
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-tr from-black/70 via-transparent to-white/5 pointer-events-none" />
            </div>
          )}
        </div>
        
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <MoonIcon className="w-4 h-4 text-blue-400" />
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-blue-400">NASA SVS Live</span>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Illumination</p>
            <h3 className="text-5xl font-bold font-headline text-white leading-none">
              {moonData ? Math.round(moonData.illumination) : "0"}%
            </h3>
          </div>

          <div className="py-2 px-4 rounded-xl bg-white/5 border border-white/5 w-fit">
            <span className="text-[10px] text-white/60 font-bold uppercase tracking-wider capitalize">
              {moonData ? formatPhase(moonData.phase) : "Analyzing..."}
            </span>
          </div>
        </div>
      </CardContent>
    </div>
  );
}
