"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Moon, Orbit } from "lucide-react";
import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export function MoonWidget() {
  const moonImage = PlaceHolderImages.find(img => img.id === "moon-surface");

  return (
    <Card className="h-full overflow-hidden border-white/5 bg-gradient-to-br from-card to-card/50">
      <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          NASA Moon Library
        </CardTitle>
        <Orbit className="h-4 w-4 text-accent" />
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex items-center gap-4">
          <div className="relative w-24 h-24 rounded-full overflow-hidden ring-4 ring-white/5 ring-offset-2 ring-offset-background">
            {moonImage && (
              <Image
                src={moonImage.imageUrl}
                alt={moonImage.description}
                fill
                className="object-cover"
                data-ai-hint={moonImage.imageHint}
              />
            )}
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="text-xl font-bold font-headline">Waxing Gibbous</h3>
            <p className="text-xs text-muted-foreground">Illumination: 84%</p>
            <div className="w-full bg-white/10 h-1 rounded-full mt-2">
              <div className="bg-accent h-full w-[84%] rounded-full shadow-[0_0_8px_hsl(var(--accent))]" />
            </div>
            <p className="text-[10px] text-accent mt-1 font-mono tracking-tighter">MOONBASE ALPHA CONNECTED</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
