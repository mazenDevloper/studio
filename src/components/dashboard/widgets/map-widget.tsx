"use client";

import { Card } from "@/components/ui/card";
import { Compass, Navigation } from "lucide-react";
import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export function MapWidget() {
  const mapImage = PlaceHolderImages.find(img => img.id === "map-placeholder");

  return (
    <Card className="h-full w-full overflow-hidden border-none bg-zinc-900/50 relative group rounded-[2.5rem]">
      {mapImage && (
        <Image
          src={mapImage.imageUrl}
          alt={mapImage.description}
          fill
          className="object-cover opacity-80"
          data-ai-hint={mapImage.imageHint}
        />
      )}
      
      <div className="absolute top-6 left-6 p-6 rounded-[2rem] bg-black/80 backdrop-blur-2xl border border-white/5 space-y-4 min-w-[280px] ios-shadow">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Navigation className="text-white w-8 h-8 rotate-45" />
          </div>
          <div>
            <h3 className="font-headline font-bold text-xl">24 min</h3>
            <p className="text-sm text-muted-foreground">to Silicon Valley</p>
          </div>
        </div>
        <div className="w-full bg-white/10 h-1.5 rounded-full">
          <div className="bg-blue-500 h-full w-[65%] rounded-full shadow-[0_0_12px_#3b82f6]" />
        </div>
      </div>

      <div className="absolute bottom-6 right-6 flex gap-3">
        <button className="w-14 h-14 rounded-full bg-zinc-800/90 backdrop-blur-xl flex items-center justify-center border border-white/10 ios-shadow">
          <Compass className="w-7 h-7 text-white" />
        </button>
      </div>

      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-6 h-6 rounded-full bg-blue-500 ring-4 ring-white/10 shadow-2xl relative">
          <div className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-75" />
        </div>
      </div>
    </Card>
  );
}
