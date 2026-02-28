
'use client';

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
    <div className={cn(
      "flex flex-col w-full h-full overflow-hidden transition-all duration-700",
      dockSide === 'left' ? "md:flex-row" : "md:flex-row-reverse"
    )}>
      {/* Spacer div that creates room for the fixed CarDock on MD+ screens */}
      <div className="h-0 w-0 md:w-24 shrink-0 md:h-full" /> 
      
      {/* Main content area */}
      <div className="flex-1 overflow-auto relative h-full safe-p-bottom">
        {children}
      </div>
    </div>
  );
}
