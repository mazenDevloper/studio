
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Orbit, Moon as MoonIcon, Star } from "lucide-react";
import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export function MoonWidget() {
  const moonImage = PlaceHolderImages.find(img => img.id === "moon-surface");
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setRotation(prev => (prev + 0.1) % 360);
    }, 100);
    return () => clearInterval(timer);
  }, []);

  return (
    <Card className="h-full overflow-hidden border-none bg-zinc-900/50 rounded-[2.5rem] relative">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <MoonIcon className="w-32 h-32" />
      </div>
      
      <CardContent className="p-8 h-full flex items-center gap-8 relative z-10">
        <div className="relative w-32 h-32 rounded-full overflow-hidden ring-8 ring-white/5 shadow-2xl">
          {moonImage && (
            <Image
              src={moonImage.imageUrl}
              alt={moonImage.description}
              fill
              className="object-cover transition-transform duration-100"
              style={{ transform: `rotate(${rotation}deg) scale(1.1)` }}
              data-ai-hint={moonImage.imageHint}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-tr from-black/60 via-transparent to-white/10" />
        </div>
        
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-[0.3em] text-blue-400">Astronomy Live</span>
            <div className="flex gap-1">
              <Star className="w-3 h-3 text-yellow-500 fill-current animate-pulse" />
              <Star className="w-3 h-3 text-yellow-500 fill-current animate-pulse delay-75" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-3xl font-bold font-headline leading-tight text-white">Waxing Gibbous</h3>
            <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">Phase: 84% Illuminant</p>
          </div>
          <div className="flex gap-4 pt-2">
            <div className="px-3 py-1 bg-white/5 rounded-full border border-white/5 text-[10px] font-bold text-white/60">
              Dist: 384,400 KM
            </div>
            <div className="px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20 text-[10px] font-bold text-blue-400">
              Orbital Sync: ACTIVE
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
