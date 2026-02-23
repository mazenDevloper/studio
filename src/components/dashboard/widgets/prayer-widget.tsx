"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Star } from "lucide-react";

const prayers = [
  { name: "Fajr", time: "05:12", status: "Past" },
  { name: "Dhuhr", time: "12:34", status: "Past" },
  { name: "Asr", time: "15:45", status: "Current", active: true },
  { name: "Maghrib", time: "18:22", status: "Next" },
  { name: "Isha", time: "19:45", status: "Soon" },
];

export function PrayerWidget() {
  return (
    <Card className="h-full border-white/5 bg-gradient-to-bl from-card to-card/50">
      <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Prayer Array
        </CardTitle>
        <Star className="h-4 w-4 text-accent" />
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="grid grid-cols-5 gap-2">
          {prayers.map((prayer) => (
            <div
              key={prayer.name}
              className={`flex flex-col items-center justify-center p-2 rounded-xl border ${
                prayer.active
                  ? "border-accent bg-accent/10 shadow-[0_0_15px_rgba(65,184,131,0.2)]"
                  : "border-white/5 bg-white/5"
              }`}
            >
              <span className={`text-[10px] font-bold ${prayer.active ? "text-accent" : "text-muted-foreground"}`}>
                {prayer.name}
              </span>
              <span className="text-sm font-headline font-bold mt-1">{prayer.time}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10">
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3 text-accent" />
            <span className="text-xs text-muted-foreground font-medium">Next: Maghrib</span>
          </div>
          <span className="text-xs font-bold text-white">3h 24m remaining</span>
        </div>
      </CardContent>
    </Card>
  );
}
