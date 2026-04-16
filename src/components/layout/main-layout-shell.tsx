
"use client";

import { useMediaStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import React, { useEffect, useState } from "react";

/**
 * MainLayoutShell v100.0 - Universal Adaptation
 * Implements dynamic default zoom based on screen height:
 * - Height > 1080: 130% (1.3)
 * - Height < 1080: 150% (1.5)
 */
export function MainLayoutShell({ children }: { children: React.ReactNode }) {
  const { dockSide, displayScale, setDisplayScale } = useMediaStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Apply dynamic defaults if not manually adjusted by user
    if (typeof window !== 'undefined' && (displayScale === 0.8 || !displayScale)) {
      const h = window.innerHeight;
      if (h >= 1080) {
        setDisplayScale(1.3);
      } else {
        setDisplayScale(1.5);
      }
    }
  }, [displayScale, setDisplayScale]);

  // Use store value if exists, fallback to calculated default
  const zoomFactor = mounted ? (displayScale || (window.innerHeight >= 1080 ? 1.3 : 1.5)) : 1.0;

  return (
    <div className="flex flex-col w-full h-full overflow-hidden transition-all duration-700 bg-black">
      <div className={cn(
        "flex flex-1 overflow-hidden relative",
        dockSide === 'left' ? "flex-row-reverse" : "flex-row"
      )}>
        {/* Dock Gutter Spacer - Always remains 1:1 with Dock */}
        <div className="hidden md:block md:w-20 shrink-0 h-full transition-all duration-700 bg-transparent" />
        
        {/* Main content area with DYNAMIC ZOOM applied */}
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
