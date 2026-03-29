
"use client";

import { useMediaStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import React from "react";

/**
 * MainLayoutShell handles the dynamic layout adjustments based on the dock position.
 * Applies SMART ZOOM only to the content area (80% default).
 */
export function MainLayoutShell({ children }: { children: React.ReactNode }) {
  const { dockSide, mapSettings } = useMediaStore();
  
  // Smart Zoom logic: Default to 0.8 (80%) as requested
  const displayZoom = mapSettings?.displayScale ?? 0.8;

  return (
    <div className="flex flex-col w-full h-full overflow-hidden transition-all duration-700">
      <div className="flex flex-1 overflow-hidden relative">
        {/* If dock is on the RIGHT, spacer on the right (first child in RTL) */}
        {dockSide === 'right' && (
          <div className="hidden md:block md:w-20 shrink-0 h-full transition-all duration-700" />
        )}
        
        {/* Main content area with INDEPENDENT ZOOM */}
        <div 
          className="flex-1 overflow-auto relative h-full safe-p-bottom no-scrollbar"
          style={{ 
            zoom: displayZoom,
            // Fallback for browsers that don't support zoom property correctly in layout
            WebkitTransformOrigin: 'top center',
          }}
        >
          {children}
        </div>

        {/* If dock is on the LEFT, spacer on the left (last child in RTL) */}
        {dockSide === 'left' && (
          <div className="hidden md:block md:w-20 shrink-0 h-full transition-all duration-700" />
        )}
      </div>
    </div>
  );
}
