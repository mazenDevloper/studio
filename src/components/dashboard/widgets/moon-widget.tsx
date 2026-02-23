"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Moon as MoonIcon, Star, Loader2, Info } from "lucide-react";
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
  const [infoIndex, setInfoIndex] = useState(0);

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

    // Constant slow rotation for visual effect
    const rotTimer = setInterval(() => {
      setRotation(prev => (prev + 0.05) % 360);
    }, 100);

    // Info cycling timer every 4 seconds
    const infoTimer = setInterval(() => {
      setInfoIndex((prev) => (prev + 1) % 3);
    }, 4000);

    return () => {
      clearInterval(rotTimer);
      clearInterval(infoTimer);
    };
  }, []);

  const currentInfo = useMemo(() => {
    if (!moonData) return { label: "Syncing", value: "NASA SVS" };
    
    const formattedPhase = typeof moonData.phase === 'string' 
      ? moonData.phase.replace(/-/g, ' ') 
      : String(moonData.phase || "Loading...");

    const infos = [
      { label: "Illumination", value: `${Math.round(moonData.illumination || 0)}%` },
      { label: "Distance", value: `${(moonData.distance || 0).toLocaleString()} KM` },
      { label: "Current Phase", value: formattedPhase },
    ];
    return infos[infoIndex];
  }, [moonData, infoIndex]);

  return (
    <Card className="h-full overflow-hidden border-none bg-zinc-900/50 rounded-[2.5rem] relative group">
      {/* Background glow behind the moon */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 w-48 h-48 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />
      
      <CardContent className="p-8 h-full flex items-center gap-10 relative z-10">
        {/* Main Element: The Moon */}
        <div className="relative w-40 h-40 flex-shrink-0">
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
          {/* Decorative Pulse Star */}
          <div className="absolute -top-2 -right-2">
            <Star className="w-4 h-4 text-yellow-500 fill-current animate-pulse shadow-glow" />
          </div>
        </div>
        
        {/* Dynamic Info Pane */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-1 w-8 bg-blue-500 rounded-full" />
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-blue-400">Astronomy Live</span>
          </div>

          <div className="space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-700 key={infoIndex}">
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest opacity-60">
              {currentInfo.label}
            </p>
            <h3 className="text-3xl font-bold font-headline leading-tight text-white capitalize truncate">
              {currentInfo.value}
            </h3>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div 
                  key={i} 
                  className={`h-1.5 w-1.5 rounded-full transition-all duration-500 ${infoIndex === i ? "bg-blue-400 w-4" : "bg-white/10"}`}
                />
              ))}
            </div>
            <span className="text-[9px] text-white/30 font-bold uppercase ml-2">Auto-Cycle 4s</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
