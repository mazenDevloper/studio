"use client";

import { useEffect, useState } from "react";
import { WEATHER_API_KEY } from "@/lib/constants";
import { Mic, Search, Maximize2, RotateCcw, Upload, Navigation } from "lucide-react";
import Image from "next/image";
import { MapWidget } from "./widgets/map-widget";
import { PrayerTimelineWidget } from "./widgets/prayer-timeline-widget";
import { DateAndClockWidget } from "./widgets/date-and-clock-widget";
import { useMediaStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function DashboardView() {
  const [weather, setWeather] = useState<any>(null);
  const { activeVideo, isPlaying, setIsPlaying } = useMediaStore();

  useEffect(() => {
    fetch(`https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=Salalah&aqi=no`)
      .then(res => res.json())
      .then(data => setWeather(data))
      .catch(err => console.error("Weather error:", err));
  }, []);

  return (
    <div className="h-full w-full p-6 flex flex-col gap-6 relative overflow-hidden">
      {/* Top Floating Logo */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] opacity-80 pointer-events-none">
        <Image 
          src="https://dmusera.netlify.app/Lexus-Logo.wine.svg" 
          alt="Lexus" 
          width={180} 
          height={40} 
          className="invert brightness-200"
        />
      </div>

      {/* Main Grid Content */}
      <div className="flex-1 grid grid-cols-12 gap-6 items-stretch min-h-0">
        
        {/* Column 1: Info Widgets (Left) */}
        <div className="col-span-3 flex flex-col gap-6">
          {/* Weather Widget */}
          <div className="flex-1 glass-panel rounded-[2.5rem] p-6 flex flex-col items-center justify-center text-center">
            {weather ? (
              <>
                <div className="relative w-full mb-2">
                  <span className="text-8xl font-black text-white/90 tracking-tighter drop-shadow-2xl">
                    {Math.round(weather.current.temp_c)}°
                  </span>
                  <div className="absolute -top-4 -right-2">
                    <img src={weather.current.condition.icon} alt="Weather" className="w-20 h-20 animate-pulse" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 w-full mt-4">
                  <div className="metric-box">
                    <div className="text-blue-400 font-bold text-lg">{weather.current.humidity}%</div>
                    <div className="text-[10px] text-white/40 font-bold uppercase">Hum</div>
                  </div>
                  <div className="metric-box">
                    <div className="text-yellow-400 font-bold text-lg">{weather.current.uv}</div>
                    <div className="text-[10px] text-white/40 font-bold uppercase">UV</div>
                  </div>
                  <div className="metric-box">
                    <div className="text-accent font-bold text-lg">{Math.round(weather.current.temp_c)}°</div>
                    <div className="text-[10px] text-white/40 font-bold uppercase">Temp</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="animate-pulse text-white/20 font-bold">LOADING WEATHER...</div>
            )}
          </div>

          {/* Clock Widget */}
          <div className="flex-1 glass-panel rounded-[2.5rem] overflow-hidden">
            <DateAndClockWidget />
          </div>
        </div>

        {/* Column 2: Car Display (Center) */}
        <div className="col-span-5 glass-panel rounded-[2.5rem] relative group flex items-center justify-center p-4">
          <Image 
            src="https://dmusera.netlify.app/es350gb.png" 
            alt="Lexus ES350" 
            width={600} 
            height={400}
            className="object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)] group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute bottom-8 flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <button className="flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-xl border border-white/10 rounded-full hover:bg-white/20 transition-all font-bold text-sm">
              <RotateCcw className="w-4 h-4" /> إعادة تعيين
            </button>
            <button className="flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-xl border border-white/10 rounded-full hover:bg-white/20 transition-all font-bold text-sm">
              <Upload className="w-4 h-4" /> تحميل صورة
            </button>
          </div>
        </div>

        {/* Column 3: Map Widget (Right) */}
        <div className="col-span-4 glass-panel rounded-[2.5rem] overflow-hidden relative group">
          <MapWidget />
          <div className="absolute top-6 right-6 z-20">
            <button className="w-12 h-12 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 flex items-center justify-center hover:bg-primary transition-all">
              <Maximize2 className="w-6 h-6 text-white" />
            </button>
          </div>
          <div className="absolute bottom-6 left-6 z-20 bg-black/60 backdrop-blur-xl p-3 rounded-2xl border border-white/10 flex items-center gap-3">
            <Navigation className="w-5 h-5 text-blue-400" />
            <span className="text-xs font-bold text-white/80">صلالة، سلطنة عمان</span>
          </div>
        </div>
      </div>

      {/* Bottom Container: Prayer Timeline & Floating Capsule */}
      <div className="h-24 flex items-center gap-6 z-50">
        {/* Timeline Widget */}
        <div className="flex-1 min-w-0">
          <PrayerTimelineWidget />
        </div>

        {/* Global Mic & Siri Wave */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg active-glow cursor-pointer hover:scale-110 transition-all">
            <Mic className="w-7 h-7 text-white" />
          </div>
          <div className="h-1.5 w-32 rounded-full siri-gradient" />
        </div>
      </div>
    </div>
  );
}