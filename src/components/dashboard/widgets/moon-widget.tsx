"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Orbit } from "lucide-react";
import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export function MoonWidget() {
  const moonImage = PlaceHolderImages.find(img => img.id === "moon-surface");

  return (
    <Card className="h-full overflow-hidden border-none bg-zinc-900/50 rounded-[2.5rem]">
      <CardContent className="p-6 h-full flex items-center gap-6">
        <div className="relative w-28 h-28 rounded-full overflow-hidden ring-4 ring-white/5">
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
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Astronomy</span>
            <Orbit className="h-4 w-4 text-blue-400" />
          </div>
          <h3 className="text-2xl font-bold font-headline leading-tight">Waxing Gibbous</h3>
          <p className="text-xs text-muted-foreground">84% Illuminated</p>
        </div>
      </CardContent>
    </Card>
  );
}
