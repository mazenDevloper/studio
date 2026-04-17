
"use client";

import { useMediaStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import React, { useEffect, useState } from "react";

export function MainLayoutShell({ children }: { children: React.ReactNode }) {
  const { dockSide, displayScale, setDisplayScale } = useMediaStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined' && (displayScale === undefined || displayScale === null)) setDisplayScale(1.0);
  }, [displayScale, setDisplayScale]);

  const zoomFactor = mounted ? (displayScale || 1.0) : 1.0;

  return (
    <div className={cn(
      "flex-1 h-full overflow-hidden transition-all duration-0 bg-black relative",
      dockSide === 'left' ? "pl-16 min-[980px]:pl-20" : "pr-16 min-[980px]:pr-20"
    )}>
      <div className="w-full h-full overflow-auto relative no-scrollbar" style={{ zoom: zoomFactor, willChange: 'transform, opacity' }}>{children}</div>
    </div>
  );
}
