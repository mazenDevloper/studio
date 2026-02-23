
"use client";

import { Card } from "@/components/ui/card";
import { Compass, Navigation } from "lucide-react";
import { GOOGLE_MAPS_API_KEY } from "@/lib/constants";

export function MapWidget() {
  const location = "Silicon+Valley,CA";
  const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${location}&zoom=14&size=800x600&maptype=roadmap&style=feature:all|element:all|saturation:-100|invert_lightness:true&key=${GOOGLE_MAPS_API_KEY}`;

  return (
    <Card className="h-full w-full overflow-hidden border-none bg-zinc-900/50 relative group rounded-[2.5rem]">
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-80"
        style={{ backgroundImage: `url(${mapUrl})` }}
      />
      
      <div className="absolute top-6 left-6 p-6 rounded-[2rem] bg-black/80 backdrop-blur-2xl border border-white/5 space-y-4 min-w-[280px] ios-shadow">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Navigation className="text-white w-8 h-8 rotate-45" />
          </div>
          <div>
            <h3 className="font-headline font-bold text-xl">DriveCast Nav</h3>
            <p className="text-sm text-muted-foreground">Live Route Active</p>
          </div>
        </div>
        <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
          <div className="bg-blue-500 h-full w-[65%] rounded-full shadow-[0_0_12px_#3b82f6] animate-pulse" />
        </div>
      </div>

      <div className="absolute bottom-6 right-6 flex gap-3">
        <button className="w-14 h-14 rounded-full bg-zinc-800/90 backdrop-blur-xl flex items-center justify-center border border-white/10 ios-shadow hover:scale-110 transition-transform">
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
