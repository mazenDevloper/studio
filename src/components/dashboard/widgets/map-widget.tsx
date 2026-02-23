"use client";

import { Card } from "@/components/ui/card";
import { Compass, MapPin, Navigation } from "lucide-react";
import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export function MapWidget() {
  const mapImage = PlaceHolderImages.find(img => img.id === "map-placeholder");

  return (
    <Card className="h-full w-full overflow-hidden border-white/5 relative group">
      {mapImage && (
        <Image
          src={mapImage.imageUrl}
          alt={mapImage.description}
          fill
          className="object-cover opacity-60 group-hover:scale-105 transition-transform duration-1000"
          data-ai-hint={mapImage.imageHint}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-80" />
      
      <div className="absolute top-4 left-4 p-4 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 space-y-4 min-w-[240px]">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
            <Navigation className="text-black w-6 h-6" />
          </div>
          <div>
            <h3 className="font-headline font-bold text-lg">Route Engaged</h3>
            <p className="text-xs text-muted-foreground">Destination: Silicon Valley</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">ETA</span>
            <span className="font-bold text-accent">15:45 (24 min)</span>
          </div>
          <div className="w-full bg-white/10 h-1 rounded-full">
            <div className="bg-accent h-full w-[65%] rounded-full shadow-[0_0_8px_hsl(var(--accent))]" />
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 right-4 flex gap-2">
        <button className="w-12 h-12 rounded-full bg-primary flex items-center justify-center border border-white/10 hover:bg-primary/80 transition-colors shadow-lg">
          <Compass className="w-6 h-6 text-white" />
        </button>
        <button className="w-12 h-12 rounded-full bg-accent flex items-center justify-center border border-white/10 hover:bg-accent/80 transition-colors shadow-lg">
          <MapPin className="w-6 h-6 text-black" />
        </button>
      </div>

      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-4 h-4 rounded-full bg-accent relative">
          <div className="absolute inset-0 rounded-full bg-accent animate-ping opacity-75" />
          <div className="absolute -top-12 -left-4 px-2 py-1 bg-accent text-black text-[10px] font-bold rounded">YOU</div>
        </div>
      </div>
    </Card>
  );
}
