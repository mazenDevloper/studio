
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";
import { prayerTimesData, convertTo12Hour } from "@/lib/constants";

export function PrayerWidget() {
  const [todayPrayer, setTodayPrayer] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    // Look up today's data (matching year 2026 as per user data requirement)
    // For demo purposes, we'll pick Feb 1st if it's currently Feb or mock it
    const now = new Date();
    const dateStr = `2026-02-${now.getDate().toString().padStart(2, '0')}`;
    const found = prayerTimesData.find(p => p.date === dateStr) || prayerTimesData[0];
    setTodayPrayer(found);

    const timer = setInterval(() => {
      const d = new Date();
      setCurrentTime(d.getHours().toString().padStart(2, '0') + ":" + d.getMinutes().toString().padStart(2, '0'));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (!todayPrayer) return null;

  const prayers = [
    { name: "Fajr", time: todayPrayer.fajr },
    { name: "Sunrise", time: todayPrayer.sunrise },
    { name: "Dhuhr", time: todayPrayer.dhuhr },
    { name: "Asr", time: todayPrayer.asr },
    { name: "Maghrib", time: todayPrayer.maghrib },
    { name: "Isha", time: todayPrayer.isha },
  ];

  // Logic to find current active prayer
  const activePrayer = prayers.slice().reverse().find(p => currentTime >= p.time) || prayers[0];

  return (
    <Card className="h-full border-none bg-zinc-900/50 rounded-[2.5rem] overflow-hidden">
      <CardContent className="p-6 h-full flex flex-col justify-center gap-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Prayer Array</span>
          <Star className="h-4 w-4 text-accent" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {prayers.map((prayer) => {
            const isActive = activePrayer.name === prayer.name;
            return (
              <div
                key={prayer.name}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                  isActive
                    ? "border-accent bg-accent/10 active-glow"
                    : "border-white/5 bg-white/5 opacity-40"
                }`}
              >
                <span className={`text-[10px] font-bold ${isActive ? "text-accent" : "text-muted-foreground"}`}>
                  {prayer.name}
                </span>
                <span className="text-sm font-headline font-bold mt-1">
                  {convertTo12Hour(prayer.time)}
                </span>
              </div>
            );
          })}
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-accent uppercase tracking-tighter">
            Currently: {activePrayer.name}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
