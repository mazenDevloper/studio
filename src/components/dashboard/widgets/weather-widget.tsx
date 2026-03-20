
"use client";

import { useEffect, useState } from "react";
import { Loader2, Cloud, Wind, Droplets } from "lucide-react";

/**
 * WeatherWidget - Using precise coordinates for Salalah and strict data validation.
 */
export function WeatherWidget() {
  const [weather, setWeather] = useState<any>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Salalah: Lat 17.0151, Lon 54.0924
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=17.0151&longitude=54.0924&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=Asia%2FRiyadh`)
      .then(res => {
        if (!res.ok) throw new Error("Weather API failed");
        return res.json();
      })
      .then(data => {
        // Ensure the temperature value exists and is a number before setting state
        if (data && data.current && typeof data.current.temperature_2m === 'number') {
          setWeather(data);
        } else {
          throw new Error("Invalid weather data");
        }
      })
      .catch(err => {
        console.error("Weather error:", err);
        setError(true);
      });
  }, []);

  // Simple mapping for weather codes
  const getWeatherDesc = (code: number) => {
    if (code === 0) return "سماء صافية";
    if (code <= 3) return "غائم جزئياً";
    if (code <= 48) return "ضباب";
    if (code <= 67) return "أمطار خفيفة";
    if (code <= 82) return "زخات مطر";
    return "عواصف رعدية";
  };

  if (error) {
    return (
      <div className="h-full w-full p-6 flex flex-col items-center justify-center text-center">
        <div className="text-white/20 font-black text-[12px] uppercase tracking-widest">Weather Offline</div>
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="h-full w-full p-6 flex flex-col items-center justify-center text-center">
        <div className="animate-pulse text-white/20 font-black text-[12px] uppercase tracking-[0.5em]">Satellite Sync...</div>
      </div>
    );
  }

  return (
    <div className="h-full w-full p-6 flex flex-col items-center justify-center text-center animate-in fade-in duration-1000 bg-black/40 rounded-[2.5rem]">
      <div className="relative w-full mb-4 flex flex-col items-center">
        <span className="text-8xl font-black text-white tracking-tighter drop-shadow-[0_20px_50px_rgba(0,0,0,1)]">
          {Math.round(weather.current.temperature_2m)}°
        </span>
        <div className="mt-2 flex items-center gap-3 bg-white/5 px-6 py-2 rounded-full border border-white/10 backdrop-blur-md shadow-2xl">
           <Cloud className="w-6 h-6 text-blue-400" />
           <span className="text-[13px] font-black text-white/80 uppercase tracking-widest">{getWeatherDesc(weather.current.weather_code)}</span>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-2 w-full max-w-[300px] mt-4">
        <div className="py-3 bg-white/5 rounded-2xl border border-white/5 shadow-lg flex flex-col items-center">
          <div className="text-emerald-400 font-black text-lg">{Math.round(weather.current.apparent_temperature)}°</div>
          <div className="text-[8px] text-white/30 font-bold uppercase mt-1">يحس كأن</div>
        </div>
        <div className="py-3 bg-white/5 rounded-2xl border border-white/5 shadow-lg flex flex-col items-center">
          <div className="text-orange-400 font-black text-lg">{weather.current.wind_speed_10m}</div>
          <div className="text-[8px] text-white/30 font-bold uppercase mt-1">رياح كم/س</div>
        </div>
        <div className="py-3 bg-white/5 rounded-2xl border border-white/5 shadow-lg flex flex-col items-center">
          <div className="text-blue-400 font-black text-lg">{weather.current.relative_humidity_2m}%</div>
          <div className="text-[8px] text-white/30 font-bold uppercase mt-1">رطوبة</div>
        </div>
      </div>
    </div>
  );
}
