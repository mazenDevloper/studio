
"use client";

import { useMediaStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import React from "react";

/**
 * MainLayoutShell handles the dynamic layout adjustments based on the dock position.
 * Applies SMART ZOOM only to the content area (80% default).
 * Optimized to remove ghost space on the opposite side of the dock.
 */
export function MainLayoutShell({ children }: { children: React.ReactNode }) {
  const { dockSide, mapSettings } = useMediaStore();
  
  // Smart Zoom logic: Default to 0.8 (80%) as requested
  const displayZoom = mapSettings?.displayScale ?? 0.8;

  return (
    <div className="flex flex-col w-full h-full overflow-hidden transition-all duration-700 bg-black">
      <div className={cn(
        "flex flex-1 overflow-hidden relative",
        dockSide === 'left' ? "flex-row" : "flex-row-reverse"
      )}>
        {/* Dock Gutter Spacer - ALWAYS on the dock side */}
        <div className="hidden md:block md:w-20 shrink-0 h-full transition-all duration-700 bg-transparent" />
        
        {/* Main content area with INDEPENDENT ZOOM - Now truly expands to the other edge */}
        <div 
          className="flex-1 overflow-auto relative h-full safe-p-bottom no-scrollbar"
          style={{ 
            zoom: displayZoom,
            WebkitTransformOrigin: 'top center',
          }}
        >
          {children}
        </div>

        {/* The other side is now EMPTY, allowing content to touch the screen edge */}
      </div>
    </div>
  );
}
