
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Moon as MoonIcon, Star, Loader2 } from "lucide-react";
import Image from "next/image";

interface MoonData {
  image: {
    url: string;
  };
  phase: string;
  illumination: number;
  distance: number;
  age: number;
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

      // NASA logic: If before 18:00, use previous day's data for stability
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

    const timer = setInterval(() => {
      setRotation(prev => (prev + 0.05) % 360);
    }, 100);
    return () => clearInterval(timer);
  }, []);

  // Safe phase string formatter
  const formatPhase = (phase: any) => {
    if (!phase) return "Loading...";
    if (typeof phase !== 'string') return String(phase);
    return phase.replace(/-/g, ' ');
  };

  return (
    <Card className="h-full overflow-hidden border-none bg-zinc-900/50 rounded-[2.5rem] relative">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <MoonIcon className="w-32 h-32" />
      </div>
      
      <CardContent className="p-8 h-full flex items-center gap-8 relative z-10">
        {loading ? (
          <div className="w-32 h-32 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          </div>
        ) : (
          <div className="relative w-32 h-32 rounded-full overflow-hidden ring-8 ring-white/5 shadow-2xl bg-black">
            {moonData?.image?.url && (
              <Image
                src={moonData.image.url}
                alt="NASA Live Moon"
                fill
                className="object-cover transition-transform duration-100 scale-125"
                style={{ transform: `rotate(${rotation}deg)` }}
                unoptimized
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-tr from-black/60 via-transparent to-white/10" />
          </div>
        )}
        
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-[0.3em] text-blue-400">Astronomy Live</span>
            <div className="flex gap-1">
              <Star className="w-3 h-3 text-yellow-500 fill-current animate-pulse" />
              <Star className="w-3 h-3 text-yellow-500 fill-current animate-pulse delay-75" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-bold font-headline leading-tight text-white capitalize">
              {formatPhase(moonData?.phase)}
            </h3>
            <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">
              Phase: {moonData ? `${Math.round(moonData.illumination)}%` : "--"} Illuminant
            </p>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <div className="px-3 py-1 bg-white/5 rounded-full border border-white/5 text-[10px] font-bold text-white/60">
              Dist: {moonData ? moonData.distance.toLocaleString() : "---"} KM
            </div>
            <div className="px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20 text-[10px] font-bold text-blue-400">
              NASA SVS: {loading ? "SYNCING" : "LIVE"}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
