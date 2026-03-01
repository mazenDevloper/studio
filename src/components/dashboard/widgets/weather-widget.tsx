
"use client";

import { useEffect, useState } from "react";
import { WEATHER_API_KEY } from "@/lib/constants";

export function WeatherWidget() {
  const [weather, setWeather] = useState<any>(null);

  useEffect(() => {
    fetch(`https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=Salalah&aqi=no`)
      .then(res => res.json())
      .then(data => {
        if (data && data.current) setWeather(data);
      })
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
    <div id="dash-card-weather" className="h-full w-full p-6 flex flex-col items-center justify-center text-center animate-in fade-in duration-1000">
      <div className="relative w-full mb-4 flex flex-col items-center">
        <span id="carplay-weather-temp-big" className="text-8xl font-black text-white tracking-tighter drop-shadow-[0_20px_50px_rgba(0,0,0,1)]">
          {Math.round(weather.current.temp_c)}°
        </span>
        <div className="mt-2 flex items-center gap-3 bg-white/5 px-6 py-2 rounded-full border border-white/10 backdrop-blur-md shadow-2xl">
           <img id="dash-weather-icon-big" src={weather.current.condition.icon} alt="Weather" className="w-12 h-12 object-contain" />
           <span className="text-[13px] font-black text-white/80 uppercase tracking-widest">{weather.current.condition.text}</span>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-2 w-full max-w-[280px] mt-4">
        <div className="metric-box py-3 bg-black/20 rounded-2xl border border-white/5 shadow-lg">
          <div className="text-emerald-400 font-black text-lg" id="dash-metric-temp">{Math.round(weather.current.temp_c)}°C</div>
          <div className="text-[8px] text-white/30 font-bold uppercase mt-1 tracking-tighter">Temp</div>
        </div>
        <div className="metric-box py-3 bg-black/20 rounded-2xl border border-white/5 shadow-lg">
          <div className="text-orange-400 font-black text-lg" id="dash-metric-uv">{weather.current.uv}</div>
          <div className="text-[8px] text-white/30 font-bold uppercase mt-1 tracking-tighter">UV Index</div>
        </div>
        <div className="metric-box py-3 bg-black/20 rounded-2xl border border-white/5 shadow-lg">
          <div className="text-blue-400 font-black text-lg" id="dash-metric-humidity">{weather.current.humidity}%</div>
          <div className="text-[8px] text-white/30 font-bold uppercase mt-1 tracking-tighter">Hum</div>
        </div>
      </div>
    </div>
  );
}
