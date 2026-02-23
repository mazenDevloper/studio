"use client";

import { MapWidget } from "./widgets/map-widget";
import { YouTubeSuggestionsWidget } from "./widgets/youtube-suggestions-widget";
import { useMediaStore } from "@/lib/store";
import { MoonWidget } from "./widgets/moon-widget";
import { PrayerWidget } from "./widgets/prayer-widget";

export function DashboardView() {
  const { favoriteChannels } = useMediaStore();

  return (
    <div className="p-8 h-full flex flex-col">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-headline font-bold text-white tracking-tight">DriveCast</h1>
          <p className="text-muted-foreground text-sm font-medium">Monday, June 12 • 24°C</p>
        </div>
        <div className="h-2 w-32 rounded-full siri-gradient" />
      </header>

      <div className="flex-1 grid grid-cols-12 gap-6 pb-8">
        {/* Main Navigation Area */}
        <div className="col-span-8 row-span-2">
          <MapWidget />
        </div>

        {/* Info Column */}
        <div className="col-span-4 space-y-6">
          <div className="h-1/2">
            <MoonWidget />
          </div>
          <div className="h-1/2">
            <PrayerWidget />
          </div>
        </div>

        {/* Content Stream Area */}
        <div className="col-span-12">
          <YouTubeSuggestionsWidget channels={favoriteChannels} />
        </div>
      </div>
    </div>
  );
}
