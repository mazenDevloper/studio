
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

  // the display scale is for car / big screens: on a phone (< 968px, the dock is a bottom bar) it would push the page
  // off the side (CSS zoom keeps the width but scales the content), so phones always get 1
  const [wide, setWide] = useState(true);
  useEffect(() => {
    const f = () => setWide(window.innerWidth > 968);
    f();
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);
  const zoomFactor = mounted && wide ? (displayScale || 1.0) : 1.0;

  return (
    <div className={cn(
      "flex-1 h-full overflow-hidden transition-all duration-0 bg-black relative",
      dockSide === 'left' ? "pl-16 min-[980px]:pl-20" : "pr-16 min-[980px]:pr-20",
      // below 968px the dock is a bottom bar: no side gap
      "max-[968px]:!px-0"
    )}>
      {/* content starts below the floating islands (--island-space is their measured height, 0 when none) */}
      <div className="w-full h-full overflow-y-auto overflow-x-hidden relative no-scrollbar transition-[padding] duration-300" style={{ zoom: zoomFactor, WebkitOverflowScrolling: "touch", touchAction: "pan-x pan-y", paddingTop: `calc(var(--island-space, 0px) / ${zoomFactor})` }}>{children}</div>
    </div>
  );
}
