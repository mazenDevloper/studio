"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";

const prayers = [
  { name: "Fajr", time: "05:12" },
  { name: "Dhuhr", time: "12:34" },
  { name: "Asr", time: "15:45", active: true },
  { name: "Maghrib", time: "18:22" },
  { name: "Isha", time: "19:45" },
];

export function PrayerWidget() {
  return (
    <Card className="h-full border-none bg-zinc-900/50 rounded-[2.5rem]">
      <CardContent className="p-6 h-full flex flex-col justify-center gap-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Prayer Array</span>
          <Star className="h-4 w-4 text-accent" />
        </div>
        <div className="grid grid-cols-5 gap-3">
          {prayers.map((prayer) => (
            <div
              key={prayer.name}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                prayer.active
                  ? "border-accent bg-accent/10 active-glow"
                  : "border-white/5 bg-white/5 opacity-40"
              }`}
            >
              <span className={`text-[10px] font-bold ${prayer.active ? "text-accent" : "text-muted-foreground"}`}>
                {prayer.name}
              </span>
              <span className="text-lg font-headline font-bold mt-1">{prayer.time}</span>
            </div>
          ))}
        </div>
        {prayers.find(p => p.active) && (
          <div className="text-center">
            <p className="text-sm font-bold text-accent">Currently: Asr</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
