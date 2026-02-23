
"use client";

import { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Compass, Navigation, MapPin, Search, Clock, Zap } from "lucide-react";
import { GOOGLE_MAPS_API_KEY } from "@/lib/constants";

const STREET_NAMES = [
  "King Fahd Road",
  "Makkah Al Mukarramah Rd",
  "Prince Mohammed Bin Abdulaziz St",
  "Tahlia Street",
  "Olaya Street"
];

export function MapWidget() {
  const [coords, setCoords] = useState({ lat: 21.4225, lng: 39.8262 }); // Makkah center
  const [progress, setProgress] = useState(65);
  const [currentStreet, setCurrentStreet] = useState(STREET_NAMES[0]);
  const [eta, setEta] = useState("");
  const [distance, setDistance] = useState(4.2);

  // Dynamic ETA calculation
  useEffect(() => {
    const updateETA = () => {
      const now = new Date();
      now.setMinutes(now.getMinutes() + 12);
      setEta(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateETA();
    const interval = setInterval(updateETA, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Simulate active navigation dynamics
    const interval = setInterval(() => {
      setCoords(prev => ({
        lat: prev.lat + (Math.random() - 0.5) * 0.00005,
        lng: prev.lng + (Math.random() - 0.5) * 0.00005
      }));
      
      setProgress(prev => (prev < 99 ? prev + 0.05 : 0));
      setDistance(prev => (prev > 0.1 ? Number((prev - 0.01).toFixed(2)) : 10.5));
      
      // Randomly change street name to simulate driving
      if (Math.random() > 0.95) {
        setCurrentStreet(STREET_NAMES[Math.floor(Math.random() * STREET_NAMES.length)]);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const location = `${coords.lat},${coords.lng}`;
  // Using a darker, more detailed map style
  const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${location}&zoom=16&size=800x600&maptype=roadmap&style=feature:all|element:all|saturation:-100|invert_lightness:true&style=feature:road.highway|element:geometry|color:0x222222&style=feature:water|element:geometry|color:0x000000&style=feature:poi|visibility:off&key=${GOOGLE_MAPS_API_KEY}`;

  return (
    <Card className="h-full w-full overflow-hidden border-none bg-zinc-900/50 relative group rounded-[2.5rem] ios-shadow">
      {/* Dynamic Static Map Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-80 transition-all duration-1000"
        style={{ backgroundImage: `url(${mapUrl})` }}
      />
      
      {/* OLED HUD Overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/70 pointer-events-none" />

      {/* Top HUD - Navigation Intel */}
      <div className="absolute top-6 left-6 flex flex-col gap-4 items-start w-[380px]">
        <div className="p-6 rounded-[2rem] bg-black/90 backdrop-blur-3xl border border-white/10 space-y-5 w-full shadow-2xl">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-[1.2rem] bg-blue-600 flex items-center justify-center shadow-[0_0_25px_rgba(37,99,235,0.5)]">
              <Navigation className="text-white w-9 h-9 rotate-45" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-headline font-bold text-2xl text-white truncate">DriveCast Pro Nav</h3>
              <p className="text-sm text-blue-400 font-bold uppercase tracking-widest flex items-center gap-2">
                <Zap className="w-3 h-3 fill-current" /> {currentStreet}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest block mb-1">Arrival</span>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-xl font-bold text-white font-headline">{eta}</span>
              </div>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest block mb-1">Distance</span>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-accent" />
                <span className="text-xl font-bold text-white font-headline">{distance} KM</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">
              <span>Path Progress</span>
              <span className="text-blue-400">{Math.floor(progress)}%</span>
            </div>
            <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden border border-white/5 p-[1px]">
              <div 
                className="bg-blue-500 h-full rounded-full shadow-[0_0_15px_#3b82f6] transition-all duration-1000 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Marker HUD */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center translate-y-20">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-blue-500/10 animate-ping absolute -inset-2" />
          <div className="w-10 h-10 rounded-full bg-blue-600 border-[3px] border-white shadow-[0_0_40px_rgba(59,130,246,0.9)] relative z-10 flex items-center justify-center">
             <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
          </div>
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-black/90 backdrop-blur-xl border border-white/20 rounded-full whitespace-nowrap shadow-2xl">
             <span className="text-xs font-bold text-white uppercase tracking-tighter">You are here</span>
          </div>
        </div>
      </div>

      {/* Floating System Controls */}
      <div className="absolute bottom-8 right-8 flex flex-col gap-4">
        <button className="w-16 h-16 rounded-full bg-zinc-900/90 backdrop-blur-3xl flex items-center justify-center border border-white/10 shadow-2xl hover:bg-white/10 transition-colors active:scale-90">
          <Search className="w-7 h-7 text-white" />
        </button>
        <button className="w-16 h-16 rounded-full bg-zinc-900/90 backdrop-blur-3xl flex items-center justify-center border border-white/10 shadow-2xl hover:bg-white/10 transition-colors active:scale-90">
          <Compass className="w-7 h-7 text-white animate-[spin_15s_linear_infinite]" />
        </button>
        <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center border border-white/10 shadow-2xl shadow-blue-500/20 active:scale-95 transition-transform cursor-pointer">
          <MapPin className="w-7 h-7 text-white" />
        </div>
      </div>
    </Card>
  );
}
