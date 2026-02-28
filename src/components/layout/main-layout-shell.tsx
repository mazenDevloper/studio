
"use client";

import { useMediaStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import React from "react";

/**
 * MainLayoutShell handles the dynamic layout adjustments based on the dock position (left or right).
 * In RTL (Arabic), the children in a flex-row flow from RIGHT to LEFT.
 */
export function MainLayoutShell({ children }: { children: React.ReactNode }) {
  const { dockSide } = useMediaStore();

  return (
    <div className="flex flex-col w-full h-full overflow-hidden transition-all duration-700">
      <div className="flex flex-1 overflow-hidden relative">
        {/* 
          In RTL flex-row: 
          - The FIRST child appears on the RIGHT. 
          - The LAST child appears on the LEFT. 
        */}

        {/* If dock is on the RIGHT, we need a spacer as the FIRST child (Right-most position) */}
        {dockSide === 'right' && (
          <div className="hidden md:block md:w-24 shrink-0 h-full transition-all duration-700" />
        )}
        
        {/* Main content area (Middle) */}
        <div className="flex-1 overflow-auto relative h-full safe-p-bottom">
          {children}
        </div>

        {/* If dock is on the LEFT, we need a spacer as the LAST child (Left-most position) */}
        {dockSide === 'left' && (
          <div className="hidden md:block md:w-24 shrink-0 h-full transition-all duration-700" />
        )}
      </div>
    </div>
  );
}
