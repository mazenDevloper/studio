
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
        
        const illuminationValue = parseFloat(data.illumination);
        setMoonData({
          ...data,
          illumination: isNaN(illuminationValue) ? 0 : illuminationValue
        });
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

  const hijriDay = "١١"; // Example fallback or calculated day

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
      
      <CardContent className="p-6 h-full flex flex-col items-center justify-center gap-4 relative z-10 w-full text-center">
        <div id="dash-card-nasa" className="carousel-slide-dash w-full relative flex flex-col items-center justify-center">
          <div className="relative w-32 h-32 mb-4">
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
              <>
                <div id="hijri-moon-overlay" 
                  className="absolute inset-0 flex items-center justify-center z-20 font-black text-6xl opacity-30 pointer-events-none"
                  style={{ WebkitTextStroke: '1.5px rgba(255,255,255,0.7)', textShadow: '0 4px 10px rgba(0,0,0,0.5)', transform: 'scale(3.5)' }}
                >
                  {hijriDay}
                </div>
                <div className="relative w-full h-full rounded-full overflow-hidden ring-[8px] ring-white/5 shadow-[0_0_60px_rgba(147,51,234,0.3)] bg-black">
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
              </>
            )}
          </div>
          
          <div className="flex flex-col items-center gap-1.5 w-full">
            <h3 className="text-2xl font-bold text-purple-300 leading-none drop-shadow-xl">مرحلة القمر</h3>
            <p className="text-[10px] text-white/50 mt-1 uppercase tracking-widest font-black">
              {loading ? "INITIALIZING..." : error ? "LOCAL SENSOR" : `الإضاءة: ${Math.round(moonData?.illumination || 0)}%`}
            </p>
            <div className="mt-2 text-primary/80 font-black uppercase tracking-[0.2em] text-[8px] bg-white/5 px-3 py-1 rounded-full border border-white/5">
              {moonData ? formatPhase(moonData.phase) : "Analyzing Orbit..."}
            </div>
          </div>
        </div>
      </CardContent>
    </div>
  );
}
