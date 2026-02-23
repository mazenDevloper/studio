"use client";

import { Card } from "@/components/ui/card";
import { MoonWidget } from "./widgets/moon-widget";
import { PrayerWidget } from "./widgets/prayer-widget";
import { MapWidget } from "./widgets/map-widget";
import { YouTubeSavedWidget } from "./widgets/youtube-saved-widget";
import { YouTubeSuggestionsWidget } from "./widgets/youtube-suggestions-widget";
import { useMediaStore } from "@/lib/store";

export function DashboardView() {
  const { favoriteChannels } = useMediaStore();

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-1 text-white">Dashboard</h1>
          <p className="text-muted-foreground text-lg">System synchronized. Ready for transit.</p>
        </div>
        <div className="flex items-center gap-4 bg-secondary/30 p-2 rounded-2xl border border-white/5">
          <div className="px-4 py-1 text-right">
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Local Time</p>
            <p className="text-xl font-headline font-bold">14:48</p>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="px-4 py-1">
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Arrival</p>
            <p className="text-xl font-headline font-bold text-accent">15:20</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 auto-rows-[minmax(200px,auto)]">
        {/* Navigation / Map - Primary Widget */}
        <div className="lg:col-span-8 lg:row-span-2">
          <MapWidget />
        </div>

        {/* NASA Moon Library */}
        <div className="lg:col-span-4 lg:row-span-1">
          <MoonWidget />
        </div>

        {/* Prayer Array */}
        <div className="lg:col-span-4 lg:row-span-1">
          <PrayerWidget />
        </div>

        {/* AI YouTube Suggestions */}
        <div className="lg:col-span-6 lg:row-span-1">
          <YouTubeSuggestionsWidget channels={favoriteChannels} />
        </div>

        {/* YouTube Saved List */}
        <div className="lg:col-span-6 lg:row-span-1">
          <YouTubeSavedWidget />
        </div>
      </div>
    </div>
  );
}
