
"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Compass, Navigation, MapPin, Search } from "lucide-react";
import { GOOGLE_MAPS_API_KEY } from "@/lib/constants";

export function MapWidget() {
  const [coords, setCoords] = useState({ lat: 37.3382, lng: -121.8863 });
  const location = `${coords.lat},${coords.lng}`;
  const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${location}&zoom=15&size=800x600&maptype=roadmap&style=feature:all|element:all|saturation:-100|invert_lightness:true&style=feature:road.highway|element:geometry|color:0x222222&style=feature:water|element:geometry|color:0x000000&key=${GOOGLE_MAPS_API_KEY}`;

  useEffect(() => {
    // Simulate slight movement for a "live" navigation feel
    const interval = setInterval(() => {
      setCoords(prev => ({
        lat: prev.lat + (Math.random() - 0.5) * 0.0001,
        lng: prev.lng + (Math.random() - 0.5) * 0.0001
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="h-full w-full overflow-hidden border-none bg-zinc-900/50 relative group rounded-[2.5rem]">
      {/* Interactive Map Interface */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-80 transition-all duration-1000"
        style={{ backgroundImage: `url(${mapUrl})` }}
      />
      
      {/* OLED HUD Elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />

      {/* Top HUD */}
      <div className="absolute top-6 left-6 flex gap-4 items-start">
        <div className="p-6 rounded-[2rem] bg-black/90 backdrop-blur-3xl border border-white/10 space-y-4 min-w-[320px] shadow-2xl">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-[1.2rem] bg-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)]">
              <Navigation className="text-white w-9 h-9 rotate-45" />
            </div>
            <div>
              <h3 className="font-headline font-bold text-2xl text-white">DriveCast Pro Nav</h3>
              <p className="text-sm text-blue-400 font-bold uppercase tracking-widest">Active Tracking • 5G Ultra</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              <span>Path Progress</span>
              <span>65%</span>
            </div>
            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
              <div className="bg-blue-500 h-full w-[65%] rounded-full shadow-[0_0_15px_#3b82f6] animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-8 right-8 flex flex-col gap-4">
        <button className="w-16 h-16 rounded-full bg-zinc-900/90 backdrop-blur-3xl flex items-center justify-center border border-white/10 shadow-2xl hover:bg-white/10 transition-colors">
          <Search className="w-7 h-7 text-white" />
        </button>
        <button className="w-16 h-16 rounded-full bg-zinc-900/90 backdrop-blur-3xl flex items-center justify-center border border-white/10 shadow-2xl hover:bg-white/10 transition-colors">
          <Compass className="w-7 h-7 text-white animate-[spin_10s_linear_infinite]" />
        </button>
        <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center border border-white/10 shadow-2xl">
          <MapPin className="w-7 h-7 text-white" />
        </div>
      </div>

      {/* Live Car Marker */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-blue-500/20 animate-ping absolute -inset-0" />
          <div className="w-8 h-8 rounded-full bg-blue-500 border-4 border-white shadow-[0_0_30px_rgba(59,130,246,0.8)] relative z-10 flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full" />
          </div>
        </div>
      </div>
    </Card>
  );
}
