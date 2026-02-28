"use client";

import { useMediaStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import React from "react";

/**
 * MainLayoutShell handles the dynamic layout adjustments based on the dock position (left or right).
 * In RTL (Arabic), the first element in the flex-row appears on the RIGHT of the screen.
 */
export function MainLayoutShell({ children }: { children: React.ReactNode }) {
  const { dockSide } = useMediaStore();

  return (
    <div className="flex flex-col w-full h-full overflow-hidden transition-all duration-700">
      <div className="flex flex-1 overflow-hidden relative">
        {/* In RTL: First child is on the RIGHT. If dock is on the right, we need a spacer here. */}
        {dockSide === 'right' && (
          <div className="hidden md:block md:w-24 shrink-0 h-full transition-all duration-700" />
        )}
        
        {/* Main content area */}
        <div className="flex-1 overflow-auto relative h-full safe-p-bottom">
          {children}
        </div>

        {/* In RTL: Last child is on the LEFT. If dock is on the left, we need a spacer here. */}
        {dockSide === 'left' && (
          <div className="hidden md:block md:w-24 shrink-0 h-full transition-all duration-700" />
        )}
      </div>
    </div>
  );
}
