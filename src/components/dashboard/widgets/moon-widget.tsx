
"use client";

import { useEffect, useState } from "react";
import { CardContent } from "@/components/ui/card";
import { Loader2, Moon as MoonIcon, AlertCircle } from "lucide-react";
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
  const [error, setError] = useState(false);
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
        setLoading(true);
        const response = await fetch(`https://svs.gsfc.nasa.gov/api/dialamoon/${nasaDateString}`, {
          mode: 'cors',
          credentials: 'omit'
        });
        if (!response.ok) throw new Error("NASA API failed");
        const data = await response.json();
        setMoonData(data);
        setError(false);
      } catch (error) {
        console.error("Failed to fetch NASA moon data:", error);
        setError(true);
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
    if (typeof phase !== 'string') return "Scanning Orbit...";
    return phase.replace(/-/g, ' ');
  };

  return (
    <div className="h-full w-full bg-black rounded-[2.5rem] border border-white/5 overflow-hidden relative group shadow-2xl flex flex-col items-center justify-center">
      <div className="absolute inset-0 z-0">
        <Image 
          src="https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&q=80&w=1000"
          alt="Space Background"
          fill
          className="object-cover opacity-30 group-hover:scale-110 transition-transform duration-[10s]"
          data-ai-hint="space galaxy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
      </div>
      
      <CardContent className="p-6 h-full flex flex-col items-center justify-center gap-4 relative z-10 w-full">
        <div className="relative w-32 h-32 flex-shrink-0">
          {loading ? (
            <div className="w-full h-full rounded-full bg-white/5 flex items-center justify-center border border-white/10">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            </div>
          ) : error ? (
            <div className="w-full h-full rounded-full bg-zinc-900 flex flex-col items-center justify-center border border-red-500/20 text-center p-4">
              <AlertCircle className="w-6 h-6 text-red-500/50 mb-2" />
              <span className="text-[8px] text-white/40 font-bold uppercase tracking-widest">Offline</span>
            </div>
          ) : (
            <div className="relative w-full h-full rounded-full overflow-hidden ring-[8px] ring-white/5 shadow-[0_0_60px_rgba(59,130,246,0.2)] bg-black">
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
              <div className="absolute inset-0 bg-gradient-to-tr from-black/60 via-transparent to-white/5 pointer-events-none" />
            </div>
          )}
        </div>
        
        <div className="flex flex-col items-center text-center gap-1.5 w-full">
          <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/5 backdrop-blur-md">
            <MoonIcon className="w-3 h-3 text-blue-400" />
            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-blue-400/80">
              {error ? "LOCAL SENSOR" : "NASA LIVE FEED"}
            </span>
          </div>

          <div className="space-y-0">
            <h3 className="text-4xl font-black text-white leading-none drop-shadow-2xl">
              {moonData ? Math.round(moonData.illumination) : "--"}%
            </h3>
            <p className="text-[8px] text-white/30 font-bold uppercase tracking-widest mt-1">Illumination</p>
          </div>

          <div className="mt-1 text-primary/80 font-black uppercase tracking-[0.2em] text-[8px]">
            {moonData ? formatPhase(moonData.phase) : "Analyzing Orbit..."}
          </div>
        </div>
      </CardContent>
    </div>
  );
}
