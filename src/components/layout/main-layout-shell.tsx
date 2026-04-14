
"use client";

import { useMediaStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import React from "react";

/**
 * MainLayoutShell v77.0 - Opposite Spacer Position
 * The spacer is now on the OPPOSITE side of the dock for a balanced layout.
 */
export function MainLayoutShell({ children }: { children: React.ReactNode }) {
  const { dockSide, mapSettings } = useMediaStore();
  
  // Smart Zoom logic: Default to 0.8 (80%) as requested
  const displayZoom = mapSettings?.displayScale ?? 0.8;

  return (
    <div className="flex flex-col w-full h-full overflow-hidden transition-all duration-700 bg-black">
      <div className={cn(
        "flex flex-1 overflow-hidden relative",
        // Flipped: If dock is left, flex-row-reverse puts spacer on the right.
        // If dock is right, flex-row puts spacer on the left.
        dockSide === 'left' ? "flex-row-reverse" : "flex-row"
      )}>
        {/* Dock Gutter Spacer - Now aligned with the opposite side of the Dock */}
        <div className="hidden md:block md:w-20 shrink-0 h-full transition-all duration-700 bg-transparent" />
        
        {/* Main content area with INDEPENDENT ZOOM */}
        <div 
          className="flex-1 overflow-auto relative h-full safe-p-bottom no-scrollbar"
          style={{ 
            zoom: displayZoom,
            WebkitTransformOrigin: 'top center',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
