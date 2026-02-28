"use client";

import { useMediaStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import React from "react";

/**
 * MainLayoutShell handles the dynamic layout adjustments based on the dock position (left or right).
 * It shifts the content and spacer to accommodate the fixed CarDock.
 */
export function MainLayoutShell({ children }: { children: React.ReactNode }) {
  const { dockSide } = useMediaStore();

  return (
    <div className="flex flex-col w-full h-full overflow-hidden transition-all duration-700">
      <div className="flex flex-1 overflow-hidden relative">
        {/* Spacer on the Left if Dock is on the Left */}
        {dockSide === 'left' && (
          <div className="hidden md:block md:w-24 shrink-0 h-full transition-all duration-700" />
        )}
        
        {/* Main content area */}
        <div className="flex-1 overflow-auto relative h-full safe-p-bottom">
          {children}
        </div>

        {/* Spacer on the Right if Dock is on the Right */}
        {dockSide === 'right' && (
          <div className="hidden md:block md:w-24 shrink-0 h-full transition-all duration-700" />
        )}
      </div>
    </div>
  );
}
