
"use client";

import { useMediaStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import React from "react";

/**
 * MainLayoutShell v80.0 - Classic Zoom Restoration
 * Reverted to standard CSS zoom for better layout recalculation.
 */
export function MainLayoutShell({ children }: { children: React.ReactNode }) {
  const { dockSide, displayScale } = useMediaStore();
  
  // Device-specific Zoom logic (Old System)
  const zoomFactor = displayScale ?? 0.8;

  return (
    <div className="flex flex-col w-full h-full overflow-hidden transition-all duration-700 bg-black">
      <div className={cn(
        "flex flex-1 overflow-hidden relative",
        dockSide === 'left' ? "flex-row-reverse" : "flex-row"
      )}>
        {/* Dock Gutter Spacer - Always remains 1:1 with Dock */}
        <div className="hidden md:block md:w-20 shrink-0 h-full transition-all duration-700 bg-transparent" />
        
        {/* Main content area with CLASSIC ZOOM applied */}
        <div 
          className="flex-1 overflow-auto relative h-full safe-p-bottom no-scrollbar"
          style={{ 
            zoom: zoomFactor
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
