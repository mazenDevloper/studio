
"use client";

import { useEffect, useState } from "react";
import { WEATHER_API_KEY } from "@/lib/constants";

export function WeatherWidget() {
  const [weather, setWeather] = useState<any>(null);

  useEffect(() => {
    fetch(`https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=Salalah&aqi=no`)
      .then(res => res.json())
      .then(data => setWeather(data))
      .catch(err => console.error("Weather error:", err));
  }, []);

  if (!weather) {
    return (
      <div className="h-full w-full p-6 flex flex-col items-center justify-center text-center">
        <div className="animate-pulse text-white/20 font-black text-[12px] uppercase tracking-[0.5em]">Satellite Sync...</div>
      </div>
    );
  }

  return (
    <div className="h-full w-full p-6 flex flex-col items-center justify-center text-center">
      <div className="relative w-full mb-4 flex flex-col items-center">
        <span className="text-7xl font-black text-white/95 tracking-tighter drop-shadow-2xl">
          {Math.round(weather.current.temp_c)}°
        </span>
        <div className="mt-2 flex items-center gap-2 bg-white/5 px-4 py-1 rounded-full border border-white/10 backdrop-blur-md">
           <img src={weather.current.condition.icon} alt="Weather" className="w-10 h-10" />
           <span className="text-[11px] font-black text-white/60 uppercase tracking-widest">{weather.current.condition.text}</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 w-full max-w-[260px] mt-4">
        <div className="metric-box py-3 bg-white/5 rounded-2xl border border-white/5">
          <div className="text-blue-400 font-black text-sm">{weather.current.humidity}%</div>
          <div className="text-[8px] text-white/20 font-bold uppercase mt-1">Hum</div>
        </div>
        <div className="metric-box py-3 bg-white/5 rounded-2xl border border-white/5">
          <div className="text-yellow-400 font-black text-sm">{weather.current.uv}</div>
          <div className="text-[8px] text-white/20 font-bold uppercase mt-1">UV</div>
        </div>
        <div className="metric-box py-3 bg-white/5 rounded-2xl border border-white/5">
          <div className="text-accent font-black text-sm">{Math.round(weather.current.wind_kph)}</div>
          <div className="text-[8px] text-white/20 font-bold uppercase mt-1">Wind</div>
        </div>
      </div>
    </div>
  );
}
